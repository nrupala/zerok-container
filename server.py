import http.server
import socketserver
import os

os.chdir(r'C:\Users\HomeUser\Downloads\Zerok')
PORT = 8090

class ReuseAddrTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

with ReuseAddrTCPServer(('', PORT), http.server.SimpleHTTPRequestHandler) as httpd:
    print(f'Serving at http://localhost:{PORT} and http://127.0.0.1:{PORT}')
    httpd.serve_forever()