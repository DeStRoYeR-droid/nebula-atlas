from __future__ import annotations

from PIL import Image

from app.images import build_derivatives, build_site_og, load_image
from app.sources import candidate_urls


def test_small_images_are_not_upscaled(tmp_path):
    meta = build_derivatives(Image.new("RGB", (500, 250), (20, 40, 60)), tmp_path)
    assert meta["widths"] == [320]
    assert (meta["width"], meta["height"]) == (320, 160)
    assert meta["color"] == "#14283c"


def test_tiny_images_keep_their_own_width(tmp_path):
    meta = build_derivatives(Image.new("RGB", (200, 100)), tmp_path)
    assert meta["widths"] == [200]
    assert (tmp_path / "200.avif").is_file()


def test_og_crop_is_1200_by_630(tmp_path):
    build_derivatives(Image.new("RGB", (2000, 2000)), tmp_path)
    with Image.open(tmp_path / "og.jpg") as og:
        assert og.size == (1200, 630)


def test_transparent_images_are_flattened(tmp_path):
    path = tmp_path / "alpha.png"
    Image.new("RGBA", (400, 400), (255, 0, 0, 0)).save(path)
    with open(path, "rb") as handle:
        assert load_image(handle, max_pixels=10_000_000).mode == "RGB"


def test_site_og_without_tiles_still_renders(tmp_path):
    out = build_site_og([], tmp_path / "og-image.jpg", title="Nebula Atlas", tagline="Explore")
    with Image.open(out) as image:
        assert image.size == (1200, 630)


def test_archive_urls_fall_back_to_smaller_sizes():
    url = "https://cdn.esahubble.org/archives/images/publicationjpg/heic1501a.jpg"
    assert list(candidate_urls(url)) == [
        url,
        "https://cdn.esahubble.org/archives/images/large/heic1501a.jpg",
        "https://cdn.esahubble.org/archives/images/screen/heic1501a.jpg",
    ]
    assert list(candidate_urls("https://example.org/a.jpg")) == ["https://example.org/a.jpg"]
