#!/usr/bin/env python3
"""SDLC kit: the checks a program makes so that a prompt doesn't have to (ADR 0004).

Standard library only, so a hook never depends on an installed package.
Exit code 0 means no objection. Exit code 2 refuses and gives the reason on stderr.
"""

from __future__ import annotations

import json
import os
import re
import shlex
import shutil
import subprocess
import sys
import time
import tomllib
from pathlib import Path

REFUSED = "Refused by the SDLC kit: "

IMPLEMENTERS = {"web-implementer", "data-implementer", "infra-implementer", "refactorer"}
REVIEWERS = {"reviewer", "security-reviewer"}
COMPONENTS = {"web", "game", "schema", "data", "infra", "ci", "docs", "sdlc"}
KINDS = {"feature", "fix", "refactor", "chore", "docs"}
MAX_CHANGED_LINES = 400

# The kit itself. An agent can't edit the rules that bind it.
KIT_PATHS = [
    ".claude/**",
    "tools/sdlc/**",
    "bin/sdlc",
    "AGENTS.md",
    "CLAUDE.md",
    "Makefile",
    "docs/decisions/**",
    ".pre-commit-config.yaml",
]
# data/api/ is written only by `scdata build` (ADR 0006 D6), like a lockfile by its tool.
GENERATED_PATHS = ["**/pnpm-lock.yaml", "**/uv.lock", "**/node_modules/**", "**/.svelte-kit/**", "data/api/**"]
BUILD_OUTPUT = [f"**/{name}{tail}" for name in ("node_modules", ".svelte-kit", "dist", "build", "coverage", ".wrangler", ".venv") for tail in ("", "/**")]
SECRET_PATHS = ["**/.env", "**/.env.*", "**/*.pem", "**/*.key", "**/.dev.vars"]
SECRET_EXCEPTIONS = ["**/.env.example"]
TEST_PATHS = ["**/*.test.ts", "**/*.spec.ts", "**/*.test.js", "**/tests/**", "**/test_*.py", "**/*_test.py"]
SOURCE_ROOTS = ("apps/", "packages/", "data/")
TEMP_ROOTS = ("/tmp/", "/private/tmp/", "/var/folders/", "/private/var/folders/")

REQUIRED_SECTIONS = ["## Goal", "## Acceptance criteria", "## Tests", "## Out of scope"]
COMMIT_RE = re.compile(
    r"^(feat|fix|refactor|perf|test|docs|build|ci|chore|revert)(\([a-z0-9-]+\))?!?: [^\s].{0,71}$"
)

Decision = tuple[str, str]  # ("deny" | "ask" | "note", reason). A note is allowed and logged.


# ---------- paths ----------


def glob_to_regex(pattern: str) -> re.Pattern[str]:
    """Translate a glob where `**` crosses directories and `*` doesn't."""
    out, i = [], 0
    while i < len(pattern):
        if pattern.startswith("**/", i):
            out.append("(?:.*/)?")
            i += 3
        elif pattern.startswith("**", i):
            out.append(".*")
            i += 2
        elif pattern[i] == "*":
            out.append("[^/]*")
            i += 1
        elif pattern[i] == "?":
            out.append("[^/]")
            i += 1
        else:
            out.append(re.escape(pattern[i]))
            i += 1
    return re.compile("".join(out) + r"\Z")


def matches(path: str, patterns: list[str]) -> bool:
    return any(glob_to_regex(p).match(path) for p in patterns)


def is_secret(rel: str) -> bool:
    return matches(rel, SECRET_PATHS) and not matches(rel, SECRET_EXCEPTIONS)


def find_root(path: Path) -> Path | None:
    """The nearest ancestor that holds AGENTS.md. A worktree is its own root."""
    current = path if path.is_dir() else path.parent
    for candidate in [current, *current.parents]:
        if (candidate / "AGENTS.md").is_file():
            return candidate
    return None


# ---------- task briefs ----------


def parse_brief(text: str) -> tuple[dict[str, object], str]:
    """Read the front matter of a task brief.

    The format is a strict subset of YAML: `key: value`, `key: []`, or `key:`
    followed by `  - item` lines. Anything else is an error, so the file means
    one thing only.
    """
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        raise ValueError("the brief must start with a '---' front matter block")
    try:
        end = next(i for i, line in enumerate(lines[1:], start=1) if line.strip() == "---")
    except StopIteration as exc:
        raise ValueError("the front matter block is not closed with '---'") from exc
    meta: dict[str, object] = {}
    key: str | None = None
    for number, line in enumerate(lines[1:end], start=2):
        if not line.strip():
            continue
        item = re.match(r"^\s+-\s+(.+)$", line)
        if item:
            if key is None or not isinstance(meta.get(key), list):
                raise ValueError(f"line {number}: a list item has no list key above it")
            meta[key].append(_unquote(item.group(1)))  # type: ignore[union-attr]
            continue
        pair = re.match(r"^([a-z_]+):\s*(.*)$", line)
        if not pair:
            raise ValueError(f"line {number}: expected 'key: value' or '  - item'")
        key, value = pair.group(1), pair.group(2).strip()
        if key in meta:
            raise ValueError(f"line {number}: '{key}' appears twice")
        meta[key] = [] if value in ("", "[]") else _unquote(value)
    return meta, "\n".join(lines[end + 1 :])


def _unquote(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        return value[1:-1]
    return value


def validate_brief(meta: dict[str, object], body: str, filename: str) -> list[str]:
    errors: list[str] = []

    def text(field: str) -> str:
        value = meta.get(field)
        return value if isinstance(value, str) else ""

    task_id = text("id")
    if not re.fullmatch(r"T-\d{4}", task_id):
        errors.append("id must look like T-0001")
    elif not Path(filename).name.startswith(task_id + "-"):
        errors.append(f"the file name must start with '{task_id}-'")
    if not text("title"):
        errors.append("title is missing")
    if text("component") not in COMPONENTS:
        errors.append(f"component must be one of {sorted(COMPONENTS)}")
    if text("kind") not in KINDS:
        errors.append(f"kind must be one of {sorted(KINDS)}")
    if text("agent") not in IMPLEMENTERS:
        errors.append(f"agent must be one of {sorted(IMPLEMENTERS)}")
    if text("kind") == "refactor" and text("agent") != "refactorer":
        errors.append("a refactor task must go to the refactorer")
    paths = meta.get("paths")
    if not isinstance(paths, list) or not paths:
        errors.append("paths must list at least one glob")
    else:
        for pattern in paths:
            if pattern.startswith("/") or ".." in pattern.split("/") or pattern in ("**", "**/*", "*"):
                errors.append(f"path '{pattern}' is too wide or leaves the repository")
            elif matches(pattern, KIT_PATHS) or any(pattern.startswith(k.split("*")[0]) for k in KIT_PATHS if "*" in k):
                errors.append(f"path '{pattern}' is part of the SDLC kit, which only the tech lead changes")
    if not isinstance(meta.get("dependencies", []), list):
        errors.append("dependencies must be a list (use [] for none)")
    limit = text("max_changed_lines") or str(MAX_CHANGED_LINES)
    if not limit.isdigit() or not 1 <= int(limit) <= MAX_CHANGED_LINES:
        errors.append(f"max_changed_lines must be a number from 1 to {MAX_CHANGED_LINES}")
    for heading in REQUIRED_SECTIONS:
        section = _section(body, heading)
        if section is None:
            errors.append(f"section '{heading}' is missing")
        elif not section.strip():
            errors.append(f"section '{heading}' is empty")
    return errors


def _section(body: str, heading: str) -> str | None:
    match = re.search(rf"^{re.escape(heading)}\s*$", body, flags=re.MULTILINE)
    if not match:
        return None
    rest = body[match.end() :]
    nxt = re.search(r"^## ", rest, flags=re.MULTILINE)
    return rest[: nxt.start()] if nxt else rest


def load_brief(path: Path) -> tuple[dict[str, object], list[str]]:
    try:
        meta, body = parse_brief(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        return {}, [str(exc)]
    return meta, validate_brief(meta, body, path.name)


def active_brief(root: Path) -> tuple[Path | None, dict[str, object], list[str]]:
    marker = root / ".sdlc" / "active-task"
    if not marker.is_file():
        return None, {}, ["no active task: write the task id (for example T-0003) to .sdlc/active-task first"]
    task_id = marker.read_text(encoding="utf-8").strip()
    if not re.fullmatch(r"T-\d{4}", task_id):
        return None, {}, [".sdlc/active-task must hold one task id such as T-0003"]
    found = sorted((root / "docs" / "tasks").glob(f"{task_id}-*.md"))
    if len(found) != 1:
        return None, {}, [f"expected exactly one brief docs/tasks/{task_id}-*.md, found {len(found)}"]
    meta, errors = load_brief(found[0])
    return found[0], meta, errors


# ---------- writes ----------


def check_write(target: Path, agent: str | None, event: dict[str, object]) -> Decision | None:
    """Decide on a write to `target` by the tool or by a shell command."""
    target = Path(os.path.abspath(target))
    root = find_root(target)
    if root is None:
        if agent is None:
            return None
        scratch = str(event.get("scratchpad_dir") or "")
        text = str(target) + "/"
        if (scratch and text.startswith(scratch.rstrip("/") + "/")) or text.startswith(TEMP_ROOTS):
            return None
        return ("deny", f"{target} is outside the repository. A subagent writes only inside it or in the scratchpad.")
    rel = target.relative_to(root).as_posix()
    if is_secret(rel):
        return ("deny", f"{rel} can hold secret values. Secrets never go in the repository (AGENTS.md rule 6).")
    if matches(rel, GENERATED_PATHS):
        return ("deny", f"{rel} is generated. Run the tool that owns it (pnpm, uv, the build) instead of editing it.")
    if matches(rel, KIT_PATHS):
        if agent is not None:
            return ("deny", f"{rel} is part of the SDLC kit. Only the tech lead changes it (AGENTS.md rule 2).")
        # Allowed without a prompt, at the tech lead's request, and written to the audit log.
        return ("note", f"{rel} is part of the SDLC kit, changed by the lead session.")
    if agent in REVIEWERS:
        if matches(rel, [".sdlc/reviews/**", ".sdlc/work/**"]):
            return None
        return ("deny", "A reviewer writes only its review file under .sdlc/reviews/. It never edits the change.")
    if agent in IMPLEMENTERS:
        if matches(rel, [".sdlc/reviews/**"]):
            return ("deny", "An implementer can't write a review of its own work.")
        if rel.startswith(".sdlc/"):
            return None
        brief, meta, errors = active_brief(root)
        if errors:
            return ("deny", "; ".join(errors))
        assert brief is not None
        if target == brief:
            return ("deny", "The lead owns the task brief. Report a problem with it instead of editing it.")
        paths = [str(p) for p in meta.get("paths", [])]  # type: ignore[union-attr]
        if not matches(rel, paths):
            return ("deny", f"{rel} is outside task {meta.get('id')}. Its paths are: {', '.join(paths)}. Stop and tell the lead if the task needs more.")
    return None


# ---------- shell commands ----------

OPERATOR_CHARS = set(";|&()")
WRAPPERS = {"command", "exec", "time", "nohup", "env", "xargs"}
SHELLS = {"sh", "bash", "zsh", "dash", "fish"}
READERS = {"cat", "less", "more", "head", "tail", "grep", "rg", "cp", "mv", "source", ".", "bat", "sed", "awk", "open", "code", "strings", "base64"}


def split_segments(command: str) -> list[tuple[str, list[str]]]:
    """Split a command line into (operator before it, tokens) segments."""
    lexer = shlex.shlex(command.replace("\n", " ; "), posix=True, punctuation_chars=True)
    lexer.whitespace_split = True
    segments: list[tuple[str, list[str]]] = []
    operator, current = "", []
    for token in lexer:
        if token and set(token) <= OPERATOR_CHARS:
            if current:
                segments.append((operator, current))
            operator, current = token, []
        else:
            current.append(token)
    if current:
        segments.append((operator, current))
    return segments


def strip_wrappers(tokens: list[str]) -> list[str]:
    tokens = list(tokens)
    while tokens:
        if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*=.*", tokens[0]) or tokens[0] in WRAPPERS:
            tokens.pop(0)
        elif tokens[0] == "$":  # the shell of a $( ... ) substitution
            tokens.pop(0)
        else:
            break
    return tokens


def current_branch(cwd: str) -> str:
    try:
        result = subprocess.run(
            ["git", "-C", cwd, "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True, text=True, timeout=10, check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return ""
    return result.stdout.strip() if result.returncode == 0 else ""


def check_command(command: str, agent: str | None, event: dict[str, object], branch: str | None = None) -> Decision | None:
    cwd = str(event.get("cwd") or os.getcwd())
    try:
        segments = split_segments(command)
    except ValueError:
        # Quotes the lexer can't follow. Scan the raw text for the same programs.
        segments = [("", part.split()) for part in re.split(r"[;|&()\n]+", command) if part.strip()]
    asks: list[Decision] = []
    for operator, raw in segments:
        tokens = strip_wrappers(raw)
        if not tokens:
            continue
        if tokens[0] in {"cd", "pushd"} and len(tokens) > 1 and tokens[1] != "-":
            # Later parts of the line run in the new folder, so relative paths resolve there.
            cwd = os.path.normpath(os.path.join(cwd, os.path.expanduser(tokens[1])))
            continue
        decision = _check_segment(operator, tokens, agent, event, cwd, branch)
        if decision and decision[0] == "deny":
            return decision
        if decision:
            asks.append(decision)
    # A note never hides a question: an "ask" anywhere on the line wins.
    return next((d for d in asks if d[0] == "ask"), asks[0] if asks else None)


def _check_segment(operator: str, tokens: list[str], agent: str | None, event: dict[str, object], cwd: str, branch: str | None) -> Decision | None:
    prog, args = os.path.basename(tokens[0]), tokens[1:]
    lowered = [a.lower() for a in args]

    if prog == "sudo":
        return ("deny", "sudo is not allowed.")
    if prog in SHELLS and operator == "|":
        return ("deny", "Piping output into a shell runs code nobody has read.")
    if prog in {"npm", "npx", "yarn", "bun", "bunx"}:
        return ("deny", f"{prog} is not this repository's package manager. Use pnpm (ts-standards).")
    if prog in {"pip", "pip3", "pipx"}:
        return ("deny", f"{prog} is not allowed. Use uv (python-standards).")
    if prog == "pnpm":
        if args[:1] == ["dlx"]:
            return ("deny", "pnpm dlx runs a package that is not in the lockfile. Add it as a dev dependency in a task that lists it.")
        if "--dangerously-allow-all-builds" in args:
            return ("deny", "Dependency build scripts stay off unless pnpm-workspace.yaml allows the package (ci-supply-chain).")
    if any("core.hookspath" in a for a in lowered):
        return ("deny", "Changing core.hooksPath would switch the git hooks off.")

    if prog == "git":
        decision = _check_git(args, cwd, branch)
        if decision:
            return decision
    if prog == "gh":
        decision = _check_gh(args, agent)
        if decision:
            return decision
    if prog == "wrangler" and "--dry-run" not in args:
        if args[:1] and args[0] in {"deploy", "publish", "delete", "rollback", "secret", "versions", "pages"}:
            return ("deny", f"wrangler {args[0]} changes what is live. Deploys run in CI from main (cloudflare-infra).")
    if prog in {"tofu", "terraform"} and args[:1] and args[0] in {"apply", "destroy", "import", "state", "taint", "untaint", "force-unlock"}:
        return ("deny", f"{prog} {args[0]} changes real infrastructure. Only CI applies a plan the tech lead approved.")

    if prog in READERS:
        for arg in args:
            name = os.path.basename(arg)
            if is_secret(name) or name == ".dev.vars":
                return ("deny", f"{arg} can hold secret values. Don't read it (AGENTS.md rule 6).")

    if prog == "rm" and any(re.fullmatch(r"-[a-zA-Z]*[rR][a-zA-Z]*", a) or a == "--recursive" for a in args):
        for arg in (a for a in args if not a.startswith("-")):
            if arg in {"/", "~", "~/", ".", "..", "*", ".git", "$HOME"} or arg.startswith("../") or arg.rstrip("/").endswith(".git"):
                return ("deny", f"rm -r {arg} could destroy the repository or files outside it.")

    for target in _write_targets(prog, tokens):
        if prog == "rm" and matches(target.rstrip("/"), BUILD_OUTPUT):
            continue  # deleting build output is always fine
        decision = check_write(Path(cwd) / os.path.expanduser(target), agent, event)
        if decision:
            return decision
    return None


def _write_targets(prog: str, tokens: list[str]) -> list[str]:
    targets = [tokens[i + 1] for i, t in enumerate(tokens[:-1]) if t in {">", ">>", ">|"}]
    plain = [a for a in tokens[1:] if not a.startswith("-") and a not in {">", ">>", ">|", "<"}]
    if prog == "tee":
        targets += plain
    elif prog in {"cp", "mv", "install", "ln"} and plain:
        targets.append(plain[-1])
        if prog == "mv":
            targets += plain[:-1]
    elif prog == "rm":
        targets += plain
    elif prog == "sed" and any(a.startswith("-i") or a == "--in-place" for a in tokens[1:]) and plain:
        targets.append(plain[-1])
    elif prog in {"touch", "truncate", "chmod", "chown"}:
        targets += plain
    return [t for t in targets if t and not t.startswith("&") and t != "/dev/null"]


def _git_subcommand(args: list[str]) -> tuple[str, list[str]]:
    i = 0
    while i < len(args):
        if args[i] in {"-C", "-c", "--git-dir", "--work-tree", "--namespace"}:
            i += 2
        elif args[i].startswith("-"):
            i += 1
        else:
            return args[i], args[i + 1 :]
    return "", []


def _check_git(args: list[str], cwd: str, branch: str | None) -> Decision | None:
    sub, rest = _git_subcommand(args)
    if sub in {"commit", "push", "merge"} and "--no-verify" in rest:
        return ("deny", "--no-verify skips the git hooks. Fix what the hook reports.")
    if sub == "commit":
        if any(re.fullmatch(r"-[a-zA-Z]*n[a-zA-Z]*", a) for a in rest):
            return ("deny", "git commit -n skips the git hooks. Fix what the hook reports.")
        if (branch if branch is not None else current_branch(cwd)) in {"main", "master"}:
            return ("deny", "Commits don't go straight to main. Create a branch for the task first (AGENTS.md rule 3).")
    if sub == "push":
        if any(a == "-f" or a.startswith("--force") or a.startswith("+") for a in rest):
            return ("deny", "A force push rewrites history that others may hold.")
        refs = [a for a in rest if not a.startswith("-")][1:]
        to_main = any(r in {"main", "master"} or r.endswith((":main", ":master")) for r in refs)
        if to_main or (not refs and (branch if branch is not None else current_branch(cwd)) in {"main", "master"}):
            return ("deny", "Nothing is pushed to main. Open a pull request (AGENTS.md rule 3).")
    if sub == "reset" and "--hard" in rest:
        return ("ask", "git reset --hard discards uncommitted work.")
    if sub == "clean" and any(re.fullmatch(r"-[a-zA-Z]*f[a-zA-Z]*", a) or a == "--force" for a in rest):
        return ("ask", "git clean -f deletes untracked files.")
    if sub in {"checkout", "restore"} and "." in rest:
        return ("ask", f"git {sub} . discards uncommitted work.")
    return None


def _check_gh(args: list[str], agent: str | None = None) -> Decision | None:
    head = [a for a in args if not a.startswith("-")][:2]
    if head == ["pr", "merge"]:
        if agent is not None:
            return ("deny", "A subagent never merges a pull request (AGENTS.md rule 1).")
        if "--admin" in args:
            return ("deny", "gh pr merge --admin skips the required checks. Only the tech lead does that.")
        return ("note", "pull request merged by the lead session (AGENTS.md rule 1: run sdlc merge-check first).")
    if head == ["pr", "review"] and "--approve" in args:
        return ("deny", "An agent's review is advice. Only the tech lead approves (AGENTS.md rule 1).")
    if head[:1] and head[0] in {"secret", "ruleset", "variable"}:
        return ("deny", f"gh {head[0]} changes repository settings. Only the tech lead does that.")
    if head[:1] == ["repo"] and head[1:2] and head[1] in {"delete", "edit", "rename", "archive"}:
        return ("deny", f"gh repo {head[1]} changes the repository itself. Only the tech lead does that.")
    if head[:1] == ["release"] and head[1:2] and head[1] in {"create", "delete", "edit", "upload"}:
        return ("deny", "Releases are cut by the tech lead.")
    if head[:1] == ["workflow"] and head[1:2] and head[1] in {"run", "enable", "disable"}:
        return ("deny", "Workflows are started by events, not by an agent.")
    if head[:1] == ["api"]:
        for i, arg in enumerate(args):
            method = args[i + 1] if arg in {"-X", "--method"} and i + 1 < len(args) else ""
            if arg.startswith("--method="):
                method = arg.split("=", 1)[1]
            if method and method.upper() != "GET":
                return ("deny", "gh api may only read. Use gh pr or gh issue commands to write.")
            if arg in {"-f", "-F", "--field", "--raw-field", "--input"}:
                return ("deny", "gh api may only read. Use gh pr or gh issue commands to write.")
    return None


# ---------- verify ----------


def _git(root: Path, *args: str) -> tuple[int, str]:
    result = subprocess.run(["git", "-C", str(root), *args], capture_output=True, text=True, timeout=60, check=False)
    return result.returncode, result.stdout


def _base_ref(root: Path) -> str | None:
    for ref in ("origin/main", "main"):
        if _git(root, "rev-parse", "--verify", "--quiet", ref)[0] == 0:
            return ref
    return None


def _dependency_names(text: str, kind: str) -> set[str]:
    if kind == "package.json":
        data = json.loads(text or "{}")
        names: set[str] = set()
        for group in ("dependencies", "devDependencies", "optionalDependencies", "peerDependencies"):
            names |= set(data.get(group, {}))
        return names
    data = tomllib.loads(text or "")
    entries = list(data.get("project", {}).get("dependencies", []))
    for group in data.get("dependency-groups", {}).values():
        entries += [e for e in group if isinstance(e, str)]
    return {re.split(r"[\s<>=!~\[;@]", e, maxsplit=1)[0].lower() for e in entries}


# ---------- which gates a change needs (ADR 0004 D14) ----------

# The components whose gates CI runs only when a change touches them. `sdlc`
# and `docs` run on every pull request, because each takes seconds.
CI_COMPONENTS = ("infra", "schema", "game", "web", "data")
EVERY_COMPONENT = frozenset(COMPONENTS)

# Each changed path takes the components of the first rule its glob matches.
# A path no rule matches runs every gate. Order matters: narrow rules first.
CHANGE_MAP: list[tuple[str, frozenset[str]]] = [
    # The gates' own workflow changes how every gate runs.
    (".github/workflows/checks.yml", EVERY_COMPONENT),
    ("infra/**", frozenset({"infra"})),
    # The schema generates the types the game and the site import.
    ("packages/schema/**", frozenset({"schema", "game", "web"})),
    ("packages/game/**", frozenset({"game", "web"})),
    ("apps/web/**", frozenset({"web"})),
    # The site's build copies the published API, so its tests read it.
    ("data/api/**", frozenset({"data", "web"})),
    ("data/**", frozenset({"data"})),
    ("apps/api/**", frozenset({"data"})),
    # Knip reads the workflows' `pnpm exec` binaries, and every TypeScript
    # gate runs Knip. The schema gate is the cheapest of them.
    (".github/workflows/**", frozenset({"ci", "schema"})),
    (".github/**", frozenset({"ci"})),
    ("docs/tasks/**", frozenset({"docs"})),
    ("tools/sdlc/**", frozenset({"sdlc"})),
    ("bin/sdlc", frozenset({"sdlc"})),
    # Prose and configuration no gate reads.
    ("docs/**", frozenset()),
    (".claude/**", frozenset()),
    ("evals/**", frozenset()),
    ("prototype/**", frozenset()),
    ("**/*.md", frozenset()),
    ("LICENSE", frozenset()),
]


def components_for(paths: list[str]) -> set[str]:
    """Return the components whose gates a change to these paths needs."""
    needed: set[str] = set()
    for path in paths:
        for pattern, components in CHANGE_MAP:
            if matches(path, [pattern]):
                needed |= components
                break
        else:
            needed |= EVERY_COMPONENT
    return needed


def changed_paths(root: Path, base: str, head: str = "HEAD") -> list[str] | None:
    """Return the paths changed between base and head, or None if git can't say.

    --no-renames lists a moved file under its old path and its new one, so
    moving a file out of a component still runs that component's gate.
    """
    code, out = _git(root, "-c", "core.quotePath=false", "diff", "--no-renames", "--name-only", "-z", base, head)
    if code != 0:
        return None
    return [p for p in out.split("\0") if p]


def verify(root: Path, run_gates: bool = True) -> list[str]:
    """Check the working tree against the active task brief. Returns the failures."""
    brief, meta, errors = active_brief(root)
    if errors:
        return errors
    assert brief is not None
    base = _base_ref(root)
    if base is None:
        return ["no main branch to compare with: this must run in a git repository that has main"]
    failures: list[str] = []
    paths = [str(p) for p in meta["paths"]]  # type: ignore[union-attr]
    brief_rel = brief.relative_to(root).as_posix()

    changed: set[str] = set()
    for args in (("diff", "--name-only", f"{base}...HEAD"), ("diff", "--name-only", "HEAD"), ("ls-files", "--others", "--exclude-standard")):
        changed |= {line for line in _git(root, *args)[1].splitlines() if line}
    changed = {c for c in changed if not c.startswith(".sdlc/") and c != brief_rel}

    for rel in sorted(changed):
        if matches(rel, KIT_PATHS):
            failures.append(f"{rel}: part of the SDLC kit, which only the tech lead changes")
        elif not matches(rel, paths) and not matches(rel, GENERATED_PATHS):
            failures.append(f"{rel}: outside the task's paths")

    lines = 0
    for row in _git(root, "diff", "--numstat", base)[1].splitlines():
        added, removed, name = (row.split("\t") + ["", ""])[:3]
        if added.isdigit() and name in changed and not matches(name, GENERATED_PATHS):
            lines += int(added) + int(removed)
    for rel in _git(root, "ls-files", "--others", "--exclude-standard")[1].splitlines():
        if rel in changed and not matches(rel, GENERATED_PATHS):
            try:
                lines += len((root / rel).read_text(encoding="utf-8").splitlines())
            except (OSError, UnicodeDecodeError):
                pass
    limit = int(str(meta.get("max_changed_lines") or MAX_CHANGED_LINES))
    if lines > limit:
        failures.append(f"the change is {lines} lines, over the task's limit of {limit}: split the task")

    declared = {str(d).lower() for d in meta.get("dependencies", [])}  # type: ignore[union-attr]
    for rel in sorted(changed):
        kind = Path(rel).name
        if kind not in {"package.json", "pyproject.toml"} or not (root / rel).is_file():
            continue
        try:
            before = _dependency_names(_git(root, "show", f"{base}:{rel}")[1], kind)
            after = _dependency_names((root / rel).read_text(encoding="utf-8"), kind)
        except (ValueError, OSError) as exc:
            failures.append(f"{rel}: can't be parsed ({exc})")
            continue
        for name in sorted(n for n in after - before if n.lower() not in declared):
            failures.append(f"{rel}: new dependency '{name}' is not listed in the task's dependencies")

    kind = str(meta.get("kind"))
    tests = {c for c in changed if matches(c, TEST_PATHS)}
    sources = {c for c in changed if c.startswith(SOURCE_ROOTS) and c not in tests and Path(c).suffix in {".ts", ".js", ".svelte", ".py"}}
    if kind in {"feature", "fix"} and sources and not tests:
        failures.append("source files changed but no test did: a feature or fix comes with its tests")
    if kind == "refactor" and tests and str(meta.get("tests_may_change", "false")) != "true":
        failures.append("a refactor must not change tests: " + ", ".join(sorted(tests)))

    if run_gates:
        component = str(meta["component"])
        try:
            gate = subprocess.run(["make", "-s", "check", f"COMPONENT={component}"], cwd=root, capture_output=True, text=True, timeout=1500, check=False)
            if gate.returncode != 0:
                tail = "\n".join((gate.stdout + gate.stderr).strip().splitlines()[-40:])
                failures.append(f"gate 'make check COMPONENT={component}' failed:\n{tail}")
        except (OSError, subprocess.SubprocessError) as exc:
            failures.append(f"gate 'make check COMPONENT={component}' is unavailable ({exc}). Unavailable is not a pass.")
    return failures


# ---------- reviews ----------

VERDICTS = {"approved", "changes_requested", "rejected"}
SEVERITIES = {"must_fix", "should_fix", "suggestion"}
GATE_STATUS = {"pass", "fail", "unavailable", "not_run", "not_applicable"}


def review_errors(data: object) -> list[str]:
    if not isinstance(data, dict) or not isinstance(data.get("review"), dict):
        return ["the file must hold one object with a 'review' key"]
    review = data["review"]
    errors: list[str] = []
    if review.get("schema_version") != 1:
        errors.append("schema_version must be 1")
    if not re.fullmatch(r"T-\d{4}", str(review.get("task", ""))):
        errors.append("task must be a task id such as T-0003")
    if not re.fullmatch(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ", str(review.get("reviewed_at", ""))):
        errors.append("reviewed_at must be an ISO 8601 UTC timestamp")
    if not review.get("commit"):
        errors.append("commit is missing")
    if review.get("reviewer") not in REVIEWERS:
        errors.append(f"reviewer must be one of {sorted(REVIEWERS)}")
    verdict = review.get("verdict")
    if verdict not in VERDICTS:
        errors.append(f"verdict must be one of {sorted(VERDICTS)}")
    gates = review.get("gates")
    blocked = False
    if not isinstance(gates, dict) or not gates:
        errors.append("gates must record at least one gate")
    else:
        for name, gate in gates.items():
            if not isinstance(gate, dict) or gate.get("status") not in GATE_STATUS or not gate.get("evidence"):
                errors.append(f"gate '{name}' needs a status from {sorted(GATE_STATUS)} and evidence")
            elif gate["status"] in {"fail", "unavailable"}:
                blocked = True
    findings = review.get("findings")
    counts = dict.fromkeys(SEVERITIES, 0)
    if not isinstance(findings, list):
        errors.append("findings must be a list (use [] for none)")
    else:
        for index, finding in enumerate(findings, start=1):
            label = f"finding {index}"
            if not isinstance(finding, dict):
                errors.append(f"{label} must be an object")
                continue
            for field in ("id", "path", "line", "severity", "verification", "rule", "what", "fix"):
                if finding.get(field) in (None, ""):
                    errors.append(f"{label}: '{field}' is missing")
            severity = finding.get("severity")
            if severity not in SEVERITIES:
                errors.append(f"{label}: severity must be one of {sorted(SEVERITIES)}")
            else:
                counts[severity] += 1
                if severity != "suggestion" and finding.get("rule") == "suggestion":
                    errors.append(f"{label}: a {severity} finding must cite a rule")
            if finding.get("verification") not in {"verified", "unverified"}:
                errors.append(f"{label}: verification must be verified or unverified")
    summary = review.get("summary")
    if not isinstance(summary, dict) or any(summary.get(s) != counts[s] for s in SEVERITIES):
        errors.append(f"summary must match the findings: {counts}")
    if verdict == "approved" and (counts["must_fix"] or blocked):
        errors.append("verdict can't be approved with a must_fix finding or a failed or unavailable gate")
    if verdict != "rejected" and blocked:
        errors.append("a failed or unavailable gate makes the verdict rejected")
    return errors


def review_file_errors(path: Path) -> list[str]:
    try:
        return review_errors(json.loads(path.read_text(encoding="utf-8")))
    except (OSError, ValueError) as exc:
        return [f"{path.name} can't be read as JSON ({exc})"]


# ---------- audit trail ----------

AUDIT_LOG = "audit.jsonl"
EVIDENCE_LIMIT = 60000  # a GitHub comment holds 65,536 characters


def _now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def shared_root(root: Path) -> Path:
    """The main checkout, so that every worktree writes to one audit trail."""
    code, out = _git(root, "rev-parse", "--path-format=absolute", "--git-common-dir")
    common = Path(out.strip()) if code == 0 and out.strip() else None
    return common.parent if common is not None and common.name == ".git" else root


def _active_task(root: Path) -> str:
    try:
        text = (root / ".sdlc" / "active-task").read_text(encoding="utf-8").strip()
    except OSError:
        return ""
    return text if re.fullmatch(r"T-\d{4}", text) else ""


def audit(root: Path | None, **fields: object) -> None:
    """Append one decision to .sdlc/audit.jsonl. A log that can't be written never changes the decision."""
    if root is None:
        return
    record = {"at": _now(), "task": _active_task(root), **fields}
    try:
        folder = shared_root(root) / ".sdlc"
        folder.mkdir(exist_ok=True)
        with (folder / AUDIT_LOG).open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(record, sort_keys=True) + "\n")
    except (OSError, subprocess.SubprocessError) as exc:
        print(f"SDLC kit: the audit log could not be written ({exc})", file=sys.stderr)


def keep_review(root: Path, path: Path) -> None:
    """Copy a valid review file to the main checkout, so it outlives the agent's worktree."""
    target = shared_root(root) / ".sdlc" / "reviews" / path.name
    if target.resolve() != path.resolve():
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, target)


def _cell(value: object) -> str:
    return str(value).replace("|", "\\|").replace("\n", " ")


def evidence(root: Path, task_id: str) -> str:
    """The kit's records for one task, as Markdown for a pull request comment."""
    shared = shared_root(root) / ".sdlc"
    records: list[dict[str, object]] = []
    try:
        for line in (shared / AUDIT_LOG).read_text(encoding="utf-8").splitlines():
            try:
                record = json.loads(line)
            except ValueError:
                continue
            if isinstance(record, dict) and record.get("task") == task_id:
                records.append(record)
    except OSError:
        pass
    out = [f"## Delivery evidence for {task_id}", "", f"Written by `bin/sdlc evidence` at {_now()} from the kit's own records. The review files and the run log are an agent's words. Everything else is a program's."]

    tools = [r for r in records if r.get("event") == "PreToolUse"]
    counts = {verdict: sum(1 for r in tools if r.get("verdict") == verdict) for verdict in ("allow", "ask", "deny")}
    out += ["", "### Kit decisions on tool calls", "", f"Allowed {counts['allow']}, asked the tech lead {counts['ask']}, refused {counts['deny']}."]
    stopped = [r for r in tools if r.get("verdict") in {"ask", "deny"}]
    if stopped:
        out += ["", "| At | Agent | Tool | Verdict | Reason |", "|---|---|---|---|---|"]
        # A shell command is never printed here: it can hold a secret, and this goes on a public page.
        out += [f"| {_cell(r.get('at'))} | {_cell(r.get('agent'))} | {_cell(r.get('tool'))} | {_cell(r.get('verdict'))} | {_cell(r.get('reason'))} |" for r in stopped]

    checks = [r for r in records if r.get("event") in {"SubagentStop", "verify", "review-check", "merge-check"}]
    out += ["", "### Checks", ""]
    if checks:
        out += ["| At | Check | Agent | Result | Detail |", "|---|---|---|---|---|"]
        out += [f"| {_cell(r.get('at'))} | {_cell(r.get('event'))} | {_cell(r.get('agent'))} | {_cell(r.get('verdict'))} | {_cell(r.get('reason', ''))[:500]} |" for r in checks]
    else:
        out.append("No check is recorded for this task.")

    out += ["", "### Review files", ""]
    blocks: list[tuple[int, str]] = []
    reviews = sorted((shared / "reviews").glob(f"{task_id}.*.json"))
    for path in reviews:
        errors = review_file_errors(path)
        text = path.read_text(encoding="utf-8").strip()
        state = "valid" if not errors else "NOT VALID: " + "; ".join(errors)
        out += [f"<details><summary><code>{path.name}</code> ({state})</summary>", "", "```json", text, "```", "", "</details>", ""]
        blocks.append((len(out) - 5, text))
    if not reviews:
        out.append("No review file is recorded for this task.")

    out += ["", "### Run log", ""]
    try:
        lines = [line for line in (shared / "run-log.md").read_text(encoding="utf-8").splitlines() if task_id in line]
    except OSError:
        lines = []
    out += lines or ["No run log line names this task."]

    for index, text in blocks:  # too long for one comment: drop the review bodies, largest loss last
        if len("\n".join(out)) <= EVIDENCE_LIMIT:
            break
        out[index] = f"(left out: {len(text)} characters is too long for one comment. The file is in .sdlc/reviews/ on the lead's machine.)"
    return "\n".join(out) + "\n"


def merge_errors(root: Path, task_id: str) -> list[str]:
    """Why the lead may not merge this task's pull request without the tech lead. Empty means it may."""
    shared = shared_root(root) / ".sdlc"
    errors: list[str] = []
    reviews = sorted((shared / "reviews").glob(f"{task_id}.*.json"))
    if not any(path.name == f"{task_id}.reviewer.json" for path in reviews):
        errors.append("no kept review file from the reviewer: run sdlc review-check on it first")
    for path in reviews:
        problems = review_file_errors(path)
        if problems:
            errors.append(f"{path.name} is not valid: " + "; ".join(problems))
            continue
        review = json.loads(path.read_text(encoding="utf-8"))["review"]
        if review["verdict"] != "approved":
            errors.append(f"{path.name}: the verdict is {review['verdict']}")
        if review["summary"]["must_fix"]:
            errors.append(f"{path.name}: {review['summary']['must_fix']} must_fix finding(s) are open")
    checks: list[dict[str, object]] = []
    try:
        for line in (shared / AUDIT_LOG).read_text(encoding="utf-8").splitlines():
            record = json.loads(line)
            if record.get("task") == task_id and record.get("event") == "verify":
                checks.append(record)
    except (OSError, ValueError):
        pass
    if not checks:
        errors.append("no sdlc verify run is recorded for this task")
    elif checks[-1].get("verdict") != "pass" or checks[-1].get("reason"):
        errors.append("the last sdlc verify run for this task did not pass with its gates")
    return errors


# ---------- hook events ----------


def _refuse(reason: str) -> int:
    print(REFUSED + reason, file=sys.stderr)
    return 2


def hook_pre(event: dict[str, object]) -> int:
    agent = event.get("agent_type") if isinstance(event.get("agent_type"), str) else None
    tool = event.get("tool_name")
    tool_input = event.get("tool_input") if isinstance(event.get("tool_input"), dict) else {}
    cwd = Path(str(event.get("cwd") or os.getcwd()))
    decision: Decision | None = None
    target = ""
    if tool == "Bash":
        target = str(tool_input.get("command", ""))  # type: ignore[union-attr]
        decision = check_command(target, agent, event)
    elif tool in {"Write", "Edit", "MultiEdit", "NotebookEdit"}:
        target = str(tool_input.get("file_path") or tool_input.get("notebook_path") or "")  # type: ignore[union-attr]
        decision = check_write(cwd / target, agent, event) if target else ("deny", "the write has no file path")
    verdict, reason = decision or ("allow", "")
    audit(find_root(cwd / "AGENTS.md"), event="PreToolUse", agent=agent or "lead", tool=tool, target=target[:300], verdict=verdict, reason=reason)
    if verdict == "deny":
        return _refuse(reason)
    if verdict == "ask":
        print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "ask", "permissionDecisionReason": "SDLC kit: " + reason}}))
    return 0


def hook_post(event: dict[str, object]) -> int:
    """Format and lint the file an agent just wrote, with the repository's own tools."""
    tool_input = event.get("tool_input") if isinstance(event.get("tool_input"), dict) else {}
    raw = tool_input.get("file_path")  # type: ignore[union-attr]
    if not raw:
        return 0
    target = Path(os.path.abspath(Path(str(event.get("cwd") or os.getcwd())) / str(raw)))
    root = find_root(target)
    if root is None or not target.is_file():
        return 0
    commands: list[tuple[list[str], Path]] = []
    suffix = target.suffix
    bin_dir = root / "node_modules" / ".bin"
    if suffix in {".ts", ".js", ".mjs", ".svelte", ".json", ".jsonc", ".css", ".html", ".md", ".yaml", ".yml"} and (bin_dir / "prettier").exists():
        commands.append(([str(bin_dir / "prettier"), "--write", "--log-level", "warn", str(target)], root))
        if suffix in {".ts", ".js", ".mjs", ".svelte"} and (bin_dir / "eslint").exists():
            commands.append(([str(bin_dir / "eslint"), "--no-warn-ignored", str(target)], root))
    if suffix == ".py" and shutil.which("uv"):
        project = next((p for p in [target.parent, *target.parents] if (p / "pyproject.toml").is_file()), None)
        if project is not None and (project / "uv.lock").is_file():
            commands.append((["uv", "run", "--frozen", "ruff", "format", str(target)], project))
            commands.append((["uv", "run", "--frozen", "ruff", "check", str(target)], project))
    problems: list[str] = []
    for command, cwd in commands:
        result = subprocess.run(command, cwd=cwd, capture_output=True, text=True, timeout=120, check=False)
        if result.returncode != 0:
            problems.append((result.stdout + result.stderr).strip())
    if problems:
        print("The file was saved, and these checks failed on it:\n" + "\n".join(problems), file=sys.stderr)
        return 2
    return 0


def hook_subagent_stop(event: dict[str, object]) -> int:
    agent = event.get("agent_type")
    if agent not in IMPLEMENTERS | REVIEWERS:
        return 0  # not one of ours
    start = Path(str(event.get("cwd") or os.getcwd()))
    root = find_root(start / "AGENTS.md") or start
    if event.get("stop_hook_active"):  # sent back once already (ADR 0004 D5)
        audit(root, event="SubagentStop", agent=agent, verdict="not_checked", reason="second stop after being sent back once")
        return 0
    if agent in IMPLEMENTERS:
        failures = verify(root)
    else:
        recent = [p for p in (root / ".sdlc" / "reviews").glob("*.json") if time.time() - p.stat().st_mtime < 7200]
        if not recent:
            failures = ["no review file was written under .sdlc/reviews/ (pr-review skill, 'Required output')"]
        else:
            latest = max(recent, key=lambda p: p.stat().st_mtime)
            failures = review_file_errors(latest)
            if not failures:
                keep_review(root, latest)
    audit(root, event="SubagentStop", agent=agent, verdict="sent_back" if failures else "pass", reason="; ".join(failures))
    if failures:
        return _refuse("the work is not finished.\n- " + "\n- ".join(failures))
    return 0


def run_hook() -> int:
    name = ""
    try:
        event = json.loads(sys.stdin.read())
        name = str(event.get("hook_event_name", ""))
        if name == "PreToolUse":
            return hook_pre(event)
        if name == "PostToolUse":
            return hook_post(event)
        if name == "SubagentStop":
            return hook_subagent_stop(event)
        return 0
    except Exception as exc:  # a broken check refuses (ADR 0004 D6); a post hook can't block anyway
        if name == "PostToolUse":
            print(f"SDLC kit: the format hook failed ({exc})", file=sys.stderr)
            return 1
        return _refuse(f"the hook itself failed ({type(exc).__name__}: {exc}). Tell the tech lead.")


# ---------- command line ----------

USAGE = """usage: sdlc <command>
  hook                 read one Claude Code hook event on stdin
  task-check FILE...   validate task briefs
  verify [--no-gates]  check the working tree against the active task
  review-check FILE    validate a review file and keep a copy in the main checkout
  evidence TASK-ID     print the kit's records for one task, for the pull request
  merge-check TASK-ID  say whether the lead may merge the task's pull request
  commit-msg FILE      check a commit message (Conventional Commits)
  changes BASE [HEAD]  print name=true|false for each CI gate a diff needs
"""


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(USAGE, file=sys.stderr)
        return 64
    command, args = argv[1], argv[2:]
    if command == "hook":
        return run_hook()
    if command == "task-check":
        status = 0
        for name in args:
            _, errors = load_brief(Path(name))
            for error in errors:
                print(f"{name}: {error}", file=sys.stderr)
                status = 1
        return status
    if command == "verify":
        root = find_root(Path.cwd() / "AGENTS.md")
        if root is None:
            print("verify: run this inside the repository", file=sys.stderr)
            return 1
        gates = "--no-gates" not in args
        failures = verify(root, run_gates=gates)
        audit(root, event="verify", agent="command line", verdict="fail" if failures else "pass", reason="; ".join(failures) or ("" if gates else "gates not run"))
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        print("verify: " + ("failed" if failures else "passed"))
        return 1 if failures else 0
    if command == "review-check" and len(args) == 1:
        path = Path(args[0])
        errors = review_file_errors(path)
        root = find_root(Path.cwd() / "AGENTS.md")
        if root is not None:
            if not errors:
                keep_review(root, path)
            audit(root, event="review-check", agent="command line", verdict="fail" if errors else "pass", reason=path.name + (": " + "; ".join(errors) if errors else ""), task=path.name.split(".")[0])
        for error in errors:
            print(f"{args[0]}: {error}", file=sys.stderr)
        return 1 if errors else 0
    if command == "evidence" and len(args) == 1 and re.fullmatch(r"T-\d{4}", args[0]):
        root = find_root(Path.cwd() / "AGENTS.md")
        if root is None:
            print("evidence: run this inside the repository", file=sys.stderr)
            return 1
        sys.stdout.write(evidence(root, args[0]))
        return 0
    if command == "merge-check" and len(args) == 1 and re.fullmatch(r"T-\d{4}", args[0]):
        root = find_root(Path.cwd() / "AGENTS.md")
        if root is None:
            print("merge-check: run this inside the repository", file=sys.stderr)
            return 1
        errors = merge_errors(root, args[0])
        audit(root, event="merge-check", agent="command line", verdict="fail" if errors else "pass", reason="; ".join(errors), task=args[0])
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        print("merge-check: " + ("the tech lead must merge this one" if errors else "the lead may merge"))
        return 1 if errors else 0
    if command == "changes" and len(args) in (1, 2):
        root = find_root(Path.cwd() / "AGENTS.md")
        paths = changed_paths(root, *args) if root is not None else None
        # If git can't say what changed, every gate runs.
        needed = EVERY_COMPONENT if paths is None else components_for(paths)
        for name in CI_COMPONENTS:
            print(f"{name}={'true' if name in needed else 'false'}")
        return 0
    if command == "commit-msg" and len(args) == 1:
        subject = next((line for line in Path(args[0]).read_text(encoding="utf-8").splitlines() if line.strip() and not line.startswith("#")), "")
        if subject.startswith(("Merge ", "Revert ")) or COMMIT_RE.match(subject):
            return 0
        print(f"commit message: '{subject}' is not a Conventional Commit. Use 'type(scope): summary' in 72 characters or fewer, for example 'feat(game): add the jumbo pack'.", file=sys.stderr)
        return 1
    print(USAGE, file=sys.stderr)
    return 64


if __name__ == "__main__":
    sys.exit(main(sys.argv))
