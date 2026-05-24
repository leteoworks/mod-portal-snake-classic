<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm mods:sync-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# Choose an engine for your mod

Your mod declares which engine it needs in `mod.json`. This guide
helps you pick the right one.

> Technical context for each engine: [../engines/](https://github.com/leteoworks/my-game-fw/tree/main/docs/mods/engines).

---

## The key question

**What does your mod do?** The answer dictates the engine.

| Your mod… | Recommended engine |
|---|---|
| Adds settings tabs with forms | `quickjs-declarative-ui` |
| Is just logic (listens to events, modifies parameters) | `isolated-vm` (Electron) or `quickjs` (cross-platform) |
| Adds rich HTML UI (dashboards, charts) | `iframe-sandbox` |
| Has its own canvas visualization | `web-worker-offscreen-canvas` |
| Is perf-critical and trusted | `ses-compartment` |

---

## Field shape

```json
"engine": {
  "preferred": "quickjs-declarative-ui",
  "fallbacks": ["isolated-vm", "quickjs"]
}
```

- `preferred`: engine the framework tries first.
- `fallbacks`: if `preferred` is unavailable (not in the game's
  `policy.engines`, kill-switched, or not on the platform), the
  loader tries these in order.

Valid engine list: see
[../architecture/mod-engine-capability.md § "EngineId"](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/architecture/mod-engine-capability.md).

---

## Useful fallbacks

### "I want it to work on all platforms"

```json
"engine": {
  "preferred": "isolated-vm",
  "fallbacks": ["quickjs", "quickjs-declarative-ui"]
}
```

isolated-vm is ideal on Electron; quickjs works on all. If the
build is mobile bundled-only, isolated-vm doesn't exist →
fallback to quickjs.

### "I want max perf if the studio trusts me"

```json
"engine": {
  "preferred": "ses-compartment",
  "fallbacks": ["isolated-vm", "quickjs"]
}
```

SES is fast but shares the heap. If the game doesn't allow it
(because it doesn't trust mods), fallback to isolated-vm/quickjs.

### "I need HTML UI; without it the mod doesn't make sense"

```json
"engine": {
  "preferred": "iframe-sandbox",
  "fallbacks": []
}
```

Empty list: if iframe isn't available, the mod is marked
`incompatible`. Better than an inadequate fallback.

---

## Per-engine restrictions

### isolated-vm

- Electron only. On web/iOS/Android it doesn't exist.
- If you publish an isolated-vm-only mod, mark it clearly
  "Electron only" in metadata.

### web-worker-offscreen-canvas

- Worker has `fetch` by default, but the framework removes it
  before loading your mod. If your mod tries `fetch(...)` directly,
  it'll throw `ReferenceError`. Use `host.http` instead.

### iframe-sandbox

- No `allow-same-origin`. You can't access the game's
  localStorage, cookies, or parents.
- Strict CSP. No `connect-src` for direct external hosts; HTTP
  goes through `host.http`.

### quickjs / quickjs-declarative-ui

- No DOM. If you need DOM, prefer iframe.
- Marshalling per call. For 10k calls/sec, batch.

### ses-compartment

- Same heap. An infinite loop hangs the game.
- Only suitable if the studio assigns you an elevated trust tier.

### shadow-realm

- Irregular availability (2026). The framework detects at
  runtime; if not present, fallback.

---

## How to check that your engine is supported

The game documents its accepted engines in its
host-api-changelog. If it doesn't appear there, it isn't
supported by that game — use a fallback or pick another engine.

---

## Summary

- Pick the engine based on what your mod **does**.
- Set reasonable fallbacks — a mod without fallbacks fails if the
  preferred engine isn't available.
- If your mod critically depends on capabilities of a specific
  engine, don't set misleading fallbacks: prefer an empty list +
  clear message.
- Cross-platform engines (quickjs, quickjs-declarative-ui,
  ses-compartment, iframe, worker, shadow-realm) are the
  broadest option. isolated-vm is Electron only.
