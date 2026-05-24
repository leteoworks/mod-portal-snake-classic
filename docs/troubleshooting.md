<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm mods:sync-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# Troubleshooting — síntomas y diagnósticos

Tabla de problemas comunes al escribir o publicar mods, con causa
probable y fix. Si tu problema no está aquí, abre issue en el
[repo del template](https://github.com/leteoworks/mod-template-snake-classic/issues)
con el síntoma exacto.

---

## Tabla rápida

| Síntoma | Causa probable | Fix |
|---|---|---|
| Mod no aparece en Settings → Mods | Sideload path mal, falta `mod.json`, `target.gameId` no coincide | Verifica path canónico por OS (abajo). Verifica `target.gameId` en `mod.json`. |
| "Failed to activate" en el prompt de permisos | Un permiso requerido por el código NO está declarado en `mod.json` | Mira el log de consola. Añade el permiso al manifest. Restart del juego. |
| Tab del mod aparece vacío | `kind` no reconocido por el motor, `binding` con typo, sección sin `children` | Valida descriptor contra [`multi-engine.md`](multi-engine.md) § "vocabulario embedded". |
| Logs no aparecen en consola | Build dev sin DevTools abiertos, o `host.log.debug` filtrado | Build dev (Electron): View → Toggle Developer Tools. En retail: `Settings → Mods → <mod> → Logs`. |
| "entry not found" al cargar | `entry` en manifest apunta a path que no existe | Verifica `dist/mod.js` tras `pnpm build`. |
| "Permission denied" al `storage.set` | Permiso `storage` no declarado o `quotaKb` excedido | Añade `{ "type": "storage", "quotaKb": 32, ... }` al manifest. |
| HMR no actualiza tras editar | Ejecutando solo `pnpm build`, no `pnpm dev:mod` | Usa `pnpm dev:mod <gameId> <modId>` (workflow first-party). |
| Mod activo pero el juego no cambia | El `binding` no aplica al juego, falta hook | Si `binding: 'tunables.X'` → aplica. Si `binding: 'custom.X'` → solo storage, necesitas hook. |
| App Store rechaza el bundle | Permiso `network` declarado o `dynamic-code` en build iOS | Usa `GAMEFW_MODS_BUNDLED_ONLY=1` en build. Ver [`manifest-format.md`](manifest-format.md) § iOS compliance. |
| `pnpm mods:validate` falla con "unknown permission" | Permiso con `type` mal escrito | Tipos válidos: `events`, `settings-ui`, `storage`, `game-specific`, `i18n`, `state-read`, `state-write`, `network`, `dlc`. |
| `gameConfigSet` rechaza con "not-found" | Tunable name typo o el juego no expone ese tunable | Lista de tunables disponibles en `tunables.ts` del juego. |
| Mod funciona en dev pero no en retail | Firma faltante, build dev incluido en pack | `pnpm build:release` antes de `pnpm pack`. |
| Worskhop upload sin botón "Submit" | Falta campo obligatorio (Title, Description, Tag) | Rellena todos los campos requeridos del formulario Steam. |
| `degit` falla con 404 | Repo template no es público, o nombre mal escrito | Verifica `leteoworks/mod-template-snake-classic` accesible. |
| `pnpm build` lento (>30s) | Bundling con deps externas no marcadas | `mod.json.entry` debe apuntar a IIFE bundleado sin externals. `external: []` en build.mjs. |

---

## Sección 1 — Mod no aparece en Settings → Mods

### Síntoma
Has hecho sideload pero la lista de mods en `Settings → Mods` no
muestra tu mod.

### Checks en orden

1. **Path del userData correcto**. El juego busca en:

   | OS | Path |
   |---|---|
   | macOS | `~/Library/Application Support/snake-classic/mods/<modId>/` |
   | Windows | `%APPDATA%/snake-classic/mods/<modId>/` |
   | Linux | `~/.config/snake-classic/mods/<modId>/` |

   El `<modId>` del directorio debe coincidir con el `id` del
   `mod.json` (sino el loader lo ignora).

2. **`mod.json` válido**. Pasa el validator:

   ```bash
   pnpm mods:validate /path/to/sideload-dir
   ```

3. **`target.gameId`**. Debe ser exactamente `'snake-classic'`.
   Cualquier otra cosa (`'snake'`, `'snake_classic'`) y el loader
   lo rechaza.

4. **`entry` existe**. Si tu `mod.json` dice `"entry":
   "dist/mod.js"`, ese archivo DEBE existir relativo a la raíz
   del mod. Verifica:

   ```bash
   ls ~/Library/Application\ Support/snake-classic/mods/<modId>/dist/mod.js
   ```

5. **Modo sideload activo en retail**. En build dev sideload
   está activo por defecto. En build retail necesita el easter
   egg "7 taps en versión del juego" (Settings → About → tap 7×).
   En build dev del estudio: siempre activo.

6. **Log del loader**. Abre DevTools (build dev) y busca
   `[mod-loader]`. Suele decir exactamente por qué rechazó tu
   mod.

---

## Sección 2 — "Failed to activate"

### Síntoma
Al hacer click "Activar" → el prompt de permisos aparece →
aceptar → el mod queda en estado "Failed (permissions)".

### Causa
Tu código pide algo (un permiso) que NO está declarado en el
manifest. Ejemplos:

- Llamas `host.callHostFn('gameConfigSet', ...)` sin permiso
  `game-specific` declarado.
- Llamas `host.dispatch('MOD_NOTIFICATION', ...)` sin `events`
  con `dispatch: ['MOD_NOTIFICATION']`.
- Llamas `host.state.read('game.score')` sin `state-read.paths`
  incluyendo `'game.score'`.

### Fix

1. Abre DevTools, busca el primer `permission-denied` log:

   ```
   [mod-runtime] permission-denied: <mod-id>
     operation: callHostFn
     name: gameConfigSet
     reason: missing permission `game-specific.surface=tunables.actions=set`
   ```

2. Añade el permiso al `mod.json`:

   ```json
   {
     "type": "game-specific",
     "surface": "tunables",
     "actions": ["set"],
     "rationale": "..."
   }
   ```

3. Reload del juego (los permisos se vuelven a chequear al
   activar).

---

## Sección 3 — Tab del mod aparece vacío

### Síntoma
Tu tab aparece en Settings pero está vacío (sin sliders, sin
toggles, sin nada).

### Causas posibles

1. **`kind` no reconocido**. El motor del runtime acepta:
   `card`, `heading`, `paragraph`, `divider`, `slider`, `toggle`,
   `select`, `button`, `input` (texto). Si tu descriptor usa otro
   `kind` (e.g. `'switch'` o `'checkbox'`), el motor lo ignora
   silenciosamente.

2. **Sección sin `children`**. Una `card` sin `children: [...]`
   se renderiza vacía:

   ```ts
   // ❌ mal
   { kind: 'card', title: 'X' }

   // ✅ bien
   { kind: 'card', title: 'X', children: [...] }
   ```

3. **Errores en `host.i18n?.t(key)` que devuelven `undefined`**.
   Si tu `label` es `undefined`, el componente puede ocultarse.
   Usa fallback:

   ```ts
   label: host.i18n?.t('key') ?? 'Fallback literal',
   ```

### Diagnóstico

Abre DevTools → busca `[mod-ui]` warnings. Suele logear los
descriptors no reconocidos.

---

## Sección 4 — Logs no aparecen

### Síntoma
Llamas `host.log.info(...)` y no ves nada en consola.

### Causas

1. **DevTools cerrados**. En build Electron dev: View → Toggle
   Developer Tools (Cmd+Opt+I / Ctrl+Shift+I).

2. **Build retail filtra `debug`**. Solo `info`/`warn`/`error`
   se persisten. Mira en `Settings → Mods → <mod> → Logs`.

3. **Activa el panel "Logs" del mod en retail**. Necesita modo
   desarrollador activo (easter egg 7 taps en versión).

4. **El mod NO está activo todavía**. Logs antes de
   `onActivate` se descartan. Mueve a hook `onActivate` o a un
   `subscribeEvent` que se dispare después.

---

## Sección 5 — `permission denied` al storage

### Síntoma

```
[mod-runtime] permission-denied: <mod-id>
  operation: storage.set
  reason: missing permission `storage` (or quota exceeded)
```

### Causas

1. **Permiso `storage` ausente**. Añade:

   ```json
   { "type": "storage", "quotaKb": 32, "rationale": "..." }
   ```

2. **Quota excedida**. Tu objeto serializado supera `quotaKb`.
   Receta 4 del [`cookbook.md`](cookbook.md#4) explica cómo
   detectarlo y trocear si es necesario.

3. **Storage corrupto**. Raro. Borra `userData/<game>/mods/<mod>/storage.json` y reinicia.

---

## Sección 6 — App Store rechaza el bundle (iOS)

### Síntoma
Build iOS pasa por App Store Connect → reviewer rechaza con §3.3.2.

### Causa
La build retail iOS NO debe incluir ningún runtime de mods (App
Store §3.3.2 prohíbe ejecución de código no firmado). El sistema
de mods tiene un **mod-free build mode** que tree-shakea TODO el
runtime al compilar.

### Fix

```bash
GAMEFW_MODS_BUNDLED_ONLY=1 pnpm build:game snake-classic --mode=capacitor --target=ios
```

`GAMEFW_MODS_BUNDLED_ONLY=1` excluye el `ModRuntime` y todos los
motores del bundle. Solo los mods first-party PRE-COMPILADOS Y
FIRMADOS por el estudio sobreviven (como contenido estático, no
ejecutable dinámico).

Ver [`mod-free-builds.md`](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/implementation/mod-free-builds.md)
para detalles.

---

## Sección 7 — Steam Workshop upload falla

### Causas comunes

1. **ZIP demasiado grande**. Workshop limita 100 MB por item.
   `pnpm pack` debería estar <500 KB típico. Si tu ZIP es 50+
   MB, probablemente has incluido `node_modules/` o `src/` por
   error. Verifica el contenido:

   ```bash
   unzip -l dist/<modId>-<version>.zip
   ```

2. **Falta preview image**. Workshop exige al menos 1 imagen
   800×450 (no el icono 256×256). Sube una screenshot del mod en
   acción.

3. **Tags inválidos**. Solo tags del catálogo del juego target.
   Lista en `scripts/mods/workshop-config.json.games.<gameId>.tags.whitelist`.

4. **Cuenta Steam sin Workshop habilitado**. Algunos juegos
   requieren tener jugado X horas para postear. Verifica en la
   página del juego que el botón "Create Item" aparezca.

---

## Sección 8 — Diferencias dev vs retail

Mismo código, comportamiento distinto entre `pnpm dev:game` y
build retail. Causas comunes:

| Comportamiento | Dev | Retail |
|---|---|---|
| `host.log.debug` | Visible en DevTools | Silenciado |
| Sideload directorio | Siempre cargado | Solo con easter egg activado |
| Firmas Ed25519 | Skip (todo signed: false) | Validadas (placeholder → quarantine) |
| `process.env.NODE_ENV` | `'development'` | `'production'` |
| HMR del mod | Sí con `pnpm dev:mod` | No (carga al boot) |

Si tu mod funciona en dev pero falla en retail, casi siempre es:
- Firma faltante (`pnpm build:release` sin `GAMEFW_MODS_SIGN_KEY`).
- Permiso solo necesario por `host.log.debug` (que no se llama en
  retail, así que no se nota).
- Sideload no activado.

---

## Sección 9 — Mod activo, pero el juego no cambia

Hueco común. Has llamado a `gameConfigSet` y aparentemente todo
OK pero el juego no aplica el valor.

### Checks

1. **Has llamado `gameConfigSet` al inicio de partida**. El
   `gameConfigSet` aplica al estado del juego. Si lo llamas
   ANTES de `GAME_STARTED`, el juego aún no existe — pierde el
   override. Llama dentro de hook `GAME_STARTED`:

   ```ts
   host.subscribeEvent('GAME_STARTED', async () => {
     await host.callHostFn('gameConfigSet', {
       name: 'maxLives', value: 5,
     });
   });
   ```

2. **Tunable name correcto**. `gameConfigSet({ name: 'maxLives'
   })` exige que el juego haya declarado ese tunable. Si está
   mal escrito (`'max-lives'`, `'maxLifes'`), `gameConfigSet`
   rechaza con `not-found`.

3. **El valor está dentro del rango del tunable**. Cada tunable
   tiene `min`/`max`. Si pasas un valor fuera, el juego lo
   recorta silenciosamente.

4. **Sin permiso `state-write`**. Algunos tunables son
   read-only durante una partida en curso. `GAME_STARTED` es el
   momento safe para escribir.

---

## Cómo abrir un issue útil

Si nada de lo anterior funciona, abre issue con:

1. **Versión del juego**: `Settings → About`.
2. **Versión del mod**: `mod.json:version`.
3. **OS + arquitectura**: `macOS 14.6 (Apple Silicon)`, etc.
4. **`mod.json` completo** (anonimiza si tiene info personal).
5. **Logs**: copia el bloque `[mod-runtime]` y `[mod-loader]` de
   DevTools.
6. **Pasos para reproducir**: instalar mod → activar → hacer X →
   esperar Y → ver Z.

Con eso el estudio puede diagnosticarlo en minutos.

## Ver también

- [`tutorial/`](tutorial/01-hello-mod.md) — curso desde cero.
- [`cookbook.md`](cookbook.md) — recetas copy-paste.
- [`api-reference.md`](api-reference.md) — catálogo `host.*`.
- [`manifest-format.md`](manifest-format.md) — todos los
  permisos y tipos.
