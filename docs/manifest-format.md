<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm sync:mod-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# Formato de `mod.json` — referencia para modders

Spec completa de los campos del manifest desde la perspectiva del
modder. Para la versión técnica que el framework consume, ver
[../architecture/mod-manifest.md](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/architecture/mod-manifest.md).

---

## Esqueleto completo

```json
{
  "manifestVersion": 1,
  "id": "yourhandle.modname",
  "version": "1.0.0",
  "target": { "gameId": "snake-classic", "gameVersion": "^2.0.0" },
  "engine": { "preferred": "quickjs-declarative-ui", "fallbacks": ["isolated-vm"] },
  "requires": { "hostApi": "^1.0.0", "dlcs": [] },
  "entry": "dist/mod.js",
  "permissions": [],
  "analytics": { "events": [] },
  "metadata": {
    "name": "...",
    "description": "...",
    "author": "...",
    "homepage": "...",
    "license": "MIT",
    "tags": [],
    "icon": "icon.png"
  }
}
```

---

## Campos uno a uno

### `manifestVersion: 1`

Versión del schema. Hoy solo `1`. Si el framework introduce una v2, los
manifests v1 seguirán siendo aceptados (compat de N-2 versiones).

### `id`

Convención `<handle>.<modname>`. Lowercase + guiones. Inmutable —
cambiarlo equivale a publicar un mod distinto.

Buenos ejemplos: `acme.power-explorer`, `studio.dark-mode`,
`juancho.snake-roguelike`.

### `version`

SemVer (X.Y.Z). Bumps:
- **patch**: bug fixes. Settings del jugador se mantienen.
- **minor**: features no breaking. Settings se mantienen.
- **major**: breaking change. **Settings se resetean** automáticamente
  al actualizar. Avísalo en tu changelog.

Una vez publicada una versión, **NO** la sobrescribas con contenido
distinto. Siempre publica versión nueva.

### `target.gameId`

ID del juego al que apunta. Lo encuentras en
`docs/games/<id>/README.md` del repo del estudio. **No** uses el
nombre comercial ni el AppID de Steam — usa el `gameId` lógico.

### `target.gameVersion`

Rango SemVer. Convención: `^X.Y.Z` (compatible con cualquier minor/patch
desde X.Y.Z). Mantén actualizado tras testear con versiones nuevas del
juego.

### `engine.preferred` y `engine.fallbacks`

Motor que tu mod necesita. Lo elige según lo que hace tu mod:

- Si tu mod aporta tabs de settings (formularios) → `quickjs-declarative-ui`.
- Si tu mod es lógica pura (eventos, transformaciones) →
  `isolated-vm` (Electron) o `quickjs` (cross-platform).
- Si tu mod aporta UI HTML rica → `iframe-sandbox`.
- Si tu mod tiene visualización gráfica → `web-worker-offscreen-canvas`.

Lista de motores: [../engines/](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/engines/).

`fallbacks` permite que tu mod funcione si el motor preferido no está
disponible. Pon variantes razonables; lista vacía es válida pero
restrictivo.

### `requires.hostApi`

Rango SemVer de la host API del juego. Consulta el
`host-api-changelog` del juego en `docs/games/<id>/`. Convención:
`^X.Y.Z` con la mínima versión que tu mod necesita.

### `requires.dlcs`

Lista de `dlcId`-s que el jugador debe tener owned. Si tu mod
modifica contenido aportado por un DLC, decláralo. Mensajes al jugador
claros si no tiene el DLC.

### `entry`

Path al archivo JS que el motor carga. Convención: `dist/mod.js`.
Debe ser un bundle pre-compilado (el framework no hace module
resolution). Tamaño máx: 2 MiB.

### `permissions`

Array de objetos, cada uno con `type`, fields específicos y
`rationale` (string corta que el jugador ve).

Categorías canónicas:

```js
{ type: 'events', subscribe: ['SCORE_*'], dispatch: ['MOD_*'], rationale: '...' }
{ type: 'state', read: ['game.score'], write: [], rationale: '...' }
{ type: 'powerups', actions: ['toggle','tune','register'], rationale: '...' }
{ type: 'entities', categories: ['enemies'], rationale: '...' }
{ type: 'settings-ui', maxTabs: 1, rationale: '...' }
{ type: 'assets', kinds: ['images','audio'], rationale: '...' }
{ type: 'i18n', namespaces: ['my-mod'], rationale: '...' }
{ type: 'storage', quotaKb: 128, rationale: '...' }
{ type: 'network', hosts: ['api.modauthor.com'], methods: ['GET'], rationale: '...' }
{ type: 'backend-client', clientId: 'leaderboard.snake', methods: ['list'], rationale: '...' }
{ type: 'entitlements', read: ['endless-plus'], rationale: '...' }
{ type: 'rng', rationale: '...' }
{ type: 'game-specific', surface: 'speedCurve', actions: ['setBase'], rationale: '...' }
```

**Rationale matters**: el jugador la lee antes de aceptar. Un rationale
útil ("Lee tu puntuación final para añadirla al recap del mod") gana
instalaciones; uno trivial ("for fun") los pierde.

### `analytics.events` (opcional)

Catálogo de eventos custom que tu mod puede emitir. Cada uno con
nombre, descripción y schema (tipos por prop):

```json
{
  "analytics": {
    "events": [
      {
        "name": "preset_applied",
        "description": "Jugador aplicó un preset de configuración",
        "schema": { "presetName": "string" }
      }
    ]
  }
}
```

Máximo 20 eventos por mod (configurable por el juego).

Los eventos `mod.framework.*` (engagement, fault, perf, etc.) los
emite el runtime automáticamente — tu mod no tiene que declararlos.

### `metadata`

Información visible al jugador en la UI:

```json
{
  "name": "Tu Mod",
  "description": "Qué hace tu mod en una o dos frases (max 500 chars).",
  "author": "Tu nombre o handle",
  "homepage": "https://your-site.com/your-mod",
  "donateUrl": "https://ko-fi.com/your-handle",
  "license": "MIT",
  "tags": ["customization", "qol", "fun"],
  "icon": "icon.png",
  "screenshots": ["s1.png", "s2.png"],
  "i18n": {
    "en": { "name": "...", "description": "..." },
    "es": { "name": "...", "description": "..." }
  }
}
```

`description` se sanitiza (solo plain text). `tags` máx 5.
`screenshots` máx 5.

### `donateUrl` — apoyo económico al autor (opcional)

Si declaras `donateUrl`, el juego muestra un botón **"Apoyar al
autor"** en `Settings → Mods → <tu mod>` que abre la URL en el
navegador externo del jugador.

- **Solo HTTPS**: el schema Zod rechaza `http://` y custom schemes
  por seguridad (anti-phishing). El runtime valida también en
  tiempo de apertura.
- **Providers comunes**: Patreon, Ko-fi, GitHub Sponsors,
  BuyMeACoffee, Liberapay, OpenCollective. El estudio no endorse-a
  ninguno — tú eliges.
- **Mecanismo recomendado**: Steam deprecó paid mods directos en
  2015. Donaciones externas son hoy el patrón canónico para que la
  comunidad apoye económicamente a sus modders favoritos sin
  overhead legal del estudio.
- **NO uses esto para crowdfunding o ventas**: el botón se llama
  "Apoyar al autor" y los jugadores entienden eso como donación
  voluntaria. Si quieres vender contenido, el camino es el sistema
  DLC del estudio (curado, opt-in, ver `architecture/dlc-interop.md`).
- **Localización**: el label del botón se traduce automáticamente a
  los locales del juego. El modder no tiene que aportar nada extra.

### `signature` (opcional)

Firma opcional. Si tu mod va a Steam Workshop, Steam le añade su flow
de verificación; si quieres firmar adicionalmente (recomendado para
mods con permisos elevados), ver
[publishing.md](publishing.md).

---

## Errores comunes al validar

| Error | Causa |
|---|---|
| "id no matches regex" | Mayúsculas, caracteres especiales, o falta el `.` separador |
| "version is not SemVer" | Usaste algo como `1.0` o `v1.0.0` |
| "rationale missing for permission" | Cada permiso necesita `rationale` no vacío |
| "engine.preferred not in catalog" | Typo o motor inexistente |
| "entry file > 2MiB" | Bundle demasiado grande; revisa qué metiste |
| "manifestVersion unsupported" | Usa `1` mientras no se anuncie v2 |

---

## Resumen

- `mod.json` declara identidad, target, motor, permisos (con
  rationale), metadatos.
- `id` y `version` inmutables / monotónicos.
- Cada permiso con `rationale` no trivial — es lo primero que el
  jugador lee.
- Eventos custom de analytics declarados en `analytics.events`.
- Metadata + screenshots = lo que vende tu mod en Workshop.
