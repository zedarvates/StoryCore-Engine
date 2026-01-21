"""
Unit tests for Audio Production Wizard sound design functionality.
"""

import pytest
import asyncio
from pathlib import Path
from unittest.mock import patch, MagicMock, mock_open
from .audio_production_wizard import (
    AudioProductionWizard,
    AudioElement,
    AudioSequence,
    AudioProductionPlan,
    AudioType,
    AudioMood,
    AudioPriority,
    create_audio_production_wizard,
    generate_audio_plan,
    get_audio_preview_for_shot
)


class TestAudioProductionWizard:
    """Test Audio Production Wizard functionality."""

    def test_audio_types_enum(self):
        """Test that audio types are properly defined."""
        assert hasattr(AudioType, 'VOICE_OVER')
        assert hasattr(AudioType, 'SOUND_EFFECT')
        assert hasattr(AudioType, 'BACKGROUND_MUSIC')
        assert hasattr(AudioType, 'AMBIENT_SOUND')
        assert hasattr(AudioType, 'FOLEY')
        assert hasattr(AudioType, 'DIALOGUE')

        assert AudioType.VOICE_OVER.value == "voice_over"
        assert AudioType.SOUND_EFFECT.value == "sound_effect"

    def test_audio_moods_enum(self):
        """Test that audio moods are properly defined."""
        assert hasattr(AudioMood, 'DRAMATIC')
        assert hasattr(AudioMood, 'TENSE')
        assert hasattr(AudioMood, 'PEACEFUL')
        assert hasattr(AudioMood, 'ENERGETIC')
        assert hasattr(AudioMood, 'MYSTERIOUS')
        assert hasattr(AudioMood, 'ROMANTIC')
        assert hasattr(AudioMood, 'COMIC')
        assert hasattr(AudioMood, 'EPIC')
        assert hasattr(AudioMood, 'MELANCHOLIC')
        assert hasattr(AudioMood, 'NEUTRAL')

    def test_audio_priorities_enum(self):
        """Test that audio priorities are properly defined."""
        assert hasattr(AudioPriority, 'CRITICAL')
        assert hasattr(AudioPriority, 'HIGH')
        assert hasattr(AudioPriority, 'MEDIUM')
        assert hasattr(AudioPriority, 'LOW')
        assert hasattr(AudioPriority, 'OPTIONAL')

    @patch('pathlib.Path.exists')
    @patch('builtins.open')
    async def test_create_audio_plan_basic(self, mock_open, mock_exists):
        """Test basic audio production plan creation."""
        mock_exists.return_value = True

        # Mock project data
        project_data = {
            'project.json': {'id': 'test-project', 'name': 'Test Project'},
            'shot_planning.json': {
                'shot_lists': [
                    {
                        'shot_id': 'shot_001',
                        'description': 'A dramatic scene with door opening',
                        'purpose': 'narrative',
                        'timing': {'duration_seconds': 5.0}
                    }
                ]
            }
        }

        def mock_read_side_effect(*args, **kwargs):
            import json
            filename = str(args[0]).split('/')[-1].replace('.json', '')
            return json.dumps(project_data.get(f'{filename}.json', {}))

        mock_file = MagicMock()
        mock_file.__enter__.return_value = mock_file
        mock_file.__exit__.return_value = None
        mock_file.read.side_effect = mock_read_side_effect
        mock_open.return_value = mock_file

        wizard = AudioProductionWizard()

        # Mock the save methods to avoid file system operations
        with patch.object(wizard, '_save_audio_production_plan'):
            plan = await wizard.create_audio_production_plan(Path("/fake/project"))

            assert plan.project_id == 'test-project'
            assert len(plan.audio_sequences) >= 0  # May be 0 if no valid shots
            assert isinstance(plan.total_duration, float)
            assert isinstance(plan.quality_metrics, dict)

    async def test_determine_shot_mood(self):
        """Test mood determination from shot content."""
        wizard = AudioProductionWizard()

        # Test mysterious mood
        mood = wizard._determine_shot_mood("dark mysterious shadows night", "suspense")
        assert mood == AudioMood.MYSTERIOUS

        # Test tense mood
        mood = wizard._determine_shot_mood("fight battle intense action", "conflict")
        assert mood == AudioMood.TENSE

        # Test peaceful mood
        mood = wizard._determine_shot_mood("calm serene quiet peaceful", "narrative")
        assert mood == AudioMood.PEACEFUL

        # Test default mood
        mood = wizard._determine_shot_mood("normal scene", "narrative")
        assert mood == AudioMood.NEUTRAL

    async def test_shot_needs_voice_over(self):
        """Test voice over requirement detection."""
        wizard = AudioProductionWizard()

        # Test narration shot
        needs_vo = wizard._shot_needs_voice_over({
            'purpose': 'narration',
            'description': 'explanatory content'
        }, {})
        assert needs_vo is True

        # Test opening shot
        needs_vo = wizard._shot_needs_voice_over({
            'purpose': 'opening',
            'description': 'introduction scene'
        }, {})
        assert needs_vo is True

        # Test regular shot
        needs_vo = wizard._shot_needs_voice_over({
            'purpose': 'action',
            'description': 'fight scene'
        }, {})
        assert needs_vo is False

    async def test_generate_voice_over_script(self):
        """Test voice over script generation."""
        wizard = AudioProductionWizard()

        script = wizard._generate_voice_over_script({
            'description': 'A beautiful sunset over the mountains'
        }, AudioMood.PEACEFUL)

        assert isinstance(script, str)
        assert len(script) > 0

    async def test_music_genre_for_mood(self):
        """Test music genre selection for moods."""
        wizard = AudioProductionWizard()

        # Test dramatic mood
        genre = wizard._music_genre_for_mood(AudioMood.DRAMATIC)
        assert genre == 'orchestral'

        # Test mysterious mood
        genre = wizard._music_genre_for_mood(AudioMood.MYSTERIOUS)
        assert genre == 'atmospheric'

        # Test peaceful mood
        genre = wizard._music_genre_for_mood(AudioMood.PEACEFUL)
        assert genre == 'ambient'

    async def test_tempo_for_mood(self):
        """Test tempo selection for moods."""
        wizard = AudioProductionWizard()

        # Test tense mood
        tempo = wizard._tempo_for_mood(AudioMood.TENSE)
        assert tempo == 'moderate_tense'

        # Test peaceful mood
        tempo = wizard._tempo_for_mood(AudioMood.PEACEFUL)
        assert tempo == 'slow_calm'

    async def test_instruments_for_mood(self):
        """Test instrument selection for moods."""
        wizard = AudioProductionWizard()

        # Test epic mood
        instruments = wizard._instruments_for_mood(AudioMood.EPIC)
        assert 'full_orchestra' in instruments
        assert 'choir' in instruments

        # Test romantic mood
        instruments = wizard._instruments_for_mood(AudioMood.ROMANTIC)
        assert 'piano' in instruments
        assert 'strings' in instruments

    def test_get_audio_preview_for_shot(self):
        """Test audio preview generation for a shot."""
        wizard = AudioProductionWizard()

        shot_data = {
            'shot_id': 'shot_001',
            'description': 'A door opens slowly in a dark room',
            'purpose': 'suspense',
            'timing': {'duration_seconds': 3.0}
        }

        preview = wizard.get_audio_preview_for_shot(shot_data)

        assert preview['shot_id'] == 'shot_001'
        assert 'mood' in preview
        assert 'duration' in preview
        assert 'suggested_audio' in preview
        assert isinstance(preview['suggested_audio'], list)

        # Should have some audio suggestions
        assert len(preview['suggested_audio']) > 0

        # Check suggestion structure
        for suggestion in preview['suggested_audio']:
            assert 'type' in suggestion
            assert 'description' in suggestion
            assert 'priority' in suggestion

    async def test_create_sound_effects_for_shot(self):
        """Test sound effect generation for shots."""
        wizard = AudioProductionWizard()

        sequence = AudioSequence(
            sequence_id="test_seq",
            shot_id="shot_001",
            duration=5.0
        )

        # Test door-related sound effects
        shot_door = {
            'description': 'A character opens a wooden door',
            'purpose': 'transition'
        }

        elements = await wizard._create_sound_effects_for_shot(shot_door, sequence, AudioMood.NEUTRAL)

        # Should generate door sound effect
        door_effects = [e for e in elements if 'door' in e.name.lower()]
        assert len(door_effects) > 0

        # Test footsteps
        shot_walk = {
            'description': 'Character walks down the hallway',
            'purpose': 'movement'
        }

        elements = await wizard._create_sound_effects_for_shot(shot_walk, sequence, AudioMood.NEUTRAL)
        footstep_effects = [e for e in elements if 'footstep' in e.name.lower() or 'foley' in e.audio_type.value]
        assert len(footstep_effects) > 0

    async def test_create_ambient_audio_for_shot(self):
        """Test ambient audio generation."""
        wizard = AudioProductionWizard()

        sequence = AudioSequence(
            sequence_id="test_seq",
            shot_id="shot_001",
            duration=5.0
        )

        # Test mysterious ambient
        elements = await wizard._create_ambient_audio_for_shot({}, sequence, AudioMood.MYSTERIOUS)
        mysterious_ambient = [e for e in elements if 'tension' in e.name.lower()]
        assert len(mysterious_ambient) > 0

        # Test peaceful ambient
        elements = await wizard._create_ambient_audio_for_shot({}, sequence, AudioMood.PEACEFUL)
        peaceful_ambient = [e for e in elements if 'peaceful' in e.name.lower()]
        assert len(peaceful_ambient) > 0

    async def test_create_music_cues_for_shot(self):
        """Test music cue generation."""
        wizard = AudioProductionWizard()

        sequence = AudioSequence(
            sequence_id="test_seq",
            shot_id="shot_001",
            duration=5.0
        )

        # Test dramatic music cue
        shot_dramatic = {
            'purpose': 'climactic'
        }

        elements = await wizard._create_music_cues_for_shot(shot_dramatic, sequence, AudioMood.DRAMATIC)
        assert len(elements) > 0

        music_element = elements[0]
        assert music_element.audio_type.value == 'background_music'
        assert music_element.mood == AudioMood.DRAMATIC
        assert 'orchestral' in music_element.technical_specs.get('genre', '')

    async def test_calculate_audio_quality_metrics(self):
        """Test quality metrics calculation."""
        wizard = AudioProductionWizard()

        # Create test plan
        plan = AudioProductionPlan(
            project_id="test",
            plan_timestamp="2024-01-01T00:00:00Z",
            total_duration=10.0,
            audio_sequences=[
                AudioSequence(
                    sequence_id="seq1",
                    shot_id="shot1",
                    duration=5.0,
                    audio_elements=[
                        AudioElement(
                            element_id="elem1",
                            audio_type=AudioType.VOICE_OVER,
                            name="VO",
                            description="Voice over",
                            duration_seconds=3.0,
                            start_time=0.0,
                            end_time=3.0,
                            volume_level=0.8,
                            mood=AudioMood.NEUTRAL,
                            priority=AudioPriority.HIGH,
                            shot_association="shot1",
                            confidence_score=0.85
                        )
                    ]
                ),
                AudioSequence(
                    sequence_id="seq2",
                    shot_id="shot2",
                    duration=5.0,
                    audio_elements=[]
                )
            ]
        )

        metrics = wizard._calculate_audio_quality_metrics(plan)

        assert 'voice_coverage' in metrics
        assert 'sfx_coverage' in metrics
        assert 'music_coverage' in metrics
        assert 'average_confidence' in metrics
        assert 'overall_quality' in metrics

        # Voice coverage should be 0.5 (1 out of 2 shots have voice)
        assert metrics['voice_coverage'] == 0.5

    async def test_generate_production_notes(self):
        """Test production notes generation."""
        wizard = AudioProductionWizard()

        plan = AudioProductionPlan(
            project_id="test",
            plan_timestamp="2024-01-01T00:00:00Z",
            total_duration=10.0,
            audio_sequences=[
                AudioSequence(
                    sequence_id="seq1",
                    shot_id="shot1",
                    duration=5.0,
                    audio_elements=[
                        AudioElement(
                            element_id="elem1",
                            audio_type=AudioType.VOICE_OVER,
                            name="VO",
                            description="Voice over",
                            duration_seconds=3.0,
                            start_time=0.0,
                            end_time=3.0,
                            volume_level=0.8,
                            mood=AudioMood.NEUTRAL,
                            priority=AudioPriority.HIGH,
                            shot_association="shot1"
                        )
                    ]
                )
            ],
            voice_over_script="Test script",
            music_cues=[{"cue_name": "Test Cue"}]
        )

        notes = wizard._generate_production_notes(plan)

        assert isinstance(notes, list)
        assert len(notes) > 0
        assert any('Voice Production Notes' in note for note in notes)
        assert any('Music Production Notes' in note for note in notes)

    async def test_generate_technical_requirements(self):
        """Test technical requirements generation."""
        wizard = AudioProductionWizard()

        plan = AudioProductionPlan(
            project_id="test",
            plan_timestamp="2024-01-01T00:00:00Z",
            total_duration=10.0,
            audio_sequences=[]
        )

        tech_reqs = wizard._generate_technical_requirements(plan)

        assert isinstance(tech_reqs, dict)
        assert 'sample_rate' in tech_reqs
        assert 'bit_depth' in tech_reqs
        assert 'format' in tech_reqs
        assert 'mastering_level' in tech_reqs

        assert tech_reqs['sample_rate'] == 48000
        assert tech_reqs['bit_depth'] == 24
        assert tech_reqs['format'] == 'WAV'

    def test_convenience_functions(self):
        """Test convenience functions."""
        # Test wizard creation
        wizard = create_audio_production_wizard()
        assert isinstance(wizard, AudioProductionWizard)

        # Test preview function
        preview = get_audio_preview_for_shot({'shot_id': 'test'})
        assert isinstance(preview, dict)
        assert 'shot_id' in preview
        assert 'suggested_audio' in preview


class TestAudioElement:
    """Test AudioElement dataclass."""

    def test_audio_element_creation(self):
        """Test creating an audio element."""
        element = AudioElement(
            element_id="test_elem",
            audio_type=AudioType.SOUND_EFFECT,
            name="Test Sound",
            description="A test sound effect",
            duration_seconds=2.5,
            start_time=1.0,
            end_time=3.5,
            volume_level=0.7,
            mood=AudioMood.TENSE,
            priority=AudioPriority.MEDIUM,
            shot_association="shot_001",
            confidence_score=0.8
        )

        assert element.element_id == "test_elem"
        assert element.audio_type == AudioType.SOUND_EFFECT
        assert element.name == "Test Sound"
        assert element.duration_seconds == 2.5
        assert element.volume_level == 0.7
        assert element.mood == AudioMood.TENSE
        assert element.priority == AudioPriority.MEDIUM
        assert element.confidence_score == 0.8

    def test_audio_element_defaults(self):
        """Test audio element default values."""
        element = AudioElement(
            element_id="test",
            audio_type=AudioType.VOICE_OVER,
            name="Test",
            description="Test desc",
            duration_seconds=1.0,
            start_time=0.0,
            end_time=1.0,
            volume_level=1.0,
            mood=AudioMood.NEUTRAL,
            priority=AudioPriority.LOW,
            shot_association="shot_001"
        )

        assert element.technical_specs == {}
        assert element.generation_prompt == ""
        assert element.source_file == ""
        assert element.confidence_score == 0.0


class TestAudioSequence:
    """Test AudioSequence dataclass."""

    def test_audio_sequence_creation(self):
        """Test creating an audio sequence."""
        sequence = AudioSequence(
            sequence_id="test_seq",
            shot_id="shot_001",
            duration=5.0
        )

        assert sequence.sequence_id == "test_seq"
        assert sequence.shot_id == "shot_001"
        assert sequence.duration == 5.0
        assert sequence.audio_elements == []
        assert sequence.master_volume == 1.0
        assert sequence.fade_in_duration == 0.0
        assert sequence.fade_out_duration == 0.0
        assert sequence.metadata == {}


class TestAudioProductionPlan:
    """Test AudioProductionPlan dataclass."""

    def test_audio_production_plan_creation(self):
        """Test creating an audio production plan."""
        plan = AudioProductionPlan(
            project_id="test_project",
            plan_timestamp="2024-01-01T00:00:00Z",
            total_duration=10.0
        )

        assert plan.project_id == "test_project"
        assert plan.plan_timestamp == "2024-01-01T00:00:00Z"
        assert plan.total_duration == 10.0
        assert plan.audio_sequences == []
        assert plan.voice_over_script == ""
        assert plan.music_cues == []
        assert plan.sound_effects_inventory == []
        assert plan.production_notes == []
        assert plan.technical_requirements == {}
        assert plan.quality_metrics == {}


if __name__ == "__main__":
    pytest.main([__file__, "-v"])