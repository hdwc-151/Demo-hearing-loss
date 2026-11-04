# Audit archive → Product Foundation (2026-11-04)

**Source:** user-supplied historical archive `Demo IEC.zip` plus 5 nested ZIPs under `Hearing/Hearing/`. Outer archive: 482 non-Git files, of which 273 code/text files were indexed. Combined index: 421 code/text records (273 outer + 148 nested), **222 distinct SHA-256 contents** within the chosen source-file extensions. These are archive inventory counts, not releases, verified implementations or clinical artifacts. Full per-file manifest is distributed separately with the research pack.

## Distillation matrix

| Historical artifact | Reusable concept | Current disposition |
| --- | --- | --- |
| `Simulator.py` | Simple low-pass filtering as engineering baseline | Preserve; do **not** represent as a realistic cochlear loss model |
| `Noi suy Log tan so.java` | Log-frequency interpolation across audiogram points | Keep approach; label scene acoustic dB examples as illustrative, not calibrated SPL |
| `Speech banana.py`, `Ver6/Ver7 PHONEME_MAP_VI.md` | Vietnamese onset/nucleus/coda, regional pronunciations and phrase illustration | Continue phoneme regression, verify with linguistic test corpus; not precise representation of an individual listener |
| `Logic 4 Graph Audiology.py`, `backend_core.py` | Scenario-guided explanation, keyword graph and communication advice | Evolve to an evidence graph with source URLs, claim types, review and safety checks |
| `Master/final/fullstack` | Separate backend/React engines, tests and fixtures | Keep current canonical app; avoid copying duplicate generations |
| `Ver1–Ver7`, Hotfix and nested bundle ZIPs | Offline single-file usability, version diffs, audit trail | Preserve all; salvage QA fixtures and usability patterns |
| Early GAN and masking systems | Research ideas for environmental sound | Require datasets, checksums, rights and perceptual benchmark before production use |

## Discovery highlights

1. **Speech-banana visual masking** is an educational metaphor, not a phoneme-by-phoneme prediction of what a specific person will or will not understand.
2. **GraphRAG currently contains only 6 local nodes** and generates medical-style explanations without per-claim citations; design a licensed evidence library and risk-aware routing before training a chatbot.
3. **Scene scripting** appears repeatedly across shopping, restaurant, family and traffic. Use these as the editorial source for carefully reviewed conversation scenarios.
4. **Legacy demo archives stay immutable**, including both HTML snapshots at `archive/demos/`; no historical object was modified as part of this rebrand.
5. **Model training must not use** deidentified-looking personal health data, audio with unclear reuse rights, or user records without appropriate authorization and separate consent.

## Engineering gates

- Profile schema must distinguish **simulated** versus **measured**, left/right ears, conduction mode, dB HL/dB SPL/dBFS, missing values and provenance.
- Keep deterministic reference fixtures, unit tests, browser E2E, offline PWA and old demo SHA preservation.
- Preserve native bundle identifiers, API URLs and existing settings keys until a backward-compatible migration and release has been tested.
- Do not treat archived documentation about “SaMD” as permission to market unvalidated clinical decision software.
