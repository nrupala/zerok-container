# Zerok Container - Getting Started

## Installation

### Python Dependencies

```bash
pip install cryptography blake3
```

### Verify Installation

```bash
python -c "from zerok.crpyto import encrypt, decrypt; print('Crypto OK')"
python -c "from zerok.blob import encrypt_blob; print('Blob OK')"
```

## Local Development

### Run the Server

```bash
cd server
python server.py
```

Server runs at `http://localhost:5000`

### Run the GUI

```bash
cd gui
python app.py
```

## Android APK Build

### Prerequisites

- Java JDK 17+
- Android SDK

### Build Debug APK

```bash
cd android
chmod +x gradlew
./gradlew assembleDebug
```

APK output: `android/app/build/outputs/apk/debug/app-debug.apk`

### GitHub Actions

The workflow at `.github/workflows/main.yml` builds the APK automatically on:
- Push to `main` branch
- New tags (`v*`)

## Self-Hosting

### Minimal Server (Flask)

```python
from flask import Flask, request, jsonify
from zerok.client import ZeroKClient
import os

app = Flask(__name__)
STORAGE_DIR = "./vault"

os.makedirs(STORAGE_DIR, exist_ok=True)

@app.route("/upload", methods=["POST"])
def upload():
    blob_id = request.json.get("blob_id")
    data = request.json.get("data")
    path = os.path.join(STORAGE_DIR, blob_id)
    with open(path, "wb") as f:
        f.write(bytes.fromhex(data))
    return jsonify({"status": "ok"})

@app.route("/download/<blob_id>")
def download(blob_id):
    path = os.path.join(STORAGE_DIR, blob_id)
    if not os.path.exists(path):
        return jsonify({"error": "not found"}), 404
    with open(path, "rb") as f:
        data = f.read().hex()
    return jsonify({"blob_id": blob_id, "data": data})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
```

### Run with Docker

```bash
docker build -t zerok-server .
docker run -p 5000:5000 -v ~/zerok-vault:/vault zerok-server
```

### Run with Docker Compose

```yaml
version: '3'
services:
  zerok:
    image: zerok-server
    ports:
      - "5000:5000"
    volumes:
      - ./vault:/vault
    environment:
      - HOST=0.0.0.0
      - PORT=5000
```

```bash
docker-compose up -d
```

## Google Cloud Hosting

### Cloud Run (Recommended)

1. **Build the container:**
```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/zerok-server
```

2. **Deploy:**
```bash
gcloud run deploy zerok-server \
  --image gcr.io/PROJECT_ID/zerok-server \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --volume ./vault:/vault
```

3. **Set environment variables:**
```bash
gcloud run deployments update zerok-server \
  --set-env-vars STORAGE_DIR=/vault
```

### Cloud Storage + Cloud Functions

1. Create a GCS bucket:
```bash
gsutil mb -l us-central1 gs://PROJECT_ID-zerok-vault
```

2. Deploy Cloud Function:
```bash
gcloud functions deploy zerok-api \
  --runtime python311 \
  --trigger-http \
  --source ./server
```

### App Engine Flexible

`app.yaml`:
```yaml
runtime: python
env: flex
runtime_config:
  python_version: 3.11

manual_scaling:
  instances: 1

resources:
  cpu: 1
  memory_gb: 2

volume:
  name: zerok-storage
  type: tmpfs
  size_gb: 10
```

```bash
gcloud app deploy
```

## Testing

### Run Tests

```bash
pytest tests/
```

or

```bash
python -m pytest tests/
```

### Manual Crypto Test

```python
from zerok.crpyto import encrypt, decrypt

key = b"x" * 32
data = b"secret message"
encrypted = encrypt(key, data)
decrypted = decrypt(key, encrypted)
assert decrypted == data
print("Encryption test passed!")
```

## Usage Examples

### Python CLI

```python
from zerok.core import init_client

# Initialize with server endpoint
client = init_client("http://localhost:5000", "your-secure-password")

# Upload a file
with open("document.pdf", "rb") as f:
    blob_id = client.upload(f.read())
print(f"Stored with blob ID: {blob_id}")

# Download a file
data = client.download(blob_id)
with open("document.pdf", "wb") as f:
    f.write(data)
```

### Using the Android App

1. Install the APK on Android device
2. Enter the server URL
3. Set your vault password
4. Add files to encrypt and upload

### Using the PWA (Non-Android)

1. Host `pwa/` directory on any web server
2. Open in browser
3. Set vault password
4. Add files - they're encrypted locally before upload