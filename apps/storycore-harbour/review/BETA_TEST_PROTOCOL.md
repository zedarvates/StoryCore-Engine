# StoryCore Harbour — external beta-test protocol

## Objective

Run 10–20 external completions before Marketplace submission and identify blockers that automated contract/browser tests cannot detect: comprehension, perceived value, abandonment, confusing terminology, slow steps, and misleading expectations.

This is a product beta, not an attempt to manufacture Qualified App MAU. Do not pay, reward, or pressure participants solely to create qualifying Anna runs.

## Participants

Recruit a balanced group where possible:

- 3–5 writers or screenwriters;
- 3–5 video/film creators;
- 2–4 comic or webtoon creators;
- 2–4 general creative-tool users;
- at least 3 participants using French output;
- at least 3 participants using English output.

Participants must use fictional, public-domain, or otherwise authorized material. They should not enter client secrets or sensitive personal data.

## Test environment

Record without exposing private content:

- App version and commit;
- Anna App/runtime version if visible;
- selected model label if the participant consents and it is not secret;
- output language and content format;
- start/end timestamps;
- whether repair was used;
- stable error category;
- completion, save, reload, and export success.

Do not record the full script or generated project in the beta report.

## Core participant task

Give the participant this neutral instruction:

> Use StoryCore Harbour to turn an idea you are allowed to share into a production-ready visual-story plan. Continue until you can inspect the continuity report and export the project. Think aloud when something is unclear, but do not ask the observer how to use the interface unless you are blocked.

The observer must not teach the workflow before the participant attempts it.

## Required observations

For each session, capture:

1. **First-action clarity** — does the participant understand what to enter?
2. **Expectation accuracy** — do they expect planning, or mistakenly expect final video generation?
3. **Form completion** — fields that create hesitation or invalid submissions.
4. **Generation trust** — whether loading/repair states are understandable.
5. **World usefulness** — whether characters, locations, and visual direction are actionable.
6. **Scene usefulness** — whether the shot plan is sufficiently concrete.
7. **Continuity usefulness** — whether score/warnings are understood and credible.
8. **Navigation** — mouse and keyboard movement between steps.
9. **Persistence** — save confirmation and reload confidence.
10. **Export** — whether the participant knows what the JSON is for.
11. **Value** — what they would use next, change, or remove.
12. **Failure recovery** — what they do when a controlled or real error appears.

## Quantitative session record

Use one local row per participant:

```text
session_id
app_version
language
authoring_format
completion_success (yes/no)
time_to_submit_seconds
time_to_result_seconds
repair_used (yes/no/unknown)
world_viewed (yes/no)
scenes_viewed (yes/no)
continuity_viewed (yes/no)
save_success (yes/no)
reload_success (yes/no)
export_success (yes/no)
error_category
observer_severity
```

Do not include the participant's name, email, prompt, script, dialogue, or exported project in the engineering report.

## Post-task questions

Ask in this order:

1. “What did StoryCore Harbour do for you?”
2. “Which part was most useful?”
3. “Which part did you trust least?”
4. “What did you expect to happen that did not happen?”
5. “Was anything difficult to find or understand?”
6. “Would the exported project be useful outside this App? How?”
7. “What would make you use this a second time?”
8. “Did you enter anything you later wished you had not shared?”

Use paraphrased findings in public reports. Obtain explicit permission before using a direct quotation.

## Severity

- **P0 — Stop:** data exposure, destructive overwrite, cross-user content, secret leakage, unsafe executable content, or impossible recovery.
- **P1 — Release blocker:** core run cannot complete, result cannot save/reload/export, widespread contract failure, inaccessible core workflow, or misleading final-media claim.
- **P2 — Important:** significant confusion, poor continuity, avoidable repair, slow navigation, unclear error/action, or layout problem with a workaround.
- **P3 — Improvement:** copy, polish, optional convenience, minor visual inconsistency.

All P0 and P1 findings must be fixed and rerun before submission. P2 findings require an explicit disposition. P3 findings may be scheduled after 0.1.

## Beta exit gate

The external beta passes when:

- at least 10 independent participants complete a session;
- at least 80% reach the continuity screen;
- at least 80% of participants who reach continuity successfully save and export;
- no P0 remains;
- no unresolved P1 remains;
- no participant reasonably believes the App generated final media after completing the workflow;
- privacy/deletion limitations are communicated accurately;
- observed failures do not contradict the fixed 20-prompt acceptance result.

These thresholds supplement but do not replace the real Anna 18/20 reliability gate.
