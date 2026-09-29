from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.config import Settings
from app.main import create_app

REPO_DATA = Path(__file__).resolve().parents[2] / "frontend" / "public" / "data" / "nebulae.json"


def make_entry(nebula_id: str = "eagle", **overrides) -> dict:
    entry = {
        "id": nebula_id,
        "name": f"{nebula_id.title()} Nebula",
        "catalog": "M16",
        "type": "Emission",
        "constellation": "Serpens",
        "distance": 5700,
        "size": "about 70 light-years across",
        "description": "A stellar nursery.",
        "facts": ["Fact one.", "Fact two."],
        "image_path": f"images/nebulae/{nebula_id}",
        "image_alt": "Tall columns of gas and dust.",
        "credits": "NASA, ESA",
        "source_url": "https://example.org/eagle.jpg",
    }
    entry.update(overrides)
    return entry


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    site = tmp_path / "public"
    (site / "data").mkdir(parents=True)
    data_file = site / "data" / "nebulae.json"
    data_file.write_text(json.dumps({"nebulae": [make_entry("eagle"), make_entry("crab", type="Supernova remnant")]}))
    return Settings(
        site_dir=site,
        data_file=data_file,
        originals_dir=tmp_path / "originals",
        max_upload_bytes=5 * 1024 * 1024,
        max_image_pixels=50_000_000,
    )


@pytest.fixture
def client(settings: Settings) -> TestClient:
    return TestClient(create_app(settings))


@pytest.fixture
def jpeg_bytes(tmp_path: Path) -> bytes:
    """A 1400x900 gradient JPEG, big enough to produce several widths."""
    image = Image.new("RGB", (1400, 900))
    pixels = image.load()
    for x in range(0, 1400, 4):
        for y in range(0, 900, 4):
            for dx in range(4):
                for dy in range(4):
                    pixels[x + dx, y + dy] = (x % 256, y % 256, (x + y) % 256)
    path = tmp_path / "sample.jpg"
    image.save(path, "JPEG", quality=85)
    return path.read_bytes()
