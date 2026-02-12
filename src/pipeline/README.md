# Segmenter Module

Le module **segmenter** fournit la fonctionnalité de segmentation d'images de personnages pour le pipeline de transformation de sheets en marionnettes.

## Fonction publique
```python
segment_character(image_path: str) -> dict
```
- **Paramètre** `image_path` : chemin vers un fichier image (`.jpg`/`.png`) ou un fichier JSON contenant la clé `image_path`.
- **Retour** un dictionnaire contenant les points clés détectés et les contours segmentés.

Le résultat est également sauvegardé dans `src/pipeline/segmentations/` sous un nom de fichier basé sur le hash SHA‑256 de l'image.

## Utilisation en ligne de commande
```bash
python -m src.pipeline.segmenter <image_path>
```
Le CLI lit le même paramètre que la fonction publique, affiche le JSON de résultat et enregistre le fichier.

## Journalisation
Le module utilise un logger structuré au niveau `INFO` qui émet des messages au format JSON contenant le timestamp, le niveau et le message.

## Gestion des erreurs
- **Fichier introuvable** : lève `FileNotFoundError` et journalise une erreur.
- **Modèle non chargé** : lève `RuntimeError` si ni MediaPipe ni OpenPose ne sont disponibles.
- **JSON sheet invalide** : lève `ValueError` si la clé `image_path` manque.

## Dépendances
- `opencv-python` (`cv2`) pour le chargement d'image.
- `mediapipe` **ou** `openpose` pour la détection de pose.

Assurez‑vous que ces bibliothèques sont installées dans votre environnement.
