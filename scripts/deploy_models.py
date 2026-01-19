#!/usr/bin/env python3
"""
Script de déploiement et de mise à jour des modèles pour StoryCore Engine.
Ce script gère le déploiement des modèles d'IA et leurs mises à jour en production.
"""

import os
import shutil
import yaml
import json
import time
import logging
from typing import Dict, List, Optional
from pathlib import Path

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/storycore/deploy_models.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ModelDeployer:
    """Classe pour gérer le déploiement et la mise à jour des modèles."""
    
    def __init__(self, config_path: str = 'config/production_config.yaml'):
        """Initialise le déployeur de modèles avec la configuration."""
        self.config = self._load_config(config_path)
        self.model_paths = self.config['models']['paths']
        self.backup_path = self.config['models']['update']['backup_path']
        self.update_interval = self._parse_interval(self.config['models']['update']['interval'])
        
        # Créer les répertoires nécessaires
        self._ensure_directories()
    
    def _load_config(self, config_path: str) -> Dict:
        """Charge la configuration à partir d'un fichier YAML."""
        try:
            with open(config_path, 'r') as f:
                return yaml.safe_load(f)
        except Exception as e:
            logger.error(f"Erreur lors du chargement de la configuration : {e}")
            raise
    
    def _parse_interval(self, interval: str) -> int:
        """Parse l'intervalle de mise à jour en secondes."""
        if interval.endswith('h'):
            return int(interval[:-1]) * 3600
        elif interval.endswith('m'):
            return int(interval[:-1]) * 60
        else:
            return int(interval)
    
    def _ensure_directories(self):
        """Crée les répertoires nécessaires s'ils n'existent pas."""
        for path in self.model_paths.values():
            os.makedirs(path, exist_ok=True)
        os.makedirs(self.backup_path, exist_ok=True)
    
    def backup_models(self) -> bool:
        """Crée une sauvegarde des modèles actuels."""
        try:
            timestamp = time.strftime('%Y%m%d_%H%M%S')
            backup_dir = os.path.join(self.backup_path, f'backup_{timestamp}')
            os.makedirs(backup_dir, exist_ok=True)
            
            # Vérifier l'espace disque avant la sauvegarde
            total_size = 0
            for model_type, model_path in self.model_paths.items():
                if os.path.exists(model_path):
                    for dirpath, dirnames, filenames in os.walk(model_path):
                        for f in filenames:
                            fp = os.path.join(dirpath, f)
                            total_size += os.path.getsize(fp)
            
            # Convertir en Mo
            total_size_mb = total_size / (1024 * 1024)
            
            # Vérifier l'espace disque disponible
            disk_usage = psutil.disk_usage(self.backup_path)
            if disk_usage.free < total_size * 2:  # Besoin d'au moins 2x l'espace
                logger.error(f"Espace disque insuffisant pour la sauvegarde. Nécessaire: {total_size_mb:.2f} Mo, Disponible: {disk_usage.free/(1024*1024):.2f} Mo")
                return False
            
            logger.info(f"Début de la sauvegarde des modèles. Taille totale: {total_size_mb:.2f} Mo")
            
            for model_type, model_path in self.model_paths.items():
                dest = os.path.join(backup_dir, model_type)
                if os.path.exists(model_path):
                    shutil.copytree(model_path, dest)
                    logger.info(f"Modèle {model_type} sauvegardé avec succès")
            
            logger.info(f"Sauvegarde des modèles terminée dans {backup_dir} (Taille: {total_size_mb:.2f} Mo)")
            return True
        except Exception as e:
            logger.error(f"Erreur lors de la sauvegarde des modèles : {e}")
            return False
    
    def deploy_model(self, model_type: str, source_path: str) -> bool:
        """Déploie un modèle spécifique."""
        try:
            dest_path = self.model_paths[model_type]
            
            # Vérifier si le modèle existe déjà
            if os.path.exists(dest_path):
                logger.warning(f"Le modèle {model_type} existe déjà. Sauvegarde en cours...")
                if not self.backup_models():
                    logger.error("Échec de la sauvegarde. Annulation du déploiement.")
                    return False
            
            # Vérifier si le chemin source existe
            if not os.path.exists(source_path):
                logger.error(f"Le chemin source {source_path} n'existe pas.")
                return False
            
            # Déployer le nouveau modèle
            shutil.copytree(source_path, dest_path)
            logger.info(f"Modèle {model_type} déployé avec succès depuis {source_path}")
            return True
        except Exception as e:
            logger.error(f"Erreur lors du déploiement du modèle {model_type} : {e}")
            return False
    
    def update_models(self, model_sources: Dict[str, str]) -> bool:
        """Met à jour les modèles à partir des sources spécifiées."""
        try:
            # Sauvegarder les modèles actuels
            if not self.backup_models():
                logger.error("Échec de la sauvegarde. Annulation de la mise à jour.")
                return False
            
            # Déployer les nouveaux modèles
            for model_type, source_path in model_sources.items():
                if not self.deploy_model(model_type, source_path):
                    logger.error(f"Échec du déploiement du modèle {model_type}. Rollback en cours...")
                    self.rollback_models()
                    return False
            
            logger.info("Tous les modèles ont été mis à jour avec succès.")
            return True
        except Exception as e:
            logger.error(f"Erreur lors de la mise à jour des modèles : {e}")
            return False
    
    def rollback_models(self) -> bool:
        """Effectue un rollback vers la dernière sauvegarde."""
        try:
            # Trouver la dernière sauvegarde
            backups = sorted(
                [d for d in os.listdir(self.backup_path) if d.startswith('backup_')],
                reverse=True
            )
            
            if not backups:
                logger.error("Aucune sauvegarde disponible pour le rollback.")
                return False
            
            latest_backup = os.path.join(self.backup_path, backups[0])
            logger.info(f"Rollback vers la sauvegarde : {latest_backup}")
            
            # Restaurer chaque modèle
            for model_type in self.model_paths.keys():
                source = os.path.join(latest_backup, model_type)
                dest = self.model_paths[model_type]
                
                if os.path.exists(dest):
                    shutil.rmtree(dest)
                
                if os.path.exists(source):
                    shutil.copytree(source, dest)
            
            logger.info("Rollback terminé avec succès.")
            return True
        except Exception as e:
            logger.error(f"Erreur lors du rollback : {e}")
            return False
    
    def check_model_integrity(self, model_type: str) -> bool:
        """Vérifie l'intégrité d'un modèle déployé."""
        try:
            model_path = self.model_paths[model_type]
            
            # Vérifications basiques
            if not os.path.exists(model_path):
                logger.error(f"Le modèle {model_type} n'existe pas.")
                return False
            
            # Ajouter des vérifications spécifiques selon le type de modèle
            # Par exemple, vérifier la présence de fichiers clés
            required_files = {
                'text_generation': ['model.bin', 'config.json'],
                'image_generation': ['model.ckpt', 'config.yaml'],
                'video_generation': ['model.pth', 'metadata.json'],
                'style_transfer': ['model.h5', 'params.json'],
                'super_resolution': ['model.onnx', 'config.toml']
            }
            
            for file in required_files.get(model_type, []):
                if not os.path.exists(os.path.join(model_path, file)):
                    logger.error(f"Fichier requis manquant pour {model_type} : {file}")
                    return False
            
            logger.info(f"Intégrité du modèle {model_type} vérifiée avec succès.")
            return True
        except Exception as e:
            logger.error(f"Erreur lors de la vérification de l'intégrité du modèle {model_type} : {e}")
            return False
    
    def monitor_models(self) -> Dict[str, bool]:
        """Surveille l'état de tous les modèles."""
        results = {}
        for model_type in self.model_paths.keys():
            results[model_type] = self.check_model_integrity(model_type)
        return results

def main():
    """Fonction principale pour le script de déploiement."""
    try:
        # Initialiser le déployeur
        deployer = ModelDeployer()
        
        # Exemple de déploiement
        # Remplacer par les chemins réels des modèles
        model_sources = {
            'text_generation': '/path/to/new/text_model',
            'image_generation': '/path/to/new/image_model',
            'video_generation': '/path/to/new/video_model',
            'style_transfer': '/path/to/new/style_model',
            'super_resolution': '/path/to/new/super_res_model'
        }
        
        # Mettre à jour les modèles
        if deployer.update_models(model_sources):
            logger.info("Mise à jour des modèles terminée avec succès.")
        else:
            logger.error("Échec de la mise à jour des modèles.")
        
        # Surveiller les modèles
        status = deployer.monitor_models()
        logger.info("État des modèles :")
        for model_type, is_ok in status.items():
            logger.info(f"  {model_type}: {'OK' if is_ok else 'ERREUR'}")
            
    except Exception as e:
        logger.error(f"Erreur dans le script principal : {e}")
        return 1
    
    return 0

if __name__ == '__main__':
    exit(main())