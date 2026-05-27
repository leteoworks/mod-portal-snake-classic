<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm mods:sync-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# Cookbook — recetas copy-paste

Soluciones a problemas concretos que aparecen al escribir mods.
Cada receta es independiente — léelas en cualquier orden. Si nunca
has escrito un mod, empieza por [`tutorial/`](tutorial/01-hello-mod.md).

> Convención: snippets en TypeScript. El motor del runtime evalúa
> tu `dist/mod.js` bundleado, no tu TS directo. Usa `tsc` /
> `esbuild` con `--target=es2020`.

---

## Índice

1. [Slider que cambia un valor del juego en tiempo real](#1)
2. [Botón "Reset to defaults" que aplica N bindings de golpe](#2)
3. [Registrar N toggles desde un array (boilerplate reduction)](#3)
4. [Persistir un objeto JSON grande sin pasarse de quotaKb](#4)
5. [Leer estado del juego + reaccionar a evento simultáneamente](#5)
6. [Throttle de SCORE_CHANGED para evitar spam](#6)
7. [i18n con namespace propio + fallback inglés](#7)
8. [Cargar un icono custom (icon + screenshots para Workshop)](#8)
9. [Coordinar UI binding con hook sin race](#9)
10. [Custom analytics event declarado + tracked](#10)
11. [Mod robusto: detectar límites del framework y degradar bien](#11)
12. [Backoff exponencial cuando el host rate-limita tu mod](#12)
13. [Auto-pausa al activarse el sampler de F-15](#13)
14. [Self-check al setup: verifica qué se aceptó antes de seguir](#14)

---

## 1 — Slider que cambia un valor del juego en tiempo real {#1}

**Problema**: Quiero un slider que controle la velocidad inicial de
Snake. El cambio aplica en vivo Y persiste entre partidas.

**Receta**:

```ts
// settings-tab.ts
{
  kind: 'slider',
  label: 'Velocidad inicial (ms/tick)',
  min: 80, max: 500, step: 10,
  binding: 'tunables.initialSpeedTickMs',
}
```

```ts
// index.ts — solo re-aplicar al inicio de partida
host.subscribeEvent('GAME_STARTED', async () => {
  const r = await host.storage?.get('tunables.initialSpeedTickMs');
  if (r?.ok && typeof r.value === 'number') {
    await host.callHostFn('gameConfigSet', {
      name: 'initialSpeedTickMs', value: r.value,
    });
  }
});
```

```json
// mod.json — permisos requeridos
{ "type": "game-specific", "surface": "tunables", "actions": ["set"], "rationale": "..." },
{ "type": "events", "subscribe": ["GAME_STARTED"], "rationale": "..." },
{ "type": "storage", "quotaKb": 16, "rationale": "..." }
```

**Por qué funciona**: el prefijo `tunables.` en el binding
conecta automáticamente la UI al juego vía `gameConfigSet`. El hook
extra es solo defensivo para reinicios del juego.

> ⚠ **Actions específicos** (release seguridad 2026-05). Si
> usas `host.callHostFn('gameConfigSet', ...)` SIN declarar
> `actions: ['set']` en el permiso `game-specific.tunables`,
> recibes `PERMISSION_DENIED` con mensaje
> `"requiere granted.gameSpecific.tunables.set"`. Cada host fn
> con surface enforce su action concreto desde la 2026-05.
> Catálogo completo de `surfaceId.action` por host fn en
> `docs/games/snake-classic/host-api-changelog.md`.

---

## 2 — Botón "Reset to defaults" que aplica N bindings de golpe {#2}

**Problema**: 22 toggles. Botón que los pone todos a sus defaults.

**Receta**:

```ts
const DEFAULT_TOGGLES: Record<string, boolean> = {
  powerupSpeedBoostEnabled: true,
  powerupInvincibilityEnabled: false,
  // … 20 más
};

host.subscribeEvent('MYMOD_RESET_DEFAULTS', async () => {
  await Promise.all(
    Object.entries(DEFAULT_TOGGLES).map(([name, value]) =>
      host.callHostFn('gameConfigSet', { name, value })
    )
  );

  // Persistir para que la UI refleje el estado.
  await Promise.all(
    Object.entries(DEFAULT_TOGGLES).map(([name, value]) =>
      host.storage?.set(`tunables.${name}`, value)
    )
  );

  host.dispatch('MOD_NOTIFICATION', {
    text: 'Defaults restaurados.', kind: 'info',
  });
});
```

**Clave**: `Promise.all` aplica los 22 calls en paralelo (~3-5 ms
total) en vez de serial (~20 ms). Cuando los calls son
idempotentes y sin orden, `Promise.all` siempre.

---

## 3 — Registrar N toggles desde un array {#3}

**Problema**: 22 power-ups. NO quiero escribir 22 bloques `{ kind:
'toggle', label: ..., binding: ... }`.

**Receta**:

```ts
interface Toggle { binding: string; label: string }

const TOGGLES: Toggle[] = [
  { binding: 'tunables.powerupSpeedBoostEnabled', label: 'Speed Boost' },
  { binding: 'tunables.powerupInvincibilityEnabled', label: 'Invincibility' },
  // … 20 más
];

const children = TOGGLES.map((t) => ({
  kind: 'toggle' as const,
  label: t.label,
  binding: t.binding,
}));

host.registerSettingsTab?.({
  id: 'mymod', title: 'Power-Ups', icon: 'extension',
  sections: [{ kind: 'card', title: 'Toggles', children }],
});
```

**Variante con i18n**:

```ts
const TOGGLES = [
  { binding: 'tunables.powerupSpeedBoostEnabled',
    i18nKey: 'mymod.pu.speed', fallback: 'Speed Boost' },
  // …
];

const children = TOGGLES.map((t) => ({
  kind: 'toggle' as const,
  label: host.i18n?.t(t.i18nKey) ?? t.fallback,
  binding: t.binding,
}));
```

---

## 4 — Persistir un objeto JSON grande sin pasarse de quotaKb {#4}

**Problema**: `quotaKb: 32` en el manifest. Quiero guardar un
objeto con N campos sin trocear.

**Receta — comprime si te acercas al límite**:

```ts
const STORAGE_KEY = 'mymod.settings';

async function persist(obj: object): Promise<void> {
  const serialized = JSON.stringify(obj);
  // 32 KB = 32 * 1024 chars (~ — depende encoding).
  if (serialized.length > 28 * 1024) {
    host.log.warn(
      `[mymod] Settings cerca del límite: ${serialized.length} chars`,
    );
  }
  const r = await host.storage?.set(STORAGE_KEY, obj);
  if (!r?.ok) {
    host.log.error(`[mymod] storage.set falló: ${r?.error?.message}`);
  }
}

async function load<T>(defaults: T): Promise<T> {
  const r = await host.storage?.get(STORAGE_KEY);
  if (!r?.ok || !r.value) return defaults;
  return { ...defaults, ...(r.value as Partial<T>) };
}
```

**Patrón clave**: `{ ...defaults, ...stored }` rellena las keys
nuevas con sus defaults cuando el storage tiene un objeto de una
versión anterior. **Migración sin código de migración**.

Si tu objeto crece más de quotaKb, refactoriza a múltiples keys
(`mymod.settings.toggles`, `mymod.settings.presets`, etc.).

---

## 5 — Leer estado del juego + reaccionar a evento simultáneamente {#5}

**Problema**: cuando el jugador apila 100 puntos, quiero leer su
nivel actual y decidir.

**Receta**:

```ts
host.subscribeEvent('SCORE_CHANGED', async (payload) => {
  const score = (payload as { score?: number })?.score ?? 0;
  if (score < 100 || score % 100 !== 0) return;

  // Leer nivel sin esperar a LEVEL_UP.
  const levelResult = await host.state.read('game.level');
  if (!levelResult.ok) return;

  const level = levelResult.value as number;
  host.dispatch('MOD_NOTIFICATION', {
    text: `Hito ${score} puntos en nivel ${level}!`,
    kind: 'success',
  });
});
```

**Permisos**:

```json
{ "type": "events", "subscribe": ["SCORE_CHANGED"], "dispatch": ["MOD_NOTIFICATION"], "rationale": "..." },
{ "type": "state-read", "paths": ["game.level"], "rationale": "..." }
```

`state-read.paths` debe ser explícito; wildcards rechazados.

---

## 6 — Throttle de SCORE_CHANGED para evitar spam {#6}

**Problema**: `SCORE_CHANGED` puede emitirse 10× por segundo. Mi
handler hace storage.set — debe limitarse.

**Receta**:

```ts
let lastSync = 0;
const SYNC_INTERVAL_MS = 1000;

host.subscribeEvent('SCORE_CHANGED', async (payload) => {
  const now = Date.now();
  if (now - lastSync < SYNC_INTERVAL_MS) return;
  lastSync = now;

  const score = (payload as { score?: number })?.score ?? 0;
  await host.storage?.set('lastScore', score);
});
```

**Variante "debounce" (espera N ms tras último evento)**:

```ts
let timer: number | null = null;
host.subscribeEvent('SCORE_CHANGED', (payload) => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    const score = (payload as { score?: number })?.score ?? 0;
    await host.storage?.set('lastScore', score);
    timer = null;
  }, 500) as unknown as number;
});
```

Throttle = "máx 1 cada N". Debounce = "espera hasta que pare N ms".

---

## 7 — i18n con namespace propio + fallback inglés {#7}

**Problema**: Quiero que mi mod se vea en el idioma del jugador.

**Receta**:

```
my-mod/
├── locales/
│   ├── en.json    # canónico (fallback)
│   ├── es.json
│   └── fr.json
```

```json
// mod.json
{ "type": "i18n", "namespaces": ["mymod"], "rationale": "..." }
```

```ts
function t(key: string, fallback: string): string {
  return host.i18n?.t(key) ?? fallback;
}

// Uso
const label = t('mymod.tab.title', 'My Mod');
```

**Reglas**:
- Todas las keys empiezan por el namespace (`mymod.*`). El
  framework rechaza fuera de namespace.
- Cadena fallback: `t(key, fallback)` → si el locale del jugador
  no tiene `key`, intenta `en.json`. Si tampoco está, devuelve
  `fallback` (literal del código).
- `en.json` es el canónico — siempre regístralo aunque no traduzcas
  a más idiomas.

---

## 8 — Cargar icono custom + screenshots para Workshop {#8}

**Problema**: Quiero que mi mod tenga su propio icono visible en
Settings y screenshots en Workshop.

**Receta**:

```
my-mod/
├── icon.png            # 256x256, <100 KB
├── screenshots/         # para Workshop (opcional)
│   ├── 01.png          # 1920x1080 recomendado
│   ├── 02.png
│   └── 03.png
└── mod.json
```

```json
// mod.json
"metadata": {
  "icon": "icon.png",
  "tags": ["customization"]
}
```

El campo `metadata.icon` debe ser un path relativo a la raíz del
mod. El framework valida formato + tamaño.

Para los screenshots, **no van en mod.json** — los subes
directamente en el formulario de Workshop al crear el item.

---

## 9 — Coordinar UI binding con hook sin race {#9}

**Problema**: tengo un binding `'tunables.maxLives'` (la UI escribe
al juego) Y un hook `GAME_STARTED` que reaplica. ¿No es race?

**Receta — el patrón canónico**:

```ts
// Solo el hook escribe al juego. El binding solo persiste al
// storage del mod. Sin race posible.
host.registerSettingsTab?.({
  // …
  children: [{
    kind: 'slider',
    label: 'Vidas',
    min: 1, max: 50,
    binding: 'mymod.maxLives',  // ← SIN prefijo tunables.
  }],
});

host.subscribeEvent('GAME_STARTED', async () => {
  const r = await host.storage?.get('mymod.maxLives');
  if (r?.ok && typeof r.value === 'number') {
    await host.callHostFn('gameConfigSet', {
      name: 'maxLives', value: r.value,
    });
  }
});
```

Aquí el slider escribe a `mymod.maxLives` (storage interno del
mod). El juego SOLO ve el cambio en `GAME_STARTED`. Cero race.

**Alternativa — solo binding**:

```ts
// La UI aplica al juego en vivo, el hook NO existe. El cambio se
// pierde si el jugador cierra y reabre el juego.
binding: 'tunables.maxLives',
```

Cuando aceptable: si el jugador siempre pasa por Settings antes de
empezar la partida, o si quieres que el valor "no persista" entre
sesiones.

---

## 10 — Custom analytics event declarado + tracked {#10}

**Problema**: quiero saber cuántas veces el jugador aplica el
preset "Hardcore".

**Receta**:

```json
// mod.json
"analytics": {
  "events": [
    {
      "name": "mymod_preset_applied",
      "description": "Jugador aplicó un preset",
      "schema": { "preset": "string" }
    }
  ]
}
```

```ts
host.subscribeEvent('MYMOD_APPLY_PRESET', async (payload) => {
  const name = (payload as { preset?: string })?.preset;
  if (!name) return;

  // … aplicar el preset …

  host.analytics?.track('mymod_preset_applied', { preset: name });
});
```

**Reglas**:
- Eventos custom deben **declararse** en `analytics.events` del
  manifest. El framework rechaza `track()` con un name no
  declarado.
- El `schema` declara qué campos van en cada evento. Sirve de
  documentación + permite al framework filtrar PII por convención
  (campos como `email`, `userId` requieren rationale).
- El jugador puede opt-out de analytics en Settings → Privacy. Tu
  `track()` se convierte en no-op silencioso. NO se rompe nada.

---

## 11 — Mod robusto: detectar límites del framework y degradar bien {#11}

**Problema**: El framework rate-limita, dropea o rechaza partes de mi
mod silenciosamente (rate-limits, cap de hooks, throttling de
sampler). Quiero detectarlo y reaccionar — no quedarme ciego.

**Solución**: `host.diagnostics.onLimitHit(cb)`. UN callback, todos
los eventos. Discriminated union — el `switch` narrowing funciona
limpio en TypeScript.

```ts
type LimitHitEvent =
  | { type: 'register-hook-rejected'; hookName: string; cap: number;
      currentCount: number }
  | { type: 'subscribe-event-rejected'; pattern: string; cap: number;
      currentCount: number }
  | { type: 'rate-limit-hit';
      surface: 'hostFn' | 'state.read' | 'state.write'
        | 'dispatch' | 'storage.bytes';
      retryAfterMs: number }
  | { type: 'sampling-throttling-activated'; pattern: string;
      p95Ms: number; maxMs: number;
      strategy: 'drop-newest' | 'every-Nth' }
  | { type: 'sampling-throttling-recovered'; pattern: string;
      p95Ms: number }
  | { type: 'storage-quota-exceeded'; key: string;
      requestedBytes: number; quotaBytes: number };

let cooldownUntil = 0;
let samplerThrottling = false;

const unsub = host.diagnostics.onLimitHit((evt) => {
  switch (evt.type) {
    case 'rate-limit-hit':
      // Pone el mod en cooldown — el siguiente intento espera
      // retryAfterMs antes de re-emitir.
      cooldownUntil = Date.now() + evt.retryAfterMs;
      host.log.warn(
        `Rate-limit en ${evt.surface}; reintenta en ${evt.retryAfterMs}ms`,
      );
      break;
    case 'sampling-throttling-activated':
      // Algunas entregas se dropearán. Marcamos para que la lógica
      // del mod sea pure-function de "última value" en vez de
      // acumular incrementos por evento.
      samplerThrottling = true;
      host.log.warn(
        `Sampler activó throttling en '${evt.pattern}' `
        + `(p95=${evt.p95Ms}ms > ${evt.maxMs}ms). `
        + 'Bajando trabajo por evento.',
      );
      break;
    case 'sampling-throttling-recovered':
      samplerThrottling = false;
      break;
    case 'register-hook-rejected':
      // El hook NO está registrado — degradar es opt-in (decidir si
      // tu mod tiene sentido sin él, o mostrar mensaje al jugador).
      host.log.error(
        `Hook '${evt.hookName}' rechazado (excediste cap=${evt.cap}). `
        + 'Funcionalidad asociada deshabilitada.',
      );
      break;
    case 'subscribe-event-rejected':
      host.log.error(
        `Subscribe '${evt.pattern}' rechazado: ya tienes ${evt.cap}.`,
      );
      break;
    case 'storage-quota-exceeded':
      // El blob es demasiado grande — compactar antes de retry.
      host.log.warn(
        `Storage llena al escribir '${evt.key}' `
        + `(${evt.requestedBytes}B vs quota=${evt.quotaBytes}B).`,
      );
      break;
  }
});

// Limpieza al teardown del mod (raro — el framework limpia el
// dispatcher en dispose, pero unsubscribe explícito es buena
// práctica si tu mod tiene lifecycle propio).
host.onShutdown?.(() => unsub());
```

**Reglas del mecanismo**:

- **Per-mod**: solo recibes eventos de TU mod. Cero side-channels
  cross-mod.
- **Resilient**: si tu callback throws, el siguiente sigue
  recibiendo eventos. El framework no propaga el error.
- **Cap 8 listeners** por mod: spam de `onLimitHit` se ignora silente
  (protección del host contra abuse).
- **Re-entrancia bounded** (depth 2): un cb que provoca otro limit
  no genera recursión infinita.
- **Zero-overhead** si nunca llamas `onLimitHit`: el dispatcher no
  emite. Cero coste path feliz.

---

## 12 — Backoff exponencial cuando el host rate-limita tu mod {#12}

**Problema**: Mi mod hace `host.state.write` en respuesta a un evento
high-frequency. Cuando supera `stateWritesPerSecond`, los writes
fallan silencioso (mi mod cree que escribió pero NO se escribió).

**Solución**: combinar el `error.code === 'RATE_LIMITED'` del
return con `onLimitHit` para auto-pausar la cola hasta
`retryAfterMs`. Implementación con cola in-memory + drenaje
diferido:

```ts
const pending: Array<{ path: string; value: unknown }> = [];
let drainUntil = 0; // ms epoch — pausa hasta este timestamp

host.diagnostics.onLimitHit((evt) => {
  if (
    evt.type === 'rate-limit-hit'
    && evt.surface === 'state.write'
  ) {
    // Backoff: añade margen del 20% al retryAfterMs del host.
    drainUntil = Date.now() + Math.ceil(evt.retryAfterMs * 1.2);
  }
});

function enqueueWrite(path: string, value: unknown) {
  pending.push({ path, value });
}

function drain() {
  if (Date.now() < drainUntil) return; // todavía en cooldown
  while (pending.length > 0) {
    const job = pending[0];
    const r = host.state!.write(job.path, job.value);
    if (!r.ok && r.error?.code === 'RATE_LIMITED') {
      // El emit del onLimitHit nos pone drainUntil; salimos.
      return;
    }
    pending.shift(); // éxito → consume el job
  }
}

// Llama drain() en cada tick del juego (60Hz). Si la cola tiene
// 1000 jobs y stateWritesPerSecond=10, los 1000 se procesan en
// ~100s sin que el host degrade.
host.registerHook('AFTER_TICK', drain);
```

**Por qué no `retryAfterMs` directo sin margen**: el rate-limit es
un token-bucket. Si reanudas justo en `retryAfterMs`, tienes ~1
token disponible → el siguiente write también rate-limita. El
+20% deja que el bucket se rellene mínimamente.

---

## 13 — Auto-pausa al activarse el sampler de F-15 {#13}

**Problema**: Mi mod escucha `SCORE_CHANGED` (high-frequency) y hace
trabajo pesado (cálculo de leaderboard, render canvas). El sampler
auto-dropea eventos para proteger el frame budget — mi mod ve menos
eventos de los que cree.

**Solución**: detectar el throttling y bajar la cantidad de trabajo
por evento.

```ts
let mode: 'detailed' | 'lightweight' = 'detailed';

host.diagnostics.onLimitHit((evt) => {
  if (evt.type === 'sampling-throttling-activated'
      && evt.pattern === 'SCORE_CHANGED') {
    mode = 'lightweight';
    host.log.info('Sampler activado: bajando a render lightweight');
  }
  if (evt.type === 'sampling-throttling-recovered'
      && evt.pattern === 'SCORE_CHANGED') {
    mode = 'detailed';
    host.log.info('Sampler recuperado: render detallado de nuevo');
  }
});

host.subscribeEvent('SCORE_CHANGED', (payload) => {
  if (mode === 'detailed') {
    renderFullLeaderboard(payload); // 8-12ms
  } else {
    renderTopScoreOnly(payload); // 1-2ms
  }
});
```

**Por qué dos modos en vez de "saltar el trabajo"**: el sampler
seguirá midiendo el p95 de TU callback. Si `lightweight` baja el
p95 bajo el threshold, el sampler se RECUPERA y vuelves a `detailed`
sin que pierdas eventos importantes (ej. game-over). Es histéresis
controlada por TU código.

---

## 14 — Self-check al setup: verifica qué se aceptó antes de seguir {#14}

**Problema**: Mi mod registra 8 hooks pero `policy.limits.maxHooks=5`.
Los últimos 3 silenciosamente NO están registrados. Quiero detectarlo
al setup y abortar limpio con un mensaje claro al jugador.

**Solución**: `host.diagnostics.getRegisteredHooks()` +
`getSubscribedEvents()` + `getLimits()`. Llamado UNA vez al final del
setup — verifica que todo lo que querías está activo.

```ts
function setup() {
  host.registerHook('BEFORE_TICK', onBeforeTick);
  host.registerHook('AFTER_TICK', onAfterTick);
  host.registerHook('GAME_OVER', onGameOver);
  host.registerHook('SCORE_CHANGED', onScoreChanged);
  host.registerHook('LEVEL_UP', onLevelUp);
  host.registerHook('POWERUP', onPowerUp);
  host.registerHook('PORTAL', onPortal);
  host.registerHook('DEMON', onDemon);

  // SELF-CHECK al final del setup.
  const registered = host.diagnostics.getRegisteredHooks();
  const expected = [
    'BEFORE_TICK', 'AFTER_TICK', 'GAME_OVER',
    'SCORE_CHANGED', 'LEVEL_UP', 'POWERUP',
    'PORTAL', 'DEMON',
  ];
  const missing = expected.filter((h) => !registered.includes(h));
  if (missing.length > 0) {
    const lim = host.diagnostics.getLimits();
    host.log.error(
      `Setup incompleto: faltan ${missing.length}/${expected.length} `
      + `hooks (${missing.join(', ')}). `
      + `Cap maxHooks=${lim?.maxHooks ?? 'sin cap'}. `
      + 'Sube el cap en policy.ts o reduce hooks del mod.',
    );
    return; // el mod sigue parcialmente funcional pero el modder lo sabe
  }

  host.log.info(`${expected.length} hooks registrados correctamente.`);
}

setup();
```

**Cuándo usar self-check**: siempre. Es O(1) al setup y captura una
clase entera de bugs (caps excedidos, typos en nombres de hooks, etc.)
que de otro modo darían "el mod no hace lo que debería" en producción
sin un mensaje útil.

---

## Más recetas

Si echas en falta una receta, abre issue en el
[repo del template](https://github.com/leteoworks/submodules/mod-template-snake-classic/issues)
con el problema concreto. La intención es que este cookbook crezca
con casos reales de la comunidad.

## Ver también

- [`tutorial/`](tutorial/01-hello-mod.md) — curso paso a paso desde
  hello world.
- [`api-reference.md`](api-reference.md) — catálogo completo de
  `host.*`.
- [`troubleshooting.md`](troubleshooting.md) — síntomas → fixes.
