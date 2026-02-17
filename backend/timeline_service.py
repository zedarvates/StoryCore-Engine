from enum import Enum
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

class ClipType(Enum):
    VIDEO = "video"
    AUDIO = "audio"
    IMAGE = "image"
    TEXT = "text"
    TRANSITION = "transition"
    EFFECT = "effect"

class TransitionType(Enum):
    CUT = "cut"
    DISSOLVE = "dissolve"
    FADE_BLACK = "fade_black"
    FADE_WHITE = "fade_white"
    WIPE_LEFT = "wipe_left"
    WIPE_RIGHT = "wipe_right"
    ZOOM_IN = "zoom_in"
    ZOOM_OUT = "zoom_out"
    SLIDE_LEFT = "slide_left"
    SLIDE_RIGHT = "slide_right"

@dataclass
class TimelineClip:
    id: str
    type: ClipType
    track_id: str
    start_time: float
    end_time: float
    name: str = "Untitled"
    source_start: float = 0.0
    source_end: float = 0.0
    file_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    transitions: Dict[str, str] = field(default_factory=dict)
    effects: List[str] = field(default_factory=list)
    locked: bool = False
    visible: bool = True

@dataclass
class TimelineTrack:
    id: str
    name: str
    type: ClipType
    clips: List[TimelineClip] = field(default_factory=list)
    muted: bool = False
    locked: bool = False
    height: int = 60

@dataclass
class Timeline:
    id: str
    name: str
    tracks: List[TimelineTrack] = field(default_factory=list)
    duration: float = 0.0
    frame_rate: float = 30.0
    resolution_width: int = 1920
    resolution_height: int = 1080
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

class TimelineService:
    """Service de gestion de timeline vidéo"""
    
    def __init__(self, ffmpeg_service=None):
        self.ffmpeg = ffmpeg_service
        self.timelines: Dict[str, Timeline] = {}
    
    def create_timeline(self, name: str, **kwargs) -> Timeline:
        """Créer un nouveau timeline"""
        timeline = Timeline(
            id=str(uuid.uuid4()),
            name=name,
            **kwargs
        )
        self.timelines[timeline.id] = timeline
        return timeline
    
    def add_track(self, timeline_id: str, name: str, track_type: ClipType) -> TimelineTrack:
        """Ajouter une piste au timeline"""
        track = TimelineTrack(
            id=str(uuid.uuid4()),
            name=name,
            type=track_type
        )
        self.timelines[timeline_id].tracks.append(track)
        return track
    
    def add_clip(self, timeline_id: str, track_id: str, clip_data: dict) -> TimelineClip:
        """Ajouter un clip sur une piste"""
        clip = TimelineClip(**clip_data)
        timeline = self.timelines[timeline_id]
        for track in timeline.tracks:
            if track.id == track_id:
                track.clips.append(clip)
                break
        return clip
    
    def move_clip(self, timeline_id: str, clip_id: str, new_start: float, new_track_id: Optional[str] = None) -> bool:
        """Déplacer un clip dans le temps et/ou entre pistes (Simple Move)"""
        timeline = self.timelines[timeline_id]
        clip = None
        old_track = None
        
        for track in timeline.tracks:
            for c in track.clips:
                if c.id == clip_id:
                    clip = c
                    old_track = track
                    break
            if clip:
                break
        
        if not clip:
            return False
        
        duration = clip.end_time - clip.start_time
        
        # Simple move without ripple
        clip.start_time = new_start
        clip.end_time = new_start + duration
        
        if new_track_id and new_track_id != old_track.id:
            old_track.clips = [c for c in old_track.clips if c.id != clip_id]
            for track in timeline.tracks:
                if track.id == new_track_id:
                    clip.track_id = new_track_id
                    track.clips.append(clip)
                    break
        
        self.get_timeline_duration(timeline_id) # Update global duration
        timeline.updated_at = datetime.now()
        return True

    def ripple_move_clip(self, timeline_id: str, clip_id: str, new_start: float) -> bool:
        """
        Déplacer un clip avec effet 'Ripple' : 
        Décale tous les clips suivants sur la même piste.
        """
        timeline = self.timelines[timeline_id]
        clip = None
        active_track = None
        
        for track in timeline.tracks:
            for c in track.clips:
                if c.id == clip_id:
                    clip = c
                    active_track = track
                    break
            if clip: break
            
        if not clip: return False
        
        delta = new_start - clip.start_time
        
        # Décaler le clip cible et TOUS les clips qui commencent après lui
        for c in active_track.clips:
            if c.start_time >= clip.start_time:
                c.start_time += delta
                c.end_time += delta
                
        self.get_timeline_duration(timeline_id)
        timeline.updated_at = datetime.now()
        return True

    def get_track_gaps(self, timeline_id: str, track_id: str) -> List[Dict[str, float]]:
        """Identifie les 'trous' (silences/vides) sur une piste spécifique."""
        timeline = self.timelines[timeline_id]
        track = next((t for t in timeline.tracks if t.id == track_id), None)
        if not track or not track.clips:
            return []
            
        sorted_clips = sorted(track.clips, key=lambda x: x.start_time)
        gaps = []
        
        # Gap at the beginning?
        if sorted_clips[0].start_time > 0:
            gaps.append({"start": 0.0, "end": sorted_clips[0].start_time, "duration": sorted_clips[0].start_time})
            
        for i in range(len(sorted_clips) - 1):
            current_end = sorted_clips[i].end_time
            next_start = sorted_clips[i+1].start_time
            if next_start > current_end:
                gaps.append({"start": current_end, "end": next_start, "duration": next_start - current_end})
                
        return gaps

    def auto_assemble_sequence(self, timeline_id: str, shots: List[Dict[str, Any]]) -> bool:
        """
        Assemble automatiquement une séquence de plans sur une nouvelle piste 'Master Video'.
        shots: List[{"id": "...", "duration": 5.0, "file_path": "..."}]
        """
        timeline = self.timelines.get(timeline_id)
        if not timeline: return False
        
        track_name = f"Sequence Auto-Assemble {datetime.now().strftime('%H:%M')}"
        video_track = self.add_track(timeline_id, track_name, ClipType.VIDEO)
        
        current_time = 0.0
        for shot in shots:
            duration = shot.get("duration", 5.0)
            clip_id = str(uuid.uuid4())
            self.add_clip(timeline_id, video_track.id, {
                "id": clip_id,
                "type": ClipType.VIDEO,
                "track_id": video_track.id,
                "start_time": current_time,
                "end_time": current_time + duration,
                "name": shot.get("title", f"Shot {shot['id']}"),
                "file_path": shot.get("file_path"),
                "source_end": duration
            })
            current_time += duration
            
        self.get_timeline_duration(timeline_id)
        return True
    
    def fill_track_gaps(self, timeline_id: str, track_id: str, media_info: Dict[str, Any]) -> List[str]:
        """
        Remplit les trous d'une piste avec un clip spécifique (ex: ambiance, room tone).
        media_info: {"name": "Ambiance", "file_path": "...", "type": "audio"}
        Returns: Liste des IDs des clips créés.
        """
        gaps = self.get_track_gaps(timeline_id, track_id)
        if not gaps:
            return []
            
        new_clip_ids = []
        for gap in gaps:
            # On ignore les trous trop courts (moins de 0.1s)
            if gap["duration"] < 0.1:
                continue
                
            clip_id = str(uuid.uuid4())
            self.add_clip(timeline_id, track_id, {
                "id": clip_id,
                "type": ClipType(media_info.get("type", "audio")),
                "track_id": track_id,
                "start_time": gap["start"],
                "end_time": gap["end"],
                "name": media_info.get("name", "Gap Filler (Ambiance)"),
                "file_path": media_info.get("file_path"),
                "source_end": gap["duration"]
            })
            new_clip_ids.append(clip_id)
            
        self.get_timeline_duration(timeline_id)
        return new_clip_ids
    
    def split_clip(self, timeline_id: str, clip_id: str, split_time: float) -> tuple:
        """Scinder un clip à un moment donné"""
        timeline = self.timelines[timeline_id]
        
        for track in timeline.tracks:
            for clip in track.clips:
                if clip.id == clip_id:
                    if split_time <= clip.start_time or split_time >= clip.end_time:
                        return None, None
                    
                    clip_a = TimelineClip(
                        id=str(uuid.uuid4()),
                        type=clip.type,
                        track_id=clip.track_id,
                        start_time=clip.start_time,
                        end_time=split_time,
                        source_start=clip.source_start,
                        source_end=clip.source_start + (split_time - clip.start_time),
                        file_path=clip.file_path,
                        thumbnail_path=clip.thumbnail_path,
                        metadata=clip.metadata.copy(),
                        transitions=clip.transitions.copy(),
                        effects=clip.effects.copy(),
                        locked=clip.locked,
                        visible=clip.visible
                    )
                    
                    clip_b = TimelineClip(
                        id=str(uuid.uuid4()),
                        type=clip.type,
                        track_id=clip.track_id,
                        start_time=split_time,
                        end_time=clip.end_time,
                        source_start=clip.source_start + (split_time - clip.start_time),
                        source_end=clip.source_end,
                        file_path=clip.file_path,
                        thumbnail_path=clip.thumbnail_path,
                        metadata=clip.metadata.copy(),
                        transitions=clip.transitions.copy(),
                        effects=clip.effects.copy(),
                        locked=clip.locked,
                        visible=clip.visible
                    )
                    
                    idx = track.clips.index(clip)
                    track.clips[idx] = clip_a
                    track.clips.insert(idx + 1, clip_b)
                    
                    timeline.updated_at = datetime.now()
                    return clip_a, clip_b
        
        return None, None
    
    def add_transition(self, timeline_id: str, clip_id: str, transition_type: TransitionType, position: str = "out") -> bool:
        """Ajouter une transition à un clip"""
        timeline = self.timelines[timeline_id]
        
        for track in timeline.tracks:
            for clip in track.clips:
                if clip.id == clip_id:
                    if position not in ["in", "out"]:
                        return False
                    clip.transitions[position] = transition_type.value
                    timeline.updated_at = datetime.now()
                    return True
        
        return False
    
    def remove_transition(self, timeline_id: str, clip_id: str, position: str) -> bool:
        """Retirer une transition"""
        timeline = self.timelines[timeline_id]
        
        for track in timeline.tracks:
            for clip in track.clips:
                if clip.id == clip_id:
                    if position in clip.transitions:
                        del clip.transitions[position]
                        timeline.updated_at = datetime.now()
                        return True
        
        return False
    
    def add_effect(self, timeline_id: str, clip_id: str, effect_name: str) -> bool:
        """Ajouter un effet à un clip"""
        timeline = self.timelines[timeline_id]
        
        for track in timeline.tracks:
            for clip in track.clips:
                if clip.id == clip_id:
                    if effect_name not in clip.effects:
                        clip.effects.append(effect_name)
                        timeline.updated_at = datetime.now()
                    return True
        
        return False
    
    def remove_effect(self, timeline_id: str, clip_id: str, effect_name: str) -> bool:
        """Retirer un effet d'un clip"""
        timeline = self.timelines[timeline_id]
        
        for track in timeline.tracks:
            for clip in track.clips:
                if clip.id == clip_id:
                    if effect_name in clip.effects:
                        clip.effects.remove(effect_name)
                        timeline.updated_at = datetime.now()
                    return True
        
        return False
    
    def render_preview(self, timeline_id: str, start_time: float = 0, end_time: Optional[float] = None) -> str:
        """Générer un aperçu du timeline"""
        timeline = self.timelines[timeline_id]
        
        if end_time is None:
            end_time = timeline.duration
        
        if self.ffmpeg:
            return self.ffmpeg.generate_preview(timeline_id, start_time, end_time)
        
        return ""
    
    def export_timeline(self, timeline_id: str, output_path: str, format: str = "mp4", **kwargs) -> str:
        """Exporter le timeline complet"""
        timeline = self.timelines[timeline_id]
        
        if self.ffmpeg:
            return self.ffmpeg.export_timeline(timeline, output_path, format, **kwargs)
        
        return ""
    
    def get_timeline_duration(self, timeline_id: str) -> float:
        """Calculer la durée totale du timeline"""
        timeline = self.timelines[timeline_id]
        
        if not timeline.tracks:
            return 0.0
        
        max_duration = 0.0
        for track in timeline.tracks:
            for clip in track.clips:
                if clip.end_time > max_duration:
                    max_duration = clip.end_time
        
        timeline.duration = max_duration
        return max_duration
    
    def delete_clip(self, timeline_id: str, clip_id: str) -> bool:
        """Supprimer un clip du timeline"""
        timeline = self.timelines[timeline_id]
        
        for track in timeline.tracks:
            for i, clip in enumerate(track.clips):
                if clip.id == clip_id:
                    track.clips.pop(i)
                    timeline.updated_at = datetime.now()
                    return True
        
        return False
    
    def delete_track(self, timeline_id: str, track_id: str) -> bool:
        """Supprimer une piste du timeline"""
        timeline = self.timelines[timeline_id]
        
        for i, track in enumerate(timeline.tracks):
            if track.id == track_id:
                timeline.tracks.pop(i)
                timeline.updated_at = datetime.now()
                return True
        
        return False
    
    def get_timeline(self, timeline_id: str) -> Optional[Timeline]:
        """Récupérer un timeline par son ID"""
        return self.timelines.get(timeline_id)
    
    def duplicate_timeline(self, timeline_id: str, new_name: str) -> Optional[Timeline]:
        """Dupliquer un timeline existant"""
        original = self.timelines.get(timeline_id)
        if not original:
            return None
        
        new_timeline = Timeline(
            id=str(uuid.uuid4()),
            name=new_name,
            tracks=[],
            duration=original.duration,
            frame_rate=original.frame_rate,
            resolution_width=original.resolution_width,
            resolution_height=original.resolution_height
        )
        
        for track in original.tracks:
            new_track = TimelineTrack(
                id=str(uuid.uuid4()),
                name=track.name,
                type=track.type,
                muted=track.muted,
                locked=track.locked,
                height=track.height
            )
            for clip in track.clips:
                new_clip = TimelineClip(
                    id=str(uuid.uuid4()),
                    type=clip.type,
                    track_id=new_track.id,
                    start_time=clip.start_time,
                    end_time=clip.end_time,
                    source_start=clip.source_start,
                    source_end=clip.source_end,
                    file_path=clip.file_path,
                    thumbnail_path=clip.thumbnail_path,
                    metadata=clip.metadata.copy(),
                    transitions=clip.transitions.copy(),
                    effects=clip.effects.copy(),
                    locked=clip.locked,
                    visible=clip.visible
                )
                new_track.clips.append(new_clip)
            new_timeline.tracks.append(new_track)
        
        self.timelines[new_timeline.id] = new_timeline
        return new_timeline
    
    def export_to_dict(self, timeline_id: str) -> dict:
        """Exporter un timeline vers un dictionnaire"""
        timeline = self.timelines.get(timeline_id)
        if not timeline:
            return {}
        
        return {
            "id": timeline.id,
            "name": timeline.name,
            "duration": timeline.duration,
            "frame_rate": timeline.frame_rate,
            "resolution_width": timeline.resolution_width,
            "resolution_height": timeline.resolution_height,
            "created_at": timeline.created_at.isoformat(),
            "updated_at": timeline.updated_at.isoformat(),
            "tracks": [
                {
                    "id": track.id,
                    "name": track.name,
                    "type": track.type.value,
                    "clips": [
                        {
                            "id": clip.id,
                            "type": clip.type.value,
                            "track_id": clip.track_id,
                            "start_time": clip.start_time,
                            "end_time": clip.end_time,
                            "source_start": clip.source_start,
                            "source_end": clip.source_end,
                            "file_path": clip.file_path,
                            "thumbnail_path": clip.thumbnail_path,
                            "metadata": clip.metadata,
                            "transitions": clip.transitions,
                            "effects": clip.effects,
                            "locked": clip.locked,
                            "visible": clip.visible
                        }
                        for clip in track.clips
                    ],
                    "muted": track.muted,
                    "locked": track.locked,
                    "height": track.height
                }
                for track in timeline.tracks
            ]
        }
