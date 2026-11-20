"""Command line for the data pipeline.

`scdata build` runs the whole pipeline and replaces `data/api/v1/`. Exit
status 0 means success, 1 a failed build that left the last good output, and
2 a wrong command line, as with argparse. What a build dropped goes to stderr.
"""

import argparse
import sys
from collections.abc import Sequence
from datetime import UTC, datetime
from importlib.metadata import version
from typing import NoReturn

from soccer_cards_data import build
from soccer_cards_data.http import FetchError, PoliteClient
from soccer_cards_data.photos import PhotoError
from soccer_cards_data.wikidata import WikidataError

PROG = "scdata"
DISTRIBUTION = "soccer-cards-data"
# ValueError covers the grades, labels, ratings, normalise and TOML errors.
FAILURES = (build.BuildError, FetchError, PhotoError, ValueError, WikidataError)


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog=PROG,
        description="Build the Soccer Cards static API.",
    )
    parser.add_argument(
        "--version",
        action="version",
        version=f"{PROG} {version(DISTRIBUTION)}",
    )
    parser.add_argument("command", nargs="?", help="the pipeline step to run")
    return parser


def main(argv: Sequence[str] | None = None) -> NoReturn:
    """Run the scdata command.

    Args:
        argv: Arguments without the program name. Defaults to `sys.argv[1:]`.

    Raises:
        SystemExit: Always. Code 0 after `--version` or a build, code 1 for
            a failed build, and code 2 with usage on standard error for a
            missing or unknown command.
    """
    parser = _parser()
    args = parser.parse_args(argv)
    if args.command is None:
        parser.error("a command is required")
    if args.command == "build":
        raise SystemExit(_build())
    # repr() escapes control characters, so the echo can't rewrite the terminal.
    parser.error(f"unknown command: {args.command!r}")


def _build() -> int:
    now = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    try:
        with PoliteClient() as client:
            dropped = build.build(client, now=now)
    except FAILURES as exc:
        print(f"{PROG}: build failed, output unchanged: {exc}", file=sys.stderr)
        return 1
    for line in dropped:
        print(f"{PROG}: {line}", file=sys.stderr)
    return 0
