<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm mods:sync-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# Host API changelog

SemVer versioning of the `HostBridge` that Snake Classic mods see.

> **Contract**: a mod's manifest declares `requires.hostApi: '^1.0.0'`.
> The loader rejects mods whose constraint doesn't match the
> current game version (`incompatible` state, mod doesn't
> activate).

---

## v1.0.0 — Launch (2026-XX-XX)

Initial surface exposed to the modder:

- `host.callHostFn(name, args)` — invoke host functions
  registered by the game for mods (`togglePowerUp`,
  `setPowerUpSpawnChance`, `setSpeedBase`, `setSpeedProgression`).
- `host.subscribeEvent(name, cb)` — subscribe to game events
  listed in `policy.surfaces.events.subscribe`. Snake Classic
  exposes: `GAME_STARTED`, `POWERUP_SPAWNED`, `GAME_OVER`,
  `SCORE_INCREASED`, `SNAKE_DIED`.
- `host.registerHook(name, fn)` — register mod lifecycle hooks
  (`onActivate`, `onDeactivate`).
- `host.state.read(path)` — **read-only** game state lookup by
  canonical path. Snake Classic exposes these 7 paths
  (`SCREAMING_SNAKE_CASE__DOUBLE_UNDERSCORE` convention of the
  game's state store):
  - `GAME_DATA__RUN__SCORE__CURRENT` — current game score.
  - `GAME_DATA__RUN__SCORE__MULTIPLIER` — active multiplier.
  - `GAME_DATA__RUN__SPEED__LEVEL` — speed level.
  - `GAME_DATA__RUN__SNAKE__LENGTH` — snake length.
  - `GAME_DATA__RUN__POWERUP__ACTIVE` — active power-up (or null).
  - `GAME_DATA__RUN__POWERUP__ACTIVE_VARIANT` — active variant.
  - `GAME_DATA__APP_SYNC__PROGRESS__HIGH_SCORE` — persisted high
    score.
- `host.storage.{get,set,delete,keys}(...)` — per-mod isolated
  storage, quota declared in `permissions.storage.quotaKb`.
- `host.i18n.{register,t}(...)` — mod translations (if it
  declares `permissions.i18n`).
- `host.log.{debug,info,warn,error}(...)` — logger (doesn't
  affect the game's error bus).
- `host.analytics.track(name, props)` — custom events declared in
  `mod.json#analytics.events`.
- `host.registerSettingsTab(descriptor)` — declarative tabs at
  `Settings → Mods → <your tab>`. UI component catalog at
  [/storybook/](/storybook/).
- `host.registerPowerUp(def)` — register new power-ups (if you
  declare `permissions.powerups.actions: ['register']`).
- `host.registerAsset(kind, id, source)` — substitute images /
  audio / fonts (if you declare `permissions.assets`).

### Events `mod.framework.*` emitted by the runtime

20 canonical automatic events (no modder participation). Full
list at
[framework-events.ts](https://github.com/leteoworks/my-game-fw/blob/main/src/modules/mod-runtime/telemetry/framework-events.ts).
Summary:

- **Discovery + lifecycle** (8): `discovered`, `validated_ok`,
  `upgrade`, `removed`, `activated`, `deactivated`,
  `permission_prompt_shown`, `permission_decision`, `session_summary`.
- **Engagement** (2): `engagement_tick`, `first_use_ever`.
- **Errors + limits** (3): `fault_summary`, `quota_hit`,
  `api_violation`.
- **Performance** (7): `perf.frame_impact`, `perf.cpu_budget`,
  `perf.memory_high_water`, `perf.hook_slow`,
  `perf.long_task_attributed`, `perf.budget_exceeded`,
  `perf.throttled`.

### NOT available in v1.0.0

- `fetch` or `XMLHttpRequest` directly — the sandbox blocks them.
- `window`, `document`, `localStorage`.
- `host.state.write(...)` — Snake Classic v1.0.0 **only exposes
  reads** (`state.read`). If you need to modify state, do it via
  events (`host.subscribeEvent` + `host.callHostFn` that the
  game exposes as a contract).
- Arbitrary networking — `host.http.request` exists but only if
  you declare `permissions.network` and the host is in the
  allowlist.
- Backend clients (leaderboards, save sync) — gated by
  `permissions.backend-client` (not exposed in Snake Classic
  v1.0.0).

---

## Versioning policy

| Change | SemVer bump |
|---|---|
| Add new helper to `host.*` | MINOR |
| Add surface declared in `policy.ts` | MINOR (existing mods don't request, don't break) |
| Change shape of an existing helper | MAJOR (breaks mods using it) |
| Remove a helper | MAJOR |
| Add new error code | MINOR |
| Change existing error code | MAJOR |
| Game-only manifest changes (not exposed to the mod) | no bump |

Any MAJOR bump requires documenting the migration in this page
before merging the change to the runtime.

---

## Cross-links

- [api-reference](/api-reference)
- [manifest-format](/manifest-format)
- [System philosophy (monorepo)](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/philosophy.md)
