"""Retrieval on the canon, and the grounding it gives the judge."""

import pytest

from src.narrative_integrity import (
    CanonInput,
    IntegrityInput,
    NarrativeIntegrityEngine,
)
from src.narrative_integrity.llm_judge import SYSTEM_PROMPT, LLMJudge
from src.narrative_integrity.retrieval import (
    LexicalIndex,
    canon_context,
    canon_documents,
    canon_index,
)

FIXED_NOW = "2026-09-21T00:00:00"


def sample_canon():
    return CanonInput(
        entities=[
            {"name": "Ida", "kind": "character", "aliases": ["Ida Voss"]},
            {"name": "Lyon", "kind": "location"},
        ],
        relations=[{"subject": "Ida", "predicate": "vit_a", "object": "Lyon"}],
        timeline=[{"label": "s1", "order": 1}],
    )


class CapturingTransport:
    name = "capture"
    model = "capture-model"

    def __init__(self, response='{"findings": []}'):
        self.response = response
        self.prompts = []

    def complete(self, prompt, system):
        self.prompts.append(prompt)
        return self.response


def test_the_index_ranks_the_most_relevant_document_first():
    index = LexicalIndex()
    index.add("a", "Relation Ida vit a Lyon")
    index.add("b", "Entite Lyon, type location")
    index.add("c", "Chronologie s1, ordre 1")
    hits = index.search("Ida rejoint Lyon", limit=3)
    assert hits[0]["doc_id"] == "a"
    assert "c" not in [hit["doc_id"] for hit in hits]


def test_the_index_is_deterministic():
    index = LexicalIndex()
    for name in ("alpha beta", "beta gamma", "gamma delta"):
        index.add(name, name)
    first = index.search("beta gamma", limit=3)
    second = index.search("beta gamma", limit=3)
    assert first == second


def test_an_empty_query_and_an_empty_index_return_nothing():
    assert LexicalIndex().search("Ida") == []
    index = LexicalIndex()
    index.add("a", "Ida")
    assert index.search("") == []
    assert index.search("Ida", limit=0) == []


def test_a_query_with_no_overlap_returns_nothing():
    index = LexicalIndex()
    index.add("a", "Ida vit a Lyon")
    assert index.search("xyzabc") == []


def test_a_common_token_weighs_less_than_a_rare_one():
    index = LexicalIndex()
    for position in range(6):
        index.add("common-%d" % position, "village commun")
    index.add("rare", "village Gisors")
    hits = index.search("Gisors", limit=2)
    assert hits[0]["doc_id"] == "rare"


def test_canon_documents_cover_entities_relations_and_timeline():
    documents = canon_documents(sample_canon())
    kinds = {document["payload"]["kind"] for document in documents}
    assert kinds == {"entity", "relation", "timeline"}
    assert any("Ida Voss" in document["text"] for document in documents)


def test_an_entity_without_a_name_is_skipped():
    canon = CanonInput(entities=[{"kind": "character"}, {"name": "Ida", "kind": "character"}])
    documents = canon_documents(canon)
    assert len(documents) == 1
    assert documents[0]["payload"]["name"] == "Ida"


def test_the_index_covers_every_canon_document():
    assert len(canon_index(sample_canon())) == len(canon_documents(sample_canon()))


def test_the_context_block_lists_the_relevant_facts():
    context = canon_context(sample_canon(), "Ida quitte Lyon au matin.")
    assert context.startswith("Faits de canon pertinents :")
    assert "Ida" in context
    assert "Lyon" in context


def test_nothing_is_invented_when_nothing_matches():
    assert canon_context(sample_canon(), "zzz qqq") == ""
    assert canon_context(None, "Ida") == ""
    assert canon_context(CanonInput(), "Ida") == ""


def test_the_context_is_reproducible():
    canon = sample_canon()
    first = canon_context(canon, "Ida et Lyon")
    second = canon_context(canon, "Ida et Lyon")
    assert first == second


def test_the_engine_feeds_the_retrieved_canon_to_the_judge():
    transport = CapturingTransport()
    engine = NarrativeIntegrityEngine(judge=LLMJudge(transport))
    report = engine.run(
        IntegrityInput(
            project_id="p",
            artifact="a",
            text="Ida quitte Lyon au matin et marche vers le nord.",
            canon=sample_canon(),
            canon_ref="v1",
        ),
        now=FIXED_NOW,
    )
    assert transport.prompts, "the judge must have been asked something"
    prompt = transport.prompts[0]
    assert "Faits de canon pertinents" in prompt
    assert "Ida" in prompt
    prose = [layer for layer in report.to_dict()["layers"] if layer["layer"] == "L3"][0]
    assert prose["metrics"]["judge"]["canon_context_chars"] > 0


def test_without_a_canon_the_prompt_carries_no_facts():
    transport = CapturingTransport()
    engine = NarrativeIntegrityEngine(judge=LLMJudge(transport))
    engine.run(
        IntegrityInput(project_id="p", artifact="a", text="Un texte sans canon."),
        now=FIXED_NOW,
    )
    assert "Faits de canon pertinents" not in transport.prompts[0]


def test_a_canon_with_nothing_relevant_grounds_nothing():
    transport = CapturingTransport()
    engine = NarrativeIntegrityEngine(judge=LLMJudge(transport))
    canon = CanonInput(entities=[{"name": "Zephyrin", "kind": "character"}])
    engine.run(
        IntegrityInput(
            project_id="p", artifact="a", text="Le chat dort.", canon=canon
        ),
        now=FIXED_NOW,
    )
    assert "Faits de canon pertinents" not in transport.prompts[0]


def test_the_system_prompt_grounds_the_judge_in_the_supplied_facts():
    assert "font reference" in SYSTEM_PROMPT
    assert "n'inventes aucun fait" in SYSTEM_PROMPT
