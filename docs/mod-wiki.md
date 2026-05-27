<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm mods:sync-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# Document your mod with an in-game wiki

Any mod can declare a **standardized wiki** that the player opens from
the mod card in `Settings → Mods → your-mod`. The framework validates,
stores and renders it with consistent UX — you only write the content
in a JSON.

This guide is for **modders**. If you're a framework contributor or
auditor, read [`docs/mods/architecture/mod-wiki.md`](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/architecture/mod-wiki.md).

---

## Day 1: minimal example

```bash
# Create wiki.json next to your mod.json.
cd game-mods/snake-classic/studio.my-mod/
touch wiki.json
```

```jsonc
// wiki.json
{
  "format": 1,
  "i18n": {
    "en": {
      "overview": "# My Mod\n\nThis mod does X.\n\n## How it works\n\n- adds Y\n- changes Z"
    }
  }
}
```

```jsonc
// mod.json — add the wiki field
{
  "manifestVersion": 1,
  "id": "studio.my-mod",
  // ...
  "wiki": {
    "source": "wiki.json"
  }
}
```

Rebundle your mod and reload. The **"Wiki"** button appears on your
card in the Mods Manager. Click → opens the viewer with your content.

---

## Full structure

```jsonc
{
  "format": 1,                          // always 1 (current version)
  "primaryLocale": "en",                // optional (defaults to 'en' fallback)
  "i18n": {
    "<locale-key>": {
      "overview": "markdown string",       // optional
      "configuration": "markdown string",  // optional
      "faq": [                              // optional
        { "q": "string", "a": "markdown string" }
      ],
      "troubleshooting": "markdown string",// optional
      "credits": "markdown string",        // optional
      "pages": [                            // optional (large wiki)
        {
          "id": "kebab-case",
          "title": "string",
          "markdown": "markdown string",
          "parent": "kebab-case-parent"   // optional, max depth 2
        }
      ]
    }
  }
}
```

### Fixed sections — when to use

| Section          | When to use                                                   |
|------------------|---------------------------------------------------------------|
| `overview`       | What the mod does in 30 seconds. **Always start here.**       |
| `configuration`  | Each exposed setting + what it does + recommended values.     |
| `faq`            | Frequent questions (compat, conflicts, performance...).       |
| `troubleshooting`| Symptom → cause → fix. The stuff you usually answer on Discord.|
| `credits`        | Authorship, contributors, third-party asset licenses.         |

Fill only those that apply. Omitted ones don't appear as tabs.

---

## i18n — supported locales

```jsonc
"i18n": {
  "en": { "overview": "Hello." },
  "es": { "overview": "Hola." },
  "es-AR": { "overview": "Che, hola." }   // regional override
}
```

- Locale key must match `[a-z]{2}(-[A-Z]{2})?` (e.g. `en`, `pt-BR`, `zh-CN`).
- The framework selects a locale based on the player's language with
  this fallback chain:

  ```
  playerLocale → playerLocale.split('-')[0] → primaryLocale → 'en' → first key
  ```

- If the player ends up in a fallback different from theirs, the
  viewer shows a banner: *"Showing documentation in another language
  — the modder hasn't translated it to yours yet."*

**Recommendation**: start monolingual in `en` (global reach). Add `es`
when your Spanish-speaking base grows.

---

## Supported Markdown

Minimalist subset by design (zero XSS surface).

| Supported            | Syntax                            |
|----------------------|-----------------------------------|
| Heading 1-3          | `# H1`, `## H2`, `### H3`         |
| Paragraph            | adjacent lines                    |
| Unordered list       | `- item`, `* item`, `+ item`      |
| Ordered list         | `1. item` `2. item`               |
| Code block           | <code>```lang</code> ... <code>```</code> |
| Bold                 | `**text**`                        |
| Italic               | `*text*`                          |
| Inline code          | `` `text` ``                      |
| Link                 | `[text](https://...)` or `[text](#anchor)` |

**NOT supported** (rendered as literal text, no error):

- Raw HTML (`<div>`, `<img>`, etc.). Rendered as plain text.
- Images (`![alt](src)`).
- Markdown tables.
- Blockquotes (`>`).
- Nested lists.

### Links — allowed schemes

| Scheme              | Result                |
|---------------------|-----------------------|
| `https://`          | Normal link (opens in new tab) |
| `http://`           | Normal link (opens in new tab) |
| `#section`          | Internal anchor       |
| **anything else** (`javascript:`, `data:`, `file:`, etc.) | **Degrades to plain text** — the viewer renders `[text](url)` literal without creating an `<a>`. **Not an error**, simply doesn't work as a link. |

---

## Extra pages (optional)

For large wikis (10+ content sections). Maximum depth 2:

```jsonc
"pages": [
  { "id": "advanced", "title": "Advanced", "markdown": "..." },
  {
    "id": "tuning",
    "title": "Tuning details",
    "markdown": "...",
    "parent": "advanced"
  }
]
```

- `id` must be kebab-case `[a-z0-9-]`, max 40 chars.
- Top-level (no `parent`) render as nav tabs.
- Sub-pages (with `parent`) have NO tab of their own — link to them
  from the parent's markdown with `[See tuning](#tuning)` etc.
- If you declare a non-existent `parent`, a cycle, or depth > 2,
  validation fails and **the Wiki button doesn't appear**. Check the
  game logs for the reason.

---

## Limits

| Limit                     | Value       |
|---------------------------|-------------|
| Total `wiki.json` size    | 256 KB      |
| Locales per wiki          | 30          |
| Pages per locale          | 30          |
| FAQ entries per locale    | 50          |
| Characters per section    | 20 000      |
| Characters per FAQ answer | 5 000       |
| Characters per FAQ question | 200       |

If you exceed any, validation fails and **the Wiki button doesn't
appear** on your card. Check the game logs for details.

---

## The framework viewer

When the player clicks "Wiki" from your card:

```
┌──────────────────────────────────────────────┐
│  Home · Settings · Mods   (CUSTOMIZED BY GAME)│
│                                              │
│  My Mod                                      │
│  Description from manifest.metadata.         │
│                                              │
│  [ Overview ][ Config ][ FAQ ][ Credits ]    │
│  ────────────────────────────────────────    │
│                                              │
│  # My Mod                                    │
│  This mod does X...                          │
│                                              │
└──────────────────────────────────────────────┘
```

The header nav is **chrome of the game** (each game decides which
links appear — Home, Settings, etc.). The first link is always an
exit to the game root — the player has a way out at any time. You
don't control or override this — it's the **game's** chrome, not the
mod's.

---

## Checklist before publishing

- [ ] `wiki.json` is valid JSON and doesn't exceed 256 KB.
- [ ] `format: 1` declared.
- [ ] `i18n` has at least one locale.
- [ ] `mod.json` has `"wiki": { "source": "wiki.json" }`.
- [ ] You boot your mod locally and see the "Wiki" button on the card.
- [ ] The viewer renders your content correctly.
- [ ] External links open in a new tab.
- [ ] If the player's language differs from yours, you see the
      locale-fallback banner.

---

## FAQ (modder-side)

**Can I include images?** No. The renderer doesn't support images —
if you need to show screenshots, upload them to your repo and link
from a paragraph with `[See screenshot](https://github.com/.../shot.png)`.

**Can I embed videos?** No. Link to YouTube/Vimeo from a paragraph.

**Does the JSON inflate the bundle?** Yes, but it's loaded once at
discovery and cached. Limit 256KB per mod — plenty for typical
wikis.

**Can I declare wiki in a sideloaded mod?** Yes — the `LocalModSource`
reads `wiki.json` the same way `BundledModSource` does.

**Does a mod without wiki lose anything?** Only the button. The mod's
mandatory fields (`metadata.name`, `metadata.description`) remain
visible on the dashboard card.
