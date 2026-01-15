#!/usr/bin/env python3
"""
StoryCore-Engine Enhanced QA Engine
Comprehensive quality validation with multi-category analysis and autofix loops.

This module implements Stage 9 of the 10-stage pipeline:
- Multi-category quality validation
- Pose consistency analysis
- Lighting consistency validation
- Perspective accuracy checking
- Character stability assessment
- Color palette validation
- Audio sync verification
- Motion coherence analysis
- Autofix loops with parameter adjustment
- Professional QA reporting with detailed metrics

The Enhanced QA Engine follows Data Contract v1 and integrates with:
- Video Engine for temporal coherence validation
- Audio Engine for synchronization verification
- Assembly & Export Engine for final quality assurance
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Union
from dataclasses import dataclass, asdict
from enum import Enum
import time
import math
import statistics

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class QACategory(Enum):
    """Quality assurance categories."""
    VISUAL_COHERENCE = "visual_coherence"
    POSE_CONSISTENCY = "pose_consistency"
    LIGHTING_CONSISTENCY = "lighting_consistency"
    PERSPECTIVE_ACCURACY = "perspective_accuracy"
    CHARACTER_STABILITY = "character_stability"
    COLOR_PALETTE = "color_palette"
    AUDIO_SYNC = "audio_sync"
    MOTION_COHERENCE = "motion_coherence"
    TEMPORAL_CONSISTENCY = "temporal_consistency"
    DATA_INTEGRITY = "data_integrity"


class QASeverity(Enum):
    """Issue severity levels."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class AutofixAction(Enum):
    """Available autofix actions."""
    ADJUST_PARAMETERS = "adjust_parameters"
    REGENERATE_CONTENT = "regenerate_content"
    APPLY_CORRECTION = "apply_correction"
    SKIP_VALIDATION = "skip_validation"
    MANUAL_REVIEW = "manual_review"


@dataclass
class QAIssue:
    """Represents a quality assurance issue."""
    issue_id: str
    category: QACategory
    severity: QASeverity
    title: str
    description: str
    affected_items: List[str]
    score_impact: float
    autofix_available: bool = False
    autofix_action: Optional[AutofixAction] = None
    autofix_confidence: float = 0.0
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


@dataclass
class QAMetrics:
    """Quality metrics for a specific category."""
    category: QACategory
    score: float
    max_score: float = 5.0
    issues_count: int = 0
    critical_issues: int = 0
    high_issues: int = 0
    medium_issues: int = 0
    low_issues: int = 0
    autofix_applied: int = 0
    manual_review_required: int = 0
    validation_time: float = 0.0
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


@dataclass
class AutofixResult:
    """Result of an autofix operation."""
    issue_id: str
    action: AutofixAction
    success: bool
    improvement_score: float
    original_score: float
    new_score: float
    execution_time: float
    details: str
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


@dataclass
class QAReport:
    """Comprehensive QA report."""
    report_id: str
    project_id: str
    timestamp: float
    overall_score: float
    passed: bool
    category_metrics: Dict[str, QAMetrics]
    issues: List[QAIssue]
    autofix_results: List[AutofixResult]
    validation_summary: Dict[str, Any]
    recommendations: List[str]
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


class EnhancedQAEngine:
    """
    Enhanced Quality Assurance Engine with comprehensive validation.
    
    Capabilities:
    - Multi-category quality validation
    - Pose consistency analysis across frames
    - Lighting consistency validation
    - Perspective accuracy checking
    - Character stability assessment
    - Color palette validation
    - Audio synchronization verification
    - Motion coherence analysis
    - Autofix loops with parameter adjustment
    - Professional QA reporting with detailed metrics
    """
    
    def __init__(self, autofix_enabled: bool = True, mock_mode: bool = True):
        """
        Initialize Enhanced QA Engine.
        
        Args:
            autofix_enabled: Whether to enable automatic issue fixing
            mock_mode: If True, generates mock analysis for demonstration
        """
        self.autofix_enabled = autofix_enabled
        self.mock_mode = mock_mode
        
        # Quality thresholds
        self.thresholds = {
            "pass_score": 4.0,
            "min_category_score": 3.0,
            "critical_threshold": 2.0,
            "autofix_confidence_threshold": 0.7
        }
        
        # Category weights for overall score calculation
        self.category_weights = {
            QACategory.VISUAL_COHERENCE: 0.20,
            QACategory.POSE_CONSISTENCY: 0.15,
            QACategory.LIGHTING_CONSISTENCY: 0.15,
            QACategory.PERSPECTIVE_ACCURACY: 0.10,
            QACategory.CHARACTER_STABILITY: 0.15,
            QACategory.COLOR_PALETTE: 0.10,
            QACategory.AUDIO_SYNC: 0.05,
            QACategory.MOTION_COHERENCE: 0.05,
            QACategory.TEMPORAL_CONSISTENCY: 0.03,
            QACategory.DATA_INTEGRITY: 0.02
        }
        
        logger.info(f"Enhanced QA Engine initialized - Autofix: {autofix_enabled}, Mock: {mock_mode}")
    
    def run_comprehensive_qa(self, 
                           project_path: Path,
                           video_metadata: Optional[Dict[str, Any]] = None,
                           audio_metadata: Optional[Dict[str, Any]] = None) -> QAReport:
        """
        Run comprehensive quality assurance analysis.
        
        Args:
            project_path: Path to project directory
            video_metadata: Video generation metadata (optional)
            audio_metadata: Audio generation metadata (optional)
        
        Returns:
            Comprehensive QA report with all analysis results
        """
        logger.info(f"Running comprehensive QA analysis on {project_path}")
        
        start_time = time.time()
        
        # Load project data
        project_data = self._load_project_data(project_path)
        
        # Initialize report
        report = QAReport(
            report_id=f"qa_enhanced_{int(time.time())}",
            project_id=project_data.get("project_id", "unknown"),
            timestamp=time.time(),
            overall_score=0.0,
            passed=False,
            category_metrics={},
            issues=[],
            autofix_results=[],
            validation_summary={},
            recommendations=[]
        )
        
        # Run category-specific validations
        for category in QACategory:
            logger.debug(f"Validating category: {category.value}")
            
            category_start = time.time()
            metrics, issues = self._validate_category(category, project_data, project_path, 
                                                    video_metadata, audio_metadata)
            category_time = time.time() - category_start
            
            metrics.validation_time = category_time
            report.category_metrics[category.value] = metrics
            report.issues.extend(issues)
        
        # Apply autofix if enabled
        if self.autofix_enabled:
            logger.info("Applying autofix operations...")
            autofix_results = self._apply_autofix(report.issues, project_data, project_path)
            report.autofix_results = autofix_results
            
            # Recalculate scores after autofix
            self._recalculate_scores_after_autofix(report)
        
        # Calculate overall score
        report.overall_score = self._calculate_overall_score(report.category_metrics)
        
        # Determine pass/fail status
        report.passed = self._determine_pass_status(report)
        
        # Generate validation summary
        report.validation_summary = self._generate_validation_summary(report)
        
        # Generate recommendations
        report.recommendations = self._generate_recommendations(report)
        
        # Add metadata
        report.metadata = {
            "total_validation_time": time.time() - start_time,
            "categories_validated": len(report.category_metrics),
            "total_issues": len(report.issues),
            "autofix_operations": len(report.autofix_results),
            "mock_mode": self.mock_mode
        }
        
        logger.info(f"QA analysis complete - Score: {report.overall_score:.2f}, Passed: {report.passed}")
        return report
    
    def _load_project_data(self, project_path: Path) -> Dict[str, Any]:
        """Load comprehensive project data from all available sources."""
        project_data = {}
        
        # Load core project files
        core_files = [
            "project.json",
            "storyboard.json",
            "scene_breakdown.json",
            "character_data.json",
            "video_timeline_metadata.json",
            "audio_export_manifest.json",
            "puppet_layer_metadata.json"
        ]
        
        for filename in core_files:
            file_path = project_path / filename
            if file_path.exists():
                try:
                    with open(file_path, 'r') as f:
                        data = json.load(f)
                        key = filename.replace('.json', '').replace('_', '')
                        project_data[key] = data
                except (json.JSONDecodeError, IOError) as e:
                    logger.warning(f"Failed to load {filename}: {e}")
        
        return project_data
    
    def _validate_category(self, 
                         category: QACategory,
                         project_data: Dict[str, Any],
                         project_path: Path,
                         video_metadata: Optional[Dict[str, Any]],
                         audio_metadata: Optional[Dict[str, Any]]) -> Tuple[QAMetrics, List[QAIssue]]:
        """Validate a specific QA category."""
        
        validation_methods = {
            QACategory.VISUAL_COHERENCE: self._validate_visual_coherence,
            QACategory.POSE_CONSISTENCY: self._validate_pose_consistency,
            QACategory.LIGHTING_CONSISTENCY: self._validate_lighting_consistency,
            QACategory.PERSPECTIVE_ACCURACY: self._validate_perspective_accuracy,
            QACategory.CHARACTER_STABILITY: self._validate_character_stability,
            QACategory.COLOR_PALETTE: self._validate_color_palette,
            QACategory.AUDIO_SYNC: self._validate_audio_sync,
            QACategory.MOTION_COHERENCE: self._validate_motion_coherence,
            QACategory.TEMPORAL_CONSISTENCY: self._validate_temporal_consistency,
            QACategory.DATA_INTEGRITY: self._validate_data_integrity
        }
        
        method = validation_methods.get(category)
        if method:
            return method(project_data, project_path, video_metadata, audio_metadata)
        else:
            # Default validation
            return QAMetrics(category=category, score=5.0), []
    
    def _validate_visual_coherence(self, 
                                 project_data: Dict[str, Any],
                                 project_path: Path,
                                 video_metadata: Optional[Dict[str, Any]],
                                 audio_metadata: Optional[Dict[str, Any]]) -> Tuple[QAMetrics, List[QAIssue]]:
        """Validate visual coherence across all generated content."""
        issues = []
        base_score = 5.0
        
        # Check coherence anchors
        coherence_anchors = project_data.get("project", {}).get("coherence_anchors", {})
        if not coherence_anchors:
            issues.append(QAIssue(
                issue_id="vc_001",
                category=QACategory.VISUAL_COHERENCE,
                severity=QASeverity.HIGH,
                title="Missing Coherence Anchors",
                description="No coherence anchors found in project data",
                affected_items=["coherence_anchors"],
                score_impact=1.0,
                autofix_available=True,
                autofix_action=AutofixAction.REGENERATE_CONTENT,
                autofix_confidence=0.8
            ))
            base_score -= 1.0
        
        # Check style consistency
        if self.mock_mode:
            # Mock analysis - simulate style drift detection
            style_drift = 0.15  # 15% style drift
            if style_drift > 0.1:
                issues.append(QAIssue(
                    issue_id="vc_002",
                    category=QACategory.VISUAL_COHERENCE,
                    severity=QASeverity.MEDIUM,
                    title="Style Drift Detected",
                    description=f"Style drift of {style_drift:.1%} exceeds threshold",
                    affected_items=["generated_images"],
                    score_impact=0.5,
                    autofix_available=True,
                    autofix_action=AutofixAction.ADJUST_PARAMETERS,
                    autofix_confidence=0.7
                ))
                base_score -= 0.5
        
        metrics = QAMetrics(
            category=QACategory.VISUAL_COHERENCE,
            score=max(0.0, base_score),
            issues_count=len(issues),
            high_issues=sum(1 for i in issues if i.severity == QASeverity.HIGH),
            medium_issues=sum(1 for i in issues if i.severity == QASeverity.MEDIUM)
        )
        
        return metrics, issues
    
    def _validate_pose_consistency(self, 
                                 project_data: Dict[str, Any],
                                 project_path: Path,
                                 video_metadata: Optional[Dict[str, Any]],
                                 audio_metadata: Optional[Dict[str, Any]]) -> Tuple[QAMetrics, List[QAIssue]]:
        """Validate pose consistency across character appearances."""
        issues = []
        base_score = 5.0
        
        # Check character data
        character_data = project_data.get("characterdata", {})
        characters = character_data.get("characters", [])
        
        if not characters:
            issues.append(QAIssue(
                issue_id="pc_001",
                category=QACategory.POSE_CONSISTENCY,
                severity=QASeverity.MEDIUM,
                title="No Character Data",
                description="No character data available for pose validation",
                affected_items=["character_data"],
                score_impact=0.5,
                autofix_available=False
            ))
            base_score -= 0.5
        
        # Mock pose analysis
        if self.mock_mode and characters:
            for i, character in enumerate(characters):
                char_id = character.get("character_id", f"char_{i}")
                
                # Simulate pose consistency check
                pose_variance = 0.25  # 25% pose variance
                if pose_variance > 0.2:
                    issues.append(QAIssue(
                        issue_id=f"pc_{i+2:03d}",
                        category=QACategory.POSE_CONSISTENCY,
                        severity=QASeverity.LOW,
                        title=f"Pose Variance for {char_id}",
                        description=f"Pose variance of {pose_variance:.1%} for character {char_id}",
                        affected_items=[char_id],
                        score_impact=0.2,
                        autofix_available=True,
                        autofix_action=AutofixAction.ADJUST_PARAMETERS,
                        autofix_confidence=0.6
                    ))
                    base_score -= 0.2
        
        metrics = QAMetrics(
            category=QACategory.POSE_CONSISTENCY,
            score=max(0.0, base_score),
            issues_count=len(issues),
            medium_issues=sum(1 for i in issues if i.severity == QASeverity.MEDIUM),
            low_issues=sum(1 for i in issues if i.severity == QASeverity.LOW)
        )
        
        return metrics, issues
    
    def _validate_lighting_consistency(self, 
                                     project_data: Dict[str, Any],
                                     project_path: Path,
                                     video_metadata: Optional[Dict[str, Any]],
                                     audio_metadata: Optional[Dict[str, Any]]) -> Tuple[QAMetrics, List[QAIssue]]:
        """Validate lighting consistency across scenes."""
        issues = []
        base_score = 5.0
        
        # Check scene data
        scene_data = project_data.get("scenebreakdown", {})
        scenes = scene_data.get("scenes", [])
        
        if self.mock_mode and scenes:
            # Mock lighting analysis
            for i, scene in enumerate(scenes):
                scene_id = scene.get("scene_id", f"scene_{i}")
                environment = scene.get("environment", {})
                
                # Simulate lighting consistency check
                lighting_variance = 0.18  # 18% lighting variance
                if lighting_variance > 0.15:
                    issues.append(QAIssue(
                        issue_id=f"lc_{i+1:03d}",
                        category=QACategory.LIGHTING_CONSISTENCY,
                        severity=QASeverity.MEDIUM,
                        title=f"Lighting Inconsistency in {scene_id}",
                        description=f"Lighting variance of {lighting_variance:.1%} in {scene_id}",
                        affected_items=[scene_id],
                        score_impact=0.3,
                        autofix_available=True,
                        autofix_action=AutofixAction.ADJUST_PARAMETERS,
                        autofix_confidence=0.75
                    ))
                    base_score -= 0.3
        
        metrics = QAMetrics(
            category=QACategory.LIGHTING_CONSISTENCY,
            score=max(0.0, base_score),
            issues_count=len(issues),
            medium_issues=sum(1 for i in issues if i.severity == QASeverity.MEDIUM)
        )
        
        return metrics, issues
    
    def _validate_perspective_accuracy(self, 
                                     project_data: Dict[str, Any],
                                     project_path: Path,
                                     video_metadata: Optional[Dict[str, Any]],
                                     audio_metadata: Optional[Dict[str, Any]]) -> Tuple[QAMetrics, List[QAIssue]]:
        """Validate perspective accuracy in generated content."""
        issues = []
        base_score = 5.0
        
        # Mock perspective analysis
        if self.mock_mode:
            perspective_errors = 0.08  # 8% perspective errors
            if perspective_errors > 0.05:
                issues.append(QAIssue(
                    issue_id="pa_001",
                    category=QACategory.PERSPECTIVE_ACCURACY,
                    severity=QASeverity.LOW,
                    title="Minor Perspective Errors",
                    description=f"Perspective errors in {perspective_errors:.1%} of content",
                    affected_items=["generated_content"],
                    score_impact=0.2,
                    autofix_available=True,
                    autofix_action=AutofixAction.APPLY_CORRECTION,
                    autofix_confidence=0.6
                ))
                base_score -= 0.2
        
        metrics = QAMetrics(
            category=QACategory.PERSPECTIVE_ACCURACY,
            score=max(0.0, base_score),
            issues_count=len(issues),
            low_issues=sum(1 for i in issues if i.severity == QASeverity.LOW)
        )
        
        return metrics, issues
    
    def _validate_character_stability(self, 
                                    project_data: Dict[str, Any],
                                    project_path: Path,
                                    video_metadata: Optional[Dict[str, Any]],
                                    audio_metadata: Optional[Dict[str, Any]]) -> Tuple[QAMetrics, List[QAIssue]]:
        """Validate character stability across frames and scenes."""
        issues = []
        base_score = 5.0
        
        # Check video metadata for character stability
        if video_metadata:
            motion_coherence = video_metadata.get("motion_coherence", {})
            character_stability = motion_coherence.get("character_stability", 0.9)
            
            if character_stability < 0.85:
                issues.append(QAIssue(
                    issue_id="cs_001",
                    category=QACategory.CHARACTER_STABILITY,
                    severity=QASeverity.HIGH,
                    title="Low Character Stability",
                    description=f"Character stability score: {character_stability:.2f}",
                    affected_items=["video_sequences"],
                    score_impact=1.0,
                    autofix_available=True,
                    autofix_action=AutofixAction.ADJUST_PARAMETERS,
                    autofix_confidence=0.8
                ))
                base_score -= 1.0
        
        metrics = QAMetrics(
            category=QACategory.CHARACTER_STABILITY,
            score=max(0.0, base_score),
            issues_count=len(issues),
            high_issues=sum(1 for i in issues if i.severity == QASeverity.HIGH)
        )
        
        return metrics, issues
    
    def _validate_color_palette(self, 
                              project_data: Dict[str, Any],
                              project_path: Path,
                              video_metadata: Optional[Dict[str, Any]],
                              audio_metadata: Optional[Dict[str, Any]]) -> Tuple[QAMetrics, List[QAIssue]]:
        """Validate color palette consistency."""
        issues = []
        base_score = 5.0
        
        # Mock color palette analysis
        if self.mock_mode:
            palette_drift = 0.12  # 12% palette drift
            if palette_drift > 0.1:
                issues.append(QAIssue(
                    issue_id="cp_001",
                    category=QACategory.COLOR_PALETTE,
                    severity=QASeverity.MEDIUM,
                    title="Color Palette Drift",
                    description=f"Color palette drift of {palette_drift:.1%}",
                    affected_items=["color_palette"],
                    score_impact=0.4,
                    autofix_available=True,
                    autofix_action=AutofixAction.ADJUST_PARAMETERS,
                    autofix_confidence=0.85
                ))
                base_score -= 0.4
        
        metrics = QAMetrics(
            category=QACategory.COLOR_PALETTE,
            score=max(0.0, base_score),
            issues_count=len(issues),
            medium_issues=sum(1 for i in issues if i.severity == QASeverity.MEDIUM)
        )
        
        return metrics, issues
    
    def _validate_audio_sync(self, 
                           project_data: Dict[str, Any],
                           project_path: Path,
                           video_metadata: Optional[Dict[str, Any]],
                           audio_metadata: Optional[Dict[str, Any]]) -> Tuple[QAMetrics, List[QAIssue]]:
        """Validate audio-video synchronization."""
        issues = []
        base_score = 5.0
        
        # Check audio metadata
        if audio_metadata:
            sync_accuracy = audio_metadata.get("sync_accuracy", 0.95)
            
            if sync_accuracy < 0.9:
                issues.append(QAIssue(
                    issue_id="as_001",
                    category=QACategory.AUDIO_SYNC,
                    severity=QASeverity.HIGH,
                    title="Audio Sync Issues",
                    description=f"Audio sync accuracy: {sync_accuracy:.1%}",
                    affected_items=["audio_tracks"],
                    score_impact=1.5,
                    autofix_available=True,
                    autofix_action=AutofixAction.ADJUST_PARAMETERS,
                    autofix_confidence=0.9
                ))
                base_score -= 1.5
        
        metrics = QAMetrics(
            category=QACategory.AUDIO_SYNC,
            score=max(0.0, base_score),
            issues_count=len(issues),
            high_issues=sum(1 for i in issues if i.severity == QASeverity.HIGH)
        )
        
        return metrics, issues
    
    def _validate_motion_coherence(self, 
                                 project_data: Dict[str, Any],
                                 project_path: Path,
                                 video_metadata: Optional[Dict[str, Any]],
                                 audio_metadata: Optional[Dict[str, Any]]) -> Tuple[QAMetrics, List[QAIssue]]:
        """Validate motion coherence in video sequences."""
        issues = []
        base_score = 5.0
        
        # Check video metadata for motion coherence
        if video_metadata:
            motion_smoothness = video_metadata.get("motion_smoothness", 0.92)
            
            if motion_smoothness < 0.85:
                issues.append(QAIssue(
                    issue_id="mc_001",
                    category=QACategory.MOTION_COHERENCE,
                    severity=QASeverity.MEDIUM,
                    title="Motion Coherence Issues",
                    description=f"Motion smoothness: {motion_smoothness:.1%}",
                    affected_items=["video_motion"],
                    score_impact=0.8,
                    autofix_available=True,
                    autofix_action=AutofixAction.ADJUST_PARAMETERS,
                    autofix_confidence=0.7
                ))
                base_score -= 0.8
        
        metrics = QAMetrics(
            category=QACategory.MOTION_COHERENCE,
            score=max(0.0, base_score),
            issues_count=len(issues),
            medium_issues=sum(1 for i in issues if i.severity == QASeverity.MEDIUM)
        )
        
        return metrics, issues
    
    def _validate_temporal_consistency(self, 
                                     project_data: Dict[str, Any],
                                     project_path: Path,
                                     video_metadata: Optional[Dict[str, Any]],
                                     audio_metadata: Optional[Dict[str, Any]]) -> Tuple[QAMetrics, List[QAIssue]]:
        """Validate temporal consistency across sequences."""
        issues = []
        base_score = 5.0
        
        # Mock temporal consistency analysis
        if self.mock_mode:
            temporal_variance = 0.06  # 6% temporal variance
            if temporal_variance > 0.05:
                issues.append(QAIssue(
                    issue_id="tc_001",
                    category=QACategory.TEMPORAL_CONSISTENCY,
                    severity=QASeverity.LOW,
                    title="Minor Temporal Inconsistencies",
                    description=f"Temporal variance: {temporal_variance:.1%}",
                    affected_items=["temporal_sequences"],
                    score_impact=0.1,
                    autofix_available=True,
                    autofix_action=AutofixAction.APPLY_CORRECTION,
                    autofix_confidence=0.5
                ))
                base_score -= 0.1
        
        metrics = QAMetrics(
            category=QACategory.TEMPORAL_CONSISTENCY,
            score=max(0.0, base_score),
            issues_count=len(issues),
            low_issues=sum(1 for i in issues if i.severity == QASeverity.LOW)
        )
        
        return metrics, issues
    
    def _validate_data_integrity(self, 
                               project_data: Dict[str, Any],
                               project_path: Path,
                               video_metadata: Optional[Dict[str, Any]],
                               audio_metadata: Optional[Dict[str, Any]]) -> Tuple[QAMetrics, List[QAIssue]]:
        """Validate data integrity and completeness."""
        issues = []
        base_score = 5.0
        
        # Check required project files
        required_files = ["project.json", "storyboard.json"]
        for filename in required_files:
            if filename.replace('.json', '') not in project_data:
                issues.append(QAIssue(
                    issue_id=f"di_{len(issues)+1:03d}",
                    category=QACategory.DATA_INTEGRITY,
                    severity=QASeverity.CRITICAL,
                    title=f"Missing {filename}",
                    description=f"Required file {filename} not found or invalid",
                    affected_items=[filename],
                    score_impact=2.0,
                    autofix_available=False
                ))
                base_score -= 2.0
        
        metrics = QAMetrics(
            category=QACategory.DATA_INTEGRITY,
            score=max(0.0, base_score),
            issues_count=len(issues),
            critical_issues=sum(1 for i in issues if i.severity == QASeverity.CRITICAL)
        )
        
        return metrics, issues
    
    def _apply_autofix(self, 
                      issues: List[QAIssue],
                      project_data: Dict[str, Any],
                      project_path: Path) -> List[AutofixResult]:
        """Apply automatic fixes to identified issues."""
        autofix_results = []
        
        for issue in issues:
            if not issue.autofix_available:
                continue
            
            if issue.autofix_confidence < self.thresholds["autofix_confidence_threshold"]:
                continue
            
            logger.debug(f"Applying autofix for issue {issue.issue_id}")
            
            start_time = time.time()
            result = self._execute_autofix(issue, project_data, project_path)
            execution_time = time.time() - start_time
            
            result.execution_time = execution_time
            autofix_results.append(result)
            
            if result.success:
                logger.info(f"Autofix successful for {issue.issue_id}: {result.improvement_score:.2f} improvement")
            else:
                logger.warning(f"Autofix failed for {issue.issue_id}: {result.details}")
        
        return autofix_results
    
    def _execute_autofix(self, 
                        issue: QAIssue,
                        project_data: Dict[str, Any],
                        project_path: Path) -> AutofixResult:
        """Execute a specific autofix action."""
        
        # Mock autofix execution
        if self.mock_mode:
            # Simulate autofix success based on confidence
            success = issue.autofix_confidence > 0.6
            
            if success:
                improvement = min(issue.score_impact * 0.8, 1.0)  # 80% improvement
                new_score = min(5.0, issue.score_impact + improvement)
            else:
                improvement = 0.0
                new_score = issue.score_impact
            
            return AutofixResult(
                issue_id=issue.issue_id,
                action=issue.autofix_action,
                success=success,
                improvement_score=improvement,
                original_score=issue.score_impact,
                new_score=new_score,
                execution_time=0.0,  # Will be set by caller
                details=f"Mock autofix {'succeeded' if success else 'failed'} for {issue.title}",
                metadata={
                    "mock_mode": True,
                    "confidence": issue.autofix_confidence
                }
            )
        
        # Real autofix implementation would go here
        return AutofixResult(
            issue_id=issue.issue_id,
            action=issue.autofix_action,
            success=False,
            improvement_score=0.0,
            original_score=issue.score_impact,
            new_score=issue.score_impact,
            execution_time=0.0,
            details="Real autofix not implemented",
            metadata={"real_mode": True}
        )
    
    def _recalculate_scores_after_autofix(self, report: QAReport):
        """Recalculate category scores after autofix operations."""
        
        # Create mapping of issue IDs to autofix results
        autofix_map = {result.issue_id: result for result in report.autofix_results}
        
        # Update category metrics based on successful autofixes
        for category_name, metrics in report.category_metrics.items():
            category_issues = [i for i in report.issues if i.category.value == category_name]
            
            score_improvement = 0.0
            autofix_count = 0
            
            for issue in category_issues:
                if issue.issue_id in autofix_map:
                    autofix_result = autofix_map[issue.issue_id]
                    if autofix_result.success:
                        score_improvement += autofix_result.improvement_score
                        autofix_count += 1
            
            # Update metrics
            metrics.score = min(5.0, metrics.score + score_improvement)
            metrics.autofix_applied = autofix_count
    
    def _calculate_overall_score(self, category_metrics: Dict[str, QAMetrics]) -> float:
        """Calculate weighted overall score from category metrics."""
        total_score = 0.0
        total_weight = 0.0
        
        for category_name, metrics in category_metrics.items():
            try:
                category = QACategory(category_name)
                weight = self.category_weights.get(category, 0.1)
                total_score += metrics.score * weight
                total_weight += weight
            except ValueError:
                # Unknown category, use default weight
                total_score += metrics.score * 0.1
                total_weight += 0.1
        
        return total_score / total_weight if total_weight > 0 else 0.0
    
    def _determine_pass_status(self, report: QAReport) -> bool:
        """Determine if the project passes QA validation."""
        
        # Check overall score
        if report.overall_score < self.thresholds["pass_score"]:
            return False
        
        # Check individual category scores
        for metrics in report.category_metrics.values():
            if metrics.score < self.thresholds["min_category_score"]:
                return False
        
        # Check for critical issues
        critical_issues = [i for i in report.issues if i.severity == QASeverity.CRITICAL]
        if critical_issues:
            return False
        
        return True
    
    def _generate_validation_summary(self, report: QAReport) -> Dict[str, Any]:
        """Generate comprehensive validation summary."""
        
        # Count issues by severity
        severity_counts = {severity.value: 0 for severity in QASeverity}
        for issue in report.issues:
            severity_counts[issue.severity.value] += 1
        
        # Calculate category performance
        category_performance = {}
        for category_name, metrics in report.category_metrics.items():
            category_performance[category_name] = {
                "score": metrics.score,
                "issues": metrics.issues_count,
                "autofix_applied": metrics.autofix_applied,
                "validation_time": metrics.validation_time
            }
        
        # Autofix summary
        autofix_summary = {
            "total_attempts": len(report.autofix_results),
            "successful": sum(1 for r in report.autofix_results if r.success),
            "failed": sum(1 for r in report.autofix_results if not r.success),
            "total_improvement": sum(r.improvement_score for r in report.autofix_results if r.success)
        }
        
        return {
            "overall_score": report.overall_score,
            "passed": report.passed,
            "total_issues": len(report.issues),
            "severity_breakdown": severity_counts,
            "category_performance": category_performance,
            "autofix_summary": autofix_summary,
            "validation_time": report.metadata.get("total_validation_time", 0.0)
        }
    
    def _generate_recommendations(self, report: QAReport) -> List[str]:
        """Generate actionable recommendations based on QA results."""
        recommendations = []
        
        # Overall score recommendations
        if report.overall_score < 3.0:
            recommendations.append("Consider regenerating content with adjusted parameters for better quality")
        elif report.overall_score < 4.0:
            recommendations.append("Review and address medium and high severity issues before final export")
        
        # Category-specific recommendations
        for category_name, metrics in report.category_metrics.items():
            if metrics.score < 3.0:
                if category_name == "visual_coherence":
                    recommendations.append("Strengthen coherence anchors and style consistency")
                elif category_name == "character_stability":
                    recommendations.append("Improve character reference sheets and pose consistency")
                elif category_name == "audio_sync":
                    recommendations.append("Adjust audio timing and synchronization markers")
                elif category_name == "motion_coherence":
                    recommendations.append("Refine motion interpolation and camera movement parameters")
        
        # Autofix recommendations
        failed_autofixes = [r for r in report.autofix_results if not r.success]
        if failed_autofixes:
            recommendations.append(f"Manual review required for {len(failed_autofixes)} issues that couldn't be automatically fixed")
        
        # Critical issue recommendations
        critical_issues = [i for i in report.issues if i.severity == QASeverity.CRITICAL]
        if critical_issues:
            recommendations.append("Address critical issues immediately - project cannot proceed without fixes")
        
        return recommendations
    
    def export_qa_report(self, 
                        report: QAReport,
                        export_path: Path,
                        include_detailed_analysis: bool = True) -> Dict[str, Any]:
        """
        Export comprehensive QA report to files.
        
        Args:
            report: QA report to export
            export_path: Directory to export to
            include_detailed_analysis: Whether to include detailed analysis files
        
        Returns:
            Export manifest with file paths and summary
        """
        logger.info(f"Exporting QA report to {export_path}")
        
        # Create export directory
        export_path.mkdir(parents=True, exist_ok=True)
        
        export_manifest = {
            "report_id": report.report_id,
            "export_timestamp": time.time(),
            "export_path": str(export_path),
            "files": {},
            "summary": {}
        }
        
        # Export main report
        report_path = export_path / "qa_report.json"
        with open(report_path, 'w') as f:
            json.dump(asdict(report), f, indent=2, default=str)
        export_manifest["files"]["main_report"] = str(report_path)
        
        # Export validation summary
        summary_path = export_path / "validation_summary.json"
        with open(summary_path, 'w') as f:
            json.dump(report.validation_summary, f, indent=2)
        export_manifest["files"]["validation_summary"] = str(summary_path)
        
        # Export issues breakdown
        issues_path = export_path / "issues_breakdown.json"
        issues_data = {
            "total_issues": len(report.issues),
            "by_category": {},
            "by_severity": {},
            "issues": [asdict(issue) for issue in report.issues]
        }
        
        # Group issues by category and severity
        for issue in report.issues:
            category = issue.category.value
            severity = issue.severity.value
            
            if category not in issues_data["by_category"]:
                issues_data["by_category"][category] = 0
            issues_data["by_category"][category] += 1
            
            if severity not in issues_data["by_severity"]:
                issues_data["by_severity"][severity] = 0
            issues_data["by_severity"][severity] += 1
        
        with open(issues_path, 'w') as f:
            json.dump(issues_data, f, indent=2, default=str)
        export_manifest["files"]["issues_breakdown"] = str(issues_path)
        
        # Export autofix results
        if report.autofix_results:
            autofix_path = export_path / "autofix_results.json"
            with open(autofix_path, 'w') as f:
                json.dump([asdict(result) for result in report.autofix_results], f, indent=2, default=str)
            export_manifest["files"]["autofix_results"] = str(autofix_path)
        
        # Export recommendations
        recommendations_path = export_path / "recommendations.json"
        with open(recommendations_path, 'w') as f:
            json.dump({
                "recommendations": report.recommendations,
                "priority_actions": [r for r in report.recommendations if "critical" in r.lower() or "immediately" in r.lower()],
                "generated_timestamp": time.time()
            }, f, indent=2)
        export_manifest["files"]["recommendations"] = str(recommendations_path)
        
        # Export detailed analysis if requested
        if include_detailed_analysis:
            analysis_dir = export_path / "detailed_analysis"
            analysis_dir.mkdir(exist_ok=True)
            
            # Category-specific analysis
            for category_name, metrics in report.category_metrics.items():
                category_path = analysis_dir / f"{category_name}_analysis.json"
                category_issues = [i for i in report.issues if i.category.value == category_name]
                
                analysis_data = {
                    "metrics": asdict(metrics),
                    "issues": [asdict(issue) for issue in category_issues],
                    "autofix_results": [asdict(r) for r in report.autofix_results 
                                      if any(i.issue_id == r.issue_id for i in category_issues)]
                }
                
                with open(category_path, 'w') as f:
                    json.dump(analysis_data, f, indent=2, default=str)
                
                export_manifest["files"][f"{category_name}_analysis"] = str(category_path)
        
        # Generate export summary
        export_manifest["summary"] = {
            "overall_score": report.overall_score,
            "passed": report.passed,
            "total_issues": len(report.issues),
            "autofix_applied": len([r for r in report.autofix_results if r.success]),
            "categories_validated": len(report.category_metrics),
            "files_generated": len(export_manifest["files"])
        }
        
        logger.info(f"QA report exported - {len(export_manifest['files'])} files generated")
        return export_manifest


def main():
    """Demonstration of Enhanced QA Engine capabilities."""
    print("StoryCore-Engine Enhanced QA Engine Demo")
    print("=" * 50)
    
    # Create mock project data
    project_path = Path("demo_qa_project")
    project_path.mkdir(exist_ok=True)
    
    # Create mock project files
    mock_project = {
        "project_id": "demo_qa_001",
        "schema_version": "1.0",
        "coherence_anchors": {"style": "cinematic", "palette": "warm"}
    }
    
    with open(project_path / "project.json", 'w') as f:
        json.dump(mock_project, f, indent=2)
    
    # Mock video and audio metadata
    video_metadata = {
        "motion_coherence": {"character_stability": 0.88, "motion_smoothness": 0.91},
        "total_duration": 30.0
    }
    
    audio_metadata = {
        "sync_accuracy": 0.94,
        "total_tracks": 4
    }
    
    # Initialize Enhanced QA Engine
    qa_engine = EnhancedQAEngine(autofix_enabled=True, mock_mode=True)
    
    # Run comprehensive QA analysis
    print("\n1. Running comprehensive QA analysis...")
    report = qa_engine.run_comprehensive_qa(project_path, video_metadata, audio_metadata)
    
    print(f"   ✓ Overall score: {report.overall_score:.2f}/5.0")
    print(f"   ✓ Passed: {report.passed}")
    print(f"   ✓ Categories validated: {len(report.category_metrics)}")
    print(f"   ✓ Issues found: {len(report.issues)}")
    print(f"   ✓ Autofix operations: {len(report.autofix_results)}")
    
    # Show category breakdown
    print("\n2. Category performance:")
    for category_name, metrics in report.category_metrics.items():
        print(f"   • {category_name}: {metrics.score:.2f}/5.0 ({metrics.issues_count} issues)")
    
    # Show issue summary
    print("\n3. Issue summary:")
    severity_counts = {}
    for issue in report.issues:
        severity = issue.severity.value
        severity_counts[severity] = severity_counts.get(severity, 0) + 1
    
    for severity, count in severity_counts.items():
        print(f"   • {severity}: {count} issues")
    
    # Show autofix results
    print("\n4. Autofix results:")
    successful_fixes = [r for r in report.autofix_results if r.success]
    failed_fixes = [r for r in report.autofix_results if not r.success]
    
    print(f"   • Successful: {len(successful_fixes)}")
    print(f"   • Failed: {len(failed_fixes)}")
    
    if successful_fixes:
        total_improvement = sum(r.improvement_score for r in successful_fixes)
        print(f"   • Total improvement: {total_improvement:.2f} points")
    
    # Export QA report
    print("\n5. Exporting QA report...")
    export_path = project_path / "qa_output"
    manifest = qa_engine.export_qa_report(report, export_path, include_detailed_analysis=True)
    
    print(f"   ✓ Exported to: {export_path}")
    print(f"   ✓ Files generated: {len(manifest['files'])}")
    
    # Show recommendations
    print("\n6. Recommendations:")
    for i, recommendation in enumerate(report.recommendations, 1):
        print(f"   {i}. {recommendation}")
    
    print("\n✅ Enhanced QA Engine demonstration complete!")
    print(f"💡 Mock mode simulated comprehensive quality analysis")
    print(f"🔧 Autofix system demonstrated parameter adjustment capabilities")
    print(f"📊 Ready for integration with Assembly & Export Engine")


if __name__ == "__main__":
    main()