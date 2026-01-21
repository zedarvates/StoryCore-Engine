"""
Video Editor Wizard - Automatic Video Editing and Montage

An intelligent wizard that automatically creates professional video montages from storyboards,
integrating audio plans, visual sequences, and cinematic editing techniques. Combines
shot planning, audio production, and editing expertise into seamless final videos.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum
import json
import os
from pathlib import Path
from datetime import datetime
import asyncio


class TransitionType(Enum):
    """Types of video transitions"""
    CUT = "cut"
    FADE_IN = "fade_in"
    FADE_OUT = "fade_out"
    DISSOLVE = "dissolve"
    WIPE = "wipe"
    ZOOM = "zoom"
    SLIDE = "slide"
    SPIN = "spin"


class EditingStyle(Enum):
    """Video editing styles"""
    CINEMATIC = "cinematic"
    DYNAMIC = "dynamic"
    SMOOTH = "smooth"
    INTENSE = "intense"
    MINIMALIST = "minimalist"
    DOCUMENTARY = "documentary"


class TimelineElement:
    """An element in the video timeline"""
    def __init__(self, element_id: str, start_time: float, duration: float, content_type: str):
        self.element_id = element_id
        self.start_time = start_time
        self.duration = duration
        self.end_time = start_time + duration
        self.content_type = content_type  # 'video', 'audio', 'transition'
        self.metadata: Dict[str, Any] = {}

    def overlaps_with(self, other: 'TimelineElement') -> bool:
        """Check if this element overlaps with another"""
        return not (self.end_time <= other.start_time or self.start_time >= other.end_time)


@dataclass
class VideoClip:
    """A video clip in the montage"""
    clip_id: str
    shot_id: str
    start_time: float
    duration: float
    file_path: str = ""
    transition_in: Optional[TransitionType] = None
    transition_out: Optional[TransitionType] = None
    effects: List[Dict[str, Any]] = field(default_factory=list)
    audio_sync: List[str] = field(default_factory=list)  # audio element IDs
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AudioTrack:
    """An audio track in the montage"""
    track_id: str
    audio_type: str  # 'voice_over', 'music', 'sfx', 'ambient'
    start_time: float
    duration: float
    volume_level: float
    fade_in: float = 0.0
    fade_out: float = 0.0
    file_path: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class VideoMontage:
    """Complete video montage specification"""
    montage_id: str
    project_id: str
    creation_timestamp: str
    total_duration: float
    resolution: Tuple[int, int] = (1920, 1080)
    frame_rate: int = 30
    editing_style: EditingStyle = EditingStyle.CINEMATIC

    # Content
    video_clips: List[VideoClip] = field(default_factory=list)
    audio_tracks: List[AudioTrack] = field(default_factory=list)
    transitions: List[Dict[str, Any]] = field(default_factory=list)

    # Metadata
    storyboard_source: str = ""
    audio_plan_source: str = ""
    quality_metrics: Dict[str, float] = field(default_factory=dict)
    export_settings: Dict[str, Any] = field(default_factory=dict)
    production_notes: List[str] = field(default_factory=list)


class VideoEditorWizard:
    """
    Video Editor Wizard - Automatic Montage Creation

    Creates professional video montages by intelligently combining:
    - Storyboard sequences and shot planning
    - Audio production plans from SonicCrafter
    - Cinematic editing techniques and transitions
    - Quality optimization and final export
    """

    def __init__(self, video_engine=None):
        """Initialize the Video Editor wizard"""
        self.video_engine = video_engine
        self.montage: Optional[VideoMontage] = None

    async def create_video_montage(self, project_path: Path,
                                 output_filename: str = "final_montage",
                                 editing_style: EditingStyle = EditingStyle.CINEMATIC) -> VideoMontage:
        """
        Create a complete video montage from project data

        Args:
            project_path: Path to the StoryCore project directory
            output_filename: Base name for output files
            editing_style: Style of editing to apply

        Returns:
            Complete video montage specification
        """
        print("🎬 Video Editor Wizard - Automatic Montage Creation")
        print("=" * 65)

        # Load project data
        project_data = self._load_project_data(project_path)

        if not project_data:
            raise ValueError("No project data found. Please ensure this is a valid StoryCore project.")

        print(f"🎭 Analyzing project: {project_data.get('name', 'Unknown Project')}")
        print(f"🎨 Editing style: {editing_style.value}")

        # Create montage
        montage = VideoMontage(
            montage_id=f"montage_{int(datetime.utcnow().timestamp())}",
            project_id=self._get_project_id(project_path),
            creation_timestamp=datetime.utcnow().isoformat() + "Z",
            total_duration=0.0,
            editing_style=editing_style
        )

        # Load storyboard and shot planning
        storyboard_data = project_data.get('shot_planning', {})
        shots = storyboard_data.get('shot_lists', [])

        if not shots:
            raise ValueError("No shots found. Please run Shot Planning Wizard first.")

        print(f"🎬 Processing {len(shots)} shots for montage...")

        # Load audio production plan if available
        audio_plan = self._load_audio_production_plan(project_path)

        # Create timeline
        timeline = await self._create_timeline_from_shots(shots, audio_plan, editing_style)

        # Convert timeline to montage elements
        montage.video_clips = self._extract_video_clips_from_timeline(timeline)
        montage.audio_tracks = self._extract_audio_tracks_from_timeline(timeline)
        montage.transitions = self._extract_transitions_from_timeline(timeline)

        # Calculate total duration
        montage.total_duration = self._calculate_total_duration(montage)

        # Set export settings
        montage.export_settings = self._generate_export_settings(output_filename, montage)

        # Generate production notes
        montage.production_notes = self._generate_production_notes(montage, project_data)

        # Calculate quality metrics
        montage.quality_metrics = self._calculate_montage_quality_metrics(montage)

        # Store sources
        montage.storyboard_source = str(project_path / "shot_planning.json")
        if audio_plan:
            montage.audio_plan_source = str(project_path / "audio_production_plan.json")

        self.montage = montage
        self._save_montage_plan(project_path, montage)

        print("
✅ Montage created successfully!"        print(f"🎬 Total duration: {montage.total_duration:.1f} seconds")
        print(f"📹 Video clips: {len(montage.video_clips)}")
        print(f"🎵 Audio tracks: {len(montage.audio_tracks)}")
        print(f"🔄 Transitions: {len(montage.transitions)}")
        print(f"📊 Quality score: {montage.quality_metrics.get('overall_quality', 0):.1f}/10")

        return montage

    def _load_project_data(self, project_path: Path) -> Dict[str, Any]:
        """Load all relevant project data for montage creation"""
        project_data = {}

        # Core project files
        files_to_check = [
            'project.json',
            'shot_planning.json',
            'character_definitions.json',
            'scene_breakdown.json'
        ]

        for filename in files_to_check:
            file_path = project_path / filename
            if file_path.exists():
                try:
                    with open(file_path, 'r') as f:
                        project_data[filename.replace('.json', '')] = json.load(f)
                except (json.JSONDecodeError, FileNotFoundError):
                    continue

        return project_data

    def _get_project_id(self, project_path: Path) -> str:
        """Get project ID from project.json"""
        project_file = project_path / "project.json"
        if project_file.exists():
            try:
                with open(project_file, 'r') as f:
                    project_data = json.load(f)
                    return project_data.get('id', 'unknown')
            except:
                pass
        return f"video_montage_{int(datetime.utcnow().timestamp())}"

    def _load_audio_production_plan(self, project_path: Path) -> Optional[Dict[str, Any]]:
        """Load audio production plan if available"""
        audio_plan_file = project_path / "audio_production_plan.json"
        if audio_plan_file.exists():
            try:
                with open(audio_plan_file, 'r') as f:
                    return json.load(f)
            except:
                return None
        return None

    async def _create_timeline_from_shots(self, shots: List[Dict[str, Any]],
                                        audio_plan: Optional[Dict[str, Any]],
                                        editing_style: EditingStyle) -> List[TimelineElement]:
        """Create a timeline from shot sequences and audio plan"""
        timeline: List[TimelineElement] = []
        current_time = 0.0

        for shot in shots:
            shot_id = shot.get('shot_id', 'unknown')
            duration = shot.get('timing', {}).get('duration_seconds', 3.0)

            # Add video clip
            video_element = TimelineElement(
                element_id=f"video_{shot_id}",
                start_time=current_time,
                duration=duration,
                content_type="video"
            )
            video_element.metadata = {
                'shot_id': shot_id,
                'shot_data': shot,
                'transition_in': self._choose_transition_for_shot(shot, 'in', editing_style),
                'transition_out': self._choose_transition_for_shot(shot, 'out', editing_style)
            }
            timeline.append(video_element)

            # Add audio elements if available
            if audio_plan:
                audio_elements = self._get_audio_elements_for_shot(audio_plan, shot_id)
                for audio_elem in audio_elements:
                    audio_element = TimelineElement(
                        element_id=f"audio_{audio_elem['element_id']}",
                        start_time=current_time + audio_elem.get('start_time', 0),
                        duration=audio_elem.get('duration_seconds', duration),
                        content_type="audio"
                    )
                    audio_element.metadata = audio_elem
                    timeline.append(audio_element)

            # Add transition time if not the last shot
            if shot != shots[-1]:
                transition_duration = self._calculate_transition_duration(editing_style, shot, shots[shots.index(shot) + 1])
                if transition_duration > 0:
                    transition_element = TimelineElement(
                        element_id=f"transition_{shot_id}_to_{shots[shots.index(shot) + 1].get('shot_id')}",
                        start_time=current_time + duration - transition_duration / 2,
                        duration=transition_duration,
                        content_type="transition"
                    )
                    transition_element.metadata = {
                        'type': self._choose_transition_type(editing_style, shot, shots[shots.index(shot) + 1]),
                        'from_shot': shot_id,
                        'to_shot': shots[shots.index(shot) + 1].get('shot_id')
                    }
                    timeline.append(transition_element)

            current_time += duration

        return timeline

    def _choose_transition_for_shot(self, shot: Dict[str, Any], direction: str,
                                  editing_style: EditingStyle) -> Optional[TransitionType]:
        """Choose appropriate transition for a shot"""
        shot_purpose = shot.get('purpose', '').lower()
        shot_type = shot.get('shot_type', {}).get('code', 'MS')

        if editing_style == EditingStyle.CINEMATIC:
            if 'opening' in shot_purpose:
                return TransitionType.FADE_IN if direction == 'in' else None
            elif 'closing' in shot_purpose:
                return None if direction == 'in' else TransitionType.FADE_OUT
            elif shot_type in ['CU', 'ECU']:
                return TransitionType.DISSOLVE
            else:
                return TransitionType.CUT

        elif editing_style == EditingStyle.DYNAMIC:
            return TransitionType.ZOOM if shot_type in ['WS', 'ELS'] else TransitionType.CUT

        elif editing_style == EditingStyle.SMOOTH:
            return TransitionType.DISSOLVE

        elif editing_style == EditingStyle.INTENSE:
            return TransitionType.WIPE if 'action' in shot_purpose else TransitionType.CUT

        return TransitionType.CUT

    def _choose_transition_type(self, editing_style: EditingStyle,
                              from_shot: Dict[str, Any], to_shot: Dict[str, Any]) -> TransitionType:
        """Choose transition type between two shots"""
        from_purpose = from_shot.get('purpose', '').lower()
        to_purpose = to_shot.get('purpose', '').lower()

        if editing_style == EditingStyle.CINEMATIC:
            if 'tense' in from_purpose or 'tense' in to_purpose:
                return TransitionType.DISSOLVE
            elif 'dramatic' in from_purpose or 'dramatic' in to_purpose:
                return TransitionType.FADE_OUT  # Quick fade
            else:
                return TransitionType.CUT

        elif editing_style == EditingStyle.DYNAMIC:
            return TransitionType.WIPE

        elif editing_style == EditingStyle.SMOOTH:
            return TransitionType.DISSOLVE

        return TransitionType.CUT

    def _calculate_transition_duration(self, editing_style: EditingStyle,
                                    from_shot: Dict[str, Any], to_shot: Dict[str, Any]) -> float:
        """Calculate transition duration based on editing style"""
        if editing_style == EditingStyle.CINEMATIC:
            return 0.5  # 0.5 seconds for cinematic
        elif editing_style == EditingStyle.DYNAMIC:
            return 0.3  # 0.3 seconds for dynamic
        elif editing_style == EditingStyle.SMOOTH:
            return 1.0  # 1.0 seconds for smooth
        elif editing_style == EditingStyle.INTENSE:
            return 0.2  # 0.2 seconds for intense
        return 0.0  # No transition for minimalist

    def _get_audio_elements_for_shot(self, audio_plan: Dict[str, Any], shot_id: str) -> List[Dict[str, Any]]:
        """Get audio elements for a specific shot from audio plan"""
        audio_plan_data = audio_plan.get('audio_production_plan', {})
        sequences = audio_plan_data.get('audio_sequences', [])

        for sequence in sequences:
            if sequence.get('shot_id') == shot_id:
                return sequence.get('audio_elements', [])

        return []

    def _extract_video_clips_from_timeline(self, timeline: List[TimelineElement]) -> List[VideoClip]:
        """Extract video clips from timeline elements"""
        clips = []

        for element in timeline:
            if element.content_type == "video":
                clip = VideoClip(
                    clip_id=element.element_id,
                    shot_id=element.metadata.get('shot_id', 'unknown'),
                    start_time=element.start_time,
                    duration=element.duration,
                    transition_in=element.metadata.get('transition_in'),
                    transition_out=element.metadata.get('transition_out')
                )
                clips.append(clip)

        return clips

    def _extract_audio_tracks_from_timeline(self, timeline: List[TimelineElement]) -> List[AudioTrack]:
        """Extract audio tracks from timeline elements"""
        tracks = []

        for element in timeline:
            if element.content_type == "audio":
                metadata = element.metadata
                track = AudioTrack(
                    track_id=element.element_id,
                    audio_type=metadata.get('audio_type', 'unknown'),
                    start_time=element.start_time,
                    duration=element.duration,
                    volume_level=metadata.get('volume_level', 1.0),
                    fade_in=metadata.get('fade_in', 0.0),
                    fade_out=metadata.get('fade_out', 0.0)
                )
                tracks.append(track)

        return tracks

    def _extract_transitions_from_timeline(self, timeline: List[TimelineElement]) -> List[Dict[str, Any]]:
        """Extract transitions from timeline elements"""
        transitions = []

        for element in timeline:
            if element.content_type == "transition":
                transition = {
                    'transition_id': element.element_id,
                    'start_time': element.start_time,
                    'duration': element.duration,
                    'type': element.metadata.get('type', TransitionType.CUT).value,
                    'from_shot': element.metadata.get('from_shot'),
                    'to_shot': element.metadata.get('to_shot')
                }
                transitions.append(transition)

        return transitions

    def _calculate_total_duration(self, montage: VideoMontage) -> float:
        """Calculate total duration of the montage"""
        if not montage.video_clips:
            return 0.0

        # Find the last video clip
        last_clip = max(montage.video_clips, key=lambda c: c.start_time + c.duration)
        return last_clip.start_time + last_clip.duration

    def _generate_export_settings(self, output_filename: str, montage: VideoMontage) -> Dict[str, Any]:
        """Generate export settings for the montage"""
        return {
            'output_filename': output_filename,
            'format': 'MP4',
            'codec': 'H.264',
            'resolution': f"{montage.resolution[0]}x{montage.resolution[1]}",
            'frame_rate': montage.frame_rate,
            'audio_codec': 'AAC',
            'audio_channels': 'stereo',
            'audio_sample_rate': 48000,
            'quality': 'high',
            'include_metadata': True,
            'chapters': self._generate_chapter_markers(montage)
        }

    def _generate_chapter_markers(self, montage: VideoMontage) -> List[Dict[str, Any]]:
        """Generate chapter markers for the video"""
        chapters = []

        for clip in montage.video_clips:
            chapter = {
                'start_time': clip.start_time,
                'title': f"Shot {clip.shot_id}",
                'description': f"Shot {clip.shot_id} - {clip.duration:.1f}s"
            }
            chapters.append(chapter)

        return chapters

    def _generate_production_notes(self, montage: VideoMontage, project_data: Dict[str, Any]) -> List[str]:
        """Generate production notes for the montage"""
        notes = []

        notes.append(f"Video Montage Production Notes - {montage.editing_style.value.title()} Style")
        notes.append(f"Total duration: {montage.total_duration:.1f} seconds")
        notes.append(f"Video clips: {len(montage.video_clips)}")
        notes.append(f"Audio tracks: {len(montage.audio_tracks)}")
        notes.append(f"Transitions: {len(montage.transitions)}")

        # Style-specific notes
        if montage.editing_style == EditingStyle.CINEMATIC:
            notes.append("Cinematic style: Smooth transitions, professional pacing")
            notes.append("Recommended for narrative content and storytelling")
        elif montage.editing_style == EditingStyle.DYNAMIC:
            notes.append("Dynamic style: Fast-paced, energetic transitions")
            notes.append("Recommended for action content and high-energy sequences")
        elif montage.editing_style == EditingStyle.SMOOTH:
            notes.append("Smooth style: Gentle dissolves, relaxed pacing")
            notes.append("Recommended for documentary and contemplative content")

        # Technical notes
        notes.append(f"Resolution: {montage.resolution[0]}x{montage.resolution[1]}")
        notes.append(f"Frame rate: {montage.frame_rate} fps")
        notes.append("Audio: Stereo mix with proper level balancing")

        return notes

    def _calculate_montage_quality_metrics(self, montage: VideoMontage) -> Dict[str, float]:
        """Calculate quality metrics for the montage"""
        metrics = {}

        if not montage.video_clips:
            return metrics

        # Rhythm consistency
        clip_durations = [clip.duration for clip in montage.video_clips]
        avg_duration = sum(clip_durations) / len(clip_durations)
        duration_variance = sum((d - avg_duration) ** 2 for d in clip_durations) / len(clip_durations)
        metrics['rhythm_consistency'] = max(0, 10 - (duration_variance * 10))  # Lower variance = higher score

        # Transition coverage
        transition_coverage = len(montage.transitions) / max(1, len(montage.video_clips) - 1)
        metrics['transition_coverage'] = transition_coverage * 10

        # Audio coverage
        audio_coverage = len(montage.audio_tracks) / max(1, len(montage.video_clips) * 2)  # Expect 2 audio tracks per clip
        metrics['audio_coverage'] = min(audio_coverage * 10, 10)

        # Overall quality (weighted average)
        weights = {'rhythm_consistency': 0.4, 'transition_coverage': 0.3, 'audio_coverage': 0.3}
        metrics['overall_quality'] = sum(
            metrics.get(metric, 0) * weight
            for metric, weight in weights.items()
        )

        return metrics

    def _save_montage_plan(self, project_path: Path, montage: VideoMontage) -> None:
        """Save the montage plan to project files"""
        # Save main montage plan
        montage_data = {
            'video_montage': {
                'montage_id': montage.montage_id,
                'project_id': montage.project_id,
                'creation_timestamp': montage.creation_timestamp,
                'total_duration': montage.total_duration,
                'resolution': montage.resolution,
                'frame_rate': montage.frame_rate,
                'editing_style': montage.editing_style.value,
                'video_clips': [
                    {
                        'clip_id': clip.clip_id,
                        'shot_id': clip.shot_id,
                        'start_time': clip.start_time,
                        'duration': clip.duration,
                        'file_path': clip.file_path,
                        'transition_in': clip.transition_in.value if clip.transition_in else None,
                        'transition_out': clip.transition_out.value if clip.transition_out else None,
                        'effects': clip.effects,
                        'audio_sync': clip.audio_sync
                    } for clip in montage.video_clips
                ],
                'audio_tracks': [
                    {
                        'track_id': track.track_id,
                        'audio_type': track.audio_type,
                        'start_time': track.start_time,
                        'duration': track.duration,
                        'volume_level': track.volume_level,
                        'fade_in': track.fade_in,
                        'fade_out': track.fade_out,
                        'file_path': track.file_path
                    } for track in montage.audio_tracks
                ],
                'transitions': montage.transitions,
                'storyboard_source': montage.storyboard_source,
                'audio_plan_source': montage.audio_plan_source,
                'quality_metrics': montage.quality_metrics,
                'export_settings': montage.export_settings,
                'production_notes': montage.production_notes
            }
        }

        montage_file = project_path / "video_montage_plan.json"
        with open(montage_file, 'w') as f:
            json.dump(montage_data, f, indent=2)

        # Update project.json with montage metadata
        project_file = project_path / "project.json"
        if project_file.exists():
            try:
                with open(project_file, 'r') as f:
                    project_data = json.load(f)

                project_data['video_montage'] = {
                    'plan_created': True,
                    'montage_id': montage.montage_id,
                    'creation_timestamp': montage.creation_timestamp,
                    'total_duration': montage.total_duration,
                    'editing_style': montage.editing_style.value,
                    'quality_score': montage.quality_metrics.get('overall_quality', 0)
                }

                with open(project_file, 'w') as f:
                    json.dump(project_data, f, indent=2)

            except Exception as e:
                print(f"Warning: Could not update project.json: {e}")

    def get_montage_preview(self, project_path: Path) -> Dict[str, Any]:
        """
        Get a preview of the montage that would be created

        Args:
            project_path: Path to project directory

        Returns:
            Preview data with montage estimates
        """
        project_data = self._load_project_data(project_path)

        if not project_data:
            return {'error': 'No project data found'}

        storyboard_data = project_data.get('shot_planning', {})
        shots = storyboard_data.get('shot_lists', [])

        if not shots:
            return {'error': 'No shots found - run Shot Planning Wizard first'}

        # Calculate estimates
        total_duration = sum(shot.get('timing', {}).get('duration_seconds', 3.0) for shot in shots)
        audio_plan = self._load_audio_production_plan(project_path)
        estimated_audio_tracks = 0

        if audio_plan:
            sequences = audio_plan.get('audio_production_plan', {}).get('audio_sequences', [])
            estimated_audio_tracks = sum(len(seq.get('audio_elements', [])) for seq in sequences)

        return {
            'project_name': project_data.get('name', 'Unknown Project'),
            'total_shots': len(shots),
            'estimated_duration': round(total_duration, 1),
            'estimated_clips': len(shots),
            'estimated_audio_tracks': estimated_audio_tracks,
            'estimated_transitions': max(0, len(shots) - 1),
            'has_audio_plan': audio_plan is not None,
            'recommended_style': 'cinematic',
            'quality_potential': 'high' if audio_plan else 'medium'
        }


# Convenience functions
def create_video_editor_wizard(video_engine=None) -> VideoEditorWizard:
    """Create a Video Editor wizard instance"""
    return VideoEditorWizard(video_engine)


async def create_montage(project_path: Path, output_filename: str = "final_montage",
                        editing_style: str = "cinematic") -> VideoMontage:
    """
    Convenience function to create a video montage

    Args:
        project_path: Path to project directory
        output_filename: Output filename
        editing_style: Editing style (cinematic, dynamic, smooth, intense, minimalist)

    Returns:
        Complete video montage
    """
    style_map = {
        'cinematic': EditingStyle.CINEMATIC,
        'dynamic': EditingStyle.DYNAMIC,
        'smooth': EditingStyle.SMOOTH,
        'intense': EditingStyle.INTENSE,
        'minimalist': EditingStyle.MINIMALIST,
        'documentary': EditingStyle.DOCUMENTARY
    }

    style = style_map.get(editing_style.lower(), EditingStyle.CINEMATIC)
    wizard = create_video_editor_wizard()
    return await wizard.create_video_montage(project_path, output_filename, style)


def get_montage_preview(project_path: Path) -> Dict[str, Any]:
    """
    Get montage preview for a project

    Args:
        project_path: Path to project directory

    Returns:
        Preview data
    """
    wizard = create_video_editor_wizard()
    return wizard.get_montage_preview(project_path)