# Architecture and product decisions

## Accepted

### ADR-001 — Name

**Decision:** use the working name `StoryCore Harbour`.

**Reason:** the name connects naturally to Hong Kong and communicates a place where creative material is organized before departure into production. It is understandable internationally and remains tied to the StoryCore parent product.

**Status:** working name pending final availability and brand clearance.

### ADR-002 — Product slice

**Decision:** ship concept/script to production package, not text-to-video.

**Reason:** a structured result is faster, cheaper, more reliable, and independently useful. Video generation would introduce GPU/provider failures into the meaningful completion path.

### ADR-003 — Host API first

**Decision:** use `anna.llm.complete`, `anna.storage`, and `anna.window` directly from a schema 2 UI bundle.

**Reason:** avoids provider keys, custom hosting, a local runtime requirement, and developer-paid inference.

### ADR-004 — No Executa in 0.1

**Decision:** required and optional Executa arrays remain empty.

**Revisit when:** official Anna validation or a measured browser limitation prevents deterministic contract validation.

### ADR-005 — Versioned interchange contract

**Decision:** exported projects use `storycore-harbour.project.v1`.

**Reason:** keeps the Anna adapter replaceable and enables a future StoryCore Desktop importer without coupling the products.

### ADR-006 — One repair attempt

**Decision:** malformed LLM output receives one bounded repair call, then fails visibly.

**Reason:** avoids infinite cost/latency loops and prevents fabricated silent fallback.

### ADR-007 — Dedicated CI outside the App directory

**Decision:** add `.github/workflows/storycore-harbour-ci.yml` as the only initial cross-directory change.

**Reason:** the original execution environment could not reliably install the Anna CLI from npm. GitHub Actions provides a clean Node 22 + `uv` environment where the official validator and local harness can run reproducibly. The workflow is path-scoped to StoryCore Harbour and does not alter StoryCore Engine runtime code.

**Consequences:** every Harbour change must pass JavaScript syntax checks, contract tests, acceptance-evaluator tests, sample-export validation, mock-response validation, corpus synchronization, strict Anna manifest validation, and a mock-harness startup test.

### ADR-008 — Mock LLM fixtures are not harness recordings

**Decision:** validate `fixtures/happy-path.jsonl` with `scripts/validate-mock-fixture.mjs`; do not pass it to `anna-app fixture verify`.

**Reason:** `anna-app dev --mock-llm` consumes namespace/method mock responses (`ns=llm`, `method=complete`). `anna-app fixture verify` validates a different artifact: a recorded harness event stream carrying recording-specific fields such as `kind`. Treating the mock input as a recording produced the misleading error `unknown kind: (missing)`.

**Consequences:** the custom validator parses each mocked completion, extracts the MCP-shaped text response, parses the embedded StoryCore project, and runs the canonical project contract. A future real harness recording must be stored separately and checked with the official fixture command.

### ADR-009 — One canonical runtime contract

**Decision:** `bundle/project-contract.js` is the canonical executable contract used by the browser App, CLI validator, mock validator, and Node tests.

**Reason:** maintaining separate browser and CLI validators creates drift and could allow the UI to save data that offline tests reject—or the reverse.

**Consequences:** every project is validated before rendering, before storage, after storage read-back, after loading, and before export-facing use. JSON Schema remains the documented structural interchange description; cross-reference and duration invariants are enforced by the executable contract.

### ADR-010 — Optimistic and verified storage writes

**Decision:** read the current Anna storage value, pass its opaque `etag` as `if_match` when overwriting, then read back and revalidate the saved project.

**Reason:** prevents silent last-write-wins data loss across windows and ensures that a successful storage response actually contains a project satisfying the current contract.

**Consequences:** a concurrency conflict is shown to the user instead of overwriting a newer project. The default per-App/per-user storage scope remains unchanged and needs no broader capability grant.

### ADR-011 — Immutable twenty-prompt acceptance corpus

**Decision:** use `acceptance/prompts.json` as the fixed reliability corpus for version 0.1.

**Reason:** selecting prompts after seeing model failures would make the reliability score meaningless. The corpus covers all six formats, exactly ten English and ten French requests, short and longer durations, dialogue and no-dialogue work, factual caution, safety constraints, ensembles, recurring props, and spatial continuity.

**Gate:** at least 18 of 20 valid projects, preserved input fields, no duplicate/unknown results, and median successful completion at or below 180 seconds.

**Consequences:** corpus changes require owner review, a documented reason, and a reset of historical comparisons. The canonical file is copied into the static bundle by `npm run acceptance:sync`; the generated copy is not committed.

### ADR-012 — Consented real-Anna collector inside the App

**Decision:** expose the acceptance collector only when the local App URL includes `?acceptance=1` and require an explicit quota/storage consent checkbox before enabling the run.

**Reason:** the trustworthy acceptance test must exercise the same form submission, LLM call, one-repair policy, validation, storage write, read-back, and rendering path as normal users. A separate backend runner could accidentally measure different behavior.

**Consequences:** the test can make 20 primary model calls and up to 20 repair calls, stores test projects in the active Anna account, can stop safely between prompts, and produces a local JSONL file. The collector does not add an Executa, backend, provider key, external tracker, or automatic unattended run.

### ADR-013 — Official Anna harness with explicit stable mocks

**Decision:** test Host API grants and call recording through `@anna-ai/cli/test` `mountBundle`, while explicitly mocking the application-facing LLM and storage response shapes.

**Reason:** CLI 0.1.30 correctly enforces manifest ACLs and records calls, but its default direct Node storage handler returns `null`; relying on that undocumented default would test the harness implementation rather than StoryCore Harbour. Explicit mocks make the expected `exists`, `value`, `etag`, and `generation` contract visible and deterministic.

**Consequences:** CI verifies that `llm.complete`, `storage.get/set`, and `window.set_title` are allowed, and that undeclared `tools.invoke` is denied. Production APS persistence and real ETag conflict behavior remain a separate authenticated-platform gate.

## Documentation drift observed

- Anna's current CLI installs as `@anna-ai/cli` 0.1.30 and validates this schema 2 App with `anna-app validate --strict`.
- The public example repository still contains mock LLM JSONL entries using `ns` / `method`, while `anna-app fixture verify` validates harness recordings, not those mock inputs.
- `mountBundle` ACL and call recording work in CLI 0.1.30, while its default storage value semantics require explicit mocks for deterministic Node tests.
- Jiao's email says developer activation is self-service, while the public Verified Developer reference still describes manual administrator activation. This remains externally unresolved.

## Pending external confirmation from Anna

- current Developer Terms accepted in the console;
- written definition of the announced 70% eligible usage profit;
- whether Host-API-only schema 2 runs qualify without a local runtime;
- exact Qualified App MAU visibility;
- self-service versus manually granted developer activation;
- launch and marketplace support;
- availability of `storycore-harbour` and `storycore-labs`.

## Decision log template

```text
### ADR-NNN — Title
Decision:
Reason:
Alternatives:
Consequences:
Evidence:
Status:
```
