<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm mods:sync-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# Featured mods

Selection curated by the studio. No algorithms: a team member
picks, and the list lives in
[`featured.json`](https://github.com/leteoworks/mod-portal-snake-classic/blob/main/featured.json)
in the portal repo. Choices are documented in
[`operations/featured-mods-curation.md`](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/operations/featured-mods-curation.md)
in the framework repo.

> **This is not a partnership or paid system**. Appearing here
> doesn't imply a commercial agreement — it's free recognition
> for the modder's work. If the verification tier
> (`workshopVerified`) is activated in the future, featured mods
> may pass to the verified tier with a separate process.

---

## Mod of the month

<!-- Auto-filled by the portal build from featured.json#modOfTheMonth.
     While no one is featured (default null), this section shows
     the placeholder. -->

_No nominee for this month. Know a mod that deserves the
spotlight? Open it on
[Workshop Discussions](https://steamcommunity.com/app/TBD/workshop/)
with the "Featured nomination" tag._

---

## Current selection

<!-- Auto-filled by the portal build from featured.json#featured.
     Iterating manually below in this markdown is NOT necessary —
     the portal's build script regenerates it. Keeping this file
     as "human source" + JSON as "machine-readable source" is the
     canonical pattern. -->

### Fun Config — by Studio Leteo

`studio.fun-config` · _First Party · Customization_

Official first-party mod. Customize power-ups, speed, and
progression with fun presets. Serves as a living reference for
modders just starting — its code lives in
[`submodules/game-mods/snake-classic/studio.fun-config/`](https://github.com/leteoworks/my-game-fw-mods/tree/main/snake-classic/studio.fun-config)
of the first-party mods subrepo, open and clonable.

---

## How to nominate a mod?

1. The mod must be published on Steam Workshop with visibility
   Public.
2. Open a thread on the game's Workshop Discussions with title
   `Featured nomination: <modId>`.
3. Include 2-3 sentences on why the mod deserves the spotlight.
4. The studio reviews nominations periodically (not instant —
   expect days/weeks).
5. If it makes it in, it appears here + on the portal home. The
   modder gets a ping on Workshop Discussions.

## How does it get removed?

Auto: curation **resets every 6 months** to avoid featured mods
staying indefinitely. Very long-lived mods (e.g. Fun Config)
re-appear after review.

Reactive: if the studio detects that a featured mod has become
problematic (persistent bugs, author abandoned, malicious
behavior discovered), it leaves featured immediately. Extreme
case → operational kill-switch (see
[`kill-switch-runbook.md`](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/operations/kill-switch-runbook.md)).
