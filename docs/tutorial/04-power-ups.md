<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm mods:sync-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# Lección 4 — Personalizar power-ups (Snake-specific)

Objetivo: añadir a tu mod 22 toggles (uno por power-up de Snake)
que el jugador puede activar/desactivar individualmente, más un
slider que controla la frecuencia de spawn global. Patrón canónico:
**array de definiciones → UI auto-generada**.

> Disclaimer: esta lección es **específica de Snake Classic**. Cada
> juego mod-compatible expone sus tunables propios. Lo que aprendes
> aquí (patrón array→UI, callHostFn por toggle, preset que aplica
> un set) es transferible — solo cambian los nombres.
>
> Código de referencia 1:1: [`studio.fun-config`](https://github.com/leteoworks/my-game-fw-mods/tree/main/snake-classic/studio.fun-config)
> hace exactamente lo de esta lección en producción.

---

## El catálogo de power-ups de Snake

Snake Classic tiene **22 power-ups**. Cada uno se controla con un
tunable booleano `powerup<Name>Enabled`. Si está `false`, ese
power-up no aparece en partida.

| ID interno | Nombre |
|---|---|
| `powerupSpeedBoostEnabled` | Speed Boost |
| `powerupInvincibilityEnabled` | Invincibility |
| `powerupDoublePointsEnabled` | Double Points |
| `powerupMagnetEnabled` | Magnet |
| `powerupShrinkEnabled` | Shrink |
| `powerupGhostEnabled` | Ghost |
| `powerupGoldenAppleEnabled` | Golden Apple |
| `powerupDemolitionEnabled` | Demolition |
| `powerupEarthquakeEnabled` | Earthquake |
| `powerupBombPickupEnabled` | Bomb Pickup |
| `powerupBrickBlastEnabled` | Brick Blast |
| `powerupExtraLifeEnabled` | Extra Life |
| `powerupSummonSnakeEnabled` | Summon Snake |
| `powerupBlindfoldEnabled` | Blindfold |
| `powerupFragileWallEnabled` | Fragile Wall |
| `powerupBrickRevivalEnabled` | Brick Revival |
| `powerupPortalEnabled` | Portal |
| `powerupDemonEnabled` | Demon |
| `powerupBaseballBatEnabled` | Baseball Bat |
| `powerupDoubleLengthEnabled` | Double Length |
| `powerupRainbowHeartEnabled` | Rainbow Heart |
| `powerupTimeTravelEnabled` | Time Travel |

Y un tunable extra `powerupIntervalMs` (number, 1000-30000) que
controla **cada cuántos ms** aparece un nuevo power-up en pantalla.

---

## 1 — Definir el array de toggles

`src/toggles.ts`:

```ts
export interface PowerUpToggle {
  binding: string;
  i18nKey: string;
  fallback: string;
}

export const POWER_UP_TOGGLES: PowerUpToggle[] = [
  { binding: 'tunables.powerupSpeedBoostEnabled',
    i18nKey: 'mymod.powerups.speedBoost', fallback: 'Speed Boost' },
  { binding: 'tunables.powerupInvincibilityEnabled',
    i18nKey: 'mymod.powerups.invincibility', fallback: 'Invincibility' },
  { binding: 'tunables.powerupDoublePointsEnabled',
    i18nKey: 'mymod.powerups.doublePoints', fallback: 'Double Points' },
  // … 19 más
  { binding: 'tunables.powerupTimeTravelEnabled',
    i18nKey: 'mymod.powerups.timeTravel', fallback: 'Time Travel' },
];
```

El patrón "array de definiciones" es la base. Si el juego añade un
power-up nuevo en una futura versión, basta extender el array.

---

## 2 — Construir el tab dinámicamente

`src/settings-tab.ts`:

```ts
import { POWER_UP_TOGGLES } from './toggles';

function t(key: string, fallback: string): string {
  return host.i18n?.t(key) ?? fallback;
}

export function buildSettingsTab() {
  const toggleChildren = POWER_UP_TOGGLES.map((toggle) => ({
    kind: 'toggle' as const,
    label: t(toggle.i18nKey, toggle.fallback),
    binding: toggle.binding,
  }));

  return {
    id: 'mymod-powerups',
    title: t('mymod.tab.title', 'Power-Up Mixer'),
    icon: 'extension',
    sections: [
      {
        kind: 'card',
        title: t('mymod.section.spawn', 'Frecuencia'),
        children: [{
          kind: 'slider',
          label: t('mymod.spawn.label', 'Intervalo entre power-ups (ms)'),
          min: 1000,
          max: 30000,
          step: 500,
          binding: 'tunables.powerupIntervalMs',
        }],
      },
      {
        kind: 'card',
        title: t('mymod.section.toggles', 'Power-ups activos'),
        children: toggleChildren,
      },
    ],
  };
}
```

Cada toggle con `binding: 'tunables.powerup<X>Enabled'` se conecta
automáticamente: cuando el jugador lo cambia, el runtime llama a
`gameConfigSet({ name: 'powerup<X>Enabled', value: true|false })`
sin que tu código intervenga.

`src/index.ts`:

```ts
import { buildSettingsTab } from './settings-tab';

host.registerSettingsTab?.(buildSettingsTab());

host.log.info('[mymod] Power-up mixer cargado.');
```

---

## 3 — Permisos en `mod.json`

```json
"permissions": [
  {
    "type": "settings-ui",
    "maxTabs": 1,
    "rationale": "Aporta un tab para activar/desactivar power-ups."
  },
  {
    "type": "game-specific",
    "surface": "tunables",
    "actions": ["set", "reset"],
    "rationale": "Activa/desactiva cada power-up individualmente."
  },
  {
    "type": "storage",
    "quotaKb": 32,
    "rationale": "Guarda la selección del jugador."
  },
  {
    "type": "i18n",
    "namespaces": ["mymod"],
    "rationale": "Traduce los labels de los 22 power-ups."
  }
]
```

---

## 4 — Presets: aplicar un set completo de una vez

Patrón típico: 3 botones "Classic / Casual / Hardcore" que aplican
combinaciones predefinidas.

`src/presets.ts`:

```ts
export type PresetName = 'classic' | 'casual' | 'hardcore';

export const PRESETS: Record<PresetName, Record<string, boolean | number>> = {
  classic: {
    powerupSpeedBoostEnabled: true,
    powerupDoublePointsEnabled: true,
    powerupExtraLifeEnabled: true,
    // resto false
    powerupIntervalMs: 8000,
  },
  casual: {
    // todos los benignos ON
    powerupSpeedBoostEnabled: true,
    powerupInvincibilityEnabled: true,
    powerupMagnetEnabled: true,
    powerupGoldenAppleEnabled: true,
    powerupExtraLifeEnabled: true,
    powerupRainbowHeartEnabled: true,
    powerupIntervalMs: 5000,
  },
  hardcore: {
    // solo los desafíos hostiles
    powerupBombPickupEnabled: true,
    powerupBlindfoldEnabled: true,
    powerupDemonEnabled: true,
    powerupTimeTravelEnabled: true,
    powerupIntervalMs: 3000,
  },
};
```

Botones en el tab:

```ts
{
  kind: 'card',
  title: t('mymod.section.presets', 'Presets'),
  children: [
    {
      kind: 'button',
      label: t('mymod.preset.classic', 'Classic'),
      variant: 'primary',
      action: { kind: 'event', name: 'MYMOD_APPLY_PRESET',
        payload: { preset: 'classic' } },
    },
    {
      kind: 'button',
      label: t('mymod.preset.casual', 'Casual'),
      variant: 'secondary',
      action: { kind: 'event', name: 'MYMOD_APPLY_PRESET',
        payload: { preset: 'casual' } },
    },
    {
      kind: 'button',
      label: t('mymod.preset.hardcore', 'Hardcore'),
      variant: 'secondary',
      action: { kind: 'event', name: 'MYMOD_APPLY_PRESET',
        payload: { preset: 'hardcore' } },
    },
  ],
}
```

Handler:

```ts
import { POWER_UP_TOGGLES } from './toggles';
import { PRESETS, type PresetName } from './presets';

host.subscribeEvent('MYMOD_APPLY_PRESET', async (payload) => {
  const name = (payload as { preset?: string })?.preset as PresetName;
  if (!PRESETS[name]) return;

  // 1. Reset TODOS los toggles a false (estado limpio).
  for (const toggle of POWER_UP_TOGGLES) {
    const tunableName = toggle.binding.replace(/^tunables\./, '');
    await host.callHostFn('gameConfigSet', {
      name: tunableName, value: false,
    });
  }

  // 2. Aplicar el preset (solo las keys que define).
  for (const [name, value] of Object.entries(PRESETS[name])) {
    await host.callHostFn('gameConfigSet', { name, value });
    // Persistir para que los toggles de la UI muestren el estado.
    await host.storage?.set(`tunables.${name}`, value);
  }

  host.dispatch('MOD_NOTIFICATION', {
    text: `Preset "${name}" aplicado.`,
    kind: 'success',
  });
});
```

Permisos extra:

```json
{
  "type": "events",
  "subscribe": ["MYMOD_APPLY_PRESET"],
  "dispatch": ["MOD_NOTIFICATION"],
  "rationale": "Reacciona a los botones de preset y notifica al jugador."
}
```

---

## 5 — Performance: aplicar en bloque

Cada `callHostFn` cruza el límite del sandbox y tiene un coste de
~0.5-1 ms. Aplicar el preset hace 22 calls (reset) + N calls
(apply). Para no congelar la UI:

```ts
// Lanza todas las promesas y espera con Promise.all
await Promise.all(
  POWER_UP_TOGGLES.map((t) =>
    host.callHostFn('gameConfigSet', {
      name: t.binding.replace(/^tunables\./, ''),
      value: false,
    })
  )
);
```

Pasa de ~22 ms serial a ~3-5 ms paralelo. Patrón válido cuando los
host calls son idempotentes (orden no importa) — como aquí.

---

## 6 — Caveat: target.gameId

Este mod **solo funciona en Snake Classic**. Si lo activas en otro
juego del framework (Dices & Destiny, Pong…), `callHostFn` para los
tunables específicos de Snake rechazará con `not-found`. Por eso
declaras:

```json
"target": { "gameId": "snake-classic", "gameVersion": "^1.0.0" }
```

El loader rechaza activar el mod si el `gameId` no coincide. Cero
crash silencioso.

---

## Lo que has aprendido

- **Patrón array → UI auto-generada** — 22 toggles desde un array
  de 22 definiciones.
- **`binding: 'tunables.<name>'`** se conecta automático sin
  handler.
- **Presets como evento + handler** que aplica N tunables en
  bloque con `Promise.all`.
- **`target.gameId`** previene activación cross-game.
- **`host.dispatch('MOD_NOTIFICATION')`** para confirmar al
  jugador.

## Lo que viene

[**Lección 5 — Llevar tu mod a Workshop**](05-release-ready.md).
i18n, icono, validación local, pack, upload. Checklist de release.
