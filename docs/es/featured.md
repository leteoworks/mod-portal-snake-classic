<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm mods:sync-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# Mods destacados

Selección curada por el estudio. Sin algoritmos: una persona del
equipo elige y la lista vive en
[`featured.json`](https://github.com/leteoworks/mod-portal-snake-classic/blob/main/featured.json)
del repo del portal. Las elecciones se documentan en
[`operations/featured-mods-curation.md`](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/operations/featured-mods-curation.md)
del repo del framework.

> **No es un sistema de partnership ni pago**. Aparecer aquí no
> implica acuerdo comercial — es reconocimiento gratuito al trabajo
> del modder. Si el verification tier (`workshopVerified`) se activa
> en el futuro, los mods featured podrán pasar al tier verified con
> proceso aparte.

---

## Mod del mes

<!-- Auto-rellenado por el build del portal desde featured.json#modOfTheMonth.
     Mientras no haya nadie destacado (default null), esta sección
     muestra el placeholder. -->

_Sin nominado para este mes. ¿Conoces un mod que merezca destacarse?
Ábrelo en [Workshop Discussions](https://steamcommunity.com/app/TBD/workshop/)
con el tag "Featured nomination"._

---

## Selección actual

<!-- Auto-rellenado por el build del portal desde featured.json#featured.
     Iterar manualmente debajo en este markdown NO es necesario —
     el script de build del portal lo regenera. Mantener este
     archivo como "fuente humana" + JSON como "fuente machine-readable"
     es el patrón canónico. -->

### Fun Config — by Studio Leteo

`studio.fun-config` · _First Party · Customization_

Mod oficial first-party. Personaliza power-ups, velocidad y
progresión con presets divertidos. Sirve de referencia viva para
modders que estén empezando — su código está en
[`submodules/game-mods/snake-classic/studio.fun-config/`](https://github.com/leteoworks/my-game-fw-mods/tree/main/snake-classic/studio.fun-config)
del subrepo de mods first-party, abierto y clonable.

---

## ¿Cómo nominar un mod?

1. El mod tiene que estar publicado en Steam Workshop con
   visibility Public.
2. Abre un thread en Workshop Discussions del juego con título
   `Featured nomination: <modId>`.
3. Incluye 2-3 frases de por qué el mod merece destacarse.
4. El estudio revisa periódicamente las nominaciones (no es
   instantáneo — esperamos que pasen días/semanas).
5. Si entra, aparece aquí + en la home del portal. El modder
   recibe ping en Workshop Discussions.

## ¿Cómo se quita?

Auto: la curación es **reset cada 6 meses** para evitar que los
mods featured se queden indefinidamente. Mods muy duraderos (e.g.
Fun Config) re-aparecen tras revisión.

Reactivo: si el estudio detecta que un mod featured se ha vuelto
problemático (bugs persistentes, autor abandonó, comportamiento
malicioso descubierto), sale inmediatamente del featured. Caso
extremo → kill-switch operacional (ver
[`kill-switch-runbook.md`](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/operations/kill-switch-runbook.md)).
