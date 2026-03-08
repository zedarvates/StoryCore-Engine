import asyncio
import json
import os
import sys

# Add current directory to path so we can import backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.story_generation_service import StoryGenerationService, StoryGenre, StoryStructure, ProductionMode

async def run_demo():
    print("=== STORYCORE ENGINE - ADVANCED GENERATION DEMO ===")
    service = StoryGenerationService()
    
    # Test parameters
    prompt = "Une rénovation d'un vieux phare abandonné en loft high-tech sur une île bretonne."
    genre = StoryGenre.ADVENTURE
    structure = StoryStructure.THREE_ACT
    mode = ProductionMode.RENOVATION
    
    print(f"\n[CONFIG]")
    print(f"Prompt: {prompt}")
    print(f"Mode: {mode.name}")
    print(f"Genre: {genre.name}")
    print(f"Critique: ACTIVATED")
    
    print("\n[GENERATION IN PROGRESS...]")
    
    try:
        story = await service.generate_story(
            prompt=prompt,
            genre=genre,
            structure=structure,
            mode=mode,
            length="medium",
            with_critique=True
        )
        
        print("\n[GENERATION COMPLETE!]")
        print(f"Title: {story.title}")
        print(f"Synopsis: {story.synopsis[:200]}...")
        
        print(f"\n[CHARACTERS] ({len(story.characters)})")
        for char in story.characters:
            name = char.get('name', 'N/A')
            role = char.get('role', 'N/A')
            print(f"- {name} ({role})")
            
        print(f"\n[LOCATIONS] ({len(story.locations)})")
        for loc in story.locations:
            print(f"- {loc.get('name', 'N/A')}")
            
        print(f"\n[SCENES] ({len(story.scenes)})")
        for scene in story.scenes:
            print(f"- {scene.title}")
            
        print(f"\n[PROPS] ({len(story.props)})")
        for prop in story.props[:5]:
            print(f"- {prop.name}: {prop.description[:50]}...")
            
        if story.critique:
            print("\n[MULTI-AGENT CRITIQUE]")
            print("-" * 40)
            print(story.critique)
            print("-" * 40)
            
        # Export to JSON for validation
        output_file = "demo_generation_result.json"
        with open(output_file, "w", encoding="utf-8") as f:
            # Simple conversion helper
            def serialize(obj):
                if hasattr(obj, "__dict__"):
                    return obj.__dict__
                if hasattr(obj, "name"):
                    return obj.name
                return str(obj)
                
            data = {
                "title": story.title,
                "synopsis": story.synopsis,
                "characters": story.characters,
                "locations": story.locations,
                "props": [serialize(p) for p in story.props],
                "sfx": [serialize(s) for s in story.sfx],
                "scenes": [serialize(s) for s in story.scenes],
                "critique": story.critique
            }
            json.dump(data, f, indent=2, ensure_ascii=False)
            
        print(f"\nFull result exported to: {output_file}")
        
    except Exception as e:
        print(f"\n[ERROR] Generation failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_demo())
