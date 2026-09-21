"""The semantic embedder: contract tested offline, live path declared unproven."""

import pytest

import src.assistant.semantic_embedder as semantic_embedder
from src.assistant.knowledge_graph import (
    StoryGraph,
    _cosine_similarity,
    set_embedder,
    vector_representation,
)
from src.assistant.semantic_embedder import EmbeddingUnavailable, OllamaEmbedder


@pytest.fixture(autouse=True)
def restore_default_embedder():
    yield
    set_embedder(None)


def fake_post(vectors):
    calls = []

    def post(payload):
        calls.append(payload)
        return {"embeddings": vectors}

    post.calls = calls
    return post


def test_vectors_are_returned_and_the_dimension_is_recorded():
    embedder = OllamaEmbedder(
        model="fake-embed", post=fake_post([[1.0, 0.0, 0.0], [0.0, 1.0, 0.0]])
    )
    vectors = embedder.embed(["un", "deux"])
    assert vectors == [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0]]
    assert embedder.dimension == 3
    assert embedder.representation == "ollama:fake-embed:dim3"


def test_the_label_is_honest_before_any_call():
    assert OllamaEmbedder(model="fake-embed", post=fake_post([])).representation == (
        "ollama:fake-embed"
    )


def test_the_request_carries_the_model_and_the_inputs():
    post = fake_post([[0.5, 0.5]])
    OllamaEmbedder(model="fake-embed", post=post).embed(["un texte"])
    assert post.calls == [{"model": "fake-embed", "input": ["un texte"]}]


def test_no_inputs_means_no_call():
    post = fake_post([])
    assert OllamaEmbedder(post=post).embed([]) == []
    assert post.calls == []


def test_a_wrong_number_of_vectors_is_refused():
    embedder = OllamaEmbedder(post=fake_post([[1.0], [2.0]]))
    with pytest.raises(EmbeddingUnavailable):
        embedder.embed(["un seul texte"])


def test_a_missing_embeddings_field_is_refused():
    embedder = OllamaEmbedder(post=lambda payload: {"error": "not implemented"})
    with pytest.raises(EmbeddingUnavailable):
        embedder.embed(["un texte"])


def test_an_empty_vector_is_refused():
    embedder = OllamaEmbedder(post=fake_post([[]]))
    with pytest.raises(EmbeddingUnavailable):
        embedder.embed(["un texte"])


def test_differing_lengths_are_refused():
    embedder = OllamaEmbedder(post=fake_post([[1.0, 2.0], [1.0, 2.0, 3.0]]))
    with pytest.raises(EmbeddingUnavailable):
        embedder.embed(["un", "deux"])


def test_an_unreachable_endpoint_is_refused_not_guessed():
    embedder = OllamaEmbedder(model="absent", base_url="http://127.0.0.1:1", timeout=2)
    with pytest.raises(EmbeddingUnavailable):
        embedder.embed(["un texte"])


def test_attaching_the_embedder_reaches_the_graph():
    embedder = OllamaEmbedder(
        model="fake-embed", post=fake_post([[1.0, 0.0, 0.0]])
    ).attach()
    # Before the first call the dimension is unknown, and the label says so.
    assert vector_representation() == "ollama:fake-embed"
    graph = StoryGraph()
    graph.add_node("Ida", "character")
    node = next(iter(graph._nodes.values()))
    assert node.vector == [1.0, 0.0, 0.0]
    assert vector_representation() == "ollama:fake-embed:dim3"
    assert graph.stats()["vector_representation"] == "ollama:fake-embed:dim3"


def test_stored_letter_vectors_become_incomparable_rather_than_silently_wrong():
    graph = StoryGraph()
    graph.add_node("Ida", "character")
    stored = next(iter(graph._nodes.values())).vector
    assert len(stored) == 26

    OllamaEmbedder(model="fake-embed", post=fake_post([[1.0, 0.0, 0.0]])).attach()
    assert _cosine_similarity(graph._nodes[next(iter(graph._nodes))].vector, [1.0, 0.0, 0.0]) == 0.0


def test_the_module_states_that_the_live_path_is_unproven():
    docstring = semantic_embedder.__doc__ or ""
    assert "501" in docstring
    assert "has not been exercised" in docstring
