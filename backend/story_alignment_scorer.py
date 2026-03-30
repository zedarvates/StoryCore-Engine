"""
Story Alignment Scoring System for StoryCore-Engine

Provides a quantitative analysis of story generation quality and alignment
with user prompts, character consistency, and narrative structures.
"""

import logging
import json
import re
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum

from backend.llm_api import call_llm_real, LLMRequest

logger = logging.getLogger(__name__)

class ScoringCategory(str, Enum):
    PROMPT_ALIGNMENT = "prompt_alignment"
    CHARACTER_CONSISTENCY = "character_consistency"
    GENRE_CONFORMITY = "genre_conformity"
    STRUCTURAL_INTEGRITY = "structural_integrity"
    TECHNICAL_FEASIBILITY = "technical_feasibility"
    NARRATIVE_FLOW = "narrative_flow"

@dataclass
class ScoreResult:
    category: ScoringCategory
    score: float  # 0.0 to 100.0
    feedback: str
    issues: List[str] = field(default_factory=list)

@dataclass
class AlignmentReport:
    total_score: float
    categories: Dict[ScoringCategory, ScoreResult]
    summary: str
    recommendations: List[str]
    is_pass: bool = False

class StoryAlignmentScorer:
    """
    Evaluates generated stories against multiple quality and alignment criteria.
    Uses LLM-based analysis for semantic evaluation.
    """
    
    def __init__(self, pass_threshold: float = 70.0, call_llm_func: Optional[Any] = None):
        self.pass_threshold = pass_threshold
        self.call_llm_func = call_llm_func
    
    async def score_story(
        self, 
        story_data: Dict[str, Any], 
        original_prompt: str,
        target_genre: str,
        target_structure: str
    ) -> AlignmentReport:
        """
        Perform a full alignment analysis on a generated story.
        """
        logger.info(f"Starting alignment scoring for story: {story_data.get('title', 'Unknown')}")
        
        # Prepare scoring tasks
        categories = {}
        
        # 1. Prompt Alignment
        categories[ScoringCategory.PROMPT_ALIGNMENT] = await self._score_prompt_alignment(
            story_data, original_prompt
        )
        
        # 2. Character Consistency
        categories[ScoringCategory.CHARACTER_CONSISTENCY] = await self._score_character_consistency(
            story_data
        )
        
        # 3. Genre Conformity
        categories[ScoringCategory.GENRE_CONFORMITY] = await self._score_genre_conformity(
            story_data, target_genre
        )
        
        # 4. Structural Integrity
        categories[ScoringCategory.STRUCTURAL_INTEGRITY] = await self._score_structural_integrity(
            story_data, target_structure
        )
        
        # 5. Narrative Flow
        categories[ScoringCategory.NARRATIVE_FLOW] = await self._score_narrative_flow(
            story_data
        )

        # Calculate total score (weighted average)
        weights = {
            ScoringCategory.PROMPT_ALIGNMENT: 0.30,
            ScoringCategory.CHARACTER_CONSISTENCY: 0.20,
            ScoringCategory.GENRE_CONFORMITY: 0.15,
            ScoringCategory.STRUCTURAL_INTEGRITY: 0.15,
            ScoringCategory.NARRATIVE_FLOW: 0.20
        }
        
        total_score = sum(
            categories[cat].score * weights.get(cat, 0.2) 
            for cat in categories
        )
        
        # Generate summary and recommendations
        summary_prompt = f"""
        Summarize the following story alignment scores:
        {json.dumps({cat.value: res.score for cat, res in categories.items()}, indent=2)}
        
        Target overall score: {total_score:.1f}/100
        
        Provide a concise 2-3 sentence summary and 3 actionable recommendations to improve the story.
        Return as JSON: {{"summary": "...", "recommendations": ["...", "...", "..."]}}
        """
        
        try:
            summary_res = await self._call_llm(summary_prompt)
            summary_data = self._parse_json(summary_res)
        except Exception as e:
            logger.error(f"Failed to generate summary: {e}")
            summary_data = {
                "summary": f"Story alignment score is {total_score:.1f}.",
                "recommendations": ["Review character arcs", "Tighten plot points", "Enhance visual descriptions"]
            }
        
        return AlignmentReport(
            total_score=round(total_score, 1),
            categories=categories,
            summary=summary_data.get("summary", ""),
            recommendations=summary_data.get("recommendations", []),
            is_pass=total_score >= self.pass_threshold
        )

    async def _score_prompt_alignment(self, story_data: Dict[str, Any], original_prompt: str) -> ScoreResult:
        """Evaluate how well the story matches the user's original intent."""
        prompt = f"""
        Analyze the alignment between the original prompt and the generated story.
        
        ORIGINAL PROMPT: {original_prompt}
        
        STORY SYNOPSIS: {story_data.get('synopsis', '')}
        STORY TITLE: {story_data.get('title', '')}
        
        Score from 0 to 100 based on:
        1. Did it fulfill all explicit requests in the prompt?
        2. Is the tone and spirit of the prompt preserved?
        3. Are key elements (characters, items mentioned) present?
        
        Return JSON ONLY:
        {{
            "score": float,
            "feedback": "string explaining the score",
            "missing_elements": ["list", "of", "missing", "things"]
        }}
        """
        
        res_json = await self._call_llm(prompt)
        data = self._parse_json(res_json)
        
        return ScoreResult(
            category=ScoringCategory.PROMPT_ALIGNMENT,
            score=data.get("score", 0.0),
            feedback=data.get("feedback", "No feedback provided."),
            issues=data.get("missing_elements", [])
        )

    async def _score_character_consistency(self, story_data: Dict[str, Any]) -> ScoreResult:
        """Evaluate if characters behave consistently and don't disappear/change traits weirdly."""
        scenes_data = []
        for s in story_data.get('scenes', []):
            scenes_data.append({
                "title": s.get('title'),
                "characters": s.get('characters', []),
                "description": s.get('description', '')[:200]
            })
            
        prompt = f"""
        Analyze character consistency across these scenes:
        CHARACTERS: {json.dumps(story_data.get('characters', []), indent=2)}
        SCENES SUMMARY: {json.dumps(scenes_data, indent=2)}
        
        Check for:
        1. Narrative continuity: Do characters stay active or disappear without reason?
        2. Goal consistency: Do they work towards their stated objectives?
        3. Personality preservation: Do they speak/act according to their description?
        
        Return JSON ONLY:
        {{
            "score": float,
            "feedback": "string",
            "issues": ["list of consistency breaks"]
        }}
        """
        
        res_json = await self._call_llm(prompt)
        data = self._parse_json(res_json)
        
        return ScoreResult(
            category=ScoringCategory.CHARACTER_CONSISTENCY,
            score=data.get("score", 0.0),
            feedback=data.get("feedback", "No feedback."),
            issues=data.get("issues", [])
        )

    async def _score_genre_conformity(self, story_data: Dict[str, Any], target_genre: str) -> ScoreResult:
        """Evaluate how well the story respects genre tropes and atmosphere."""
        prompt = f"""
        Evaluate how well this story fits the genre: {target_genre}
        
        STORY SYNOPSIS: {story_data.get('synopsis', '')}
        AUDIO/VISUAL DIRECTION SAMPLE: {story_data.get('scenes', [{}])[0].get('visual_direction', '')}
        
        Score based on:
        1. Usage of genre-specific vocabulary and metaphors.
        2. Atmospheric alignment (lighting, sound, mood).
        3. Pacing appropriate for the genre.
        
        Return JSON ONLY:
        {{
            "score": float,
            "feedback": "string",
            "mismatched_elements": ["list"]
        }}
        """
        
        res_json = await self._call_llm(prompt)
        data = self._parse_json(res_json)
        
        return ScoreResult(
            category=ScoringCategory.GENRE_CONFORMITY,
            score=data.get("score", 0.0),
            feedback=data.get("feedback", "No feedback."),
            issues=data.get("mismatched_elements", [])
        )

    async def _score_structural_integrity(self, story_data: Dict[str, Any], target_structure: str) -> ScoreResult:
        """Evaluate if the story follows the requested narrative structure (e.g. 3-act)."""
        beats = []
        for arc in story_data.get('arcs', []):
            for beat in arc.get('beats', []):
                beats.append(beat.get('name'))
                
        prompt = f"""
        Evaluate structural integrity for: {target_structure}
        
        STORY BEATS FOUND: {", ".join(beats) if beats else "None"}
        NUMBER OF SCENES: {len(story_data.get('scenes', []))}
        
        Check for:
        1. Presence of key structural milestones (Inciting Incident, Midpoint, Climax, etc.).
        2. Proportional distribution of story parts.
        
        Return JSON ONLY:
        {{
            "score": float,
            "feedback": "string",
            "structural_gaps": ["list"]
        }}
        """
        
        res_json = await self._call_llm(prompt)
        data = self._parse_json(res_json)
        
        return ScoreResult(
            category=ScoringCategory.STRUCTURAL_INTEGRITY,
            score=data.get("score", 0.0),
            feedback=data.get("feedback", "No feedback."),
            issues=data.get("structural_gaps", [])
        )

    async def _score_narrative_flow(self, story_data: Dict[str, Any]) -> ScoreResult:
        """Evaluate the overall readability and logical flow of the story."""
        prompt = f"""
        Analyze the narrative flow and logical progression of this story.
        
        STORY: {story_data.get('synopsis', '')}
        
        Check for:
        1. Logical "cause and effect" between events.
        2. Transitions between scenes.
        3. Readability and engagement.
        
        Return JSON ONLY:
        {{
            "score": float,
            "feedback": "string",
            "flow_breaks": ["list"]
        }}
        """
        
        res_json = await self._call_llm(prompt)
        data = self._parse_json(res_json)
        
        return ScoreResult(
            category=ScoringCategory.NARRATIVE_FLOW,
            score=data.get("score", 0.0),
            feedback=data.get("feedback", "No feedback."),
            issues=data.get("flow_breaks", [])
        )

    async def _call_llm(self, prompt: str) -> str:
        """Internal helper to call the LLM service."""
        if self.call_llm_func:
            return await self.call_llm_func(prompt)
            
        try:
            request = LLMRequest(prompt=prompt, temperature=0.3, max_tokens=1000)
            response = await call_llm_real(request, user_id="system_scorer")
            return response.text if response else ""
        except Exception as e:
            logger.error(f"LLM call for scoring failed: {e}")
            return "{}"

    def _parse_json(self, text: str) -> Dict[str, Any]:
        """Tries to extract and parse JSON from LLM response."""
        try:
            # Find the JSON block
            match = re.search(r'\{.*\}', text, re.DOTALL)
            if match:
                return json.loads(match.group(0))
            return {}
        except Exception:
            return {}

def get_story_scorer() -> StoryAlignmentScorer:
    """Factory function for the scorer."""
    return StoryAlignmentScorer()
