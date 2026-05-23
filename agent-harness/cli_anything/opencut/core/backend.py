from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path
from typing import Any


class OpenCutBackendError(RuntimeError):
    """Raised when the repo-local OpenCut backend cannot complete a command."""


def resolve_repo_root(repo_root: str | None = None) -> Path:
    """Find the OpenCut repository root that contains the Bun harness."""
    if repo_root:
        root = Path(repo_root).expanduser().resolve()
    elif os.environ.get("OPENCUT_REPO_ROOT"):
        root = Path(os.environ["OPENCUT_REPO_ROOT"]).expanduser().resolve()
    else:
        root = _discover_repo_root()

    cli_path = root / "packages" / "opencut-agent" / "src" / "cli.ts"
    if not cli_path.is_file():
        raise OpenCutBackendError(
            f"OpenCut Bun harness not found at {cli_path}. "
            "Set OPENCUT_REPO_ROOT to your OpenCut clone."
        )
    return root


def run_opencut(
    args: list[str],
    *,
    repo_root: str | None = None,
) -> dict[str, Any]:
    """Run the repo-local Bun OpenCut CLI and return its JSON payload."""
    root = resolve_repo_root(repo_root)
    bun = shutil.which("bun")
    if not bun:
        raise OpenCutBackendError(
            "bun is required to drive OpenCut. Install Bun from https://bun.sh/."
        )

    command = [bun, "packages/opencut-agent/src/cli.ts", *args]
    completed = subprocess.run(
        command,
        cwd=root,
        capture_output=True,
        text=True,
        check=False,
    )
    if completed.returncode != 0:
        detail = completed.stderr.strip() or completed.stdout.strip()
        raise OpenCutBackendError(
            f"OpenCut backend command failed ({completed.returncode}): {detail}"
        )
    return _parse_json_payload(completed.stdout)


def _discover_repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        candidate = parent / "packages" / "opencut-agent" / "src" / "cli.ts"
        if candidate.is_file():
            return parent
    raise OpenCutBackendError(
        "Could not discover the OpenCut repository root. "
        "Run from the OpenCut clone or set OPENCUT_REPO_ROOT."
    )


def _parse_json_payload(stdout: str) -> dict[str, Any]:
    text = stdout.strip()
    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start < 0 or end < start:
            raise OpenCutBackendError(f"Backend did not return JSON: {stdout}")
        payload = json.loads(text[start : end + 1])

    if not isinstance(payload, dict):
        raise OpenCutBackendError("Backend JSON payload must be an object")
    return payload
