---
name: cli-anything-opencut
description: Control OpenCut project JSON from Codex or other agents using a cli-anything command surface.
---

# cli-anything-opencut

Use this skill when you need Codex to create, inspect, mutate, or validate an
OpenCut project from the command line.

## Prerequisites

- Run from an OpenCut clone that contains `packages/opencut-agent/src/cli.ts`, or
  set `OPENCUT_REPO_ROOT=/path/to/OpenCut`.
- Install the harness:

```bash
cd /path/to/OpenCut/agent-harness
pip install -e .
```

## Agent Rules

- Prefer `--json` for every command so output is machine-readable.
- Run `project inspect` before mutating unfamiliar files.
- Run `project validate` after mutations.
- Use `--dry-run` before destructive timeline changes when you are unsure.
- This harness currently edits project JSON only; it does not render/export video.

## Commands

```bash
cli-anything-opencut --json project new --name Demo -o demo.opencut.json
cli-anything-opencut --json project inspect -p demo.opencut.json
cli-anything-opencut --json project validate -p demo.opencut.json

cli-anything-opencut --json timeline add-text -p demo.opencut.json --text "Hello" --start 0 --duration 3
cli-anything-opencut --json timeline split -p demo.opencut.json --element-id <id> --time 1.5
cli-anything-opencut --json timeline move -p demo.opencut.json --element-id <id> --start 2
cli-anything-opencut --json timeline delete -p demo.opencut.json --element-id <id>
```

## Output Contract

Successful JSON output contains:

- `ok`: boolean
- `command`: backend command name
- `project`: project path
- `errors`: validation errors, usually an empty array
- `summary`: project id, name, version, duration, tracks, and elements

Mutation commands may also return ids such as `elementId`, `trackId`, or
`rightElementId`.
