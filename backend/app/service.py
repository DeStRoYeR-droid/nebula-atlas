"""Operations shared by the HTTP API and the command-line tool."""

from __future__ import annotations

from pathlib import Path
from typing import BinaryIO

from .config import Settings
from .images import ImageError, build_from_file, build_site_og, find_original, remove_derivatives, store_original
from .models import Nebula
from .sources import download_original
from .store import NebulaStore, NotFoundError

SITE_OG_IMAGE = "og-image.jpg"


class MissingOriginalError(Exception):
    pass


class AtlasService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.store = NebulaStore(settings.data_file)

    # -- paths -------------------------------------------------------------
    def image_dir(self, nebula: Nebula) -> Path:
        site = self.settings.site_dir.resolve()
        target = (site / nebula.image_path).resolve()
        if site not in target.parents:  # defence in depth; the model already validates the pattern
            raise ValueError(f"image_path escapes the site folder: {nebula.image_path}")
        return target

    # -- images ------------------------------------------------------------
    def rebuild_image(self, nebula_id: str) -> Nebula:
        nebula = self.store.get(nebula_id)
        original = find_original(self.settings.originals_dir, nebula_id)
        if original is None:
            raise MissingOriginalError(f"No original image for '{nebula_id}' in {self.settings.originals_dir}")
        meta = build_from_file(original, self.image_dir(nebula), max_pixels=self.settings.max_image_pixels)
        updated = self.store.set_image(nebula_id, meta)
        self.rebuild_site_og()
        return updated

    def attach_upload(self, nebula_id: str, stream: BinaryIO) -> Nebula:
        self.store.get(nebula_id)  # 404 before touching the disk
        store_original(stream, self.settings.originals_dir, nebula_id, max_bytes=self.settings.max_upload_bytes)
        return self.rebuild_image(nebula_id)

    def fetch_source(self, nebula_id: str) -> Nebula:
        nebula = self.store.get(nebula_id)
        if not nebula.source_url:
            raise ImageError(f"'{nebula_id}' has no source_url")
        download_original(
            nebula.source_url, self.settings.originals_dir, nebula_id, max_bytes=self.settings.max_upload_bytes * 4
        )
        return self.rebuild_image(nebula_id)

    def delete(self, nebula_id: str) -> Nebula:
        removed = self.store.delete(nebula_id)
        remove_derivatives(self.image_dir(removed))
        self.rebuild_site_og()
        return removed

    def rebuild_site_og(self) -> Path:
        tiles = []
        for nebula in self.store.list():
            og = self.image_dir(nebula) / "og.jpg"
            if nebula.image and og.is_file():
                tiles.append(og)
        return build_site_og(
            tiles,
            self.settings.site_dir / SITE_OG_IMAGE,
            title="Nebula Atlas",
            tagline="Explore the cosmos, one nebula at a time",
        )


__all__ = ["AtlasService", "MissingOriginalError", "NotFoundError", "ImageError"]
