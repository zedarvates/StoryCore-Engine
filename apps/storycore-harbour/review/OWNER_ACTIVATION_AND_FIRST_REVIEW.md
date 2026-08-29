# Owner activation and first-review runbook

Updated: 2026-08-13

This runbook is the owner-controlled path from the validated StoryCore Harbour branch to an Anna working draft, authenticated reliability tests, an immutable `0.1.0` version, and a first App Review submission.

It deliberately separates **draft creation**, **real testing**, **version cutting**, **review submission**, and **public release**. Do not collapse these stages into one command.

## Safety boundary

Only the account owner may:

- create or sign in to the Anna account;
- verify the email address;
- read and accept the Developer ToS;
- activate the developer profile;
- claim the public developer handle;
- create the App draft and lock its slug;
- approve model-quota consumption;
- submit the App for review;
- publish an approved version.

Codex, CI, GitHub automation, or another agent must not accept legal terms or choose a fallback public identity on the owner's behalf.

The intended identity is:

```text
developer handle: storycore-labs
App slug:        storycore-harbour
public identity: @storycore-labs/storycore-harbour
version:         0.1.0
```

Both the handle and slug are first-come-first-served. If either is unavailable, stop and ask the owner to make a naming decision. Do not silently append numbers, punctuation, or another brand.

## 1. Complete the owner-only Developer Console steps

In the Anna website:

1. create or sign in to the owner account;
2. verify the email address;
3. open the Developer Console;
4. read the current Developer ToS completely;
5. accept the ToS only after owner review;
6. activate the developer profile.

Anna confirmed by email on 2026-08-13 that the current flow is self-service and activation should be immediate after these steps. This supersedes older public documentation that still describes manual administrator activation.

Stop if the Console shows different legal terms, fees, identity rules, or activation requirements. Record the date and visible version of the terms before proceeding.

## 2. Prepare the local branch on Windows

Open PowerShell in the StoryCore Engine repository:

```powershell
git fetch origin
git switch agent/storycore-harbour-bootstrap
git pull --ff-only origin agent/storycore-harbour-bootstrap
cd apps/storycore-harbour

node --version
npm --version
uv --version
npm ci --no-audit --no-fund
npx --no-install anna-app doctor
npm run check
```

Expected minimum environment:

- Node.js 22 or newer;
- `uv` available on `PATH`;
- the locally pinned `@anna-ai/cli` dependency installed;
- `anna-app doctor` succeeds, except for the documented Windows-only key-mode
  false negative below;
- `npm run check` succeeds.

### Windows key-permission preflight

`@anna-ai/cli` 0.1.30 checks the development key with Unix permission bits and
requires exactly `0600`. Node.js reports `0666` for files on Windows even after
their NTFS ACL has been restricted, so `anna-app doctor` can fail its key check
on Windows when the ACL is otherwise safe.

Do not work around this by deleting, copying, printing, or committing
`%USERPROFILE%\.anna-app\dev.key`. Before treating the `0666` result as a CLI
portability defect, the owner must inspect the actual Windows ACL without
reading the key:

```powershell
$annaDevKey = Join-Path $env:USERPROFILE ".anna-app\dev.key"
icacls.exe $annaDevKey
```

Only the owner account, `SYSTEM`, and the local `Administrators` group should
have access. If another user or group has read, write, modify, or full-control
access, stop and let the owner correct the ACL before authentication or a real
model run. Repository automation must not change this owner credential ACL.

After the ACL is owner-verified, a Windows `doctor` result is eligible to
continue only when its sole failure is exactly:

```text
dev.key mode 666 (expected 0600)
```

Any missing `uv`, runtime, schema, or additional key error remains blocking.
On macOS and Linux, `anna-app doctor` must pass normally; do not waive `0600`.

Do not continue from a dirty branch with unexplained local changes:

```powershell
git status --short
```

Generated acceptance results and local Anna identity caches may be intentionally untracked/ignored. Any source-code modification must be understood before proceeding.

## 3. Authenticate the CLI and claim the developer handle

Use the local pinned CLI:

```powershell
npx --no-install anna-app login --host https://anna.partners
npx --no-install anna-app whoami --json
npx --no-install anna-app account set-handle storycore-labs --host https://anna.partners --json
npx --no-install anna-app whoami --json
```

The login command uses Anna's device-code flow and stores a PAT in the user's Anna credentials file. Never paste the PAT into GitHub, a prompt, a log, a screenshot, or the repository.

Verify that the returned account and handle belong to the intended owner. If `storycore-labs` is rejected as unavailable, stop.

An empty `whoami` result such as `{"accounts":[],"current":null}` means the
environment is not authenticated. In that state, even `apps push --dry-run`
cannot resolve the remote identity and must not be treated as a completed
preflight.

## 4. Verify the local App identity before the first push

The committed `app.json` must contain exactly:

```json
{
  "slug": "storycore-harbour",
  "name": "StoryCore Harbour",
  "version": "0.1.0"
}
```

The actual file contains additional listing fields; the three values above are the identity-critical fields.

Run strict validation again:

```powershell
npx --no-install anna-app validate --strict
```

Do not push if the validator reports a manifest, bundle, ACL, or listing problem.

## 5. Create the working draft and lock the slug

First inspect the operation without writing remotely:

```powershell
npx --no-install anna-app apps push --dry-run --json
```

Check that the planned identity is `@storycore-labs/storycore-harbour`, the bundle comes from `bundle/`, and there are no bundled Executas.

Only after checking the dry-run output:

```powershell
npx --no-install anna-app apps push --json
npx --no-install anna-app apps status storycore-harbour --json
npx --no-install anna-app apps list --json
npx --no-install anna-app apps grants storycore-harbour --json
```

`apps push` creates or updates a mutable **working draft**. It is not a public release and should not make the App visible in the public Store.

The grants endpoint is informational only. With the currently pinned CLI, a
JSON result containing `"grants": null` means the server returned 404 for the
public grants endpoint and the CLI has no endpoint data available. It does not
prove that the App was denied the Host APIs declared in the manifest. Confirm
actual LLM, storage, and window capabilities through the authenticated harness
and recorded Host calls; do not infer permission state from `null`.

After the first successful push:

- verify that `.anna/app.json` identifies the expected remote App;
- do not commit credentials or machine-specific secrets;
- open the Developer Console and confirm the App is shown as a working/draft App;
- confirm the locked slug is exactly `storycore-harbour`.

### Working-draft installation path

The authenticated Developer Console inspected on 2026-08-29 exposes an
**Install & test** action inside the **Versions** tab for the mutable working
draft, even while the App has zero immutable versions. This is distinct from
the App-list **Install** action that previously failed with “no available
published version”. Do not cut `0.1.0` merely to discover whether the current
working-draft installation path is usable.

Installing changes the owner's Installed Apps state and may open Host API
permission controls. Use **Install & test** only after explicit owner approval
at action time, then verify the exact App id, working revision, requested
capabilities, and absence of unexpected Executas before confirming anything.

During the same inspection, **View manifest** returned `Could not validate
credentials` although the Console displayed working revision 12 and the CLI
independently confirmed the draft. Treat that as a web-session/platform
credential condition, not as evidence that the uploaded manifest or bundle is
invalid. Reauthenticate or ask Anna support rather than recreating the App.

A fresh owner sign-in subsequently restored **View manifest**. The normalized
remote r12 manifest matched the committed Schema 2 Host-API-only boundaries.
Keep `review/ANNA_VIEW_MANIFEST_CREDENTIAL_REPORT.md` as the recurrence report;
do not send it while the read path remains healthy.

Installed Apps inspection then showed StoryCore Harbour already present as
`v0.0.0-dev`. Do not click **Install & test** again merely because the
Developer card remains at `v0.0.0`. The existing installation's Permissions
panel currently returns `App version not found`; stop there and use
`review/ANNA_DEV_INSTALL_PERMISSIONS_REPORT.md` rather than reinstalling,
uninstalling, cutting a version, or changing grants speculatively.

If the CLI or Console creates an unexpected second App, stop before cutting a version. Preserve the outputs needed for diagnosis, but redact tokens.

## 6. Run StoryCore Harbour against real Anna services

Start the authenticated development harness with real APS and the intended App slug:

```powershell
npx --no-install anna-app dev `
  --storage aps `
  --llm-account https://anna.partners `
  --llm-app-slug storycore-harbour
```

The dashboard normally opens on port 5180. Perform one normal project generation first:

1. confirm the status says `Connected to Anna`;
2. create a fictional project with no private or client data;
3. complete all four steps;
4. save the project;
5. reload the latest project;
6. export JSON;
7. validate the exported JSON locally;
8. test double-confirmed project deletion only after preserving any required evidence.

Never use client work, unpublished scripts, personal identifiers, credentials, or confidential project material in the real-model tests.

## 7. Run the immutable twenty-prompt collector

The acceptance interface is hidden unless the local dashboard URL contains `acceptance=1`.

From the harness dashboard:

1. open the dashboard URL printed by `anna-app dev`;
2. append `?acceptance=1` to that dashboard URL, for example `http://127.0.0.1:5180/?acceptance=1`;
3. do not open the iframe URL as a top-level page — it loses the parent runtime bridge and falls back to local preview mode;
4. confirm the iframe shows `DEVELOPER ACCEPTANCE MODE` and `Connected to Anna`;
5. read the quota/storage warning;
6. select the consent box only when sufficient model quota is available;
7. run the fixed twenty prompts;
8. download the resulting JSONL.

Move or copy the downloaded result to:

```text
apps/storycore-harbour/acceptance/results.local.jsonl
```

Then evaluate it:

```powershell
npm run acceptance:evaluate -- acceptance/prompts.json acceptance/results.local.jsonl
```

Required result:

```text
Acceptance gate: PASS
```

The gate requires:

- at least 18 of 20 valid projects;
- supplied input fields preserved;
- no duplicate or unknown results;
- median successful completion time at or below 180 seconds.

Do not commit `results.local.jsonl`, generated projects, dialogue, scripts, or model responses. Only privacy-safe prompt IDs, categories, timings, pass counts, and repair counts may enter the PR discussion.

If the gate fails, make changes only from measured prompt IDs and privacy-safe failure categories. Do not replace difficult corpus prompts or weaken the contract.

## 8. Verify production APS and concurrency behavior

Before cutting `0.1.0`, record evidence for all of the following:

- write a valid project to production APS;
- read it back immediately;
- reload it in a fresh App session;
- export it and pass the local contract validator;
- induce an overwrite ETag conflict and confirm newer data is preserved;
- create enough project records to exercise paginated listing if practical;
- run delete-all and confirm unrelated App data survives;
- induce a deletion ETag conflict and confirm nothing is force-deleted;
- confirm a deleted project cannot be loaded afterward.

Record only privacy-safe evidence in the repository:

```text
Date:
Anna account/environment:
App slug:
Model/provider category:
Normal generation: PASS/FAIL
Acceptance: N/20
Median duration:
Repair count:
APS write/read/reload: PASS/FAIL
Overwrite conflict: PASS/FAIL
Paginated deletion: PASS/FAIL
Deletion conflict: PASS/FAIL
Notes without generated content:
```

## 9. Complete human checks before the first review

Run the protocols already committed in `review/`:

- `ACCESSIBILITY_TEST_PROTOCOL.md`;
- `BETA_TEST_PROTOCOL.md`;
- `REVIEWER_GUIDE.md`;
- `LAUNCH_CHECKLIST.md`.

Minimum human evidence before release remains:

- NVDA on Windows;
- VoiceOver on macOS;
- keyboard-only flow;
- 200% and 400% zoom;
- forced/high-contrast mode;
- 10–20 external beta completions;
- no unresolved P0/P1 defects.

Anna has said a first review can begin once the core workflow works end-to-end, so early reviewer feedback may be requested before the full public-release gate. The PR must nevertheless remain draft and unmerged until the repository's own release gates are satisfied.

## 10. Cut the immutable `0.1.0` version

Only after the real generation and APS gates are credible:

```powershell
npx --no-install anna-app apps push --dry-run --json
npx --no-install anna-app apps push --json
npx --no-install anna-app apps cut 0.1.0 --dry-run --json
npx --no-install anna-app apps cut 0.1.0 --changelog "Initial StoryCore Harbour review candidate." --json
npx --no-install anna-app apps versions storycore-harbour --json
```

A cut version is immutable. Do not cut `0.1.0` merely to reserve the slug; the working draft already serves that purpose.

If `0.1.0` was already cut from an inferior draft, do not overwrite history. Choose the next version only after an explicit owner decision.

## 11. Complete the Developer Console listing and preflight

Before submission, verify in the Developer Console:

- listing name, tagline, description, category, and pricing model;
- icon and screenshots;
- privacy/support information;
- version validation reports `valid: true`;
- UI bundle reports `bundle_ready`;
- the owner has installed and exercised the App end-to-end;
- screenshots and claims match observed behavior;
- no claim promises image/video rendering, guaranteed promotion, or unverified revenue.

The current draft assets are in `review/MARKETPLACE.md` and the CI screenshot artifact.

## 12. Submit for App Review — do not publish yet

When the owner approves the review package:

```powershell
npx --no-install anna-app apps status storycore-harbour --json
npx --no-install anna-app apps submit-review storycore-harbour --json
npx --no-install anna-app apps status storycore-harbour --json
```

Expected lifecycle change:

```text
DRAFT -> PENDING_REVIEW
```

Do not run `apps release` before review approval. Review is server-side; there is no guaranteed SLA, so monitor the Developer Console for status and reviewer notes.

If rejected, address the documented issue, update the working draft, cut a new immutable version when required, and resubmit. Do not erase or rewrite previous immutable versions.

## 13. Public release after approval

Public release is a separate owner decision after:

- Anna approval;
- exact Developer Terms review;
- revenue-policy review;
- remaining accessibility/beta gates;
- final privacy/support details;
- owner approval of the release candidate.

Before any release command, run a dry run and verify the App status is `APPROVED` or already `PUBLISHED`:

```powershell
npx --no-install anna-app apps status storycore-harbour --json
npx --no-install anna-app apps release 0.1.0 --slug storycore-harbour --dry-run --json
```

Execute the non-dry-run release only after the owner explicitly approves it. If the CLI and Developer Console disagree about status, stop and use Anna support rather than forcing or recreating the App.

## Evidence sources

This runbook follows:

- Anna's current `anna-app` CLI reference;
- Anna's App publishing lifecycle documentation;
- the committed StoryCore Harbour gates and review protocols;
- Jiao's email of 2026-08-13 confirming Host-API-only eligibility, self-service activation, first-come handle/slug claiming, prospective launch support, and the acceptability of an early first review.

The exact Developer Terms, detailed 70% eligible-usage-profit calculation, and Qualified App MAU/Qualified Runs display remain pending written confirmation.
