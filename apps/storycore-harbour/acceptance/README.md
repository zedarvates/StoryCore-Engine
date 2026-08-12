# StoryCore Harbour acceptance protocol

This directory defines the fixed real-model reliability gate for version 0.1.

## Why the corpus is fixed

The twenty prompts in `prompts.json` cover every supported format, ten English cases, ten French cases, very short and longer durations, dialogue and no-dialogue work, fiction, advertising, music video, documentary, comic/webtoon, social video, factual caution, safety constraints, ensembles, recurring props, and spatial continuity.

Do not replace difficult prompts after seeing model failures. A corpus change requires:

1. a written reason in `DECISIONS.md`;
2. owner review;
3. resetting historical acceptance comparisons.

## Gate

A candidate version passes when:

- the corpus itself validates;
- at least 18 of 20 runs produce a valid `storycore-harbour.project.v1` project;
- supplied format, language, duration, audience, tone, source idea, and working title are preserved;
- median successful completion time is at most 180,000 ms;
- no duplicate or unknown result records exist.

A repaired result may pass, but repair use is counted and reported.

## Result format

Store local test results as JSONL in `acceptance/results.local.jsonl`. One line per prompt:

```json
{
  "promptId": "HBR-A01",
  "durationMs": 42150,
  "repairUsed": false,
  "project": { "schemaVersion": "storycore-harbour.project.v1" }
}
```

For a failed run, omit `project` and record only a stable error category and name:

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
- Do not log complete scripts, generated dialogue, character descriptions, or model responses.
- The evaluator reports prompt IDs, status categories, validation reasons, timing, and repair counts only.
- Test only with fictional or intentionally public corpus content.

## Commands

Validate the immutable corpus:

```bash
npm run acceptance:corpus
```

Evaluate a real result file:

```bash
npm run acceptance:evaluate -- acceptance/prompts.json acceptance/results.local.jsonl
```

Machine-readable summary:

```bash
node scripts/evaluate-acceptance.mjs acceptance/prompts.json acceptance/results.local.jsonl --json
```

The real Anna run itself still requires an authenticated Anna account and enabled model. The evaluator is deterministic and may run offline or in CI.
