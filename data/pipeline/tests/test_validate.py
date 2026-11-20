import json
from pathlib import Path
from typing import Any

import pytest

from soccer_cards_data.validate import SCHEMA_DIR, ValidationError, validate

EXAMPLES = SCHEMA_DIR / "examples"


def _example(name: str) -> dict[str, Any]:
    body = json.loads((EXAMPLES / name).read_text(encoding="utf-8"))
    assert isinstance(body, dict)
    return body


def _write(path: Path, body: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(body), encoding="utf-8")


@pytest.fixture
def api(tmp_path: Path) -> Path:
    """A valid API folder made from the schema's invented examples."""
    player = _example("player.outfield.json")
    schema = json.loads((SCHEMA_DIR / "player.schema.json").read_text("utf-8"))
    fields = schema["$defs"]["playerSummary"]["properties"]
    _write(tmp_path / "players/tavi-brightwell.json", player)
    summary = {k: v for k, v in player.items() if k in fields}
    _write(tmp_path / "players.json", {"players": [summary]})
    _write(tmp_path / "clubs.json", {"clubs": [_example("club.example.json")]})
    _write(tmp_path / "credits.json", _example("credits.example.json"))
    _write(tmp_path / "index.json", _example("index.example.json"))
    (tmp_path / "photos").mkdir()
    (tmp_path / "photos/tavi-brightwell.webp").write_bytes(b"RIFF")
    return tmp_path


def test_a_valid_folder_passes(api: Path) -> None:
    validate(api)


def test_a_schema_failure_names_the_file_and_the_field(api: Path) -> None:
    player = _example("player.outfield.json")
    player["outfieldRatings"]["pace"] = 100
    _write(api / "players/tavi-brightwell.json", player)

    with pytest.raises(ValidationError) as failure:
        validate(api)

    message = str(failure.value)
    assert message.startswith("players/tavi-brightwell.json $.outfieldRatings.pace:")


def test_an_incomplete_credit_fails(api: Path) -> None:
    credits = _example("credits.example.json")
    del credits["credits"][0]["attribution"]["author"]
    _write(api / "credits.json", credits)

    with pytest.raises(ValidationError, match=r"^credits\.json \$\.credits\[0\]"):
        validate(api)


def test_a_photo_without_a_credit_fails(api: Path) -> None:
    (api / "photos/stray.webp").write_bytes(b"RIFF")

    with pytest.raises(ValidationError, match=r"photos/stray\.webp has no credit"):
        validate(api)


def test_a_missing_list_file_fails(api: Path) -> None:
    (api / "clubs.json").unlink()

    with pytest.raises(ValidationError, match=r"clubs\.json is missing"):
        validate(api)


def test_a_stray_root_file_fails(api: Path) -> None:
    (api / "notes.txt").write_text("hi", encoding="utf-8")

    with pytest.raises(ValidationError, match=r"notes\.txt is not an API file"):
        validate(api)


def test_a_stray_file_in_players_fails(api: Path) -> None:
    (api / "players/readme.txt").write_text("hi", encoding="utf-8")

    with pytest.raises(ValidationError, match=r"players/readme\.txt is not"):
        validate(api)


def test_a_folder_in_photos_fails(api: Path) -> None:
    (api / "photos/extra").mkdir()

    with pytest.raises(ValidationError, match=r"photos/extra is not an API file"):
        validate(api)


def test_invalid_json_names_the_file(api: Path) -> None:
    (api / "players/tavi-brightwell.json").write_text("{nope", encoding="utf-8")

    with pytest.raises(ValidationError, match=r"^players/tavi-brightwell\.json is"):
        validate(api)


def test_a_file_that_is_not_utf8_names_the_file(api: Path) -> None:
    (api / "clubs.json").write_bytes(b"\xff\xfe{}")

    with pytest.raises(ValidationError, match=r"^clubs\.json is not UTF-8 JSON"):
        validate(api)
