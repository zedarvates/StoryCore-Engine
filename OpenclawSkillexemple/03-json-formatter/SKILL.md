---
name: json-formatter
description: "Formater, valider et transformer des données JSON. Use when: l'utilisateur demande de formater du JSON, valider une structure JSON, convertir entre JSON et autres formats, minifier/beautifier JSON. NOT for: manipulation de bases de données, traitement de fichiers XML complexes."
metadata:
  openclaw:
    emoji: "📋"
    requires:
      bins: ["python3"]
---

# JSON Formatter Skill

Outils pour manipuler et formater des données JSON.

## Quand l'utiliser

✅ **USE ce skill quand:**
- "Formate ce JSON"
- "Valide cette structure JSON"
- "Convertis en YAML"
- "Minifie ce JSON"
- "Extrais une valeur de ce JSON"
- "Beautify ce JSON"

❌ **N'utilisez PAS ce skill pour:**
- Manipulation de bases de données
- Traitement de fichiers XML complexes
- Opérations sur grands fichiers (>100MB)
- Requêtes sur des données JSON massives

## Commandes rapides avec jq

Si jq est installé sur le système:

```bash
# Formater (beautify)
echo '{"name":"test","value":123}' | jq .

# Minifier
echo '{"name":"test","value":123}' | jq -c .

# Extraire une valeur
echo '{"user":{"name":"John"}}' | jq '.user.name'

# Convertir en YAML (approximatif)
echo '{"key":"value"}' | jq -r 'to_entries | .[] | "\(.key): \(.value)"'

# Valider le JSON
echo '{"valid":true}' | jq . > /dev/null && echo "Valide" || echo "Invalide"
```

## Utilisation du script Python

Pour des opérations plus avancées:

```bash
# Formater un JSON (beautify)
python3 {baseDir}/format_json.py input.json --format pretty

# Minifier un JSON
python3 {baseDir}/format_json.py input.json --format minify

# Valider un JSON
python3 {baseDir}/format_json.py input.json --validate

# Convertir en YAML
python3 {baseDir}/format_json.py input.json --to-yaml

# Lire depuis stdin
echo '{"name":"test"}' | python3 {baseDir}/format_json.py - --format pretty
```

## Exemples d'utilisation

### Exemple 1: Formater un JSON compact

**Demande:** "Formate ce JSON: {\"name\":\"John\",\"age\":30,\"city\":\"Paris\"}"

**Commande:**
```bash
echo '{"name":"John","age":30,"city":"Paris"}' | python3 {baseDir}/format_json.py - --format pretty
```

**Résultat:**
```json
{
  "age": 30,
  "city": "Paris",
  "name": "John"
}
```

### Exemple 2: Valider un JSON

**Demande:** "Vérifie si ce JSON est valide: {\"test\":}"

**Commande:**
```bash
echo '{"test":}' | python3 {baseDir}/format_json.py - --validate
```

**Résultat:** `Invalid JSON: Expecting value: line 1 column 9 (char 8)`

### Exemple 3: Minifier un JSON

**Demande:** "Minifie ce JSON"

**Commande:**
```bash
python3 {baseDir}/format_json.py data.json --format minify
```

### Exemple 4: Convertir en YAML

**Demande:** "Convertis ce JSON en YAML"

**Commande:**
```bash
python3 {baseDir}/format_json.py data.json --to-yaml
```

**Résultat:**
```yaml
name: John
age: 30
city: Paris
```

## Options du script Python

```bash
# Afficher l'aide
python3 {baseDir}/format_json.py --help

# Options disponibles
--format        Format de sortie: pretty, minify (défaut: pretty)
--validate      Valider le JSON uniquement
--to-yaml       Convertir en format YAML
--indent        Indentation pour pretty (défaut: 2)
--sort-keys     Trier les clés alphabétiquement
```

## Workflow typique

1. Recevoir le JSON à traiter (fichier ou texte)
2. Déterminer l'opération souhaitée (format, validate, convert)
3. Exécuter le script ou la commande appropriée
4. Retourner le résultat à l'utilisateur

## Cas d'usage courants

| Cas d'usage | Commande |
|------------|----------|
| Beautifier un JSON compact | `--format pretty` |
| Minifier pour API | `--format minify` |
| Vérifier la validité | `--validate` |
| Convertir en YAML | `--to-yaml` |
| Debug une erreur JSON | `--validate` avec message d'erreur |

## Gestion des erreurs

| Erreur | Cause | Solution |
|--------|-------|----------|
| `Expecting value` | JSON incomplet | Vérifier les accolades/guillemets |
| `Extra data` | Données après le JSON | Nettoyer le contenu |
| `Invalid control character` | Caractère non échappé | Échapper les caractères spéciaux |
| `File not found` | Fichier introuvable | Vérifier le chemin |

## Notes importantes

- **jq** est plus rapide pour les opérations simples en ligne de commande
- Le **script Python** offre plus de flexibilité et de fonctionnalités
- Les deux approches peuvent être combinées
- Le script gère l'encodage UTF-8 automatiquement

## Dépendances Python

Pour la conversion YAML, installez:

```bash
pip install pyyaml
```

Le reste des fonctionnalités utilise uniquement la bibliothèque standard Python.
