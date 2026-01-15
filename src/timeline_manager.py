#!/usr/bin/env python3
"""
StoryCore-Engine Timeline Manager
Manages frame timing, shot sequencing, and synchronization metadata for video assembly.
"""

import logging
import json
import math
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum

logger = logging.getLogger(__name__)


class TransitionType(Enum):
    """Available transition types between shots."""
    CUT = "cut"
    FADE = "fade"
    DISSOLVE = "dissolve"
    WIPE = "wipe"
    SLIDE = "slide"


@dataclass
class FrameTiming:
    """Timing information for a single frame."""
    frame_number: int
    timestamp: float  # Seconds from start
    duration: float   # Frame duration in seconds
    shot_id: str
    sequence_position: int  # Position within shot


@dataclass
class ShotTiming:
    """Timing information for a complete shot."""
    shot_id: str
    start_time: float
    end_time: float
    duration: float
    frame_count: int
    frame_rate: float
    transition_in: Optional[TransitionType] = None
    transition_out: Optional[TransitionType] = None
    transition_duration: float = 0.0


@dataclass
class TimelineMetadata:
    """Complete timeline metadata for synchronization."""
    total_duration: float
    total_frames: int
    frame_rate: float
    shot_timings: List[ShotTiming]
    frame_timings: List[FrameTiming]
    audio_sync_points: List[Dict[str, Any]]
    transition_metadata: Dict[str, Any]


class TimelineManager:
    """
    Manages video timeline construction and synchronization metadata.
    
    Handles:
    - Frame timing calculation for different frame rates
    - Shot duration management and sequencing
    - Transition handling between shots
    - Audio synchronization metadata generation
    """
    
    def __init__(self, frame_rate: float = 24.0):
        """Initialize timeline manager."""
        self.frame_rate = frame_rate
        self.frame_duration = 1.0 / frame_rate
        self.shots: List[ShotTiming] = []
        self.timeline_metadata: Optional[TimelineMetadata] = None
        
        logger.info(f"Timeline Manager initialized at {frame_rate} fps")
    
    def add_shot(
        self, 
        shot_id: str, 
        frame_count: int,
        transition_in: Optional[TransitionType] = None,
        transition_out: Optional[TransitionType] = None,
        transition_duration: float = 0.5
    ) -> ShotTiming:
        """
        Add a shot to the timeline.
        
        Args:
            shot_id: Unique identifier for the shot
            frame_count: Number of frames in the shot
            transition_in: Transition type at shot start
            transition_out: Transition type at shot end
            transition_duration: Duration of transitions in seconds
            
        Returns:
            ShotTiming: Created shot timing information
        """
        # Calculate start time based on existing shots
        start_time = 0.0
        if self.shots:
            last_shot = self.shots[-1]
            start_time = last_shot.end_time
        
        # Calculate shot duration
        shot_duration = frame_count * self.frame_duration
        end_time = start_time + shot_duration
        
        # Create shot timing
        shot_timing = ShotTiming(
            shot_id=shot_id,
            start_time=start_time,
            end_time=end_time,
            duration=shot_duration,
            frame_count=frame_count,
            frame_rate=self.frame_rate,
            transition_in=transition_in,
            transition_out=transition_out,
            transition_duration=transition_duration
        )
        
        self.shots.append(shot_timing)
        logger.info(f"Added shot {shot_id}: {frame_count} frames, {shot_duration:.2f}s")
        
        return shot_timing
    
    def calculate_frame_timings(self) -> List[FrameTiming]:
        """
        Calculate precise timing for every frame in the timeline.
        
        Returns:
            List[FrameTiming]: Frame timing information for all frames
        """
        frame_timings = []
        
        for shot in self.shots:
            for frame_idx in range(shot.frame_count):
                frame_number = len(frame_timings)
                timestamp = shot.start_time + (frame_idx * self.frame_duration)
                
                frame_timing = FrameTiming(
                    frame_number=frame_number,
                    timestamp=timestamp,
                    duration=self.frame_duration,
                    shot_id=shot.shot_id,
                    sequence_position=frame_idx
                )
                
                frame_timings.append(frame_timing)
        
        return frame_timings
    
    def generate_timeline_metadata(self) -> TimelineMetadata:
        """
        Generate complete timeline metadata for synchronization.
        
        Returns:
            TimelineMetadata: Complete timeline information
        """
        frame_timings = self.calculate_frame_timings()
        
        # Calculate total duration and frame count
        total_frames = len(frame_timings)
        total_duration = total_frames * self.frame_duration if total_frames > 0 else 0.0
        
        # Generate audio sync points (at shot boundaries and regular intervals)
        audio_sync_points = self._generate_audio_sync_points()
        
        # Generate transition metadata
        transition_metadata = self._generate_transition_metadata()
        
        self.timeline_metadata = TimelineMetadata(
            total_duration=total_duration,
            total_frames=total_frames,
            frame_rate=self.frame_rate,
            shot_timings=self.shots.copy(),
            frame_timings=frame_timings,
            audio_sync_points=audio_sync_points,
            transition_metadata=transition_metadata
        )
        
        logger.info(f"Generated timeline metadata: {total_frames} frames, {total_duration:.2f}s")
        return self.timeline_metadata
    
    def get_shot_at_time(self, timestamp: float) -> Optional[ShotTiming]:
        """
        Get the shot that contains the given timestamp.
        
        Args:
            timestamp: Time in seconds
            
        Returns:
            ShotTiming or None if no shot found
        """
        for shot in self.shots:
            if shot.start_time <= timestamp < shot.end_time:
                return shot
        return None
    
    def get_frame_at_time(self, timestamp: float) -> Optional[FrameTiming]:
        """
        Get the frame that contains the given timestamp.
        
        Args:
            timestamp: Time in seconds
            
        Returns:
            FrameTiming or None if no frame found
        """
        if not self.timeline_metadata:
            self.generate_timeline_metadata()
        
        for frame_timing in self.timeline_metadata.frame_timings:
            if frame_timing.timestamp <= timestamp < (frame_timing.timestamp + frame_timing.duration):
                return frame_timing
        return None
    
    def calculate_transition_frames(
        self, 
        shot1: ShotTiming, 
        shot2: ShotTiming, 
        transition_type: TransitionType,
        transition_duration: float
    ) -> Dict[str, Any]:
        """
        Calculate frame requirements for transitions between shots.
        
        Args:
            shot1: First shot
            shot2: Second shot
            transition_type: Type of transition
            transition_duration: Duration in seconds
            
        Returns:
            Dict with transition frame information
        """
        transition_frames = int(transition_duration * self.frame_rate)
        overlap_frames = min(transition_frames // 2, shot1.frame_count, shot2.frame_count)
        
        return {
            "transition_type": transition_type.value,
            "duration": transition_duration,
            "total_frames": transition_frames,
            "overlap_frames": overlap_frames,
            "shot1_overlap_start": shot1.frame_count - overlap_frames,
            "shot2_overlap_end": overlap_frames,
            "blend_curve": self._generate_blend_curve(transition_frames, transition_type)
        }
    
    def export_timeline_metadata(self, output_path: str) -> bool:
        """
        Export timeline metadata to JSON file.
        
        Args:
            output_path: Path to save metadata
            
        Returns:
            bool: True if exported successfully
        """
        try:
            if not self.timeline_metadata:
                self.generate_timeline_metadata()
            
            # Convert to serializable format
            metadata_dict = {
                "total_duration": self.timeline_metadata.total_duration,
                "total_frames": self.timeline_metadata.total_frames,
                "frame_rate": self.timeline_metadata.frame_rate,
                "shot_timings": [asdict(shot) for shot in self.timeline_metadata.shot_timings],
                "frame_timings": [asdict(frame) for frame in self.timeline_metadata.frame_timings],
                "audio_sync_points": self.timeline_metadata.audio_sync_points,
                "transition_metadata": self.timeline_metadata.transition_metadata
            }
            
            # Convert enums to strings
            metadata_dict = self._serialize_enums(metadata_dict)
            
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_file, 'w') as f:
                json.dump(metadata_dict, f, indent=2)
            
            logger.info(f"Timeline metadata exported to: {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to export timeline metadata: {e}")
            return False
    
    def _generate_audio_sync_points(self) -> List[Dict[str, Any]]:
        """Generate audio synchronization points."""
        sync_points = []
        
        # Add sync points at shot boundaries
        for shot in self.shots:
            sync_points.append({
                "timestamp": shot.start_time,
                "type": "shot_start",
                "shot_id": shot.shot_id,
                "frame_number": int(shot.start_time * self.frame_rate)
            })
            
            sync_points.append({
                "timestamp": shot.end_time,
                "type": "shot_end", 
                "shot_id": shot.shot_id,
                "frame_number": int(shot.end_time * self.frame_rate)
            })
        
        # Add regular sync points every 5 seconds
        if self.shots:
            total_duration = self.shots[-1].end_time
            sync_interval = 5.0  # seconds
            
            current_time = sync_interval
            while current_time < total_duration:
                shot = self.get_shot_at_time(current_time)
                sync_points.append({
                    "timestamp": current_time,
                    "type": "regular_sync",
                    "shot_id": shot.shot_id if shot else None,
                    "frame_number": int(current_time * self.frame_rate)
                })
                current_time += sync_interval
        
        return sorted(sync_points, key=lambda x: x["timestamp"])
    
    def _generate_transition_metadata(self) -> Dict[str, Any]:
        """Generate metadata for all transitions."""
        transitions = {}
        
        for i in range(len(self.shots) - 1):
            shot1 = self.shots[i]
            shot2 = self.shots[i + 1]
            
            if shot1.transition_out or shot2.transition_in:
                transition_type = shot1.transition_out or shot2.transition_in or TransitionType.CUT
                transition_duration = shot1.transition_duration or shot2.transition_duration or 0.0
                
                transition_id = f"{shot1.shot_id}_to_{shot2.shot_id}"
                transitions[transition_id] = self.calculate_transition_frames(
                    shot1, shot2, transition_type, transition_duration
                )
        
        return transitions
    
    def _generate_blend_curve(self, frames: int, transition_type: TransitionType) -> List[float]:
        """Generate blend curve for transitions."""
        if frames <= 0:
            return []
        
        curve = []
        for i in range(frames):
            t = i / (frames - 1) if frames > 1 else 0.0
            
            if transition_type == TransitionType.FADE:
                # S-curve for smooth fade
                blend = 0.5 * (1 + math.sin(math.pi * (t - 0.5)))
            elif transition_type == TransitionType.DISSOLVE:
                # Linear blend
                blend = t
            elif transition_type == TransitionType.WIPE:
                # Step function with easing
                blend = t * t * (3 - 2 * t)  # Smoothstep
            else:  # CUT or default
                blend = 1.0 if t >= 0.5 else 0.0
            
            curve.append(blend)
        
        return curve
    
    def _serialize_enums(self, data: Any) -> Any:
        """Convert enum values to strings for JSON serialization."""
        if isinstance(data, dict):
            return {key: self._serialize_enums(value) for key, value in data.items()}
        elif isinstance(data, list):
            return [self._serialize_enums(item) for item in data]
        elif hasattr(data, 'value'):  # Enum
            return data.value
        else:
            return data


def main():
    """Test timeline manager functionality."""
    # Initialize timeline manager
    timeline = TimelineManager(frame_rate=24.0)
    
    # Add test shots
    shot1 = timeline.add_shot("shot_001", 48, transition_out=TransitionType.FADE)  # 2 seconds
    shot2 = timeline.add_shot("shot_002", 72, transition_in=TransitionType.FADE, transition_out=TransitionType.DISSOLVE)  # 3 seconds
    shot3 = timeline.add_shot("shot_003", 120, transition_in=TransitionType.DISSOLVE)  # 5 seconds
    
    # Generate timeline metadata
    metadata = timeline.generate_timeline_metadata()
    
    print(f"✓ Timeline created successfully")
    print(f"  Total duration: {metadata.total_duration:.2f} seconds")
    print(f"  Total frames: {metadata.total_frames}")
    print(f"  Shots: {len(metadata.shot_timings)}")
    print(f"  Audio sync points: {len(metadata.audio_sync_points)}")
    print(f"  Transitions: {len(metadata.transition_metadata)}")
    
    # Test time-based queries
    test_time = 3.5  # 3.5 seconds
    shot_at_time = timeline.get_shot_at_time(test_time)
    frame_at_time = timeline.get_frame_at_time(test_time)
    
    if shot_at_time:
        print(f"  Shot at {test_time}s: {shot_at_time.shot_id}")
    if frame_at_time:
        print(f"  Frame at {test_time}s: #{frame_at_time.frame_number}")
    
    # Export metadata
    success = timeline.export_timeline_metadata("timeline_test.json")
    if success:
        print(f"  Metadata exported to: timeline_test.json")


if __name__ == "__main__":
    main()