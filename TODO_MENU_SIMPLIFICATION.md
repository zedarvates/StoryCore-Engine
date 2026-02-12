# TODO: Simplification des labels du menu - TERMINÉ

## Résumé des modifications

Les labels du menu ont été simplifiés en retirant le préfixe `menu.` des clés i18n.

### Fichiers modifiés:
1. ✅ `creative-studio-ui/src/config/menuBarConfig.ts` - Clés i18n simplifiées
2. ✅ `creative-studio-ui/src/utils/i18n.tsx` - Traductions mises à jour pour 9 langues

### Changements effectués:

| Avant | Après |
|-------|-------|
| `menu.file` | `file` |
| `menu.file.new` | `file.new` |
| `menu.file.open` | `file.open` |
| `menu.file.save` | `file.save` |
| `menu.file.saveAs` | `file.saveAs` |
| `menu.file.export` | `file.export` |
| `menu.edit` | `edit` |
| `menu.edit.undo` | `edit.undo` |
| `menu.view` | `view` |
| `menu.view.timeline` | `view.timeline` |
| `menu.project` | `project` |
| `menu.wizards` | `wizards` |
| `menu.tools` | `tools` |
| `menu.help` | `help` |

### Exemples de libellés simplifiés:

**Français:**
- "Nouveau Projet" → "Nouveau"
- "Enregistrer le Projet" → "Enregistrer"
- "Ouvrir un Projet" → "Ouvrir"
- "Zoom Avant" → "Zoom +"
- "Zoom Arrière" → "Zoom -"
- "Réinitialiser le Zoom" → "Reset zoom"
- "Plein Écran" → "Plein écran"

**Anglais:**
- "New Project" → "New"
- "Save Project" → "Save"
- "Open Project" → "Open"
- "Zoom In" → "Zoom +"
- "Zoom Out" → "Zoom -"
- "Reset Zoom" → "Reset zoom"
- "Full Screen" → "Full screen"

### Langues supportées:
- Français (fr)
- Anglais (en)
- Espagnol (es)
- Allemand (de)
- Japonais (ja)
- Portugais (pt)
- Italien (it)
- Russe (ru)
- Chinois (zh)

## Statut:
- ✅ Modification du menuBarConfig.ts
- ✅ Modification du i18n.tsx
- ⏳ Tests à vérifier
