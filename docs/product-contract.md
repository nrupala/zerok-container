# Zerok Product Contract

This document defines what Zerok guarantees, what it does not guarantee,
and which behaviors are considered stable.

## 1. Non-Negotiable Guarantees

Zerok guarantees the following properties for all released versions:

1. Encryption always occurs locally before storage or transmission.
2. Encryption keys never leave the client device.
3. The storage server cannot decrypt or inspect user data.
4. Encrypted blobs created with a released version will remain decryptable
   by future versions, unless explicitly documented otherwise.

## 2. Explicit Non-Goals

Zerok does NOT guarantee:
- Data availability (servers may delete data)
- Password recovery
- Protection against endpoint compromise
- Anonymity or traffic analysis resistance

## 3. Compatibility Promise

- Blob format is append-only and versioned.
- Backward decryption compatibility is mandatory.
- Breaking changes require a major version bump and migration tooling.

## 4. Trust Boundaries

- GUI code is untrusted with cryptographic operations.
- Server code is fully untrusted.
- Core cryptographic logic is the root of trust.

Violations of these boundaries are considered security defects.
