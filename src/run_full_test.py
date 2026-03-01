import subprocess
import os
import sys

def run_tests():
    print("=== Démarrage des tests du système de version ===")
    print()

    # Test 1: Vérifier les fichiers de base
    print("Test 1: Vérification des fichiers système")
    required_files = ['version.json', 'version_manager.py', 'version_module.py', 'test_version_system.py']
    all_files_exist = True
    for file in required_files:
        if os.path.exists(file):
            print(f"  ✓ {file} - OK")
        else:
            print(f"  ✗ {file} - Manquant")
            all_files_exist = False
    print()

    # Test 2: Lancer les tests unitaires
    print("Test 2: Tests unitaires")
    try:
        result = subprocess.run(['python', 'test_version_system.py'], capture_output=True, text=True)
        if result.returncode == 0:
            print("  ✓ Tests unitaires - PASS")
            print(result.stdout)
        else:
            print("  ✗ Tests unitaires - FAIL")
            print(result.stderr)
    except Exception as e:
        print(f"  ✗ Erreur lors des tests: {e}")
    print()

    # Test 3: Tester le système de version
    print("Test 3: Test du système de version")
    try:
        # Tester la version actuelle
        print("  Test version actuelle...")
        result = subprocess.run(['python', '-c', 'from version_manager import VersionManager; vm=VersionManager(); print("Version:", vm.get_current_version())'],
                              capture_output=True, text=True)
        if result.returncode == 0:
            print(f"  ✓ Version actuelle: {result.stdout.strip()}")
        else:
            print("  ✗ Erreur lors de la récupération de la version")

        # Tester l'incrémentation
        print("  Test incrémentation...")
        result = subprocess.run(['python', '-c', 'from version_manager import VersionManager; vm=VersionManager(); vm.increment_build(); print("Nouvelle version:", vm.get_current_version())'],
                              capture_output=True, text=True)
        if result.returncode == 0:
            print(f"  ✓ Incrémentation: {result.stdout.strip()}")
        else:
            print("  ✗ Erreur lors de l'incrémentation")

        # Tester le module
        print("  Test module...")
        result = subprocess.run(['python', '-c', 'from version_module import VersionModule; vm=VersionModule(); vm.display_version()'],
                              capture_output=True, text=True)
        if result.returncode == 0:
            print(f"  ✓ Module: {result.stdout.strip()}")
        else:
            print("  ✗ Erreur lors du test du module")

    except Exception as e:
        print(f"  ✗ Erreur système: {e}")
    print()

    # Test 4: Test d'intégration
    print("Test 4: Test d'intégration")
    try:
        result = subprocess.run(['python', 'integrate_version.py', '.'], capture_output=True, text=True)
        if result.returncode == 0:
            print("  ✓ Intégration - PASS")
        else:
            print("  ✗ Intégration - FAIL")
            print(result.stderr)
    except Exception as e:
        print(f"  ✗ Erreur intégration: {e}")
    print()

    print("=== Tests terminés ===")
    print()

if __name__ == "__main__":
    run_tests()