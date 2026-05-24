<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm sync:mod-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# Workflow de desarrollo y release de mods first-party

Documento canónico para crear, iterar y empaquetar mods bajo la marca
del estudio (`Leteo`) que viven en el subrepo
[`game-mods/`](../../../game-mods/README.md) y consumen la familia
`@modules/moddable/*` del framework.

> Lectura prerrequisito (5 min): [README del subrepo](../../../game-mods/README.md)
> + [README de la familia moddable](../../../src/modules/moddable/README.md).
>
> Para una introducción genérica al sistema de mods (sin asumir el
> subrepo `game-mods/`), ver [getting-started.md](getting-started.md).
> Este doc asume mods first-party del estudio.
>
> Para **probar el mod manualmente end-to-end** como lo haría un
> usuario Steam (activar → usar sliders → ver efecto), ver
> [manual-testing-flow.md](manual-testing-flow.md).

---

## TL;DR — el ciclo en una línea

```
crear mod en game-mods/<gameId>/<modId>/  →  pnpm dev:mod <gameId> <modId>  →  edit src/  →  ver cambio en navegador
```

Y para release:

```
pnpm build:game <gameId> --mode=electron   # firma + bundle + Electron en uno
```

El framework se encarga de descubrir, compilar, firmar y bundlear
todos los mods de `game-mods/<gameId>/` automáticamente.

---

## 1. Arquitectura del workflow

```
┌────────────────────────────────────────────────────────────────┐
│  Subrepo: game-mods/  (repo separado, submódulo git)           │
│                                                                │
│  game-mods/snake-classic/studio.gameplay-tuner/                │
│    ├── mod.json                                                │
│    ├── src/index.ts        ← editas aquí                       │
│    ├── locales/en.json                                         │
│    ├── package.json                                            │
│    ├── build.mjs           ← esbuild (--watch en dev)          │
│    └── dist/mod.js         ← bundle IIFE ES2020 (generado)     │
└────────────────────────────────────────────────────────────────┘
                                  │
                                  │  alias webpack:  @game-mods/* → ./game-mods/*
                                  ▼
┌────────────────────────────────────────────────────────────────┐
│  Repo padre: my-game-fw-mods-main                              │
│                                                                │
│  src/games/snake-classic/mods/                                 │
│    ├── tunables.ts          ← declara qué se puede tunear      │
│    ├── moddable-config.ts   ← consume familia @modules/moddable│
│    ├── policy.ts            ← bridge único a @modules/mod-runtime
│    └── bundled-loader.ts    ← AUTO-DESCUBRE mods via import.meta.glob
│                                                                │
│  src/games/snake-classic/mods/bundled-mods-manifest.json       │
│    ← AUTOGENERADO por scripts/build-game-mods.mjs              │
│      con sha256 + signature (solo en build:release)            │
└────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                       Electron / web / mobile builds
                       (todos consumen la misma fuente)
```

**Reglas clave de este workflow**:

1. **Una fuente de verdad por mod**: `game-mods/<gameId>/<modId>/`.
2. **El parent NO contiene código de mod** — sólo wiring del juego
   (`policy.ts`, `moddable-config.ts`, `bundled-loader.ts`).
3. **Descubrimiento automático**: el `bundled-loader.ts` usa
   `import.meta.glob` sobre el alias `@game-mods/*` — añadir un mod
   no requiere tocar el código del juego.
4. **Manifest autogenerado**: `bundled-mods-manifest.json` no se
   edita a mano; lo escribe `scripts/build-game-mods.mjs` con
   sha256 fresco en cada build.
5. **Firma sólo en release**: dev y `build` regular skipean firma; el
   runtime acepta `signed: false` cuando `NODE_ENV !== 'production'`.

---

## 2. Cómo crear un mod nuevo (5 pasos)

Suponiendo que ya hay un juego mod-compatible en el framework (en
2026-05 sólo Snake Classic lo es). Pasos para el ejemplo
`studio.colorful-snake`:

### Paso 1 — Scaffold

```bash
cd game-mods/snake-classic
cp -r studio.gameplay-tuner studio.colorful-snake
cd studio.colorful-snake
```

Edita los campos identificativos en `mod.json`:

```diff
- "id": "studio.gameplay-tuner",
+ "id": "studio.colorful-snake",
- "version": "0.1.0",
+ "version": "0.1.0",
  "target": {
    "gameId": "snake-classic",
    "gameVersion": "^1.0.0"
  },
  ...
  "metadata": {
-   "name": "Gameplay Tuner",
+   "name": "Colorful Snake",
-   "description": "...",
+   "description": "Paletas de colores intercambiables para Snake.",
  }
```

> **Importante**: el `id` debe ser único entre TODOS los mods (de
> todos los juegos). Convención: `<vendor>.<short-id>` en kebab-case.

### Paso 2 — Implementar lógica

Edita `src/index.ts`:

```ts
import { applyConfigurationToGame } from './apply-config';
import { buildSettingsTabDescriptor } from './settings-tab';

host.registerSettingsTab?.(buildSettingsTabDescriptor());

host.subscribeEvent('GAME_STARTED', async () => {
  // tu lógica
});

host.log.info('[colorful-snake] loaded');
```

El acceso al juego es vía `host.callHostFn(name, args)` — las host
fns disponibles vienen del `moddable-config.ts` del juego target.
Lista canónica:

- `gameConfigSet({ name, value })` — setea un tunable declarado.
- `gameConfigReset({ name })` — vuelve al default.
- `gameConfigSnapshot()` — lee todos los tunables actuales.

Si necesitas tunables que el juego AÚN NO expone, hay que:

1. Editar `src/games/<gameId>/mods/tunables.ts` en el repo padre
   añadiendo el `defineTunable(...)` que necesitas.
2. (Opcional) hacer el codemod en gameplay para que lea
   `tunable.get()`.
3. Bump del `hostApiVersion` en `moddable-config.ts` (MINOR si
   añades, MAJOR si rompes).

### Paso 3 — Locales

Edita `locales/en.json` y `locales/es.json`:

```json
{
  "mod-colorful-snake.tab.title": "Colorful Snake",
  "mod-colorful-snake.palette.label": "Palette",
  ...
}
```

El namespace declarado en `mod.json` (campo
`permissions[type=i18n].namespaces`) debe matchear el prefijo de las
keys. Si un locale está incompleto, el CI lo detectará
(`pnpm exec node scripts/mods/validate-i18n.mjs`).

### Paso 4 — Probar en dev

```bash
cd /Users/aicampos/Documents/Antonio/code/github_projects/my-game-fw-mods-main
pnpm dev:mod snake-classic studio.colorful-snake
```

Eso arranca dos procesos concurrentes:
- `esbuild --watch` dentro del mod → regenera `dist/mod.js` cada
  cambio.
- `pnpm dev:game snake-classic` → Quasar dev del juego. El HMR detecta
  el cambio del raw bundle y el `ModRuntime` re-evalúa el mod en el
  sandbox (sin recargar el navegador, salvo cambios estructurales).

Una sola terminal, latencia ~1-2 s entre edit y ver el resultado.

### Paso 5 — Commit + push del mod

Cuando el mod está estable:

```bash
cd game-mods
git add snake-classic/studio.colorful-snake
git commit -m "feat: studio.colorful-snake v0.1.0"
git push
cd ..

# Bump del SHA del submódulo en el parent:
git add game-mods
git commit -m "chore(game-mods): bump submodule (studio.colorful-snake v0.1.0)"
```

El push del subrepo es independiente del push del parent — coordina
ambos cuando el mod esté listo para release.

---

## 3. Cómo probarlo en dev (detalle del `pnpm dev:mod`)

```bash
pnpm dev:mod snake-classic studio.gameplay-tuner
```

Equivale a:

```bash
# Una sola terminal, dos procesos concurrentes vía concurrently.
node scripts/dev-mod.mjs snake-classic studio.gameplay-tuner

# Internamente hace:
#  1. Valida que game-mods/snake-classic/studio.gameplay-tuner/ existe.
#  2. pnpm install dentro del mod (idempotente, 1ª vez ~10s, luego ~0).
#  3. Lanza:
#       a) pnpm --filter <mod-path> watch    (esbuild --watch)
#       b) pnpm dev:game snake-classic       (Quasar dev del juego)
#  4. Termina ambos al Ctrl-C.
```

**Lo que ves en pantalla**:

```
[dev-mod] watching game-mods/snake-classic/studio.gameplay-tuner/
[esbuild]  build OK (143ms)
[quasar]   READY  Quasar dev server running at http://localhost:9000
[quasar]   compiled in 4321ms

  # editas src/index.ts...
[esbuild]  build OK (87ms)
[quasar]   hmr update src/games/snake-classic/mods/bundled-loader.ts
[mod-runtime] mod studio.gameplay-tuner re-evaluated
```

### Variantes útiles

```bash
# Varios mods a la vez:
pnpm dev:mod snake-classic studio.gameplay-tuner studio.colorful-snake

# Todos los mods del juego:
pnpm dev:mod snake-classic --all

# Sólo el juego (sin watch de mods — útil si los mods ya están en dist/):
pnpm dev:game snake-classic
```

### Modo dev vs modo build regular vs build:release

| Modo | Comando | Firma mods | Manifest | sha256 |
|---|---|---|---|---|
| Dev | `pnpm dev:game <id>` o `pnpm dev:mod ...` | ❌ skip | autogenerado (sin sig) | calculado pero no enforced |
| Build regular | `pnpm build:game <id>` | ❌ skip | autogenerado (sin sig) | calculado |
| Release | `pnpm build:game <id> --mode=electron` (o `--release`) | ✅ Ed25519 | autogenerado (con sig) | enforced |

El runtime de mods acepta `signed: false` en builds no-release; en
release exige firma válida (el cargador rechaza mods con
`mod.signature.value === undefined` o sha256 mismatch).

---

## 4. Cómo buildear para Electron con N mods

Comando único:

```bash
pnpm build:game snake-classic --mode=electron
```

Lo que ocurre, en orden:

```
1. scripts/build-game-mods.mjs (pre-build hook):
   ├── Discover: glob game-mods/snake-classic/*/mod.json
   ├── Por cada mod:
   │   ├── pnpm install (si node_modules no existe)
   │   ├── pnpm build:release (esbuild --minify → dist/mod.js)
   │   └── sha256(dist/mod.js)
   ├── Si NODE_ENV=production o --release:
   │   └── Firma cada dist/mod.js con clave Ed25519 del estudio
   │       (env var GAMEFW_MODS_SIGN_KEY; obligatoria en release).
   └── Escribe src/games/snake-classic/mods/bundled-mods-manifest.json
       con todos los entries (modId, version, sha256, signedBy,
       signedAt, signed, sig).

2. quasar build --mode=electron:
   ├── Webpack resuelve alias @game-mods/* → game-mods/*
   ├── bundled-loader.ts ejecuta import.meta.glob('@game-mods/snake-classic/*/dist/mod.js')
   │   → webpack inlinea cada mod.js como ?raw en el bundle del juego
   ├── Tree-shaking elimina lo no referenciado
   └── electron-builder empaqueta el bundle + assets

3. Output: dist/electron/snake-classic-1.x.x-{mac,win,linux}.{dmg,exe,AppImage}
```

**N mods**: el script descubre automáticamente todos los mods de
`game-mods/snake-classic/`. Añadir el mod #7 = `mkdir` + `cp -r` +
ya está. Cero código framework.

**¿Y los otros juegos?** Mismo flujo. `pnpm build:game pong --mode=electron`
busca en `game-mods/pong/*/` (cuando Pong sea mod-compatible).

### Variantes

```bash
# Build para web (sin Electron):
pnpm build:game snake-classic

# Build para iOS (Capacitor). Mod-free OBLIGATORIO para App Store —
# se omiten todos los mods automáticamente, el alias swap del
# quasar.config.js redirige @modules/moddable/* y @modules/mod-runtime
# a stubs no-op:
pnpm build:game snake-classic --mode=capacitor --target=ios

# Build standalone Steam wrapper (Classics Collection):
pnpm build:collection --mode=electron
# (incluye TODOS los mods de TODOS los gameIds presentes en el wrapper)
```

---

## 5. Firma criptográfica

### Política

- **Dev / build regular**: NO se firma. El manifest queda con
  `signed: false` y `sig: null`. El runtime acepta estos mods sólo
  cuando `process.env.NODE_ENV !== 'production'`.
- **`build:release`** (i.e. `--release` o `--mode=electron` o
  `NODE_ENV=production`): se firma OBLIGATORIAMENTE. Si la env
  `GAMEFW_MODS_SIGN_KEY` no está presente, el build aborta.

### Detalles técnicos

Algoritmo: **Ed25519**. La clave privada vive en:
- Local: variable de entorno `GAMEFW_MODS_SIGN_KEY` (base64 PKCS#8).
- CI: GitHub Actions secret del mismo nombre.

El payload firmado es el JSON canónico del manifest sin el campo
`signature`, con keys ordenadas alfabéticamente recursivamente +
`metadata.bundleHash = sha256(dist/mod.js + locales/ + assets/)`. El
runtime (`src/modules/mod-runtime/trust/verify-signature.ts`)
verifica esto en cada carga.

### Rotación de clave

`scripts/mods/sign-bundled-mods.mjs --rotate-key <newKeyId>` genera
nueva pareja, firma con la NUEVA, archiva la vieja en
`scripts/mods/trust-keys/archive/`. El runtime acepta el set completo
de claves activas + las archivadas en una ventana de gracia
(definida en `@modules/mod-runtime/trust/keys.ts`).

---

## 6. Estado de implementación (2026-05-24)

| Componente | Estado | Notas |
|---|---|---|
| Subrepo `game-mods/` (git, submódulo en parent) | ✅ Activo | Remote: `leteoworks/my-game-fw-mods` (privado). |
| Familia `@modules/moddable/*` (13 submódulos) | ✅ Completa | Sprints 1-5 mergeados (`91285015`). |
| Primer mod `studio.gameplay-tuner` v0.1.0 | ✅ Commiteado | En `game-mods/snake-classic/`. |
| Snake `tunables.ts` + `moddable-config.ts` | ✅ Cableado | 14 tests verdes. |
| Alias webpack `@game-mods/*` | ✅ Operativo | En `quasar.config.js`, `tsconfig.json`, `jest.config.cjs`. Commit `bcda79f7`. |
| `bundled-loader.ts` consume `bundled-mods-sources.generated.ts` | ✅ Refactorizado | Imports `?raw` estáticos generados por el script. Commit `bcda79f7`. |
| `scripts/mods/build-game-mods.mjs` | ✅ Operativo | Auto-discover + sha256 + manifest autogen + firma condicional. Commit `bcda79f7`. |
| `scripts/mods/dev-mod.mjs` (+ `pnpm dev:mod`) | ✅ Operativo | Concurrently esbuild watch + Quasar dev. Commit `bcda79f7`. |
| Migración de `studio.fun-config` a `game-mods/` | ✅ Migrado | Carpeta legacy eliminada del parent; contenido en subrepo SHA `6e63cab`. |
| Hook `build:game` → `build-game-mods.mjs` | ✅ Operativo | Pre-build hook automático en `scripts/game-standalone.mjs`. |
| Policy.ts delega en `moddableGame.policy` | ✅ Migrado | `surfaces.gameSpecific.tunables` añadido + host fns auto-registradas en `setupSnakeModRuntime`. |
| Codemod gameplay → `tunable.get()` (3 tunables MVP) | ✅ Aplicado | `maxLives`, `initialSpeedTickMs`, `pointsPerFood` consumen `.get()` en sus call-sites. |
| Soporte i18nValidator integrado al CI | ✅ Operativo | `scripts/mods/validate-i18n.ts` + `pnpm lint:mods-i18n`. Hook automático en `scripts/game-standalone.mjs` tras `build-game-mods.mjs`. Falla con exit 1 si una `i18nKey` declarada no existe o está vacía en `en`/`es`. |

El workflow funciona end-to-end. **Familia moddable + subrepo
`game-mods/` + dev/build pipeline al 100 %.** Iterando un mod desde
`game-mods/<gameId>/<modId>/` con `pnpm dev:mod <gameId> <modId>` se
recarga automáticamente en el navegador (~1-2 s de latencia tras edit).

---

## 7. Migración del mod legacy `studio.fun-config` (completada 2026-05-24)

> Ya hecha en commit `bcda79f7`. Esta sección queda como histórico /
> recipe para la próxima migración análoga.

Hasta antes del commit, `studio.fun-config` vivía en
`src/games/snake-classic/mods/bundled/studio.fun-config/` (dentro del
repo padre). Para alinearlo con el patrón nuevo:

1. **Copiar** la carpeta a `game-mods/snake-classic/studio.fun-config/`.
2. Verificar que `mod.json`, `src/`, `dist/`, `locales/` viajan
   intactos.
3. **Borrar** la carpeta original del repo padre.
4. Actualizar `bundled-mods-manifest.json` (autogenerado tras el
   refactor) — debería listar `studio.fun-config` Y
   `studio.gameplay-tuner`.
5. Commit en el subrepo + bump del SHA en el parent.

Tras esto, `src/games/snake-classic/mods/bundled/` queda vacío (o se
borra entero, dependiendo de si `bundled-mods-manifest.json` se mueve
a `game-mods/snake-classic/` también).

---

## 8. Troubleshooting

### "El cambio en `src/index.ts` no se ve en el navegador"

1. Verifica que el `esbuild --watch` está corriendo
   (`ps aux | grep esbuild`).
2. Mira `game-mods/<gameId>/<modId>/dist/mod.js` — el mtime debería
   actualizarse al guardar.
3. Si el HMR no dispara, mira la consola de Quasar — a veces necesita
   un hard reload (Cmd-Shift-R) cuando cambia la estructura del mod
   (e.g. añades una subscripción a evento nueva).

### "`pnpm build:game` falla con `GAMEFW_MODS_SIGN_KEY missing`"

Si NO querías hacer release pero quieres un build firmado, exporta
la clave temporalmente:

```bash
export GAMEFW_MODS_SIGN_KEY="$(cat ~/.leteoworks-keys/mod-sign-2026-01.b64)"
pnpm build:game snake-classic --mode=electron
```

Si querías un build sin firma (dev local de Electron):

```bash
pnpm build:game snake-classic --mode=electron --no-sign-mods
# o
GAMEFW_MODS_SKIP_SIGN=1 pnpm build:game snake-classic --mode=electron
```

### "El mod aparece en el manifest pero no se carga"

1. Verifica que `mod.json` declara `target.gameId` = ID del juego
   correcto y `target.gameVersion` matchea el rango compatible.
2. Verifica que `target.engine.preferred` está en la lista de
   `engines` declarados en el `policy.ts` del juego.
3. Mira `host.log` y la consola de devtools — el runtime loguea
   rechazos con razón (`MOD_REJECTED_*`).

### "El glob no descubre mi mod nuevo"

`import.meta.glob` en webpack es lazy en HMR. Tras crear una carpeta
NUEVA de mod, suele requerir restart del Quasar dev (Ctrl-C +
`pnpm dev:game ...`). Edits dentro de carpetas existentes sí refrescan
en caliente.

### "Conflicto de submódulo: SHA del parent apunta a commit inexistente"

Push del subrepo se hace ANTES que el commit del parent. Si saltaste
el push:

```bash
cd game-mods && git push && cd ..
# Ahora el SHA referenciado en el parent existe en el remote.
```

---

## 9. FAQ

**¿Por qué dos repos (parent + subrepo `game-mods/`)?**
Para que los mods evolucionen a ritmo distinto del framework y del
juego. Bump del juego ≠ bump del mod ≠ bump del framework. Repos
separados = SemVer independientes + historial limpio.

**¿Y si quiero ver el log de commits de los mods en GitHub junto al juego?**
Submódulos hacen exactamente eso: el parent referencia el SHA del
subrepo y GitHub te enseña el delta del submódulo en cada commit del
parent.

**¿Puedo desarrollar un mod en un fork del subrepo?**
Sí — cualquier persona puede clonar `leteoworks/my-game-fw-mods`,
crear su mod en `<gameId>/<vendor>.<id>/`, y mandar PR. Los mods de
contribuyentes externos pasan firma de "workshopVerified" (no de
`studioSigned`).

**¿Y mods de terceros (Workshop)?**
NO viven en `game-mods/`. Viven en Steam Workshop o son sideload.
`game-mods/` es exclusivo del estudio. La distinción es importante
para trust tier:
- `game-mods/` → siempre `studioSigned`.
- Workshop → `workshopVerified` o `unsigned` según política.

**¿Tengo que correr `pnpm install` en cada mod?**
La primera vez sí (esbuild como devDep). El script `dev:mod` lo hace
automáticamente, idempotente. Después, sólo si actualizas el
`package.json` del mod.

**¿Cómo testeo el mod unitariamente?**
Cada mod puede tener su propio `__tests__/` y `pnpm test` dentro del
mod. Vitest o jest, lo que prefieras. La familia `@modules/moddable/*`
da los tipos del HostBridge para mockear desde tests.

---

## Cross-links

- [game-mods/README.md](../../../game-mods/README.md) — el subrepo
- [docs/mods/README.md](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/README.md) — índice maestro del sistema de mods
- [docs/games/snake-classic/mods/gameplay-tuner-roadmap.md](../../games/snake-classic/mods/gameplay-tuner-roadmap.md)
  — roadmap del mod canónico
- [src/modules/moddable/README.md](../../../src/modules/moddable/README.md)
  — familia declarativa que los mods consumen
- [docs/mods/architecture/build-modes.md](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/architecture/build-modes.md)
  — modos `dev` / `bundled-only` / `mods-enabled`
- [docs/mods/security/signing-and-trust.md](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/security/signing-and-trust.md)
  — detalles de firma Ed25519
- [docs/mods/mod-development/getting-started.md](getting-started.md) —
  introducción genérica al sistema de mods (mods de terceros incluidos)
- [docs/mods/mod-development/manifest-format.md](manifest-format.md) —
  schema completo de `mod.json`
- [docs/mods/mod-development/publishing.md](publishing.md) — Workshop
  upload, signing scripts, distribución
