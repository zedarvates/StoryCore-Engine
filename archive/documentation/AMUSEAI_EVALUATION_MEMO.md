# Mémo d'Évaluation : AmuseAI comme Alternative à ComfyUI pour StoryCore

**Date d'évaluation :** 21 janvier 2026

## Résumé de l'analyse

AmuseAI est une solution développée en C#, optimisée pour les GPU AMD, avec des licences payantes d'environ 200 $/an.

## Comparaison rapide avec ComfyUI

ComfyUI est une plateforme open-source basée sur Python, gratuite et offrant une compatibilité large avec différents types de hardware. AmuseAI, en revanche, est une solution propriétaire en C# avec une optimisation spécifique aux GPU AMD et nécessite une licence payante.

## Raisons de rejet

- **Coûts excessifs** : Licence annuelle d'environ 200 $, ajoutant une charge financière significative sans retour sur investissement clair.
- **Compatibilité faible avec la stack actuelle** : Développé en C#, incompatible avec la stack Python/FastAPI du projet, nécessitant une refactorisation majeure.
- **Avantages marginaux** : Performances optimisées uniquement sur hardware AMD spécifique, non bénéfique pour la majorité des utilisateurs utilisant d'autres GPU.
- **Maturité incertaine** : Écosystème moins établi que ComfyUI, avec des risques de stabilité et de support à long terme.

## Conclusion

AmuseAI ne convient pas au projet StoryCore pour le moment et n'est pas envisagé dans un avenir futur en raison des incompatibilités techniques, des coûts élevés et des avantages limités.

## Recommandation

Maintenir ComfyUI comme solution optimale pour les besoins de génération d'images et de vidéos, en raison de sa gratuité, de sa flexibilité et de sa compatibilité avec la stack existante.