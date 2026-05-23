from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path


def _resolve_cli(name: str) -> list[str]:
    """Resolve installed CLI command; fall back to python -m for dev."""
    force = os.environ.get("CLI_ANYTHING_FORCE_INSTALLED", "").strip() == "1"
    path = shutil.which(name)
    if path:
        print(f"[_resolve_cli] Using installed command: {path}")
        return [path]
    if force:
        raise RuntimeError(f"{name} not found in PATH. Install with: pip install -e .")
    module = name.replace("cli-anything-", "cli_anything.") + "." + name.split("-")[-1] + "_cli"
    print(f"[_resolve_cli] Falling back to: {sys.executable} -m {module}")
    return [sys.executable, "-m", module]


class TestCLISubprocess:
    CLI_BASE = _resolve_cli("cli-anything-opencut")

    def _run(self, args: list[str], check: bool = True) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            self.CLI_BASE + args,
            capture_output=True,
            text=True,
            check=check,
        )

    def test_help(self) -> None:
        result = self._run(["--help"])
        assert "cli-anything harness for OpenCut" in result.stdout

    def test_project_new_validate_json(self, tmp_path: Path) -> None:
        project_path = tmp_path / "subprocess.opencut.json"
        created = self._run(
            [
                "--json",
                "project",
                "new",
                "--name",
                "Subprocess Demo",
                "-o",
                str(project_path),
            ]
        )
        created_payload = json.loads(created.stdout)
        assert created_payload["ok"] is True
        assert project_path.exists()

        validated = self._run(["--json", "project", "validate", "-p", str(project_path)])
        validated_payload = json.loads(validated.stdout)
        assert validated_payload["ok"] is True

    def test_full_text_workflow(self, tmp_path: Path) -> None:
        project_path = tmp_path / "workflow.opencut.json"
        self._run(["--json", "project", "new", "--name", "Workflow", "-o", str(project_path)])

        added = self._run(
            [
                "--json",
                "timeline",
                "add-text",
                "-p",
                str(project_path),
                "--text",
                "CLI workflow",
                "--start",
                "0",
                "--duration",
                "2.5",
            ]
        )
        added_payload = json.loads(added.stdout)
        assert added_payload["ok"] is True
        assert added_payload["elementId"]

        inspected = self._run(["--json", "project", "inspect", "-p", str(project_path)])
        inspected_payload = json.loads(inspected.stdout)
        assert inspected_payload["summary"]["durationSeconds"] == 2.5
        assert len(inspected_payload["summary"]["elements"]) == 1
