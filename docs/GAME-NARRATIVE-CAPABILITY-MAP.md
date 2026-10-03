# StoryCore — Game Narrative Capability Map

Status: **audited draft, not a commercial availability promise**. [COMM-06 audit](COMM-06-CAPABILITY-AUDIT.md) covers [#68](https://github.com/zedarvates/StoryCore-Engine/issues/68), pinned code, inspected tests, executed checks and the remaining acceptance gaps.

**EXPERIMENTAL** means a bounded implementation/prototype exists but the full outcome is not established. **PROPOSED** marks an unproven target composition. **ESTABLISHED** is reserved for an accepted reproducible path covering the named outcome; none of these broad customer outcomes meets that bar in this audit.

## Customer outcomes

| Outcome | Status | Evidence-supported wording | Limit before promotion |
|---|---|---|---|
| **Game Lore Builder** | **EXPERIMENTAL** | World/culture presets, structured world fields and a lore-generation prototype. | No reproduced acceptance for coherent history, factions, beliefs and chronology together. Wizard tests mock the store, persistence and child steps; the lore service contains non-TypeScript scaffolding and pasted test text. |
| **Story Builder** | **EXPERIMENTAL** | Template-based story structure, themes and emotional beats. | The tests verify structure; they do not establish original narrative quality, live generation or Story DNA consumption. |
| **Character Builder** | **EXPERIMENTAL** | Role/genre character sheets and heuristic relationship mapping. | No accepted end-to-end proof of meaningful motivation, development or consistent choices across an evolving story. |
| **Act Builder** | **EXPERIMENTAL** | Two/three-act templates, duration allocation and scene lists. | Game-specific transitions, player branches and dramatic quality remain outside the tested template scope. |
| **Scene Builder** | **EXPERIMENTAL** | Cinematic scene/dialogue records and a separate comic-panel narrative adapter. | No general playable-scene or cross-media adapter acceptance. Comic dialogue includes placeholders; Harbour fixture evidence is mocked. |
| **Quest Builder** | **EXPERIMENTAL** | Validation of hand-authored collect objectives, item references and rewards. | The v0.1 game compiler supports only collect objectives. It does not generate branching quests, conditional outcomes or a complete quest graph. |
| **Dialogue Builder** | **EXPERIMENTAL** | Linear dialogue templates and fixed localized NPC lines in the game contract. | Conditional dialogue trees, variants driven by game state and live-provider dialogue quality have no reproduced acceptance in this audit. |
| **Campaign Builder** | **PROPOSED** | Target outcome; no bounded campaign authoring/execution path identified in the inspected implementation and tests. | A campaign contract, persistent progression and long-form acceptance are still needed. Existing story-act templates are not campaign evidence. |
| **World Story Builder** | **PROPOSED** | Target composition of existing world prototypes and the separate experimental Story DNA contract. | No reproduced integrated lore/place/faction/event/quest graph or connected Story DNA adapter chain. Constituent schemas and world arrays do not prove that composition. |
| **Story-to-Game** | **EXPERIMENTAL** | Public game specification to deterministic manifest, with one Coinfall Godot fixture. | The Godot runtime record is dated 2026-08-30 and was not rerun in this audit. Arbitrary story/Story DNA conversion, other engines and production backend authority are not proven. |
| **Lore & Quest Checker** | **EXPERIMENTAL** | Typed quest references plus checks over declared canon entities, relations and timeline orders. | No general free-text contradiction, quest reachability or causal-dependency guarantee. Prose calibration is limited; live judge/embedding quality is unverified. |

Exact code/test/document references for every row are in the [audit findings](COMM-06-CAPABILITY-AUDIT.md#outcome-by-outcome-findings) and [evidence index](COMM-06-CAPABILITY-AUDIT.md#evidence-index). Tested template structure is not a claim of AI narrative quality or a finished customer workflow.

## Internal model

The target composition remains: idea/notes/wiki → Story DNA → entities/relations/timeline → arcs/acts/scenes → quests/dialogues → target adapters. **The complete chain is PROPOSED.**

[Story DNA v0 in #65](https://github.com/zedarvates/StoryCore-Engine/pull/65) is an **EXPERIMENTAL tested contract**: an existing mocked Harbour fixture, typed graph references and deterministic lossless round-trip of the DNA document. It is not a lossless migration of the Harbour project. The contract is on a separate draft branch, and adapters are not connected by this map.

The public StoryCore-to-game compiler consumes its own game specification and proves one bounded Coinfall fixture. It does not currently prove arbitrary Story DNA, video, comics or manga-to-game conversion.

## Publication rule

Keep this map in draft until the audit labels and narrower wording are reviewed. Preserve the status and gaps wherever an outcome is quoted. Promote a capability only with linked evidence at the relevant commit and acceptance for the advertised scope. Older runs, mocks, green builds and SonarQube gates must remain distinguished from current runtime evidence.
