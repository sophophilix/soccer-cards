"""Check an API folder against `packages/schema/schemas/v1` (ADR 0003 D2).

The validate stage of the `game-data-api` skill. It runs on the folder the
build wrote, before that folder replaces the published one, so a file that
breaks its schema or a photo without a complete credit stops the run.
"""

import json
from pathlib import Path
from typing import Any

# jsonschema ships no py.typed marker. Its validator is used only in `validate`.
from jsonschema import Draft202012Validator  # type: ignore[import-untyped]
from referencing import Registry, Resource

SCHEMA_DIR = Path(__file__).resolve().parents[4] / "packages/schema/schemas/v1"
COLLECTIONS = ("index", "clubs", "credits", "players")
ROOT_ENTRIES = {f"{name}.json" for name in COLLECTIONS} | {"players", "photos"}


class ValidationError(Exception):
    """An API file breaks its schema. The message names the file and field."""


def validate(api_dir: Path, schema_dir: Path = SCHEMA_DIR) -> None:
    """Check every file in `api_dir` against its schema, and every photo's credit.

    A photo is credited when `credits.json` lists its path. The schema makes
    each listed credit complete: author, licence and Commons page.

    Raises:
        ValidationError: Names the first file that fails, the field and why.
    """
    _refuse_unknown_files(api_dir)
    schemas = {p.name: _load(p) for p in sorted(schema_dir.glob("*.schema.json"))}
    registry: Registry[Any] = Registry().with_resources(
        (name, Resource.from_contents(body)) for name, body in schemas.items()
    )
    files = [(f"{name}.json", f"{name}.schema.json") for name in COLLECTIONS]
    files += [
        (f"players/{p.name}", "player.schema.json")
        for p in sorted((api_dir / "players").glob("*"))
    ]
    for rel, schema in files:
        if not (api_dir / rel).is_file():
            raise ValidationError(f"{rel} is missing")
        validator = Draft202012Validator(schemas[schema], registry=registry)
        errors = sorted(validator.iter_errors(_load(api_dir / rel, rel)), key=str)
        if errors:
            # ascii() escapes fetched text, so a message can't rewrite the terminal.
            reason = ascii(errors[0].message[:200])
            raise ValidationError(f"{rel} {errors[0].json_path}: {reason}")
    credited = {
        c["uri"] for c in _load(api_dir / "credits.json", "credits.json")["credits"]
    }
    for photo in sorted((api_dir / "photos").glob("*")):
        if f"photos/{photo.name}" not in credited:
            raise ValidationError(f"photos/{photo.name} has no credit")


def _refuse_unknown_files(api_dir: Path) -> None:
    """Fail on any path that is not part of the API's layout."""
    for entry in sorted(api_dir.iterdir()):
        if entry.name not in ROOT_ENTRIES:
            raise ValidationError(f"{entry.name} is not an API file")
    for folder, suffix in (("players", ".json"), ("photos", ".webp")):
        for entry in sorted((api_dir / folder).glob("*")):
            if not entry.is_file() or entry.suffix != suffix:
                raise ValidationError(f"{folder}/{entry.name} is not an API file")


def _load(path: Path, label: str | None = None) -> Any:
    """Read a JSON file, turning a decode or parse failure into ValidationError."""
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValidationError(f"{label or path.name} is not UTF-8 JSON: {exc}") from exc
