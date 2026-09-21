"""The node vector: Unicode safe, honestly labelled, and replaceable.

Before this work, an accented French name raised IndexError inside the vector helper, so
adding a character called Therese with an accent crashed the graph.
"""

import math

import pytest

from src.assistant.knowledge_graph import (
    StoryGraph,
    VECTOR_REPRESENTATION,
    _cosine_similarity,
    _text_vector,
    get_embedder,
    set_embedder,
    vector_representation,
)


class FakeEmbedder:
    representation = "fake-embedding-v1"

    def __init__(self):
        self.seen = []

    def __call__(self, text):
        self.seen.append(text)
        return [0.5, 0.5]


@pytest.fixture(autouse=True)
def restore_default_embedder():
    """An injected embedder must never leak into another test."""

    yield
    set_embedder(None)


def test_an_accented_french_name_no_longer_crashes():
    vector = _text_vector("Thérèse")
    assert len(vector) == 26


def test_folding_makes_accented_and_plain_forms_comparable():
    accented = _text_vector("Thérèse")
    plain = _text_vector("Therese")
    assert _cosine_similarity(accented, plain) == pytest.approx(1.0, abs=1e-9)


def test_ligatures_are_expanded():
    assert _cosine_similarity(_text_vector("coeur"), _text_vector("cœur")) == pytest.approx(
        1.0, abs=1e-9
    )


def test_unaccented_behaviour_is_unchanged():
    a_only = _text_vector("aaa")
    assert a_only[0] == pytest.approx(1.0, abs=1e-9)
    assert sum(a_only[1:]) == 0.0
    z_only = _text_vector("zzzz")
    assert z_only[25] == pytest.approx(1.0, abs=1e-9)


def test_vectors_remain_normalised():
    for sample in ("hello", "Thérèse", "cœur", "a b c"):
        magnitude = math.sqrt(sum(value * value for value in _text_vector(sample)))
        assert magnitude == pytest.approx(1.0, abs=1e-6)


def test_other_scripts_are_ignored_rather_than_indexing_out_of_range():
    assert sum(_text_vector("東京")) == 0.0
    assert sum(_text_vector("Насос")) == 0.0


def test_vectors_of_different_lengths_never_produce_a_plausible_number():
    assert _cosine_similarity([1.0, 0.0], [1.0, 0.0, 0.0]) == 0.0
    assert _cosine_similarity([], []) == 0.0


def test_a_graph_accepts_a_french_name():
    graph = StoryGraph()
    graph.add_node("Thérèse", "character")
    graph.add_node("Gandalf", "character")
    assert graph.stats()["nodes"] == 2
    similar = graph.find_similar_entities("Therese", top_k=2)
    # A node vector covers the name and the entity type, so an exact name match does not
    # reach 1.0. What matters is that the accented node wins and beats an unrelated one.
    assert similar[0][0] == "Thérèse"
    assert similar[0][1] > similar[1][1]
    assert similar[0][1] > 0.8


def test_a_graph_saved_with_the_default_representation_reloads(tmp_path):
    path = tmp_path / "graph.json"
    graph = StoryGraph(persistence_path=path)
    graph.add_node("Gandalf", "character")
    graph.add_edge("Gandalf", "ally_of", "Frodo")
    graph.save()

    reloaded = StoryGraph(persistence_path=path)
    stats = reloaded.stats()
    assert stats["nodes"] == 2
    assert stats["vector_representation"] == VECTOR_REPRESENTATION
    for node in reloaded._nodes.values():
        assert len(node.vector) == 26
    assert reloaded.find_similar_entities("Gandalf", top_k=1)[0][0] == "Gandalf"


def test_an_embedder_can_be_injected_and_removed():
    assert vector_representation() == VECTOR_REPRESENTATION
    embedder = FakeEmbedder()
    set_embedder(embedder)
    assert vector_representation() == "fake-embedding-v1"
    assert get_embedder() is embedder

    graph = StoryGraph()
    graph.add_node("Ida", "character")
    node = next(iter(graph._nodes.values()))
    assert node.vector == [0.5, 0.5]
    assert graph.stats()["vector_representation"] == "fake-embedding-v1"
    assert graph.find_similar_entities("Ida", top_k=1)

    set_embedder(None)
    assert vector_representation() == VECTOR_REPRESENTATION
    assert len(get_embedder()("Ida")) == 26


def test_the_helper_is_documented_as_lexical_not_semantic():
    docstring = _text_vector.__doc__ or ""
    assert "lexical" in docstring
    assert "not a semantic embedding" in docstring
    assert "set_embedder" in docstring
