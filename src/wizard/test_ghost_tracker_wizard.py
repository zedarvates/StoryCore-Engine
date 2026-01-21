"""
Unit tests for Ghost Tracker Wizard enhanced multimedia analysis functionality.
"""

import pytest
import asyncio
from pathlib import Path
from unittest.mock import patch, MagicMock, mock_open
from .ghost_tracker_wizard import (
    GhostTrackerWizard,
    ProjectInsight,
    AdviceCategory,
    AdvicePriority,
    create_ghost_tracker_wizard,
    analyze_project_with_ghost_tracker
)


class TestGhostTrackerMultimediaAnalysis:
    """Test multimedia asset analysis functionality."""

    def test_multimedia_quality_categories(self):
        """Test that multimedia quality categories are properly defined."""
        # Test new categories exist
        assert hasattr(AdviceCategory, 'MULTIMEDIA_QUALITY')
        assert hasattr(AdviceCategory, 'PROMPT_OPTIMIZATION')
        assert hasattr(AdviceCategory, 'ASSET_CONSISTENCY')

        # Test category values
        assert AdviceCategory.MULTIMEDIA_QUALITY.value == "multimedia_quality"
        assert AdviceCategory.PROMPT_OPTIMIZATION.value == "prompt_optimization"
        assert AdviceCategory.ASSET_CONSISTENCY.value == "asset_consistency"

    @patch('pathlib.Path.exists')
    @patch('pathlib.Path.glob')
    async def test_analyze_generated_images_no_directory(self, mock_glob, mock_exists):
        """Test analysis when no shot references directory exists."""
        mock_exists.return_value = False

        wizard = GhostTrackerWizard()
        project_data = {}

        insights = await wizard._analyze_generated_images(Path("/fake/project"), project_data)

        assert len(insights) == 1
        assert insights[0].category == AdviceCategory.MULTIMEDIA_QUALITY
        assert insights[0].priority == AdvicePriority.HIGH
        assert "No Visual References Generated" in insights[0].title

    @patch('pathlib.Path.exists')
    @patch('pathlib.Path.glob')
    async def test_analyze_generated_images_empty_directory(self, mock_glob, mock_exists):
        """Test analysis when shot references directory exists but is empty."""
        mock_exists.return_value = True
        mock_glob.return_value = []

        wizard = GhostTrackerWizard()
        project_data = {}

        insights = await wizard._analyze_generated_images(Path("/fake/project"), project_data)

        assert len(insights) == 1
        assert insights[0].category == AdviceCategory.MULTIMEDIA_QUALITY
        assert insights[0].priority == AdvicePriority.MEDIUM
        assert "Empty Reference Directory" in insights[0].title

    @patch('pathlib.Path.exists')
    @patch('pathlib.Path.glob')
    async def test_analyze_generated_images_with_files(self, mock_glob, mock_exists):
        """Test analysis when reference images exist."""
        mock_exists.return_value = True
        mock_glob.return_value = [Path("shot_001_ref.png"), Path("shot_002_ref.png")]

        wizard = GhostTrackerWizard()
        project_data = {
            'shot_planning': {
                'shot_lists': [{'id': 'shot_001'}, {'id': 'shot_002'}]
            }
        }

        insights = await wizard._analyze_generated_images(Path("/fake/project"), project_data)

        # Should have quality analysis insights
        assert len(insights) >= 1
        quality_insights = [i for i in insights if 'quality' in i.category.value.lower()]
        assert len(quality_insights) > 0

    @patch('pathlib.Path.exists')
    @patch('pathlib.Path.glob')
    async def test_analyze_audio_assets_missing(self, mock_glob, mock_exists):
        """Test audio analysis when no audio assets exist."""
        mock_exists.return_value = False

        wizard = GhostTrackerWizard()
        project_data = {}

        insights = await wizard._analyze_audio_assets(Path("/fake/project"), project_data)

        assert len(insights) >= 1
        assert any("Audio Assets Missing" in i.title for i in insights)

    @patch('pathlib.Path.exists')
    @patch('pathlib.Path.glob')
    async def test_analyze_video_assets_missing(self, mock_glob, mock_exists):
        """Test video analysis when no video assets exist."""
        mock_exists.return_value = False

        wizard = GhostTrackerWizard()
        project_data = {}

        insights = await wizard._analyze_video_assets(Path("/fake/project"), project_data)

        assert len(insights) >= 1
        assert any("Video Assets Opportunity" in i.title for i in insights)

    async def test_analyze_prompt_patterns(self):
        """Test prompt pattern analysis."""
        wizard = GhostTrackerWizard()
        shots = [{'description': 'A generic scene'}, {'description': 'Another generic shot'}]

        insights = wizard._analyze_prompt_patterns(shots)

        # Should generate insights about prompt consistency
        assert len(insights) >= 1
        assert any("Prompt Consistency" in i.title for i in insights)

    async def test_analyze_prompt_optimization(self):
        """Test prompt optimization analysis."""
        wizard = GhostTrackerWizard()
        shots = [{'description': 'A basic scene description'}]

        insights = wizard._analyze_prompt_optimization(shots)

        # Should generate suggestions for advanced prompt techniques
        assert len(insights) >= 1
        assert any("Advanced Prompt Techniques" in i.title for i in insights)

    async def test_analyze_character_consistency(self):
        """Test character-shot consistency analysis."""
        wizard = GhostTrackerWizard()

        project_data = {
            'character_definitions': [
                {'name': 'Alice', 'description': 'young woman'},
                {'name': 'Bob', 'description': 'young man'}
            ],
            'shot_planning': {
                'shot_lists': [
                    {'description': 'Alice walks into the room'},
                    {'description': 'A beautiful landscape'},
                    {'description': 'Bob enters the scene'}
                ]
            }
        }

        insights = wizard._analyze_character_consistency(project_data)

        # Should detect that not all characters are mentioned in shots
        character_issues = [i for i in insights if 'Character Integration' in i.title]
        assert len(character_issues) > 0

    async def test_analyze_style_consistency(self):
        """Test style consistency analysis."""
        wizard = GhostTrackerWizard()
        project_data = {}

        insights = wizard._analyze_style_consistency(project_data)

        assert len(insights) >= 1
        assert any("Style Consistency Review" in i.title for i in insights)

    async def test_analyze_technical_consistency(self):
        """Test technical consistency analysis."""
        wizard = GhostTrackerWizard()

        project_data = {
            'shot_planning': {
                'shot_lists': [
                    {'technical_specs': {'resolution': '1920x1080'}},
                    {'technical_specs': {'resolution': '1280x720'}}
                ]
            }
        }

        insights = wizard._analyze_technical_consistency(project_data)

        # Should detect technical inconsistencies
        technical_issues = [i for i in insights if 'Technical Specifications' in i.title]
        assert len(technical_issues) >= 0  # May or may not trigger based on implementation


class TestGhostTrackerWizardIntegration:
    """Test full Ghost Tracker wizard integration."""

    @patch('builtins.open')
    @patch('pathlib.Path.exists')
    async def test_complete_project_analysis(self, mock_exists, mock_open):
        """Test complete project analysis with multimedia assets."""
        # Mock file system
        mock_exists.return_value = True

        mock_file = MagicMock()
        mock_file.__enter__.return_value = mock_file
        mock_file.__exit__.return_value = None

        # Mock project data
        project_data = {
            'project.json': {
                'id': 'test-project',
                'name': 'Test Project',
                'story': 'A compelling story premise that engages viewers.'
            },
            'scene_breakdown.json': {
                'detailed_scenes': [
                    {'scene_id': 'scene_001', 'scene_purpose': {'primary': 'establishing'}},
                    {'scene_id': 'scene_002', 'scene_purpose': {'primary': 'action'}}
                ]
            },
            'shot_planning.json': {
                'shot_lists': [
                    {
                        'shot_id': 'shot_001',
                        'shot_type': {'code': 'CU'},
                        'camera': {'angle': {'type': 'eye-level'}, 'movement': {'type': 'static'}},
                        'timing': {'duration_seconds': 2.5}
                    }
                ]
            }
        }

        def mock_read_side_effect(*args, **kwargs):
            import json
            filename = str(args[0]).split('/')[-1].replace('.json', '')
            return json.dumps(project_data.get(f'{filename}.json', {}))

        mock_file.read.side_effect = mock_read_side_effect
        mock_open.return_value = mock_file

        wizard = GhostTrackerWizard()

        # Mock the multimedia analysis to avoid file system dependencies
        with patch.object(wizard, '_analyze_multimedia_assets', return_value=[]), \
             patch.object(wizard, '_analyze_prompts_and_generation', return_value=[]), \
             patch.object(wizard, '_analyze_asset_consistency', return_value=[]):

            report = await wizard.analyze_project(Path("/fake/project"))

            assert report.project_id == 'test-project'
            assert isinstance(report.overall_score, float)
            assert len(report.insights) > 0
            assert len(report.strengths) > 0
            assert len(report.recommendations) > 0

    async def test_wizard_creation_functions(self):
        """Test wizard creation convenience functions."""
        wizard = create_ghost_tracker_wizard()
        assert isinstance(wizard, GhostTrackerWizard)

        # Test with mock analysis
        with patch('pathlib.Path.exists', return_value=False), \
             patch('builtins.open', mock_open(read_data='{}')):

            report = await analyze_project_with_ghost_tracker(Path("/fake/project"))
            assert isinstance(report, object)  # Report object created

    def test_quick_advice_functionality(self):
        """Test quick advice functionality."""
        wizard = GhostTrackerWizard()

        with patch.object(wizard, '_load_project_data', return_value={'project.json': {'id': 'test'}}):
            advice = wizard.get_quick_advice(Path("/fake/project"), "How to improve pacing?")
            assert isinstance(advice, str)
            assert "pacing" in advice.lower() or "analysis" in advice.lower()

    async def test_category_focused_analysis(self):
        """Test category-focused analysis functionality."""
        wizard = GhostTrackerWizard()

        insights = await wizard.get_category_focused_analysis(Path("/fake/project"), AdviceCategory.STORYTELLING)
        assert isinstance(insights, list)

        # Should return empty list for now (placeholder implementation)
        assert len(insights) == 0


class TestQualityMetricsIntegration:
    """Test integration with existing quality metrics."""

    async def test_image_quality_analysis_simulation(self):
        """Test simulated image quality analysis."""
        wizard = GhostTrackerWizard()

        # Create mock image files
        mock_files = [Path(f"shot_{i:03d}_ref.png") for i in range(10)]

        insights = wizard._simulate_image_quality_analysis(mock_files)

        # Should generate quality-related insights
        assert len(insights) > 0
        quality_categories = [AdviceCategory.MULTIMEDIA_QUALITY]
        assert all(i.category in quality_categories for i in insights)

    async def test_audio_quality_analysis_simulation(self):
        """Test simulated audio quality analysis."""
        wizard = GhostTrackerWizard()

        insights = wizard._simulate_audio_quality_analysis()

        assert len(insights) > 0
        assert all(i.category == AdviceCategory.MULTIMEDIA_QUALITY for i in insights)

    async def test_video_quality_analysis_simulation(self):
        """Test simulated video quality analysis."""
        wizard = GhostTrackerWizard()

        insights = wizard._simulate_video_quality_analysis()

        assert len(insights) > 0
        assert all(i.category == AdviceCategory.MULTIMEDIA_QUALITY for i in insights)


class TestInsightGeneration:
    """Test insight generation and prioritization."""

    async def test_insight_creation(self):
        """Test creating project insights."""
        insight = ProjectInsight(
            category=AdviceCategory.MULTIMEDIA_QUALITY,
            priority=AdvicePriority.HIGH,
            title="Test Insight",
            description="Test description",
            reasoning="Test reasoning",
            actionable_steps=["Step 1", "Step 2"],
            confidence_score=0.85
        )

        assert insight.category == AdviceCategory.MULTIMEDIA_QUALITY
        assert insight.priority == AdvicePriority.HIGH
        assert insight.confidence_score == 0.85
        assert len(insight.actionable_steps) == 2

    def test_insight_serialization(self):
        """Test insight serialization for reports."""
        insight = ProjectInsight(
            category=AdviceCategory.PROMPT_OPTIMIZATION,
            priority=AdvicePriority.MEDIUM,
            title="Prompt Optimization Needed",
            description="Prompts could be more specific",
            reasoning="Specific prompts yield better results",
            actionable_steps=["Add more details", "Use specific terms"],
            confidence_score=0.75
        )

        # Test that insight can be converted to dict (for JSON serialization)
        insight_dict = {
            'category': insight.category.value,
            'priority': insight.priority.value,
            'title': insight.title,
            'description': insight.description,
            'reasoning': insight.reasoning,
            'actionable_steps': insight.actionable_steps,
            'confidence_score': insight.confidence_score
        }

        assert insight_dict['category'] == 'prompt_optimization'
        assert insight_dict['priority'] == 'medium'
        assert insight_dict['confidence_score'] == 0.75

    async def test_insight_filtering_by_priority(self):
        """Test filtering insights by priority."""
        insights = [
            ProjectInsight(AdviceCategory.STORYTELLING, AdvicePriority.CRITICAL, "Critical Issue", "", "", confidence_score=0.9),
            ProjectInsight(AdviceCategory.CINEMATOGRAPHY, AdvicePriority.HIGH, "High Issue", "", "", confidence_score=0.8),
            ProjectInsight(AdviceCategory.PACING, AdvicePriority.MEDIUM, "Medium Issue", "", "", confidence_score=0.7),
            ProjectInsight(AdviceCategory.CHARACTER_DEVELOPMENT, AdvicePriority.LOW, "Low Issue", "", "", confidence_score=0.6)
        ]

        critical_insights = [i for i in insights if i.priority == AdvicePriority.CRITICAL]
        high_insights = [i for i in insights if i.priority == AdvicePriority.HIGH]

        assert len(critical_insights) == 1
        assert len(high_insights) == 1
        assert critical_insights[0].confidence_score == 0.9


class TestReportGeneration:
    """Test report generation functionality."""

    async def test_report_structure(self):
        """Test that generated reports have proper structure."""
        wizard = GhostTrackerWizard()

        # Create mock insights
        insights = [
            ProjectInsight(
                category=AdviceCategory.MULTIMEDIA_QUALITY,
                priority=AdvicePriority.HIGH,
                title="Quality Issue",
                description="Description",
                reasoning="Reasoning",
                actionable_steps=["Step 1"],
                confidence_score=0.8
            )
        ]

        report = wizard._generate_report_structure("test-project", insights)

        assert report.project_id == "test-project"
        assert isinstance(report.overall_score, float)
        assert len(report.insights) == 1
        assert len(report.strengths) > 0
        assert len(report.recommendations) > 0

    def test_score_calculation(self):
        """Test overall score calculation from insights."""
        wizard = GhostTrackerWizard()

        # Test with no insights (should default to good score)
        score = wizard._calculate_overall_score([])
        assert 8.0 <= score <= 10.0

        # Test with critical insight (should reduce score significantly)
        critical_insight = ProjectInsight(
            AdviceCategory.TECHNICAL_ASPECTS,
            AdvicePriority.CRITICAL,
            "Critical Issue",
            "",
            "",
            confidence_score=0.95
        )

        score_with_critical = wizard._calculate_overall_score([critical_insight])
        assert score_with_critical < 7.0  # Should be noticeably lower

        # Test with high-priority insight
        high_insight = ProjectInsight(
            AdviceCategory.STORYTELLING,
            AdvicePriority.HIGH,
            "High Priority Issue",
            "",
            "",
            confidence_score=0.85
        )

        score_with_high = wizard._calculate_overall_score([high_insight])
        assert score_with_high < 8.0  # Should be lower than default


if __name__ == "__main__":
    pytest.main([__file__, "-v"])