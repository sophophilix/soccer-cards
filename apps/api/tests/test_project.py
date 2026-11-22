import json
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


def _strip_comments(text: str) -> str:
    """Remove // and /* */ comments, leaving string contents alone."""
    return re.sub(
        r'("(?:\\.|[^"\\])*")|//[^\n]*|/\*.*?\*/',
        lambda m: m.group(1) or "",
        text,
        flags=re.DOTALL,
    )


def _section(parent: dict[str, object], key: str) -> dict[str, object]:
    value = parent.get(key, {})
    assert isinstance(value, dict), key
    return value


def _off_settings(config: dict[str, object]) -> dict[str, object]:
    observability = _section(config, "observability")
    logs = _section(observability, "logs")
    traces = _section(observability, "traces")
    return {
        "send_metrics": config.get("send_metrics"),
        "observability.enabled": observability.get("enabled"),
        "observability.logs.enabled": logs.get("enabled"),
        "observability.traces.enabled": traces.get("enabled"),
    }


def test_worker_config_switches_off_logs_traces_and_metrics() -> None:
    text = (PROJECT_ROOT / "wrangler.jsonc").read_text()
    config = json.loads(_strip_comments(text))

    settings = _off_settings(config)

    not_false = [name for name, value in settings.items() if value is not False]
    assert not_false == [], f"must be false, not missing or true: {not_false}"


def test_comment_stripping_keeps_slashes_inside_strings() -> None:
    text = '{"a": "http://x", /* c */ "b": 1} // end'

    assert json.loads(_strip_comments(text)) == {"a": "http://x", "b": 1}
