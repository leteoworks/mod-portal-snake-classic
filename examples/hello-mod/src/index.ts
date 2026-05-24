/**
 * Hello Mod — punto de partida minimo.
 *
 * Aporta un tab en Settings → Mods con un toggle "Mostrar saludo".
 * Cuando el toggle esta activo + comienza una partida, imprime un
 * log via host.log.info.
 *
 * Estructura canonica del entry source:
 *   1. registerHook('onActivate', ...) — registra UI + suscripciones.
 *   2. registerHook('onDeactivate', ...) — cleanup opcional.
 *
 * `host` es global ambient (ver globals.d.ts). NO importar.
 */

/// <reference path="./globals.d.ts" />

interface ModState {
  showGreeting: boolean;
}

const DEFAULT_STATE: ModState = {
  showGreeting: true,
};

async function loadState(): Promise<ModState> {
  if (!host.storage) return DEFAULT_STATE;
  const result = await host.storage.get('state');
  if (result.ok && result.value) {
    return { ...DEFAULT_STATE, ...(result.value as Partial<ModState>) };
  }
  return DEFAULT_STATE;
}

async function saveState(state: ModState): Promise<void> {
  if (!host.storage) return;
  await host.storage.set('state', state);
}

host.registerHook('onActivate', async () => {
  const state = await loadState();

  host.registerSettingsTab?.({
    id: 'hello-mod',
    title: 'Hello Mod',
    icon: 'wave',
    body: [
      { kind: 'heading', level: 2, text: 'Hello Mod 👋' },
      {
        kind: 'paragraph',
        text:
          'Mod de ejemplo. Activa el toggle y empieza una partida '
          + 'para ver el log en la consola del juego.',
      },
      {
        kind: 'toggle',
        label: 'Mostrar saludo en cada partida',
        value: state.showGreeting,
        onChange: async (next: boolean) => {
          state.showGreeting = next;
          await saveState(state);
        },
      },
    ],
  });

  host.subscribeEvent('GAME_STARTED', () => {
    if (state.showGreeting) {
      host.log.info('[hello-mod] hola, jugador 👋');
    }
  });
});

host.registerHook('onDeactivate', () => {
  host.log.info('[hello-mod] adios');
});
