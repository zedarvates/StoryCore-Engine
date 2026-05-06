"""
Tests for the Color Grading Module

Unit tests for:
- ColorService
- ScopesService
- LUTService
- QualifierService
- PowerWindowsService

Author: StoryCore Team
Version: 1.0.0
"""

import pytest
import numpy as np
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from color.color_service import ColorService, ColorGrade
from color.scopes_service import ScopesService, ScopesConfig
from color.lut_service import LUTService, LUTMetadata, LUTFormat
from color.qualifier_service import QualifierService, HSLQualifier, SelectionMode
from color.power_windows import PowerWindowsService, PowerWindow, WindowType


class TestColorService:
    """Tests for ColorService"""

    @pytest.fixture
    def color_service(self):
        return ColorService(gpu_acceleration=False)

    @pytest.fixture
    def sample_frame(self):
        """Create a sample test frame (gradient)"""
        frame = np.zeros((100, 100, 3), dtype=np.float32)
        for x in range(100):
            frame[:, x, :] = x / 99.0
        return frame

    def test_create_color_service(self, color_service):
        """Test ColorService initialization"""
        assert color_service is not None
        assert not color_service.gpu
        assert isinstance(color_service.grades, dict)

    def test_apply_default_grade(self, color_service, sample_frame):
        """Test applying a default (no-op) grade"""
        grade = ColorGrade()
        result = color_service.apply_grade(sample_frame, grade)

        # Result should be very similar to input
        assert result.shape == sample_frame.shape
        np.testing.assert_array_almost_equal(result, sample_frame, decimal=2)

    def test_apply_contrast(self, color_service, sample_frame):
        """Test contrast adjustment"""
        grade = ColorGrade(contrast=1.5)
        result = color_service.apply_grade(sample_frame, grade)

        assert result.shape == sample_frame.shape
        # Higher contrast should increase the spread
        assert result.max() > sample_frame.max() or result.min() < sample_frame.min()

    def test_apply_saturation(self, color_service):
        """Test saturation adjustment"""
        # Create a color frame
        frame = np.zeros((50, 50, 3), dtype=np.float32)
        frame[:, :, 0] = 0.8  # Red
        frame[:, :, 1] = 0.2  # Some green

        # Desaturate
        grade = ColorGrade(saturation=0.0)
        result = color_service.apply_grade(frame, grade)

        # Should be closer to gray
        r_diff = np.abs(result[:, :, 0] - result[:, :, 1])
        np.abs(result[:, :, 1] - result[:, :, 2])
        assert np.mean(r_diff) < np.mean(frame[:, :, 0] - frame[:, :, 1])

    def test_apply_gain(self, color_service, sample_frame):
        """Test gain (highlight) adjustment"""
        grade = ColorGrade(gain=(1.5, 1.0, 1.0))
        result = color_service.apply_grade(sample_frame, grade)

        # Red channel should be boosted
        assert result[:, :, 0].max() >= sample_frame[:, :, 0].max()

    def test_apply_lift(self, color_service, sample_frame):
        """Test lift (shadow) adjustment"""
        grade = ColorGrade(lift=(0.1, 0.0, 0.0))
        result = color_service.apply_grade(sample_frame, grade)

        # Result should be brighter in shadows
        assert result[0, 0, 0] > sample_frame[0, 0, 0]

    def test_auto_color_balance(self, color_service):
        """Test automatic color balance"""
        # Create frame with color cast (too blue)
        frame = np.zeros((50, 50, 3), dtype=np.float32)
        frame[:, :, 2] = 0.8  # Blue channel high

        grade = color_service.auto_color_balance(frame)

        # Should suggest warming (positive temperature)
        assert isinstance(grade, ColorGrade)
        assert grade.name == "Auto Color Balance"

    def test_match_grade(self, color_service):
        """Test grade matching between frames"""
        source = np.random.rand(50, 50, 3).astype(np.float32)
        target = np.ones((50, 50, 3), dtype=np.float32) * 0.5

        grade = color_service.match_grade(source, target)

        assert isinstance(grade, ColorGrade)
        assert grade.name == "Matched Grade"

    def test_rgb_to_hsv_conversion(self, color_service):
        """Test RGB to HSV conversion"""
        # Pure red
        frame = np.zeros((1, 1, 3), dtype=np.float32)
        frame[0, 0, 0] = 1.0

        hsv = color_service._rgb_to_hsv(frame)

        # Red should be hue 0
        assert hsv[0, 0, 0] < 0.01 or hsv[0, 0, 0] > 0.99
        assert hsv[0, 0, 1] == 1.0  # Full saturation
        assert hsv[0, 0, 2] == 1.0  # Full value

    def test_create_and_store_grade(self, color_service):
        """Test creating and storing grades"""
        grade = color_service.create_grade("Test Grade", saturation=1.2, contrast=1.1)

        assert grade.name == "Test Grade"
        assert grade.saturation == 1.2
        assert grade.contrast == 1.1
        assert len(color_service.list_grades()) == 1

    def test_delete_grade(self, color_service):
        """Test deleting grades"""
        color_service.create_grade("To Delete")
        grade_id = color_service.list_grades()[0]

        assert color_service.delete_grade(grade_id)
        assert len(color_service.list_grades()) == 0
        assert not color_service.delete_grade("nonexistent")


class TestScopesService:
    """Tests for ScopesService"""

    @pytest.fixture
    def scopes_service(self):
        return ScopesService()

    @pytest.fixture
    def sample_frame(self):
        """Create a sample test frame"""
        frame = np.random.rand(100, 100, 3).astype(np.float32)
        return frame

    def test_create_scopes_service(self, scopes_service):
        """Test ScopesService initialization"""
        assert scopes_service is not None
        assert isinstance(scopes_service.config, ScopesConfig)

    def test_waveform_luma(self, scopes_service, sample_frame):
        """Test luma waveform generation"""
        waveform = scopes_service.waveform(sample_frame, mode="luma")

        assert waveform.shape[2] == 3  # RGB output
        assert waveform.dtype == np.float32
        assert waveform.max() <= 1.0
        assert waveform.min() >= 0.0

    def test_waveform_rgb(self, scopes_service, sample_frame):
        """Test RGB waveform generation"""
        waveform = scopes_service.waveform(sample_frame, mode="rgb")

        assert waveform.shape[2] == 3
        # Should have some content in each channel
        assert waveform[:, :, 0].sum() > 0  # Red
        assert waveform[:, :, 1].sum() > 0  # Green
        assert waveform[:, :, 2].sum() > 0  # Blue

    def test_vectorscope(self, scopes_service, sample_frame):
        """Test vectorscope generation"""
        vectorscope = scopes_service.vectorscope(sample_frame)

        # Should be square
        assert vectorscope.shape[0] == vectorscope.shape[1]
        assert vectorscope.shape[2] == 3

    def test_histogram_luma(self, scopes_service, sample_frame):
        """Test luma histogram generation"""
        histogram = scopes_service.histogram(sample_frame, mode="luma")

        assert histogram.shape[1] == scopes_service.config.histogram_bins
        assert histogram.shape[2] == 3

    def test_histogram_rgb(self, scopes_service, sample_frame):
        """Test RGB histogram generation"""
        histogram = scopes_service.histogram(sample_frame, mode="rgb")

        assert histogram.shape[1] == scopes_service.config.histogram_bins

    def test_rgb_parade(self, scopes_service, sample_frame):
        """Test RGB parade generation"""
        parade = scopes_service.rgb_parade(sample_frame)

        assert parade.shape[2] == 3
        # Width should be 3x original
        assert parade.shape[1] == sample_frame.shape[1] * 3

    def test_false_color(self, scopes_service, sample_frame):
        """Test false color generation"""
        false_color = scopes_service.false_color(sample_frame)

        assert false_color.shape == sample_frame.shape
        # Should have different colors than original
        assert not np.allclose(false_color, sample_frame)

    def test_analyze_exposure(self, scopes_service, sample_frame):
        """Test exposure analysis"""
        analysis = scopes_service.analyze_exposure(sample_frame)

        assert "mean_luma" in analysis
        assert "median_luma" in analysis
        assert "min_luma" in analysis
        assert "max_luma" in analysis
        assert "dynamic_range" in analysis
        assert 0 <= analysis["mean_luma"] <= 1

    def test_analyze_color(self, scopes_service, sample_frame):
        """Test color analysis"""
        analysis = scopes_service.analyze_color(sample_frame)

        assert "rgb_mean" in analysis
        assert "avg_saturation" in analysis
        assert "dominant_hue" in analysis
        assert "color_cast" in analysis
        assert len(analysis["rgb_mean"]) == 3


class TestLUTService:
    """Tests for LUTService"""

    @pytest.fixture
    def lut_service(self):
        return LUTService()

    @pytest.fixture
    def sample_frame(self):
        return np.random.rand(100, 100, 3).astype(np.float32)

    def test_create_lut_service(self, lut_service):
        """Test LUTService initialization"""
        assert lut_service is not None
        assert isinstance(lut_service.luts, dict)

    def test_create_identity_lut(self, lut_service):
        """Test identity LUT creation"""
        identity = lut_service._create_identity_lut(17)

        assert identity.shape == (17, 17, 17, 3)

        # Check that identity LUT returns input values
        for r in range(17):
            for g in range(17):
                for b in range(17):
                    expected = [r / 16, g / 16, b / 16]
                    np.testing.assert_array_almost_equal(
                        identity[r, g, b], expected, decimal=3
                    )

    def test_apply_identity_lut(self, lut_service, sample_frame):
        """Test that identity LUT doesn't change the frame"""
        # Create identity LUT
        lut_data = lut_service._create_identity_lut(33)
        metadata = LUTMetadata(name="Identity", format=LUTFormat.CUBE, size=33)

        from color.lut_service import LUT

        lut = LUT(metadata=metadata, data=lut_data)

        result = lut_service.apply_lut(sample_frame, lut)

        # Should be nearly identical
        np.testing.assert_array_almost_equal(result, sample_frame, decimal=2)

    def test_apply_lut_with_intensity(self, lut_service, sample_frame):
        """Test LUT application with intensity blend"""
        # Create a strong LUT (all white)
        lut_data = np.ones((17, 17, 17, 3), dtype=np.float32)
        metadata = LUTMetadata(name="All White", format=LUTFormat.CUBE, size=17)

        from color.lut_service import LUT

        lut = LUT(metadata=metadata, data=lut_data)

        result_full = lut_service.apply_lut(sample_frame, lut, intensity=1.0)
        result_half = lut_service.apply_lut(sample_frame, lut, intensity=0.5)

        # Half intensity should be between original and full
        assert not np.allclose(result_half, sample_frame)
        assert not np.allclose(result_half, result_full)

    def test_generate_preview(self, lut_service):
        """Test LUT preview generation"""
        lut_data = lut_service._create_identity_lut(17)
        metadata = LUTMetadata(name="Test", format=LUTFormat.CUBE, size=17)

        from color.lut_service import LUT

        lut = LUT(metadata=metadata, data=lut_data)

        preview = lut_service.generate_preview(lut, size=(128, 128))

        assert preview.shape == (128, 128, 3)
        assert preview.dtype == np.uint8

    def test_scan_directory(self, lut_service, tmp_path):
        """Test directory scanning for LUTs"""
        # Create some fake LUT files
        (tmp_path / "test1.cube").touch()
        (tmp_path / "test2.3dl").touch()
        (tmp_path / "not_a_lut.txt").touch()

        found = lut_service.scan_directory(str(tmp_path))

        assert len(found) == 2
        assert any("test1.cube" in f for f in found)
        assert any("test2.3dl" in f for f in found)


class TestQualifierService:
    """Tests for QualifierService"""

    @pytest.fixture
    def qualifier_service(self):
        return QualifierService()

    @pytest.fixture
    def sample_frame(self):
        """Create frame with distinct colors"""
        frame = np.zeros((100, 100, 3), dtype=np.float32)
        # Red quadrant
        frame[:50, :50, 0] = 0.8
        # Green quadrant
        frame[:50, 50:, 1] = 0.8
        # Blue quadrant
        frame[50:, :50, 2] = 0.8
        # White quadrant
        frame[50:, 50:, :] = 0.9
        return frame

    def test_create_qualifier_service(self, qualifier_service):
        """Test QualifierService initialization"""
        assert qualifier_service is not None
        assert qualifier_service.current_qualifier is None

    def test_qualify_hue(self, qualifier_service, sample_frame):
        """Test hue-based qualification"""
        # Select reds (hue around 0)
        qualifier = HSLQualifier(hue_center=0.0, hue_width=30.0, sat_low=0.1)

        result = qualifier_service.qualify(sample_frame, qualifier)

        assert result.matte.shape == (100, 100)
        # Red quadrant should be selected
        assert result.matte[:50, :50].mean() > result.matte[50:, 50:].mean()

    def test_qualify_saturation(self, qualifier_service):
        """Test saturation-based qualification"""
        # Create frame with varying saturation
        frame = np.zeros((100, 100, 3), dtype=np.float32)
        # High saturation area
        frame[:50, :, 0] = 0.8
        frame[:50, :, 1] = 0.2
        # Low saturation area (gray)
        frame[50:, :, :] = 0.5

        qualifier = HSLQualifier(sat_low=0.5, sat_high=1.0)

        result = qualifier_service.qualify(frame, qualifier)

        # High saturation area should be more selected
        assert result.matte[:50, :].mean() > result.matte[50:, :].mean()

    def test_qualify_luminance(self, qualifier_service):
        """Test luminance-based qualification"""
        frame = np.zeros((100, 100, 3), dtype=np.float32)
        frame[:50, :] = 0.8  # Bright
        frame[50:, :] = 0.2  # Dark

        qualifier = HSLQualifier(lum_low=0.5, lum_high=1.0)

        result = qualifier_service.qualify(frame, qualifier)

        # Bright area should be selected
        assert result.matte[:50, :].mean() > result.matte[50:, :].mean()

    def test_selection_modes(self, qualifier_service, sample_frame):
        """Test different selection modes"""
        qualifier1 = HSLQualifier(hue_center=0, hue_width=60)
        result1 = qualifier_service.qualify(sample_frame, qualifier1)

        # Add mode
        qualifier2 = HSLQualifier(hue_center=120, hue_width=60)  # Green
        result2 = qualifier_service.qualify(
            sample_frame,
            qualifier2,
            selection_mode=SelectionMode.ADD,
            existing_matte=result1.matte,
        )

        # Add mode should have more selected
        assert result2.matte.sum() >= result1.matte.sum()

    def test_sample_color(self, qualifier_service, sample_frame):
        """Test color sampling from frame"""
        points = [(25, 25)]  # Red quadrant
        qualifier = qualifier_service.sample_color(sample_frame, points, radius=5)

        assert isinstance(qualifier, HSLQualifier)
        # Should select red-ish hue
        assert qualifier.hue_center < 30 or qualifier.hue_center > 330

    def test_refine_matte(self, qualifier_service):
        """Test matte refinement"""
        matte = np.zeros((100, 100), dtype=np.float32)
        matte[40:60, 40:60] = 1.0

        refined = qualifier_service.refine_matte(matte, softness=5)

        # Should still be mostly 1 in center
        assert refined[50, 50] > 0.5
        # Should have softness at edges
        assert refined[40, 40] < 1.0


class TestPowerWindowsService:
    """Tests for PowerWindowsService"""

    @pytest.fixture
    def power_windows_service(self):
        return PowerWindowsService()

    def test_create_service(self, power_windows_service):
        """Test PowerWindowsService initialization"""
        assert power_windows_service is not None
        assert isinstance(power_windows_service.windows, list)

    def test_create_circular_mask(self, power_windows_service):
        """Test circular mask creation"""
        window = PowerWindow(
            id="test1",
            window_type=WindowType.CIRCULAR,
            center=(0.5, 0.5),
            size=(0.4, 0.4),
        )

        mask = power_windows_service.create_mask(window, 100, 100)

        assert mask.shape == (100, 100)
        # Center should be 1
        assert mask[50, 50] > 0.9
        # Corners should be 0
        assert mask[0, 0] < 0.1
        assert mask[99, 99] < 0.1

    def test_create_rectangular_mask(self, power_windows_service):
        """Test rectangular mask creation"""
        window = PowerWindow(
            id="test2",
            window_type=WindowType.RECTANGULAR,
            center=(0.5, 0.5),
            size=(0.5, 0.3),
        )

        mask = power_windows_service.create_mask(window, 100, 100)

        assert mask.shape == (100, 100)
        # Center should be selected
        assert mask[50, 50] > 0.5

    def test_inverted_mask(self, power_windows_service):
        """Test mask inversion"""
        window_normal = PowerWindow(
            id="normal",
            window_type=WindowType.CIRCULAR,
            center=(0.5, 0.5),
            size=(0.2, 0.2),
            invert=False,
        )

        window_inverted = PowerWindow(
            id="inverted",
            window_type=WindowType.CIRCULAR,
            center=(0.5, 0.5),
            size=(0.2, 0.2),
            invert=True,
        )

        mask_normal = power_windows_service.create_mask(window_normal, 100, 100)
        mask_inverted = power_windows_service.create_mask(window_inverted, 100, 100)

        # Inverted should be opposite
        np.testing.assert_array_almost_equal(
            mask_normal + mask_inverted, np.ones((100, 100)), decimal=1
        )

    def test_softness(self, power_windows_service):
        """Test mask softness"""
        window_hard = PowerWindow(
            id="hard",
            window_type=WindowType.CIRCULAR,
            center=(0.5, 0.5),
            size=(0.3, 0.3),
            softness=0.0,
        )

        window_soft = PowerWindow(
            id="soft",
            window_type=WindowType.CIRCULAR,
            center=(0.5, 0.5),
            size=(0.3, 0.3),
            softness=0.2,
        )

        mask_hard = power_windows_service.create_mask(window_hard, 100, 100)
        mask_soft = power_windows_service.create_mask(window_soft, 100, 100)

        # Soft mask should have more gradual transitions
        # Hard mask should have more 0s and 1s
        unique_hard = len(np.unique(mask_hard))
        unique_soft = len(np.unique(mask_soft))

        # Soft should have more unique values (smoother gradient)
        assert unique_soft >= unique_hard


class TestColorIntegration:
    """Integration tests for the color module"""

    def test_full_color_grading_workflow(self):
        """Test complete color grading workflow"""
        # Create services
        color_service = ColorService(gpu_acceleration=False)
        scopes_service = ScopesService()

        # Create test frame
        frame = np.random.rand(200, 200, 3).astype(np.float32)

        # Analyze frame
        exposure = scopes_service.analyze_exposure(frame)

        # Create grade based on analysis
        grade = ColorGrade(
            contrast=1.2 if exposure["dynamic_range"] < 0.8 else 1.0, saturation=1.1
        )

        # Apply grade
        result = color_service.apply_grade(frame, grade)

        # Generate scopes for result
        waveform = scopes_service.waveform(result)

        assert result.shape == frame.shape
        assert waveform.shape[2] == 3

    def test_secondary_correction_with_qualifier(self):
        """Test secondary color correction using qualifier"""
        color_service = ColorService(gpu_acceleration=False)
        qualifier_service = QualifierService()

        # Create frame with skin tone-like colors
        frame = np.random.rand(100, 100, 3).astype(np.float32)
        frame[:, :, 0] = 0.7  # Red
        frame[:, :, 1] = 0.5  # Green
        frame[:, :, 2] = 0.4  # Blue

        # Create qualifier for skin tone
        qualifier = HSLQualifier(
            hue_center=20.0, hue_width=40.0, sat_low=0.2, lum_low=0.3
        )

        # Generate matte
        result = qualifier_service.qualify(frame, qualifier)

        # Apply correction with matte
        grade = ColorGrade(saturation=1.3)
        corrected = color_service.apply_grade(frame, grade)

        assert corrected.shape == frame.shape
        assert result.matte.shape == frame.shape[:2]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
