"""Retrieval over the canon, so the judge reasons on facts instead of guesses.

The design asked for the judge to be fed by retrieval on the canon rather than by the
whole text, to reduce invented contradictions. Canon facts are short and named, which is
the case where lexical retrieval is appropriate: no embedding model is needed, and the
result is deterministic.

Nothing is retrieved when nothing matches. An empty context is returned as empty, and the
judge is told that the supplied facts are the reference and that no fact may be invented.
"""

from __future__ import annotations

import math
import re
from typing import Any, Dict, Iterable, List, Optional, Sequence

from .input_model import CanonInput

TOKEN_RE = re.compile("[0-9A-Za-z\u00C0-\u024F'-]+")
MIN_QUERY_TOKENS = 0


def tokenise(value: str) -> List[str]:
    return [token.lower() for token in TOKEN_RE.findall(str(value))]


class LexicalIndex:
    """Deterministic token-overlap search with inverse document frequency."""

    def __init__(self) -> None:
        self._documents: List[Dict[str, Any]] = []

    def __len__(self) -> int:
        return len(self._documents)

    def add(self, doc_id: str, text: str, payload: Optional[Dict[str, Any]] = None) -> None:
        self._documents.append(
            {
                "doc_id": str(doc_id),
                "text": str(text),
                "payload": dict(payload or {}),
                "tokens": set(tokenise(text)),
            }
        )

    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Ranked documents sharing at least one token with the query."""

        query_tokens = set(tokenise(query))
        if not query_tokens or not self._documents or limit <= 0:
            return []

        total = len(self._documents)
        frequencies: Dict[str, int] = {}
        for document in self._documents:
            for token in document["tokens"]:
                frequencies[token] = frequencies.get(token, 0) + 1

        scored: List[Dict[str, Any]] = []
        for document in self._documents:
            shared = query_tokens & document["tokens"]
            if not shared:
                continue
            weight = sum(
                math.log(1.0 + total / max(1, frequencies.get(token, 1)))
                for token in shared
            )
            length = math.sqrt(max(1, len(document["tokens"])))
            scored.append(
                {
                    "doc_id": document["doc_id"],
                    "text": document["text"],
                    "payload": document["payload"],
                    "score": round(weight / length, 6),
                }
            )
        scored.sort(key=lambda item: (-item["score"], item["doc_id"]))
        return scored[:limit]


def canon_documents(canon: CanonInput) -> List[Dict[str, Any]]:
    """One short document per accepted fact, in the canon's own words."""

    documents: List[Dict[str, Any]] = []
    for entity in canon.entities:
        name = str(entity.get("name", "")).strip()
        if not name:
            continue
        kind = str(entity.get("kind") or entity.get("type") or "entite")
        aliases = [str(alias) for alias in entity.get("aliases") or []]
        text = "Entite %s, type %s" % (name, kind)
        if aliases:
            text += ", alias " + ", ".join(aliases)
        documents.append(
            {
                "doc_id": "entity:" + name,
                "text": text,
                "payload": {"kind": "entity", "name": name, "aliases": aliases},
            }
        )

    for subject, predicate, obj in canon.relation_triples():
        documents.append(
            {
                "doc_id": "relation:%s:%s:%s" % (subject, predicate, obj),
                "text": "Relation %s %s %s" % (subject, predicate, obj),
                "payload": {
                    "kind": "relation",
                    "subject": subject,
                    "predicate": predicate,
                    "object": obj,
                },
            }
        )

    for entry in canon.timeline:
        label = str(entry.get("label", "")).strip()
        order = entry.get("order")
        if not label and order is None:
            continue
        documents.append(
            {
                "doc_id": "timeline:%s" % (label or order),
                "text": "Chronologie %s, ordre %s" % (label, order),
                "payload": {"kind": "timeline", "label": label, "order": order},
            }
        )
    return documents


def canon_index(canon: CanonInput) -> LexicalIndex:
    index = LexicalIndex()
    for document in canon_documents(canon):
        index.add(document["doc_id"], document["text"], document["payload"])
    return index


def canon_context(canon: Optional[CanonInput], query: str, limit: int = 6) -> str:
    """A bounded block of relevant canon facts, or an empty string."""

    if canon is None:
        return ""
    hits = canon_index(canon).search(query, limit=limit)
    if not hits:
        return ""
    lines = ["Faits de canon pertinents :"]
    lines.extend("- " + hit["text"] for hit in hits)
    return "\n".join(lines)
