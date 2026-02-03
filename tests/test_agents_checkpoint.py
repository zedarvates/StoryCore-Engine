"""
Checkpoint Test for Fact Checking Agents

This test verifies that both the Scientific Audit Agent and Anti-Fake Video Agent
are functional and can complete basic analysis workflows.

This is a checkpoint test for Task 6.
"""

import pytest
from src.fact_checker import (
    ScientificAuditAgent,
    AntiFakeVideoAgent,
    Configuration
)


class TestScientificAuditAgentCheckpoint:
    """Checkpoint tests for Scientific Audit Agent."""
    
    def test_agent_initialization(self):
        """Test that agent can be initialized."""
        agent = ScientificAuditAgent()
        assert agent is not None
        assert agent.config is not None
    
    def test_agent_initialization_with_config(self):
        """Test that agent can be initialized with custom config."""
        config = Configuration(confidence_threshold=80.0)
        agent = ScientificAuditAgent(config)
        assert agent.config.confidence_threshold == 80.0
    
    def test_basic_analysis(self):
        """Test that agent can perform basic analysis."""
        agent = ScientificAuditAgent()
        text = "Water boils at 100 degrees Celsius at sea level."
        
        report = agent.analyze(text)
        
        # Verify report structure
        assert report is not None
        assert report.metadata is not None
        assert report.metadata['agent'] == 'scientific_audit'
        assert 'processing_time_ms' in report.metadata
        assert report.summary_statistics is not None
        assert 'total_claims' in report.summary_statistics
        assert report.human_summary is not None
        assert len(report.human_summary) > 0
        assert report.disclaimer is not None
    
    def test_empty_input_raises_error(self):
        """Test that empty input raises ValueError."""
        agent = ScientificAuditAgent()
        
        with pytest.raises(ValueError, match="Input text cannot be empty"):
            agent.analyze("")
    
    def test_very_long_input_raises_error(self):
        """Test that very long input raises ValueError."""
        agent = ScientificAuditAgent()
        long_text = "word " * 60000  # Exceeds 50000 char limit
        
        with pytest.raises(ValueError, match="exceeds maximum length"):
            agent.analyze(long_text)
    
    def test_batch_analysis(self):
        """Test that agent can process multiple texts."""
        agent = ScientificAuditAgent()
        texts = [
            "The Earth orbits the Sun.",
            "Humans have 46 chromosomes.",
            "The speed of light is approximately 300,000 km/s."
        ]
        
        reports = agent.analyze_batch(texts)
        
        assert len(reports) == 3
        for report in reports:
            assert report is not None
            assert report.metadata['agent'] == 'scientific_audit'
    
    def test_get_statistics(self):
        """Test that agent returns statistics."""
        agent = ScientificAuditAgent()
        stats = agent.get_statistics()
        
        assert stats is not None
        assert stats['agent_type'] == 'scientific_audit'
        assert stats['version'] == '1.0'
        assert 'confidence_threshold' in stats
        assert 'supported_domains' in stats


class TestAntiFakeVideoAgentCheckpoint:
    """Checkpoint tests for Anti-Fake Video Agent."""
    
    def test_agent_initialization(self):
        """Test that agent can be initialized."""
        agent = AntiFakeVideoAgent()
        assert agent is not None
        assert agent.config is not None
    
    def test_agent_initialization_with_config(self):
        """Test that agent can be initialized with custom config."""
        config = Configuration(confidence_threshold=80.0)
        agent = AntiFakeVideoAgent(config)
        assert agent.config.confidence_threshold == 80.0
    
    def test_basic_analysis(self):
        """Test that agent can perform basic analysis."""
        agent = AntiFakeVideoAgent()
        transcript = """
        This is a test transcript. It contains some content that we want to analyze.
        The content should be evaluated for manipulation signals and coherence.
        """
        
        report = agent.analyze(transcript)
        
        # Verify report structure
        assert report is not None
        assert report.metadata is not None
        assert report.metadata['agent'] == 'antifake_video'
        assert 'processing_time_ms' in report.metadata
        assert report.summary_statistics is not None
        assert 'coherence_score' in report.summary_statistics
        assert 'integrity_score' in report.summary_statistics
        assert 'risk_level' in report.summary_statistics
        assert report.human_summary is not None
        assert len(report.human_summary) > 0
        assert report.disclaimer is not None
    
    def test_analysis_with_timestamps(self):
        """Test that agent can handle timestamps."""
        agent = AntiFakeVideoAgent()
        transcript = "This is a test transcript with timestamps."
        timestamps = [
            {"start": "00:00:00", "end": "00:00:05", "text": "This is a test"},
            {"start": "00:00:05", "end": "00:00:10", "text": "transcript with timestamps."}
        ]
        
        report = agent.analyze(transcript, timestamps=timestamps)
        
        assert report is not None
        assert report.metadata['agent'] == 'antifake_video'
    
    def test_analysis_with_metadata(self):
        """Test that agent can handle video metadata."""
        agent = AntiFakeVideoAgent()
        transcript = "This is a test transcript."
        metadata = {
            "source": "test_video.mp4",
            "duration_seconds": 120
        }
        
        report = agent.analyze(transcript, metadata=metadata)
        
        assert report is not None
        assert 'video_metadata' in report.metadata
        assert report.metadata['video_metadata']['source'] == 'test_video.mp4'
    
    def test_empty_input_raises_error(self):
        """Test that empty input raises ValueError."""
        agent = AntiFakeVideoAgent()
        
        with pytest.raises(ValueError, match="Transcript cannot be empty"):
            agent.analyze("")
    
    def test_very_long_input_raises_error(self):
        """Test that very long input raises ValueError."""
        agent = AntiFakeVideoAgent()
        long_transcript = "word " * 120000  # Exceeds 100000 char limit
        
        with pytest.raises(ValueError, match="exceeds maximum length"):
            agent.analyze(long_transcript)
    
    def test_manipulation_detection(self):
        """Test that agent detects manipulation signals."""
        agent = AntiFakeVideoAgent()
        # Transcript with emotional manipulation
        transcript = """
        This is absolutely terrifying and horrifying news that will devastate everyone.
        The shocking and outrageous situation is unbelievable and incredible.
        Obviously, everyone knows this is the only truth without question.
        """
        
        report = agent.analyze(transcript)
        
        # Should detect emotional manipulation and narrative bias
        assert len(report.manipulation_signals) > 0
        signal_types = [s.type for s in report.manipulation_signals]
        assert 'emotional_manipulation' in signal_types or 'narrative_bias' in signal_types
    
    def test_coherence_scoring(self):
        """Test that agent calculates coherence score."""
        agent = AntiFakeVideoAgent()
        transcript = """
        First, we establish the premise. Therefore, we can conclude the following.
        Because of this evidence, the result is clear. Thus, we see the pattern.
        """
        
        report = agent.analyze(transcript)
        
        # Should have a coherence score
        assert 'coherence_score' in report.summary_statistics
        assert 0 <= report.summary_statistics['coherence_score'] <= 100
    
    def test_get_statistics(self):
        """Test that agent returns statistics."""
        agent = AntiFakeVideoAgent()
        stats = agent.get_statistics()
        
        assert stats is not None
        assert stats['agent_type'] == 'antifake_video'
        assert stats['version'] == '1.0'
        assert 'confidence_threshold' in stats
        assert 'supported_manipulation_types' in stats


class TestAgentIntegration:
    """Integration tests for both agents."""
    
    def test_both_agents_work_independently(self):
        """Test that both agents can work independently."""
        text_agent = ScientificAuditAgent()
        video_agent = AntiFakeVideoAgent()
        
        text = "The Earth is approximately 4.5 billion years old."
        transcript = "This is a video transcript about Earth's age."
        
        text_report = text_agent.analyze(text)
        video_report = video_agent.analyze(transcript)
        
        assert text_report.metadata['agent'] == 'scientific_audit'
        assert video_report.metadata['agent'] == 'antifake_video'
        assert text_report.metadata['agent'] != video_report.metadata['agent']
    
    def test_agents_use_same_configuration(self):
        """Test that both agents can use the same configuration."""
        config = Configuration(
            confidence_threshold=75.0,
            timeout_seconds=120
        )
        
        text_agent = ScientificAuditAgent(config)
        video_agent = AntiFakeVideoAgent(config)
        
        assert text_agent.config.confidence_threshold == 75.0
        assert video_agent.config.confidence_threshold == 75.0
        assert text_agent.config.timeout_seconds == 120
        assert video_agent.config.timeout_seconds == 120


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
