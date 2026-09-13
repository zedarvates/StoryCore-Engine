# StoryCore Music Planning Layer v1

Status: **experimental contract; provider-neutral; no provider activated**.

## Goal

Insert an editable symbolic planning layer between narrative intent and any music
generator. StoryCore should be able to inspect, compare, revise and version a
score plan without coupling the project to one model or one licence regime.

```text
story / scene / shot intent
        |
        v
MusicPlan v1
        |
        v
Draft 2020-12 schema + deterministic invariants
        |
        v
provider capability / licence check
        |
        v
requested vs executed delta
        |
        v
candidate artifact + portable handoff
        |
        v
independent validation later
        |
        v
last-known-good promotion outside provider adapter
```

The design is inspired by open-source workflows that expose an editable
intermediate representation, but this contract is StoryCore-owned and does not
require or redistribute third-party model weights.

## Three execution modes

- `full`: strongest symbolic plan; use where continuity, motifs, timing or
  reproducibility matter.
- `guided`: StoryCore fixes high-level structure and synchronization while the
  provider may elaborate details.
- `free`: narrative/time brief remains binding, but detailed symbolic planning
  is optional. It must not be represented as equivalent to a `full` render.

## Validation before inference

The model-free gate composes the repository's existing `jsonschema` dependency
with StoryCore-specific checks. It:

- validates the Draft 2020-12 schema itself;
- validates required fields and bounded values in a requested plan;
- rejects invalid section timing and overlaps;
- checks unique IDs and motif references;
- checks cue bounds;
- rejects declared non-commercial model weights on commercial targets;
- treats known unknown/unqualified model-weight licence markers as ineligible
  for commercial use.

The reference fixtures cover `full`, `guided`, and `free`. No LLM, music model,
network request or weight download is needed for this gate.

## Explicit degradation

`execution_delta(requested, executed)` is recursive. It records mode changes,
removed or added fields, changed scalar values, list-length changes and nested
changes. Examples include:

```text
mode:full->guided
dropped:motifs
changed:duration_seconds
changed:sync_cues.length
changed:sync_cues[0].time_seconds
```

A provider must never silently change requested state.

`MockMusicProvider` is deterministic and performs no inference. A fully capable
mock keeps the requested state unchanged. A limited mock may use an explicit
fallback and list unsupported fields, but any material delta requires a
non-empty degradation reason or the preparation fails closed.

## Portable provider handoff

`build_provider_handoff()` creates a data-only interchange envelope containing:

- plan ID;
- provider/version/model;
- adapter/harness and hardware identity;
- requested/executed modes;
- unsupported fields, deltas, reason and acknowledgement;
- candidate artifact identity and optional digests;
- verification state and evidence references.

It does not import Botte Secrète, execute a provider or write memory. Provider
results remain candidates. The envelope always carries
`activation_allowed=false`, `promoted=false` and
`memory_write_performed=false`. A `verified` handoff requires evidence.

## Commercial boundary

Code, model weights, datasets and assets retain separate provenance/licences.
Permissive adapter code cannot make restricted model weights commercially
usable. Non-commercial or unknown/unqualified weights remain outside the
StoryCore/Obolune commercial path until independently qualified.

## Benchmark identity

Future measurements must retain the complete path:

`story fixture x model/provider x adapter/harness x hardware x parameters`

A model-only score is insufficient because the harness can materially change
plan preservation, failures, quality, latency and resource use.

## Current proof boundary

The isolated `MusicPlan Contract` workflow runs on Python 3.10 and 3.12. It
installs only focused test/schema dependencies, compiles the MusicPlan/provider
contracts, executes the focused regression suite, checks the Draft 2020-12
schema, and validates all three reference fixtures against it.

Exact-head CI remains the authority for PR claims. This contract does **not**
prove real audio quality, a production provider, output rights beyond the
explicit licence policy, hardware performance, end-to-end StoryCore integration,
or last-known-good audio recovery.

## Relationship to Botte Secrète

StoryCore remains standalone. A future Botte integration should consume the
portable handoff as data rather than importing Botte as a hard runtime
dependency. Conceptually:

- MusicPlan + narrative refs -> context snapshot;
- provider capabilities/licence/hardware -> constraints;
- provider handoff -> execution delta + candidate artifact;
- independent validators -> evidence;
- accepted soundtrack -> recovery point;
- measured provider runs -> Capability Atlas observations.

## Next bounded slice

Before any real provider is connected, add deterministic artifact-digest and
independent-verification fixtures around the portable handoff. Real local or
external music inference waits for explicit licence/hardware qualification and
must remain non-promoting by default.
