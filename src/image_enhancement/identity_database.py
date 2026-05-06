"""
Identity Database Module - Management of character facial embeddings.
Part of the StoryCore-Engine Image Enhancement Suite.
"""

import logging
import json
from pathlib import Path
from typing import Any, Dict, List, Optional


class IdentityDatabase:
    """
    Manages persistent storage and retrieval of Character Identities.
    """

    def __init__(self, db_path: str = "data/database/identities.json"):
        self.logger = logging.getLogger(__name__)
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._cache: Dict[str, Any] = {}
        self._load_db()

    def _load_db(self):
        if self.db_path.exists():
            try:
                with open(self.db_path, "r") as f:
                    self._cache = json.load(f)
            except Exception as e:
                self.logger.error(f"Failed to load identity DB: {e}")

    async def save_identity(self, identity_id: str, data: Dict[str, Any]):
        """Saves a character identity to storage."""
        self._cache[identity_id] = data
        with open(self.db_path, "w") as f:
            json.dump(self._cache, f, indent=2, default=str)
        self.logger.info(f"Identity '{identity_id}' saved to database")

    async def get_identity(self, identity_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a character identity."""
        return self._cache.get(identity_id)

    async def list_identities(self) -> List[str]:
        """Lists all registered identity IDs."""
        return list(self._cache.keys())
