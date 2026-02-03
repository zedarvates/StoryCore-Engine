"""
QA Narrative Category Handler

This module implements all 9 QA narrative API endpoints for testing and validating
narrative quality and consistency.
"""

import logging
import re
from typing import Dict, Any, Optional, List
from datetime import datetime

from ..base_handler import BaseAPIHandler
from ..models import APIResponse, RequestContext, ErrorCodes
from ..config import APIConfig
from ..router import APIRouter

from .qa_narrative_models import (
    CoherenceAnalysis,
    PacingAnalysis,
    CharacterQAAnalysis,
    DialogueQAAnalysis,
    GrammarAnalysis,
    ReadabilityAnalysis,
    TropeAnalysis,
    ThemeAnalysis,
    QANarrativeReport,
)
from .llm_service import LLMService
from .narration_models import LLMConfig

logger = logging.getLogger(__name__)


class QANarrativeCategoryHandler(BaseAPIHandler):
    """
    Handler for QA Narrative API category.
    
    Implements 9 endpoints for narrative quality assurance and testing.
    """
    
    def __init__(self, config: APIConfig, router: APIRouter, llm_config: Optional[LLMConfig] = None):
        """
        Initialize QA narrative handler.
        
        Args:
            config: API configuration
            router: API router for endpoint registration
            llm_config: LLM service configuration (uses mock if None)
        """
        super().__init__(config)
        self.router = router
        
        # Initialize LLM service for analysis
        if llm_config is None:
            llm_config = LLMConfig(provider="mock")
        self.llm = LLMService(llm_config)
        
        # Register all endpoints
        self.register_endpoints()
        
        logger.info("Initialized QANarrativeCategoryHandler with 9 endpoints")
    
    def register_endpoints(self) -> None:
        """Register all QA narrative endpoints with the router."""
        
        # Narrative analysis endpoints (4)
        self.router.register_endpoint(
            path="storycore.qa.narrative.coherence",
            method="POST",
            handler=self.check_coherence,
            description="Analyze story logical consistency",
            async_capable=False,
        )
        
        self.router.register_endpoint(
            path="storycore.qa.narrative.pacing",
            method="POST",
            handler=self.check_pacing,
            description="Evaluate story rhythm and timing",
            async_capable=False,
        )
        
        self.router.register_endpoint(
            path="storycore.qa.narrative.character",
            method="POST",
            handler=self.check_character,
            description="Check character consistency and development",
            async_capable=False,
        )
        
        self.router.register_endpoint(
            path="storycore.qa.narrative.dialogue",
            method="POST",
            handler=self.check_dialogue,
            description="Assess dialogue quality and naturalness",
            async_capable=False,
        )
        
        # Text quality endpoints (2)
        self.router.register_endpoint(
            path="storycore.qa.narrative.grammar",
            method="POST",
            handler=self.check_grammar,
            description="Check grammar, spelling, and syntax",
            async_capable=False,
        )
        
        self.router.register_endpoint(
            path="storycore.qa.narrative.readability",
            method="POST",
            handler=self.check_readability,
            description="Calculate readability scores",
            async_capable=False,
        )
        
        # Content analysis endpoints (3)
        self.router.register_endpoint(
            path="storycore.qa.narrative.tropes",
            method="POST",
            handler=self.analyze_tropes,
            description="Identify common narrative patterns and clichés",
            async_capable=False,
        )
        
        self.router.register_endpoint(
            path="storycore.qa.narrative.themes",
            method="POST",
            handler=self.analyze_themes,
            description="Extract and analyze thematic elements",
            async_capable=False,
        )
        
        self.router.register_endpoint(
            path="storycore.qa.narrative.report",
            method="POST",
            handler=self.generate_report,
            description="Generate comprehensive quality report",
            async_capable=True,
        )
    
    # Helper methods for readability calculations
    
    def _count_syllables(self, word: str) -> int:
        """
        Count syllables in a word (simple heuristic).
        
        Args:
            word: Word to analyze
            
        Returns:
            Estimated syllable count
        """
        word = word.lower()
        vowels = "aeiouy"
        syllable_count = 0
        previous_was_vowel = False
        
        for char in word:
            is_vowel = char in vowels
            if is_vowel and not previous_was_vowel:
                syllable_count += 1
            previous_was_vowel = is_vowel
        
        # Adjust for silent e
        if word.endswith('e'):
            syllable_count -= 1
        
        # Ensure at least one syllable
        if syllable_count == 0:
            syllable_count = 1
        
        return syllable_count
    
    def _calculate_flesch_reading_ease(self, text: str) -> float:
        """
        Calculate Flesch Reading Ease score.
        
        Formula: 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
        
        Args:
            text: Text to analyze
            
        Returns:
            Flesch Reading Ease score (0-100, higher is easier)
        """
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        words = text.split()
        words = [w.strip('.,!?;:()[]{}"\'-') for w in words if w.strip()]
        
        if not sentences or not words:
            return 0.0
        
        syllables = sum(self._count_syllables(word) for word in words)
        
        avg_words_per_sentence = len(words) / len(sentences)
        avg_syllables_per_word = syllables / len(words)
        
        score = 206.835 - 1.015 * avg_words_per_sentence - 84.6 * avg_syllables_per_word
        
        return max(0.0, min(100.0, score))
    
    def _calculate_flesch_kincaid_grade(self, text: str) -> float:
        """
        Calculate Flesch-Kincaid Grade Level.
        
        Formula: 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
        
        Args:
            text: Text to analyze
            
        Returns:
            Grade level (e.g., 8.0 = 8th grade)
        """
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        words = text.split()
        words = [w.strip('.,!?;:()[]{}"\'-') for w in words if w.strip()]
        
        if not sentences or not words:
            return 0.0
        
        syllables = sum(self._count_syllables(word) for word in words)
        
        avg_words_per_sentence = len(words) / len(sentences)
        avg_syllables_per_word = syllables / len(words)
        
        grade = 0.39 * avg_words_per_sentence + 11.8 * avg_syllables_per_word - 15.59
        
        return max(0.0, grade)
    
    def _calculate_gunning_fog(self, text: str) -> float:
        """
        Calculate Gunning Fog Index.
        
        Formula: 0.4 * ((words/sentences) + 100 * (complex_words/words))
        Complex words = words with 3+ syllables
        
        Args:
            text: Text to analyze
            
        Returns:
            Fog index (grade level)
        """
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        words = text.split()
        words = [w.strip('.,!?;:()[]{}"\'-') for w in words if w.strip()]
        
        if not sentences or not words:
            return 0.0
        
        complex_words = sum(1 for word in words if self._count_syllables(word) >= 3)
        
        avg_words_per_sentence = len(words) / len(sentences)
        percent_complex = 100 * (complex_words / len(words))
        
        fog = 0.4 * (avg_words_per_sentence + percent_complex)
        
        return max(0.0, fog)
    
    # Narrative analysis endpoints
    
    def check_coherence(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Analyze story logical consistency.
        
        Endpoint: storycore.qa.narrative.coherence
        Requirements: 5.1
        """
        error = self.validate_required_params(params, ["narrative"], context)
        if error:
            return error
        
        try:
            narrative = params["narrative"]
            
            system_prompt = "You are a narrative coherence analyst. Analyze the logical consistency of the story."
            prompt = f"""Analyze the coherence of this narrative:

{narrative}

Return JSON with:
- overall_score: float (0.0 to 1.0)
- logical_consistency: float (0.0 to 1.0)
- plot_coherence: float (0.0 to 1.0)
- character_consistency: float (0.0 to 1.0)
- issues: array of objects with type, description, severity, location
- strengths: array of strings
- recommendations: array of strings"""
            
            result = self.llm.complete_json(prompt, system_prompt=system_prompt)
            
            return self.create_success_response(result, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def check_pacing(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Evaluate story rhythm and timing.
        
        Endpoint: storycore.qa.narrative.pacing
        Requirements: 5.2
        """
        error = self.validate_required_params(params, ["narrative"], context)
        if error:
            return error
        
        try:
            narrative = params["narrative"]
            
            system_prompt = "You are a story pacing analyst. Evaluate the rhythm and timing of the narrative."
            prompt = f"""Analyze the pacing of this narrative:

{narrative}

Return JSON with:
- overall_pace: string ("slow", "moderate", "fast", "varied")
- pace_score: float (0.0 to 1.0)
- act_pacing: array of objects with act_number, pace, description
- scene_pacing: array of objects with scene_number, pace, duration_feel
- rhythm_analysis: object with tension_curve, climax_placement, resolution_pacing
- recommendations: array of strings"""
            
            result = self.llm.complete_json(prompt, system_prompt=system_prompt)
            
            return self.create_success_response(result, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def check_character(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Check character consistency and development.
        
        Endpoint: storycore.qa.narrative.character
        Requirements: 5.3
        """
        error = self.validate_required_params(params, ["narrative"], context)
        if error:
            return error
        
        try:
            narrative = params["narrative"]
            
            system_prompt = "You are a character development analyst. Evaluate character consistency and growth."
            prompt = f"""Analyze the characters in this narrative:

{narrative}

Return JSON with:
- overall_score: float (0.0 to 1.0)
- consistency_score: float (0.0 to 1.0)
- development_score: float (0.0 to 1.0)
- characters: array of objects with name, consistency, development, arc_quality
- issues: array of objects with character, issue_type, description, severity
- recommendations: array of strings"""
            
            result = self.llm.complete_json(prompt, system_prompt=system_prompt)
            
            return self.create_success_response(result, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def check_dialogue(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Assess dialogue quality and naturalness.
        
        Endpoint: storycore.qa.narrative.dialogue
        Requirements: 5.4
        """
        error = self.validate_required_params(params, ["narrative"], context)
        if error:
            return error
        
        try:
            narrative = params["narrative"]
            
            system_prompt = "You are a dialogue quality analyst. Evaluate the naturalness and effectiveness of dialogue."
            prompt = f"""Analyze the dialogue in this narrative:

{narrative}

Return JSON with:
- overall_score: float (0.0 to 1.0)
- naturalness_score: float (0.0 to 1.0)
- character_voice_score: float (0.0 to 1.0)
- subtext_score: float (0.0 to 1.0)
- issues: array of objects with line, issue_type, description, suggestion
- examples: array of objects with line, quality, reason (for good examples)
- recommendations: array of strings"""
            
            result = self.llm.complete_json(prompt, system_prompt=system_prompt)
            
            return self.create_success_response(result, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    # Text quality endpoints
    
    def check_grammar(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Check grammar, spelling, and syntax.
        
        Endpoint: storycore.qa.narrative.grammar
        Requirements: 5.5
        """
        error = self.validate_required_params(params, ["text"], context)
        if error:
            return error
        
        try:
            text = params["text"]
            
            system_prompt = "You are a grammar and syntax checker. Identify errors and provide corrections."
            prompt = f"""Check this text for grammar, spelling, and syntax errors:

{text}

Return JSON with:
- overall_score: float (0.0 to 1.0, 1.0 = no errors)
- grammar_errors: array of objects with location, error, correction, explanation
- spelling_errors: array of objects with word, location, correction, suggestions
- syntax_issues: array of objects with location, issue, correction, explanation
- error_count: int (total errors found)
- suggestions: array of objects with type, original, corrected, reason"""
            
            result = self.llm.complete_json(prompt, system_prompt=system_prompt)
            
            return self.create_success_response(result, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def check_readability(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Calculate readability scores.
        
        Endpoint: storycore.qa.narrative.readability
        Requirements: 5.6
        """
        error = self.validate_required_params(params, ["text"], context)
        if error:
            return error
        
        try:
            text = params["text"]
            
            # Calculate readability metrics
            flesch_ease = self._calculate_flesch_reading_ease(text)
            flesch_kincaid = self._calculate_flesch_kincaid_grade(text)
            gunning_fog = self._calculate_gunning_fog(text)
            
            # Determine overall readability
            if flesch_ease >= 70:
                overall = "easy"
                target = "general audience"
            elif flesch_ease >= 50:
                overall = "moderate"
                target = "high school level"
            else:
                overall = "difficult"
                target = "college level"
            
            # Generate recommendations
            recommendations = []
            if flesch_ease < 50:
                recommendations.append("Consider using shorter sentences to improve readability")
            if gunning_fog > 12:
                recommendations.append("Reduce complex words (3+ syllables) for better accessibility")
            if flesch_kincaid > 10:
                recommendations.append("Text may be too complex for general audiences")
            
            result = {
                "flesch_reading_ease": round(flesch_ease, 2),
                "flesch_kincaid_grade": round(flesch_kincaid, 2),
                "gunning_fog_index": round(gunning_fog, 2),
                "overall_readability": overall,
                "target_audience": target,
                "recommendations": recommendations,
                "metrics_explanation": {
                    "flesch_reading_ease": "0-100 scale, higher is easier (90-100=very easy, 0-30=very difficult)",
                    "flesch_kincaid_grade": "U.S. grade level required to understand the text",
                    "gunning_fog_index": "Years of formal education needed to understand the text",
                }
            }
            
            return self.create_success_response(result, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    # Content analysis endpoints
    
    def analyze_tropes(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Identify common narrative patterns and clichés.
        
        Endpoint: storycore.qa.narrative.tropes
        Requirements: 5.7
        """
        error = self.validate_required_params(params, ["narrative"], context)
        if error:
            return error
        
        try:
            narrative = params["narrative"]
            
            system_prompt = "You are a narrative trope analyst. Identify common patterns, tropes, and clichés."
            prompt = f"""Analyze this narrative for tropes and clichés:

{narrative}

Return JSON with:
- tropes_found: array of objects with name, description, usage, subversion_level
- cliches: array of objects with text, type, overuse_level, alternative
- originality_score: float (0.0 to 1.0, higher is more original)
- overused_patterns: array of strings
- recommendations: array of strings for improving originality"""
            
            result = self.llm.complete_json(prompt, system_prompt=system_prompt)
            
            return self.create_success_response(result, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def analyze_themes(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Extract and analyze thematic elements.
        
        Endpoint: storycore.qa.narrative.themes
        Requirements: 5.8
        """
        error = self.validate_required_params(params, ["narrative"], context)
        if error:
            return error
        
        try:
            narrative = params["narrative"]
            
            system_prompt = "You are a thematic analysis expert. Identify and analyze themes in the narrative."
            prompt = f"""Analyze the themes in this narrative:

{narrative}

Return JSON with:
- primary_themes: array of strings (main themes)
- secondary_themes: array of strings (supporting themes)
- theme_development: object mapping themes to their development arc
- symbolic_elements: array of objects with symbol, meaning, frequency
- thematic_consistency: float (0.0 to 1.0)
- recommendations: array of strings for strengthening themes"""
            
            result = self.llm.complete_json(prompt, system_prompt=system_prompt)
            
            return self.create_success_response(result, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def generate_report(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Generate comprehensive quality report.
        
        Endpoint: storycore.qa.narrative.report
        Requirements: 5.9
        """
        error = self.validate_required_params(params, ["narrative"], context)
        if error:
            return error
        
        try:
            narrative = params["narrative"]
            include_sections = params.get("include_sections", [
                "coherence", "pacing", "character", "dialogue",
                "grammar", "readability", "tropes", "themes"
            ])
            
            # Generate comprehensive report by calling individual analysis endpoints
            report_data = {
                "narrative_length": len(narrative),
                "word_count": len(narrative.split()),
                "generated_at": datetime.now().isoformat(),
            }
            
            # Run each analysis if included
            if "coherence" in include_sections:
                coherence_response = self.check_coherence({"narrative": narrative}, context)
                if coherence_response.status == "success":
                    report_data["coherence"] = coherence_response.data
            
            if "pacing" in include_sections:
                pacing_response = self.check_pacing({"narrative": narrative}, context)
                if pacing_response.status == "success":
                    report_data["pacing"] = pacing_response.data
            
            if "character" in include_sections:
                character_response = self.check_character({"narrative": narrative}, context)
                if character_response.status == "success":
                    report_data["character"] = character_response.data
            
            if "dialogue" in include_sections:
                dialogue_response = self.check_dialogue({"narrative": narrative}, context)
                if dialogue_response.status == "success":
                    report_data["dialogue"] = dialogue_response.data
            
            if "grammar" in include_sections:
                grammar_response = self.check_grammar({"text": narrative}, context)
                if grammar_response.status == "success":
                    report_data["grammar"] = grammar_response.data
            
            if "readability" in include_sections:
                readability_response = self.check_readability({"text": narrative}, context)
                if readability_response.status == "success":
                    report_data["readability"] = readability_response.data
            
            if "tropes" in include_sections:
                tropes_response = self.analyze_tropes({"narrative": narrative}, context)
                if tropes_response.status == "success":
                    report_data["tropes"] = tropes_response.data
            
            if "themes" in include_sections:
                themes_response = self.analyze_themes({"narrative": narrative}, context)
                if themes_response.status == "success":
                    report_data["themes"] = themes_response.data
            
            # Calculate overall score
            scores = []
            if "coherence" in report_data:
                scores.append(report_data["coherence"].get("overall_score", 0.0))
            if "pacing" in report_data:
                scores.append(report_data["pacing"].get("pace_score", 0.0))
            if "character" in report_data:
                scores.append(report_data["character"].get("overall_score", 0.0))
            if "dialogue" in report_data:
                scores.append(report_data["dialogue"].get("overall_score", 0.0))
            if "grammar" in report_data:
                scores.append(report_data["grammar"].get("overall_score", 0.0))
            if "tropes" in report_data:
                scores.append(report_data["tropes"].get("originality_score", 0.0))
            if "themes" in report_data:
                scores.append(report_data["themes"].get("thematic_consistency", 0.0))
            
            overall_score = sum(scores) / len(scores) if scores else 0.0
            report_data["overall_score"] = round(overall_score, 3)
            
            # Collect all recommendations
            all_recommendations = []
            for section in ["coherence", "pacing", "character", "dialogue", "readability", "tropes", "themes"]:
                if section in report_data and "recommendations" in report_data[section]:
                    all_recommendations.extend(report_data[section]["recommendations"])
            
            report_data["recommendations"] = all_recommendations[:10]  # Top 10
            
            # Generate summary
            if overall_score >= 0.8:
                summary = "Excellent narrative quality with strong coherence and development."
            elif overall_score >= 0.6:
                summary = "Good narrative quality with some areas for improvement."
            elif overall_score >= 0.4:
                summary = "Moderate narrative quality. Several areas need attention."
            else:
                summary = "Narrative needs significant improvement across multiple areas."
            
            report_data["summary"] = summary
            report_data["sections_analyzed"] = include_sections
            
            return self.create_success_response(report_data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
