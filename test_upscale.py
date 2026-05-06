import os
import subprocess
import sys

# Add src to python path so we can import video_processing_engine
sys.path.append(os.path.join(os.path.dirname(__file__), "src"))

# Add ffmpeg to PATH for subprocess to find it
ffmpeg_bin = os.path.join(os.path.dirname(__file__), "ffmpeg", "bin")
os.environ["PATH"] = ffmpeg_bin + os.pathsep + os.environ["PATH"]

from video_processing_engine import VideoProcessingEngine


def create_test_video(path="input.mp4"):
    print(f"Creating test video at {path}...")
    cmd = [
        "ffmpeg",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "testsrc=duration=1:size=640x360:rate=30",
        "-c:v",
        "libx264",
        path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"FFmpeg error generating test file: {result.stderr}")
        return False
    print("Test video created.")
    return True


def test_upscale():
    if not create_test_video():
        return

    engine = VideoProcessingEngine()

    # We need to simulate self.sr_engine being not None for the upscaling to happen
    print(f"SR Engine initialized: {engine.sr_engine is not None}")

    # Force sr_engine to true to trigger the FFmpeg branch
    if engine.sr_engine is None:
        print(
            "Forcing sr_engine to True for testing the FFmpeg upscaling parameters..."
        )
        engine.sr_engine = True

    print("Starting render with AI upscale...")
    success = engine.render(
        "input.mp4", "output_upscaled.mp4", width=1920, height=1080, use_ai_upscale=True
    )

    if success:
        print("Export successful!")
        if os.path.exists("output_upscaled.mp4"):
            size = os.path.getsize("output_upscaled.mp4")
            print(f"Output file size: {size} bytes")
        else:
            print("output_upscaled.mp4 not found on disk despite returning success.")
    else:
        print("Export failed.")


if __name__ == "__main__":
    test_upscale()
