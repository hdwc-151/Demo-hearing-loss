# Build and deployment readiness

Native builds and server deployment are separate acceptance gates. A successful
Simulator compile is not a signed iPhone release or a HealthKit device test.

## Without developer accounts

- Mobile builds now run on frontend pull requests and main pushes, plus manual
  runs and version tags. Download `hearatlas-android-debug` from the run artifacts
  to install on an Android test device. Debug APKs are not Google Play releases.
- iOS Simulator builds run on macOS without Apple signing credentials. Installing
  a distribution build or using TestFlight still needs Apple Developer signing.
- The HealthKit-specific workflow also checks relevant changes after merge to
  main and when dependency lock files change.
- Run `node --test frontend/scripts/healthkit.test.mjs` for import validation.
  Empty, duplicate, nonnumeric, invalid and future-dated records must be rejected.
  Native results no longer transfer the Health sample UUID into the web view.

## Backend container

From the repository root:

```sh
docker build -t hearatlas-api backend
docker run --rm -p 127.0.0.1:8000:8000 hearatlas-api
python scripts/check_backend.py http://127.0.0.1:8000
```

The Backend container workflow builds the actual image and checks `/health`,
`/presets` and `/scenarios`. This catches packaging/startup failures that unit
tests alone do not detect. It does not deploy a public service.

For a public host, configure a container service using `backend/Dockerfile`,
build context `backend/`, and container port 8000. Configure HTTPS and
`ALLOWED_ORIGINS` with the exact frontend origin (no path), for example
`https://hdwc-151.github.io`. Keep `LLM_API_KEY` only in the host secret store;
the rule-based fallback works without it. Do not expose the LLM-backed endpoint
publicly until host-level request limits and usage budgets are configured.

Verify the actual deployed URL with:

```sh
python scripts/check_backend.py https://YOUR_API_HOST
```

Retain the commit SHA, image digest, host deployment URL and check output as
release evidence. Test CORS from the actual web origin and the server option in
the app. Pages remains offline-first until a server is explicitly selected.

## Remaining release evidence

| Gate | Required evidence |
| --- | --- |
| Android distribution | Keystore kept outside git, signed AAB, unique version code, device checks, Play internal test |
| iOS distribution | Apple team, matching bundle ID/profile/HealthKit entitlement, signed archive, TestFlight |
| HealthKit | Issue #31 device acceptance: empty/denied/revoked data, both ears, OS compatibility, privacy/network inspection |
| Backend production | Public HTTPS endpoint, smoke check, exact CORS origin, limits/monitoring and deployment rollback procedure |

Do not close issue #31 based on Simulator or JavaScript checks. Record real-device
results separately, without uploading personal audiograms or sample identifiers.
