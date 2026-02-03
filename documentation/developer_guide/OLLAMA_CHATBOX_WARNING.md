# Message d'Avertissement Ollama dans les ChatBox

## Vue d'ensemble

Les composants ChatBox affichent maintenant un message d'avertissement si Ollama n'est pas détecté, invitant l'utilisateur à l'installer ou le démarrer.

## Composants Modifiés

### 1. ChatBox.tsx (Éditeur Principal)
**Fichier**: `creative-studio-ui/src/components/ChatBox.tsx`

**Modifications**:
- ✅ Import de `checkOllamaStatus` depuis `@/services/ollamaConfig`
- ✅ Import des icônes `AlertCircle` et `Download` de lucide-react
- ✅ Ajout d'un état `isOllamaAvailable` (boolean | null)
- ✅ Vérification du statut Ollama au montage du composant
- ✅ Affichage d'une bannière d'avertissement si Ollama n'est pas disponible

**Bannière d'avertissement**:
```tsx
{isOllamaAvailable === false && (
  <div className="rounded-lg border-2 border-orange-200 bg-orange-50 p-4">
    <div className="flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-orange-600" />
      <div>
        <h3>Ollama n'est pas détecté</h3>
        <p>L'assistant AI nécessite Ollama...</p>
        <a href="https://ollama.com/download/windows">
          Télécharger Ollama
        </a>
        <button onClick={checkAgain}>
          Vérifier à nouveau
        </button>
      </div>
    </div>
  </div>
)}
```

### 2. LandingChatBox.tsx (Page d'Accueil)
**Fichier**: `creative-studio-ui/src/components/launcher/LandingChatBox.tsx`

**Modifications**:
- ✅ Import de `checkOllamaStatus` depuis `@/services/ollamaConfig`
- ✅ Import des icônes `AlertCircle` et `Download` de lucide-react
- ✅ Ajout d'un état `isOllamaAvailable` (boolean | null)
- ✅ Vérification du statut Ollama au montage du composant
- ✅ Affichage d'une bannière d'avertissement compacte (thème sombre)

**Bannière d'avertissement** (version compacte pour thème sombre):
```tsx
{isOllamaAvailable === false && (
  <div className="rounded-lg border-2 border-orange-500/50 bg-orange-900/20 p-3">
    <div className="flex items-start gap-2">
      <AlertCircle className="w-4 h-4 text-orange-400" />
      <div>
        <h4>Ollama n'est pas détecté</h4>
        <p>L'assistant AI nécessite Ollama...</p>
        <a href="https://ollama.com/download/windows">
          Télécharger
        </a>
        <button onClick={checkAgain}>
          Vérifier
        </button>
      </div>
    </div>
  </div>
)}
```

## Fonctionnalités de la Bannière

### 1. Détection Automatique
- ✅ Vérification au montage du composant
- ✅ État initial: `null` (en cours de vérification)
- ✅ État après vérification: `true` (disponible) ou `false` (non disponible)
- ✅ Bannière affichée uniquement si `false`

### 2. Lien de Téléchargement
- ✅ Lien direct vers: `https://ollama.com/download/windows`
- ✅ Ouvre dans un nouvel onglet (`target="_blank"`)
- ✅ Sécurisé avec `rel="noopener noreferrer"`
- ✅ Icône de téléchargement pour clarté visuelle

### 3. Bouton de Vérification
- ✅ Permet de re-vérifier le statut après installation
- ✅ Met à jour l'état `isOllamaAvailable`
- ✅ Masque la bannière si Ollama est maintenant disponible
- ✅ Ajoute un message de confirmation dans le chat

### 4. Message de Confirmation
Quand Ollama est détecté après vérification:
```
✅ Ollama est maintenant connecté! Je suis prêt à vous aider.
```

## Styles Visuels

### ChatBox (Éditeur - Thème Clair)
- **Bordure**: Orange 200 (2px)
- **Fond**: Orange 50
- **Texte**: Orange 800/900
- **Icône**: Orange 600
- **Bouton principal**: Orange 600 (hover: 700)
- **Bouton secondaire**: Blanc avec bordure orange

### LandingChatBox (Accueil - Thème Sombre)
- **Bordure**: Orange 500/50 (2px)
- **Fond**: Orange 900/20
- **Texte**: Orange 200/300
- **Icône**: Orange 400
- **Bouton principal**: Orange 600 (hover: 700)
- **Bouton secondaire**: Gray 700 (hover: 600)

## Flux Utilisateur

### Scénario 1: Ollama Non Installé
```
1. Utilisateur ouvre l'application
   ↓
2. ChatBox vérifie le statut Ollama
   ↓
3. Ollama non détecté (port 11434 inaccessible)
   ↓
4. Bannière d'avertissement s'affiche
   ↓
5. Utilisateur clique "Télécharger Ollama"
   ↓
6. Navigateur ouvre ollama.com/download/windows
   ↓
7. Utilisateur télécharge et installe Ollama
   ↓
8. Utilisateur clique "Vérifier à nouveau"
   ↓
9. Ollama détecté ✅
   ↓
10. Bannière disparaît
    ↓
11. Message de confirmation dans le chat
```

### Scénario 2: Ollama Installé mais Non Démarré
```
1. Utilisateur ouvre l'application
   ↓
2. ChatBox vérifie le statut Ollama
   ↓
3. Ollama non détecté
   ↓
4. Bannière d'avertissement s'affiche
   ↓
5. Utilisateur démarre Ollama manuellement
   ↓
6. Utilisateur clique "Vérifier à nouveau"
   ↓
7. Ollama détecté ✅
   ↓
8. Bannière disparaît
```

### Scénario 3: Ollama Déjà Disponible
```
1. Utilisateur ouvre l'application
   ↓
2. ChatBox vérifie le statut Ollama
   ↓
3. Ollama détecté ✅
   ↓
4. Aucune bannière affichée
   ↓
5. Chat fonctionne normalement
```

## Messages Affichés

### Français (Par Défaut)
```
Titre: "Ollama n'est pas détecté"

Message: "L'assistant AI nécessite Ollama pour fonctionner. 
Veuillez installer ou démarrer Ollama pour utiliser les 
fonctionnalités d'intelligence artificielle."

Boutons:
- "Télécharger Ollama"
- "Vérifier à nouveau"

Astuce: "💡 Après installation, lancez Ollama et cliquez 
sur 'Vérifier à nouveau'"
```

### Anglais (À Implémenter)
```
Title: "Ollama not detected"

Message: "The AI assistant requires Ollama to function. 
Please install or start Ollama to use artificial 
intelligence features."

Buttons:
- "Download Ollama"
- "Check Again"

Tip: "💡 After installation, launch Ollama and click 
'Check Again'"
```

## Tests à Effectuer

### Test 1: Ollama Non Installé
```bash
# Assurez-vous qu'Ollama n'est pas installé
# Démarrez l'application
npm run electron:start

# Vérifications:
✅ Bannière d'avertissement visible dans ChatBox
✅ Bannière d'avertissement visible dans LandingChatBox
✅ Lien "Télécharger" fonctionne
✅ Bouton "Vérifier" fonctionne
```

### Test 2: Ollama Installé et Démarré
```bash
# Démarrez Ollama
ollama serve

# Démarrez l'application
npm run electron:start

# Vérifications:
✅ Aucune bannière affichée
✅ Chat fonctionne normalement
✅ Pas d'erreurs dans la console
```

### Test 3: Installation Pendant l'Utilisation
```bash
# Démarrez l'application sans Ollama
npm run electron:start

# Vérifications:
✅ Bannière visible
# Installez et démarrez Ollama
# Cliquez "Vérifier à nouveau"
✅ Bannière disparaît
✅ Message de confirmation affiché
```

### Test 4: Ollama Arrêté Pendant l'Utilisation
```bash
# Démarrez l'application avec Ollama
npm run electron:start

# Arrêtez Ollama
# Essayez d'utiliser le chat

# Vérifications:
✅ Erreur de connexion gérée
✅ Message d'erreur approprié
# Redémarrez Ollama
# Cliquez "Vérifier à nouveau"
✅ Fonctionne à nouveau
```

## Améliorations Futures (Optionnel)

### 1. Détection en Temps Réel
- [ ] Vérifier périodiquement le statut Ollama (toutes les 30s)
- [ ] Afficher/masquer la bannière automatiquement
- [ ] Notification quand Ollama devient disponible

### 2. Instructions d'Installation
- [ ] Guide pas à pas pour installer Ollama
- [ ] Détection automatique de l'OS (Windows/Mac/Linux)
- [ ] Liens spécifiques par plateforme

### 3. Diagnostic Avancé
- [ ] Vérifier si le port 11434 est utilisé par autre chose
- [ ] Suggérer de changer le port si conflit
- [ ] Afficher les logs d'erreur détaillés

### 4. Mode Dégradé
- [ ] Permettre l'utilisation sans Ollama (fonctionnalités limitées)
- [ ] Proposer des alternatives (OpenAI, Anthropic)
- [ ] Mode démo avec réponses pré-enregistrées

## Notes Techniques

### Vérification du Statut
```typescript
// Fonction utilisée pour vérifier Ollama
async function checkOllamaStatus(
  endpoint: string = 'http://localhost:11434'
): Promise<boolean> {
  try {
    const response = await fetch(`${endpoint}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
```

### Gestion de l'État
```typescript
// État dans le composant
const [isOllamaAvailable, setIsOllamaAvailable] = useState<boolean | null>(null);

// null = en cours de vérification
// true = disponible
// false = non disponible
```

### Performance
- ✅ Vérification unique au montage (pas de polling)
- ✅ Timeout de 5 secondes pour éviter le blocage
- ✅ Pas d'impact sur les performances si Ollama est disponible

## Résumé

✅ **Composants modifiés**: 2 (ChatBox.tsx, LandingChatBox.tsx)  
✅ **Nouvelles dépendances**: Aucune (utilise les fonctions existantes)  
✅ **Impact UI**: Bannière d'avertissement non intrusive  
✅ **Expérience utilisateur**: Guide clair pour installer Ollama  
✅ **Tests**: Prêt pour validation  

L'utilisateur est maintenant guidé pour installer Ollama s'il n'est pas détecté! 🎉
