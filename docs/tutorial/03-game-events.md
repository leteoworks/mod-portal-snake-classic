<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm mods:sync-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# Lesson 3 — React to what happens in-game

Goal: make your mod react to multiple game events — not just
`GAME_OVER` and `GAME_STARTED` from Lessons 1-2, but the full
catalog of common events. You'll use `host.state` to read game
data without waiting for an event, and `host.dispatch` to notify
the player.

> Reference code: any mod in the
> [`submodules/game-mods/`](https://github.com/leteoworks/my-game-fw-mods)
> subrepo that uses `subscribeEvent` with typed payload.

---

## The mental model

The game emits events at key moments of the play cycle. Your mod
**subscribes** to the ones it needs and receives the payload with
context. Plus a **point-query capability** for state
(`host.state.read`) for cases where you need a value without
waiting for an event.

```
Game (producer)           host bridge        Your mod (consumer)
─────────────────         ───────────        ───────────────────
 GAME_STARTED  ────────▶  subscribeEvent ──▶  handler(payload)
 SCORE_CHANGED ────────▶  subscribeEvent ──▶  handler(payload)
 POWER_UP_PICKED ──────▶  subscribeEvent ──▶  handler(payload)
   ⋮                                            ⋮
                                              host.state.read('X')
                          state read ──────▶    (point query)
```

Permissions: the `events` permission with
`subscribe: ['NAME1', 'NAME2', ...]`. Without that entry for the
event, `subscribeEvent` rejects.

---

## Catalog of common events

Events that any mod-compatible game typically exposes (the exact
list comes from the game — check its docs):

| Event | Payload | When emitted |
|---|---|---|
| `GAME_STARTED` | `{ level, mode }` | Start of a game |
| `GAME_OVER` | `{ finalScore, duration, cause }` | End of game |
| `GAME_PAUSED` / `GAME_RESUMED` | `{}` | Pause/resume |
| `SCORE_CHANGED` | `{ score, delta }` | Score change |
| `LEVEL_UP` | `{ level }` | Level up |
| `POWER_UP_PICKED` | `{ powerupType, duration }` | Player picks a power-up |
| `POWER_UP_EXPIRED` | `{ powerupType }` | Power-up runs out |

Each one needs its entry in
`permissions[type=events].subscribe`.

---

## 1 — Subscribe to multiple events

`mod.json`:

```json
{
  "type": "events",
  "subscribe": [
    "GAME_STARTED",
    "GAME_OVER",
    "SCORE_CHANGED",
    "POWER_UP_PICKED"
  ],
  "rationale": "Reacts to the game cycle to show live stats."
}
```

`src/index.ts`:

```ts
let runStats = { picks: 0, peakScore: 0 };

host.subscribeEvent('GAME_STARTED', () => {
  runStats = { picks: 0, peakScore: 0 };
  host.log.info('[stats] Game started.');
});

host.subscribeEvent('SCORE_CHANGED', (payload) => {
  const score = (payload as { score?: number })?.score ?? 0;
  if (score > runStats.peakScore) runStats.peakScore = score;
});

host.subscribeEvent('POWER_UP_PICKED', (payload) => {
  const type = (payload as { powerupType?: string })?.powerupType;
  runStats.picks++;
  host.log.debug(`[stats] Power-up #${runStats.picks}: ${type}`);
});

host.subscribeEvent('GAME_OVER', async (payload) => {
  const final = (payload as { finalScore?: number })?.finalScore ?? 0;
  host.log.info(
    `[stats] Game over. Score ${final}, `
    + `peak ${runStats.peakScore}, ${runStats.picks} power-ups.`,
  );
});
```

---

## 2 — Point query with `host.state`

Sometimes you need to read game state without waiting for an
event. For example, "when the player toggles a switch, read the
current score and offer to multiply it".

```ts
host.subscribeEvent('MY_TOGGLE_CHANGED', async () => {
  const result = await host.state.read('game.score');
  if (result.ok) {
    host.log.info(`Current score: ${result.value}`);
  }
});
```

**Required permission**:

```json
{
  "type": "state-read",
  "paths": ["game.score", "game.level", "game.lives"],
  "rationale": "Reads the current game state to show statistics."
}
```

`state-read` with explicit `paths`. The system rejects wildcards
(`game.*`) for security.

> `host.state.write` also exists but requires the `state-write`
> permission and is NOT recommended — changes to the game state
> from a mod should go through host functions (`callHostFn`) so
> the game can validate them. State written freely from a mod can
> corrupt the play session.

---

## 3 — Notify the player with `host.dispatch`

To announce something to the player (in-game toast, not console
log), use `host.dispatch`:

```ts
host.subscribeEvent('POWER_UP_PICKED', (payload) => {
  const type = (payload as { powerupType?: string })?.powerupType;
  if (type === 'goldenApple') {
    host.dispatch('MOD_NOTIFICATION', {
      text: 'Golden Apple! +500 points.',
      duration: 2500,
      kind: 'success',
    });
  }
});
```

**Permission**:

```json
{
  "type": "events",
  "dispatch": ["MOD_NOTIFICATION"],
  "rationale": "Notifies the player when they pick a special power-up."
}
```

(If you already have an `events` entry with `subscribe`, you can
add `dispatch` to the same object.)

`MOD_NOTIFICATION` is a canonical event that the game shell
intercepts and shows as a toast. The payload accepts `text`,
`duration` (ms), `kind` (`info`/`success`/`warning`/`error`).

---

## 4 — Throttle / debounce for frequent events

`SCORE_CHANGED` may emit many times per second. If your handler
does something expensive (write storage, render UI), you should
throttle:

```ts
let lastSync = 0;
host.subscribeEvent('SCORE_CHANGED', async (payload) => {
  const now = Date.now();
  if (now - lastSync < 1000) return; // max 1 sync/second
  lastSync = now;

  const score = (payload as { score?: number })?.score ?? 0;
  await host.storage?.set('lastScore', score);
});
```

The equivalent pattern with `requestIdleCallback` or
`setTimeout` also works. The rule is: **DON'T block the main
thread in a high-frequency event handler**.

---

## 5 — Structured logging

`host.log` has 4 levels:

```ts
host.log.debug('internal detail, hidden by default');
host.log.info('normal cycle events');
host.log.warn('non-fatal but worth checking');
host.log.error('real error, captured in `mod.errors.*` telemetry');
```

In dev builds all of them show in DevTools. In retail builds, only
`warn`/`error` are persisted in `Settings → Mods → <mod> → Logs`.
`debug` is silenced unless the player enables "Developer mode"
(easter egg).

---

## 6 — Caveat: payloads come without type

The runtime evaluates your code in a sandbox; payloads travel via
serialization. TypeScript helps you in your source code but the
sandbox does NOT validate the payload's shape — the game can
change the shape between versions. That's why real code uses
runtime guards:

```ts
function isScoreChangedPayload(p: unknown): p is { score: number } {
  return (
    typeof p === 'object'
    && p !== null
    && typeof (p as { score: unknown }).score === 'number'
  );
}

host.subscribeEvent('SCORE_CHANGED', (payload) => {
  if (!isScoreChangedPayload(payload)) {
    host.log.warn('[stats] SCORE_CHANGED with unexpected payload');
    return;
  }
  // Here TypeScript knows that payload.score: number.
});
```

For serious mods, define these guards in `src/types.ts` and reuse
them.

---

## What you've learned

- **Catalog of events**: `GAME_STARTED`, `GAME_OVER`,
  `SCORE_CHANGED`, `LEVEL_UP`, `POWER_UP_PICKED`/`EXPIRED`,
  `GAME_PAUSED`/`RESUMED`.
- **`host.state.read(path)`** for point queries with `state-read.paths`
  permission.
- **`host.dispatch('MOD_NOTIFICATION', ...)`** for in-game toast.
- **Throttle** for high-frequency events.
- **`host.log`** with 4 levels + different persistence per build.
- **Runtime guards** for payloads — TypeScript doesn't reach the
  sandbox.

## What's next

[**Lesson 4 — Customize power-ups (Snake-specific)**](04-power-ups.md).
You'll dynamically register 22 toggles for Snake's 22 power-ups.
You'll learn the "array → auto-generated UI" pattern and how to
reference the game's power-up catalog from your mod.
