"""The bridge replaces hard-coded bans with catalogue-derived guidance."""

from src.narrative_integrity.prompt_bridge import (
    banned_examples,
    render_guidance,
    reported_only_labels,
)
from src.narrative_integrity.slop import SlopRegistry

REGISTRY = SlopRegistry.default()


def test_guidance_is_derived_from_the_catalogue_and_stable():
    first = render_guidance()
    second = render_guidance()
    assert first == second
    assert REGISTRY.ref()["name"] in first
    assert str(REGISTRY.ref()["signatures"]) in first


def test_banned_examples_come_only_from_scored_signatures():
    scored = {
        example
        for signature in REGISTRY.signatures
        if signature.weight_class in ("decisive", "strong")
        for example in signature.examples
    }
    for example in banned_examples():
        assert example in scored


def test_demoted_classes_are_never_presented_as_bans():
    demoted_examples = {
        example
        for signature in REGISTRY.signatures
        if signature.weight_class in ("report_only", "style_only")
        for example in signature.examples
    }
    banned = set(banned_examples(limit=100))
    assert not (demoted_examples & banned), "a zero-weight pattern must not be banned"
    assert reported_only_labels(), "demoted patterns must still be reported"


def test_guidance_states_why_demoted_patterns_are_kept():
    guidance = render_guidance()
    assert "never forbidden" in guidance
    assert "Conclusion compulsive (report_only)" in guidance


def test_guidance_is_deterministic_for_a_given_registry():
    first = render_guidance(REGISTRY, limit=5)
    second = render_guidance(REGISTRY, limit=5)
    assert first == second
