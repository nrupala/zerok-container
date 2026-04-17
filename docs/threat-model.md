# Zerok Threat Model

## Assets
- User plaintext data
- User encryption keys
- Blob integrity

## Trusted Components
- Local core cryptographic module

## Untrusted Components
- Storage server
- Network transport
- GUI layer

## Adversaries Considered
- Malicious storage operator
- Network attacker (MITM)
- Malicious insider with server access

## Adversaries NOT Considered
- Compromised client OS
- Malware on client device
- Physical access to unlocked device

## Attack Mitigations

| Attack | Mitigation |
|------|-----------|
| Server data inspection | Client-side encryption |
| Blob tampering | Authenticated encryption |
| Replay attacks | Content-addressed blobs |
| MITM | Encryption independent of transport |

## Residual Risks
- Traffic analysis
- Metadata leakage via blob size
- User password compromise