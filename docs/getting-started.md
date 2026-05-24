<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm sync:mod-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# Getting started — "hello mod" en 10 minutos

Tu primer mod, end-to-end. Asumimos Snake Classic como target.

---

## 1 — Scaffold del proyecto

**Opción A — usar el scaffold del framework (recomendado)**:

```bash
# Desde un clone del framework:
cp -R scaffolds/mod-template-snake-classic ~/projects/my-first-mod
cd ~/projects/my-first-mod
pnpm install
# Edita mod.json (id, metadata) + src/index.ts y arranca: pnpm watch
```

Ver [`scaffolds/mod-template-snake-classic/README.md`](../../../scaffolds/mod-template-snake-classic/README.md)
para detalles.

**Opción B — desde cero**:

```bash
mkdir my-first-mod
cd my-first-mod
npm init -y
npm install -D esbuild typescript
```

Estructura mínima:

```
my-first-mod/
├── mod.json
├── src/
│   ├── index.ts
│   └── globals.d.ts      # declara `host` como global ambient
├── build.mjs             # pipeline esbuild
├── tsconfig.json
├── dist/                 # generado por esbuild
└── package.json
```

Antes de empaquetar o publicar, lintea con:

```bash
node /ruta/al/framework/scripts/mods/validate-mod.mjs .
```

(o `pnpm mods:validate <path>` desde el repo del framework). El
validator chequea manifest + App Store §3.3.2 compliance sin
necesitar el juego levantado.

---

## 2 — `mod.json`

```json
{
  "manifestVersion": 1,
  "id": "tunick.hello-mod",
  "version": "0.1.0",
  "target": { "gameId": "snake-classic", "gameVersion": "^2.0.0" },
  "engine": { "preferred": "quickjs-declarative-ui", "fallbacks": ["isolated-vm"] },
  "requires": { "hostApi": "^1.0.0" },
  "entry": "dist/index.js",
  "permissions": [
    {
      "type": "events",
      "subscribe": ["GAME_OVER"],
      "rationale": "Saluda al jugador cuando termina la partida"
    },
    {
      "type": "settings-ui",
      "rationale": "Aporta un tab con un toggle para activar el saludo"
    }
  ],
  "metadata": {
    "name": "Hello Mod",
    "description": "Mi primer mod — un saludo al terminar la partida.",
    "author": "Tu Nombre",
    "license": "MIT"
  }
}
```

Reglas a recordar:
- `id` debe ser único globalmente. Convención: `<tu-handle>.<mod-name>`.
- `version` es SemVer estricto.
- Cada permiso necesita `rationale` no trivial (el jugador lo ve).

---

## 3 — `src/index.js`

```js
// Mod simple — un toggle en settings + un saludo al terminar partida

host.registerSettingsTab({
  id: 'hello-mod',
  title: 'Hello Mod',
  icon: 'mood',
  sections: [{
    kind: 'group',
    title: 'Saludo',
    fields: [{
      kind: 'toggle',
      label: 'Activar saludo al terminar la partida',
      binding: 'greetOnGameOver',
    }],
  }],
})

host.subscribeEvent('GAME_OVER', async ({ finalScore }) => {
  const enabled = await host.storage.get('greetOnGameOver') ?? true
  if (!enabled) return

  host.log.info(`Has terminado con ${finalScore} puntos. ¡Buena partida!`)
  host.dispatch('MOD_NOTIFICATION', {
    text: `¡Buena partida! Puntuación: ${finalScore}`,
  })
})

host.registerHook('onActivate', () => {
  host.log.info('Hello Mod activado.')
})
```

---

## 4 — Build

```json
// package.json
{
  "scripts": {
    "build": "esbuild src/index.js --bundle --outfile=dist/index.js --format=iife --target=es2020"
  }
}
```

```bash
npm run build
```

Produce `dist/index.js` listo para cargar.

---

## 5 — Sideload en el juego

Localiza el directorio `userData` del juego (depende de plataforma):

- macOS: `~/Library/Application Support/snake-classic/mods/`
- Windows: `%APPDATA%/snake-classic/mods/`
- Linux: `~/.config/snake-classic/mods/`

Copia tu proyecto:

```bash
cp -r ~/my-first-mod ~/Library/Application Support/snake-classic/mods/tunick.hello-mod/
```

Estructura final esperada:

```
~/.../snake-classic/mods/tunick.hello-mod/
├── mod.json
└── dist/index.js
```

---

## 6 — Abrir el juego

1. Arranca Snake Classic.
2. Ve a Settings → Mods → Comunidad.
3. Tu mod aparece "Detectado (sideload)".
4. Click "Activar".
5. Acepta el prompt de permisos.
6. Pasa a "Activo".
7. Tu tab "Hello Mod" aparece en Settings.
8. Juega una partida. Al terminar verás el log y la notificación.

---

## 7 — Iterar

Cambios en `src/index.js`:
1. `npm run build`
2. Restart del juego (los mods se cargan al boot).

Para hot-reload durante desarrollo, ver
[../implementation/enabling-mods.md](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/implementation/enabling-mods.md)
sobre `dev mode` (no es estándar; depende del juego).

---

## Resumen

- 6 pasos: scaffold → manifest → código → build → sideload → activate.
- Tiempo total: 10 minutos.
- Lo que has aprendido: `host.registerSettingsTab` (UI declarativa),
  `host.subscribeEvent`, `host.storage.get/set`, `host.dispatch`,
  `host.log`, `host.registerHook`.
- Siguiente: leer [api-reference.md](api-reference.md) para el catálogo
  completo, y [manifest-format.md](manifest-format.md) para entender
  todos los permisos.
