"""Deterministic provider contract for MusicPlan v1.

The provider adapter is deliberately model-free: it proves how a future music
backend must report requested versus executed state without silently degrading a
plan. It never promotes artifacts, downloads weights, or performs network I/O.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable

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


def build_provider_handoff(
    result: ProviderResult,
    *,
    provider_version: str = "",
    model: str = "",
    harness: str = "music-plan-v1",
    hardware: str = "",
    input_digest: str = "",
    candidate_digest: str = "",
    evidence_refs: Iterable[str] = (),
    verification_state: str = "unverified",
) -> dict[str, Any]:
    """Build a data-only interchange envelope for a later validation harness.

    This function does not import Botte Secrète, execute a provider, promote an
    artifact, or write memory. It merely carries the bounded provider outcome
    and provenance dimensions that another harness may verify independently.
    """
    allowed_states = {"unverified", "partially_verified", "verified", "failed"}
    if verification_state not in allowed_states:
        raise MusicProviderContractError("unsupported verification_state")
    refs = tuple(str(ref) for ref in evidence_refs if str(ref).strip())
    if verification_state == "verified" and not refs:
        raise MusicProviderContractError("verified handoff requires evidence references")
    if result.artifact_status != "candidate":
        raise MusicProviderContractError("provider handoff accepts candidate artifacts only")
    if result.activation_allowed or result.promoted:
        raise MusicProviderContractError("provider result cannot carry activation or promotion authority")

    return {
        "schema_version": "storycore.music-provider-handoff/v1",
        "plan_id": result.requested_plan_id,
        "provider": {
            "id": result.provider_id,
            "version": provider_version,
            "model": model,
            "harness": harness,
            "hardware": hardware,
        },
        "execution": {
            "requested_mode": result.requested_mode,
            "executed_mode": result.executed_mode,
            "unsupported_fields": list(result.unsupported_fields),
            "deltas": list(result.deltas),
            "reason": result.reason,
            "acknowledged": result.acknowledged,
            "executed_external_model": result.executed_external_model,
        },
        "artifact": {
            "id": result.artifact_id,
            "status": result.artifact_status,
            "input_digest": input_digest,
            "candidate_digest": candidate_digest,
        },
        "verification": {
            "state": verification_state,
            "evidence_refs": list(refs),
        },
        "activation_allowed": False,
        "promoted": False,
        "memory_write_performed": False,
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
    "build_provider_handoff",
]
