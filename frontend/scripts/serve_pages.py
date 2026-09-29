"""Serve a built site the way GitHub Pages does, for local production previews.

    python scripts/serve_pages.py dist --base /nebula-atlas/ --port 4173

Behaves like GitHub Pages where it matters for this project:
  * "/gallery" serves gallery.html (extensionless URLs), "/" serves index.html
  * a folder without a trailing slash redirects to "folder/"
  * anything else gets 404.html with a real 404 status
  * text files are gzip-compressed, and cached for 10 minutes
Standard library only; not meant for production traffic.
"""

from __future__ import annotations

import argparse
import gzip
import mimetypes
import os
import posixpath
import urllib.parse
from functools import partial
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

mimetypes.add_type("application/manifest+json", ".webmanifest")
mimetypes.add_type("image/avif", ".avif")
mimetypes.add_type("image/webp", ".webp")
mimetypes.add_type("text/javascript", ".js")


class PagesHandler(BaseHTTPRequestHandler):
    server_version = "PagesPreview/1.0"

    def __init__(self, *args, root: Path, base: str, **kwargs):
        self.root = root
        self.base = base
        super().__init__(*args, **kwargs)

    def resolve(self, raw_path: str) -> tuple[str, Path | str | None]:
        path = urllib.parse.unquote(urllib.parse.urlsplit(raw_path).path)
        if self.base != "/" and path == self.base.rstrip("/"):
            return "redirect", self.base
        if not path.startswith(self.base):
            return "missing", None
        relative = path[len(self.base) :]
        clean = posixpath.normpath("/" + relative).lstrip("/")
        if clean.startswith("..") or "\x00" in clean:
            return "missing", None
        target = self.root / clean if clean not in ("", ".") else self.root
        if relative == "" or relative.endswith("/"):
            candidate = target / "index.html"
        elif target.is_file():
            candidate = target
        elif target.is_dir() and (target / "index.html").is_file():
            return "redirect", path + "/"
        else:
            candidate = target.with_name(target.name + ".html")
        return ("file", candidate) if candidate.is_file() else ("missing", None)

    def respond(self, include_body: bool) -> None:
        kind, value = self.resolve(self.path)
        if kind == "redirect":
            self.send_response(HTTPStatus.MOVED_PERMANENTLY)
            self.send_header("Location", str(value))
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        status = HTTPStatus.OK
        if kind == "missing":
            status, value = HTTPStatus.NOT_FOUND, self.root / "404.html"
        body = value.read_bytes() if isinstance(value, Path) and value.is_file() else b"Not found"
        content_type = mimetypes.guess_type(str(value))[0] or "application/octet-stream"
        compress = False
        if content_type.startswith("text/") or content_type.endswith(("json", "javascript", "xml")):
            content_type += "; charset=utf-8"
            compress = "gzip" in self.headers.get("Accept-Encoding", "")
        if compress:
            body = gzip.compress(body, compresslevel=6)
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        if compress:
            self.send_header("Content-Encoding", "gzip")
            self.send_header("Vary", "Accept-Encoding")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "max-age=600")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        if include_body:
            self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802 (stdlib naming)
        self.respond(include_body=True)

    def do_HEAD(self) -> None:  # noqa: N802
        self.respond(include_body=False)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("root", type=Path, help="the built site (dist/)")
    default_base = urllib.parse.urlsplit(os.environ.get("SITE_URL", "")).path or "/"
    parser.add_argument(
        "--base",
        default=default_base,
        help='URL path the site lives under, e.g. "/nebula-atlas/" (default: from $SITE_URL, else "/")',
    )
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=4173)
    args = parser.parse_args()

    base = "/" + args.base.strip("/") + "/" if args.base.strip("/") else "/"
    handler = partial(PagesHandler, root=args.root.resolve(), base=base)
    with ThreadingHTTPServer((args.host, args.port), handler) as server:
        print(f"Serving {args.root} at http://{args.host}:{args.port}{base}")
        server.serve_forever()


if __name__ == "__main__":
    main()
