<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm sync:mod-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# API Reference — `host.*`

Catálogo de funciones disponibles desde el código de tu mod. Las
funciones aparecen solo si los permisos correspondientes están
declarados en tu manifest **y** la policy del juego los expone.

> Convención: si una función devuelve `{ ok, value?, error? }`, **nunca
> lanza** ante fallos previsibles. Excepciones del lenguaje (TypeError,
> etc.) sí se propagan dentro del sandbox.

---

## `host.api`

```js
host.api.version      // string SemVer de la host API del juego
host.api.gameId       // string, gameId del juego activo
host.api.modId        // string, tu mod id
host.api.modVersion   // string SemVer de tu mod
host.api.engineId     // string, motor en el que estás corriendo
```

Lectura informativa. Útil para feature detection según versión.

---

## Eventos

### `host.subscribeEvent(name, cb): unsubscribe`

```js
const unsub = host.subscribeEvent('SCORE_CHANGED', (payload) => {
  console.log('score =', payload.score)
})

// para desuscribir:
unsub()
```

Necesita permiso `{ type: 'events', subscribe: ['SCORE_CHANGED'] }`.

### `host.dispatch(name, payload)`

```js
host.dispatch('MOD_NOTIFICATION', { text: '¡Hola!' })
```

Necesita permiso `{ type: 'events', dispatch: ['MOD_*'] }`. Convención:
prefijar tus eventos con `MOD_<tu-modid-sin-puntos>_`.

---

## Estado

### `host.state.read(path)`

```js
const score = await host.state.read('game.score')
```

Devuelve copia read-only. Necesita permiso
`{ type: 'state', read: ['game.score'] }`.

### `host.state.write(path, value)`

```js
const r = await host.state.write('game.someFlag', true)
// r = { ok: true } o { ok: false, error: { code: 'PATH_NOT_WRITABLE' } }
```

Necesita permiso `{ type: 'state', write: [...] }`. Raro — la mayoría
de juegos no permiten que mods escriban estado directamente.

---

## Storage del mod

### `host.storage.get(key)`

```js
const config = await host.storage.get('my-config') // valor o undefined
```

### `host.storage.set(key, value)`

```js
const r = await host.storage.set('my-config', { foo: 1 })
// r = { ok: true } o { ok: false, error: { code: 'QUOTA_EXCEEDED' } }
```

### `host.storage.delete(key)` / `host.storage.keys()`

Cuota declarada en el manifest: `{ type: 'storage', quotaKb: 128 }`.
Tu storage es aislado — ningún otro mod ni el juego pueden leerlo.

### Concurrencia: last-write-wins (FIX-23.3, audit J-F3)

Si tu mod tiene un `settings-ui` con bindings reactivos (slider,
toggle, etc.) Y un hook (`onEvent:GAME_STARTED`, etc.) que también
escribe en storage, los dos paths pueden competir sobre la misma key.
Reglas que debes asumir:

- El backing storage (`syncStorage` del framework) es **síncrono**.
  No hay race tipo "two writes at the same nanosecond" — el JS
  event loop ordena ambos efectos.
- El que ejecuta más tarde gana. La UI (`setBinding`) está
  bridge-ada via promise → su efecto cae al microtask queue. El hook
  del mod (`host.storage.set`) idem.
- Si el jugador mueve el slider mientras `GAME_STARTED` dispara, el
  orden depende del event loop: typically la UI gana (el evento del
  jugador llega primero) pero NO está garantizado.

**Anti-patrón**: escribir la misma key desde dos paths sin un eje de
coordinación. Patrón canónico:

```js
// Opción A — el hook del mod LEE para aplicar pero NO escribe.
host.subscribeEvent('GAME_STARTED', async () => {
  const cfg = await host.storage.get('speed-curve')
  applyToGame(cfg)
})
// El binding UI (`setBinding('speed-curve', ...)`) es el ÚNICO writer.

// Opción B — particiona el key-space. La UI escribe 'config.*',
// el hook escribe 'runtime-state.*'. Cero overlap.
```

Si necesitas que el hook recompute basado en el binding actual,
léelo *fresh* en cada invocación (no caches).

---

## Settings UI declarativa

### `host.registerSettingsTab(descriptor)`

Aporta una tab a la página de settings. Solo funciona en motores con
`ownUiCapable: true` (e.g., `quickjs-declarative-ui`).

```js
host.registerSettingsTab({
  id: 'my-tab',
  title: 'Mi mod',
  icon: 'tune',
  sections: [...],   // ver catálogo completo
})
```

**Catálogo de componentes UI disponible**:
- Sistema framework-level + per-game:
  [../architecture/mod-ui-component-system.md](https://github.com/leteo/my-game-fw/blob/main/docs/mods/architecture/mod-ui-component-system.md).
- Documentación visual interactiva por juego: **submódulo git**
  `mod-ui-catalog-<gameId>` con Storybook. URL del estudio o clone
  local con `pnpm storybook`. Incluye stories, snippets para copiar,
  ejemplos compuestos.
- Vocabulario básico embedded del motor:
  [../engines/quickjs-declarative-ui.md](https://github.com/leteo/my-game-fw/blob/main/docs/mods/engines/quickjs-declarative-ui.md).

Necesita permiso `{ type: 'settings-ui' }`.

### `host.renderPage(descriptor)` — pantallas completas

Para mods que aporten pantallas más allá de tabs de settings (galerías,
dashboards, viewers, configuradores avanzados), el mod usa el mismo
catálogo de UI declarativa. La pantalla se monta en la navegación del
juego cuando el mod la solicita.

```js
host.renderPage({
  id: 'my-mod.dashboard',
  title: 'Dashboard del mod',
  icon: 'dashboard',
  sections: [
    { kind: 'grid', cols: 2, gap: 'md', children: [
      { kind: 'stat', label: 'Score', value: '<state.score>' },
      { kind: 'chart-line', data: '<binding>history' },
    ]},
  ],
})
```

Detalles en
[../architecture/mod-ui-component-system.md](https://github.com/leteo/my-game-fw/blob/main/docs/mods/architecture/mod-ui-component-system.md).

---

## Hooks del mod

### `host.registerHook(name, fn)`

```js
host.registerHook('onActivate', () => {
  console.log('Mod arrancado')
})

host.registerHook('onDeactivate', () => {
  console.log('Mod apagado')
})
```

Hooks canónicos:
- `onActivate`: llamado tras carga, antes de empezar a recibir
  eventos.
- `onDeactivate`: antes de dispose.

---

## Power-ups (si tu juego los tiene)

Necesita permiso `{ type: 'powerups', actions: [...] }`.

### `host.callHostFn('togglePowerUp', { powerupId, enabled })`

```js
host.callHostFn('togglePowerUp', { powerupId: 'mega-fruit', enabled: false })
```

### `host.callHostFn('setPowerUpSpawnChance', { powerupId, chance })`

Modifica `spawnChance` (0..1).

### Power-ups específicos del juego

Cada juego publica su API en `docs/games/<id>/host-api-changelog.md`.

---

## i18n

### `host.t(key, params?)`

```js
const text = host.t('mod.my-mod.title')
const greet = host.t('mod.my-mod.greet', { name: 'Player' })
```

Tus strings viven en namespace `mod.<modId>.*`. Necesitas permiso
`{ type: 'i18n', namespaces: ['my-mod-*'] }` y registrar los strings:

```js
host.i18n.register('en', { 'mod.my-mod.title': 'My Mod', /* ... */ })
host.i18n.register('es', { 'mod.my-mod.title': 'Mi Mod', /* ... */ })
```

---

## Assets

Necesita permiso `{ type: 'assets', kinds: [...] }`.

```js
host.registerAsset({ kind: 'image', id: 'my-icon', source: 'icon.png' })
// uso: 'mod://your-mod-id/my-icon'
```

---

## HTTP (si tu juego lo permite)

Necesita permiso `{ type: 'network', hosts, methods }`.

```js
const r = await host.http.request({
  method: 'GET',
  url: 'https://api.modauthor.com/v1/config',
  expect: 'json',
})
if (r.ok && r.status === 200) {
  console.log(r.body)
}
```

Detalle:
[../architecture/network-and-backend-access.md](https://github.com/leteo/my-game-fw/blob/main/docs/mods/architecture/network-and-backend-access.md).

---

## Backend clients del juego

Si el juego expone alguno via `surfaces.backendClients`:

```js
const top10 = await host.backend['leaderboard.snake'].list({ limit: 10 })
```

---

## Entitlements (DLCs)

```js
const owned = host.entitlements.getActiveDlcs()
// ['endless-plus'] etc.
```

Read-only. Tu mod **no puede** otorgar DLCs.

---

## RNG (si tu juego lo expone)

```js
const r = host.rng.next()         // [0, 1)
const n = host.rng.int(0, 100)    // [0, 100]
```

Seed determinista por sesión — útil para replays.

---

## Logging

```js
host.log.debug('mensaje')
host.log.info('mensaje')
host.log.warn('mensaje')
host.log.error('mensaje', { extra: '...' })
```

Visible en la consola del juego (en dev) y en el panel "Logs" del
mod (en settings).

---

## Analytics custom

Necesita declarar eventos en `manifest.analytics.events`:

```js
host.analytics.track('preset_applied', { presetName: 'hardcore' })
```

Los eventos `mod.framework.*` los emite el runtime sin que hagas nada.

---

## Lo que **no** tienes acceso

- `window`, `document`, `process`, `require`, `import`
- `fetch`, `XMLHttpRequest`, `WebSocket` directos
- `localStorage`, `sessionStorage`, `IndexedDB`
- DOM, eventos del navegador
- File system

Todo lo que no esté listado en este doc no existe para tu mod.

---

## Resumen

- API plana bajo `host.*`.
- Cada función requiere su permiso correspondiente.
- Errores estructurados (no throws) para fallos previsibles.
- Documentación específica del juego en
  `docs/games/<id>/host-api-changelog.md` — siempre consulta esa para
  features game-specific.
