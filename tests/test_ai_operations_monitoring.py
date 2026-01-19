#!/usr/bin/env python3
"""
Tests pour la surveillance et les alertes des opérations d'IA.
"""

import unittest
import tempfile
import os
from unittest.mock import Mock, patch
from scripts.monitor_ai_operations import AIOperationsMonitor


class TestAIOperationsMonitoring(unittest.TestCase):
    """Tests pour la surveillance des opérations d'IA."""

    def setUp(self):
        """Configuration initiale pour les tests."""
        # Créer un fichier de configuration temporaire
        self.config_content = """
version: "1.0.0"
monitoring:
  enabled: true
  alerts:
    threshold_cpu: 90
    threshold_memory: 85
    threshold_gpu: 95
alerts:
  email:
    enabled: true
    smtp_server: "smtp.example.com"
    smtp_port: 587
    sender: "alerts@storycore.com"
    recipients:
      - "admin@storycore.com"
  slack:
    enabled: true
    webhook_url: "https://hooks.slack.com/services/XXX/YYY/ZZZ"
models:
  paths:
    text_generation: "/tmp/models/text"
    image_generation: "/tmp/models/image"
"""
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            f.write(self.config_content)
            self.config_path = f.name
        
        self.monitor = AIOperationsMonitor(self.config_path)

    def tearDown(self):
        """Nettoyage après les tests."""
        if os.path.exists(self.config_path):
            os.unlink(self.config_path)

    def test_resource_monitoring(self):
        """Teste la surveillance des ressources système."""
        resources = self.monitor.check_system_resources()
        
        self.assertIsNotNone(resources)
        self.assertIn('cpu', resources)
        self.assertIn('memory', resources)
        self.assertIn('gpu', resources)
        
        # Vérifier que les valeurs sont dans des plages valides
        self.assertGreaterEqual(resources['cpu'], 0)
        self.assertLessEqual(resources['cpu'], 100)
        self.assertGreaterEqual(resources['memory'], 0)
        self.assertLessEqual(resources['memory'], 100)

    def test_alert_thresholds(self):
        """Teste la vérification des seuils d'alerte."""
        # Simuler des ressources avec des valeurs élevées
        high_resources = {
            'cpu': 95.0,
            'memory': 90.0,
            'gpu': 98.0
        }
        
        alerts = self.monitor.check_alert_thresholds(high_resources)
        
        self.assertGreater(len(alerts), 0)
        self.assertIn('cpu', alerts)
        self.assertIn('memory', alerts)
        self.assertIn('gpu', alerts)

    def test_model_performance_check(self):
        """Teste la vérification des performances des modèles."""
        model_status = self.monitor.check_model_performance()
        
        self.assertIsNotNone(model_status)
        self.assertIn('text_generation', model_status)
        self.assertIn('image_generation', model_status)

    def test_alert_sending(self):
        """Teste l'envoi d'alertes."""
        # Mock des méthodes d'envoi
        with patch.object(self.monitor, '_send_email_alert') as mock_email, \
             patch.object(self.monitor, '_send_slack_alert') as mock_slack:
            
            self.monitor.send_alert('test_alert', 'Test alert message')
            
            # Vérifier que les méthodes ont été appelées
            if self.monitor.alert_config['email']['enabled']:
                mock_email.assert_called_once_with('test_alert', 'Test alert message')
            
            if self.monitor.alert_config['slack']['enabled']:
                mock_slack.assert_called_once_with('test_alert', 'Test alert message')

    def test_email_alert(self):
        """Teste l'envoi d'alertes par email."""
        # Mock de smtplib
        with patch('smtplib.SMTP') as mock_smtp:
            mock_server = Mock()
            mock_smtp.return_value.__enter__.return_value = mock_server
            
            self.monitor._send_email_alert('test_alert', 'Test alert message')
            
            # Vérifier que le serveur SMTP a été utilisé
            mock_smtp.assert_called()
            mock_server.send_message.assert_called()

    def test_slack_alert(self):
        """Teste l'envoi d'alertes via Slack."""
        # Mock de requests
        with patch('requests.post') as mock_post:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_post.return_value = mock_response
            
            self.monitor._send_slack_alert('test_alert', 'Test alert message')
            
            # Vérifier que la requête a été envoyée
            mock_post.assert_called()
            args, kwargs = mock_post.call_args
            self.assertEqual(kwargs['json']['text'], ':warning: *Alerte StoryCore - test_alert*\n\nTest alert message')

    def test_alert_state_management(self):
        """Teste la gestion de l'état des alertes."""
        # Simuler une alerte déclenchée
        high_resources = {
            'cpu': 95.0,
            'memory': 80.0,
            'gpu': 85.0
        }
        
        alerts = self.monitor.check_alert_thresholds(high_resources)
        
        # Traiter les alertes
        for alert_type in alerts:
            if not self.monitor.alert_states[alert_type]:
                self.monitor.alert_states[alert_type] = True
        
        # Vérifier que les états ont été mis à jour
        self.assertTrue(self.monitor.alert_states['cpu'])
        
        # Simuler un retour à la normale
        normal_resources = {
            'cpu': 40.0,
            'memory': 50.0,
            'gpu': 60.0
        }
        
        # Réinitialiser les alertes
        for alert_type in self.monitor.alert_states:
            if self.monitor.alert_states[alert_type] and normal_resources[alert_type] < 90:
                self.monitor.alert_states[alert_type] = False
        
        # Vérifier que les états ont été réinitialisés
        self.assertFalse(self.monitor.alert_states['cpu'])

    def test_monitoring_loop(self):
        """Teste la boucle de surveillance."""
        # Mock de la méthode check_system_resources
        with patch.object(self.monitor, 'check_system_resources') as mock_resources, \
             patch.object(self.monitor, 'check_alert_thresholds') as mock_alerts, \
             patch.object(self.monitor, 'check_model_performance') as mock_models, \
             patch.object(self.monitor, 'send_alert') as mock_send, \
             patch('time.sleep'):  # Mock sleep pour accélérer le test
            
            # Configurer les mocks
            mock_resources.return_value = {'cpu': 50.0, 'memory': 60.0, 'gpu': 70.0}
            mock_alerts.return_value = []
            mock_models.return_value = {'text_generation': True, 'image_generation': True}
            
            # Exécuter la boucle de surveillance pendant quelques itérations
            try:
                # Limiter le nombre d'itérations
                original_sleep = __builtins__['time'].sleep
                iteration_count = [0]
                
                def limited_sleep(seconds):
                    iteration_count[0] += 1
                    if iteration_count[0] >= 3:  # 3 itérations suffisent
                        raise KeyboardInterrupt()
                
                with patch('time.sleep', side_effect=limited_sleep):
                    self.monitor.monitor()
            except KeyboardInterrupt:
                pass
            
            # Vérifier que les méthodes ont été appelées
            self.assertGreater(mock_resources.call_count, 0)
            self.assertGreater(mock_alerts.call_count, 0)
            self.assertGreater(mock_models.call_count, 0)

    def test_config_loading(self):
        """Teste le chargement de la configuration."""
        self.assertIsNotNone(self.monitor.config)
        self.assertEqual(self.monitor.config['version'], "1.0.0")
        self.assertTrue(self.monitor.config['monitoring']['enabled'])

    def test_alert_configuration(self):
        """Teste la configuration des alertes."""
        self.assertTrue(self.monitor.alert_config['email']['enabled'])
        self.assertTrue(self.monitor.alert_config['slack']['enabled'])
        self.assertEqual(self.monitor.alert_config['email']['smtp_port'], 587)

    def test_monitoring_configuration(self):
        """Teste la configuration de surveillance."""
        self.assertEqual(self.monitor.monitoring_config['alerts']['threshold_cpu'], 90)
        self.assertEqual(self.monitor.monitoring_config['alerts']['threshold_memory'], 85)
        self.assertEqual(self.monitor.monitoring_config['alerts']['threshold_gpu'], 95)

    def test_alert_with_disabled_channels(self):
        """Teste les alertes lorsque certains canaux sont désactivés."""
        # Désactiver les alertes email
        self.monitor.alert_config['email']['enabled'] = False
        
        with patch.object(self.monitor, '_send_slack_alert') as mock_slack:
            self.monitor.send_alert('test_alert', 'Test message')
            
            # Seule Slack devrait être appelée
            mock_slack.assert_called_once()


if __name__ == "__main__":
    unittest.main()