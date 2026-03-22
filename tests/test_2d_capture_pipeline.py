import unittest
import os
import sys
from PIL import Image

# Add src to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from src.models.character_ccd import (
    CharacterCoreData, VisualProfile, NarrativeProfile, VoiceProfile, 
    ArtStyle, CreationMethod
)
from src.character_wizard.methodology_switcher import MethodologySwitcher
from backend.config import settings

# Force mock vision too for simple test
settings.USE_MOCK_COMFYUI = True 

class Test2DCapturePipeline(unittest.IsolatedAsyncioTestCase):
    async def test_2d_sketch_analysis(self):
        """Teste le pipeline 2D-First à partir d'une image de référence."""
        
        # 1. Créer une image de test (simulant une capture d'écran ou un sketch)
        test_img = "test_sketch.png"
        Image.new('RGB', (100, 100), color='blue').save(test_img)
        
        # 2. Initialiser un CCD avec cette image en mode 2D-First
        ccd = CharacterCoreData(
            name="Sketch Girl",
            creation_method=CreationMethod.TWO_D_FIRST,
            visual=VisualProfile(
                reference_images=[test_img]
            ),
            narrative=NarrativeProfile(),
            voice=VoiceProfile()
        )
        
        switcher = MethodologySwitcher()
        
        # 3. Exécuter le pipeline 2D
        print(f"\n🚀 Running 2D-First Pipeline with image: {test_img}")
        result = await switcher.execute_pipeline(ccd)
        
        # 4. Vérifications
        self.assertEqual(result.visual.art_style, ArtStyle.ANIME)
        # L'analyse d'image (mockée) devrait avoir populate les locks ou descriptions
        print(f"Resulting Physical Description: {result.visual.physical_description}")
        print(f"Generated Locks: {[l.attribute for l in result.artistic_locks]}")
        
        # Cleanup
        if os.path.exists(test_img):
            os.remove(test_img)

if __name__ == "__main__":
    unittest.main()
