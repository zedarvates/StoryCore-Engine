"""
Fact Checker Command Interface

This module provides the unified command interface for the fact-checking system.
It handles mode parameter parsing, automatic input type detection, and routing
to the appropriate agent (Scientific Audit or Anti-Fake Video).

Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
"""

import time
import hashlib
from typing import Dict, Any, Optional, Union, Literal
from pathlib import Path

from .models import Configuration, Report
from .scientific_audit_agent import ScientificAuditAgent
from .antifake_video_agent import AntiFakeVideoAgent


# Type aliases for clarity
ModeType = Literal["text", "video", "auto"]
DetailLevelType = Literal["summary", "detailed", "full"]
OutputFormatType = Literal["json", "markdown", "pdf"]


class FactCheckerCommand:
    """
    Unified command interface for the fact-checking system.
    
    This class provides a single entry point for fact-checking operations,
    handling mode selection, input type detection, and agent routing.
    
    The command supports three modes:
    - text: Routes to Scientific Audit Agent for text analysis
    - video: Routes to Anti-Fake Video Agent for transcript analysis
    - auto: Automatically detects input type and routes appropriately
    
    Attributes:
        config: Configuration settings for the fact-checking system
        scientific_agent: Instance of Scientific Audit Agent
        video_agent: Instance of Anti-Fake Video Agent
    """
    
    def __init__(self, config: Optional[Configuration] = None):
        """
        Initializes the Fact Checker Command interface.
        
        Args:
            config: Optional configuration settings. If not provided,
                   uses default configuration.
        """
        self.config = config or Configuration()
        
        # Initialize both agents with shared configuration
        self.scientific_agent = ScientificAuditAgent(self.config)
        self.video_agent = AntiFakeVideoAgent(self.config)
    
    def execute(
        self,
        input_data: Union[str, Path],
        mode: ModeType = "auto",
        confidence_threshold: Optional[float] = None,
        detail_level: DetailLevelType = "detailed",
        output_format: OutputFormatType = "json",
        cache: bool = True
    ) -> Dict[str, Any]:
        """
        Executes fact-checking command with specified parameters.
        
        This is the main entry point for the command interface. It handles:
        1. Input validation and loading
        2. Mode-based routing (or auto-detection)
        3. Agent execution
        4. Response formatting
        
        Args:
            input_data: Input content as string or file path
            mode: Execution mode - "text", "video", or "auto" (default: "auto")
            confidence_threshold: Minimum confidence score (0-100). If provided,
                                 overrides configuration default.
            detail_level: Level of detail in output - "summary", "detailed", or "full"
            output_format: Output format - "json", "markdown", or "pdf"
            cache: Enable/disable result caching (default: True)
            
        Returns:
            Dictionary with unified response format containing:
            - status: "success" or "error"
            - mode: Actual mode used ("text" or "video")
            - agent: Agent that processed the request
            - report: Structured report from agent
            - summary: Human-readable summary
            - processing_time_ms: Processing time in milliseconds
            - cached: Whether result was retrieved from cache
            
        Raises:
            ValueError: If input is invalid or parameters are out of range
            FileNotFoundError: If input_data is a path that doesn't exist
            
        Examples:
            >>> command = FactCheckerCommand()
            >>> result = command.execute("Water boils at 100°C", mode="text")
            >>> result['status']
            'success'
            >>> result['mode']
            'text'
        """
        start_time = time.time()
        
        try:
            # Step 1: Load and validate input
            content = self._load_input(input_data)
            
            # Step 2: Apply parameter overrides
            if confidence_threshold is not None:
                self._validate_confidence_threshold(confidence_threshold)
                self.config.confidence_threshold = confidence_threshold
            
            # Step 3: Determine execution mode
            actual_mode = self._determine_mode(content, mode)
            
            # Step 4: Route to appropriate agent
            report = self._route_to_agent(content, actual_mode)
            
            # Step 5: Format response
            processing_time_ms = int((time.time() - start_time) * 1000)
            response = self._format_response(
                report=report,
                mode=actual_mode,
                processing_time_ms=processing_time_ms,
                cached=False,  # TODO: Implement caching in future task
                detail_level=detail_level,
                output_format=output_format
            )
            
            return response
            
        except Exception as e:
            # Return error response
            processing_time_ms = int((time.time() - start_time) * 1000)
            return self._format_error_response(str(e), processing_time_ms)
    
    def _load_input(self, input_data: Union[str, Path]) -> str:
        """
        Loads input content from string or file.
        
        Args:
            input_data: Input as string or file path
            
        Returns:
            Content string
            
        Raises:
            ValueError: If input is empty
            FileNotFoundError: If file path doesn't exist
        """
        # If input is a Path object or looks like a file path
        if isinstance(input_data, Path) or (
            isinstance(input_data, str) and 
            (input_data.endswith('.txt') or input_data.endswith('.json'))
        ):
            path = Path(input_data)
            
            if not path.exists():
                raise FileNotFoundError(f"Input file not found: {path}")
            
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
        else:
            # Treat as direct string input
            content = str(input_data)
        
        # Validate non-empty
        if not content or not content.strip():
            raise ValueError("Input content cannot be empty")
        
        return content
    
    def _validate_confidence_threshold(self, threshold: float) -> None:
        """
        Validates confidence threshold parameter.
        
        Args:
            threshold: Confidence threshold value
            
        Raises:
            ValueError: If threshold is out of valid range [0, 100]
        """
        if not 0 <= threshold <= 100:
            raise ValueError(
                f"Confidence threshold must be between 0 and 100. "
                f"Provided: {threshold}"
            )
    
    def _determine_mode(self, content: str, mode: ModeType) -> Literal["text", "video"]:
        """
        Determines the execution mode based on input and mode parameter.
        
        For "auto" mode, analyzes content to detect whether it's a text
        document or video transcript.
        
        Args:
            content: Input content
            mode: Requested mode ("text", "video", or "auto")
            
        Returns:
            Actual mode to use ("text" or "video")
        """
        if mode == "text":
            return "text"
        elif mode == "video":
            return "video"
        elif mode == "auto":
            return self._auto_detect_input_type(content)
        else:
            raise ValueError(f"Invalid mode: {mode}. Must be 'text', 'video', or 'auto'")
    
    def _auto_detect_input_type(self, content: str) -> Literal["text", "video"]:
        """
        Automatically detects whether content is text or video transcript.
        
        Detection heuristics:
        - Presence of timestamp patterns ([00:00:10], 00:00:10, etc.)
        - Keywords like "transcript", "video", "speaker"
        - Structural patterns typical of transcripts
        
        Args:
            content: Input content to analyze
            
        Returns:
            Detected type: "text" or "video"
        """
        content_lower = content.lower()
        
        # Check for timestamp patterns
        import re
        
        # Pattern 1: [HH:MM:SS] or [MM:SS]
        timestamp_pattern1 = r'\[\d{1,2}:\d{2}(?::\d{2})?\]'
        
        # Pattern 2: HH:MM:SS or MM:SS at start of line
        timestamp_pattern2 = r'^\d{1,2}:\d{2}(?::\d{2})?'
        
        # Pattern 3: Timecode format
        timestamp_pattern3 = r'\d{1,2}:\d{2}(?::\d{2})?\s*-\s*\d{1,2}:\d{2}(?::\d{2})?'
        
        timestamp_matches = (
            len(re.findall(timestamp_pattern1, content)) +
            len(re.findall(timestamp_pattern2, content, re.MULTILINE)) +
            len(re.findall(timestamp_pattern3, content))
        )
        
        # Check for transcript-specific keywords
        transcript_keywords = [
            'transcript',
            'video transcript',
            'speaker:',
            'narrator:',
            '[music]',
            '[applause]',
            '[laughter]'
        ]
        
        keyword_matches = sum(1 for keyword in transcript_keywords if keyword in content_lower)
        
        # Decision logic
        # If we find multiple timestamps or transcript keywords, classify as video
        if timestamp_matches >= 3 or keyword_matches >= 2:
            print(f"[Fact Checker Command] Auto-detected input type: video (timestamps: {timestamp_matches}, keywords: {keyword_matches})")
            return "video"
        
        # Default to text for general content
        print(f"[Fact Checker Command] Auto-detected input type: text")
        return "text"
    
    def _route_to_agent(self, content: str, mode: Literal["text", "video"]) -> Report:
        """
        Routes content to the appropriate agent based on mode.
        
        Args:
            content: Input content
            mode: Execution mode ("text" or "video")
            
        Returns:
            Report from the selected agent
        """
        if mode == "text":
            print(f"[Fact Checker Command] Routing to Scientific Audit Agent")
            return self.scientific_agent.analyze(content)
        else:  # mode == "video"
            print(f"[Fact Checker Command] Routing to Anti-Fake Video Agent")
            return self.video_agent.analyze(content)
    
    def _format_response(
        self,
        report: Report,
        mode: Literal["text", "video"],
        processing_time_ms: int,
        cached: bool,
        detail_level: DetailLevelType,
        output_format: OutputFormatType
    ) -> Dict[str, Any]:
        """
        Formats the agent report into unified response format.
        
        Args:
            report: Report from agent
            mode: Mode used for processing
            processing_time_ms: Total processing time
            cached: Whether result was cached
            detail_level: Requested detail level
            output_format: Requested output format
            
        Returns:
            Unified response dictionary
        """
        # Determine which agent was used
        agent = report.metadata.get("agent", mode)
        
        # Apply detail level filtering
        filtered_report = self._apply_detail_level(report, detail_level)
        
        # Format report according to output format
        formatted_report = self._apply_output_format(filtered_report, output_format)
        
        response = {
            "status": "success",
            "mode": mode,
            "agent": agent,
            "report": formatted_report,
            "summary": report.human_summary,
            "processing_time_ms": processing_time_ms,
            "cached": cached
        }
        
        return response
    
    def _apply_detail_level(self, report: Report, detail_level: DetailLevelType) -> Report:
        """
        Applies detail level filtering to report.
        
        Args:
            report: Original report
            detail_level: Requested detail level
            
        Returns:
            Filtered report
        """
        if detail_level == "summary":
            # Return only summary statistics and human summary
            # Keep metadata and summary, remove detailed claims/signals
            report.claims = []
            report.manipulation_signals = []
        elif detail_level == "detailed":
            # Return standard level (no filtering)
            pass
        elif detail_level == "full":
            # Return everything including all evidence details
            # Already included by default
            pass
        
        return report
    
    def _apply_output_format(
        self,
        report: Report,
        output_format: OutputFormatType
    ) -> Union[Dict[str, Any], str, bytes]:
        """
        Applies output format to report.
        
        Args:
            report: Report to format
            output_format: Requested format
            
        Returns:
            Formatted report (dict for JSON, string for markdown, bytes for PDF)
        """
        if output_format == "json":
            # Return as dictionary (will be JSON serialized by caller)
            return self._report_to_dict(report)
        elif output_format == "markdown":
            # Convert to markdown format
            from .report_generation import export_report_markdown
            return export_report_markdown(report)
        elif output_format == "pdf":
            # Convert to PDF format
            from .report_generation import export_report_pdf
            return export_report_pdf(report)
        else:
            raise ValueError(f"Invalid output format: {output_format}")
    
    def _report_to_dict(self, report: Report) -> Dict[str, Any]:
        """
        Converts Report object to dictionary.
        
        Args:
            report: Report object
            
        Returns:
            Dictionary representation
        """
        return {
            "metadata": report.metadata,
            "claims": [self._claim_to_dict(c) for c in report.claims],
            "manipulation_signals": [
                self._signal_to_dict(s) for s in report.manipulation_signals
            ],
            "summary_statistics": report.summary_statistics,
            "human_summary": report.human_summary,
            "recommendations": report.recommendations,
            "disclaimer": report.disclaimer
        }
    
    def _claim_to_dict(self, claim) -> Dict[str, Any]:
        """Converts VerificationResult to dictionary."""
        return {
            "id": claim.claim.id,
            "text": claim.claim.text,
            "domain": claim.claim.domain,
            "confidence": claim.confidence,
            "risk_level": claim.risk_level,
            "evidence": [
                {
                    "source": e.source,
                    "relevance": e.relevance,
                    "excerpt": e.excerpt
                }
                for e in claim.supporting_evidence
            ],
            "recommendation": claim.recommendation
        }
    
    def _signal_to_dict(self, signal) -> Dict[str, Any]:
        """Converts ManipulationSignal to dictionary."""
        return {
            "type": signal.type,
            "severity": signal.severity,
            "timestamp_start": signal.timestamp_start,
            "timestamp_end": signal.timestamp_end,
            "description": signal.description,
            "evidence": signal.evidence,
            "confidence": signal.confidence
        }
    
    def _format_error_response(
        self,
        error_message: str,
        processing_time_ms: int
    ) -> Dict[str, Any]:
        """
        Formats error response.
        
        Args:
            error_message: Error message
            processing_time_ms: Processing time before error
            
        Returns:
            Error response dictionary
        """
        return {
            "status": "error",
            "error": {
                "message": error_message,
                "code": "PROCESSING_ERROR"
            },
            "processing_time_ms": processing_time_ms
        }
    
    def get_supported_modes(self) -> list[str]:
        """
        Returns list of supported execution modes.
        
        Returns:
            List of mode strings
        """
        return ["text", "video", "auto"]
    
    def get_supported_output_formats(self) -> list[str]:
        """
        Returns list of supported output formats.
        
        Returns:
            List of format strings
        """
        return ["json", "markdown", "pdf"]
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Returns statistics about the command interface and agents.
        
        Returns:
            Dictionary with statistics
        """
        return {
            "command_version": "1.0",
            "supported_modes": self.get_supported_modes(),
            "supported_output_formats": self.get_supported_output_formats(),
            "scientific_agent": self.scientific_agent.get_statistics(),
            "video_agent": self.video_agent.get_statistics(),
            "configuration": {
                "confidence_threshold": self.config.confidence_threshold,
                "cache_enabled": self.config.cache_enabled
            }
        }


def create_command(config: Optional[Configuration] = None) -> FactCheckerCommand:
    """
    Factory function to create a Fact Checker Command interface.
    
    Args:
        config: Optional configuration settings
        
    Returns:
        Configured FactCheckerCommand instance
    """
    return FactCheckerCommand(config)
