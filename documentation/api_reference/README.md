# Documentation API - StoryCore

Ce dossier contient la documentation complète de l'API StoryCore. L'API RESTful permet d'intégrer StoryCore dans d'autres applications et d'automatiser les workflows de création de contenu.

## Structure

- [Aperçu API](OVERVIEW.md) - Introduction à l'API StoryCore
- [Endpoints](ENDPOINTS.md) - Référence complète des endpoints
- [Exemples](EXAMPLES.md) - Exemples d'utilisation pratique

## Démarrage Rapide

Pour commencer à utiliser l'API StoryCore :

1. **Authentification** : Obtenez un token d'authentification
2. **Configuration** : Configurez votre client HTTP
3. **Appels API** : Effectuez vos premières requêtes

### Exemple de Base

```python
import requests

# Configuration
BASE_URL = "https://api.storycore.io"
API_KEY = "votre_cle_api"

# En-têtes
headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Exemple de requête
response = requests.get(
    f"{BASE_URL}/api/projects",
    headers=headers
)

if response.status_code == 200:
    projects = response.json()
    print(f"Projects: {projects}")
```

## Authentification

StoryCore utilise JWT (JSON Web Tokens) pour l'authentification :

1. **Login** : Obtenez un token avec vos identifiants
2. **Refresh** : Rafraîchissez votre token avant expiration
3. **Logout** : Invalidez votre token

### Endpoints d'Authentification

```http
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
```

## Limites de Taux

L'API impose des limites de taux pour assurer une utilisation équitable :

- **Utilisateurs standard** : 100 requêtes par minute
- **Utilisateurs premium** : 1000 requêtes par minute
- **Utilisateurs entreprise** : 5000 requêtes par minute

## Gestion des Erreurs

L'API retourne des codes HTTP standards avec des messages d'erreur détaillés :

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Le champ 'email' est requis",
    "details": {
      "field": "email",
      "value": null
    }
  }
}
```

## Support

Pour obtenir de l'aide avec l'API :

- Consultez la [documentation complète](ENDPOINTS.md)
- Vérifiez les [exemples d'utilisation](EXAMPLES.md)
- Contactez le support API : api-support@storycore.io

---

*Pour plus d'informations sur l'installation et la configuration, consultez le [Guide de Démarrage Rapide](../QUICK_START_GUIDE.md).*