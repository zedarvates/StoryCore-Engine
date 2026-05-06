import asyncio
import os
import pytest
from backend.ai_transition_engine import (
    AITransitionEngine,
    AITransitionType,
    AITransitionConfig,
)


@pytest.mark.asyncio
async def test_smart_fade_generation():
    """Test de la génération d'un Smart Fade (Local)."""
    engine = AITransitionEngine()

    # Création de clips de test bidon via FFmpeg
    clip_a = "test_clip_a.mp4"
    clip_b = "test_clip_b.mp4"
    output = "test_transition.mp4"

    # Générer clip A (rouge)
    os.system(f"ffmpeg -y -f lavfi -i color=c=red:s=640x360:d=1 -c:v libx264 {clip_a}")
    # Générer clip B (bleu)
    os.system(f"ffmpeg -y -f lavfi -i color=c=blue:s=640x360:d=1 -c:v libx264 {clip_b}")

    config = AITransitionConfig(duration=0.5, fps=24)

    success = await engine.generate_transition(
        clip_a, clip_b, AITransitionType.SMART_FADE, output, config
    )

    assert success is True
    assert os.path.exists(output)

    # Nettoyage
    for f in [clip_a, clip_b, output, "last_frame.png", "first_frame.png"]:
        if os.path.exists(f):
            os.remove(f)


if __name__ == "__main__":
    asyncio.run(test_smart_fade_generation())
