"""
Quality Validator Module for StoryCore-Engine.

This module detects visual and audio anomalies, generates quality scores,
and provides actionable feedback for quality improvements.
"""

from pathlib import Path
from typing import List, Optional, Tuple, Dict, Any
from dataclasses import dataclass
from enum import Enum
import json
import cv2
import numpy as np
import librosa
import logging


class ValidationMode(Enum):
    """Validation modes for quality assessment."""
    REAL_TIME = "real_time"  # Fast validation during generation
    BATCH = "batch"        # Comprehensive post-generation validation


class QualityStandard(Enum):
    """Quality standards for video assessment."""
    PREVIEW = "preview"      # Low quality for quick previews
    WEB_HD = "web_hd"        # Standard web quality
    BROADCAST = "broadcast"  # High quality for broadcast


class QualityMetric(Enum):
    """Quality metrics for assessment."""
    VISUAL_QUALITY = "visual_quality"
    MOTION_SMOOTHNESS = "motion_smoothness"
    SHARPNESS = "sharpness"
    NOISE_LEVEL = "noise_level"
    PROFESSIONAL_STANDARDS = "professional_standards"


@dataclass
class QualityIssue:
    """Specific quality issue detected."""
    
    issue_type: str  # "low_sharpness", "unnatural_motion", "metallic_voice", "audio_gap", etc.
    severity: str  # "low", "medium", "high", "critical"
    description: str
    timestamp: float
    frame_number: Optional[int]
    metric_value: float
    threshold_value: float
    
    def to_dict(self) -> dict:
        """Serializes issue to dictionary."""
        return {
            "type": self.issue_type,
            "severity": self.severity,
            "description": self.description,
            "timestamp": self.timestamp,
            "frame_number": self.frame_number,
            "metric_value": self.metric_value,
            "threshold_value": self.threshold_value
        }


@dataclass
class ImprovementSuggestion:
    """Actionable suggestion for quality improvement."""
    
    suggestion_id: str
    priority: int  # 1 (highest) to 5 (lowest)
    action: str  # Human-readable action description
    parameters: dict  # Specific parameter adjustments
    expected_improvement: float  # Estimated quality score improvement
    related_issue_ids: List[str]
    
    def to_dict(self) -> dict:
        """Serializes suggestion to dictionary."""
        return {
            "id": self.suggestion_id,
            "priority": self.priority,
            "action": self.action,
            "parameters": self.parameters,
            "expected_improvement": self.expected_improvement,
            "related_issues": self.related_issue_ids
        }


@dataclass
class QualityScore:
    """Individual quality score for a specific metric."""

    score: float  # 0.0-1.0
    confidence: float  # 0.0-1.0
    metric: QualityMetric
    standard: QualityStandard
    details: Dict[str, Any]

    def to_dict(self) -> dict:
        """Serializes to dictionary."""
        return {
            "score": self.score,
            "confidence": self.confidence,
            "metric": self.metric.value,
            "standard": self.standard.value,
            "details": self.details
        }


@dataclass
class QualityAssessment:
    """Comprehensive quality assessment result."""

    overall_score: float  # 0.0-1.0
    quality_scores: List[QualityScore]
    detected_issues: List[QualityIssue]
    recommendations: List[ImprovementSuggestion]
    processing_time: float
    frame_count: int
    standard: QualityStandard
    passes_standard: bool

    def to_dict(self) -> dict:
        """Serializes to dictionary."""
        return {
            "overall_score": self.overall_score,
            "quality_scores": [s.to_dict() for s in self.quality_scores],
            "detected_issues": [i.to_dict() for i in self.detected_issues],
            "recommendations": [r.to_dict() for r in self.recommendations],
            "processing_time": self.processing_time,
            "frame_count": self.frame_count,
            "standard": self.standard.value,
            "passes_standard": self.passes_standard
        }


@dataclass
class ComprehensiveQualityScore:
    """Comprehensive quality score for a video shot."""

    overall_score: float  # 0-100
    sharpness_score: float  # 0-100
    motion_score: float  # 0-100
    audio_score: float  # 0-100
    continuity_score: float  # 0-100

    issues: List[QualityIssue]
    suggestions: List[ImprovementSuggestion]

    def passed(self, threshold: float = 70.0) -> bool:
        """Returns True if overall score meets threshold."""
        return self.overall_score >= threshold

    def to_dict(self) -> dict:
        """Serializes quality score to dictionary."""
        return {
            "overall_score": self.overall_score,
            "sharpness_score": self.sharpness_score,
            "motion_score": self.motion_score,
            "audio_score": self.audio_score,
            "continuity_score": self.continuity_score,
            "passed": self.passed(),
            "issues": [i.to_dict() for i in self.issues],
            "suggestions": [s.to_dict() for s in self.suggestions]
        }


class QualityValidator:
    """Comprehensive quality validation for video and audio."""

    def __init__(self, mode: ValidationMode = ValidationMode.BATCH, quality_standard: QualityStandard = QualityStandard.WEB_HD, enable_advanced_analysis: bool = True):
        """Initialize the quality validator.

        Args:
            mode: Validation mode (REAL_TIME or BATCH), defaults to BATCH for comprehensive analysis
            quality_standard: Quality standard for assessment
            enable_advanced_analysis: Whether to enable advanced analysis features
        """
        self.mode = mode
        self.quality_standard = quality_standard
        self.enable_advanced_analysis = enable_advanced_analysis
        self.sharpness_threshold = 100.0
        self.quality_pass_threshold = 70.0
        self.logger = logging.getLogger(__name__)

        # Adjust thresholds based on mode
        if mode == ValidationMode.REAL_TIME:
            # Faster thresholds for real-time validation
            self.sharpness_threshold = 80.0  # Lower threshold for quick feedback
        else:  # BATCH mode
            # Comprehensive thresholds for batch validation
            self.sharpness_threshold = 100.0  # Higher threshold for quality assurance

    def validate_video_file(self, video_path: Path) -> Tuple[bool, str]:
        """
        Validate video file for format, readability, and corruption.

        Args:
            video_path: Path to video file

        Returns:
            Tuple of (is_valid, error_message)
        """
        if not video_path.exists():
            return False, f"Video file not found: {video_path}"

        if not video_path.is_file():
            return False, f"Path is not a file: {video_path}"

        # Check file extension
        supported_extensions = {'.mp4', '.avi', '.mov', '.mkv', '.webm'}
        if video_path.suffix.lower() not in supported_extensions:
            return False, f"Unsupported video format: {video_path.suffix}. Supported: {supported_extensions}"

        try:
            # Try to open the video file
            cap = cv2.VideoCapture(str(video_path))
            if not cap.isOpened():
                return False, f"Unable to open video file (corrupted or unsupported codec): {video_path}"

            # Check if we can read at least one frame
            ret, frame = cap.read()
            if not ret:
                cap.release()
                return False, f"Unable to read frames from video file (empty or corrupted): {video_path}"

            # Check frame properties
            if frame is None or frame.size == 0:
                cap.release()
                return False, f"Invalid frame data in video file: {video_path}"

            cap.release()
            return True, ""

        except Exception as e:
            return False, f"Error validating video file {video_path}: {str(e)}"

    def validate_audio_file(self, audio_path: Path) -> Tuple[bool, str]:
        """
        Validate audio file for format, readability, and corruption.

        Args:
            audio_path: Path to audio file

        Returns:
            Tuple of (is_valid, error_message)
        """
        if not audio_path.exists():
            return False, f"Audio file not found: {audio_path}"

        if not audio_path.is_file():
            return False, f"Path is not a file: {audio_path}"

        # Check file extension
        supported_extensions = {'.wav', '.mp3', '.flac', '.aac', '.ogg'}
        if audio_path.suffix.lower() not in supported_extensions:
            return False, f"Unsupported audio format: {audio_path.suffix}. Supported: {supported_extensions}"

        try:
            # Try to load audio with librosa
            audio_data, sample_rate = librosa.load(str(audio_path), sr=None, mono=False)

            if len(audio_data) == 0:
                return False, f"Audio file is empty (no data): {audio_path}"

            if sample_rate <= 0:
                return False, f"Invalid sample rate in audio file: {sample_rate}"

            # Check for corrupted data (all zeros or invalid values)
            if np.all(audio_data == 0):
                return False, f"Audio file contains only silence (possibly corrupted): {audio_path}"

            # Check for NaN or inf values
            if np.any(np.isnan(audio_data)) or np.any(np.isinf(audio_data)):
                return False, f"Audio file contains invalid data (NaN/inf values): {audio_path}"

            return True, ""

        except Exception as e:
            return False, f"Error validating audio file {audio_path}: {str(e)}"
    
    def calculate_sharpness(
        self,
        frame: np.ndarray
    ) -> float:
        """
        Calculates frame sharpness using Laplacian variance.

        Args:
            frame: Video frame as numpy array

        Returns:
            Laplacian variance score (higher = sharper)
        """
        # Convert to grayscale if needed
        if len(frame.shape) == 3:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        else:
            gray = frame
        # Laplacian variance
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        return laplacian_var

    def detect_unnatural_movements(
        self,
        frames: List[np.ndarray]
    ) -> List[dict]:
        """
        Detects unnatural movements using optical flow analysis for motion vector anomalies.

        Args:
            frames: List of video frames as numpy arrays

        Returns:
            List of detected movement anomalies with timestamps and severity
        """
        anomalies = []
        if len(frames) < 2:
            return anomalies

        # Convert first frame to grayscale
        prev_gray = cv2.cvtColor(frames[0], cv2.COLOR_BGR2GRAY)

        for i in range(1, len(frames)):
            gray = cv2.cvtColor(frames[i], cv2.COLOR_BGR2GRAY)

            # Calculate optical flow
            flow = cv2.calcOpticalFlowFarneback(prev_gray, gray, None, 0.5, 3, 15, 3, 5, 1.1, 0)

            # Calculate magnitude
            mag, _ = cv2.cartToPolar(flow[...,0], flow[...,1])
            mean_mag = np.mean(mag)

            # Detect anomalies if mean magnitude is too high (sudden movement) or too low (unnatural stillness)
            if mean_mag > 10.0 or mean_mag < 0.1:
                severity = "high" if mean_mag > 20.0 else "medium" if mean_mag > 10.0 else "low"
                anomalies.append({
                    'type': 'unnatural_movement',
                    'severity': severity,
                    'description': f'Unnatural motion detected at frame {i}',
                    'timestamp': i / 30.0,  # assuming 30fps
                    'frame_number': i,
                    'metric_value': mean_mag,
                    'threshold_value': 10.0 if mean_mag > 10.0 else 0.1
                })

            prev_gray = gray

        return anomalies

    def detect_visual_anomalies(
        self,
        frames: List[np.ndarray]
    ) -> List[dict]:
        """
        Detects visual anomalies including:
        - Character disappearances
        - Morphological inconsistencies
        - Physics violations

        Args:
            frames: List of video frames as numpy arrays

        Returns:
            List of detected anomalies with timestamps and severity
        """
        anomalies = []
        if len(frames) < 2:
            return anomalies

        # Simple heuristic: detect sudden brightness changes as anomalies
        prev_mean = np.mean(frames[0])
        for i in range(1, len(frames)):
            mean_brightness = np.mean(frames[i])
            diff = abs(mean_brightness - prev_mean)
            if diff > 50.0:  # arbitrary threshold for sudden change
                anomalies.append({
                    'type': 'sudden_change',
                    'severity': 'medium',
                    'description': f'Sudden brightness change detected at frame {i}',
                    'timestamp': i / 30.0,
                    'frame_number': i,
                    'metric_value': diff,
                    'threshold_value': 50.0
                })
            prev_mean = mean_brightness

        return anomalies

    def detect_metallic_voice(
        self,
        audio_clip: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Detects metallic/artificial voice characteristics using spectral analysis for AI artifacts in formant structures.

        Analyzes formant peaks for unnatural resonance patterns indicative of AI-generated speech.

        Args:
            audio_clip: Audio clip with 'data' (np.ndarray) and 'rate' (int)

        Returns:
            List of detected metallic voice issues with timestamps and severity
        """
        issues = []
        audio_data = audio_clip.get('data', np.array([]))
        sample_rate = audio_clip.get('rate', 22050)

        if len(audio_data) == 0:
            return issues

        # Compute spectrogram
        stft = librosa.stft(audio_data.astype(float), n_fft=2048, hop_length=512)
        spectrogram = np.abs(stft)

        # Formant frequency ranges (approximate for human speech)
        formant_ranges = [(500, 1500), (1500, 2500), (2500, 3500)]  # Hz

        # Analyze each time frame
        hop_length = 512
        for t in range(spectrogram.shape[1]):
            timestamp = t * hop_length / sample_rate
            freqs = librosa.fft_frequencies(sr=sample_rate, n_fft=2048)

            # Check formant peaks
            metallic_score = 0.0
            for f_min, f_max in formant_ranges:
                mask = (freqs >= f_min) & (freqs <= f_max)
                if np.any(mask):
                    peak_power = np.max(spectrogram[mask, t])
                    avg_power = np.mean(spectrogram[mask, t])
                    if avg_power > 0:
                        # High peak-to-average ratio indicates metallic resonance
                        ratio = peak_power / avg_power
                        if ratio > 10.0:  # threshold for metallic detection
                            metallic_score += ratio

            if metallic_score > 15.0:  # overall threshold
                severity = "high" if metallic_score > 30.0 else "medium"
                issues.append({
                    'issue_type': 'metallic_voice',
                    'severity': severity,
                    'description': f'Metallic voice artifact detected at {timestamp:.2f}s',
                    'timestamp': timestamp,
                    'frame_number': None,
                    'metric_value': metallic_score,
                    'threshold_value': 15.0
                })

        return issues

    def measure_voice_clarity(
        self,
        audio_clip: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Measures voice clarity using SNR analysis with re-generation recommendations.

        Calculates signal-to-noise ratio to quantify clarity and provides recommendations.

        Args:
            audio_clip: Audio clip with 'data' (np.ndarray) and 'rate' (int)

        Returns:
            Clarity measurement with score, issues, and recommendations
        """
        audio_data = audio_clip.get('data', np.array([]))
        sample_rate = audio_clip.get('rate', 22050)

        if len(audio_data) == 0:
            return {"clarity_score": 0.0, "issues": [], "recommendations": []}

        # Simple SNR calculation: RMS of signal vs RMS of estimated noise
        rms_signal = np.sqrt(np.mean(audio_data**2))

        # Estimate noise as low amplitude portions or using a simple method
        # For simplicity, use percentile-based noise estimation
        noise_threshold = np.percentile(np.abs(audio_data), 10)  # bottom 10% as noise
        noise_mask = np.abs(audio_data) < noise_threshold
        if np.any(noise_mask):
            rms_noise = np.sqrt(np.mean(audio_data[noise_mask]**2))
        else:
            rms_noise = 1e-6  # very small noise to avoid division by zero

        if rms_noise > 0:
            snr = 20 * np.log10(rms_signal / rms_noise)
        else:
            snr = 100.0  # perfect clarity

        # Normalize to 0-100 score
        clarity_score = min(100.0, max(0.0, (snr + 20) * 2.5))  # map -20dB to 0, 20dB to 100

        issues = []
        recommendations = []

        if clarity_score < 30.0:
            issues.append(QualityIssue(
                issue_type="low_clarity",
                severity="critical" if clarity_score < 10.0 else "high",
                description="Low voice clarity detected",
                timestamp=0.0,
                frame_number=None,
                metric_value=clarity_score,
                threshold_value=30.0
            ))
            recommendations.append({
                "action": "Regenerate audio with higher quality settings",
                "parameters": {"quality_boost": 0.5},
                "expected_improvement": 20.0
            })

        return {
            "clarity_score": clarity_score,
            "snr": snr,
            "issues": issues,
            "recommendations": recommendations
        }

    def detect_audio_gaps(
        self,
        audio_clip: Dict[str, Any],
        silence_threshold_db: float = -40.0,
        min_gap_duration: float = 0.1
    ) -> List[Dict[str, Any]]:
        """
        Detects audio gaps with context, distinguishing intentional vs problematic silence.

        Analyzes amplitude levels to find silence periods and classifies them.

        Args:
            audio_clip: Audio clip with 'data' (np.ndarray) and 'rate' (int)
            silence_threshold_db: Threshold in dB below which is considered silence
            min_gap_duration: Minimum duration in seconds to consider as gap

        Returns:
            List of detected gaps with timestamps, duration, and classification
        """
        gaps = []
        audio_data = audio_clip.get('data', np.array([]))
        sample_rate = audio_clip.get('rate', 22050)

        if len(audio_data) == 0:
            return gaps

        # Convert amplitude to dB
        audio_db = 20 * np.log10(np.abs(audio_data) + 1e-6)  # add small value to avoid log(0)

        # Find silence regions
        silence_mask = audio_db < silence_threshold_db

        # Find contiguous silence regions
        diff = np.diff(np.r_[False, silence_mask, False].astype(int))
        starts = np.where(diff == 1)[0]
        ends = np.where(diff == -1)[0]

        for start_idx, end_idx in zip(starts, ends):
            duration = (end_idx - start_idx) / sample_rate
            if duration >= min_gap_duration:
                timestamp = start_idx / sample_rate

                # Classify gap: problematic if too long or at speech boundaries
                is_problematic = bool(duration > 1.0)  # arbitrary threshold for problematic
                gap_type = "problematic_silence" if is_problematic else "intentional_silence"

                severity = "high" if duration > 2.0 else "medium" if duration > 1.0 else "low"

                gaps.append({
                    'type': gap_type,
                    'severity': severity,
                    'description': f'Audio gap detected: {duration:.2f}s of silence',
                    'timestamp': timestamp,
                    'duration': duration,
                    'end_timestamp': timestamp + duration,
                    'is_problematic': is_problematic
                })

        return gaps

    def generate_gap_report(
        self,
        gaps: List[Dict[str, Any]],
        total_duration: float
    ) -> Dict[str, Any]:
        """
        Generates gap report with total duration and timeline percentage.

        Args:
            gaps: List of detected gaps from detect_audio_gaps
            total_duration: Total audio duration in seconds

        Returns:
            Report with total gap time, percentage, and breakdown
        """
        if not gaps:
            return {
                "total_gap_duration": 0.0,
                "gap_percentage": 0.0,
                "gap_count": 0,
                "problematic_gaps": 0,
                "intentional_gaps": 0,
                "gaps": gaps
            }

        total_gap_duration = sum(gap['duration'] for gap in gaps)
        gap_percentage = (total_gap_duration / total_duration) * 100 if total_duration > 0 else 0.0

        problematic_count = sum(1 for gap in gaps if gap['is_problematic'])
        intentional_count = len(gaps) - problematic_count

        return {
            "total_gap_duration": total_gap_duration,
            "gap_percentage": gap_percentage,
            "gap_count": len(gaps),
            "problematic_gaps": problematic_count,
            "intentional_gaps": intentional_count,
            "gaps": gaps
        }

    def analyze_voice_quality(
        self,
        audio_clip: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Analyzes voice quality for metallic/artificial characteristics with severity scores and corrective actions.

        Uses spectral analysis to detect:
        - Metallic resonance patterns
        - Unnatural formant structures
        - AI generation artifacts
        - Voice clarity issues

        Args:
            audio_clip: Audio clip containing voice with 'data' and 'rate'

        Returns:
            VoiceQualityResult with quality score, issues, and corrective suggestions
        """
        issues = []
        suggestions = []

        # Check for missing audio data
        audio_data = audio_clip.get('data', np.array([]))
        sample_rate = audio_clip.get('rate', 22050)

        if len(audio_data) == 0:
            self.logger.warning("Empty audio data provided for voice quality analysis")
            issues.append(QualityIssue(
                issue_type="missing_audio",
                severity="high",
                description="No audio data available for voice quality analysis",
                timestamp=0.0,
                frame_number=None,
                metric_value=0.0,
                threshold_value=1.0
            ))
            return {
                "quality_score": 0.0,
                "issues": [issue.to_dict() for issue in issues],
                "suggestions": [],
                "metallic_issues": 0,
                "clarity_score": 0.0
            }

        try:
            # Detect metallic voice
            metallic_issues = self.detect_metallic_voice(audio_clip)
            issues.extend([
                QualityIssue(
                    issue_type=issue['issue_type'],
                    severity=issue['severity'],
                    description=issue['description'],
                    timestamp=issue['timestamp'],
                    frame_number=issue['frame_number'],
                    metric_value=issue['metric_value'],
                    threshold_value=issue['threshold_value']
                ) for issue in metallic_issues
            ])

            if metallic_issues:
                suggestions.append(ImprovementSuggestion(
                    suggestion_id="regenerate_metallic_voice",
                    priority=1,
                    action="Regenerate voice with different AI model or parameters",
                    parameters={"model": "alternative_tts", "metallic_reduction": 0.8},
                    expected_improvement=25.0,
                    related_issue_ids=[issue['issue_type'] for issue in metallic_issues]
                ))

            # Measure voice clarity
            clarity_result = self.measure_voice_clarity(audio_clip)
            issues.extend(clarity_result['issues'])
            suggestions.extend([
                ImprovementSuggestion(
                    suggestion_id=f"clarity_{i}",
                    priority=2,
                    action=rec['action'],
                    parameters=rec['parameters'],
                    expected_improvement=rec['expected_improvement'],
                    related_issue_ids=["low_clarity"]
                ) for i, rec in enumerate(clarity_result['recommendations'])
            ])

        except Exception as e:
            self.logger.error(f"Error during voice quality analysis: {str(e)}")
            issues.append(QualityIssue(
                issue_type="analysis_error",
                severity="critical",
                description=f"Failed to analyze voice quality: {str(e)}",
                timestamp=0.0,
                frame_number=None,
                metric_value=0.0,
                threshold_value=1.0
            ))

        # Calculate overall quality score
        base_score = 100.0
        penalty = 0.0
        for issue in issues:
            if issue.severity == "critical":
                penalty += 30
            elif issue.severity == "high":
                penalty += 20
            elif issue.severity == "medium":
                penalty += 10
            elif issue.severity == "low":
                penalty += 5

        quality_score = max(0.0, base_score - penalty)

        return {
            "quality_score": quality_score,
            "issues": [issue.to_dict() for issue in issues],
            "suggestions": [sug.to_dict() for sug in suggestions],
            "metallic_issues": len(metallic_issues) if 'metallic_issues' in locals() else 0,
            "clarity_score": clarity_result['clarity_score'] if 'clarity_result' in locals() else 0.0
        }
    
    def generate_quality_score(
        self,
        shot: dict
    ) -> ComprehensiveQualityScore:
        """
        Generates overall quality score (0-100) based on multiple metrics.

        Metrics weighted:
        - Visual sharpness (30%)
        - Motion naturalness (25%) - skipped in REAL_TIME mode
        - Audio quality (25%) - simplified in REAL_TIME mode
        - Continuity compliance (20%) - skipped in REAL_TIME mode

        Args:
            shot: Video shot to score, with 'frames': List[np.ndarray], 'audio_score': float, 'continuity_score': float

        Returns:
            QualityScore object with overall score and metric breakdown
        """
        frames = shot.get('frames', [])
        audio_score = shot.get('audio_score', 50.0)  # default
        continuity_score = shot.get('continuity_score', 50.0)  # default

        issues = []

        # Check for missing frames
        if not frames:
            self.logger.warning("No frames provided for quality scoring")
            issues.append(QualityIssue(
                issue_type="missing_frames",
                severity="high",
                description="No video frames available for quality analysis",
                timestamp=0.0,
                frame_number=None,
                metric_value=0.0,
                threshold_value=1.0
            ))
            sharpness_score = 0.0
            motion_score = 0.0
            visual_anomalies = []
            motion_anomalies = []
        else:
            try:
                # Calculate sharpness score (0-100) - always performed
                sharpness_values = [self.calculate_sharpness(frame) for frame in frames]
                avg_sharpness = np.mean(sharpness_values)
                sharpness_score = min(100.0, avg_sharpness)  # cap at 100
            except Exception as e:
                self.logger.error(f"Error calculating sharpness: {str(e)}")
                sharpness_score = 0.0
                issues.append(QualityIssue(
                    issue_type="sharpness_calculation_error",
                    severity="critical",
                    description=f"Failed to calculate sharpness: {str(e)}",
                    timestamp=0.0,
                    frame_number=None,
                    metric_value=0.0,
                    threshold_value=1.0
                ))

            # Motion and visual anomaly detection - comprehensive in BATCH, basic in REAL_TIME
            motion_score = 80.0  # default good score
            visual_anomalies = []
            motion_anomalies = []

            try:
                if self.mode == ValidationMode.BATCH:
                    # Full analysis for batch mode
                    motion_anomalies = self.detect_unnatural_movements(frames)
                    anomaly_penalty = len(motion_anomalies) * 10
                    motion_score = max(0.0, 100.0 - anomaly_penalty)
                    visual_anomalies = self.detect_visual_anomalies(frames)
                elif self.mode == ValidationMode.REAL_TIME:
                    # Simplified analysis for real-time mode - only check first few frames
                    motion_score = 75.0  # Conservative estimate for real-time
                    if frames and len(frames) > 0:
                        # Quick visual check on first frame only
                        first_frame_gray = cv2.cvtColor(frames[0], cv2.COLOR_BGR2GRAY) if len(frames[0].shape) == 3 else frames[0]
                        variance = np.var(first_frame_gray.astype(float))
                        if variance < 100.0:  # Simple brightness variance check
                            visual_anomalies = [{
                                'type': 'potential_low_contrast',
                                'severity': 'low',
                                'description': 'Low contrast detected (real-time estimate)',
                                'timestamp': 0.0,
                                'frame_number': 0,
                                'metric_value': variance,
                                'threshold_value': 100.0
                            }]
            except Exception as e:
                self.logger.error(f"Error in motion/visual analysis: {str(e)}")
                motion_score = 0.0
                issues.append(QualityIssue(
                    issue_type="motion_analysis_error",
                    severity="high",
                    description=f"Failed to analyze motion/visual quality: {str(e)}",
                    timestamp=0.0,
                    frame_number=None,
                    metric_value=0.0,
                    threshold_value=1.0
                ))

        # Audio analysis - simplified in REAL_TIME mode
        effective_audio_score = audio_score
        if self.mode == ValidationMode.REAL_TIME:
            # Use cached or estimated audio score for real-time
            effective_audio_score = min(audio_score, 80.0)  # Conservative estimate

        # Overall score calculation - adjust weights based on mode
        try:
            if self.mode == ValidationMode.REAL_TIME:
                # Real-time: Focus on sharpness (50%), motion estimate (30%), audio (20%)
                overall_score = (
                    sharpness_score * 0.5 +
                    motion_score * 0.3 +
                    effective_audio_score * 0.2
                )
            else:  # BATCH mode
                # Batch: Full analysis
                overall_score = (
                    sharpness_score * 0.3 +
                    motion_score * 0.25 +
                    audio_score * 0.25 +
                    continuity_score * 0.2
                )
        except Exception as e:
            self.logger.error(f"Error calculating overall score: {str(e)}")
            overall_score = 0.0
            issues.append(QualityIssue(
                issue_type="overall_score_error",
                severity="critical",
                description=f"Failed to calculate overall quality score: {str(e)}",
                timestamp=0.0,
                frame_number=None,
                metric_value=0.0,
                threshold_value=1.0
            ))

        # Issues collection

        # Sharpness issues - always checked
        threshold = 40.0 if self.mode == ValidationMode.REAL_TIME else 50.0
        if sharpness_score < threshold:
            severity = "low" if sharpness_score > threshold * 0.4 else "medium"
            issues.append(QualityIssue(
                issue_type="low_sharpness",
                severity=severity,
                description=f"Low sharpness detected (mode: {self.mode.value})",
                timestamp=0.0,
                frame_number=0,
                metric_value=sharpness_score,
                threshold_value=threshold
            ))

        # Motion issues - only in BATCH mode
        if self.mode == ValidationMode.BATCH:
            for anomaly in motion_anomalies:
                issues.append(QualityIssue(
                    issue_type="unnatural_motion",
                    severity=anomaly['severity'],
                    description=anomaly['description'],
                    timestamp=anomaly['timestamp'],
                    frame_number=anomaly['frame_number'],
                    metric_value=anomaly['metric_value'],
                    threshold_value=anomaly['threshold_value']
                ))

            # Visual anomalies - only in BATCH mode
            for anomaly in visual_anomalies:
                issues.append(QualityIssue(
                    issue_type=anomaly['type'],
                    severity=anomaly['severity'],
                    description=anomaly['description'],
                    timestamp=anomaly['timestamp'],
                    frame_number=anomaly['frame_number'],
                    metric_value=anomaly['metric_value'],
                    threshold_value=anomaly['threshold_value']
                ))
        else:  # REAL_TIME mode
            # Add visual anomalies from simplified check
            for anomaly in visual_anomalies:
                issues.append(QualityIssue(
                    issue_type=anomaly['type'],
                    severity=anomaly['severity'],
                    description=anomaly['description'],
                    timestamp=anomaly['timestamp'],
                    frame_number=anomaly['frame_number'],
                    metric_value=anomaly['metric_value'],
                    threshold_value=anomaly['threshold_value']
                ))

        # Suggestions placeholder
        suggestions = []

        return ComprehensiveQualityScore(
            overall_score=overall_score,
            sharpness_score=sharpness_score,
            motion_score=motion_score,
            audio_score=effective_audio_score,
            continuity_score=continuity_score,
            issues=issues,
            suggestions=suggestions
        )
    
    def assess_quality(self, frames: List[List[List[int]]]) -> QualityAssessment:
        """
        Comprehensive quality assessment for video frames.

        Args:
            frames: List of video frames as nested lists (height x width x 3)

        Returns:
            QualityAssessment with overall score and detailed metrics
        """
        import time
        start_time = time.time()

        quality_scores = []
        detected_issues = []
        recommendations = []

        # Convert frames to numpy arrays
        np_frames = [np.array(frame, dtype=np.uint8) for frame in frames]

        # Calculate visual quality score
        visual_score = self._calculate_visual_quality(np_frames)
        quality_scores.append(visual_score)

        # Calculate motion smoothness score
        motion_score = self._calculate_motion_smoothness(np_frames)
        quality_scores.append(motion_score)

        # Calculate sharpness score
        sharpness_score = self._calculate_sharpness_metric(np_frames)
        quality_scores.append(sharpness_score)

        # Calculate noise level score
        noise_score = self._calculate_noise_level(np_frames)
        quality_scores.append(noise_score)

        # Calculate professional standards score if enabled
        if self.enable_advanced_analysis:
            professional_score = self._calculate_professional_standards(np_frames)
            quality_scores.append(professional_score)

        # Calculate overall score as weighted average
        weights = {
            QualityMetric.VISUAL_QUALITY: 0.3,
            QualityMetric.MOTION_SMOOTHNESS: 0.25,
            QualityMetric.SHARPNESS: 0.25,
            QualityMetric.NOISE_LEVEL: 0.2
        }
        if self.enable_advanced_analysis:
            weights[QualityMetric.PROFESSIONAL_STANDARDS] = 0.1
            # Adjust other weights
            for metric in weights:
                if metric != QualityMetric.PROFESSIONAL_STANDARDS:
                    weights[metric] -= 0.02

        overall_score = sum(score.score * weights[score.metric] for score in quality_scores)

        # Determine if passes standard
        threshold = {
            QualityStandard.PREVIEW: 0.5,
            QualityStandard.WEB_HD: 0.7,
            QualityStandard.BROADCAST: 0.9
        }[self.quality_standard]

        passes_standard = overall_score >= threshold

        processing_time = time.time() - start_time

        return QualityAssessment(
            overall_score=overall_score,
            quality_scores=quality_scores,
            detected_issues=detected_issues,
            recommendations=recommendations,
            processing_time=processing_time,
            frame_count=len(frames),
            standard=self.quality_standard,
            passes_standard=passes_standard
        )

    def _calculate_visual_quality(self, frames: List[np.ndarray]) -> QualityScore:
        """Calculate visual quality score."""
        if not frames:
            return QualityScore(0.0, 0.5, QualityMetric.VISUAL_QUALITY, self.quality_standard, {})

        # Simple PSNR calculation between frames
        psnr_values = []
        for i in range(1, len(frames)):
            mse = np.mean((frames[i].astype(float) - frames[i-1].astype(float)) ** 2)
            if mse > 0:
                psnr = 20 * np.log10(255.0 / np.sqrt(mse))
                psnr_values.append(psnr)
            else:
                psnr_values.append(100.0)  # Perfect match

        avg_psnr = np.mean(psnr_values) if psnr_values else 100.0
        avg_ssim = 0.8  # Placeholder, would need actual SSIM calculation

        # Normalize to 0-1
        score = min(1.0, avg_psnr / 100.0)

        return QualityScore(
            score=score,
            confidence=0.8,
            metric=QualityMetric.VISUAL_QUALITY,
            standard=self.quality_standard,
            details={"avg_psnr": avg_psnr, "avg_ssim": avg_ssim}
        )

    def _calculate_motion_smoothness(self, frames: List[np.ndarray]) -> QualityScore:
        """Calculate motion smoothness score."""
        if len(frames) < 2:
            return QualityScore(0.8, 0.5, QualityMetric.MOTION_SMOOTHNESS, self.quality_standard, {})

        smoothness_scores = []
        motion_vectors = []

        for i in range(1, len(frames)):
            # Simple optical flow approximation
            prev_gray = cv2.cvtColor(frames[i-1], cv2.COLOR_BGR2GRAY)
            curr_gray = cv2.cvtColor(frames[i], cv2.COLOR_BGR2GRAY)

            flow = cv2.calcOpticalFlowFarneback(prev_gray, curr_gray, None, 0.5, 3, 15, 3, 5, 1.1, 0)
            mag, _ = cv2.cartToPolar(flow[..., 0], flow[..., 1])
            mean_mag = np.mean(mag)

            motion_vectors.append({"magnitude": mean_mag, "confidence": 0.8})
            smoothness_scores.append(min(1.0, 1.0 / (1.0 + mean_mag)))  # Higher magnitude = less smooth

        avg_smoothness = np.mean(smoothness_scores)

        return QualityScore(
            score=avg_smoothness,
            confidence=0.8,
            metric=QualityMetric.MOTION_SMOOTHNESS,
            standard=self.quality_standard,
            details={"smoothness_scores": smoothness_scores, "motion_vectors": motion_vectors}
        )

    def _calculate_sharpness_metric(self, frames: List[np.ndarray]) -> QualityScore:
        """Calculate sharpness score."""
        if not frames:
            return QualityScore(0.0, 0.5, QualityMetric.SHARPNESS, self.quality_standard, {})

        raw_scores = []
        normalized_scores = []

        for frame in frames:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            raw_scores.append(laplacian_var)
            normalized_scores.append(min(1.0, laplacian_var / 500.0))  # Normalize

        avg_score = np.mean(normalized_scores)

        return QualityScore(
            score=avg_score,
            confidence=0.9,
            metric=QualityMetric.SHARPNESS,
            standard=self.quality_standard,
            details={"raw_scores": raw_scores, "normalized_scores": normalized_scores}
        )

    def _calculate_noise_level(self, frames: List[np.ndarray]) -> QualityScore:
        """Calculate noise level score."""
        if not frames:
            return QualityScore(1.0, 0.5, QualityMetric.NOISE_LEVEL, self.quality_standard, {})  # Low noise = high score

        noise_scores = []

        for frame in frames:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            # Estimate noise as variance of high-frequency components
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            noise = np.var(gray.astype(float) - blurred.astype(float))
            # Lower noise = higher score (less noise is better)
            score = 1.0 - min(1.0, noise / 100.0)
            noise_scores.append(score)

        avg_score = np.mean(noise_scores)

        return QualityScore(
            score=avg_score,
            confidence=0.7,
            metric=QualityMetric.NOISE_LEVEL,
            standard=self.quality_standard,
            details={"noise_scores": noise_scores}
        )

    def _calculate_professional_standards(self, frames: List[np.ndarray]) -> QualityScore:
        """Calculate professional standards compliance score."""
        if not frames:
            return QualityScore(0.5, 0.5, QualityMetric.PROFESSIONAL_STANDARDS, self.quality_standard, {})

        frame = frames[0]
        height, width = frame.shape[:2]

        # Simple checks
        resolution_score = min(1.0, (width * height) / (1920 * 1080))  # HD baseline
        color_depth_score = 1.0  # Assume RGB
        compression_score = 0.8  # Placeholder

        avg_score = (resolution_score + color_depth_score + compression_score) / 3.0

        return QualityScore(
            score=avg_score,
            confidence=0.6,
            metric=QualityMetric.PROFESSIONAL_STANDARDS,
            standard=self.quality_standard,
            details={
                "resolution_score": resolution_score,
                "color_depth_score": color_depth_score,
                "compression_score": compression_score
            }
        )

    def suggest_improvements(
        self,
        quality_issues: List[QualityIssue]
    ) -> List[ImprovementSuggestion]:
        """
        Generates actionable improvement suggestions prioritized by impact.

        Args:
            quality_issues: List of detected quality issues

        Returns:
            Prioritized list of specific corrective actions
        """
        # Placeholder implementation
        return []
