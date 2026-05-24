<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm mods:sync-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# Apuntar tu mod a un juego concreto

Tu mod declara a qué juego va dirigido. Esta guía cubre cómo elegir el
target correcto y por qué tu mod funcionará en distintos bundles
(standalone, collections) sin que tengas que publicar varios.

---

## `target.gameId` — la decisión clave

```json
{
  "target": { "gameId": "snake-classic", "gameVersion": "^2.0.0" }
}
```

`gameId` es la **identidad lógica** del juego dentro del framework, no
su nombre comercial ni AppID. Inmutable a lo largo de la vida del
juego.

Lo encuentras en:
- `docs/games/<id>/README.md` del repo del estudio.
- La pantalla "About" del juego (suele mostrarlo).
- La doc del SDK / host-api-changelog.

Cuando dudes: pregunta al estudio. Es información pública.

---

## Por qué no apuntas al bundle

```
❌ "target.gameId": "classics-collection"
❌ "target.steamAppId": 1234567
✅ "target.gameId": "snake-classic"
```

El framework está diseñado para que el mismo mod funcione en:
- Snake Classic standalone (Steam App ID 1234567)
- Snake Classic dentro de Classics Collection (Steam App ID 4707310)

Apuntar al `gameId` lógico te garantiza ambos sin esfuerzo. Apuntar al
bundle te ataría a uno.

---

## Workshop y Steam AppIDs

Workshop publica contra un AppID. Tu mod aparece bajo el AppID que
elijas para publicar.

El framework mantiene un mapping interno:

```
gameId 'snake-classic' → AppIDs descubiertos: [1234567, 4707310]
```

Esto significa: si publicas tu mod en Workshop bajo AppID 1234567
(standalone), los jugadores de Classics Collection (AppID 4707310)
también lo verán y podrán instalarlo.

Recomendación: publica bajo el AppID **standalone** (suele tener más
distribución). Si solo existe la collection, publica contra ese.

---

## `target.gameVersion` — rango compatible

```json
"target": {
  "gameId": "snake-classic",
  "gameVersion": "^2.0.0"
}
```

SemVer range:
- `^2.0.0`: compatible con 2.0.0, 2.5.7, 2.99.99 — NO 3.0.0.
- `~2.0.0`: compatible con 2.0.x — NO 2.1.0.
- `>=2.0.0 <3.0.0`: explícito.

Pon el rango más amplio que has testeado. Si solo probaste con 2.3.0:

```
"gameVersion": "^2.3.0"   // bien
"gameVersion": "^2.0.0"   // optimista; podría romperse con 2.0.x
```

Después de testear con una version nueva del juego, **publica una
nueva versión de tu mod** con el rango ampliado.

---

## `requires.hostApi` — la otra mitad del contrato

```json
"requires": { "hostApi": "^1.0.0" }
```

Esto compara contra el `host.api.version` del juego. Si la host API
del juego pasa de 1.x a 2.x (breaking), tu mod queda `incompatible`
hasta que publiques una versión con `requires.hostApi: '^2.0.0'`.

El estudio mantiene
`docs/games/<id>/host-api-changelog.md` con cada cambio. Síguelo si
quieres saber cuándo necesitas re-publicar.

---

## `requires.dlcs` — dependencias de DLC

Si tu mod modifica contenido de un DLC:

```json
"requires": { "dlcs": ["snake-classic.endless-plus"] }
```

El loader verifica `EntitlementService.hasAccess()` antes de activar tu
mod. Si el DLC no está owned, el mod aparece "requiere DLC X" con
mensaje claro al jugador.

Para mods que **funcionan sin DLC pero ganan funciones con él**: no
lo declares como required. Inspecciona `host.entitlements.getActiveDlcs()`
en tu código y adapta el comportamiento.

---

## Multi-game targets

**No soportado**: un mod apunta a **un solo juego**. Si quieres que
funcione en varios juegos del framework, publica varios mods (uno por
juego) compartiendo código común que tú mantengas.

Razón: cada juego tiene su propio host API, su propia policy, sus
propias superficies. "Un mod universal" sería frágil.

---

## Resumen

- Apunta al `gameId` lógico, no al AppID ni al nombre comercial.
- Rangos SemVer en `target.gameVersion` y `requires.hostApi`.
- Tu mod funciona automáticamente en standalone y en bundles (Classics
  Collection) que monten ese juego.
- Workshop mapping: publica contra un AppID, descubierto desde todos.
- DLCs requeridos declarados en `requires.dlcs[]`.
