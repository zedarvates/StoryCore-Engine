"""
Media Intelligence Engine - Recherche intelligente d'assets multimédias par langage naturel
Inspiré par Adobe Premiere Media Intelligence
"""

import asyncio
import logging
import hashlib
import json
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import numpy as np

try:
    from .circuit_breaker import CircuitBreaker, CircuitBreakerConfig
except ImportError:
    from circuit_breaker import CircuitBreaker, CircuitBreakerConfig

try:
    from .ai_enhancement_engine import AIConfig
except ImportError:
    from ai_enhancement_engine import AIConfig

try:
    import chromadb
    from chromadb.utils import embedding_functions
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False
    logging.warning("ChromaDB not available, using fallback implementation")


class AssetType(Enum):
    """Types d'assets supportés."""
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    TEXT = "text"


class SearchMode(Enum):
    """Modes de recherche."""
    SEMANTIC = "semantic"
    KEYWORD = "keyword"
    HYBRID = "hybrid"
    SIMILARITY = "similarity"


@dataclass
class AssetMetadata:
    """Métadonnées d'un asset."""
    asset_id: str
    asset_type: AssetType
    file_path: str
    file_name: str
    file_size: int
    created_at: datetime
    updated_at: datetime
    project_id: str
    tags: List[str] = field(default_factory=list)
    description: str = ""
    duration: Optional[float] = None  # Pour audio/vidéo
    resolution: Optional[Tuple[int, int]] = None  # Pour image/vidéo
    thumbnail_url: Optional[str] = None
    custom_metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SearchResult:
    """Résultat de recherche."""
    asset_id: str
    asset_type: AssetType
    file_path: str
    file_name: str
    similarity_score: float
    match_type: str  # "semantic", "keyword", "hybrid"
    highlighted_text: Optional[str] = None
    preview_url: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class IndexStats:
    """Statistiques de l'index."""
    total_assets: int
    indexed_assets: int
    index_size_mb: float
    last_indexed: Optional[datetime]
    asset_type_counts: Dict[str, int]


class MediaIntelligenceError(Exception):
    """Exception personnalisée pour Media Intelligence."""
    pass


class MediaIntelligenceEngine:
    """
    Moteur de Media Intelligence pour la recherche intelligente d'assets.
    
    Fonctionnalités:
    - Indexation sémantique des assets
    - Recherche par langage naturel
    - Recherche par similarité visuelle
    - Filtering multicritère
    """
    
    def __init__(self, ai_config: AIConfig = None):
        """Initialize Media Intelligence Engine."""
        self.ai_config = ai_config
        self.logger = logging.getLogger(__name__)
        
        # Circuit breaker pour fault tolerance
        circuit_config = CircuitBreakerConfig(
            failure_rate_threshold=50,
            wait_time_in_open_state=60,
            half_open_requests=3
        )
        self.circuit_breaker = CircuitBreaker(circuit_config)
        
        # Stockage local des assets
        self.assets_index: Dict[str, AssetMetadata] = {}
        self.project_indices: Dict[str, set] = {}  # project_id -> set of asset_ids
        
        # ChromaDB pour embeddings (si disponible)
        self.chroma_client = None
        self.collection = None
        self._init_vector_store()
        
        # Cache de recherche
        self.search_cache: Dict[str, Tuple[List[SearchResult], datetime]] = {}
        self.cache_ttl_seconds = 300  # 5 minutes
        
        # Configuration
        self.embedding_model = "all-MiniLM-L6-v2"  # Sentence transformers
        self.similarity_threshold = 0.7
        
        self.logger.info("Media Intelligence Engine initialized")
    
    def _init_vector_store(self):
        """Initialiser le stockage vectoriel pour les embeddings."""
        if not CHROMADB_AVAILABLE:
            self.logger.warning("ChromaDB not available, using in-memory fallback")
            self.embeddings_cache = {}
            return
        
        try:
            # Initialiser ChromaDB persisté
            self.chroma_client = chromadb.PersistentClient(
                path="./data/media_intelligence"
            )
            
            # Créer ou récupérer la collection
            self.collection = self.chroma_client.get_or_create_collection(
                name="media_assets",
                metadata={"description": "Media assets embeddings for StoryCore"}
            )
            
            self.logger.info("ChromaDB vector store initialized")
        except Exception as e:
            self.logger.warning(f"Failed to initialize ChromaDB: {e}, using fallback")
            self.embeddings_cache = {}
    
    async def initialize(self) -> bool:
        """Initialiser le moteur et ses dépendances."""
        try:
            self.logger.info("Initializing Media Intelligence Engine...")
            
            # Charger les assets existants
            await self._load_existing_assets()
            
            self.logger.info("Media Intelligence Engine initialization complete")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Media Intelligence Engine: {e}")
            return False
    
    async def _load_existing_assets(self):
        """Charger les assets existants depuis le système de fichiers."""
        assets_dirs = [
            Path("./assets/generated"),
            Path("./assets/library"),
            Path("./temp_assets")
        ]
        
        for assets_dir in assets_dirs:
            if assets_dir.exists():
                for file_path in assets_dir.rglob("*"):
                    if file_path.is_file():
                        await self._index_asset_file(file_path)
    
    async def _index_asset_file(self, file_path: Path) -> Optional[str]:
        """Indexer un fichier asset."""
        try:
            # Déterminer le type d'asset
            extension = file_path.suffix.lower()
            asset_type = self._get_asset_type(extension)
            
            if asset_type is None:
                return None
            
            # Générer un ID unique
            asset_id = self._generate_asset_id(file_path)
            
            # Créer les métadonnées
            metadata = AssetMetadata(
                asset_id=asset_id,
                asset_type=asset_type,
                file_path=str(file_path),
                file_name=file_path.name,
                file_size=file_path.stat().st_size,
                created_at=datetime.fromtimestamp(file_path.stat().st_ctime),
                updated_at=datetime.fromtimestamp(file_path.stat().st_mtime),
                project_id=self._extract_project_id(file_path),
                tags=self._extract_tags(file_path),
                description=""
            )
            
            # Extraire la description depuis le nom ou contexte
            metadata.description = self._generate_description(file_path)
            
            # Stocker les métadonnées
            self.assets_index[asset_id] = metadata
            
            # Ajouter à l'index du projet
            project_id = metadata.project_id
            if project_id not in self.project_indices:
                self.project_indices[project_id] = set()
            self.project_indices[project_id].add(asset_id)
            
            # Générer et stocker l'embedding
            await self._generate_embedding(asset_id, metadata)
            
            self.logger.debug(f"Indexed asset: {asset_id}")
            return asset_id
            
        except Exception as e:
            self.logger.error(f"Failed to index asset {file_path}: {e}")
            return None
    
    def _get_asset_type(self, extension: str) -> Optional[AssetType]:
        """Déterminer le type d'asset depuis l'extension."""
        type_mapping = {
            # Images
            '.png': AssetType.IMAGE,
            '.jpg': AssetType.IMAGE,
            '.jpeg': AssetType.IMAGE,
            '.webp': AssetType.IMAGE,
            '.gif': AssetType.IMAGE,
            # Vidéos
            '.mp4': AssetType.VIDEO,
            '.mov': AssetType.VIDEO,
            '.avi': AssetType.VIDEO,
            '.mkv': AssetType.VIDEO,
            '.webm': AssetType.VIDEO,
            # Audio
            '.mp3': AssetType.AUDIO,
            '.wav': AssetType.AUDIO,
            '.flac': AssetType.AUDIO,
            '.aac': AssetType.AUDIO,
            '.ogg': AssetType.AUDIO,
        }
        return type_mapping.get(extension)
    
    def _generate_asset_id(self, file_path: Path) -> str:
        """Générer un ID unique pour l'asset."""
        content_hash = hashlib.md5(
            f"{file_path}:{file_path.stat().st_mtime}".encode()
        ).hexdigest()[:12]
        return f"asset_{file_path.stem}_{content_hash}"
    
    def _extract_project_id(self, file_path: Path) -> str:
        """Extraire l'ID du projet depuis le chemin."""
        # Chercher un dossier de projet dans le chemin
        path_parts = file_path.parts
        for i, part in enumerate(path_parts):
            if part in ['projects', 'project', 'assets']:
                if i + 1 < len(path_parts):
                    return path_parts[i + 1]
        return "default"
    
    def _extract_tags(self, file_path: Path) -> List[str]:
        """Extraire les tags depuis le nom de fichier."""
        tags = []
        
        # Ajouter l'extension comme tag
        tags.append(file_path.suffix.lower().replace('.', ''))
        
        # Parser le nom du fichier pour les tags
        name_parts = file_path.stem.replace('-', ' ').replace('_', ' ').split()
        for part in name_parts:
            if len(part) > 2:
                tags.append(part.lower())
        
        return tags
    
    def _generate_description(self, file_path: Path) -> str:
        """Générer une description pour l'asset."""
        # Utiliser le nom de fichier comme base
        description = file_path.stem.replace('-', ' ').replace('_', ' ')
        
        # Ajouter le type
        asset_type = self._get_asset_type(file_path.suffix.lower())
        if asset_type:
            description += f" ({asset_type.value})"
        
        return description
    
    async def _generate_embedding(self, asset_id: str, metadata: AssetMetadata):
        """Générer et stocker l'embedding sémantique."""
        try:
            # Texte à embedder
            text_to_embed = f"{metadata.description} {' '.join(metadata.tags)}"
            
            if CHROMADB_AVAILABLE and self.collection is not None:
                # Utiliser ChromaDB avec sentence transformers
                from sentence_transformers import SentenceTransformer
                
                model = SentenceTransformer(self.embedding_model)
                embedding = model.encode([text_to_embed])[0].tolist()
                
                self.collection.add(
                    ids=[asset_id],
                    embeddings=[embedding],
                    metadatas=[{
                        "file_name": metadata.file_name,
                        "file_path": metadata.file_path,
                        "asset_type": metadata.asset_type.value,
                        "project_id": metadata.project_id
                    }],
                    documents=[text_to_embed]
                )
            else:
                # Fallback: cache simple (pas de recherche sémantique)
                self.embeddings_cache[asset_id] = text_to_embed
            
            self.logger.debug(f"Generated embedding for asset: {asset_id}")
            
        except ImportError:
            self.logger.warning("sentence-transformers not available, using keyword fallback")
        except Exception as e:
            self.logger.error(f"Failed to generate embedding: {e}")
    
    async def index_project_assets(self, project_id: str) -> Dict[str, Any]:
        """Indexer tous les assets d'un projet."""
        result = {
            "project_id": project_id,
            "indexed_assets": 0,
            "errors": [],
            "duration_seconds": 0.0
        }
        
        start_time = datetime.now()
        
        # Chercher les assets du projet
        project_dir = Path(f"./projects/{project_id}")
        if not project_dir.exists():
            project_dir = Path(f"./assets/projects/{project_id}")
        
        if not project_dir.exists():
            result["errors"].append(f"Project directory not found: {project_id}")
            return result
        
        # Indexer les fichiers
        for file_path in project_dir.rglob("*"):
            if file_path.is_file():
                asset_id = await self._index_asset_file(file_path)
                if asset_id:
                    result["indexed_assets"] += 1
        
        result["duration_seconds"] = (datetime.now() - start_time).total_seconds()
        
        self.logger.info(f"Indexed {result['indexed_assets']} assets for project {project_id}")
        return result
    
    async def search(
        self,
        query: str,
        project_id: Optional[str] = None,
        asset_types: Optional[List[AssetType]] = None,
        search_mode: SearchMode = SearchMode.HYBRID,
        limit: int = 20,
        similarity_threshold: Optional[float] = None
    ) -> List[SearchResult]:
        """
        Rechercher des assets par langage naturel.
        
        Args:
            query: Requête en langage naturel
            project_id: Limiter à un projet (None = tous)
            asset_types: Filtrer par types d'assets
            search_mode: Mode de recherche
            limit: Nombre maximum de résultats
            similarity_threshold: Seuil de similarité
            
        Returns:
            Liste de résultats de recherche triés par pertinence
        """
        # Vérifier le cache
        cache_key = f"{query}:{project_id}:{asset_types}:{search_mode}"
        cached_result = self._get_from_cache(cache_key)
        if cached_result:
            return cached_result
        
        # Appliquer le circuit breaker
        async def _search_operation():
            return await self._perform_search(
                query, project_id, asset_types, search_mode, limit, similarity_threshold
            )
        
        try:
            results = await self.circuit_breaker.call(_search_operation)
            
            # Mettre en cache
            self._save_to_cache(cache_key, results)
            
            return results
            
        except Exception as e:
            self.logger.error(f"Search failed: {e}")
            # Fallback vers recherche par mots-clés
            return await self._keyword_fallback_search(query, project_id, asset_types, limit)
    
    async def _perform_search(
        self,
        query: str,
        project_id: Optional[str],
        asset_types: Optional[List[AssetType]],
        search_mode: SearchMode,
        limit: int,
        similarity_threshold: Optional[float]
    ) -> List[SearchResult]:
        """Effectuer la recherche selon le mode."""
        threshold = similarity_threshold or self.similarity_threshold
        
        if search_mode == SearchMode.SEMANTIC:
            return await self._semantic_search(query, project_id, asset_types, limit, threshold)
        elif search_mode == SearchMode.KEYWORD:
            return await self._keyword_search(query, project_id, asset_types, limit)
        elif search_mode == SearchMode.SIMILARITY:
            return await self._similarity_search(query, project_id, asset_types, limit, threshold)
        else:  # HYBRID
            # Combiner recherche sémantique et par mots-clés
            semantic_results = await self._semantic_search(query, project_id, asset_types, limit, threshold)
            keyword_results = await self._keyword_search(query, project_id, asset_types, limit)
            
            # Fusionner et dédupliquer
            return self._merge_search_results(semantic_results, keyword_results, limit)
    
    async def _semantic_search(
        self,
        query: str,
        project_id: Optional[str],
        asset_types: Optional[List[AssetType]],
        limit: int,
        threshold: float
    ) -> List[SearchResult]:
        """Recherche sémantique avec embeddings."""
        if not CHROMADB_AVAILABLE or self.collection is None:
            return await self._keyword_search(query, project_id, asset_types, limit)
        
        try:
            from sentence_transformers import SentenceTransformer
            
            # Générer l'embedding de la requête
            model = SentenceTransformer(self.embedding_model)
            query_embedding = model.encode([query])[0].tolist()
            
            # Construire les filtres
            where_clause = {}
            if project_id:
                where_clause["project_id"] = project_id
            if asset_types:
                where_clause["asset_type"] = {"$in": [t.value for t in asset_types]}
            
            # Requête dans ChromaDB
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=limit * 2,  # Récupérer plus pour filtrage
                where=where_clause if where_clause else None
            )
            
            # Convertir en SearchResult
            search_results = []
            for i, (doc, metadata, distance) in enumerate(zip(
                results['documents'][0],
                results['metadatas'][0],
                results['distances'][0]
            )):
                # Convertir distance en similarité (distance = 1 - similarité pour cosine)
                similarity = 1.0 - distance
                
                if similarity >= threshold:
                    asset_id = results['ids'][0][i]
                    asset_type = AssetType(metadata['asset_type'])
                    
                    result = SearchResult(
                        asset_id=asset_id,
                        asset_type=asset_type,
                        file_path=metadata['file_path'],
                        file_name=metadata['file_name'],
                        similarity_score=similarity,
                        match_type="semantic",
                        highlighted_text=self._highlight_matches(doc, query),
                        metadata=metadata
                    )
                    search_results.append(result)
            
            # Trier par similarité
            search_results.sort(key=lambda x: x.similarity_score, reverse=True)
            
            return search_results[:limit]
            
        except ImportError:
            self.logger.warning("sentence-transformers not available")
            return await self._keyword_search(query, project_id, asset_types, limit)
        except Exception as e:
            self.logger.error(f"Semantic search failed: {e}")
            return []
    
    async def _keyword_search(
        self,
        query: str,
        project_id: Optional[str],
        asset_types: Optional[List[AssetType]],
        limit: int
    ) -> List[SearchResult]:
        """Recherche par mots-clés dans les métadonnées."""
        query_words = query.lower().split()
        
        results = []
        
        for asset_id, metadata in self.assets_index.items():
            # Filtrer par projet
            if project_id and metadata.project_id != project_id:
                continue
            
            # Filtrer par type
            if asset_types and metadata.asset_type not in asset_types:
                continue
            
            # Calculer le score de correspondance
            score = self._calculate_keyword_score(query_words, metadata)
            
            if score > 0:
                result = SearchResult(
                    asset_id=asset_id,
                    asset_type=metadata.asset_type,
                    file_path=metadata.file_path,
                    file_name=metadata.file_name,
                    similarity_score=score,
                    match_type="keyword",
                    highlighted_text=self._highlight_matches(metadata.description, query),
                    metadata={
                        "tags": metadata.tags,
                        "description": metadata.description
                    }
                )
                results.append(result)
        
        # Trier par score
        results.sort(key=lambda x: x.similarity_score, reverse=True)
        
        return results[:limit]
    
    async def _similarity_search(
        self,
        query: str,
        project_id: Optional[str],
        asset_types: Optional[List[AssetType]],
        limit: int,
        threshold: float
    ) -> List[SearchResult]:
        """Recherche par similarité (basée sur les tags et description)."""
        # Pour l'instant, utiliser la recherche sémantique
        return await self._semantic_search(query, project_id, asset_types, limit, threshold)
    
    def _merge_search_results(
        self,
        semantic_results: List[SearchResult],
        keyword_results: List[SearchResult],
        limit: int
    ) -> List[SearchResult]:
        """Fusionner les résultats sémantique et mots-clés."""
        # Combiner avec déduplication
        seen = set()
        merged = []
        
        # Ajouter d'abord les résultats sémantiques (poids plus élevé)
        for result in semantic_results:
            if result.asset_id not in seen:
                seen.add(result.asset_id)
                result.match_type = "hybrid"
                merged.append(result)
        
        # Ajouter les résultats mots-clés manquants
        for result in keyword_results:
            if result.asset_id not in seen and len(merged) < limit:
                seen.add(result.asset_id)
                result.match_type = "hybrid"
                merged.append(result)
        
        return merged[:limit]
    
    def _calculate_keyword_score(self, query_words: List[str], metadata: AssetMetadata) -> float:
        """Calculer le score de correspondance mots-clés."""
        if not query_words:
            return 0.0
        
        score = 0.0
        description_words = set(metadata.description.lower().split())
        tags_words = set(metadata.tags)
        
        for query_word in query_words:
            # Correspondance exacte dans la description
            if query_word in description_words:
                score += 0.5
            
            # Correspondance dans les tags
            if query_word in tags_words:
                score += 0.3
            
            # Correspondance partielle
            for word in description_words:
                if query_word in word or word in query_word:
                    score += 0.1
                    break
        
        # Normaliser le score
        return min(1.0, score / len(query_words))
    
    def _highlight_matches(self, text: str, query: str) -> str:
        """Surligner les termes de recherche dans le texte."""
        if not query:
            return text
        
        highlighted = text
        query_words = query.lower().split()
        
        for word in query_words:
            if word in highlighted.lower():
                # Remplacer sans changer la casse
                import re
                pattern = re.compile(re.escape(word), re.IGNORECASE)
                highlighted = pattern.sub(f"**{word}**", highlighted)
        
        return highlighted
    
    def _get_from_cache(self, cache_key: str) -> Optional[List[SearchResult]]:
        """Récupérer un résultat depuis le cache."""
        if cache_key in self.search_cache:
            result, timestamp = self.search_cache[cache_key]
            age = (datetime.now() - timestamp).total_seconds()
            if age < self.cache_ttl_seconds:
                return result
            else:
                del self.search_cache[cache_key]
        return None
    
    def _save_to_cache(self, cache_key: str, results: List[SearchResult]):
        """Sauvegarder un résultat dans le cache."""
        self.search_cache[cache_key] = (results, datetime.now())
        
        # Limiter la taille du cache
        if len(self.search_cache) > 1000:
            # Supprimer les entrées les plus anciennes
            sorted_keys = sorted(
                self.search_cache.keys(),
                key=lambda k: self.search_cache[k][1]
            )
            for key in sorted_keys[:100]:
                del self.search_cache[key]
    
    async def _keyword_fallback_search(
        self,
        query: str,
        project_id: Optional[str],
        asset_types: Optional[List[AssetType]],
        limit: int
    ) -> List[SearchResult]:
        """Fallback vers recherche par mots-clés."""
        return await self._keyword_search(query, project_id, asset_types, limit)
    
    async def add_asset(
        self,
        file_path: str,
        project_id: str,
        tags: Optional[List[str]] = None,
        description: Optional[str] = None
    ) -> Optional[str]:
        """Ajouter un asset à l'index."""
        path = Path(file_path)
        
        if not path.exists():
            self.logger.error(f"Asset file not found: {file_path}")
            return None
        
        # Indexer le fichier
        asset_id = await self._index_asset_file(path)
        
        if asset_id and tags:
            self.assets_index[asset_id].tags.extend(tags)
        
        if asset_id and description:
            self.assets_index[asset_id].description = description
        
        return asset_id
    
    async def remove_asset(self, asset_id: str) -> bool:
        """Supprimer un asset de l'index."""
        try:
            # Supprimer de ChromaDB
            if CHROMADB_AVAILABLE and self.collection is not None:
                self.collection.delete(ids=[asset_id])
            
            # Supprimer du cache local
            if asset_id in self.assets_index:
                metadata = self.assets_index[asset_id]
                
                # Supprimer de l'index du projet
                if metadata.project_id in self.project_indices:
                    self.project_indices[metadata.project_id].discard(asset_id)
                
                del self.assets_index[asset_id]
            
            # Supprimer du cache d'embeddings
            if hasattr(self, 'embeddings_cache'):
                self.embeddings_cache.pop(asset_id, None)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to remove asset {asset_id}: {e}")
            return False
    
    async def get_asset_metadata(self, asset_id: str) -> Optional[AssetMetadata]:
        """Récupérer les métadonnées d'un asset."""
        return self.assets_index.get(asset_id)
    
    async def update_asset_metadata(
        self,
        asset_id: str,
        tags: Optional[List[str]] = None,
        description: Optional[str] = None
    ) -> bool:
        """Mettre à jour les métadonnées d'un asset."""
        if asset_id not in self.assets_index:
            return False
        
        metadata = self.assets_index[asset_id]
        
        if tags:
            metadata.tags = tags
        
        if description:
            metadata.description = description
        
        # Régénérer l'embedding
        await self._generate_embedding(asset_id, metadata)
        
        return True
    
    def get_index_stats(self) -> IndexStats:
        """Obtenir les statistiques de l'index."""
        asset_type_counts = {
            "image": 0,
            "video": 0,
            "audio": 0,
            "text": 0
        }
        
        for metadata in self.assets_index.values():
            asset_type_counts[metadata.asset_type.value] += 1
        
        # Calculer la taille approximative
        total_size = sum(m.file_size for m in self.assets_index.values())
        index_size_mb = total_size / (1024 * 1024)
        
        # Dernière indexation (approximatif)
        last_indexed = None
        if self.assets_index:
            last_indexed = max(m.updated_at for m in self.assets_index.values())
        
        return IndexStats(
            total_assets=len(self.assets_index),
            indexed_assets=len(self.assets_index),
            index_size_mb=index_size_mb,
            last_indexed=last_indexed,
            asset_type_counts=asset_type_counts
        )
    
    async def export_index(self, file_path: str):
        """Exporter l'index dans un fichier JSON."""
        export_data = {
            "exported_at": datetime.now().isoformat(),
            "assets": {
                aid: {
                    "asset_id": md.asset_id,
                    "asset_type": md.asset_type.value,
                    "file_path": md.file_path,
                    "file_name": md.file_name,
                    "file_size": md.file_size,
                    "project_id": md.project_id,
                    "tags": md.tags,
                    "description": md.description,
                    "created_at": md.created_at.isoformat(),
                    "updated_at": md.updated_at.isoformat()
                }
                for aid, md in self.assets_index.items()
            }
        }
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False)
        
        self.logger.info(f"Index exported to {file_path}")
    
    async def clear_project_index(self, project_id: str) -> int:
        """Effacer tous les assets d'un projet de l'index."""
        removed_count = 0
        
        if project_id in self.project_indices:
            for asset_id in list(self.project_indices[project_id]):
                if await self.remove_asset(asset_id):
                    removed_count += 1
            
            del self.project_indices[project_id]
        
        self.logger.info(f"Cleared {removed_count} assets for project {project_id}")
        return removed_count
    
    async def shutdown(self):
        """Arrêter le moteur et libérer les ressources."""
        self.logger.info("Shutting down Media Intelligence Engine...")
        
        # Nettoyer le cache
        self.search_cache.clear()
        self.assets_index.clear()
        self.project_indices.clear()
        
        # Fermer ChromaDB
        if self.chroma_client:
            self.chroma_client.close()
        
        self.logger.info("Media Intelligence Engine shutdown complete")


# Factory function
def create_media_intelligence_engine(ai_config: AIConfig = None) -> MediaIntelligenceEngine:
    """Créer et configurer le moteur Media Intelligence."""
    return MediaIntelligenceEngine(ai_config)

