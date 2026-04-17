# Lifecycle & Versioning

## Versioning Policy
- MAJOR: breaking changes
- MINOR: backward-compatible features
- PATCH: fixes only

## Data Lifecycle
- Creation → Storage → Retrieval → Optional Export
- No automatic deletion or rotation

## Decommissioning
- User may export all encrypted blobs
- No remote dependency remains

## Release Versioning

Releases are tagged using semantic versioning.

Example:
git tag v0.1.0
git push origin v0.1.0
