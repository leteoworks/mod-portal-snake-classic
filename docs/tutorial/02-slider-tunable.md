<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm mods:sync-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# Lesson 2 — Slider that tunes the game in real time

Goal: add a slider to your mod's tab that controls **Snake's
initial speed** (parameter `initialSpeedTickMs`). The change
applies at the start of each game.

> Real reference code: [`studio.gameplay-tuner`](https://github.com/leteoworks/mod-template-snake-classic)
> does exactly this with 3 sliders (lives, speed, points per food).
> You can read it at any point.

---

## New concept: tunables

A **tunable** is a game value exposed to the mod system so mods
can read and modify it. Snake Classic exposes ~30 tunables today
(lives, speed, points, spawn rates, intervals…). The game decides
which ones it exposes — from your mod you consume them via
`host.callHostFn`.

**Canonical host functions for tunables**:

| Function | What it does |
|---|---|
| `gameConfigSet({ name, value })` | Applies an override to the tunable `name`. |
| `gameConfigReset({ name })` | Removes the override; restores the game default. |
| `gameConfigSnapshot()` | Reads all active tunables + their current values. |

Each tunable has `min`, `max`, `step`, `default`, and a type
(`number`, `boolean`, `string`). You discover them by looking at
the descriptor the game registers — or, in practice, by reading
the game's `tunables.ts` in the monorepo.

---

## 1 — Declare `game-specific` permission

In `mod.json`, add to the permissions array:

```json
{
  "type": "game-specific",
  "surface": "tunables",
  "actions": ["set", "reset", "snapshot"],
  "rationale": "Modifies the initial speed of Snake chosen by the player."
}
```

Without this permission, `host.callHostFn('gameConfigSet', ...)`
rejects with `permission-denied`. The player will see it in the
activation prompt.

---

## 2 — Add the slider to the tab

`src/index.ts`:

```ts
host.registerSettingsTab?.({
  id: 'hello-mod',
  title: 'Hello Mod',
  icon: 'mood',
  sections: [
    {
      kind: 'card',
      title: 'Speed',
      children: [
        {
          kind: 'slider',
          label: 'Initial speed (ms/tick)',
          min: 80,
          max: 500,
          step: 10,
          binding: 'tunables.initialSpeedTickMs',
        },
      ],
    },
    {
      kind: 'card',
      title: 'Greeting',
      children: [
        {
          kind: 'toggle',
          label: 'Greet at game over',
          binding: 'greetOnGameOver',
        },
      ],
    },
  ],
});
```

**Key detail about the `binding`**:
- `binding: 'tunables.initialSpeedTickMs'` (with `tunables.` prefix)
  → the runtime applies the change **automatically** via
  `gameConfigSet` every time the player moves the slider. You DON'T
  write a handler.
- `binding: 'greetOnGameOver'` (no prefix) → only writes to the
  mod's `host.storage`. Does NOT touch the game.

In other words, the `tunables.` prefix is the "magic link" between
your mod's UI and the game's values. Any other name = mod storage.

---

## 3 — Apply config at the start of each game

The slider applies "live" while the player moves it in Settings.
But what if the player closes the game and reopens it? The value
is persisted in storage, but the game starts with its defaults
until the player goes through the slider again.

To avoid that: re-apply at the start of each game.

```ts
host.subscribeEvent('GAME_STARTED', async () => {
  const result = await host.storage?.get('tunables.initialSpeedTickMs');
  if (result?.ok && typeof result.value === 'number') {
    await host.callHostFn('gameConfigSet', {
      name: 'initialSpeedTickMs',
      value: result.value,
    });
    host.log.debug(
      `[hello-mod] Initial speed applied: ${result.value}ms`,
    );
  }
});
```

Add `"GAME_STARTED"` to the `subscribe` list in the `events`
permission of `mod.json`.

---

## 4 — Anti-pattern: last-write-wins

There's a subtle trap:
- The UI has a `binding: 'tunables.initialSpeedTickMs'`. If you
  move it, the runtime writes to storage AND to the game.
- Your `GAME_STARTED` hook reads from storage and writes to the
  game.

If the order is UI-write → hook-read → hook-write, the hook
writes the same value, no problem. But if two handlers write with
different logic, the last one wins.

**Rule**: DON'T mix direct binding + a hook that writes the same
key. Pick one:
- **Only binding**: for values the player edits and apply live. The
  game no longer receives the change at start if it restarts.
- **Only hook**: for derived values or presets that need pre-
  computation.

In this tutorial we use both because they're sequential reads on
the same key — they don't compete. If you add a "Reset to
defaults" button that rewrites the key, it'll also apply via the
slider's binding. Coherent.

---

## 5 — Build + test

```bash
pnpm build
# Copy to sideload (see Lesson 1, step 5)
```

In the game:
1. Reload (mods are loaded at boot).
2. The "Hello Mod" tab now shows the speed slider.
3. Move it → watch the log `[hello-mod] Initial speed applied`.
4. Start a game. The initial speed matches your slider.

---

## 6 — Reset to defaults

Add a button to the tab:

```ts
{
  kind: 'card',
  title: 'Actions',
  children: [{
    kind: 'button',
    label: 'Restore default speed',
    variant: 'ghost',
    action: { kind: 'event', name: 'HELLO_RESET_SPEED' },
  }],
}
```

And the handler:

```ts
host.subscribeEvent('HELLO_RESET_SPEED', async () => {
  await host.callHostFn('gameConfigReset', {
    name: 'initialSpeedTickMs',
  });
  // Clear storage too so the slider shows the game's default
  // next time it renders.
  await host.storage?.remove('tunables.initialSpeedTickMs');
});
```

Add `"HELLO_RESET_SPEED"` to the `subscribe` list of `events`.

---

## What you've learned

- **Tunables**: game values exposed to the mod via host functions
  (`gameConfigSet`/`gameConfigReset`/`gameConfigSnapshot`).
- **Binding with `tunables.` prefix**: applies to the game live.
- **Binding without prefix**: only mod storage.
- **`GAME_STARTED` hook** to re-apply at the start of each game
  (resilient to game restart).
- **Anti-pattern** last-write-wins between UI binding + hook.

## What's next

[**Lesson 3 — React to what happens in-game**](03-game-events.md).
You'll use more events: `SCORE_CHANGED`, `POWER_UP_PICKED`, etc.
You'll learn `host.state.read` for point queries and
`host.dispatch` for in-game notifications.

---

## Appendix — tunables available in Snake Classic

Partial list (see [`tunables.ts`](https://github.com/leteoworks/my-game-fw/blob/main/src/games/snake-classic/mods/tunables.ts)
of the game for the full catalog):

| Tunable | Type | Range | Description |
|---|---|---|---|
| `maxLives` | number | 1-50 | Max lives |
| `initialSpeedTickMs` | number | 80-500 | ms between ticks at start |
| `pointsPerFood` | number | 1-100 | Points per normal food |
| `powerupIntervalMs` | number | 1000-30000 | Interval between power-ups |
| `powerup<Name>Enabled` | boolean | - | Enable/disable the power-up |

(The full catalog is ~30 tunables. Power-ups are 22 toggles.)

> If you need a tunable the game hasn't exposed yet, open an issue
> on the game's repo or a PR adding the `defineTunable(...)` in
> `tunables.ts`.
