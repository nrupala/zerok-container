# Security Policy

## Supported Versions

| Version | Supported |
|---------|----------|
| 1.x | Yes |

## Reporting Vulnerabilities

Do not report security vulnerabilities in public issues. Email instead.

## Security Features

This PWA includes:

- **Zero-knowledge encryption** - Data encrypted before storage
- **Client-side only** - Keys never leave the browser
- **PBKDF2 key derivation** - 100,000 iterations
- **AES-GCM encryption** - Authenticated encryption
- **Service worker caching** - Offline-first

## Limitations

- No password recovery (by design)
- No multi-device sync without external server
- No account/telemetry

## Best Practices

1. Use a strong password (12+ characters)
2. Keep backup of important files
3. Don't forget your password