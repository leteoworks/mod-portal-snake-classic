<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm sync:mod-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# Flujo manual de testing end-to-end (dev simulando Steam)

Receta paso a paso para reproducir en dev el flujo completo que
seguiría un usuario que descargara el juego de Steam, habilitara un
mod bundled del estudio y lo usara para cambiar valores del juego.
Útil para QA manual, demos, debug de regresiones y validación de
nuevos mods antes de release.

> Doc hermano: [`dev-workflow.md`](dev-workflow.md) — workflow de
> **desarrollo** (cómo construir un mod). Este doc cubre el lado
> **runtime** (cómo probarlo como lo haría un usuario).

---

## TL;DR — un comando

```bash
GAMEFW_MODS_BUNDLED_ONLY=1 pnpm dev:mod snake-classic studio.gameplay-tuner
```

Eso compila el mod, arranca esbuild watch, levanta Quasar dev con el
ModRuntime activado en modo "bundled-only" (= modo Steam), y deja
abierto el ciclo edit-→ver. Abre `http://localhost:9000`, ve a
Snake → Settings → Mods, activa el mod, y úsalo.

---

## Por qué la flag `GAMEFW_MODS_BUNDLED_ONLY=1`

El framework de mods tiene **tres modos de build mutuamente
exclusivos**:

| Flag | Qué incluye | Cuándo usarla |
|---|---|---|
| `GAMEFW_MODS=1` | Workshop + sideload + bundled | Electron en Steam con Workshop habilitado |
| `GAMEFW_MODS_BUNDLED_ONLY=1` | Solo bundled (sin Workshop/sideload) | Steam sin Workshop, App Store iOS, Google Play |
| `(ninguna)` | Stub no-op — runtime ausente | App Store strict, builds mod-free |

Sin flag, el bootstrap del runtime detecta el modo vía env literal
(`process.env.GAMEFW_MODS === 'true'` o
`GAMEFW_MODS_BUNDLED_ONLY === 'true'`) y, si ambas son falsas,
devuelve `null` — **la tab "Mods" no aparece en Settings**.

Para simular el flujo Steam estándar usamos
`GAMEFW_MODS_BUNDLED_ONLY=1`: el mismo modo en que viaja el
ejecutable que descargas de la Store.

Spec normativa de los modos: [build-modes.md](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/architecture/build-modes.md).

---

## Pre-requisitos

Lo que necesitas tener listo antes de arrancar el flujo:

1. **Repo clonado con submódulo**:
   ```bash
   git clone --recursive <parent-url>
   # o, tras un clone normal:
   git submodule update --init --recursive
   ```
2. **pnpm install** ya ejecutado en el repo padre.
3. **`game-mods/snake-classic/studio.gameplay-tuner/`** presente con
   `mod.json` + `src/`. Esto se cumple si tu copia del subrepo
   `game-mods/` está a HEAD `6e63cab` o posterior.
4. **Browser moderno** abierto en `http://localhost:9000` (Chrome,
   Firefox, Safari). DevTools recomendados para ver logs del
   sandbox.
5. **(Opcional)** Variable `DEBUG=mod-runtime:*` exportada si
   quieres verbose logging del bootstrap del runtime.

---

## Flujo end-to-end paso a paso

Cada paso indica lo que **deberías ver** para confirmar que funciona.

### Paso 1 — Arrancar dev

```bash
GAMEFW_MODS_BUNDLED_ONLY=1 pnpm dev:mod snake-classic studio.gameplay-tuner
```

**Qué ves en terminal**:

```
[dev-mod] preparando game=snake-classic mods=[studio.gameplay-tuner]
[build-game-mods] ✓ 2 mod(s) procesado(s) para snake-classic.
  - Manifest: src/games/snake-classic/mods/bundled/bundled-mods-manifest.json
  - Sources:  src/games/snake-classic/mods/bundled-mods-sources.generated.ts
  - Firma:    skip (dev)
[validate-i18n] ✓ todas las keys presentes.
[watch:studio.gameplay-tuner] [gameplay-tuner] build OK
[dev:game]                    READY  Quasar dev server running at http://localhost:9000
```

Si ves `[build-game-mods] sin mods en game-mods/snake-classic/`, el
subrepo no está inicializado — corre `git submodule update --init`.

### Paso 2 — Abrir el juego

Navegar a `http://localhost:9000` → pantalla **home** de Snake
Reloaded.

**Verificación rápida en DevTools console**:

```js
window.__SNAKE_MOD_RUNTIME__   // debería ser un objeto, no undefined
```

Si es `undefined`, la env var `GAMEFW_MODS_BUNDLED_ONLY=1` no llegó
al build — revisar el comando. La forma simple de re-validarlo:

```js
process.env.GAMEFW_MODS_BUNDLED_ONLY  // 'true' en el bundle
```

Webpack hace la sustitución a tiempo de build (DefinePlugin), así
que reinicia `pnpm dev:mod ...` con la env var correcta si falla.

### Paso 3 — Abrir Settings y ver la tab "Mods"

Pulsar el botón **Settings** en el home → se abre el panel de
ajustes. Debería aparecer una pestaña **Mods** entre las demás
(probablemente la última).

**Si NO aparece**:
- Mira la consola en busca de signals `mod.bootstrap.*` —
  típicamente `mod.bootstrap.disabled-by-remote` si el remote-config
  trae `enabled: false`, o `mod.bootstrap.flag-mismatch` si la env
  var no se reinyectó.
- Verifica que el componente está montado: en DevTools, Elements →
  buscar `SnakeModsTab` o `ModsSettingsTab`. Si no aparece en el
  DOM, revisar `src/pages/snake-classic/settings.page/settings.page.vue:164`.

### Paso 4 — Activar `studio.gameplay-tuner`

Dentro de la tab "Mods" hay un listado con los bundled mods del
juego. Deberías ver dos entradas:

- `studio.gameplay-tuner` (v0.1.0) — toggle OFF por defecto.
- `studio.fun-config` (v1.0.0) — toggle OFF por defecto.

Pulsar el toggle de `studio.gameplay-tuner`. Internamente:

1. `runtime.activate(modId)` se llama.
2. El loader resuelve el bundle desde
   `bundled-mods-sources.generated.ts` (el contenido `?raw` del
   `dist/mod.js`).
3. El motor `quickjs-declarative-ui` evalúa el bundle en su sandbox
   WASM.
4. El mod ejecuta su entrada (`src/index.ts` compilado) que llama a:
   - `host.registerSettingsTab(buildSettingsTabDescriptor())` — crea
     la sub-tab.
   - `host.subscribeEvent('GAME_STARTED', cb)` — reaplica config al
     iniciar partida.
   - `host.subscribeEvent('MOD_GT_APPLY_PRESET', cb)` — escucha el
     botón "Aplicar preset".
5. `host.log.info('[gameplay-tuner] loaded v0.1.0')` se imprime en
   el panel de logs del runtime (debug devtools).

**Verificación**: una sub-tab nueva llamada **"Gameplay Tuner"**
debería aparecer dentro de la tab Mods (o como tab top-level,
depende del shell del HostUI).

### Paso 5 — Cambiar un tunable

En el tab "Gameplay Tuner" verás 3 sliders:

- **Vidas máximas** (rango 1-50, valor actual 25)
- **Velocidad inicial (ms/tick)** (rango 80-500, valor 200)
- **Puntos por comida** (rango 1-100, valor 10)

Mover el slider de **Vidas máximas** a `3`.

**Qué pasa internamente**:

```
UI slider change
  → binding `tunables.maxLives` actualiza
  → HostUI shell mapea binding al host fn
  → host.callHostFn('gameConfigSet', { name: 'maxLives', value: 3 })
  → sandbox bridge → runtime
  → registerModHostFunction handler ejecuta
  → tunable._setOverride(3)
  → gameplay siguientes `maxLives.get()` devuelven 3
```

**Verificación**: en DevTools console del host:

```js
// El override está aplicado:
window.__SNAKE_DEBUG__?.tunables?.snapshot()
// → { maxLives: 3, initialSpeedTickMs: 200, pointsPerFood: 10 }
```

(Si esa API no existe, la alternativa es ver el log del mod cuando
re-aplica al siguiente `GAME_STARTED`.)

### Paso 6 — Jugar y observar el efecto

1. Cerrar Settings → volver al home → **Start**.
2. Jugar a Snake. Las vidas máximas que puedes acumular ahora son
   **3** (no 25). Si recoges power-ups de vida extra (corazón) más
   allá del cap, son no-op silenciosos.
3. Tras 3 muertes consecutivas sin recoger más vidas → **Game Over**.

El call-site afectado es
`src/games/snake-classic/core/domain/extra-life-action.ts:53` →
ahora compara contra `maxLives.get()` en vez de la constante.

### Paso 7 — Iterar en código del mod (live reload)

Sin salir del navegador, abre en tu editor:

```
game-mods/snake-classic/studio.gameplay-tuner/src/index.ts
```

Añade una línea al final:

```ts
host.log.info('[gameplay-tuner] hot-reloaded');
```

Guarda. En ~1-2 segundos:

1. `esbuild --watch` regenera `dist/mod.js`.
2. Quasar HMR detecta el cambio en el `?raw` import.
3. El runtime re-evalúa el sandbox del mod sin recargar la página.
4. Ves en consola: `[gameplay-tuner] hot-reloaded`.

Sin esperar build de Quasar full, sin perder el estado de la
partida (¡ojo: salvo si el código del mod tenía estado interno —
el sandbox sí se reinicia, solo el estado del juego sobrevive).

---

## Donde difiere de prod (gotchas)

| Concepto | Dev (`pnpm dev:mod`) | Prod (Steam Electron) |
|---|---|---|
| **Ventana** | Browser localhost | Electron BrowserWindow |
| **Firma del mod** | Placeholder Ed25519 (`PLACEHOLDER_SIGNATURE_DEV_ONLY_*`), aceptado porque `NODE_ENV !== 'production'` | Firma real Ed25519 con `GAMEFW_MODS_SIGN_KEY`; runtime rechaza placeholder en boot |
| **Trust tier** | bundled = `studioSigned` aunque sea placeholder | bundled = `studioSigned` con firma válida verificada |
| **Mod live-reload** | HMR re-evalúa al guardar | Bundle inmutable hasta nueva release |
| **Storage del mod** | `localStorage` del navegador (namespaced por modId) | `app.getPath('userData')` de Electron (JSON files) |
| **Workshop / sideload** | No (`bundled-only`) | No con `bundled-only`; sí con `GAMEFW_MODS=1` |
| **Performance budget** | Igual (límites por motor son iguales) | Igual |
| **Crash isolation** | Igual (QuickJS WASM en ambos) | Igual |
| **Acceso filesystem** | Limitado (browser FS API) | Completo (Electron Node integration) |
| **Permisos prompt** | Modal del browser | Modal Electron nativo |

**Lo que NO difiere** (por diseño del invariante 3 — cero
acoplamiento juego ↔ runtime):

- API que ve el mod (`host.*`).
- Política de permisos.
- Ciclo de vida del mod (`activate` → `deactivate`).
- Telemetría (analytics + signals).
- Trust tier semantics.

Eso significa que un mod que funciona en dev DEBE funcionar idéntico
en prod salvo por los 4-5 puntos de arriba.

---

## Variante: "prod simulado" estricto

Cuando quieras la verificación final antes del release real:

```bash
NODE_ENV=production \
GAMEFW_MODS_BUNDLED_ONLY=1 \
GAMEFW_MODS_SIGN_KEY="$(cat ~/.leteoworks-keys/mod-sign-2026-01.b64)" \
pnpm build:game snake-classic --mode=electron
```

Lo que hace:
1. `build-game-mods.mjs` corre con `--release`: compila con
   `--minify`, firma cada `dist/mod.js` con la clave real, escribe el
   manifest con firma Ed25519 real.
2. `quasar build --mode=electron` empaqueta el bundle del juego.
3. `electron-builder` empaqueta la app `.app`/`.exe`/`AppImage`.

Diferencias vs Steam real:
- Sin upload a Steam Workshop SDK.
- Sin certificado de notarización macOS (para releases reales en
  Apple, añadir `APPLE_ID` + `APPLE_ID_PASS` env vars y dejar que el
  pipeline notarice).

Coste: **~2-3 min** vs **~5 segundos** del dev loop. Solo úsalo para
verificación final, no para iterar.

---

## Fricción que NO está cubierta y conviene saber

Cosas que un usuario nuevo notaría al probar el flujo por primera
vez. No son bugs — son comportamientos esperados.

### 1. El mod NO se auto-activa al primer boot

Política consent-first: cada mod viene OFF por defecto. El usuario
debe activarlo explícitamente.

**Para tests automatizados** que necesiten el mod activo desde el
arranque:

```js
// Antes de arrancar el browser, inyectar en localStorage:
localStorage.setItem(
  '__framework__.mods.installed',
  JSON.stringify([{ modId: 'studio.gameplay-tuner', enabled: true }]),
);
```

Después abrir la página. El runtime lo encuentra al boot y activa
sin intervención.

### 2. La tab "Mods" puede tardar 1-2 frames en aparecer

El `snakeModRuntimePromise` resuelve async (instancia los motores,
valida la policy, carga sources, etc.). Mientras tanto la tab
muestra un spinner o queda oculta.

No es un bug. Si tarda más de ~3 segundos, hay algo mal — abre
DevTools y mira signals `mod.bootstrap.*`.

### 3. `maxLives` aplica con `next-game`

Declarado en `tunables.ts:42` como `appliesOn: 'next-game'`. Si
estás en medio de una partida, mover el slider no afecta la actual.
Hay que terminar y empezar nueva.

Mismo comportamiento para `initialSpeedTickMs` (también
`next-game`).

### 4. `pointsPerFood` aplica `immediate`

Único de los tres que cambia en caliente. Verás los puntos cambiar
al siguiente food recogido sin reiniciar partida.

### 5. La velocidad efectiva la sobreescribe `base-snake-scene.ts`

Aunque el tunable `initialSpeedTickMs` aplica el valor a
`state.speed.tickMs`/`baseTickMs` al boot del IDLE, cada level-init
de `base-snake-scene.ts:619` lo sobreescribe con el blueprint del
nivel. El efecto del tunable es: el **arranque inicial** del juego
respeta el valor, pero las transiciones de nivel usan el blueprint
del nivel hasta que el blueprint también consume `tunable.get()`
(codemod futuro).

---

## Troubleshooting

### "No veo la tab Mods en Settings"

| Causa probable | Verificación | Fix |
|---|---|---|
| Env var ausente | `process.env.GAMEFW_MODS_BUNDLED_ONLY` en DevTools console | Relanzar con `GAMEFW_MODS_BUNDLED_ONLY=1 ...` |
| ModRuntime bootstrap falló | Buscar `mod.bootstrap.*` signals en consola | Revisar config remota, policy + entitlements |
| Submódulo `game-mods/` vacío | `ls game-mods/snake-classic/` | `git submodule update --init --recursive` |
| `bundled-mods-sources.generated.ts` desactualizado | Ver si tiene los mods esperados | Re-run `pnpm build:game-mods --game=snake-classic` |

### "El mod aparece pero el toggle no hace nada"

| Causa | Fix |
|---|---|
| Mod's `dist/mod.js` corrupto o vacío | Re-run `pnpm --filter ./game-mods/snake-classic/studio.gameplay-tuner build` |
| `sha256` del manifest no matchea el bundle | Re-ejecutar `pnpm build:game-mods` para regenerar manifest |
| Trust tier rechazo (poco probable en dev) | Ver signal `mod.trust.*` en consola |

### "Activé el mod pero los sliders no aparecen"

El mod registró su tab pero el `HostUI shell` no la pintó.
Verificar:

```js
window.__SNAKE_MOD_RUNTIME__?.listAll()
// → array con el mod y su estado lifecycle
```

Si `state: 'active'` pero la tab no aparece, mirar el log del
runtime para errores de descriptor validation
(`mod.ui.invalid-descriptor`).

### "Cambio el slider pero el juego no responde"

| Causa probable | Verificación |
|---|---|
| Estás en medio de una partida y el tunable es `next-game` | Empezar partida nueva |
| Codemod no aplicado al call-site | Buscar `<CONSTANTE>` (e.g. `EXTRA_LIFE_STACK_CAP`) en lugar de `<tunable>.get()` |
| Host fn no registrado | Signal `mod.bootstrap.host-fn-registration-failed` en consola |

### "HMR del mod no funciona"

Comprobaciones rápidas:

```bash
# 1. esbuild realmente está watching?
ps aux | grep esbuild | grep gameplay-tuner

# 2. dist/mod.js se actualiza al guardar?
ls -la game-mods/snake-classic/studio.gameplay-tuner/dist/mod.js
# editar src/ → re-listar → debería cambiar mtime
```

Si esbuild no actualiza, restart de `pnpm dev:mod`. Si esbuild
actualiza pero el browser no re-evalúa el sandbox, hard reload
(Cmd-Shift-R en Mac) — a veces Quasar HMR pierde un `?raw` update.

---

## Cómo capturar evidencia para QA / bug reports

Cuando encuentres un bug y quieras reportarlo:

1. **Console log** del browser entero (Cmd-Shift-J → menú → Save
   as...). Pega como adjunto.
2. **Snapshot del runtime** (si está disponible):
   ```js
   JSON.stringify(window.__SNAKE_MOD_RUNTIME__?.snapshot(), null, 2)
   ```
3. **Manifest cargado**:
   ```bash
   cat src/games/snake-classic/mods/bundled/bundled-mods-manifest.json
   ```
4. **Versión del subrepo**:
   ```bash
   cd game-mods && git log --oneline -1
   ```
5. **Versión del parent**:
   ```bash
   git log --oneline -1
   ```

Reporta en el doc canónico del incidente
([operations/incident-response.md](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/operations/incident-response.md))
o como issue en GitHub si es bug del framework / mod.

---

## Lecciones aprendidas (sprint mayo 2026)

Durante el sprint inaugural de `studio.gameplay-tuner` el flow manual
afloró 9 bugs framework-level que ahora tienen salvaguarda activa.
Si vuelves a ver alguno de estos síntomas, hay un guard / fix que ya
debería atraparlo — si no, abre issue.

### 1. `Uncaught ReferenceError: process is not defined`

**Síntoma**: navegas a la página del juego, la app boota, y a los
~100ms crashea con `process is not defined`.

**Causa**: el código del bundle accede a `process.env.X` y `X` no
está declarado en `quasar.config.js → build.env`. Webpack
DefinePlugin solo reemplaza accesos literales **declarados**.

**Salvaguarda activa**: ESLint
`framework/process-env-must-be-declared`. Antes de commitear,
`pnpm exec eslint` falla si una env var no está declarada.
[`build-quirks.md`](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/architecture/build-quirks.md#2-salvaguarda-activa).

### 2. Tab Mods muestra `mods.tab.title` literal en lugar del label

**Síntoma**: el tab del juego muestra paths de i18n raw en lugar de
texto traducido.

**Causa**: vue-i18n devuelve la **key raw** cuando una key no
resuelve (no `undefined`). El shell de mods espera `?? fallback` →
fallback nunca aplica → key literal en pantalla. Además, las
traducciones del juego viven bajo un namespace propio
(`snk.mods.*`).

**Salvaguarda activa**: helper canónico
`createGameModsI18nAdapter({ t, namespace })` en
`@modules/mod-ui-components`. El juego solo cabla
`<ModsSettingsTab :i18n="i18nAdapter" />`.

### 3. Slider del mod arranca en valor `min` aunque el binding esté persistido

**Síntoma**: al abrir el tab del mod, el slider de un tunable
muestra el valor mínimo del rango (no el valor guardado en sesiones
anteriores).

**Causa**: el `populateInitialBindings` del runtime devolvía
`{}` con un TODO "el mod las popula via setBinding al onActivate".
Pero el mod típico lee de `host.storage.get('settings')` (objeto
único), no de los `tunables.X` keys del binding. El cache
permanecía vacío.

**Salvaguarda activa**: `populateInitialBindings` ahora lee el
índice `mods.<gameId>.<modId>.__keys__` y replica cada binding via
`setBinding` (que dispara el wire `tunables.X` → host fn
`gameConfigSet`).

### 4. Mover el slider no aplica el tunable al gameplay tras reload

**Síntoma**: mueves slider a 100, juegas — el comportamiento del
juego sigue con el default. Tras reload, los puntos por comida
siguen siendo 10 aunque el binding `tunables.pointsPerFood = 100`
esté en localStorage.

**Causa raíz multi-capa**:
- `tab-registry.setBinding` solo persistía al storage, no invocaba
  la host fn `gameConfigSet` que aplica el override al tunable.
- El `storageWriter` del runtime escribía al `*.config.<key>` pero
  NO mantenía el índice `__keys__` (lo mantenía solo el
  `createModStorageNamespace` por una ruta paralela que la UI no
  usa).
- El `auto-reactivate` del bootstrap (FIX-9.4) saltaba directo a
  `loader.activate` sin pasar por `populateInitialBindings`.
- Las host fns se registraban DESPUÉS de `bootstrapModRuntime` →
  el primer populate del auto-reactivate corría con
  `gameConfigSet` aún sin registrar (silent no-op).

**Salvaguarda activa**:
- `tab-registry.setBinding` dispara `maybeApplyTunableBinding` que
  invoca `gameConfigSet` cuando el binding empieza por `tunables.`.
- El `storageWriter` actualiza `__keys__` en cada write.
- El auto-reactivate llama a `populateInitialBindings` antes del
  `loader.activate`.
- Las host fns se registran ANTES del bootstrap via
  `wireModdableGameToRuntime` (helper canónico en
  `@modules/mod-runtime/setup/`).
- Spec E2E `m-points-per-food.spec.ts` cubre el flow end-to-end y
  detecta regresión.

### 5. `pnpm dev:mod` arranca y el mod aparece pero no se puede activar

**Síntoma**: el dev server arranca con `pnpm dev:mod`, ves el tab
Mods pero al togglear ON dispara `[bootstrap-mod-runtime] policy
presente pero GAMEFW_MODS / GAMEFW_MODS_BUNDLED_ONLY no están
activas`.

**Causa**: el script `scripts/mods/dev-mod.mjs` NO seteaba
`GAMEFW_MODS=1` al spawnear `quasar dev`. La build salía mod-free
(stub) pero la policy del juego seguía presente → mismatch.

**Salvaguarda activa**: `dev-mod.mjs` ahora fuerza `GAMEFW_MODS=1`
en cada child process (override-able por el caller). Si lanzas
`dev:mod`, evidentemente quieres mods.

### 6. `[engine-quickjs] installHostBridge: InternalError "interrupted"`

**Síntoma**: el mod faulted al cargarlo con un `InternalError`
opaco.

**Causa**: el `instructionBudget` global del runtime QuickJS
arrancaba en 0 y el interrupt handler devolvía `true` (=interrumpir)
en la primera instrucción del setup eval que monta
`globalThis.host`. El error caía silenciado por un `dispose()`
defensivo legacy.

**Salvaguarda activa**: el budget se setea antes de
`installHostBridge`. El setup eval lanza si falla (no silenciar) —
si vuelve a aparecer un crash silent del setup, propagará por el
error path normal del mod runtime.

### 7. `TypeError: cannot read property 'binding', payload is undefined`

**Síntoma**: al mover un slider del mod la app crashea con
`payload is undefined` en `DescriptorRenderer.vue:emitChange`.

**Causa**: `DescriptorRenderer` usaba el MISMO handler `emitChange`
tanto en el componente UI directo (que emite
`change({binding,value})`, 1 arg objeto) como en el child
`DescriptorRenderer` recursivo (que emite `change(binding,value)`,
2 args posicionales). La asimetría disparaba una cadena
`payload.binding` sobre un string → undefined → emit('change',
undefined) → crash.

**Salvaguarda activa**: handlers separados —
`onComponentChange(payload)` para el directo,
`forwardChange(binding, value)` para el recursivo.

### 8. Solo aparece 1 mod en el tab (de 2 bundled)

**Síntoma**: el tab Mods muestra solo `studio.fun-config` aunque
hay 2 bundled mods configurados.

**Causa**: el array `bundled.mods` en `policy.ts` no listaba el
mod nuevo. El BundledModSource solo descubre lo que está enumerado
ahí (a propósito, evita ghost mods).

**Salvaguarda activa**: ninguna — el dev es responsable de
mantener el array. El generador `build-game-mods.mjs` emite un
manifest paralelo (`bundled-mods-manifest.json`) que SÍ enumera
todos los discoverables. Cross-check manual: si `manifest.json`
declara el mod pero `policy.bundled.mods` no, el mod no carga.
Doc en
[`dev-workflow.md`](dev-workflow.md#cuando-añades-un-mod-bundled-nuevo).

### 9. Specs de mods se ejecutan junto con los del juego

**Pregunta frecuente**: ¿dónde van los specs E2E de un mod
first-party?

**Respuesta canónica**: en el subrepo
`game-mods/<gameId>/<modId>/e2e/*.spec.ts`. La factory
`createGamePlaywrightConfig` del juego acepta `additionalTestMatch`
para incluir el glob `game-mods/<gameId>/*/e2e/**/*.spec.{ts,...}`,
así CI del juego corre juego + mods con un solo comando. Los
helpers (`activateMod`, `setModBinding`, etc.) viven en
`@modules/testing-e2e/mods` — reutilizables por cualquier juego
mod-compatible.

---

## Cross-links

- [`dev-workflow.md`](dev-workflow.md) — crear y desarrollar un mod
  (lado autor).
- [`getting-started.md`](getting-started.md) — "hello mod" en 10 min
  (introducción genérica).
- [`docs/mods/architecture/build-modes.md`](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/architecture/build-modes.md)
  — los tres modos de build (`dev` / `bundled-only` / `mods-enabled`)
  con detalle del alias swap.
- [`docs/mods/architecture/lifecycle.md`](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/architecture/lifecycle.md)
  — ciclo de vida del mod: `installed` → `enabled` → `active` →
  `deactivated`.
- [`docs/mods/security/signing-and-trust.md`](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/security/signing-and-trust.md)
  — política de firma Ed25519 + trust tier filter.
- [`docs/mods/operations/incident-response.md`](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/operations/incident-response.md)
  — playbook ante incidentes.
- [`game-mods/snake-classic/studio.gameplay-tuner/README.md`](../../../game-mods/snake-classic/studio.gameplay-tuner/README.md)
  — el mod canónico que usa este flujo como referencia.
