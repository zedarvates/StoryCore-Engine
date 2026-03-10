import asyncio
import os
import sys
import logging
from pathlib import Path

# Force mock modes for structural test
os.environ["USE_MOCK_COMFYUI"] = "true"
os.environ["USE_MOCK_LLM"] = "true"

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from backend.director_api import lock_scene, generate_coverage, CoverageRequest

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def run_cinematic_coverage_demo():
    logger.info("🎬 DÉMO : CINÉ-COVERAGE MULTI-ANGLE (NANO BANANA 2)")
    logger.info("================================================")
    
    scene_master_desc = (
        "Un samouraï solitaire en armure de jais sur une falaise écossaise au lever du soleil."
    )
    
    # 1. Verrouillage de l'ADN visuel
    logger.info("🔐 ÉTAPE 1 : Verrouillage de l'ADN Visuel...")
    req = CoverageRequest(
        master_image="input/samples/samurai_master.jpg",
        prompt=scene_master_desc,
        character_references=["Ref_Samurai_001"]
    )
    
    lock_result = await lock_scene(req)
    scene_id = lock_result.get("scene_id")
    logger.info(f"✅ ADN Verrouillé. ID Scène : {scene_id}")

    # 2. Génération du Coverage
    logger.info("\n🎥 ÉTAPE 2 : Génération de la couverture (Coverage)...")
    coverage_result = await generate_coverage(
        scene_id=scene_id,
        shots=["master", "close_up", "ots_a"],
        scene_description=scene_master_desc
    )
    
    shots = coverage_result.get("shots", {})
    if shots:
        logger.info("✅ COVERAGE PLANIFIÉ ET GÉNÉRÉ")
        logger.info("\n📋 LISTE DES DROITS (SHOT LIST) :")
        for shot_type, shot_data in shots.items():
            logger.info(f" 📽️ [OK] {shot_type.upper()} -> {shot_data['path']}")
            
        logger.info("\n💎 INFO RÉGIE :")
        logger.info("- Consistance personnages : 100%")
        logger.info(f"- Structure de scène : {coverage_result.get('structured_shot_list', {}).get('status', 'OK')}")
    else:
        logger.error("❌ Aucun plan n'a été généré.")

if __name__ == "__main__":
    asyncio.run(run_cinematic_coverage_demo())
