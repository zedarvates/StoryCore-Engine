# Anna direct Host LLM structured-output request

Prepared on 2026-09-01. This is a support-question and bounded-probe plan; it
has not been sent and no model call was made for this investigation.

## StoryCore evidence

- StoryCore Harbour is a Schema 2, Host-API-only App with no Executa.
- Its current generation path is `anna.llm.complete` from the iframe bundle.
- The 2026-08-31 Gemma corpus measured 15/20. Four final repair responses were
  complete, non-truncated, and ended with `}`, but contained internal JSON
  syntax errors.
- A punctuation-only offline search could recover only two cases, projecting
  17/20; it does not justify a permissive production parser.

## Verified Anna surfaces

Anna supports structured output on Executa reverse sampling:

- `sampling/createMessage` accepts `responseFormat` with `json_object` or
  `json_schema` plus `onUnsupported`;
- the real bridge sends the negotiated value as `response_format` to the
  platform completion endpoint;
- CLI structured-output emulation exists for the sampling development path.

This support is not currently documented or typed for the iframe Host API
`anna.llm.complete`. Its published signature lists messages, `maxTokens`,
`modelPreferences`, `systemPrompt`, temperature, stop sequences, and metadata,
but no response-format field.

Local package inspection confirms the same boundary:

- pinned CLI 0.1.30 contains no `responseFormat`, `response_format`, or
  `onUnsupported` implementation;
- latest npm CLI 0.1.49 adds structured negotiation to its sampling bridge;
- CLI 0.1.49 still exposes no response-format field for direct Host
  `llm.complete`.

Moving StoryCore generation into an Executa only to obtain JSON Schema would
add a backend/distribution/permission boundary and violate the MVP's intended
Host-API-only architecture. Do not make that change without explicit product
and architecture approval.

## Current platform caution

The Anna Forum currently reports a Cloud Agent failure for `json_schema` even
with `onUnsupported=json_object`. Structured sampling is therefore not yet a
drop-in reliability proof for StoryCore.

Sources checked:

- <https://anna.partners/developers/reference/executa-agent-sessions/agent-complete>
- <https://forum.anna.partners/t/porting-a-multi-agent-sim-framework-to-anna-app-questions-before-the-hackathon/84>
- <https://forum.anna.partners/t/documentation-gaps-and-contradictions-after-beta-55-beta-96/211>
- <https://forum.anna.partners/>

## Ready-to-send question

```text
Hi Anna team — StoryCore Harbour is a Schema 2 Host-API-only App using direct
iframe anna.llm.complete, with no Executa. Our latest fixed Gemma corpus is
15/20; four failed repairs are complete/non-truncated responses with internal
JSON syntax errors.

The current sampling/createMessage path supports responseFormat
(json_object/json_schema) and onUnsupported, but the documented direct
anna.llm.complete signature and current CLI types do not expose those fields.

1. Does direct iframe anna.llm.complete currently accept responseFormat or
   response_format in production?
2. If yes, what exact wire shape and capability-negotiation response should a
   Schema 2 App use?
3. Is json_object supported for gemma-4-E4B-it/Runpod through the App-complete
   path?
4. Can unsupported structured output fail explicitly without silently falling
   back to prompt-only text?
5. Is there a recommended Host-API-only example or minimum runtime/CLI version?

We will not add an Executa, send another full corpus, or claim reliability from
an undocumented field. With confirmation, we can run one owner-authorized
single-prompt probe before considering any code change.
```

## Probe gate

Do not add an undocumented field to production or consume quota until Anna
confirms the direct Host API contract. If confirmed, implement the smallest
adapter-only opt-in and run one previously failing prompt first. A complete
corpus requires separate owner quota approval after that pilot succeeds.

## 2026-09-05 refresh

No newer public Anna reference or forum answer was found that adds
`responseFormat` to direct iframe `anna.llm.complete`. Anna CLI 0.1.51 was
inspected without installation into the project. Its real sampling bridge
negotiates `responseFormat` and forwards `response_format`, but its direct App
LLM bridge still exposes no structured-output contract. Do not upgrade the
pinned CLI merely for this issue and do not send an undocumented field to the
production endpoint.
