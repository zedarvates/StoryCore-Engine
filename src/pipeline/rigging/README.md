# Rigging Module

Ce module lit un JSON contenant les points clés d'un personnage, génère un squelette articulé (bones) compatible avec les moteurs 3D Unity/Unreal (format glTF) et exporte le fichier dans le répertoire `src/pipeline/rigging/`.

## Fonction publique
```python
rig_character(keypoints: dict) -> dict
```
- **Entrée** : dictionnaire contenant les points clés attendus (`head`, `neck`, `left_shoulder`, ...).
- **Sortie** : métadonnées du rig (`file_path`, `bone_count`, `hash`).

## Utilisation CLI
```bash
python -m src.pipeline.rigging <chemin_vers_keypoints_json>
```
Le CLI charge le JSON, lance le rigging et affiche les métadonnées au format JSON.

## Structure du squelette
Le squelette est basé sur une hiérarchie humanoïde simple :
- hips → spine → neck → head
- left_shoulder → left_arm → left_forearm → left_hand
- right_shoulder → right_arm → right_forearm → right_hand
- left_up_leg → left_leg → left_foot
- right_up_leg → right_leg → right_foot

## Logs
Les logs sont structurés au format JSON (`time`, `level`, `msg`).

## Gestion des erreurs
- Points clés manquants : `ValueError` avec un message d’erreur.
- Fichier JSON introuvable : `FileNotFoundError`.

## Tests
Les tests unitaires se trouvent dans `tests/pipeline/test_rigging.py` et couvrent les cas de succès et d’échec.
