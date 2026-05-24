<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm mods:sync-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# API Reference — `host.*`

Catalog of functions available from your mod's code. Functions
appear only if the corresponding permissions are declared in your
manifest **and** the game's policy exposes them.

> Convention: if a function returns `{ ok, value?, error? }`, it
> **never throws** on foreseeable failures. Language exceptions
> (TypeError, etc.) do propagate inside the sandbox.

---

## `host.api`

```js
host.api.version      // string, SemVer of the game's host API
host.api.gameId       // string, gameId of the active game
host.api.modId        // string, your mod id
host.api.modVersion   // string, SemVer of your mod
host.api.engineId     // string, engine you're running on
```

Informative read. Useful for feature detection by version.

---

## Events

### `host.subscribeEvent(name, cb): unsubscribe`

```js
const unsub = host.subscribeEvent('SCORE_CHANGED', (payload) => {
  console.log('score =', payload.score)
})

// to unsubscribe:
unsub()
```

Needs permission `{ type: 'events', subscribe: ['SCORE_CHANGED'] }`.

### `host.dispatch(name, payload)`

```js
host.dispatch('MOD_NOTIFICATION', { text: 'Hi!' })
```

Needs permission `{ type: 'events', dispatch: ['MOD_*'] }`.
Convention: prefix your events with `MOD_<your-modid-without-dots>_`.

---

## State

### `host.state.read(path)`

```js
const score = await host.state.read('game.score')
```

Returns a read-only copy. Needs permission
`{ type: 'state', read: ['game.score'] }`.

### `host.state.write(path, value)`

```js
const r = await host.state.write('game.someFlag', true)
// r = { ok: true } or { ok: false, error: { code: 'PATH_NOT_WRITABLE' } }
```

Needs permission `{ type: 'state', write: [...] }`. Rare — most
games don't allow mods to write state directly.

---

## Mod storage

### `host.storage.get(key)`

```js
const config = await host.storage.get('my-config') // value or undefined
```

### `host.storage.set(key, value)`

```js
const r = await host.storage.set('my-config', { foo: 1 })
// r = { ok: true } or { ok: false, error: { code: 'QUOTA_EXCEEDED' } }
```

### `host.storage.delete(key)` / `host.storage.keys()`

Quota declared in the manifest: `{ type: 'storage', quotaKb: 128 }`.
Your storage is isolated — no other mod or the game can read it.

### Concurrency: last-write-wins (FIX-23.3, audit J-F3)

If your mod has a `settings-ui` with reactive bindings (slider,
toggle, etc.) AND a hook (`onEvent:GAME_STARTED`, etc.) that also
writes to storage, the two paths can race on the same key. Rules
to assume:

- The backing storage (`syncStorage` of the framework) is
  **synchronous**. There's no "two writes at the same nanosecond"
  race — the JS event loop orders both effects.
- Whoever runs later wins. The UI (`setBinding`) is bridged via
  promise → its effect lands in the microtask queue. The mod
  hook (`host.storage.set`) ditto.
- If the player moves the slider while `GAME_STARTED` fires, the
  order depends on the event loop: typically the UI wins (the
  player event arrives first) but it's NOT guaranteed.

**Anti-pattern**: writing the same key from two paths without a
coordination axis. Canonical pattern:

```js
// Option A — the mod hook READS to apply but does NOT write.
host.subscribeEvent('GAME_STARTED', async () => {
  const cfg = await host.storage.get('speed-curve')
  applyToGame(cfg)
})
// The UI binding (`setBinding('speed-curve', ...)`) is the ONLY writer.

// Option B — partition the key-space. The UI writes 'config.*',
// the hook writes 'runtime-state.*'. Zero overlap.
```

If you need the hook to recompute based on the current binding,
read it *fresh* each invocation (don't cache).

---

## Declarative settings UI

### `host.registerSettingsTab(descriptor)`

Adds a tab to the settings page. Only works on engines with
`ownUiCapable: true` (e.g., `quickjs-declarative-ui`).

```js
host.registerSettingsTab({
  id: 'my-tab',
  title: 'My mod',
  icon: 'tune',
  sections: [...],   // see full catalog
})
```

**Available UI component catalog**:
- Framework-level + per-game system:
  [../architecture/mod-ui-component-system.md](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/architecture/mod-ui-component-system.md).
- Interactive visual documentation per game: **git submodule**
  `mod-ui-catalog-<gameId>` with Storybook. Studio URL or local
  clone with `pnpm storybook`. Includes stories, copy-paste
  snippets, composite examples.
- Basic engine-embedded vocabulary:
  [../engines/quickjs-declarative-ui.md](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/engines/quickjs-declarative-ui.md).

Needs permission `{ type: 'settings-ui' }`.

### `host.renderPage(descriptor)` — full screens

For mods that add screens beyond settings tabs (galleries,
dashboards, viewers, advanced configurators), the mod uses the
same declarative UI catalog. The screen is mounted in the game's
navigation when the mod requests it.

```js
host.renderPage({
  id: 'my-mod.dashboard',
  title: 'Mod dashboard',
  icon: 'dashboard',
  sections: [
    { kind: 'grid', cols: 2, gap: 'md', children: [
      { kind: 'stat', label: 'Score', value: '<state.score>' },
      { kind: 'chart-line', data: '<binding>history' },
    ]},
  ],
})
```

Details in
[../architecture/mod-ui-component-system.md](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/architecture/mod-ui-component-system.md).

---

## Mod hooks

### `host.registerHook(name, fn)`

```js
host.registerHook('onActivate', () => {
  console.log('Mod started')
})

host.registerHook('onDeactivate', () => {
  console.log('Mod stopped')
})
```

Canonical hooks:
- `onActivate`: called after load, before receiving events.
- `onDeactivate`: before dispose.

---

## Power-ups (if your game has them)

Needs permission `{ type: 'powerups', actions: [...] }`.

### `host.callHostFn('togglePowerUp', { powerupId, enabled })`

```js
host.callHostFn('togglePowerUp', { powerupId: 'mega-fruit', enabled: false })
```

### `host.callHostFn('setPowerUpSpawnChance', { powerupId, chance })`

Modifies `spawnChance` (0..1).

### Game-specific power-ups

Each game publishes its API in `docs/games/<id>/host-api-changelog.md`.

---

## i18n

### `host.t(key, params?)`

```js
const text = host.t('mod.my-mod.title')
const greet = host.t('mod.my-mod.greet', { name: 'Player' })
```

Your strings live in the namespace `mod.<modId>.*`. You need
permission `{ type: 'i18n', namespaces: ['my-mod-*'] }` and to
register the strings:

```js
host.i18n.register('en', { 'mod.my-mod.title': 'My Mod', /* ... */ })
host.i18n.register('es', { 'mod.my-mod.title': 'Mi Mod', /* ... */ })
```

---

## Assets

Needs permission `{ type: 'assets', kinds: [...] }`.

```js
host.registerAsset({ kind: 'image', id: 'my-icon', source: 'icon.png' })
// usage: 'mod://your-mod-id/my-icon'
```

---

## HTTP (if your game allows it)

Needs permission `{ type: 'network', hosts, methods }`.

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

Detail:
[../architecture/network-and-backend-access.md](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/architecture/network-and-backend-access.md).

---

## Game backend clients

If the game exposes any via `surfaces.backendClients`:

```js
const top10 = await host.backend['leaderboard.snake'].list({ limit: 10 })
```

---

## Entitlements (DLCs)

```js
const owned = host.entitlements.getActiveDlcs()
// ['endless-plus'] etc.
```

Read-only. Your mod **cannot** grant DLCs.

---

## RNG (if your game exposes it)

```js
const r = host.rng.next()         // [0, 1)
const n = host.rng.int(0, 100)    // [0, 100]
```

Deterministic seed per session — useful for replays.

---

## Logging

```js
host.log.debug('message')
host.log.info('message')
host.log.warn('message')
host.log.error('message', { extra: '...' })
```

Visible in the game's console (in dev) and in the mod's "Logs"
panel (in settings).

---

## Custom analytics

Requires declaring events in `manifest.analytics.events`:

```js
host.analytics.track('preset_applied', { presetName: 'hardcore' })
```

The `mod.framework.*` events are emitted by the runtime without
you doing anything.

---

## What you **don't** have access to

- `window`, `document`, `process`, `require`, `import`
- `fetch`, `XMLHttpRequest`, `WebSocket` directly
- `localStorage`, `sessionStorage`, `IndexedDB`
- DOM, browser events
- File system

Anything not listed in this doc doesn't exist for your mod.

---

## Summary

- Flat API under `host.*`.
- Each function requires its corresponding permission.
- Structured errors (not throws) for foreseeable failures.
- Game-specific documentation in
  `docs/games/<id>/host-api-changelog.md` — always check that one
  for game-specific features.
