import http.server
import socketserver
import os

os.chdir(r'C:\Users\HomeUser\Downloads\Zerok')
PORT = 8090

with socketserver.TCPServer(('', PORT), http.server.SimpleHTTPRequestHandler) as httpd:
    print(f'Serving at port {PORT}')
    httpd.serve_forever()