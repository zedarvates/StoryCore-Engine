#!/usr/bin/env python3
"""
Tests pour les mécanismes de déploiement et de mise à jour des modèles.
"""

import unittest
import tempfile
import os
import shutil
from scripts.deploy_models import ModelDeployer


class TestModelDeployment(unittest.TestCase):
    """Tests pour le déploiement et la mise à jour des modèles."""

    def setUp(self):
        """Configuration initiale pour les tests."""
        # Créer un fichier de configuration temporaire
        self.config_content = """
version: "1.0.0"
models:
  paths:
    text_generation: "/tmp/test_models/text"
    image_generation: "/tmp/test_models/image"
    video_generation: "/tmp/test_models/video"
    style_transfer: "/tmp/test_models/style"
    super_resolution: "/tmp/test_models/super_res"
  update:
    enabled: true
    interval: "24h"
    rollback_on_failure: true
    backup_path: "/tmp/test_backups/models"
"""
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            f.write(self.config_content)
            self.config_path = f.name
        
        self.deployer = ModelDeployer(self.config_path)

    def tearDown(self):
        """Nettoyage après les tests."""
        if os.path.exists(self.config_path):
            os.unlink(self.config_path)
        
        # Nettoyer les répertoires de test
        for path in self.deployer.model_paths.values():
            if os.path.exists(path):
                shutil.rmtree(path)
        
        if os.path.exists(self.deployer.backup_path):
            shutil.rmtree(self.deployer.backup_path)

    def test_model_backup(self):
        """Teste la création de sauvegardes des modèles."""
        # Créer des modèles factices
        for model_type, model_path in self.deployer.model_paths.items():
            os.makedirs(model_path, exist_ok=True)
            # Créer un fichier factice
            with open(os.path.join(model_path, "model.bin"), 'w') as f:
                f.write("fake model data")
        
        # Créer une sauvegarde
        result = self.deployer.backup_models()
        self.assertTrue(result)
        
        # Vérifier que la sauvegarde existe
        backups = os.listdir(self.deployer.backup_path)
        self.assertGreater(len(backups), 0)
        
        # Vérifier le contenu de la sauvegarde
        latest_backup = sorted(backups)[-1]
        backup_path = os.path.join(self.deployer.backup_path, latest_backup)
        
        for model_type in self.deployer.model_paths.keys():
            model_backup_path = os.path.join(backup_path, model_type)
            self.assertTrue(os.path.exists(model_backup_path))
            self.assertTrue(os.path.exists(os.path.join(model_backup_path, "model.bin")))

    def test_model_deployment(self):
        """Teste le déploiement d'un modèle."""
        # Créer un modèle source factice
        source_path = "/tmp/test_source_model"
        os.makedirs(source_path, exist_ok=True)
        with open(os.path.join(source_path, "model.bin"), 'w') as f:
            f.write("new model data")
        
        # Déployer le modèle
        result = self.deployer.deploy_model("text_generation", source_path)
        self.assertTrue(result)
        
        # Vérifier que le modèle a été déployé
        deployed_path = self.deployer.model_paths["text_generation"]
        self.assertTrue(os.path.exists(deployed_path))
        self.assertTrue(os.path.exists(os.path.join(deployed_path, "model.bin")))
        
        # Nettoyer
        shutil.rmtree(source_path)

    def test_model_update(self):
        """Teste la mise à jour des modèles."""
        # Créer des modèles sources factices
        model_sources = {}
        for model_type in self.deployer.model_paths.keys():
            source_path = f"/tmp/test_source_{model_type}"
            os.makedirs(source_path, exist_ok=True)
            with open(os.path.join(source_path, "model.bin"), 'w') as f:
                f.write(f"new {model_type} model data")
            model_sources[model_type] = source_path
        
        # Mettre à jour les modèles
        result = self.deployer.update_models(model_sources)
        self.assertTrue(result)
        
        # Vérifier que les modèles ont été mis à jour
        for model_type, model_path in self.deployer.model_paths.items():
            self.assertTrue(os.path.exists(model_path))
            self.assertTrue(os.path.exists(os.path.join(model_path, "model.bin")))
        
        # Nettoyer
        for source_path in model_sources.values():
            if os.path.exists(source_path):
                shutil.rmtree(source_path)

    def test_model_rollback(self):
        """Teste le rollback des modèles."""
        # Créer une sauvegarde
        self.deployer.backup_models()
        
        # Modifier les modèles actuels
        for model_type, model_path in self.deployer.model_paths.items():
            os.makedirs(model_path, exist_ok=True)
            with open(os.path.join(model_path, "model.bin"), 'w') as f:
                f.write("modified model data")
        
        # Effectuer un rollback
        result = self.deployer.rollback_models()
        self.assertTrue(result)
        
        # Vérifier que les modèles ont été restaurés
        for model_type, model_path in self.deployer.model_paths.items():
            self.assertTrue(os.path.exists(model_path))
            # Le contenu devrait être restauré depuis la sauvegarde
            with open(os.path.join(model_path, "model.bin"), 'r') as f:
                content = f.read()
            self.assertEqual(content, "fake model data")

    def test_model_integrity_check(self):
        """Teste la vérification de l'intégrité des modèles."""
        # Créer un modèle valide
        model_path = self.deployer.model_paths["text_generation"]
        os.makedirs(model_path, exist_ok=True)
        with open(os.path.join(model_path, "model.bin"), 'w') as f:
            f.write("model data")
        with open(os.path.join(model_path, "config.json"), 'w') as f:
            f.write('{"version": "1.0"}')
        
        # Vérifier l'intégrité
        result = self.deployer.check_model_integrity("text_generation")
        self.assertTrue(result)

    def test_model_integrity_check_failure(self):
        """Teste la vérification de l'intégrité avec un modèle incomplet."""
        # Créer un modèle incomplet
        model_path = self.deployer.model_paths["text_generation"]
        os.makedirs(model_path, exist_ok=True)
        # Ne pas créer le fichier config.json requis
        with open(os.path.join(model_path, "model.bin"), 'w') as f:
            f.write("model data")
        
        # Vérifier l'intégrité (devrait échouer)
        result = self.deployer.check_model_integrity("text_generation")
        self.assertFalse(result)

    def test_model_monitoring(self):
        """Teste la surveillance des modèles."""
        # Créer quelques modèles valides et un invalide
        for model_type in ["text_generation", "image_generation"]:
            model_path = self.deployer.model_paths[model_type]
            os.makedirs(model_path, exist_ok=True)
            with open(os.path.join(model_path, "model.bin"), 'w') as f:
                f.write("model data")
            with open(os.path.join(model_path, "config.json"), 'w') as f:
                f.write('{"version": "1.0"}')
        
        # Laisser video_generation sans modèle
        
        # Surveiller les modèles
        results = self.deployer.monitor_models()
        
        self.assertEqual(len(results), 5)  # Tous les types de modèles
        self.assertTrue(results["text_generation"])
        self.assertTrue(results["image_generation"])
        self.assertFalse(results["video_generation"])  # Pas de modèle

    def test_deployment_with_backup_failure(self):
        """Teste le déploiement lorsque la sauvegarde échoue."""
        # Rendre le chemin de sauvegarde inaccessible
        original_backup_path = self.deployer.backup_path
        self.deployer.backup_path = "/root/protected_backup"  # Chemin protégé
        
        # Créer un modèle source factice
        source_path = "/tmp/test_source_model_failure"
        os.makedirs(source_path, exist_ok=True)
        with open(os.path.join(source_path, "model.bin"), 'w') as f:
            f.write("new model data")
        
        # Le déploiement devrait échouer
        result = self.deployer.deploy_model("text_generation", source_path)
        self.assertFalse(result)
        
        # Restaurer le chemin de sauvegarde
        self.deployer.backup_path = original_backup_path
        
        # Nettoyer
        shutil.rmtree(source_path)

    def test_update_with_rollback(self):
        """Teste la mise à jour avec rollback en cas d'échec."""
        # Créer une sauvegarde
        self.deployer.backup_models()
        
        # Créer des modèles sources - un valide et un invalide
        model_sources = {
            "text_generation": "/tmp/test_source_text",
            "image_generation": "/nonexistent/path"  # Chemin invalide
        }
        
        # Créer seulement le modèle text_generation
        os.makedirs(model_sources["text_generation"], exist_ok=True)
        with open(os.path.join(model_sources["text_generation"], "model.bin"), 'w') as f:
            f.write("new text model data")
        
        # La mise à jour devrait échouer et effectuer un rollback
        result = self.deployer.update_models(model_sources)
        self.assertFalse(result)
        
        # Vérifier que les modèles ont été restaurés
        for model_type, model_path in self.deployer.model_paths.items():
            if os.path.exists(model_path):
                # Le contenu devrait être restauré depuis la sauvegarde
                model_file = os.path.join(model_path, "model.bin")
                if os.path.exists(model_file):
                    with open(model_file, 'r') as f:
                        content = f.read()
                    self.assertEqual(content, "fake model data")
        
        # Nettoyer
        shutil.rmtree(model_sources["text_generation"])


if __name__ == "__main__":
    unittest.main()