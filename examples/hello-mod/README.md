# Hello Mod

Mod canónico de ejemplo. Útil como punto de partida.

## Clonar

```bash
npx degit leteoworks/mod-portal-snake-classic/examples/hello-mod my-mod
cd my-mod
pnpm install
pnpm build
```

## Estructura

```
hello-mod/
├── mod.json        Manifest
├── src/index.ts    Entry source (TypeScript)
├── dist/mod.js     Output del build (gitignored)
└── package.json    Dependencias del build
```

## Sideload local

```bash
# 1. Build el mod
pnpm build

# 2. Copia a userData (Snake Classic en Electron)
#    macOS:
cp -r . ~/Library/Application\ Support/snake-classic/mods/examples.hello-mod
#    Windows:
#    xcopy . %APPDATA%\snake-classic\mods\examples.hello-mod /s /i
#    Linux:
#    cp -r . ~/.config/snake-classic/mods/examples.hello-mod

# 3. Abre el juego con sideload activo (build dev o easter egg en
#    build retail). Tu mod aparece en Settings → Mods con badge
#    "Sideload (dev)".
```

## Publicar a Workshop

Ver [/publishing](/publishing) en el portal.

## Próximos pasos

- Sustituye `dist/mod.js` por tu lógica.
- Añade más toggles / sliders en el `settingsTab`.
- Suscríbete a más eventos (`POWERUP_SPAWNED`, `GAME_OVER`, ...).
- Mira el mod oficial "Fun Config" para ejemplos avanzados.
