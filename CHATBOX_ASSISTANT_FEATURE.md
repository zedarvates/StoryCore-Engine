# Chatbox Assistant sur la Page d'Accueil - Documentation

## Vue d'ensemble

Une chatbox interactive a été ajoutée sur la page d'accueil de StoryCore Creative Studio, positionnée en dessous des boutons "Nouveau Projet" et "Ouvrir un Projet". Cette chatbox permet aux utilisateurs de :

1. **Communiquer avec un assistant IA** pour obtenir de l'aide
2. **Faire des demandes directement** sans passer par les menus
3. **Joindre des fichiers** (images, audio, documents)
4. **Enregistrer des annotations vocales** pour le dossier "sound"
5. **Préparer l'intégration** avec des logiciels externes

## Fonctionnalités Implémentées

### 1. Interface de Chat

- **Design moderne** : Interface sombre cohérente avec le thème de l'application
- **Messages utilisateur et assistant** : Distinction visuelle claire
- **Timestamps** : Horodatage de chaque message
- **Auto-scroll** : Défilement automatique vers les nouveaux messages
- **Indicateur en ligne** : Badge vert animé montrant que l'assistant est actif

### 2. Saisie de Messages

- **Zone de texte extensible** : S'adapte au contenu (1-3 lignes)
- **Raccourcis clavier** :
  - `Entrée` : Envoyer le message
  - `Shift + Entrée` : Nouvelle ligne
- **Placeholder personnalisable** : "Décrivez votre projet ou posez une question..."

### 3. Pièces Jointes

- **Bouton de pièce jointe** : Icône trombone pour joindre des fichiers
- **Types de fichiers acceptés** :
  - Audio : `audio/*` (pour les annotations sonores)
  - Images : `image/*`
  - Documents : `.pdf`, `.txt`, `.doc`, `.docx`
- **Aperçu des fichiers joints** : Liste des fichiers avant envoi
- **Suppression individuelle** : Possibilité de retirer un fichier avant envoi

### 4. Enregistrement Vocal

- **Bouton microphone** : Icône micro pour démarrer/arrêter l'enregistrement
- **Indicateur visuel** : Animation pulsante pendant l'enregistrement
- **Changement de couleur** : Rouge pendant l'enregistrement
- **Prêt pour intégration** : Structure en place pour l'enregistrement audio

### 5. Gestion des Messages

- **Historique des conversations** : Tous les messages sont conservés
- **Message de bienvenue** : L'assistant accueille l'utilisateur
- **Réponses simulées** : Réponse automatique pour démonstration
- **Gestion des erreurs** : Affichage des erreurs de manière élégante

## Structure des Fichiers

### Nouveau Composant

```
creative-studio-ui/src/components/launcher/LandingChatBox.tsx
```

**Responsabilités** :
- Affichage de l'interface de chat
- Gestion de l'état des messages
- Gestion des pièces jointes
- Gestion de l'enregistrement vocal
- Communication avec le parent via callbacks

### Fichiers Modifiés

1. **`creative-studio-ui/src/pages/LandingPage.tsx`**
   - Ajout du prop `children` pour accepter la chatbox
   - Ajout d'une section pour afficher la chatbox

2. **`creative-studio-ui/src/pages/LandingPageWithHooks.tsx`**
   - Intégration de la chatbox comme enfant de LandingPage
   - Configuration du callback `onSendMessage`

## Utilisation

### Pour l'Utilisateur

1. **Ouvrir l'application** : La chatbox apparaît automatiquement sur la page d'accueil
2. **Taper un message** : Cliquer dans la zone de texte et écrire
3. **Joindre des fichiers** :
   - Cliquer sur l'icône trombone
   - Sélectionner un ou plusieurs fichiers
   - Les fichiers apparaissent dans la zone d'aperçu
4. **Enregistrer un message vocal** :
   - Cliquer sur l'icône microphone
   - Parler (l'icône devient rouge et pulse)
   - Cliquer à nouveau pour arrêter
5. **Envoyer** : Cliquer sur le bouton d'envoi ou appuyer sur Entrée

### Pour le Développeur

```typescript
<LandingChatBox
  onSendMessage={(message, attachments) => {
    // Traiter le message
    console.log('Message:', message);
    
    // Traiter les fichiers joints
    if (attachments) {
      attachments.forEach(file => {
        console.log('Fichier:', file.name, file.type);
      });
    }
  }}
  placeholder="Votre texte personnalisé..."
/>
```

## Intégrations Futures

### 1. Assistant IA

**À implémenter** :
- Connexion à un service LLM (GPT, Claude, etc.)
- Traitement des demandes utilisateur
- Génération de réponses contextuelles
- Suggestions de projets basées sur la description

**Exemple de flux** :
```
Utilisateur: "Je veux créer une vidéo de 30 secondes sur un chat qui explore une ville futuriste"
Assistant: "Excellent ! Je vais vous aider à créer ce projet. Voici ce que je suggère :
- Durée : 30 secondes
- Personnage principal : Chat explorateur
- Environnement : Ville futuriste
- Style visuel : Cyberpunk/Sci-fi

Voulez-vous que je crée le projet avec ces paramètres ?"
```

### 2. Annotations Sonores (Dossier "sound")

**À implémenter** :
- Enregistrement audio via l'API Web Audio
- Sauvegarde dans le dossier `sound/`
- Nommage automatique avec timestamp
- Transcription automatique (optionnel)
- Association aux projets

**Structure proposée** :
```
sound/
  ├── annotations/
  │   ├── 2026-01-16_16-30-00_user-note.wav
  │   ├── 2026-01-16_16-35-12_project-idea.wav
  │   └── metadata.json
  └── transcriptions/
      ├── 2026-01-16_16-30-00_user-note.txt
      └── 2026-01-16_16-35-12_project-idea.txt
```

### 3. Intégration Logiciel Externe

**Possibilités** :
- **API REST** : Exposer une API pour recevoir des commandes
- **WebSocket** : Communication bidirectionnelle en temps réel
- **IPC Electron** : Communication avec des applications natives
- **Plugins** : Système de plugins pour étendre les fonctionnalités

**Exemple d'intégration** :
```typescript
// Dans LandingPageWithHooks.tsx
<LandingChatBox
  onSendMessage={async (message, attachments) => {
    // Envoyer à l'API externe
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, attachments })
    });
    
    const result = await response.json();
    // Traiter la réponse
  }}
/>
```

## API du Composant

### Props

```typescript
interface LandingChatBoxProps {
  onSendMessage?: (message: string, attachments?: File[]) => void;
  placeholder?: string;
}
```

### Types

```typescript
interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: string[];
}
```

## Personnalisation

### Modifier le Message de Bienvenue

Dans `LandingChatBox.tsx`, ligne ~30 :
```typescript
const [messages, setMessages] = useState<Message[]>([
  {
    id: '1',
    type: 'assistant',
    content: "Votre message personnalisé ici !",
    timestamp: new Date(),
  },
]);
```

### Modifier les Types de Fichiers Acceptés

Dans `LandingChatBox.tsx`, ligne ~150 :
```typescript
<input
  type="file"
  accept="audio/*,image/*,.pdf,.txt,.doc,.docx"
  // Ajouter d'autres types ici
/>
```

### Modifier la Hauteur de la Chatbox

Dans `LandingChatBox.tsx`, ligne ~90 :
```typescript
<div className="flex flex-col h-[400px] ...">
  // Changer h-[400px] à la hauteur désirée
</div>
```

## Prochaines Étapes

### Phase 1 : Enregistrement Audio (Priorité Haute)
- [ ] Implémenter l'API Web Audio pour l'enregistrement
- [ ] Créer le dossier `sound/` automatiquement
- [ ] Sauvegarder les enregistrements avec métadonnées
- [ ] Ajouter un lecteur audio pour réécouter

### Phase 2 : Assistant IA (Priorité Haute)
- [ ] Intégrer un service LLM (OpenAI, Anthropic, etc.)
- [ ] Créer un système de prompts pour l'assistant
- [ ] Implémenter la compréhension des intentions
- [ ] Ajouter des actions automatiques (créer projet, etc.)

### Phase 3 : Intégration Externe (Priorité Moyenne)
- [ ] Créer une API REST pour recevoir des commandes
- [ ] Documenter l'API pour les développeurs externes
- [ ] Créer des exemples d'intégration
- [ ] Ajouter un système de webhooks

### Phase 4 : Améliorations UX (Priorité Basse)
- [ ] Ajouter des suggestions de messages
- [ ] Implémenter la recherche dans l'historique
- [ ] Ajouter des raccourcis clavier avancés
- [ ] Thèmes personnalisables

## Tests

### Tests Manuels à Effectuer

1. **Envoi de message** :
   - ✓ Taper un message et envoyer
   - ✓ Vérifier l'affichage du message utilisateur
   - ✓ Vérifier la réponse de l'assistant

2. **Pièces jointes** :
   - ✓ Joindre un fichier audio
   - ✓ Joindre une image
   - ✓ Joindre plusieurs fichiers
   - ✓ Supprimer un fichier avant envoi

3. **Enregistrement vocal** :
   - ✓ Cliquer sur le bouton micro
   - ✓ Vérifier l'animation
   - ✓ Arrêter l'enregistrement

4. **Raccourcis clavier** :
   - ✓ Entrée pour envoyer
   - ✓ Shift+Entrée pour nouvelle ligne

5. **Responsive** :
   - ✓ Tester sur différentes tailles d'écran
   - ✓ Vérifier le scroll automatique

## Dépendances

### Packages Utilisés

- `lucide-react` : Icônes (Send, Mic, Paperclip, Sparkles, MessageSquare)
- `@/components/ui/button` : Composant bouton
- `@/components/ui/textarea` : Zone de texte

### Packages à Ajouter (Futur)

- `@anthropic-ai/sdk` ou `openai` : Pour l'assistant IA
- `wavesurfer.js` : Pour visualiser les formes d'onde audio
- `socket.io-client` : Pour la communication temps réel

## Notes Techniques

### Gestion de l'État

- État local avec `useState` pour les messages et l'input
- Refs pour le scroll automatique et l'input de fichiers
- Callbacks pour communiquer avec le parent

### Performance

- Auto-scroll optimisé avec `useEffect`
- Pas de re-render inutile grâce à la structure des états
- Gestion efficace des fichiers joints

### Sécurité

- Validation des types de fichiers côté client
- Limitation de la taille des fichiers (à implémenter)
- Sanitization des messages (à implémenter)

## Support

Pour toute question ou problème :
1. Consulter cette documentation
2. Vérifier les logs de la console
3. Contacter l'équipe de développement

---

**Date de création** : 16 janvier 2026  
**Version** : 1.0.0  
**Auteur** : Équipe StoryCore  
**Statut** : ✅ Implémenté (Base) - 🔄 En cours (Intégrations)
