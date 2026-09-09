# Committed rule audit

The three dependency-free Python modules are copied unchanged from
[Botte Secrète PR #103](https://github.com/zedarvates/botte-secrete/pull/103),
source commit [`e121ea16cbd5a772ddb485414928c0938eace2d5`](https://github.com/zedarvates/botte-secrete/tree/e121ea16cbd5a772ddb485414928c0938eace2d5).
Python 3.10+ is required. The upstream MIT notice is retained in
`engine-LICENSE.txt`; it does not change this repository's licensing.

| Engine file | SHA-256 |
| --- | --- |
| `skills/console_utf8.py` | `80e0583b55e816b85193238abcca6f16ae84d38c382b792763e0f5e90e662eb5` |
| `skills/directives_audit/rules.py` | `6af048fa89d1214d21e5abb2a82144ebfde26bf9bfaec120a3f91ead61e18284` |
| `skills/directives_audit/rules_cli.py` | `28da4117cd51bd12f7392857bf82b144895353b44d04c5f4d378968e4347fea7` |

From the repository root:

```bash
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=. python -m skills.directives_audit.rules_cli audit . --json
```

## Verification boundary

The audit reads exact source statements, guard anchors, positive and negative
probe anchors, owner-boundary metadata and the replacement graph. It does not
execute probes, import project code, contact services or authorize an action.
`last_verified` records semantic source review, not runtime success or a CI SHA.
All initial `supersedes` lists are empty. These local data rules use
`owner_only: false`; that does not grant owner-only external authority.

The report must be `botte.rules-audit/v1`, with a present manifest, at least one
rule, and zero errors and warnings. A missing/empty manifest is BLOCKED/DRIFT,
even if its numeric score is 100. The CLI returns 2 for an absent manifest and 1
for errors, but warnings require the additional strict check used in CI.

The fingerprint is a deterministic rule/report receipt, not a hash of the entire
source tree. Always record `git rev-parse HEAD` alongside the report and actual
test results. A result from another SHA or a pull-request merge commit cannot
stand in for the tested head. Regenerate verification receipts only after source
review and relevant probes; do not refresh dates merely to silence drift.

## Registered scope and execution

This initial contract covers three Harbour invariants: source-only repair
context, project ID references, and public acceptance-output redaction. It is
not a complete inventory of StoryCore Engine rules. `AGENTS.md`, mission limits,
and owner decisions remain authoritative outside this registered scope.

Run the reviewed behavioral probes separately from the repository root:

```bash
node --test apps/storycore-harbour/tests/repair-prompt.test.mjs apps/storycore-harbour/tests/contracts.test.mjs apps/storycore-harbour/tests/acceptance-public-output.test.mjs
```

The existing Harbour CI checks out and verifies the exact PR head, runs this
audit, then retains the full contract/evaluator, official Anna strict-validation,
and browser mock gates. CI is separate evidence; none of those mock checks proves
real-model acceptance, Anna eligibility, publication, or owner approval.
