import io
import json
import re
import struct
import zlib
from pathlib import Path

import pytest
from PIL import Image

from soccer_cards_data import photos
from soccer_cards_data.photos import (
    MAX_WIDTH,
    WEBP_MAX_SIDE,
    Photo,
    PhotoError,
    write_photo,
)

ROOT = Path(__file__).resolve().parents[3]
SCHEMA = ROOT / "packages/schema/schemas/v1/player.schema.json"


def _image(width: int, height: int, fmt: str = "JPEG", **save: object) -> bytes:
    """Make a test image with a gradient, so resizing has something to blend."""
    image = Image.new("RGB", (width, height))
    image.putdata(
        [(x % 256, y % 256, 128) for y in range(height) for x in range(width)]
    )
    out = io.BytesIO()
    image.save(out, fmt, **save)
    return out.getvalue()


def _png_with_chunk(kind: bytes, body: bytes) -> bytes:
    """Make a small PNG with one extra chunk just before its end."""
    png = _image(4, 4, "PNG")
    chunk = struct.pack(">I", len(body)) + kind + body
    chunk += struct.pack(">I", zlib.crc32(kind + body))
    return png[:-12] + chunk + png[-12:]  # The last 12 bytes are IEND.


GAMMA_22 = b"curv\0\0\0\0" + struct.pack(">IH", 1, round(2.2 * 256)) + b"\0\0"


def _xyz(*xyz: float) -> bytes:
    return b"XYZ \0\0\0\0" + b"".join(struct.pack(">i", round(v * 65536)) for v in xyz)


def _icc(device: bytes, space: bytes, pcs: bytes, tags: dict[bytes, bytes]) -> bytes:
    """Assemble an ICC v2 profile: a 128-byte header, a tag table and tags."""
    desc = b"desc\0\0\0\0" + struct.pack(">I", 5) + b"Test\0" + bytes(79)
    bodies = {b"wtpt": _xyz(0.9642, 1.0, 0.8249), b"desc": desc, **tags}  # D50.
    table, data, offset = b"", b"", 132 + 12 * len(bodies)
    for kind, body in bodies.items():
        table += kind + struct.pack(">II", offset + len(data), len(body))
        data += body + bytes(-len(body) % 4)
    header = struct.pack(">I4sI", 132 + len(table) + len(data), b"lcms", 0x02100000)
    header += device + space + pcs + bytes(12) + b"acsp" + bytes(28)
    header += struct.pack(">iii", 63190, 65536, 54061) + bytes(48)  # D50 white.
    return header + struct.pack(">I", len(bodies)) + table + data


def _adobe_rgb_profile() -> bytes:
    """Build an RGB profile with Adobe RGB (1998) primaries and a 2.2 gamma."""
    primaries = {  # Adapted to D50, as ICC v2 requires.
        b"rXYZ": _xyz(0.6097, 0.3111, 0.0195),
        b"gXYZ": _xyz(0.2053, 0.6257, 0.0609),
        b"bXYZ": _xyz(0.1492, 0.0632, 0.7446),
    }
    curves = {b"rTRC": GAMMA_22, b"gTRC": GAMMA_22, b"bTRC": GAMMA_22}
    return _icc(b"mntr", b"RGB ", b"XYZ ", primaries | curves)


def _grey_profile() -> bytes:
    return _icc(b"mntr", b"GRAY", b"XYZ ", {b"kTRC": GAMMA_22})


def _exif(**tags: object) -> Image.Exif:
    exif = Image.Exif()
    for tag, value in tags.items():
        exif[int(tag.removeprefix("t"))] = value
    return exif


def test_uri_pattern_matches_the_schema() -> None:
    photo = json.loads(SCHEMA.read_text(encoding="utf-8"))["$defs"]["photo"]
    pattern = re.compile(photo["properties"]["uri"]["pattern"])
    assert pattern.fullmatch("photos/lionel-messi.webp")


def test_wide_photo_is_resized_to_the_maximum_width(tmp_path: Path) -> None:
    result = write_photo(_image(MAX_WIDTH * 2, MAX_WIDTH * 3), "lionel-messi", tmp_path)

    assert result == Photo("photos/lionel-messi.webp", MAX_WIDTH, MAX_WIDTH * 3 // 2)
    with Image.open(tmp_path / result.uri) as written:
        assert written.format == "WEBP"
        assert written.size == (MAX_WIDTH, MAX_WIDTH * 3 // 2)


def test_aspect_ratio_is_kept_to_the_nearest_pixel(tmp_path: Path) -> None:
    result = write_photo(_image(1000, 333), "a-player", tmp_path)

    assert (result.width_px, result.height_px) == (
        MAX_WIDTH,
        round(333 * MAX_WIDTH / 1000),
    )


def test_small_photo_is_not_enlarged(tmp_path: Path) -> None:
    result = write_photo(_image(120, 90, "PNG"), "a-player", tmp_path)

    assert (result.width_px, result.height_px) == (120, 90)


def test_metadata_is_stripped(tmp_path: Path) -> None:
    exif = _exif(t315="Someone", t271="A camera")  # Artist and Make.
    source = _image(64, 48, exif=exif, icc_profile=b"not a real profile")

    result = write_photo(source, "a-player", tmp_path)

    data = (tmp_path / result.uri).read_bytes()
    assert b"EXIF" not in data
    assert b"ICCP" not in data
    assert b"XMP " not in data
    with Image.open(tmp_path / result.uri) as written:
        assert not written.getexif()
        assert "icc_profile" not in written.info


def test_camera_orientation_is_applied_before_the_tag_is_dropped(
    tmp_path: Path,
) -> None:
    source = _image(80, 40, exif=_exif(t274=6))  # Orientation: rotate 90 degrees.

    result = write_photo(source, "a-player", tmp_path)

    assert (result.width_px, result.height_px) == (40, 80)


def test_transparency_is_kept(tmp_path: Path) -> None:
    image = Image.new("RGBA", (10, 10), (255, 0, 0, 0))
    out = io.BytesIO()
    image.save(out, "PNG")

    result = write_photo(out.getvalue(), "a-player", tmp_path)

    with Image.open(tmp_path / result.uri) as written:
        assert written.mode == "RGBA"


def test_same_input_gives_the_same_bytes(tmp_path: Path) -> None:
    source = _image(900, 600)

    first = write_photo(source, "a-player", tmp_path / "one")
    second = write_photo(source, "a-player", tmp_path / "two")

    assert first == second
    one = (tmp_path / "one" / first.uri).read_bytes()
    assert one == (tmp_path / "two" / second.uri).read_bytes()


def test_rewrite_replaces_the_file_and_leaves_no_partial(tmp_path: Path) -> None:
    write_photo(_image(50, 50), "a-player", tmp_path)
    write_photo(_image(30, 60), "a-player", tmp_path)

    assert sorted(p.name for p in (tmp_path / "photos").iterdir()) == ["a-player.webp"]
    with Image.open(tmp_path / "photos/a-player.webp") as written:
        assert written.size == (30, 60)


@pytest.mark.parametrize(
    "data",
    [
        b"",
        b"<html>not an image</html>",
        _image(40, 40)[:200],
        _image(8, 8, "BMP"),
        _png_with_chunk(b"gAMA", b"\0"),  # Pillow raises ValueError.
        _png_with_chunk(b"zTXt", b"k\0\1zz"),  # Pillow raises SyntaxError.
    ],
    ids=["empty", "text", "truncated", "format-not-allowed", "short-chunk", "bad-zTXt"],
)
def test_bad_input_fails_naming_the_slug(tmp_path: Path, data: bytes) -> None:
    with pytest.raises(PhotoError, match="lionel-messi"):
        write_photo(data, "lionel-messi", tmp_path)
    assert not (tmp_path / "photos/lionel-messi.webp").exists()


def test_too_many_pixels_fails_before_decoding(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(photos, "MAX_PIXELS", 99)

    with pytest.raises(PhotoError, match="a-player"):
        write_photo(_image(10, 10), "a-player", tmp_path)


@pytest.mark.parametrize(
    "slug", ["", "../evil", "Lionel-Messi", "a/b", "1player", "a" * 64]
)
def test_slug_that_is_not_an_id_is_refused(tmp_path: Path, slug: str) -> None:
    with pytest.raises(ValueError, match="not a player id"):
        write_photo(_image(4, 4), slug, tmp_path)
    assert not (tmp_path / "photos").exists()


def test_webp_side_limit_keeps_16383_px_and_refuses_more(tmp_path: Path) -> None:
    kept = write_photo(_image(1, WEBP_MAX_SIDE, "PNG"), "a-player", tmp_path)

    assert (kept.width_px, kept.height_px) == (1, WEBP_MAX_SIDE)
    with pytest.raises(PhotoError, match="lionel-messi"):  # Too narrow to resize.
        write_photo(_image(1, WEBP_MAX_SIDE + 1, "PNG"), "lionel-messi", tmp_path)
    assert not (tmp_path / "photos/lionel-messi.webp").exists()


def test_wide_gamut_colours_are_converted_to_srgb(tmp_path: Path) -> None:
    out = io.BytesIO()
    image = Image.new("RGB", (16, 16), (40, 160, 60))
    image.save(out, "PNG", icc_profile=_adobe_rgb_profile())

    result = write_photo(out.getvalue(), "a-player", tmp_path)

    with Image.open(tmp_path / result.uri) as written:
        pixel = written.convert("RGB").getpixel((8, 8))
    # Adobe RGB (40, 160, 60) is (0, 161, 47) in sRGB: a greener green than
    # the same numbers mean in sRGB. WebP may move each channel a little.
    assert isinstance(pixel, tuple)
    want = (0, 161, 47)
    assert all(abs(got - w) <= 3 for got, w in zip(pixel, want, strict=True))


@pytest.mark.parametrize(
    ("mode", "key", "profile"),
    [("RGB", (40, 160, 60), _adobe_rgb_profile()), ("L", 0, _grey_profile())],
    ids=["rgb", "grey"],
)
def test_colour_key_transparency_survives_colour_conversion(
    tmp_path: Path, mode: str, key: int | tuple[int, int, int], profile: bytes
) -> None:
    image = Image.new(mode, (16, 16), key)
    image.paste("white", (0, 0, 16, 8))
    out = io.BytesIO()
    image.save(out, "PNG", transparency=key, icc_profile=profile)

    result = write_photo(out.getvalue(), "a-player", tmp_path)

    with Image.open(tmp_path / result.uri) as written:
        alpha = written.getchannel("A")
        assert alpha.getpixel((8, 4)) == 255
        assert alpha.getpixel((8, 12)) == 0
