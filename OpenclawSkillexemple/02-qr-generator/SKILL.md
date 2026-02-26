---
name: qr-generator
description: "Générer des QR codes à partir de texte ou URLs. Use when: l'utilisateur demande de créer un QR code, générer un code-barres 2D, encoder des données en QR. NOT for: codes-barres 1D, NFC tags, encryption de données sensibles."
metadata:
  openclaw:
    emoji: "📱"
    requires:
      bins: ["python3"]
---

# QR Generator Skill

Générer des QR codes rapidement à partir de texte ou URLs.

## Quand l'utiliser

✅ **USE ce skill quand:**
- "Crée un QR code pour..."
- "Génère un QR avec ce texte"
- "Encode cette URL en QR code"
- L'utilisateur veut partager des données via QR code

❌ **N'utilisez PAS ce skill pour:**
- Codes-barres 1D (EAN, UPC)
- NFC tags
- Encryption de données sensibles
- Grande quantité de données (>4KB)

## Génération de QR Codes

### API QRServer (gratuite, sans clé)

```bash
# QR code simple
curl -o qr.png "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://example.com"

# Avec différentes tailles
curl -o qr.png "https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=Hello%20World"

# Format SVG
curl -o qr.svg "https://api.qrserver.com/v1/create-qr-code/?format=svg&size=300x300&data=https://example.com"
```

### Utilisation du script Python

Pour une génération locale avec plus d'options:

```bash
python3 {baseDir}/generate_qr.py "https://example.com" --output qr.png
python3 {baseDir}/generate_qr.py "Mon texte" --size 400 --output qr.png
python3 {baseDir}/generate_qr.py "https://openclaw.ai" --color FF5733 --bgcolor FFFFFF
```

## Paramètres disponibles

| Paramètre | Description | Exemple |
|-----------|-------------|---------|
| `size` | Dimensions en pixels | `300x300`, `500x500` |
| `format` | Format de sortie | `png`, `svg`, `eps` |
| `data` | Contenu à encoder | URL ou texte |
| `color` | Couleur du QR (hex) | `000000` (noir) |
| `bgcolor` | Couleur de fond (hex) | `ffffff` (blanc) |

## Exemples d'utilisation

### Exemple 1: QR code pour URL

**Demande:** "Crée un QR code pour https://openclaw.ai"

**Commande:**
```bash
python3 {baseDir}/generate_qr.py "https://openclaw.ai" --output openclaw_qr.png
```

### Exemple 2: QR code pour texte

**Demande:** "Génère un QR code avec le texte 'Hello from OpenClaw!'"

**Commande:**
```bash
python3 {baseDir}/generate_qr.py "Hello from OpenClaw!" --output hello_qr.png
```

### Exemple 3: QR code coloré

**Demande:** "Crée un QR code rouge pour mon site"

**Commande:**
```bash
python3 {baseDir}/generate_qr.py "https://monsite.com" --color FF0000 --output qr_rouge.png
```

### Exemple 4: QR code haute résolution

**Demande:** "Génère un QR code en haute résolution"

**Commande:**
```bash
python3 {baseDir}/generate_qr.py "https://example.com" --size 800 --output qr_hd.png
```

## Workflow typique

1. Recevoir le contenu à encoder (URL, texte, etc.)
2. Déterminer la taille et le format souhaités
3. Générer le QR code via le script ou l'API
4. Sauvegarder le fichier et le partager avec l'utilisateur

## Options du script Python

```bash
# Afficher l'aide
python3 {baseDir}/generate_qr.py --help

# Options disponibles
--output, -o    Nom du fichier de sortie (défaut: qr_code.png)
--size, -s      Taille en pixels (défaut: 300)
--format, -f    Format: png, svg (défaut: png)
--color, -c     Couleur du QR en hex (défaut: 000000)
--bgcolor, -b   Couleur de fond en hex (défaut: FFFFFF)
--verbose, -v   Mode verbeux
```

## Notes importantes

- **Taille max des données:** ~4KB selon le type de contenu
- **Correction d'erreurs:** Niveau M par défaut (15% de redondance)
- **Formats supportés:** PNG, SVG, EPS
- **Pas de clé API requise** pour l'API QRServer

## Cas d'usage courants

| Cas d'usage | Contenu | Taille recommandée |
|-------------|---------|-------------------|
| URL de site web | `https://...` | 300x300 |
| WiFi credentials | `WIFI:T:WPA;S:nom;P:mdp;;` | 400x400 |
| Contact (vCard) | Données contact | 400x400 |
| Texte simple | Message court | 200x200 |
| Email | `mailto:email@ex.com` | 300x300 |

## Gestion des erreurs

| Erreur | Cause | Solution |
|--------|-------|----------|
| Données trop longues | >4KB de données | Réduire le contenu |
| Format invalide | Extension non supportée | Utiliser png, svg ou eps |
| Couleur invalide | Format hex incorrect | Utiliser format RRGGBB |

## Dépendances Python

Pour utiliser le script local, installez:

```bash
pip install qrcode pillow
```

Ou utilisez l'API QRServer qui ne nécessite aucune dépendance.
