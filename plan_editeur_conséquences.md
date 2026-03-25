# Plan d'amélioration de l'éditeur de conséquences avec génération M&M et optimisation story

## 1. Contexte et constats actuels
- **Interface existante** : fenêtre compacte avec boutons non fonctionnels
- **Limitation principale** : 
  - Affichage forcé de 6 shots, parfois non alignés avec le plan séquence
  - Absence d'options d'accordage / de personnalisation
  - Manque d'intégration avec génération automatique (M&M)

## 2. Objectifs de développement
1. Rendre fonctionnels les boutons de la fenêtre compacte  
2. Permettre une modification rapide et intuitive des shots  3. Intégrer une génération assistée par M&M (Montage & Musique)  4. Optimiser l'alignement des shots avec le récit / l'histoire  
5. Offrir des options d'accordage (ex : durée, transition, style musical)

## 3. Architecture proposée

### 3.1. Fenêtre compacte enrichie
- **Vue miniature** du shot sélectionné (miniature + métadonnées)
- **Curseurs** pour ajuster durée, vitesse, etc.
- **Boutons d'action** :
  - *Réorganiser* (drag‑and‑drop)
  - *Dupliquer* / *Supprimer*
  - *Générer avec M&M* (déclenche l'IA)
  - *Accorder* (ouvrir un sous‑menu d'options)

### 3.2. Génération M&M- **Appel à l'API** `ai_story_generation_service` ou `ai_video_service` pour :
  - Analyse sémantique du shot
  - Proposition de musique / effet sonore
  - Suggestion de transition adaptée
- **Paramètres de contrôle** :
  - Niveau d'automatisation (manuel / assisté / automatique)
  - Style musical (bibliothèque interne ou custom)
  - Intensité de la transition (douce, dynamique, cinématique)

### 3.3. Optimisation story‑driven
- **Métriques de cohérence** : score d'alignement avec le récit (ex : via `ai_story_generation_service`)
- **Ajustement dynamique** : proposer de raccourcir / allonger un shot selon le score
- **Plan séquence** : permettre de définir des « points d'accroche » où la séquence doit respecter un certain nombre de shots

## 4. Étapes de mise en œuvre (todo list)

- [ ] **Analyser** le composant `creative-studio-ui/src/components/VideoGenerationPanel.tsx` pour identifier les boutons existants et leurs limites
- [ ] **Concevoir** le design de la fenêtre compacte (UX/UI) – maquettes rapides
- [ ] **Implémenter** les handlers d'événement pour chaque bouton (réorganisation, duplication, suppression)
- [ ] **Développer** le sous‑menu d'accordage (durée, transition, style musical)
- [ ] **Intégrer** l’appel à l'API M&M (génération musicale / transition) via `ai_story_generation_service`
- [ ] **Créer** un système de scoring d'alignement story (utiliser `ai_story_generation_service` ou `llm_api`)
- [ ] **Tester** avec différents plans séquences (6 shots, variations, désaccords)
- [ ] **Optimiser** l'interface pour une prise en main rapide (drag‑and‑drop, raccourcis clavier)
- [ ] **Documenter** les nouvelles fonctionnalités (README, commentaires code)
- [ ] **Déployer** la version mise à jour et recueillir le feedback

## 5. Technologies & points d'extension
- **React / TypeScript** (frontend du panel)
- **M&M Service** : `ai_story_generation_service` / `ai_video_service`
- **State Management** : store les métadonnées des shots (durée, transition, musique)
- **Persistances** : sauvegarder les configurations d'accordage dans `backend/database.py`

## 6. Prochaines actions immédiates
1. Ouvrir `creative-studio-ui/src/components/VideoGenerationPanel.tsx` et relever les balises des boutons actuels  
2. Esquisser (sur papier ou dans un fichier) le nouveau layout de la fenêtre compacte  
3. Définir le contrat d'API entre le frontend et le service M&M (paramètres, réponses attendues)