# Zerok Container

Welcome to the Zerok documentation.

## Contents
- Overview
- Architecture
- What is a Vault
- Vault Lifecycle
- Local Files
- Failure Scenarios
- Guarantees

## Overview

Zerok Container is a:

- Zero‑knowledge, zero‑trust vault
- Local‑first encryption system
- Untrusted remote storage design
- System with no external GUI frameworks

[![Docs](https://img.shields.io/badge/docs-GitHub%20Pages-blue)](
https://nrupala.github.io/zerok-container/)

---

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
      ``

## What is a Vault?
A Zerok vault is a local, encrypted container that:

Lives on your machine
Encrypts files before they leave your device
Maintains a local index of file metadata
Uses an untrusted server only for encrypted storage

## The server never sees:

File contents
File names
Encryption keys


## Local Files Created by Zerok
Zerok creates the following files locally:

vault_meta.json — vault identity and cryptographic parameters
vault_index.json — list of files (names, sizes, timestamps)
safety_ack.json — record that irreversible risks were acknowledged

Encrypted file contents are never stored in plaintext on disk.

## Failure Scenarios (Plain Language)

If you forget your password → data is permanently unrecoverable
If the server deletes data → data is permanently lost
If the network is down → your local data remains safe
If the app closes unexpectedly → no plaintext is left behind


## Guarantees
Zerok guarantees that:

Encryption always happens locally
Keys never leave the device
Storage servers are fully untrusted
Previously created encrypted blobs remain decryptable