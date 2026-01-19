"""
Unit tests for error handling and edge cases in QualityValidator.

Tests cover:
- Input validation for corrupted/missing files
- Graceful handling of missing data
- Error recovery during processing failures
- Edge cases and graceful degradation
"""

import pytest
import numpy as np
from pathlib import Path
from unittest.mock import patch, mock_open, MagicMock
from src.quality_validator import QualityValidator, ValidationMode, QualityIssue


class TestInputValidation:
    """Test input validation for video and audio files."""

    def setup_method(self):
        self.validator = QualityValidator()

    def test_validate_video_file_nonexistent(self):
        """Test validation of nonexistent video file."""
        nonexistent_path = Path("/nonexistent/video.mp4")
        is_valid, error = self.validator.validate_video_file(nonexistent_path)
        assert not is_valid
        assert "not found" in error.lower()

    def test_validate_video_file_unsupported_format(self):
        """Test validation of unsupported video format."""
        unsupported_path = Path("test.unsupported")
        is_valid, error = self.validator.validate_video_file(unsupported_path)
        assert not is_valid
        assert "unsupported video format" in error.lower()

    def test_validate_video_file_directory(self):
        """Test validation when path is a directory."""
        dir_path = Path(".")
        is_valid, error = self.validator.validate_video_file(dir_path)
        assert not is_valid
        assert "not a file" in error.lower()

    @patch('cv2.VideoCapture')
    def test_validate_video_file_corrupted(self, mock_cap):
        """Test validation of corrupted video file."""
        # Mock VideoCapture to return invalid
        mock_cap.return_value.isOpened.return_value = False

        corrupted_path = Path("corrupted.mp4")
        is_valid, error = self.validator.validate_video_file(corrupted_path)
        assert not is_valid
        assert "unable to open" in error.lower()

    @patch('cv2.VideoCapture')
    def test_validate_video_file_empty(self, mock_cap):
        """Test validation of video file with no readable frames."""
        # Mock VideoCapture to open but return no frames
        mock_cap.return_value.isOpened.return_value = True
        mock_cap.return_value.read.return_value = (False, None)

        empty_path = Path("empty.mp4")
        is_valid, error = self.validator.validate_video_file(empty_path)
        assert not is_valid
        assert "unable to read frames" in error.lower()

    def test_validate_audio_file_nonexistent(self):
        """Test validation of nonexistent audio file."""
        nonexistent_path = Path("/nonexistent/audio.wav")
        is_valid, error = self.validator.validate_audio_file(nonexistent_path)
        assert not is_valid
        assert "not found" in error.lower()

    def test_validate_audio_file_unsupported_format(self):
        """Test validation of unsupported audio format."""
        unsupported_path = Path("test.unsupported")
        is_valid, error = self.validator.validate_audio_file(unsupported_path)
        assert not is_valid
        assert "unsupported audio format" in error.lower()

    @patch('librosa.load')
    def test_validate_audio_file_corrupted(self, mock_load):
        """Test validation of corrupted audio file."""
        mock_load.side_effect = Exception("Corrupted file")

        corrupted_path = Path("corrupted.wav")
        is_valid, error = self.validator.validate_audio_file(corrupted_path)
        assert not is_valid
        assert "error validating" in error.lower()

    @patch('librosa.load')
    def test_validate_audio_file_empty(self, mock_load):
        """Test validation of empty audio file."""
        mock_load.return_value = (np.array([]), 22050)

        empty_path = Path("empty.wav")
        is_valid, error = self.validator.validate_audio_file(empty_path)
        assert not is_valid
        assert "audio file is empty" in error.lower()

    @patch('librosa.load')
    def test_validate_audio_file_silence(self, mock_load):
        """Test validation of audio file with only silence."""
        # Return array of zeros
        mock_load.return_value = (np.zeros(1000), 22050)

        silence_path = Path("silence.wav")
        is_valid, error = self.validator.validate_audio_file(silence_path)
        assert not is_valid
        assert "only silence" in error.lower()


class TestMissingDataHandling:
    """Test graceful handling of missing data."""

    def setup_method(self):
        self.validator = QualityValidator()

    def test_analyze_voice_quality_empty_audio(self):
        """Test voice quality analysis with empty audio data."""
        audio_clip = {'data': np.array([]), 'rate': 22050}

        result = self.validator.analyze_voice_quality(audio_clip)

        assert result['quality_score'] == 0.0
        assert len(result['issues']) == 1
        assert result['issues'][0]['type'] == 'missing_audio'
        assert result['issues'][0]['severity'] == 'high'

    def test_generate_quality_score_no_frames(self):
        """Test quality score generation with no frames."""
        shot = {'frames': [], 'audio_score': 50.0, 'continuity_score': 50.0}

        score = self.validator.generate_quality_score(shot)

        assert score.overall_score == 0.0  # Due to error recovery
        assert len(score.issues) >= 1
        assert any(issue.issue_type == 'missing_frames' for issue in score.issues)

    def test_detect_metallic_voice_empty_data(self):
        """Test metallic voice detection with empty data."""
        audio_clip = {'data': np.array([]), 'rate': 22050}

        issues = self.validator.detect_metallic_voice(audio_clip)
        assert issues == []

    def test_measure_voice_clarity_empty_data(self):
        """Test voice clarity measurement with empty data."""
        audio_clip = {'data': np.array([]), 'rate': 22050}

        result = self.validator.measure_voice_clarity(audio_clip)
        assert result['clarity_score'] == 0.0
        assert result['issues'] == []
        assert result['recommendations'] == []

    def test_detect_audio_gaps_empty_data(self):
        """Test audio gap detection with empty data."""
        audio_clip = {'data': np.array([]), 'rate': 22050}

        gaps = self.validator.detect_audio_gaps(audio_clip)
        assert gaps == []


class TestErrorRecovery:
    """Test error recovery during processing failures."""

    def setup_method(self):
        self.validator = QualityValidator()

    @patch('cv2.Laplacian')
    def test_calculate_sharpness_error_recovery(self, mock_laplacian):
        """Test sharpness calculation error recovery."""
        mock_laplacian.side_effect = Exception("OpenCV error")

        frame = np.random.rand(100, 100, 3).astype(np.uint8)

        with patch.object(self.validator.logger, 'error') as mock_log:
            sharpness = self.validator.calculate_sharpness(frame)
            # Should return 0 or handle gracefully
            mock_log.assert_called_once()

    @patch('cv2.calcOpticalFlowFarneback')
    def test_detect_unnatural_movements_error_recovery(self, mock_flow):
        """Test motion detection error recovery."""
        mock_flow.side_effect = Exception("Optical flow error")

        frames = [np.random.rand(100, 100, 3).astype(np.uint8) for _ in range(3)]

        anomalies = self.validator.detect_unnatural_movements(frames)
        # Should return empty list or handle gracefully
        assert isinstance(anomalies, list)

    @patch('librosa.stft')
    def test_detect_metallic_voice_error_recovery(self, mock_stft):
        """Test metallic voice detection error recovery."""
        mock_stft.side_effect = Exception("Librosa error")

        audio_clip = {'data': np.random.rand(1000), 'rate': 22050}

        issues = self.validator.detect_metallic_voice(audio_clip)
        # Should return empty list
        assert isinstance(issues, list)

    def test_analyze_voice_quality_error_recovery(self):
        """Test voice quality analysis with processing errors."""
        # Create audio clip that might cause issues
        audio_clip = {'data': np.random.rand(100), 'rate': 22050}

        # Mock detect_metallic_voice to raise exception
        with patch.object(self.validator, 'detect_metallic_voice', side_effect=Exception("Processing error")):
            result = self.validator.analyze_voice_quality(audio_clip)

            # Should still return a result with error issue
            assert 'issues' in result
            assert len(result['issues']) >= 1
            assert any('analysis_error' in issue['type'] for issue in result['issues'])

    def test_generate_quality_score_error_recovery(self):
        """Test quality score generation with multiple processing errors."""
        # Create shot that might cause issues
        frames = [np.random.rand(10, 10, 3).astype(np.uint8)]
        shot = {'frames': frames, 'audio_score': 50.0, 'continuity_score': 50.0}

        # Mock calculate_sharpness to raise exception
        with patch.object(self.validator, 'calculate_sharpness', side_effect=Exception("Sharpness error")):
            score = self.validator.generate_quality_score(shot)

            # Should still return a QualityScore object
            assert hasattr(score, 'overall_score')
            assert len(score.issues) >= 1
            assert any('sharpness_calculation_error' in issue.issue_type for issue in score.issues)


class TestEdgeCases:
    """Test edge cases and graceful degradation."""

    def setup_method(self):
        self.validator = QualityValidator()

    def test_single_frame_video(self):
        """Test processing with single frame."""
        frame = np.random.rand(100, 100, 3).astype(np.uint8)
        frames = [frame]

        anomalies = self.validator.detect_unnatural_movements(frames)
        # Should handle gracefully
        assert isinstance(anomalies, list)

    def test_very_short_audio(self):
        """Test processing with very short audio."""
        audio_data = np.random.rand(10)  # Very short
        audio_clip = {'data': audio_data, 'rate': 22050}

        result = self.validator.measure_voice_clarity(audio_clip)
        # Should handle gracefully
        assert isinstance(result, dict)
        assert 'clarity_score' in result

    def test_grayscale_frame(self):
        """Test sharpness calculation with grayscale frame."""
        frame = np.random.rand(100, 100).astype(np.uint8)
        sharpness = self.validator.calculate_sharpness(frame)
        assert isinstance(sharpness, float)
        assert sharpness >= 0

    def test_bgr_frame(self):
        """Test sharpness calculation with BGR frame."""
        frame = np.random.rand(100, 100, 3).astype(np.uint8)
        sharpness = self.validator.calculate_sharpness(frame)
        assert isinstance(sharpness, float)
        assert sharpness >= 0

    @patch('librosa.load')
    def test_audio_with_invalid_sample_rate(self, mock_load):
        """Test audio validation with invalid sample rate."""
        mock_load.return_value = (np.random.rand(1000), 0)  # Invalid sample rate

        invalid_path = Path("invalid_sr.wav")
        is_valid, error = self.validator.validate_audio_file(invalid_path)
        assert not is_valid
        assert "invalid sample rate" in error.lower()

    @patch('librosa.load')
    def test_audio_with_nan_values(self, mock_load):
        """Test audio validation with NaN values."""
        audio_with_nan = np.random.rand(1000)
        audio_with_nan[50] = np.nan
        mock_load.return_value = (audio_with_nan, 22050)

        nan_path = Path("nan_audio.wav")
        is_valid, error = self.validator.validate_audio_file(nan_path)
        assert not is_valid
        assert "invalid data" in error.lower()

    @patch('librosa.load')
    def test_audio_with_inf_values(self, mock_load):
        """Test audio validation with infinite values."""
        audio_with_inf = np.random.rand(1000)
        audio_with_inf[50] = np.inf
        mock_load.return_value = (audio_with_inf, 22050)

        inf_path = Path("inf_audio.wav")
        is_valid, error = self.validator.validate_audio_file(inf_path)
        assert not is_valid
        assert "invalid data" in error.lower()


class TestRealTimeVsBatchModes:
    """Test error handling differences between validation modes."""

    def test_realtime_mode_error_handling(self):
        """Test that REAL_TIME mode handles errors more gracefully."""
        validator_rt = QualityValidator(ValidationMode.REAL_TIME)
        validator_batch = QualityValidator(ValidationMode.BATCH)

        # Empty shot
        shot = {'frames': [], 'audio_score': 50.0, 'continuity_score': 50.0}

        score_rt = validator_rt.generate_quality_score(shot)
        score_batch = validator_batch.generate_quality_score(shot)

        # Both should handle gracefully but may have different scoring
        assert hasattr(score_rt, 'overall_score')
        assert hasattr(score_batch, 'overall_score')
        assert len(score_rt.issues) >= 1  # Should have missing_frames issue
        assert len(score_batch.issues) >= 1