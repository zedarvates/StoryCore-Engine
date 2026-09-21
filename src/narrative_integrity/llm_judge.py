"""A qualitative judge, behind an explicit switch.

Fail-closed by construction. An unreachable endpoint, a malformed answer or a quotation
that does not appear in the inspected text all end in JudgeUnavailable rather than in an
invented finding. The judge is advisory: it can never overwrite a deterministic finding,
and it is never asked to speak about authorship.

The default transport talks to the local Ollama endpoint the project already uses, so no
text leaves the machine and no external quota is spent.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional, Protocol, Tuple

from .judge import JudgeUnavailable

ALLOWED_SEVERITIES = ("info", "low", "medium", "high")
ALLOWED_LAYERS = ("L0", "L1", "L2", "L3", "S")

SEVERITY_ALIASES = {
    "moderate": "medium",
    "minor": "low",
    "trivial": "info",
    "severe": "high",
    "critical": "high",
    "major": "high",
    "warning": "medium",
}

DEFAULT_MODEL = "gemma4:26b"
DEFAULT_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
DEFAULT_MAX_ITEMS = 5
DEFAULT_MAX_CHARS = 12000

SYSTEM_PROMPT = (
    "Tu es relecteur editorial. Tu analyses un extrait de prose francaise et tu "
    "signales uniquement des problemes de registre, de rythme ou de clarte que tu peux "
    "rattacher a un extrait exact. "
    "Interdictions absolues : tu ne te prononces jamais sur l'auteur, ni sur l'origine "
    "humaine ou machine du texte, et tu ne reecris pas le texte. "
    "Tu reponds uniquement par un objet JSON, sans texte autour."
)


class JudgeTransport(Protocol):
    def complete(self, prompt: str, system: str) -> str:  # pragma: no cover - protocol
        ...


class OllamaTransport:
    """Local chat endpoint, standard library only.

    The local model shipped with this machine is a reasoning model: it emits its
    deliberation in a separate field and can return an empty answer when the generation
    budget runs out mid thought, which would look like a permanently silent judge.
    Deliberation is therefore switched off, which keeps the judge responsive and keeps
    the model reasoning out of the answer that gets parsed.
    """

    name = "ollama"

    def __init__(
        self,
        model: str = DEFAULT_MODEL,
        base_url: str = DEFAULT_BASE_URL,
        timeout: int = 180,
        num_predict: int = 512,
        think: bool = False,
    ) -> None:
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.num_predict = num_predict
        self.think = think

    def complete(self, prompt: str, system: str) -> str:
        payload = {
            "model": self.model,
            "stream": False,
            "think": self.think,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            "options": {"temperature": 0, "num_predict": self.num_predict},
        }
        request = urllib.request.Request(
            self.base_url + "/api/chat",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(request, timeout=self.timeout) as response:
            body = json.loads(response.read().decode("utf-8"))
        message = body.get("message") or {}
        content = str(message.get("content") or "")
        if not content.strip() and str(message.get("thinking") or "").strip():
            raise JudgeUnavailable(
                "the model spent its whole budget on deliberation and returned no "
                "answer: raise num_predict, or keep deliberation disabled"
            )
        return content


def build_prompt(text: str, max_items: int) -> str:
    return (
        "Extrait a relire :\n"
        "<<<\n"
        + text
        + "\n>>>\n\n"
        "Reponds par un objet JSON de la forme :\n"
        '{"findings": [{"layer": "L3", "severity": "low", "confidence": 0.4, '
        '"excerpt": "passage exact recopie du texte", "detail": "ce qui pose probleme"}]}\n\n'
        "Regles de forme :\n"
        "- au maximum " + str(max_items) + " entrees ;\n"
        "- severity parmi info, low, medium, high ;\n"
        "- confidence entre 0 et 1 ;\n"
        "- excerpt doit etre recopie mot pour mot depuis l'extrait, sans reformulation ;\n"
        "- si rien ne pose probleme, reponds exactement {\"findings\": []}."
    )


def _load_json(raw: str) -> Any:
    """Accept a bare JSON document, or one embedded in surrounding prose."""

    text = raw.strip()
    if not text:
        raise JudgeUnavailable("judge returned nothing")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    for opening, closing in (("[", "]"), ("{", "}")):
        start = text.find(opening)
        end = text.rfind(closing)
        if start != -1 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                continue
    raise JudgeUnavailable("judge did not return JSON")


def _coerce_severity(value: Any) -> Optional[str]:
    if value is None:
        return "low"
    candidate = str(value).strip().lower()
    candidate = SEVERITY_ALIASES.get(candidate, candidate)
    return candidate if candidate in ALLOWED_SEVERITIES else None


def _coerce_confidence(value: Any) -> Optional[float]:
    if value is None:
        return 0.5
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return max(0.0, min(1.0, number))


def parse_findings(
    raw: str, inspected_text: str, max_items: int
) -> Tuple[List[Dict[str, Any]], List[str]]:
    """Turn a judge answer into findings, rejecting anything unverifiable."""

    payload = _load_json(raw)
    if isinstance(payload, dict):
        items = payload.get("findings", [])
    else:
        items = payload
    if not isinstance(items, list):
        raise JudgeUnavailable("judge JSON does not carry a findings list")

    accepted: List[Dict[str, Any]] = []
    rejected: List[str] = []
    for position, item in enumerate(items):
        if len(accepted) >= max_items:
            rejected.append("item %d: beyond the declared cap of %d" % (position, max_items))
            continue
        if not isinstance(item, dict):
            rejected.append("item %d: not an object" % position)
            continue
        severity = _coerce_severity(item.get("severity"))
        if severity is None:
            rejected.append("item %d: unknown severity %r" % (position, item.get("severity")))
            continue
        confidence = _coerce_confidence(item.get("confidence"))
        if confidence is None:
            rejected.append("item %d: confidence is not a number" % position)
            continue
        excerpt = str(item.get("excerpt", "")).strip()
        if not excerpt:
            rejected.append("item %d: no excerpt" % position)
            continue
        if excerpt not in inspected_text:
            rejected.append("item %d: excerpt does not appear in the text" % position)
            continue
        layer = str(item.get("layer", "L3")).strip().upper()
        if layer not in ALLOWED_LAYERS:
            layer = "L3"
        accepted.append(
            {
                "layer": layer,
                "severity": severity,
                "confidence": confidence,
                "excerpt": excerpt[:200],
                "detail": str(item.get("detail", ""))[:300],
                "remediation": (
                    str(item["remediation"])[:300] if item.get("remediation") else None
                ),
            }
        )
    return accepted, rejected


class LLMJudge:
    """Advisory judge over an injected transport."""

    name = "llm"

    def __init__(
        self,
        transport: JudgeTransport,
        model: Optional[str] = None,
        max_items: int = DEFAULT_MAX_ITEMS,
        max_chars: int = DEFAULT_MAX_CHARS,
    ) -> None:
        self.transport = transport
        self.model = model or getattr(transport, "model", "unknown")
        self.max_items = max_items
        self.max_chars = max_chars
        self.last_report: Optional[Dict[str, Any]] = None

    def available(self) -> bool:
        """Configured. Reachability is discovered on the call, and reported as such."""

        return True

    def assess(self, payload: Dict[str, Any]) -> List[Dict[str, Any]]:
        findings, _ = self.assess_detailed(payload)
        return findings

    def assess_detailed(
        self, payload: Dict[str, Any]
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        text = str(payload.get("text", ""))
        truncated = len(text) > self.max_chars
        inspected = text[: self.max_chars]
        prompt = build_prompt(inspected, self.max_items)
        try:
            raw = self.transport.complete(prompt, SYSTEM_PROMPT)
        except JudgeUnavailable:
            raise
        except (urllib.error.URLError, OSError, ValueError) as error:
            raise JudgeUnavailable(
                "judge endpoint failed: " + type(error).__name__ + ": " + str(error)[:160]
            ) from error

        accepted, rejected = parse_findings(raw, inspected, self.max_items)
        report = {
            "status": "ran" if not rejected else "partial",
            "name": self.name,
            "model": self.model,
            "inspected_chars": len(inspected),
            "truncated": truncated,
            "accepted_items": len(accepted),
            "rejected_items": rejected,
        }
        self.last_report = report
        return accepted, report
