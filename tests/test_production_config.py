#!/usr/bin/env python3
"""
Tests pour la gestion de configuration prête pour la production.
"""

import unittest
import tempfile
import os
import yaml
from scripts.deploy_models import ModelDeployer
from scripts.deployment_pipeline import DeploymentPipeline


class TestProductionConfiguration(unittest.TestCase):
    """Tests pour la gestion de configuration de production."""

    def setUp(self):
        """Configuration initiale pour les tests."""
        # Créer un fichier de configuration temporaire
        self.config_content = """
version: "1.0.0"
server:
  host: "0.0.0.0"
  port: 8080
  environment: "production"
models:
  paths:
    text_generation: "/tmp/models/text"
    image_generation: "/tmp/models/image"
    video_generation: "/tmp/models/video"
    style_transfer: "/tmp/models/style"
    super_resolution: "/tmp/models/super_res"
  update:
    enabled: true
    interval: "24h"
    rollback_on_failure: true
    backup_path: "/tmp/backups/models"
monitoring:
  alerts:
    threshold_cpu: 90
    threshold_memory: 85
    threshold_gpu: 95
"""
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            f.write(self.config_content)
            self.config_path = f.name

    def tearDown(self):
        """Nettoyage après les tests."""
        if os.path.exists(self.config_path):
            os.unlink(self.config_path)

    def test_config_loading(self):
        """Teste le chargement de la configuration."""
        deployer = ModelDeployer(self.config_path)
        
        self.assertIsNotNone(deployer.config)
        self.assertEqual(deployer.config['version'], "1.0.0")
        self.assertEqual(deployer.config['server']['environment'], "production")

    def test_model_paths_configuration(self):
        """Teste la configuration des chemins des modèles."""
        deployer = ModelDeployer(self.config_path)
        
        self.assertIn('text_generation', deployer.model_paths)
        self.assertIn('image_generation', deployer.model_paths)
        self.assertEqual(len(deployer.model_paths), 5)

    def test_backup_path_configuration(self):
        """Teste la configuration du chemin de sauvegarde."""
        deployer = ModelDeployer(self.config_path)
        
        self.assertIsNotNone(deployer.backup_path)
        self.assertTrue(os.path.exists(deployer.backup_path))

    def test_update_interval_parsing(self):
        """Teste l'analyse de l'intervalle de mise à jour."""
        deployer = ModelDeployer(self.config_path)
        
        # L'intervalle est défini sur "24h" dans la configuration
        self.assertEqual(deployer.update_interval, 24 * 3600)  # 24 heures en secondes

    def test_directory_creation(self):
        """Teste la création des répertoires."""
        deployer = ModelDeployer(self.config_path)
        
        # Vérifier que les répertoires ont été créés
        for path in deployer.model_paths.values():
            self.assertTrue(os.path.exists(path))
        
        self.assertTrue(os.path.exists(deployer.backup_path))

    def test_deployment_pipeline_configuration(self):
        """Teste la configuration du pipeline de déploiement."""
        pipeline = DeploymentPipeline(self.config_path)
        
        self.assertIsNotNone(pipeline.config)
        self.assertEqual(pipeline.config['version'], "1.0.0")
        self.assertEqual(len(pipeline.deployment_steps), 6)

    def test_config_validation(self):
        """Teste la validation de la configuration."""
        # Charger la configuration
        with open(self.config_path, 'r') as f:
            config = yaml.safe_load(f)
        
        # Vérifier les sections requises
        required_sections = ['server', 'models', 'monitoring']
        for section in required_sections:
            self.assertIn(section, config, f"Section manquante: {section}")

    def test_environment_specific_config(self):
        """Teste la configuration spécifique à l'environnement."""
        deployer = ModelDeployer(self.config_path)
        
        # Vérifier la configuration de l'environnement
        self.assertEqual(deployer.config['server']['environment'], "production")
        self.assertFalse(deployer.config['server']['debug'])

    def test_model_update_configuration(self):
        """Teste la configuration de mise à jour des modèles."""
        deployer = ModelDeployer(self.config_path)
        
        update_config = deployer.config['models']['update']
        self.assertTrue(update_config['enabled'])
        self.assertTrue(update_config['rollback_on_failure'])
        self.assertEqual(update_config['interval'], "24h")

    def test_monitoring_configuration(self):
        """Teste la configuration de surveillance."""
        deployer = ModelDeployer(self.config_path)
        
        monitoring_config = deployer.config['monitoring']
        self.assertIn('alerts', monitoring_config)
        
        alerts_config = monitoring_config['alerts']
        self.assertEqual(alerts_config['threshold_cpu'], 90)
        self.assertEqual(alerts_config['threshold_memory'], 85)
        self.assertEqual(alerts_config['threshold_gpu'], 95)

    def test_config_with_missing_sections(self):
        """Teste le comportement avec des sections manquantes."""
        # Créer une configuration incomplète
        incomplete_config = """
version: "1.0.0"
server:
  host: "0.0.0.0"
"""
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            f.write(incomplete_config)
            incomplete_config_path = f.name
        
        try:
            # Cela devrait lever une exception ou gérer les sections manquantes
            with self.assertRaises(Exception):
                ModelDeployer(incomplete_config_path)
        finally:
            if os.path.exists(incomplete_config_path):
                os.unlink(incomplete_config_path)

    def test_config_with_invalid_values(self):
        """Teste le comportement avec des valeurs invalides."""
        # Créer une configuration avec des valeurs invalides
        invalid_config = """
version: "1.0.0"
server:
  host: "0.0.0.0"
  port: "invalid_port"
models:
  paths:
    text_generation: "/invalid/path/with/special/chars:/*"
"""
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            f.write(invalid_config)
            invalid_config_path = f.name
        
        try:
            # Cela devrait gérer les valeurs invalides
            deployer = ModelDeployer(incomplete_config_path)
            # Vérifier que les chemins invalides sont gérés
            self.assertIsNotNone(deployer)
        finally:
            if os.path.exists(invalid_config_path):
                os.unlink(invalid_config_path)


if __name__ == "__main__":
    unittest.main()