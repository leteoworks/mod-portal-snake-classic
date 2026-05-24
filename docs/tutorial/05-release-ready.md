<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm mods:sync-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# Lección 5 — Llevar tu mod a Workshop

Objetivo: convertir tu mod en producto release-ready y subirlo a
Steam Workshop para que cualquier jugador del juego pueda
subscribirlo. Incluye i18n, icono, validación local, packaging y
upload.

> Doc de referencia operacional: [`publishing.md`](../publishing.md)
> cubre el detalle de Workshop (visibility, tags, verification
> tiers). Esta lección es el "checklist incremental" sobre tu mod
> de la Lección 4.

---

## 1 — Internacionalización (i18n)

Hasta ahora has usado `t(key, fallback)` con `host.i18n?.t()`. Si
nunca registras locales, el fallback en inglés/español de los
strings literales del código es lo que el jugador ve. Si sí los
registras, el juego respeta el idioma del jugador.

### Estructura

```
my-mod/
├── locales/
│   ├── en.json
│   ├── es.json
│   └── fr.json
└── src/
    └── ...
```

`locales/en.json`:

```json
{
  "mymod.tab.title": "Power-Up Mixer",
  "mymod.section.spawn": "Frequency",
  "mymod.section.toggles": "Active power-ups",
  "mymod.section.presets": "Presets",
  "mymod.spawn.label": "Interval between power-ups (ms)",
  "mymod.preset.classic": "Classic",
  "mymod.preset.casual": "Casual",
  "mymod.preset.hardcore": "Hardcore",
  "mymod.powerups.speedBoost": "Speed Boost",
  "mymod.powerups.invincibility": "Invincibility",
  "mymod.powerups.doublePoints": "Double Points"
}
```

`locales/es.json`:

```json
{
  "mymod.tab.title": "Mezclador de Power-Ups",
  "mymod.section.spawn": "Frecuencia",
  "mymod.section.toggles": "Power-ups activos",
  "mymod.section.presets": "Presets",
  "mymod.spawn.label": "Intervalo entre power-ups (ms)",
  "mymod.preset.classic": "Clásico",
  "mymod.preset.casual": "Casual",
  "mymod.preset.hardcore": "Hardcore",
  "mymod.powerups.speedBoost": "Aceleración",
  "mymod.powerups.invincibility": "Invencibilidad",
  "mymod.powerups.doublePoints": "Doble Puntuación"
}
```

### Declarar el namespace en `mod.json`

Ya lo tenías:

```json
{
  "type": "i18n",
  "namespaces": ["mymod"],
  "rationale": "Traduce los labels a varios idiomas."
}
```

**Regla clave**: cualquier key que registres debe empezar por el
namespace declarado (`mymod.*`). El framework rechaza keys fuera
del namespace para evitar que un mod pise traducciones del juego o
de otro mod.

### Fallback chain

Cuando un jugador en `fr` activa tu mod, el framework busca:
1. `locales/fr.json` → si existe, lo usa.
2. `locales/en.json` → fallback canónico.
3. `fallback` literal del código → último recurso.

Sin `fr.json` registrado, los strings aparecen en inglés. Sin
`en.json`, en lo que pase a `fallback` del código. Robusto por
diseño.

---

## 2 — Icono del mod

`mod.json` con `metadata.icon`:

```json
"metadata": {
  "name": "Power-Up Mixer",
  "description": "Personaliza qué power-ups aparecen en Snake.",
  "author": "Tu Nombre",
  "license": "MIT",
  "icon": "icon.png",
  "tags": ["customization", "snake-classic", "power-ups"]
}
```

Crea `icon.png` en la raíz del mod:
- **Dimensiones**: 256×256 px.
- **Formato**: PNG con transparencia opcional.
- **Tamaño**: <100 KB (recomendado <50 KB).
- **Estilo**: legible a 64×64 (la lista de mods lo muestra
  pequeño).

El validator (paso 4) rechaza icons >1 MB o con dimensiones
sospechosas.

---

## 3 — Manifest pulido

Antes de publicar, revisa `mod.json`:

```json
{
  "manifestVersion": 1,
  "id": "tuhandle.power-up-mixer",
  "version": "1.0.0",
  "target": { "gameId": "snake-classic", "gameVersion": "^1.0.0" },
  "engine": {
    "preferred": "quickjs-declarative-ui",
    "fallbacks": ["isolated-vm"]
  },
  "requires": { "hostApi": "^1.0.0", "dlcs": [] },
  "entry": "dist/mod.js",
  "permissions": [
    {
      "type": "settings-ui",
      "maxTabs": 1,
      "rationale": "Tab para configurar 22 toggles + slider + 3 presets."
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
      "rationale": "Traduce labels a múltiples idiomas."
    },
    {
      "type": "events",
      "subscribe": ["MYMOD_APPLY_PRESET"],
      "dispatch": ["MOD_NOTIFICATION"],
      "rationale": "Aplica presets y notifica al jugador."
    }
  ],
  "metadata": {
    "name": "Power-Up Mixer",
    "description": "Personaliza qué power-ups aparecen + 3 presets one-click.",
    "author": "Tu Nombre",
    "homepage": "https://github.com/tuhandle/power-up-mixer",
    "license": "MIT",
    "icon": "icon.png",
    "tags": ["customization", "snake-classic", "power-ups"]
  },
  "donateUrl": "https://patreon.com/tuhandle"
}
```

### Notas
- `version: "1.0.0"`: SemVer estricto. Subes patch (`1.0.1`) para
  bugfix, minor (`1.1.0`) para features nuevas, major (`2.0.0`)
  cuando rompes compat.
- `homepage`: opcional. Si la rellenas, aparece como link en la
  card del mod.
- `donateUrl`: opcional. Si la rellenas, aparece un botón "Apoyar
  al autor" en la card. HTTPS-only, validado por el framework.
- `tags`: ayudan al descubrimiento. Sin convención obligatoria
  pero respeta los tags del juego target (ver `publishing.md`).

---

## 4 — Validación local

Antes de empaquetar, pasa el validator:

```bash
# Desde el monorepo del framework (clona si no lo tienes):
pnpm mods:validate /ruta/a/mi-mod
```

El validator hace todos estos checks sin necesitar el juego:
- `mod.json` shape válido (Zod schema).
- Permisos coherentes (todos con `rationale` no vacío).
- `entry` apunta a un archivo que existe.
- `dist/mod.js` <500 KB.
- Icon <1 MB con dimensiones razonables.
- Locales JSON parseables.
- Keys de locales empiezan por los `namespaces` declarados.
- **App Store §3.3.2 compliance** (sin `eval`, sin `Function`
  constructor, sin imports dinámicos arbitrarios — el motor del
  runtime los bloquearía igual pero el validator lo caza ANTES de
  subir a App Store).

Si pasa todo, ✅. Si falla, te dice qué corregir.

---

## 5 — Build release

```bash
pnpm build:release
```

Diferencias respecto a `pnpm build` (dev):
- Minificado (~5-15 KB típico).
- Source map separado en `dist/mod.js.map` (opcional incluir).
- Sin `console.log` ni `debug` (esbuild dropea identificadores).

Verifica el output:

```bash
ls -la dist/
# mod.js   13 KB
# mod.js.map  28 KB (opcional)
```

---

## 6 — Empaquetar

```bash
pnpm pack
```

Genera `dist/<modId>-<version>.zip` con la estructura mínima que
Steam Workshop espera:

```
power-up-mixer-1.0.0.zip
├── mod.json
├── dist/
│   └── mod.js
├── locales/
│   ├── en.json
│   └── es.json
└── icon.png
```

NO incluye `src/`, `node_modules/`, `package.json`, `build.mjs`,
`.git/`. Solo el bundle final.

> Tamaño esperado: 50-500 KB. Workshop tiene límite 100 MB por
> item — fácil de cumplir.

---

## 7 — Subir a Steam Workshop

> Prerrequisito: tener Steam instalado y haber comprado el juego
> (Snake Classic).

1. Abre Steam → biblioteca → Snake Classic → Community Hub.
2. En la columna lateral: **Workshop** → **Create Item**.
3. Steam abre un formulario nativo:
   - **Title**: nombre del mod (puedes copiar de `metadata.name`).
   - **Description**: markdown básico permitido. Pega el README de
     tu mod si lo tienes; sino una explicación 2-3 párrafos.
   - **Preview image**: el icono `icon.png` u otra 800×450 mejor
     para listing.
   - **Tags**: marca los relevantes del catálogo del juego.
   - **Visibility**: empieza en **Hidden** (solo tú). Lo cambias a
     **Public** cuando esté listo.
   - **Content**: drag & drop del ZIP del paso 6.
4. Submit.
5. Steam te asigna un **Workshop ID** (entero). Ese ID identifica
   tu item para siempre.
6. Para test: subscribe desde tu cuenta. Abre el juego. Tu mod
   aparece en Settings → Mods → "Workshop" como instalado.
7. Si todo va bien: vuelve a Workshop, cambia visibility a
   **Public**.

---

## 8 — Actualizaciones (releases siguientes)

Para subir una versión nueva:

1. Bump `version` en `mod.json` (`1.0.0` → `1.0.1`).
2. `pnpm build:release && pnpm pack`.
3. Workshop → tu item → **Update Item** → drag & drop del nuevo
   ZIP.
4. Optional: actualiza descripción / changelog.

Steam auto-actualiza el ZIP en todos los jugadores subscritos. Tu
juego al arrancar detecta la nueva versión y la carga.

---

## Checklist final

Antes de cambiar a Public:

- [ ] `mod.json` con `id`, `version`, `target`, `metadata.name`,
      `metadata.description` no triviales.
- [ ] Cada permiso con `rationale` no vacío y honesto.
- [ ] `locales/en.json` registrado como mínimo.
- [ ] `icon.png` 256×256 <100 KB.
- [ ] `pnpm mods:validate` ✅.
- [ ] `pnpm build:release` ✅.
- [ ] Test local: sideload + activate + jugar partida real.
- [ ] Steam Workshop item con Title + Description + Preview.
- [ ] Test desde subscriber (tu cuenta): instalar desde Workshop
      y verificar que funciona.
- [ ] Visibility → Public.

---

## Próximos pasos

Has terminado el tutorial básico. Ahora:

- [**Cookbook**](../cookbook.md) — recetas copy-paste para
  problemas comunes (presets, throttle, multi-mod coordination,
  etc.).
- [**Troubleshooting**](../troubleshooting.md) — diagnóstico de
  síntomas comunes ("mi mod no aparece", "tab vacío", "permission
  denied", etc.).
- [**`api-reference.md`**](../api-reference.md) — catálogo completo
  de `host.*` para profundizar.
- [**`publishing.md`**](../publishing.md) — detalles de Workshop
  más allá del flow básico (verification tiers, kill-switch,
  donations, featured mods).

## Mods de referencia (código real, no juguete)

- [`studio.fun-config`](https://github.com/leteoworks/my-game-fw-mods/tree/main/snake-classic/studio.fun-config)
  — 22 toggles + 3 presets, ~250 líneas de TS bien estructurado.
- [`studio.gameplay-tuner`](https://github.com/leteoworks/my-game-fw-mods/tree/main/snake-classic/studio.gameplay-tuner)
  — sliders cuantitativos + presets Easy/Normal/Hard,
  ~200 líneas.

Léelos cuando dudes "¿cómo se hace X en producción?".
