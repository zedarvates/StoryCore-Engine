"""
Unit Tests for Audio Services

Tests for:
- AudioMixService (multichannel, effects, export)
- VoiceService (voice synthesis)
- SFXService (SFX playback)
- AudioEffects (effect processing)
"""

import pytest
import numpy as np
from backend.audio_mix_service import (
    AudioMixService,
    MixConfig,
    AudioChannel,
    MixConfiguration,
    MixNode,
    TrackCategory,
    TrackPriority,
    AudioEffects,
    create_mix_config
)
from backend.voice_profile_builder import (
    VoiceService,
    VoiceProfileBuilder,
    VoiceType,
    VoiceFilterType
)
from backend.sfx_profile_builder import (
    SFXService,
    SFXProfileBuilder,
    SFXType,
    MufflingType,
    SFXTrackType
)


# =============================================================================
# AudioEffects Tests
# =============================================================================

class TestAudioEffects:
    """Tests for AudioEffects class"""
    
    @pytest.fixture
    def sample_audio(self):
        """Create sample audio for testing"""
        return np.sin(2 * np.pi * 440 * np.arange(48000) / 48000)  # 440 Hz sine wave
    
    def test_apply_gain(self, sample_audio):
        """Test gain application"""
        original_max = np.max(np.abs(sample_audio))
        result = AudioEffects.apply_gain(sample_audio, 6.0)  # +6 dB
        result_max = np.max(np.abs(result))
        
        assert np.isclose(result_max, original_max * 2, rtol=0.1)
    
    def test_apply_gain_negative(self, sample_audio):
        """Test negative gain"""
        original_max = np.max(np.abs(sample_audio))
        result = AudioEffects.apply_gain(sample_audio, -6.0)  # -6 dB
        result_max = np.max(np.abs(result))
        
        assert np.isclose(result_max, original_max * 0.5, rtol=0.1)
    
    def test_normalize(self, sample_audio):
        """Test normalization"""
        result = AudioEffects.normalize(sample_audio, -3.0)
        result_max = np.max(np.abs(result))
        
        assert np.isclose(result_max, 10 ** (-3/20), rtol=0.01)
    
    def test_apply_reverb(self, sample_audio):
        """Test reverb application"""
        result = AudioEffects.apply_reverb(sample_audio, room_size=0.5, wet_dry=0.3)
        
        assert len(result) == len(sample_audio)
        assert not np.array_equal(result, sample_audio)
    
    def test_apply_delay(self, sample_audio):
        """Test delay effect"""
        result = AudioEffects.apply_delay(sample_audio, delay_ms=100, feedback=0.3)
        
        assert len(result) == len(sample_audio)
    
    def test_apply_eq(self, sample_audio):
        """Test EQ application"""
        result = AudioEffects.apply_eq(sample_audio, low_gain=3, mid_gain=0, high_gain=-3)
        
        assert len(result) == len(sample_audio)
    
    def test_apply_compressor(self, sample_audio):
        """Test compressor application"""
        result = AudioEffects.apply_compressor(
            sample_audio,
            threshold_db=-20.0,
            ratio=4.0
        )
        
        assert len(result) == len(sample_audio)
    
    def test_apply_limiter(self, sample_audio):
        """Test limiter application"""
        result = AudioEffects.apply_limiter(sample_audio, threshold_db=-1.0)
        
        assert np.max(np.abs(result)) <= 10 ** (-1/20) * 1.1  # Slight overshoot allowed


# =============================================================================
# AudioMixService Tests
# =============================================================================

class TestAudioMixService:
    """Tests for AudioMixService class"""
    
    @pytest.fixture
    def service(self):
        """Create AudioMixService instance"""
        return AudioMixService()
    
    def test_default_mix_config(self, service):
        """Test default mix configuration"""
        assert service.mix_config.channel_layout == AudioChannel.STEREO
        assert service.mix_config.sample_rate == 48000
        assert service.mix_config.bit_depth == 24
    
    def test_set_mix_config(self, service):
        """Test setting mix configuration"""
        config = MixConfig(
            channel_layout=AudioChannel.SURROUND_51,
            sample_rate=96000
        )
        service.set_mix_config(config)
        
        assert service.mix_config.channel_layout == AudioChannel.SURROUND_51
        assert service.mix_config.sample_rate == 96000
    
    def test_get_channel_count(self, service):
        """Test channel count retrieval"""
        assert service.get_channel_count() == 2  # Stereo
        
        config = MixConfig(channel_layout=AudioChannel.SURROUND_51)
        service.set_mix_config(config)
        assert service.get_channel_count() == 6  # 5.1
        
        config = MixConfig(channel_layout=AudioChannel.SURROUND_71)
        service.set_mix_config(config)
        assert service.get_channel_count() == 8  # 7.1
    
    def test_get_channel_layout(self, service):
        """Test channel layout retrieval"""
        layout = service.get_channel_layout()
        assert layout == ["left", "right"]
    
    def test_priority_management(self, service):
        """Test priority management"""
        priority = service.get_priority(TrackCategory.DIALOGUE)
        assert priority == TrackPriority.DIALOGUE
        
        priority = service.get_priority(TrackCategory.MUSIC)
        assert priority == TrackPriority.MUSIC
    
    def test_sort_by_priority(self, service):
        """Test priority sorting"""
        tracks = [
            MixNode(
                id="t1", name="Ambient", category=TrackCategory.AMBIENT,
                priority=TrackPriority.AMBIENT, volume=-12
            ),
            MixNode(
                id="t2", name="Dialogue", category=TrackCategory.DIALOGUE,
                priority=TrackPriority.DIALOGUE, volume=0
            ),
            MixNode(
                id="t3", name="Music", category=TrackCategory.MUSIC,
                priority=TrackPriority.MUSIC, volume=-6
            )
        ]
        
        sorted_tracks = service.sort_by_priority(tracks)
        
        assert sorted_tracks[0].category == TrackCategory.DIALOGUE
        assert sorted_tracks[1].category == TrackCategory.MUSIC
        assert sorted_tracks[2].category == TrackCategory.AMBIENT
    
    def test_volume_calculation(self, service):
        """Test volume calculation"""
        vol = service.calculate_volume("impact")
        assert vol.base_volume == 4.0
        
        vol = service.calculate_volume("dialogue")
        assert vol.base_volume == 0.0
        
        vol = service.calculate_volume("ambient")
        assert vol.base_volume == -16.0
    
    def test_auto_mix(self, service):
        """Test automatic mixing"""
        tracks_data = [
            {
                "id": "t1",
                "name": "Dialogue",
                "category": "dialogue",
                "volume": 0.0
            },
            {
                "id": "t2",
                "name": "Music",
                "category": "music",
                "volume": -6.0
            }
        ]
        
        result = service.auto_mix(tracks_data)
        
        assert result.success
        assert len(result.configuration.tracks) == 2
        assert result.configuration.tracks[0].category == TrackCategory.DIALOGUE
    
    def test_validate_mix(self, service):
        """Test mix validation"""
        config = MixConfiguration(
            id="test_mix",
            project_id="test_project",
            tracks=[
                MixNode(
                    id="t1", name="Dialogue", category=TrackCategory.DIALOGUE,
                    priority=TrackPriority.DIALOGUE, volume=0, muted=False
                ),
                MixNode(
                    id="t2", name="Music", category=TrackCategory.MUSIC,
                    priority=TrackPriority.MUSIC, volume=10, muted=False  # Too loud
                )
            ]
        )
        
        valid, issues = service.validate_mix(config)
        
        assert not valid  # Volume too high
        assert len(issues) > 0


# =============================================================================
# VoiceService Tests
# =============================================================================

class TestVoiceService:
    """Tests for VoiceService class"""
    
    @pytest.fixture
    def voice_service(self):
        """Create VoiceService instance"""
        return VoiceService()
    
    def test_get_available_languages(self, voice_service):
        """Test language listing"""
        languages = voice_service.get_available_languages()
        
        assert "fr-FR" in languages
        assert "en-US" in languages
        assert "es-ES" in languages
    
    def test_get_voices_for_language(self, voice_service):
        """Test voice listing per language"""
        voices = voice_service.get_voices_for_language("fr-FR")
        
        assert len(voices) > 0
        assert "Amelie" in voices or "Hugo" in voices
    
    def test_get_available_emotions(self, voice_service):
        """Test emotion listing"""
        emotions = voice_service.get_available_emotions()
        
        assert "neutral" in emotions
        assert "happy" in emotions
        assert "sad" in emotions
        assert "angry" in emotions
    
    @pytest.mark.asyncio
    async def test_generate_voice(self, voice_service):
        """Test voice generation"""
        success, audio_data, message = await voice_service.generate_voice(
            text="Bonjour, ceci est un test.",
            voice="Amelie",
            language="fr-FR"
        )
        
        assert success
        assert len(audio_data) > 0
        assert "Amelie" in message
    
    @pytest.mark.asyncio
    async def test_generate_voice_with_emotion(self, voice_service):
        """Test voice generation with emotion"""
        success, audio_data, message = await voice_service.generate_voice(
            text="Ceci est un test.",
            voice="Aria",
            language="en-US",
            emotion="happy"
        )
        
        assert success
    
    def test_estimate_duration(self, voice_service):
        """Test duration estimation"""
        text = "This is a test sentence with several words."
        duration = voice_service.estimate_duration(text, speed=1.0)
        
        assert duration > 0
        assert duration < 10  # Reasonable upper bound


# =============================================================================
# VoiceProfileBuilder Tests
# =============================================================================

class TestVoiceProfileBuilder:
    """Tests for VoiceProfileBuilder class"""
    
    @pytest.fixture
    def builder(self):
        """Create VoiceProfileBuilder instance"""
        return VoiceProfileBuilder("test_project")
    
    def test_set_voice_type(self, builder):
        """Test voice type setting"""
        builder.set_voice_type("raw")
        profile = builder.build()
        
        assert profile.voice_type == "raw"
    
    def test_set_text(self, builder):
        """Test text setting"""
        builder.set_text("Ceci est un test.")
        profile = builder.build()
        
        assert profile.text_content == "Ceci est un test."
    
    def test_set_voice_and_language(self, builder):
        """Test voice and language setting"""
        builder.set_voice("Hugo", "fr-FR")
        profile = builder.build()
        
        assert profile.voice_name == "Hugo"
        assert profile.language == "fr-FR"
    
    def test_set_emotion(self, builder):
        """Test emotion setting"""
        builder.set_emotion("happy")
        profile = builder.build()
        
        assert profile.emotion == "happy"
    
    def test_add_filter(self, builder):
        """Test filter addition"""
        builder.add_filter("eq", {"low_gain": 3, "mid_gain": 0, "high_gain": -2})
        profile = builder.build()
        
        assert len(profile.filters) == 1
        assert profile.filters[0].filter_type == VoiceFilterType.EQ
    
    def test_apply_radio_effect(self, builder):
        """Test radio effect application"""
        builder.apply_radio_effect()
        profile = builder.build()
        
        assert profile.voice_style == "radio"
        assert len(profile.filters) >= 2  # band_pass, eq, compressor
    
    def test_apply_robot_effect(self, builder):
        """Test robot effect application"""
        builder.apply_robot_effect()
        profile = builder.build()
        
        assert profile.voice_style == "robot"
        assert len(profile.filters) >= 2
    
    def test_to_dict(self, builder):
        """Test dictionary conversion"""
        builder.set_voice_type("raw")
        builder.set_text("Test")
        
        result = builder.to_dict()
        
        assert "id" in result
        assert result["voice_type"] == "raw"
        assert result["text_content"] == "Test"


# =============================================================================
# SFXService Tests
# =============================================================================

class TestSFXService:
    """Tests for SFXService class"""
    
    @pytest.fixture
    def sfx_service(self):
        """Create SFXService instance"""
        return SFXService()
    
    def test_get_categories(self, sfx_service):
        """Test category listing"""
        categories = sfx_service.get_categories()
        
        assert "ui_click" in categories
        assert "footsteps" in categories
        assert "weapons" in categories
        assert "ambient_nature" in categories
    
    def test_get_variants(self, sfx_service):
        """Test variant listing"""
        variants = sfx_service.get_variants("ui_click")
        
        assert len(variants) > 0
        assert variants[0].id == "click_light"
    
    def test_set_master_volume(self, sfx_service):
        """Test master volume setting"""
        sfx_service.set_master_volume(0.5)
        
        assert sfx_service._volume_master == 0.5
    
    @pytest.mark.asyncio
    async def test_play_sfx(self, sfx_service):
        """Test SFX playback"""
        success, sound_id = await sfx_service.play_sfx(
            category="ui_click",
            variant=0,
            volume=1.0
        )
        
        assert success
        assert sound_id.startswith("sfx_ui_click")
    
    @pytest.mark.asyncio
    async def test_stop_sfx(self, sfx_service):
        """Test SFX stopping"""
        success, sound_id = await sfx_service.play_sfx(category="ui_click")
        
        success, message = await sfx_service.stop_sfx(sound_id)
        
        assert success
    
    @pytest.mark.asyncio
    async def test_stop_all_sounds(self, sfx_service):
        """Test stopping all sounds"""
        await sfx_service.play_sfx(category="ui_click")
        await sfx_service.play_sfx(category="ui_hover")
        
        count = await sfx_service.stop_all_sounds()
        
        assert count == 2
        assert len(sfx_service._active_sounds) == 0
    
    def test_get_active_sounds(self, sfx_service):
        """Test active sounds listing"""
        # No sounds initially
        sounds = sfx_service.get_active_sounds()
        assert len(sounds) == 0
    
    def test_preload_category(self, sfx_service):
        """Test category preloading"""
        success, message = sfx_service.preload_category("ambient_nature")
        
        assert success
        assert "ambient_nature" in message


# =============================================================================
# SFXProfileBuilder Tests
# =============================================================================

class TestSFXProfileBuilder:
    """Tests for SFXProfileBuilder class"""
    
    @pytest.fixture
    def builder(self):
        """Create SFXProfileBuilder instance"""
        return SFXProfileBuilder("test_project")
    
    def test_set_action_type(self, builder):
        """Test action type setting"""
        builder.set_action_type("explosion")
        profile = builder.build()
        
        assert profile.action_type == "explosion"
    
    def test_set_intensity(self, builder):
        """Test intensity setting"""
        builder.set_intensity("high")
        profile = builder.build()
        
        assert profile.intensity == "high"
    
    def test_set_environment(self, builder):
        """Test environment setting"""
        builder.set_environment("forest")
        profile = builder.build()
        
        assert profile.environment == "forest"
    
    def test_enable_muffling(self, builder):
        """Test muffling enable"""
        builder.enable_muffling("low_pass_dynamic", "underwater")
        profile = builder.build()
        
        assert profile.muffling.enabled
        assert profile.muffling.muffling_type == MufflingType.LOW_PASS_DYNAMIC
    
    def test_add_filter(self, builder):
        """Test filter addition"""
        builder.add_filter("reverb", {"room_size": 0.5, "wet_level": 0.3})
        profile = builder.build()
        
        assert "reverb" in profile.post_filters
    
    def test_set_sync(self, builder):
        """Test sync settings"""
        builder.set_sync(align_music=True, align_action=True, ducking=True)
        profile = builder.build()
        
        assert profile.sync.align_with_music
        assert profile.sync.align_with_action
        assert profile.sync.ducking_enabled
    
    def test_track_generation(self, builder):
        """Test track generation"""
        builder.set_action_type("explosion")
        profile = builder.build()
        
        assert len(profile.tracks) == 4  # Action, Environment, Stylized, Bullet Time
    
    def test_to_dict(self, builder):
        """Test dictionary conversion"""
        builder.set_action_type("impact")
        builder.set_intensity("high")
        
        result = builder.to_dict()
        
        assert "id" in result
        assert result["action_type"] == "impact"
        assert result["intensity"] == "high"


# =============================================================================
# Convenience Functions Tests
# =============================================================================

class TestConvenienceFunctions:
    """Tests for convenience functions"""
    
    def test_create_mix_config(self):
        """Test mix config creation"""
        config = create_mix_config(
            channels="5.1",
            sample_rate=96000,
            bit_depth=24,
            output_format="wav"
        )
        
        assert config.channel_layout == AudioChannel.SURROUND_51
        assert config.sample_rate == 96000
        assert config.bit_depth == 24
        assert config.output_format == "wav"
    
    def test_create_mix_config_defaults(self):
        """Test mix config defaults"""
        config = create_mix_config()
        
        assert config.channel_layout == AudioChannel.STEREO
        assert config.sample_rate == 48000
        assert config.bit_depth == 24


# =============================================================================
# Run Tests
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
