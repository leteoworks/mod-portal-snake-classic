<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm mods:sync-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# Lección 3 — Reaccionar a lo que pasa en partida

Objetivo: hacer que tu mod reaccione a varios eventos del juego —
no solo `GAME_OVER` y `GAME_STARTED` de la Lección 1-2, sino el
catálogo completo de eventos comunes. Vas a usar `host.state` para
leer datos del juego sin esperar evento, y `host.dispatch` para
notificar al jugador.

> Código de referencia: cualquier mod del subrepo
> [`game-mods/`](https://github.com/leteoworks/my-game-fw-mods)
> que use `subscribeEvent` con payload tipado.

---

## El modelo mental

El juego emite eventos en momentos clave del ciclo de partida. Tu
mod **se suscribe** a los que necesita y recibe el payload con el
contexto. Más una capacidad de **lectura puntual** del estado
(`host.state.read`) para casos donde necesitas el valor sin esperar
a un evento.

```
Juego (productor)         host bridge        Tu mod (consumidor)
─────────────────         ───────────        ───────────────────
 GAME_STARTED  ────────▶  subscribeEvent ──▶  handler(payload)
 SCORE_CHANGED ────────▶  subscribeEvent ──▶  handler(payload)
 POWER_UP_PICKED ──────▶  subscribeEvent ──▶  handler(payload)
   ⋮                                            ⋮
                                              host.state.read('X')
                          state read ──────▶    (consulta puntual)
```

Permisos: el evento `events` con `subscribe: ['NAME1', 'NAME2', ...]`.
Sin esa entrada para el evento, `subscribeEvent` rechaza.

---

## Catálogo de eventos comunes

Eventos que cualquier juego mod-compatible suele exponer (los
exactos vienen del juego — verifica con su doc):

| Evento | Payload | Cuándo se emite |
|---|---|---|
| `GAME_STARTED` | `{ level, mode }` | Inicio de una partida |
| `GAME_OVER` | `{ finalScore, duration, cause }` | Fin de partida |
| `GAME_PAUSED` / `GAME_RESUMED` | `{}` | Pausa/reanudación |
| `SCORE_CHANGED` | `{ score, delta }` | Cambio del marcador |
| `LEVEL_UP` | `{ level }` | Subida de nivel |
| `POWER_UP_PICKED` | `{ powerupType, duration }` | Jugador recoge un power-up |
| `POWER_UP_EXPIRED` | `{ powerupType }` | Power-up se agota |

Cada uno requiere su entrada en `permissions[type=events].subscribe`.

---

## 1 — Suscribirse a varios eventos

`mod.json`:

```json
{
  "type": "events",
  "subscribe": [
    "GAME_STARTED",
    "GAME_OVER",
    "SCORE_CHANGED",
    "POWER_UP_PICKED"
  ],
  "rationale": "Reacciona al ciclo de partida para mostrar estadísticas en vivo."
}
```

`src/index.ts`:

```ts
let runStats = { picks: 0, peakScore: 0 };

host.subscribeEvent('GAME_STARTED', () => {
  runStats = { picks: 0, peakScore: 0 };
  host.log.info('[stats] Partida iniciada.');
});

host.subscribeEvent('SCORE_CHANGED', (payload) => {
  const score = (payload as { score?: number })?.score ?? 0;
  if (score > runStats.peakScore) runStats.peakScore = score;
});

host.subscribeEvent('POWER_UP_PICKED', (payload) => {
  const type = (payload as { powerupType?: string })?.powerupType;
  runStats.picks++;
  host.log.debug(`[stats] Power-up #${runStats.picks}: ${type}`);
});

host.subscribeEvent('GAME_OVER', async (payload) => {
  const final = (payload as { finalScore?: number })?.finalScore ?? 0;
  host.log.info(
    `[stats] Partida terminada. Score ${final}, `
    + `peak ${runStats.peakScore}, ${runStats.picks} power-ups.`,
  );
});
```

---

## 2 — Lectura puntual con `host.state`

A veces necesitas leer estado del juego sin esperar a un evento. Por
ejemplo, "cuando el jugador active un toggle, leer el score actual y
ofrecer multiplicarlo".

```ts
host.subscribeEvent('MY_TOGGLE_CHANGED', async () => {
  const result = await host.state.read('game.score');
  if (result.ok) {
    host.log.info(`Score actual: ${result.value}`);
  }
});
```

**Permiso requerido**:

```json
{
  "type": "state-read",
  "paths": ["game.score", "game.level", "game.lives"],
  "rationale": "Lee el estado de la partida en curso para mostrar estadísticas."
}
```

`state-read` con `paths` explícito. NO se permite leer `game.*` (el
sistema rechaza wildcards por seguridad).

> `host.state.write` también existe pero requiere el permiso
> `state-write` y NO se recomienda — los cambios al estado del juego
> deben pasar por host functions (`callHostFn`) para que el juego
> los valide. Estado libremente escrito desde un mod puede
> corromper la partida.

---

## 3 — Notificar al jugador con `host.dispatch`

Para anunciar algo al jugador (toast in-game, no log de consola),
usa `host.dispatch`:

```ts
host.subscribeEvent('POWER_UP_PICKED', (payload) => {
  const type = (payload as { powerupType?: string })?.powerupType;
  if (type === 'goldenApple') {
    host.dispatch('MOD_NOTIFICATION', {
      text: '¡Manzana dorada! +500 puntos.',
      duration: 2500,
      kind: 'success',
    });
  }
});
```

**Permiso**:

```json
{
  "type": "events",
  "dispatch": ["MOD_NOTIFICATION"],
  "rationale": "Notifica al jugador cuando coge un power-up especial."
}
```

(Si ya tienes una entrada `events` con `subscribe`, puedes añadir
`dispatch` al mismo objeto.)

`MOD_NOTIFICATION` es un evento canónico que el shell del juego
intercepta y muestra como toast. El payload acepta `text`,
`duration` (ms), `kind` (`info`/`success`/`warning`/`error`).

---

## 4 — Throttle / debounce para eventos frecuentes

`SCORE_CHANGED` puede emitirse muchas veces por segundo. Si tu
handler hace algo caro (escribir storage, renderizar UI), conviene
throttle:

```ts
let lastSync = 0;
host.subscribeEvent('SCORE_CHANGED', async (payload) => {
  const now = Date.now();
  if (now - lastSync < 1000) return; // máx 1 sync/segundo
  lastSync = now;

  const score = (payload as { score?: number })?.score ?? 0;
  await host.storage?.set('lastScore', score);
});
```

Patrón equivalente con `requestIdleCallback` o `setTimeout` también
sirve. La regla es: **NO bloquees el thread principal en un handler
de evento de alta frecuencia**.

---

## 5 — Logging estructurado

`host.log` tiene 4 niveles:

```ts
host.log.debug('detalle interno, oculto por defecto');
host.log.info('eventos normales del ciclo');
host.log.warn('algo no fatal pero conviene revisar');
host.log.error('error real, capturado en `mod.errors.*` telemetría');
```

En build dev todos se ven en DevTools. En build retail, solo
`warn`/`error` se persisten en `Settings → Mods → <mod> → Logs`.
`debug` queda silenciado salvo que el jugador active "Modo
desarrollador" (easter egg).

---

## 6 — Caveat: payloads vienen sin tipo

El runtime evalúa tu código en un sandbox; los payloads viajan vía
serialización. TypeScript te ayuda en tu código fuente pero el
sandbox NO valida el shape del payload — el juego puede cambiar la
forma entre versiones. Por eso el código real usa runtime guards:

```ts
function isScoreChangedPayload(p: unknown): p is { score: number } {
  return (
    typeof p === 'object'
    && p !== null
    && typeof (p as { score: unknown }).score === 'number'
  );
}

host.subscribeEvent('SCORE_CHANGED', (payload) => {
  if (!isScoreChangedPayload(payload)) {
    host.log.warn('[stats] SCORE_CHANGED con payload inesperado');
    return;
  }
  // Aquí TypeScript ya sabe que payload.score: number.
});
```

Para mods serios, define estas guards en `src/types.ts` y reutilízalas.

---

## Lo que has aprendido

- **Catálogo de eventos** comunes: `GAME_STARTED`, `GAME_OVER`,
  `SCORE_CHANGED`, `LEVEL_UP`, `POWER_UP_PICKED`/`EXPIRED`,
  `GAME_PAUSED`/`RESUMED`.
- **`host.state.read(path)`** para lectura puntual con permiso
  `state-read.paths`.
- **`host.dispatch('MOD_NOTIFICATION', ...)`** para toast in-game.
- **Throttle** para eventos de alta frecuencia.
- **`host.log`** con 4 niveles + persistencia distinta por build.
- **Runtime guards** para payloads — TypeScript no llega al sandbox.

## Lo que viene

[**Lección 4 — Personalizar power-ups (Snake-specific)**](04-power-ups.md).
Vas a registrar dinámicamente 22 toggles para los 22 power-ups de
Snake. Aprendes el patrón "array → UI auto-generada" y cómo
referenciar el catálogo de power-ups del juego desde tu mod.
