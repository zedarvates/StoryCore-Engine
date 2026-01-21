#!/usr/bin/env python3
"""
Script pour convertir les fichiers WAV en MP3 et supprimer les fichiers WAV.
Ce script utilise la bibliothèque pydub pour la conversion audio.
"""

import os
import sys
from pydub import AudioSegment


def convert_wav_to_mp3(wav_file_path, mp3_file_path, bitrate="128k"):
    """
    Convertit un fichier WAV en MP3 et supprime le fichier WAV d'origine.
    
    Args:
        wav_file_path (str): Chemin vers le fichier WAV à convertir.
        mp3_file_path (str): Chemin vers le fichier MP3 de sortie.
        bitrate (str): Débit binaire pour le fichier MP3 (par défaut : "128k").
    """
    try:
        # Charger le fichier WAV
        audio = AudioSegment.from_wav(wav_file_path)
        
        # Exporter en MP3
        audio.export(mp3_file_path, format="mp3", bitrate=bitrate)
        
        # Supprimer le fichier WAV d'origine
        os.remove(wav_file_path)
        
        print(f"Conversion réussie : {wav_file_path} -> {mp3_file_path}")
        return True
    except Exception as e:
        print(f"Erreur lors de la conversion : {e}")
        return False


def main():
    if len(sys.argv) != 3:
        print("Usage: python convert_wav_to_mp3.py <fichier_wav> <fichier_mp3>")
        sys.exit(1)
    
    wav_file = sys.argv[1]
    mp3_file = sys.argv[2]
    
    if not os.path.exists(wav_file):
        print(f"Erreur : Le fichier {wav_file} n'existe pas.")
        sys.exit(1)
    
    convert_wav_to_mp3(wav_file, mp3_file)


if __name__ == "__main__":
    main()