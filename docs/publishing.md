<!--
  ⚠ ARCHIVO AUTOGENERADO.
  Editar la fuente en docs/mods/mod-development/ del monorepo y
  ejecutar `pnpm mods:sync-portal-docs`. NO editar manualmente aquí
  — los cambios se sobrescriben en la siguiente sincronización.
-->

# Publishing your mod

How to publish a finished mod to Steam Workshop, maintain
releases, and qualify for verification tiers.

---

## Before publishing — checklist

- [ ] Tested in local sideload with the current game version.
- [ ] Tested with at least 1 other mod active simultaneously (to
      catch interactions).
- [ ] Tested after game restart (state persisted correctly).
- [ ] Tested with/without DLCs declared in `requires.dlcs`.
- [ ] Valid `mod.json` (`pnpm exec mod-validator` or similar
      provided by the studio's SDK if it exists).
- [ ] Icons / screenshots prepared (PNG, <500KB each).
- [ ] `metadata.description` clear, no typos.
- [ ] Changelog written (if update of previous version).
- [ ] License declared (MIT, GPL, custom...).

---

## Steam Workshop — process

### 1. Package

Create a `.zip` with the structure:

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

Recommended max size: 5 MB. Workshop accepts more but slow
downloads penalize you.

### 2. Steam Workshop client

From Steam, open the game (Snake Classic or equivalent) → menu →
Workshop → "Create New Item". Upload the `.zip`.

Fields:
- **Title**: `metadata.name` by default.
- **Description**: paste a README with sections (what it does,
  screenshots, changelog).
- **Visibility**: public / friends only / unlisted.
- **Tags**: use the ones from the game's catalog (the studio
  defines them).

### 3. Submit

After successful upload, the Workshop ID is generated. **Save
it** — you'll need it later for updates.

### 4. Verification (optional)

The studio may offer a "modder verification" flow:
- Apply via form.
- Pass malware detection test on your mod.
- Accept specific TOS.
- Receive a signing key or flag that raises your trust tier to
  `workshopVerified`.

Verified mods:
- No prompt to the player on activation.
- Standard permissions granted without extra confirmation.
- "Verified" banner visible in Workshop and in the game's
  settings.

---

## Updates

To publish a new version:

1. Bump `version` in `mod.json` (PATCH / MINOR / MAJOR according
   to changes).
2. Package the new `.zip`.
3. In Steam Workshop, open your existing item → "Update Item" →
   upload the new zip.
4. Add a changelog entry.

Automatic update for players:
- If they had `1.0.0` and you publish `1.1.0` (MINOR): their
  settings are preserved.
- If you publish `2.0.0` (MAJOR): the player's client **resets**
  the mod's settings automatically on update (announce it in the
  changelog).

---

## Sideload distribution

If your mod isn't going to Steam Workshop (private mod, closed
beta, playtest):

1. Distribute the `.zip` via your channels (GitHub releases, web
   page, Discord, etc.).
2. The player extracts to `<userData>/<gameId>/mods/<modId>/`.
3. Restart the game.

Sideload mods are `unsigned` unless you sign with a declared
public key (advanced — see manual signing with `ed25519` in
[../security/signing-and-trust.md](https://github.com/leteoworks/my-game-fw/blob/main/docs/mods/security/signing-and-trust.md)).

---

## Versioning and compatibility

When the game announces a new MAJOR version:
- Your mod with `requires.hostApi: '^1.0.0'` is marked
  `incompatible` with game v2.x.
- You'll probably need to rewrite parts that depended on the old
  host API. Check the `host-api-changelog`.
- Publish `2.0.0` (MAJOR of your mod) with `requires.hostApi:
  '^2.0.0'`.

Players with the old game version can keep using your mod v1.x;
those who upgraded to v2.x download your v2.0.0.

Workshop handles delivery of compatible versions automatically
if you declared the ranges correctly.

---

## If your mod enters quarantine

The framework marks mods that fail repeatedly as `quarantined`.
Players see a "This mod failed — the author may have published a
fix" message. Your job:

1. Reproduce the fault locally with the latest game version.
2. Fix.
3. Publish a new version (PATCH bump).
4. Communicate on the Workshop page: "v1.2.4 fixes the v1.2.3
   crash".

Players un-quarantine manually from settings after updating. The
framework does not auto-un-quarantine.

---

## If you receive security reports

If someone reports that your mod might have a security issue
(leaking data, making undeclared requests, etc.):

1. **Take it seriously** even if it seems minor.
2. Audit your code.
3. Publish a fix.
4. Communicate transparently in your changelog.

If the reports are valid and serious, the studio can kill-switch
your mod remotely (shut down on clients without update). That
usually means the end of the relationship with the platform.

---

## Summary

- Exhaustive checklist before each release.
- Workshop process direct from the Steam client.
- Optional verification flow raises your trust tier.
- Strict SemVer on updates.
- Quarantine recoverable with a fix.
- Security non-compliance → terminal kill-switch.
