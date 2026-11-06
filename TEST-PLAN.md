# Test plan — zerok-container

## Scope

Testing covers the Python encrypted-blob core (`zerok/` — AES-GCM blob
encrypt/decrypt round-trips, blob-id behaviour, nonce randomness; 11 tests),
the Android debug build of the app shell (`android/`,
`io.zerok.container.MainActivity`, which embeds the PWA assets), and the PWA
artifact job. The PWA surfaces (`pwa/`, root `index.html`/`sw.js`/
`zerok-vault.js`, `pwa-creator/`) have no automated functional tests today;
they are covered by CodeQL static analysis and manual exercise. The GUI
(`gui/app.py`) and the storage server (`server/app.py`) are likewise not
covered by automated tests today; they are exercised manually per
`initial_use.md`.

## Suites

| Suite | Covers | Run it | Runs in CI |
|---|---|---|---|
| pytest suite (`tests/test_blob_integrity.py`, `tests/test_invariant.py`) | AES-GCM encrypt/decrypt round-trips via `zerok.crpyto`, blob encrypt/decrypt and blob-id non-determinism via `zerok.blob` | `pip install cryptography blake3 argon2-cffi requests pytest && python -m pytest tests/ -q` (module form, so the repo root is on `sys.path` and the `zerok` package imports) | Yes — `Tests` workflow (`.github/workflows/tests.yml`) |
| Android debug build | Manifest merge, resource/link and compile of the Android shell at compileSdk/targetSdk 34 | `cd android && ./gradlew assembleDebug` (CI downloads Gradle 8.2 directly) | Yes — `Build APK and PWA` workflow (`.github/workflows/main.yml`), `build-apk` job |
| PWA artifact validation | Presence of the `pwa/` payload | CI lists and uploads `pwa/` | Yes — same workflow, `build-pwa` job |
| CodeQL static analysis | Python, Java/Kotlin and JavaScript/TypeScript surfaces | GitHub CodeQL | Yes — `CodeQL` workflow (`.github/workflows/codeql.yml`), push/PR + weekly |

## CI gates

- Full pytest suite green on every push and pull request to `main`
  (the `Tests` workflow surfaces its output tail as a check annotation on
  failure).
- `Build APK and PWA` green on every push to `main` and on `v*` tags; the
  workflow surfaces the Gradle "What went wrong" section as a check
  annotation on failure so the reason is readable from the run.
- CodeQL runs on push/PR and weekly; findings are dispositioned (fixed, or
  dismissed with a specific reason) on the house SLA.

## Cadence

- Every push / pull request: pytest suite, Android APK + PWA build, CodeQL.
- Weekly: CodeQL scheduled run (Monday 05:23 UTC).
- Every release candidate: the release-readiness run (checker + evidence
  reads), per the house Release-Readiness Standard.

## Coverage bar

No numeric floor; new functionality lands with tests per CONTRIBUTING.md.
