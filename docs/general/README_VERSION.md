# Système de Versionnement pour le Projet

## Description
Ce système permet de gérer les versions du projet avec un format JJ.MM.AA.BBB où :
- JJ = Jour
- MM = Mois  
- AA = Année (2 chiffres)
- BBB = Numéro de build (3 chiffres)

## Fichiers du Système
- `version.json` : Fichier de configuration contenant les informations de version
- `version_manager.py` : Classe principale pour gérer les versions
- `version_module.py` : Module d'accès à la version pour l'application
- `test_version_system.py` : Tests unitaires du système

## Utilisation

### Initialisation
```python
from version_manager import VersionManager
vm = VersionManager()
print(vm.get_current_version())  # Ex: 02.27.26.001
```

### Incrémentation du build
```python
vm.increment_build()  # Passe de 02.27.26.001 à 02.27.26.002
```

### Vérification des mises à jour
```python
from version_module import VersionModule
vm = VersionModule()
vm.check_and_notify_updates("02.27.26.003")  # Vérifie si une nouvelle version est disponible
```

### Affichage de la version
```python
vm.display_version()  # Affiche toutes les informations de version
```

## Intégration dans le Projet
1. Importer le module version :
```python
from version_module import VersionModule
```

2. Utiliser dans l'application :
```python
version_info = VersionModule().get_version_info()
print(f"Version: {version_info['version']}")
```

## Script d'utilisation
Le script `version_manager.py` peut être exécuté directement :
```bash
python version_manager.py
```

## Tests
Exécuter les tests unitaires :
```bash
python test_version_system.py
```

## Format de Version
- Version courante : `02.27.26.001`
- Date : 27 février 2026
- Build : 1
- Format : MM.JJ.AA.BBB

## Fonctionnalités
- Génération automatique de la version basée sur la date
- Incrémentation du numéro de build
- Vérification des mises à jour
- Notifications de nouvelles versions
- Stockage des informations dans un fichier JSON