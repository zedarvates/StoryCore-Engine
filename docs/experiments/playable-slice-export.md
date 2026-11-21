# StoryCore export for a playable slice

This design addresses issue #69. The first export lets an author hand selected
narrative context and player experience intentions to a game designer for review.
Both the export format and a playable importer are proposals.

## Sources and boundaries

| Source | Reuse |
| --- | --- |
| [Story DNA v0](../../schemas/story-dna-v0.schema.json) | Resolve character, place, event and arc references against a validated document. Story DNA stores world facts and narrative events. |
| [Game Bridge v0.1](../../src/game_bridge/contract.py) | Resolve quest and NPC IDs and localized dialogue against a validated game spec when an author attaches one. The local Godot fixture supports one collect quest. |
| [Story DNA validation](story-dna-v0.md) | Pin the narrative source by revision and retain fixture provenance. Raw extensions remain outside the default export because their semantics and references are unchecked. |

A Story DNA event's narrative order can locate a beat in the story. The point
where the player learns a fact can differ. A secret can exist before the player
learns it, and the same event can be shown to different players at different
times. Keep the experience fields in a separate document with references to the
source records. Store emotions as author intentions. An observed player state
would be separate playtest evidence.

## Proposed first slice

1. Select one authored slice and its explicit allowlist of public story records.
   Record each source document's version, identifier and digest. Mark any
   mock source in the export.
2. Select the characters, lore, places and arcs relevant to the slice. Select
   act, scene, quest and dialogue references only where their owner supplies
   stable references and a resolver can check them. Story DNA v0 has no dedicated
   act, scene, quest or dialogue records. Game Bridge v0.1 embeds localized NPC
   lines and gives those lines no stable IDs. A first export can attach an NPC
   with its ordered, localized lines, or omit dialogue references.
3. Order the experience beats. For each beat, provide the selected narrative or
   game reference, the player knowledge expected before it, the public fact
   intended to become known after it, and an optional intended emotion. The
   order is the author's intended gameplay order. Each knowledge change points
   to an explicitly selected, public record.
4. Resolve and type-check each reference against its pinned source. Report stale,
   missing, ambiguous or private references with the field path. A selection
   must include all public IDs required by its exported references. Keep raw
   extensions, private notes, unselected records and local paths out of the
   serialized payload. Re-exporting identical inputs should preserve the same
   bytes, including beat order.

The export is a reviewable sidecar. Game Bridge should continue validating its
existing game spec, compiling only that spec into the Godot manifest. A later
adapter would need explicit mapping and gameplay evidence to interpret an
experience beat as a trigger, branch or camera event.

## Fixtures for the first validation

- Use [Harbour Lanterns](../../tests/fixtures/story_dna/harbour-lanterns.json)
  to select Mei, the Old Ferry Pier and the shielding event. Verify the selected
  names, references and mock provenance. Use the author's intended reveal of
  Mei shielding the lantern as the proposed knowledge change. Keep the arc,
  quest and dialogue references empty.
- Use [Coinfall Chronicle](../../fixtures/storycore-game/coinfall-chronicle/storycore_game_spec.json)
  separately to check resolution of Lyra and the collect quest
  `relight_the_chronicle`. Verify the ordered EN and FR lines stay attached
  to Lyra when selected. Compile the unchanged game spec and compare its
  manifest digest with the fixture.
- Reject a selection with a missing or mistyped ID, a mismatched source digest,
  or a private record selected for a public beat. Exercise deterministic
  serialization, then verify the same physical narrative event can appear in a
  different player experience order without changing its Story DNA.
