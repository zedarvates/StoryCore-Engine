# StoryCore Music Planning Layer v1

Status: **draft contract; provider-agnostic; non-generating by itself**.

## Goal

Insert an editable symbolic planning layer between narrative intent and any music
generator. StoryCore should be able to reason about, compare, revise and version
a score plan without coupling the project to one model or one licence regime.

```text
story / scene / shot intent
        |
        v
music brief
        |
        v
MusicPlan v1  <---- human/agent edits and validation
        |
        +----> provider adapter A
        +----> provider adapter B
        +----> DAW / MIDI-oriented export later
        |
        v
rendered audio candidate
        |
        v
technical + narrative + licence validation
        |
        v
last-known-good audio artefact
```

The design is inspired by open-source music workflows that expose an editable
intermediate representation, but this contract is StoryCore-owned and must not
require or redistribute third-party model weights.

## Why the intermediate plan matters

A direct `prompt -> wav` path throws away useful structure. `MusicPlan` keeps the
intent that can be inspected before expensive generation:

- sections and their narrative purpose;
- tempo and metre;
- tonal centre / mode when known;
- motifs and motif reuse;
- instrumentation roles rather than provider-specific tokens;
- energy and tension curves;
- dialogue-safe density constraints;
- scene/shot synchronization cues;
- optional lyric blocks;
- provenance and licence information for every external dependency.

A renderer may ignore unsupported optional fields, but it must report that as an
execution delta rather than silently pretending the full plan was honoured.

## Three execution modes

### `full`

The symbolic plan is authoritative enough to be edited and compared before
rendering. Use when continuity, leitmotifs, timing or reproducibility matter.

### `guided`

StoryCore fixes high-level structure and synchronization while the selected
provider is free to elaborate harmony, accompaniment or sound design.

### `free`

Only the narrative music brief is binding. This keeps a direct-generation
baseline available for comparison. It must not be labelled equivalent to a
`full` render.

## Provider boundary

Provider adapters translate `MusicPlan` into provider-specific inputs and return
an execution report containing at least:

- requested mode;
- executed mode;
- unsupported/dropped fields;
- model/provider identifier and version when available;
- model-weights licence and code licence separately;
- deterministic parameters or seed when supported;
- input and output artefact digests;
- runtime/hardware observations when measured;
- validation evidence references.

The provider adapter cannot promote its own output to last-known-good. Promotion
belongs to a separate validation/harness step.

## Commercial-use boundary

Permissively licensed code does not make separately licensed model weights
commercially usable. An adapter may exist for research/evaluation while its
weights remain forbidden in a commercial path.

For StoryCore/Obolune-facing production, fail closed when:

- the weights licence is unknown;
- the licence is non-commercial and the requested path is commercial;
- output terms prevent the intended distribution;
- attribution/provenance requirements cannot be satisfied.

This specifically means that a useful open-source architecture may be studied or
adapted without making its restricted weights a production dependency.

## Validation order

1. JSON/schema and reference integrity.
2. Licence/provenance gate.
3. Plan-level checks: duration, section ordering, cue references and bounded
   values.
4. Adapter execution with explicit requested/executed delta.
5. Technical audio checks.
6. Narrative checks: cue timing, dialogue masking, motif/scene consistency.
7. Optional human review.
8. Promotion to last-known-good only with evidence.

A failure keeps the candidate and diagnostics for comparison but leaves the
previous verified artefact intact.

## Benchmark contract

Do not compare only `model A` versus `model B`. Record the complete path:

`story fixture x model/provider x adapter/harness x hardware x parameters`

Minimum measures should include:

- successful render rate;
- plan fields honoured / dropped;
- latency and peak resource use when observable;
- duration/cue alignment error;
- narrative evaluator result;
- licence eligibility for the target use;
- human preference only when the comparison protocol records it explicitly.

A cheaper or smaller generator can therefore win when its harness better obeys
the plan.

## First implementation slice

1. Land the provider-neutral JSON schema.
2. Create three tiny synthetic fixtures: `full`, `guided`, `free`.
3. Add a validator that never invokes a music model.
4. Add one adapter interface with a mock provider first.
5. Only then evaluate external music backends.
6. Keep all external-model activation opt-in until real comparison evidence
   exists.

## Relationship to the Botte Secrète Execution Harness

When StoryCore runs under Botte Secrète, map:

- `MusicPlan` + narrative references -> context snapshot;
- provider capabilities -> capabilities;
- licence, VRAM, duration and budget -> constraints;
- provider execution report -> requested/executed delta;
- generated stems/mix -> candidate artefacts;
- validators -> evidence;
- previous accepted soundtrack -> recovery point;
- benchmark observations -> Capability Atlas.

StoryCore must remain usable without Botte; the interchange should stay a small
JSON/data contract rather than importing Botte as a hard runtime dependency.
