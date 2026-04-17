# Failure & Recovery Model

## Upload Failures
- Data remains encrypted locally
- No partial remote state is trusted
- User must retry upload

## Download Failures
- Integrity verification fails → blob rejected
- No corrupted plaintext is returned

## Server Data Loss
- Treated as permanent loss
- No recovery mechanism exists

## Password Loss
- Permanent and unrecoverable by design

## Version Mismatch
- Older blobs must remain decryptable
- New features may be unavailable