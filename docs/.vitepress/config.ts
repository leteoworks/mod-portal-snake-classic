/**
 * Vitepress config del portal Snake Classic — bilingüe (en/es).
 *
 * Default = English (modders Steam son audiencia global). Español
 * disponible bajo `/es/`. Selector automático aparece en el navbar.
 *
 * Base path apunta a `/mod-portal-snake-classic/` que es el path
 * default de GitHub Pages para
 * `leteoworks.github.io/mod-portal-snake-classic/`.
 */

import { defineConfig } from 'vitepress';

// ── Shared: ignoreDeadLinks para paths del monorepo que el sync
// copia tal cual y el modder no puede resolver desde el portal.
const SHARED_IGNORE_DEAD_LINKS = [
  /^\/storybook\//,
  /(?:^|\/)(\.\.\/)+game-mods\//,
  /(?:^|\/)(\.\.\/)+src\//,
  /(?:^|\/)(\.\.\/)+scaffolds\//,
  /(?:^|\/)(\.\.\/)+games\//,
];

// ── EN (default) sidebar/nav ───────────────────────────────
const navEn = [
  { text: 'Tutorial', link: '/tutorial/01-hello-mod' },
  { text: 'Cookbook', link: '/cookbook' },
  { text: 'API', link: '/api-reference' },
  { text: 'Publish', link: '/publishing' },
  { text: 'Featured', link: '/featured' },
  {
    text: 'Repos',
    items: [
      {
        text: 'Mod template (clone)',
        link: 'https://github.com/leteoworks/mod-template-snake-classic',
      },
      {
        text: 'Steam Workshop',
        link: 'https://steamcommunity.com/app/TBD/workshop/',
      },
      {
        text: 'Snake Classic — Steam',
        link: 'https://store.steampowered.com/app/TBD/',
      },
    ],
  },
];

const sidebarEn = [
  {
    text: 'Introduction',
    items: [
      { text: 'Welcome', link: '/' },
      { text: 'Before you start', link: '/getting-started' },
    ],
  },
  {
    text: 'Step-by-step course',
    collapsed: false,
    items: [
      { text: '1. Your first mod in 10 min', link: '/tutorial/01-hello-mod' },
      { text: '2. Slider that tunes the game', link: '/tutorial/02-slider-tunable' },
      { text: '3. React to game events', link: '/tutorial/03-game-events' },
      { text: '4. Power-ups (Snake-specific)', link: '/tutorial/04-power-ups' },
      { text: '5. Release to Workshop', link: '/tutorial/05-release-ready' },
    ],
  },
  {
    text: 'Practical',
    items: [
      { text: 'Cookbook (recipes)', link: '/cookbook' },
      { text: 'Troubleshooting', link: '/troubleshooting' },
    ],
  },
  {
    text: 'Reference',
    items: [
      { text: 'Manifest format', link: '/manifest-format' },
      { text: 'API reference', link: '/api-reference' },
      { text: 'Multi-engine', link: '/multi-engine' },
      { text: 'Targeting games', link: '/targeting-games' },
      { text: 'In-game wiki for your mod', link: '/mod-wiki' },
    ],
  },
  {
    text: 'Publish and operate',
    items: [
      { text: 'Publishing to Workshop', link: '/publishing' },
      { text: 'Host API changelog', link: '/host-api-changelog' },
    ],
  },
  {
    text: 'Community',
    items: [
      { text: 'Featured mods', link: '/featured' },
    ],
  },
  {
    text: 'UI catalog',
    items: [
      {
        text: 'Storybook (UI components)',
        link: '/storybook/index.html',
        target: '_self',
      },
      { text: 'catalog.json', link: '/catalog.json' },
    ],
  },
  {
    text: 'Examples',
    items: [
      { text: 'Hello mod', link: '/examples/hello-mod' },
    ],
  },
];

// ── ES (secondary) sidebar/nav ─────────────────────────────
const navEs = [
  { text: 'Tutorial', link: '/es/tutorial/01-hello-mod' },
  { text: 'Recetas', link: '/es/cookbook' },
  { text: 'API', link: '/es/api-reference' },
  { text: 'Publicar', link: '/es/publishing' },
  { text: 'Destacados', link: '/es/featured' },
  {
    text: 'Repos',
    items: [
      {
        text: 'Mod template (clonable)',
        link: 'https://github.com/leteoworks/mod-template-snake-classic',
      },
      {
        text: 'Steam Workshop',
        link: 'https://steamcommunity.com/app/TBD/workshop/',
      },
      {
        text: 'Snake Classic — Steam',
        link: 'https://store.steampowered.com/app/TBD/',
      },
    ],
  },
];

const sidebarEs = [
  {
    text: 'Introducción',
    items: [
      { text: 'Bienvenida', link: '/es/' },
      { text: 'Antes de empezar', link: '/es/getting-started' },
    ],
  },
  {
    text: 'Curso paso a paso',
    collapsed: false,
    items: [
      { text: '1. Tu primer mod en 10 min', link: '/es/tutorial/01-hello-mod' },
      { text: '2. Slider que cambia el juego', link: '/es/tutorial/02-slider-tunable' },
      { text: '3. Reaccionar a eventos', link: '/es/tutorial/03-game-events' },
      { text: '4. Power-ups (Snake)', link: '/es/tutorial/04-power-ups' },
      { text: '5. Release a Workshop', link: '/es/tutorial/05-release-ready' },
    ],
  },
  {
    text: 'Práctico',
    items: [
      { text: 'Recetas (cookbook)', link: '/es/cookbook' },
      { text: 'Troubleshooting', link: '/es/troubleshooting' },
    ],
  },
  {
    text: 'Referencia',
    items: [
      { text: 'Manifest format', link: '/es/manifest-format' },
      { text: 'API reference', link: '/es/api-reference' },
      { text: 'Multi-engine', link: '/es/multi-engine' },
      { text: 'Targeting games', link: '/es/targeting-games' },
      { text: 'Wiki in-game de tu mod', link: '/es/mod-wiki' },
    ],
  },
  {
    text: 'Publicar y operar',
    items: [
      { text: 'Publishing a Workshop', link: '/es/publishing' },
      { text: 'Host API changelog', link: '/es/host-api-changelog' },
    ],
  },
  {
    text: 'Comunidad',
    items: [
      { text: 'Mods destacados', link: '/es/featured' },
    ],
  },
  {
    text: 'UI catalog',
    items: [
      {
        text: 'Storybook (componentes UI)',
        link: '/storybook/index.html',
        target: '_self',
      },
      { text: 'catalog.json', link: '/catalog.json' },
    ],
  },
  {
    text: 'Ejemplos',
    items: [
      { text: 'Hello mod', link: '/examples/hello-mod' },
    ],
  },
];

// ── Config ─────────────────────────────────────────────────
export default defineConfig({
  base: '/mod-portal-snake-classic/',
  cleanUrls: true,
  ignoreDeadLinks: SHARED_IGNORE_DEAD_LINKS,

  // Selector de idioma automático en el navbar (Vitepress nativo).
  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      title: 'Snake Classic Mods',
      description:
        'Official docs for creating Snake Classic mods — '
        + 'manifest, API, UI components, Steam Workshop publishing.',
      themeConfig: {
        siteTitle: 'Mods · Snake Classic',
        nav: navEn,
        sidebar: sidebarEn,
        footer: {
          message: 'Maintained by Leteo Works.',
          copyright:
            '© 2026 Leteo Works. Third-party mods are owned by their authors.',
        },
        socialLinks: [
          {
            icon: 'github',
            link: 'https://github.com/leteoworks/mod-portal-snake-classic',
          },
        ],
        editLink: {
          pattern:
            'https://github.com/leteoworks/mod-portal-snake-classic/edit/main/docs/:path',
          text: 'Suggest edit',
        },
      },
    },
    es: {
      label: 'Español',
      lang: 'es-ES',
      title: 'Mods para Snake Classic',
      description:
        'Documentación oficial para crear mods de Snake Classic — '
        + 'manifest, API, componentes UI, publicación a Steam Workshop.',
      themeConfig: {
        siteTitle: 'Mods · Snake Classic',
        nav: navEs,
        sidebar: sidebarEs,
        footer: {
          message: 'Mantenido por el equipo de Leteo Works.',
          copyright:
            '© 2026 Leteo Works. Mods third-party son propiedad de sus autores.',
        },
        socialLinks: [
          {
            icon: 'github',
            link: 'https://github.com/leteoworks/mod-portal-snake-classic',
          },
        ],
        editLink: {
          pattern:
            'https://github.com/leteoworks/mod-portal-snake-classic/edit/main/docs/:path',
          text: 'Sugerir edición',
        },
      },
    },
  },
});
