import re
import tomllib
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PROJECT_NAME = "soccer-cards-api"


def _load(name: str) -> dict[str, object]:
    with (PROJECT_ROOT / name).open("rb") as file:
        return tomllib.load(file)


def _normalise(name: str) -> str:
    return re.sub(r"[-_.]+", "-", name).lower()


def _requirement_name(requirement: str) -> str:
    match = re.match(r"[A-Za-z0-9][A-Za-z0-9._-]*", requirement)
    assert match is not None, requirement
    return _normalise(match.group())


def test_every_locked_and_build_dependency_is_refused_a_source_build() -> None:
    lock = _load("uv.lock")
    pyproject = _load("pyproject.toml")
    packages = lock["package"]
    assert isinstance(packages, list)
    locked = {_normalise(p["name"]) for p in packages if p["name"] != PROJECT_NAME}
    build_system = pyproject["build-system"]
    assert isinstance(build_system, dict)
    build = {_requirement_name(r) for r in build_system["requires"]}
    tool = pyproject["tool"]
    assert isinstance(tool, dict)

    refused = {_normalise(n) for n in tool["uv"]["no-build-package"]}

    assert "uv-build" in build
    assert (locked | build) - refused == set()
