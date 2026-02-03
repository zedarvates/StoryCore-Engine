"""
Property-based tests for project structure creation.

Tests universal properties that should hold across all inputs.
Uses hypothesis library with minimum 100 iterations per property.
"""

import pytest
import tempfile
import shutil
import json
from pathlib import Path
from hypothesis import given, strategies as st, settings
from src.end_to_end.project_structure_builder import ProjectStructureBuilder
from src.end_to_end.data_models import (
    ProjectComponents,
    WorldConfig,
    Character,
    StoryStructure,
    DialogueScript,
    SequencePlan,
    MusicDescription,
    ProjectMetadata,
    ColorPalette,
    Act,
    EmotionalBeat,
    Sequence,
    Shot,
    PromptModules,
    MusicCue,
    DialogueScene
)
from datetime import datetime
import uuid


# Custom strategies for generating test data
@st.composite
def project_components_data(draw):
    """
    Generate random ProjectComponents instances for testing.
    """
    # Generate world config
    world_config = WorldConfig(
        world_id=str(uuid.uuid4()),
        name=draw(st.text(min_size=3, max_size=30, alphabet=st.characters(min_codepoint=32, max_codepoint=126))),
        genre=draw(st.sampled_from(['cyberpunk', 'fantasy', 'horror', 'sci-fi'])),
        setting=draw(st.sampled_from(['city', 'forest', 'space', 'desert'])),
        time_period=draw(st.sampled_from(['present', 'future', 'past', '2048'])),
        visual_style=draw(st.lists(st.sampled_from(['cinematic', 'noir', 'vibrant']), min_size=1, max_size=3)),
        color_palette=ColorPalette(
            primary=draw(st.sampled_from(['#FF0000', '#00FF00', '#0000FF'])),
            secondary=draw(st.sampled_from(['#FFFF00', '#FF00FF', '#00FFFF'])),
            accent=draw(st.sampled_from(['#FFFFFF', '#000000', '#808080'])),
            background=draw(st.sampled_from(['#F0F0F0', '#1A1A1A', '#2C2C2C']))
        ),
        lighting_style=draw(st.sampled_from(['dramatic', 'soft', 'harsh'])),
        atmosphere=draw(st.sampled_from(['dark', 'mysterious', 'epic'])),
        key_locations=[]
    )
    
    # Generate characters
    num_characters = draw(st.integers(min_value=1, max_value=5))
    characters = []
    for i in range(num_characters):
        char = Character(
            character_id=str(uuid.uuid4()),
            name=f"Character{i}",
            role=draw(st.sampled_from(['protagonist', 'antagonist', 'supporting'])),
            description=f"Description for character {i}",
            visual_description=f"Visual description for character {i}",
            personality_traits=draw(st.lists(st.text(min_size=3, max_size=10, alphabet=st.characters(min_codepoint=97, max_codepoint=122)), min_size=1, max_size=3)),
            relationships={}
        )
        characters.append(char)
    
    # Generate story structure
    duration = draw(st.integers(min_value=30, max_value=300))
    num_acts = draw(st.integers(min_value=1, max_value=3))
    acts = []
    for i in range(num_acts):
        act = Act(
            act_number=i + 1,
            name=f"Act {i + 1}",
            description=f"Description for act {i + 1}",
            duration=duration // num_acts,
            scenes=[f"Scene {j + 1}" for j in range(draw(st.integers(min_value=1, max_value=3)))]
        )
        acts.append(act)
    
    story_structure = StoryStructure(
        story_id=str(uuid.uuid4()),
        title=draw(st.text(min_size=3, max_size=50, alphabet=st.characters(min_codepoint=32, max_codepoint=126))),
        logline=draw(st.text(min_size=10, max_size=100, alphabet=st.characters(min_codepoint=32, max_codepoint=126))),
        acts=acts,
        themes=draw(st.lists(st.text(min_size=3, max_size=20, alphabet=st.characters(min_codepoint=97, max_codepoint=122)), min_size=1, max_size=3)),
        emotional_arc=[
            EmotionalBeat(
                beat_id=str(uuid.uuid4()),
                emotion=draw(st.sampled_from(['joy', 'fear', 'anger', 'sadness'])),
                intensity=draw(st.floats(min_value=0.0, max_value=1.0)),
                timestamp=0.0
            )
        ]
    )
    
    # Generate dialogue script (optional)
    has_dialogue = draw(st.booleans())
    if has_dialogue:
        dialogue_script = DialogueScript(
            script_id=str(uuid.uuid4()),
            scenes=[
                DialogueScene(
                    scene_id=str(uuid.uuid4()),
                    scene_name="Scene 1",
                    location="Location",
                    time="Day",
                    characters_present=[char.name for char in characters[:2]],
                    dialogue_lines=[],
                    action_notes=[]
                )
            ],
            total_lines=0,
            estimated_duration=0
        )
    else:
        dialogue_script = DialogueScript(
            script_id=str(uuid.uuid4()),
            scenes=[],
            total_lines=0,
            estimated_duration=0
        )
    
    # Generate sequence plan
    num_sequences = len(acts)
    sequences = []
    total_shots = 0
    for i in range(num_sequences):
        num_shots = draw(st.integers(min_value=1, max_value=5))
        total_shots += num_shots
        shots = []
        for j in range(num_shots):
            shot = Shot(
                shot_id=str(uuid.uuid4()),
                shot_number=j + 1,
                duration=draw(st.integers(min_value=2, max_value=10)),
                description=f"Shot {j + 1} description",
                camera_angle=draw(st.sampled_from(['wide', 'medium', 'close-up'])),
                camera_movement=draw(st.sampled_from(['static', 'pan', 'zoom'])),
                lighting=draw(st.sampled_from(['natural', 'dramatic', 'soft'])),
                composition=draw(st.sampled_from(['centered', 'rule-of-thirds'])),
                prompt_modules=PromptModules(
                    base="Base prompt",
                    style="Style",
                    lighting="Lighting",
                    composition="Composition",
                    camera="Camera"
                )
            )
            shots.append(shot)
        
        sequence = Sequence(
            sequence_id=str(uuid.uuid4()),
            name=f"Sequence {i + 1}",
            duration=duration // num_sequences,
            shots=shots,
            mood=draw(st.sampled_from(['tense', 'calm', 'exciting'])),
            visual_direction="Visual direction"
        )
        sequences.append(sequence)
    
    sequence_plan = SequencePlan(
        sequence_id=str(uuid.uuid4()),
        total_duration=duration,
        sequences=sequences,
        total_shots=total_shots
    )
    
    # Generate music description
    music_description = MusicDescription(
        music_id=str(uuid.uuid4()),
        genre=draw(st.sampled_from(['orchestral', 'electronic', 'ambient'])),
        mood=draw(st.lists(st.sampled_from(['epic', 'mysterious', 'tense']), min_size=1, max_size=3)),
        tempo=draw(st.sampled_from(['slow', 'medium', 'fast'])),
        instruments=draw(st.lists(st.sampled_from(['strings', 'synth', 'drums']), min_size=1, max_size=3)),
        sound_effects=[],
        timeline=[
            MusicCue(
                cue_id=str(uuid.uuid4()),
                timestamp=0.0,
                description="Music starts",
                intensity=0.5
            ),
            MusicCue(
                cue_id=str(uuid.uuid4()),
                timestamp=float(duration),
                description="Music ends",
                intensity=0.5
            )
        ]
    )
    
    # Generate metadata
    metadata = ProjectMetadata(
        project_id=str(uuid.uuid4()),
        project_name=draw(st.text(min_size=3, max_size=50, alphabet=st.characters(min_codepoint=97, max_codepoint=122))),
        created_at=datetime.now(),
        updated_at=datetime.now(),
        version="1.0",
        author="test_author",
        video_type=draw(st.sampled_from(['trailer', 'teaser', 'short film'])),
        duration_seconds=duration,
        aspect_ratio=draw(st.sampled_from(['16:9', '9:16', '1:1'])),
        resolution=draw(st.sampled_from(['1920x1080', '1080x1920', '1080x1080']))
    )
    
    return ProjectComponents(
        world_config=world_config,
        characters=characters,
        story_structure=story_structure,
        dialogue_script=dialogue_script,
        sequence_plan=sequence_plan,
        music_description=music_description,
        metadata=metadata
    )


class TestCompleteProjectStructureCreation:
    """
    Property 4: Complete Project Structure Creation
    
    **Validates: Requirements 4.1-4.10**
    
    For any set of generated components, the system should create a complete
    project structure with all required directories and files, and validate
    the structure integrity.
    """
    
    @settings(max_examples=100)
    @given(components=project_components_data())
    def test_property_4_creates_project_directory(self, components):
        """
        Property 4: Complete Project Structure Creation
        
        Test that project root directory is created.
        
        **Validates: Requirement 4.1**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            project_name = components.metadata.project_name
            
            structure = builder.create_project_structure(project_name, components)
            
            # Verify project directory exists
            assert structure.project_path.exists(), \
                f"Project directory must exist: {structure.project_path}"
            assert structure.project_path.is_dir(), \
                f"Project path must be a directory: {structure.project_path}"
    
    @settings(max_examples=100)
    @given(components=project_components_data())
    def test_property_4_creates_all_subdirectories(self, components):
        """
        Property 4: Complete Project Structure Creation
        
        Test that all required subdirectories are created.
        
        **Validates: Requirement 4.2**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            project_name = components.metadata.project_name
            
            structure = builder.create_project_structure(project_name, components)
            
            # Verify all subdirectories exist
            assert structure.assets_images_path.exists(), \
                "assets/images directory must exist"
            assert structure.assets_audio_path.exists(), \
                "assets/audio directory must exist"
            assert structure.exports_path.exists(), \
                "exports directory must exist"
            
            # Verify they are directories
            assert structure.assets_images_path.is_dir(), \
                "assets/images must be a directory"
            assert structure.assets_audio_path.is_dir(), \
                "assets/audio must be a directory"
            assert structure.exports_path.is_dir(), \
                "exports must be a directory"
    
    @settings(max_examples=100)
    @given(components=project_components_data())
    def test_property_4_creates_project_json(self, components):
        """
        Property 4: Complete Project Structure Creation
        
        Test that project.json is created with metadata.
        
        **Validates: Requirement 4.3**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            project_name = components.metadata.project_name
            
            structure = builder.create_project_structure(project_name, components)
            
            # Verify project.json exists
            assert structure.project_json_path.exists(), \
                "project.json must exist"
            
            # Verify it's a valid JSON file
            with open(structure.project_json_path, 'r') as f:
                data = json.load(f)
            
            # Verify required fields
            assert "schema_version" in data, "project.json must have schema_version"
            assert "project_name" in data, "project.json must have project_name"
            assert "project_id" in data, "project.json must have project_id"
            assert "created_at" in data, "project.json must have created_at"
            assert "capabilities" in data, "project.json must have capabilities"
            assert "generation_status" in data, "project.json must have generation_status"
    
    @settings(max_examples=100)
    @given(components=project_components_data())
    def test_property_4_creates_project_template(self, components):
        """
        Property 4: Complete Project Structure Creation
        
        Test that project_template.json is created.
        
        **Validates: Requirement 4.4**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            project_name = components.metadata.project_name
            
            structure = builder.create_project_structure(project_name, components)
            
            # Verify project_template.json exists
            assert structure.project_template_path.exists(), \
                "project_template.json must exist"
            
            # Verify it's a valid JSON file
            with open(structure.project_template_path, 'r') as f:
                data = json.load(f)
            
            # Verify required fields
            assert "template_version" in data, "template must have template_version"
            assert "project_name" in data, "template must have project_name"
            assert "genre" in data, "template must have genre"
            assert "video_type" in data, "template must have video_type"
    
    @settings(max_examples=100)
    @given(components=project_components_data())
    def test_property_4_creates_world_config(self, components):
        """
        Property 4: Complete Project Structure Creation
        
        Test that world_config.json is created.
        
        **Validates: Requirement 4.5**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            project_name = components.metadata.project_name
            
            structure = builder.create_project_structure(project_name, components)
            
            # Verify world_config.json exists
            assert structure.world_config_path.exists(), \
                "world_config.json must exist"
            
            # Verify it's a valid JSON file
            with open(structure.world_config_path, 'r') as f:
                data = json.load(f)
            
            # Verify required fields
            assert "world_id" in data, "world_config must have world_id"
            assert "genre" in data, "world_config must have genre"
            assert "setting" in data, "world_config must have setting"
    
    @settings(max_examples=100)
    @given(components=project_components_data())
    def test_property_4_creates_characters(self, components):
        """
        Property 4: Complete Project Structure Creation
        
        Test that characters.json is created.
        
        **Validates: Requirement 4.6**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            project_name = components.metadata.project_name
            
            structure = builder.create_project_structure(project_name, components)
            
            # Verify characters.json exists
            assert structure.characters_path.exists(), \
                "characters.json must exist"
            
            # Verify it's a valid JSON file
            with open(structure.characters_path, 'r') as f:
                data = json.load(f)
            
            # Verify structure
            assert "characters" in data, "characters.json must have characters array"
            assert len(data["characters"]) == len(components.characters), \
                f"Character count must match: {len(data['characters'])} vs {len(components.characters)}"
    
    @settings(max_examples=100)
    @given(components=project_components_data())
    def test_property_4_creates_story_structure(self, components):
        """
        Property 4: Complete Project Structure Creation
        
        Test that story_structure.json is created.
        
        **Validates: Requirement 4.7**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            project_name = components.metadata.project_name
            
            structure = builder.create_project_structure(project_name, components)
            
            # Verify story_structure.json exists
            assert structure.story_structure_path.exists(), \
                "story_structure.json must exist"
            
            # Verify it's a valid JSON file
            with open(structure.story_structure_path, 'r') as f:
                data = json.load(f)
            
            # Verify required fields
            assert "story_id" in data, "story_structure must have story_id"
            assert "title" in data, "story_structure must have title"
            assert "acts" in data, "story_structure must have acts"
    
    @settings(max_examples=100)
    @given(components=project_components_data())
    def test_property_4_creates_dialogue_script_when_present(self, components):
        """
        Property 4: Complete Project Structure Creation
        
        Test that dialogue_script.json is created when dialogues exist.
        
        **Validates: Requirement 4.8**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            project_name = components.metadata.project_name
            
            structure = builder.create_project_structure(project_name, components)
            
            # Check if dialogue script should exist
            has_dialogues = components.dialogue_script and len(components.dialogue_script.scenes) > 0
            
            if has_dialogues:
                # Verify dialogue_script.json exists
                assert structure.dialogue_script_path is not None, \
                    "dialogue_script_path must be set when dialogues exist"
                assert structure.dialogue_script_path.exists(), \
                    "dialogue_script.json must exist when dialogues present"
                
                # Verify it's a valid JSON file
                with open(structure.dialogue_script_path, 'r') as f:
                    data = json.load(f)
                
                # Verify required fields
                assert "script_id" in data, "dialogue_script must have script_id"
                assert "scenes" in data, "dialogue_script must have scenes"
            else:
                # Verify dialogue_script.json is not created
                assert structure.dialogue_script_path is None, \
                    "dialogue_script_path must be None when no dialogues"
    
    @settings(max_examples=100)
    @given(components=project_components_data())
    def test_property_4_creates_sequence_plan(self, components):
        """
        Property 4: Complete Project Structure Creation
        
        Test that sequence_plan.json is created.
        
        **Validates: Requirement 4.9**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            project_name = components.metadata.project_name
            
            structure = builder.create_project_structure(project_name, components)
            
            # Verify sequence_plan.json exists
            assert structure.sequence_plan_path.exists(), \
                "sequence_plan.json must exist"
            
            # Verify it's a valid JSON file
            with open(structure.sequence_plan_path, 'r') as f:
                data = json.load(f)
            
            # Verify required fields
            assert "sequence_id" in data, "sequence_plan must have sequence_id"
            assert "sequences" in data, "sequence_plan must have sequences"
            assert "total_shots" in data, "sequence_plan must have total_shots"
    
    @settings(max_examples=100)
    @given(components=project_components_data())
    def test_property_4_creates_music_description(self, components):
        """
        Property 4: Complete Project Structure Creation
        
        Test that music_description.json is created.
        
        **Validates: Requirement 4.10**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            project_name = components.metadata.project_name
            
            structure = builder.create_project_structure(project_name, components)
            
            # Verify music_description.json exists
            assert structure.music_description_path.exists(), \
                "music_description.json must exist"
            
            # Verify it's a valid JSON file
            with open(structure.music_description_path, 'r') as f:
                data = json.load(f)
            
            # Verify required fields
            assert "music_id" in data, "music_description must have music_id"
            assert "genre" in data, "music_description must have genre"
            assert "timeline" in data, "music_description must have timeline"
    
    @settings(max_examples=100)
    @given(components=project_components_data())
    def test_property_4_structure_validation_passes(self, components):
        """
        Property 4: Complete Project Structure Creation
        
        Test that structure validation passes for created projects.
        
        **Validates: Requirements 4.1-4.10**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            project_name = components.metadata.project_name
            
            structure = builder.create_project_structure(project_name, components)
            
            # Validate structure
            validation = builder.validate_structure(structure.project_path)
            
            # Verify validation passes
            assert validation.valid, \
                f"Structure validation must pass. Missing dirs: {validation.missing_directories}, " \
                f"Missing files: {validation.missing_files}, Errors: {validation.errors}"
            assert len(validation.missing_directories) == 0, \
                f"No directories should be missing: {validation.missing_directories}"
            assert len(validation.missing_files) == 0, \
                f"No files should be missing: {validation.missing_files}"
            assert len(validation.errors) == 0, \
                f"No errors should occur: {validation.errors}"
    
    @settings(max_examples=100)
    @given(components=project_components_data())
    def test_property_4_all_json_files_valid(self, components):
        """
        Property 4: Complete Project Structure Creation
        
        Test that all created JSON files are valid and parseable.
        
        **Validates: Requirements 4.3-4.10**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            project_name = components.metadata.project_name
            
            structure = builder.create_project_structure(project_name, components)
            
            # List of all JSON files that should exist
            json_files = [
                structure.project_json_path,
                structure.project_template_path,
                structure.world_config_path,
                structure.characters_path,
                structure.story_structure_path,
                structure.sequence_plan_path,
                structure.music_description_path
            ]
            
            # Add dialogue script if it exists
            if structure.dialogue_script_path:
                json_files.append(structure.dialogue_script_path)
            
            # Verify all JSON files are valid
            for json_file in json_files:
                assert json_file.exists(), f"JSON file must exist: {json_file}"
                
                # Try to parse JSON
                try:
                    with open(json_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    assert isinstance(data, dict), \
                        f"JSON file must contain object: {json_file}"
                except json.JSONDecodeError as e:
                    pytest.fail(f"Invalid JSON in {json_file}: {e}")
    
    @settings(max_examples=100)
    @given(components=project_components_data())
    def test_property_4_project_path_structure(self, components):
        """
        Property 4: Complete Project Structure Creation
        
        Test that project path structure is correct.
        
        **Validates: Requirements 4.1, 4.2**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            project_name = components.metadata.project_name
            
            structure = builder.create_project_structure(project_name, components)
            
            # Verify path hierarchy
            assert structure.project_path.parent == Path(temp_dir), \
                "Project must be in base directory"
            assert structure.assets_images_path.parent.parent == structure.project_path, \
                "assets/images must be under project directory"
            assert structure.assets_audio_path.parent.parent == structure.project_path, \
                "assets/audio must be under project directory"
            assert structure.exports_path.parent == structure.project_path, \
                "exports must be under project directory"
    
    @settings(max_examples=100)
    @given(components=project_components_data())
    def test_property_4_idempotent_creation(self, components):
        """
        Property 4: Complete Project Structure Creation
        
        Test that creating the same project twice doesn't fail.
        
        **Validates: Requirements 4.1-4.10**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            project_name = components.metadata.project_name
            
            # Create project first time
            structure1 = builder.create_project_structure(project_name, components)
            
            # Create project second time (should not fail)
            try:
                structure2 = builder.create_project_structure(project_name, components)
                # Both structures should point to same paths
                assert structure1.project_path == structure2.project_path
            except Exception as e:
                pytest.fail(f"Second creation should not fail: {e}")
    
    @settings(max_examples=100)
    @given(components=project_components_data())
    def test_property_4_save_all_components_success(self, components):
        """
        Property 4: Complete Project Structure Creation
        
        Test that save_all_components returns True on success.
        
        **Validates: Requirements 4.3-4.10**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            project_name = components.metadata.project_name
            
            # Create project directory
            project_path = Path(temp_dir) / project_name
            project_path.mkdir(parents=True, exist_ok=True)
            
            # Save all components
            success = builder.save_all_components(project_path, components)
            
            # Verify success
            assert success, "save_all_components must return True on success"
    
    @settings(max_examples=100)
    @given(components=project_components_data())
    def test_property_4_json_encoding_utf8(self, components):
        """
        Property 4: Complete Project Structure Creation
        
        Test that JSON files are encoded in UTF-8.
        
        **Validates: Requirements 4.3-4.10**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            project_name = components.metadata.project_name
            
            structure = builder.create_project_structure(project_name, components)
            
            # Check project.json encoding
            with open(structure.project_json_path, 'rb') as f:
                content = f.read()
                # Try to decode as UTF-8
                try:
                    content.decode('utf-8')
                except UnicodeDecodeError:
                    pytest.fail("JSON file must be UTF-8 encoded")
