from __future__ import annotations

import json
import shlex
from typing import Any

import click

from cli_anything.opencut import __version__
from cli_anything.opencut.core.backend import OpenCutBackendError
from cli_anything.opencut.core.project import (
    add_text,
    delete_element,
    inspect_project,
    move_element,
    new_project,
    split_element,
    validate_project,
)
from cli_anything.opencut.utils.repl_skin import ReplSkin


CONTEXT_SETTINGS = {"help_option_names": ["-h", "--help"]}


@click.group(invoke_without_command=True, context_settings=CONTEXT_SETTINGS)
@click.option("--repo-root", type=click.Path(file_okay=False, dir_okay=True))
@click.option("--json", "json_output", is_flag=True, help="Emit machine-readable JSON.")
@click.pass_context
def main(ctx: click.Context, repo_root: str | None, json_output: bool) -> None:
    """cli-anything harness for OpenCut."""
    ctx.ensure_object(dict)
    ctx.obj["repo_root"] = repo_root
    ctx.obj["json_output"] = json_output
    if ctx.invoked_subcommand is None:
        ctx.invoke(repl)


@main.group()
def project() -> None:
    """Project creation, inspection, and validation."""


@main.group()
def timeline() -> None:
    """Timeline edit operations."""


@project.command("new")
@click.option("-o", "--out", required=True, type=click.Path(dir_okay=False))
@click.option("--name", default="OpenCut Project", show_default=True)
@click.option("--width", default=1920, show_default=True, type=int)
@click.option("--height", default=1080, show_default=True, type=int)
@click.option("--fps", default=30, show_default=True, type=int)
@click.option("--background", default="#000000", show_default=True)
@click.option("--json", "json_flag", is_flag=True, help="Emit machine-readable JSON.")
@click.pass_context
def project_new(
    ctx: click.Context,
    out: str,
    name: str,
    width: int,
    height: int,
    fps: int,
    background: str,
    json_flag: bool,
) -> None:
    _set_json(ctx, json_flag)
    _emit(
        ctx,
        new_project(
            out=out,
            name=name,
            width=width,
            height=height,
            fps=fps,
            background=background,
            repo_root=_repo_root(ctx),
        ),
    )


@project.command("inspect")
@click.option("-p", "--project", "project_path", required=True, type=click.Path(exists=True, dir_okay=False))
@click.option("--json", "json_flag", is_flag=True, help="Emit machine-readable JSON.")
@click.pass_context
def project_inspect(ctx: click.Context, project_path: str, json_flag: bool) -> None:
    _set_json(ctx, json_flag)
    _emit(ctx, inspect_project(project=project_path, repo_root=_repo_root(ctx)))


@project.command("validate")
@click.option("-p", "--project", "project_path", required=True, type=click.Path(exists=True, dir_okay=False))
@click.option("--json", "json_flag", is_flag=True, help="Emit machine-readable JSON.")
@click.pass_context
def project_validate(ctx: click.Context, project_path: str, json_flag: bool) -> None:
    _set_json(ctx, json_flag)
    result = validate_project(project=project_path, repo_root=_repo_root(ctx))
    _emit(ctx, result)
    if not result.get("ok"):
        raise click.exceptions.Exit(1)


@timeline.command("add-text")
@click.option("-p", "--project", "project_path", required=True, type=click.Path(exists=True, dir_okay=False))
@click.option("--text", required=True)
@click.option("--start", default=0.0, show_default=True, type=float)
@click.option("--duration", default=5.0, show_default=True, type=float)
@click.option("--name")
@click.option("--track-id")
@click.option("--font-size", default=72, show_default=True, type=int)
@click.option("--color", default="#ffffff", show_default=True)
@click.option("-o", "--out", type=click.Path(dir_okay=False))
@click.option("--dry-run", is_flag=True, help="Preview mutation without saving.")
@click.option("--json", "json_flag", is_flag=True, help="Emit machine-readable JSON.")
@click.pass_context
def timeline_add_text(
    ctx: click.Context,
    project_path: str,
    text: str,
    start: float,
    duration: float,
    name: str | None,
    track_id: str | None,
    font_size: int,
    color: str,
    out: str | None,
    dry_run: bool,
    json_flag: bool,
) -> None:
    _set_json(ctx, json_flag)
    _emit(
        ctx,
        add_text(
            project=project_path,
            text=text,
            start=start,
            duration=duration,
            name=name,
            track_id=track_id,
            font_size=font_size,
            color=color,
            out=out,
            dry_run=dry_run,
            repo_root=_repo_root(ctx),
        ),
    )


@timeline.command("split")
@click.option("-p", "--project", "project_path", required=True, type=click.Path(exists=True, dir_okay=False))
@click.option("--element-id", required=True)
@click.option("--time", "split_time", required=True, type=float)
@click.option("-o", "--out", type=click.Path(dir_okay=False))
@click.option("--dry-run", is_flag=True, help="Preview mutation without saving.")
@click.option("--json", "json_flag", is_flag=True, help="Emit machine-readable JSON.")
@click.pass_context
def timeline_split(
    ctx: click.Context,
    project_path: str,
    element_id: str,
    split_time: float,
    out: str | None,
    dry_run: bool,
    json_flag: bool,
) -> None:
    _set_json(ctx, json_flag)
    _emit(
        ctx,
        split_element(
            project=project_path,
            element_id=element_id,
            time=split_time,
            out=out,
            dry_run=dry_run,
            repo_root=_repo_root(ctx),
        ),
    )


@timeline.command("move")
@click.option("-p", "--project", "project_path", required=True, type=click.Path(exists=True, dir_okay=False))
@click.option("--element-id", required=True)
@click.option("--start", required=True, type=float)
@click.option("-o", "--out", type=click.Path(dir_okay=False))
@click.option("--dry-run", is_flag=True, help="Preview mutation without saving.")
@click.option("--json", "json_flag", is_flag=True, help="Emit machine-readable JSON.")
@click.pass_context
def timeline_move(
    ctx: click.Context,
    project_path: str,
    element_id: str,
    start: float,
    out: str | None,
    dry_run: bool,
    json_flag: bool,
) -> None:
    _set_json(ctx, json_flag)
    _emit(
        ctx,
        move_element(
            project=project_path,
            element_id=element_id,
            start=start,
            out=out,
            dry_run=dry_run,
            repo_root=_repo_root(ctx),
        ),
    )


@timeline.command("delete")
@click.option("-p", "--project", "project_path", required=True, type=click.Path(exists=True, dir_okay=False))
@click.option("--element-id", required=True)
@click.option("-o", "--out", type=click.Path(dir_okay=False))
@click.option("--dry-run", is_flag=True, help="Preview mutation without saving.")
@click.option("--json", "json_flag", is_flag=True, help="Emit machine-readable JSON.")
@click.pass_context
def timeline_delete(
    ctx: click.Context,
    project_path: str,
    element_id: str,
    out: str | None,
    dry_run: bool,
    json_flag: bool,
) -> None:
    _set_json(ctx, json_flag)
    _emit(
        ctx,
        delete_element(
            project=project_path,
            element_id=element_id,
            out=out,
            dry_run=dry_run,
            repo_root=_repo_root(ctx),
        ),
    )


@main.command()
@click.pass_context
def repl(ctx: click.Context) -> None:
    """Start a lightweight OpenCut command REPL."""
    skin = ReplSkin("opencut", version=__version__)
    skin.print_banner()
    skin.info("Type 'help' for examples, 'exit' to quit.")

    while True:
        try:
            line = input("opencut> ").strip()
        except (EOFError, KeyboardInterrupt):
            click.echo()
            skin.print_goodbye()
            return

        if not line:
            continue
        if line in {"exit", "quit", ":q"}:
            skin.print_goodbye()
            return
        if line == "help":
            skin.status("Example", "project validate -p demo.json --json")
            skin.status("Example", "timeline add-text -p demo.json --text Hello --duration 3 --json")
            continue

        try:
            main.main(
                args=[*_global_args(ctx), *shlex.split(line)],
                prog_name="cli-anything-opencut",
                standalone_mode=False,
            )
        except OpenCutBackendError as error:
            skin.error(str(error))
        except click.ClickException as error:
            skin.error(error.format_message())
        except click.exceptions.Exit:
            continue


def _repo_root(ctx: click.Context) -> str | None:
    return ctx.obj.get("repo_root") if ctx.obj else None


def _set_json(ctx: click.Context, json_flag: bool) -> None:
    if json_flag:
        ctx.obj["json_output"] = True


def _emit(ctx: click.Context, result: dict[str, Any]) -> None:
    if ctx.obj.get("json_output"):
        click.echo(json.dumps(result, indent=2))
        return

    status = "ok" if result.get("ok") else "failed"
    summary = result.get("summary") if isinstance(result.get("summary"), dict) else {}
    project_name = summary.get("name", result.get("project", "project"))
    duration = summary.get("durationSeconds")
    click.echo(f"{status}: {project_name}")
    if duration is not None:
        click.echo(f"duration: {duration}s")
    if result.get("errors"):
        click.echo("errors:")
        for error in result["errors"]:
            click.echo(f"- {error}")


def _global_args(ctx: click.Context) -> list[str]:
    args: list[str] = []
    if ctx.obj.get("repo_root"):
        args.extend(["--repo-root", ctx.obj["repo_root"]])
    if ctx.obj.get("json_output"):
        args.append("--json")
    return args


def run_cli() -> None:
    try:
        main()
    except OpenCutBackendError as exc:
        raise click.ClickException(str(exc)) from exc


if __name__ == "__main__":
    run_cli()
