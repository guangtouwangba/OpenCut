# Codex Agent Harness

This repository is still browser-rendered, so the first Codex-callable layer is
a project JSON harness rather than a headless video exporter. It gives Codex a
stable command surface for basic edit operations and validation while the Rust
core and future headless/MCP surfaces mature.

## Commands

Run commands from the repository root:

```bash
bun run codex:opencut new --name Demo --out workspace/demo.opencut.json
bun run codex:opencut add-text --project workspace/demo.opencut.json --text "Hello" --start 0 --duration 3
bun run codex:opencut split --project workspace/demo.opencut.json --element-id <id> --time 1.5
bun run codex:opencut move --project workspace/demo.opencut.json --element-id <id> --start 2
bun run codex:opencut inspect --project workspace/demo.opencut.json
bun run codex:opencut validate --project workspace/demo.opencut.json
```

Every command writes JSON to stdout. Mutation commands update `--project` in
place unless `--out` is provided.

## cli-anything Wrapper

The formal cli-anything package lives in `agent-harness/` and installs the
`cli-anything-opencut` command:

```bash
cd agent-harness
pip install -e .

cli-anything-opencut --json project new --name Demo -o workspace/demo.opencut.json
cli-anything-opencut --json timeline add-text -p workspace/demo.opencut.json --text "Hello" --start 0 --duration 3
cli-anything-opencut --json project validate -p workspace/demo.opencut.json
```

The wrapper delegates to the Bun harness above, so there is only one OpenCut
project mutation implementation.

## Current Scope

- Create app-compatible project JSON at the current migration version.
- Add, split, move, delete, inspect, and validate timeline text elements.
- Keep media time in OpenCut's integer tick format (`120000` ticks per second).
- Recalculate project duration after each mutation.

## Next Bridge

The next layer should expose the web editor through a dev-only browser bridge
backed by Playwright:

1. Start `bun run dev:web`.
2. Load `/editor/<project-id>` in a browser context.
3. Attach a guarded `window.__OPENCUT_AGENT__` bridge to `EditorCore`.
4. Reuse the JSON harness command vocabulary.
5. Validate by reading the live timeline state and, later, exported media.
