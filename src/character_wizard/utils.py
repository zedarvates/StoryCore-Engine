"""
Utility Functions for Character Generation

This module contains miscellaneous utility functions used in character generation.
"""

from .models import PuppetCategory


def assign_puppet_category(role: str) -> PuppetCategory:
    """Assign character to appropriate Puppet System category"""
    role_mapping = {
        "protagonist": PuppetCategory.P1,
        "antagonist": PuppetCategory.P1,
        "supporting": PuppetCategory.P2,
        "minor": PuppetCategory.M1
    }
    return role_mapping.get(role, PuppetCategory.M1)