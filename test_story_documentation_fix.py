#!/usr/bin/env python3
"""
Test Script for Story Documentation Generation Fix

This script verifies that the StoryDocumentationGenerator correctly creates
the expected file structure for story documentation.

Expected files:
- story/00_master_outline.md
- story/01_plot_core.md
- story/02_lore_worldbuilding.md
- story/03_conspiracy_hidden_truth.md
- story/04_character_bibles/character1.md
- story/04_character_bibles/character2.md
- story/05_timelines.md
- story/06_style_guide.md
- story/Scenario..md
"""

import os
import sys
import tempfile
import shutil
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Optional

# Add src directory to path for imports
sys.path.insert(0, str(Path(__file__).parent / "src"))

from wizard.story_documentation import (
    StoryDocumentationGenerator,
    CharacterProfile,
    TimelineEvent,
    StoryDocumentation
)


@dataclass
class MockGeneratedStory:
    """Mock generated story for testing"""
    theme: str = "Redemption"
    tone: str = "Dark and atmospheric"
    conflict: str = "Internal struggle between duty and desire"
    stakes: str = "The fate of the kingdom hangs in the balance"
    resolution: str = "Protagonist finds peace through sacrifice"
    acts: List = field(default_factory=list)


@dataclass
class MockAct:
    """Mock act for testing"""
    title: str = "The Beginning"
    description: str = "Introduction to the world and characters"
    beats: List = field(default_factory=list)


@dataclass
class MockBeat:
    """Mock beat for testing"""
    name: str = "Inciting Incident"
    emotional_intensity: int = 8


@dataclass
class MockWizardState:
    """Mock wizard state for testing"""
    project_name: str = "Test Story Project"
    story_content: str = "A tale of redemption and sacrifice in a dark fantasy world. " * 10
    generated_story: Optional[MockGeneratedStory] = None
    
    def get(self, key: str, default=None):
        """Dict-like access for compatibility"""
        return getattr(self, key, default)


def create_test_characters() -> List[CharacterProfile]:
    """Create test characters for the story"""
    character1 = CharacterProfile(
        name="Elena",
        full_name="Elena Nightshade",
        age="28",
        origins="Born in the northern mountains, raised by scholars",
        biography="A former knight who abandoned her order after a tragic mission",
        visible_goals="Seek redemption for past failures",
        hidden_goals="Find the truth about her family's disappearance",
        strengths=["Swordsmanship", "Strategic thinking", "Loyalty"],
        weaknesses=["Guilt", "Trust issues", "Nightmares"],
        emotional_arc="From guilt-ridden outcast to self-accepting hero",
        important_relations="Mentor to young Marcus, rival to Commander Voss",
        personal_secrets="She was present the night the king died",
        detailed_arc="Begins as a broken warrior, finds purpose through protecting others"
    )
    
    character2 = CharacterProfile(
        name="Marcus",
        full_name="Marcus Thorne",
        age="19",
        origins="Street orphan from the capital city",
        biography="A young thief with hidden magical abilities",
        visible_goals="Survive and protect his sister",
        hidden_goals="Discover the source of his powers",
        strengths=["Stealth", "Magic potential", "Street smarts"],
        weaknesses=["Impulsive", "Inexperienced", "Protective of sister"],
        emotional_arc="From selfish survivor to selfless protector",
        important_relations="Student of Elena, brother to Mira",
        personal_secrets="His magic comes from the ancient bloodline",
        detailed_arc="Starts as a thief, grows into a powerful mage"
    )
    
    return [character1, character2]


def create_test_timeline_events() -> tuple:
    """Create test timeline events"""
    world_events = [
        TimelineEvent(
            date="Year 0",
            event="Founding of the Kingdom",
            importance="major"
        ),
        TimelineEvent(
            date="Year 500",
            event="The Great Schism",
            importance="major"
        ),
        TimelineEvent(
            date="Year 520",
            event="Discovery of the Ancient Artifacts",
            importance="key_revelation"
        )
    ]
    
    novel_events = [
        TimelineEvent(
            date="Day 1",
            event="Elena meets Marcus",
            importance="major"
        ),
        TimelineEvent(
            date="Day 15",
            event="Attack on the village",
            importance="major"
        ),
        TimelineEvent(
            date="Day 30",
            event="Revelation of Marcus's powers",
            importance="key_revelation"
        )
    ]
    
    return world_events, novel_events


def run_test():
    """Run the story documentation generation test"""
    print("=" * 60)
    print("Story Documentation Generation Test")
    print("=" * 60)
    
    # Create a temporary directory for testing
    test_dir = tempfile.mkdtemp(prefix="story_doc_test_")
    print(f"\nTest directory: {test_dir}")
    
    try:
        # Create mock wizard state with generated story
        mock_story = MockGeneratedStory()
        mock_story.acts = [
            MockAct(
                title="The Call",
                description="Elena is drawn back into the conflict",
                beats=[MockBeat("Inciting Incident", 8), MockBeat("First Challenge", 6)]
            ),
            MockAct(
                title="The Journey",
                description="The party travels across dangerous lands",
                beats=[MockBeat("Major Setback", 7), MockBeat("Key Revelation", 9)]
            ),
            MockAct(
                title="The Resolution",
                description="Final confrontation and resolution",
                beats=[MockBeat("Climax", 10), MockBeat("Resolution", 5)]
            )
        ]
        
        mock_state = MockWizardState(
            project_name="The Nightshade Chronicles",
            story_content="A dark fantasy tale of redemption, sacrifice, and the search for truth in a world torn by ancient conflicts.",
            generated_story=mock_story
        )
        
        # Initialize the generator
        generator = StoryDocumentationGenerator()
        
        # Generate documentation from wizard state
        print("\n1. Generating documentation from wizard state...")
        doc = generator.generate_from_wizard_state(mock_state)
        print(f"   Project title: {doc.project_title}")
        print(f"   Themes: {doc.major_themes}")
        print(f"   Structure: {doc.global_structure}")
        
        # Add test characters
        print("\n2. Adding test characters...")
        characters = create_test_characters()
        for char in characters:
            generator.add_character(char)
            print(f"   Added: {char.name}")
        
        # Add timeline events
        print("\n3. Adding timeline events...")
        world_events, novel_events = create_test_timeline_events()
        for event in world_events:
            generator.add_timeline_event(event, is_world=True)
            print(f"   World event: {event.date} - {event.event}")
        for event in novel_events:
            generator.add_timeline_event(event, is_world=False)
            print(f"   Novel event: {event.date} - {event.event}")
        
        # Add chapters
        print("\n4. Adding chapters...")
        chapters = ["The Awakening", "Shadows of the Past", "The Gathering Storm", 
                    "Revelations", "The Final Stand"]
        for chapter in chapters:
            generator.add_chapter(chapter)
        print(f"   Added {len(chapters)} chapters")
        
        # Generate all files
        print("\n5. Generating all documentation files...")
        output_path = Path(test_dir)
        files = generator.generate_all_files(output_path)
        print(f"   Generated {len(files)} files")
        
        # Verify file structure
        print("\n6. Verifying file structure...")
        story_dir = output_path / "story"
        
        expected_files = [
            "story/00_master_outline.md",
            "story/01_plot_core.md",
            "story/02_lore_worldbuilding.md",
            "story/03_conspiracy_hidden_truth.md",
            "story/04_character_bibles/elena.md",
            "story/04_character_bibles/marcus.md",
            "story/05_timelines.md",
            "story/06_style_guide.md",
            # Story-chapter files
            "story/story-index.md",
            "story/story-intro.md",
            "story/story-chapter-01.md",
            "story/story-chapter-02.md",
            "story/story-chapter-03.md",
            "story/story-chapter-04.md",
            "story/story-chapter-05.md",
            "story/story-ending.md",
            "story/story-summary.md",
            # Scenario file for film/video production
            "story/scenario.md"
        ]
        
        all_passed = True
        for expected_file in expected_files:
            file_path = output_path / expected_file
            if file_path.exists():
                file_size = file_path.stat().st_size
                print(f"   [PASS] {expected_file} ({file_size} bytes)")
            else:
                print(f"   [FAIL] {expected_file} - File not found!")
                all_passed = False
        
        # Verify content of key files
        print("\n7. Verifying file contents...")
        
        # Check master outline
        master_outline = story_dir / "00_master_outline.md"
        if master_outline.exists():
            content = master_outline.read_text(encoding='utf-8')
            if "The Nightshade Chronicles" in content:
                print("   [PASS] Master outline contains project title")
            else:
                print("   [FAIL] Master outline missing project title")
                all_passed = False
        
        # Check character bibles
        char_dir = story_dir / "04_character_bibles"
        if char_dir.exists():
            elena_file = char_dir / "elena.md"
            if elena_file.exists():
                content = elena_file.read_text(encoding='utf-8')
                if "Elena Nightshade" in content and "Swordsmanship" in content:
                    print("   [PASS] Elena character bible contains correct data")
                else:
                    print("   [FAIL] Elena character bible missing expected data")
                    all_passed = False
            
            marcus_file = char_dir / "marcus.md"
            if marcus_file.exists():
                content = marcus_file.read_text(encoding='utf-8')
                if "Marcus Thorne" in content and "Stealth" in content:
                    print("   [PASS] Marcus character bible contains correct data")
                else:
                    print("   [FAIL] Marcus character bible missing expected data")
                    all_passed = False
        
        # Final result
        print("\n" + "=" * 60)
        if all_passed:
            print("TEST RESULT: SUCCESS - All files created correctly!")
            print("=" * 60)
            return True
        else:
            print("TEST RESULT: FAILURE - Some files were not created correctly")
            print("=" * 60)
            return False
            
    except Exception as e:
        print(f"\n[ERROR] Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        # Cleanup
        print(f"\nCleaning up test directory: {test_dir}")
        try:
            shutil.rmtree(test_dir)
            print("Cleanup successful")
        except Exception as e:
            print(f"Cleanup failed: {e}")


if __name__ == "__main__":
    success = run_test()
    sys.exit(0 if success else 1)