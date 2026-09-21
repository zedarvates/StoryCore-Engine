"""A semantic embedder for the narrative graph, against the local endpoint.

The graph defaults to a lexical letter fingerprint. This module supplies the real
replacement: it asks the local endpoint for sentence embeddings and hands the vectors to
the graph through set_embedder.

Honest status: the machine that produced this code runs a generation model, and its
endpoint answers 501 to /api/embed and 500 to /api/embeddings. The request and response
shape below follows the documented contract and is covered by tests that inject the
transport, but the live path has not been exercised against an embedding model. Pull an
embedding model before relying on it.

Attaching this embedder changes the vector dimension, so previously stored node vectors
become incomparable. The graph returns a zero similarity rather than a plausible number
when lengths differ, and vector_representation() reports which representation is active.
Re-ingest the project after attaching.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any, Callable, Dict, List, Optional, Sequence

DEFAULT_MODEL = "nomic-embed-text"
DEFAULT_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434")


class EmbeddingUnavailable(RuntimeError):
    """The endpoint did not return a usable vector."""


class OllamaEmbedder:
    """Sentence embeddings from the local endpoint. Transport is injectable."""

    def __init__(
        self,
        model: str = DEFAULT_MODEL,
        base_url: str = DEFAULT_BASE_URL,
        timeout: int = 120,
        post: Optional[Callable[[Dict[str, Any]], Any]] = None,
    ) -> None:
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.dimension: Optional[int] = None
        self._post = post or self._post_urllib

    @property
    def representation(self) -> str:
        suffix = "" if self.dimension is None else ":dim%d" % self.dimension
        return "ollama:%s%s" % (self.model, suffix)

    def _post_urllib(self, payload: Dict[str, Any]) -> Any:
        request = urllib.request.Request(
            self.base_url + "/api/embed",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(request, timeout=self.timeout) as response:
            return json.loads(response.read().decode("utf-8"))

    def embed(self, texts: Sequence[str]) -> List[List[float]]:
        inputs = [str(text) for text in texts]
        if not inputs:
            return []
        try:
            body = self._post({"model": self.model, "input": inputs})
        except (urllib.error.URLError, OSError, ValueError) as error:
            raise EmbeddingUnavailable(
                "embedding endpoint failed: " + type(error).__name__ + ": " + str(error)[:160]
            ) from error

        vectors = body.get("embeddings") if isinstance(body, dict) else None
        if not isinstance(vectors, list) or len(vectors) != len(inputs):
            raise EmbeddingUnavailable(
                "expected %d vectors, received %s"
                % (len(inputs), "none" if vectors is None else len(vectors))
            )

        out: List[List[float]] = []
        for vector in vectors:
            if not isinstance(vector, list) or not vector:
                raise EmbeddingUnavailable("the endpoint returned an empty vector")
            out.append([float(value) for value in vector])
        if len({len(vector) for vector in out}) != 1:
            raise EmbeddingUnavailable("the endpoint returned vectors of differing lengths")
        self.dimension = len(out[0])
        return out

    def __call__(self, text: str) -> List[float]:
        return self.embed([text])[0]

    def attach(self) -> "OllamaEmbedder":
        """Hand this embedder to the narrative graph.

        The import is local so that the graph keeps working without this module.
        """

        from .knowledge_graph import set_embedder

        set_embedder(self)
        return self
