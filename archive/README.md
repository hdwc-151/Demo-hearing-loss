# Repository map — Dr. Bunny

## Maintained entry point

This repository's root now contains the canonical Dr. Bunny app (previously inside `dr-bunny/`).

| Path | Responsibility |
| --- | --- |
| `backend/` | FastAPI and Python signal/phoneme/GraphRAG logic |
| `frontend/` | React/Vite, offline PWA, Capacitor Android/iOS project |
| `demo/` | Single-file browser demo |
| `tests/` | Python, JS parity and browser test suites |
| `docs/` | API, design, architecture, testing, deployment |
| `mobile/` | Resources and release information |
| `legacy/` | Canonical application's early prototype |
| `.github/` | CI, Pages and mobile workflows now active at repository root |

## Preserved old work

- `archive/previous-root/`: former root README, standalone experiments, source scripts, media, and workshop assets.
- `archive/versioned-implementations/`: original `Hearing/`, `Master/`, `final/`, `old version/` directories.

Archive material is for historical reference, **not another supported application entry point**. Git commit history is preserved. No files from the prior main tree were dropped; top-level entries were moved to the canonical root or archive.

## Migration safety

Reorganization is based on GitHub main commit `6e5ffc2d80751b7d24856ee0de67b192a494264b`. Uncommitted work from a local computer cannot be included automatically: review local `git status` and keep or stash local edits before pulling. This change does not force-push or rewrite history.

## Validation

The reorganized application passed 49 Python pytest tests and GraphRAG dev/holdout evaluation (12/12 and 8/8). JS-Python parity tests passed 111/111 phoneme, 8/8 constants and 87/87 GraphRAG cases locally. Full frontend dependency installation/build and browser E2E remain to be verified through CI; do not treat their status as passing until confirmed.

## Demo archive policy

Every distinct historical HTML demo must remain available in `archive/demos/` with its source commit/sha recorded in `archive/demos/README.md`. Never remove or overwrite old demo snapshots. Before regenerating `demo/index.html`, `frontend/scripts/build-demo.mjs` automatically saves an unchanged SHA-256-named copy when the bytes differ. CI's temporary `dist/demo.html` is a build artifact and is excluded from this policy. Do not treat an unchanged HTML blob as multiple different builds; Git history documents the related React source releases.
