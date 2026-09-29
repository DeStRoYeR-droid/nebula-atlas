"""Download original images from their ``source_url``.

Uses only the standard library. Respects the usual HTTPS_PROXY variables.
ESA/Hubble, ESA/Webb, ESO and NOIRLab share the same archive layout, so when a
size is missing (404) we fall back to the next one down.
"""

from __future__ import annotations

import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Iterator
from pathlib import Path

from .images import store_original

USER_AGENT = "NebulaAtlas/1.0 (image fetcher)"
_ARCHIVE_SIZES = ("publicationjpg", "large", "screen")


class DownloadError(Exception):
    pass


def candidate_urls(url: str) -> Iterator[str]:
    """Yield ``url`` first, then smaller sizes for archive-style image URLs."""
    yield url
    marker = "/archives/images/"
    if marker not in url:
        return
    head, _, tail = url.partition(marker)
    current, _, filename = tail.partition("/")
    if current not in _ARCHIVE_SIZES:
        return
    for size in _ARCHIVE_SIZES[_ARCHIVE_SIZES.index(current) + 1 :]:
        yield f"{head}{marker}{size}/{filename}"


def download_original(url: str, originals_dir: Path, nebula_id: str, *, max_bytes: int, timeout: int = 120) -> Path:
    if urllib.parse.urlsplit(url).scheme not in ("http", "https"):
        raise DownloadError(f"Only http(s) URLs can be downloaded: {url}")
    last_error: Exception | None = None
    for candidate in candidate_urls(url):
        request = urllib.request.Request(candidate, headers={"User-Agent": USER_AGENT})  # noqa: S310 (scheme checked above)
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:  # noqa: S310
                content_type = response.headers.get("Content-Type", "")
                if not content_type.startswith("image/"):
                    raise DownloadError(f"{candidate} returned {content_type or 'no content type'}, not an image")
                return store_original(response, originals_dir, nebula_id, max_bytes=max_bytes)
        except urllib.error.HTTPError as exc:
            last_error = exc
            if exc.code == 404:
                continue
            raise DownloadError(f"{candidate}: HTTP {exc.code}") from exc
        except urllib.error.URLError as exc:
            raise DownloadError(f"{candidate}: {exc.reason}") from exc
    raise DownloadError(f"No image found at {url} ({last_error})")
