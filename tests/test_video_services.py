"""
Tests unitaires pour les services vidéo de la Phase 2
Test video services for Phase 2
"""
import pytest
from datetime import datetime
import uuid
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from backend.timeline_service import (
    TimelineService,
    Timeline,
    TimelineTrack,
    TimelineClip,
    ClipType,
    TransitionType
)
from backend.transitions_service import (
    TransitionsService,
    TransitionType as TSTransitionType,
    TransitionConfig
)
from backend.gpu_service import (
    GPUService,
    GPUEncoder,
    GPUDecode,
    GPUConfig,
    GPUInfo
)


class TestTimelineService:
    """Tests pour TimelineService"""
    
    def setup_method(self):
        """Setup avant chaque test"""
        self.service = TimelineService()
    
    def test_create_timeline(self):
        """Test création d'un timeline"""
        timeline = self.service.create_timeline("Test Timeline")
        
        assert timeline is not None
        assert timeline.name == "Test Timeline"
        assert timeline.id in self.service.timelines
        assert isinstance(timeline.id, str)
        assert len(timeline.id) == 36  # UUID format
    
    def test_create_timeline_with_custom_params(self):
        """Test création d'un timeline avec paramètres personnalisés"""
        timeline = self.service.create_timeline(
            "Custom Timeline",
            frame_rate=60,
            resolution_width=3840,
            resolution_height=2160
        )
        
        assert timeline.frame_rate == 60
        assert timeline.resolution_width == 3840
        assert timeline.resolution_height == 2160
    
    def test_add_track(self):
        """Test ajout d'une piste"""
        timeline = self.service.create_timeline("Test")
        track = self.service.add_track(timeline.id, "Video Track", ClipType.VIDEO)
        
        assert track is not None
        assert track.id in [t.id for t in timeline.tracks]
        assert track.name == "Video Track"
        assert track.type == ClipType.VIDEO
        assert len(timeline.tracks) == 1
    
    def test_add_multiple_tracks(self):
        """Test ajout de plusieurs pistes"""
        timeline = self.service.create_timeline("Multi Track Test")
        
        self.service.add_track(timeline.id, "Video 1", ClipType.VIDEO)
        self.service.add_track(timeline.id, "Video 2", ClipType.VIDEO)
        self.service.add_track(timeline.id, "Audio 1", ClipType.AUDIO)
        
        assert len(timeline.tracks) == 3
    
    def test_add_clip(self):
        """Test ajout d'un clip"""
        timeline = self.service.create_timeline("Clip Test")
        track = self.service.add_track(timeline.id, "Video", ClipType.VIDEO)
        
        clip_data = {
            "id": str(uuid.uuid4()),
            "type": ClipType.VIDEO,
            "track_id": track.id,
            "start_time": 0.0,
            "end_time": 5.0,
            "source_start": 0.0,
            "source_end": 5.0,
            "file_path": "/path/to/video.mp4",
            "name": "Test Clip"
        }
        
        clip = self.service.add_clip(timeline.id, track.id, clip_data)
        
        assert clip is not None
        assert clip.start_time == 0.0
        assert clip.end_time == 5.0
    
    def test_move_clip(self):
        """Test déplacement d'un clip"""
        timeline = self.service.create_timeline("Move Test")
        track = self.service.add_track(timeline.id, "Video", ClipType.VIDEO)
        
        clip_data = {
            "id": str(uuid.uuid4()),
            "type": ClipType.VIDEO,
            "track_id": track.id,
            "start_time": 0.0,
            "end_time": 5.0,
            "source_start": 0.0,
            "source_end": 5.0,
            "file_path": "/path/to/video.mp4",
            "name": "Test Clip"
        }
        
        clip_id = clip_data["id"]
        self.service.add_clip(timeline.id, track.id, clip_data)
        
        result = self.service.move_clip(timeline.id, clip_id, 10.0)
        
        assert result is True
        moved_clip = None
        for t in timeline.tracks:
            for c in t.clips:
                if c.id == clip_id:
                    moved_clip = c
                    break
        
        assert moved_clip is not None
        assert moved_clip.start_time == 10.0
        assert moved_clip.end_time == 15.0
    
    def test_move_clip_to_different_track(self):
        """Test déplacement d'un clip vers une autre piste"""
        timeline = self.service.create_timeline("Move Track Test")
        track1 = self.service.add_track(timeline.id, "Track 1", ClipType.VIDEO)
        track2 = self.service.add_track(timeline.id, "Track 2", ClipType.VIDEO)
        
        clip_data = {
            "id": str(uuid.uuid4()),
            "type": ClipType.VIDEO,
            "track_id": track1.id,
            "start_time": 0.0,
            "end_time": 5.0,
            "source_start": 0.0,
            "source_end": 5.0,
            "file_path": "/path/to/video.mp4",
            "name": "Test Clip"
        }
        
        clip_id = clip_data["id"]
        self.service.add_clip(timeline.id, track1.id, clip_data)
        
        result = self.service.move_clip(timeline.id, clip_id, 5.0, track2.id)
        
        assert result is True
        
        clip_in_track2 = None
        for t in timeline.tracks:
            if t.id == track2.id:
                for c in t.clips:
                    if c.id == clip_id:
                        clip_in_track2 = c
                        break
        
        assert clip_in_track2 is not None
        assert clip_in_track2.track_id == track2.id
    
    def test_split_clip(self):
        """Test scission d'un clip"""
        timeline = self.service.create_timeline("Split Test")
        track = self.service.add_track(timeline.id, "Video", ClipType.VIDEO)
        
        clip_data = {
            "id": str(uuid.uuid4()),
            "type": ClipType.VIDEO,
            "track_id": track.id,
            "start_time": 0.0,
            "end_time": 10.0,
            "source_start": 0.0,
            "source_end": 10.0,
            "file_path": "/path/to/video.mp4",
            "name": "Test Clip"
        }
        
        clip_id = clip_data["id"]
        self.service.add_clip(timeline.id, track.id, clip_data)
        
        clip_a, clip_b = self.service.split_clip(timeline.id, clip_id, 5.0)
        
        assert clip_a is not None
        assert clip_b is not None
        assert clip_a.end_time == 5.0
        assert clip_b.start_time == 5.0
    
    def test_add_transition(self):
        """Test ajout d'une transition"""
        timeline = self.service.create_timeline("Transition Test")
        track = self.service.add_track(timeline.id, "Video", ClipType.VIDEO)
        
        clip_data = {
            "id": str(uuid.uuid4()),
            "type": ClipType.VIDEO,
            "track_id": track.id,
            "start_time": 0.0,
            "end_time": 5.0,
            "source_start": 0.0,
            "source_end": 5.0,
            "file_path": "/path/to/video.mp4",
            "name": "Test Clip"
        }
        
        clip_id = clip_data["id"]
        self.service.add_clip(timeline.id, track.id, clip_data)
        
        result = self.service.add_transition(
            timeline_id=timeline.id,
            clip_id=clip_id,
            transition_type=TransitionType.DISSOLVE,
            position="out"
        )
        
        assert result is True
        
        clip = None
        for t in timeline.tracks:
            for c in t.clips:
                if c.id == clip_id:
                    clip = c
                    break
        
        assert clip is not None
        assert clip.transitions["out"] == "dissolve"
    
    def test_add_effect(self):
        """Test ajout d'un effet"""
        timeline = self.service.create_timeline("Effect Test")
        track = self.service.add_track(timeline.id, "Video", ClipType.VIDEO)
        
        clip_data = {
            "id": str(uuid.uuid4()),
            "type": ClipType.VIDEO,
            "track_id": track.id,
            "start_time": 0.0,
            "end_time": 5.0,
            "source_start": 0.0,
            "source_end": 5.0,
            "file_path": "/path/to/video.mp4",
            "name": "Test Clip"
        }
        
        clip_id = clip_data["id"]
        self.service.add_clip(timeline.id, track.id, clip_data)
        
        self.service.add_effect(timeline.id, clip_id, "blur")
        self.service.add_effect(timeline.id, clip_id, "brightness")
        
        clip = None
        for t in timeline.tracks:
            for c in t.clips:
                if c.id == clip_id:
                    clip = c
                    break
        
        assert clip is not None
        assert "blur" in clip.effects
        assert "brightness" in clip.effects
    
    def test_get_timeline_duration(self):
        """Test récupération de la durée du timeline"""
        timeline = self.service.create_timeline("Duration Test")
        track = self.service.add_track(timeline.id, "Video", ClipType.VIDEO)
        
        clip_data = {
            "id": str(uuid.uuid4()),
            "type": ClipType.VIDEO,
            "track_id": track.id,
            "start_time": 0.0,
            "end_time": 10.0,
            "source_start": 0.0,
            "source_end": 10.0,
            "file_path": "/path/to/video.mp4",
            "name": "Test Clip"
        }
        
        self.service.add_clip(timeline.id, track.id, clip_data)
        
        duration = self.service.get_timeline_duration(timeline.id)
        
        assert duration == 10.0
    
    def test_get_timeline_duration_with_gaps(self):
        """Test récupération de la durée avec des clips espacés"""
        timeline = self.service.create_timeline("Duration Gaps Test")
        track = self.service.add_track(timeline.id, "Video", ClipType.VIDEO)
        
        for i in range(3):
            clip_data = {
                "id": str(uuid.uuid4()),
                "type": ClipType.VIDEO,
                "track_id": track.id,
                "start_time": float(i * 10),
                "end_time": float((i + 1) * 10),
                "source_start": 0.0,
                "source_end": 10.0,
                "file_path": f"/path/to/video{i}.mp4",
                "name": f"Clip {i}"
            }
            self.service.add_clip(timeline.id, track.id, clip_data)
        
        duration = self.service.get_timeline_duration(timeline.id)
        
        assert duration == 30.0
    
    def test_delete_clip(self):
        """Test suppression d'un clip"""
        timeline = self.service.create_timeline("Delete Test")
        track = self.service.add_track(timeline.id, "Video", ClipType.VIDEO)
        
        clip_data = {
            "id": str(uuid.uuid4()),
            "type": ClipType.VIDEO,
            "track_id": track.id,
            "start_time": 0.0,
            "end_time": 5.0,
            "source_start": 0.0,
            "source_end": 5.0,
            "file_path": "/path/to/video.mp4",
            "name": "Test Clip"
        }
        
        clip_id = clip_data["id"]
        self.service.add_clip(timeline.id, track.id, clip_data)
        
        assert len(track.clips) == 1
        
        result = self.service.delete_clip(timeline.id, clip_id)
        
        assert result is True
        assert len(track.clips) == 0
    
    def test_export_to_dict(self):
        """Test export d'un timeline vers un dictionnaire"""
        timeline = self.service.create_timeline("Export Test")
        track = self.service.add_track(timeline.id, "Video", ClipType.VIDEO)
        
        clip_data = {
            "id": str(uuid.uuid4()),
            "type": ClipType.VIDEO,
            "track_id": track.id,
            "start_time": 0.0,
            "end_time": 5.0,
            "source_start": 0.0,
            "source_end": 5.0,
            "file_path": "/path/to/video.mp4",
            "name": "Test Clip"
        }
        
        self.service.add_clip(timeline.id, track.id, clip_data)
        
        exported = self.service.export_to_dict(timeline.id)
        
        assert exported["name"] == "Export Test"
        assert "tracks" in exported
        assert len(exported["tracks"]) == 1
        assert len(exported["tracks"][0]["clips"]) == 1


class TestTransitionsService:
    """Tests pour TransitionsService"""
    
    def setup_method(self):
        """Setup avant chaque test"""
        self.service = TransitionsService()
    
    def test_build_cut_transition(self):
        """Test construction d'une transition CUT"""
        cmd = self.service.build_transition_command(
            "a.mp4",
            "b.mp4",
            TSTransitionType.CUT,
            "out.mp4",
            TransitionConfig()
        )
        
        assert "-y" in cmd
        assert "concat" in str(cmd)
        assert cmd[-1] == "out.mp4"
    
    def test_build_dissolve_transition(self):
        """Test construction d'une transition DISSOLVE"""
        config = TransitionConfig(duration=1.5)
        cmd = self.service.build_transition_command(
            "a.mp4",
            "b.mp4",
            TSTransitionType.DISSOLVE,
            "out.mp4",
            config
        )
        
        assert "xfade=transition=dissolve" in str(cmd)
        assert "duration=1.5" in str(cmd)
    
    def test_build_fade_black_transition(self):
        """Test construction d'une transition FADE_BLACK"""
        config = TransitionConfig(duration=1.0)
        cmd = self.service.build_transition_command(
            "a.mp4",
            "b.mp4",
            TSTransitionType.FADE_BLACK,
            "out.mp4",
            config
        )
        
        assert "fade=t=out" in str(cmd)
        assert "fade=t=in" in str(cmd)
    
    def test_build_wipe_transition(self):
        """Test construction d'une transition WIPE"""
        config = TransitionConfig(duration=0.8)
        cmd = self.service.build_transition_command(
            "a.mp4",
            "b.mp4",
            TSTransitionType.WIPE_LEFT,
            "out.mp4",
            config
        )
        
        assert "xfade=transition=wipeleft" in str(cmd)
    
    def test_build_zoom_transition(self):
        """Test construction d'une transition ZOOM"""
        config = TransitionConfig(duration=1.2)
        cmd = self.service.build_transition_command(
            "a.mp4",
            "b.mp4",
            TSTransitionType.ZOOM_IN,
            "out.mp4",
            config
        )
        
        assert "xfade=transition=zoomin" in str(cmd)
    
    def test_transition_duration_range_dissolve(self):
        """Test plage de durée pour DISSOLVE"""
        range_ = self.service.get_transition_duration_range(TSTransitionType.DISSOLVE)
        
        assert range_[0] == 0.5
        assert range_[1] == 3.0
        assert range_[0] < range_[1]
    
    def test_transition_duration_range_fade(self):
        """Test plage de durée pour FADE"""
        range_black = self.service.get_transition_duration_range(TSTransitionType.FADE_BLACK)
        range_white = self.service.get_transition_duration_range(TSTransitionType.FADE_WHITE)
        
        assert range_black[0] == 0.5
        assert range_black[1] == 2.0
        assert range_white[0] == 0.5
        assert range_white[1] == 2.0
    
    def test_transition_duration_range_cut(self):
        """Test plage de durée pour CUT (pas de durée)"""
        range_ = self.service.get_transition_duration_range(TSTransitionType.CUT)
        
        assert range_[0] == 0
        assert range_[1] == 0
    
    def test_validate_transition_valid(self):
        """Test validation d'une transition valide"""
        result = self.service.validate_transition(
            TSTransitionType.DISSOLVE,
            1.5
        )
        
        assert result is True
    
    def test_validate_transition_invalid(self):
        """Test validation d'une transition invalide"""
        result = self.service.validate_transition(
            TSTransitionType.DISSOLVE,
            5.0  # Au-delà de la durée max
        )
        
        assert result is False
    
    def test_get_available_transitions(self):
        """Test récupération des transitions disponibles"""
        transitions = self.service.get_available_transitions()
        
        assert len(transitions) > 0
        for t in transitions:
            assert "type" in t
            assert "name" in t
            assert "min_duration" in t
            assert "max_duration" in t
    
    def test_concat_command_structure(self):
        """Test structure de la commande concat"""
        cmd = self.service._build_concat(["a.mp4", "b.mp4", "c.mp4"], "out.mp4")
        
        assert cmd[0] == "ffmpeg"
        assert cmd[1] == "-y"
        assert "-i" in cmd
        assert "concat=n=3" in str(cmd)


class TestGPUService:
    """Tests pour GPUService"""
    
    def setup_method(self):
        """Setup avant chaque test"""
        self.service = GPUService()
    
    def test_gpu_detection(self):
        """Test détection GPU"""
        is_available = self.service.is_gpu_available()
        
        assert isinstance(is_available, bool)
    
    def test_get_gpu_info_no_gpu(self):
        """Test récupération info GPU quand pas de GPU"""
        if not self.service.is_gpu_available():
            info = self.service.get_gpu_info()
            assert info is None
    
    def test_get_gpu_usage_no_gpu(self):
        """Test récupération usage GPU quand pas de GPU"""
        if not self.service.is_gpu_available():
            usage = self.service.get_gpu_usage()
            assert usage == {}
    
    def test_build_cpu_fallback(self):
        """Test construction commande fallback CPU"""
        cmd = self.service._build_cpu_fallback("in.mp4", "out.mp4")
        
        assert "ffmpeg" in cmd
        assert "-i" in cmd
        assert "in.mp4" in cmd
        assert "out.mp4" in cmd
        assert "libx264" in cmd
    
    def test_build_gpu_encode_command_structure(self):
        """Test structure commande encodage GPU"""
        cmd = self.service.build_gpu_encode_command(
            "in.mp4",
            "out.mp4"
        )
        
        assert "ffmpeg" in cmd
        assert "-y" in cmd
        assert "-i" in cmd
        assert "in.mp4" in cmd
        assert "out.mp4" in cmd
    
    def test_gpu_config_defaults(self):
        """Test valeurs par défaut GPUConfig"""
        config = GPUConfig()
        
        assert config.encoder == GPUEncoder.NVIDIA_NVENC
        assert config.decoder == GPUDecode.NVIDIA_CUVID
        assert config.preset == "fast"
        assert config.crf == 23
        assert config.hwaccel == "cuda"
    
    def test_gpu_encoder_enum(self):
        """Test énumérateur GPUEncoder"""
        assert GPUEncoder.NVIDIA_NVENC.value == "nvenc"
        assert GPUEncoder.AMD_AMF.value == "amf"
        assert GPUEncoder.INTEL_QSV.value == "qsv"
    
    def test_gpu_decode_enum(self):
        """Test énumérateur GPUDecode"""
        assert GPUDecode.NVIDIA_CUVID.value == "cuvid"
        assert GPUDecode.AMD_CUVID.value == "cuvid_amf"
        assert GPUDecode.INTEL_QSV.value == "qsv"
    
    def test_get_encoding_config_suggestions(self):
        """Test suggestions de configuration d'encodage"""
        suggestions = self.service.get_encoding_config_suggestions()
        
        assert "encoder" in suggestions
        assert "preset" in suggestions
        assert "hwaccel" in suggestions
        assert "suggested_crf" in suggestions
    
    def test_estimate_encoding_speedup(self):
        """Test estimation accélération encodage"""
        speedup = self.service.estimate_encoding_speedup("input.mp4")
        
        assert isinstance(speedup, float)
        assert speedup >= 1.0
    
    def test_get_supported_encoders(self):
        """Test récupération encodeurs supportés"""
        encoders = self.service.get_supported_encoders()
        
        assert isinstance(encoders, list)


class TestTimelineClip:
    """Tests pour la classe TimelineClip"""
    
    def test_clip_creation(self):
        """Test création d'un clip"""
        clip = TimelineClip(
            id="test-id",
            type=ClipType.VIDEO,
            track_id="track-1",
            start_time=0.0,
            end_time=10.0
        )
        
        assert clip.id == "test-id"
        assert clip.type == ClipType.VIDEO
        assert clip.start_time == 0.0
        assert clip.end_time == 10.0
        assert clip.locked is False
        assert clip.visible is True
        assert clip.effects == []
        assert clip.transitions == {}
    
    def test_clip_with_metadata(self):
        """Test clip avec métadonnées"""
        clip = TimelineClip(
            id="test-id",
            type=ClipType.VIDEO,
            track_id="track-1",
            start_time=0.0,
            end_time=10.0,
            metadata={"fps": 30, "codec": "h264"},
            effects=["blur", "color_correction"]
        )
        
        assert clip.metadata["fps"] == 30
        assert "blur" in clip.effects


class TestTimelineTrack:
    """Tests pour la classe TimelineTrack"""
    
    def test_track_creation(self):
        """Test création d'une piste"""
        track = TimelineTrack(
            id="track-1",
            name="Video Track",
            type=ClipType.VIDEO
        )
        
        assert track.id == "track-1"
        assert track.name == "Video Track"
        assert track.type == ClipType.VIDEO
        assert track.muted is False
        assert track.locked is False
        assert track.height == 60
        assert track.clips == []


class TestTimeline:
    """Tests pour la classe Timeline"""
    
    def test_timeline_creation(self):
        """Test création d'un timeline"""
        timeline = Timeline(
            id="timeline-1",
            name="My Timeline"
        )
        
        assert timeline.id == "timeline-1"
        assert timeline.name == "My Timeline"
        assert timeline.duration == 0.0
        assert timeline.frame_rate == 30.0
        assert timeline.resolution_width == 1920
        assert timeline.resolution_height == 1080
        assert timeline.tracks == []
        assert isinstance(timeline.created_at, datetime)
        assert isinstance(timeline.updated_at, datetime)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
