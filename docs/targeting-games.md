<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm mods:sync-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# Targeting your mod to a specific game

Your mod declares which game it targets. This guide covers how to
pick the right target and why your mod will work in different
bundles (standalone, collections) without you needing to publish
multiple copies.

---

## `target.gameId` — the key decision

```json
{
  "target": { "gameId": "snake-classic", "gameVersion": "^1.0.0" }
}
```

`gameId` is the game's **logical identity** within the framework,
not its commercial name nor AppID. Immutable throughout the
game's lifetime.

You'll find it in:
- `docs/games/<id>/README.md` of the studio's repo.
- The game's "About" screen (usually shows it).
- The SDK / host-api-changelog docs.

When in doubt: ask the studio. It's public information.

---

## Why you don't target the bundle

```
❌ "target.gameId": "classics-collection"
❌ "target.steamAppId": 1234567
✅ "target.gameId": "snake-classic"
```

The framework is designed so the same mod works in:
- Snake Classic standalone (Steam App ID 1234567)
- Snake Classic inside Classics Collection (Steam App ID 4707310)

Targeting the logical `gameId` guarantees both with no effort.
Targeting the bundle would tie you to one.

---

## Workshop and Steam AppIDs

Workshop publishes against an AppID. Your mod appears under the
AppID you choose to publish.

The framework maintains an internal mapping:

```
gameId 'snake-classic' → discovered AppIDs: [1234567, 4707310]
```

This means: if you publish your mod on Workshop under AppID
1234567 (standalone), Classics Collection players (AppID
4707310) will also see it and can install it.

Recommendation: publish under the **standalone** AppID (usually
has more distribution). If only the collection exists, publish
against that one.

---

## `target.gameVersion` — compatible range

```json
"target": {
  "gameId": "snake-classic",
  "gameVersion": "^1.0.0"
}
```

SemVer range:
- `^1.0.0`: compatible with 1.0.0, 1.5.7, 1.99.99 — NOT 2.0.0.
- `~1.0.0`: compatible with 1.0.x — NOT 1.1.0.
- `>=1.0.0`: any version from 1.0.0 on, no upper bound.
- `1.0.183`: only that exact version.

Those are the four forms the game understands. A compound range
(`>=1.0.0 <2.0.0`) is NOT supported: the game only reads the first
term (that is `>=1.0.0`, with no upper bound) and ignores the rest. A
bare `<` (`<2.0.0`) matches no version and your mod is marked
`incompatible`.

Use the widest range you've tested. If you only tested with
2.3.0:

```
"gameVersion": "^1.3.0"   // good
"gameVersion": "^1.0.0"   // optimistic; might break with 1.0.x
```

After testing with a new game version, **publish a new version
of your mod** with the widened range.

---

## `requires.hostApi` — the other half of the contract

```json
"requires": { "hostApi": "^2.0.0" }
```

This compares against the game's `host.api.version`. When the
game's host API changes MAJOR (breaking), your mod is marked
`incompatible` until you publish a version with the new range. It
has happened once already: Snake Classic exposes `2.0.0` since
Oct 2026 (it removed `fx.ctx`, `fx.pixelate`, `helpers.ringBurst`
and `helpers.radialLight` from the `renderFx` frame), so a mod with
`^1.x` does not load until it asks for `^2.0.0`.

The studio maintains
`docs/games/<id>/host-api-changelog.md` with each change. Follow
it if you want to know when you need to re-publish.

---

## `requires.dlcs` — DLC dependencies

If your mod modifies DLC content:

```json
"requires": { "dlcs": ["snake-classic.endless-plus"] }
```

The loader checks `EntitlementService.hasAccess()` before
activating your mod. If the DLC isn't owned, the mod appears
"requires DLC X" with a clear message to the player.

For mods that **work without the DLC but gain features with
it**: don't declare it as required. Inspect
`host.entitlements.getActiveDlcs()` in your code and adapt
behavior.

---

## Multi-game targets

**Not supported**: a mod targets **one single game**. If you want
it to work on multiple framework games, publish multiple mods
(one per game) sharing common code you maintain.

Reason: every game has its own host API, its own policy, its own
surfaces. "A universal mod" would be fragile.

---

## Summary

- Target the logical `gameId`, not the AppID nor the commercial
  name.
- SemVer ranges in `target.gameVersion` and `requires.hostApi` (exact, `^`, `~` or `>=`).
- Your mod automatically works in standalone and in bundles
  (Classics Collection) that mount that game.
- Workshop mapping: publish against one AppID, discovered from
  all.
- Required DLCs declared in `requires.dlcs[]`.
