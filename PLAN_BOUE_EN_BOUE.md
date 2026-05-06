# Plan de Séquence Éditeur Amélioré

## Objectifs

1. Améliorer l'éditeur de séquences avec génération LLM et optimisation par rapport à l'histoire
2. Permettre des modifications rapides des prompts
3. Développer une fenêtre compacte pour l'édition du plan séquence
4. Optimiser l'affichage des shots (frames) dans la mini-vue
5. Aligner la timeline avec l'interface CapCut

## Fonctionnalités à Implémenter

- [x] Rendre fonctionnels les boutons de génération et d'annulation
- [x] Créer une fenêtre compacte pour l'édition du plan séquence
- [x] Ajouter un contrôleur de shots (frames) dans la mini-vue (Slider de durée)
- [x] Intégrer une timeline visuelle compacte (mini-timeline)
- [x] Sauvegarder le plan dans un fichier .MD

## Étapes Techniques

1. Modifier VideoGenerationPanel.tsx pour activer les boutons
2. Développer une composante compacte pour le plan séquence
3. Ajouter un slider ou input pour ajuster les shots
4. Créer une timeline visuelle avec keyframes
5. Implémenter l'exportation en .MD

## Dépendances

- Backend API pour la génération vidéo
- Composants UI existants (VideoGenerationPanel)
- Stockage de données (sequenceStorage.ts)