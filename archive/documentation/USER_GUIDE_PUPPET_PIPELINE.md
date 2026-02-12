# Guide Utilisateur – Pipeline de Transformation d'Images en Marionnettes

## Table des matières
1. [Présentation du flux de travail](#présentation-du-flux-de-travail)
2. [Utilisation du bouton "Convertir en marionnette"](#utilisation-du-bouton-convertir-en-marionnette)
3. [Endpoints backend et paramètres attendus](#endpoints-backend-et-paramètres-attendus)
4. [Exemples de JSON d'entrée et de sortie](#exemples-de-json-dentrée-et-de-sortie)
5. [Gestion des erreurs et notifications UI](#gestion-des-erreurs-et-notifications-ui)
6. [Références aux fichiers de code pertinents](#références-aux-fichiers-de-code-pertinents)
7. [Guide de débogage et de test d'intégration](#guide-de-débogage-et-de-test-dintégration)

---

## Présentation du flux de travail
Le pipeline de transformation d'images en marionnettes se compose de quatre étapes principales :
1. **Import d'image / sheet** – L'utilisateur charge une image ou une feuille de sprites dans l'éditeur de séquence.
2. **Segmentation** – Le module `segmenter.py` analyse l'image et génère des masques de parties du corps.
3. **Rigging** – Le script `rigging.py` crée une structure d'os (squelette) à partir des masques et associe chaque partie à un contrôle.
4. **Export** – Le résultat final (JSON + textures) est envoyé au backend pour stockage ou téléchargement.

Chaque étape est déclenchée séquentiellement lorsqu'on clique sur le bouton **Convertir en marionnette**.

---

## Utilisation du bouton "Convertir en marionnette"
1. Ouvrez le **ShotEditor** dans l'interface séquence (`src/creative-studio-ui/src/sequence-editor/components/ShotEditor.tsx`).
2. Sélectionnez le **Shot** contenant l'image à transformer.
3. Cliquez sur le bouton **Convertir en marionnette** situé dans la barre d'outils du ShotEditor.
4. Un indicateur de progression apparaît pendant que le pipeline s'exécute.
5. À la fin, une fenêtre modale affiche le résultat ou les éventuelles erreurs.

> **Remarque** : Le bouton désactive automatiquement les actions de modification du Shot tant que le processus n'est pas terminé.

---

## Endpoints backend et paramètres attendus
| Méthode | URL | Description | Paramètres JSON attendus |
|---------|-----|-------------|--------------------------|
| `POST` | `/api/v1/rigging/convert` | Lance le pipeline de conversion. | `image_id` (string) – identifiant de l'image importée.<br>`sheet_id` (optional, string) – identifiant de la feuille de sprites.<br>`settings` (object) – options de segmentation/rigging (ex. `threshold`, `smooth`). |
| `GET` | `/api/v1/rigging/status/{job_id}` | Récupère le statut du job en cours. | Aucun. |
| `GET` | `/api/v1/rigging/result/{job_id}` | Télécharge le JSON de résultat et les assets. | Aucun. |

Le serveur répond avec un objet contenant :
```json
{
  "job_id": "abc123",
  "status": "queued|processing|completed|failed",
  "progress": 0-100,
  "error": null
}
```

---

## Exemples de JSON d'entrée et de sortie
### Entrée (POST `/api/v1/rigging/convert`)
```json
{
  "image_id": "img_20260210_001",
  "sheet_id": "sheet_01",
  "settings": {
    "threshold": 0.45,
    "smooth": true,
    "max_segments": 12
  }
}
```

### Sortie (GET `/api/v1/rigging/result/{job_id}`)
```json
{
  "skeleton": {
    "bones": [
      {"name": "head", "parent": null, "position": [0, 1, 0]},
      {"name": "neck", "parent": "head", "position": [0, 0.8, 0]},
      {"name": "spine", "parent": "neck", "position": [0, 0.5, 0]}
      // ... autres os
    ]
  },
  "textures": {
    "diffuse": "textures/diffuse.png",
    "mask": "textures/mask.png"
  },
  "metadata": {
    "created_at": "2026-02-10T20:15:00Z",
    "source_image": "img_20260210_001"
  }
}
```

---

## Gestion des erreurs et notifications UI
| Code d'erreur | Situation | Message UI affiché |
|---------------|-----------|----------------------|
| `400` | Paramètres manquants ou mal formatés | "Les paramètres fournis sont invalides. Veuillez vérifier le formulaire."
| `404` | `image_id` ou `sheet_id` introuvable | "L'image ou la feuille spécifiée n'existe pas."
| `500` | Erreur interne du serveur (ex. segmentation échouée) | "Une erreur inattendue s'est produite. Veuillez réessayer ou contacter le support."
| `429` | Trop de requêtes simultanées | "Le serveur est surchargé. Veuillez patienter quelques secondes."

Le frontend écoute les réponses HTTP et déclenche des toasts : succès (vert), avertissement (orange), erreur (rouge).

---

## Références aux fichiers de code pertinents
- [`segmenter.py`](src/pipeline/segmenter.py)
- [`rigging.py`](src/pipeline/rigging/rigging.py)
- [`rigging_api.py`](backend/rigging_api.py)
- [`ShotEditor.tsx`](src/creative-studio-ui/src/sequence-editor/components/ShotEditor.tsx)

Ces fichiers contiennent les implémentations suivantes :
- **segmenter.py** : fonction `segment_image(image_path, settings)`.
- **rigging.py** : classe `RiggingEngine` avec méthode `apply_rig(image_mask, settings)`.
- **rigging_api.py** : route FastAPI `POST /api/v1/rigging/convert` et logique de suivi de job.
- **ShotEditor.tsx** : composant React qui déclenche l'appel API et gère l'affichage des notifications.

---

## Guide de débogage et de test d'intégration
1. **Vérifier les logs du backend** – Les logs sont écrits dans `backend/logs/rigging.log`. Recherchez les lignes contenant `ERROR` ou `TRACE`.
2. **Utiliser les tests unitaires** – Exécutez `pytest tests/pipeline/test_rigging.py` pour valider chaque étape.
3. **Tester l'API manuellement** – Utilisez `curl` ou Postman :
   ```bash
   curl -X POST http://localhost:8000/api/v1/rigging/convert \
        -H "Content-Type: application/json" \
        -d '{"image_id":"img_test","settings":{"threshold":0.5}}'
   ```
4. **Déboguer le frontend** – Ouvrez les DevTools du navigateur, surveillez les requêtes XHR vers `/api/v1/rigging/*` et vérifiez les réponses.
5. **Scénario de test d'intégration** – Un script d'automatisation (`scripts/integration_test_rigging.sh`) effectue les étapes :
   - Upload d'une image via l'API `POST /api/v1/storage/upload`.
   - Appel du endpoint de conversion.
   - Attente du statut `completed`.
   - Téléchargement du résultat et comparaison avec un JSON attendu.

En cas d'échec, consultez le **rapport de test** généré dans `reports/COMFYUI_INTEGRATION_SUMMARY.md`.

---

*Ce document doit être maintenu à jour à chaque évolution du pipeline.*
