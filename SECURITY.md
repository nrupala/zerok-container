## Security Model

- All encryption happens locally on the client
- The server stores opaque encrypted blobs only
- Encryption keys never leave the client device
- Loss of password means permanent data loss

## Threat Assumptions
- The storage server is untrusted
- The network is hostile
- The GUI is not trusted with cryptographic operations

## Non-Goals
- Key recovery backdoors
- Server-side encryption
- Trust-based access controls