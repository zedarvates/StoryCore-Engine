# Guide d'Intégration - Content Sensitivity Addon

Ce guide explique comment intégrer l'addon `content_sensitivity` avec les services existants de StoryCore.

## 1. Enregistrement de l'Addon

L'addon est automatiquement détecté par le système d'addons de StoryCore. Pour l'activer :

### Via le fichier de configuration principal :

```json
{
  "addons": {
    "enabled": ["content_sensitivity"],
    "config": {
      "content_sensitivity": {
        "perspective_api_key": "your_api_key_here",
        "sensitivity_threshold": "medium",
        "auto_censor": true,
        "pegi_enabled": true,
        "woke_gauge_enabled": true
      }
    }
  }
}
```

### Via l'interface utilisateur :
1. Aller dans Settings → Addons
2. Rechercher "Content Sensitivity"
3. Cliquer sur "Enable"
4. Configurer la clé API Perspective
5. Définir les seuils de sensibilité

## 2. Intégration avec les Hooks

L'addon peut s'intégrer avec les hooks système de StoryCore :

### Hook `content_filter` (avant génération)

```javascript
// Dans un autre addon ou service
hook_manager.register_hook(
  addon_name='content_sensitivity',
  hook_name='content_filter',
  callback=content_sensitivity.on_content_generated,
  priority=HookPriority.NORMAL
);

async def on_content_generated(content, **kwargs):
    # Analyse le contenu avant qu'il ne soit affiché
    result = await addon.analyzeContent(content)
    
    if result.level == 'high':
        # Bloquer ou modifier le contenu
        censored = await addon.applyCensorship(content, 'high')
        return censored.censoredContent
    
    return content
```

### Hook `security_check` (validation de sécurité)

```javascript
hook_manager.register_hook(
    addon_name='content_sensitivity',
    hook_name='security_check',
    callback=content_sensitivity.security_check,
    priority=HookPriority.HIGH
);

async def security_check(project_data):
    # Vérifier tout le projet pour du contenu sensible
    analysis = await addon.analyzeProject(project_data)
    
    if analysis.overall_score > 80:
        return {
            'passed': False,
            'reason': 'Content sensitivity score too high',
            'details': analysis
        }
    
    return {'passed': True}
```

## 3. Intégration avec l'API de Génération

### Utilisation dans un workflow de génération :

```javascript
const contentSensitivity = require('addons/content_sensitivity/src/main.js');

// Initialiser l'addon
await contentSensitivity.initialize({
    perspective_api_key: process.env.PERSPECTIVE_API_KEY,
    auto_censor: true,
    pegi_enabled: true
});

// Analyser le dialogue généré
const dialogue = "Le personnage principal dit quelque chose de potentiellement sensible...";
const analysis = await contentSensitivity.analyzeDialogue(dialogue);

console.log(`Score de sensibilité: ${analysis.score}`);
console.log(`Niveau PEGI: ${analysis.pegi_rating}`);
console.log(`Avertissements: ${analysis.content_warnings.join(', ')}`);

// Si le score est trop élevé, appliquer la censure
if (analysis.score >= 80) {
    const censored = await contentSensitivity.applyCensorship(
        { text: dialogue },
        'high'
    );
    console.log(`Contenu censuré: ${censored.censoredContent.text}`);
}
```

## 4. Intégration avec le Pipeline Vidéo

### Analyse de scénario avant rendu :

```javascript
// Dans le service de génération vidéo
async function generateVideoWithSensitivityCheck(scenario) {
    // 1. Analyser le scénario
    const sensitivityResult = await contentSensitivity.analyzeScenario(scenario);
    
    // 2. Vérifier le score PEGI
    if (sensitivityResult.pegi_rating === 'PEGI 18') {
        throw new Error('Scénario trop sensible pour le public cible');
    }
    
    // 3. Appliquer les modifications si nécessaire
    if (sensitivityResult.level === 'high') {
        const censoredScenario = await contentSensitivity.applyCensorship(
            scenario,
            'high'
        );
        scenario = censoredScenario.censoredContent;
    }
    
    // 4. Générer la vidéo avec le scénario modifié
    return videoGenerator.generate(scenario);
}
```

## 5. Intégration avec l'Analyse d'Images

### Vérification des vêtements des personnages :

```javascript
async function validateCharacterOutfits(characters, context) {
    const results = [];
    
    for (const character of characters) {
        if (character.outfit) {
            const analysis = await contentSensitivity.analyzeClothing(
                character.outfit,
                context
            );
            
            results.push({
                character: character.name,
                score: analysis.score,
                issues: analysis.flaggedItems,
                recommendations: analysis.recommendations
            });
        }
    }
    
    return results;
}
```

## 6. Intégration avec le Système de Rapports

### Ajout de métriques de sensibilité aux rapports :

```javascript
// Dans le service de génération de rapports
function generateSensitivityReport(project) {
    const analysis = contentSensitivity.analyzeProject(project);
    
    return {
        summary: {
            overall_score: analysis.overall_score,
            pegi_rating: analysis.pegi_rating,
            woke_score: analysis.woke_score,
            ethnic_balance_score: analysis.ethnic_balance_score
        },
        content_warnings: analysis.content_warnings,
        recommendations: analysis.recommendations,
        breakdown: {
            dialogue: analysis.dialogue.score,
            clothing: analysis.clothing.score,
            scenario: analysis.scenario.score,
            ethnic_representation: analysis.ethnic_representation.score
        }
    };
}
```

## 7. Configuration Avancée

### Fichier de configuration personnalisé :

```yaml
# config/content_sensitivity.yaml
sensitivity:
  thresholds:
    low: 30
    medium: 60
    high: 80

pegi_ratings:
  PEGI_3: 30
  PEGI_7: 60
  PEGI_12: 80
  PEGI_16: 90
  PEGI_18: 100

content_indicators:
  violence: { threshold: 20, weight: 1.5 }
  language: { threshold: 15, weight: 1.2 }
  discrimination: { threshold: 35, weight: 2.0 }

woke_gauge:
  enabled: true
  patterns:
    diversity: { weight: 10, category: 'positive' }
    inclusion: { weight: 10, category: 'positive' }
    traditional: { weight: -10, category: 'negative' }

ethnic_quotas:
  enabled: true
  target_percentages:
    white: 40
    black: 15
    hispanic: 15
    asian: 10
    native_american: 2
    multiracial: 5
    other: 7
  tolerance: 0.05  # ±5%

external_services:
  perspective_api:
    enabled: true
    api_key: ${PERSPECTIVE_API_KEY}
    confidence_threshold: 0.7
```

## 8. Webhooks et Notifications

### Configuration des alertes :

```javascript
// Dans la configuration de l'addon
{
  "alerts": {
    "enabled": true,
    "webhooks": [
      {
        "url": "https://your-monitoring-service.com/alerts",
        "events": ["high_sensitivity", "pegi_18", "quota_violation"],
        "threshold": 80
      }
    ],
    "email": {
      "enabled": false,
      "recipients": ["team@example.com"],
      "conditions": ["score > 90", "pegi_rating == 'PEGI 18'"]
    }
  }
}
```

## 9. API REST (si l'addon expose un endpoint)

L'addon peut être configuré pour exposer une API REST :

```javascript
// Dans main.js
class ContentSensitivityAPI {
    async POST /analyze {
        const { content, type } = req.body;
        const result = await addon.analyzeContent(content, type);
        res.json(result);
    }
    
    async POST /censor {
        const { content, level } = req.body;
        const result = await addon.applyCensorship(content, level);
        res.json(result);
    }
    
    async GET /pegi/:score {
        const rating = addon.pegiAnalyzer.getRating(req.params.score);
        res.json({ rating });
    }
}
```

## 10. Intégration avec la Base de Données

### Stockage des résultats d'analyse :

```javascript
// Modèle de données pour stocker les analyses
const sensitivityAnalysisSchema = {
    project_id: String,
    timestamp: Date,
    overall_score: Number,
    pegi_rating: String,
    woke_score: Number,
    ethnic_balance_score: Number,
    content_warnings: [String],
    details: {
        dialogue: Object,
        clothing: Object,
        scenario: Object,
        ethnic_representation: Object
    },
    recommendations: [String],
    censored: Boolean,
    censorship_applied: Object
};

// Enregistrement automatique après chaque analyse
async function saveAnalysis(projectId, analysis) {
    await db.collection('sensitivity_analyses').insertOne({
        project_id: projectId,
        ...analysis,
        created_at: new Date()
    });
}
```

## 11. Monitoring et Métriques

### Métriques Prometheus :

```javascript
const client = require('prom-client');

// Créer des métriques
const sensitivityScoreGauge = new client.Gauge({
    name: 'content_sensitivity_score',
    help: 'Current content sensitivity score',
    labelNames: ['project_id', 'type']
});

const pegiRatingCounter = new client.Counter({
    name: 'content_pegi_rating_total',
    help: 'Count of PEGI ratings assigned',
    labelNames: ['rating']
});

// Mettre à jour les métriques
function updateMetrics(analysis) {
    sensitivityScoreGauge.labels(
        analysis.project_id,
        'overall'
    ).set(analysis.overall_score);
    
    pegiRatingCounter.labels(analysis.pegi_rating).inc();
}
```

## 12. Tests d'Intégration

### Exemple de test d'intégration :

```javascript
describe('Content Sensitivity Integration', () => {
    it('should integrate with video generation pipeline', async () => {
        const scenario = {
            text: 'Test scenario with diverse characters',
            characters: [
                { name: 'Alice', origin: 'USA' },
                { name: 'Bob', origin: 'UK' }
            ]
        };
        
        const result = await contentSensitivity.analyzeScenario(scenario);
        
        expect(result.score).toBeLessThan(100);
        expect(result.recommendations).toBeInstanceOf(Array);
    });
    
    it('should work with existing validation services', async () => {
        const content = {
            dialogue: 'Sample dialogue',
            clothing: [{ name: 'shirt', origin: 'France' }],
            context: { origin: 'France' }
        };
        
        const validationResult = await validationService.validate(content);
        const sensitivityResult = await contentSensitivity.analyzeContent(content);
        
        expect(validationResult.valid).toBeDefined();
        expect(sensitivityResult.score).toBeGreaterThanOrEqual(0);
    });
});
```

## 13. Dépannage

### Problèmes courants :

1. **Erreur de connexion à Perspective API**
   - Vérifier la clé API dans la configuration
   - Tester la connexion avec `curl https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze`

2. **Scores incohérents**
   - Vérifier les seuils de configuration
   - S'assurer que les patterns regex sont corrects
   - Consulter les logs détaillés

3. **Performance lente**
   - Mettre en cache les résultats d'analyse
   - Utiliser le traitement par lots pour les projets volumineux
   - Ajuster les timeouts des services externes

## 14. Bonnes Pratiques

1. **Toujours analyser en amont** : Intégrer l'analyse au début du pipeline
2. **Configurer les seuils selon le public cible** : Adapter la sensibilité
3. **Réviser manuellement les cas limites** : Ne pas faire confiance à 100% à l'automatisation
4. **Logger toutes les analyses** : Pour audit et amélioration
5. **Mettre à jour régulièrement les patterns** : Évolution du langage et des normes sociales

## 15. Support et Contribution

Pour toute question ou contribution :
- Consulter la documentation principale dans `README.md`
- Ouvrir une issue sur le dépôt GitHub
- Contacter l'équipe StoryCore sur Discord