<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm mods:sync-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# Galería de prompts probados — vibe-coding tu mod

Cada prompt es **autocontenido**: puedes copiar y pegar en Claude
Code (CLI o IDE) y obtener un resultado útil. Asumimos que tu mod
tiene en la raíz el [`CLAUDE.md`](CLAUDE.template.md) hermano —
es el que le da contexto a Claude sobre el framework, el sandbox
y los archivos del mod.

Tres niveles según riesgo:

- **Nivel 1** — Mecánico (Claude lo hace solo, tú lo aceptas si
  compila).
- **Nivel 2** — Mod sencillo completo (Claude propone, tú revisas
  manifest + permisos + nombres de eventos).
- **Nivel 3** — Release boilerplate (texto generado en paralelo a
  tu trabajo).

---

## Nivel 1 — Tareas mecánicas (vibe-coding seguro)

### 1.1 — Añadir un toggle nuevo a un tab existente

```
Añade un toggle nuevo al tab del mod que controle si las
notificaciones de game-over aparecen como toast. Persistir entre
sesiones con binding al storage del mod.

Detalles:
- Label: "Mostrar toast al terminar partida".
- Binding: 'showToastOnGameOver' (sin prefijo tunables. — es solo
  storage del mod, no toca el juego).
- Default: true.
- Hay que añadirlo a la card "Notificaciones" del tab; si esa
  card no existe, créala.

NO añadas un hook nuevo todavía — el handler que lee el toggle y
muestra el toast lo escribiré yo después.
```

**Tocará**: `src/settings-tab.ts` (o `src/index.ts` si el
descriptor está inline).

**Lo que Claude debería NO tocar a mano después**: la estructura
del descriptor (Claude la deja correcta).

**Lo que SÍ debes revisar tú**:
- ¿El label es bueno en tu idioma? Si tienes i18n, mejor pasarlo
  por `host.i18n.t(...)`.
- Si el toggle controla algo del juego (no solo del mod), debe
  ser `binding: 'tunables.X'`, no `'showToastOnGameOver'`.

**Riesgos típicos**:
- Claude puede añadir un permiso nuevo "por si acaso" — verifica
  `mod.json` que no se haya añadido nada que no necesites.

---

### 1.2 — i18n: traducir hardcoded strings a `locales/`

```
En src/settings-tab.ts hay strings hardcoded en español. Hazlas
i18n:

1. Crea (o extiende) locales/en.json y locales/es.json.
2. Usa keys con namespace `mod.<modId>.tab.<area>.<element>`
   (lee mi mod.json para el modId).
3. En el código, reemplaza el string literal por
   `host.i18n?.t('mod.<modId>.tab.X.Y') ?? '<fallback en
   español>'`.
4. Si `permissions[type=i18n]` no está declarado en mi mod.json,
   añádelo con namespace correcto y rationale concreto.

NO toques las keys que YA estaban i18n-ized (las que ya usan
host.i18n.t). Solo las que estén hardcoded.
```

**Tocará**: `locales/en.json`, `locales/es.json`,
`src/settings-tab.ts` (o `src/index.ts`), posiblemente
`mod.json`.

**Lo que SÍ debes revisar tú**:
- **Traducciones en inglés**: Claude puede dejar algo
  literal-correcto pero impreciso. Lee `en.json`.
- **`mod.json` permiso `i18n`**: si Claude lo añadió, su
  `rationale` debe explicar qué traduce (no "Para i18n").

**Riesgos típicos**:
- Key fuera de namespace declarado → el framework la rechaza
  silenciosamente.
- Fallback en español en código + locale `es.json` también con la
  misma string = redundancia (no es bug, pero feo). Decide uno
  solo y consistente.

---

### 1.3 — Refactor: N toggles inline → array + map (DRY)

```
En src/settings-tab.ts tengo N entradas inline `{ kind: 'toggle',
label: '...', binding: 'tunables.powerupXEnabled' }`, todas con
la misma forma. Refactorizalas a:

1. Un array TOGGLES en src/toggles.ts con shape
   `{ binding, i18nKey, fallback }`.
2. En settings-tab.ts, `.map(...)` sobre el array para generar
   las entradas.
3. Mantén el ORDEN actual (es relevante visualmente).
4. Mantén el i18n: si las entradas actuales usan
   `host.i18n.t(...)`, el array debe llevar `i18nKey` separado del
   `fallback`.

Ejemplo de patrón: studio.fun-config ya hace exactamente esto —
mira game-mods/snake-classic/studio.fun-config/src/settings-tab.ts
si necesitas referencia.
```

**Tocará**: `src/settings-tab.ts`, **nuevo** `src/toggles.ts`.

**Lo que SÍ debes revisar tú**:
- El orden debe estar preservado.
- Los bindings deben coincidir EXACTAMENTE con los anteriores
  (un typo y dejan de aplicar al juego).

**Riesgos típicos**: ninguno crítico — es refactor mecánico. Si
el build pasa, está bien.

---

### 1.4 — Añadir botón "Reset to defaults" que aplica N bindings

```
Añade un botón al tab "Restaurar valores por defecto" que ponga
todos los toggles del array TOGGLES (src/toggles.ts) a `true`
(o el default que pase como segundo argumento del array).

Implementación esperada:
1. Botón en una card "Acciones" al final del tab, variant 'ghost'.
2. action: { kind: 'event', name: 'MYMOD_RESET_TOGGLES' }.
3. Handler en src/index.ts que use Promise.all para aplicar los
   N toggles con un solo `await` (no serial — mira la receta 2
   del cookbook si necesitas referencia).
4. Persiste los nuevos valores en storage para que la UI los
   refleje al re-renderizar.
5. Añade 'MYMOD_RESET_TOGGLES' al subscribe[] del permiso events
   en mod.json.
6. Tras aplicar, dispatch a 'MOD_NOTIFICATION' con texto "Valores
   restaurados" — añade 'MOD_NOTIFICATION' al dispatch[] del
   permiso events.
```

**Tocará**: `src/settings-tab.ts`, `src/index.ts`, `mod.json`.

**Lo que SÍ debes revisar tú**:
- `mod.json`: que el permiso `events` haya quedado coherente
  (subscribe + dispatch ambos correctos).
- El nombre `MYMOD_RESET_TOGGLES` — Claude puede haber inventado
  otro prefijo. Convención: `MOD_<tu-modid-sin-puntos>_<action>`.

**Riesgos típicos**:
- Olvido del `await Promise.all` → 22 calls serial → UI freeze
  perceptible. Verifica que el código tiene `Promise.all`.
- Si el storage `host.storage.set` falla silenciosamente (cuota
  excedida), la UI no refleja el reset. Mira `result.ok` tras
  cada `set`.

---

## Nivel 2 — Mods sencillos completos (Claude propone, modder revisa)

### 2.1 — Mod "score final notification"

```
Crea un mod completo en este proyecto que:

1. Cuando el juego dispara GAME_OVER, muestra una notificación
   toast in-game con el score final.
2. Tiene un toggle en Settings → Mods → `<tu tab>` que permite
   activar/desactivar la notificación. Default: ON.
3. Persiste el toggle entre sesiones.

Detalles:
- target.gameId: snake-classic. target.gameVersion: ^1.0.0.
- engine.preferred: quickjs-declarative-ui, fallback quickjs.
- Permisos requeridos: settings-ui, events (subscribe GAME_OVER,
  dispatch MOD_NOTIFICATION), storage (quotaKb 16), i18n
  (namespace `mod.<tu-modid>`).
- Cada permiso con rationale concreto NO trivial.
- i18n: locales/en.json + locales/es.json con la string del
  toggle + el texto del toast.
- Edita mod.json con id, version 0.1.0, metadata.name, author.

NO añadas dependencies a package.json. Solo esbuild ya viene en
devDeps.
```

**Tocará**: `mod.json`, `src/index.ts`, `src/settings-tab.ts` (si
te parece mejor), `locales/en.json`, `locales/es.json`.

**Lo que SÍ debes revisar tú**:
- **Permisos `rationale`**: el jugador los lee. Si Claude dejó
  "for notifications", reescríbelo a algo concreto ("Avisa al
  jugador con su score final al terminar la partida").
- **`metadata.author`**: probablemente Claude puso "Modder" o
  similar. Pon tu nombre o handle real.
- **`id`**: convención `<tuhandle>.<modname>`. Si Claude inventó
  algo, cámbialo.
- **Nombre del evento `GAME_OVER`**: confirma en api-reference que
  existe con ese nombre exacto.

**Riesgos típicos**:
- Claude puede inventar un nombre de evento (`GAME_ENDED`,
  `MATCH_FINISHED`) cuando el real es `GAME_OVER`. Confirma con
  api-reference.md o el código del juego.

---

### 2.2 — Mod "slider de velocidad inicial persistido"

```
Crea un mod completo que añada un slider al tab Settings que
controle la velocidad inicial de Snake (tunable
'initialSpeedTickMs', rango 80-500ms, step 10, default 200).

Comportamiento:
- Mover el slider aplica el cambio en vivo Y persiste en storage.
- Al iniciar cualquier partida (GAME_STARTED), re-aplica el
  valor del storage (defensivo contra restarts del juego).
- Botón "Restaurar default" debajo del slider que llama
  `gameConfigReset` y limpia el storage para que el slider muestre
  el default del juego.

Detalles operacionales:
- target.gameId: snake-classic.
- Permisos: settings-ui, game-specific (surface tunables, actions
  set+reset+snapshot), events (subscribe GAME_STARTED, subscribe
  MYMOD_RESET_SPEED), storage (16 KB), i18n (namespace `mod.<id>`).
- El slider debe usar `binding: 'tunables.initialSpeedTickMs'`
  (con prefijo tunables.) — el runtime aplica el cambio
  automáticamente sin handler.
- El hook GAME_STARTED LEE del storage y llama gameConfigSet —
  NO escribe storage (anti-patrón last-write-wins, ver
  CLAUDE.md).

Toma como referencia game-mods/snake-classic/studio.gameplay-tuner/
si necesitas ver el patrón en producción.
```

**Tocará**: `mod.json`, `src/index.ts`, `src/settings-tab.ts`,
`locales/en.json` + `locales/es.json`.

**Lo que SÍ debes revisar tú**:
- **Permiso `game-specific`** — `surface: 'tunables'`,
  `actions: ['set', 'reset', 'snapshot']`. Si Claude pidió otras
  acciones, cuestiónalo.
- **`initialSpeedTickMs`** existe como tunable en
  Snake — confirma en `tunables.ts` del juego o en
  api-reference.

**Riesgos típicos**:
- Claude puede mezclar el binding `tunables.` + un hook que
  escriba la misma key → race condition. Verifica que el hook
  **lee** del storage y aplica al juego con `callHostFn`, sin
  llamar a `host.storage.set` para esa key.

---

### 2.3 — Mod "toggle parametrizable de un power-up"

~~~
Crea un mod parametrizable que toggle ON/OFF un power-up concreto
de Snake.

Parámetro del mod (configurable solo editando una constante
TYPESCRIPT en src/, NO via UI runtime):

```ts
const POWER_UP: string = 'speedBoost';  // editable
```

Comportamiento:
- Genera un tab con UN solo toggle `Activar {PowerUp Name}`.
- Default: true (igual al default del juego).
- Mover el toggle llama `gameConfigSet('powerup{POWER_UP}Enabled',
  bool)`.
- Persiste el último estado con binding 'tunables.powerup...Enabled'.

Si POWER_UP no es uno de los 22 válidos, el mod loguea warn y no
registra el tab.

Lista válida de POWER_UP: speedBoost, invincibility, doublePoints,
magnet, shrink, ghost, goldenApple, demolition, earthquake,
bombPickup, brickBlast, extraLife, summonSnake, blindfold,
fragileWall, brickRevival, portal, demon, baseballBat,
doubleLength, rainbowHeart, timeTravel.
~~~

**Tocará**: `mod.json`, `src/index.ts`, `src/settings-tab.ts`,
`locales/en.json` + `locales/es.json`.

**Lo que SÍ debes revisar tú**:
- **Validación de la constante**: que el código realmente loguee
  warn + skip si el valor es inválido. Si no lo hace, exige
  fail-fast.
- **i18n del nombre**: que el label del toggle use el
  `host.i18n.t(...)` y no el camelCase interno (`speedBoost`
  como label es feo; debería ser "Speed Boost").

---

### 2.4 — Mod "preset dropdown Easy/Normal/Hard"

```
Crea un mod completo que añada un dropdown ("select") al tab con
3 opciones: Easy / Normal / Hard. Aplicar el preset aplica
varios tunables del juego de golpe.

Presets (los puedes ajustar — son sensatos pero edíta libre):

- Easy: maxLives=5, initialSpeedTickMs=300, pointsPerFood=10.
- Normal: maxLives=3, initialSpeedTickMs=200, pointsPerFood=15.
- Hard: maxLives=1, initialSpeedTickMs=120, pointsPerFood=25.

Detalles:
- El dropdown usa `kind: 'select'` con `binding: 'mymod.preset'`.
- Un botón "Aplicar preset" debajo dispara el evento
  MYMOD_APPLY_PRESET con payload { preset: 'easy'|'normal'|'hard' }.
- El handler aplica los 3 tunables EN PARALELO con Promise.all
  + persiste cada uno en storage para que la UI los refleje (si
  hay otros sliders en el tab — opcional para esta versión).
- Tras aplicar, dispatch MOD_NOTIFICATION con "Preset X aplicado".

Referencia: studio.gameplay-tuner usa exactamente este patrón —
mira game-mods/snake-classic/studio.gameplay-tuner/src/presets.ts
y src/apply-config.ts si necesitas el shape.
```

**Tocará**: `mod.json`, `src/index.ts`, `src/settings-tab.ts`,
`src/presets.ts` (nuevo), `locales/en.json` + `locales/es.json`.

**Lo que SÍ debes revisar tú**:
- Los valores de los presets — Easy con 5 vidas es razonable,
  pero los `pointsPerFood` son decisión tuya. Edita si quieres.
- El nombre del evento `MYMOD_APPLY_PRESET` — convención
  `MOD_<tu-modid-sin-puntos>_<verbo>`.

**Riesgos típicos**:
- **Falta `Promise.all`** → 3 calls serial → ~3ms perceptible.
  Verifica que el código lo usa.
- **`maxLives`/`initialSpeedTickMs`/`pointsPerFood`** — todos
  son tunables válidos en Snake, pero confirma en `tunables.ts`
  del juego.

---

## Nivel 3 — Tareas de release (boilerplate)

### 3.1 — Generar icon 256x256 + 3 screenshots descriptivos

```
Tu mod hace [DESCRIPCIÓN BREVE EN 1 FRASE]. Necesito:

1. icon.png 256x256 con transparencia opcional, <50KB,
   reconocible a 64x64. Estilo coherente con [Snake / pixel art
   / minimalista — escoge].
2. 3 screenshots 1920x1080 para Workshop:
   - screenshot 1: el tab del mod en Settings con sus controles.
   - screenshot 2: el efecto del mod en el juego (cambio
     visible).
   - screenshot 3: opcional, descripción/diagrama si el mod es
     conceptualmente complejo.

Para los screenshots, sugiéreme qué capturar exactamente paso a
paso (yo lo haré con cmd-shift-4 o equivalente, no tienes que
generarlos tú).

Para el icon, propón 3 variantes de prompt para image gen del IDE
(Anthropic Studio, DALL-E, Stable Diffusion) que pueda elegir.
```

**Tocará**: nada en código. Output es prompt para image gen +
sugerencias de QA manual.

**Lo que SÍ debes revisar tú**: el icon debe ser legible al
tamaño chico (64x64 en la lista de mods). Variantes con texto
suelen ser ilegibles — prefiere símbolos.

---

### 3.2 — Generar changelog para v0.2.0

```
Estoy a punto de publicar v0.2.0 de mi mod. La versión anterior
es v0.1.0.

Lee `git log v0.1.0..HEAD --oneline` (o `git log --since
"v0.1.0"` si no hay tag) y genera:

1. CHANGELOG.md (o lo añade al CHANGELOG existente arriba):
   ```
   ## v0.2.0 - YYYY-MM-DD

   ### Added
   - ...

   ### Changed
   - ...

   ### Fixed
   - ...
   ```

2. Versión "Steam Workshop description" (markdown corto, max 500
   chars) lista para copiar a la página del item al hacer
   Update Item.

Convención de bumps:
- patch (0.1.0 → 0.1.1): solo bug fixes.
- minor (0.1.0 → 0.2.0): features no-breaking. Settings se
  preservan en update.
- major (0.1.0 → 1.0.0): rompe. **Settings se RESETEAN
  automáticamente al actualizar.**

Si los commits indican algo que rompe (renombre de un binding,
cambio en mod.json#permissions), avísame antes de generar — quizás
debería ser 1.0.0 en vez de 0.2.0.
```

**Tocará**: `CHANGELOG.md` (nuevo o append).

**Lo que SÍ debes revisar tú**:
- Si Claude detectó un cambio breaking, **confía en él** —
  evalúa si MAJOR es lo correcto. Resetear settings del jugador
  no es trivial.
- El "Steam Workshop description" se queda corta de detalles
  fácil. Si la quieres detallada, refínala manualmente.

---

### 3.3 — Generar README.md del mod

~~~
Genera un README.md profesional para mi mod, leyendo mod.json y
src/. Estructura:

# {metadata.name}

[Badge `mod for Snake Classic`] [Badge `v0.1.0`] [Badge `MIT`]

{metadata.description en 1-2 frases}

## What it does

[3-5 bullets describiendo cada feature, sacándolas del código]

## Screenshots

![](screenshots/01.png)
![](screenshots/02.png)

## Install

### Via Steam Workshop

1. Subscribe at {link}.
2. Open Snake Classic. The mod appears in Settings → Mods.

### Manual sideload

```bash
git clone {repo}
pnpm install && pnpm build
# Copy to userData/snake-classic/mods/{modId}/
```

## Permissions

Lista de cada permiso del mod.json con su rationale, formateado
como tabla.

## Credits

- Author: {metadata.author}
- License: {metadata.license}
- Built with Snake Classic mod framework
  (https://leteoworks.github.io/mod-portal-snake-classic).

## Changelog

Ver CHANGELOG.md.

NO inventes features que no estén en el código. Si una sección no
aplica, omítela.
~~~

**Tocará**: `README.md` (overwrite si existe).

**Lo que SÍ debes revisar tú**:
- El `repo URL` para la sección Manual sideload — Claude no sabe
  cuál es. Edítalo.
- El `<link>` del Steam Workshop — placeholders. Edítalo cuando
  tengas el Workshop ID.

---

## Cómo añadir prompts a esta galería

Si tienes un prompt probado que funciona bien y no está aquí,
abre PR contra
[`leteoworks/mod-portal-snake-classic`](https://github.com/leteoworks/mod-portal-snake-classic)
añadiendo entrada en este `example-prompts.md`. Incluye:

- Texto del prompt copy-paste.
- Nivel (1/2/3).
- Qué archivos toca.
- Qué revisar manualmente después.
- Riesgos típicos y cómo detectarlos.

Mantenemos la galería corta y de calidad — mejor 10 prompts
probados que 50 alucinados.
