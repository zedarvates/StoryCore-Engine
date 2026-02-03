"""
LLM Service for Narration API.

This module provides a unified interface to various LLM providers.
"""

import logging
import json
from typing import Optional, Dict, Any
from dataclasses import asdict

from .narration_models import LLMConfig

logger = logging.getLogger(__name__)


class LLMService:
    """
    Unified LLM service interface.
    
    Supports multiple providers: OpenAI, Anthropic, and Mock (for testing).
    """
    
    def __init__(self, config: LLMConfig):
        """
        Initialize LLM service.
        
        Args:
            config: LLM configuration
        """
        self.config = config
        self.client = self._create_client()
        logger.info(f"Initialized LLM service with provider: {config.provider}")
    
    def _create_client(self):
        """Create the appropriate LLM client based on configuration."""
        if self.config.provider == "openai":
            return self._create_openai_client()
        elif self.config.provider == "anthropic":
            return self._create_anthropic_client()
        elif self.config.provider == "mock":
            return MockLLMClient()
        else:
            logger.warning(f"Unknown provider {self.config.provider}, using mock")
            return MockLLMClient()
    
    def _create_openai_client(self):
        """Create OpenAI client."""
        try:
            import openai
            return openai.OpenAI(api_key=self.config.api_key)
        except ImportError:
            logger.warning("OpenAI package not installed, using mock client")
            return MockLLMClient()
    
    def _create_anthropic_client(self):
        """Create Anthropic client."""
        try:
            import anthropic
            return anthropic.Anthropic(api_key=self.config.api_key)
        except ImportError:
            logger.warning("Anthropic package not installed, using mock client")
            return MockLLMClient()
    
    def complete(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        """
        Complete a prompt using the configured LLM.
        
        Args:
            prompt: The prompt to complete
            system_prompt: Optional system prompt
            temperature: Override default temperature
            max_tokens: Override default max tokens
            
        Returns:
            Completion text
        """
        temp = temperature if temperature is not None else self.config.temperature
        tokens = max_tokens if max_tokens is not None else self.config.max_tokens
        
        if isinstance(self.client, MockLLMClient):
            return self.client.complete(prompt, system_prompt=system_prompt)
        
        if self.config.provider == "openai":
            return self._complete_openai(prompt, system_prompt, temp, tokens)
        elif self.config.provider == "anthropic":
            return self._complete_anthropic(prompt, system_prompt, temp, tokens)
        else:
            return self.client.complete(prompt, system_prompt=system_prompt)
    
    def _complete_openai(
        self,
        prompt: str,
        system_prompt: Optional[str],
        temperature: float,
        max_tokens: int,
    ) -> str:
        """Complete using OpenAI."""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        model = self.config.model or "gpt-4"
        
        response = self.client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        
        return response.choices[0].message.content
    
    def _complete_anthropic(
        self,
        prompt: str,
        system_prompt: Optional[str],
        temperature: float,
        max_tokens: int,
    ) -> str:
        """Complete using Anthropic."""
        model = self.config.model or "claude-3-sonnet-20240229"
        
        kwargs = {
            "model": model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": [{"role": "user", "content": prompt}],
        }
        
        if system_prompt:
            kwargs["system"] = system_prompt
        
        response = self.client.messages.create(**kwargs)
        return response.content[0].text
    
    def complete_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Complete a prompt and parse JSON response.
        
        Args:
            prompt: The prompt to complete
            system_prompt: Optional system prompt
            **kwargs: Additional arguments for complete()
            
        Returns:
            Parsed JSON response
            
        Raises:
            ValueError: If response is not valid JSON
        """
        response = self.complete(prompt, system_prompt, **kwargs)
        
        # Try to extract JSON from response
        response = response.strip()
        start_idx = response.find('{')
        end_idx = response.rfind('}')
        
        if start_idx == -1 or end_idx == -1:
            raise ValueError("No JSON object found in response")
        
        json_str = response[start_idx:end_idx + 1]
        return json.loads(json_str)


class MockLLMClient:
    """Mock LLM client for testing and development."""
    
    def __init__(self):
        """Initialize mock client."""
        self.call_count = 0
        self.last_prompt = None
    
    def complete(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Return a mock completion based on prompt content."""
        self.call_count += 1
        self.last_prompt = prompt
        
        prompt_lower = prompt.lower()
        
        # Generate appropriate mock responses based on prompt keywords
        # Order matters - more specific matches first
        if ("scene" in prompt_lower or "script" in prompt_lower) and ("breakdown" in prompt_lower or "break down" in prompt_lower):
            return self._mock_scene_breakdown()
        elif "scene" in prompt_lower and "enhance" in prompt_lower:
            return self._mock_scene_enhancement()
        elif "expand" in prompt_lower and "scene" in prompt_lower:
            return self._mock_scene_expansion()
        elif "alternatives" in prompt_lower or "alternative" in prompt_lower:
            return self._mock_alternatives()
        elif "generate" in prompt_lower and "narrative" in prompt_lower:
            return self._mock_narrative_generation()
        elif "analyze" in prompt_lower and "structure" in prompt_lower:
            return self._mock_narrative_analysis()
        elif "summarize" in prompt_lower:
            return self._mock_summarization()
        elif "dialogue" in prompt_lower and "generate" in prompt_lower:
            return self._mock_dialogue_generation()
        elif "dialogue" in prompt_lower and "refine" in prompt_lower:
            return self._mock_dialogue_refinement()
        elif "character" in prompt_lower and "profile" in prompt_lower:
            return self._mock_character_profile()
        elif "character" in prompt_lower and "arc" in prompt_lower:
            return self._mock_character_arc()
        elif "tone" in prompt_lower and "analyze" in prompt_lower:
            return self._mock_tone_analysis()
        elif "tone" in prompt_lower and "adjust" in prompt_lower:
            return self._mock_tone_adjustment()
        elif "style" in prompt_lower and "transfer" in prompt_lower:
            return self._mock_style_transfer()
        elif "continuity" in prompt_lower:
            return self._mock_continuity_check()
        elif "world" in prompt_lower and "expand" in prompt_lower:
            return self._mock_world_expansion()
        elif "prompt" in prompt_lower and "optimize" in prompt_lower:
            return self._mock_prompt_optimization()
        elif "feedback" in prompt_lower:
            return self._mock_feedback()
        else:
            return "Mock LLM response: This is a placeholder response for testing purposes."
    
    def _mock_narrative_generation(self) -> str:
        return """In the depths of the ancient forest, where sunlight barely penetrated the thick canopy, 
a lone traveler discovered something that would change everything. The artifact pulsed with an otherworldly 
glow, its surface covered in symbols that seemed to shift and dance in the dim light. As they reached out 
to touch it, visions of a forgotten civilization flooded their mind—a warning, a prophecy, and a choice 
that would determine the fate of two worlds."""
    
    def _mock_narrative_analysis(self) -> str:
        return json.dumps({
            "acts": [
                {"number": 1, "name": "Setup", "description": "Introduction of protagonist and world"},
                {"number": 2, "name": "Confrontation", "description": "Rising action and conflict"},
                {"number": 3, "name": "Resolution", "description": "Climax and conclusion"}
            ],
            "beats": ["Opening Image", "Catalyst", "Midpoint", "All Is Lost", "Finale"],
            "pacing": {
                "overall": "moderate",
                "act1_pace": "slow",
                "act2_pace": "fast",
                "act3_pace": "moderate"
            },
            "themes": ["redemption", "sacrifice", "identity"],
            "metadata": {"structure_type": "three-act", "complexity": "medium"}
        })
    
    def _mock_scene_expansion(self) -> str:
        return """The laboratory hummed with the quiet intensity of late-night research. Fluorescent lights 
cast harsh shadows across rows of equipment, their displays flickering with streams of data. Dr. Sarah Chen 
leaned closer to her monitor, her reflection ghostly in the dark screen. The numbers didn't make sense—
couldn't make sense. Yet there they were, undeniable proof that everything she thought she knew about 
quantum mechanics was wrong. Her hand trembled as she reached for the phone. This discovery would either 
make her career or destroy it."""
    
    def _mock_summarization(self) -> str:
        return "A scientist makes a groundbreaking discovery that challenges fundamental physics, forcing her to choose between career advancement and revealing a truth that could reshape humanity's understanding of reality."
    
    def _mock_dialogue_generation(self) -> str:
        return json.dumps({
            "character": "Sarah",
            "lines": [
                "I've run the calculations three times. The results are consistent.",
                "We're not just looking at an anomaly—this is a fundamental shift in how we understand reality.",
                "If I'm right about this, everything changes. Everything."
            ],
            "context": "Explaining discovery to colleague",
            "tone": "urgent, excited, slightly fearful"
        })
    
    def _mock_dialogue_refinement(self) -> str:
        return json.dumps({
            "original": "I found something weird in the data.",
            "refined": "The data shows an anomaly I've never seen before—something that shouldn't be possible according to our current models.",
            "improvements": ["More specific", "Conveys expertise", "Builds tension"]
        })
    
    def _mock_character_profile(self) -> str:
        return json.dumps({
            "name": "Dr. Sarah Chen",
            "description": "A brilliant quantum physicist in her mid-30s, driven by curiosity and haunted by past failures",
            "traits": ["intelligent", "determined", "perfectionist", "socially awkward", "courageous"],
            "backstory": "Lost her mentor to a lab accident she blames herself for",
            "goals": ["Prove her controversial theory", "Honor her mentor's legacy", "Overcome self-doubt"],
            "conflicts": ["Internal: guilt vs ambition", "External: scientific establishment vs revolutionary ideas"]
        })
    
    def _mock_character_arc(self) -> str:
        return json.dumps({
            "character_name": "Dr. Sarah Chen",
            "starting_state": "Isolated, guilt-ridden, afraid to take risks",
            "ending_state": "Confident, connected, willing to fight for truth",
            "key_moments": [
                {"moment": "Discovery", "impact": "Reignites passion for science"},
                {"moment": "Confrontation with board", "impact": "Learns to stand up for beliefs"},
                {"moment": "Final revelation", "impact": "Accepts past and embraces future"}
            ],
            "transformation": "From fearful isolation to courageous leadership",
            "arc_type": "positive"
        })
    
    def _mock_scene_breakdown(self) -> str:
        return json.dumps({
            "scenes": [
                {
                    "number": 1,
                    "title": "Late Night Discovery",
                    "description": "Sarah discovers the anomaly",
                    "location": "Laboratory",
                    "duration": 3.0,
                    "characters": ["Sarah"]
                },
                {
                    "number": 2,
                    "title": "The Revelation",
                    "description": "Sarah shares findings with colleague",
                    "location": "Office",
                    "duration": 4.0,
                    "characters": ["Sarah", "Marcus"]
                }
            ],
            "total_duration": 7.0,
            "scene_count": 2
        })
    
    def _mock_scene_enhancement(self) -> str:
        return json.dumps({
            "original_scene": "Sarah entered the lab and found the data.",
            "enhanced_scene": "Sarah pushed through the heavy laboratory door, the familiar scent of ozone and cleaning solution greeting her. The hum of equipment filled the silence as she approached her workstation, where the monitor's glow revealed data that would change everything.",
            "sensory_details": {
                "visual": ["monitor glow", "equipment lights", "shadows"],
                "auditory": ["equipment hum", "door closing", "keyboard clicks"],
                "olfactory": ["ozone", "cleaning solution"],
                "tactile": ["heavy door", "cool air"]
            },
            "atmosphere": "Tense anticipation mixed with scientific curiosity"
        })
    
    def _mock_tone_analysis(self) -> str:
        return json.dumps({
            "primary_tone": "suspenseful",
            "secondary_tones": ["mysterious", "urgent"],
            "emotional_arc": [
                {"point": "opening", "emotion": "curiosity"},
                {"point": "middle", "emotion": "tension"},
                {"point": "end", "emotion": "revelation"}
            ],
            "mood_descriptors": ["dark", "intense", "cerebral"],
            "confidence": 0.85
        })
    
    def _mock_tone_adjustment(self) -> str:
        return json.dumps({
            "original_text": "Sarah found something interesting in the data.",
            "adjusted_text": "Sarah's heart raced as she uncovered a pattern in the data—something impossible, something that would shatter everything they thought they knew.",
            "target_tone": "suspenseful",
            "adjustments": ["Added emotional response", "Increased stakes", "Created mystery"]
        })
    
    def _mock_style_transfer(self) -> str:
        return json.dumps({
            "original_text": "The scientist made a discovery.",
            "transferred_text": "In the hallowed halls of scientific inquiry, where reason reigns supreme, our intrepid researcher stumbled upon a truth most profound.",
            "source_style": "simple prose",
            "target_style": "Victorian literary",
            "style_elements": ["Formal diction", "Complex sentence structure", "Elevated vocabulary"]
        })
    
    def _mock_continuity_check(self) -> str:
        return json.dumps({
            "issues": [
                {
                    "type": "character_inconsistency",
                    "description": "Character eye color changes from blue to brown",
                    "severity": "minor",
                    "location": "Chapter 3 vs Chapter 7"
                }
            ],
            "inconsistencies": ["Timeline doesn't account for travel time between locations"],
            "plot_holes": ["Unexplained knowledge of secret information"],
            "timeline_conflicts": ["Events in Chapter 5 occur before setup in Chapter 4"],
            "overall_score": 0.75
        })
    
    def _mock_world_expansion(self) -> str:
        return json.dumps({
            "original_world": "A futuristic research facility",
            "expanded_elements": {
                "technology_level": "Near-future with quantum computing breakthroughs",
                "society": "Scientific meritocracy with corporate oversight",
                "politics": "Tension between academic freedom and commercial interests"
            },
            "locations": [
                {"name": "Quantum Lab", "description": "State-of-the-art research facility"},
                {"name": "The Archive", "description": "Repository of classified research"}
            ],
            "cultures": [
                {"name": "Scientific Elite", "values": ["Knowledge", "Innovation", "Prestige"]}
            ],
            "history": "Founded after the Quantum Revolution of 2045",
            "rules": ["All discoveries must be peer-reviewed", "Corporate sponsors have veto power"]
        })
    
    def _mock_prompt_optimization(self) -> str:
        return json.dumps({
            "original_prompt": "Make a story about science",
            "optimized_prompt": "Create a suspenseful narrative about a quantum physicist who discovers evidence that challenges fundamental laws of physics, forcing her to choose between career security and scientific truth. Set in a near-future research facility with corporate oversight. Tone: cerebral thriller with emotional depth.",
            "improvements": [
                "Added specific protagonist and conflict",
                "Defined setting and time period",
                "Specified tone and genre",
                "Included stakes and character motivation"
            ],
            "expected_quality_gain": 0.8,
            "reasoning": "Specific details guide generation toward coherent, engaging narrative"
        })
    
    def _mock_feedback(self) -> str:
        return json.dumps({
            "strengths": [
                "Strong character motivation",
                "Clear conflict and stakes",
                "Engaging scientific premise"
            ],
            "weaknesses": [
                "Pacing could be tighter in middle section",
                "Supporting characters need more development",
                "Resolution feels slightly rushed"
            ],
            "suggestions": [
                "Consider cutting exposition in Chapter 3",
                "Add a scene showing colleague's perspective",
                "Extend climax sequence for greater impact"
            ],
            "overall_assessment": "Solid foundation with compelling premise. Needs refinement in pacing and character development.",
            "score": 7.5
        })
    
    def _mock_alternatives(self) -> str:
        return json.dumps({
            "original_direction": "Scientist discovers quantum anomaly",
            "alternatives": [
                {
                    "direction": "Conspiracy angle",
                    "description": "Discovery is actually planted evidence in corporate espionage plot",
                    "impact": "Shifts from scientific thriller to corporate conspiracy"
                },
                {
                    "direction": "Personal stakes",
                    "description": "Anomaly is connected to mentor's death, making it deeply personal",
                    "impact": "Adds emotional weight and character motivation"
                },
                {
                    "direction": "Ethical dilemma",
                    "description": "Discovery could be weaponized, forcing moral choice",
                    "impact": "Introduces ethical complexity and higher stakes"
                }
            ],
            "reasoning": {
                "conspiracy": "Increases tension and external conflict",
                "personal": "Deepens character arc and emotional resonance",
                "ethical": "Raises philosophical questions and moral complexity"
            }
        })
