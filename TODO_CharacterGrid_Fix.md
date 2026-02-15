# TODO: Fix Character Grid Feature

## Problèmes identifiés:
1. **Une seule image au lieu d'une grille** - Le code crée les structures de données mais ne génère pas réellement les images via ComfyUI
2. **Style non respecté** - Les prompts sont génériques, pas de référence de style du projet
3. **Image de référence non retournée** - L'API ne renvoie pas d'images de référence
4. **Style aléatoire** - Pas de cohérence de style entre les panneaux
5. **Résolution trop basse** - 512x512 par défaut au lieu de 1024x1024
6. **Pas de cohérence de personnage** - Chaque panneau est indépendant

## Corrections apportées:

### 1. ✅ CharacterGridConfig mis à jour
- [x] Ajout de `style: str = "realistic"`
- [x] Ajout de `use_character_reference: bool = True`
- [x] Résolution par défaut: 1024
- [x] Ajout de `reference_strength: float = 0.8`
- [x] Ajout de `character_description: Optional[str]`

### 2. ✅ Style Tags ajoutés
- [x] Ajout du dictionnaire `STYLE_TAGS` avec 10 styles (realistic, anime, fantasy, etc.)
- [x] Mise à jour de `_build_base_prompt()` pour inclure les tags de style

### 3. ✅ API mise à jour
- [x] `CharacterGridRequest` mis à jour avec les nouveaux paramètres
- [x] Resolution par défaut: 1024
- [x] Style: "realistic" par défaut
- [x] Passage des paramètres de style à la configuration

### 4. 🔲 Génération d'images (non implémenté - nécessite ComfyUI)
- [ ] La génération réelle des images via ComfyUI nécessite une implémentation supplémentaire

## Notes:
- Le style "realistic" est maintenant le style par défaut (au lieu d'un style aléatoire)
- La résolution est maintenant 1024x1024 par défaut
- Les prompts incluent maintenant les tags de style appropriés
- Pour la cohérence du personnage, il faudrait implémenter IP-Adapter dans ComfyUI

