"""Resize a published photo and re-encode it as WebP (ADR 0003 D3).

A photo is resized and not otherwise changed: no crop, no edit, no recolour.
The camera's orientation is applied, so the photo shows the way its author
saw it, and then every metadata block (EXIF, XMP, ICC) is left behind.

The caller downloads the image. This module takes its bytes, so it never
touches the network.
"""

import io
import re
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageOps

MAX_WIDTH = 480  # Pixels. A narrower photo keeps its own width.
MAX_PIXELS = 64_000_000  # A larger source is refused before it is decoded.
WEBP_QUALITY = 80
WEBP_METHOD = 6  # The slowest, smallest encoding. Same input, same bytes.
SOURCE_FORMATS = ("JPEG", "PNG", "WEBP")  # What Commons serves for photos.
# A player id (ADR 0005 D2). It names the file, so it never holds a path.
SLUG_PATTERN = re.compile(r"^[a-z][a-z0-9-]{0,62}$")


class PhotoError(Exception):
    """A photo could not be read as an image. The message names the slug."""


@dataclass(frozen=True)
class Photo:
    """A photo written into the API folder."""

    uri: str  # A path inside the API, as in `photos/lionel-messi.webp`.
    width_px: int
    height_px: int


def write_photo(image: bytes, slug: str, api_dir: Path) -> Photo:
    """Resize `image` and write it to `api_dir/photos/{slug}.webp`.

    The file is replaced in one step, so a failure leaves the last good copy.

    Args:
        image: The original file's bytes, as Commons serves it.
        slug: The player's id, which names the file.
        api_dir: The API folder that holds `photos/`.

    Returns:
        The photo's path inside the API, and its size in pixels.

    Raises:
        ValueError: The slug isn't a player id.
        PhotoError: The bytes aren't a JPEG, PNG or WebP image, are cut
            short, or hold more than `MAX_PIXELS` pixels.
    """
    if not SLUG_PATTERN.fullmatch(slug):
        raise ValueError(f"{slug!r} is not a player id")
    data = _encode(_resize(_decode(image, slug)))
    uri = f"photos/{slug}.webp"
    target = api_dir / uri
    target.parent.mkdir(parents=True, exist_ok=True)
    partial = target.with_suffix(".part")
    partial.write_bytes(data)
    partial.replace(target)
    with Image.open(target) as written:
        width, height = written.size
    return Photo(uri, width, height)


def _decode(image: bytes, slug: str) -> Image.Image:
    """Read the image's pixels the right way up, with no metadata attached."""
    try:
        with Image.open(io.BytesIO(image), formats=SOURCE_FORMATS) as source:
            if source.width * source.height > MAX_PIXELS:
                raise PhotoError(f"the photo for {slug} has too many pixels")
            upright = ImageOps.exif_transpose(source)
    except (OSError, Image.DecompressionBombError) as exc:
        raise PhotoError(f"the photo for {slug} is not a readable image") from exc
    alpha = "A" in upright.getbands() or "transparency" in upright.info
    pixels = upright.convert("RGBA" if alpha else "RGB")
    # A fresh image carries only pixels: no EXIF, XMP or ICC from the source.
    return Image.frombytes(pixels.mode, pixels.size, pixels.tobytes())


def _resize(image: Image.Image) -> Image.Image:
    """Shrink to `MAX_WIDTH`, keeping the aspect ratio. Never enlarge."""
    if image.width <= MAX_WIDTH:
        return image
    height = max(1, round(image.height * MAX_WIDTH / image.width))
    return image.resize((MAX_WIDTH, height), Image.Resampling.LANCZOS)


def _encode(image: Image.Image) -> bytes:
    out = io.BytesIO()
    image.save(out, "WEBP", quality=WEBP_QUALITY, method=WEBP_METHOD)
    return out.getvalue()
