from flask import Flask, request, abort
import os
import re

app = Flask(__name__)
DATA_DIR = "data"

os.makedirs(DATA_DIR, exist_ok=True)

# Blob ids are BLAKE3 hex digests minted by zerok.blob.blob_id() - exactly 64
# lowercase hex characters, no separators. Anything else is not a blob id.
_BLOB_ID = re.compile(r"[0-9a-f]{64}")

def _blob_path(blob_id):
    if not _BLOB_ID.fullmatch(blob_id):
        abort(400)
    return os.path.join(DATA_DIR, blob_id)

@app.route("/blob/<blob_id>", methods=["PUT"])
def upload(blob_id):
    with open(_blob_path(blob_id), "wb") as f:
        f.write(request.data)
    return "", 204

@app.route("/blob/<blob_id>", methods=["GET"])
def download(blob_id):
    try:
        with open(_blob_path(blob_id), "rb") as f:
            return f.read()
    except FileNotFoundError:
        abort(404)
