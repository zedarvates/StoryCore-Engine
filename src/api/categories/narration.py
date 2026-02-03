"""
Narration Category Handler

This module implements all 18 narration and LLM API endpoints.
"""

import logging
import json
from typing import Dict, Any, Optional

from ..base_handler import BaseAPIHandler
from ..models import APIResponse, RequestContext, ErrorCodes
from ..config import APIConfig
from ..router import APIRouter

from .narration_models import (
    LLMConfig,
    NarrativeContent,
    NarrativeAnalysis,
    CharacterProfile,
    CharacterArc,
    DialogueGeneration,
    SceneBreakdown,
    SceneEnhancement,
    ToneAnalysis,
    StyleTransfer,
    ContinuityCheck,
    WorldExpansion,
    PromptOptimization,
    NarrativeFeedback,
    NarrativeAlternatives,
)
from .llm_service import LLMService

logger = logging.getLogger(__name__)


class NarrationCategoryHandler(BaseAPIHandler):
    """
    Handler for Narration and LLM API category.
    
    Implements 18 endpoints for narrative generation, analysis, and manipulation.
    """
    
    def __init__(self, config: APIConfig, router: APIRouter, llm_config: Optional[LLMConfig] = None):
        """
        Initialize narration handler.
        
        Args:
            config: API configuration
            router: API router for endpoint registration
            llm_config: LLM service configuration (uses mock if None)
        """
        super().__init__(config)
        self.router = router
        
        # Initialize LLM service
        if llm_config is None:
            llm_config = LLMConfig(provider="mock")
        self.llm = LLMService(llm_config)
        
        # Register all endpoints
        self.register_endpoints()
        
        logger.info("Initialized NarrationCategoryHandler with 18 endpoints")
    
    def register_endpoints(self) -> None:
        """Register all narration endpoints with the router."""
        
        # Core narration endpoints (4)
        self.router.register_endpoint(
            path="storycore.narration.generate",
            method="POST",
            handler=self.generate,
            description="Generate narrative content from a prompt",
            async_capable=True,
        )
        
        self.router.register_endpoint(
            path="storycore.narration.analyze",
            method="POST",
            handler=self.analyze,
            description="Analyze narrative structure",
        )
        
        self.router.register_endpoint(
            path="storycore.narration.expand",
            method="POST",
            handler=self.expand,
            description="Expand a scene with more detail",
        )
        
        self.router.register_endpoint(
            path="storycore.narration.summarize",
            method="POST",
            handler=self.summarize,
            description="Summarize text to specified length",
        )
        
        # Dialogue endpoints (2)
        self.router.register_endpoint(
            path="storycore.narration.dialogue.generate",
            method="POST",
            handler=self.dialogue_generate,
            description="Generate character dialogue",
        )
        
        self.router.register_endpoint(
            path="storycore.narration.dialogue.refine",
            method="POST",
            handler=self.dialogue_refine,
            description="Refine existing dialogue",
        )
        
        # Character endpoints (2)
        self.router.register_endpoint(
            path="storycore.narration.character.profile",
            method="POST",
            handler=self.character_profile,
            description="Generate character profile",
        )
        
        self.router.register_endpoint(
            path="storycore.narration.character.arc",
            method="POST",
            handler=self.character_arc,
            description="Analyze or generate character arc",
        )
        
        # Scene endpoints (2)
        self.router.register_endpoint(
            path="storycore.narration.scene.breakdown",
            method="POST",
            handler=self.scene_breakdown,
            description="Break down script into scenes",
        )
        
        self.router.register_endpoint(
            path="storycore.narration.scene.enhance",
            method="POST",
            handler=self.scene_enhance,
            description="Enhance scene with sensory details",
        )
        
        # Tone and style endpoints (3)
        self.router.register_endpoint(
            path="storycore.narration.tone.analyze",
            method="POST",
            handler=self.tone_analyze,
            description="Analyze emotional tone",
        )
        
        self.router.register_endpoint(
            path="storycore.narration.tone.adjust",
            method="POST",
            handler=self.tone_adjust,
            description="Adjust content to target tone",
        )
        
        self.router.register_endpoint(
            path="storycore.narration.style.transfer",
            method="POST",
            handler=self.style_transfer,
            description="Transfer writing style",
        )
        
        # Advanced endpoints (5)
        self.router.register_endpoint(
            path="storycore.narration.continuity.check",
            method="POST",
            handler=self.continuity_check,
            description="Check for plot holes and inconsistencies",
        )
        
        self.router.register_endpoint(
            path="storycore.narration.world.expand",
            method="POST",
            handler=self.world_expand,
            description="Expand world-building details",
        )
        
        self.router.register_endpoint(
            path="storycore.narration.prompt.optimize",
            method="POST",
            handler=self.prompt_optimize,
            description="Optimize prompt for better results",
        )
        
        self.router.register_endpoint(
            path="storycore.narration.feedback.generate",
            method="POST",
            handler=self.feedback_generate,
            description="Generate constructive feedback",
        )
        
        self.router.register_endpoint(
            path="storycore.narration.alternatives.suggest",
            method="POST",
            handler=self.alternatives_suggest,
            description="Suggest alternative narrative directions",
        )
    
    # Core narration endpoints
    
    def generate(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Generate narrative content from a prompt.
        
        Endpoint: storycore.narration.generate
        Requirements: 2.1
        """
        # Validate required parameters
        error = self.validate_required_params(params, ["prompt"], context)
        if error:
            return error
        
        try:
            prompt = params["prompt"]
            options = params.get("options", {})
            
            # Build generation prompt
            system_prompt = "You are a creative writing assistant that generates engaging narrative content."
            generation_prompt = f"Generate narrative content based on this prompt:\n\n{prompt}"
            
            if "genre" in options:
                generation_prompt += f"\n\nGenre: {options['genre']}"
            if "tone" in options:
                generation_prompt += f"\nTone: {options['tone']}"
            if "length" in options:
                generation_prompt += f"\nTarget length: {options['length']} words"
            
            # Generate content
            result = self.llm.complete(
                generation_prompt,
                system_prompt=system_prompt,
                temperature=options.get("temperature", 0.7),
                max_tokens=options.get("max_tokens", 2000),
            )
            
            # Create response
            data = {
                "content": result,
                "metadata": {
                    "prompt": prompt,
                    "options": options,
                    "model": self.llm.config.provider,
                }
            }
            
            return self.create_success_response(data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def analyze(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Analyze narrative structure.
        
        Endpoint: storycore.narration.analyze
        Requirements: 2.2
        """
        error = self.validate_required_params(params, ["text"], context)
        if error:
            return error
        
        try:
            text = params["text"]
            
            system_prompt = "You are a narrative structure analyst. Analyze the provided text and return a JSON object with acts, beats, pacing, and themes."
            prompt = f"""Analyze the narrative structure of this text:

{text}

Return a JSON object with:
- acts: Array of act objects with number, name, description
- beats: Array of story beat names
- pacing: Object with overall pace and per-act pacing
- themes: Array of thematic elements
- metadata: Additional structural information"""
            
            result = self.llm.complete_json(prompt, system_prompt=system_prompt)
            
            return self.create_success_response(result, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def expand(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Expand a scene with more detail.
        
        Endpoint: storycore.narration.expand
        Requirements: 2.3
        """
        error = self.validate_required_params(params, ["scene"], context)
        if error:
            return error
        
        try:
            scene = params["scene"]
            focus = params.get("focus", "general")  # "action", "dialogue", "description", "general"
            
            system_prompt = "You are a creative writing assistant specializing in scene expansion."
            prompt = f"""Expand this scene with rich detail:

{scene}

Focus on: {focus}

Provide detailed descriptions, sensory information, and atmospheric elements."""
            
            result = self.llm.complete(prompt, system_prompt=system_prompt)
            
            data = {
                "original_scene": scene,
                "expanded_scene": result,
                "focus": focus,
            }
            
            return self.create_success_response(data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def summarize(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Summarize text to specified length.
        
        Endpoint: storycore.narration.summarize
        Requirements: 2.4
        """
        error = self.validate_required_params(params, ["text"], context)
        if error:
            return error
        
        try:
            text = params["text"]
            length = params.get("length", "medium")  # "short", "medium", "long"
            
            length_guidance = {
                "short": "1-2 sentences",
                "medium": "1 paragraph (3-5 sentences)",
                "long": "2-3 paragraphs"
            }
            
            system_prompt = "You are a summarization expert."
            prompt = f"""Summarize this text in {length_guidance.get(length, length)}:

{text}

Capture the key points and main ideas."""
            
            result = self.llm.complete(prompt, system_prompt=system_prompt)
            
            data = {
                "original_text": text,
                "summary": result,
                "length": length,
            }
            
            return self.create_success_response(data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    # Dialogue endpoints
    
    def dialogue_generate(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Generate character dialogue.
        
        Endpoint: storycore.narration.dialogue.generate
        Requirements: 2.5
        """
        error = self.validate_required_params(params, ["character", "context"], context)
        if error:
            return error
        
        try:
            character = params["character"]
            dialogue_context = params["context"]
            tone = params.get("tone")
            num_lines = params.get("num_lines", 3)
            
            system_prompt = "You are a dialogue writer specializing in character-appropriate speech."
            prompt = f"""Generate dialogue for this character:

Character: {character}
Context: {dialogue_context}"""
            
            if tone:
                prompt += f"\nTone: {tone}"
            
            prompt += f"\n\nGenerate {num_lines} lines of dialogue that fit the character and context. Return as JSON with 'character', 'lines', 'context', and 'tone' fields."
            
            result = self.llm.complete_json(prompt, system_prompt=system_prompt)
            
            return self.create_success_response(result, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def dialogue_refine(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Refine existing dialogue.
        
        Endpoint: storycore.narration.dialogue.refine
        Requirements: 2.6
        """
        error = self.validate_required_params(params, ["dialogue"], context)
        if error:
            return error
        
        try:
            dialogue = params["dialogue"]
            goals = params.get("goals", ["naturalness", "character_voice"])
            
            system_prompt = "You are a dialogue editor specializing in making dialogue more natural and character-appropriate."
            prompt = f"""Refine this dialogue:

{dialogue}

Goals: {', '.join(goals)}

Return JSON with 'original', 'refined', and 'improvements' fields."""
            
            result = self.llm.complete_json(prompt, system_prompt=system_prompt)
            
            return self.create_success_response(result, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    # Character endpoints
    
    def character_profile(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Generate character profile.
        
        Endpoint: storycore.narration.character.profile
        Requirements: 2.7
        """
        error = self.validate_required_params(params, ["character_description"], context)
        if error:
            return error
        
        try:
            description = params["character_description"]
            detail_level = params.get("detail_level", "medium")
            
            system_prompt = "You are a character development specialist."
            prompt = f"""Create a detailed character profile based on this description:

{description}

Detail level: {detail_level}

Return JSON with: name, description, traits, backstory, goals, conflicts, and relationships."""
            
            result = self.llm.complete_json(prompt, system_prompt=system_prompt)
            
            return self.create_success_response(result, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def character_arc(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Analyze or generate character arc.
        
        Endpoint: storycore.narration.character.arc
        Requirements: 2.8
        """
        error = self.validate_required_params(params, ["character_name"], context)
        if error:
            return error
        
        try:
            character_name = params["character_name"]
            story_context = params.get("story_context", "")
            mode = params.get("mode", "generate")  # "generate" or "analyze"
            
            system_prompt = "You are a character arc specialist."
            
            if mode == "generate":
                prompt = f"""Generate a character arc for: {character_name}

Story context: {story_context}

Return JSON with: character_name, starting_state, ending_state, key_moments, transformation, arc_type."""
            else:
                prompt = f"""Analyze the character arc for: {character_name}

Story context: {story_context}

Return JSON with: character_name, starting_state, ending_state, key_moments, transformation, arc_type."""
            
            result = self.llm.complete_json(prompt, system_prompt=system_prompt)
            
            return self.create_success_response(result, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    # Scene endpoints
    
    def scene_breakdown(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Break down script into scenes.
        
        Endpoint: storycore.narration.scene.breakdown
        Requirements: 2.9
        """
        error = self.validate_required_params(params, ["script"], context)
        if error:
            return error
        
        try:
            script = params["script"]
            
            system_prompt = "You are a script breakdown specialist."
            prompt = f"""Break down this script into individual scenes:

{script}

Return JSON with: scenes (array with number, title, description, location, duration, characters), total_duration, scene_count."""
            
            result = self.llm.complete_json(prompt, system_prompt=system_prompt)
            
            return self.create_success_response(result, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def scene_enhance(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Enhance scene with sensory details.
        
        Endpoint: storycore.narration.scene.enhance
        Requirements: 2.10
        """
        error = self.validate_required_params(params, ["scene"], context)
        if error:
            return error
        
        try:
            scene = params["scene"]
            sensory_focus = params.get("sensory_focus", ["visual", "auditory", "olfactory", "tactile"])
            
            system_prompt = "You are a sensory writing specialist."
            prompt = f"""Enhance this scene with rich sensory details:

{scene}

Focus on: {', '.join(sensory_focus)}

Return JSON with: original_scene, enhanced_scene, sensory_details (object with arrays for each sense), atmosphere."""
            
            result = self.llm.complete_json(prompt, system_prompt=system_prompt)
            
            return self.create_success_response(result, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    # Tone and style endpoints
    
    def tone_analyze(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Analyze emotional tone.
        
        Endpoint: storycore.narration.tone.analyze
        Requirements: 2.11
        """
        error = self.validate_required_params(params, ["text"], context)
        if error:
            return error
        
        try:
            text = params["text"]
            
            system_prompt = "You are a tone and mood analysis expert."
            prompt = f"""Analyze the emotional tone of this text:

{text}

Return JSON with: primary_tone, secondary_tones, emotional_arc, mood_descriptors, confidence (0-1)."""
            
            result = self.llm.complete_json(prompt, system_prompt=system_prompt)
            
            return self.create_success_response(result, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def tone_adjust(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Adjust content to target tone.
        
        Endpoint: storycore.narration.tone.adjust
        Requirements: 2.12
        """
        error = self.validate_required_params(params, ["text", "target_tone"], context)
        if error:
            return error
        
        try:
            text = params["text"]
            target_tone = params["target_tone"]
            
            system_prompt = "You are a tone adjustment specialist."
            prompt = f"""Adjust this text to match the target tone:

Original text: {text}

Target tone: {target_tone}

Return JSON with: original_text, adjusted_text, target_tone, adjustments (list of changes made)."""
            
            result = self.llm.complete_json(prompt, system_prompt=system_prompt)
            
            return self.create_success_response(result, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def style_transfer(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Transfer writing style.
        
        Endpoint: storycore.narration.style.transfer
        Requirements: 2.16
        """
        error = self.validate_required_params(params, ["text", "target_style"], context)
        if error:
            return error
        
        try:
            text = params["text"]
            target_style = params["target_style"]
            
            system_prompt = "You are a style transfer specialist."
            prompt = f"""Transfer this text to the target style:

Original text: {text}

Target style: {target_style}

Return JSON with: original_text, transferred_text, source_style, target_style, style_elements."""
            
            result = self.llm.complete_json(prompt, system_prompt=system_prompt)
            
            return self.create_success_response(result, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    # Advanced endpoints
    
    def continuity_check(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Check for plot holes and inconsistencies.
        
        Endpoint: storycore.narration.continuity.check
        Requirements: 2.13
        """
        error = self.validate_required_params(params, ["narrative"], context)
        if error:
            return error
        
        try:
            narrative = params["narrative"]
            
            system_prompt = "You are a continuity and consistency checker."
            prompt = f"""Check this narrative for continuity issues:

{narrative}

Return JSON with: issues (array with type, description, severity, location), inconsistencies, plot_holes, timeline_conflicts, overall_score (0-1)."""
            
            result = self.llm.complete_json(prompt, system_prompt=system_prompt)
            
            return self.create_success_response(result, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def world_expand(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Expand world-building details.
        
        Endpoint: storycore.narration.world.expand
        Requirements: 2.14
        """
        error = self.validate_required_params(params, ["world_description"], context)
        if error:
            return error
        
        try:
            world_description = params["world_description"]
            aspects = params.get("aspects", ["locations", "cultures", "history", "rules"])
            
            system_prompt = "You are a world-building specialist."
            prompt = f"""Expand this world description:

{world_description}

Focus on: {', '.join(aspects)}

Return JSON with: original_world, expanded_elements, locations, cultures, history, rules."""
            
            result = self.llm.complete_json(prompt, system_prompt=system_prompt)
            
            return self.create_success_response(result, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def prompt_optimize(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Optimize prompt for better results.
        
        Endpoint: storycore.narration.prompt.optimize
        Requirements: 2.15
        """
        error = self.validate_required_params(params, ["prompt"], context)
        if error:
            return error
        
        try:
            original_prompt = params["prompt"]
            
            system_prompt = "You are a prompt engineering specialist."
            prompt = f"""Optimize this prompt for better LLM results:

{original_prompt}

Return JSON with: original_prompt, optimized_prompt, improvements (list), expected_quality_gain (0-1), reasoning."""
            
            result = self.llm.complete_json(prompt, system_prompt=system_prompt)
            
            return self.create_success_response(result, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def feedback_generate(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Generate constructive feedback.
        
        Endpoint: storycore.narration.feedback.generate
        Requirements: 2.17
        """
        error = self.validate_required_params(params, ["narrative"], context)
        if error:
            return error
        
        try:
            narrative = params["narrative"]
            focus_areas = params.get("focus_areas", ["plot", "characters", "pacing", "dialogue"])
            
            system_prompt = "You are a constructive writing coach."
            prompt = f"""Provide constructive feedback on this narrative:

{narrative}

Focus on: {', '.join(focus_areas)}

Return JSON with: strengths, weaknesses, suggestions, overall_assessment, score (0-10)."""
            
            result = self.llm.complete_json(prompt, system_prompt=system_prompt)
            
            return self.create_success_response(result, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def alternatives_suggest(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Suggest alternative narrative directions.
        
        Endpoint: storycore.narration.alternatives.suggest
        Requirements: 2.18
        """
        error = self.validate_required_params(params, ["current_direction"], context)
        if error:
            return error
        
        try:
            current_direction = params["current_direction"]
            num_alternatives = params.get("num_alternatives", 3)
            
            system_prompt = "You are a creative brainstorming specialist."
            prompt = f"""Suggest alternative narrative directions:

Current direction: {current_direction}

Generate {num_alternatives} distinct alternatives.

Return JSON with: original_direction, alternatives (array with direction, description, impact), reasoning (object mapping each alternative to its rationale)."""
            
            result = self.llm.complete_json(prompt, system_prompt=system_prompt)
            
            return self.create_success_response(result, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
