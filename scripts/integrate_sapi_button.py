#!/usr/bin/env python3
"""
Script pour intégrer un bouton dans l'interface utilisateur afin de déclencher
la génération des dialogues via SAPI. Ce script suppose que l'interface
utilisateur est développée en Python avec une bibliothèque comme Tkinter ou PyQt.
"""

import tkinter as tk
from tkinter import messagebox
import subprocess
import os


def generate_dialogues():
    """
    Fonction appelée lors du clic sur le bouton pour générer les dialogues.
    """
    try:
        # Exécuter le script de génération des dialogues
        subprocess.run([
            "python", 
            os.path.join("scripts", "generate_dialogue.py")
        ], check=True)
        
        messagebox.showinfo("Succès", "Génération des dialogues terminée avec succès !")
    except subprocess.CalledProcessError as e:
        messagebox.showerror("Erreur", f"Erreur lors de la génération des dialogues : {e}")
    except Exception as e:
        messagebox.showerror("Erreur", f"Une erreur inattendue est survenue : {e}")


def main():
    # Créer la fenêtre principale
    root = tk.Tk()
    root.title("SAPI Voices Hack Pre-rendu")
    
    # Ajouter un bouton pour déclencher la génération des dialogues
    generate_button = tk.Button(
        root,
        text="Générer les dialogues",
        command=generate_dialogues
    )
    generate_button.pack(pady=20)
    
    # Lancer la boucle principale de l'interface
    root.mainloop()


if __name__ == "__main__":
    main()