from http.server import HTTPServer, BaseHTTPRequestHandler
import os
import json

DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)

class ZerokHandler(BaseHTTPRequestHandler):
    def _send_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors()
        self.end_headers()

    def do_PUT(self):
        self._send_cors()
        blob_id = self.path.split("/")[-1]
        if not blob_id:
            self.send_error(400, "Missing blob_id")
            return
        size = int(self.headers.get("Content-Length", 0))
        data = self.rfile.read(size)
        path = os.path.join(DATA_DIR, blob_id)
        with open(path, "wb") as f:
            f.write(data)
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        self._send_cors()
        blob_id = self.path.split("/")[-1]
        if not blob_id:
            # List all files
            files = []
            for f in os.listdir(DATA_DIR):
                path = os.path.join(DATA_DIR, f)
                if os.path.isfile(path):
                    files.append({"id": f, "size": os.path.getsize(path)})
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(files).encode())
            return
        path = os.path.join(DATA_DIR, blob_id)
        if not os.path.exists(path):
            self.send_error(404, "Not found")
            return
        with open(path, "rb") as f:
            data = f.read()
        self.send_response(200)
        self.send_header("Content-Type", "application/octet-stream")
        self.send_header("Content-Length", len(data))
        self.end_headers()
        self.wfile.write(data)

    def do_DELETE(self):
        self._send_cors()
        blob_id = self.path.split("/")[-1]
        if not blob_id:
            self.send_error(400, "Missing blob_id")
            return
        path = os.path.join(DATA_DIR, blob_id)
        if not os.path.exists(path):
            self.send_error(404, "Not found")
            return
        os.remove(path)
        self.send_response(200)
        self.end_headers()

    def log_message(self, format, *args):
        print(f"[{self.address_string()}] {args[0]}")

def run(port=5000):
    server = HTTPServer(("", port), ZerokHandler)
    print(f"Zerok server running on http://localhost:{port}")
    print(f"Data directory: {os.path.abspath(DATA_DIR)}")
    server.serve_forever()

if __name__ == "__main__":
    run()
