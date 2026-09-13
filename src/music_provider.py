"""Deterministic provider contract for MusicPlan v1.

The provider adapter is deliberately model-free: it proves how a future music
backend must report requested versus executed state without silently degrading a
plan. It never promotes artifacts, downloads weights, or performs network I/O.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from src.music_plan import execution_delta, validate_music_plan


class MusicProviderContractError(ValueError):
    """Raised when a provider response violates the explicit-degradation contract."""


@dataclass(frozen=True)
class ProviderResult:
    provider_id: str
    requested_mode: str
    executed_mode: str
    requested_plan_id: str
    unsupported_fields: tuple[str, ...]
    deltas: tuple[str, ...]
    reason: str
    acknowledged: bool
    artifact_id: str
    artifact_status: str = "candidate"
    activation_allowed: bool = False
    promoted: bool = False
    executed_external_model: bool = False

    def as_dict(self) -> dict[str, Any]:
        return {
            "provider_id": self.provider_id,
            "requested_mode": self.requested_mode,
            "executed_mode": self.executed_mode,
            "requested_plan_id": self.requested_plan_id,
            "unsupported_fields": list(self.unsupported_fields),
            "deltas": list(self.deltas),
            "reason": self.reason,
            "acknowledged": self.acknowledged,
            "artifact_id": self.artifact_id,
            "artifact_status": self.artifact_status,
            "activation_allowed": self.activation_allowed,
            "promoted": self.promoted,
            "executed_external_model": self.executed_external_model,
        }


class MockMusicProvider:
    """Small deterministic provider used to prove the adapter contract."""

    def __init__(
        self,
        provider_id: str = "mock-music-provider",
        *,
        supported_modes: tuple[str, ...] = ("full", "guided", "free"),
        unsupported_fields: tuple[str, ...] = (),
        fallback_mode: str | None = None,
        degradation_reason: str = "",
    ) -> None:
        self.provider_id = provider_id
        self.supported_modes = supported_modes
        self.unsupported_fields = unsupported_fields
        self.fallback_mode = fallback_mode
        self.degradation_reason = degradation_reason

    def prepare(self, plan: dict[str, Any]) -> ProviderResult:
        validation = validate_music_plan(plan)
        if not validation.valid:
            raise MusicProviderContractError(
                "invalid MusicPlan: " + "; ".join(validation.errors)
            )

        requested_mode = str(plan["mode"])
        executed = dict(plan)
        if requested_mode not in self.supported_modes:
            if not self.fallback_mode or self.fallback_mode not in self.supported_modes:
                raise MusicProviderContractError(
                    f"provider does not support requested mode {requested_mode!r} and has no valid fallback"
                )
            executed["mode"] = self.fallback_mode

        for field in self.unsupported_fields:
            executed.pop(field, None)

        deltas = execution_delta(plan, executed)
        acknowledged = bool(deltas)
        reason = self.degradation_reason.strip() if deltas else ""
        if deltas and not reason:
            raise MusicProviderContractError(
                "provider changed requested state without an explicit degradation reason"
            )

        return ProviderResult(
            provider_id=self.provider_id,
            requested_mode=requested_mode,
            executed_mode=str(executed["mode"]),
            requested_plan_id=str(plan["plan_id"]),
            unsupported_fields=tuple(
                field for field in self.unsupported_fields if field in plan
            ),
            deltas=deltas,
            reason=reason,
            acknowledged=acknowledged,
            artifact_id=f"candidate:{self.provider_id}:{plan['plan_id']}",
        )


__all__ = [
    "MockMusicProvider",
    "MusicProviderContractError",
    "ProviderResult",
]
