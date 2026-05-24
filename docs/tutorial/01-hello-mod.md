<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm mods:sync-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# Lección 1 — Tu primer mod en 10 minutos

Objetivo: tener un mod activo en Snake Classic que añada un tab a
`Settings → Mods` y muestre una notificación al terminar la
partida. Cero conocimiento previo del framework.

> Si solo quieres ver código real de producción, mira el código
> abierto de [`studio.gameplay-tuner`](https://github.com/leteoworks/mod-template-snake-classic)
> después de esta lección.

---

## El ciclo

```
   ┌─────────┐    pnpm build    ┌──────────┐    sideload    ┌──────┐
   │  src/   │ ───────────────▶ │ dist/    │ ─────────────▶ │ juego │
   └─────────┘                  └──────────┘                └──────┘
        ▲                                                       │
        └───────────────── editar + iterar ─────────────────────┘
```

Cada lección de este tutorial añade una pieza nueva al ciclo.

---

## 1 — Clonar el template

```bash
npx degit leteoworks/mod-portal-snake-classic/examples/hello-mod my-first-mod
cd my-first-mod
pnpm install
```

El template trae `mod.json`, `src/index.ts`, `package.json` y
`build.mjs` listos. Solo necesitas editarlos.

---

## 2 — Personalizar `mod.json`

Cambia el `id` y `metadata.name` (el resto déjalo igual por ahora):

```json
{
  "manifestVersion": 1,
  "id": "tuhandle.hello-mod",
  "version": "0.1.0",
  "target": { "gameId": "snake-classic", "gameVersion": "^1.0.0" },
  "engine": { "preferred": "quickjs-declarative-ui", "fallbacks": ["isolated-vm"] },
  "requires": { "hostApi": "^1.0.0" },
  "entry": "dist/mod.js",
  "permissions": [
    {
      "type": "settings-ui",
      "rationale": "Aporta un tab con un toggle de saludo."
    },
    {
      "type": "events",
      "subscribe": ["GAME_OVER"],
      "rationale": "Saluda al jugador cuando termina la partida."
    },
    {
      "type": "storage",
      "quotaKb": 16,
      "rationale": "Guarda si el saludo está activado."
    }
  ],
  "metadata": {
    "name": "Hello Mod",
    "description": "Mi primer mod.",
    "author": "Tu Nombre",
    "license": "MIT"
  }
}
```

Reglas clave:
- **`id`** debe ser único globalmente. Convención `<handle>.<short-name>`.
- **Cada permiso necesita `rationale`** — el jugador lo lee en el prompt
  de permisos. No trivial.

---

## 3 — Escribir el código

`src/index.ts`:

```ts
// Tab de settings con un toggle.
host.registerSettingsTab?.({
  id: 'hello-mod',
  title: 'Hello Mod',
  icon: 'mood',
  sections: [{
    kind: 'card',
    title: 'Saludo',
    children: [{
      kind: 'toggle',
      label: 'Saludar al terminar la partida',
      binding: 'greetOnGameOver',
    }],
  }],
});

// Reaccionar al evento del juego.
host.subscribeEvent('GAME_OVER', async (payload) => {
  const stored = await host.storage?.get('greetOnGameOver');
  const enabled = stored?.ok ? stored.value : true;
  if (!enabled) return;

  const score = (payload as { finalScore?: number })?.finalScore ?? 0;
  host.log.info(`[hello-mod] Partida terminada con ${score} puntos.`);
});

host.log.info('[hello-mod] cargado v0.1.0');
```

Tres APIs usadas:
- **`host.registerSettingsTab(descriptor)`** — UI declarativa. El
  binding `'greetOnGameOver'` se conecta automáticamente al
  `host.storage` del mod: el toggle persiste solo.
- **`host.subscribeEvent(name, handler)`** — reaccionar a eventos
  del juego. Aquí `GAME_OVER` con su payload.
- **`host.storage.get(key)`** — leer del storage del mod (cuotaKb 16
  declarada en el manifest).

---

## 4 — Build

```bash
pnpm build
```

Genera `dist/mod.js` (~5 KB minificado, IIFE ES2020 sin deps).

---

## 5 — Sideload

Copia el proyecto al userData del juego:

```bash
# macOS:
cp -r . ~/Library/Application\ Support/snake-classic/mods/tuhandle.hello-mod/
# Windows: %APPDATA%/snake-classic/mods/<modId>/
# Linux:   ~/.config/snake-classic/mods/<modId>/
```

> Solo necesitas `mod.json` + `dist/mod.js` (y `locales/` si declaras
> i18n). El resto es local de tu proyecto.

---

## 6 — Activar y probar

1. Abre Snake Classic.
2. Settings → Mods → tu mod aparece como **"Detectado (sideload)"**.
3. Click "Activar". Acepta el prompt de permisos.
4. Tab "Hello Mod" aparece en Settings.
5. Asegúrate de que el toggle está ON.
6. Juega una partida. Al terminar verás el log en consola (DevTools
   abierto en build dev).

---

## Lo que has aprendido

- Estructura de un mod: `mod.json` + `dist/mod.js`.
- Cuatro APIs canónicas: `registerSettingsTab`, `subscribeEvent`,
  `storage.get`, `log`.
- El ciclo edit → build → sideload → reload.
- El concepto **binding**: la UI escribe al storage del mod
  automáticamente.

## Lo que viene

[**Lección 2 — Slider que cambia un valor del juego en tiempo
real**](02-slider-tunable.md). Vas a controlar la velocidad inicial
de Snake con un slider. Aprendes `host.callHostFn` y el patrón
"aplicar config al inicio de cada partida".

## Iteración rápida (opt-in)

Si vas a trabajar dentro del monorepo del estudio como mod
first-party, ver [`dev-workflow.md`](../dev-workflow.md) — hay
HMR vía `pnpm dev:mod` que evita el ciclo manual sideload + reload.
Para mods externos, el ciclo manual de esta lección es lo estándar.
