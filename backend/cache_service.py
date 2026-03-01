import os
import hashlib
import json
import shutil
import logging
import threading
from typing import Optional, Any, Dict
from datetime import datetime, timedelta

class AICacheService:
    """Service de mise en cache pour les opérations AI coûteuses."""
    
    def __init__(self, cache_dir: str = "data/cache/ai"):
        self.cache_dir = cache_dir
        os.makedirs(self.cache_dir, exist_ok=True)
        self.registry_path = os.path.join(self.cache_dir, "registry.json")
        self._lock = threading.Lock()  # Thread safety for concurrent access
        self.registry = self._load_registry()

    def _load_registry(self) -> Dict:
        if os.path.exists(self.registry_path):
            try:
                with open(self.registry_path, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logging.warning(f"Failed to load cache registry: {e}")
                return {}
        return {}

    def _save_registry(self):
        with self._lock:
            with open(self.registry_path, 'w') as f:
                json.dump(self.registry, f, indent=2)

    def _generate_key(self, operation: str, params: Dict) -> str:
        """Génère une clé unique basée sur l'opération et les paramètres."""
        param_str = json.dumps(params, sort_keys=True)
        return hashlib.sha256(f"{operation}_{param_str}".encode()).hexdigest()

    def get_cached_file(self, operation: str, params: Dict) -> Optional[str]:
        """Récupère le chemin d'un fichier en cache si disponible."""
        key = self._generate_key(operation, params)
        with self._lock:
            if key in self.registry:
                file_path = self.registry[key]["file_path"]
                if os.path.exists(file_path):
                    return file_path
        return None

    def cache_file(self, operation: str, params: Dict, source_path: str):
        """Met en cache un fichier résultant d'une opération."""
        key = self._generate_key(operation, params)
        ext = os.path.splitext(source_path)[1]
        cache_path = os.path.join(self.cache_dir, f"{key}{ext}")
        
        shutil.copy2(source_path, cache_path)
        
        with self._lock:
            self.registry[key] = {
                "operation": operation,
                "params": params,
                "file_path": cache_path,
                "timestamp": datetime.utcnow().isoformat()
            }
            self._save_registry()

    def clear_old_cache(self, max_age_days: int = 7):
        """Nettoie le cache plus vieux que max_age_days."""
        if not self.registry:
            return 0
        
        cutoff_time = datetime.utcnow() - timedelta(days=max_age_days)
        keys_to_remove = []
        
        with self._lock:
            for key, entry in self.registry.items():
                timestamp_str = entry.get("timestamp", "")
                if timestamp_str:
                    try:
                        timestamp = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
                        if timestamp.replace(tzinfo=None) < cutoff_time:
                            keys_to_remove.append(key)
                    except (ValueError, TypeError) as e:
                        logging.warning(f"Invalid timestamp format for cache key {key}: {e}")
            
            # Remove files and registry entries
            for key in keys_to_remove:
                entry = self.registry[key]
                file_path = entry.get("file_path")
                if file_path and os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                        logging.info(f"Removed cached file: {file_path}")
                    except OSError as e:
                        logging.warning(f"Failed to remove cached file {file_path}: {e}")
                del self.registry[key]
            
            if keys_to_remove:
                self._save_registry()
                logging.info(f"Cleared {len(keys_to_remove)} old cache entries (older than {max_age_days} days)")
        
        return len(keys_to_remove)
