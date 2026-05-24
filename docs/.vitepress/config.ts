/**
 * Vitepress config del portal Snake Classic.
 *
 * Base path apunta a `/mod-portal-snake-classic/` que es el path
 * default de GitHub Pages para
 * `leteoworks.github.io/mod-portal-snake-classic/`.
 * Si el usuario migra a dominio propio (D-PORTAL-4 reabierto), cambiar
 * `base` y `outDir` queda como deuda de la migración.
 */

import { defineConfig } from 'vitepress';

export default defineConfig({
  base: '/mod-portal-snake-classic/',
  lang: 'es-ES',
  title: 'Mods para Snake Classic',
  description:
    'Documentación oficial para crear mods de Snake Classic — '
    + 'manifest, API, componentes UI, publicación a Steam Workshop.',
  cleanUrls: true,

  // Deuda tecnica: sync-portal-docs.mjs deberia transformar los paths
  // relativos del monorepo en URLs absolutas a GitHub. Mientras tanto,
  // ignoramos los dead links a:
  //   - /storybook/* — catalogo visual diferido (R-PORTAL-7).
  //   - ../../../game-mods/* — subrepo de mods first-party.
  //   - ../../../src/* — codigo del monorepo (no visible al modder).
  //   - ../../../scaffolds/* — templates del monorepo.
  //   - ../../games/* — docs internas del juego.
  ignoreDeadLinks: [
    /^\/storybook\//,
    // Paths relativos del monorepo (con o sin `./` al inicio). El
    // sync los copia tal cual; el modder no puede resolverlos.
    /(?:^|\/)(\.\.\/)+game-mods\//,
    /(?:^|\/)(\.\.\/)+src\//,
    /(?:^|\/)(\.\.\/)+scaffolds\//,
    /(?:^|\/)(\.\.\/)+games\//,
  ],

  themeConfig: {
    siteTitle: 'Mods · Snake Classic',
    nav: [
      { text: 'Empezar', link: '/getting-started' },
      { text: 'Manifest', link: '/manifest-format' },
      { text: 'API', link: '/api-reference' },
      { text: 'Publicar', link: '/publishing' },
      { text: 'Destacados', link: '/featured' },
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
    ],
    sidebar: [
      {
        text: 'Introducción',
        items: [
          { text: 'Bienvenida', link: '/' },
          { text: 'Empezar a hacer mods', link: '/getting-started' },
        ],
      },
      {
        text: 'Manifest y API',
        items: [
          { text: 'manifest-format', link: '/manifest-format' },
          { text: 'API reference', link: '/api-reference' },
          { text: 'Multi-engine', link: '/multi-engine' },
          { text: 'Targeting games', link: '/targeting-games' },
        ],
      },
      {
        text: 'Publicar y operar',
        items: [
          { text: 'Publishing a Workshop', link: '/publishing' },
          { text: 'Host API changelog', link: '/host-api-changelog' },
        ],
      },
      {
        text: 'Comunidad',
        items: [
          { text: 'Mods destacados', link: '/featured' },
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
        text: 'Ejemplos',
        items: [
          { text: 'Hello mod', link: '/examples/hello-mod' },
        ],
      },
    ],
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
});
