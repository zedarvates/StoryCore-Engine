"""
Tests pour le module Character Grid Automation
"""

import pytest
import sys
from pathlib import Path

# Ajouter le répertoire parent au path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.automation.character_grid import (
    CharacterGridAutomation,
    CharacterGridConfig,
    CharacterGridBundle,
    GridSize,
    CharacterPose,
    CharacterOutfit,
    Expression,
    CameraAngle,
    LightingType,
    GridCell
)


class TestGridSize:
    """Tests pour l'énumération GridSize"""
    
    def test_grid_sizes(self):
        """Vérifie les tailles de grille"""
        assert GridSize.GRID_2X2.value == "2x2"
        assert GridSize.GRID_3X3.value == "3x3"
        assert GridSize.GRID_4X4.value == "4x4"


class TestCharacterPose:
    """Tests pour l'énumération CharacterPose"""
    
    def test_basic_poses(self):
        """Vérifie les poses de base"""
        assert CharacterPose.STANDING.value == "standing"
        assert CharacterPose.WALKING.value == "walking"
        assert CharacterPose.SITTING.value == "sitting"
    
    def test_action_poses(self):
        """Vérifie les poses d'action"""
        assert CharacterPose.FIGHTING.value == "fighting"
        assert CharacterPose.RUNNING.value == "running"
        assert CharacterPose.FLYING.value == "flying"
        assert CharacterPose.CASTING.value == "casting"


class TestCharacterOutfit:
    """Tests pour l'énumération CharacterOutfit"""
    
    def test_outfits(self):
        """Vérifie les tenues"""
        assert CharacterOutfit.CASUAL.value == "casual"
        assert CharacterOutfit.FORMAL.value == "formal"
        assert CharacterOutfit.COMBAT.value == "combat"
        assert CharacterOutfit.ARMOR.value == "armor"


class TestExpression:
    """Tests pour l'énumération Expression"""
    
    def test_expressions(self):
        """Vérifie les expressions"""
        assert Expression.NEUTRAL.value == "neutral"
        assert Expression.HAPPY.value == "happy"
        assert Expression.ANGRY.value == "angry"
        assert Expression.SAD.value == "sad"
        assert Expression.DETERMINED.value == "determined"


class TestCharacterGridConfig:
    """Tests pour la classe CharacterGridConfig"""
    
    def test_default_config(self):
        """Test la configuration par défaut"""
        config = CharacterGridConfig(
            character_id="char_001",
            character_name="Test Character"
        )
        
        assert config.character_id == "char_001"
        assert config.character_name == "Test Character"
        assert config.grid_size == GridSize.GRID_3X3
        assert len(config.poses) >= 4
        assert len(config.expressions) >= 4
        assert config.resolution == 512
    
    def test_custom_config(self):
        """Test une configuration personnalisée"""
        config = CharacterGridConfig(
            character_id="hero_001",
            character_name="Hero Knight",
            grid_size=GridSize.GRID_2X2,
            outfits=[CharacterOutfit.ARMOR, CharacterOutfit.CASUAL],
            poses=[CharacterPose.STANDING, CharacterPose.FIGHTING],
            expressions=[Expression.DETERMINED, Expression.ANGRY],
            resolution=1024
        )
        
        assert config.grid_size == GridSize.GRID_2X2
        assert CharacterOutfit.ARMOR in config.outfits
        assert CharacterPose.FIGHTING in config.poses
        assert Expression.DETERMINED in config.expressions
        assert config.resolution == 1024
    
    def test_config_to_dict(self):
        """Test la sérialisation de la configuration"""
        config = CharacterGridConfig(
            character_id="test",
            character_name="Test",
            grid_size=GridSize.GRID_2X2
        )
        
        data = config.to_dict()
        
        assert data["character_id"] == "test"
        assert data["character_name"] == "Test"
        assert data["grid_size"] == "2x2"


class TestGridCell:
    """Tests pour la classe GridCell"""
    
    def test_create_cell(self):
        """Test la création d'une cellule"""
        cell = GridCell(
            cell_id="cell_001",
            row=0,
            col=0,
            pose=CharacterPose.STANDING,
            expression=Expression.NEUTRAL,
            outfit=CharacterOutfit.CASUAL
        )
        
        assert cell.cell_id == "cell_001"
        assert cell.row == 0
        assert cell.col == 0
        assert cell.pose == CharacterPose.STANDING
        assert cell.expression == Expression.NEUTRAL
    
    def test_cell_to_dict(self):
        """Test la sérialisation d'une cellule"""
        cell = GridCell(
            cell_id="cell_002",
            row=1,
            col=2,
            pose=CharacterPose.CASTING,
            expression=Expression.DETERMINED,
            outfit=CharacterOutfit.ROBE
        )
        
        data = cell.to_dict()
        
        assert data["cell_id"] == "cell_002"
        assert data["row"] == 1
        assert data["col"] == 2
        assert data["pose"] == "casting"
        assert data["expression"] == "determined"


class TestCharacterGridAutomation:
    """Tests pour la classe CharacterGridAutomation"""
    
    @pytest.fixture
    def automation(self, tmp_path):
        """Crée une instance de CharacterGridAutomation"""
        return CharacterGridAutomation(base_output_dir=str(tmp_path / "characters"))
    
    def test_initialization(self, automation):
        """Test l'initialisation"""
        assert automation is not None
        assert len(automation.generation_history) == 0
    
    def test_generate_character_grid_2x2(self, automation):
        """Test la génération d'une grille 2x2"""
        config = CharacterGridConfig(
            character_id="test_hero",
            character_name="Test Hero",
            grid_size=GridSize.GRID_2X2,
            poses=[CharacterPose.STANDING, CharacterPose.FIGHTING],
            expressions=[Expression.NEUTRAL, Expression.ANGRY]
        )
        
        bundle = automation.generate_character_grid(config)
        
        assert bundle is not None
        assert bundle.bundle_id is not None
        assert bundle.config.character_id == "test_hero"
        assert len(bundle.panels) == 4  # 2x2 = 4 panneaux
    
    def test_generate_character_grid_3x3(self, automation):
        """Test la génération d'une grille 3x3"""
        config = CharacterGridConfig(
            character_id="test_wizard",
            character_name="Test Wizard",
            grid_size=GridSize.GRID_3X3
        )
        
        bundle = automation.generate_character_grid(config)
        
        assert bundle is not None
        assert len(bundle.panels) == 9  # 3x3 = 9 panneaux
    
    def test_get_bundle_by_id(self, automation):
        """Test la récupération d'un bundle par ID"""
        config = CharacterGridConfig(
            character_id="test_char",
            character_name="Test Char"
        )
        
        bundle = automation.generate_character_grid(config)
        found = automation.get_bundle_by_id(bundle.bundle_id)
        
        assert found is not None
        assert found.bundle_id == bundle.bundle_id
    
    def test_get_character_bundles(self, automation):
        """Test la récupération des bundles d'un personnage"""
        # Générer plusieurs grilles pour le même personnage
        for i in range(3):
            config = CharacterGridConfig(
                character_id="same_char",
                character_name="Same Char"
            )
            automation.generate_character_grid(config)
        
        bundles = automation.get_character_bundles("same_char")
        
        assert len(bundles) == 3
    
    def test_get_latest_bundle(self, automation):
        """Test la récupération du bundle le plus récent"""
        config = CharacterGridConfig(
            character_id="latest_char",
            character_name="Latest Char"
        )
        
        # Générer plusieurs grilles
        old_bundle = automation.generate_character_grid(config)
        
        config2 = CharacterGridConfig(
            character_id="latest_char",
            character_name="Latest Char",
            grid_size=GridSize.GRID_2X2
        )
        new_bundle = automation.generate_character_grid(config2)
        
        latest = automation.get_latest_bundle("latest_char")
        
        assert latest is not None
        assert latest.bundle_id == new_bundle.bundle_id
    
    def test_get_grid_layout(self, automation):
        """Test la récupération des layouts de grille"""
        layout_2x2 = automation.get_grid_layout(GridSize.GRID_2X2)
        layout_3x3 = automation.get_grid_layout(GridSize.GRID_3X3)
        
        assert layout_2x2["size"] == "2x2"
        assert layout_2x2["total"] == 4
        assert layout_3x3["size"] == "3x3"
        assert layout_3x3["total"] == 9
    
    def test_get_available_options(self, automation):
        """Test la récupération des options disponibles"""
        poses = automation.get_available_poses()
        expressions = automation.get_available_expressions()
        outfits = automation.get_available_outfits()
        
        assert len(poses) > 0
        assert len(expressions) > 0
        assert len(outfits) > 0
        assert "standing" in poses
        assert "neutral" in expressions
        assert "casual" in outfits
    
    def test_clear_history(self, automation):
        """Test l'effacement de l'historique"""
        # Générer quelques grilles
        for i in range(3):
            config = CharacterGridConfig(
                character_id=f"char_{i}",
                character_name=f"Char {i}"
            )
            automation.generate_character_grid(config)
        
        assert len(automation.generation_history) == 3
        
        automation.clear_history()
        
        assert len(automation.generation_history) == 0


class TestCharacterGridBundle:
    """Tests pour la classe CharacterGridBundle"""
    
    def test_bundle_to_dict(self, tmp_path):
        """Test la sérialisation d'un bundle"""
        config = CharacterGridConfig(
            character_id="bundle_test",
            character_name="Bundle Test"
        )
        
        automation = CharacterGridAutomation(base_output_dir=str(tmp_path / "characters"))
        bundle = automation.generate_character_grid(config)
        
        data = bundle.to_dict()
        
        assert data["bundle_id"] == bundle.bundle_id
        assert data["config"]["character_id"] == "bundle_test"
        assert data["total_panels"] == len(bundle.panels)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

