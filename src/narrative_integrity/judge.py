"""The LLM judge seam.

Fail-closed by default: an unavailable judge is reported as unavailable. The engine
never invents a judge verdict, and a judge is never allowed to overwrite a
deterministic finding.
"""

from __future__ import annotations

from typing import Any, Dict, List, Protocol


class JudgeUnavailable(RuntimeError):
    """The judge cannot answer. This is a normal state, not a failure."""


class Judge(Protocol):
    def available(self) -> bool:  # pragma: no cover - protocol
        ...

    def assess(self, payload: Dict[str, Any]) -> Dict[str, Any]:  # pragma: no cover
        ...


class NullJudge:
    """Default judge: declares itself unavailable and fabricates nothing."""

    name = "null"

    def available(self) -> bool:
        return False

    def assess(self, payload: Dict[str, Any]) -> List[Dict[str, Any]]:
        raise JudgeUnavailable(
            "no judge configured; qualitative assessment is unavailable in this run"
        )
