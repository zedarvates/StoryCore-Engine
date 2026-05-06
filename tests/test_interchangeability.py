import unittest
from src.models.character_ccd import (
    CharacterCoreData,
    VisualProfile,
    NarrativeProfile,
    VoiceProfile,
    ArtStyle,
    CreationMethod,
)
from src.character_wizard.artistic_locks import ArtisticLock, LockingStrength
from src.character_wizard.methodology_switcher import MethodologySwitcher


class TestInterchangeability(unittest.IsolatedAsyncioTestCase):
    async def test_methodology_shift_with_locks(self):
        """Teste le passage de 2D-First à Narrative-First avec des verrous artistiques."""

        # 1. On part d'un personnage créé en 2D avec des verrous stricts
        ccd = CharacterCoreData(
            name="Anya",
            creation_method=CreationMethod.TWO_D_FIRST,
            visual=VisualProfile(
                art_style=ArtStyle.ANIME,
                physical_description="Anime girl with strictly crimson hair.",
            ),
            narrative=NarrativeProfile(),
            voice=VoiceProfile(),
            artistic_locks=[
                ArtisticLock(
                    category="facial",
                    attribute="hair_color",
                    value="crimson",
                    strength=LockingStrength.STRICT,
                )
            ],
        )

        switcher = MethodologySwitcher()

        # 2. On change la méthodologie vers Narrative-First
        print(f"\nInitial Methodology: {ccd.creation_method.value}")
        ccd.creation_method = CreationMethod.NARRATIVE_FIRST

        # 3. On traite le personnage via le switcher
        result = await switcher.execute_pipeline(ccd)

        # 4. Vérification que les verrous sont toujours là et influencent le résultat
        self.assertEqual(len(result.artistic_locks), 1)
        self.assertEqual(result.artistic_locks[0].value, "crimson")
        print("✓ Performance check: Artistic locks preserved.")


if __name__ == "__main__":
    unittest.main()
