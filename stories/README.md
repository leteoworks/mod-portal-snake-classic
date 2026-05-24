# Storybook — UI catalog (Snake Classic)

Stories Storybook de:

- **Framework components** (toggle, slider, select, group, etc.) —
  catálogo de `@modules/mod-ui-components` del monorepo.
- **Snake-specific** (`snake.power-up-card`, `snake.speed-curve-editor`).
- **Recipes** — ejemplos compuestos (settings tab, stats dashboard,
  config modal).

## Estado W2

**Skeleton solo**. El catálogo machine-readable vive en
`../catalog.json`. La implementación visual del catálogo (Vue
components + tokens visuales del juego para que el render sea
fidedigno a Snake Classic) se difiere a iteraciones posteriores.

Razón: el catálogo `@modules/mod-ui-components` del monorepo aún es
un skeleton (FASE 3 del roadmap del runtime previo, pendiente de
implementar fuera del alcance de este agente). Cuando ese catálogo
materialice los componentes Vue reales, este Storybook los importa y
los renderiza con los tokens del juego.

## Cómo añadir una story (futuro)

```ts
// stories/framework/toggle.stories.ts
import type { Meta, StoryObj } from '@storybook/vue3';
import { ModToggle } from '@leteoworks/mod-ui-components';

const meta: Meta<typeof ModToggle> = {
  title: 'Framework/Toggle',
  component: ModToggle,
};
export default meta;

export const Default: StoryObj = {
  args: { label: 'Activar Mega Fruit', value: true },
};
```

## Cross-links

- [Mod UI component system (monorepo)](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/architecture/mod-ui-component-system.md)
- [catalog.json](../catalog.json)
