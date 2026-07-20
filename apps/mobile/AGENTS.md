# apps/mobile — paused

**Status: on hold.** Expo mobile is not under active development.

## Agent / automation instructions

- **Skip this directory** for monorepo-wide scans, refactors, migrations, dependency upgrades, lint/typecheck fixes, and “update all apps” tasks unless the user explicitly asks to work on mobile.
- Do not treat mobile build/typecheck failures as blockers for web, api, desktop, or extension work.
- Prefer leaving this package unchanged when touching shared packages (`@folio/api`, `@folio/ui`, etc.); only update mobile if a shared change would otherwise break the workspace install, and keep diffs minimal.

## Resume later

When mobile development restarts, remove or rewrite this note and the matching section in `README.md`.
