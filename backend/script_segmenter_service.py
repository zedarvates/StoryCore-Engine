"""
Service de segmentation intelligente de scripts.
Découpe les scripts en segments de ~8 secondes pour une génération vidéo stable.

Basé sur l'analyse Robert's Tech Toolbox - Pattern identifié pour la stabilité
de génération vidéo et l'optimisation des formats courts (Shorts, Reels, TikTok).
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Any
from uuid import uuid4
import re
from datetime import datetime
import json
import os
import logging

# Configuration du logging
logger = logging.getLogger(__name__)


@dataclass
class ScriptSegment:
    """Segment de script avec métadonnées"""
    id: str = field(default_factory=lambda: str(uuid4()))
    sequence: int = 0  # Ordre dans le script
    text: str = ""  # Texte du segment
    duration_seconds: float = 8.0  # Durée estimée
    
    # Métadonnées de segmentation
    speaker: str = ""  # Locuteur identifié
    scene_type: str = ""  # dialogue, action, narration, transition
    emotional_tone: str = ""  # neutral, tense, happy, sad, etc.
    
    # Points de coupure
    break_type: str = ""  # natural, speaker_change, scene_change, forced
    break_confidence: float = 0.0
    
    # Prompts suggérés
    visual_prompt: str = ""
    audio_prompt: str = ""
    
    # Timing
    start_time: float = 0.0
    end_time: float = 8.0
    
    def to_dict(self) -> Dict:
        """Convertit le segment en dictionnaire"""
        return {
            "id": self.id,
            "sequence": self.sequence,
            "text": self.text,
            "duration_seconds": self.duration_seconds,
            "speaker": self.speaker,
            "scene_type": self.scene_type,
            "emotional_tone": self.emotional_tone,
            "break_type": self.break_type,
            "break_confidence": self.break_confidence,
            "visual_prompt": self.visual_prompt,
            "audio_prompt": self.audio_prompt,
            "start_time": self.start_time,
            "end_time": self.end_time
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'ScriptSegment':
        """Crée un segment à partir d'un dictionnaire"""
        return cls(
            id=data.get("id", str(uuid4())),
            sequence=data.get("sequence", 0),
            text=data.get("text", ""),
            duration_seconds=data.get("duration_seconds", 8.0),
            speaker=data.get("speaker", ""),
            scene_type=data.get("scene_type", ""),
            emotional_tone=data.get("emotional_tone", ""),
            break_type=data.get("break_type", ""),
            break_confidence=data.get("break_confidence", 0.0),
            visual_prompt=data.get("visual_prompt", ""),
            audio_prompt=data.get("audio_prompt", ""),
            start_time=data.get("start_time", 0.0),
            end_time=data.get("end_time", 8.0)
        )


@dataclass
class SegmentationResult:
    """Résultat complet de la segmentation"""
    id: str = field(default_factory=lambda: str(uuid4()))
    script_id: str = ""
    project_id: str = ""
    segments: List[ScriptSegment] = field(default_factory=list)
    total_duration: float = 0.0
    created_at: datetime = field(default_factory=datetime.now)
    
    # Statistiques
    avg_segment_duration: float = 8.0
    natural_breaks: int = 0
    forced_breaks: int = 0
    
    # Texte original
    original_text: str = ""
    
    # Recommandations
    optimization_suggestions: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        """Convertit le résultat en dictionnaire"""
        return {
            "id": self.id,
            "script_id": self.script_id,
            "project_id": self.project_id,
            "segments": [s.to_dict() for s in self.segments],
            "total_duration": self.total_duration,
            "created_at": self.created_at.isoformat(),
            "avg_segment_duration": self.avg_segment_duration,
            "natural_breaks": self.natural_breaks,
            "forced_breaks": self.forced_breaks,
            "original_text": self.original_text,
            "optimization_suggestions": self.optimization_suggestions
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'SegmentationResult':
        """Crée un résultat à partir d'un dictionnaire"""
        segments = [ScriptSegment.from_dict(s) for s in data.get("segments", [])]
        created_at = data.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        else:
            created_at = datetime.now()
        
        return cls(
            id=data.get("id", str(uuid4())),
            script_id=data.get("script_id", ""),
            project_id=data.get("project_id", ""),
            segments=segments,
            total_duration=data.get("total_duration", 0.0),
            created_at=created_at,
            avg_segment_duration=data.get("avg_segment_duration", 8.0),
            natural_breaks=data.get("natural_breaks", 0),
            forced_breaks=data.get("forced_breaks", 0),
            original_text=data.get("original_text", ""),
            optimization_suggestions=data.get("optimization_suggestions", [])
        )


@dataclass
class NaturalBreakPoint:
    """Point de coupure naturel détecté"""
    position: int
    break_type: str  # speaker_change, scene_change, sentence_end, paragraph_end
    confidence: float
    context: str = ""  # Texte autour du point de coupure


class ScriptSegmenterService:
    """Service principal de segmentation intelligente de scripts"""
    
    # Constantes de segmentation
    TARGET_DURATION = 8.0  # Secondes cibles par segment
    MIN_DURATION = 5.0
    MAX_DURATION = 12.0
    
    # Patterns de détection des locuteurs
    SPEAKER_PATTERN = re.compile(r'^([A-Z][A-Za-z\s]+):\s*(.+)$', re.MULTILINE)
    
    # Patterns de changement de scène
    SCENE_CHANGE_PATTERN = re.compile(
        r'\[(SCENE|COUPURE|INT\.|EXT\.|CUT|FADE)[^\]]*\]|'
        r'^#{1,3}\s+.+$|'  # Titres markdown
        r'^\*\*\*.+\*\*\*$',  # Séparateurs
        re.IGNORECASE | re.MULTILINE
    )
    
    # Patterns de fin de phrase
    SENTENCE_END_PATTERN = re.compile(r'[.!?]\s*[\n\r]+|[.!?]\s{2,}')
    
    # Patterns émotionnels
    EMOTIONAL_PATTERNS = {
        'tense': re.compile(r'\b(tension,urgent,danger,threat,panic,fear,crisis)\b', re.IGNORECASE),
        'happy': re.compile(r'\b(joy,happy,laugh,smile,celebrate,wonderful,amazing)\b', re.IGNORECASE),
        'sad': re.compile(r'\b(sad,tears,cry,grief,loss,mourn,depressed)\b', re.IGNORECASE),
        'angry': re.compile(r'\b(angry,furious,rage,shout,scream,hate,resent)\b', re.IGNORECASE),
        'romantic': re.compile(r'\b(love,romantic,kiss,embrace,passion,heart)\b', re.IGNORECASE),
        'action': re.compile(r'\b(run,fight,chase,escape,attack,battle,action)\b', re.IGNORECASE),
    }
    
    # Types de scène
    SCENE_TYPE_PATTERNS = {
        'dialogue': re.compile(r'^[A-Z][a-z]+:\s*["\']?.+["\']?$', re.MULTILINE),
        'narration': re.compile(r'^[A-Z\(\[].+\.$', re.MULTILINE),
        'action': re.compile(r'\[[A-Z\s]+\]|\([A-Z\s]+\)', re.MULTILINE),
        'transition': re.compile(r'\b(CUT TO|FADE TO|DISSOLVE TO|TIME LAPSE)\b', re.IGNORECASE),
    }
    
    def __init__(self, words_per_minute: int = 150, storage_path: str = "./data/segments"):
        """
        Initialise le service de segmentation.
        
        Args:
            words_per_minute: Vitesse de parole estimée (défaut: 150 mots/minute)
            storage_path: Chemin de stockage des segmentations
        """
        self.words_per_minute = words_per_minute
        self.seconds_per_word = 60.0 / words_per_minute
        self.storage_path = storage_path
        
        # Créer le dossier de stockage si nécessaire
        os.makedirs(storage_path, exist_ok=True)
        logger.info(f"ScriptSegmenterService initialized with {words_per_minute} WPM, storage: {storage_path}")
    
    def estimate_duration(self, text: str, pause_factor: float = 1.1) -> float:
        """
        Estime la durée d'un texte en secondes.
        
        Args:
            text: Texte à analyser
            pause_factor: Facteur de pause pour la ponctuation (défaut: 1.1)
            
        Returns:
            Durée estimée en secondes
        """
        if not text:
            return 0.0
        
        # Compter les mots
        words = len(text.split())
        base_duration = words * self.seconds_per_word
        
        # Ajuster pour la ponctuation (pauses)
        punctuation_count = len(re.findall(r'[.!?,;:]', text))
        pause_adjustment = punctuation_count * 0.2  # ~0.2s par ponctuation
        
        # Ajuster pour les émotions (parler plus lentement)
        emotional_factor = 1.0
        for emotion, pattern in self.EMOTIONAL_PATTERNS.items():
            if pattern.search(text):
                if emotion in ['sad', 'romantic']:
                    emotional_factor = max(emotional_factor, 1.1)
                elif emotion in ['tense', 'action']:
                    emotional_factor = min(emotional_factor, 0.95)
        
        duration = (base_duration + pause_adjustment) * pause_factor * emotional_factor
        return round(duration, 2)
    
    def detect_speakers(self, text: str) -> List[Tuple[str, str, int, int]]:
        """
        Détecte les locuteurs et leurs dialogues.
        
        Args:
            text: Texte du script
            
        Returns:
            Liste de tuples (locuteur, dialogue, position_début, position_fin)
        """
        matches = []
        for match in self.SPEAKER_PATTERN.finditer(text):
            speaker = match.group(1).strip()
            dialogue = match.group(2).strip()
            matches.append((speaker, dialogue, match.start(), match.end()))
        return matches
    
    def detect_scene_changes(self, text: str) -> List[Tuple[str, int]]:
        """
        Détecte les changements de scène.
        
        Args:
            text: Texte du script
            
        Returns:
            Liste de tuples (marqueur, position)
        """
        changes = []
        for match in self.SCENE_CHANGE_PATTERN.finditer(text):
            changes.append((match.group(0).strip(), match.start()))
        return changes
    
    def detect_emotional_tone(self, text: str) -> str:
        """
        Détecte le ton émotionnel d'un texte.
        
        Args:
            text: Texte à analyser
            
        Returns:
            Ton émotionnel détecté
        """
        emotion_scores = {}
        for emotion, pattern in self.EMOTIONAL_PATTERNS.items():
            matches = pattern.findall(text)
            emotion_scores[emotion] = len(matches)
        
        if emotion_scores:
            max_emotion = max(emotion_scores, key=emotion_scores.get)
            if emotion_scores[max_emotion] > 0:
                return max_emotion
        
        return "neutral"
    
    def detect_scene_type(self, text: str) -> str:
        """
        Détecte le type de scène.
        
        Args:
            text: Texte à analyser
            
        Returns:
            Type de scène détecté
        """
        for scene_type, pattern in self.SCENE_TYPE_PATTERNS.items():
            if pattern.search(text):
                return scene_type
        
        # Détection par défaut basée sur le contenu
        if self.SPEAKER_PATTERN.search(text):
            return "dialogue"
        elif text.strip().startswith('[') or text.strip().startswith('('):
            return "action"
        
        return "narration"
    
    def find_natural_breaks(self, text: str) -> List[NaturalBreakPoint]:
        """
        Trouve les points de coupure naturels dans le texte.
        
        Args:
            text: Texte du script
            
        Returns:
            Liste des points de coupure naturels triés par position
        """
        breaks = []
        
        # Changements de locuteur (haute confiance)
        for speaker, dialogue, start, end in self.detect_speakers(text):
            if start > 0:  # Pas au tout début
                context = text[max(0, start-20):min(len(text), end+20)]
                breaks.append(NaturalBreakPoint(
                    position=start,
                    break_type="speaker_change",
                    confidence=0.9,
                    context=context
                ))
        
        # Changements de scène (confiance maximale)
        for scene_marker, pos in self.detect_scene_changes(text):
            context = text[max(0, pos-20):min(len(text), pos+len(scene_marker)+20)]
            breaks.append(NaturalBreakPoint(
                position=pos,
                break_type="scene_change",
                confidence=1.0,
                context=context
            ))
        
        # Fin de paragraphes (bonne confiance)
        for match in re.finditer(r'\n\s*\n', text):
            pos = match.start()
            context = text[max(0, pos-30):min(len(text), pos+30)]
            breaks.append(NaturalBreakPoint(
                position=pos,
                break_type="paragraph_end",
                confidence=0.85,
                context=context
            ))
        
        # Fin de phrases avec ponctuation forte
        for match in self.SENTENCE_END_PATTERN.finditer(text):
            pos = match.end()
            context = text[max(0, pos-30):min(len(text), pos+30)]
            breaks.append(NaturalBreakPoint(
                position=pos,
                break_type="sentence_end",
                confidence=0.7,
                context=context
            ))
        
        # Trier par position
        breaks.sort(key=lambda x: x.position)
        
        # Supprimer les doublons proches
        filtered_breaks = []
        last_pos = -100
        for bp in breaks:
            if bp.position - last_pos > 10:  # Minimum 10 caractères entre les coupures
                filtered_breaks.append(bp)
                last_pos = bp.position
        
        return filtered_breaks
    
    def segment_script(
        self,
        text: str,
        script_id: str = "",
        project_id: str = "",
        target_duration: float = 8.0,
        language: str = "fr"
    ) -> SegmentationResult:
        """
        Segmentation principale du script.
        
        Args:
            text: Texte du script à segmenter
            script_id: Identifiant du script
            project_id: Identifiant du projet
            target_duration: Durée cible par segment en secondes
            language: Langue du script (fr, en, etc.)
            
        Returns:
            Résultat de la segmentation avec tous les segments
        """
        logger.info(f"Starting segmentation for script {script_id}, target duration: {target_duration}s")
        
        result = SegmentationResult(
            script_id=script_id,
            project_id=project_id,
            original_text=text
        )
        
        if not text or not text.strip():
            logger.warning("Empty script text provided")
            return result
        
        # Nettoyer le texte
        text = text.strip()
        
        # Calculer la durée totale estimée
        total_estimated = self.estimate_duration(text)
        
        # Trouver les coupures naturelles
        natural_breaks = self.find_natural_breaks(text)
        logger.info(f"Found {len(natural_breaks)} natural break points")
        
        # Créer les segments
        segments = []
        current_start = 0
        segment_count = 0
        current_time = 0.0
        
        while current_start < len(text):
            # Estimer la position cible basée sur la durée
            remaining_text = text[current_start:]
            remaining_duration = self.estimate_duration(remaining_text)
            
            if remaining_duration <= 0:
                break
            
            # Calculer le ratio de position cible
            target_ratio = target_duration / remaining_duration if remaining_duration > 0 else 0.5
            target_ratio = min(1.0, max(0.1, target_ratio))
            target_char = current_start + int(len(remaining_text) * target_ratio)
            
            # Trouver la meilleure coupure près de la cible
            best_break = None
            best_distance = float('inf')
            
            for bp in natural_breaks:
                if bp.position <= current_start:
                    continue
                if bp.position > target_char + 150:  # Trop loin après
                    break
                
                distance = abs(bp.position - target_char)
                
                # Préférer les coupures à haute confiance
                adjusted_distance = distance - (bp.confidence * 50)
                
                if adjusted_distance < best_distance:
                    best_distance = adjusted_distance
                    best_break = bp
            
            # Si pas de coupure naturelle trouvée, forcer une coupure
            if best_break is None or best_break.position <= current_start:
                # Chercher un espace ou une ponctuation près de la cible
                search_start = max(current_start + 50, target_char - 100)
                search_end = min(len(text), target_char + 100)
                
                # Chercher d'abord une fin de phrase
                sentence_match = None
                for match in re.finditer(r'[.!?]\s+', text[search_start:search_end]):
                    sentence_match = search_start + match.end()
                    break
                
                if sentence_match and sentence_match > current_start:
                    best_break = NaturalBreakPoint(
                        position=sentence_match,
                        break_type="forced_sentence",
                        confidence=0.5
                    )
                else:
                    # Chercher un espace
                    space_pos = text.rfind(' ', search_start, search_end)
                    if space_pos > current_start:
                        best_break = NaturalBreakPoint(
                            position=space_pos,
                            break_type="forced",
                            confidence=0.3
                        )
                    else:
                        # Dernier recours: couper à la cible
                        best_break = NaturalBreakPoint(
                            position=min(target_char, len(text)),
                            break_type="forced",
                            confidence=0.1
                        )
            
            # Créer le segment
            segment_text = text[current_start:best_break.position].strip()
            
            if segment_text:
                duration = self.estimate_duration(segment_text)
                
                # Ajuster la durée si hors limites
                if duration < self.MIN_DURATION and segments:
                    # Fusionner avec le segment précédent si possible
                    last_segment = segments[-1]
                    last_segment.text += " " + segment_text
                    last_segment.duration_seconds = self.estimate_duration(last_segment.text)
                    last_segment.end_time = current_time + last_segment.duration_seconds
                    result.total_duration = last_segment.end_time
                    current_start = best_break.position
                    continue
                
                segment = ScriptSegment(
                    sequence=segment_count,
                    text=segment_text,
                    duration_seconds=duration,
                    break_type=best_break.break_type,
                    break_confidence=best_break.confidence,
                    start_time=current_time,
                    end_time=current_time + duration
                )
                
                # Détecter le locuteur
                speakers = self.detect_speakers(segment_text)
                if speakers:
                    segment.speaker = speakers[0][0]
                
                # Détecter le type de scène
                segment.scene_type = self.detect_scene_type(segment_text)
                
                # Détecter le ton émotionnel
                segment.emotional_tone = self.detect_emotional_tone(segment_text)
                
                # Générer les prompts
                segment.visual_prompt, segment.audio_prompt = self.generate_prompts_for_segment(segment)
                
                segments.append(segment)
                segment_count += 1
                current_time += duration
                result.total_duration = current_time
                
                # Compter les types de coupures
                if best_break.break_type == "forced":
                    result.forced_breaks += 1
                else:
                    result.natural_breaks += 1
            
            current_start = best_break.position
            
            # Éviter les boucles infinies
            if current_start >= len(text) - 1:
                break
        
        result.segments = segments
        if segments:
            result.avg_segment_duration = result.total_duration / len(segments)
        
        # Générer des suggestions d'optimisation
        result.optimization_suggestions = self._generate_optimization_suggestions(result)
        
        logger.info(f"Segmentation complete: {len(segments)} segments, {result.total_duration:.1f}s total")
        
        return result
    
    def generate_prompts_for_segment(
        self,
        segment: ScriptSegment,
        context: str = ""
    ) -> Tuple[str, str]:
        """
        Génère les prompts visuel et audio pour un segment.
        
        Args:
            segment: Segment pour lequel générer les prompts
            context: Contexte additionnel
            
        Returns:
            Tuple (prompt_visuel, prompt_audio)
        """
        # Prompt visuel
        visual_parts = []
        
        if segment.scene_type:
            visual_parts.append(f"Scene type: {segment.scene_type}")
        
        if segment.emotional_tone and segment.emotional_tone != "neutral":
            visual_parts.append(f"Mood: {segment.emotional_tone}")
        
        if segment.speaker:
            visual_parts.append(f"Character: {segment.speaker}")
        
        # Ajouter le texte comme action/dialogue
        text_preview = segment.text[:150]
        if len(segment.text) > 150:
            text_preview += "..."
        visual_parts.append(f"Action: {text_preview}")
        
        visual_prompt = ". ".join(visual_parts)
        
        # Prompt audio
        audio_parts = []
        
        if segment.speaker:
            audio_parts.append(f"Voice: {segment.speaker}")
        else:
            audio_parts.append("Voice: narrator")
        
        if segment.emotional_tone and segment.emotional_tone != "neutral":
            audio_parts.append(f"Tone: {segment.emotional_tone}")
        
        text_for_audio = segment.text[:100]
        if len(segment.text) > 100:
            text_for_audio += "..."
        audio_parts.append(f"Text: {text_for_audio}")
        
        audio_prompt = ". ".join(audio_parts)
        
        return visual_prompt, audio_prompt
    
    def _generate_optimization_suggestions(self, result: SegmentationResult) -> List[str]:
        """
        Génère des suggestions d'optimisation pour la segmentation.
        
        Args:
            result: Résultat de la segmentation
            
        Returns:
            Liste de suggestions
        """
        suggestions = []
        
        # Vérifier la durée moyenne
        if result.avg_segment_duration < self.MIN_DURATION:
            suggestions.append(
                f"Average segment duration ({result.avg_segment_duration:.1f}s) is below optimal. "
                "Consider merging short segments."
            )
        elif result.avg_segment_duration > self.MAX_DURATION:
            suggestions.append(
                f"Average segment duration ({result.avg_segment_duration:.1f}s) is above optimal. "
                "Consider splitting long segments for better video generation stability."
            )
        
        # Vérifier le ratio de coupures forcées
        total_breaks = result.natural_breaks + result.forced_breaks
        if total_breaks > 0:
            forced_ratio = result.forced_breaks / total_breaks
            if forced_ratio > 0.5:
                suggestions.append(
                    f"High ratio of forced breaks ({forced_ratio*100:.0f}%). "
                    "Consider restructuring the script with more natural break points."
                )
        
        # Vérifier les segments très courts ou très longs
        short_segments = [s for s in result.segments if s.duration_seconds < self.MIN_DURATION]
        long_segments = [s for s in result.segments if s.duration_seconds > self.MAX_DURATION]
        
        if short_segments:
            suggestions.append(
                f"{len(short_segments)} segment(s) are shorter than {self.MIN_DURATION}s. "
                "Consider merging with adjacent segments."
            )
        
        if long_segments:
            suggestions.append(
                f"{len(long_segments)} segment(s) are longer than {self.MAX_DURATION}s. "
                "Consider splitting for better video generation results."
            )
        
        return suggestions
    
    def save_segmentation(self, result: SegmentationResult) -> str:
        """
        Sauvegarde une segmentation sur disque.
        
        Args:
            result: Résultat de la segmentation à sauvegarder
            
        Returns:
            Chemin du fichier sauvegardé
        """
        filename = f"{result.id}.json"
        filepath = os.path.join(self.storage_path, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(result.to_dict(), f, ensure_ascii=False, indent=2)
        
        logger.info(f"Segmentation saved to {filepath}")
        return filepath
    
    def load_segmentation(self, segmentation_id: str) -> Optional[SegmentationResult]:
        """
        Charge une segmentation depuis le disque.
        
        Args:
            segmentation_id: Identifiant de la segmentation
            
        Returns:
            Résultat de la segmentation ou None si non trouvé
        """
        filepath = os.path.join(self.storage_path, f"{segmentation_id}.json")
        
        if not os.path.exists(filepath):
            logger.warning(f"Segmentation not found: {filepath}")
            return None
        
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return SegmentationResult.from_dict(data)
    
    def list_segmentations(self, project_id: Optional[str] = None) -> List[Dict]:
        """
        Liste les segmentations disponibles.
        
        Args:
            project_id: Filtrer par projet (optionnel)
            
        Returns:
            Liste des métadonnées de segmentations
        """
        segmentations = []
        
        for filename in os.listdir(self.storage_path):
            if not filename.endswith('.json'):
                continue
            
            filepath = os.path.join(self.storage_path, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                if project_id and data.get("project_id") != project_id:
                    continue
                
                # Retourner seulement les métadonnées
                segmentations.append({
                    "id": data.get("id"),
                    "script_id": data.get("script_id"),
                    "project_id": data.get("project_id"),
                    "total_duration": data.get("total_duration"),
                    "segments_count": len(data.get("segments", [])),
                    "created_at": data.get("created_at"),
                    "avg_segment_duration": data.get("avg_segment_duration")
                })
            except Exception as e:
                logger.error(f"Error loading segmentation {filename}: {e}")
        
        # Trier par date de création (plus récent d'abord)
        segmentations.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        return segmentations
    
    def delete_segmentation(self, segmentation_id: str) -> bool:
        """
        Supprime une segmentation.
        
        Args:
            segmentation_id: Identifiant de la segmentation
            
        Returns:
            True si supprimé, False sinon
        """
        filepath = os.path.join(self.storage_path, f"{segmentation_id}.json")
        
        if os.path.exists(filepath):
            os.remove(filepath)
            logger.info(f"Segmentation deleted: {filepath}")
            return True
        
        return False
    
    def adjust_segment(
        self,
        result: SegmentationResult,
        segment_id: str,
        action: str,
        params: Optional[Dict] = None
    ) -> SegmentationResult:
        """
        Ajuste un segment spécifique dans une segmentation.
        
        Args:
            result: Résultat de la segmentation
            segment_id: Identifiant du segment à ajuster
            action: Action à effectuer (split, merge, extend, edit)
            params: Paramètres de l'action
            
        Returns:
            Résultat de la segmentation ajusté
        """
        params = params or {}
        
        # Trouver le segment
        segment_index = None
        for i, seg in enumerate(result.segments):
            if seg.id == segment_id:
                segment_index = i
                break
        
        if segment_index is None:
            logger.warning(f"Segment not found: {segment_id}")
            return result
        
        segment = result.segments[segment_index]
        
        if action == "split":
            # Diviser le segment à une position donnée
            split_position = params.get("split_at", len(segment.text) // 2)
            split_position = min(split_position, len(segment.text) - 20)
            
            # Trouver un bon point de coupure près de la position
            text = segment.text
            best_pos = text.rfind(' ', 0, split_position + 20)
            if best_pos < split_position - 20:
                best_pos = split_position
            
            first_text = text[:best_pos].strip()
            second_text = text[best_pos:].strip()
            
            if first_text and second_text:
                # Créer les deux nouveaux segments
                first_segment = ScriptSegment(
                    id=str(uuid4()),
                    sequence=segment.sequence,
                    text=first_text,
                    duration_seconds=self.estimate_duration(first_text),
                    speaker=segment.speaker,
                    scene_type=segment.scene_type,
                    emotional_tone=segment.emotional_tone,
                    break_type="manual_split",
                    break_confidence=1.0,
                    start_time=segment.start_time,
                    end_time=segment.start_time + self.estimate_duration(first_text)
                )
                
                second_segment = ScriptSegment(
                    id=str(uuid4()),
                    sequence=segment.sequence + 1,
                    text=second_text,
                    duration_seconds=self.estimate_duration(second_text),
                    speaker=segment.speaker,
                    scene_type=segment.scene_type,
                    emotional_tone=segment.emotional_tone,
                    break_type="manual_split",
                    break_confidence=1.0,
                    start_time=first_segment.end_time,
                    end_time=segment.end_time
                )
                
                # Générer les prompts
                first_segment.visual_prompt, first_segment.audio_prompt = self.generate_prompts_for_segment(first_segment)
                second_segment.visual_prompt, second_segment.audio_prompt = self.generate_prompts_for_segment(second_segment)
                
                # Remplacer le segment original
                result.segments.pop(segment_index)
                result.segments.insert(segment_index, first_segment)
                result.segments.insert(segment_index + 1, second_segment)
                
                # Réindexer les segments
                self._reindex_segments(result)
        
        elif action == "merge":
            # Fusionner avec le segment suivant
            if segment_index < len(result.segments) - 1:
                next_segment = result.segments[segment_index + 1]
                
                # Fusionner les textes
                merged_text = segment.text + " " + next_segment.text
                
                # Mettre à jour le segment actuel
                segment.text = merged_text
                segment.duration_seconds = self.estimate_duration(merged_text)
                segment.end_time = next_segment.end_time
                segment.break_type = "manual_merge"
                segment.visual_prompt, segment.audio_prompt = self.generate_prompts_for_segment(segment)
                
                # Supprimer le segment suivant
                result.segments.pop(segment_index + 1)
                
                # Réindexer
                self._reindex_segments(result)
        
        elif action == "edit":
            # Modifier le texte du segment
            new_text = params.get("text", segment.text)
            segment.text = new_text
            segment.duration_seconds = self.estimate_duration(new_text)
            segment.visual_prompt, segment.audio_prompt = self.generate_prompts_for_segment(segment)
            
            # Recalculer les temps
            self._recalculate_timing(result)
        
        # Recalculer les statistiques
        self._recalculate_statistics(result)
        
        return result
    
    def _reindex_segments(self, result: SegmentationResult):
        """Réindexe les segments après modification"""
        current_time = 0.0
        for i, segment in enumerate(result.segments):
            segment.sequence = i
            segment.start_time = current_time
            segment.end_time = current_time + segment.duration_seconds
            current_time = segment.end_time
    
    def _recalculate_timing(self, result: SegmentationResult):
        """Recalcule les temps de tous les segments"""
        current_time = 0.0
        for segment in result.segments:
            segment.start_time = current_time
            segment.end_time = current_time + segment.duration_seconds
            current_time = segment.end_time
        result.total_duration = current_time
    
    def _recalculate_statistics(self, result: SegmentationResult):
        """Recalcule les statistiques de la segmentation"""
        if result.segments:
            result.total_duration = sum(s.duration_seconds for s in result.segments)
            result.avg_segment_duration = result.total_duration / len(result.segments)
            
            result.natural_breaks = sum(
                1 for s in result.segments 
                if s.break_type not in ["forced", "manual_split", "manual_merge"]
            )
            result.forced_breaks = len(result.segments) - result.natural_breaks
        
        # Mettre à jour les suggestions
        result.optimization_suggestions = self._generate_optimization_suggestions(result)


# Instance globale du service
_service_instance: Optional[ScriptSegmenterService] = None


def get_segmenter_service() -> ScriptSegmenterService:
    """Retourne l'instance globale du service de segmentation"""
    global _service_instance
    if _service_instance is None:
        _service_instance = ScriptSegmenterService()
    return _service_instance
