"""
Research Service for StoryCore-Engine: Nano Banana 2 Grounding

Provides "Real-World Grounding" capabilities:
- Historical accuracy research (via Gemini/Search)
- Geographic/Spatial grounding (Coordinates to scene description)
- Fact-based prompt enhancement
- Hallucination detection for historical/scientific scenes
"""

import asyncio
import logging
import json
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple, Union
from datetime import datetime

# Import LLM caller
try:
    from backend.llm_api import call_llm_real, LLMRequest, should_use_mock_llm, call_llm_mock
except ImportError:
    # Fallback for development if llm_api is not accessible
    from pydantic import BaseModel
    class LLMRequest(BaseModel):
        prompt: str
        model: str = "gpt-3.5-turbo"
    async def call_llm_real(req, user_id):
        class MockResp: text = f"MOCK_RESEARCH: Researched data for '{req.prompt[:30]}...'"
        return MockResp()

logger = logging.getLogger(__name__)

@dataclass
class GroundingContext:
    """Metadata for grounding research"""
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    date: Optional[str] = None # YYYY-MM-DD
    time_of_day: Optional[str] = None # HH:MM
    historical_period: Optional[str] = None
    scientific_process: Optional[str] = None

class ResearchService:
    """
    Research Agent for Nano Banana 2 mode.
    Acts as a 'Historian & Art Director' consultant for the generation engines.
    """
    
    def __init__(self, model_name: str = "gemini-2.0-flash"):
        self.model_name = model_name
        self.knowledge_base = {} # Cache for researched facts

    async def get_grounding_facts(self, prompt: str, context: GroundingContext) -> Dict[str, Any]:
        """
        Performs research using Gemini to gather verified historical/geographical facts.
        """
        research_prompt = self._build_research_query(prompt, context)
        
        logger.info(f"Researching grounding facts for: {prompt[:50]}...")
        
        req = LLMRequest(
            prompt=research_prompt, 
            model=self.model_name,
        )
        
        # In this project, call_llm_real takes (request, user_id)
        # We use a system user_id for research
        try:
            from backend.llm_api import should_use_mock_llm, call_llm_mock
            if should_use_mock_llm():
                response_obj = await call_llm_mock(req, user_id="system_researcher")
            else:
                response_obj = await call_llm_real(req, user_id="system_researcher")
            response = response_obj.text
        except Exception as e:
            logger.error(f"LLM call failed in ResearchService: {e}")
            response = f"Error: {e}"
        
        # Parse the JSON response
        try:
            facts = json.loads(self._extract_json(response))
            return facts
        except Exception as e:
            logger.error(f"Failed to parse research facts: {e}")
            return {"raw_response": response, "error": "JSON parsing failed"}

    async def enhance_prompt(self, base_prompt: str, facts: Dict[str, Any]) -> str:
        """
        Merges base prompt with researched facts to create a 'Grounding Prompt'.
        """
        # Injecting facts like: "Statue is copper-brown, Day was overcast, Street is cobblestone"
        fact_str = ", ".join([f"{k}: {v}" for k, v in facts.items() if isinstance(v, (str, int, float))])
        
        enhancement_prompt = (
            f"Original Prompt: {base_prompt}\n"
            f"Verified Facts: {fact_str}\n\n"
            f"Rewrite the original prompt into a high-fidelity 'Nano Banana 2' style prompt. "
            f"Incorporate the facts seamlessly. Ensure the DNA of the scene (historical, spatial, props) is LOCKED "
            f"to the facts provided. Output only the final prompt."
        )
        
        req = LLMRequest(prompt=enhancement_prompt, model=self.model_name)
        
        try:
            from backend.llm_api import should_use_mock_llm, call_llm_mock
            if should_use_mock_llm():
                response_obj = await call_llm_mock(req, user_id="system_researcher")
            else:
                response_obj = await call_llm_real(req, user_id="system_researcher")
            enhanced = response_obj.text
        except Exception as e:
            logger.error(f"LLM enhancement failed: {e}")
            enhanced = base_prompt # Fallback to original
            
        return enhanced.strip()

    def _build_research_query(self, prompt: str, context: GroundingContext) -> str:
        query_parts = [f"Research the following scene for factualaccuracy and cinematic grounding: '{prompt}'"]
        
        if context.location_name:
            query_parts.append(f"Location: {context.location_name}")
        if context.latitude and context.longitude:
            query_parts.append(f"Coordinates: {context.latitude}, {context.longitude}")
        if context.date:
            query_parts.append(f"Date: {context.date}")
        if context.historical_period:
            query_parts.append(f"Historical Context: {context.historical_period}")
            
        system_instr = (
            "\nProvide the following in JSON format:\n"
            "1. 'architecture': Detailed description of buildings/structures for the exact date/location.\n"
            "2. 'atmosphere': Weather, lighting conditions typical for that date/time.\n"
            "3. 'props': Tools, vehicles, or items accurate to the period.\n"
            "4. 'clothing': Fashion/outfits standard for the location and year.\n"
            "5. 'colors': Specific verified color palettes (e.g. Statue of Liberty color in 1886).\n"
            "6. 'sources': Brief mention of verified historical sources."
        )
        
        return "\n".join(query_parts) + system_instr

    def _extract_json(self, text: str) -> str:
        """Utility to extract JSON block from LLM response."""
        import re
        match = re.search(r"(\{.*\})", text, re.DOTALL)
        if match:
            return match.group(1)
        return text
