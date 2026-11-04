# React 19 compatibility upgrade — 2026-11-04

## Why old Dependabot PR #18 failed

GitHub Actions `41796707395` failed **before tests**, in `npm ci` with
`ERESOLVE`: the old PR bumped `react-dom` to 19.3.1 but left `react`
at 18.3.1 and `zustand` at 4.5.5 (which depends on an older
`use-sync-external-store` shim with a React <=18 peer range).

The replacements are **paired, exact versions**:
- React 19.3.1
- React DOM 19.3.1
- Zustand 5.0.16 (React 19 compatible; removes legacy external-store shim)
- transitive scheduler 0.28.0

The package-lock v3 contains published SHA-512 integrities from existing
Dependabot-generated lockfiles in this repo for React DOM, Zustand, scheduler;
React's SHA-512 registry integrity matches public npm lock records.
Never bypass peer checks with `npm ci --force` or `--legacy-peer-deps`.

## Regression and rollback

Run `cd frontend && npm ci && npm test && npm run build`; then Chromium
browser tests, single-file demo and offline PWA via CI. React 19 removes
legacy DOM APIs; this app already uses `react-dom/client` createRoot.

Zustand 5 requires stable selector return values under React's
`useSyncExternalStore`. Store selectors should read stable individual
properties and avoid constructing new arrays/objects on every render.
If a test regresses, revert the whole 3-package set and lockfile, never only
one of React or React DOM.

The two historical HTML demo snapshots remain unchanged at
`archive/demos/` and existing code/data archives remain intact.
