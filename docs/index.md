# Zerok Container

Welcome to the Zerok documentation.

## Contents
- Overview
- What is a Vault
- Architecture
- Vault Lifecycle
- Local Files
- Failure Scenarios
- Guarantees

Zerok container is
- Zero‑knowledge, zero‑trust vault
- Local encryption
- Untrusted storage
- No external GUI frameworks

## Architecture

### Vault Lifecycle
```mermaid
flowchart TD
    U[User] -->|Launch app| A[GUI]
    A --> B{Vault exists?}

    B -- No --> C[First-run setup]
    C --> D[User sets password]
    D --> E[Key derived locally]
    E --> F[Vault metadata created]

    B -- Yes --> G[Vault unlocked]

    F --> H[Vault ready]
    G --> H

    H --> I[Add file]
    I --> J[Encrypt locally]
    J --> K[Update local index]
    K --> L[Upload encrypted blob]
    L --> M[Untrusted server]
        
    ## What is a Vault?

A Zerok vault is a local, encrypted container that:

- Lives on your machine
- Encrypts files before they leave your device
- Keeps a local index of your files
- Uses an untrusted server only for storage

The server never sees file names, contents, or keys.

## Local Files Created by Zerok

Zerok creates the following local files:

- `vault_meta.json` – vault identity and parameters
- `vault_index.json` – list of your files (names, dates, sizes)
- `safety_ack.json` – confirmation you accepted irreversible risks

Encrypted data is never stored in plaintext on disk.

## Failure Scenarios (Plain Language)

- If you forget your password → data is permanently unrecoverable
- If the server deletes data → data is lost
- If the network is down → your local data remains safe
- If the app closes unexpectedly → no plaintext is left behind

