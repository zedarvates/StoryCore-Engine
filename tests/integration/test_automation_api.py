"""
Tests d'intégration pour l'API Automation
Vérifie les endpoints FastAPI de bout en bout
"""

import pytest
from fastapi.testclient import TestClient
from backend.automation_endpoints import router, automation_store
from src.automation.dialogue_automation import (
    DialogueAutomation,
    DialogueContext,
    DialogueType
)
from src.automation.character_grid import (
    CharacterGridAutomation,
    CharacterGridConfig,
    GridSize
)


@pytest.fixture
def client():
    """Client de test FastAPI"""
    from fastapi import FastAPI
    app = FastAPI()
    app.include_router(router, prefix="/api/automation")
    return TestClient(app)


@pytest.fixture
def dialogue_automation():
    """Instance DialogueAutomation pour les tests"""
    return DialogueAutomation(storage_dir="test_data/dialogues")


@pytest.fixture
def grid_automation():
    """Instance CharacterGridAutomation pour les tests"""
    return CharacterGridAutomation(base_output_dir="test_data/characters")


class TestDialogueEndpoints:
    """Tests pour les endpoints de dialogue"""
    
    def test_generate_dialogue(self, client, dialogue_automation):
        """Test la génération d'un dialogue"""
        response = client.post("/api/automation/dialogue/generate", json={
            "characters": [
                {
                    "character_id": "char_001",
                    "name": "Hero",
                    "archetype": "hero"
                }
            ],
            "context": {
                "location": "Ancient Temple",
                "time_of_day": "night",
                "situation": "combat",
                "mood": "tense"
            },
            "dialogue_type": "conversation",
            "num_lines": 5
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "scene_id" in data
        assert "lines" in data
        assert len(data["lines"]) == 5
    
    def test_get_dialogue_history(self, client, dialogue_automation):
        """Test la récupération de l'historique"""
        # D'abord générer un dialogue
        client.post("/api/automation/dialogue/generate", json={
            "characters": [{"character_id": "test", "name": "Test", "archetype": "hero"}],
            "context": {"location": "Test", "time_of_day": "day", "situation": "neutral", "mood": "neutral"},
            "dialogue_type": "conversation",
            "num_lines": 3
        })
        
        response = client.get("/api/automation/dialogue/history")
        assert response.status_code == 200
        data = response.json()
        assert "scenes" in data
        assert "total_scenes" in data
    
    def test_get_dialogue_by_id(self, client, dialogue_automation):
        """Test la récupération d'un dialogue spécifique"""
        # Générer un dialogue
        generate_response = client.post("/api/automation/dialogue/generate", json={
            "characters": [{"character_id": "test", "name": "Test", "archetype": "hero"}],
            "context": {"location": "Test", "time_of_day": "day", "situation": "neutral", "mood": "neutral"},
            "dialogue_type": "conversation",
            "num_lines": 3
        })
        scene_id = generate_response.json()["scene_id"]
        
        # Récupérer le dialogue
        response = client.get(f"/api/automation/dialogue/{scene_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["scene_id"] == scene_id
    
    def test_clear_dialogue_history(self, client, dialogue_automation):
        """Test la suppression de l'historique"""
        # Générer un dialogue
        client.post("/api/automation/dialogue/generate", json={
            "characters": [{"character_id": "test", "name": "Test", "archetype": "hero"}],
            "context": {"location": "Test", "time_of_day": "day", "situation": "neutral", "mood": "neutral"},
            "dialogue_type": "conversation",
            "num_lines": 3
        })
        
        # Effacer l'historique
        response = client.delete("/api/automation/dialogue/history")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Dialogue history cleared"
    
    def test_generate_dialogue_invalid_archetype(self, client):
        """Test avec un archetype invalide"""
        response = client.post("/api/automation/dialogue/generate", json={
            "characters": [
                {"character_id": "char_001", "name": "Hero", "archetype": "invalid_archetype"}
            ],
            "context": {"location": "Test", "time_of_day": "day", "situation": "neutral", "mood": "neutral"},
            "dialogue_type": "conversation",
            "num_lines": 3
        })
        assert response.status_code == 422


class TestCharacterGridEndpoints:
    """Tests pour les endpoints de grille de personnages"""
    
    def test_generate_character_grid(self, client, grid_automation):
        """Test la génération d'une grille"""
        response = client.post("/api/automation/character/grid/generate", json={
            "character_id": "hero_001",
            "character_name": "Hero Knight",
            "grid_size": "3x3",
            "outfits": ["casual", "armor"],
            "poses": ["standing", "walking", "fighting"],
            "expressions": ["neutral", "angry", "determined"]
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "bundle_id" in data
        assert "character_id" in data
        assert "grid_size" in data
        assert "panels" in data
    
    def test_get_character_grid(self, client, grid_automation):
        """Test la récupération d'une grille"""
        # Générer une grille
        generate_response = client.post("/api/automation/character/grid/generate", json={
            "character_id": "test_hero",
            "character_name": "Test Hero",
            "grid_size": "2x2"
        })
        bundle_id = generate_response.json()["bundle_id"]
        
        # Récupérer la grille
        response = client.get(f"/api/automation/character/grid/{bundle_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["bundle_id"] == bundle_id
    
    def test_get_character_grids(self, client, grid_automation):
        """Test la récupération de toutes les grilles d'un personnage"""
        # Générer plusieurs grilles
        for i in range(3):
            client.post("/api/automation/character/grid/generate", json={
                "character_id": "multi_grid_hero",
                "character_name": f"Hero {i}",
                "grid_size": "2x2"
            })
        
        response = client.get("/api/automation/character/multi_grid_hero/grids")
        assert response.status_code == 200
        data = response.json()
        assert "grids" in data
        assert len(data["grids"]) >= 3
    
    def test_get_latest_grid(self, client, grid_automation):
        """Test la récupération de la grille la plus récente"""
        # Générer plusieurs grilles
        for i in range(2):
            client.post("/api/automation/character/grid/generate", json={
                "character_id": "latest_test_hero",
                "character_name": f"Hero {i}",
                "grid_size": "3x3"
            })
        
        response = client.get("/api/automation/character/latest_test_hero/latest-grid")
        assert response.status_code == 200
        data = response.json()
        assert "bundle_id" in data
        assert "grid_size" in data
    
    def test_get_grid_layouts(self, client):
        """Test la récupération des layouts disponibles"""
        response = client.get("/api/automation/character/grid/layouts")
        assert response.status_code == 200
        data = response.json()
        assert "layouts" in data
        assert "2x2" in data["layouts"]
        assert "3x3" in data["layouts"]
        assert "4x4" in data["layouts"]
    
    def test_get_grid_options(self, client):
        """Test la récupération des options disponibles"""
        response = client.get("/api/automation/character/grid/options")
        assert response.status_code == 200
        data = response.json()
        assert "poses" in data
        assert "expressions" in data
        assert "outfits" in data
        assert "camera_angles" in data
        assert "lighting" in data
    
    def test_generate_grid_invalid_size(self, client):
        """Test avec une taille de grille invalide"""
        response = client.post("/api/automation/character/grid/generate", json={
            "character_id": "test",
            "character_name": "Test",
            "grid_size": "5x5"  # Taille invalide
        })
        assert response.status_code == 422


class TestPromptEnhancementEndpoints:
    """Tests pour les endpoints d'amélioration de prompts"""
    
    def test_enhance_prompt(self, client):
        """Test l'amélioration d'un prompt"""
        response = client.post("/api/automation/prompt/enhance", json={
            "base_prompt": "A knight in shining armor",
            "style": "fantasy",
            "lighting": "cinematic",
            "mood": "epic",
            "quality": "high"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "enhanced_prompt" in data
        assert "negative_prompt" in data
        assert "tags" in data
        # Vérifier que le prompt a été amélioré
        assert len(data["enhanced_prompt"]) > len("A knight in shining armor")
    
    def test_enhance_prompt_minimal(self, client):
        """Test avec un prompt minimal"""
        response = client.post("/api/automation/prompt/enhance", json={
            "base_prompt": "A beautiful landscape"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "enhanced_prompt" in data
        assert "negative_prompt" in data
    
    def test_get_prompt_styles(self, client):
        """Test la récupération des styles disponibles"""
        response = client.get("/api/automation/prompt/styles")
        assert response.status_code == 200
        data = response.json()
        assert "styles" in data
        assert "lighting" in data
        assert "moods" in data
        # Vérifier quelques styles
        assert "realistic" in data["styles"]
        assert "fantasy" in data["styles"]
        assert "anime" in data["styles"]
    
    def test_enhance_prompt_empty(self, client):
        """Test avec un prompt vide"""
        response = client.post("/api/automation/prompt/enhance", json={
            "base_prompt": ""
        })
        assert response.status_code == 422


class TestHealthEndpoint:
    """Tests pour l'endpoint de santé"""
    
    def test_health_check(self, client):
        """Test la vérification de l'état"""
        response = client.get("/api/automation/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "components" in data
        assert data["status"] == "healthy"
    
    def test_health_components(self, client):
        """Test les composants de santé"""
        response = client.get("/api/automation/health")
        data = response.json()
        assert "dialogue_automation" in data["components"]
        assert "character_grid" in data["components"]
        assert "prompt_enhancer" in data["components"]


class TestIntegrationScenarios:
    """Scénarios d'intégration de bout en bout"""
    
    def test_full_dialogue_workflow(self, client, dialogue_automation):
        """Scénario complet: générer, lister, récupérer, effacer"""
        # 1. Générer un dialogue
        generate_response = client.post("/api/automation/dialogue/generate", json={
            "characters": [
                {"character_id": "hero_1", "name": "Hero", "archetype": "hero"},
                {"character_id": "villain_1", "name": "Villain", "archetype": "villain"}
            ],
            "context": {
                "location": "Dark Castle",
                "time_of_day": "night",
                "situation": "combat",
                "mood": "tense"
            },
            "dialogue_type": "conflict",
            "num_lines": 8
        })
        assert generate_response.status_code == 200
        scene_id = generate_response.json()["scene_id"]
        
        # 2. Lister l'historique
        history_response = client.get("/api/automation/dialogue/history")
        assert history_response.status_code == 200
        assert history_response.json()["total_scenes"] >= 1
        
        # 3. Récupérer le dialogue spécifique
        get_response = client.get(f"/api/automation/dialogue/{scene_id}")
        assert get_response.status_code == 200
        dialogue_data = get_response.json()
        assert dialogue_data["scene_id"] == scene_id
        assert len(dialogue_data["lines"]) == 8
        
        # 4. Effacer l'historique
        clear_response = client.delete("/api/automation/dialogue/history")
        assert clear_response.status_code == 200
        
        # 5. Vérifier que l'historique est vide
        final_history = client.get("/api/automation/dialogue/history")
        assert final_history.json()["total_scenes"] == 0
    
    def test_full_grid_workflow(self, client, grid_automation):
        """Scénario complet: générer, récupérer, lister"""
        # 1. Générer plusieurs grilles
        for i in range(2):
            response = client.post("/api/automation/character/grid/generate", json={
                "character_id": "workflow_hero",
                "character_name": f"Hero Variant {i}",
                "grid_size": "3x3"
            })
            assert response.status_code == 200
        
        # 2. Récupérer la dernière grille
        latest_response = client.get("/api/automation/character/workflow_hero/latest-grid")
        assert latest_response.status_code == 200
        latest_grid = latest_response.json()
        assert latest_grid["grid_size"] == "3x3"
        
        # 3. Lister toutes les grilles
        list_response = client.get("/api/automation/character/workflow_hero/grids")
        assert list_response.status_code == 200
        grids = list_response.json()["grids"]
        assert len(grids) >= 2
    
    def test_prompt_enhancement_chain(self, client):
        """Chaîne d'amélioration de prompts"""
        # Améliorer un prompt de base
        enhance_response = client.post("/api/automation/prompt/enhance", json={
            "base_prompt": "A warrior standing on a cliff",
            "style": "fantasy",
            "lighting": "golden_hour",
            "mood": "epic"
        })
        assert enhance_response.status_code == 200
        enhanced = enhance_response.json()
        
        # Utiliser le prompt amélioré pour générer une grille
        grid_response = client.post("/api/automation/character/grid/generate", json={
            "character_id": "prompt_warrior",
            "character_name": "Warrior from Prompt",
            "grid_size": "3x3"
        })
        assert grid_response.status_code == 200


class TestErrorHandling:
    """Tests de gestion des erreurs"""
    
    def test_nonexistent_dialogue(self, client):
        """Récupération d'un dialogue inexistant"""
        response = client.get("/api/automation/dialogue/nonexistent_id")
        assert response.status_code == 404
    
    def test_nonexistent_grid(self, client):
        """Récupération d'une grille inexistante"""
        response = client.get("/api/automation/character/grid/nonexistent_id")
        assert response.status_code == 404
    
    def test_nonexistent_character_grids(self, client):
        """Récupération des grilles d'un personnage inexistant"""
        response = client.get("/api/automation/character/nonexistent_character/grids")
        assert response.status_code == 200
        assert response.json()["grids"] == []


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
