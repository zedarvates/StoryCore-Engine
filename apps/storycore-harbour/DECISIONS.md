# Architecture and product decisions

## Accepted

### ADR-001 — Name

**Decision:** use the working name `StoryCore Harbour`.

**Reason:** the name connects naturally to Hong Kong and communicates a place where creative material is organized before departure into production. It is understandable internationally and remains tied to the StoryCore parent product.

**Status:** working name pending final availability and brand clearance.

### ADR-002 — Product slice

**Decision:** ship concept/script to production package, not text-to-video.

**Reason:** a structured result is faster, cheaper, more reliable, and independently useful. Video generation would introduce GPU/provider failures into the meaningful completion path.

### ADR-003 — Host API first

**Decision:** use `anna.llm.complete`, `anna.storage`, and `anna.window` directly from a schema 2 UI bundle.

**Reason:** avoids provider keys, custom hosting, a local runtime requirement, and developer-paid inference.

### ADR-004 — No Executa in 0.1

**Decision:** required and optional Executa arrays remain empty.

**Revisit when:** official Anna validation or a measured browser limitation prevents deterministic contract validation.

### ADR-005 — Versioned interchange contract

**Decision:** exported projects use `storycore-harbour.project.v1`.

**Reason:** keeps the Anna adapter replaceable and enables a future StoryCore Desktop importer without coupling the products.

### ADR-006 — One repair attempt

**Decision:** malformed LLM output receives one bounded repair call, then fails visibly.

**Reason:** avoids infinite cost/latency loops and prevents fabricated silent fallback.

## Pending external confirmation from Anna

- current Developer Terms accepted in the console;
- written definition of the announced 70% eligible usage profit;
- whether Host-API-only schema 2 runs qualify without a local runtime;
- exact Qualified App MAU visibility;
- self-service versus manually granted developer activation;
- launch and marketplace support;
- availability of `storycore-harbour` and `storycore-labs`.

## Decision log template

```text
### ADR-NNN — Title
Decision:
Reason:
Alternatives:
Consequences:
Evidence:
Status:
```
