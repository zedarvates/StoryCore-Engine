"""
Recap Engine - TTS Generator
Génère les fichiers audio de narration via différents providers TTS.

Providers supportés :
- gTTS : Google TTS (simple, offline-capable via cache)
- edge_tts : Microsoft Edge TTS (haute qualité neurale, meilleur choix)
- piper : Piper TTS local (offline complet)
- mock : Mode test (génère fichier silencieux)
"""

import asyncio
import logging
import os
from pathlib import Path
from typing import Optional

from .types import RecapScene, TTSProvider

logger = logging.getLogger(__name__)


# ============================================================================
# TTS Generator
# ============================================================================


class TTSGenerator:
    """
    Génère les fichiers audio TTS pour chaque scène du recap.

    Chaque scène produit un fichier .mp3 ou .wav dont la durée
    correspond à la lecture du texte de narration.
    """

    def __init__(
        self,
        provider: TTSProvider = TTSProvider.GTTS,
        language: str = "fr",
        output_dir: str = "data/assets/recaps",
    ):
        self.provider = provider
        self.language = language
        self._output_dir = Path(output_dir)
        self._output_dir.mkdir(parents=True, exist_ok=True)

    async def generate_scene_audio(
        self, scene: RecapScene, timeline_id: str
    ) -> Optional[str]:
        """
        Génère l'audio TTS pour une scène.
        Retourne le chemin du fichier audio généré.
        """
        if not scene.narration_text.strip():
            logger.debug(f"[TTS] Scène {scene.scene_id} : texte vide, skip")
            return None

        audio_dir = self._output_dir / timeline_id / "audio"
        audio_dir.mkdir(parents=True, exist_ok=True)
        audio_path = audio_dir / f"scene_{scene.scene_id}.mp3"

        # Éviter la régénération si déjà existant
        if audio_path.exists():
            logger.debug(f"[TTS] Cache audio : {audio_path}")
            return str(audio_path)

        try:
            if self.provider == TTSProvider.GTTS:
                return await self._generate_gtts(scene, audio_path)
            elif self.provider == TTSProvider.EDGE_TTS:
                return await self._generate_edge_tts(scene, audio_path)
            elif self.provider == TTSProvider.PIPER:
                return await self._generate_piper(scene, audio_path)
            elif self.provider == TTSProvider.MOCK:
                return await self._generate_mock(scene, audio_path)
            else:
                # Fallback sur gTTS
                return await self._generate_gtts(scene, audio_path)
        except Exception as e:
            logger.error(f"[TTS] Erreur génération audio scène {scene.scene_id}: {e}")
            # Fallback silencieux
            return await self._generate_mock(scene, audio_path)

    async def generate_timeline_audio(self, scenes, timeline_id: str) -> int:
        """
        Génère l'audio pour toutes les scènes d'une timeline.
        Retourne le nombre de fichiers générés.
        """
        count = 0
        for scene in scenes:
            audio_path = await self.generate_scene_audio(scene, timeline_id)
            if audio_path:
                scene.audio_path = audio_path
                count += 1
            await asyncio.sleep(0)  # Yield pour éviter le blocage

        logger.info(f"[TTS] {count}/{len(scenes)} fichiers audio générés")
        return count

    # ------------------------------------------------------------------
    # Provider Implementations
    # ------------------------------------------------------------------

    async def _generate_gtts(
        self, scene: RecapScene, output_path: Path
    ) -> Optional[str]:
        """Google TTS (simple, gratuit, nécessite connexion réseau)."""
        try:
            from gtts import gTTS
        except ImportError:
            logger.warning("[TTS] gTTS non installé. pip install gtts")
            return await self._generate_mock(scene, output_path)

        loop = asyncio.get_event_loop()

        def _gen():
            tts = gTTS(
                text=scene.narration_text,
                lang=self.language,
                slow=False,
            )
            tts.save(str(output_path))

        await loop.run_in_executor(None, _gen)
        logger.debug(f"[TTS/gTTS] Généré : {output_path}")
        return str(output_path)

    async def _generate_edge_tts(
        self, scene: RecapScene, output_path: Path
    ) -> Optional[str]:
        """
        Microsoft Edge TTS - Voix neurales de haute qualité.
        Recommandé pour la production. Requiert : pip install edge-tts
        """
        try:
            import edge_tts
        except ImportError:
            logger.warning(
                "[TTS] edge-tts non installé. pip install edge-tts. Fallback gTTS."
            )
            return await self._generate_gtts(scene, output_path)

        # Choisir la voix selon le personnage
        voice = scene.narrator_character_id  # Peut être un voice ID direct
        if not voice.startswith("fr-") and not voice.startswith("en-"):
            # Voix par défaut selon la langue
            voice = (
                "fr-FR-DeniseNeural" if self.language == "fr" else "en-US-JennyNeural"
            )

        try:
            communicate = edge_tts.Communicate(scene.narration_text, voice)
            await communicate.save(str(output_path))
            logger.debug(f"[TTS/EdgeTTS] Voix={voice} → {output_path}")
            return str(output_path)
        except Exception as e:
            logger.error(f"[TTS/EdgeTTS] Erreur : {e}")
            return await self._generate_gtts(scene, output_path)

    async def _generate_piper(
        self, scene: RecapScene, output_path: Path
    ) -> Optional[str]:
        """
        Piper TTS - Entièrement local, offline.
        Requiert l'installation de Piper + modèles.
        """
        piper_exe = os.environ.get("PIPER_PATH", "piper")
        model_path = os.environ.get(
            "PIPER_MODEL", "models/piper/fr_FR-upmc-medium.onnx"
        )

        if not Path(model_path).exists():
            logger.warning(
                f"[TTS/Piper] Modèle introuvable : {model_path}. Fallback gTTS."
            )
            return await self._generate_gtts(scene, output_path)

        wav_path = output_path.with_suffix(".wav")
        cmd = [
            piper_exe,
            "--model",
            model_path,
            "--output-file",
            str(wav_path),
        ]

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        await process.communicate(input=scene.narration_text.encode("utf-8"))

        if wav_path.exists():
            # Convertir WAV → MP3 si ffmpeg disponible
            mp3_path = await self._wav_to_mp3(wav_path, output_path)
            return mp3_path or str(wav_path)

        return None

    async def _generate_mock(self, scene: RecapScene, output_path: Path) -> str:
        """
        Mode test : génère un fichier audio silencieux de la bonne durée.
        Utilise ffmpeg pour créer un silence MP3.
        """
        duration = max(1.0, scene.duration)
        try:
            process = await asyncio.create_subprocess_exec(
                "ffmpeg",
                "-y",
                "-f",
                "lavfi",
                "-i",
                "anullsrc=r=44100:cl=mono",
                "-t",
                str(duration),
                "-q:a",
                "9",
                "-acodec",
                "libmp3lame",
                str(output_path),
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            await process.wait()
        except Exception:
            # Si ffmpeg absent, créer un fichier vide
            output_path.write_bytes(b"")

        return str(output_path)

    async def _wav_to_mp3(self, wav_path: Path, mp3_path: Path) -> Optional[str]:
        """Convertit WAV en MP3 via ffmpeg."""
        try:
            process = await asyncio.create_subprocess_exec(
                "ffmpeg",
                "-y",
                "-i",
                str(wav_path),
                "-codec:a",
                "libmp3lame",
                "-q:a",
                "2",
                str(mp3_path),
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            await process.wait()
            wav_path.unlink(missing_ok=True)
            return str(mp3_path) if mp3_path.exists() else None
        except Exception:
            return None

    async def list_available_voices(self) -> list:
        """Retourne la liste des voix disponibles pour le provider actuel."""
        if self.provider == TTSProvider.EDGE_TTS:
            try:
                import edge_tts

                voices = await edge_tts.list_voices()
                lang_prefix = "fr-" if self.language == "fr" else "en-"
                return [
                    {"name": v["ShortName"], "gender": v["Gender"]}
                    for v in voices
                    if v["ShortName"].startswith(lang_prefix)
                ]
            except Exception:
                pass

        # Voix par défaut
        if self.language == "fr":
            return [
                {"name": "fr-FR-DeniseNeural", "gender": "Female"},
                {"name": "fr-FR-HenriNeural", "gender": "Male"},
                {"name": "fr-FR-AlainNeural", "gender": "Male"},
                {"name": "fr-FR-EloiseNeural", "gender": "Female"},
            ]
        return [
            {"name": "en-US-JennyNeural", "gender": "Female"},
            {"name": "en-US-GuyNeural", "gender": "Male"},
        ]
