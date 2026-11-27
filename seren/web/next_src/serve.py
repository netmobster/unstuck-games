"""Serves seren/web/static the way nginx will: /next -> /next/, then $uri, $uri.html, $uri/index.html."""
import http.server, os, sys
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "static")

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def do_GET(self):
        p = self.path.split("?")[0].split("#")[0]
        if p == "/next":
            self.send_response(301); self.send_header("Location", "/next/"); self.end_headers(); return
        f = os.path.join(ROOT, p.lstrip("/"))
        if p.startswith("/next/") and not os.path.isfile(f):
            if os.path.isfile(f + ".html"): self.path = p + ".html"
            elif os.path.isfile(os.path.join(f, "index.html")): self.path = p.rstrip("/") + "/index.html"
        return super().do_GET()
    def end_headers(self):
        self.send_header("Cache-Control", "no-store"); super().end_headers()

http.server.ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 8812), H).serve_forever()
