"""Versioned thresholds.

No threshold lives in code. Every run records which settings file produced it and that
file's hash, so a reported number can always be traced back to a decision.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

DATA_DIR = Path(__file__).resolve().parent / "data"
DEFAULT_SETTINGS = DATA_DIR / "narrative_integrity_v1.json"


@dataclass(frozen=True)
class SettingsRef:
    """Traceable origin of a set of thresholds."""

    name: str
    schema_version: str
    path: str
    sha256: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "schema_version": self.schema_version,
            "path": self.path,
            "sha256": self.sha256,
        }


class Thresholds:
    """Read-only access to one settings file."""

    def __init__(
        self,
        data: Dict[str, Any],
        path: Optional[Path] = None,
        digest: Optional[str] = None,
    ) -> None:
        self._data = data
        self._path = path
        self._digest = digest

    @classmethod
    def from_file(cls, path: Path) -> "Thresholds":
        raw = Path(path).read_bytes()
        data = json.loads(raw.decode("utf-8"))
        return cls(data, Path(path), hashlib.sha256(raw).hexdigest())

    @classmethod
    def default(cls) -> "Thresholds":
        return cls.from_file(DEFAULT_SETTINGS)

    @property
    def data(self) -> Dict[str, Any]:
        return self._data

    def section(self, name: str) -> Dict[str, Any]:
        value = self._data.get(name, {})
        return dict(value) if isinstance(value, dict) else {}

    def get(self, dotted: str, default: Any = None) -> Any:
        node: Any = self._data
        for part in dotted.split("."):
            if not isinstance(node, dict) or part not in node:
                return default
            node = node[part]
        return node

    def ref(self) -> SettingsRef:
        return SettingsRef(
            name=str(self._data.get("name", "unknown")),
            schema_version=str(self._data.get("schema_version", "0")),
            path=str(self._path) if self._path else "<memory>",
            sha256=self._digest or "",
        )

    def bands(self) -> List[Dict[str, Any]]:
        return list(self._data.get("bands", []))

    def band_for(self, score: float) -> str:
        """Highest band whose floor the score reaches."""

        chosen = "unknown"
        for band in self.bands():
            if score >= float(band.get("min", 0)):
                chosen = str(band.get("name", chosen))
        return chosen

    def weight_class(self, name: str) -> Dict[str, float]:
        entry = self.section("weight_classes").get(name)
        if not isinstance(entry, dict):
            return {"weight": 0.0, "points": 0.0}
        return {
            "weight": float(entry.get("weight", 0.0)),
            "points": float(entry.get("points", 0.0)),
        }
