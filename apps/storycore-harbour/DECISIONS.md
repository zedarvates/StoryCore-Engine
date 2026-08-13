# Architecture and product decisions

## Accepted

### ADR-001 — Name

**Decision:** use the working name `StoryCore Harbour`.

**Reason:** the name connects naturally to Hong Kong and communicates a place where creative material is organized before departure into production. It is understandable internationally and remains tied to the StoryCore parent product.

**Status:** working name pending final availability and brand clearance. Anna confirmed that the App slug is locked when the draft is created; there is no separate reservation process.

### ADR-002 — Product slice

**Decision:** ship concept/script to production package, not text-to-video.

**Reason:** a structured result is faster, cheaper, more reliable, and independently useful. Video generation would introduce GPU/provider failures into the meaningful completion path.

### ADR-003 — Host API first

**Decision:** use `anna.llm.complete`, `anna.storage`, and `anna.window` directly from a schema 2 UI bundle.

**Reason:** avoids provider keys, custom hosting, a local runtime requirement, and developer-paid inference.

### ADR-004 — No Executa in 0.1

**Decision:** required and optional Executa arrays remain empty.

**Evidence:** Jiao confirmed by email on 2026-08-13 that a Schema 2 App built around Anna Host APIs such as `llm`, `storage`, and `image` can qualify without requiring users to install a local Executa/runtime. Executa is an extension point rather than a qualification requirement.

**Revisit when:** a measured production limitation prevents the independently useful core workflow, not merely to add unnecessary architecture.

### ADR-005 — Versioned interchange contract

**Decision:** exported projects use `storycore-harbour.project.v1`.

**Reason:** keeps the Anna adapter replaceable and enables a future StoryCore Desktop importer without coupling the products.

### ADR-006 — One repair attempt

**Decision:** malformed LLM output receives one bounded repair call, then fails visibly.

**Reason:** avoids infinite cost/latency loops and prevents fabricated silent fallback.

### ADR-007 — Dedicated CI outside the App directory

**Decision:** add `.github/workflows/storycore-harbour-ci.yml` as the only initial cross-directory change.

**Reason:** the original execution environment could not reliably install the Anna CLI from npm. GitHub Actions provides a clean Node 22 + `uv` environment where the official validator and local harness can run reproducibly. The workflow is path-scoped to StoryCore Harbour and does not alter StoryCore Engine runtime code.

**Consequences:** every Harbour change must pass JavaScript syntax checks, contract tests, acceptance-evaluator tests, sample-export validation, mock-response validation, corpus synchronization, strict Anna manifest validation, real-browser flows, and Marketplace screenshot generation.

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

**Reason:** CLI 0.1.30 correctly enforces manifest ACLs and records calls, but its default direct Node storage handler returns `null`; relying on that undocumented default would test the harness implementation rather than StoryCore Harbour. Explicit mocks make the expected `exists`, `value`, `etag`, `generation`, list, and delete contracts visible and deterministic.

**Consequences:** CI verifies that declared LLM, storage, and window methods are allowed and that undeclared `tools.invoke` is denied. Production APS persistence and real ETag conflict behavior remain a separate authenticated-platform gate.

### ADR-014 — Self-service activation and first-come identities

**Decision:** treat Anna developer activation and identity claiming as owner-operated account actions, not implementation blockers.

**Evidence:** Jiao confirmed by email on 2026-08-13 that activation is self-service and instant after account creation, email verification, Developer ToS acceptance, and activation in the Developer Console. Developer handles and App slugs are first-come-first-served and lock when claimed/created; no manual reservation mechanism exists.

**Consequences:** the owner should claim `storycore-labs` and create the `storycore-harbour` App draft as soon as possible. CI, Codex, and repository automation must not attempt to accept legal terms or operate the owner's Anna account without an authenticated owner session.

### ADR-015 — Launch support is prospective, not guaranteed

**Decision:** plan launch assets and retention work, but do not state that a Marketplace feature, newsletter placement, Discord promotion, or other channel is guaranteed.

**Evidence:** Anna confirmed that launch/growth initiatives are being planned for strong Founding Builder Apps, while explicitly declining to promise a specific placement before plans are finalized.

**Consequences:** Marketplace copy and business forecasts must separate confirmed program eligibility from prospective promotional support.

### ADR-016 — Windows key safety uses NTFS ACL evidence

**Decision:** on Windows, treat `anna-app doctor` 0.1.30's `dev.key mode 666
(expected 0600)` result as a known portability defect only after the owner has
verified that the NTFS ACL grants access solely to the owner, `SYSTEM`, and
local administrators. Any additional identity with access is a real blocker.

**Reason:** the CLI checks `fs.statSync(path).mode & 0o777` for an exact Unix
`0600` value. Node.js reports `0666` for Windows files independently of their
effective NTFS ACL, so the check cannot prove Windows confidentiality. In the
current owner environment, a non-owner local group has inherited read access,
which is independently unsafe even though the CLI would show the same `0666`
after a correct ACL restriction.

**Alternatives rejected:** deleting or regenerating the key risks breaking the
local development identity; blindly ignoring `doctor` could expose a local
secret; changing credential ACLs through repository automation would exceed
the owner-controlled account boundary.

**Consequences:** the owner runbook uses `icacls` as a read-only Windows ACL
inspection, repository automation never reads or changes the key, and all
non-key `doctor` failures remain blocking. macOS and Linux still require the
normal exact `0600` check.

## Documentation drift observed

- Anna's current CLI installs as `@anna-ai/cli` 0.1.30 and validates this schema 2 App with `anna-app validate --strict`.
- The public example repository still contains mock LLM JSONL entries using `ns` / `method`, while `anna-app fixture verify` validates harness recordings, not those mock inputs.
- `mountBundle` ACL and call recording work in CLI 0.1.30, while its default storage value semantics require explicit mocks for deterministic Node tests.
- Older Verified Developer documentation describes manual activation. Anna explicitly instructed builders on 2026-08-13 to follow the latest self-service Developer Console flow instead.

## Confirmed externally by Anna on 2026-08-13

- Host-API-only Schema 2 Apps can qualify without a local Executa/runtime;
- developer activation is self-service and instant after ToS acceptance;
- launch/growth support initiatives are planned, but no specific promotional placement is guaranteed;
- developer handles are first-come-first-served and lock when claimed;
- App slugs are first-come-first-served and lock when the draft is created;
- the first review submission may be made once the core workflow works end-to-end; perfection is not required for the first look.

## Pending external confirmation from Anna

- exact current Developer Terms text/link;
- detailed definition and calculation of 70% of eligible usage profit, including deductions, threshold, and payment schedule;
- how Qualified App MAU and Qualified Runs are surfaced to builders in the Developer Console.

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
