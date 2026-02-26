---
name: url-shortener
description: "Raccourcir des URLs via is.gd ou v.gd. Use when: l'utilisateur demande de raccourcir une URL, créer un lien court, ou simplifier une URL longue. NOT for: URLs nécessitant une authentification, liens personnalisés avec domaine propre, analytics avancés."
metadata:
  openclaw:
    emoji: "🔗"
    requires:
      bins: ["curl", "python3"]
---

# URL Shortener Skill

Raccourcir des URLs rapidement via des services gratuits.

## Quand l'utiliser

✅ **USE ce skill quand:**
- "Raccourcis cette URL"
- "Crée un lien court pour..."
- "Simplifie ce lien"
- L'utilisateur fournit une URL longue à raccourcir

❌ **N'utilisez PAS ce skill pour:**
- URLs nécessitant une authentification
- Liens personnalisés avec domaine propre
- Analytics avancés des clics
- URLs internes/privées

## Services disponibles

### is.gd (recommandé)

Service gratuit, fiable et sans publicité.

```bash
# Raccourcir une URL simple
curl -s "https://is.gd/create.php?format=simple&url=https://example.com/very/long/url"

# Avec URL encodée (recommandé pour les URLs complexes)
curl -s "https://is.gd/create.php?format=simple&url=$(python3 -c 'import urllib.parse; print(urllib.parse.quote("https://example.com/long url with spaces"))')"
```

### v.gd (alternative)

Même service que is.gd avec un domaine différent.

```bash
curl -s "https://v.gd/create.php?format=simple&url=https://example.com"
```

## Utilisation du script Python

Pour une utilisation plus robuste avec gestion d'erreurs:

```bash
python3 {baseDir}/shorten.py "https://example.com/very/long/url/to/shorten"
```

Le script gère automatiquement:
- L'encodage de l'URL
- Les erreurs réseau
- Le fallback entre services

## Exemples d'utilisation

### Exemple 1: URL simple

**Demande:** "Raccourcis https://github.com/openclaw/openclaw"

**Commande:**
```bash
curl -s "https://is.gd/create.php?format=simple&url=https://github.com/openclaw/openclaw"
```

**Réponse:** `https://is.gd/openclaw`

### Exemple 2: URL avec espaces

**Demande:** "Raccourcis https://example.com/path with spaces"

**Commande:**
```bash
python3 {baseDir}/shorten.py "https://example.com/path with spaces"
```

### Exemple 3: Via le script

**Demande:** "Crée un lien court pour mon site"

**Action:** Demander l'URL, puis:
```bash
python3 {baseDir}/shorten.py "<url_fournie>"
```

## Format de sortie

| Format | Description | Exemple |
|--------|-------------|---------|
| `format=simple` | Retourne uniquement l'URL raccourcie | `https://is.gd/abc123` |
| `format=json` | Retourne un JSON avec métadonnées | `{"shorturl": "...", "err": ""}` |

## Workflow typique

1. Recevoir l'URL à raccourcir
2. Encoder l'URL si nécessaire
3. Appeler l'API is.gd ou v.gd
4. Retourner l'URL raccourcie à l'utilisateur

## Notes importantes

- **Pas de clé API requise** - Service gratuit
- **Rate limiting** - Soyez raisonnable dans l'utilisation
- **Les liens n'expirent pas** - Les URLs raccourcies sont permanentes
- **Pas de personnalisation** - Le suffixe est généré automatiquement

## Gestion des erreurs

| Erreur | Cause | Solution |
|--------|-------|----------|
| `Error: Invalid URL` | URL malformée | Vérifier le format de l'URL |
| `Error: Blocked domain` | Domaine bloqué par le service | Essayer un autre service |
| `Connection error` | Problème réseau | Réessayer plus tard |

## Script intégré

Le script `shorten.py` fournit une interface robuste:

```bash
# Utilisation basique
python3 {baseDir}/shorten.py "https://example.com"

# Avec service spécifique
python3 {baseDir}/shorten.py --service vgd "https://example.com"

# Mode verbeux
python3 {baseDir}/shorten.py --verbose "https://example.com"
```
