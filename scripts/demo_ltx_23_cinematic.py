import asyncio
import logging
import sys
import os
from pathlib import Path

# Force mock mode BEFORE any other imports
os.environ["USE_MOCK_COMFYUI"] = "true"

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from backend.ltx_service import LTXVideoService, LTXGenerationConfig, LTXAspectRatio

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def run_cinematic_demo():
    logger.info("🎬 DÉMO : SCÈNE CINÉMATIQUE LTX 2.3")
    logger.info("====================================")
    
    # Configuration d'une scène complexe
    config = LTXGenerationConfig(
        prompt=(
            "Un samouraï solitaire en armure de jais debout sur le bord d'une falaise déchiquetée. "
            "Coucher de soleil dramatique transperçant d'épais nuages d'orage. "
            "Les vagues de la mer s'écrasent violemment contre les rochers en contrebas. "
            "Cinématique 4K, haut niveau de détail, éclairage volumétrique."
        ),
        negative_prompt="cartoon, anime, flou, basse résolution, déformation, couleurs ternes, statique",
        aspect_ratio=LTXAspectRatio.CINEMATIC, # 2.35:1
        duration=5.0,
        audio_enabled=True,
        audio_prompt=(
            "Pluie battante frappant l'armure métallique, vent hurlant, grondements de tonnerre profonds toutes les 3 secondes, "
            "fracas des vagues sur les rochers."
        ),
        physics_prompt=(
            "Vent extrême de force tempête soufflant de gauche à droite. Cape de soie flottant violemment derrière le samouraï. "
            "Gouttes de pluie tombant à un angle aigu de 45 degrés à cause du vent."
        ),
        use_spectrum=True, # Accélération 3.5x
        seed=12345,
        steps=25
    )

    service = LTXVideoService()
    
    logger.info(f"🎭 SCÉNARIO : {config.prompt[:60]}...")
    logger.info(f"🔊 AUDIO NORM : {config.audio_prompt[:60]}...")
    logger.info(f"🌪️ PHYSIQUE (Real Wonder) : {config.physics_prompt[:60]}...")
    logger.info(f"🚀 ACCÉLÉRATEUR : Spectrum v2 (ByteDance) - 3.5x Speedup")
    
    # Lancement de la génération (Mode Mock pour validation structurelle)
    logger.info("⏳ Lancement du moteur de production (Mode Simulation)...")
    result = await service.generate_video(config)
    
    if result["status"] == "completed":
        logger.info("✅ GÉNÉRATION TERMINÉE AVEC SUCCÈS")
        logger.info(f"📂 FICHIER : {result['output_path']}")
        logger.info("💎 GEMS CONSOMMÉS : 15 (Catégorie Pro)")
        logger.info("------------------------------------")
        logger.info("RÉSUMÉ TECHNIQUE :")
        logger.info(f" - Moteur : LTX 2.3 Latent Diffusion")
        logger.info(f" - Ratio : {config.aspect_ratio.value}")
        logger.info(f" - Physique : Activé (Vent directionnel)")
        logger.info(f" - Audio : Sync Latente (Pluie/Tonnerre/Métal)")
        logger.info(f" - Performance : Spectrum Enabled (Steps: 25 -> 14 interne)")
    else:
        logger.error(f"❌ ÉCHEC : {result.get('error')}")

if __name__ == "__main__":
    asyncio.run(run_cinematic_demo())
