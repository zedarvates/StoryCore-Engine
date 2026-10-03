# Story DNA v0: tested experimental contract

This is the bounded first slice of #64 / #65. It validates a narrative graph and
round-trips JSON. It does not migrate project files or implement a generator,
Story-to-Game adapter, video renderer, comic layout or manga export.

## Existing fixture and provenance

`tests/fixtures/story_dna/harbour-lanterns.json` is a partial projection of the
existing public `apps/storycore-harbour/fixtures/happy-path.jsonl`. The test pins
the source Git blob, checks the title, character goal/conflict, place and action
against the original, and preserves its `mock: true` provenance. It introduces
no new story, invented missing-parent resolution or provider success claim.

The fixture records Mei, the pier and the shielding action as narrative data.
Shot framing, camera, audio, generation prompts, durations and image-generation
settings are not part of this media-neutral projection. This is **not** a
lossless round-trip of the Harbour project; the lossless promise begins at the
Story DNA document. The original Harbour fixture is unchanged.

## Contract

- Version is `0.1-experimental`; entity kinds are character, place, faction,
  object and concept.
- Graph IDs must be nonblank and unique across entities, events, relationships
  and arcs. Story ID identifies the document, outside that graph namespace.
- Event participants and relationship endpoints refer to entities; location
  refers to a place; causes, consequences and arc event IDs refer to events.
  Arc entity IDs refer to entities.
- `order` is an optional nonnegative narrative ordinal, not a duration, clock
  or proven historical chronology. Causal cycles and reciprocal causality are
  not interpreted or enforced in this slice.
- Relationships require ID, source, target and type. Arcs require ID and an
  ordered event list. Empty collections are valid; this fixture provides no
  complete arc or causal graph.
- Extension fields remain allowed and round-trip unchanged. Motivations and
  secrets can be carried as JSON data; their meaning, access rules and every
  reference inside an extension are **not** validated.
- Only finite JSON data is accepted. Duplicate JSON keys, non-string object
  keys and silent tuple-to-array conversion are rejected.

`src.story_dna` exposes `validate_story_dna`, `dumps_story_dna` and
`loads_story_dna`. Serialization sorts object keys, preserves array order and
Unicode, uses compact separators and ends with one newline. It is a stable
Python JSON wire format, **not** a claim of RFC 8785 interoperability.

## Reproduce

```bash
python -m pip install 'pytest>=8,<10' 'jsonschema>=4.23,<5'
python -m pytest -q tests/test_story_dna.py
```

Tests cover source alignment, lossless extension/Unicode preservation,
independent process hash seeds, meaningful array order, duplicate IDs/keys,
typed unresolved references and invalid/non-finite data. The focused PR workflow
also checks Python 3.11 and 3.12; local evidence must be reported separately
from the workflow status.

The contract remains EXPERIMENTAL. Multiple independent fixtures, schema
evolution/migration rules, richer chronology and adapter-specific acceptance
are still open before any runtime or cross-media capability claim.
