# OpenCut cli-anything SOP

## Architecture

OpenCut is a browser-rendered video editor. The current harness uses the native
OpenCut project JSON shape as the data layer and delegates mutations to the
repo-local Bun harness at `packages/opencut-agent/src/cli.ts`.

The native web editor still owns live rendering, OPFS/IndexedDB persistence, and
export. This Python package is the cli-anything command surface that agents can
install and call consistently.

## Command Mapping

- `project new` -> `bun packages/opencut-agent/src/cli.ts new`
- `project inspect` -> `bun packages/opencut-agent/src/cli.ts inspect`
- `project validate` -> `bun packages/opencut-agent/src/cli.ts validate`
- `timeline add-text` -> `bun packages/opencut-agent/src/cli.ts add-text`
- `timeline split` -> `bun packages/opencut-agent/src/cli.ts split`
- `timeline move` -> `bun packages/opencut-agent/src/cli.ts move`
- `timeline delete` -> `bun packages/opencut-agent/src/cli.ts delete`

## State Model

One-shot commands read and write OpenCut project JSON files. Mutations auto-save
to `--project` unless `--out` is provided. `--dry-run` copies the project to a
temporary file, runs the mutation there, and reports what would change without
modifying the original project.

## Current Limitation

Rendering/export validation is not implemented in this harness yet because the
OpenCut renderer is currently browser-bound. The next backend should attach to a
dev-only browser bridge and call `EditorCore` through Playwright.
