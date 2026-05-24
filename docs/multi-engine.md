<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm sync:mod-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# Elegir motor para tu mod

Tu mod declara qué motor necesita en `mod.json`. Esta guía te ayuda a
elegirlo bien.

> Contexto técnico de cada motor: [../engines/](https://github.com/leteo/my-game-fw/blob/main/docs/mods/engines/).

---

## La pregunta clave

**¿Qué hace tu mod?** La respuesta dicta el motor.

| Tu mod... | Motor recomendado |
|---|---|
| Aporta tabs de settings con formularios | `quickjs-declarative-ui` |
| Solo es lógica (escucha eventos, modifica parámetros) | `isolated-vm` (Electron) o `quickjs` (cross-platform) |
| Aporta UI HTML rica (dashboards, gráficos) | `iframe-sandbox` |
| Tiene visualización propia con canvas | `web-worker-offscreen-canvas` |
| Es perf-crítico y trusted | `ses-compartment` |

---

## Forma del campo

```json
"engine": {
  "preferred": "quickjs-declarative-ui",
  "fallbacks": ["isolated-vm", "quickjs"]
}
```

- `preferred`: motor que el framework intenta primero.
- `fallbacks`: si `preferred` no está disponible (no en
  `policy.engines` del juego, kill-switched, o no en la plataforma),
  el loader prueba estos en orden.

Lista de motores válida: ver
[../architecture/mod-engine-capability.md § "EngineId"](https://github.com/leteo/my-game-fw/blob/main/docs/mods/architecture/mod-engine-capability.md).

---

## Fallbacks útiles

### "Quiero que funcione en todas las plataformas"

```json
"engine": {
  "preferred": "isolated-vm",
  "fallbacks": ["quickjs", "quickjs-declarative-ui"]
}
```

isolated-vm es ideal en Electron; quickjs funciona en todas. Si la
build es móvil bundled-only, isolated-vm no existe → fallback a
quickjs.

### "Quiero perf máxima si el estudio confía en mí"

```json
"engine": {
  "preferred": "ses-compartment",
  "fallbacks": ["isolated-vm", "quickjs"]
}
```

SES es rápido pero share heap. Si el juego no lo permite (porque no
confía en mods), fallback a isolated-vm/quickjs.

### "Necesito UI HTML; sin ella no tiene sentido"

```json
"engine": {
  "preferred": "iframe-sandbox",
  "fallbacks": []
}
```

Lista vacía: si iframe no está disponible, el mod queda
`incompatible`. Mejor que un fallback inadecuado.

---

## Restricciones por motor

### isolated-vm

- Solo Electron. En web/iOS/Android no existe.
- Si publicas un mod solo-isolated-vm, marca claramente "Solo Electron"
  en metadata.

### web-worker-offscreen-canvas

- Worker tiene `fetch` por defecto, pero el framework lo elimina antes
  de cargar tu mod. Si tu mod intenta `fetch(...)` directo, tirará
  `ReferenceError`. Usa `host.http` en su lugar.

### iframe-sandbox

- Sin `allow-same-origin`. No puedes acceder a localStorage del
  juego, ni cookies, ni padres.
- CSP estricta. Sin `connect-src` para hosts externos directos; HTTP
  va por `host.http`.

### quickjs / quickjs-declarative-ui

- Sin DOM. Si necesitas DOM, prefiere iframe.
- Marshalling per call. Para 10k calls/seg, batch.

### ses-compartment

- Same heap. Loop infinito cuelga el juego.
- Solo apto si el estudio te marca trust tier elevado.

### shadow-realm

- Disponibilidad irregular (2026). El framework detecta runtime; si
  no está, fallback.

---

## Cómo verificar que tu motor está soportado

El juego documenta sus motores aceptados en su host-api-changelog. Si
no aparece allí, no está soportado por ese juego — usa fallback o
elige otro motor.

---

## Resumen

- Elige el motor según lo que **hace** tu mod.
- Pon fallbacks razonables — un mod sin fallbacks falla si el motor
  preferido no está.
- Si tu mod depende crítico de capabilities de un motor concreto, no
  pongas fallbacks engañosos: prefiere lista vacía + mensaje claro.
- Los motores cross-platform (quickjs, quickjs-declarative-ui,
  ses-compartment, iframe, worker, shadow-realm) son la opción más
  amplia. isolated-vm es solo Electron.
