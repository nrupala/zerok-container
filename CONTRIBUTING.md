# Contributing to zerok-container

## Workflow (PR-flow discipline)

- Work happens on feature branches — **never push directly to the default branch**.
- Open pull requests as **draft** first. Mark ready only when:
  - tests are green (`python3 run-tests.py`; browser tests in `pwa/index.html`
    verified on load),
  - the CHANGELOG has an entry under `## [Unreleased]`,
  - the `VERSION` file was bumped (patch = fix, minor = feature, major = breaking),
  - the PR description states what was verified vs what was not.
- The owner merges. Merge commits reference the PR number.
- Releases are tagged `vX.Y.Z` after merge. CI reads the `VERSION` file for
  the APK artifact name, so bump it before tagging.

## Build and test

```bash
python3 run-tests.py            # root Python test runner (from repo)
python tests/test_zerok.py      # CLI tests (per tests/README.md)
python tests/test_client.py
cd pwa && python3 -m http.server 8080   # serve PWA locally for browser tests
```

Android APK builds in CI (`.github/workflows/main.yml`, Gradle `assembleDebug`);
the APK artifact is versioned from the `VERSION` file.

## License

License text is currently a placeholder stub — see the PR body. Do not add
license headers to source files until the owner confirms the license.
