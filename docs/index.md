# Zerok Container

Welcome to the Zerok documentation.

- Zero‑knowledge, zero‑trust vault
- Local encryption
- Untrusted storage
- No external GUI frameworks

## Architecture

### Vault Lifecycle
```mermaid
flowchart TD
    A[User launches app] --> B{Vault exists?}
    B -- No --> C[First-run setup]
    C --> D[User sets password]
    D --> E[Key derived locally]
    E --> F[Vault initialized]
    B -- Yes --> G[Vault unlocked]
    F --> H[Vault ready]
    G --> H