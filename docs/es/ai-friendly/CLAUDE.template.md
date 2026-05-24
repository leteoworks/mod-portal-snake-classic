<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm mods:sync-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# Instrucciones para Claude (copia este archivo a la raíz de tu mod)

> Copia este archivo a la raíz de tu mod renombrándolo
> `CLAUDE.md`. Claude Code lo lee automáticamente al arrancar.

## Qué es este proyecto

Mod externo para un juego del framework **my-game-fw** (mini-juegos
Vue/TS/Quasar con sistema de mods sandbox).

- **Juego target**: `<gameId>` (declarado en `mod.json`,
  habitualmente `snake-classic`).
- **Motor preferido**: `quickjs-declarative-ui` con fallback
  `quickjs`. El motor evalúa `dist/mod.js` en un sandbox WASM.
- **Lo que NO existe en el sandbox**: `window`, `document`,
  `fetch`, `XMLHttpRequest`, `process`, `require`, `import`,
  `localStorage`, `sessionStorage`, DOM, file system.
- **Lo único que existe**: el global `host: ModHost` declarado
  como ambient en `src/globals.d.ts`.

## Archivos clave

| Path | Rol |
|---|---|
| `mod.json` | Manifest del mod. `id`, `version`, `target`, permisos, metadata. **Cualquier API que uses en el código requiere su permiso aquí.** |
| `src/index.ts` | Entry point. Compila a `dist/mod.js` (IIFE ES2020 vía esbuild). |
| `src/globals.d.ts` | Declara `host: ModHost` como global ambient. **NO importar `host` desde aquí ni desde ningún sitio** — es global. |
| `src/types.ts` | Subset local del HostBridge. Source de los tipos que ves en `host.*`. |
| `locales/en.json`, `locales/es.json` | i18n. Keys con namespace declarado en `mod.json#permissions[type=i18n].namespaces`. |
| `build.mjs` | Pipeline esbuild. NO requiere edición habitual. |
| `package.json` | Scripts `build`, `validate`, `pack`. |
| `dist/mod.js` | Output del build. Gitignored. |

## Reglas duras — Claude NUNCA debe violar

1. **No importar `host`**. Es global ambient, no un módulo. Si
   ves `import { host } from ...`, es bug. Solo
   `/// <reference path="./globals.d.ts" />` arriba de `index.ts`.
2. **No usar `window`, `document`, `fetch`, `process`, `require`,
   `import` dinámico, `eval`, `Function` constructor, DOM, file
   system, `localStorage`**. El sandbox bloquea todo eso. Si
   necesitas red, usa `host.http` con permiso `network`
   declarado. Si necesitas persistencia, usa `host.storage`.
3. **No escribir fuera de `host.storage`**. La cuota está en
   `mod.json` (`permissions.storage.quotaKb`). Excederla rechaza
   con `QUOTA_EXCEEDED`.
4. **No inventar permisos sin actualizar `mod.json`**. Si añades
   `host.subscribeEvent('FOO', ...)` en código, también añade
   `'FOO'` al `subscribe[]` del permiso `events`. Si añades
   `host.callHostFn('barFn', ...)`, también añade el surface
   correspondiente al permiso `game-specific`.
5. **No inventar nombres de eventos ni host-fns**. La fuente de
   verdad es la `api-reference.md` del juego target. Eventos
   comunes en Snake Classic: `GAME_STARTED`, `GAME_OVER`,
   `SCORE_CHANGED`, `LEVEL_UP`, `POWER_UP_PICKED`,
   `POWER_UP_EXPIRED`. Host fns: `gameConfigSet`,
   `gameConfigReset`, `gameConfigSnapshot`, `togglePowerUp`,
   `setPowerUpSpawnChance`. **Cualquier otro nombre, verifícalo
   en api-reference antes de usar.**
6. **No mezclar binding `tunables.<X>` + hook que escriba la
   misma key**. Es race condition (last-write-wins). Patrón
   canónico: el binding aplica al juego en vivo Y el hook lee
   del storage para reaplicar al `GAME_STARTED`. NO escribir al
   mismo path desde dos sitios.

## Reglas blandas — convenciones

- **`id`** en `mod.json`: convención `<handle>.<modname>` (kebab,
  lowercase, ej. `tuhandle.power-mixer`). Inmutable.
- **`version`**: SemVer estricto. `patch` para bugfixes,
  `minor` para features, `major` rompe (resetea settings del
  jugador automáticamente).
- **`rationale`** en cada permiso: texto que el jugador lee. NO
  trivial ("for fun" pierde instalaciones). Concreto:
  ("Aplica la velocidad inicial que el jugador eligió en el
  slider").
- **i18n keys** empiezan por el namespace declarado:
  `mod.<modId>.tab.title`, `mod.<modId>.section.spawn`, etc.
  Fuera de namespace, el framework rechaza.
- **TypeScript strict** con `isolatedModules`. Si tocas tipos
  del HostBridge, hazlo en `src/types.ts`, no en `globals.d.ts`.
- **max-len 80** en imports (parte multi-línea si exceden).
- **Sin comentarios obvios**. Solo comentar el "por qué" cuando
  el "qué" no es trivial del código.

## Antes de cualquier cambio

1. **Lee `mod.json`** entero. Saber qué permisos hay declarados
   evita pedir APIs sin permiso.
2. **Lee la sección relevante del api-reference del juego target**
   (https://leteoworks.github.io/mod-portal-snake-classic/api-reference).
   Confirma que el evento / host fn que vas a usar EXISTE con
   ese nombre exacto.
3. **Lee el código que vas a tocar**. Antes de añadir un toggle,
   lee `src/index.ts` y `src/settings-tab.ts` (si existe) para
   ver el shape del descriptor que ya usa el mod.

## Después de cualquier cambio

```bash
pnpm build       # esbuild → dist/mod.js
pnpm validate    # zod check del manifest contra el schema
# Sideload local (path por OS):
#   macOS:   ~/Library/Application\ Support/snake-classic/mods/<modId>/
#   Windows: %APPDATA%/snake-classic/mods/<modId>/
#   Linux:   ~/.config/snake-classic/mods/<modId>/
# Restart del juego. Activa el mod. Smoke test manual: el
# comportamiento descrito en el commit/prompt funciona.
```

Si el cambio toca `mod.json`: re-ejecuta `pnpm validate`. Si toca
locales: verifica que las keys del código existen en los dos
locales `en.json` y `es.json`.

## Apuntadores rápidos — "cuando toques X, lee Y"

| Si vas a tocar... | Lee primero |
|---|---|
| Añadir un slider/toggle nuevo | [tutorial/02-slider-tunable](https://leteoworks.github.io/mod-portal-snake-classic/tutorial/02-slider-tunable) — concepto `tunables.` binding + anti-patrón last-write-wins. |
| Reaccionar a un evento del juego | [tutorial/03-game-events](https://leteoworks.github.io/mod-portal-snake-classic/tutorial/03-game-events) — catálogo eventos + permisos. |
| Customizar power-ups (Snake) | [tutorial/04-power-ups](https://leteoworks.github.io/mod-portal-snake-classic/tutorial/04-power-ups) — patrón array→UI + presets en bulk con `Promise.all`. |
| Preparar release a Workshop | [tutorial/05-release-ready](https://leteoworks.github.io/mod-portal-snake-classic/tutorial/05-release-ready) — i18n, icon, validate, pack, upload. |
| Resolver un problema concreto | [cookbook](https://leteoworks.github.io/mod-portal-snake-classic/cookbook) — 10 recetas copy-paste. |
| Algo no funciona y no sabes por qué | [troubleshooting](https://leteoworks.github.io/mod-portal-snake-classic/troubleshooting) — tabla síntoma→fix. |
| Detalle de un permiso o campo de `mod.json` | [manifest-format](https://leteoworks.github.io/mod-portal-snake-classic/manifest-format). |
| Saber qué `host.*` está disponible | [api-reference](https://leteoworks.github.io/mod-portal-snake-classic/api-reference). |
| Tu mod debe funcionar en ≥1 juego del framework | [targeting-games](https://leteoworks.github.io/mod-portal-snake-classic/targeting-games) — `gameId` lógico vs AppID. |

## Mods de referencia (código real, no juguete)

Cuando un prompt tuyo encaje con algo ya hecho en producción,
mira primero el código real:

- [`studio.fun-config`](https://github.com/leteoworks/my-game-fw-mods/tree/main/snake-classic/studio.fun-config)
  — 22 toggles de power-ups + 3 presets (Classic/Casual/Hardcore).
- [`studio.gameplay-tuner`](https://github.com/leteoworks/my-game-fw-mods/tree/main/snake-classic/studio.gameplay-tuner)
  — sliders cuantitativos + presets Easy/Normal/Hard.

Pegar un fragmento de su código a Claude como referencia
("hazlo como en studio.fun-config: pattern array→UI") suele
producir mejores resultados que describir el patrón con palabras.
