from __future__ import annotations

import json
import os
from pathlib import Path

import pytest

from cli_anything.opencut.core.backend import OpenCutBackendError, resolve_repo_root
from cli_anything.opencut.core.project import (
    add_text,
    inspect_project,
    new_project,
    validate_project,
)


REPO_ROOT = Path(__file__).resolve().parents[4]


def test_resolve_repo_root_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENCUT_REPO_ROOT", str(REPO_ROOT))
    assert resolve_repo_root() == REPO_ROOT


def test_project_workflow(tmp_path: Path) -> None:
    project_path = tmp_path / "demo.opencut.json"
    created = new_project(out=str(project_path), name="Harness Demo")
    assert created["ok"] is True

    added = add_text(
        project=str(project_path),
        text="Hello from cli-anything",
        start=0,
        duration=2,
    )
    assert added["ok"] is True
    assert added["elementId"]

    inspected = inspect_project(project=str(project_path))
    assert inspected["summary"]["durationSeconds"] == 2
    assert inspected["summary"]["elements"][0]["type"] == "text"

    validated = validate_project(project=str(project_path))
    assert validated["ok"] is True


def test_dry_run_does_not_modify_original(tmp_path: Path) -> None:
    project_path = tmp_path / "demo.opencut.json"
    new_project(out=str(project_path), name="Dry Run Demo")
    before = json.loads(project_path.read_text())

    result = add_text(
        project=str(project_path),
        text="Preview only",
        start=0,
        duration=3,
        dry_run=True,
    )

    after = json.loads(project_path.read_text())
    assert result["ok"] is True
    assert result["dryRun"] is True
    assert before == after


def test_validate_missing_project_fails(tmp_path: Path) -> None:
    missing = tmp_path / "missing.opencut.json"
    with pytest.raises(OpenCutBackendError):
        validate_project(project=str(missing))
