<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm mods:sync-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# Host API — snake-classic v1.0.90

> Host API version: `1.0.0`
> Auto-generado por `@modules/moddable/changelog-gen`. NO editar a mano.

> Auto-generado por scripts/mods/gen-moddable-artifacts.mjs.
> Regenerar con: pnpm mods:generate-host-api-changelog snake-classic

## Engines aceptados

El manifest del mod (`mod.json#engine.preferred` y `engine.fallbacks`) debe declarar al menos uno de estos motores; cualquier otro produce rechazo `incompatible` al cargar.

- `isolated-vm`
- `quickjs-declarative-ui`

## Trust tiers

| Tier | Decision |
|---|---|
| `unsigned` | allow-with-prompt |
| `workshopVerified` | allow |
| `studioSigned` | allow-elevated |

## Resource limits

| Limite | Valor | Notas |
|---|---|---|
| `memoryMb` | 32 | OOM aborta el mod, no crashea el juego. |
| `hookTimeoutMs` | 100 | Cada hook (`onActivate`, `onEvent:*`, `onAction:*`, etc.) tiene este timeout. |
| `instructionsPerHook` | 1,000,000 | QuickJS interrupt handler. Hard cap por invocacion. |
| `storageQuotaKb` | 256 | Cuota por mod en `host.storage`. Auto-rejected si excede. |
| `maxActiveMods` | 10 | Mods activos simultaneos. Activar uno mas exige desactivar otro. |
| `maxLoadTimeMs` | 2000 | Tiempo maximo del eval del entry source del mod. |

### Performance budgets

Medidos automaticamente por el runtime y gatillan throttling adaptativo antes de la cuarentena. Ver `docs/mods/architecture/mod-analytics.md` § Performance impact tracking.

| Limite | Valor | Notas |
|---|---|---|
| `cpuMsPerSecond` | 50 | CPU total que un mod puede consumir por segundo. Excederlo emite `perf.cpu_budget` y throttle. |
| `framePenaltyMaxMs` | 4 | Penalty maximo de frame atribuible al mod (`perf.frame_impact`). |
| `slowHookThresholdMs` | 50 | Por encima de este umbral, un hook se marca slow y cuenta para `throttleAfterSlowCount`. |
| `throttleAfterSlowCount` | 5 | Slow hooks consecutivos antes de aplicar throttle. |

## Politica operacional (runtime)

| Opcion | Valor | Notas |
|---|---|---|
| `workshopEnabled` | true | Discovery desde Steam Workshop. |
| `localSideloadEnabled` | false | Carga de mods desde carpeta local del usuario. Solo dev builds en release. |
| `killSwitchPollMs` | 900,000 (≈ 15 min) | Polling del kill-switch remoto. |
| `loadFaultPolicy` | `quarantine` | Politica ante fallo de carga (no se reintenta vs. retry-once). |

## Eventos

**Suscribibles**:
- `SCORE_CHANGED`
- `POWERUP_PICKED`
- `POWERUP_SPAWNED`
- `GAME_STARTED`
- `GAME_OVER`
- `LEVEL_UP`

**Dispatchables**:
- `MOD_*`

## State paths

**Lectura**:
- `GAME_DATA__RUN__SCORE__CURRENT`
- `GAME_DATA__RUN__SCORE__MULTIPLIER`
- `GAME_DATA__RUN__SPEED__LEVEL`
- `GAME_DATA__RUN__SNAKE__LENGTH`
- `GAME_DATA__RUN__POWERUP__ACTIVE`
- `GAME_DATA__RUN__POWERUP__ACTIVE_VARIANT`
- `GAME_DATA__APP_SYNC__PROGRESS__HIGH_SCORE`

**Escritura**: vacio — mods NO escriben estado directamente. Para mutar, dispatchar un evento `MOD_*_REQUESTED` que el director del juego decide aplicar.

## Tunables

| Name | Type | Default | Range / Enum | Tier | Aplica |
|---|---|---|---|---|---|
| `maxLives` | integer | `25` | [1, 50] | — | next-game |
| `initialSpeedTickMs` | integer | `200` | [80, 500] | — | next-game |
| `pointsPerFood` | integer | `10` | [1, 100] | — | immediate |
| `powerupSpawnInterval` | integer | `3` | [1, 10] | — | immediate |
| `powerupSpeedBoostEnabled` | boolean | `true` | — | — | next-game |
| `powerupInvincibilityEnabled` | boolean | `true` | — | — | next-game |
| `powerupDoublePointsEnabled` | boolean | `true` | — | — | next-game |
| `powerupMagnetEnabled` | boolean | `true` | — | — | next-game |
| `powerupShrinkEnabled` | boolean | `true` | — | — | next-game |
| `powerupGhostEnabled` | boolean | `true` | — | — | next-game |
| `powerupGoldenAppleEnabled` | boolean | `true` | — | — | next-game |
| `powerupDemolitionEnabled` | boolean | `true` | — | — | next-game |
| `powerupEarthquakeEnabled` | boolean | `true` | — | — | next-game |
| `powerupBombPickupEnabled` | boolean | `true` | — | — | next-game |
| `powerupBrickBlastEnabled` | boolean | `true` | — | — | next-game |
| `powerupExtraLifeEnabled` | boolean | `true` | — | — | next-game |
| `powerupSummonSnakeEnabled` | boolean | `true` | — | — | next-game |
| `powerupBlindfoldEnabled` | boolean | `true` | — | — | next-game |
| `powerupFragileWallEnabled` | boolean | `true` | — | — | next-game |
| `powerupBrickRevivalEnabled` | boolean | `true` | — | — | next-game |
| `powerupPortalEnabled` | boolean | `true` | — | — | next-game |
| `powerupDemonEnabled` | boolean | `true` | — | — | next-game |
| `powerupBaseballBatEnabled` | boolean | `true` | — | — | next-game |
| `powerupDoubleLengthEnabled` | boolean | `true` | — | — | next-game |
| `powerupRainbowHeartEnabled` | boolean | `true` | — | — | next-game |
| `powerupTimeTravelEnabled` | boolean | `true` | — | — | next-game |

## Power-ups

| Capability | Granted |
|---|---|
| `toggle` | true |
| `tuneProbabilities` | true |
| `tuneEffects` | false |
| `register` | false |

## GameSpecific surfaces

### `speedCurve`

| Action | Granted |
|---|---|
| `setBase` | true |
| `setProgression` | true |

## Settings UI

- `addTabs`: true
- `maxTabs`: 3

## Storage

- `perModQuotaKb`: 256

## i18n

- `namespaces`: `mod-*`

## Entitlements

**Lectura permitida** (`host.entitlements.getActiveDlcs()`):
- `snake-classic.endless-plus`

## Network (`host.http.request`)

| Campo | Valor |
|---|---|
| `enabled` | true |
| `methods` | `GET` |
| `allowedHosts` | `github.com` |
| `forbidPrivateHosts` | true |
| `requireTls` | true |
| `maxRequestKb` | 16 |
| `maxResponseKb` | 64 |
| `maxRequestsPerMinute` | 10 |
| `timeoutMs` | 5000 |
| `allowedRequestHeaders` | `Accept`, `Content-Type` |
| `allowedResponseHeaders` | `Content-Type` |
| `forbidCredentials` | true |
| `followRedirects` | `false` |

### Overrides por trust tier

| Tier | Override |
|---|---|
| `unsigned` | allowedHosts: [∅] |
| `workshopVerified` | maxRequestsPerMinute: `10` |
| `studioSigned` | maxRequestsPerMinute: `30` |

## Analytics (custom events)

| Campo | Valor |
|---|---|
| `customEventsEnabled` | true |
| `maxEventsPerMinute` | 30 |
| `maxEventsDeclared` | 10 |

## Bundled mods (pre-instalados)

Mods first-party que viajan dentro del bundle del juego. El jugador puede activarlos sin descargar desde Workshop.

**Disponibles (no enabled por defecto)**:
- `studio.fun-config@1.0.0`
- `studio.gameplay-tuner@0.1.0`

## Registries

### powerups

- Items declarados: 22
- Items enabled por defecto: 22

## Host functions

| Name | Surface | Action | Doc |
|---|---|---|---|
| `gameConfigSet` | tunables | set | Aplica un override a un tunable del juego. Validado por rango/tipo/enum y por trust tier del mod. |
| `gameConfigReset` | tunables | reset | Elimina el override de un tunable. La siguiente lectura devuelve el default. |
| `gameConfigSnapshot` | tunables | snapshot | Devuelve el valor actual de cada tunable (override o default). Read-only. §3.4 audit: solo expone tunables con `requiresTier` que el caller cumple — info-leak fix. |
