<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm mods:sync-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# `mod.json` format — modder reference

Complete spec of the manifest fields from the modder's perspective.
For the technical version the framework consumes, see
[../architecture/mod-manifest.md](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/architecture/mod-manifest.md).

---

## Full skeleton

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

## Fields one by one

### `manifestVersion: 1`

Schema version. Today only `1`. If the framework introduces a v2,
v1 manifests will keep being accepted (N-2 version compat).

### `id`

Convention `<handle>.<modname>`. Lowercase + dashes. Immutable —
changing it is equivalent to publishing a different mod.

Good examples: `acme.power-explorer`, `studio.dark-mode`,
`juancho.snake-roguelike`.

### `version`

SemVer (X.Y.Z). Bumps:
- **patch**: bug fixes. Player settings are preserved.
- **minor**: non-breaking features. Settings preserved.
- **major**: breaking change. **Settings reset** automatically on
  update. Announce it in your changelog.

Once a version is published, **DO NOT** overwrite it with
different content. Always publish a new version.

### `target.gameId`

ID of the target game. You'll find it in
`docs/games/<id>/README.md` of the studio's repo. **Do not** use
the commercial name nor the Steam AppID — use the logical
`gameId`.

### `target.gameVersion`

SemVer range. Convention: `^X.Y.Z` (compatible with any
minor/patch from X.Y.Z). Keep updated after testing with newer
versions of the game.

### `engine.preferred` and `engine.fallbacks`

Engine your mod needs. Choose based on what your mod does:

- If your mod adds settings tabs (forms) → `quickjs-declarative-ui`.
- If your mod is pure logic (events, transformations) →
  `isolated-vm` (Electron) or `quickjs` (cross-platform).
- If your mod adds rich HTML UI → `iframe-sandbox`.
- If your mod has graphics visualization →
  `web-worker-offscreen-canvas`.

Engine list: [../engines/](https://github.com/leteoworks/my-game-fw/tree/main/docs/mods/engines).

`fallbacks` lets your mod work if the preferred engine isn't
available. Pick reasonable variants; an empty list is valid but
restrictive.

### `requires.hostApi`

SemVer range of the game's host API. Check the
`host-api-changelog` of the game in `docs/games/<id>/`.
Convention: `^X.Y.Z` with the minimum version your mod needs.

### `requires.dlcs`

List of `dlcId`s the player must own. If your mod modifies
content provided by a DLC, declare it. Clear messages to the
player if they don't own the DLC.

### `entry`

Path to the JS file the engine loads. Convention: `dist/mod.js`.
Must be a pre-compiled bundle (the framework doesn't do module
resolution). Max size: 2 MiB.

### `permissions`

Array of objects, each with `type`, type-specific fields, and
`rationale` (short string the player sees).

Canonical categories:

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

**Rationale matters**: the player reads it before accepting. A
useful rationale ("Reads your final score to add it to the mod
recap") wins installs; a trivial one ("for fun") loses them.

### `analytics.events` (optional)

Catalog of custom events your mod can emit. Each one with name,
description, and schema (types per prop):

```json
{
  "analytics": {
    "events": [
      {
        "name": "preset_applied",
        "description": "Player applied a configuration preset",
        "schema": { "presetName": "string" }
      }
    ]
  }
}
```

Maximum 20 events per mod (configurable by the game).

The `mod.framework.*` events (engagement, fault, perf, etc.) are
emitted by the runtime automatically — your mod doesn't have to
declare them.

### `metadata`

Information visible to the player in the UI:

```json
{
  "name": "Your Mod",
  "description": "What your mod does in one or two sentences (max 500 chars).",
  "author": "Your name or handle",
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

`description` is sanitized (plain text only). `tags` max 5.
`screenshots` max 5.

### `donateUrl` — financial support for the author (optional)

If you declare `donateUrl`, the game shows a **"Support author"**
button in `Settings → Mods → <your mod>` that opens the URL in
the player's external browser.

- **HTTPS only**: the Zod schema rejects `http://` and custom
  schemes for security (anti-phishing). The runtime also
  validates at open time.
- **Common providers**: Patreon, Ko-fi, GitHub Sponsors,
  BuyMeACoffee, Liberapay, OpenCollective. The studio doesn't
  endorse any — you pick.
- **Recommended mechanism**: Steam deprecated direct paid mods in
  2015. External donations are now the canonical pattern for the
  community to financially support their favorite modders
  without the studio's legal overhead.
- **DO NOT use this for crowdfunding or sales**: the button is
  labeled "Support author" and players understand that as a
  voluntary donation. If you want to sell content, the path is
  the studio's DLC system (curated, opt-in, see
  `architecture/dlc-interop.md`).
- **Localization**: the button label is automatically translated
  to the game's locales. The modder doesn't have to add
  anything extra.

### `signature` (optional)

Optional signature. If your mod goes to Steam Workshop, Steam
adds its own verification flow; if you want to additionally sign
(recommended for mods with elevated permissions), see
[publishing.md](publishing.md).

---

## Common validation errors

| Error | Cause |
|---|---|
| "id doesn't match regex" | Uppercase, special characters, or missing `.` separator |
| "version is not SemVer" | You used something like `1.0` or `v1.0.0` |
| "rationale missing for permission" | Every permission needs non-empty `rationale` |
| "engine.preferred not in catalog" | Typo or non-existent engine |
| "entry file > 2MiB" | Bundle too large; review what you included |
| "manifestVersion unsupported" | Use `1` until v2 is announced |

---

## Summary

- `mod.json` declares identity, target, engine, permissions (with
  rationale), metadata.
- `id` and `version` are immutable / monotonic.
- Every permission needs non-trivial `rationale` — it's the first
  thing the player reads.
- Custom analytics events declared in `analytics.events`.
- Metadata + screenshots = what sells your mod in Workshop.
