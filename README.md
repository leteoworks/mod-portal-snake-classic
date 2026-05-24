# Mod Portal — Snake Classic

Portal público de documentación para autores de mods de Snake Classic.

> **Estado**: repo público en `leteoworks/mod-portal-snake-classic`
> (activo desde 2026-05-24). Submódulo del monorepo
> `leteoworks/my-game-fw-mods-main` bajo `mod-portals/snake-classic/`.
> Decisiones D-PORTAL-1..4 en
> [`docs/coordination/mod-portal-snake-classic-roadmap.md`](https://github.com/leteoworks/my-game-fw-mods-main/blob/feature/mods-main/docs/coordination/mod-portal-snake-classic-roadmap.md)
> del monorepo.

Incluye:

- **Docs Vitepress** — getting started, manifest format, publishing,
  API reference, multi-engine, addressing games. Sincronizadas desde
  `docs/mods/mod-development/` del monorepo vía
  `pnpm sync:mod-portal-docs`.
- **Storybook UI catalog** — stories de los componentes framework-level
  y los específicos de Snake Classic. (Skeleton W2; implementación
  completa diferida — ver `stories/README.md`.)
- **host-api-changelog.md** — SemVer del `HostBridge` expuesto a mods.
- **examples/** — mods clonables que sirven de plantilla viva.
- **catalog.json** — catálogo machine-readable para tooling externo.

Spec normativa:
[mods-workshop-ecosystem-roadmap.md §4.8](../../docs/coordination/mods-workshop-ecosystem-roadmap.md).

---

## Migración a submódulo git — completada 2026-05-24

Este repo se promovió de subcarpeta del monorepo a submódulo en
`feature/mod-portal-snake-classic-day1` siguiendo el patrón de
`game-mods/` (commit `25e6f9e4`). Workflow operativo a partir de
ahora:

- **Cambios en docs/UI del portal**: commit + push aquí. Luego desde
  el monorepo: `git submodule update --remote mod-portals/snake-classic`
  y commit del bump de SHA.
- **Clonar el monorepo**: `git clone --recursive <url>` o
  `git submodule update --init --recursive` tras clonado normal.

---

## Desarrollo local

```bash
cd mod-portals/snake-classic
pnpm install
pnpm dev               # vitepress dev server en http://localhost:5173
pnpm build             # genera dist/ estático
pnpm preview           # sirve dist/ para inspección
```

---

## Sincronización de docs canónicas

Las docs en `mod-portals/snake-classic/docs/` son **mirror** de
`docs/mods/mod-development/` del monorepo. NO editar directamente
aquí — editar en el monorepo y resincronizar:

```bash
# Desde la raíz del monorepo:
pnpm sync:mod-portal-docs
```

Esto copia los .md fuente → `docs/`, sustituyendo enlaces relativos
`../security/*` por enlaces absolutos al repo GitHub
(`docs/security/*` no existe en el portal; los modders no necesitan
ver kill-switch/incident-response).

CI del portal valida que el sync esté al día (falla si los `.md` del
portal divergen del monorepo en >N commits).

---

## Deploy a GitHub Pages

Workflow `.github/workflows/deploy.yml` ejecuta:

1. `pnpm install`
2. `pnpm build`
3. Publica `dist/` a la branch `gh-pages`.

URL pública: `https://leteoworks.github.io/mod-portal-snake-classic/`
(D-PORTAL-4: GitHub Pages default; migrable a dominio propio).

---

## Cross-links

- Roadmap del ecosistema:
  [mods-workshop-ecosystem-roadmap.md](../../docs/coordination/mods-workshop-ecosystem-roadmap.md)
- Filosofía:
  [philosophy.md](../../docs/mods/philosophy.md)
- Spec UI components:
  [mod-ui-component-system.md](../../docs/mods/architecture/mod-ui-component-system.md)
