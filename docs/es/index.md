<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm mods:sync-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

---
layout: home

hero:
  name: Mods para Snake Classic
  text: Doc oficial para autores de mods.
  tagline: |
    Personaliza power-ups, velocidad, progresión y UI sin compilar el
    juego. Sandbox por diseño, compatible con cualquier bundle del
    estudio (standalone + Classics Reloaded).
  actions:
    - theme: brand
      text: Empezar
      link: /es/tutorial/01-hello-mod
    - theme: alt
      text: Mira el template
      link: https://github.com/leteoworks/mod-template-snake-classic
    - theme: alt
      text: Steam Workshop
      link: https://steamcommunity.com/app/TBD/workshop/

features:
  - icon: 📦
    title: Manifest declarativo
    details: |
      Un solo `mod.json` describe permisos, engine, eventos, settings UI,
      assets, i18n. El framework valida con Zod antes de cargar.
    link: /es/manifest-format
  - icon: 🎛️
    title: UI con componentes oficiales
    details: |
      No tienes que pelear con CSS. Declara tabs/sliders/toggles con
      tokens semánticos y el juego renderiza con su look coherente.
    link: /storybook/index.html
  - icon: 🔐
    title: Sandbox por diseño
    details: |
      Sin `fetch`, sin `window`, sin `require`. El host expone una API
      controlada y el juego garantiza que un mod no puede tirarlo.
    link: /es/api-reference
  - icon: 🚀
    title: Workshop nativo
    details: |
      Publica desde Steam → un `.zip` con tu manifest + dist y listo.
      Auto-update, auto-discovery, kill-switch reactivo del estudio.
    link: /es/publishing
  - icon: 🧩
    title: Multi-engine
    details: |
      Elige el motor según tus necesidades. QuickJS por defecto;
      isolated-vm, iframe-sandbox, web-worker-offscreen-canvas u otros
      según features.
    link: /es/multi-engine
  - icon: 🎯
    title: Targeting al `gameId`
    details: |
      Tu mod apunta a `snake-classic` y funciona en cualquier bundle
      que monte el juego (standalone, Classics Reloaded…). Sin
      duplicar publicaciones.
    link: /es/targeting-games
---

## ¿Qué encontrarás aquí?

- **Tutoriales** paso a paso para tu primer mod.
- **Referencia completa** del `mod.json` y del `HostBridge`.
- **Catálogo visual** de componentes UI declarativos disponibles.
- **Guía de publicación** a Steam Workshop (incluyendo flow de
  verificación opcional cuando se active).
- **Ejemplos reales** clonables — empezando por el mod oficial
  "Fun Config" que sirve de referencia viva.

## ¿Quién mantiene esto?

El portal lo mantiene el equipo de Leteo Works. Issues, sugerencias y
PRs vienen por GitHub. Bugs del juego o del runtime van por el repo
principal; bugs de docs vienen aquí.

## Conducta esperada de la comunidad

Mods que ejecuten malware, doxxen jugadores, o filtren datos serán
**reportados a Steam y kill-switch-eados** desde nuestro panel de
operación. El sandbox del runtime ya impide la mayoría de vectores,
pero la responsabilidad final es del modder.

Para todo lo demás: enjoy + experimenta sin miedo. Hacer mods debe ser
divertido.
