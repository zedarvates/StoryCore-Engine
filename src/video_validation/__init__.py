"""Video validation and generation-routing primitives for StoryCore."""

from .multisubject_router import (
    GenerationStrategy,
    MultiSubjectShot,
    RoutingDecision,
    route_multi_subject_shot,
)
from .shot_spec_adapter import extract_multi_subject_shot, route_shot_spec

__all__ = [
    "GenerationStrategy",
    "MultiSubjectShot",
    "RoutingDecision",
    "route_multi_subject_shot",
    "extract_multi_subject_shot",
    "route_shot_spec",
]
