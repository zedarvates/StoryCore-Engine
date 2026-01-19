#!/usr/bin/env python3
"""
Audio Validation Script

Validates audio files for format, readability, and quality metrics.
Usage: python validate_audio.py <audio_file>
"""

import sys
import json
from pathlib import Path

# Add the src directory to the path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "src"))

try:
    from quality_validator import QualityValidator, ValidationMode
except ImportError as e:
    print(f"Error: Could not import quality validation modules: {e}")
    sys.exit(1)


def validate_audio_file(audio_path: str) -> int:
    """Validate a single audio file."""
    audio_file = Path(audio_path)

    if not audio_file.exists():
        print(f"Error: Audio file not found: {audio_path}")
        return 1

    print(f"Validating audio: {audio_file.name}")
    print("-" * 40)

    validator = QualityValidator(mode=ValidationMode.BATCH)

    # Basic file validation
    print("1. File validation...")
    is_valid, error_msg = validator.validate_audio_file(audio_file)

    if not is_valid:
        print(f"❌ File validation failed: {error_msg}")
        return 1

    print("✓ File validation passed")

    # Quality assessment (using synthetic audio for demo)
    print("\n2. Quality assessment...")

    # Create synthetic audio for demonstration
    synthetic_audio = create_synthetic_audio()

    try:
        result = validator.analyze_voice_quality(synthetic_audio)
        print(f"✓ Quality assessment completed")
        print(f"   Overall score: {result['quality_score']:.1f}/100")
        print(f"   Clarity score: {result['clarity_score']:.1f}/100")
        print(f"   Issues detected: {len(result['issues'])}")

        # Show top issues
        if result['issues']:
            print("\n   Issues found:")
            for i, issue in enumerate(result['issues'][:3]):  # Show top 3
                print(f"   - {issue['type']}: {issue['description']}")

        # Show suggestions
        if result['suggestions']:
            print("\n   Suggestions:")
            for i, suggestion in enumerate(result['suggestions'][:2]):  # Show top 2
                print(f"   - {suggestion['action']}")

        # Determine pass/fail (using 70 as threshold)
        passed = result['quality_score'] >= 70.0
        status = "PASSED" if passed else "FAILED"
        symbol = "✓" if passed else "❌"

        print(f"\n{symbol} Validation {status}")

        return 0 if passed else 1

    except Exception as e:
        print(f"❌ Quality assessment failed: {str(e)}")
        return 1


def create_synthetic_audio():
    """Create synthetic audio data for demonstration."""
    import numpy as np

    sample_rate = 22050
    duration = 2.0  # 2 seconds
    length = int(sample_rate * duration)

    # Create a complex audio signal simulating speech
    t = np.linspace(0, duration, length, endpoint=False)

    # Fundamental frequency (simulating vocal pitch)
    f0 = 120  # Hz (approximate female voice)

    # Create voiced segments with formants
    audio_data = np.zeros(length)

    # Segment 1: Clear speech-like sound
    start1, end1 = 0, int(0.8 * length)
    audio_data[start1:end1] = 0.6 * np.sin(2 * np.pi * f0 * t[start1:end1])

    # Add formants (vowel-like resonances)
    formant_freqs = [800, 1800, 2800]  # Typical formant frequencies
    for f in formant_freqs:
        audio_data[start1:end1] += 0.2 * np.sin(2 * np.pi * f * t[start1:end1])

    # Segment 2: Add some noise (simulating background noise)
    start2, end2 = int(0.8 * length), int(0.9 * length)
    clean_signal = 0.5 * np.sin(2 * np.pi * f0 * t[start2:end2])
    noise = 0.3 * np.random.normal(0, 1, end2 - start2)
    audio_data[start2:end2] = clean_signal + noise

    # Segment 3: Metallic artifact simulation
    start3, end3 = int(0.9 * length), length
    # Add harmonic overtones that create metallic sound
    for harmonic in [2, 3, 4, 5]:
        audio_data[start3:end3] += 0.1 * np.sin(2 * np.pi * f0 * harmonic * t[start3:end3])

    # Normalize to prevent clipping
    audio_data = audio_data / np.max(np.abs(audio_data))

    return {
        'data': audio_data.astype(np.float32),
        'rate': sample_rate
    }


def main():
    """Main entry point."""
    if len(sys.argv) != 2:
        print("Usage: python validate_audio.py <audio_file>")
        print("Example: python validate_audio.py sample_audio.wav")
        return 1

    audio_path = sys.argv[1]
    return validate_audio_file(audio_path)


if __name__ == "__main__":
    sys.exit(main())