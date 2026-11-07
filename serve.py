#!/usr/bin/env python3
"""
श्रीराम वैदिक ज्योतिष केंद्र: लोकल एडमिन सर्वर।

चलाने का तरीका:   python serve.py
फिर ब्राउज़र में खुलने वाले एडमिन पैनल से बदलाव करें। "सेव करें" बटन सीधे
data/content.js और images/ फ़ोल्डर में लिखेगा, और "git push" बटन उसे GitHub पर भेज देगा।

सुरक्षा: यह सर्वर सिर्फ़ आपके अपने कंप्यूटर (127.0.0.1) पर सुनता है और केवल
data/content.js तथा images/ में तस्वीरें लिखने देता है।
"""
import base64
import http.server
import json
import os
import posixpath
import socketserver
import subprocess
import sys
import threading
import webbrowser

ROOT = os.path.dirname(os.path.abspath(__file__))
START_PORT = int(os.environ.get("PORT", "8000"))
IMG_EXT = {".webp", ".png", ".jpg", ".jpeg", ".gif"}
MAX_BODY = 60 * 1024 * 1024


class Handler(http.server.SimpleHTTPRequestHandler):
    port = START_PORT

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        if "/__" in (args[0] if args else ""):
            sys.stderr.write("[admin] " + (fmt % args) + "\n")

    # ---- सुरक्षा जाँच ----
    def _trusted(self):
        host = (self.headers.get("Host") or "").lower()
        ok_hosts = {"127.0.0.1:%d" % self.port, "localhost:%d" % self.port}
        if host not in ok_hosts:
            return False
        origin = self.headers.get("Origin")
        if origin and origin.lower() not in {"http://" + h for h in ok_hosts}:
            return False
        return self.headers.get("X-Admin") == "1"

    def _json(self, code, obj):
        data = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path.split("?")[0] == "/__ping":
            host = (self.headers.get("Host") or "").lower()
            if host in {"127.0.0.1:%d" % self.port, "localhost:%d" % self.port}:
                return self._json(200, {"sjAdmin": True})
            return self._json(403, {"error": "host"})
        return super().do_GET()

    def do_POST(self):
        route = self.path.split("?")[0]
        if route not in ("/__save", "/__git"):
            return self._json(404, {"error": "नहीं मिला"})
        if not self._trusted():
            return self._json(403, {"error": "अनुरोध मान्य नहीं है"})
        try:
            length = int(self.headers.get("Content-Length") or 0)
            if length > MAX_BODY:
                return self._json(413, {"error": "फ़ाइलें बहुत बड़ी हैं"})
            body = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            return self._json(400, {"error": "डेटा पढ़ा नहीं जा सका"})
        if route == "/__save":
            return self._save(body)
        return self._git(body)

    # ---- सेव ----
    def _save(self, body):
        saved = []
        try:
            for f in body.get("files", []):
                rel = posixpath.normpath(str(f.get("path", "")))
                parts = rel.split("/")
                if rel.startswith("/") or ".." in parts:
                    raise ValueError("अमान्य पथ: " + rel)
                raw = base64.b64decode(f.get("b64", ""))
                if rel == "data/content.js":
                    if not raw.lstrip().startswith(b"window.SITE_CONTENT"):
                        raise ValueError("content.js का रूप सही नहीं है")
                elif parts[0] == "images" and len(parts) == 2 and os.path.splitext(rel)[1].lower() in IMG_EXT:
                    pass
                else:
                    raise ValueError("इस पथ पर लिखने की अनुमति नहीं: " + rel)
                dest = os.path.join(ROOT, *parts)
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                with open(dest, "wb") as fh:
                    fh.write(raw)
                saved.append(rel)
        except Exception as e:  # noqa: BLE001
            return self._json(400, {"error": str(e), "saved": saved})
        return self._json(200, {"ok": True, "saved": saved})

    # ---- git push ----
    def _git(self, body):
        if not os.path.isdir(os.path.join(ROOT, ".git")):
            return self._json(200, {"ok": False, "error": "यह फ़ोल्डर अभी git रिपॉज़िटरी नहीं है। README.md में “तरीका B” देखें, या GitHub वाला “प्रकाशित करें” बटन उपयोग करें।"})
        msg = (str(body.get("message") or "एडमिन पैनल से अपडेट"))[:120]
        env = dict(os.environ, GIT_TERMINAL_PROMPT="0")
        out = []

        def run(*cmd):
            p = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, timeout=180, env=env)
            out.append("$ " + " ".join(cmd) + "\n" + (p.stdout + p.stderr).strip())
            return p

        try:
            run("git", "add", "-A")
            c = run("git", "commit", "-m", msg)
            if c.returncode not in (0, 1):
                return self._json(200, {"ok": False, "output": "\n\n".join(out)})
            p = run("git", "push")
            return self._json(200, {"ok": p.returncode == 0, "output": "\n\n".join(out)})
        except FileNotFoundError:
            return self._json(200, {"ok": False, "error": "git इंस्टॉल नहीं मिला। https://git-scm.com से इंस्टॉल करें।"})
        except subprocess.TimeoutExpired:
            return self._json(200, {"ok": False, "output": "\n\n".join(out) + "\n\nसमय सीमा पूरी हो गई। GitHub में लॉगिन (credential) जाँचें।"})


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def main():
    port = START_PORT
    srv = None
    for p in range(START_PORT, START_PORT + 20):
        try:
            Handler.port = p
            srv = Server(("127.0.0.1", p), Handler)
            port = p
            break
        except OSError:
            continue
    if srv is None:
        print("कोई खाली पोर्ट नहीं मिला।")
        sys.exit(1)
    url = "http://127.0.0.1:%d/" % port
    print("\n  साइट:        " + url)
    print("  एडमिन पैनल:  " + url + "admin.html")
    print("  बंद करने के लिए Ctrl+C दबाएँ\n")
    threading.Timer(0.8, lambda: webbrowser.open(url + "admin.html")).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nबंद किया।")


if __name__ == "__main__":
    main()
