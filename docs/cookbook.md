<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm mods:sync-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# Cookbook — copy-paste recipes

Solutions to concrete problems that come up while writing mods.
Each recipe is independent — read them in any order. If you've
never written a mod, start with
[`tutorial/`](tutorial/01-hello-mod.md).

> Convention: snippets in TypeScript. The runtime engine evaluates
> your bundled `dist/mod.js`, not your TS directly. Use `tsc` /
> `esbuild` with `--target=es2020`.

---

## Index

1. [Slider that tunes a game value in real time](#1)
2. ["Reset to defaults" button applying N bindings at once](#2)
3. [Register N toggles from an array (boilerplate reduction)](#3)
4. [Persist a large JSON object without exceeding quotaKb](#4)
5. [Read game state + react to event at the same time](#5)
6. [Throttle SCORE_CHANGED to avoid spam](#6)
7. [i18n with own namespace + English fallback](#7)
8. [Load a custom icon (+ screenshots for Workshop)](#8)
9. [Coordinate UI binding with hook without race](#9)
10. [Custom analytics event declared + tracked](#10)

---

## 1 — Slider that tunes a game value in real time {#1}

**Problem**: I want a slider that controls Snake's initial speed.
The change applies live AND persists across games.

**Recipe**:

```ts
// settings-tab.ts
{
  kind: 'slider',
  label: 'Initial speed (ms/tick)',
  min: 80, max: 500, step: 10,
  binding: 'tunables.initialSpeedTickMs',
}
```

```ts
// index.ts — only re-apply at game start
host.subscribeEvent('GAME_STARTED', async () => {
  const r = await host.storage?.get('tunables.initialSpeedTickMs');
  if (r?.ok && typeof r.value === 'number') {
    await host.callHostFn('gameConfigSet', {
      name: 'initialSpeedTickMs', value: r.value,
    });
  }
});
```

```json
// mod.json — required permissions
{ "type": "game-specific", "surface": "tunables", "actions": ["set"], "rationale": "..." },
{ "type": "events", "subscribe": ["GAME_STARTED"], "rationale": "..." },
{ "type": "storage", "quotaKb": 16, "rationale": "..." }
```

**Why it works**: the `tunables.` prefix in the binding
automatically connects the UI to the game via `gameConfigSet`.
The extra hook is just defensive against game restarts.

---

## 2 — "Reset to defaults" button applying N bindings at once {#2}

**Problem**: 22 toggles. Button that sets them all to their
defaults.

**Recipe**:

```ts
const DEFAULT_TOGGLES: Record<string, boolean> = {
  powerupSpeedBoostEnabled: true,
  powerupInvincibilityEnabled: false,
  // … 20 more
};

host.subscribeEvent('MYMOD_RESET_DEFAULTS', async () => {
  await Promise.all(
    Object.entries(DEFAULT_TOGGLES).map(([name, value]) =>
      host.callHostFn('gameConfigSet', { name, value })
    )
  );

  // Persist so the UI reflects the state.
  await Promise.all(
    Object.entries(DEFAULT_TOGGLES).map(([name, value]) =>
      host.storage?.set(`tunables.${name}`, value)
    )
  );

  host.dispatch('MOD_NOTIFICATION', {
    text: 'Defaults restored.', kind: 'info',
  });
});
```

**Key**: `Promise.all` applies the 22 calls in parallel (~3-5 ms
total) instead of serially (~20 ms). When calls are idempotent
and unordered, always `Promise.all`.

---

## 3 — Register N toggles from an array {#3}

**Problem**: 22 power-ups. I DON'T want to write 22 blocks of
`{ kind: 'toggle', label: ..., binding: ... }`.

**Recipe**:

```ts
interface Toggle { binding: string; label: string }

const TOGGLES: Toggle[] = [
  { binding: 'tunables.powerupSpeedBoostEnabled', label: 'Speed Boost' },
  { binding: 'tunables.powerupInvincibilityEnabled', label: 'Invincibility' },
  // … 20 more
];

const children = TOGGLES.map((t) => ({
  kind: 'toggle' as const,
  label: t.label,
  binding: t.binding,
}));

host.registerSettingsTab?.({
  id: 'mymod', title: 'Power-Ups', icon: 'extension',
  sections: [{ kind: 'card', title: 'Toggles', children }],
});
```

**Variant with i18n**:

```ts
const TOGGLES = [
  { binding: 'tunables.powerupSpeedBoostEnabled',
    i18nKey: 'mymod.pu.speed', fallback: 'Speed Boost' },
  // …
];

const children = TOGGLES.map((t) => ({
  kind: 'toggle' as const,
  label: host.i18n?.t(t.i18nKey) ?? t.fallback,
  binding: t.binding,
}));
```

---

## 4 — Persist a large JSON object without exceeding quotaKb {#4}

**Problem**: `quotaKb: 32` in the manifest. I want to save an
object with N fields without splitting it.

**Recipe — compress if you approach the limit**:

```ts
const STORAGE_KEY = 'mymod.settings';

async function persist(obj: object): Promise<void> {
  const serialized = JSON.stringify(obj);
  // 32 KB = 32 * 1024 chars (~ — depends on encoding).
  if (serialized.length > 28 * 1024) {
    host.log.warn(
      `[mymod] Settings near limit: ${serialized.length} chars`,
    );
  }
  const r = await host.storage?.set(STORAGE_KEY, obj);
  if (!r?.ok) {
    host.log.error(`[mymod] storage.set failed: ${r?.error?.message}`);
  }
}

async function load<T>(defaults: T): Promise<T> {
  const r = await host.storage?.get(STORAGE_KEY);
  if (!r?.ok || !r.value) return defaults;
  return { ...defaults, ...(r.value as Partial<T>) };
}
```

**Key pattern**: `{ ...defaults, ...stored }` fills new keys with
their defaults when storage has an object from an older version.
**Migration without migration code**.

If your object grows beyond quotaKb, refactor to multiple keys
(`mymod.settings.toggles`, `mymod.settings.presets`, etc.).

---

## 5 — Read game state + react to event at the same time {#5}

**Problem**: when the player crosses 100 points, I want to read
their current level and decide.

**Recipe**:

```ts
host.subscribeEvent('SCORE_CHANGED', async (payload) => {
  const score = (payload as { score?: number })?.score ?? 0;
  if (score < 100 || score % 100 !== 0) return;

  // Read level without waiting for LEVEL_UP.
  const levelResult = await host.state.read('game.level');
  if (!levelResult.ok) return;

  const level = levelResult.value as number;
  host.dispatch('MOD_NOTIFICATION', {
    text: `Milestone ${score} points at level ${level}!`,
    kind: 'success',
  });
});
```

**Permissions**:

```json
{ "type": "events", "subscribe": ["SCORE_CHANGED"], "dispatch": ["MOD_NOTIFICATION"], "rationale": "..." },
{ "type": "state-read", "paths": ["game.level"], "rationale": "..." }
```

`state-read.paths` must be explicit; wildcards rejected.

---

## 6 — Throttle SCORE_CHANGED to avoid spam {#6}

**Problem**: `SCORE_CHANGED` may emit 10× per second. My handler
does storage.set — it needs to be limited.

**Recipe**:

```ts
let lastSync = 0;
const SYNC_INTERVAL_MS = 1000;

host.subscribeEvent('SCORE_CHANGED', async (payload) => {
  const now = Date.now();
  if (now - lastSync < SYNC_INTERVAL_MS) return;
  lastSync = now;

  const score = (payload as { score?: number })?.score ?? 0;
  await host.storage?.set('lastScore', score);
});
```

**"Debounce" variant (wait N ms after last event)**:

```ts
let timer: number | null = null;
host.subscribeEvent('SCORE_CHANGED', (payload) => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    const score = (payload as { score?: number })?.score ?? 0;
    await host.storage?.set('lastScore', score);
    timer = null;
  }, 500) as unknown as number;
});
```

Throttle = "max 1 every N". Debounce = "wait until quiet for N
ms".

---

## 7 — i18n with own namespace + English fallback {#7}

**Problem**: I want my mod to render in the player's language.

**Recipe**:

```
my-mod/
├── locales/
│   ├── en.json    # canonical (fallback)
│   ├── es.json
│   └── fr.json
```

```json
// mod.json
{ "type": "i18n", "namespaces": ["mymod"], "rationale": "..." }
```

```ts
function t(key: string, fallback: string): string {
  return host.i18n?.t(key) ?? fallback;
}

// Usage
const label = t('mymod.tab.title', 'My Mod');
```

**Rules**:
- All keys start with the namespace (`mymod.*`). The framework
  rejects out-of-namespace keys.
- Fallback chain: `t(key, fallback)` → if the player's locale
  doesn't have `key`, it tries `en.json`. If that's also missing,
  it returns `fallback` (code literal).
- `en.json` is canonical — always register it even if you don't
  translate to more languages.

---

## 8 — Custom icon + screenshots for Workshop {#8}

**Problem**: I want my mod to have its own icon visible in
Settings and screenshots in Workshop.

**Recipe**:

```
my-mod/
├── icon.png            # 256x256, <100 KB
├── screenshots/         # for Workshop (optional)
│   ├── 01.png          # 1920x1080 recommended
│   ├── 02.png
│   └── 03.png
└── mod.json
```

```json
// mod.json
"metadata": {
  "icon": "icon.png",
  "tags": ["customization"]
}
```

The `metadata.icon` field must be a path relative to the mod's
root. The framework validates format + size.

For screenshots, **they don't go in mod.json** — you upload them
directly in the Workshop form when creating the item.

---

## 9 — Coordinate UI binding with hook without race {#9}

**Problem**: I have a `'tunables.maxLives'` binding (UI writes to
the game) AND a `GAME_STARTED` hook that re-applies. Isn't that
a race?

**Recipe — the canonical pattern**:

```ts
// Only the hook writes to the game. The binding only persists to
// the mod's storage. No race possible.
host.registerSettingsTab?.({
  // …
  children: [{
    kind: 'slider',
    label: 'Lives',
    min: 1, max: 50,
    binding: 'mymod.maxLives',  // ← NO tunables. prefix
  }],
});

host.subscribeEvent('GAME_STARTED', async () => {
  const r = await host.storage?.get('mymod.maxLives');
  if (r?.ok && typeof r.value === 'number') {
    await host.callHostFn('gameConfigSet', {
      name: 'maxLives', value: r.value,
    });
  }
});
```

Here the slider writes to `mymod.maxLives` (mod's internal
storage). The game ONLY sees the change at `GAME_STARTED`. Zero
race.

**Alternative — only binding**:

```ts
// The UI applies to the game live, NO hook. The value is "lost"
// between sessions if the player closes and reopens the game.
binding: 'tunables.maxLives',
```

When acceptable: if the player always goes through Settings
before starting a game, or if you want the value "not to
persist" across sessions.

---

## 10 — Custom analytics event declared + tracked {#10}

**Problem**: I want to know how many times the player applies the
"Hardcore" preset.

**Recipe**:

```json
// mod.json
"analytics": {
  "events": [
    {
      "name": "mymod_preset_applied",
      "description": "Player applied a preset",
      "schema": { "preset": "string" }
    }
  ]
}
```

```ts
host.subscribeEvent('MYMOD_APPLY_PRESET', async (payload) => {
  const name = (payload as { preset?: string })?.preset;
  if (!name) return;

  // … apply the preset …

  host.analytics?.track('mymod_preset_applied', { preset: name });
});
```

**Rules**:
- Custom events must be **declared** in `analytics.events` of
  the manifest. The framework rejects `track()` with an
  undeclared name.
- The `schema` declares what fields go in each event. Serves as
  documentation + lets the framework filter PII by convention
  (fields like `email`, `userId` require rationale).
- The player can opt-out of analytics in Settings → Privacy.
  Your `track()` becomes a silent no-op. NOTHING breaks.

---

## More recipes

If you're missing a recipe, open an issue at the
[template repo](https://github.com/leteoworks/mod-template-snake-classic/issues)
with the specific problem. The intent is for this cookbook to
grow with real community cases.

## See also

- [`tutorial/`](tutorial/01-hello-mod.md) — step-by-step course
  from hello world.
- [`api-reference.md`](api-reference.md) — full `host.*` catalog.
- [`troubleshooting.md`](troubleshooting.md) — symptoms → fixes.
