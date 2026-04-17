# Zerok - Build & Development FAQ

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Python Setup](#python-setup)
3. [Android APK Build](#android-apk-build)
4. [PWA Setup](#pwa-setup)
5. [Testing](#testing)
6. [Server](#server)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- Python 3.12+
- Java JDK 17+ (for Android)
- Git

### Install Cryptography (Only Dependency)
```bash
pip install cryptography
```

Verify:
```bash
python -c "import cryptography; print(cryptography.__version__)"
```

---

## Python Setup

### Clone Repository
```bash
git clone https://github.com/nrupala/zerok-container.git
cd zerok-container
```

### Install Dependencies
```bash
pip install cryptography requests
```

### Run Tests
```bash
python tests/test_zerok.py
python tests/test_client.py
```

---

## Android APK Build

### Option 1: GitHub Actions (Recommended)

1. Push to main branch:
```bash
git add android/
git commit -m "Add Android project"
git push origin main
```

2. Go to: **GitHub → Actions → Android APK Build → Run workflow**

3. Download APK from: **Actions → Build → Artifacts**

### Option 2: Local Build

1. Download Gradle:
```powershell
# PowerShell (Windows)
Invoke-WebRequest -Uri "https://services.gradle.org/distributions/gradle-8.2-bin.zip" -OutFile "gradle-8.2-bin.zip"

# Or curl
curl -L -o gradle-8.2-bin.zip https://services.gradle.org/distributions/gradle-8.2-bin.zip
```

2. Extract Gradle:
```bash
unzip gradle-8.2-bin.zip
rm gradle-8.2-bin.zip
```

3. Build APK:
```bash
cd android
../gradle-8.2/bin/gradle assembleDebug
```

4. APK is at: `android/app/build/outputs/apk/debug/app-debug.apk`

### VERSION File
Create version file in root:
```bash
echo "1.0.0" > VERSION
```

---

## PWA Setup

### Files Required
```
pwa/
├── index.html      # Main HTML
├── styles.css     # Styling
├── app.js         # App logic + crypto
├── manifest.json # PWA manifest
├── sw.js          # Service worker
└── icon-192.png  # App icon (192x192)
└── icon-512.png  # App icon (512x512)
```

### Create Icons
Create 192x192 and 512x512 PNG images and save as:
- `pwa/icon-192.png`
- `pwa/icon-512.png`

### Host PWA
#### GitHub Pages
```bash
git add pwa/
git commit -m "Add PWA"
git push origin main
```
Then enable Pages in: **Settings → Pages → Deploy from main branch**

#### Local Serve
```bash
cd pwa
python -m http.server 8000
```
Open: http://localhost:8000

#### Netlify
Drag and drop the `pwa/` folder to Netlify.

---

## Testing

### Run All Tests
```bash
python tests/test_zerok.py
python tests/test_client.py
```

### Quick Verification
```bash
python -c "
from zerok.crpyto import encrypt, decrypt
from zerok.keys import derive_key, new_salt
from zerok.blob import encrypt_blob, decrypt_blob

key = b'x' * 32
data = b'test'
enc_id, enc = encrypt_blob(key, data)
dec = decrypt_blob(key, enc)
print('OK' if dec == data else 'FAIL')
"
```

---

## Server

### Minimal Python Server (No Flask)
```bash
python server/server.py
```
Server runs on http://localhost:5000

### Endpoints
- `PUT /blob/<blob_id>` - Upload encrypted blob
- `GET /blob/<blob_id>` - Download blob

---

## Troubleshooting

### "No module named 'cryptography'"
```bash
pip install cryptography
```

### "ModuleNotFoundError: No module named 'requests'"
```bash
pip install requests
```

### "XChaCha20Poly1305 not found"
Use AESGCM instead (edit `zerok/crpyto.py`):
```python
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
```

### Gradle Download Fails
Use a mirror or VPN. Alternative URLs:
- https://gradle.org/distributions/
- https://services.gradle.org/distributions/

### PWA Not Installing
- Check manifest.json syntax
- Serve over HTTPS (required for PWA install)
- Icon must be valid PNG

---

## Development Commands Summary

```bash
# Clone & setup
git clone https://github.com/nrupala/zerok-container.git
cd zerok-container
pip install cryptography

# Test
python tests/test_zerok.py
python tests/test_client.py

# Build Android
git add android/
git commit -m "Add Android"
git push origin main

# Build PWA
git add pwa/
git commit -m "Add PWA"
git push origin main

# Run server
python server/server.py
```