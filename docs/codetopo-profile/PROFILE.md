# Codetopo Profile — Zerok Container (nrupala/zerok-container)

**What this is.** The agent-facing map of this repository, generated with
Codetopo 0.9.1 (local engine, `~/.cargo/bin/codetopo`) so an arriving agent
can see the machine — topology, trust boundaries, money surface — before it
submits or changes anything. Read this first; the graph snapshot beside it
(`snapshot.json`, `stats.json`) is the measured evidence.

- **Repo:** nrupala/zerok-container
- **Commit profiled:** `545ab5584396cb16513b128dccfd7af1207b0c60` (main)
- **Engine:** codetopo 0.9.1 · index run 2026-11-18
- **Graph:** 53 files walked · 0 failed · 931 nodes · 3241 edges · audit chain valid (3 entries, head `5696c625…e8531`)
- **Nodes by kind:** external 387 · method 301 · variable 59 · file 53 · module 53 · function 34 · doc 27 · class 16 · package 1
- **Edges by kind:** calls 2053 · contains 543 · reads 409 · defines 180 · imports 39 · writes 16 · inherits 1

## Coverage honesty

Codetopo extracts Rust, TypeScript/JavaScript and Python, plus Markdown as Doc nodes. Covered at symbol level: the Python package and tests (17 `.py` files) and the JavaScript surfaces (9 `.js` — PWA app, service workers, `zerok-vault.js`). The Markdown files (26 `.md` + 1 `.MD`) are indexed as Doc nodes only. NOT covered: the single Java file (`android/app/src/main/java/io/zerok/container/MainActivity.java`, a thin Android shell), Gradle build scripts (6), CSS/HTML assets, and the vendored `__pycache__` `.pyc` files (5, build artifacts, not source).

## Topology

A zero-trust, zero-knowledge encrypted container for files/blobs (README): data is encrypted on the client device before it is stored anywhere; the storage server never sees keys, passwords or plaintext.

- `zerok/` — the Python core package: `core.py`, `blob.py`, `client.py`, `keys.py`, `_internal.py` (and `crpyto.py` — the filename is spelled that way in the repo).
- `server/` + `server.py` — the storage server side (`server/app.py`, `server/server.py`): stores ciphertext blobs only, by design.
- `gui/app.py` — desktop GUI over the core; `pwa/` + `pwa-creator/` + root `sw.js` / `zerok-vault.js` — the installable web/PWA surface; `android/` — the Android shell hosting the web assets; `apk-builder/` — a nested copy of the Android build tree.
- `tests/` — `test_zerok.py`, `test_blob_integrity.py`, `test_client.py`, `test_invariant.py`; `docs/` carries the threat model (`docs/threat-model.md`), failure model and lifecycle docs — read them before changing the protocol.

## Trust boundaries

- **Client-side encryption only** (README core principles): keys and passwords are derived and held on the client (`zerok/keys.py`, `zerok/client.py`); the server (`server/`) is an untrusted ciphertext store — that split is the product's central trust boundary.
- **No accounts, no telemetry** (README): no auth server or token store was found in the core; access control is possession of the key material, not identity.
- **Blast radius:** `zerok/core.py`, `zerok/blob.py` and `zerok/keys.py` — 2,053 call edges concentrate in the Python core; a format or key change breaks every existing container.

## Money surface

**No money surface found.** Greps for `stripe|paddle|checkout|billing` over Python/JS source returned no hits; no payment SDK, checkout, webhook or spend path exists in this repo at the profiled commit.

## How an agent should approach

1. Read `README.md`, then this profile, then the snapshot.
2. Use `codetopo` queries against the snapshot (descendants, blast-radius,
   symbol) before editing — especially around the hubs named above.
3. Do not add credentials, account identifiers or key material to any file
   here — names and paths only. Respect the trust boundaries above as
   design constraints, not suggestions.
4. Run the repo's own tests after any change; regenerate this profile
   (below) whenever the code changes.

## Regeneration

`docs/codetopo-profile/refresh.sh` (in this pack) re-downloads the repo
at a named ref, re-runs the index, and rewrites `snapshot.json`,
`stats.json` and the header block inputs of this profile. Regenerate at
every release / material change.

Release gate: NOT RUN — Guardian Mesh: NOT RUN (this profile pack is a
documentation artifact; it is not a release-gate or Guardian Mesh verdict).
