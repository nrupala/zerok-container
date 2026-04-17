from http.server import HTTPServer, BaseHTTPRequestHandler
import os

DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)

class ZerokHandler(BaseHTTPRequestHandler):
    def do_PUT(self):
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
        blob_id = self.path.split("/")[-1]
        if not blob_id:
            self.send_error(400, "Missing blob_id")
            return
        path = os.path.join(DATA_DIR, blob_id)
        if not os.path.exists(path):
            self.send_error(404, "Not found")
            return
        with open(path, "rb") as f:
            data = f.read()
        self.send_response(200)
        self.send_header("Content-Length", len(data))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format, *args):
        print(f"[{self.address_string()] {args[0]}]")

def run(port=5000):
    server = HTTPServer(("", port), ZerokHandler)
    print(f"Zerok server running on http://localhost:{port}")
    server.serve_forever()

if __name__ == "__main__":
    run()