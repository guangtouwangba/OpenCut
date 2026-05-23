# cli-anything-opencut

`cli-anything-opencut` is a thin cli-anything wrapper around the repo-local
OpenCut Bun harness. It gives agents a stable command surface while OpenCut's
browser renderer and future headless backend mature.

## Install

From the OpenCut repository root:

```bash
cd agent-harness
pip install -e .
```

The package requires `bun` because it delegates project mutations to
`packages/opencut-agent/src/cli.ts`.

If installed outside this repository, set:

```bash
export OPENCUT_REPO_ROOT=/path/to/OpenCut
```

## Usage

```bash
cli-anything-opencut --json project new --name Demo -o demo.opencut.json
cli-anything-opencut --json timeline add-text -p demo.opencut.json --text "Hello" --start 0 --duration 3
cli-anything-opencut --json project validate -p demo.opencut.json
```

Mutations auto-save to `--project` unless `--out` is provided. Add `--dry-run`
to mutation commands to preview the result without saving.

## Current Scope

- Create OpenCut v31 project JSON.
- Inspect and validate project structure.
- Add, split, move, and delete text elements on the timeline.
- Return machine-readable JSON for agent use.

Rendering/export is intentionally not exposed yet. The next backend should call
the live web editor through a guarded Playwright bridge and validate exported
media.
