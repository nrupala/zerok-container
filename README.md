# Zerok Container
[![Docs](https://img.shields.io/badge/docs-GitHub%20Pages-blue)](https://nrupala.github.io/zerok-container/)
[![PWA](https://img.shields.io/badge/PWA-Live-brightgreen)](https://nrupala.github.io/zerok-container/pwa/)
[![APK](https://img.shields.io/badge/Android-APK-blue)](https://github.com/nrupala/zerok-container/actions/workflows/main.yml)

Zerok is a zero-trust, zero-knowledge encrypted container for files and blobs.

Your data is encrypted **on your device**, before it is stored anywhere else.
The storage server never sees keys, passwords, or plaintext.

## Core Principles
- Client-side encryption only
- No external GUI frameworks
- No telemetry, no accounts
- Deterministic, auditable behavior
- Beginner-friendly by design

## Quick Links

| Platform | Link |
|----------|------|
| **PWA (Web)** | [https://nrupala.github.io/zerok-container/pwa/](https://nrupala.github.io/zerok-container/pwa/) |
| **Android APK** | [Actions Build](https://github.com/nrupala/zerok-container/actions/workflows/main.yml) |
| **Documentation** | [docs/FAQ.md](docs/FAQ.md) |

## Installation

### Python (Library)
```bash
pip install cryptography requests
```

### PWA (Web App)
Open: https://nrupala.github.io/zerok-container/pwa/

### Android APK
Download from: **GitHub → Actions → Build APK → Artifacts**

## Who This Is For
- Normal users who want secure storage without learning cryptography
- Developers who want an auditable encrypted core
- Organizations that require zero-knowledge guarantees

## What This Is Not
- A cloud SaaS that reads your data
- A crypto experiment
- A dependency-heavy framework

Zerok is intentionally boring, predictable, and trustworthy.