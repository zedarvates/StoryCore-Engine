#!/usr/bin/env python3
"""
Script de surveillance et d'alertes pour les opérations d'IA dans StoryCore Engine.
Ce script surveille les performances et l'état des opérations d'IA en production.
"""

import os
import time
import logging
import json
import smtplib
from email.mime.text import MIMEText
from typing import Dict, List, Optional
import requests
import psutil
import yaml

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/storycore/monitor_ai_operations.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class AIOperationsMonitor:
    """Classe pour surveiller les opérations d'IA et envoyer des alertes."""
    
    def __init__(self, config_path: str = 'config/production_config.yaml'):
        """Initialise le moniteur avec la configuration."""
        self.config = self._load_config(config_path)
        self.alert_config = self.config['alerts']
        self.monitoring_config = self.config['monitoring']
        
        # État des alertes
        self.alert_states = {
            'cpu': False,
            'memory': False,
            'gpu': False,
            'model_performance': False
        }
    
    def _load_config(self, config_path: str) -> Dict:
        """Charge la configuration à partir d'un fichier YAML."""
        try:
            with open(config_path, 'r') as f:
                return yaml.safe_load(f)
        except Exception as e:
            logger.error(f"Erreur lors du chargement de la configuration : {e}")
            raise
    
    def check_system_resources(self) -> Dict[str, float]:
        """Vérifie l'utilisation des ressources système."""
        try:
            cpu_usage = psutil.cpu_percent(interval=1)
            memory_usage = psutil.virtual_memory().percent
            
            # Pour le GPU, nous utilisons une approche simplifiée
            # Dans un environnement réel, utiliser des bibliothèques comme pynvml
            gpu_usage = 0.0  # Valeur par défaut
            
            try:
                # Essayer d'obtenir des informations sur le GPU si disponible
                import pynvml
                pynvml.nvmlInit()
                handle = pynvml.nvmlDeviceGetHandleByIndex(0)
                gpu_usage = pynvml.nvmlDeviceGetUtilizationRates(handle).gpu
                pynvml.nvmlShutdown()
                logger.debug(f"GPU usage retrieved successfully: {gpu_usage}%")
            except ImportError:
                logger.warning("pynvml non disponible. Surveillance du GPU désactivée.")
            except Exception as e:
                logger.warning(f"Erreur lors de la récupération de l'utilisation du GPU : {e}")
            
            logger.debug(f"System resources - CPU: {cpu_usage}%, Memory: {memory_usage}%, GPU: {gpu_usage}%")
            
            return {
                'cpu': cpu_usage,
                'memory': memory_usage,
                'gpu': gpu_usage
            }
        except Exception as e:
            logger.error(f"Erreur lors de la vérification des ressources système : {e}")
            return {'cpu': 0.0, 'memory': 0.0, 'gpu': 0.0}
    
    def check_model_performance(self) -> Dict[str, bool]:
        """Vérifie les performances des modèles d'IA."""
        # Dans un environnement réel, cela impliquerait des appels API
        # aux endpoints de surveillance des modèles
        
        # Pour cet exemple, nous simulons des vérifications
        model_status = {}
        for model_type in self.config['models']['paths'].keys():
            # Simuler une vérification de performance
            # Dans la réalité, cela pourrait être une requête HTTP ou une vérification de fichier
            # Ajouter une logique de vérification plus réaliste
            try:
                # Vérifier si le modèle existe
                model_path = self.config['models']['paths'][model_type]
                if not os.path.exists(model_path):
                    model_status[model_type] = False
                    continue
                
                # Vérifier les fichiers requis
                required_files = {
                    'text_generation': ['model.bin', 'config.json'],
                    'image_generation': ['model.ckpt', 'config.yaml'],
                    'video_generation': ['model.pth', 'metadata.json'],
                    'style_transfer': ['model.h5', 'params.json'],
                    'super_resolution': ['model.onnx', 'config.toml']
                }
                
                for file in required_files.get(model_type, []):
                    if not os.path.exists(os.path.join(model_path, file)):
                        model_status[model_type] = False
                        break
                else:
                    model_status[model_type] = True
            except Exception as e:
                logger.error(f"Erreur lors de la vérification du modèle {model_type} : {e}")
                model_status[model_type] = False
        
        return model_status
    
    def check_alert_thresholds(self, metrics: Dict[str, float]) -> List[str]:
        """Vérifie si les métriques dépassent les seuils d'alerte."""
        alerts = []
        thresholds = self.alert_config.get('thresholds', {})
        
        # Vérifier si les seuils sont configurés
        if not thresholds:
            self.logger.warning("Aucun seuil d'alerte configuré")
            return alerts
        
        if metrics['cpu'] > thresholds.get('cpu', 90):
            alerts.append('cpu')
        if metrics['memory'] > thresholds.get('memory', 85):
            alerts.append('memory')
        if metrics['gpu'] > thresholds.get('gpu', 95):
            alerts.append('gpu')
        
        return alerts
    
    def send_alert(self, alert_type: str, message: str):
        """Envoie une alerte via email et Slack."""
        try:
            # Envoyer un email
            if self.alert_config['email']['enabled']:
                self._send_email_alert(alert_type, message)
            
            # Envoyer une alerte Slack
            if self.alert_config['slack']['enabled']:
                self._send_slack_alert(alert_type, message)
            
            logger.info(f"Alerte envoyée pour {alert_type}: {message}")
        except Exception as e:
            logger.error(f"Erreur lors de l'envoi de l'alerte : {e}")
    
    def _send_email_alert(self, alert_type: str, message: str):
        """Envoie une alerte par email."""
        try:
            email_config = self.alert_config['email']
            
            msg = MIMEText(f"Alerte StoryCore - {alert_type}\n\n{message}")
            msg['Subject'] = f"Alerte StoryCore: {alert_type}"
            msg['From'] = email_config['sender']
            msg['To'] = ', '.join(email_config['recipients'])
            
            with smtplib.SMTP(email_config['smtp_server'], email_config['smtp_port']) as server:
                server.starttls()
                # Note: Dans un environnement réel, utilisez des identifiants sécurisés
                # server.login(username, password)
                server.send_message(msg)
        except Exception as e:
            logger.error(f"Erreur lors de l'envoi de l'alerte email : {e}")
    
    def _send_slack_alert(self, alert_type: str, message: str):
        """Envoie une alerte via Slack."""
        try:
            webhook_url = self.alert_config['slack']['webhook_url']
            payload = {
                'text': f":warning: *Alerte StoryCore - {alert_type}*\n\n{message}",
                'username': 'StoryCore Monitor',
                'icon_emoji': ':robot_face:'
            }
            
            response = requests.post(webhook_url, json=payload)
            if response.status_code != 200:
                logger.error(f"Échec de l'envoi de l'alerte Slack : {response.text}")
        except Exception as e:
            logger.error(f"Erreur lors de l'envoi de l'alerte Slack : {e}")
    
    def monitor(self):
        """Boucle principale de surveillance."""
        logger.info("Démarrage de la surveillance des opérations d'IA...")
        
        try:
            while True:
                # Vérifier les ressources système
                resources = self.check_system_resources()
                logger.info(f"Utilisation des ressources - CPU: {resources['cpu']}%, Memory: {resources['memory']}%, GPU: {resources['gpu']}%")
                
                # Vérifier les seuils d'alerte
                triggered_alerts = self.check_alert_thresholds(resources)
                
                for alert_type in triggered_alerts:
                    if not self.alert_states[alert_type]:
                        message = f"Seuil dépassé pour {alert_type}: {resources[alert_type]}%"
                        self.send_alert(alert_type, message)
                        self.alert_states[alert_type] = True
                
                # Réinitialiser les alertes si les valeurs sont revenues à la normale
                for alert_type in self.alert_states:
                    if self.alert_states[alert_type] and resources[alert_type] < self.monitoring_config['alerts'][f'threshold_{alert_type}']:
                        self.alert_states[alert_type] = False
                        logger.info(f"Alerte {alert_type} résolue.")
                
                # Vérifier les performances des modèles
                model_status = self.check_model_performance()
                for model_type, status in model_status.items():
                    if not status:
                        message = f"Problème de performance détecté pour le modèle {model_type}"
                        self.send_alert('model_performance', message)
                
                # Attendre avant la prochaine vérification
                time.sleep(60)
                
        except KeyboardInterrupt:
            logger.info("Arrêt de la surveillance...")
        except Exception as e:
            logger.error(f"Erreur dans la boucle de surveillance : {e}")

def main():
    """Fonction principale pour le script de surveillance."""
    try:
        # Initialiser le moniteur
        monitor = AIOperationsMonitor()
        
        # Démarrer la surveillance
        monitor.monitor()
        
    except Exception as e:
        logger.error(f"Erreur dans le script principal : {e}")
        return 1
    
    return 0

if __name__ == '__main__':
    exit(main())