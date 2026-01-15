"""
Continuity Validator Module for StoryCore-Engine.

This module validates spatial and temporal coherence between consecutive video shots,
ensuring professional cinematic grammar compliance including the 180-degree rule,
jump cut detection, and action continuity.
"""

from pathlib import Path
from typing import List, Optional, Tuple, Dict, Any
import json
import math

# Import from models
import sys
sys.path.insert(0, str(Path(__file__).parent))
from models.quality_models import ContinuityViolation, ContinuityResult


class ContinuityValidator:
    """Validates cinematic continuity rules between shots."""
    
    def __init__(self):
        """Initialize the continuity validator."""
        self.jump_cut_threshold = 30.0  # degrees
        self.position_tolerance = 0.2  # 20% of frame dimension
    
    def validate_spatial_continuity(
        self, 
        shot_a: Dict[str, Any], 
        shot_b: Dict[str, Any]
    ) -> ContinuityResult:
        """
        Validates spatial consistency between consecutive shots.
        
        Checks:
        - Character position consistency
        - 180-degree rule compliance
        - Camera angle changes (>30° for jump cut avoidance)
        
        Args:
            shot_a: First video shot with keys:
                - shot_id: str
                - timestamp: float
                - camera_angle: float (degrees, 0-360)
                - characters: List[Dict] with 'name', 'position' (x, y normalized 0-1)
            shot_b: Second video shot (same structure)
            
        Returns:
            ContinuityResult with pass/fail and specific violations
        """
        violations = []
        shot_a_id = shot_a.get("shot_id", "unknown")
        shot_b_id = shot_b.get("shot_id", "unknown")
        timestamp_a = shot_a.get("timestamp", 0.0)
        timestamp_b = shot_b.get("timestamp", 0.0)
        
        # Check camera angle for jump cuts
        camera_angle_a = shot_a.get("camera_angle")
        camera_angle_b = shot_b.get("camera_angle")
        
        if camera_angle_a is not None and camera_angle_b is not None:
            angle_delta = self._calculate_angle_delta(camera_angle_a, camera_angle_b)
            
            if 0 < angle_delta < self.jump_cut_threshold:
                violations.append(ContinuityViolation(
                    violation_type="jump_cut",
                    severity="high",
                    description=f"Camera angle change of {angle_delta:.1f}° is too small (< {self.jump_cut_threshold}°), creating a jump cut",
                    timestamp_a=timestamp_a,
                    timestamp_b=timestamp_b,
                    suggested_fix=f"Increase camera angle change to at least {self.jump_cut_threshold}° or use a cutaway shot"
                ))
        
        # Check character positions and 180-degree rule
        characters_a = shot_a.get("characters", [])
        characters_b = shot_b.get("characters", [])
        
        if characters_a and characters_b:
            # Build character map by name
            char_map_a = {char["name"]: char for char in characters_a}
            char_map_b = {char["name"]: char for char in characters_b}
            
            # Check common characters
            common_chars = set(char_map_a.keys()) & set(char_map_b.keys())
            
            for char_name in common_chars:
                pos_a = char_map_a[char_name].get("position", {})
                pos_b = char_map_b[char_name].get("position", {})
                
                if pos_a and pos_b:
                    # Check for spatial inconsistency (large position jumps)
                    x_delta = abs(pos_a.get("x", 0) - pos_b.get("x", 0))
                    y_delta = abs(pos_a.get("y", 0) - pos_b.get("y", 0))
                    
                    if x_delta > self.position_tolerance or y_delta > self.position_tolerance:
                        violations.append(ContinuityViolation(
                            violation_type="spatial_inconsistency",
                            severity="medium",
                            description=f"Character '{char_name}' position changed significantly between shots (Δx={x_delta:.2f}, Δy={y_delta:.2f})",
                            timestamp_a=timestamp_a,
                            timestamp_b=timestamp_b,
                            suggested_fix=f"Add transition shot or adjust character position to maintain spatial continuity"
                        ))
            
            # Check 180-degree rule for multi-character scenes
            if len(common_chars) >= 2:
                violation = self._check_180_degree_rule(
                    char_map_a, char_map_b, common_chars, timestamp_a, timestamp_b
                )
                if violation:
                    violations.append(violation)
        
        return ContinuityResult(
            passed=len(violations) == 0,
            violations=violations,
            shot_a_id=shot_a_id,
            shot_b_id=shot_b_id,
            timestamp=timestamp_b
        )
    
    def _calculate_angle_delta(self, angle_a: float, angle_b: float) -> float:
        """
        Calculate the smallest angle difference between two angles.
        
        Args:
            angle_a: First angle in degrees (0-360)
            angle_b: Second angle in degrees (0-360)
            
        Returns:
            Smallest angle difference in degrees (0-180)
        """
        delta = abs(angle_b - angle_a)
        if delta > 180:
            delta = 360 - delta
        return delta
    
    def _check_180_degree_rule(
        self,
        char_map_a: Dict[str, Dict],
        char_map_b: Dict[str, Dict],
        common_chars: set,
        timestamp_a: float,
        timestamp_b: float
    ) -> Optional[ContinuityViolation]:
        """
        Check if the 180-degree rule is violated between two shots.
        
        The 180-degree rule states that the camera should stay on one side
        of an imaginary line (axis of action) between characters to maintain
        consistent spatial relationships.
        
        Args:
            char_map_a: Character map for shot A
            char_map_b: Character map for shot B
            common_chars: Set of common character names
            timestamp_a: Timestamp of shot A
            timestamp_b: Timestamp of shot B
            
        Returns:
            ContinuityViolation if rule is violated, None otherwise
        """
        # Get two characters to establish the axis
        char_list = list(common_chars)[:2]
        if len(char_list) < 2:
            return None
        
        char1_name, char2_name = char_list[0], char_list[1]
        
        # Get positions
        pos1_a = char_map_a[char1_name].get("position", {})
        pos2_a = char_map_a[char2_name].get("position", {})
        pos1_b = char_map_b[char1_name].get("position", {})
        pos2_b = char_map_b[char2_name].get("position", {})
        
        if not all([pos1_a, pos2_a, pos1_b, pos2_b]):
            return None
        
        # Calculate relative positions (which character is on which side)
        # Using x-coordinate to determine left/right relationship
        x1_a, x2_a = pos1_a.get("x", 0), pos2_a.get("x", 0)
        x1_b, x2_b = pos1_b.get("x", 0), pos2_b.get("x", 0)
        
        # Check if the left/right relationship flipped
        relationship_a = "left" if x1_a < x2_a else "right"
        relationship_b = "left" if x1_b < x2_b else "right"
        
        if relationship_a != relationship_b:
            return ContinuityViolation(
                violation_type="180_rule",
                severity="critical",
                description=f"180-degree rule violated: spatial relationship between '{char1_name}' and '{char2_name}' flipped between shots",
                timestamp_a=timestamp_a,
                timestamp_b=timestamp_b,
                suggested_fix="Maintain camera position on same side of axis of action, or use a neutral shot to re-establish geography"
            )
        
        return None
    
    def validate_temporal_continuity(
        self,
        shot_a: Dict[str, Any],
        shot_b: Dict[str, Any]
    ) -> ContinuityResult:
        """
        Validates temporal logic between consecutive shots.
        
        Checks:
        - Action continuity (movements complete logically)
        - Object persistence (items don't disappear)
        - Lighting consistency
        
        Args:
            shot_a: First video shot with keys:
                - shot_id: str
                - timestamp: float
                - actions: List[str] (ongoing actions)
                - objects: List[str] (visible objects)
                - lighting: str (lighting condition)
            shot_b: Second video shot (same structure)
            
        Returns:
            ContinuityResult with pass/fail and specific violations
        """
        violations = []
        shot_a_id = shot_a.get("shot_id", "unknown")
        shot_b_id = shot_b.get("shot_id", "unknown")
        timestamp_a = shot_a.get("timestamp", 0.0)
        timestamp_b = shot_b.get("timestamp", 0.0)
        
        # Check action continuity
        actions_a = set(shot_a.get("actions", []))
        actions_b = set(shot_b.get("actions", []))
        
        # Actions that started but didn't complete
        incomplete_actions = actions_a - actions_b
        if incomplete_actions:
            for action in incomplete_actions:
                violations.append(ContinuityViolation(
                    violation_type="temporal_break",
                    severity="medium",
                    description=f"Action '{action}' started in shot A but not completed or continued in shot B",
                    timestamp_a=timestamp_a,
                    timestamp_b=timestamp_b,
                    suggested_fix=f"Show completion of '{action}' or add transitional shot"
                ))
        
        # Check object persistence
        objects_a = set(shot_a.get("objects", []))
        objects_b = set(shot_b.get("objects", []))
        
        # Important objects that disappeared
        disappeared_objects = objects_a - objects_b
        if disappeared_objects:
            for obj in disappeared_objects:
                violations.append(ContinuityViolation(
                    violation_type="temporal_break",
                    severity="low",
                    description=f"Object '{obj}' visible in shot A but disappeared in shot B",
                    timestamp_a=timestamp_a,
                    timestamp_b=timestamp_b,
                    suggested_fix=f"Maintain object '{obj}' visibility or show it being removed"
                ))
        
        # Check lighting consistency
        lighting_a = shot_a.get("lighting")
        lighting_b = shot_b.get("lighting")
        
        if lighting_a and lighting_b and lighting_a != lighting_b:
            violations.append(ContinuityViolation(
                violation_type="temporal_break",
                severity="high",
                description=f"Lighting changed from '{lighting_a}' to '{lighting_b}' between consecutive shots",
                timestamp_a=timestamp_a,
                timestamp_b=timestamp_b,
                suggested_fix="Maintain consistent lighting or add time-passing transition"
            ))
        
        return ContinuityResult(
            passed=len(violations) == 0,
            violations=violations,
            shot_a_id=shot_a_id,
            shot_b_id=shot_b_id,
            timestamp=timestamp_b
        )
    
    def generate_continuity_report(
        self,
        project_path: Path
    ) -> Dict[str, Any]:
        """
        Generates comprehensive continuity report for entire project.
        
        Args:
            project_path: Path to project directory
            
        Returns:
            ContinuityReport dict with all violations, timestamps, and suggestions
        """
        # Load project data
        project_json_path = project_path / "project.json"
        if not project_json_path.exists():
            return {
                "error": "project.json not found",
                "project_path": str(project_path)
            }
        
        with open(project_json_path, 'r') as f:
            project_data = json.load(f)
        
        # Get shots from project data
        shots = project_data.get("shots", [])
        
        if len(shots) < 2:
            return {
                "project_path": str(project_path),
                "total_shots": len(shots),
                "total_violations": 0,
                "violations": [],
                "message": "Not enough shots to validate continuity"
            }
        
        # Validate continuity between consecutive shots
        all_violations = []
        all_results = []
        
        for i in range(len(shots) - 1):
            shot_a = shots[i]
            shot_b = shots[i + 1]
            
            # Validate spatial continuity
            spatial_result = self.validate_spatial_continuity(shot_a, shot_b)
            all_results.append(spatial_result)
            all_violations.extend(spatial_result.violations)
            
            # Validate temporal continuity
            temporal_result = self.validate_temporal_continuity(shot_a, shot_b)
            all_results.append(temporal_result)
            all_violations.extend(temporal_result.violations)
        
        # Aggregate statistics
        violation_types = {}
        severity_counts = {}
        
        for violation in all_violations:
            # Count by type
            vtype = violation.violation_type
            violation_types[vtype] = violation_types.get(vtype, 0) + 1
            
            # Count by severity
            severity = violation.severity
            severity_counts[severity] = severity_counts.get(severity, 0) + 1
        
        return {
            "project_path": str(project_path),
            "total_shots": len(shots),
            "total_shot_pairs": len(shots) - 1,
            "total_violations": len(all_violations),
            "violations": [v.to_dict() for v in all_violations],
            "violation_by_type": violation_types,
            "violation_by_severity": severity_counts,
            "results": [r.to_dict() for r in all_results]
        }
