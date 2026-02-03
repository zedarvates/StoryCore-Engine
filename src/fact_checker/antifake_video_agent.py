"""
Anti-Fake Video Agent

This module provides the Anti-Fake Video Agent for video transcript analysis.
The agent orchestrates the complete analysis pipeline from transcript parsing
through manipulation detection to final report generation.

Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
"""

import time
import re
import hashlib
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime

from .models import ManipulationSignal, Report, Configuration


class AntiFakeVideoAgent:
    """
    Anti-Fake Video Agent for video transcript analysis.
    
    This agent orchestrates the complete analysis pipeline:
    1. Parsing: Extract transcript text and timestamps
    2. Manipulation Detection: Identify logical inconsistencies, emotional manipulation, narrative bias
    3. Coherence Analysis: Evaluate logical flow and consistency
    4. Integrity Scoring: Assess journalistic integrity
    5. Risk Assessment: Assign risk levels based on findings
    6. Reporting: Generate structured and human-readable outputs
    
    The agent follows safety constraints:
    - No intention attribution
    - No political judgments
    - No medical advice
    - Explicit uncertainty acknowledgment
    
    Attributes:
        config: Configuration settings for the agent
    """
    
    def __init__(self, config: Optional[Configuration] = None):
        """
        Initializes the Anti-Fake Video Agent.
        
        Args:
            config: Optional configuration settings. If not provided,
                   uses default configuration.
        """
        self.config = config or Configuration()
    
    def analyze(
        self,
        transcript: str,
        timestamps: Optional[List[Dict[str, Any]]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Report:
        """
        Analyzes video transcript and generates a complete verification report.
        
        This is the main entry point for the agent. It executes the full
        pipeline and returns a comprehensive report with both structured
        data and human-readable summary.
        
        Args:
            transcript: Video transcript text to analyze
            timestamps: Optional list of timestamp data with format:
                       [{"start": "00:00:10", "end": "00:00:15", "text": "..."}]
            metadata: Optional metadata about the video (source, duration, etc.)
            
        Returns:
            Report object with analysis results and recommendations
            
        Raises:
            ValueError: If transcript is empty or invalid
            
        Examples:
            >>> agent = AntiFakeVideoAgent()
            >>> transcript = "This is a test transcript with some content."
            >>> report = agent.analyze(transcript)
            >>> report.metadata['agent'] == 'antifake_video'
            True
        """
        start_time = time.time()
        
        # Step 1: Parsing - Extract and validate transcript
        parsed_data = self._parse_transcript(transcript, timestamps, metadata)
        
        # Step 2: Manipulation Detection - Identify manipulation signals
        manipulation_signals = self._detect_manipulation_signals(
            parsed_data['text'],
            parsed_data['segments']
        )
        
        # Step 3: Coherence Analysis - Evaluate logical consistency
        coherence_score = self._analyze_coherence(
            parsed_data['text'],
            parsed_data['segments']
        )
        
        # Step 4: Integrity Scoring - Assess journalistic integrity
        integrity_score = self._score_integrity(
            parsed_data['text'],
            manipulation_signals,
            coherence_score
        )
        
        # Step 5: Risk Assessment - Assign risk level
        risk_level = self._assess_risk(
            manipulation_signals,
            coherence_score,
            integrity_score
        )
        
        # Step 6: Reporting - Generate final report
        processing_time_ms = int((time.time() - start_time) * 1000)
        report = self._generate_report(
            transcript,
            manipulation_signals,
            coherence_score,
            integrity_score,
            risk_level,
            parsed_data,
            processing_time_ms
        )
        
        return report
    
    def _parse_transcript(
        self,
        transcript: str,
        timestamps: Optional[List[Dict[str, Any]]],
        metadata: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Parses and validates transcript data.
        
        Extracts:
        - Clean transcript text
        - Timestamp segments
        - Metadata information
        
        Args:
            transcript: Raw transcript text
            timestamps: Optional timestamp data
            metadata: Optional video metadata
            
        Returns:
            Dictionary with parsed data
            
        Raises:
            ValueError: If transcript is empty or invalid
        """
        if not transcript or not transcript.strip():
            raise ValueError("Transcript cannot be empty")
        
        # Normalize whitespace
        text = " ".join(transcript.split())
        
        # Check length constraints
        max_length = 100000  # ~10000 words
        if len(text) > max_length:
            raise ValueError(
                f"Transcript exceeds maximum length of {max_length} characters. "
                f"Provided: {len(text)} characters."
            )
        
        # Parse timestamp segments
        segments = self._parse_timestamp_segments(text, timestamps)
        
        # Extract duration if available
        duration_seconds = None
        if metadata and 'duration_seconds' in metadata:
            duration_seconds = metadata['duration_seconds']
        elif segments:
            # Try to extract from last timestamp
            last_segment = segments[-1]
            if last_segment.get('end'):
                duration_seconds = self._timestamp_to_seconds(last_segment['end'])
        
        print(f"[Anti-Fake Video Agent] Parsed transcript: {len(text)} chars, {len(segments)} segments")
        
        return {
            'text': text,
            'segments': segments,
            'metadata': metadata or {},
            'duration_seconds': duration_seconds
        }
    
    def _parse_timestamp_segments(
        self,
        text: str,
        timestamps: Optional[List[Dict[str, Any]]]
    ) -> List[Dict[str, Any]]:
        """
        Parses timestamp segments from transcript.
        
        If timestamps are provided, uses them directly.
        Otherwise, attempts to extract timestamps from text.
        
        Args:
            text: Transcript text
            timestamps: Optional timestamp data
            
        Returns:
            List of segment dictionaries with start, end, and text
        """
        if timestamps:
            return timestamps
        
        # Try to extract timestamps from text (format: [00:00:10] text)
        segments = []
        pattern = r'\[(\d{2}:\d{2}:\d{2})\]\s*([^\[]+)'
        matches = re.finditer(pattern, text)
        
        for match in matches:
            timestamp = match.group(1)
            segment_text = match.group(2).strip()
            segments.append({
                'start': timestamp,
                'end': None,  # End time not available in this format
                'text': segment_text
            })
        
        return segments
    
    def _timestamp_to_seconds(self, timestamp: str) -> float:
        """
        Converts timestamp string to seconds.
        
        Supports formats: HH:MM:SS, MM:SS, or SS
        
        Args:
            timestamp: Timestamp string
            
        Returns:
            Time in seconds
        """
        parts = timestamp.split(':')
        
        if len(parts) == 3:  # HH:MM:SS
            hours, minutes, seconds = map(float, parts)
            return hours * 3600 + minutes * 60 + seconds
        elif len(parts) == 2:  # MM:SS
            minutes, seconds = map(float, parts)
            return minutes * 60 + seconds
        else:  # SS
            return float(parts[0])
    
    def _detect_manipulation_signals(
        self,
        text: str,
        segments: List[Dict[str, Any]]
    ) -> List[ManipulationSignal]:
        """
        Detects manipulation signals in the transcript.
        
        Identifies three types of manipulation:
        1. Logical inconsistencies
        2. Emotional manipulation
        3. Narrative bias
        
        Args:
            text: Transcript text
            segments: Timestamp segments
            
        Returns:
            List of ManipulationSignal objects
        """
        signals = []
        
        # Detect logical inconsistencies
        logical_signals = self._detect_logical_inconsistencies(text, segments)
        signals.extend(logical_signals)
        
        # Detect emotional manipulation
        emotional_signals = self._detect_emotional_manipulation(text, segments)
        signals.extend(emotional_signals)
        
        # Detect narrative bias
        bias_signals = self._detect_narrative_bias(text, segments)
        signals.extend(bias_signals)
        
        print(f"[Anti-Fake Video Agent] Detected {len(signals)} manipulation signal(s)")
        
        return signals
    
    def _detect_logical_inconsistencies(
        self,
        text: str,
        segments: List[Dict[str, Any]]
    ) -> List[ManipulationSignal]:
        """
        Detects logical inconsistencies in the transcript.
        
        Looks for:
        - Contradictory statements
        - Unsupported conclusions
        - Circular reasoning
        - False dichotomies
        
        Args:
            text: Transcript text
            segments: Timestamp segments
            
        Returns:
            List of logical inconsistency signals
        """
        signals = []
        
        # Pattern: Contradictory statements
        contradiction_patterns = [
            (r'(never|always|all|none|no one)', r'(sometimes|occasionally|some|few)'),
            (r'(impossible|cannot|will not)', r'(possible|can|will|might)'),
            (r'(definitely|certainly|absolutely)', r'(maybe|perhaps|possibly)')
        ]
        
        text_lower = text.lower()
        
        for pattern1, pattern2 in contradiction_patterns:
            if re.search(pattern1, text_lower) and re.search(pattern2, text_lower):
                # Find approximate location
                match1 = re.search(pattern1, text_lower)
                match2 = re.search(pattern2, text_lower)
                
                if match1 and match2:
                    # Create signal
                    signal = ManipulationSignal(
                        type="logical_inconsistency",
                        severity="medium",
                        description="Potential contradictory statements detected using absolute and qualified language",
                        evidence=f"Found both absolute terms ('{match1.group()}') and qualifying terms ('{match2.group()}')",
                        confidence=60.0
                    )
                    
                    # Try to add timestamps if available
                    if segments:
                        segment_idx = self._find_segment_for_position(match1.start(), text, segments)
                        if segment_idx is not None and segment_idx < len(segments):
                            signal.timestamp_start = segments[segment_idx].get('start')
                            signal.timestamp_end = segments[segment_idx].get('end')
                    
                    signals.append(signal)
                    break  # Only report one contradiction per pattern type
        
        return signals
    
    def _detect_emotional_manipulation(
        self,
        text: str,
        segments: List[Dict[str, Any]]
    ) -> List[ManipulationSignal]:
        """
        Detects emotional manipulation patterns in the transcript.
        
        Looks for:
        - Fear-based language
        - Excessive emotional appeals
        - Loaded language
        - Sensationalism
        
        Args:
            text: Transcript text
            segments: Timestamp segments
            
        Returns:
            List of emotional manipulation signals
        """
        signals = []
        
        # Emotional manipulation keywords
        fear_words = ['terrifying', 'horrifying', 'devastating', 'catastrophic', 'nightmare', 'disaster']
        loaded_words = ['shocking', 'outrageous', 'unbelievable', 'incredible', 'amazing', 'stunning']
        
        text_lower = text.lower()
        
        # Count emotional words
        fear_count = sum(1 for word in fear_words if word in text_lower)
        loaded_count = sum(1 for word in loaded_words if word in text_lower)
        
        total_words = len(text.split())
        emotional_density = (fear_count + loaded_count) / max(total_words, 1) * 100
        
        # If emotional density is high, flag it
        if emotional_density > 2.0:  # More than 2% emotional words
            severity = "high" if emotional_density > 5.0 else "medium"
            confidence = min(emotional_density * 10, 90.0)
            
            signal = ManipulationSignal(
                type="emotional_manipulation",
                severity=severity,
                description=f"High density of emotionally charged language detected ({emotional_density:.1f}% of words)",
                evidence=f"Found {fear_count} fear-based terms and {loaded_count} loaded terms in {total_words} words",
                confidence=confidence
            )
            
            signals.append(signal)
        
        return signals
    
    def _detect_narrative_bias(
        self,
        text: str,
        segments: List[Dict[str, Any]]
    ) -> List[ManipulationSignal]:
        """
        Detects narrative bias in the transcript.
        
        Looks for:
        - One-sided presentation
        - Lack of alternative perspectives
        - Selective evidence presentation
        - Framing bias
        
        Args:
            text: Transcript text
            segments: Timestamp segments
            
        Returns:
            List of narrative bias signals
        """
        signals = []
        
        # Check for one-sided language
        one_sided_patterns = [
            r'(obviously|clearly|undoubtedly|without question)',
            r'(everyone knows|it\'s obvious|no one disputes)',
            r'(the only|the truth is|the fact is)'
        ]
        
        text_lower = text.lower()
        one_sided_count = 0
        
        for pattern in one_sided_patterns:
            matches = re.findall(pattern, text_lower)
            one_sided_count += len(matches)
        
        # Check for lack of alternative perspectives
        alternative_indicators = ['however', 'on the other hand', 'alternatively', 'some argue', 'critics say']
        alternative_count = sum(1 for indicator in alternative_indicators if indicator in text_lower)
        
        # If high one-sided language and low alternative perspectives, flag bias
        if one_sided_count > 2 and alternative_count == 0:
            signal = ManipulationSignal(
                type="narrative_bias",
                severity="medium",
                description="One-sided narrative detected with lack of alternative perspectives",
                evidence=f"Found {one_sided_count} instances of absolute language with no counter-perspectives",
                confidence=70.0
            )
            
            signals.append(signal)
        
        return signals
    
    def _find_segment_for_position(
        self,
        char_position: int,
        text: str,
        segments: List[Dict[str, Any]]
    ) -> Optional[int]:
        """
        Finds the segment index for a character position in the text.
        
        Args:
            char_position: Character position in text
            text: Full transcript text
            segments: List of segments
            
        Returns:
            Segment index or None if not found
        """
        if not segments:
            return None
        
        # Simple heuristic: divide text into equal parts matching segment count
        chars_per_segment = len(text) / len(segments)
        segment_idx = int(char_position / chars_per_segment)
        
        return min(segment_idx, len(segments) - 1)
    
    def _analyze_coherence(
        self,
        text: str,
        segments: List[Dict[str, Any]]
    ) -> float:
        """
        Analyzes logical coherence of the transcript.
        
        Evaluates:
        - Logical flow between statements
        - Consistency of arguments
        - Clarity of reasoning
        
        Args:
            text: Transcript text
            segments: Timestamp segments
            
        Returns:
            Coherence score (0-100)
        """
        # Start with base score
        coherence_score = 70.0
        
        # Factor 1: Sentence structure and transitions
        sentences = text.split('.')
        transition_words = ['therefore', 'thus', 'consequently', 'because', 'since', 'as a result']
        transition_count = sum(1 for word in transition_words if word in text.lower())
        
        # More transitions generally indicate better logical flow
        transition_bonus = min(transition_count * 2, 15)
        coherence_score += transition_bonus
        
        # Factor 2: Repetition (too much repetition reduces coherence)
        words = text.lower().split()
        unique_words = set(words)
        repetition_ratio = len(unique_words) / max(len(words), 1)
        
        if repetition_ratio < 0.3:  # Very repetitive
            coherence_score -= 20
        elif repetition_ratio < 0.5:  # Somewhat repetitive
            coherence_score -= 10
        
        # Factor 3: Sentence length variation (good coherence has varied sentence lengths)
        sentence_lengths = [len(s.split()) for s in sentences if s.strip()]
        if sentence_lengths:
            avg_length = sum(sentence_lengths) / len(sentence_lengths)
            if 10 <= avg_length <= 25:  # Optimal range
                coherence_score += 10
        
        # Ensure score is in valid range
        coherence_score = max(0.0, min(100.0, coherence_score))
        
        print(f"[Anti-Fake Video Agent] Coherence score: {coherence_score:.1f}")
        
        return coherence_score
    
    def _score_integrity(
        self,
        text: str,
        manipulation_signals: List[ManipulationSignal],
        coherence_score: float
    ) -> float:
        """
        Scores journalistic integrity of the transcript.
        
        Evaluates:
        - Objectivity
        - Balance
        - Evidence-based claims
        - Transparency
        
        Args:
            text: Transcript text
            manipulation_signals: Detected manipulation signals
            coherence_score: Coherence score
            
        Returns:
            Integrity score (0-100)
        """
        # Start with coherence as base
        integrity_score = coherence_score * 0.5
        
        # Factor 1: Manipulation signals (reduce score)
        for signal in manipulation_signals:
            if signal.severity == "high":
                integrity_score -= 15
            elif signal.severity == "medium":
                integrity_score -= 10
            else:
                integrity_score -= 5
        
        # Factor 2: Source citations (increase score)
        citation_patterns = [
            r'according to',
            r'research shows',
            r'studies indicate',
            r'experts say',
            r'data suggests'
        ]
        
        text_lower = text.lower()
        citation_count = sum(1 for pattern in citation_patterns if re.search(pattern, text_lower))
        integrity_score += min(citation_count * 5, 25)
        
        # Factor 3: Balanced language
        balanced_indicators = ['however', 'although', 'while', 'despite', 'on the other hand']
        balanced_count = sum(1 for indicator in balanced_indicators if indicator in text_lower)
        integrity_score += min(balanced_count * 3, 15)
        
        # Ensure score is in valid range
        integrity_score = max(0.0, min(100.0, integrity_score))
        
        print(f"[Anti-Fake Video Agent] Integrity score: {integrity_score:.1f}")
        
        return integrity_score
    
    def _assess_risk(
        self,
        manipulation_signals: List[ManipulationSignal],
        coherence_score: float,
        integrity_score: float
    ) -> str:
        """
        Assesses overall risk level based on analysis results.
        
        Args:
            manipulation_signals: Detected manipulation signals
            coherence_score: Coherence score
            integrity_score: Integrity score
            
        Returns:
            Risk level: "low", "medium", "high", or "critical"
        """
        # Calculate composite score
        composite_score = (coherence_score + integrity_score) / 2
        
        # Count high-severity signals
        high_severity_count = sum(1 for s in manipulation_signals if s.severity == "high")
        
        # Determine risk level
        if composite_score < 30 or high_severity_count >= 3:
            risk_level = "critical"
        elif composite_score < 50 or high_severity_count >= 2:
            risk_level = "high"
        elif composite_score < 70 or high_severity_count >= 1:
            risk_level = "medium"
        else:
            risk_level = "low"
        
        print(f"[Anti-Fake Video Agent] Risk level: {risk_level}")
        
        return risk_level
    
    def _generate_report(
        self,
        transcript: str,
        manipulation_signals: List[ManipulationSignal],
        coherence_score: float,
        integrity_score: float,
        risk_level: str,
        parsed_data: Dict[str, Any],
        processing_time_ms: int
    ) -> Report:
        """
        Generates the final analysis report.
        
        Args:
            transcript: Original transcript
            manipulation_signals: Detected manipulation signals
            coherence_score: Coherence score
            integrity_score: Integrity score
            risk_level: Overall risk level
            parsed_data: Parsed transcript data
            processing_time_ms: Processing time in milliseconds
            
        Returns:
            Complete Report object
        """
        # Generate input hash
        input_hash = hashlib.sha256(transcript.encode()).hexdigest()
        
        # Create metadata
        metadata = {
            "timestamp": datetime.now().isoformat(),
            "version": "1.0",
            "input_hash": input_hash,
            "processing_time_ms": processing_time_ms,
            "agent": "antifake_video",
            "agent_version": "1.0"
        }
        
        # Add video metadata if available
        if parsed_data['metadata']:
            metadata['video_metadata'] = parsed_data['metadata']
        if parsed_data['duration_seconds']:
            metadata['duration_seconds'] = parsed_data['duration_seconds']
        
        # Identify problematic segments
        problematic_segments = self._identify_problematic_segments(
            manipulation_signals,
            parsed_data['segments']
        )
        
        # Generate human summary
        human_summary = self._generate_human_summary(
            manipulation_signals,
            coherence_score,
            integrity_score,
            risk_level
        )
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            manipulation_signals,
            coherence_score,
            integrity_score,
            risk_level
        )
        
        # Create summary statistics
        summary_statistics = {
            "total_manipulation_signals": len(manipulation_signals),
            "high_severity_count": sum(1 for s in manipulation_signals if s.severity == "high"),
            "coherence_score": coherence_score,
            "integrity_score": integrity_score,
            "risk_level": risk_level,
            "problematic_segments_count": len(problematic_segments)
        }
        
        # Create disclaimer
        disclaimer = (
            "This analysis is generated by an automated system and should be used as a "
            "preliminary assessment tool. Human review and editorial judgment are essential "
            "for final content decisions. The system does not attribute intentions, make "
            "political judgments, or provide definitive conclusions about content authenticity."
        )
        
        report = Report(
            metadata=metadata,
            claims=[],  # Video agent doesn't extract claims
            manipulation_signals=manipulation_signals,
            summary_statistics=summary_statistics,
            human_summary=human_summary,
            recommendations=recommendations,
            disclaimer=disclaimer
        )
        
        print(f"[Anti-Fake Video Agent] Analysis complete in {processing_time_ms}ms")
        
        return report
    
    def _identify_problematic_segments(
        self,
        manipulation_signals: List[ManipulationSignal],
        segments: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Identifies specific problematic segments with timestamps.
        
        Args:
            manipulation_signals: Detected manipulation signals
            segments: Timestamp segments
            
        Returns:
            List of problematic segment dictionaries
        """
        problematic = []
        
        for signal in manipulation_signals:
            if signal.timestamp_start:
                problematic.append({
                    "timestamp": signal.timestamp_start,
                    "issue": f"{signal.type}: {signal.description}",
                    "recommendation": self._get_segment_recommendation(signal)
                })
        
        return problematic
    
    def _get_segment_recommendation(self, signal: ManipulationSignal) -> str:
        """
        Generates recommendation for a specific manipulation signal.
        
        Args:
            signal: Manipulation signal
            
        Returns:
            Recommendation string
        """
        if signal.type == "logical_inconsistency":
            return "Review this segment for contradictory statements and ensure logical consistency."
        elif signal.type == "emotional_manipulation":
            return "Consider using more neutral language and reducing emotional appeals."
        elif signal.type == "narrative_bias":
            return "Add alternative perspectives and balance the narrative presentation."
        else:
            return "Review this segment for potential issues."
    
    def _generate_human_summary(
        self,
        manipulation_signals: List[ManipulationSignal],
        coherence_score: float,
        integrity_score: float,
        risk_level: str
    ) -> str:
        """
        Generates human-readable summary of the analysis.
        
        Args:
            manipulation_signals: Detected manipulation signals
            coherence_score: Coherence score
            integrity_score: Integrity score
            risk_level: Overall risk level
            
        Returns:
            Human-readable summary string
        """
        summary_parts = []
        
        # Overall assessment
        summary_parts.append(f"**Overall Risk Level: {risk_level.upper()}**\n")
        
        # Key findings
        summary_parts.append("**Key Findings:**")
        summary_parts.append(f"- Coherence Score: {coherence_score:.1f}/100")
        summary_parts.append(f"- Integrity Score: {integrity_score:.1f}/100")
        summary_parts.append(f"- Manipulation Signals Detected: {len(manipulation_signals)}\n")
        
        # Risk highlights
        if manipulation_signals:
            summary_parts.append("**Risk Highlights:**")
            
            # Group by type
            by_type = {}
            for signal in manipulation_signals:
                if signal.type not in by_type:
                    by_type[signal.type] = []
                by_type[signal.type].append(signal)
            
            for signal_type, signals in by_type.items():
                type_name = signal_type.replace('_', ' ').title()
                summary_parts.append(f"- {type_name}: {len(signals)} instance(s) detected")
        else:
            summary_parts.append("**Risk Highlights:**")
            summary_parts.append("- No significant manipulation signals detected")
        
        return "\n".join(summary_parts)
    
    def _generate_recommendations(
        self,
        manipulation_signals: List[ManipulationSignal],
        coherence_score: float,
        integrity_score: float,
        risk_level: str
    ) -> List[str]:
        """
        Generates actionable recommendations based on analysis.
        
        Args:
            manipulation_signals: Detected manipulation signals
            coherence_score: Coherence score
            integrity_score: Integrity score
            risk_level: Overall risk level
            
        Returns:
            List of recommendation strings
        """
        recommendations = []
        
        # Risk-based recommendations
        if risk_level == "critical":
            recommendations.append(
                "CRITICAL: This content requires substantial revision before publication. "
                "Consider complete rewrite or removal."
            )
        elif risk_level == "high":
            recommendations.append(
                "HIGH RISK: Significant issues detected. Thorough editorial review required "
                "before publication."
            )
        elif risk_level == "medium":
            recommendations.append(
                "MEDIUM RISK: Some concerns identified. Review and address flagged issues "
                "before publication."
            )
        else:
            recommendations.append(
                "LOW RISK: Content appears generally sound. Standard editorial review recommended."
            )
        
        # Specific recommendations based on signals
        signal_types = set(s.type for s in manipulation_signals)
        
        if "logical_inconsistency" in signal_types:
            recommendations.append(
                "Address logical inconsistencies: Review contradictory statements and ensure "
                "arguments follow clear logical progression."
            )
        
        if "emotional_manipulation" in signal_types:
            recommendations.append(
                "Reduce emotional manipulation: Replace emotionally charged language with "
                "neutral, fact-based descriptions."
            )
        
        if "narrative_bias" in signal_types:
            recommendations.append(
                "Balance narrative: Include alternative perspectives and avoid one-sided "
                "presentation of information."
            )
        
        # Score-based recommendations
        if coherence_score < 50:
            recommendations.append(
                "Improve coherence: Strengthen logical flow between statements and ensure "
                "clear transitions between ideas."
            )
        
        if integrity_score < 50:
            recommendations.append(
                "Enhance integrity: Add source citations, use balanced language, and ensure "
                "evidence-based claims."
            )
        
        return recommendations
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Returns statistics about the agent's configuration and capabilities.
        
        Returns:
            Dictionary with agent statistics
        """
        return {
            "agent_type": "antifake_video",
            "version": "1.0",
            "confidence_threshold": self.config.confidence_threshold,
            "timeout_seconds": self.config.timeout_seconds,
            "supported_manipulation_types": [
                "logical_inconsistency",
                "emotional_manipulation",
                "narrative_bias"
            ]
        }


def create_agent(config: Optional[Configuration] = None) -> AntiFakeVideoAgent:
    """
    Factory function to create an Anti-Fake Video Agent.
    
    Args:
        config: Optional configuration settings
        
    Returns:
        Configured AntiFakeVideoAgent instance
    """
    return AntiFakeVideoAgent(config)
