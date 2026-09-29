"""Runtime settings, read from environment variables.

Every path has a sensible default for running straight from a clone of the
repository, and every one can be overridden (Docker Compose does this).
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

# backend/app/config.py -> repository root is two levels up from backend/app
REPO_ROOT = Path(__file__).resolve().parents[2]


def _path(name: str, default: Path) -> Path:
    return Path(os.environ.get(name) or default).expanduser().resolve()


@dataclass(frozen=True)
class Settings:
    #: The front end's public/ folder. JSON and generated images live here.
    site_dir: Path
    #: The JSON file the website reads.
    data_file: Path
    #: Full-resolution source images (never deployed, git-ignored).
    originals_dir: Path
    #: Largest accepted upload, in bytes.
    max_upload_bytes: int
    #: Largest image, in pixels, Pillow will decode (decompression-bomb guard).
    max_image_pixels: int


def get_settings() -> Settings:
    site_dir = _path("SITE_DIR", REPO_ROOT / "frontend" / "public")
    return Settings(
        site_dir=site_dir,
        data_file=_path("DATA_FILE", site_dir / "data" / "nebulae.json"),
        originals_dir=_path("ORIGINALS_DIR", REPO_ROOT / "media" / "originals"),
        max_upload_bytes=int(os.environ.get("MAX_UPLOAD_MB", "60")) * 1024 * 1024,
        max_image_pixels=int(os.environ.get("MAX_IMAGE_PIXELS", "450000000")),
    )
