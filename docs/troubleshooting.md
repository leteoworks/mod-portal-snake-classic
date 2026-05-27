<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm mods:sync-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# Troubleshooting — symptoms and diagnoses

Table of common problems when writing or publishing mods, with
likely cause and fix. If your problem isn't here, open an issue
at the [template repo](https://github.com/leteoworks/submodules/mod-template-snake-classic/issues)
with the exact symptom.

---

## Quick table

| Symptom | Likely cause | Fix |
|---|---|---|
| Mod doesn't appear in Settings → Mods | Wrong sideload path, missing `mod.json`, `target.gameId` mismatch | Verify canonical path by OS (below). Verify `target.gameId` in `mod.json`. |
| "Failed to activate" in the permissions prompt | A permission required by code is NOT declared in `mod.json` | Look at the console log. Add the permission to the manifest. Restart the game. |
| Mod tab appears empty | `kind` not recognized by the engine, typo in `binding`, section without `children` | Validate descriptor against [`multi-engine.md`](multi-engine.md) § "embedded vocabulary". |
| Logs don't appear in console | Dev build without DevTools open, or `host.log.debug` filtered | Dev build (Electron): View → Toggle Developer Tools. In retail: `Settings → Mods → <mod> → Logs`. |
| "entry not found" on load | `entry` in manifest points to a non-existent path | Verify `dist/mod.js` after `pnpm build`. |
| "Permission denied" on `storage.set` | `storage` permission not declared or `quotaKb` exceeded | Add `{ "type": "storage", "quotaKb": 32, ... }` to the manifest. |
| HMR doesn't update after edit | Running only `pnpm build`, not `pnpm dev:mod` | Use `pnpm dev:mod <gameId> <modId>` (first-party workflow). |
| Mod active but game doesn't change | The `binding` doesn't apply to the game, missing hook | If `binding: 'tunables.X'` → applies. If `binding: 'custom.X'` → only storage, you need a hook. |
| App Store rejects the bundle | `network` permission declared or `dynamic-code` in iOS build | Use `GAMEFW_MODS_BUNDLED_ONLY=1`. See [`manifest-format.md`](manifest-format.md) § iOS compliance. |
| `pnpm mods:validate` fails with "unknown permission" | Permission `type` misspelled | Valid types: `events`, `settings-ui`, `storage`, `game-specific`, `i18n`, `state-read`, `state-write`, `network`, `dlc`. |
| `gameConfigSet` rejects with "not-found" | Tunable name typo or game doesn't expose that tunable | List of available tunables in the game's `tunables.ts`. |
| Mod works in dev but fails in retail | Missing signature, dev build included in pack | `pnpm build:release` before `pnpm pack`. |
| Workshop upload without "Submit" button | Missing required field (Title, Description, Tag) | Fill in all required fields of the Steam form. |
| `degit` fails with 404 | Template repo not public, or name misspelled | Verify `leteoworks/mod-template-snake-classic` is accessible. |
| `pnpm build` slow (>30s) | Bundling with external deps not marked | `mod.json.entry` must point to an IIFE bundled with no externals. `external: []` in build.mjs. |

---

## Section 1 — Mod doesn't appear in Settings → Mods

### Symptom
You sideloaded but the mod list in `Settings → Mods` doesn't show
your mod.

### Checks in order

1. **Correct userData path**. The game looks in:

   | OS | Path |
   |---|---|
   | macOS | `~/Library/Application Support/snake-classic/mods/<modId>/` |
   | Windows | `%APPDATA%/snake-classic/mods/<modId>/` |
   | Linux | `~/.config/snake-classic/mods/<modId>/` |

   The directory `<modId>` must match the `id` in `mod.json`
   (otherwise the loader ignores it).

2. **Valid `mod.json`**. Run the validator:

   ```bash
   pnpm mods:validate /path/to/sideload-dir
   ```

3. **`target.gameId`**. Must be exactly `'snake-classic'`.
   Anything else (`'snake'`, `'snake_classic'`) and the loader
   rejects it.

4. **`entry` exists**. If your `mod.json` says `"entry":
   "dist/mod.js"`, that file MUST exist relative to the mod root.
   Verify:

   ```bash
   ls ~/Library/Application\ Support/snake-classic/mods/<modId>/dist/mod.js
   ```

5. **Sideload mode active in retail**. In dev builds, sideload is
   on by default. In retail it needs the "7 taps on version"
   easter egg (Settings → About → tap 7×). In studio dev builds:
   always active.

6. **Loader log**. Open DevTools (dev build) and look for
   `[mod-loader]`. It usually says exactly why your mod was
   rejected.

---

## Section 2 — "Failed to activate"

### Symptom
You click "Activate" → permissions prompt appears → accept → mod
ends up in "Failed (permissions)" state.

### Cause
Your code asks for something (a permission) NOT declared in the
manifest. Examples:

- You call `host.callHostFn('gameConfigSet', ...)` without
  `game-specific` permission declared.
- You call `host.dispatch('MOD_NOTIFICATION', ...)` without
  `events` having `dispatch: ['MOD_NOTIFICATION']`.
- You call `host.state.read('game.score')` without `state-read.paths`
  including `'game.score'`.

### Fix

1. Open DevTools, find the first `permission-denied` log:

   ```
   [mod-runtime] permission-denied: <mod-id>
     operation: callHostFn
     name: gameConfigSet
     reason: missing permission `game-specific.surface=tunables.actions=set`
   ```

2. Add the permission to `mod.json`:

   ```json
   {
     "type": "game-specific",
     "surface": "tunables",
     "actions": ["set"],
     "rationale": "..."
   }
   ```

3. Reload the game (permissions are re-checked on activate).

---

## Section 3 — Mod tab appears empty

### Symptom
Your tab appears in Settings but is empty (no sliders, no
toggles, nothing).

### Possible causes

1. **Unrecognized `kind`**. The runtime engine accepts:
   `card`, `heading`, `paragraph`, `divider`, `slider`, `toggle`,
   `select`, `button`, `input` (text). If your descriptor uses
   another `kind` (e.g. `'switch'` or `'checkbox'`), the engine
   silently ignores it.

2. **Section without `children`**. A `card` without
   `children: [...]` renders empty:

   ```ts
   // ❌ wrong
   { kind: 'card', title: 'X' }

   // ✅ right
   { kind: 'card', title: 'X', children: [...] }
   ```

3. **`host.i18n?.t(key)` errors returning `undefined`**. If your
   `label` is `undefined`, the component may hide. Use a
   fallback:

   ```ts
   label: host.i18n?.t('key') ?? 'Literal fallback',
   ```

### Diagnosis

Open DevTools → look for `[mod-ui]` warnings. They usually log
unrecognized descriptors.

---

## Section 4 — Logs don't appear

### Symptom
You call `host.log.info(...)` and see nothing in console.

### Causes

1. **DevTools closed**. In Electron dev build: View → Toggle
   Developer Tools (Cmd+Opt+I / Ctrl+Shift+I).

2. **Retail build filters `debug`**. Only `info`/`warn`/`error`
   are persisted. See `Settings → Mods → <mod> → Logs`.

3. **Activate the "Logs" panel of the mod in retail**. Needs
   developer mode active (7 tap easter egg on version).

4. **The mod is NOT active yet**. Logs before `onActivate` are
   discarded. Move to `onActivate` hook or to a `subscribeEvent`
   that fires later.

---

## Section 5 — `permission denied` on storage

### Symptom

```
[mod-runtime] permission-denied: <mod-id>
  operation: storage.set
  reason: missing permission `storage` (or quota exceeded)
```

### Causes

1. **Missing `storage` permission**. Add:

   ```json
   { "type": "storage", "quotaKb": 32, "rationale": "..." }
   ```

2. **Quota exceeded**. Your serialized object exceeds `quotaKb`.
   Recipe 4 of [`cookbook.md`](cookbook.md#4) explains how to
   detect and split if needed.

3. **Storage corrupted**. Rare. Delete
   `userData/<game>/mods/<mod>/storage.json` and restart.

---

## Section 6 — App Store rejects the bundle (iOS)

### Symptom
iOS build goes through App Store Connect → reviewer rejects with
§3.3.2.

### Cause
iOS retail build must NOT include any mod runtime (App Store
§3.3.2 prohibits execution of unsigned code). The mod system has
a **mod-free build mode** that tree-shakes ALL the runtime at
compile time.

### Fix

```bash
GAMEFW_MODS_BUNDLED_ONLY=1 pnpm build:game snake-classic --mode=capacitor --target=ios
```

`GAMEFW_MODS_BUNDLED_ONLY=1` excludes the `ModRuntime` and all
engines from the bundle. Only first-party mods PRE-COMPILED AND
SIGNED by the studio survive (as static content, not dynamic
executable).

See [`mod-free-builds.md`](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/implementation/mod-free-builds.md)
for details.

---

## Section 7 — Steam Workshop upload fails

### Common causes

1. **ZIP too big**. Workshop limits 100 MB per item. `pnpm pack`
   should be <500 KB typical. If your ZIP is 50+ MB, you've
   probably included `node_modules/` or `src/` by mistake.
   Verify the content:

   ```bash
   unzip -l dist/<modId>-<version>.zip
   ```

2. **Missing preview image**. Workshop requires at least 1
   image 800×450 (not the 256×256 icon). Upload a screenshot of
   the mod in action.

3. **Invalid tags**. Only tags from the target game's catalog.
   List in `scripts/mods/workshop-config.json.games.<gameId>.tags.whitelist`.

4. **Steam account without Workshop enabled**. Some games require
   playing X hours before posting. Verify on the game's page
   that the "Create Item" button appears.

---

## Section 8 — Dev vs retail differences

Same code, different behavior between `pnpm dev:game` and retail
build. Common causes:

| Behavior | Dev | Retail |
|---|---|---|
| `host.log.debug` | Visible in DevTools | Silenced |
| Sideload directory | Always loaded | Only with easter egg activated |
| Ed25519 signatures | Skip (everything signed: false) | Validated (placeholder → quarantine) |
| `process.env.NODE_ENV` | `'development'` | `'production'` |
| Mod HMR | Yes with `pnpm dev:mod` | No (loaded at boot) |

If your mod works in dev but fails in retail, it's almost always:
- Missing signature (`pnpm build:release` without
  `GAMEFW_MODS_SIGN_KEY`).
- Permission only needed for `host.log.debug` (which isn't called
  in retail, so it goes unnoticed).
- Sideload not activated.

---

## Section 9 — Mod active, but the game doesn't change

Common pitfall. You called `gameConfigSet` and apparently
everything's OK but the game doesn't apply the value.

### Checks

1. **Did you call `gameConfigSet` at game start**. `gameConfigSet`
   applies to game state. If you call it BEFORE `GAME_STARTED`,
   the game doesn't exist yet — the override is lost. Call inside
   `GAME_STARTED` hook:

   ```ts
   host.subscribeEvent('GAME_STARTED', async () => {
     await host.callHostFn('gameConfigSet', {
       name: 'maxLives', value: 5,
     });
   });
   ```

2. **Correct tunable name**. `gameConfigSet({ name: 'maxLives'
   })` requires the game to have declared that tunable. If
   misspelled (`'max-lives'`, `'maxLifes'`), `gameConfigSet`
   rejects with `not-found`.

3. **Value within the tunable's range**. Each tunable has
   `min`/`max`. If you pass an out-of-range value, the game
   silently clamps it.

4. **No `state-write` permission**. Some tunables are read-only
   during a play session in progress. `GAME_STARTED` is the
   safe moment to write.

---

## How to open a useful issue

If none of the above works, open an issue with:

1. **Game version**: `Settings → About`.
2. **Mod version**: `mod.json:version`.
3. **OS + architecture**: `macOS 14.6 (Apple Silicon)`, etc.
4. **Complete `mod.json`** (anonymize if it has personal info).
5. **Logs**: copy the `[mod-runtime]` and `[mod-loader]` block
   from DevTools.
6. **Steps to reproduce**: install mod → activate → do X → wait
   Y → see Z.

With that, the studio can diagnose it in minutes.

## See also

- [`tutorial/`](tutorial/01-hello-mod.md) — course from zero.
- [`cookbook.md`](cookbook.md) — copy-paste recipes.
- [`api-reference.md`](api-reference.md) — `host.*` catalog.
- [`manifest-format.md`](manifest-format.md) — all permissions
  and types.
