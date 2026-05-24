<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm mods:sync-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# Publicar tu mod

Cómo publicar un mod ya completo a Steam Workshop, mantener releases y
optar a niveles de verificación.

---

## Antes de publicar — checklist

- [ ] Probado en sideload local con la versión actual del juego.
- [ ] Probado al menos con 1 mod más activo simultáneamente (para
      detectar interacciones).
- [ ] Probado tras restart del juego (state persistido correctamente).
- [ ] Probado con/sin DLCs declarados en `requires.dlcs`.
- [ ] `mod.json` válido (`pnpm exec mod-validator` o similar
      proporcionado por el SDK del estudio si existe).
- [ ] Iconos / screenshots preparados (PNG, <500KB cada uno).
- [ ] `metadata.description` clara, sin typos.
- [ ] Changelog escrito (si es update de versión anterior).
- [ ] License declarada (MIT, GPL, custom...).

---

## Steam Workshop — proceso

### 1. Empaquetar

Crea un `.zip` con la estructura:

```
my-mod.zip
├── mod.json
├── dist/
│   └── mod.js
├── assets/
│   ├── icon.png
│   └── screenshots/
└── locales/
```

Tamaño máximo recomendado: 5 MB. Workshop acepta más pero el download
lento penaliza.

### 2. Steam Workshop client

Desde Steam, abre el juego (Snake Classic o equivalente) → menú →
Workshop → "Create New Item". Sube el `.zip`.

Campos:
- **Title**: `metadata.name` por defecto.
- **Description**: pega un README con secciones (qué hace, capturas,
  changelog).
- **Visibility**: public / friends only / unlisted.
- **Tags**: usa los del catálogo del juego (el estudio define).

### 3. Submit

Tras subida exitosa, el Workshop ID es generado. **Guárdalo** —
luego te servirá para updates.

### 4. Verificación (opcional)

El estudio puede ofrecer un flow de "verificación" de modders:
- Aplica via formulario.
- Pasas test de detección de malware en tu mod.
- Aceptas TOS específicos.
- Recibes una clave de firma o flag que sube tu trust tier a
  `workshopVerified`.

Mods verificados:
- Sin prompt al jugador en su activación.
- Permisos estándar otorgados sin extra confirmación.
- Banner "Verified" visible en Workshop y en settings del juego.

---

## Updates

Para publicar una versión nueva:

1. Bumpea `version` en `mod.json` (PATCH / MINOR / MAJOR según
   cambios).
2. Empaqueta el nuevo `.zip`.
3. En Steam Workshop, abre tu item existente → "Update Item" → sube el
   nuevo zip.
4. Añade entrada al changelog.

Update automático para jugadores:
- Si publicaron `1.0.0`, instalan `1.1.0` (MINOR): sus settings se
  mantienen.
- Si publican `2.0.0` (MAJOR): el cliente del jugador **resetea
  settings** del mod automáticamente al actualizar (avísalo en el
  changelog).

---

## Sideload distribution

Si tu mod no va a Steam Workshop (private mod, beta cerrada,
playtest):

1. Distribuye el `.zip` por tus canales (GitHub releases, página web,
   Discord, etc.).
2. El jugador descomprime en `<userData>/<gameId>/mods/<modId>/`.
3. Reinicia el juego.

Sideload mods son `unsigned` salvo que firmes con clave pública
declarada (avanzado — ver firma manual con `ed25519` en
[../security/signing-and-trust.md](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/security/signing-and-trust.md)).

---

## Versionado y compat

Cuando el juego anuncia una nueva versión MAJOR:
- Tu mod con `requires.hostApi: '^1.0.0'` queda `incompatible` con
  juego v2.x.
- Probablemente necesites reescribir partes que dependían de la host
  API antigua. Consulta el `host-api-changelog`.
- Publica `2.0.0` (MAJOR de tu mod) con `requires.hostApi: '^2.0.0'`.

Los jugadores con la versión vieja del juego pueden seguir usando
tu mod v1.x; los que actualizaron a v2.x descargan tu v2.0.0.

Workshop maneja la entrega de versiones compatibles automáticamente si
declaraste los rangos correctamente.

---

## Si tu mod entra en quarantine

El framework marca mods que fallan repetidamente como `quarantined`.
Los jugadores ven un mensaje "Este mod falló — autor podría haber
publicado una corrección". Tu trabajo:

1. Reproduce el fault local con la última versión del juego.
2. Arregla.
3. Publica una versión nueva (PATCH bump).
4. Comunica en la página del Workshop: "v1.2.4 arregla el crash de
   v1.2.3".

Los jugadores des-quarantine-an manualmente desde settings tras
actualizar. El framework no auto-des-quarantine.

---

## Si recibes reportes de seguridad

Si alguien reporta que tu mod podría tener un problema de seguridad
(filtrar datos, hacer requests no declarados, etc.):

1. **Toma en serio** incluso si parece menor.
2. Audita tu código.
3. Publica un fix.
4. Comunica con transparencia en tu changelog.

Si los reportes son válidos y graves, el estudio puede kill-switch tu
mod remotamente (apagado en clientes sin update). Eso suele significar
final de la relación con la plataforma.

---

## Resumen

- Checklist exhaustivo antes de cada release.
- Workshop process directo desde Steam client.
- Verification flow opcional, sube tu trust tier.
- SemVer estricto en updates.
- Quarantine recoverable con fix.
- Seguridad in incumplir → kill-switch terminal.
