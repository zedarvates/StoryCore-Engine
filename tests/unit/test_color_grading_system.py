"""
Unit tests for the Color Grading System.
Verifies ColorService, LUTService, ScopesService, and QualifierService.
"""

import sys
import numpy as np
import pytest
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.color.color_service import ColorService, ColorGrade
from backend.color.lut_service import LUTService
from backend.color.scopes_service import ScopesService
from backend.color.qualifier_service import QualifierService, HSLQualifier


@pytest.fixture
def color_service():
    return ColorService(gpu_acceleration=False)


@pytest.fixture
def lut_service():
    return LUTService()


@pytest.fixture
def scopes_service():
    return ScopesService()


@pytest.fixture
def qualifier_service():
    return QualifierService()


@pytest.fixture
def sample_frame():
    # Create a 100x100 RGB frame with some color gradient
    frame = np.zeros((100, 100, 3), dtype=np.float32)
    for y in range(100):
        for x in range(100):
            frame[y, x, 0] = x / 100.0  # Red gradient
            frame[y, x, 1] = y / 100.0  # Green gradient
            frame[y, x, 2] = (x + y) / 200.0  # Blue gradient
    return frame


def test_color_service_primary(color_service, sample_frame):
    # Test Lift
    grade = ColorGrade(lift=(0.1, 0.0, 0.0))
    result = color_service.apply_grade(sample_frame, grade)
    assert np.mean(result[:, :, 0]) > np.mean(sample_frame[:, :, 0])

    # Test Gain
    grade = ColorGrade(gain=(1.5, 1.0, 1.0))
    result = color_service.apply_grade(sample_frame, grade)
    assert np.max(result[:, :, 0]) > np.max(sample_frame[:, :, 0])

    # Test Saturation
    grade = ColorGrade(saturation=1.5)
    result = color_service.apply_grade(sample_frame, grade)
    # Average saturation should increase (simplistic check)
    assert np.mean(np.abs(result[:, :, 0] - result[:, :, 1])) > np.mean(
        np.abs(sample_frame[:, :, 0] - sample_frame[:, :, 1])
    )


def test_lut_service_identity(lut_service, sample_frame):
    # Create identity LUT
    grade = ColorGrade(name="Identity")
    lut = lut_service.create_lut_from_grade(grade, size=17)

    result = lut_service.apply_lut(sample_frame, lut)
    # Should be almost identical
    np.testing.assert_allclose(result, sample_frame, atol=1e-3)


def test_scopes_service(scopes_service, sample_frame):
    waveform = scopes_service.waveform(sample_frame, mode="luma")
    assert waveform.shape[0] == 256
    assert waveform.shape[1] == 100
    assert waveform.shape[2] == 3

    vectorscope = scopes_service.vectorscope(sample_frame)
    assert vectorscope.shape == (256, 256, 3)


def test_qualifier_service(qualifier_service, sample_frame):
    # Create a qualifier for red-ish colors
    qualifier = HSLQualifier(hue_center=0.0, hue_width=60.0, sat_low=0.2)

    result = qualifier_service.qualify(sample_frame, qualifier)
    assert result.matte.shape == (100, 100)
    assert np.max(result.matte) <= 1.0
    assert np.min(result.matte) >= 0.0

    # Test refine matte
    refined = qualifier_service.refine_matte(result.matte, softness=2)
    assert refined.shape == (100, 100)


if __name__ == "__main__":
    pytest.main([__file__])
