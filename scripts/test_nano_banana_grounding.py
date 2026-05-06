"""
Test Script for Nano Banana 2 Grounding (Research Service)

Validates the ability to research historical/spatial facts to avoid
AI hallucinations.
"""

import asyncio
from backend.research_service import ResearchService, GroundingContext


async def test_grounding():
    print("--- 🧠 Nano Banana 2: Grounding Research Test ---")

    service = ResearchService()

    # Example: Statue of Liberty in 1886
    prompt = "A majestic shot of the Statue of Liberty's unveiling ceremony"
    ctx = GroundingContext(
        location_name="Liberty Island, New York",
        date="1886-10-28",
        historical_period="19th Century",
    )

    print(f"🎬 Scenario: '{prompt}' on {ctx.date}")

    # 1. Get facts
    facts = await service.get_grounding_facts(prompt, ctx)
    print("\n🔍 Researched Facts:")
    for key, val in facts.items():
        if key != "raw_response":
            print(f"  - {key.capitalize()}: {val}")

    # 2. Enhance prompt
    enhanced = await service.enhance_prompt(prompt, facts)
    print("\n✨ Enhanced Grounded Prompt:")
    print(enhanced)


if __name__ == "__main__":
    asyncio.run(test_grounding())
