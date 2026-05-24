<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm mods:sync-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# Lesson 5 — Release to Workshop

Goal: turn your mod into a release-ready product and upload it to
Steam Workshop so any player of the game can subscribe to it.
Covers i18n, icon, local validation, packaging, and upload.

> Operational reference doc: [`publishing.md`](../publishing.md)
> covers the Workshop detail (visibility, tags, verification
> tiers). This lesson is the "incremental checklist" over your
> mod from Lesson 4.

---

## 1 — Internationalization (i18n)

Up to now you've been using `t(key, fallback)` with
`host.i18n?.t()`. If you never register locales, what the player
sees is the literal English/Spanish fallback from your code. If
you do register them, the game respects the player's language.

### Structure

```
my-mod/
├── locales/
│   ├── en.json
│   ├── es.json
│   └── fr.json
└── src/
    └── ...
```

`locales/en.json`:

```json
{
  "mymod.tab.title": "Power-Up Mixer",
  "mymod.section.spawn": "Frequency",
  "mymod.section.toggles": "Active power-ups",
  "mymod.section.presets": "Presets",
  "mymod.spawn.label": "Interval between power-ups (ms)",
  "mymod.preset.classic": "Classic",
  "mymod.preset.casual": "Casual",
  "mymod.preset.hardcore": "Hardcore",
  "mymod.powerups.speedBoost": "Speed Boost",
  "mymod.powerups.invincibility": "Invincibility",
  "mymod.powerups.doublePoints": "Double Points"
}
```

`locales/es.json`:

```json
{
  "mymod.tab.title": "Mezclador de Power-Ups",
  "mymod.section.spawn": "Frecuencia",
  "mymod.section.toggles": "Power-ups activos",
  "mymod.section.presets": "Presets",
  "mymod.spawn.label": "Intervalo entre power-ups (ms)",
  "mymod.preset.classic": "Clásico",
  "mymod.preset.casual": "Casual",
  "mymod.preset.hardcore": "Hardcore",
  "mymod.powerups.speedBoost": "Aceleración",
  "mymod.powerups.invincibility": "Invencibilidad",
  "mymod.powerups.doublePoints": "Doble Puntuación"
}
```

### Declare the namespace in `mod.json`

You already had it:

```json
{
  "type": "i18n",
  "namespaces": ["mymod"],
  "rationale": "Translate labels to multiple languages."
}
```

**Key rule**: any key you register must start with the declared
namespace (`mymod.*`). The framework rejects keys outside the
namespace to prevent a mod from stepping on game translations or
other mods'.

### Fallback chain

When a player in `fr` activates your mod, the framework looks up:
1. `locales/fr.json` → if it exists, use it.
2. `locales/en.json` → canonical fallback.
3. `fallback` literal from code → last resort.

Without `fr.json` registered, strings appear in English. Without
`en.json`, in whatever the code's `fallback` is. Robust by
design.

---

## 2 — Mod icon

`mod.json` with `metadata.icon`:

```json
"metadata": {
  "name": "Power-Up Mixer",
  "description": "Customize which power-ups appear in Snake.",
  "author": "Your Name",
  "license": "MIT",
  "icon": "icon.png",
  "tags": ["customization", "snake-classic", "power-ups"]
}
```

Create `icon.png` at the root of the mod:
- **Dimensions**: 256×256 px.
- **Format**: PNG with optional transparency.
- **Size**: <100 KB (recommended <50 KB).
- **Style**: legible at 64×64 (mod list shows it small).

The validator (step 4) rejects icons >1 MB or with suspicious
dimensions.

---

## 3 — Polished manifest

Before publishing, review `mod.json`:

```json
{
  "manifestVersion": 1,
  "id": "yourhandle.power-up-mixer",
  "version": "1.0.0",
  "target": { "gameId": "snake-classic", "gameVersion": "^1.0.0" },
  "engine": {
    "preferred": "quickjs-declarative-ui",
    "fallbacks": ["isolated-vm"]
  },
  "requires": { "hostApi": "^1.0.0", "dlcs": [] },
  "entry": "dist/mod.js",
  "permissions": [
    {
      "type": "settings-ui",
      "maxTabs": 1,
      "rationale": "Tab to configure 22 toggles + slider + 3 presets."
    },
    {
      "type": "game-specific",
      "surface": "tunables",
      "actions": ["set", "reset"],
      "rationale": "Enables/disables each power-up individually."
    },
    {
      "type": "storage",
      "quotaKb": 32,
      "rationale": "Saves the player's selection."
    },
    {
      "type": "i18n",
      "namespaces": ["mymod"],
      "rationale": "Translates labels to multiple languages."
    },
    {
      "type": "events",
      "subscribe": ["MYMOD_APPLY_PRESET"],
      "dispatch": ["MOD_NOTIFICATION"],
      "rationale": "Applies presets and notifies the player."
    }
  ],
  "metadata": {
    "name": "Power-Up Mixer",
    "description": "Customize which power-ups appear + 3 one-click presets.",
    "author": "Your Name",
    "homepage": "https://github.com/yourhandle/power-up-mixer",
    "license": "MIT",
    "icon": "icon.png",
    "tags": ["customization", "snake-classic", "power-ups"]
  },
  "donateUrl": "https://patreon.com/yourhandle"
}
```

### Notes
- `version: "1.0.0"`: strict SemVer. Bump patch (`1.0.1`) for
  bugfixes, minor (`1.1.0`) for new features, major (`2.0.0`)
  when you break compatibility.
- `homepage`: optional. If you fill it in, it appears as a link
  on the mod's card.
- `donateUrl`: optional. If you fill it in, an "Support author"
  button appears on the card. HTTPS-only, validated by the
  framework.
- `tags`: help discovery. No mandatory convention but respect the
  target game's tags (see `publishing.md`).

---

## 4 — Local validation

Before packaging, run the validator:

```bash
# From the framework monorepo (clone if you don't have it):
pnpm mods:validate /path/to/my-mod
```

The validator runs all these checks without needing the game:
- Valid `mod.json` shape (Zod schema).
- Coherent permissions (all with non-empty `rationale`).
- `entry` points to an existing file.
- `dist/mod.js` <500 KB.
- Icon <1 MB with reasonable dimensions.
- Parseable locale JSON.
- Locale keys start with the declared `namespaces`.
- **App Store §3.3.2 compliance** (no `eval`, no `Function`
  constructor, no arbitrary dynamic imports — the runtime engine
  would block them anyway, but the validator catches them BEFORE
  uploading to App Store).

If everything passes, ✅. If it fails, it tells you what to fix.

---

## 5 — Release build

```bash
pnpm build:release
```

Differences vs `pnpm build` (dev):
- Minified (~5-15 KB typical).
- Separate source map in `dist/mod.js.map` (optional to include).
- No `console.log` or `debug` (esbuild drops these identifiers).

Verify the output:

```bash
ls -la dist/
# mod.js   13 KB
# mod.js.map  28 KB (optional)
```

---

## 6 — Pack

```bash
pnpm pack
```

Generates `dist/<modId>-<version>.zip` with the minimum structure
Steam Workshop expects:

```
power-up-mixer-1.0.0.zip
├── mod.json
├── dist/
│   └── mod.js
├── locales/
│   ├── en.json
│   └── es.json
└── icon.png
```

It does NOT include `src/`, `node_modules/`, `package.json`,
`build.mjs`, `.git/`. Only the final bundle.

> Expected size: 50-500 KB. Workshop has a 100 MB per item limit
> — easy to meet.

---

## 7 — Upload to Steam Workshop

> Prerequisite: Steam installed and you own the game (Snake
> Classic).

1. Open Steam → library → Snake Classic → Community Hub.
2. In the side column: **Workshop** → **Create Item**.
3. Steam opens a native form:
   - **Title**: mod name (you can copy from `metadata.name`).
   - **Description**: basic markdown allowed. Paste your mod's
     README if you have one; otherwise a 2-3 paragraph
     explanation.
   - **Preview image**: the `icon.png` or another 800×450 for
     better listing.
   - **Tags**: mark the relevant ones from the game's catalog.
   - **Visibility**: start at **Hidden** (only you). Change to
     **Public** when ready.
   - **Content**: drag & drop the ZIP from step 6.
4. Submit.
5. Steam assigns a **Workshop ID** (integer). That ID identifies
   your item forever.
6. To test: subscribe from your account. Open the game. Your mod
   appears in Settings → Mods → "Workshop" as installed.
7. If everything works: go back to Workshop, change visibility to
   **Public**.

---

## 8 — Updates (subsequent releases)

To upload a new version:

1. Bump `version` in `mod.json` (`1.0.0` → `1.0.1`).
2. `pnpm build:release && pnpm pack`.
3. Workshop → your item → **Update Item** → drag & drop the new
   ZIP.
4. Optional: update description / changelog.

Steam auto-updates the ZIP on all subscribed players. Your game
on startup detects the new version and loads it.

---

## Final checklist

Before switching to Public:

- [ ] `mod.json` with non-trivial `id`, `version`, `target`,
      `metadata.name`, `metadata.description`.
- [ ] Every permission with non-empty, honest `rationale`.
- [ ] `locales/en.json` registered at minimum.
- [ ] `icon.png` 256×256 <100 KB.
- [ ] `pnpm mods:validate` ✅.
- [ ] `pnpm build:release` ✅.
- [ ] Local test: sideload + activate + play a real game.
- [ ] Steam Workshop item with Title + Description + Preview.
- [ ] Test as subscriber (your account): install from Workshop
      and verify it works.
- [ ] Visibility → Public.

---

## What's next

You've finished the basic tutorial. Now:

- [**Cookbook**](../cookbook.md) — copy-paste recipes for common
  problems (presets, throttle, multi-mod coordination, etc.).
- [**Troubleshooting**](../troubleshooting.md) — diagnosis for
  common symptoms ("my mod doesn't appear", "empty tab",
  "permission denied", etc.).
- [**`api-reference.md`**](../api-reference.md) — full `host.*`
  catalog to go deep.
- [**`publishing.md`**](../publishing.md) — Workshop details
  beyond the basic flow (verification tiers, kill-switch,
  donations, featured mods).

## Reference mods (real production code, not toys)

- [`studio.fun-config`](https://github.com/leteoworks/my-game-fw-mods/tree/main/snake-classic/studio.fun-config)
  — 22 toggles + 3 presets, ~250 lines of well-structured TS.
- [`studio.gameplay-tuner`](https://github.com/leteoworks/my-game-fw-mods/tree/main/snake-classic/studio.gameplay-tuner)
  — quantitative sliders + Easy/Normal/Hard presets, ~200 lines.

Read them when you wonder "how is X done in production?".
