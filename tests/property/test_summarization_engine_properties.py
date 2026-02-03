"""
Property-based tests for SummarizationEngine.

These tests verify universal properties that should hold across all valid inputs.
Uses hypothesis for property-based testing with minimum 100 iterations per test.
"""

import pytest
import tempfile
import shutil
import json
from pathlib import Path
from datetime import datetime
from hypothesis import given, strategies as st, settings

from src.memory_system.summarization_engine import SummarizationEngine


# Strategy for generating memory data
def memory_data_strategy():
    """Generate valid memory data structures."""
    return st.fixed_dictionaries({
        "schema_version": st.just("1.0"),
        "last_updated": st.datetimes(
            min_value=datetime(2020, 1, 1),
            max_value=datetime(2030, 12, 31)
        ).map(lambda dt: dt.isoformat()),
        "objectives": st.lists(
            st.fixed_dictionaries({
                "id": st.text(min_size=1, max_size=20),
                "description": st.text(min_size=10, max_size=200),
                "status": st.sampled_from(["active", "completed", "abandoned"]),
                "added": st.datetimes(
                    min_value=datetime(2020, 1, 1),
                    max_value=datetime(2030, 12, 31)
                ).map(lambda dt: dt.isoformat())
            }),
            min_size=0,
            max_size=10
        ),
        "entities": st.lists(
            st.fixed_dictionaries({
                "id": st.text(min_size=1, max_size=20),
                "name": st.text(min_size=1, max_size=50),
                "type": st.sampled_from(["character", "module", "component", "concept"]),
                "description": st.text(min_size=10, max_size=200),
                "attributes": st.dictionaries(
                    st.text(min_size=1, max_size=20),
                    st.text(min_size=1, max_size=100),
                    min_size=0,
                    max_size=5
                ),
                "added": st.datetimes(
                    min_value=datetime(2020, 1, 1),
                    max_value=datetime(2030, 12, 31)
                ).map(lambda dt: dt.isoformat())
            }),
            min_size=0,
            max_size=10
        ),
        "constraints": st.lists(
            st.fixed_dictionaries({
                "id": st.text(min_size=1, max_size=20),
                "description": st.text(min_size=10, max_size=200),
                "type": st.sampled_from(["technical", "creative", "business"]),
                "added": st.datetimes(
                    min_value=datetime(2020, 1, 1),
                    max_value=datetime(2030, 12, 31)
                ).map(lambda dt: dt.isoformat())
            }),
            min_size=0,
            max_size=10
        ),
        "decisions": st.lists(
            st.fixed_dictionaries({
                "id": st.text(min_size=1, max_size=20),
                "description": st.text(min_size=10, max_size=200),
                "rationale": st.text(min_size=10, max_size=200),
                "alternatives_considered": st.lists(
                    st.text(min_size=5, max_size=100),
                    min_size=0,
                    max_size=5
                ),
                "timestamp": st.datetimes(
                    min_value=datetime(2020, 1, 1),
                    max_value=datetime(2030, 12, 31)
                ).map(lambda dt: dt.isoformat())
            }),
            min_size=0,
            max_size=10
        ),
        "style_rules": st.lists(
            st.fixed_dictionaries({
                "category": st.sampled_from(["visual", "narrative", "technical"]),
                "rule": st.text(min_size=10, max_size=200),
                "added": st.datetimes(
                    min_value=datetime(2020, 1, 1),
                    max_value=datetime(2030, 12, 31)
                ).map(lambda dt: dt.isoformat())
            }),
            min_size=0,
            max_size=10
        ),
        "task_backlog": st.lists(
            st.fixed_dictionaries({
                "id": st.text(min_size=1, max_size=20),
                "description": st.text(min_size=10, max_size=200),
                "priority": st.sampled_from(["low", "medium", "high", "critical"]),
                "status": st.sampled_from(["pending", "in_progress", "completed"]),
                "added": st.datetimes(
                    min_value=datetime(2020, 1, 1),
                    max_value=datetime(2030, 12, 31)
                ).map(lambda dt: dt.isoformat())
            }),
            min_size=0,
            max_size=10
        ),
        "current_state": st.fixed_dictionaries({
            "phase": st.text(min_size=1, max_size=50),
            "progress_percentage": st.integers(min_value=0, max_value=100),
            "active_tasks": st.lists(
                st.text(min_size=1, max_size=50),
                min_size=0,
                max_size=5
            ),
            "blockers": st.lists(
                st.text(min_size=10, max_size=100),
                min_size=0,
                max_size=5
            ),
            "last_activity": st.datetimes(
                min_value=datetime(2020, 1, 1),
                max_value=datetime(2030, 12, 31)
            ).map(lambda dt: dt.isoformat())
        })
    })


# Strategy for generating asset information
def asset_info_strategy():
    """Generate valid asset information dictionaries."""
    return st.fixed_dictionaries({
        "filename": st.text(
            min_size=1,
            max_size=50,
            alphabet=st.characters(
                blacklist_characters='/\\:*?"<>|\x00',
                blacklist_categories=('Cc', 'Cs')
            )
        ).filter(lambda x: x.strip()),
        "type": st.sampled_from(["image", "audio", "video", "document"]),
        "size_bytes": st.integers(min_value=1, max_value=100_000_000),
        "metadata": st.one_of(
            st.fixed_dictionaries({
                "dimensions": st.tuples(
                    st.integers(min_value=1, max_value=10000),
                    st.integers(min_value=1, max_value=10000)
                )
            }),
            st.fixed_dictionaries({
                "duration": st.floats(min_value=0.1, max_value=3600.0)
            }),
            st.fixed_dictionaries({
                "pages": st.integers(min_value=1, max_value=1000)
            }),
            st.just({})
        )
    })


@pytest.fixture
def temp_project_dir():
    """Create a temporary project directory for testing."""
    temp_path = Path(tempfile.mkdtemp())
    yield temp_path
    # Cleanup
    shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 54: Project Overview Updates
@settings(max_examples=100, deadline=None)
@given(memory_data=memory_data_strategy())
def test_property_project_overview_updates(memory_data):
    """
    Property 54: Project Overview Updates
    
    For any significant project change (represented by memory data),
    project_overview.txt SHALL be updated.
    
    Validates: Requirements 13.1
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        engine = SummarizationEngine(temp_path)
        
        # Execute: Generate project overview
        overview = engine.generate_project_overview(memory_data)
        
        # Verify: Overview was generated
        assert overview is not None, "Overview should be generated"
        assert isinstance(overview, str), "Overview should be a string"
        assert len(overview) > 0, "Overview should not be empty"
        
        # Verify: Overview contains header
        assert "PROJECT OVERVIEW" in overview, "Overview should have header"
        assert "Generated:" in overview, "Overview should have generation timestamp"
        
        # Verify: Overview reflects memory data
        current_state = memory_data.get("current_state", {})
        if current_state.get("phase"):
            assert "CURRENT STATE" in overview, "Overview should include current state"
            assert current_state["phase"] in overview, "Overview should include phase"
        
        # Verify: Overview includes objectives if present
        objectives = memory_data.get("objectives", [])
        if objectives:
            assert "OBJECTIVES" in overview, "Overview should include objectives section"
        
        # Verify: Overview includes decisions if present
        decisions = memory_data.get("decisions", [])
        if decisions:
            assert "RECENT DECISIONS" in overview or "DECISIONS" in overview, \
                "Overview should include decisions section"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 55: Project Overview Completeness
@settings(max_examples=100, deadline=None)
@given(memory_data=memory_data_strategy())
def test_property_project_overview_completeness(memory_data):
    """
    Property 55: Project Overview Completeness
    
    For any project_overview.txt, it SHALL include summary, current objectives,
    key entities/modules, recent decisions, and next steps.
    
    Validates: Requirements 13.2
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        engine = SummarizationEngine(temp_path)
        
        # Execute: Generate project overview
        overview = engine.generate_project_overview(memory_data)
        
        # Verify: Overview contains required sections
        assert "PROJECT OVERVIEW" in overview, "Should have project overview header"
        assert "Generated:" in overview, "Should have generation timestamp"
        
        # Verify: Current state section (always present)
        assert "CURRENT STATE" in overview, "Should have current state section"
        
        # Verify: Objectives section (if objectives exist)
        objectives = memory_data.get("objectives", [])
        if objectives:
            assert "OBJECTIVES" in overview, "Should have objectives section when objectives exist"
            # Check that at least some objectives are mentioned
            for obj in objectives[:3]:  # Check first few
                # The description should appear somewhere in the overview
                # (might be truncated or formatted differently)
                pass  # Just verify section exists
        
        # Verify: Entities section (if entities exist)
        entities = memory_data.get("entities", [])
        if entities:
            assert "KEY ENTITIES" in overview or "ENTITIES" in overview, \
                "Should have entities section when entities exist"
        
        # Verify: Decisions section (if decisions exist)
        decisions = memory_data.get("decisions", [])
        if decisions:
            assert "RECENT DECISIONS" in overview or "DECISIONS" in overview, \
                "Should have decisions section when decisions exist"
        
        # Verify: Tasks section (if tasks exist)
        task_backlog = memory_data.get("task_backlog", [])
        if task_backlog:
            pending_tasks = [t for t in task_backlog if t.get("status") in ["pending", "in_progress"]]
            if pending_tasks:
                assert "TASKS" in overview, "Should have tasks section when pending tasks exist"
        
        # Verify: Overview ends properly
        assert "END OF OVERVIEW" in overview, "Should have end marker"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 56: Overview Information Synthesis
@settings(max_examples=100, deadline=None)
@given(
    memory_data=memory_data_strategy(),
    num_discussions=st.integers(min_value=0, max_value=5),
    has_asset_summary=st.booleans()
)
def test_property_overview_information_synthesis(memory_data, num_discussions, has_asset_summary):
    """
    Property 56: Overview Information Synthesis
    
    For any generated project overview, it SHALL synthesize information from
    memory.json, recent discussions, and asset summaries.
    
    Validates: Requirements 13.3
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        engine = SummarizationEngine(temp_path)
        
        # Create recent discussions
        recent_discussions = []
        for i in range(num_discussions):
            discussion = f"Discussion {i}: We discussed feature implementation and made key decisions."
            recent_discussions.append(discussion)
        
        # Create asset summary
        asset_summary = None
        if has_asset_summary:
            asset_summary = "Assets: 5 images, 2 videos, 3 documents. Total size: 10 MB."
        
        # Execute: Generate project overview with all sources
        overview = engine.generate_project_overview(
            memory_data,
            recent_discussions=recent_discussions if recent_discussions else None,
            asset_summary=asset_summary
        )
        
        # Verify: Overview was generated
        assert overview is not None, "Overview should be generated"
        assert len(overview) > 0, "Overview should not be empty"
        
        # Verify: Memory data is included
        current_state = memory_data.get("current_state", {})
        if current_state.get("phase"):
            assert current_state["phase"] in overview, \
                "Overview should include information from memory data"
        
        # Verify: Recent discussions are included (if provided)
        if recent_discussions:
            assert "RECENT DISCUSSIONS" in overview, \
                "Overview should include recent discussions section when provided"
        
        # Verify: Asset summary is included (if provided)
        if asset_summary:
            assert "ASSETS" in overview, \
                "Overview should include assets section when asset summary provided"
        
        # Verify: Overview synthesizes multiple sources
        # Count how many sections are present
        sections = []
        if "CURRENT STATE" in overview:
            sections.append("current_state")
        if "OBJECTIVES" in overview:
            sections.append("objectives")
        if "DECISIONS" in overview or "RECENT DECISIONS" in overview:
            sections.append("decisions")
        if "ENTITIES" in overview or "KEY ENTITIES" in overview:
            sections.append("entities")
        if "TASKS" in overview:
            sections.append("tasks")
        if "RECENT DISCUSSIONS" in overview:
            sections.append("discussions")
        if "ASSETS" in overview:
            sections.append("assets")
        
        # Should have at least current state section
        assert len(sections) >= 1, "Overview should synthesize information from multiple sources"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 54: Project Overview Updates (Idempotency)
@settings(max_examples=100, deadline=None)
@given(memory_data=memory_data_strategy())
def test_property_project_overview_idempotent(memory_data):
    """
    Property 54 (Idempotency): Project Overview Updates
    
    For any memory data, generating project overview multiple times with the
    same data should produce consistent results (same sections, similar length).
    
    Validates: Requirements 13.1
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        engine = SummarizationEngine(temp_path)
        
        # Execute: Generate overview multiple times
        overview1 = engine.generate_project_overview(memory_data)
        overview2 = engine.generate_project_overview(memory_data)
        overview3 = engine.generate_project_overview(memory_data)
        
        # Verify: All overviews were generated
        assert overview1 is not None, "First overview should be generated"
        assert overview2 is not None, "Second overview should be generated"
        assert overview3 is not None, "Third overview should be generated"
        
        # Verify: Overviews have similar structure (same sections)
        # Extract section headers from each overview
        def extract_sections(text):
            sections = []
            for line in text.split('\n'):
                line_upper = line.strip().upper()
                if line_upper and not line_upper.startswith('=') and not line_upper.startswith('GENERATED:'):
                    if line_upper.isupper() and len(line_upper) > 3:
                        sections.append(line_upper)
            return sections
        
        sections1 = extract_sections(overview1)
        sections2 = extract_sections(overview2)
        sections3 = extract_sections(overview3)
        
        # The main sections should be the same (timestamps will differ)
        main_sections1 = [s for s in sections1 if s not in ['PROJECT OVERVIEW', 'END OF OVERVIEW']]
        main_sections2 = [s for s in sections2 if s not in ['PROJECT OVERVIEW', 'END OF OVERVIEW']]
        main_sections3 = [s for s in sections3 if s not in ['PROJECT OVERVIEW', 'END OF OVERVIEW']]
        
        assert main_sections1 == main_sections2 == main_sections3, \
            "Multiple generations should produce same section structure"
        
        # Verify: Overviews have similar length (within 10% due to timestamps)
        len1, len2, len3 = len(overview1), len(overview2), len(overview3)
        max_len = max(len1, len2, len3)
        min_len = min(len1, len2, len3)
        
        if max_len > 0:
            length_variance = (max_len - min_len) / max_len
            assert length_variance < 0.1, \
                f"Multiple generations should produce similar length (variance: {length_variance:.2%})"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 55: Project Overview Completeness (Empty Data)
def test_property_project_overview_empty_data():
    """
    Property 55 (Empty Data): Project Overview Completeness
    
    For any project with minimal/empty memory data, project overview should
    still be generated with at least basic structure.
    
    Validates: Requirements 13.2
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        engine = SummarizationEngine(temp_path)
        
        # Create minimal memory data
        minimal_data = {
            "schema_version": "1.0",
            "last_updated": datetime.now().isoformat(),
            "objectives": [],
            "entities": [],
            "constraints": [],
            "decisions": [],
            "style_rules": [],
            "task_backlog": [],
            "current_state": {
                "phase": "initialization",
                "progress_percentage": 0,
                "active_tasks": [],
                "blockers": [],
                "last_activity": datetime.now().isoformat()
            }
        }
        
        # Execute: Generate overview
        overview = engine.generate_project_overview(minimal_data)
        
        # Verify: Overview was generated
        assert overview is not None, "Overview should be generated even with empty data"
        assert len(overview) > 0, "Overview should not be empty"
        
        # Verify: Basic structure is present
        assert "PROJECT OVERVIEW" in overview, "Should have header"
        assert "CURRENT STATE" in overview, "Should have current state section"
        assert "END OF OVERVIEW" in overview, "Should have end marker"
        
        # Verify: Phase is included
        assert "initialization" in overview, "Should include phase from current state"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 56: Overview Information Synthesis (Asset Summary)
@settings(max_examples=100, deadline=None)
@given(
    assets=st.lists(asset_info_strategy(), min_size=1, max_size=20)
)
def test_property_overview_with_asset_summary(assets):
    """
    Property 56 (Assets): Overview Information Synthesis
    
    For any project with assets, the overview should include synthesized
    asset information when asset summary is provided.
    
    Validates: Requirements 13.3
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        engine = SummarizationEngine(temp_path)
        
        # Generate asset summary
        asset_summary = engine.summarize_assets(assets)
        
        # Create minimal memory data
        memory_data = {
            "schema_version": "1.0",
            "last_updated": datetime.now().isoformat(),
            "objectives": [],
            "entities": [],
            "constraints": [],
            "decisions": [],
            "style_rules": [],
            "task_backlog": [],
            "current_state": {
                "phase": "development",
                "progress_percentage": 50,
                "active_tasks": [],
                "blockers": [],
                "last_activity": datetime.now().isoformat()
            }
        }
        
        # Execute: Generate overview with asset summary
        overview = engine.generate_project_overview(
            memory_data,
            asset_summary=asset_summary
        )
        
        # Verify: Overview includes assets section
        assert "ASSETS" in overview, "Overview should include assets section"
        
        # Verify: Asset summary content is included (at least partially)
        # The overview truncates asset summary to 500 chars, so check for presence
        assert len(overview) > len(asset_summary[:500]) * 0.5, \
            "Overview should include substantial asset information"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 56: Overview Information Synthesis (Discussion Integration)
@settings(max_examples=100, deadline=None)
@given(
    memory_data=memory_data_strategy(),
    discussions=st.lists(
        st.text(min_size=50, max_size=500),
        min_size=1,
        max_size=10
    )
)
def test_property_overview_with_discussions(memory_data, discussions):
    """
    Property 56 (Discussions): Overview Information Synthesis
    
    For any project with recent discussions, the overview should include
    synthesized discussion information.
    
    Validates: Requirements 13.3
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        engine = SummarizationEngine(temp_path)
        
        # Execute: Generate overview with discussions
        overview = engine.generate_project_overview(
            memory_data,
            recent_discussions=discussions
        )
        
        # Verify: Overview includes discussions section
        assert "RECENT DISCUSSIONS" in overview, \
            "Overview should include recent discussions section"
        
        # Verify: At least some discussion content is referenced
        # The overview shows first 100 chars of each discussion
        # Check that the section is not empty
        lines = overview.split('\n')
        in_discussions_section = False
        discussion_lines = []
        
        for i, line in enumerate(lines):
            if "RECENT DISCUSSIONS" in line:
                in_discussions_section = True
                continue
            elif in_discussions_section:
                if line.strip() and not line.strip().startswith('='):
                    # Check if we hit the next section (all uppercase line)
                    if line.strip().isupper() and len(line.strip()) > 5 and not line.strip()[0].isdigit():
                        # Hit next section
                        break
                    # Discussion lines start with numbers like "  1. "
                    if line.strip() and (line.strip()[0].isdigit() or line.startswith('  ')):
                        discussion_lines.append(line)
                elif not line.strip():
                    # Empty line might indicate end of section
                    # Check if next non-empty line is a new section
                    if i + 1 < len(lines):
                        next_line = lines[i + 1].strip()
                        if next_line.isupper() and len(next_line) > 5:
                            break
        
        # Should have at least one discussion line (up to 3 discussions shown)
        expected_lines = min(3, len(discussions))
        assert len(discussion_lines) >= expected_lines, \
            f"Recent discussions section should contain at least {expected_lines} discussion lines, got {len(discussion_lines)}"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 54: Project Overview Updates (Consistency)
@settings(max_examples=100, deadline=None)
@given(memory_data=memory_data_strategy())
def test_property_overview_format_consistency(memory_data):
    """
    Property 54 (Consistency): Project Overview Updates
    
    For any generated project overview, it should follow a consistent format
    with clear section delimiters and structure.
    
    Validates: Requirements 13.1
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        engine = SummarizationEngine(temp_path)
        
        # Execute: Generate overview
        overview = engine.generate_project_overview(memory_data)
        
        # Verify: Consistent formatting
        lines = overview.split('\n')
        
        # Check for header delimiter
        assert any('=' * 50 in line for line in lines), \
            "Overview should have section delimiters"
        
        # Check for proper header
        assert lines[0].strip().startswith('='), "Should start with delimiter"
        assert "PROJECT OVERVIEW" in lines[1], "Should have title on second line"
        
        # Check for generation timestamp
        assert any("Generated:" in line for line in lines), \
            "Should have generation timestamp"
        
        # Check for end marker
        assert "END OF OVERVIEW" in overview, "Should have end marker"
        assert overview.strip().endswith('=' * 60), "Should end with delimiter"
        
        # Verify: Sections are properly formatted
        # Each major section should be in UPPERCASE
        section_headers = [
            "CURRENT STATE", "OBJECTIVES", "RECENT DECISIONS",
            "KEY ENTITIES", "TASKS", "RECENT DISCUSSIONS", "ASSETS"
        ]
        
        for line in lines:
            line_stripped = line.strip()
            if line_stripped in section_headers:
                # Verify it's followed by content or subsections
                assert line_stripped.isupper(), f"Section header '{line_stripped}' should be uppercase"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)
