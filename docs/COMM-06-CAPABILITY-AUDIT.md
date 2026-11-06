# COMM-06 capability audit

Audit date: 2026-10-03. Addresses [#68](https://github.com/zedarvates/StoryCore-Engine/issues/68) before any commercial publication of [#67](https://github.com/zedarvates/StoryCore-Engine/pull/67).

The reviewed implementation is pinned to `ab9f613665cfd7d19b37b360fdff68c8541667d0`; the original #67 head `38ef46631cbf3b1bcba495f7ad5c59be1cbfbbe9` changes only the capability-map document. The separate Story DNA change is pinned to [#65 at `9146e0804123ae5ca3c5ab93fa35af111e09f1c5`](https://github.com/zedarvates/StoryCore-Engine/commit/9146e0804123ae5ca3c5ab93fa35af111e09f1c5). It is not assumed to be merged into the audited base.

## Result and status rule

**Nine outcomes are EXPERIMENTAL; Campaign Builder and World Story Builder are PROPOSED. No broad customer outcome is promoted to ESTABLISHED by this audit.** Several deterministic primitives are tested; that narrower fact must remain visible.

- **ESTABLISHED** requires a reproducible accepted path covering the named outcome, with its actual supported scope and limitations.
- **EXPERIMENTAL** means a bounded implementation or prototype exists, while part of the advertised outcome or its integrated acceptance is missing.
- **PROPOSED** means the advertised composition has no reproduced implementation/acceptance path in the inspected evidence. It does not mean that every constituent primitive is absent.
- A type, filename, prompt, issue, mocked test, successful build or green static-analysis gate cannot alone establish a customer capability. Test assertions and execution scope matter.

The status applies to the whole named outcome, not to a renamed low-level helper. These are documentation findings, not implementation of missing features.

## Outcome-by-outcome findings

| Outcome | Status | Evidence-supported scope | Remaining gap | Evidence |
|---|---|---|---|---|
| Game Lore Builder | **EXPERIMENTAL** | World/culture presets, structured world fields and a lore-generation prototype. | No reproduced acceptance for coherent history, factions, beliefs and chronology together. Wizard tests mock the store, persistence and child steps; the lore service contains non-TypeScript scaffolding and pasted test text. | [W1](#w1), [W2](#w2), [W3](#w3), [W4](#w4), [W5](#w5), [W6](#w6) |
| Story Builder | **EXPERIMENTAL** | Template-based story structure, themes and emotional beats. | The tests verify structure; they do not establish original narrative quality, live generation or Story DNA consumption. | [S1](#s1), [S2](#s2) |
| Character Builder | **EXPERIMENTAL** | Role/genre character sheets and heuristic relationship mapping. | No accepted end-to-end proof of meaningful motivation, development or consistent choices across an evolving story. | [C1](#c1), [C2](#c2) |
| Act Builder | **EXPERIMENTAL** | Two/three-act templates, duration allocation and scene lists. | Game-specific transitions, player branches and dramatic quality remain outside the tested template scope. | [S1](#s1), [S2](#s2) |
| Scene Builder | **EXPERIMENTAL** | Cinematic scene/dialogue records and a separate comic-panel narrative adapter. | No general playable-scene or cross-media adapter acceptance. Comic dialogue includes placeholders; Harbour fixture evidence is mocked. | [S1](#s1), [S2](#s2), [D1](#d1), [D2](#d2), [X1](#x1), [H1](#h1) |
| Quest Builder | **EXPERIMENTAL** | Validation of hand-authored collect objectives, item references and rewards. | The v0.1 game compiler supports only collect objectives. It does not generate branching quests, conditional outcomes or a complete quest graph. | [G1](#g1), [G2](#g2), [G3](#g3) |
| Dialogue Builder | **EXPERIMENTAL** | Linear dialogue templates and fixed localized NPC lines in the game contract. | Conditional dialogue trees, variants driven by game state and live-provider dialogue quality have no reproduced acceptance in this audit. | [D1](#d1), [D2](#d2), [G1](#g1), [G3](#g3) |
| Campaign Builder | **PROPOSED** | Target outcome; no bounded campaign authoring/execution path identified in the inspected implementation and tests. | A campaign contract, persistent progression and long-form acceptance are still needed. Existing story-act templates are not campaign evidence. | [S1](#s1), [S2](#s2) |
| World Story Builder | **PROPOSED** | Target composition of existing world prototypes and the separate experimental Story DNA contract. | No reproduced integrated lore/place/faction/event/quest graph or connected Story DNA adapter chain. Constituent schemas and world arrays do not prove that composition. | [W3](#w3), [W5](#w5), [G1](#g1) |
| Story-to-Game | **EXPERIMENTAL** | Public game specification to deterministic manifest, with one Coinfall Godot fixture. | The Godot runtime record is dated 2026-08-30 and was not rerun in this audit. Arbitrary story/Story DNA conversion, other engines and production backend authority are not proven. | [G1](#g1), [G2](#g2), [G3](#g3), [G4](#g4) |
| Lore & Quest Checker | **EXPERIMENTAL** | Typed quest references plus checks over declared canon entities, relations and timeline orders. | No general free-text contradiction, quest reachability or causal-dependency guarantee. Prose calibration is limited; live judge/embedding quality is unverified. | [G1](#g1), [G2](#g2), [N1](#n1), [N2](#n2), [N3](#n3) |

For World Story Builder, the [Story DNA schema](https://github.com/zedarvates/StoryCore-Engine/blob/9146e0804123ae5ca3c5ab93fa35af111e09f1c5/schemas/story-dna-v0.schema.json), [tests](https://github.com/zedarvates/StoryCore-Engine/blob/9146e0804123ae5ca3c5ab93fa35af111e09f1c5/tests/test_story_dna.py) and [contract limits](https://github.com/zedarvates/StoryCore-Engine/blob/9146e0804123ae5ca3c5ab93fa35af111e09f1c5/docs/experiments/story-dna-v0.md) are additional experimental evidence. They validate a graph and JSON round-trip, not the proposed connected builder.

## Executed evidence and limits

The focused local command below passed **139 tests** on Python 3.12.14. It ran against the original #67 checkout; implementation files match the pinned base above. No model, paid provider, Godot process or production backend was exercised.

```bash
python -m pytest -q \
  tests/game_bridge/test_contract.py \
  tests/unit/test_world_config_generator.py \
  tests/unit/test_character_generator.py \
  tests/unit/test_story_structure_generator.py \
  tests/unit/test_dialogue_script_generator.py \
  tests/unit/test_narrative_integrity_core.py \
  tests/unit/test_narrative_integrity_detectors.py \
  tests/unit/test_narrative_integrity_engine.py
```

The separate #65 contract suite passed **37 tests** locally. Its [GitHub run](https://github.com/zedarvates/StoryCore-Engine/actions/runs/37124506171) succeeded on the exact `9146e0804123ae5ca3c5ab93fa35af111e09f1c5` head, with successful Python 3.11 and 3.12 jobs. It preserves the existing Harbour fixture's mock provenance. No Story DNA runtime adapter is exercised.

The game tests recheck deterministic compilation, fail-closed validation, tamper rejection and checked-in evidence/source hashes. They do **not** rerun the older Godot play-through. [The runtime record](https://github.com/zedarvates/StoryCore-Engine/blob/ab9f613665cfd7d19b37b360fdff68c8541667d0/fixtures/storycore-game/coinfall-chronicle/godot/godot_smoke_evidence.json) says 2026-08-30 and covers one fixture. [The fixture acceptance gate](https://github.com/zedarvates/StoryCore-Engine/blob/ab9f613665cfd7d19b37b360fdff68c8541667d0/fixtures/storycore-game/coinfall-chronicle/README.md) still calls it experimental pending Quality Gate and human boundary review.

The world-wizard integration tests were inspected, **not executed in this audit**, and mock important collaborators. The legacy WorldBuilderService file contains scaffold text and embedded tests; its class/method names are not proof that it builds. Prose calibration records a grouped AUC of 0.49 for the documented small machine-origin corpus; this is not a measurement of quest correctness and must not be marketed as a reliable AI-origin detector.

UI/application acceptance remains a separate gap. The dependency reviews of [#70](https://github.com/zedarvates/StoryCore-Engine/pull/70) and [#63](https://github.com/zedarvates/StoryCore-Engine/pull/63) reproduce root/config/UI build blockers. Their dependency and static-analysis results do not establish video, comics, manga or game runtime behavior.

## Safe wording and publication decision

Use the narrowed scope in the table with its EXPERIMENTAL status. Describe Campaign Builder and World Story Builder as planned capabilities. Do not claim automatic story-to-game conversion, arbitrary quest/dialogue branching, complete campaign creation, general lore correctness or a working end-to-end Story DNA pipeline.

The existing comic adapter does not establish a Story DNA-to-comic/manga contract. The mocked Harbour fixture does not establish a live video-generation workflow. Each media adapter needs its own reproducible acceptance before the composition is promoted.

Keep #67 in draft pending review of these labels and limits. This audit adds no missing feature, assigns no owner or deadline and does not close #68; final acceptance of the audit remains a review decision.

## Evidence index

### W1

[Visual/world configuration templates](https://github.com/zedarvates/StoryCore-Engine/blob/ab9f613665cfd7d19b37b360fdff68c8541667d0/src/end_to_end/world_config_generator.py)

### W2

[Culture generation templates](https://github.com/zedarvates/StoryCore-Engine/blob/ab9f613665cfd7d19b37b360fdff68c8541667d0/src/world_generation_engine.py)

### W3

[World wizard model and culture fields](https://github.com/zedarvates/StoryCore-Engine/blob/ab9f613665cfd7d19b37b360fdff68c8541667d0/creative-studio-ui/src/types/world.ts)

### W4

[World wizard tests with mocked store, persistence and steps](https://github.com/zedarvates/StoryCore-Engine/blob/ab9f613665cfd7d19b37b360fdff68c8541667d0/creative-studio-ui/src/components/wizard/world-builder/__tests__/WorldBuilderWizard.integration.test.tsx)

### W5

[Lore orchestration prototype, including embedded scaffolding/test text](https://github.com/zedarvates/StoryCore-Engine/blob/ab9f613665cfd7d19b37b360fdff68c8541667d0/src/services/world-builder/WorldBuilderService.ts)

### S1

[Story/act/scene and emotional-arc templates](https://github.com/zedarvates/StoryCore-Engine/blob/ab9f613665cfd7d19b37b360fdff68c8541667d0/src/end_to_end/story_structure_generator.py)

### S2

[Executed story structure tests](https://github.com/zedarvates/StoryCore-Engine/blob/ab9f613665cfd7d19b37b360fdff68c8541667d0/tests/unit/test_story_structure_generator.py)

### C1

[Role/genre character sheets and relationship mapping](https://github.com/zedarvates/StoryCore-Engine/blob/ab9f613665cfd7d19b37b360fdff68c8541667d0/src/end_to_end/character_generator.py)

### C2

[Executed character generator tests](https://github.com/zedarvates/StoryCore-Engine/blob/ab9f613665cfd7d19b37b360fdff68c8541667d0/tests/unit/test_character_generator.py)

### D1

[Linear dialogue/scene templates](https://github.com/zedarvates/StoryCore-Engine/blob/ab9f613665cfd7d19b37b360fdff68c8541667d0/src/end_to_end/dialogue_script_generator.py)

### D2

[Executed dialogue generator tests](https://github.com/zedarvates/StoryCore-Engine/blob/ab9f613665cfd7d19b37b360fdff68c8541667d0/tests/unit/test_dialogue_script_generator.py)

### G1

[Fail-closed public game compiler; collect objectives only](https://github.com/zedarvates/StoryCore-Engine/blob/ab9f613665cfd7d19b37b360fdff68c8541667d0/src/game_bridge/contract.py)

### G2

[Executed game contract, deterministic output and evidence-hash tests](https://github.com/zedarvates/StoryCore-Engine/blob/ab9f613665cfd7d19b37b360fdff68c8541667d0/tests/game_bridge/test_contract.py)

### G3

[Coinfall fixture scope and acceptance gate](https://github.com/zedarvates/StoryCore-Engine/blob/ab9f613665cfd7d19b37b360fdff68c8541667d0/fixtures/storycore-game/coinfall-chronicle/README.md)

### G4

[Older Godot runtime evidence, observed 2026-08-30](https://github.com/zedarvates/StoryCore-Engine/blob/ab9f613665cfd7d19b37b360fdff68c8541667d0/fixtures/storycore-game/coinfall-chronicle/godot/godot_smoke_evidence.json)

### N1

[Declared canon entity/relation/timeline inspection](https://github.com/zedarvates/StoryCore-Engine/blob/ab9f613665cfd7d19b37b360fdff68c8541667d0/src/narrative_integrity/canon.py)

### N2

[Executed integrity engine tests](https://github.com/zedarvates/StoryCore-Engine/blob/ab9f613665cfd7d19b37b360fdff68c8541667d0/tests/unit/test_narrative_integrity_engine.py)

### N3

[Calibration limits and grouped AUC 0.49; not general AI-origin detection](https://github.com/zedarvates/StoryCore-Engine/blob/ab9f613665cfd7d19b37b360fdff68c8541667d0/docs/superpowers/specs/2026-09-21-narrative-integrity-engine-design.md)

### X1

[Comic narrative adapter, with placeholder dialogue](https://github.com/zedarvates/StoryCore-Engine/blob/ab9f613665cfd7d19b37b360fdff68c8541667d0/addons/official/comic_generator/src/narrative_adapter.py)

### H1

[Public mocked Harbour source fixture](https://github.com/zedarvates/StoryCore-Engine/blob/ab9f613665cfd7d19b37b360fdff68c8541667d0/apps/storycore-harbour/fixtures/happy-path.jsonl)

### W6

[Executed world-config generator tests](https://github.com/zedarvates/StoryCore-Engine/blob/ab9f613665cfd7d19b37b360fdff68c8541667d0/tests/unit/test_world_config_generator.py)

