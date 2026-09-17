# Asset Creator: local preflight regressions

Run from the repository root with Python 3.11+:

```bash
python -m unittest discover -s tests/asset_creator -v
```

The suite uses the standard library, temporary files, synthetic editor templates
and a fake ComfyUI client. Socket creation is forbidden during each test. The fake
download returns paths without writing GLBs: successful ordering is not evidence
of generation, artifact integrity, or compatibility with the ComfyUI API.

The nine tests cover:

- missing recipe and malformed JSON before any client call;
- an unknown preset with an available `lowvram` recipe, without silent fallback;
- a missing source image before any client call;
- invalid editor structure and missing/unpatchable input-image nodes;
- one preparation reused after the on-disk recipe changes, preserving the
  requested parameters and the server-returned image name;
- all four declared presets preparing without changing their source files;
- an unavailable server causing no upload or submission.

On the base `5b6c83bd26f60f7eb5e4da53f958f2d3b06edb4a`, these tests expose the
upload-before-preparation ordering, silent preset fallback and template-validation
gaps. The suite reports multiple failures within parameterized subtests; these
must not be represented as distinct end-to-end generation attempts.

Local validation on 2026-09-13 (Linux, Python 3.12.14): the unmodified base with
the regression suite reports 8 failures and 5 errors across its subtests; with
the correction all 9 test methods pass. `git diff --check` also passes. This is
a focused sparse-checkout proof, not a repository-wide test run. Ruff was not
available in this environment and no Ruff result is claimed.

The addon still patches editor JSON rather than constructing a proven API prompt.
Real PixelArtistry/Trellis2 JSON, node/model versions, API-format conversion,
timeouts, job recovery, real outputs and the full Asset Factory integration remain
separate work. No workflow recipe or model is downloaded by these tests.

## Workflow inventory follow-up

`test_workflow_inspection.py` adds 10 tests covering editor/API recognition,
declared extension versions, byte fingerprints and unchanged source files,
missing/unreadable inputs, malformed/ambiguous JSON, missing presets without
fallback, and JSON CLI results/errors. Socket creation is forbidden in each test.
An API-shaped graph with an unresolved link remains only an inventory result;
the test explicitly verifies that it is not reported as executed.

Validation on 2026-09-17, Linux / Python 3.12.14: all 19 focused tests pass
(the original 9 plus these 10). Ruff 0.16.8 check and format check pass for the
new module and its test file using the repository configuration. This does not
extend the earlier lint claim to unrelated files or establish hosted CI evidence.

Two upstream Trellis2 editor documents were also inspected separately with sockets
forbidden, after verifying their Git blob identities. The resulting inventories
are recorded in `evidence/upstream-workflow-inspection.json`; those source JSON
files are not vendored and normal tests do not download them. The local addon
inventory is recorded in `evidence/checkout-presets-inspection.json` and reports
four missing presets. It is not a scan of the user's machines.

See the [inspection guide](../../addons/official/storycore_asset_creator/WORKFLOW_INSPECTION.md)
for source references, commands and interpretation. No new CI workflow, GPU run,
API conversion, submission or MCP registration is part of this follow-up.
