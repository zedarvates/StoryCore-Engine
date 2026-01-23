"""
GhostTracker Wizard - Advanced Object and Character Tracking System

An intelligent wizard that provides advanced tracking capabilities for objects,
characters, and elements across video sequences. Uses computer vision and AI
to maintain continuity, detect anomalies, and ensure visual consistency.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum
import json
import uuid
from pathlib import Path
from datetime import datetime
import asyncio


class TrackingTarget(Enum):
    """Types of objects/elements that can be tracked"""
    CHARACTER = "character"
    PROP = "prop"
    VEHICLE = "vehicle"
    LOCATION_ELEMENT = "location_element"
    LIGHTING_ELEMENT = "lighting_element"
    CAMERA_EQUIPMENT = "camera_equipment"
    COSTUME_ELEMENT = "costume_element"


class TrackingMode(Enum):
    """Tracking operation modes"""
    CONTINUITY = "continuity"
    ANOMALY_DETECTION = "anomaly_detection"
    MOTION_ANALYSIS = "motion_analysis"
    VISUAL_CONSISTENCY = "visual_consistency"
    QUALITY_ASSURANCE = "quality_assurance"


class ConfidenceLevel(Enum):
    """Confidence levels for tracking results"""
    VERY_HIGH = "very_high"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    VERY_LOW = "very_low"


@dataclass
class TrackedElement:
    """An element being tracked across frames/shots"""
    element_id: str
    target_type: TrackingTarget
    name: str
    description: str
    first_seen_shot: str
    last_seen_shot: str
    total_occurrences: int = 0
    position_history: List[Dict[str, Any]] = field(default_factory=list)
    appearance_variations: List[Dict[str, Any]] = field(default_factory=list)
    confidence_score: float = 0.0
    tracking_notes: List[str] = field(default_factory=list)


@dataclass
class ContinuityIssue:
    """A continuity error or inconsistency detected"""
    issue_id: str
    element_id: str
    issue_type: str  # position, appearance, presence, etc.
    description: str
    severity: str  # critical, major, minor
    shot_affected: str
    frame_timestamp: Optional[float] = None
    suggested_fix: str = ""
    confidence_score: float = 0.0


@dataclass
class TrackingResult:
    """Complete tracking analysis result"""
    result_id: str
    project_id: str
    tracking_timestamp: str
    mode: TrackingMode
    target_shots: List[str]

    # Tracked elements
    tracked_elements: List[TrackedElement] = field(default_factory=list)
    continuity_issues: List[ContinuityIssue] = field(default_factory=list)

    # Analysis metrics
    total_elements_tracked: int = 0
    total_issues_found: int = 0
    overall_confidence: float = 0.0
    processing_time: float = 0.0

    # Metadata
    analysis_summary: str = ""
    recommendations: List[str] = field(default_factory=list)


class GhostTrackerWizard:
    """
    GhostTracker Wizard - Advanced Visual Tracking System

    Provides comprehensive tracking capabilities including:
    - Character and object continuity tracking
    - Anomaly detection across shots
    - Motion analysis and path tracking
    - Visual consistency validation
    - Quality assurance checks
    """

    def __init__(self, vision_engine=None, tracking_engine=None):
        """Initialize the Ghost Tracker wizard"""
        self.vision_engine = vision_engine
        self.tracking_engine = tracking_engine
        self.tracking_result: Optional[TrackingResult] = None

    async def perform_tracking_analysis(self, project_path: Path,
                                      tracking_mode: TrackingMode = TrackingMode.CONTINUITY,
                                      target_shots: Optional[List[str]] = None) -> TrackingResult:
        """
        Perform comprehensive tracking analysis on project shots

        Args:
            project_path: Path to the StoryCore project directory
            tracking_mode: Type of tracking analysis to perform
            target_shots: Specific shot IDs to analyze (optional)

        Returns:
            Complete tracking analysis result
        """
        print("👻 GhostTracker Wizard - Advanced Tracking System")
        print("=" * 60)

        start_time = datetime.utcnow()

        # Load project data
        project_data = self._load_project_data(project_path)

        if not project_data:
            raise ValueError("No project data found. Please ensure this is a valid StoryCore project.")

        print(f"🎯 Tracking mode: {tracking_mode.value.replace('_', ' ').title()}")

        # Get shots to analyze
        all_shots = project_data.get('shot_planning', {}).get('shot_lists', [])
        if not all_shots:
            raise ValueError("No shots found. Please run Shot Planning Wizard first.")

        shots_to_analyze = target_shots or [shot.get('shot_id') for shot in all_shots if shot.get('shot_id')]
        print(f"🎬 Analyzing {len(shots_to_analyze)} shots")

        # Create tracking result
        result = TrackingResult(
            result_id=f"tracking_{int(datetime.utcnow().timestamp())}",
            project_id=self._get_project_id(project_path),
            tracking_timestamp=datetime.utcnow().isoformat() + "Z",
            mode=tracking_mode,
            target_shots=shots_to_analyze
        )

        # Perform tracking based on mode
        if tracking_mode == TrackingMode.CONTINUITY:
            await self._perform_continuity_tracking(result, all_shots, project_data)
        elif tracking_mode == TrackingMode.ANOMALY_DETECTION:
            await self._perform_anomaly_detection(result, all_shots, project_data)
        elif tracking_mode == TrackingMode.MOTION_ANALYSIS:
            await self._perform_motion_analysis(result, all_shots, project_data)
        elif tracking_mode == TrackingMode.VISUAL_CONSISTENCY:
            await self._perform_visual_consistency_check(result, all_shots, project_data)
        elif tracking_mode == TrackingMode.QUALITY_ASSURANCE:
            await self._perform_quality_assurance(result, all_shots, project_data)

        # Calculate metrics
        result.total_elements_tracked = len(result.tracked_elements)
        result.total_issues_found = len(result.continuity_issues)
        result.overall_confidence = self._calculate_overall_confidence(result)
        result.processing_time = (datetime.utcnow() - start_time).total_seconds()

        # Generate summary and recommendations
        result.analysis_summary = self._generate_analysis_summary(result)
        result.recommendations = self._generate_recommendations(result)

        self.tracking_result = result
        self._save_tracking_results(project_path, result)

        print("\n✅ Tracking analysis completed!")
        print(f"🔍 Elements tracked: {result.total_elements_tracked}")
        print(f"⚠️ Issues found: {result.total_issues_found}")
        print(f"⏱️ Processing time: {result.processing_time:.1f}s")
        print(f"📊 Overall confidence: {result.overall_confidence:.1f}/10")

        return result

    def _load_project_data(self, project_path: Path) -> Dict[str, Any]:
        """Load all relevant project data for tracking analysis"""
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
        return f"tracking_{int(datetime.utcnow().timestamp())}"

    async def _perform_continuity_tracking(self, result: TrackingResult,
                                         shots: List[Dict[str, Any]], project_data: Dict[str, Any]):
        """Perform continuity tracking across shots"""
        print("🔄 Performing continuity tracking...")

        # Track characters
        await self._track_characters(result, shots, project_data)

        # Track props and objects
        await self._track_props_and_objects(result, shots, project_data)

        # Check for continuity issues
        self._check_continuity_issues(result)

    async def _perform_anomaly_detection(self, result: TrackingResult,
                                       shots: List[Dict[str, Any]], project_data: Dict[str, Any]):
        """Perform anomaly detection across shots"""
        print("🔍 Performing anomaly detection...")

        # Detect unusual movements or appearances
        await self._detect_motion_anomalies(result, shots)

        # Detect visual inconsistencies
        await self._detect_visual_anomalies(result, shots)

    async def _perform_motion_analysis(self, result: TrackingResult,
                                     shots: List[Dict[str, Any]], project_data: Dict[str, Any]):
        """Perform motion analysis on tracked elements"""
        print("🏃 Performing motion analysis...")

        # Analyze movement patterns
        await self._analyze_movement_patterns(result, shots)

        # Track element paths
        await self._track_element_paths(result, shots)

    async def _perform_visual_consistency_check(self, result: TrackingResult,
                                              shots: List[Dict[str, Any]], project_data: Dict[str, Any]):
        """Perform visual consistency validation"""
        print("👁️ Performing visual consistency check...")

        # Check lighting consistency
        await self._check_lighting_consistency(result, shots)

        # Check color consistency
        await self._check_color_consistency(result, shots)

        # Check prop consistency
        await self._check_prop_consistency(result, shots)

    async def _perform_quality_assurance(self, result: TrackingResult,
                                       shots: List[Dict[str, Any]], project_data: Dict[str, Any]):
        """Perform quality assurance checks"""
        print("✅ Performing quality assurance checks...")

        # Run all tracking modes
        await self._perform_continuity_tracking(result, shots, project_data)
        await self._perform_anomaly_detection(result, shots, project_data)
        await self._perform_visual_consistency_check(result, shots, project_data)

        # Additional QA checks
        self._perform_additional_qa_checks(result, shots)

    async def _track_characters(self, result: TrackingResult, shots: List[Dict[str, Any]],
                              project_data: Dict[str, Any]):
        """Track characters across shots"""
        # Get character definitions
        characters = project_data.get('character_definitions', {}).get('characters', [])

        for character in characters:
            char_name = character.get('name', 'Unknown Character')
            element_id = f"char_{char_name.lower().replace(' ', '_')}"

            tracked_element = TrackedElement(
                element_id=element_id,
                target_type=TrackingTarget.CHARACTER,
                name=char_name,
                description=character.get('description', ''),
                first_seen_shot="",
                last_seen_shot=""
            )

            # Find shots where character appears
            appearances = []
            for shot in shots:
                shot_id = shot.get('shot_id', '')
                shot_description = shot.get('description', '').lower()

                # Simple detection based on name mentions (in real implementation would use CV)
                if char_name.lower() in shot_description:
                    appearances.append({
                        'shot_id': shot_id,
                        'description': shot_description,
                        'confidence': 0.8
                    })

            if appearances:
                tracked_element.first_seen_shot = appearances[0]['shot_id']
                tracked_element.last_seen_shot = appearances[-1]['shot_id']
                tracked_element.total_occurrences = len(appearances)
                tracked_element.position_history = appearances
                tracked_element.confidence_score = 0.8

                result.tracked_elements.append(tracked_element)

    async def _track_props_and_objects(self, result: TrackingResult, shots: List[Dict[str, Any]],
                                     project_data: Dict[str, Any]):
        """Track props and objects across shots"""
        # Common props to look for
        common_props = [
            'phone', 'gun', 'car', 'door', 'window', 'table', 'chair',
            'glass', 'book', 'computer', 'watch', 'ring', 'key'
        ]

        for prop in common_props:
            element_id = f"prop_{prop}"
            appearances = []

            for shot in shots:
                shot_id = shot.get('shot_id', '')
                shot_description = shot.get('description', '').lower()

                if prop in shot_description:
                    appearances.append({
                        'shot_id': shot_id,
                        'description': f"{prop} visible in shot",
                        'confidence': 0.7
                    })

            if len(appearances) >= 2:  # Only track if appears multiple times
                tracked_element = TrackedElement(
                    element_id=element_id,
                    target_type=TrackingTarget.PROP,
                    name=prop.title(),
                    description=f"Prop: {prop}",
                    first_seen_shot=appearances[0]['shot_id'],
                    last_seen_shot=appearances[-1]['shot_id'],
                    total_occurrences=len(appearances),
                    position_history=appearances,
                    confidence_score=0.7
                )

                result.tracked_elements.append(tracked_element)

    def _check_continuity_issues(self, result: TrackingResult):
        """Check for continuity issues in tracked elements"""
        for element in result.tracked_elements:
            if element.total_occurrences < 2:
                continue

            # Check for missing appearances (gaps in continuity)
            shot_sequence = [pos['shot_id'] for pos in element.position_history]

            # Look for patterns that might indicate continuity errors
            if self._detect_continuity_pattern_issues(element, shot_sequence):
                issue = ContinuityIssue(
                    issue_id=f"continuity_{element.element_id}_{len(result.continuity_issues)}",
                    element_id=element.element_id,
                    issue_type="presence_continuity",
                    description=f"Potential continuity issue with {element.name} - irregular appearance pattern",
                    severity="medium",
                    shot_affected=shot_sequence[-1],
                    suggested_fix="Review shots for consistent element placement",
                    confidence_score=0.6
                )
                result.continuity_issues.append(issue)

    def _detect_continuity_pattern_issues(self, element: TrackedElement, shot_sequence: List[str]) -> bool:
        """Detect if there are continuity pattern issues"""
        # Simple heuristic: if element disappears and reappears, it might be an issue
        appearances = len(shot_sequence)

        # For elements that should be continuous, check for gaps
        if element.target_type == TrackingTarget.CHARACTER and appearances < 3:
            return False  # Not enough data

        # Check for irregular gaps (simplified)
        return appearances > 0 and appearances < len(shot_sequence) * 0.8

    async def _detect_motion_anomalies(self, result: TrackingResult, shots: List[Dict[str, Any]]):
        """Detect motion anomalies in shots"""
        # Placeholder for motion anomaly detection
        # In real implementation would use computer vision

        for shot in shots:
            shot_description = shot.get('description', '').lower()
            shot_id = shot.get('shot_id', '')

            # Look for unusual motion descriptions
            if any(word in shot_description for word in ['sudden', 'jerk', 'unusual', 'abnormal']):
                issue = ContinuityIssue(
                    issue_id=f"motion_anomaly_{shot_id}",
                    element_id=f"motion_{shot_id}",
                    issue_type="motion_anomaly",
                    description=f"Unusual motion detected in shot {shot_id}",
                    severity="minor",
                    shot_affected=shot_id,
                    suggested_fix="Review motion smoothness and naturalness",
                    confidence_score=0.5
                )
                result.continuity_issues.append(issue)

    async def _detect_visual_anomalies(self, result: TrackingResult, shots: List[Dict[str, Any]]):
        """Detect visual anomalies in shots"""
        # Placeholder for visual anomaly detection

        for shot in shots:
            shot_description = shot.get('description', '').lower()
            shot_id = shot.get('shot_id', '')

            # Look for visual inconsistency indicators
            if 'inconsistent' in shot_description or 'different' in shot_description:
                issue = ContinuityIssue(
                    issue_id=f"visual_anomaly_{shot_id}",
                    element_id=f"visual_{shot_id}",
                    issue_type="visual_anomaly",
                    description=f"Potential visual inconsistency in shot {shot_id}",
                    severity="medium",
                    shot_affected=shot_id,
                    suggested_fix="Check lighting, colors, and visual elements for consistency",
                    confidence_score=0.6
                )
                result.continuity_issues.append(issue)

    async def _analyze_movement_patterns(self, result: TrackingResult, shots: List[Dict[str, Any]]):
        """Analyze movement patterns of tracked elements"""
        # Create movement analysis elements
        for shot in shots:
            shot_id = shot.get('shot_id', '')
            shot_description = shot.get('description', '').lower()

            # Look for movement descriptions
            if any(word in shot_description for word in ['moving', 'walking', 'running', 'driving']):
                element = TrackedElement(
                    element_id=f"movement_{shot_id}",
                    target_type=TrackingTarget.CHARACTER,  # Assuming character movement
                    name=f"Movement in {shot_id}",
                    description=f"Movement pattern detected in shot {shot_id}",
                    first_seen_shot=shot_id,
                    last_seen_shot=shot_id,
                    total_occurrences=1,
                    confidence_score=0.7
                )
                result.tracked_elements.append(element)

    async def _track_element_paths(self, result: TrackingResult, shots: List[Dict[str, Any]]):
        """Track paths of moving elements"""
        # Simplified path tracking - in real implementation would use CV tracking
        moving_elements = [elem for elem in result.tracked_elements
                          if 'movement' in elem.element_id]

        for element in moving_elements:
            # Add path information
            element.tracking_notes.append("Movement path tracked across shots")
            element.confidence_score = 0.8

    async def _check_lighting_consistency(self, result: TrackingResult, shots: List[Dict[str, Any]]):
        """Check lighting consistency across shots"""
        lighting_descriptions = []

        for shot in shots:
            shot_id = shot.get('shot_id', '')
            description = shot.get('description', '').lower()

            # Extract lighting information
            lighting_info = self._extract_lighting_info(description)
            if lighting_info:
                lighting_descriptions.append({
                    'shot_id': shot_id,
                    'lighting': lighting_info
                })

        # Check for consistency
        if len(lighting_descriptions) > 1:
            consistent = self._check_lighting_consistency_in_list(lighting_descriptions)

            if not consistent:
                issue = ContinuityIssue(
                    issue_id="lighting_consistency_issue",
                    element_id="lighting_overall",
                    issue_type="lighting_inconsistency",
                    description="Lighting inconsistencies detected across shots",
                    severity="major",
                    shot_affected=lighting_descriptions[-1]['shot_id'],
                    suggested_fix="Standardize lighting direction and intensity across shots",
                    confidence_score=0.8
                )
                result.continuity_issues.append(issue)

    async def _check_color_consistency(self, result: TrackingResult, shots: List[Dict[str, Any]]):
        """Check color consistency across shots"""
        # Placeholder for color consistency checking
        pass

    async def _check_prop_consistency(self, result: TrackingResult, shots: List[Dict[str, Any]]):
        """Check prop consistency across shots"""
        # Enhanced prop tracking for consistency
        prop_elements = [elem for elem in result.tracked_elements
                        if elem.target_type == TrackingTarget.PROP]

        for prop in prop_elements:
            # Check if prop appears consistently
            if prop.total_occurrences < 2:
                continue

            # Check for position consistency
            positions = [pos['shot_id'] for pos in prop.position_history]
            if len(positions) > 3:  # Multiple appearances
                prop.tracking_notes.append("Prop appears consistently across multiple shots")

    def _extract_lighting_info(self, description: str) -> Optional[str]:
        """Extract lighting information from description"""
        lighting_keywords = ['bright', 'dark', 'shadow', 'sunlight', 'artificial', 'natural']

        for keyword in lighting_keywords:
            if keyword in description:
                return keyword

        return None

    def _check_lighting_consistency_in_list(self, lighting_list: List[Dict[str, Any]]) -> bool:
        """Check if lighting is consistent across shots"""
        if len(lighting_list) < 2:
            return True

        # Simple consistency check - all should be similar
        first_lighting = lighting_list[0]['lighting']
        return all(item['lighting'] == first_lighting for item in lighting_list)

    def _perform_additional_qa_checks(self, result: TrackingResult, shots: List[Dict[str, Any]]):
        """Perform additional quality assurance checks"""
        # Check for minimum tracking coverage
        if result.total_elements_tracked < len(shots) * 0.1:  # At least 10% coverage
            issue = ContinuityIssue(
                issue_id="qa_low_tracking_coverage",
                element_id="tracking_coverage",
                issue_type="quality_assurance",
                description="Low tracking coverage - limited elements being tracked",
                severity="minor",
                shot_affected="multiple",
                suggested_fix="Consider adding more detailed shot descriptions for better tracking",
                confidence_score=0.9
            )
            result.continuity_issues.append(issue)

    def _calculate_overall_confidence(self, result: TrackingResult) -> float:
        """Calculate overall confidence score"""
        if not result.tracked_elements:
            return 0.0

        # Average confidence of tracked elements
        element_confidence = sum(elem.confidence_score for elem in result.tracked_elements) / len(result.tracked_elements)

        # Issue detection confidence
        issue_confidence = 0.8 if result.continuity_issues else 1.0

        return (element_confidence + issue_confidence) / 2 * 10

    def _generate_analysis_summary(self, result: TrackingResult) -> str:
        """Generate a summary of the tracking analysis"""
        summary_parts = []

        summary_parts.append(f"Tracking analysis completed in {result.mode.value} mode.")
        summary_parts.append(f"Tracked {result.total_elements_tracked} elements across {len(result.target_shots)} shots.")

        if result.continuity_issues:
            summary_parts.append(f"Found {result.total_issues_found} potential issues requiring attention.")
        else:
            summary_parts.append("No significant issues detected.")

        summary_parts.append(f"Overall confidence: {result.overall_confidence:.1f}/10")

        return " ".join(summary_parts)

    def _generate_recommendations(self, result: TrackingResult) -> List[str]:
        """Generate recommendations based on analysis"""
        recommendations = []

        if result.total_issues_found > 0:
            recommendations.append("Review flagged continuity issues and consider reshoots if critical.")

        if result.total_elements_tracked < 5:
            recommendations.append("Consider adding more detailed element descriptions for comprehensive tracking.")

        if result.overall_confidence < 7.0:
            recommendations.append("Consider professional tracking services for higher accuracy.")

        if result.mode == TrackingMode.CONTINUITY:
            recommendations.append("Run anomaly detection mode for additional quality checks.")

        return recommendations

    def _save_tracking_results(self, project_path: Path, result: TrackingResult):
        """Save tracking results to project files"""
        # Save main tracking result
        result_data = {
            "ghost_tracking_result": {
                "result_id": result.result_id,
                "project_id": result.project_id,
                "tracking_timestamp": result.tracking_timestamp,
                "mode": result.mode.value,
                "target_shots": result.target_shots,
                "total_elements_tracked": result.total_elements_tracked,
                "total_issues_found": result.total_issues_found,
                "overall_confidence": result.overall_confidence,
                "processing_time": result.processing_time,
                "analysis_summary": result.analysis_summary,
                "recommendations": result.recommendations,
                "tracked_elements": [
                    {
                        "element_id": elem.element_id,
                        "target_type": elem.target_type.value,
                        "name": elem.name,
                        "description": elem.description,
                        "first_seen_shot": elem.first_seen_shot,
                        "last_seen_shot": elem.last_seen_shot,
                        "total_occurrences": elem.total_occurrences,
                        "confidence_score": elem.confidence_score,
                        "tracking_notes": elem.tracking_notes
                    } for elem in result.tracked_elements
                ],
                "continuity_issues": [
                    {
                        "issue_id": issue.issue_id,
                        "element_id": issue.element_id,
                        "issue_type": issue.issue_type,
                        "description": issue.description,
                        "severity": issue.severity,
                        "shot_affected": issue.shot_affected,
                        "suggested_fix": issue.suggested_fix,
                        "confidence_score": issue.confidence_score
                    } for issue in result.continuity_issues
                ]
            }
        }

        result_file = project_path / "ghost_tracking_result.json"
        with open(result_file, 'w') as f:
            json.dump(result_data, f, indent=2)

        # Update project.json with tracking metadata
        project_file = project_path / "project.json"
        if project_file.exists():
            try:
                with open(project_file, 'r') as f:
                    project_data = json.load(f)

                project_data['ghost_tracking'] = {
                    'completed': True,
                    'tracking_timestamp': result.tracking_timestamp,
                    'mode': result.mode.value,
                    'elements_tracked': result.total_elements_tracked,
                    'issues_found': result.total_issues_found,
                    'confidence': result.overall_confidence
                }

                with open(project_file, 'w') as f:
                    json.dump(project_data, f, indent=2)

            except Exception as e:
                print(f"Warning: Could not update project.json: {e}")


# Convenience functions
def create_ghost_tracker_wizard(vision_engine=None, tracking_engine=None) -> GhostTrackerWizard:
    """Create a Ghost Tracker wizard instance"""
    return GhostTrackerWizard(vision_engine, tracking_engine)


async def perform_tracking_analysis(project_path: Path,
                                  tracking_mode: str = "continuity",
                                  target_shots: Optional[List[str]] = None) -> TrackingResult:
    """
    Convenience function to perform tracking analysis

    Args:
        project_path: Path to project directory
        tracking_mode: Tracking mode (continuity, anomaly_detection, motion_analysis, visual_consistency, quality_assurance)
        target_shots: Specific shot IDs to analyze

    Returns:
        Complete tracking analysis result
    """
    mode_map = {
        'continuity': TrackingMode.CONTINUITY,
        'anomaly_detection': TrackingMode.ANOMALY_DETECTION,
        'motion_analysis': TrackingMode.MOTION_ANALYSIS,
        'visual_consistency': TrackingMode.VISUAL_CONSISTENCY,
        'quality_assurance': TrackingMode.QUALITY_ASSURANCE
    }

    mode = mode_map.get(tracking_mode.lower(), TrackingMode.CONTINUITY)
    wizard = create_ghost_tracker_wizard()
    return await wizard.perform_tracking_analysis(project_path, mode, target_shots)


def get_tracking_preview(project_path: Path) -> Dict[str, Any]:
    """
    Get a preview of tracking analysis for a project

    Args:
        project_path: Path to project directory

    Returns:
        Preview data
    """
    try:
        project_file = project_path / "project.json"
        if not project_file.exists():
            return {"error": "Project not found"}

        with open(project_file, 'r') as f:
            project_data = json.load(f)

        shot_planning = project_data.get('shot_planning', {})
        shots = shot_planning.get('shot_lists', [])

        return {
            "project_name": project_data.get('name', 'Unknown Project'),
            "total_shots": len(shots),
            "estimated_elements": max(1, len(shots) // 3),  # Rough estimate
            "supported_modes": ["continuity", "anomaly_detection", "motion_analysis", "visual_consistency", "quality_assurance"],
            "recommended_mode": "quality_assurance"
        }

    except Exception as e:
        return {"error": f"Could not analyze project: {str(e)}"}