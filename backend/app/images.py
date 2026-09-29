"""Image pipeline: one full-resolution original in, web-ready derivatives out.

For every nebula we write, into ``<site>/<image_path>/``::

    320.avif  320.webp  640.avif  640.webp  ...  2560.avif  2560.webp
    og.jpg    (1200x630 crop for Open Graph / Twitter cards)

and return the metadata the front end needs to lay the image out without
layout shift (intrinsic size, available widths, a tiny blurred placeholder and
an average colour).
"""

from __future__ import annotations

import base64
import io
import re
import tempfile
from collections.abc import Iterable
from pathlib import Path
from typing import BinaryIO

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps, UnidentifiedImageError

WIDTHS: tuple[int, ...] = (320, 640, 960, 1280, 1920, 2560)
FORMATS: tuple[str, ...] = ("avif", "webp")
OG_SIZE = (1200, 630)
PLACEHOLDER_WIDTH = 24

ORIGINAL_EXTENSIONS = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp", "TIFF": "tif", "AVIF": "avif"}
_GENERATED = re.compile(r"^(\d+\.(avif|webp)|og\.jpg)$")

SPACE_BLACK = (5, 7, 15)


class ImageError(Exception):
    """The file is not an image we can process."""


# ---------------------------------------------------------------------------
# Loading
# ---------------------------------------------------------------------------
def load_image(source: Path | BinaryIO, *, max_pixels: int) -> Image.Image:
    """Open, orient and convert an image to RGB.

    JPEGs are decoded at a reduced scale when they are much larger than the
    biggest derivative, which keeps memory use sane for 20k-pixel mosaics.
    """
    Image.MAX_IMAGE_PIXELS = max_pixels
    try:
        image = Image.open(source)
        image.draft("RGB", (max(WIDTHS), max(WIDTHS)))
        image = ImageOps.exif_transpose(image)
        image.load()
    except Image.DecompressionBombError as exc:
        raise ImageError(f"Image is too large to process safely ({exc})") from exc
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError) as exc:
        raise ImageError("File is not a supported image (JPEG, PNG, WebP, TIFF or AVIF)") from exc

    if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
        rgba = image.convert("RGBA")
        background = Image.new("RGB", rgba.size, SPACE_BLACK)
        background.paste(rgba, mask=rgba.getchannel("A"))
        return background
    return image.convert("RGB")


def identify_format(path: Path) -> str:
    """Return the file extension to store an original under."""
    try:
        with Image.open(path) as image:
            fmt = image.format or ""
    except (UnidentifiedImageError, OSError) as exc:
        raise ImageError("File is not a supported image (JPEG, PNG, WebP, TIFF or AVIF)") from exc
    if fmt not in ORIGINAL_EXTENSIONS:
        raise ImageError(f"Unsupported image format: {fmt or 'unknown'}")
    return ORIGINAL_EXTENSIONS[fmt]


# ---------------------------------------------------------------------------
# Originals on disk
# ---------------------------------------------------------------------------
def find_original(originals_dir: Path, nebula_id: str) -> Path | None:
    for extension in ORIGINAL_EXTENSIONS.values():
        candidate = originals_dir / f"{nebula_id}.{extension}"
        if candidate.is_file():
            return candidate
    return None


def store_original(stream: BinaryIO, originals_dir: Path, nebula_id: str, *, max_bytes: int) -> Path:
    """Copy an uploaded/downloaded stream into ``originals_dir/<id>.<ext>``."""
    originals_dir.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=f".{nebula_id}-", dir=originals_dir)
    tmp = Path(tmp_name)
    try:
        written = 0
        with open(fd, "wb") as handle:
            while chunk := stream.read(1024 * 1024):
                written += len(chunk)
                if written > max_bytes:
                    raise ImageError(f"File is larger than {max_bytes // (1024 * 1024)} MB")
                handle.write(chunk)
        if written == 0:
            raise ImageError("File is empty")
        extension = identify_format(tmp)
        for old in originals_dir.glob(f"{nebula_id}.*"):
            if old.suffix.lstrip(".") in ORIGINAL_EXTENSIONS.values():
                old.unlink()
        target = originals_dir / f"{nebula_id}.{extension}"
        tmp.replace(target)
        target.chmod(0o644)
        return target
    finally:
        tmp.unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# Derivatives
# ---------------------------------------------------------------------------
def _resize(image: Image.Image, width: int) -> Image.Image:
    if image.width == width:
        return image
    height = max(1, round(image.height * width / image.width))
    return image.resize((width, height), Image.Resampling.LANCZOS)


def placeholder_data_uri(image: Image.Image) -> str:
    small = image.copy()
    small.thumbnail((PLACEHOLDER_WIDTH, PLACEHOLDER_WIDTH), Image.Resampling.LANCZOS)
    buffer = io.BytesIO()
    small.save(buffer, "WEBP", quality=45, method=6)
    return "data:image/webp;base64," + base64.b64encode(buffer.getvalue()).decode("ascii")


def average_color(image: Image.Image) -> str:
    red, green, blue = image.resize((1, 1), Image.Resampling.BOX).getpixel((0, 0))[:3]
    return f"#{red:02x}{green:02x}{blue:02x}"


def clear_derivatives(out_dir: Path) -> None:
    if not out_dir.is_dir():
        return
    for entry in out_dir.iterdir():
        if entry.is_file() and _GENERATED.match(entry.name):
            entry.unlink()


def remove_derivatives(out_dir: Path) -> None:
    clear_derivatives(out_dir)
    if out_dir.is_dir() and not any(out_dir.iterdir()):
        out_dir.rmdir()


def build_derivatives(image: Image.Image, out_dir: Path, widths: Iterable[int] = WIDTHS) -> dict:
    """Write every derivative for one image and return its ``image`` metadata."""
    targets = [w for w in sorted(widths) if w <= image.width] or [image.width]
    base = _resize(image, targets[-1])

    out_dir.mkdir(parents=True, exist_ok=True)
    clear_derivatives(out_dir)
    for width in reversed(targets):
        resized = _resize(base, width)
        resized.save(out_dir / f"{width}.avif", "AVIF", quality=55, speed=6)
        resized.save(out_dir / f"{width}.webp", "WEBP", quality=78, method=5)

    og = ImageOps.fit(base, OG_SIZE, method=Image.Resampling.LANCZOS, centering=(0.5, 0.45))
    og.save(out_dir / "og.jpg", "JPEG", quality=84, optimize=True, progressive=True)

    return {
        "width": base.width,
        "height": base.height,
        "widths": targets,
        "formats": list(FORMATS),
        "placeholder": placeholder_data_uri(base),
        "color": average_color(base),
    }


def build_from_file(source: Path, out_dir: Path, *, max_pixels: int) -> dict:
    with open(source, "rb") as handle:
        image = load_image(handle, max_pixels=max_pixels)
    return build_derivatives(image, out_dir)


# ---------------------------------------------------------------------------
# Site-wide Open Graph image
# ---------------------------------------------------------------------------
def _font(size: int, bold: bool = False) -> ImageFont.ImageFont | ImageFont.FreeTypeFont:
    candidates = (
        ["DejaVuSans-Bold.ttf", "Arial Bold.ttf", "arialbd.ttf"]
        if bold
        else ["DejaVuSans.ttf", "Arial.ttf", "arial.ttf"]
    )
    for name in candidates:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default(size=size)


def build_site_og(tiles: list[Path], out_path: Path, *, title: str, tagline: str) -> Path:
    """Compose the default 1200x630 share image from up to eight nebula crops."""
    width, height = OG_SIZE
    canvas = Image.new("RGB", OG_SIZE, SPACE_BLACK)

    columns, rows = 4, 2
    cell_w, cell_h = width // columns, height // rows
    for index, tile_path in enumerate(tiles[: columns * rows]):
        with Image.open(tile_path) as tile:
            crop = ImageOps.fit(tile.convert("RGB"), (cell_w, cell_h), method=Image.Resampling.LANCZOS)
        canvas.paste(crop, ((index % columns) * cell_w, (index // columns) * cell_h))

    if not tiles:  # a star field and a soft glow, so the card never looks broken
        glow = Image.new("L", OG_SIZE, 0)
        ImageDraw.Draw(glow).ellipse((width * 0.15, -height * 0.3, width * 0.85, height * 0.9), fill=120)
        glow = glow.filter(ImageFilter.GaussianBlur(120))
        canvas = Image.composite(Image.new("RGB", OG_SIZE, (76, 29, 149)), canvas, glow)
        draw = ImageDraw.Draw(canvas)
        for i in range(320):
            x, y = (i * 7919) % width, (i * 104729) % height
            shade = 140 + (i * 37) % 115
            radius = 1.6 if i % 11 == 0 else 0.9
            draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(shade, shade, min(255, shade + 20)))

    # Dark band behind the title for legibility.
    shade = Image.new("L", OG_SIZE, 0)
    ImageDraw.Draw(shade).rectangle((0, height * 0.32, width, height * 0.68), fill=190)
    shade = shade.filter(ImageFilter.GaussianBlur(40))
    canvas = Image.composite(Image.new("RGB", OG_SIZE, SPACE_BLACK), canvas, shade)

    draw = ImageDraw.Draw(canvas)
    title_font, tagline_font = _font(76, bold=True), _font(34)
    for text, font, y in ((title.upper(), title_font, height * 0.44), (tagline, tagline_font, height * 0.6)):
        box = draw.textbbox((0, 0), text, font=font)
        draw.text(
            ((width - (box[2] - box[0])) / 2, y - (box[3] - box[1]) / 2 - box[1]), text, font=font, fill=(245, 247, 255)
        )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out_path, "JPEG", quality=86, optimize=True, progressive=True)
    return out_path
