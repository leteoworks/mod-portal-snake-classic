<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm mods:sync-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# Host API changelog

Versionado SemVer del `HostBridge` que ven los mods de Snake Classic.

> **Contrato**: el manifest de un mod declara `requires.hostApi: '^1.0.0'`.
> El loader rechaza mods cuya restricción no matchee la versión actual
> del juego (estado `incompatible`, mod no se activa).

---

## v1.0.0 — Lanzamiento (2026-XX-XX)

Superficie inicial expuesta al modder:

- `host.callHostFn(name, args)` — invocar funciones host registradas
  por el juego para mods (`togglePowerUp`, `setPowerUpSpawnChance`,
  `setSpeedBase`, `setSpeedProgression`).
- `host.subscribeEvent(name, cb)` — suscribir a eventos del juego
  listados en `policy.surfaces.events.subscribe`. Snake Classic
  expone: `GAME_STARTED`, `POWERUP_SPAWNED`, `GAME_OVER`,
  `SCORE_INCREASED`, `SNAKE_DIED`.
- `host.registerHook(name, fn)` — registrar hooks del lifecycle del
  mod (`onActivate`, `onDeactivate`).
- `host.state.read(path)` — lectura **read-only** del state del juego
  por path canónico. Snake Classic expone las siguientes 7 paths
  (convención `SCREAMING_SNAKE_CASE__DOUBLE_UNDERSCORE` del state
  store del juego):
  - `GAME_DATA__RUN__SCORE__CURRENT` — score actual de la partida.
  - `GAME_DATA__RUN__SCORE__MULTIPLIER` — multiplicador activo.
  - `GAME_DATA__RUN__SPEED__LEVEL` — nivel de velocidad.
  - `GAME_DATA__RUN__SNAKE__LENGTH` — longitud de la serpiente.
  - `GAME_DATA__RUN__POWERUP__ACTIVE` — power-up activo (o null).
  - `GAME_DATA__RUN__POWERUP__ACTIVE_VARIANT` — variante del activo.
  - `GAME_DATA__APP_SYNC__PROGRESS__HIGH_SCORE` — high score persistido.
- `host.storage.{get,set,delete,keys}(...)` — storage aislado por mod,
  quota declarada en `permissions.storage.quotaKb`.
- `host.i18n.{register,t}(...)` — traducciones del mod (si declara
  `permissions.i18n`).
- `host.log.{debug,info,warn,error}(...)` — logger (no afecta al
  bus de error del juego).
- `host.analytics.track(name, props)` — eventos custom declarados en
  `mod.json#analytics.events`.
- `host.registerSettingsTab(descriptor)` — tabs declarativos en
  `Settings → Mods → <tu tab>`. Catálogo de componentes UI en
  [/storybook/](/storybook/).
- `host.registerPowerUp(def)` — registrar power-ups nuevos (si
  declaras `permissions.powerups.actions: ['register']`).
- `host.registerAsset(kind, id, source)` — sustituir imágenes /
  audio / fonts (si declaras `permissions.assets`).

### Eventos `mod.framework.*` emitidos por el runtime

20 eventos canónicos automáticos (no participación del modder).
Listado completo en
[framework-events.ts](https://github.com/leteoworks/my-game-fw/blob/main/src/modules/mod-runtime/telemetry/framework-events.ts).
Resumen:

- **Discovery + lifecycle** (8): `discovered`, `validated_ok`,
  `upgrade`, `removed`, `activated`, `deactivated`,
  `permission_prompt_shown`, `permission_decision`, `session_summary`.
- **Engagement** (2): `engagement_tick`, `first_use_ever`.
- **Errores + límites** (3): `fault_summary`, `quota_hit`,
  `api_violation`.
- **Performance** (7): `perf.frame_impact`, `perf.cpu_budget`,
  `perf.memory_high_water`, `perf.hook_slow`,
  `perf.long_task_attributed`, `perf.budget_exceeded`,
  `perf.throttled`.

### NO disponible en v1.0.0

- `fetch` o `XMLHttpRequest` directos — el sandbox los bloquea.
- `window`, `document`, `localStorage`.
- `host.state.write(...)` — Snake Classic v1.0.0 **solo expone
  lectura** (`state.read`). Si necesitas modificar el state, hazlo
  vía eventos (`host.subscribeEvent` + `host.callHostFn` que el juego
  expone como contrato).
- Networking arbitrario — `host.http.request` existe pero solo si
  declaras `permissions.network` y el host está en allowlist.
- Backend clients (leaderboards, save sync) — gated por
  `permissions.backend-client` (no expuesto en Snake Classic v1.0.0).

---

## Política de versionado

| Cambio | SemVer bump |
|---|---|
| Añadir helper nuevo a `host.*` | MINOR |
| Añadir surface declarada en `policy.ts` | MINOR (los mods existentes no piden, no se rompen) |
| Cambiar shape de un helper existente | MAJOR (rompe mods que lo usan) |
| Eliminar un helper | MAJOR |
| Añadir error code nuevo | MINOR |
| Cambiar error code existente | MAJOR |
| Cambios solo en el manifest del juego (no expuestos al mod) | sin bump |

Cualquier MAJOR bump requiere documentar la migración en esta
página antes de mergear el cambio al runtime.

---

## Cross-links

- [api-reference](/es/api-reference)
- [manifest-format](/es/manifest-format)
- [Filosofía del sistema (monorepo)](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/philosophy.md)
