# StoryCore Harbour acceptance protocol

This directory defines the fixed real-model reliability gate for version 0.1.

## Why the corpus is fixed

The twenty prompts in `prompts.json` cover every supported format, ten English cases, ten French cases, very short and longer durations, dialogue and no-dialogue work, fiction, advertising, music video, documentary, comic/webtoon, social video, factual caution, safety constraints, ensembles, recurring props, and spatial continuity.

Do not replace difficult prompts after seeing model failures. A corpus change requires:

1. a written reason in `DECISIONS.md`;
2. owner review;
3. resetting historical acceptance comparisons.

`acceptance/prompts.json` is the single source of truth. `npm install` runs `npm run acceptance:sync` and generates `bundle/acceptance-prompts.json` for the static Anna App bundle. Never edit or commit the generated copy.

## Gate

A candidate version passes when:

- the corpus itself validates;
- at least 18 of 20 runs produce a valid `storycore-harbour.project.v1` project;
- supplied format, language, duration, audience, tone, source idea, and working title are preserved;
- median successful completion time is at most 180,000 ms;
- no duplicate or unknown result records exist.

A repaired result may pass, but repair use is counted and reported.

## Run the real Anna collector

The collector is a hidden developer-only mode in the same static App. It uses the real form submission, LLM call, repair logic, contract validation, Anna storage write, and storage read-back used by normal users. It does not add a backend or Executa.

1. Use an Anna test account with an enabled model and enough quota. The complete corpus may make 20 primary calls and up to 20 repair calls.
2. Install and validate the App:

   ```bash
   npm install
   npm run check
   ```

3. Start the non-mock Anna development harness after authenticating/configuring it according to the current Anna CLI documentation:

   ```bash
   npm run dev
   ```

4. Open the local App URL printed by the CLI and add the query parameter `acceptance=1`. For example:

   ```text
   http://127.0.0.1:<port>/?acceptance=1
   ```

   Add the query to the **dashboard URL**, not to the iframe URL. The dashboard keeps the Anna runtime bridge connected and passes developer mode to its loopback iframe through the referrer. Opening the iframe URL as a top-level tab falls back to local preview mode and produces invalid non-Anna results.

5. Read the quota/storage warning and explicitly select the confirmation checkbox. The Run button remains disabled until consent is provided.
6. Start the corpus. “Stop after current prompt” performs a safe stop between prompts.
7. Download the generated JSONL when complete. Save it locally as `acceptance/results.local.jsonl`; this path is ignored by Git.
8. Evaluate it:

   ```bash
   npm run acceptance:evaluate -- acceptance/prompts.json acceptance/results.local.jsonl
   ```

The collector stores each successful test project in the current Anna App storage, just like the normal user flow. Use a dedicated test account or remove the test projects through Anna after the run when required.

## Result format

One JSONL line is written per prompt:

```json
{
  "promptId": "HBR-A01",
  "durationMs": 42150,
  "repairUsed": false,
  "project": { "schemaVersion": "storycore-harbour.project.v1" }
}
```

For a failed run, `project` is omitted and only a stable failure category/name is recorded:

```json
{
  "promptId": "HBR-A02",
  "durationMs": 180000,
  "repairUsed": true,
  "error": {
    "category": "timeout",
    "name": "timeout"
  }
}
```

Allowed failure categories are `runtime`, `permission`, `quota`, `provider`, `timeout`, `parse`, `contract`, `storage`, and `unknown`.

## Privacy

- Do not commit real acceptance result files.
- Do not paste a real JSONL result into public issues or pull-request comments.
- Do not log complete scripts, generated dialogue, character descriptions, or model responses in CI.
- The evaluator reports prompt IDs, status categories, validation reasons, timing, and repair counts only.
- The committed corpus contains fictional or intentionally public test content.

## Offline and CI commands

Validate the immutable corpus:

```bash
npm run acceptance:corpus
```

Regenerate and verify its static-bundle copy:

```bash
npm run acceptance:sync
npm run acceptance:sync:check
```

Evaluate a real result file:

```bash
npm run acceptance:evaluate -- acceptance/prompts.json acceptance/results.local.jsonl
```

Machine-readable summary:

```bash
node scripts/evaluate-acceptance.mjs acceptance/prompts.json acceptance/results.local.jsonl --json
```

The real Anna run requires an authenticated Anna account and enabled model. Corpus validation and result evaluation are deterministic and may run offline or in CI.
