"""Human arbitration memory.

A finding a human already rejected or acknowledged must not be raised again as if it
were new. The ledger is append-only, keyed on a position-independent identity, and it
never removes anything from a report: it records a decision beside the finding, so the
history stays auditable.

The ledger deliberately does not alter the prose score. A score measures the text; it
does not measure the relationship between the text and a human decision taken earlier.
"""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

from .paths import resolve_output, write_text_in_root

SCHEMA_VERSION = "1.0"

POSITIONAL_RE = re.compile(r"\d+(?:-\d+)?")


class Decision(str, Enum):
    """What a human decided about a finding."""

    REJECTED = "rejected"
    ACCEPTED = "accepted"
    DEFERRED = "deferred"


SUPPRESSING_DECISIONS = (Decision.REJECTED, Decision.ACCEPTED)


def normalise_locus(locus: str) -> str:
    """Collapse positional detail so a decision survives a later run.

    "style:window:3" and "style:window:7" are the same kind of observation, so both
    become "style:window". Meaningful qualifiers are kept: "prose:opener:le chat" keeps
    its opener, and "signature:fr_cliche_danse" keeps its signature.
    """

    parts = [part for part in str(locus).split(":") if part != ""]
    kept: List[str] = []
    for part in parts:
        if POSITIONAL_RE.fullmatch(part):
            break
        kept.append(part)
    return ":".join(kept) if kept else "unknown"


def arbitration_key(detector_id: str, locus: str) -> str:
    """Stable key for a decision, independent of where the text happens to sit."""

    return str(detector_id) + "|" + normalise_locus(locus)


@dataclass
class LedgerEntry:
    arbitration_key: str
    detector_id: str
    locus: str
    decision: Decision
    decided_by: str
    decided_at: str
    note: str = ""
    schema_version: str = SCHEMA_VERSION

    def to_dict(self) -> Dict[str, Any]:
        return {
            "schema_version": self.schema_version,
            "arbitration_key": self.arbitration_key,
            "detector_id": self.detector_id,
            "locus": self.locus,
            "normalised_locus": normalise_locus(self.locus),
            "decision": self.decision.value,
            "decided_by": self.decided_by,
            "decided_at": self.decided_at,
            "note": self.note,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "LedgerEntry":
        return cls(
            arbitration_key=str(data["arbitration_key"]),
            detector_id=str(data.get("detector_id", "")),
            locus=str(data.get("locus", "")),
            decision=Decision(str(data["decision"])),
            decided_by=str(data.get("decided_by", "")),
            decided_at=str(data.get("decided_at", "")),
            note=str(data.get("note", "")),
        )


class FindingsLedger:
    """Append-only decisions, with the latest decision per key winning."""

    def __init__(
        self, entries: Optional[List[LedgerEntry]] = None, path: Optional[Path] = None
    ) -> None:
        self._entries: List[LedgerEntry] = list(entries or [])
        self._path = Path(path) if path else None
        self._latest: Dict[str, LedgerEntry] = {}
        for entry in self._entries:
            self._latest[entry.arbitration_key] = entry

    @classmethod
    def empty(cls) -> "FindingsLedger":
        return cls()

    @classmethod
    def from_file(cls, path, root=None) -> "FindingsLedger":
        """Load a ledger from an operator-supplied path, or start an empty one.

        The path is confined before it is touched. A ledger that does not exist yet
        is not an error: it is a ledger that has not recorded anything so far.
        """

        target = resolve_output(path, root=root, label="ledger")
        if not target.exists():
            return cls([], target)
        data = json.loads(target.read_text(encoding="utf-8"))
        entries = [LedgerEntry.from_dict(item) for item in data.get("entries", [])]
        return cls(entries, target)

    @property
    def path(self) -> Optional[Path]:
        return self._path

    def entries(self) -> List[LedgerEntry]:
        return list(self._entries)

    def __len__(self) -> int:
        return len(self._entries)

    def record(
        self,
        detector_id: str,
        locus: str,
        decision: Decision,
        decided_by: str = "human",
        note: str = "",
        now: Optional[str] = None,
    ) -> LedgerEntry:
        entry = LedgerEntry(
            arbitration_key=arbitration_key(detector_id, locus),
            detector_id=str(detector_id),
            locus=str(locus),
            decision=Decision(decision),
            decided_by=str(decided_by),
            decided_at=now or datetime.now().isoformat(timespec="seconds"),
            note=str(note),
        )
        self._entries.append(entry)
        self._latest[entry.arbitration_key] = entry
        return entry

    def record_key(
        self,
        key: str,
        decision: Decision,
        decided_by: str = "human",
        note: str = "",
        now: Optional[str] = None,
    ) -> LedgerEntry:
        """Record a decision from a key copied out of a report."""

        if "|" not in key:
            raise ValueError(
                "expected an arbitration key of the form detector_id|normalised_locus"
            )
        detector_id, locus = key.split("|", 1)
        return self.record(
            detector_id, locus, decision, decided_by=decided_by, note=note, now=now
        )

    def decision_for(self, detector_id: str, locus: str) -> Optional[LedgerEntry]:
        return self._latest.get(arbitration_key(detector_id, locus))

    def suppresses(self, detector_id: str, locus: str) -> bool:
        entry = self.decision_for(detector_id, locus)
        return bool(entry and entry.decision in SUPPRESSING_DECISIONS)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "schema_version": SCHEMA_VERSION,
            "entries": [entry.to_dict() for entry in self._entries],
        }

    def save(self, path=None, root=None) -> Path:
        target = resolve_output(path, root=root, label="ledger") if path else self._path
        if target is None:
            raise ValueError("no path given and no path was attached to this ledger")
        target = write_text_in_root(
            target,
            json.dumps(self.to_dict(), ensure_ascii=False, indent=2) + "\n",
            root=root,
            label="ledger",
        )
        self._path = target
        return target
