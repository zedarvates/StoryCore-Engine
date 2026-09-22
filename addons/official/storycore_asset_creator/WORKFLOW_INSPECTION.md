# Inspecter les recettes avant leur adaptation

Ce diagnostic lit des fichiers locaux et produit un inventaire JSON. La fonction
Python `inspect_workflow_file` et la CLI partagent la même logique ; un futur
adaptateur MCP peut appeler cette fonction. Aucun outil MCP n'est enregistré par
cette tranche.

Depuis la racine de StoryCore, inventorier les quatre presets attendus :

```bash
python -m addons.official.storycore_asset_creator.src.workflow_inspection
```

Inspecter les recettes d'un dossier local explicite, ou des fichiers individuels :

```bash
python -m addons.official.storycore_asset_creator.src.workflow_inspection --presets-dir ./mes-recettes
python -m addons.official.storycore_asset_creator.src.workflow_inspection ./workflow.json ./workflow-api.json
```

Le diagnostic ne recherche pas récursivement d'autres fichiers. `--presets-dir`
cherche les quatre noms de `PRESETS` ; un fichier absent reste signalé comme
absent, sans choix d'une autre recette. Sans argument, le dossier de l'addon est
utilisé. `--help` affiche une aide textuelle ; les autres résultats et erreurs
d'arguments sont rendus en JSON sur stdout. Le chemin lu est une suite de noms
simples : une remontée `..`, un chemin relatif à un lecteur, un joker ou un caractère
de contrôle est refusé avant toute ouverture, et le rapport porte alors `path_refused`.

| Champ | Sens |
|---|---|
| `schema` | Contrat `storycore.workflow-inspection/v1` de la CLI |
| `status` | `inspected`, `missing` ou `invalid` pour chaque fichier |
| `sha256`, `bytes` | Empreinte et taille des octets lus, sans réécriture |
| `format` | `editor`, `api` ou `unknown` |
| `node_count`, `node_types` | Nœuds déclarés dans le document, y compris ceux désactivés |
| `declared_extensions` | Couples identifiant/version déclarés par `cnr_id` ou `aux_id` et `ver` |
| `api_export_required` | `true` pour un document d'éditeur, `false` pour une structure API reconnue, sinon `null` |
| `execution_verified` | Toujours `false` : aucune exécution n'a lieu |

Le code de sortie **0 signifie que l'inventaire a abouti**, même pour un document
d'éditeur nécessitant un export. Le code 2 signale un fichier absent/invalide ou
une erreur d'arguments. Aucun de ces résultats ne donne une autorisation de
génération. Un consommateur MCP doit conserver cette distinction.

La reconnaissance du format vérifie une structure minimale : liste de nœuds avec
identifiants/types pour l'éditeur ; table de nœuds avec `class_type` et `inputs`
pour l'API. Elle ne valide ni les liens, ni les types/valeurs d'entrées des nœuds,
ni les sorties, ni les modèles ou extensions installés. Les doublons de clés JSON
et les identifiants de nœuds ambigus dans un document d'éditeur sont refusés.

## Observation sur des sources publiques

Deux fichiers officiels de `visualbruno/ComfyUI-Trellis2`, figés à
`14597418bbe33a440ead4667e2966408f0524a21`, ont été lus sans les exécuter :

| Exemple amont | Nœuds déclarés | Format observé |
|---|---:|---|
| [MeshWithTexturing.json](https://github.com/visualbruno/ComfyUI-Trellis2/blob/14597418bbe33a440ead4667e2966408f0524a21/example_workflows/MeshWithTexturing.json) | 24 | Éditeur |
| [MeshWithTexturing_LowPoly.json](https://github.com/visualbruno/ComfyUI-Trellis2/blob/14597418bbe33a440ead4667e2966408f0524a21/example_workflows/MeshWithTexturing_LowPoly.json) | 27 | Éditeur |

Les octets reçus ont été vérifiés contre leurs identifiants de blobs Git, puis
le diagnostic a été exécuté avec la création de sockets interdite. Le
[relevé JSON](../../../tests/asset_creator/evidence/upstream-workflow-inspection.json)
conserve les empreintes SHA-256, listes de nœuds et versions déclarées. Ces
fichiers publics ne sont pas présentés comme les recettes PixelArtistry locales
de l'utilisateur et ne sont pas copiés dans les presets de l'addon.

Ces exemples déclarent notamment `Trellis2SparseGenerator` et
`Trellis2ShapeGenerator`, alors que les fonctions de modification existantes de
l'addon ciblent d'autres générateurs. Une correspondance par simple nom de
preset serait donc insuffisante pour garantir l'application des paramètres.

L'[exemple API officiel de ComfyUI](https://github.com/Comfy-Org/ComfyUI/blob/master/script_examples/basic_api_example.py)
(blob lu : `7e20cc2c18795c79559c9d3f52355d4cad93c70e`) montre une table
`class_type` / `inputs` et indique l'export « File → Export (API) ». Le diagnostic
ne tente pas de reconstruire ce format depuis les positions de widgets.

Le [code des nœuds Trellis2](https://github.com/visualbruno/ComfyUI-Trellis2/blob/14597418bbe33a440ead4667e2966408f0524a21/nodes.py)
(blob `a0c9e65453509cc31712a05d344f3c3efbc37156`) confirme les entrées nommées
`image` et `remove_background`. Il distingue aussi `pipeline_type` de
`sparse_structure_resolution` ; leur sens doit être préservé lors du prochain
adaptateur. Ce code a été lu, pas importé ou exécuté.

## Suite bornée

Le [relevé des presets du checkout](../../../tests/asset_creator/evidence/checkout-presets-inspection.json)
signale les quatre fichiers attendus comme absents. Les recherches dans les arbres
StoryCore, tools-suite et ultod-json-template-registry n'ont pas retrouvé ces
recettes. Cela ne décrit pas le contenu des machines de l'utilisateur.

La suite consiste à obtenir les JSON réellement employés dans Asset Factory et
leurs exports API issus de la même installation, relever les versions de nœuds et
de modèles, puis définir les champs modifiables explicitement. Les délais HTTP,
la reprise des tâches, les preuves de génération GPU et la validation des GLB
restent des travaux distincts.
