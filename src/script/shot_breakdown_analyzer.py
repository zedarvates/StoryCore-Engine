"""
Shot Breakdown Analyzer

Converts script scenes into detailed shot breakdowns.

Author: StoryCore-Engine Team
Version: 1.0.0
"""

import re
from typing import Any, Dict, List, Optional

from .shot_breakdown_types import (
    ShotType, CameraMovement, CameraAngle, ShotDuration,
    ShotContent, Shot, SceneShotBreakdown,
    ShotBreakdownAnalysis, ShotListExport
)


class ShotBreakdownAnalyzer:
    """Analyzes script scenes and generates shot breakdowns."""
    
    SHOT_TYPE_KEYWORDS = {
        ShotType.EXTREME_WIDE_SHOT: ['landscape', 'cityscape', 'aerial', 'overview'],
        ShotType.WIDE_SHOT: ['entering', 'building', 'wide view'],
        ShotType.FULL_SHOT: ['full body', 'standing', 'entire body'],
        ShotType.MEDIUM_SHOT: ['talking', 'speaking', 'conversation'],
        ShotType.MEDIUM_CLOSE_UP: ['looking', 'reaction', 'expression'],
        ShotType.CLOSE_UP: ['eyes', 'face', 'staring', 'smiling'],
        ShotType.EXTREME_CLOSE_UP: ['detail', 'pupil', 'lip', 'trembling'],
        ShotType.OVER_SHOULDER: ['behind', 'over shoulder', 'facing'],
        ShotType.POINT_OF_VIEW: ['from above', 'through', 'perspective'],
        ShotType.INSERT: ['close up of', 'detail shot', 'object'],
        ShotType.ESTABLISHING: ['ext.', 'int.', 'exterior', 'location'],
        ShotType.TWO_SHOT: ['together', 'both', 'side by side'],
        ShotType.GROUP_SHOT: ['crowd', 'group', 'meeting', 'everyone'],
    }
    
    MOVEMENT_KEYWORDS = {
        CameraMovement.PAN_LEFT: ['pan left', 'sweep left'],
        CameraMovement.PAN_RIGHT: ['pan right', 'sweep right'],
        CameraMovement.TILT_UP: ['tilt up', 'looking up'],
        CameraMovement.TILT_DOWN: ['tilt down', 'looking down'],
        CameraMovement.DOLLY_IN: ['dolly in', 'moving in', 'approaching'],
        CameraMovement.DOLLY_OUT: ['dolly out', 'pulling back'],
        CameraMovement.TRACKING: ['tracking', 'following', 'chasing'],
        CameraMovement.ZOOM_IN: ['zoom in', 'focus on'],
        CameraMovement.ZOOM_OUT: ['zoom out', 'pull back'],
        CameraMovement.HANDHELD: ['shaky', 'handheld'],
    }
    
    ANGLE_KEYWORDS = {
        CameraAngle.LOW_ANGLE: ['low angle', 'looking up', 'towering'],
        CameraAngle.HIGH_ANGLE: ['high angle', 'looking down'],
        CameraAngle.DUTCH_ANGLE: ['tilted', 'dutch angle'],
    }
    
    DIALOGUE_KEYWORDS = ['dialogue', 'speaking', 'talking', 'says', 'said']
    ACTION_KEYWORDS = ['running', 'fighting', 'chasing', 'driving', 'jumping']
    
    def __init__(self):
        pass
    
    def analyze_script(self, script_text: str, title: str = "Untitled Script") -> ShotBreakdownAnalysis:
        """Analyze a script and generate shot breakdown."""
        analysis = ShotBreakdownAnalysis()
        analysis.script_title = title
        
        scenes = self._parse_scenes(script_text)
        analysis.total_scenes = len(scenes)
        
        shot_number = 1
        
        for scene in scenes:
            breakdown = self._breakdown_scene(scene, shot_number)
            analysis.scene_breakdowns.append(breakdown)
            shot_number += len(breakdown.shots)
        
        analysis.total_shots = shot_number - 1
        analysis.total_duration = sum(
            sum(s.estimated_duration for s in sb.shots)
            for sb in analysis.scene_breakdowns
        )
        analysis.avg_shots_per_scene = analysis.total_shots / max(1, analysis.total_scenes)
        analysis.avg_shot_duration = analysis.total_duration / max(1, analysis.total_shots)
        
        for sb in analysis.scene_breakdowns:
            for shot in sb.shots:
                shot_type = shot.shot_type.value
                analysis.shot_type_counts[shot_type] = analysis.shot_type_counts.get(shot_type, 0) + 1
        
        return analysis
    
    def _parse_scenes(self, script_text: str) -> List[Dict[str, Any]]:
        """Parse script into scenes."""
        scenes = []
        lines = script_text.split('\n')
        
        current_scene = {
            'heading': 'Introduction',
            'content': [],
            'scene_number': 1
        }
        
        scene_pattern = re.compile(
            r'^(?:INT\.|EXT\.|I\/E\.)\s*(.+?)(?:\s+-\s+(.+))?$',
            re.IGNORECASE
        )
        
        for line in lines:
            line = line.strip()
            scene_match = scene_pattern.match(line)
            
            if scene_match:
                if current_scene['content']:
                    scenes.append(current_scene)
                
                location = scene_match.group(1) or ""
                time_of_day = scene_match.group(2) or ""
                
                current_scene = {
                    'heading': f"{line}",
                    'location': location,
                    'time': time_of_day,
                    'content': [],
                    'scene_number': len(scenes) + 1
                }
            else:
                current_scene['content'].append(line)
        
        if current_scene['content']:
            scenes.append(current_scene)
        
        return scenes
    
    def _breakdown_scene(
        self,
        scene: Dict[str, Any],
        start_shot_number: int
    ) -> SceneShotBreakdown:
        """Generate shot breakdown for a scene."""
        breakdown = SceneShotBreakdown()
        breakdown.scene_number = scene['scene_number']
        breakdown.scene_heading = scene['heading']
        
        content_text = ' '.join(scene['content'])
        content_lower = content_text.lower()
        
        is_dialogue_heavy = any(kw in content_lower for kw in self.DIALOGUE_KEYWORDS)
        is_action_heavy = any(kw in content_lower for kw in self.ACTION_KEYWORDS)
        
        shots = []
        
        opening_shot = self._suggest_opening_shot(scene, start_shot_number)
        if opening_shot:
            shots.append(opening_shot)
        
        main_shots = self._generate_main_shots(
            scene, start_shot_number + len(shots),
            is_dialogue_heavy, is_action_heavy
        )
        shots.extend(main_shots)
        
        breakdown.shots = shots
        breakdown.shot_count = len(shots)
        breakdown.total_duration = sum(s.estimated_duration for s in shots)
        
        return breakdown
    
    def _suggest_opening_shot(
        self,
        scene: Dict[str, Any],
        shot_number: int
    ) -> Optional[Shot]:
        """Suggest opening shot for a scene."""
        heading = scene.get('heading', '').lower()
        
        shot = Shot(
            shot_number=shot_number,
            scene_number=scene['scene_number'],
            shot_type=ShotType.ESTABLISHING,
            description=f"Opening shot for {heading}"
        )
        
        if 'ext' in heading or 'i/e' in heading:
            shot.shot_type = ShotType.EXTREME_WIDE_SHOT
            shot.description = "Wide establishing exterior shot"
        else:
            shot.shot_type = ShotType.MEDIUM_WIDE_SHOT
            shot.description = "Interior establishing shot"
        
        shot.estimated_duration = 5.0
        shot.reasoning.append("Opening shot establishes scene location")
        
        return shot
    
    def _generate_main_shots(
        self,
        scene: Dict[str, Any],
        start_shot_number: int,
        is_dialogue_heavy: bool,
        is_action_heavy: bool
    ) -> List[Shot]:
        """Generate main shots for scene content."""
        shots = []
        content = ' '.join(scene.get('content', []))
        content_lower = content.lower()
        
        paragraphs = [p.strip() for p in content.split('\n\n') if p.strip()]
        
        shot_number = start_shot_number
        
        for paragraph in paragraphs:
            if len(paragraph) < 10:
                continue
            
            shot_type = self._determine_shot_type(paragraph, is_dialogue_heavy, is_action_heavy)
            movement = self._determine_camera_movement(paragraph)
            angle = self._determine_camera_angle(paragraph)
            duration = self._estimate_duration(shot_type, paragraph, is_action_heavy)
            content_obj = self._parse_content(paragraph)
            
            shot = Shot(
                shot_number=shot_number,
                scene_number=scene['scene_number'],
                shot_type=shot_type,
                camera_movement=movement,
                camera_angle=angle,
                content=content_obj,
                estimated_duration=duration,
                duration_category=self._get_duration_category(duration),
                description=self._generate_shot_description(shot_type, content_obj),
                confidence=self._calculate_confidence(shot_type, paragraph),
                reasoning=self._generate_reasoning(shot_type, movement, content_obj)
            )
            
            shots.append(shot)
            shot_number += 1
        
        return shots
    
    def _determine_shot_type(
        self,
        content: str,
        is_dialogue_heavy: bool,
        is_action_heavy: bool
    ) -> ShotType:
        """Determine best shot type for content."""
        content_lower = content.lower()
        
        for st, keywords in self.SHOT_TYPE_KEYWORDS.items():
            for keyword in keywords:
                if keyword in content_lower:
                    return st
        
        if is_action_heavy:
            return ShotType.WIDE_SHOT
        elif is_dialogue_heavy:
            return ShotType.MEDIUM_SHOT
        else:
            return ShotType.MEDIUM_CLOSE_UP
    
    def _determine_camera_movement(self, content: str) -> CameraMovement:
        """Determine camera movement from content."""
        content_lower = content.lower()
        
        for mv, keywords in self.MOVEMENT_KEYWORDS.items():
            for keyword in keywords:
                if keyword in content_lower:
                    return mv
        
        return CameraMovement.STATIC
    
    def _determine_camera_angle(self, content: str) -> CameraAngle:
        """Determine camera angle from content."""
        content_lower = content.lower()
        
        for ang, keywords in self.ANGLE_KEYWORDS.items():
            for keyword in keywords:
                if keyword in content_lower:
                    return ang
        
        return CameraAngle.EYE_LEVEL
    
    def _estimate_duration(
        self,
        shot_type: ShotType,
        content: str,
        is_action_heavy: bool
    ) -> float:
        """Estimate shot duration in seconds."""
        word_count = len(content.split())
        base_duration = word_count / 2.5
        
        if shot_type in [ShotType.EXTREME_WIDE_SHOT, ShotType.ESTABLISHING]:
            base_duration = max(base_duration, 4.0)
        elif shot_type == ShotType.INSERT:
            base_duration = min(base_duration, 3.0)
        
        if is_action_heavy:
            base_duration *= 1.5
        
        return round(min(base_duration, 30.0), 1)
    
    def _get_duration_category(self, duration: float) -> ShotDuration:
        """Get duration category from duration value."""
        if duration <= 2:
            return ShotDuration.VERY_SHORT
        elif duration <= 5:
            return ShotDuration.SHORT
        elif duration <= 10:
            return ShotDuration.MEDIUM
        elif duration <= 20:
            return ShotDuration.LONG
        else:
            return ShotDuration.EXTENDED
    
    def _parse_content(self, content: str) -> ShotContent:
        """Parse content for characters, dialogue, etc."""
        obj = ShotContent()
        obj.action_description = content[:200] if len(content) > 200 else content
        
        dialogue_match = re.search(r'"([^"]+)"', content)
        if dialogue_match:
            obj.dialogue = dialogue_match.group(1)
        
        name_pattern = re.findall(r'\b([A-Z][a-z]+)\b', content[:100])
        obj.characters = list(set(name_pattern))[:5]
        
        return obj
    
    def _generate_shot_description(self, shot_type: ShotType, content: ShotContent) -> str:
        """Generate human-readable shot description."""
        shot_names = {
            ShotType.EXTREME_WIDE_SHOT: "Extreme Wide Shot",
            ShotType.WIDE_SHOT: "Wide Shot",
            ShotType.MEDIUM_SHOT: "Medium Shot",
            ShotType.MEDIUM_CLOSE_UP: "Medium Close-Up",
            ShotType.CLOSE_UP: "Close-Up",
            ShotType.EXTREME_CLOSE_UP: "Extreme Close-Up",
            ShotType.ESTABLISHING: "Establishing Shot",
            ShotType.INSERT: "Insert Shot",
        }
        
        desc = shot_names.get(shot_type, "Shot")
        
        if content.characters:
            chars = ', '.join(content.characters[:2])
            desc += f" of {chars}"
        
        return desc
    
    def _calculate_confidence(self, shot_type: ShotType, content: str) -> float:
        """Calculate confidence score for shot suggestion."""
        content_lower = content.lower()
        
        for keywords in self.SHOT_TYPE_KEYWORDS.values():
            for keyword in keywords:
                if keyword in content_lower:
                    return 0.9
        
        return 0.7
    
    def _generate_reasoning(
        self,
        shot_type: ShotType,
        movement: CameraMovement,
        content: ShotContent
    ) -> List[str]:
        """Generate reasoning for shot choice."""
        reasoning = []
        
        if shot_type == ShotType.ESTABLISHING:
            reasoning.append("Establishes scene location")
        elif shot_type == ShotType.WIDE_SHOT:
            reasoning.append("Shows action context")
        elif shot_type == ShotType.CLOSE_UP:
            reasoning.append("Emphasizes emotion/detail")
        
        if movement != CameraMovement.STATIC:
            reasoning.append(f"Camera {movement.value.replace('_', ' ')}")
        
        if content.characters:
            reasoning.append(f"Features: {', '.join(content.characters[:2])}")
        
        return reasoning
    
    def _suggest_closing_shot(
        self,
        scene: Dict[str, Any],
        prev_shot_number: int
    ) -> Optional[Shot]:
        """Suggest closing shot for a scene."""
        return None
    
    def export_shot_list(
        self,
        analysis: ShotBreakdownAnalysis,
        fmt: str = "csv"
    ) -> ShotListExport:
        """Export shot list in specified format."""
        export = ShotListExport()
        export.script_title = analysis.script_title
        export.export_format = fmt
        
        rows = []
        for sb in analysis.scene_breakdowns:
            for shot in sb.shots:
                rows.append({
                    "shot_number": shot.shot_number,
                    "scene_number": shot.scene_number,
                    "shot_type": shot.shot_type.value,
                    "camera_movement": shot.camera_movement.value,
                    "camera_angle": shot.camera_angle.value,
                    "estimated_duration": shot.estimated_duration,
                    "description": shot.description,
                })
        
        export.rows = rows
        return export


def analyze_script_shots(
    script_text: str,
    title: str = "Untitled Script"
) -> ShotBreakdownAnalysis:
    """Analyze a script and generate shot breakdown."""
    analyzer = ShotBreakdownAnalyzer()
    return analyzer.analyze_script(script_text, title)


def export_shot_list(
    analysis: ShotBreakdownAnalysis,
    fmt: str = "csv"
) -> str:
    """Export shot list as CSV string."""
    analyzer = ShotBreakdownAnalyzer()
    export = analyzer.export_shot_list(analysis, fmt)
    return export.to_csv()

