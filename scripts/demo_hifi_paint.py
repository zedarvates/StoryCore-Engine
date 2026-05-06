import asyncio
import os
import sys
import logging
from pathlib import Path

# Force mock mode
os.environ["USE_MOCK_COMFYUI"] = "true"

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from backend.kiwiedit_service import get_kiwiedit_service

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def run_hifi_paint_demo():
    logger.info("🎨 DÉMO : HI-FI PAINT - INSERTION CINÉMATIQUE DE HAUTE PRÉCISION")
    logger.info("====================================================================")

    service = get_kiwiedit_service()

    # 1. Scénario : Insertion d'un accessoire clé (un pendentif ancien)
    video_input = "output/nano_banana/samurai_master.mp4"
    prop_image = "assets/props/ancient_pendant_4k.png"
    anchor = "autour du cou du samouraï"

    logger.info(f"🎞️ PLAN SOURCE : {video_input}")
    logger.info(f"💎 ACCESSOIRE : {prop_image}")
    logger.info(f"📍 ANCRAGE : {anchor}")

    # 2. Lancement du processus Hi-Fi Paint (Deep Fuse Neural Rendering)
    logger.info("\n⏳ Lancement du rendu Hi-Fi (Fusion Neurale temporelle)...")
    result = await service.hifi_paint(
        video_path=video_input,
        prop_image_path=prop_image,
        anchor_object=anchor,
        blending_mode="deep_fuse",
    )

    if result["status"] == "completed":
        logger.info("✅ INSERTION RÉUSSIE AVEC SUCCÈS")
        logger.info(f"📁 SORTIE : {result['output_path']}")
        logger.info(f"🏆 SCORE DE FIDÉLITÉ : {result['fidelity_score'] * 100}%")

        logger.info("\n📋 DÉTAILS TECHNIQUES DE LA FUSION :")
        logger.info(" - Perspective : Warp adaptatif par frame (Temporal Consistency)")
        logger.info(" - Éclairage : Correspondance HDR extraction des light probes")
        logger.info(" - Grain : Injection de grain 35mm pour matcher le plan original")
        logger.info(
            " - Focus : Flou de profondeur (Depth-aware Bokeh) appliqué sur l'accessoire"
        )
    else:
        logger.error(f"❌ ÉCHEC : {result.get('error')}")


if __name__ == "__main__":
    asyncio.run(run_hifi_paint_demo())
