"""
Artistic Locks - Logic for managing coherence across methodologies.
"""

from typing import Dict, List, Any
from src.models.character_ccd import ArtisticLock, LockingStrength


class ArtisticLockManager:
    """
    Manages the application and resolution of locks when transitioning
    between creation methodologies.
    """

    def __init__(self, locks: List[ArtisticLock] = None):
        self.locks = locks or []

    def get_locks_for_category(self, category: str) -> List[ArtisticLock]:
        return [lock for lock in self.locks if lock.category == category]

    def apply_to_prompt(self, base_prompt: str) -> str:
        """Enriches a prompt based on strictly locked attributes."""
        locks = [lock for lock in self.locks if lock.strength == LockingStrength.STRICT]
        if not locks:
            return base_prompt

        additions = [f"{lock.attribute}: {lock.value}" for lock in locks]
        return f"{base_prompt}, fixed {', '.join(additions)}"

    def resolve_conflicts(self, incoming_values: Dict[str, Any]) -> Dict[str, Any]:
        """
        Resolves conflicts between a new methodology's suggestions and
        existing artistic locks.
        """
        resolved = incoming_values.copy()

        for lock in self.locks:
            if lock.attribute in resolved:
                if lock.strength == LockingStrength.STRICT:
                    # Override with locked value
                    resolved[lock.attribute] = lock.value
                elif lock.strength == LockingStrength.FIRM:
                    # Could implement blending or weighted average for numerical values
                    pass

        return resolved
