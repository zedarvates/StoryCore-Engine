# StoryCore Music Planning Layer v1

Status: **experimental contract; provider-neutral; no provider activated**.

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
MusicPlan v1  <---- human/agent edits and deterministic validation
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

## Deterministic validation before inference

The model-free validator checks the invariants that JSON Schema alone cannot
express: positive bounded duration, ordered non-overlapping sections, unique
IDs, resolved motif references, cues inside duration, and the commercial
licence boundary. No LLM, music model, network request, or weight download is
needed for this gate.

The reference fixtures cover the `full`, `guided`, and `free` modes so future
providers are compared against the same small contracts rather than ad-hoc
prompts.

## Provider boundary and explicit degradation

Provider adapters translate `MusicPlan` into provider-specific inputs and return
an execution report containing at least:

- requested mode;
- executed mode;
- unsupported/dropped fields;
- an explicit reason when requested state cannot be preserved;
- model/provider identifier and version when available;
- model-weights licence and code licence separately;
- deterministic parameters or seed when supported;
- input and output artefact digests;
- runtime/hardware observations when measured;
- validation evidence references.

The deterministic `MockMusicProvider` proves this contract without performing
inference. A fully capable mock keeps the requested state unchanged. A limited
mock may fall back, for example from `full` to `guided`, but the delta and
unsupported fields are exposed and a non-empty degradation reason is mandatory.
A changed execution state without that reason fails closed.

The provider result remains a **candidate**. The mock contract explicitly keeps
`activation_allowed=false`, `promoted=false`, and
`executed_external_model=false`. The provider adapter cannot promote its own
output to last-known-good; promotion belongs to a separate validation/harness
step.

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
4. Adapter preparation with explicit requested/executed delta.
5. Technical audio checks after a real provider exists.
6. Narrative checks: cue timing, dialogue masking, motif/scene consistency.
7. Optional human review.
8. Promotion to last-known-good only with independent evidence.

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

## Current proof boundary

The isolated `MusicPlan Contract` workflow compiles `src/music_plan.py` and
`src/music_provider.py`, runs the focused contract tests, and parses the schema
and fixtures on Python 3.10 and 3.12. Claims about this slice must remain bound
to an exact-head successful run.

This slice does **not** generate music, benchmark audio quality, choose a
production provider, download weights, call a remote service, authorize a
release, or authorize a merge.

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

## Next bounded slice

Define a provider-neutral handoff/evidence envelope carrying the execution delta,
provider/harness/hardware identity, candidate artifact reference, verification
state, and explicit non-activation/non-promotion flags. Only after that envelope
is proven should a real local or external music backend be measured.
