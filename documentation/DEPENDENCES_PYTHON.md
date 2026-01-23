# Documentation des Dépendances Python

Ce document détaille les dépendances requises pour le projet StoryCore-Engine après la migration vers Python. Il inclut les dépendances principales, les dépendances de développement, et les dépendances optionnelles.

---

## Table des Matières

1. [Dépendances Principales](#dépendances-principales)
2. [Dépendances de Développement](#dépendances-de-développement)
3. [Dépendances Optionnelles](#dépendances-optionnelles)
4. [Gestion des Dépendances](#gestion-des-dépendances)
5. [Compatibilité](#compatibilité)

---

## Dépendances Principales

Les dépendances principales sont nécessaires pour exécuter le projet en production. Elles sont listées dans le fichier [`requirements.txt`](requirements.txt).

### Liste des Dépendances Principales

| Dépendance | Version | Description |
|------------|---------|-------------|
| `Pillow` | `>=10.4.0` | Bibliothèque de traitement d'images |
| `scipy` | `>=1.11.0` | Bibliothèque scientifique pour Python |
| `opencv-python` | `>=4.8.0` | Bibliothèque de vision par ordinateur |
| `numpy` | `>=1.24.0` | Bibliothèque de calcul numérique |
| `aiohttp` | `>=3.10.0` | Bibliothèque pour les requêtes HTTP asynchrones |
| `websockets` | `>=13.0.0` | Bibliothèque pour les WebSockets |
| `cryptography` | `>=43.0.0` | Bibliothèque pour le chiffrement et la sécurité |
| `certifi` | `>=2024.8.30` | Certificats SSL pour les requêtes HTTPS |
| `fastapi` | `>=0.100.0` | Framework pour la création d'API web |
| `uvicorn[standard]` | `>=0.23.0` | Serveur ASGI pour FastAPI |
| `pydantic-settings` | `>=2.0.0` | Gestion des paramètres de configuration |
| `python-jose[cryptography]` | `>=3.3.0` | Bibliothèque pour la gestion des jetons JWT |
| `passlib[bcrypt]` | `>=1.7.4` | Bibliothèque pour le hachage des mots de passe |
| `fastapi-limiter` | `>=0.1.5` | Bibliothèque pour la limitation de taux dans FastAPI |
| `redis` | `>=4.5.0` | Base de données clé-valeur pour la gestion des sessions |
| `panda3d` | `>=1.10.10` | Moteur de rendu 3D |
| `PyOpenGL` | `>=3.1.6` | Bibliothèque pour le rendu OpenGL |

---

## Dépendances de Développement

Les dépendances de développement sont utilisées pour le développement, les tests et la construction du projet. Elles sont listées dans le fichier [`pyproject.toml`](pyproject.toml:57).

### Liste des Dépendances de Développement

| Dépendance | Version | Description |
|------------|---------|-------------|
| `pytest` | `>=8.0.0` | Framework de test |
| `hypothesis` | `>=6.100.0` | Bibliothèque pour les tests basés sur les propriétés |
| `pytest-cov` | `>=4.1.0` | Plugin pour la couverture de code |
| `pytest-asyncio` | `>=0.23.0` | Support pour les tests asynchrones |
| `pytest-mock` | `>=3.12.0` | Plugin pour les mocks dans les tests |
| `black` | `>=23.0.0` | Formateur de code |
| `flake8` | `>=6.0.0` | Outil de linting pour Python |
| `mypy` | `>=1.0.0` | Vérificateur de types statique |

---

## Dépendances Optionnelles

Les dépendances optionnelles sont utilisées pour des fonctionnalités spécifiques et ne sont pas requises pour le fonctionnement de base du projet.

### Liste des Dépendances Optionnelles

| Dépendance | Version | Description |
|------------|---------|-------------|
| `PyYAML` | `>=6.0.0` | Bibliothèque pour la gestion des fichiers YAML |
| `matplotlib` | `>=3.5.0` | Bibliothèque pour la visualisation de données |
| `watchdog` | `>=3.0.0` | Bibliothèque pour la surveillance des fichiers |

---

## Gestion des Dépendances

### Installation des Dépendances

Pour installer les dépendances principales, exécutez la commande suivante :

```bash
pip install -r requirements.txt
```

Pour installer les dépendances de développement, exécutez la commande suivante :

```bash
pip install -e ".[dev]"
```

### Mise à Jour des Dépendances

Pour mettre à jour les dépendances, utilisez la commande suivante :

```bash
pip install --upgrade -r requirements.txt
```

---

## Compatibilité

### Versions de Python Supportées

Le projet StoryCore-Engine est compatible avec les versions suivantes de Python :

- Python 3.8
- Python 3.9
- Python 3.10
- Python 3.11
- Python 3.12

### Systèmes d'Exploitation Supportés

Le projet est compatible avec les systèmes d'exploitation suivants :

- Windows 10/11
- macOS (dernières versions)
- Linux (distributions récentes)

---

## Conclusion

Ce document fournit une vue d'ensemble des dépendances requises pour le projet StoryCore-Engine. Pour plus d'informations, consultez les fichiers [`requirements.txt`](requirements.txt) et [`pyproject.toml`](pyproject.toml:57).
