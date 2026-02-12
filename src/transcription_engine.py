"""
Transcription Engine - Transcription audio et montage basé sur le texte
Inspiré par Adobe Premiere Text-Based Editing
"""

import asyncio
import logging
import json
import re
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from dataclasses import asdict

try:
    from .circuit_breaker import CircuitBreaker, CircuitBreakerConfig
except ImportError:
    from circuit_breaker import CircuitBreaker, CircuitBreakerConfig

try:
    from .ai_enhancement_engine import AIConfig
except ImportError:
    from ai_enhancement_engine import AIConfig


class SegmentType(Enum):
    """Types de segments de transcription."""
    DIALOGUE = "dialogue"
    NARRATION = "narration"
    MUSIC = "music"
    SOUND_EFFECT = "sound_effect"
    SILENCE = "silence"


@dataclass
class SpeakerSegment:
    """Segment de conversation avec locuteur."""
    speaker_id: str
    speaker_label: str
    confidence: float


@dataclass
class TranscriptSegment:
    """Segment de transcription."""
    segment_id: str
    start_time: float  # en secondes
    end_time: float
    text: str
    speaker: Optional[SpeakerSegment]
    confidence: float
    words: List[Dict[str, Any]]  # Liste de mots avec timestamps
    segment_type: SegmentType
    
    @property
    def duration(self) -> float:
        return self.end_time - self.start_time


@dataclass
class Transcript:
    """Transcription complète."""
    transcript_id: str
    audio_id: str
    audio_url: str
    language: str
    duration: float
    segments: List[TranscriptSegment]
    created_at: datetime
    speaker_count: int
    word_count: int
    language_confidence: float
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "transcript_id": self.transcript_id,
            "audio_id": self.audio_id,
            "language": self.language,
            "duration": self.duration,
            "speaker_count": self.speaker_count,
            "word_count": self.word_count,
            "created_at": self.created_at.isoformat(),
            "segments": [
                {
                    "segment_id": s.segment_id,
                    "start": s.start_time,
                    "end": s.end_time,
                    "text": s.text,
                    "speaker": {
                        "id": s.speaker.speaker_id,
                        "label": s.speaker.speaker_label
                    } if s.speaker else None,
                    "confidence": s.confidence,
                    "type": s.segment_type.value
                }
                for s in self.segments
            ]
        }


@dataclass
class MontageStyle(Enum):
    """Style de montage basé sur texte."""
    CHRONOLOGICAL = "chronological"  # Ordre naturel
    HIGHLIGHTS = "highlights"  # Extraire les moments clés
    COMPACT = "compact"  # Version condensée
    CONVERSATION = "conversation"  # Par locuteur


@dataclass
class MontageRequest:
    """Request de génération de montage."""
    transcript_id: str
    style: MontageStyle
    include_speakers: Optional[List[str]] = None
    exclude_speakers: Optional[List[str]] = None
    max_duration: Optional[float] = None
    preserve_timing: bool = True
    add_transitions: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "transcript_id": self.transcript_id,
            "style": self.style.value,
            "include_speakers": self.include_speakers,
            "exclude_speakers": self.exclude_speakers,
            "max_duration": self.max_duration
        }


@dataclass
class MontageShot:
    """Plan de montage généré."""
    shot_id: str
    source_start: float
    source_end: float
    text: str
    speaker: Optional[str]
    shot_type: str  # "dialogue", "narration", etc.
    duration: float
    order: int
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "shot_id": self.shot_id,
            "source_start": self.source_start,
            "source_end": self.source_end,
            "text": self.text,
            "speaker": self.speaker,
            "shot_type": self.shot_type,
            "duration": self.duration,
            "order": self.order
        }


@dataclass
class MontageResult:
    """Résultat du montage basé sur texte."""
    result_id: str
    transcript_id: str
    style: MontageStyle
    shots: List[MontageShot]
    total_duration: float
    word_count: int
    created_at: datetime
    summary: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "result_id": self.result_id,
            "transcript_id": self.transcript_id,
            "style": self.style.value,
            "total_duration": self.total_duration,
            "word_count": self.word_count,
            "created_at": self.created_at.isoformat(),
            "summary": self.summary,
            "shots": [s.to_dict() for s in self.shots]
        }


class TranscriptionEngine:
    """
    Moteur de transcription audio et montage basé sur le texte.
    
    Fonctionnalités:
    - Transcription automatique (Whisper API ou équivalent)
    - Détection de locuteurs (speaker diarization)
    - Synchronisation texte-vidéo
    - Génération de montage par copier-coller
    - Import/export de sous-titres (SRT, VTT, ASS)
    """
    
    def __init__(self, ai_config: AIConfig = None):
        """Initialize Transcription Engine."""
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
        self.transcript_cache: Dict[str, Transcript] = {}
        self.montage_cache: Dict[str, MontageResult] = {}
        
        #try:
        #    import openai
        #    self.whisper_available = True
        #except ImportError:
        self.whisper_available = False
        self.logger.warning("OpenAI Whisper not available, using mock implementation")
        
        # Configuration
        self.max_segment_duration = 30.0  # secondes
        self.confidence_threshold = 0.7
        self.silence_threshold = 0.5  # secondes de silence pour分割
        
        self.logger.info("Transcription Engine initialized")
    
    async def initialize(self) -> bool:
        """Initialiser le moteur."""
        try:
            self.logger.info("Initializing Transcription Engine...")
            
            if not self.whisper_available:
                self.logger.warning("Using mock transcription implementation")
            
            self.logger.info("Transcription Engine initialization complete")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Transcription Engine: {e}")
            return False
    
    async def transcribe(
        self,
        audio_id: str,
        audio_url: str,
        language: Optional[str] = None,
        enable_speaker_diarization: bool = True
    ) -> Transcript:
        """Transcrire un fichier audio."""
        
        # Vérifier le cache
        if audio_id in self.transcript_cache:
            self.logger.info(f"Returning cached transcript for {audio_id}")
            return self.transcript_cache[audio_id]
        
        async def _transcribe_operation():
            return await self._perform_transcription(
                audio_id, audio_url, language, enable_speaker_diarization
            )
        
        try:
            transcript = await self.circuit_breaker.call(_transcribe_operation)
            self.transcript_cache[audio_id] = transcript
            return transcript
            
        except Exception as e:
            self.logger.error(f"Transcription failed: {e}")
            raise TranscriptionError(f"Transcription failed: {str(e)}")
    
    async def _perform_transcription(
        self,
        audio_id: str,
        audio_url: str,
        language: Optional[str],
        enable_speaker_diarization: bool
    ) -> Transcript:
        """Effectuer la transcription."""
        self.logger.info(f"Transcribing audio: {audio_id}")
        self.logger.info(f"Language: {language or 'auto-detect'}, Diarization: {enable_speaker_diarization}")
        
        # NOTE: En production, utiliser OpenAI Whisper API
        # Pour l'instant, implémentation mock
        
        await asyncio.sleep(1.0)  # Simulation
        
        # Générer une transcription mock
        mock_segments = self._generate_mock_transcript(audio_id)
        
        transcript = Transcript(
            transcript_id=f"transcript_{audio_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            audio_id=audio_id,
            audio_url=audio_url,
            language=language or "fr",
            duration=mock_segments[-1].end_time if mock_segments else 0,
            segments=mock_segments,
            created_at=datetime.now(),
            speaker_count=2,
            word_count=sum(len(s.text.split()) for s in mock_segments),
            language_confidence=0.95
        )
        
        self.logger.info(f"Transcription complete: {len(mock_segments)} segments, {transcript.word_count} words")
        return transcript
    
    def _generate_mock_transcript(self, audio_id: str) -> List[TranscriptSegment]:
        """Générer une transcription mock."""
        segments = []
        
        # Script mock
        dialogues = [
            {
                "text": "Bonjour et bienvenue dans notre nouvelle vidéo.",
                "speaker": ("SPEAKER_01", "Présentateur", 0.9),
                "start": 0.0,
                "end": 3.5,
                "type": SegmentType.DIALOGUE
            },
            {
                "text": "Aujourd'hui, nous allons explorer les fonctionnalités avancées de StoryCore Engine.",
                "speaker": ("SPEAKER_01", "Présentateur", 0.92),
                "start": 3.8,
                "end": 8.0,
                "type": SegmentType.DIALOGUE
            },
            {
                "text": "Premièrement, laissez-moi vous montrer le nouvel outil de masquage par IA.",
                "speaker": ("SPEAKER_01", "Présentateur", 0.88),
                "start": 8.5,
                "end": 12.0,
                "type": SegmentType.DIALOGUE
            },
            {
                "text": "C'est incroyable comme ça fonctionne bien !",
                "speaker": ("SPEAKER_02", "Intervenant", 0.85),
                "start": 12.5,
                "end": 15.0,
                "type": SegmentType.DIALOGUE
            },
            {
                "text": "Oui, n'est-ce pas ? L'IA détecte automatiquement les objets dans la vidéo.",
                "speaker": ("SPEAKER_01", "Présentateur", 0.90),
                "start": 15.5,
                "end": 19.0,
                "type": SegmentType.DIALOGUE
            },
            {
                "text": "Ensuite, nous avons la fonctionnalité de remixage musical intelligent.",
                "speaker": ("SPEAKER_01", "Présentateur", 0.87),
                "start": 19.5,
                "end": 23.0,
                "type": SegmentType.DIALOGUE
            },
            {
                "text": "Vous pouvez adapter n'importe quelle musique à la durée de votre vidéo.",
                "speaker": ("SPEAKER_01", "Présentateur", 0.89),
                "start": 23.5,
                "end": 27.0,
                "type": SegmentType.DIALOGUE
            },
            {
                "text": "C'est vraiment pratique pour créer des montages rapides.",
                "speaker": ("SPEAKER_02", "Intervenant", 0.86),
                "start": 27.5,
                "end": 30.0,
                "type": SegmentType.DIALOGUE
            },
            {
                "text": "En conclusion, StoryCore Engine vous offre des outils professionnels pour créer des vidéos exceptionnelles.",
                "speaker": ("SPEAKER_01", "Présentateur", 0.93),
                "start": 30.5,
                "end": 35.0,
                "type": SegmentType.DIALOGUE
            },
            {
                "text": "N'hésitez pas à essayer ces fonctionnalités et à partager vos créations !",
                "speaker": ("SPEAKER_01", "Présentateur", 0.91),
                "start": 35.5,
                "end": 38.5,
                "type": SegmentType.DIALOGUE
            }
        ]
        
        for i, dialogue in enumerate(dialogues):
            words = self._generate_word_timestamps(dialogue["text"], dialogue["start"], dialogue["end"])
            
            segment = TranscriptSegment(
                segment_id=f"{audio_id}_seg_{i}",
                start_time=dialogue["start"],
                end_time=dialogue["end"],
                text=dialogue["text"],
                speaker=SpeakerSegment(
                    speaker_id=dialogue["speaker"][0],
                    speaker_label=dialogue["speaker"][1],
                    confidence=dialogue["speaker"][2]
                ) if dialogue["speaker"] else None,
                confidence=dialogue["speaker"][2] if dialogue["speaker"] else 0.8,
                words=words,
                segment_type=dialogue["type"]
            )
            segments.append(segment)
        
        return segments
    
    def _generate_word_timestamps(
        self,
        text: str,
        start_time: float,
        end_time: float
    ) -> List[Dict[str, Any]]:
        """Générer les timestamps pour chaque mot."""
        words = text.split()
        word_count = len(words)
        
        if word_count == 0:
            return []
        
        duration = end_time - start_time
        word_duration = duration / word_count
        
        word_list = []
        current_time = start_time
        
        for i, word in enumerate(words):
            word_start = current_time
            word_end = current_time + word_duration
            
            word_list.append({
                "word": word,
                "start": round(word_start, 3),
                "end": round(word_end, 3),
                "confidence": 0.9 - (i * 0.01)  # Confiance décroissante
            })
            
            current_time = word_end
        
        return word_list
    
    async def generate_montage(self, request: MontageRequest) -> MontageResult:
        """Générer un montage basé sur la transcription."""
        
        async def _montage_operation():
            return await self._perform_montage_generation(request)
        
        try:
            result = await self.circuit_breaker.call(_montage_operation)
            self.montage_cache[result.result_id] = result
            return result
            
        except Exception as e:
            self.logger.error(f"Montage generation failed: {e}")
            raise TranscriptionError(f"Montage generation failed: {str(e)}")
    
    async def _perform_montage_generation(self, request: MontageRequest) -> MontageResult:
        """Effectuer la génération de montage."""
        
        # Récupérer la transcription
        transcript = self.transcript_cache.get(request.transcript_id)
        if not transcript:
            # Essayer de charger depuis le cache par audio_id
            for t in self.transcript_cache.values():
                if t.audio_id == request.transcript_id:
                    transcript = t
                    break
        
        if not transcript:
            raise TranscriptionError(f"Transcript not found: {request.transcript_id}")
        
        self.logger.info(f"Generating {request.style.value} montage from transcript")
        
        # Filtrer les segments selon les critères
        filtered_segments = self._filter_segments(transcript, request)
        
        # Générer les plans selon le style
        if request.style == MontageStyle.CHRONOLOGICAL:
            shots = self._generate_chronological_shots(filtered_segments, transcript)
        elif request.style == MontageStyle.HIGHLIGHTS:
            shots = self._generate_highlights_shots(filtered_segments, transcript)
        elif request.style == MontageStyle.COMPACT:
            shots = self._generate_compact_shots(filtered_segments, transcript)
        elif request.style == MontageStyle.CONVERSATION:
            shots = self._generate_conversation_shots(filtered_segments, transcript)
        else:
            shots = self._generate_chronological_shots(filtered_segments, transcript)
        
        # Calculer la durée totale
        total_duration = sum(s.duration for s in shots)
        
        # Appliquer la limite de durée si spécifiée
        if request.max_duration and total_duration > request.max_duration:
            shots = self._trim_to_duration(shots, request.max_duration)
            total_duration = sum(s.duration for s in shots)
        
        # Créer le résumé
        summary = self._generate_summary(shots, request.style)
        
        result = MontageResult(
            result_id=f"montage_{request.transcript_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            transcript_id=request.transcript_id,
            style=request.style,
            shots=shots,
            total_duration=total_duration,
            word_count=sum(len(s.text.split()) for s in shots),
            created_at=datetime.now(),
            summary=summary
        )
        
        self.logger.info(f"Montage generated: {len(shots)} shots, {total_duration:.1f}s total")
        return result
    
    def _filter_segments(
        self,
        transcript: Transcript,
        request: MontageRequest
    ) -> List[TranscriptSegment]:
        """Filtrer les segments selon les critères."""
        segments = transcript.segments
        
        # Filtrer par locuteur
        if request.include_speakers:
            segments = [
                s for s in segments
                if s.speaker and s.speaker.speaker_id in request.include_speakers
            ]
        
        if request.exclude_speakers:
            segments = [
                s for s in segments
                if not s.speaker or s.speaker.speaker_id not in request.exclude_speakers
            ]
        
        return segments
    
    def _generate_chronological_shots(
        self,
        segments: List[TranscriptSegment],
        transcript: Transcript
    ) -> List[MontageShot]:
        """Générer des plans en ordre chronologique."""
        shots = []
        
        for i, segment in enumerate(segments):
            shot = MontageShot(
                shot_id=f"shot_{i}",
                source_start=segment.start_time,
                source_end=segment.end_time,
                text=segment.text,
                speaker=segment.speaker.speaker_label if segment.speaker else None,
                shot_type=segment.segment_type.value,
                duration=segment.duration,
                order=i
            )
            shots.append(shot)
        
        return shots
    
    def _generate_highlights_shots(
        self,
        segments: List[TranscriptSegment],
        transcript: Transcript
    ) -> List[MontageShot]:
        """Générer des plans avec les moments forts."""
        # Privilégier les segments avec haute confiance
        scored_segments = []
        
        for i, segment in enumerate(segments):
            # Score basé sur la confiance et la longueur
            score = segment.confidence
            # Favoriser les segments moyens (ni trop courts, ni trop longs)
            length_factor = 1.0 - abs(segment.duration - 5.0) / 10.0
            score += max(0, length_factor)
            
            scored_segments.append((score, segment, i))
        
        # Trier par score et sélectionner les meilleurs
        scored_segments.sort(key=lambda x: x[0], reverse=True)
        selected = scored_segments[:min(10, len(scored_segments))]
        
        # Re-trier par ordre chronologique
        selected.sort(key=lambda x: x[2])
        
        shots = []
        for i, (_, segment, _) in enumerate(selected):
            shot = MontageShot(
                shot_id=f"highlight_{i}",
                source_start=segment.start_time,
                source_end=segment.end_time,
                text=f"⭐ {segment.text}",
                speaker=segment.speaker.speaker_label if segment.speaker else None,
                shot_type=segment.segment_type.value,
                duration=segment.duration,
                order=i
            )
            shots.append(shot)
        
        return shots
    
    def _generate_compact_shots(
        self,
        segments: List[TranscriptSegment],
        transcript: Transcript
    ) -> List[MontageShot]:
        """Générer une version condensée."""
        shots = []
        
        # Regrouper les segments consécutifs du même locuteur
        current_group = None
        group_index = 0
        
        for segment in segments:
            if current_group is None:
                current_group = {
                    "start": segment.start_time,
                    "end": segment.end_time,
                    "text": segment.text,
                    "speaker": segment.speaker,
                    "type": segment.segment_type
                }
            elif (
                segment.speaker and current_group["speaker"] and
                segment.speaker.speaker_id == current_group["speaker"].speaker_id and
                segment.start_time - current_group["end"] < 2.0  # Moins de 2s de gap
            ):
                # Regrouper avec le segment précédent
                current_group["end"] = segment.end_time
                current_group["text"] += " " + segment.text
            else:
                # Terminer le groupe actuel
                shot = MontageShot(
                    shot_id=f"compact_{group_index}",
                    source_start=current_group["start"],
                    source_end=current_group["end"],
                    text=current_group["text"],
                    speaker=current_group["speaker"].speaker_label if current_group["speaker"] else None,
                    shot_type=current_group["type"].value,
                    duration=current_group["end"] - current_group["start"],
                    order=group_index
                )
                shots.append(shot)
                group_index += 1
                
                # Nouveau groupe
                current_group = {
                    "start": segment.start_time,
                    "end": segment.end_time,
                    "text": segment.text,
                    "speaker": segment.speaker,
                    "type": segment.segment_type
                }
        
        # Ajouter le dernier groupe
        if current_group:
            shot = MontageShot(
                shot_id=f"compact_{group_index}",
                source_start=current_group["start"],
                source_end=current_group["end"],
                text=current_group["text"],
                speaker=current_group["speaker"].speaker_label if current_group["speaker"] else None,
                shot_type=current_group["type"].value,
                duration=current_group["end"] - current_group["start"],
                order=group_index
            )
            shots.append(shot)
        
        return shots
    
    def _generate_conversation_shots(
        self,
        segments: List[TranscriptSegment],
        transcript: Transcript
    ) -> List[MontageShot]:
        """Générer des plans organisés par conversation."""
        shots = []
        current_speaker = None
        speaker_shots: Dict[str, List[MontageShot]] = {}
        
        for i, segment in enumerate(segments):
            if not segment.speaker:
                # Segment sans locuteur
                shot = MontageShot(
                    shot_id=f"conv_{i}",
                    source_start=segment.start_time,
                    source_end=segment.end_time,
                    text=segment.text,
                    speaker=None,
                    shot_type=segment.segment_type.value,
                    duration=segment.duration,
                    order=i
                )
                shots.append(shot)
                continue
            
            speaker_id = segment.speaker.speaker_id
            
            if speaker_id not in speaker_shots:
                speaker_shots[speaker_id] = []
            
            shot = MontageShot(
                shot_id=f"conv_{speaker_id}_{len(speaker_shots[speaker_id])}",
                source_start=segment.start_time,
                source_end=segment.end_time,
                text=segment.text,
                speaker=segment.speaker.speaker_label,
                shot_type=f"dialogue_{speaker_id.lower()}",
                duration=segment.duration,
                order=len(shots)
            )
            
            speaker_shots[speaker_id].append(shot)
            shots.append(shot)
        
        return shots
    
    def _trim_to_duration(
        self,
        shots: List[MontageShot],
        max_duration: float
    ) -> List[MontageShot]:
        """Ajuster les plans pour respecter la durée maximale."""
        current_duration = sum(s.duration for s in shots)
        
        if current_duration <= max_duration:
            return shots
        
        # Réduire uniformément les plans
        target_ratio = max_duration / current_duration
        trimmed_shots = []
        
        for shot in shots:
            new_duration = shot.duration * target_ratio
            new_end = shot.source_start + new_duration
            
            trimmed_shots.append(MontageShot(
                shot_id=shot.shot_id,
                source_start=shot.source_start,
                source_end=new_end,
                text=shot.text,
                speaker=shot.speaker,
                shot_type=shot.shot_type,
                duration=new_duration,
                order=shot.order
            ))
        
        return trimmed_shots
    
    def _generate_summary(self, shots: List[MontageShot], style: MontageStyle) -> str:
        """Générer un résumé du montage."""
        speaker_counts: Dict[str, int] = {}
        
        for shot in shots:
            if shot.speaker:
                speaker_counts[shot.speaker] = speaker_counts.get(shot.speaker, 0) + 1
        
        speaker_text = ""
        if speaker_counts:
            speakers = list(speaker_counts.keys())
            if len(speakers) == 1:
                speaker_text = f"avec {speakers[0]}"
            elif len(speakers) == 2:
                speaker_text = f"entre {speakers[0]} et {speakers[1]}"
            else:
                speaker_text = f"avec {len(speakers)} locuteurs"
        
        summary = f"Montage {style.value} - {len(shots)} segments, {speaker_text}"
        
        return summary
    
    # ============ Import/Export Subtitles ============
    
    def export_srt(self, transcript: Transcript) -> str:
        """Exporter la transcription en format SRT."""
        output = ""
        
        for i, segment in enumerate(transcript.segments, 1):
            # Format temps SRT: HH:MM:SS,mmm
            start = self._format_srt_time(segment.start_time)
            end = self._format_srt_time(segment.end_time)
            
            output += f"{i}\n"
            output += f"{start} --> {end}\n"
            output += f"{segment.text}\n\n"
        
        return output
    
    def _format_srt_time(self, seconds: float) -> str:
        """Formatter le temps en format SRT."""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds % 1) * 1000)
        
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"
    
    def export_vtt(self, transcript: Transcript) -> str:
        """Exporter la transcription en format VTT."""
        output = "WEBVTT\n\n"
        
        for segment in transcript.segments:
            start = self._format_vtt_time(segment.start_time)
            end = self._format_vtt_time(segment.end_time)
            
            output += f"{start} --> {end}\n"
            output += f"{segment.text}\n\n"
        
        return output
    
    def _format_vtt_time(self, seconds: float) -> str:
        """Formatter le temps en format VTT."""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds % 1) * 1000)
        
        return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"
    
    def export_ass(self, transcript: Transcript) -> str:
        """Exporter la transcription en format ASS (Advanced Substation Alpha)."""
        output = """[Script Info]
Title: StoryCore Transcript
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: None

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
        
        for segment in transcript.segments:
            start = self._format_ass_time(segment.start_time)
            end = self._format_ass_time(segment.end_time)
            
            # Échapper les caractères spéciaux
            text = segment.text.replace("\n", "\\N")
            
            output += f"Dialogue: 0,{start},{end},Default,,0,0,0,,{text}\n"
        
        return output
    
    def _format_ass_time(self, seconds: float) -> str:
        """Formatter le temps en format ASS."""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        centis = int((seconds % 1) * 100)
        
        return f"{hours}:{minutes:02d}:{secs:02d}.{centis:02d}"
    
    def parse_srt(self, content: str) -> List[Dict[str, Any]]:
        """Parser un fichier SRT."""
        segments = []
        blocks = content.strip().split("\n\n")
        
        for block in blocks:
            lines = block.strip().split("\n")
            if len(lines) < 3:
                continue
            
            # Extraire le temps
            time_line = lines[1]
            start_str, end_str = time_line.split(" --> ")
            
            start = self._parse_srt_time(start_str.strip())
            end = self._parse_srt_time(end_str.strip())
            
            # Extraire le texte
            text = "\n".join(lines[2:])
            
            segments.append({
                "start": start,
                "end": end,
                "text": text
            })
        
        return segments
    
    def _parse_srt_time(self, time_str: str) -> float:
        """Parser un temps SRT."""
        # Format: HH:MM:SS,mmm
        time_str = time_str.replace(",", ".")
        parts = time_str.split(":")
        
        hours = int(parts[0])
        minutes = int(parts[1])
        secs = float(parts[2])
        
        return hours * 3600 + minutes * 60 + secs
    
    # ============ API ============
    
    async def get_transcript(self, transcript_id: str) -> Optional[Transcript]:
        """Récupérer une transcription."""
        return self.transcript_cache.get(transcript_id)
    
    async def get_montage(self, result_id: str) -> Optional[MontageResult]:
        """Récupérer un résultat de montage."""
        return self.montage_cache.get(result_id)
    
    async def shutdown(self):
        """Arrêter le moteur."""
        self.logger.info("Shutting down Transcription Engine...")
        
        self.transcript_cache.clear()
        self.montage_cache.clear()
        
        self.logger.info("Transcription Engine shutdown complete")


class TranscriptionError(Exception):
    """Exception personnalisée pour les erreurs de transcription."""
    pass


# Factory function
def create_transcription_engine(ai_config: AIConfig = None) -> TranscriptionEngine:
    """Créer et configurer le moteur de transcription."""
    return TranscriptionEngine(ai_config)

