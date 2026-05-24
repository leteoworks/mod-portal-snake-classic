<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm mods:sync-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# Lección 2 — Slider que cambia un valor del juego en tiempo real

Objetivo: añadir un slider al tab de tu mod que controle la
**velocidad inicial de Snake** (parámetro `initialSpeedTickMs`).
El cambio se aplica al inicio de cada partida.

> Código de referencia real: [`studio.gameplay-tuner`](https://github.com/leteoworks/mod-template-snake-classic)
> hace exactamente esto con 3 sliders (vidas, velocidad, puntos
> por comida). Puedes mirarlo en cualquier momento.

---

## Concepto nuevo: tunables

Un **tunable** es un valor del juego que está expuesto al sistema
de mods para que lo puedan leer y modificar. Snake Classic expone
~30 tunables hoy (vidas, velocidad, puntos, spawn rates,
intervalos…). El juego decide cuáles expone — desde tu mod los
consumes vía `host.callHostFn`.

**Host functions canónicas para tunables**:

| Función | Qué hace |
|---|---|
| `gameConfigSet({ name, value })` | Aplica un override al tunable `name`. |
| `gameConfigReset({ name })` | Quita el override; vuelve al default del juego. |
| `gameConfigSnapshot()` | Lee todos los tunables activos + sus valores actuales. |

Cada tunable tiene `min`, `max`, `step`, `default` y tipo (`number`,
`boolean`, `string`). Los descubres mirando el descriptor que el
juego registra — o, en práctica, mirando `tunables.ts` del juego en
el monorepo.

---

## 1 — Declarar permiso `game-specific`

En `mod.json`, añade al array de permisos:

```json
{
  "type": "game-specific",
  "surface": "tunables",
  "actions": ["set", "reset", "snapshot"],
  "rationale": "Modifica la velocidad inicial de Snake elegida por el jugador."
}
```

Sin este permiso, `host.callHostFn('gameConfigSet', ...)` rechaza con
`permission-denied`. El jugador lo verá en el prompt de activación.

---

## 2 — Añadir el slider al tab

`src/index.ts`:

```ts
host.registerSettingsTab?.({
  id: 'hello-mod',
  title: 'Hello Mod',
  icon: 'mood',
  sections: [
    {
      kind: 'card',
      title: 'Velocidad',
      children: [
        {
          kind: 'slider',
          label: 'Velocidad inicial (ms/tick)',
          min: 80,
          max: 500,
          step: 10,
          binding: 'tunables.initialSpeedTickMs',
        },
      ],
    },
    {
      kind: 'card',
      title: 'Saludo',
      children: [
        {
          kind: 'toggle',
          label: 'Saludar al terminar la partida',
          binding: 'greetOnGameOver',
        },
      ],
    },
  ],
});
```

**Detalle clave del `binding`**:
- `binding: 'tunables.initialSpeedTickMs'` (con prefijo `tunables.`)
  → el runtime aplica el cambio **automáticamente** vía
  `gameConfigSet` cada vez que el jugador mueve el slider. NO
  necesitas escribir handler.
- `binding: 'greetOnGameOver'` (sin prefijo) → solo escribe al
  `host.storage` del mod. NO toca el juego.

Es decir, el `tunables.` prefix es el "vínculo mágico" entre la UI
de tu mod y los valores del juego. Cualquier otro nombre = storage
del mod.

---

## 3 — Aplicar config al inicio de cada partida

El slider aplica el cambio "en vivo" mientras el jugador lo mueve
en Settings. Pero, ¿qué pasa si el jugador cierra el juego y vuelve
a abrirlo? El valor está persistido en storage, pero el juego
arranca con sus defaults hasta que pase por el slider de nuevo.

Para evitar eso: re-aplica al inicio de cada partida.

```ts
host.subscribeEvent('GAME_STARTED', async () => {
  const result = await host.storage?.get('tunables.initialSpeedTickMs');
  if (result?.ok && typeof result.value === 'number') {
    await host.callHostFn('gameConfigSet', {
      name: 'initialSpeedTickMs',
      value: result.value,
    });
    host.log.debug(
      `[hello-mod] Velocidad inicial aplicada: ${result.value}ms`,
    );
  }
});
```

Añade `"GAME_STARTED"` al `subscribe` del permiso `events` en
`mod.json`.

---

## 4 — Anti-patrón: last-write-wins

Hay una trampa sutil:
- La UI tiene un `binding: 'tunables.initialSpeedTickMs'`. Si lo
  mueves, el runtime escribe a storage Y al juego.
- Tu hook `GAME_STARTED` lee del storage y escribe al juego.

Si el orden es UI-write → hook-read → hook-write, el hook escribe
el mismo valor, no pasa nada. Pero si dos handlers escriben con
distinta lógica, el último gana.

**Regla**: NO mezcles binding directo + hook que escriba la misma
key. Decide uno:
- **Solo binding**: para valores que el jugador edita y se aplican en
  vivo. El juego ya no recibe el cambio al arrancar si reinicia.
- **Solo hook**: para valores derivados o presets que requieren
  cálculo previo.

En este tutorial usamos las dos cosas porque son lecturas
secuenciales sobre la misma key — no compiten. Si añades un botón
"Reset to defaults" que reescribe la key, también va a aplicarse vía
el binding del slider. Coherente.

---

## 5 — Build + test

```bash
pnpm build
# Copiar a sideload (ver Lección 1, paso 5)
```

En el juego:
1. Recarga (los mods se cargan al boot).
2. Tab "Hello Mod" ahora muestra el slider de velocidad.
3. Muévelo → observa el log `[hello-mod] Velocidad inicial aplicada`.
4. Empieza una partida. La velocidad inicial coincide con tu
   slider.

---

## 6 — Reset a defaults

Añade un botón al tab:

```ts
{
  kind: 'card',
  title: 'Acciones',
  children: [{
    kind: 'button',
    label: 'Restaurar velocidad por defecto',
    variant: 'ghost',
    action: { kind: 'event', name: 'HELLO_RESET_SPEED' },
  }],
}
```

Y el handler:

```ts
host.subscribeEvent('HELLO_RESET_SPEED', async () => {
  await host.callHostFn('gameConfigReset', {
    name: 'initialSpeedTickMs',
  });
  // Limpiar también el storage para que el slider muestre el
  // default del juego en el próximo render.
  await host.storage?.remove('tunables.initialSpeedTickMs');
});
```

Añade `"HELLO_RESET_SPEED"` al `subscribe` del permiso `events`.

---

## Lo que has aprendido

- **Tunables**: valores del juego expuestos al mod via host
  functions (`gameConfigSet`/`gameConfigReset`/`gameConfigSnapshot`).
- **Binding con prefijo `tunables.`**: aplica al juego en vivo.
- **Binding sin prefijo**: solo storage del mod.
- **Hook `GAME_STARTED`** para re-aplicar al inicio de cada
  partida (resistente a reinicio del juego).
- **Anti-patrón** last-write-wins entre UI binding + hook.

## Lo que viene

[**Lección 3 — Reaccionar a lo que pasa en partida**](03-game-events.md).
Vas a usar más eventos: `SCORE_CHANGED`, `POWER_UP_PICKED`, etc.
Aprendes `host.state.read` para lectura puntual y
`host.dispatch` para notificaciones in-game.

---

## Apéndice — tunables disponibles en Snake Classic

Lista parcial (ver [`tunables.ts`](https://github.com/leteoworks/my-game-fw/blob/main/src/games/snake-classic/mods/tunables.ts)
del juego para el catálogo completo):

| Tunable | Tipo | Rango | Descripción |
|---|---|---|---|
| `maxLives` | number | 1-50 | Vidas máximas |
| `initialSpeedTickMs` | number | 80-500 | ms entre ticks al inicio |
| `pointsPerFood` | number | 1-100 | Puntos por comida normal |
| `powerupIntervalMs` | number | 1000-30000 | Intervalo entre power-ups |
| `powerup<Name>Enabled` | boolean | - | Activar/desactivar el power-up |

(El catálogo es ~30 tunables. Power-ups son 22 toggles.)

> Si necesitas un tunable que el juego AÚN no expone, abre issue en
> el repo del juego o un PR añadiendo el `defineTunable(...)` en
> `tunables.ts`.
