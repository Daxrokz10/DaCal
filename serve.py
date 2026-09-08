#!/usr/bin/env python3
"""Local dev server. `python serve.py` then open http://localhost:5173

Serves this folder with the right MIME type for .webmanifest and with
caching turned off, so a reload always gets your latest edit. Prints the
LAN address too, so you can open it on your phone over the same wifi.
"""
import http.server, socketserver, socket, sys, os, functools

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5173


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".webmanifest": "application/manifest+json",
        ".js":   "text/javascript",
        ".svg":  "image/svg+xml",
        ".json": "application/json",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("  %s\n" % (fmt % args))


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        s.close()


# Deliberately NOT allow_reuse_address. On Windows, SO_REUSEADDR lets a second
# process bind a port that is already being served and then steal connections
# from the first — which shows up as the server being mysteriously dead. With
# it off, a second start fails loudly instead.
socketserver.TCPServer.allow_reuse_address = False

# the site lives in public/ — that is also what Cloudflare Pages publishes
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")
Serve = functools.partial(Handler, directory=ROOT)

try:
    httpd = socketserver.TCPServer(("0.0.0.0", PORT), Serve)
except OSError:
    sys.exit("\n  Port %d is already in use — something else is serving it.\n"
             "  Close that, or pick another port:  python serve.py %d\n"
             % (PORT, PORT + 1))

with httpd:
    print("\n  Plate & Platform")
    print("  ----------------")
    print("  this machine : http://localhost:%d" % PORT)
    print("  on your phone: http://%s:%d   (same wifi)" % (lan_ip(), PORT))
    print("  Ctrl+C to stop\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("  stopped")
