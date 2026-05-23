# Test Plan

## Test Inventory Plan

- `test_core.py`: 4 tests planned for backend discovery and project workflow wrappers.
- `test_cli_subprocess.py`: 3 subprocess tests planned for installed/fallback CLI usage.

## Unit Test Plan

### `core.backend`

- Resolve the OpenCut repo root from `OPENCUT_REPO_ROOT`.
- Run the repo-local Bun harness and parse JSON output.
- Fail loudly when an invalid project path is supplied.

### `core.project`

- Create project JSON.
- Add text through the wrapper.
- Validate project state.
- Verify `--dry-run` leaves the original file unchanged.

## E2E Test Plan

The E2E layer invokes `cli-anything-opencut` as a subprocess using `_resolve_cli`.
It creates a real OpenCut project JSON file, mutates it, validates it, and checks
the resulting JSON structure.

Rendering/export is not tested yet because the current OpenCut renderer is
browser-bound. This is documented as an explicit gap rather than hidden behind a
fake renderer.

## Realistic Workflow Scenarios

### Text-only rough cut

- Simulates: an agent preparing a caption/title timeline.
- Operations chained: project new -> add text -> inspect -> validate.
- Verified: project exists, duration updates, one text element exists, validation passes.

### Non-destructive mutation preview

- Simulates: an agent checking a timeline edit before saving.
- Operations chained: project new -> add text with `--dry-run`.
- Verified: dry-run reports success and the original project remains unchanged.

## Test Results

Command:

```bash
PATH=/tmp/opencut-agent-venv/bin:$PATH CLI_ANYTHING_FORCE_INSTALLED=1 \
uv run --with pytest python -m pytest cli_anything/opencut/tests -v -s
```

Output:

```text
[_resolve_cli] Using installed command: /tmp/opencut-agent-venv/bin/cli-anything-opencut
collected 7 items

cli_anything/opencut/tests/test_cli_subprocess.py::TestCLISubprocess::test_help PASSED
cli_anything/opencut/tests/test_cli_subprocess.py::TestCLISubprocess::test_project_new_validate_json PASSED
cli_anything/opencut/tests/test_cli_subprocess.py::TestCLISubprocess::test_full_text_workflow PASSED
cli_anything/opencut/tests/test_core.py::test_resolve_repo_root_from_env PASSED
cli_anything/opencut/tests/test_core.py::test_project_workflow PASSED
cli_anything/opencut/tests/test_core.py::test_dry_run_does_not_modify_original PASSED
cli_anything/opencut/tests/test_core.py::test_validate_missing_project_fails PASSED

7 passed in 1.61s
```

## Coverage Notes

- Subprocess tests use the installed `cli-anything-opencut` command.
- The test suite verifies project JSON generation, timeline text mutation,
  validation, and dry-run behavior.
- Real media export remains untested because the current OpenCut renderer is
  browser-bound and not yet exposed through a headless backend.
