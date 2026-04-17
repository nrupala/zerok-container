from flask import Flask, request, abort
import os

app = Flask(__name__)
DATA_DIR = "data"

os.makedirs(DATA_DIR, exist_ok=True)

@app.route("/blob/<blob_id>", methods=["PUT"])
def upload(blob_id):
    with open(os.path.join(DATA_DIR, blob_id), "wb") as f:
        f.write(request.data)
    return "", 204

@app.route("/blob/<blob_id>", methods=["GET"])
def download(blob_id):
    try:
        with open(os.path.join(DATA_DIR, blob_id), "rb") as f:
            return f.read()
    except FileNotFoundError:
        abort(404)