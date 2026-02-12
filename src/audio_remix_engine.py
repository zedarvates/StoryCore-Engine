"""
Audio Remix Engine - Remixage intelligent de musique pour adapter à la durée vidéo
Inspiré par Adobe Premiere Remix feature
"""

import asyncio
import logging
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


class RemixStyle(Enum):
    """Styles de remixage."""
    SMOOTH = "smooth"  # Crossfade fluide entre sections
    BEAT_CUT = "beat-cut"  # Coupe au beat
    STRUCTURAL = "structural"  # Respecter la structure musicale
    DYNAMIC = "dynamic"  # Adapter dynamiquement
    AI_GENERATIVE = "ai-generative"  # Génération IA pour remplir


class MusicSection(Enum):
    """Sections musicales."""
    INTRO = "intro"
    VERSE = "verse"
    CHORUS = "chorus"
    BRIDGE = "bridge"
    OUTRO = "outro"
    SILENCE = "silence"


@dataclass
class BeatMarker:
    """Marqueur de beat."""
    time_seconds: float
    beat_number: int
    measure_number: int
    tempo: float
    confidence: float


@dataclass
class SectionMarker:
    """Marqueur de section musicale."""
    start_time: float
    end_time: float
    section_type: MusicSection
    confidence: float
    label: Optional[str] = None


@dataclass
class MusicStructure:
    """Structure musicale analysée."""
    duration: float
    tempo: float
    key_signature: str
    time_signature: str
    beats: List[BeatMarker]
    sections: List[SectionMarker]
    intro_duration: float
    outro_duration: float
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "duration": self.duration,
            "tempo": self.tempo,
            "key_signature": self.key_signature,
            "time_signature": self.time_signature,
            "beat_count": len(self.beats),
            "section_count": len(self.sections),
            "intro_duration": self.intro_duration,
            "outro_duration": self.outro_duration,
            "sections": [
                {
                    "type": s.section_type.value,
                    "start": s.start_time,
                    "end": s.end_time,
                    "duration": s.end_time - s.start_time
                }
                for s in self.sections
            ]
        }


@dataclass
class RemixRequest:
    """Request de remixage."""
    audio_id: str
    audio_url: str
    target_duration: float
    style: RemixStyle
    preserve_intro: bool = True
    preserve_outro: bool = True
    crossfade_duration: float = 2.0
    fade_in_duration: float = 0.5
    fade_out_duration: float = 1.0
    target_bpm: Optional[float] = None
    target_key: Optional[str] = None
    output_format: str = "wav"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "audio_id": self.audio_id,
            "target_duration": self.target_duration,
            "style": self.style.value,
            "preserve_intro": self.preserve_intro,
            "preserve_outro": self.preserve_outro,
            "crossfade_duration": self.crossfade_duration,
            "fade_in_duration": self.fade_in_duration,
            "fade_out_duration": self.fade_out_duration
        }


@dataclass
class RemixCut:
    """Coupe effectuée lors du remixage."""
    start_time: float
    end_time: float
    duration_removed: float
    reason: str
    section_before: Optional[MusicSection]
    section_after: Optional[MusicSection]


@dataclass
class RemixResult:
    """Résultat du remixage."""
    remix_id: str
    original_audio_id: str
    original_duration: float
    target_duration: float
    final_duration: float
    structure: MusicStructure
    cuts: List[RemixCut]
    crossfades: List[Dict[str, float]]
    output_url: str
    processing_time: float
    quality_score: float
    timestamp: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "remix_id": self.remix_id,
            "original_duration": self.original_duration,
            "target_duration": self.target_duration,
            "final_duration": self.final_duration,
            "time_saved": self.original_duration - self.final_duration,
            "cut_count": len(self.cuts),
            "crossfade_count": len(self.crossfades),
            "quality_score": self.quality_score,
            "processing_time": self.processing_time,
            "cuts": [
                {
                    "start": c.start_time,
                    "end": c.end_time,
                    "removed": c.duration_removed,
                    "reason": c.reason
                }
                for c in self.cuts
            ],
            "structure": self.structure.to_dict()
        }


@dataclass
class TransitionPoint:
    """Point de transition potentiel."""
    time_seconds: float
    section_type: MusicSection
    beat_position: int
    confidence: float
    is_loop_point: bool


class AudioRemixError(Exception):
    """Exception personnalisée pour Audio Remix."""
    pass


class AudioRemixEngine:
    """
    Moteur de remixage audio intelligent.
    
    Fonctionnalités:
    - Analyse de structure musicale
    - Détection automatique de sections (intro, verse, chorus, bridge, outro)
    - Détection de beats et tempo
    - Remixage intelligent avec coupe et crossfade
    - Adaptation de durée sans cassure musicale
    """
    
    def __init__(self, ai_config: AIConfig = None):
        """Initialize Audio Remix Engine."""
        self.ai_config = ai_config
        self.logger = logging.getLogger(__name__)
        
        # Circuit breaker
        circuit_config = CircuitBreakerConfig(
            failure_rate_threshold=30,
            wait_time_in_open_state=60,
            half_open_requests=3
        )
        self.circuit_breaker = CircuitBreaker(circuit_config)
        
        # Cache
        self.structure_cache: Dict[str, MusicStructure] = {}
        self.remix_cache: Dict[str, RemixResult] = {}
        
        # Configuration
        self.default_crossfade_duration = 2.0
        self.beat_detection_threshold = 0.5
        self.section_detection_confidence = 0.7
        
        #try:
        #    import librosa
        #    self.librosa_available = True
        #except ImportError:
        self.librosa_available = False
        self.logger.warning("librosa not available, using mock implementation")
        
        self.logger.info("Audio Remix Engine initialized")
    
    async def initialize(self) -> bool:
        """Initialiser le moteur."""
        try:
            self.logger.info("Initializing Audio Remix Engine...")
            
            # Vérifier les dépendances
            if not self.librosa_available:
                self.logger.warning("librosa not available, using mock implementation")
            
            self.logger.info("Audio Remix Engine initialization complete")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Audio Remix Engine: {e}")
            return False
    
    async def analyze_structure(self, audio_url: str) -> MusicStructure:
        """Analyser la structure musicale d'un fichier audio."""
        
        # Vérifier le cache
        if audio_url in self.structure_cache:
            self.logger.info(f"Returning cached structure for {audio_url}")
            return self.structure_cache[audio_url]
        
        async def _analyze_operation():
            return await self._perform_analysis(audio_url)
        
        try:
            structure = await self.circuit_breaker.call(_analyze_operation)
            self.structure_cache[audio_url] = structure
            return structure
            
        except Exception as e:
            self.logger.error(f"Structure analysis failed: {e}")
            # Retourner une structure par défaut
            return self._create_default_structure()
    
    async def _perform_analysis(self, audio_url: str) -> MusicStructure:
        """Effectuer l'analyse de structure musicale."""
        # NOTE: En production, utiliser librosa pour l'analyse
        # Pour l'instant, implémentation mock
        
        self.logger.info(f"Analyzing music structure for: {audio_url}")
        
        # Simuler l'analyse
        await asyncio.sleep(0.5)  # Simulation
        
        # Créer une structure mock
        beats = self._generate_mock_beats(duration=120.0, tempo=120.0)
        sections = self._generate_mock_sections(duration=120.0)
        
        structure = MusicStructure(
            duration=120.0,
            tempo=120.0,
            key_signature="C major",
            time_signature="4/4",
            beats=beats,
            sections=sections,
            intro_duration=8.0,
            outro_duration=12.0
        )
        
        self.logger.info(f"Analyzed structure: {len(sections)} sections, {len(beats)} beats")
        return structure
    
    def _generate_mock_beats(self, duration: float, tempo: float) -> List[BeatMarker]:
        """Générer des beats mock."""
        beat_interval = 60.0 / tempo
        beats = []
        
        beat_num = 0
        time = 0.0
        
        while time < duration:
            measure = beat_num // 4
            
            beats.append(BeatMarker(
                time_seconds=round(time, 3),
                beat_number=beat_num,
                measure_number=measure,
                tempo=tempo,
                confidence=0.95
            ))
            
            beat_num += 1
            time += beat_interval
        
        return beats
    
    def _generate_mock_sections(self, duration: float) -> List[SectionMarker]:
        """Générer des sections musicales mock."""
        sections = []
        
        # Structure typique: Intro -> Verse -> Chorus -> Verse -> Chorus -> Bridge -> Chorus -> Outro
        section_definitions = [
            (0.0, 8.0, MusicSection.INTRO),
            (8.0, 32.0, MusicSection.VERSE),
            (32.0, 48.0, MusicSection.CHORUS),
            (48.0, 72.0, MusicSection.VERSE),
            (72.0, 88.0, MusicSection.CHORUS),
            (88.0, 104.0, MusicSection.BRIDGE),
            (104.0, 120.0, MusicSection.CHORUS),
            (120.0, duration, MusicSection.OUTRO)  # Peut être tronqué
        ]
        
        for start, end, section_type in section_definitions:
            if start < duration:
                actual_end = min(end, duration)
                sections.append(SectionMarker(
                    start_time=start,
                    end_time=actual_end,
                    section_type=section_type,
                    confidence=0.85,
                    label=section_type.value
                ))
        
        return sections
    
    def _create_default_structure(self) -> MusicStructure:
        """Créer une structure par défaut."""
        return MusicStructure(
            duration=60.0,
            tempo=120.0,
            key_signature="C major",
            time_signature="4/4",
            beats=[],
            sections=[],
            intro_duration=0.0,
            outro_duration=0.0
        )
    
    async def remix(self, request: RemixRequest) -> RemixResult:
        """Effectuer le remixage d'un fichier audio."""
        
        # Analyser la structure
        structure = await self.analyze_structure(request.audio_url)
        
        async def _remix_operation():
            return await self._perform_remix(request, structure)
        
        try:
            result = await self.circuit_breaker.call(_remix_operation)
            self.remix_cache[result.remix_id] = result
            return result
            
        except Exception as e:
            self.logger.error(f"Remixing failed: {e}")
            raise AudioRemixError(f"Remixing failed: {str(e)}")
    
    async def _perform_remix(self, request: RemixRequest, structure: MusicStructure) -> RemixResult:
        """Effectuer le remixage effectif."""
        self.logger.info(f"Remixing audio: {request.audio_id}")
        self.logger.info(f"Target duration: {request.target_duration}s (original: {structure.duration}s)")
        
        # Calculer les coupes nécessaires
        target_duration = request.target_duration
        current_duration = structure.duration
        
        if current_duration <= target_duration:
            # Audio plus court que la cible - pas de coupe
            cuts = []
            self.logger.info("No cuts needed - audio shorter than target")
        else:
            # Audio plus long - calculer les coupes
            cuts = self._calculate_cuts(structure, target_duration, request)
        
        # Appliquer les coupes et générer le résultat
        final_duration = current_duration - sum(c.duration_removed for c in cuts)
        
        # Calculer les crossfades
        crossfades = self._calculate_crossfades(cuts, structure, request)
        
        # Générer l'URL de sortie (mock)
        output_url = f"/api/audio/remixed/{request.audio_id}_{request.target_duration}.wav"
        
        # Calculer le score de qualité
        quality_score = self._calculate_quality_score(structure, cuts, request)
        
        # Créer le résultat
        result = RemixResult(
            remix_id=f"remix_{request.audio_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            original_audio_id=request.audio_id,
            original_duration=current_duration,
            target_duration=target_duration,
            final_duration=final_duration,
            structure=structure,
            cuts=cuts,
            crossfades=crossfades,
            output_url=output_url,
            processing_time=1.5,  # Mock
            quality_score=quality_score,
            timestamp=datetime.now()
        )
        
        self.logger.info(f"Remix complete: {len(cuts)} cuts, {final_duration:.1f}s final duration")
        return result
    
    def _calculate_cuts(
        self,
        structure: MusicStructure,
        target_duration: float,
        request: RemixRequest
    ) -> List[RemixCut]:
        """Calculer les coupes nécessaires pour atteindre la durée cible."""
        cuts = []
        current_duration = structure.duration
        time_to_remove = current_duration - target_duration
        
        if time_to_remove <= 0:
            return cuts
        
        # Déterminer les sections à couper en priorité
        # Priorité: Outro < Intro < Bridge < Verse < Chorus
        section_priority = {
            MusicSection.OUTRO: 1,
            MusicSection.INTRO: 2,
            MusicSection.BRIDGE: 3,
            MusicSection.VERSE: 4,
            MusicSection.CHORUS: 5
        }
        
        # Trier les sections par priorité (et par position)
        available_sections = []
        for section in structure.sections:
            if section.section_type == MusicSection.SILENCE:
                continue
            
            # Ne pas couper l'intro/outro si demandé
            if not request.preserve_intro and section.section_type == MusicSection.INTRO:
                available_sections.append((section_priority[section.section_type], section))
            elif not request.preserve_outro and section.section_type == MusicSection.OUTRO:
                available_sections.append((section_priority[section.section_type], section))
            elif section.section_type not in [MusicSection.INTRO, MusicSection.OUTRO]:
                available_sections.append((section_priority[section.section_type], section))
        
        available_sections.sort(key=lambda x: (x[0], x[1].start_time))
        
        # Effectuer les coupes
        time_removed = 0.0
        
        for priority, section in available_sections:
            if time_removed >= time_to_remove:
                break
            
            section_duration = section.end_time - section.start_time
            
            if section_duration <= 0:
                continue
            
            # Décider combien couper de cette section
            if time_removed + section_duration <= time_to_remove:
                # Couper toute la section
                cut_amount = section_duration
                reason = f"Remove entire {section.section_type.value}"
            else:
                # Couper une partie de la section
                cut_amount = time_to_remove - time_removed
                reason = f"Partial {section.section_type.value} cut"
            
            if cut_amount <= 0:
                continue
            
            # Trouver une bonne position de coupe (sur un beat)
            cut_start = self._find_cut_position(section, cut_amount, structure.beats)
            
            cut = RemixCut(
                start_time=cut_start,
                end_time=cut_start + cut_amount,
                duration_removed=cut_amount,
                reason=reason,
                section_before=section.section_type,
                section_after=None  # À déterminer après toutes les coupes
            )
            cuts.append(cut)
            time_removed += cut_amount
        
        # Mettre à jour section_after
        cut_end_times = set()
        for cut in cuts:
            cut_end_times.add(cut.end_time)
        
        for cut in cuts:
            for section in structure.sections:
                if cut.end_time >= section.start_time and cut.end_time < section.end_time:
                    cut.section_after = section.section_type
                    break
        
        return cuts
    
    def _find_cut_position(
        self,
        section: SectionMarker,
        cut_amount: float,
        beats: List[BeatMarker]
    ) -> float:
        """Trouver une bonne position de coupe (sur un beat)."""
        section_start = section.start_time
        section_end = section.end_time
        section_duration = section_end - section_start
        
        # Essayer de couper depuis la fin de la section
        # pour préserver le début
        target_cut_end = section_end - (section_duration - cut_amount)
        
        # Trouver le beat le plus proche
        best_beat = None
        min_distance = float('inf')
        
        for beat in beats:
            if beat.time_seconds >= section_start and beat.time_seconds <= section_end:
                distance = abs(beat.time_seconds - target_cut_end)
                if distance < min_distance:
                    min_distance = distance
                    best_beat = beat
        
        if best_beat:
            return best_beat.time_seconds
        
        # Fallback: utiliser le début de la section
        return section_start
    
    def _calculate_crossfades(
        self,
        cuts: List[RemixCut],
        structure: MusicStructure,
        request: RemixRequest
    ) -> List[Dict[str, float]]:
        """Calculer les crossfades nécessaires."""
        crossfades = []
        
        if request.style == RemixStyle.SMOOTH:
            crossfade_duration = min(request.crossfade_duration, 3.0)
        else:
            crossfade_duration = min(request.crossfade_duration, 1.5)
        
        for cut in cuts:
            crossfade = {
                "start": cut.start_time,
                "end": cut.start_time + crossfade_duration,
                "duration": crossfade_duration,
                "type": "crossfade"
            }
            crossfades.append(crossfade)
        
        return crossfades
    
    def _calculate_quality_score(
        self,
        structure: MusicStructure,
        cuts: List[RemixCut],
        request: RemixRequest
    ) -> float:
        """Calculer le score de qualité du remix."""
        score = 1.0
        
        # Pénalité pour coupe de chorus
        chorus_cuts = [c for c in cuts if c.section_before == MusicSection.CHORUS]
        chorus_penalty = len(chorus_cuts) * 0.1
        score -= chorus_penalty
        
        # Bonus pour coupe sur un beat
        on_beat_cuts = 0
        for cut in cuts:
            for beat in structure.beats:
                if abs(cut.start_time - beat.time_seconds) < 0.1:
                    on_beat_cuts += 1
                    break
        
        if cuts:
            on_beat_ratio = on_beat_cuts / len(cuts)
            score += on_beat_ratio * 0.1
        
        # Pénalité pour trop de coupes
        if len(cuts) > 5:
            score -= (len(cuts) - 5) * 0.05
        
        return max(0.0, min(1.0, score))
    
    async def get_structure(self, audio_id: str) -> Optional[MusicStructure]:
        """Récupérer la structure musicale d'un audio."""
        return self.structure_cache.get(audio_id)
    
    async def get_remix_result(self, remix_id: str) -> Optional[RemixResult]:
        """Récupérer un résultat de remix."""
        return self.remix_cache.get(remix_id)
    
    def get_recommended_duration(
        self,
        structure: MusicStructure,
        target_duration: float
    ) -> Dict[str, Any]:
        """Obtenir des recommandations de remix."""
        recommendations = {
            "original_duration": structure.duration,
            "target_duration": target_duration,
            "time_to_remove": max(0, structure.duration - target_duration),
            "recommended_cuts": [],
            "preservation_advice": []
        }
        
        # Analyser les sections
        chorus_count = 0
        verse_count = 0
        
        for section in structure.sections:
            if section.section_type == MusicSection.CHORUS:
                chorus_count += 1
            elif section.section_type == MusicSection.VERSE:
                verse_count += 1
        
        # Conseils de préservation
        if chorus_count > 2:
            recommendations["preservation_advice"].append(
                "Multiple choruses detected - consider preserving at least one complete chorus"
            )
        
        if structure.intro_duration > 10:
            recommendations["preservation_advice"].append(
                f"Long intro ({structure.intro_duration:.1f}s) - consider shortening for tighter edit"
            )
        
        if structure.outro_duration > 15:
            recommendations["preservation_advice"].append(
                f"Long outro ({structure.outro_duration:.1f}s) - consider fading earlier"
            )
        
        # Suggestions de coupes
        removable_sections = [
            s for s in structure.sections
            if s.section_type in [MusicSection.OUTRO, MusicSection.INTRO, MusicSection.BRIDGE]
        ]
        
        for section in removable_sections[:3]:  # Top 3
            recommendations["recommended_cuts"].append({
                "type": section.section_type.value,
                "start": section.start_time,
                "end": section.end_time,
                "duration": section.end_time - section.start_time,
                "priority": "high" if section.section_type == MusicSection.OUTRO else "medium"
            })
        
        return recommendations
    
    async def preview_remix(
        self,
        request: RemixRequest
    ) -> Dict[str, Any]:
        """Prévisualiser le remix sans l'exécuter."""
        structure = await self.analyze_structure(request.audio_url)
        
        if structure.duration <= request.target_duration:
            return {
                "preview": {
                    "cuts_needed": 0,
                    "time_saved": 0,
                    "message": "Audio is shorter than target duration"
                },
                "recommendations": self.get_recommended_duration(structure, request.target_duration)
            }
        
        cuts = self._calculate_cuts(structure, request.target_duration, request)
        
        preview = {
            "original_duration": structure.duration,
            "target_duration": request.target_duration,
            "cuts_needed": len(cuts),
            "time_saved": sum(c.duration_removed for c in cuts),
            "cuts_preview": [
                {
                    "start": c.start_time,
                    "end": c.end_time,
                    "duration": c.duration_removed,
                    "reason": c.reason
                }
                for c in cuts
            ],
            "crossfades_count": len(cuts),
            "estimated_quality": self._calculate_quality_score(structure, cuts, request)
        }
        
        return {
            "preview": preview,
            "recommendations": self.get_recommended_duration(structure, request.target_duration)
        }
    
    async def export_remix_plan(self, remix_id: str, file_path: str):
        """Exporter le plan de remix en JSON."""
        result = self.remix_cache.get(remix_id)
        
        if not result:
            raise AudioRemixError(f"Remix not found: {remix_id}")
        
        export_data = {
            "exported_at": datetime.now().isoformat(),
            "remix_id": remix_id,
            "original": {
                "audio_id": result.original_audio_id,
                "duration": result.original_duration
            },
            "result": result.to_dict(),
            "cuts": [
                {
                    "start": c.start_time,
                    "end": c.end_time,
                    "duration_removed": c.duration_removed,
                    "reason": c.reason
                }
                for c in result.cuts
            ],
            "crossfades": result.crossfades
        }
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, indent=2)
        
        self.logger.info(f"Remix plan exported to {file_path}")
    
    async def shutdown(self):
        """Arrêter le moteur et libérer les ressources."""
        self.logger.info("Shutting down Audio Remix Engine...")
        
        self.structure_cache.clear()
        self.remix_cache.clear()
        
        self.logger.info("Audio Remix Engine shutdown complete")


# Factory function
def create_audio_remix_engine(ai_config: AIConfig = None) -> AudioRemixEngine:
    """Créer et configurer le moteur Audio Remix."""
    return AudioRemixEngine(ai_config)

