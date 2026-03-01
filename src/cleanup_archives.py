#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de nettoyage des dossiers d'archives obsoletes
Date: 2026-02-12

Ce script supprime les dossiers reports/ et plans/ qui contiennent
des fichiers historiques de developpement plus necessaires.

Le dossier archive/ est conserve car il contient des ressources
utilisees par le projet.
"""

import os
import shutil
from datetime import datetime

# Configuration
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
ARCHIVE_DIR = os.path.join(ROOT_DIR, 'archive')
REPORTS_DIR = os.path.join(ROOT_DIR, 'reports')
PLANS_DIR = os.path.join(ROOT_DIR, 'plans')

def count_files(directory):
    """Compter le nombre de fichiers dans un répertoire"""
    count = 0
    for root, dirs, files in os.walk(directory):
        count += len(files)
    return count

def get_directory_size(directory):
    """Obtenir la taille totale d'un répertoire en octets"""
    total_size = 0
    for root, dirs, files in os.walk(directory):
        for file in files:
            file_path = os.path.join(root, file)
            total_size += os.path.getsize(file_path)
    return total_size

def format_size(size):
    """Formater la taille en format lisible"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size < 1024:
            return f"{size:.2f} {unit}"
        size /= 1024
    return f"{size:.2f} TB"

def main():
    print("=" * 60)
    print("StoryCore Engine - Nettoyage des Archives")
    print("=" * 60)
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Analyser les dossiers avant suppression
    print("[INFO] Analyse des dossiers a supprimer:")
    print("-" * 40)
    
    dirs_to_check = [
        ('reports', REPORTS_DIR),
        ('plans', PLANS_DIR),
    ]
    
    total_files = 0
    total_size = 0
    
    for name, path in dirs_to_check:
        if os.path.exists(path):
            file_count = count_files(path)
            size = get_directory_size(path)
            total_files += file_count
            total_size += size
            print(f"  [DIR] {name}/")
            print(f"     Fichiers: {file_count}")
            print(f"     Taille: {format_size(size)}")
            print()
        else:
            print(f"  [WARNING] {name}/ - NON TROUVE")
            print()
    
    print(f"[STATS] Total:")
    print(f"   Fichiers: {total_files}")
    print(f"   Taille: {format_size(total_size)}")
    print()
    
    # Suppression des dossiers
    print("[DELETE] Suppression des dossiers:")
    print("-" * 40)
    
    for name, path in dirs_to_check:
        if os.path.exists(path):
            try:
                shutil.rmtree(path)
                print(f"  [OK] {name}/ - SUPPRIME")
            except Exception as e:
                print(f"  [ERROR] {name}/ - ERREUR: {e}")
        else:
            print(f"  [WARNING] {name}/ - deja absent")
    
    print()
    print("=" * 60)
    print("[DONE] Nettoyage termine!")
    print("=" * 60)
    
    # Mise a jour du fichier d'audit
    audit_file = os.path.join(ROOT_DIR, 'CODE_OPTIMIZATION_AUDIT.md')
    if os.path.exists(audit_file):
        print("\n[UPDATE] Mise a jour de CODE_OPTIMIZATION_AUDIT.md...")
        with open(audit_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Remplacer le statut de la tache Archive cleanup
        old_status = "[~] Week 4: Archive cleanup (in progress)"
        new_status = "[x] Week 4: Archive cleanup - DONE"
        
        if old_status in content:
            content = content.replace(old_status, new_status)
            with open(audit_file, 'w', encoding='utf-8') as f:
                f.write(content)
            print("  [OK] Fichier d'audit mis a jour")
        else:
            print("  [WARNING] Statut non trouve dans le fichier d'audit")

if __name__ == '__main__':
    main()
