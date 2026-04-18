# Zerok Vault - Run All Tests

## Test Execution

### Browser Tests
Open `pwa/index.html` in a browser. Tests run automatically on load.

### CLI Tests
```bash
cd /path/to/Zerok
python tests/test_zerok.py
python tests/test_client.py
```

### Build Verification
```bash
# Serve PWA locally
cd pwa
python -m http.server 8080
```

### Test Coverage Areas

| Category | Tests | Description |
|----------|-------|-------------|
| **Crypto** | 5 | PBKDF2, AES-GCM, Nonce uniqueness |
| **Storage** | 4 | IndexedDB, OPFS fallback, CRUD |
| **Auth** | 3 | Create, Unlock, Delete vault |
| **Files** | 4 | Encrypt, Decrypt, Upload, Download |
| **Analytics** | 3 | Storage calc, File types, Usage |
| **Memory** | 2 | Zeroization, Secure cleanup |
| **Integration** | 3 | End-to-end flows |
| **Total** | 24 | Nuclear-grade coverage |

## Test Requirements

1. **Zero-Knowledge**: No plaintext leaves device
2. **Non-Extractable Keys**: JS never sees key material
3. **Nonce Uniqueness**: Same data = different ciphertext
4. **Memory Safety**: Sensitive data zeroized after use
5. **Persistence**: Data survives app restart
6. **Offline**: Works without network

## Test Results Interpretation

- ✓ All tests pass = Production ready
- ✗ Crypto failures = Critical - do not deploy
- ✗ Storage failures = High - investigate
- ✗ Auth failures = High - investigate
- ✗ Other = Medium - track and fix