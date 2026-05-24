<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm mods:sync-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# Tested prompt gallery — vibe-coding your mod

Each prompt is **self-contained**: you can copy-paste into
Claude Code (CLI or IDE) and get a useful result. We assume
your mod has [`CLAUDE.md`](CLAUDE.template.md) at the root —
that's what gives Claude context about the framework, sandbox,
and mod files.

Three levels by risk:

- **Level 1** — Mechanical (Claude does it alone, you accept if
  it builds).
- **Level 2** — Full simple mod (Claude proposes, you review
  manifest + permissions + event names).
- **Level 3** — Release boilerplate (text generated in parallel
  to your work).

---

## Level 1 — Mechanical tasks (safe vibe-coding)

### 1.1 — Add a new toggle to an existing tab

```
Add a new toggle to the mod tab that controls whether game-over
notifications appear as a toast. Persist between sessions with
binding to the mod's storage.

Details:
- Label: "Show toast at game over".
- Binding: 'showToastOnGameOver' (no tunables. prefix — it's
  only mod storage, doesn't touch the game).
- Default: true.
- Add it to the "Notifications" card of the tab; create the card
  if it doesn't exist.

DO NOT add a new hook yet — I'll write the handler that reads
the toggle and shows the toast.
```

**Touches**: `src/settings-tab.ts` (or `src/index.ts` if the
descriptor is inline).

**What Claude should NOT touch manually after**: the descriptor
structure (Claude leaves it correct).

**What YOU should review**:
- Is the label good in your language? If you have i18n, better
  pass it through `host.i18n.t(...)`.
- If the toggle controls something in the game (not just in the
  mod), it should be `binding: 'tunables.X'`, not
  `'showToastOnGameOver'`.

**Typical risks**:
- Claude may add a new permission "just in case" — verify
  `mod.json` that nothing was added you don't need.

---

### 1.2 — i18n: translate hardcoded strings to `locales/`

```
In src/settings-tab.ts there are hardcoded strings in Spanish.
Make them i18n:

1. Create (or extend) locales/en.json and locales/es.json.
2. Use keys with namespace `mod.<modId>.tab.<area>.<element>`
   (read my mod.json for the modId).
3. In the code, replace the literal string with
   `host.i18n?.t('mod.<modId>.tab.X.Y') ?? '<Spanish fallback>'`.
4. If `permissions[type=i18n]` isn't declared in my mod.json,
   add it with correct namespace and concrete rationale.

DO NOT touch the keys that are ALREADY i18n-ized (the ones that
already use host.i18n.t). Only the hardcoded ones.
```

**Touches**: `locales/en.json`, `locales/es.json`,
`src/settings-tab.ts` (or `src/index.ts`), possibly `mod.json`.

**What YOU should review**:
- **English translations**: Claude may leave something literal
  but imprecise. Read `en.json`.
- **`mod.json` `i18n` permission**: if Claude added it, its
  `rationale` should explain what it translates (not "For
  i18n").

**Typical risks**:
- Key outside declared namespace → the framework silently
  rejects it.
- Spanish fallback in code + locale `es.json` also with the same
  string = redundancy (not a bug, but ugly). Pick one and be
  consistent.

---

### 1.3 — Refactor: N inline toggles → array + map (DRY)

```
In src/settings-tab.ts I have N inline entries `{ kind:
'toggle', label: '...', binding: 'tunables.powerupXEnabled' }`,
all with the same shape. Refactor them to:

1. A TOGGLES array in src/toggles.ts with shape `{ binding,
   i18nKey, fallback }`.
2. In settings-tab.ts, `.map(...)` over the array to generate
   entries.
3. Keep the current ORDER (visually relevant).
4. Keep the i18n: if the current entries use `host.i18n.t(...)`,
   the array must carry `i18nKey` separate from `fallback`.

Reference pattern: studio.fun-config does exactly this — look at
game-mods/snake-classic/studio.fun-config/src/settings-tab.ts
if you need a reference.
```

**Touches**: `src/settings-tab.ts`, **new** `src/toggles.ts`.

**What YOU should review**:
- The order must be preserved.
- The bindings must match EXACTLY the previous ones (one typo
  and they stop applying to the game).

**Typical risks**: none critical — it's a mechanical refactor.
If the build passes, it's fine.

---

### 1.4 — Add "Reset to defaults" button applying N bindings

```
Add a button to the tab "Restore default values" that sets all
the toggles in the TOGGLES array (src/toggles.ts) to `true` (or
the default that comes as the second argument of the array).

Expected implementation:
1. Button in an "Actions" card at the end of the tab, variant
   'ghost'.
2. action: { kind: 'event', name: 'MYMOD_RESET_TOGGLES' }.
3. Handler in src/index.ts that uses Promise.all to apply the N
   toggles with a single `await` (not serial — see recipe 2 of
   the cookbook if you need reference).
4. Persist the new values in storage so the UI reflects them on
   re-render.
5. Add 'MYMOD_RESET_TOGGLES' to subscribe[] of the events
   permission in mod.json.
6. After applying, dispatch 'MOD_NOTIFICATION' with text
   "Values restored" — add 'MOD_NOTIFICATION' to dispatch[] of
   the events permission.
```

**Touches**: `src/settings-tab.ts`, `src/index.ts`, `mod.json`.

**What YOU should review**:
- `mod.json`: the `events` permission stayed coherent (subscribe
  + dispatch both correct).
- The name `MYMOD_RESET_TOGGLES` — Claude may have invented
  another prefix. Convention:
  `MOD_<your-modid-without-dots>_<action>`.

**Typical risks**:
- Forgetting `await Promise.all` → 22 serial calls → perceptible
  UI freeze. Verify the code uses `Promise.all`.
- If `host.storage.set` fails silently (quota exceeded), the UI
  doesn't reflect the reset. Check `result.ok` after each `set`.

---

## Level 2 — Full simple mods (Claude proposes, modder reviews)

### 2.1 — "Final score notification" mod

```
Create a complete mod in this project that:

1. When the game fires GAME_OVER, shows an in-game toast
   notification with the final score.
2. Has a toggle in Settings → Mods → `<your tab>` that allows
   enabling/disabling the notification. Default: ON.
3. Persists the toggle between sessions.

Details:
- target.gameId: snake-classic. target.gameVersion: ^1.0.0.
- engine.preferred: quickjs-declarative-ui, fallback quickjs.
- Required permissions: settings-ui, events (subscribe
  GAME_OVER, dispatch MOD_NOTIFICATION), storage (quotaKb 16),
  i18n (namespace `mod.<your-modid>`).
- Each permission with concrete, NOT trivial rationale.
- i18n: locales/en.json + locales/es.json with the toggle
  string + the toast text.
- Edit mod.json with id, version 0.1.0, metadata.name, author.

DO NOT add dependencies to package.json. Only esbuild already
comes in devDeps.
```

**Touches**: `mod.json`, `src/index.ts`, `src/settings-tab.ts`
(if you prefer), `locales/en.json`, `locales/es.json`.

**What YOU should review**:
- **`rationale` of permissions**: the player reads them. If
  Claude left "for notifications", rewrite to something concrete
  ("Notifies the player with their final score at game over").
- **`metadata.author`**: Claude probably put "Modder" or
  similar. Put your real name or handle.
- **`id`**: convention `<yourhandle>.<modname>`. If Claude
  invented something, change it.
- **`GAME_OVER` event name**: confirm in api-reference that it
  exists with that exact name.

**Typical risks**:
- Claude may invent an event name (`GAME_ENDED`,
  `MATCH_FINISHED`) when the real one is `GAME_OVER`. Confirm
  with api-reference.md or the game's code.

---

### 2.2 — "Persisted initial-speed slider" mod

```
Create a complete mod that adds a slider to the Settings tab
controlling Snake's initial speed (tunable 'initialSpeedTickMs',
range 80-500ms, step 10, default 200).

Behavior:
- Moving the slider applies the change live AND persists in
  storage.
- On any game start (GAME_STARTED), re-apply the value from
  storage (defensive against game restarts).
- "Restore default" button under the slider that calls
  `gameConfigReset` and clears storage so the slider shows the
  game default.

Operational details:
- target.gameId: snake-classic.
- Permissions: settings-ui, game-specific (surface tunables,
  actions set+reset+snapshot), events (subscribe GAME_STARTED,
  subscribe MYMOD_RESET_SPEED), storage (16 KB), i18n
  (namespace `mod.<id>`).
- The slider must use `binding: 'tunables.initialSpeedTickMs'`
  (with tunables. prefix) — the runtime applies the change
  automatically with no handler.
- The GAME_STARTED hook READS from storage and calls
  gameConfigSet — DOES NOT write storage (last-write-wins
  anti-pattern, see CLAUDE.md).

Take game-mods/snake-classic/studio.gameplay-tuner/ as reference
if you need to see the pattern in production.
```

**Touches**: `mod.json`, `src/index.ts`, `src/settings-tab.ts`,
`locales/en.json` + `locales/es.json`.

**What YOU should review**:
- **`game-specific` permission** — `surface: 'tunables'`,
  `actions: ['set', 'reset', 'snapshot']`. If Claude asked for
  other actions, question it.
- **`initialSpeedTickMs`** exists as a tunable in Snake —
  confirm in `tunables.ts` of the game or in api-reference.

**Typical risks**:
- Claude may mix the `tunables.` binding + a hook writing the
  same key → race condition. Verify the hook **reads** from
  storage and applies to the game with `callHostFn`, without
  calling `host.storage.set` for that key.

---

### 2.3 — "Parametrizable power-up toggle" mod

~~~
Create a parametrizable mod that toggles ON/OFF a specific
Snake power-up.

Mod parameter (configurable only by editing a TYPESCRIPT
constant in src/, NOT via runtime UI):

```ts
const POWER_UP: string = 'speedBoost';  // editable
```

Behavior:
- Generates a tab with ONE single toggle `Enable {PowerUp Name}`.
- Default: true (same as the game's default).
- Moving the toggle calls
  `gameConfigSet('powerup{POWER_UP}Enabled', bool)`.
- Persists the last state with binding
  'tunables.powerup...Enabled'.

If POWER_UP is not one of the 22 valid ones, the mod logs warn
and doesn't register the tab.

Valid POWER_UP list: speedBoost, invincibility, doublePoints,
magnet, shrink, ghost, goldenApple, demolition, earthquake,
bombPickup, brickBlast, extraLife, summonSnake, blindfold,
fragileWall, brickRevival, portal, demon, baseballBat,
doubleLength, rainbowHeart, timeTravel.
~~~

**Touches**: `mod.json`, `src/index.ts`, `src/settings-tab.ts`,
`locales/en.json` + `locales/es.json`.

**What YOU should review**:
- **Constant validation**: that the code actually logs warn +
  skip if the value is invalid. If it doesn't, demand
  fail-fast.
- **Name i18n**: that the toggle label uses
  `host.i18n.t(...)` and not the internal camelCase
  (`speedBoost` as a label is ugly; it should be "Speed Boost").

---

### 2.4 — "Easy/Normal/Hard preset dropdown" mod

```
Create a complete mod that adds a dropdown ("select") to the
tab with 3 options: Easy / Normal / Hard. Applying the preset
applies several game tunables at once.

Presets (you can adjust — sensible but edit freely):

- Easy: maxLives=5, initialSpeedTickMs=300, pointsPerFood=10.
- Normal: maxLives=3, initialSpeedTickMs=200, pointsPerFood=15.
- Hard: maxLives=1, initialSpeedTickMs=120, pointsPerFood=25.

Details:
- The dropdown uses `kind: 'select'` with
  `binding: 'mymod.preset'`.
- An "Apply preset" button below fires the
  MYMOD_APPLY_PRESET event with payload { preset:
  'easy'|'normal'|'hard' }.
- The handler applies the 3 tunables IN PARALLEL with
  Promise.all + persists each one in storage so the UI
  reflects them (if there are other sliders in the tab —
  optional for this version).
- After applying, dispatch MOD_NOTIFICATION with "Preset X
  applied".

Reference: studio.gameplay-tuner uses this exact pattern — look
at game-mods/snake-classic/studio.gameplay-tuner/src/presets.ts
and src/apply-config.ts if you need the shape.
```

**Touches**: `mod.json`, `src/index.ts`, `src/settings-tab.ts`,
`src/presets.ts` (new), `locales/en.json` + `locales/es.json`.

**What YOU should review**:
- The preset values — Easy with 5 lives is reasonable, but the
  `pointsPerFood` are your decision. Edit if you want.
- The event name `MYMOD_APPLY_PRESET` — convention
  `MOD_<your-modid-without-dots>_<verb>`.

**Typical risks**:
- **Missing `Promise.all`** → 3 serial calls → ~3ms
  perceptible. Verify the code uses it.
- **`maxLives`/`initialSpeedTickMs`/`pointsPerFood`** — all
  are valid tunables in Snake, but confirm in the game's
  `tunables.ts`.

---

## Level 3 — Release tasks (boilerplate)

### 3.1 — Generate icon 256x256 + 3 descriptive screenshots

```
Your mod does [BRIEF 1-SENTENCE DESCRIPTION]. I need:

1. icon.png 256x256 with optional transparency, <50KB,
   recognizable at 64x64. Style coherent with [Snake / pixel
   art / minimalist — pick].
2. 3 screenshots 1920x1080 for Workshop:
   - screenshot 1: the mod tab in Settings with its controls.
   - screenshot 2: the effect of the mod in the game (visible
     change).
   - screenshot 3: optional, description/diagram if the mod is
     conceptually complex.

For the screenshots, suggest what to capture exactly step by
step (I'll do it with cmd-shift-4 or equivalent, you don't have
to generate them).

For the icon, propose 3 prompt variants for the IDE's image gen
(Anthropic Studio, DALL-E, Stable Diffusion) I can choose from.
```

**Touches**: nothing in code. Output is image gen prompt +
manual QA suggestions.

**What YOU should review**: the icon must be legible at small
size (64x64 in the mod list). Variants with text are usually
unreadable — prefer symbols.

---

### 3.2 — Generate changelog for v0.2.0

```
I'm about to publish v0.2.0 of my mod. The previous version is
v0.1.0.

Read `git log v0.1.0..HEAD --oneline` (or `git log --since
"v0.1.0"` if there's no tag) and generate:

1. CHANGELOG.md (or append to existing CHANGELOG at the top):
   ```
   ## v0.2.0 - YYYY-MM-DD

   ### Added
   - ...

   ### Changed
   - ...

   ### Fixed
   - ...
   ```

2. "Steam Workshop description" version (short markdown, max
   500 chars) ready to paste to the item's page on Update Item.

Bump convention:
- patch (0.1.0 → 0.1.1): only bug fixes.
- minor (0.1.0 → 0.2.0): non-breaking features. Settings
  preserved on update.
- major (0.1.0 → 1.0.0): breaks. **Settings RESET
  automatically on update.**

If the commits indicate something that breaks (binding rename,
change in mod.json#permissions), warn me before generating —
maybe it should be 1.0.0 instead of 0.2.0.
```

**Touches**: `CHANGELOG.md` (new or append).

**What YOU should review**:
- If Claude detected a breaking change, **trust it** — evaluate
  if MAJOR is correct. Resetting player settings is not
  trivial.
- The "Steam Workshop description" gets short on details
  easily. If you want it detailed, refine manually.

---

### 3.3 — Generate mod README.md

~~~
Generate a professional README.md for my mod, reading mod.json
and src/. Structure:

# {metadata.name}

[Badge `mod for Snake Classic`] [Badge `v0.1.0`] [Badge `MIT`]

{metadata.description in 1-2 sentences}

## What it does

[3-5 bullets describing each feature, pulling from the code]

## Screenshots

![](screenshots/01.png)
![](screenshots/02.png)

## Install

### Via Steam Workshop

1. Subscribe at {link}.
2. Open Snake Classic. The mod appears in Settings → Mods.

### Manual sideload

```bash
git clone {repo}
pnpm install && pnpm build
# Copy to userData/snake-classic/mods/{modId}/
```

## Permissions

List each permission from mod.json with its rationale,
formatted as a table.

## Credits

- Author: {metadata.author}
- License: {metadata.license}
- Built with Snake Classic mod framework
  (https://leteoworks.github.io/mod-portal-snake-classic).

## Changelog

See CHANGELOG.md.

DO NOT invent features not in the code. If a section doesn't
apply, omit it.
~~~

**Touches**: `README.md` (overwrite if exists).

**What YOU should review**:
- The `repo URL` for the Manual sideload section — Claude
  doesn't know it. Edit it.
- The Steam Workshop `<link>` — placeholder. Edit it when you
  have the Workshop ID.

---

## How to add prompts to this gallery

If you have a tested prompt that works well and isn't here, open
a PR against
[`leteoworks/mod-portal-snake-classic`](https://github.com/leteoworks/mod-portal-snake-classic)
adding an entry in this `example-prompts.md`. Include:

- Copy-paste prompt text.
- Level (1/2/3).
- Which files it touches.
- What to review manually after.
- Typical risks and how to detect them.

We keep the gallery short and quality-focused — better 10
tested prompts than 50 hallucinated ones.
