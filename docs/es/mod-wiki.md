<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm mods:sync-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# Documenta tu mod con una wiki in-game

Cualquier mod puede declarar una **wiki estandarizada** que el
jugador abre desde la tarjeta del mod en `Settings → Mods → tu-mod`.
El framework valida, almacena y renderiza con UX consistente — tú
solo escribes el contenido en un JSON.

Esta guía está pensada para **modders**. Si vienes a contribuir al
framework o a auditarlo, lee
[`docs/mods/architecture/mod-wiki.md`](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/architecture/mod-wiki.md).

---

## Día 1: el ejemplo mínimo

```bash
# Crea un wiki.json junto a tu mod.json.
cd game-mods/snake-classic/studio.mi-mod/
touch wiki.json
```

```jsonc
// wiki.json
{
  "format": 1,
  "i18n": {
    "en": {
      "overview": "# Mi Mod\n\nThis mod does X.\n\n## How it works\n\n- adds Y\n- changes Z"
    }
  }
}
```

```jsonc
// mod.json — añade el campo wiki
{
  "manifestVersion": 1,
  "id": "studio.mi-mod",
  // ...
  "wiki": {
    "source": "wiki.json"
  }
}
```

Rebundla tu mod y reload. El botón **"Wiki"** aparecerá en tu
tarjeta del Mods Manager. Click → se abre el viewer con tu contenido.

---

## Estructura completa

```jsonc
{
  "format": 1,                          // siempre 1 (versión actual)
  "primaryLocale": "en",                // opcional (default 'en' fallback)
  "i18n": {
    "<locale-key>": {
      "overview": "string markdown",       // opcional
      "configuration": "string markdown",  // opcional
      "faq": [                              // opcional
        { "q": "string", "a": "string markdown" }
      ],
      "troubleshooting": "string markdown",// opcional
      "credits": "string markdown",        // opcional
      "pages": [                            // opcional (wiki grande)
        {
          "id": "kebab-case",
          "title": "string",
          "markdown": "string markdown",
          "parent": "kebab-case-parent"   // opcional, max profundidad 2
        }
      ]
    }
  }
}
```

### Secciones fijas — para qué sirven

| Section          | Cuándo usar                                                 |
|------------------|-------------------------------------------------------------|
| `overview`       | Qué hace el mod en 30 segundos. **Empieza siempre por aquí.**|
| `configuration`  | Cada setting expuesto + qué hace + valores recomendados.   |
| `faq`            | Preguntas frecuentes (compat, conflictos, performance...). |
| `troubleshooting`| Síntoma → causa → fix. Lo que sueles responder en Discord. |
| `credits`        | Autoría, contribuidores, licencias de assets de terceros.  |

Rellena solo las que apliquen. Las omitidas no aparecen como tabs.

---

## i18n — locales soportados

```jsonc
"i18n": {
  "en": { "overview": "Hello." },
  "es": { "overview": "Hola." },
  "es-AR": { "overview": "Che, hola." }   // override regional
}
```

- Key del locale debe matchear `[a-z]{2}(-[A-Z]{2})?` (ej. `en`,
  `pt-BR`, `zh-CN`).
- El framework selecciona el locale según el idioma del jugador con
  esta cadena de fallback:

  ```
  playerLocale → playerLocale.split('-')[0] → primaryLocale → 'en' → primer key
  ```

- Si el jugador queda en un fallback distinto al suyo, el viewer
  muestra un banner: *"Mostrando documentación en otro idioma —
  el modder aún no la ha traducido a tu idioma"*.

**Recomendación**: empieza monolingüe en `en` (alcance global). Añade
`es` cuando tu base hispanohablante crezca.

---

## Markdown soportado

Subset minimalista por diseño (zero XSS surface).

| Soportado            | Sintaxis                          |
|----------------------|-----------------------------------|
| Heading 1-3          | `# H1`, `## H2`, `### H3`         |
| Párrafo              | líneas adyacentes                 |
| Lista no ordenada    | `- item`, `* item`, `+ item`      |
| Lista ordenada       | `1. item` `2. item`               |
| Code block           | <code>```lang</code> ... <code>```</code> |
| Bold                 | `**text**`                        |
| Italic               | `*text*`                          |
| Inline code          | `` `text` ``                      |
| Link                 | `[text](https://...)` o `[text](#anchor)` |

**NO soportado** (apareceran como texto literal, sin error):

- Raw HTML (`<div>`, `<img>`, etc.). Se renderiza como texto plano.
- Imágenes (`![alt](src)`).
- Tablas Markdown.
- Blockquotes (`>`).
- Listas anidadas.

### Links — schemes permitidos

| Scheme              | Resultado            |
|---------------------|----------------------|
| `https://`          | Link normal (abre en nueva pestaña) |
| `http://`           | Link normal (abre en nueva pestaña) |
| `#section`          | Anchor interno       |
| **cualquier otro** (`javascript:`, `data:`, `file:`, etc.) | **Degrada a texto plano** — el viewer renderiza `[text](url)` literal sin link. **NO es error**, simplemente no funciona como link. |

---

## Páginas extra (opcional)

Para wikis grandes (10+ secciones de contenido). Profundidad máxima 2:

```jsonc
"pages": [
  { "id": "advanced", "title": "Advanced", "markdown": "..." },
  {
    "id": "tuning",
    "title": "Tuning details",
    "markdown": "...",
    "parent": "advanced"
  }
]
```

- `id` debe ser kebab-case `[a-z0-9-]`, max 40 chars.
- Top-level (sin `parent`) se renderizan como tabs en el nav.
- Sub-páginas (con `parent`) NO tienen tab propio — se enlazan desde
  el markdown del parent con `[Ver tuning](#tuning)` o pasajes
  similares.
- Si declaras un `parent` que no existe, ciclo, o profundidad > 2,
  la validación falla y **el botón Wiki no aparece**. Revisa los
  logs para ver el motivo.

---

## Límites

| Límite                    | Valor       |
|---------------------------|-------------|
| Tamaño total `wiki.json`  | 256 KB      |
| Locales por wiki          | 30          |
| Páginas por locale        | 30          |
| FAQ entries por locale    | 50          |
| Caracteres por sección    | 20 000      |
| Caracteres por FAQ answer | 5 000       |
| Caracteres por FAQ question | 200       |

Si excedes alguno, la validación falla y **no aparece el botón Wiki**
en tu tarjeta. Mira los logs del juego para el detalle.

---

## El viewer del framework

Cuando el jugador hace click en "Wiki" desde tu tarjeta:

```
┌──────────────────────────────────────────────┐
│  ← Volver al inicio        (CHROME FRAMEWORK)│
│                                              │
│  Mi Mod                                      │
│  Description del manifest.metadata.          │
│                                              │
│  [ Resumen ][ Config ][ FAQ ][ Créditos ]    │
│  ────────────────────────────────────────    │
│                                              │
│  # Mi Mod                                    │
│  This mod does X...                          │
│                                              │
└──────────────────────────────────────────────┘
```

El link **"Volver al inicio"** siempre aparece en sticky-top — el
jugador tiene salida en cualquier momento. Lo aporta el framework,
NO tú.

---

## Checklist antes de publicar

- [ ] `wiki.json` es JSON válido y no supera 256 KB.
- [ ] `format: 1` declarado.
- [ ] `i18n` tiene al menos un locale.
- [ ] `mod.json` tiene `"wiki": { "source": "wiki.json" }`.
- [ ] Levantas tu mod local y ves el botón "Wiki" en la tarjeta.
- [ ] El viewer renderiza tu contenido correctamente.
- [ ] Los links externos abren en nueva pestaña.
- [ ] Si tienes idioma del jugador distinto al tuyo, ves el banner
      de locale fallback.

---

## Ejemplo realista (Snake Classic — Gameplay Tuner)

```jsonc
// game-mods/snake-classic/studio.gameplay-tuner/wiki.json
{
  "format": 1,
  "primaryLocale": "en",
  "i18n": {
    "en": {
      "overview": "# Gameplay Tuner\n\nFine-tune Snake's core values: max lives, initial speed, points per food.\n\n## Why?\n\nDefault Snake is balanced for casual players. This mod lets you tweak it for speedrunning or training.",
      "configuration": "## Settings\n\n- **Max lives**: `1..10` (default `3`)\n- **Initial speed**: `50..500` ms per tick (default `120`)\n- **Points per food**: `1..100` (default `10`)\n\nChange via the in-game mod settings tab.",
      "faq": [
        {
          "q": "Does this conflict with the Daltonic mode mod?",
          "a": "No — both can be active simultaneously."
        }
      ],
      "credits": "Studio mod by the Snake Classic team."
    },
    "es": {
      "overview": "# Gameplay Tuner\n\nAjusta valores del juego: vidas, velocidad inicial, puntos por comida.\n\n## ¿Por qué?\n\nSnake estándar está balanceado para casual. Este mod te deja jugar speedrun o entrenamiento.",
      "configuration": "## Ajustes\n\n- **Vidas máximas**: `1..10` (def. `3`)\n- **Velocidad inicial**: `50..500` ms (def. `120`)\n- **Puntos por comida**: `1..100` (def. `10`)\n\nCámbialos desde el tab de mods.",
      "faq": [
        {
          "q": "¿Choca con el mod Daltónico?",
          "a": "No — ambos pueden estar activos a la vez."
        }
      ],
      "credits": "Mod de estudio del equipo Snake Classic."
    }
  }
}
```

---

## Preguntas frecuentes (del modder)

**¿Puedo poner imágenes?** No. El renderer no soporta imágenes — si
necesitas mostrar capturas, súbelas a tu repo y linkea desde un
párrafo con `[Ver captura](https://github.com/.../screenshot.png)`.

**¿Puedo embeber un video?** No. Linkea a YouTube/Vimeo desde un
párrafo.

**¿El JSON afecta el peso del bundle?** Sí, pero se carga al
discovery y queda cacheado. Límite 256KB por mod — más que suficiente
para wikis típicas.

**¿Puedo declarar wiki en un mod sideloaded?** Sí — el `LocalModSource`
lee `wiki.json` igual que el `BundledModSource`.

**¿Mi mod sin wiki pierde algo?** Solo el botón. Todos los campos
obligatorios del mod (`metadata.name`, `metadata.description`) siguen
visibles en la tarjeta del Mods Manager.
