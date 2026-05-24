<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm mods:sync-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# Lesson 1 — Your first mod in 10 minutes

Goal: have a mod live in Snake Classic that adds a tab to
`Settings → Mods` and shows a notification when the game ends.
Zero prior knowledge of the framework required.

> If you just want to see real production code, check out
> [`studio.gameplay-tuner`](https://github.com/leteoworks/mod-template-snake-classic)
> after this lesson.

---

## The cycle

```
   ┌─────────┐    pnpm build    ┌──────────┐    sideload    ┌──────┐
   │  src/   │ ───────────────▶ │ dist/    │ ─────────────▶ │ game │
   └─────────┘                  └──────────┘                └──────┘
        ▲                                                       │
        └───────────────── edit + iterate ──────────────────────┘
```

Each lesson in this tutorial adds a new piece to the cycle.

---

## 1 — Clone the template

```bash
npx degit leteoworks/mod-portal-snake-classic/examples/hello-mod my-first-mod
cd my-first-mod
pnpm install
```

The template comes with `mod.json`, `src/index.ts`, `package.json`
and `build.mjs` ready to go. You only need to edit them.

---

## 2 — Customize `mod.json`

Change the `id` and `metadata.name` (leave the rest alone for
now):

```json
{
  "manifestVersion": 1,
  "id": "yourhandle.hello-mod",
  "version": "0.1.0",
  "target": { "gameId": "snake-classic", "gameVersion": "^1.0.0" },
  "engine": { "preferred": "quickjs-declarative-ui", "fallbacks": ["isolated-vm"] },
  "requires": { "hostApi": "^1.0.0" },
  "entry": "dist/mod.js",
  "permissions": [
    {
      "type": "settings-ui",
      "rationale": "Adds a tab with a greeting toggle."
    },
    {
      "type": "events",
      "subscribe": ["GAME_OVER"],
      "rationale": "Greet the player when the game ends."
    },
    {
      "type": "storage",
      "quotaKb": 16,
      "rationale": "Save whether the greeting is on."
    }
  ],
  "metadata": {
    "name": "Hello Mod",
    "description": "My first mod.",
    "author": "Your Name",
    "license": "MIT"
  }
}
```

Key rules:
- **`id`** must be globally unique. Convention `<handle>.<short-name>`.
- **Every permission needs `rationale`** — the player reads it in
  the permission prompt. Don't leave it trivial.

---

## 3 — Write the code

`src/index.ts`:

```ts
// Settings tab with a toggle.
host.registerSettingsTab?.({
  id: 'hello-mod',
  title: 'Hello Mod',
  icon: 'mood',
  sections: [{
    kind: 'card',
    title: 'Greeting',
    children: [{
      kind: 'toggle',
      label: 'Greet at game over',
      binding: 'greetOnGameOver',
    }],
  }],
});

// React to the game event.
host.subscribeEvent('GAME_OVER', async (payload) => {
  const stored = await host.storage?.get('greetOnGameOver');
  const enabled = stored?.ok ? stored.value : true;
  if (!enabled) return;

  const score = (payload as { finalScore?: number })?.finalScore ?? 0;
  host.log.info(`[hello-mod] Game over with ${score} points.`);
});

host.log.info('[hello-mod] loaded v0.1.0');
```

Three APIs used:
- **`host.registerSettingsTab(descriptor)`** — declarative UI. The
  binding `'greetOnGameOver'` automatically connects to the mod's
  `host.storage`: the toggle persists by itself.
- **`host.subscribeEvent(name, handler)`** — react to game events.
  Here `GAME_OVER` with its payload.
- **`host.storage.get(key)`** — read from the mod's storage
  (quotaKb 16 declared in the manifest).

---

## 4 — Build

```bash
pnpm build
```

Produces `dist/mod.js` (~5 KB minified, IIFE ES2020 with no
dependencies).

---

## 5 — Sideload

Copy the project to the game's userData:

```bash
# macOS:
cp -r . ~/Library/Application\ Support/snake-classic/mods/yourhandle.hello-mod/
# Windows: %APPDATA%/snake-classic/mods/<modId>/
# Linux:   ~/.config/snake-classic/mods/<modId>/
```

> You only need `mod.json` + `dist/mod.js` (and `locales/` if you
> declare i18n). The rest is your local project.

---

## 6 — Activate and test

1. Open Snake Classic.
2. Settings → Mods → your mod shows up as **"Detected (sideload)"**.
3. Click "Activate". Accept the permission prompt.
4. The "Hello Mod" tab appears in Settings.
5. Make sure the toggle is ON.
6. Play a game. When it ends you'll see the log in the console
   (DevTools open in a dev build).

---

## What you've learned

- Mod structure: `mod.json` + `dist/mod.js`.
- Four canonical APIs: `registerSettingsTab`, `subscribeEvent`,
  `storage.get`, `log`.
- The cycle: edit → build → sideload → reload.
- The **binding** concept: the UI writes to the mod's storage
  automatically.

## What's next

[**Lesson 2 — Slider that tunes the game in real time**](02-slider-tunable.md).
You'll control Snake's initial speed with a slider. You'll learn
`host.callHostFn` and the "apply config at game start" pattern.

## Fast iteration (opt-in)

If you're working inside the studio's monorepo as a first-party
mod, see [`dev-workflow.md`](../dev-workflow.md) — there's HMR via
`pnpm dev:mod` that skips the manual sideload + reload cycle. For
external mods, the manual cycle in this lesson is the standard.
