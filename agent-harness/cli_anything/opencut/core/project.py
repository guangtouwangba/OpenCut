from __future__ import annotations

import shutil
import tempfile
from pathlib import Path
from typing import Any

from cli_anything.opencut.core.backend import run_opencut


def new_project(
    *,
    out: str,
    name: str,
    width: int = 1920,
    height: int = 1080,
    fps: int = 30,
    background: str = "#000000",
    repo_root: str | None = None,
) -> dict[str, Any]:
    return run_opencut(
        [
            "new",
            "--name",
            name,
            "--out",
            out,
            "--width",
            str(width),
            "--height",
            str(height),
            "--fps",
            str(fps),
            "--background",
            background,
        ],
        repo_root=repo_root,
    )


def inspect_project(*, project: str, repo_root: str | None = None) -> dict[str, Any]:
    return run_opencut(["inspect", "--project", project], repo_root=repo_root)


def validate_project(*, project: str, repo_root: str | None = None) -> dict[str, Any]:
    return run_opencut(["validate", "--project", project], repo_root=repo_root)


def add_text(
    *,
    project: str,
    text: str,
    start: float,
    duration: float,
    name: str | None = None,
    track_id: str | None = None,
    font_size: int = 72,
    color: str = "#ffffff",
    out: str | None = None,
    dry_run: bool = False,
    repo_root: str | None = None,
) -> dict[str, Any]:
    args = [
        "add-text",
        "--project",
        "{project}",
        "--text",
        text,
        "--start",
        str(start),
        "--duration",
        str(duration),
        "--font-size",
        str(font_size),
        "--color",
        color,
    ]
    if name:
        args.extend(["--name", name])
    if track_id:
        args.extend(["--track-id", track_id])
    return _run_mutation(
        args,
        project=project,
        out=out,
        dry_run=dry_run,
        repo_root=repo_root,
    )


def split_element(
    *,
    project: str,
    element_id: str,
    time: float,
    out: str | None = None,
    dry_run: bool = False,
    repo_root: str | None = None,
) -> dict[str, Any]:
    return _run_mutation(
        [
            "split",
            "--project",
            "{project}",
            "--element-id",
            element_id,
            "--time",
            str(time),
        ],
        project=project,
        out=out,
        dry_run=dry_run,
        repo_root=repo_root,
    )


def move_element(
    *,
    project: str,
    element_id: str,
    start: float,
    out: str | None = None,
    dry_run: bool = False,
    repo_root: str | None = None,
) -> dict[str, Any]:
    return _run_mutation(
        [
            "move",
            "--project",
            "{project}",
            "--element-id",
            element_id,
            "--start",
            str(start),
        ],
        project=project,
        out=out,
        dry_run=dry_run,
        repo_root=repo_root,
    )


def delete_element(
    *,
    project: str,
    element_id: str,
    out: str | None = None,
    dry_run: bool = False,
    repo_root: str | None = None,
) -> dict[str, Any]:
    return _run_mutation(
        [
            "delete",
            "--project",
            "{project}",
            "--element-id",
            element_id,
        ],
        project=project,
        out=out,
        dry_run=dry_run,
        repo_root=repo_root,
    )


def _run_mutation(
    args: list[str],
    *,
    project: str,
    out: str | None,
    dry_run: bool,
    repo_root: str | None,
) -> dict[str, Any]:
    if dry_run:
        with tempfile.TemporaryDirectory(prefix="opencut-dry-run-") as tmp:
            tmp_project = str(Path(tmp) / "project.opencut.json")
            shutil.copyfile(project, tmp_project)
            dry_args = [tmp_project if part == "{project}" else part for part in args]
            result = run_opencut(dry_args, repo_root=repo_root)
            result["dryRun"] = True
            result["project"] = project
            result["wouldWrite"] = out or project
            return result

    real_args = [project if part == "{project}" else part for part in args]
    if out:
        real_args.extend(["--out", out])
    result = run_opencut(real_args, repo_root=repo_root)
    result["dryRun"] = False
    return result
