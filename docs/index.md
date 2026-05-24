<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm mods:sync-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

---
layout: home

hero:
  name: Snake Classic Mods
  text: Official docs for mod authors.
  tagline: |
    Customize power-ups, speed, progression, and UI without
    compiling the game. Sandboxed by design, compatible with any
    studio bundle (standalone + Classics Reloaded).
  actions:
    - theme: brand
      text: Get started
      link: /tutorial/01-hello-mod
    - theme: alt
      text: See the template
      link: https://github.com/leteoworks/mod-template-snake-classic
    - theme: alt
      text: Steam Workshop
      link: https://steamcommunity.com/app/TBD/workshop/

features:
  - icon: 📦
    title: Declarative manifest
    details: |
      A single `mod.json` describes permissions, engine, events,
      settings UI, assets, i18n. The framework validates with Zod
      before loading.
    link: /manifest-format
  - icon: 🎛️
    title: UI with official components
    details: |
      You don't have to fight CSS. Declare tabs/sliders/toggles
      with semantic tokens and the game renders them with its
      coherent look.
    link: /storybook/index.html
  - icon: 🔐
    title: Sandboxed by design
    details: |
      No `fetch`, no `window`, no `require`. The host exposes a
      controlled API and the game guarantees that a mod cannot
      crash it.
    link: /api-reference
  - icon: 🚀
    title: Native Workshop
    details: |
      Publish from Steam → a `.zip` with your manifest + dist and
      you're done. Auto-update, auto-discovery, reactive
      kill-switch from the studio.
    link: /publishing
  - icon: 🧩
    title: Multi-engine
    details: |
      Choose the engine based on your needs. QuickJS by default;
      isolated-vm, iframe-sandbox, web-worker-offscreen-canvas, or
      others depending on features.
    link: /multi-engine
  - icon: 🎯
    title: Targeting by `gameId`
    details: |
      Your mod targets `snake-classic` and works in any bundle
      that mounts the game (standalone, Classics Reloaded…).
      Without duplicating publications.
    link: /targeting-games
---

## What you'll find here

- **Step-by-step tutorials** for your first mod.
- **Full reference** for `mod.json` and the `HostBridge`.
- **Visual catalog** of available declarative UI components.
- **Publishing guide** to Steam Workshop (including the optional
  verification flow when active).
- **Real, clonable examples** — starting with the official
  "Fun Config" mod that serves as a living reference.

## Who maintains this?

The portal is maintained by Leteo Works. Issues, suggestions, and
PRs come via GitHub. Bugs of the game or runtime go to the main
repo; bugs of the docs come here.

## Expected community conduct

Mods that run malware, dox players, or leak data will be
**reported to Steam and kill-switched** from our operations
panel. The runtime sandbox already prevents most vectors, but
the ultimate responsibility is the modder's.

For everything else: enjoy + experiment without fear. Making
mods should be fun.
