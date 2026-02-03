"""
Integration tests for QA Narrative API endpoints.

Tests all 9 QA narrative endpoints with real API calls.
"""

import pytest
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from api.router import APIRouter
from api.config import APIConfig
from api.models import RequestContext
from api.categories.qa_narrative import QANarrativeCategoryHandler
from api.categories.narration_models import LLMConfig


@pytest.fixture
def api_config():
    """Create test API configuration."""
    return APIConfig(
        version="v1",
        host="localhost",
        port=8000,
        enable_auth=False,
        enable_rate_limiting=False,
        log_api_calls=True,
    )


@pytest.fixture
def router(api_config):
    """Create API router."""
    return APIRouter(api_config)


@pytest.fixture
def llm_config():
    """Create LLM configuration for testing."""
    return LLMConfig(provider="mock")


@pytest.fixture
def qa_handler(api_config, router, llm_config):
    """Create QA narrative category handler."""
    return QANarrativeCategoryHandler(api_config, router, llm_config)


@pytest.fixture
def request_context():
    """Create test request context."""
    return RequestContext(
        request_id="test-qa-request-001",
        user=None,
    )


@pytest.fixture
def sample_narrative():
    """Sample narrative for testing."""
    return """
    In a small village nestled between mountains, a young hero named Alex discovered an ancient artifact.
    The artifact glowed with mysterious power. Alex knew this discovery would change everything.
    
    "I must protect this," Alex said to their companion, Sam.
    "But from whom?" Sam replied nervously.
    
    As night fell, shadows crept closer. The adventure was just beginning.
    """


@pytest.fixture
def sample_dialogue():
    """Sample dialogue for testing."""
    return """
    "We need to leave now," Sarah said urgently.
    "But what about the others?" John asked.
    "They'll have to catch up. We can't wait any longer."
    John hesitated, then nodded. "You're right. Let's go."
    """


class TestNarrativeAnalysisEndpoints:
    """Test narrative analysis endpoints."""
    
    def test_check_coherence(self, qa_handler, request_context, sample_narrative):
        """Test coherence analysis endpoint."""
        params = {
            "narrative": sample_narrative,
        }
        
        response = qa_handler.check_coherence(params, request_context)
        
        assert response.status == "success"
        assert "overall_score" in response.data
        assert "logical_consistency" in response.data
        assert "plot_coherence" in response.data
        assert "character_consistency" in response.data
        assert "issues" in response.data
        assert "strengths" in response.data
        assert "recommendations" in response.data
        
        # Verify score is in valid range
        assert 0.0 <= response.data["overall_score"] <= 1.0
    
    def test_check_coherence_missing_narrative(self, qa_handler, request_context):
        """Test coherence check with missing narrative."""
        params = {}
        
        response = qa_handler.check_coherence(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_check_pacing(self, qa_handler, request_context, sample_narrative):
        """Test pacing analysis endpoint."""
        params = {
            "narrative": sample_narrative,
        }
        
        response = qa_handler.check_pacing(params, request_context)
        
        assert response.status == "success"
        assert "overall_pace" in response.data
        assert "pace_score" in response.data
        assert "act_pacing" in response.data
        assert "scene_pacing" in response.data
        assert "rhythm_analysis" in response.data
        assert "recommendations" in response.data
        
        # Verify pace is valid
        assert response.data["overall_pace"] in ["slow", "moderate", "fast", "varied"]
        assert 0.0 <= response.data["pace_score"] <= 1.0
    
    def test_check_character(self, qa_handler, request_context, sample_narrative):
        """Test character analysis endpoint."""
        params = {
            "narrative": sample_narrative,
        }
        
        response = qa_handler.check_character(params, request_context)
        
        assert response.status == "success"
        assert "overall_score" in response.data
        assert "consistency_score" in response.data
        assert "development_score" in response.data
        assert "characters" in response.data
        assert "issues" in response.data
        assert "recommendations" in response.data
        
        # Verify scores are in valid range
        assert 0.0 <= response.data["overall_score"] <= 1.0
        assert 0.0 <= response.data["consistency_score"] <= 1.0
        assert 0.0 <= response.data["development_score"] <= 1.0
    
    def test_check_dialogue(self, qa_handler, request_context, sample_dialogue):
        """Test dialogue quality analysis endpoint."""
        params = {
            "narrative": sample_dialogue,
        }
        
        response = qa_handler.check_dialogue(params, request_context)
        
        assert response.status == "success"
        assert "overall_score" in response.data
        assert "naturalness_score" in response.data
        assert "character_voice_score" in response.data
        assert "subtext_score" in response.data
        assert "issues" in response.data
        assert "examples" in response.data
        assert "recommendations" in response.data
        
        # Verify scores are in valid range
        assert 0.0 <= response.data["overall_score"] <= 1.0


class TestTextQualityEndpoints:
    """Test text quality endpoints."""
    
    def test_check_grammar(self, qa_handler, request_context):
        """Test grammar checking endpoint."""
        text_with_errors = "This sentence have a error. Their going to the store."
        
        params = {
            "text": text_with_errors,
        }
        
        response = qa_handler.check_grammar(params, request_context)
        
        assert response.status == "success"
        assert "overall_score" in response.data
        assert "grammar_errors" in response.data
        assert "spelling_errors" in response.data
        assert "syntax_issues" in response.data
        assert "error_count" in response.data
        assert "suggestions" in response.data
        
        # Verify score is in valid range
        assert 0.0 <= response.data["overall_score"] <= 1.0
    
    def test_check_grammar_missing_text(self, qa_handler, request_context):
        """Test grammar check with missing text."""
        params = {}
        
        response = qa_handler.check_grammar(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_check_readability(self, qa_handler, request_context, sample_narrative):
        """Test readability analysis endpoint."""
        params = {
            "text": sample_narrative,
        }
        
        response = qa_handler.check_readability(params, request_context)
        
        assert response.status == "success"
        assert "flesch_reading_ease" in response.data
        assert "flesch_kincaid_grade" in response.data
        assert "gunning_fog_index" in response.data
        assert "overall_readability" in response.data
        assert "target_audience" in response.data
        assert "recommendations" in response.data
        assert "metrics_explanation" in response.data
        
        # Verify readability level is valid
        assert response.data["overall_readability"] in ["easy", "moderate", "difficult"]
        
        # Verify scores are reasonable
        assert 0.0 <= response.data["flesch_reading_ease"] <= 100.0
        assert response.data["flesch_kincaid_grade"] >= 0.0
        assert response.data["gunning_fog_index"] >= 0.0
    
    def test_check_readability_simple_text(self, qa_handler, request_context):
        """Test readability with simple text."""
        simple_text = "The cat sat on the mat. The dog ran in the park. They were happy."
        
        params = {
            "text": simple_text,
        }
        
        response = qa_handler.check_readability(params, request_context)
        
        assert response.status == "success"
        # Simple text should have high readability score
        assert response.data["flesch_reading_ease"] > 60.0
        assert response.data["overall_readability"] in ["easy", "moderate"]
    
    def test_check_readability_complex_text(self, qa_handler, request_context):
        """Test readability with complex text."""
        complex_text = """
        The implementation of sophisticated algorithmic methodologies necessitates 
        comprehensive understanding of computational complexity theory and its 
        ramifications on performance optimization strategies.
        """
        
        params = {
            "text": complex_text,
        }
        
        response = qa_handler.check_readability(params, request_context)
        
        assert response.status == "success"
        # Complex text should have lower readability score
        assert response.data["flesch_reading_ease"] < 60.0


class TestContentAnalysisEndpoints:
    """Test content analysis endpoints."""
    
    def test_analyze_tropes(self, qa_handler, request_context, sample_narrative):
        """Test trope analysis endpoint."""
        params = {
            "narrative": sample_narrative,
        }
        
        response = qa_handler.analyze_tropes(params, request_context)
        
        assert response.status == "success"
        assert "tropes_found" in response.data
        assert "cliches" in response.data
        assert "originality_score" in response.data
        assert "overused_patterns" in response.data
        assert "recommendations" in response.data
        
        # Verify score is in valid range
        assert 0.0 <= response.data["originality_score"] <= 1.0
    
    def test_analyze_tropes_missing_narrative(self, qa_handler, request_context):
        """Test trope analysis with missing narrative."""
        params = {}
        
        response = qa_handler.analyze_tropes(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_analyze_themes(self, qa_handler, request_context, sample_narrative):
        """Test theme analysis endpoint."""
        params = {
            "narrative": sample_narrative,
        }
        
        response = qa_handler.analyze_themes(params, request_context)
        
        assert response.status == "success"
        assert "primary_themes" in response.data
        assert "secondary_themes" in response.data
        assert "theme_development" in response.data
        assert "symbolic_elements" in response.data
        assert "thematic_consistency" in response.data
        assert "recommendations" in response.data
        
        # Verify score is in valid range
        assert 0.0 <= response.data["thematic_consistency"] <= 1.0
    
    def test_generate_report_all_sections(self, qa_handler, request_context, sample_narrative):
        """Test comprehensive report generation with all sections."""
        params = {
            "narrative": sample_narrative,
            "include_sections": [
                "coherence", "pacing", "character", "dialogue",
                "grammar", "readability", "tropes", "themes"
            ],
        }
        
        response = qa_handler.generate_report(params, request_context)
        
        assert response.status == "success"
        assert "overall_score" in response.data
        assert "narrative_length" in response.data
        assert "word_count" in response.data
        assert "generated_at" in response.data
        assert "summary" in response.data
        assert "recommendations" in response.data
        assert "sections_analyzed" in response.data
        
        # Verify all sections are present
        assert "coherence" in response.data
        assert "pacing" in response.data
        assert "character" in response.data
        assert "dialogue" in response.data
        assert "grammar" in response.data
        assert "readability" in response.data
        assert "tropes" in response.data
        assert "themes" in response.data
        
        # Verify overall score is in valid range
        assert 0.0 <= response.data["overall_score"] <= 1.0
    
    def test_generate_report_selective_sections(self, qa_handler, request_context, sample_narrative):
        """Test report generation with selective sections."""
        params = {
            "narrative": sample_narrative,
            "include_sections": ["coherence", "readability"],
        }
        
        response = qa_handler.generate_report(params, request_context)
        
        assert response.status == "success"
        assert "overall_score" in response.data
        assert "coherence" in response.data
        assert "readability" in response.data
        
        # Verify other sections are not included
        assert "pacing" not in response.data
        assert "character" not in response.data
        assert "dialogue" not in response.data
    
    def test_generate_report_default_sections(self, qa_handler, request_context, sample_narrative):
        """Test report generation with default sections."""
        params = {
            "narrative": sample_narrative,
        }
        
        response = qa_handler.generate_report(params, request_context)
        
        assert response.status == "success"
        assert "overall_score" in response.data
        assert "summary" in response.data
        assert "recommendations" in response.data
        
        # Default should include all sections
        assert len(response.data["sections_analyzed"]) == 8
    
    def test_generate_report_missing_narrative(self, qa_handler, request_context):
        """Test report generation with missing narrative."""
        params = {}
        
        response = qa_handler.generate_report(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"


class TestQANarrativeIntegration:
    """Test integration scenarios for QA narrative endpoints."""
    
    def test_complete_qa_workflow(self, qa_handler, request_context, sample_narrative):
        """Test a complete QA workflow."""
        # Step 1: Check coherence
        coherence_response = qa_handler.check_coherence(
            {"narrative": sample_narrative}, request_context
        )
        assert coherence_response.status == "success"
        coherence_score = coherence_response.data["overall_score"]
        
        # Step 2: Check readability
        readability_response = qa_handler.check_readability(
            {"text": sample_narrative}, request_context
        )
        assert readability_response.status == "success"
        readability_level = readability_response.data["overall_readability"]
        
        # Step 3: Analyze themes
        themes_response = qa_handler.analyze_themes(
            {"narrative": sample_narrative}, request_context
        )
        assert themes_response.status == "success"
        themes = themes_response.data["primary_themes"]
        
        # Step 4: Generate comprehensive report
        report_response = qa_handler.generate_report(
            {"narrative": sample_narrative}, request_context
        )
        assert report_response.status == "success"
        
        # Verify report includes all individual analyses
        assert "coherence" in report_response.data
        assert "readability" in report_response.data
        assert "themes" in report_response.data
        
        # Verify overall score is calculated
        assert report_response.data["overall_score"] > 0.0
    
    def test_error_handling_consistency(self, qa_handler, request_context):
        """Test that all endpoints handle errors consistently."""
        endpoints = [
            ("check_coherence", {"narrative": ""}),
            ("check_pacing", {"narrative": ""}),
            ("check_character", {"narrative": ""}),
            ("check_dialogue", {"narrative": ""}),
            ("check_grammar", {"text": ""}),
            ("check_readability", {"text": ""}),
            ("analyze_tropes", {"narrative": ""}),
            ("analyze_themes", {"narrative": ""}),
            ("generate_report", {"narrative": ""}),
        ]
        
        for endpoint_name, params in endpoints:
            endpoint = getattr(qa_handler, endpoint_name)
            response = endpoint(params, request_context)
            
            # All endpoints should handle empty input gracefully
            # Either succeed with minimal analysis or return validation error
            assert response.status in ["success", "error"]
            
            if response.status == "error":
                assert response.error.code in ["VALIDATION_ERROR", "INTERNAL_ERROR"]
    
    def test_readability_metrics_consistency(self, qa_handler, request_context):
        """Test that readability metrics are consistent across different texts."""
        texts = [
            ("Simple text", "The cat sat. The dog ran. They played."),
            ("Medium text", "In the morning, the children went to school. They learned many things."),
            ("Complex text", "The implementation of sophisticated methodologies requires comprehensive analysis."),
        ]
        
        scores = []
        for name, text in texts:
            params = {"text": text}
            response = qa_handler.check_readability(params, request_context)
            
            assert response.status == "success"
            scores.append(response.data["flesch_reading_ease"])
        
        # Simple text should have highest readability score
        assert scores[0] > scores[1]
        # Complex text should have lowest readability score
        assert scores[2] < scores[1]
    
    def test_report_score_aggregation(self, qa_handler, request_context, sample_narrative):
        """Test that report overall score is properly aggregated."""
        params = {
            "narrative": sample_narrative,
            "include_sections": ["coherence", "pacing", "character"],
        }
        
        response = qa_handler.generate_report(params, request_context)
        
        assert response.status == "success"
        
        # Calculate expected average
        scores = []
        if "coherence" in response.data:
            scores.append(response.data["coherence"].get("overall_score", 0.0))
        if "pacing" in response.data:
            scores.append(response.data["pacing"].get("pace_score", 0.0))
        if "character" in response.data:
            scores.append(response.data["character"].get("overall_score", 0.0))
        
        if scores:
            expected_avg = sum(scores) / len(scores)
            # Overall score should be close to average (allowing for rounding)
            assert abs(response.data["overall_score"] - expected_avg) < 0.01


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
