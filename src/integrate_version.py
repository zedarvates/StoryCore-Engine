import os
import sys
from version_manager import VersionManager
from version_module import VersionModule

def integrate_into_project(project_path):
    print(f"Intégration du système de version dans le projet: {project_path}")

    # Vérifier si le projet existe
    if not os.path.exists(project_path):
        print(f"Erreur: Le projet {project_path} n'existe pas")
        return False

    # Créer un fichier de configuration si nécessaire
    config_file = os.path.join(project_path, 'version_config.py')
    if not os.path.exists(config_file):
        with open(config_file, 'w', encoding='utf-8') as f:
            f.write("""
from version_module import VersionModule

def get_app_version():
    return VersionModule().get_version_info()

def display_app_version():
    VersionModule().display_version()

def check_for_updates(latest_version):
    return VersionModule().check_and_notify_updates(latest_version)
""")
        print(f"Fichier de configuration créé: {config_file}")

    # Ajouter au package.json si c'est un projet Node.js
    package_json = os.path.join(project_path, 'package.json')
    if os.path.exists(package_json):
        with open(package_json, 'r', encoding='utf-8') as f:
            package_data = json.load(f)

        if 'scripts' not in package_data:
            package_data['scripts'] = {}

        package_data['scripts'].update({
            'version:show': 'python -c "from version_module import VersionModule; VersionModule().display_version()"',
            'version:check': 'python -c "from version_module import VersionModule; VersionModule().check_and_notify_updates(\'latest\')"',
            'version:increment': 'python -c "from version_manager import VersionManager; vm=VersionManager(); vm.increment_build(); print(vm.get_current_version())"'
        })

        with open(package_json, 'w', encoding='utf-8') as f:
            json.dump(package_data, f, indent=2)

        print(f"Scripts ajoutés au package.json")

    print("Intégration terminée avec succès!")
    return True

if __name__ == "__main__":
    if len(sys.argv) > 1:
        project_path = sys.argv[1]
    else:
        project_path = '.'

    integrate_into_project(project_path)