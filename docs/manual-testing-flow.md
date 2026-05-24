<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm mods:sync-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# End-to-end manual testing flow (dev simulating Steam)

Step-by-step recipe to reproduce in dev the complete flow a user
would follow after downloading the game from Steam, enabling a
studio-bundled mod and using it to change game values. Useful for
manual QA, demos, regression debugging, and validation of new
mods before release.

> Companion doc: [`dev-workflow.md`](dev-workflow.md) —
> **development** workflow (how to build a mod). This doc covers
> the **runtime** side (how to test it like a user would).

---

## TL;DR — one command

```bash
GAMEFW_MODS_BUNDLED_ONLY=1 pnpm dev:mod snake-classic studio.gameplay-tuner
```

That compiles the mod, starts esbuild watch, brings up Quasar dev
with the ModRuntime in "bundled-only" mode (= Steam mode), and
leaves the edit→see cycle open. Open `http://localhost:9000`, go
to Snake → Settings → Mods, activate the mod, and use it.

---

## Why the `GAMEFW_MODS_BUNDLED_ONLY=1` flag

The mod framework has **three mutually exclusive build modes**:

| Flag | Includes | When to use |
|---|---|---|
| `GAMEFW_MODS=1` | Workshop + sideload + bundled | Electron on Steam with Workshop enabled |
| `GAMEFW_MODS_BUNDLED_ONLY=1` | Only bundled (no Workshop/sideload) | Steam without Workshop, App Store iOS, Google Play |
| `(none)` | No-op stub — runtime absent | App Store strict, mod-free builds |

Without flag, the runtime bootstrap detects the mode via literal
env (`process.env.GAMEFW_MODS === 'true'` or
`GAMEFW_MODS_BUNDLED_ONLY === 'true'`) and, if both are falsy,
returns `null` — **the "Mods" tab doesn't appear in Settings**.

To simulate the standard Steam flow we use
`GAMEFW_MODS_BUNDLED_ONLY=1`: the same mode in which the
executable downloaded from the Store ships.

Normative spec for the modes:
[build-modes.md](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/architecture/build-modes.md).

---

## Prerequisites

What you need ready before starting the flow:

1. **Repo cloned with submodule**:
   ```bash
   git clone --recursive <parent-url>
   # or, after a normal clone:
   git submodule update --init --recursive
   ```
2. **pnpm install** already run in the parent repo.
3. **`game-mods/snake-classic/studio.gameplay-tuner/`** present
   with `mod.json` + `src/`. True if your `game-mods/` subrepo
   copy is at HEAD `6e63cab` or later.
4. **Modern browser** open at `http://localhost:9000` (Chrome,
   Firefox, Safari). DevTools recommended to see sandbox logs.
5. **(Optional)** `DEBUG=mod-runtime:*` exported if you want
   verbose runtime bootstrap logging.

---

## End-to-end flow step by step

Each step indicates what you **should see** to confirm it works.

### Step 1 — Start dev

```bash
GAMEFW_MODS_BUNDLED_ONLY=1 pnpm dev:mod snake-classic studio.gameplay-tuner
```

**What you see in terminal**:

```
[dev-mod] preparing game=snake-classic mods=[studio.gameplay-tuner]
[build-game-mods] ✓ 2 mod(s) processed for snake-classic.
  - Manifest: src/games/snake-classic/mods/bundled/bundled-mods-manifest.json
  - Sources:  src/games/snake-classic/mods/bundled-mods-sources.generated.ts
  - Sign:     skip (dev)
[validate-i18n] ✓ all keys present.
[watch:studio.gameplay-tuner] [gameplay-tuner] build OK
[dev:game]                    READY  Quasar dev server running at http://localhost:9000
```

If you see `[build-game-mods] no mods in game-mods/snake-classic/`,
the subrepo isn't initialized — run `git submodule update --init`.

### Step 2 — Open the game

Navigate to `http://localhost:9000` → Snake Reloaded **home**
screen.

**Quick verification in DevTools console**:

```js
window.__SNAKE_MOD_RUNTIME__   // should be an object, not undefined
```

If it's `undefined`, the `GAMEFW_MODS_BUNDLED_ONLY=1` env var
didn't reach the build — check the command. The simple way to
re-validate:

```js
process.env.GAMEFW_MODS_BUNDLED_ONLY  // 'true' in the bundle
```

Webpack does substitution at build time (DefinePlugin), so
restart `pnpm dev:mod ...` with the correct env var if it fails.

### Step 3 — Open Settings and see the "Mods" tab

Click the **Settings** button in the home → settings panel
opens. A **Mods** tab should appear among the others (likely
the last).

**If it does NOT appear**:
- Look at the console for `mod.bootstrap.*` signals — typically
  `mod.bootstrap.disabled-by-remote` if the remote-config sends
  `enabled: false`, or `mod.bootstrap.flag-mismatch` if the env
  var wasn't re-injected.
- Verify the component is mounted: in DevTools, Elements → look
  for `SnakeModsTab` or `ModsSettingsTab`. If it's not in the
  DOM, check `src/pages/snake-classic/settings.page/settings.page.vue`.

### Step 4 — Activate `studio.gameplay-tuner`

Inside the "Mods" tab there's a list with the game's bundled
mods. You should see two entries:

- `studio.gameplay-tuner` (v0.1.0) — toggle OFF by default.
- `studio.fun-config` (v1.0.0) — toggle OFF by default.

Click the `studio.gameplay-tuner` toggle. Internally:

1. `runtime.activate(modId)` is called.
2. The loader resolves the bundle from
   `bundled-mods-sources.generated.ts` (the `?raw` content of
   `dist/mod.js`).
3. The `quickjs-declarative-ui` engine evaluates the bundle in
   its WASM sandbox.
4. The mod runs its entry point (compiled `src/index.ts`) that
   calls:
   - `host.registerSettingsTab(buildSettingsTabDescriptor())` —
     creates the sub-tab.
   - `host.subscribeEvent('GAME_STARTED', cb)` — re-applies
     config at game start.
   - `host.subscribeEvent('MOD_GT_APPLY_PRESET', cb)` — listens
     to the "Apply preset" button.
5. `host.log.info('[gameplay-tuner] loaded v0.1.0')` prints to
   the runtime's logs panel (DevTools debug).

**Verification**: a new sub-tab called **"Gameplay Tuner"**
should appear inside the Mods tab (or as a top-level tab,
depending on the HostUI shell).

### Step 5 — Change a tunable

In the "Gameplay Tuner" tab you'll see 3 sliders:

- **Max lives** (range 1-50, current value 25)
- **Initial speed (ms/tick)** (range 80-500, value 200)
- **Points per food** (range 1-100, value 10)

Move the **Max lives** slider to `3`.

**What happens internally**:

```
UI slider change
  → binding `tunables.maxLives` updates
  → HostUI shell maps binding to the host fn
  → host.callHostFn('gameConfigSet', { name: 'maxLives', value: 3 })
  → sandbox bridge → runtime
  → registerModHostFunction handler runs
  → tunable._setOverride(3)
  → subsequent gameplay `maxLives.get()` returns 3
```

**Verification**: in host DevTools console:

```js
// The override is applied:
window.__SNAKE_DEBUG__?.tunables?.snapshot()
// → { maxLives: 3, initialSpeedTickMs: 200, pointsPerFood: 10 }
```

(If that API doesn't exist, the alternative is to see the mod
log when it re-applies on the next `GAME_STARTED`.)

### Step 6 — Play and observe the effect

1. Return to home, click "Play".
2. The `GAME_STARTED` event fires → the mod's hook re-reads
   storage and calls `gameConfigSet` again (defensive, redundant
   with the slider binding but resilient to restarts).
3. The game starts with **3 max lives** instead of 25.
4. Crash 3 times — game over.

### Step 7 — Apply a preset

Back in Settings → Mods → Gameplay Tuner, scroll down to the
"Presets" section. Click "Easy". Internally:

1. The button's `action: { kind: 'event', name: 'MOD_GT_APPLY_PRESET', payload: { preset: 'easy' } }`
   fires `MOD_GT_APPLY_PRESET` with the payload.
2. The mod's handler:
   - Calls `gameConfigSet` for each tunable in the preset.
   - Persists the new state in `host.storage`.
   - Tracks `gameplay_tuner_preset_applied` analytics event.
3. The sliders' UI reflects the new values (binding ←→ storage).

### Step 8 — Disable the mod

Toggle `studio.gameplay-tuner` OFF in the Mods tab. Internally:

1. `runtime.deactivate(modId)`.
2. The mod's `onDeactivate` hook runs.
3. The engine's sandbox is disposed.
4. Tunable overrides applied by the mod are **kept** (the
   override system is not auto-reset on mod deactivate — design
   decision: deactivating a mod doesn't roll back its effects).
5. The Gameplay Tuner sub-tab disappears.

To restore game defaults: in the mod, click "Reset all" before
deactivating, or manually `gameConfigReset` per tunable.

---

## Troubleshooting

### "The mods tab doesn't appear in Settings"

Most common: `GAMEFW_MODS_BUNDLED_ONLY=1` not reached the build.
Verify in DevTools console: `process.env.GAMEFW_MODS_BUNDLED_ONLY`
should be `'true'`. If it's `undefined`, kill the dev server and
restart with the env var prepended to the command.

### "I activate the mod but nothing happens"

Look at DevTools console for:
- `mod.lifecycle.activated` signal with the modId.
- `[gameplay-tuner] loaded v0.1.0` log from the mod itself.

If the second doesn't appear, the bundle didn't evaluate. Likely
causes:
- The engine the mod requires (`quickjs-declarative-ui`) isn't
  in the game's policy.engines.
- The bundle source is empty or has a syntax error. Check
  `dist/mod.js` directly.

### "The slider doesn't apply the change to gameplay"

Check that the gameplay code is reading `.get()` of the tunable
and NOT a captured `const` at module load. If the gameplay reads
the constant value at import time, the override doesn't apply.

```ts
// ❌ Wrong:
import { maxLives } from './tunables';
function spawnPlayer() {
  return new Player({ lives: maxLives }); // captured at import
}

// ✅ Right:
import { maxLives } from './tunables';
function spawnPlayer() {
  return new Player({ lives: maxLives.get() }); // fresh read
}
```

### "Logs from the mod don't show in DevTools"

`host.log.debug` is filtered by default in retail. In dev:
- Open DevTools (Cmd+Opt+I / Ctrl+Shift+I).
- Look at the Console tab.
- Filter by `[gameplay-tuner]` or `[mod-runtime]`.

If the mod is on but you see no logs, the bundle may not be
running. Look for `mod.lifecycle.activated` for the modId.

### "I want to capture QA evidence"

Useful patterns for documenting QA runs:

1. **Screenshots** of the sliders + the game showing the effect.
2. **DevTools console export** with the `[gameplay-tuner]` logs
   filtered.
3. **`window.__SNAKE_DEBUG__.tunables.snapshot()`** screenshot
   showing the override is applied.
4. **`mod.engagement_tick` event** in PostHog (if enabled)
   confirming the mod was used during the session.

---

## Variants

### Test multiple mods at once

```bash
GAMEFW_MODS_BUNDLED_ONLY=1 pnpm dev:mod snake-classic studio.gameplay-tuner studio.fun-config
```

Both mods get watched. Activate both in the Mods tab. The HostUI
shell handles tab merging.

### Test with Workshop simulation (advanced)

```bash
GAMEFW_MODS=1 pnpm dev:game snake-classic
```

Enables the WorkshopModSource. By default it points to no Steam
backend (we're in dev), so it lists no Workshop mods. But the
runtime code-path is the same as production Steam.

To inject a Workshop mod from local disk for testing, see
[sideload-ux/README.md](https://github.com/leteoworks/my-game-fw/tree/main/src/modules/mod-runtime/sideload-ux).

### Reset the game's userData

If you've been playing extensively and want to start fresh:

```bash
# macOS:
rm -rf ~/Library/Application\ Support/snake-classic/
# Windows: %APPDATA%/snake-classic/
# Linux:   ~/.config/snake-classic/
```

This wipes save data, mod activations, settings. Restart the
game.

---

## Cross-links

- [dev-workflow.md](dev-workflow.md) — companion dev doc
- [build-modes.md](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/architecture/build-modes.md)
  — normative spec for the 3 modes
- [lifecycle.md](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/architecture/lifecycle.md)
  — mod lifecycle (activate / deactivate / load / dispose)
- [studio.gameplay-tuner source](https://github.com/leteoworks/my-game-fw-mods/tree/main/snake-classic/studio.gameplay-tuner)
  — the reference mod used in this flow
