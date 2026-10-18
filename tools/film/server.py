"""
Deniz6 film render sunucusu.

Site klasörünü yayınlar ve tarayıcıdaki film.html'in gönderdiği kareleri diske yazar.
Kullanım (site klasöründen):  python tools/film/server.py <kare-klasörü> [port]
Sonra tarayıcıda http://127.0.0.1:8790/tools/film/film.html açılır ve "Render" düğmesine basılır.
"""
import http.server
import os
import sys
import urllib.parse

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'tools', 'film', 'frames'))
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8790
os.makedirs(OUT, exist_ok=True)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_POST(self):
        url = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(url.query)
        n = int(self.headers.get('Content-Length', '0'))
        body = self.rfile.read(n)
        if url.path == '/frame':
            i = int(q.get('i', ['0'])[0])
            with open(os.path.join(OUT, '%05d.jpg' % i), 'wb') as f:
                f.write(body)
        elif url.path == '/log':
            sys.stdout.write(body.decode('utf-8', 'replace') + '\n')
            sys.stdout.flush()
        self.send_response(204)
        self.end_headers()

    def log_message(self, *a):
        pass


print('serving', ROOT, 'frames ->', OUT, 'port', PORT, flush=True)
http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
