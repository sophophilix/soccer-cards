"""Command line for the data pipeline.

Exit status 0 means success and 2 means the command line was wrong, as with
argparse. The pipeline's commands arrive in later tasks, so for now every
command is unknown.
"""

import argparse
from collections.abc import Sequence
from importlib.metadata import version
from typing import NoReturn

PROG = "scdata"
DISTRIBUTION = "soccer-cards-data"


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
        SystemExit: Always. Code 0 after `--version`, code 2 with usage on
            standard error for a missing or unknown command.
    """
    parser = _parser()
    args = parser.parse_args(argv)
    if args.command is None:
        parser.error("a command is required")
    # repr() escapes control characters, so the echo can't rewrite the terminal.
    parser.error(f"unknown command: {args.command!r}")
