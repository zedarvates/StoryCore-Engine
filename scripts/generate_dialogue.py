#!/usr/bin/env python3
"""
Script pour générer des phrases de dialogue une par une en utilisant SAPI.
Ce script utilise la bibliothèque pyttsx3 pour la synthèse vocale.
"""

import os
import pyttsx3
import subprocess


def generate_dialogue_phrase(phrase, output_dir, phrase_index):
    """
    Génère une phrase de dialogue en utilisant SAPI et enregistre le résultat.
    
    Args:
        phrase (str): La phrase de dialogue à générer.
        output_dir (str): Le répertoire de sortie pour les fichiers audio.
        phrase_index (int): L'index de la phrase pour le nommage des fichiers.
    
    Returns:
        str: Le chemin vers le fichier MP3 généré.
    """
    try:
        # Initialiser le moteur de synthèse vocale
        engine = pyttsx3.init()
        
        # Configurer le moteur pour utiliser SAPI
        engine.setProperty('voice', 'french')
        
        # Créer le répertoire de sortie s'il n'existe pas
        os.makedirs(output_dir, exist_ok=True)
        
        # Définir les chemins des fichiers WAV et MP3
        wav_file = os.path.join(output_dir, f"phrase_{phrase_index}.wav")
        mp3_file = os.path.join(output_dir, f"phrase_{phrase_index}.mp3")
        
        # Enregistrer la phrase dans un fichier WAV
        engine.save_to_file(phrase, wav_file)
        engine.runAndWait()
        
        # Convertir le fichier WAV en MP3
        subprocess.run([
            "python", 
            os.path.join("scripts", "convert_wav_to_mp3.py"),
            wav_file,
            mp3_file
        ], check=True)
        
        print(f"Phrase générée et enregistrée : {mp3_file}")
        return mp3_file
    except Exception as e:
        print(f"Erreur lors de la génération de la phrase : {e}")
        return None


def main():
    # Exemple d'utilisation
    phrases = [
        "Bonjour, comment allez-vous ?",
        "Je vais bien, merci.",
        "C'est un plaisir de vous voir."
    ]
    
    output_dir = "output_dialogues"
    
    for index, phrase in enumerate(phrases):
        generate_dialogue_phrase(phrase, output_dir, index)


if __name__ == "__main__":
    main()