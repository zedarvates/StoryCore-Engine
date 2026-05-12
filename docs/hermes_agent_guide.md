# 🤖 Guide de l'Agent Hermès AI

## Présentation

L'agent **Hermès** est le cerveau créatif de StoryCore. Contrairement à une simple interface de chat, Hermès est capable de raisonner via un cycle **ReAct** (Reason + Act), d'analyser le contexte du projet et de déclencher des actions réelles dans l'interface de production.

## Architecture

Le système Hermès repose sur quatre piliers :

1. **AddonVoiceCommandRouter** : Capture les transcriptions vocales et identifie l'intention Hermès.
2. **HermesVoiceController** : Gère la communication avec le backend LLM et exécute les actions UI retournées.
3. **HermesNovelistService** : API de gestion des projets narratifs (chapitres, visualisation, clips).
4. **Backend FastAPI** : Héberge la logique de raisonnement et l'intégration avec le World Bible.

## Cycle de Raisonnement (ReAct)

Lorsqu'une commande est reçue, l'agent suit ce processus :

- **Pensée (Thought)** : Analyse de la commande par rapport à l'état actuel du projet.
- **Action** : Sélection d'un outil ou d'une fonction (ex : `open-wizard`, `generate-clips`).
- **Observation** : Analyse du résultat de l'action.
- **Réponse finale** : Feedback vocal à l'utilisateur.

## Commandes Vocales Supportées

- *"Hermès, aide-moi à visualiser ce chapitre"*
- *"Génère les clips pour la scène 2"*
- *"Vérifie la cohérence avec le World Bible"*
- *"Ouvre l'assistant de création de personnage"*

## Intégration Technique

Les développeurs peuvent étendre Hermès en ajoutant des gestionnaires d'événements dans `HermesVoiceController.ts`. Chaque action retournée par le backend est émise via l'émetteur d'événements global de l'application.

```typescript
// Exemple de réception d'une action Hermès
eventEmitter.on('addon:hermes:action', (payload) => {
  // Logique personnalisée
});
```
