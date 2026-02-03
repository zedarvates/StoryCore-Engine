"""
Unit tests for ComponentGenerator.

Tests component generation orchestration and coherence validation.
"""

import pytest
from src.end_to_end.component_generator import ComponentGenerator
from src.end_to_end.data_models import ParsedPrompt, CharacterInfo


@pytest.fixture
def component_generator():
    """Create ComponentGenerator instance"""
    return ComponentGenerator()


@pytest.fixture
def sample_parsed_prompt():
    """Create sample parsed prompt"""
    return ParsedPrompt(
        project_title="Test Project",
        genre="sci-fi",
        video_type="trailer",
        mood=["futuristic", "mysterious"],
        setting="Space Station",
        time_period="2150",
        characters=[
            CharacterInfo(name="Captain", role="protagonist", description="Ship captain"),
            CharacterInfo(name="AI", role="sidekick", description="Ship AI")
        ],
        key_elements=["exploration", "discovery"],
        visual_style=["sleek", "futuristic"],
        aspect_ratio="16:9",
        duration_seconds=60,
        raw_prompt="A sci-fi trailer...",
        confidence_scores={}
    )


@pytest.mark.asyncio
async def test_generate_all_components_basic(component_generator, sample_parsed_prompt):
    """Test basic component generation"""
    components = await component_generator.generate_all_components(sample_parsed_prompt)
    
    assert components.world_config
    assert components.characters
    assert components.story_structure
    assert components.dialogue_script
    assert components.sequence_plan
    assert components.music_description
    assert components.metadata


@pytest.mark.asyncio
async def test_all_components_have_ids(component_generator, sample_parsed_prompt):
    """Test all components have unique IDs"""
    components = await component_generator.generate_all_components(sample_parsed_prompt)
    
    assert components.world_config.world_id
    assert components.story_structure.story_id
    assert components.dialogue_script.script_id
    assert components.sequence_plan.sequence_id
    assert components.music_description.music_id


@pytest.mark.asyncio
async def test_characters_match_prompt(component_generator, sample_parsed_prompt):
    """Test generated characters match prompt"""
    components = await component_generator.generate_all_components(sample_parsed_prompt)
    
    assert len(components.characters) == len(sample_parsed_prompt.characters)
    
    # Check character names match
    prompt_names = {c.name for c in sample_parsed_prompt.characters}
    component_names = {c.name for c in components.characters}
    assert prompt_names == component_names


@pytest.mark.asyncio
async def test_metadata_populated(component_generator, sample_parsed_prompt):
    """Test metadata is populated"""
    components = await component_generator.generate_all_components(sample_parsed_prompt)
    
    assert components.metadata.created_at
    assert components.metadata.updated_at
    assert components.metadata.version
    assert components.metadata.author


def test_validate_coherence_basic(component_generator, sample_parsed_prompt):
    """Test basic coherence validation"""
    # This is a sync test since we're testing validation only
    # We'll create minimal components manually
    from src.end_to_end.data_models import (
        ProjectComponents, WorldConfig, ColorPalette, StoryStructure,
        Act, DialogueScript, SequencePlan, Sequence, MusicDescription,
        ProjectMetadata
    )
    from datetime import datetime
    
    components = ProjectComponents(
        world_config=WorldConfig(
            world_id="w1",
            name="Test World",
            genre="sci-fi",
            setting="Space",
            time_period="future",
            visual_style=["futuristic"],
            color_palette=ColorPalette(primary="blue", secondary="white", accent="silver", background="black"),
            lighting_style="bright",
            atmosphere="clean",
            key_locations=[]
        ),
        characters=[],
        story_structure=StoryStructure(
            story_id="s1",
            title="Test",
            logline="A story",
            acts=[Act(act_number=1, name="Act 1", description="Desc", duration=30, scenes=["scene-1"])],
            themes=["theme"],
            emotional_arc=[]
        ),
        dialogue_script=DialogueScript(
            script_id="d1",
            scenes=[],
            total_lines=0,
            estimated_duration=0
        ),
        sequence_plan=SequencePlan(
            sequence_id="seq1",
            total_duration=30,
            sequences=[Sequence(sequence_id="s1", name="Seq", duration=30, shots=[], mood="tense", visual_direction="dark")],
            total_shots=0
        ),
        music_description=MusicDescription(
            music_id="m1",
            genre="electronic",
            mood=["tense"],
            tempo="fast",
            instruments=["synth"],
            sound_effects=[],
            timeline=[]
        ),
        metadata=ProjectMetadata(
            created_at=datetime.now(),
            updated_at=datetime.now(),
            version="1.0"
        )
    )
    
    result = component_generator.validate_coherence(components)
    
    assert "is_coherent" in result
    assert "issues" in result
    assert "total_issues" in result
    assert isinstance(result["is_coherent"], bool)
    assert isinstance(result["issues"], list)


@pytest.mark.asyncio
async def test_coherence_validation_runs(component_generator, sample_parsed_prompt):
    """Test coherence validation runs during generation"""
    components = await component_generator.generate_all_components(sample_parsed_prompt)
    
    # Validate coherence manually
    result = component_generator.validate_coherence(components)
    
    # Should have minimal issues for properly generated components
    assert result["total_issues"] < 5


@pytest.mark.asyncio
async def test_world_config_matches_genre(component_generator, sample_parsed_prompt):
    """Test world config matches prompt genre"""
    components = await component_generator.generate_all_components(sample_parsed_prompt)
    
    assert components.world_config.genre == sample_parsed_prompt.genre


@pytest.mark.asyncio
async def test_story_structure_has_acts(component_generator, sample_parsed_prompt):
    """Test story structure has acts"""
    components = await component_generator.generate_all_components(sample_parsed_prompt)
    
    assert len(components.story_structure.acts) > 0


@pytest.mark.asyncio
async def test_sequence_plan_has_sequences(component_generator, sample_parsed_prompt):
    """Test sequence plan has sequences"""
    components = await component_generator.generate_all_components(sample_parsed_prompt)
    
    assert len(components.sequence_plan.sequences) > 0


@pytest.mark.asyncio
async def test_music_description_has_timeline(component_generator, sample_parsed_prompt):
    """Test music description has timeline"""
    components = await component_generator.generate_all_components(sample_parsed_prompt)
    
    assert len(components.music_description.timeline) > 0


@pytest.mark.asyncio
async def test_components_duration_consistency(component_generator, sample_parsed_prompt):
    """Test duration consistency across components"""
    components = await component_generator.generate_all_components(sample_parsed_prompt)
    
    # Story acts duration should sum to total
    story_duration = sum(act.duration for act in components.story_structure.acts)
    assert abs(story_duration - sample_parsed_prompt.duration_seconds) <= len(components.story_structure.acts)
    
    # Sequence plan total duration should match
    assert components.sequence_plan.total_duration == sample_parsed_prompt.duration_seconds
