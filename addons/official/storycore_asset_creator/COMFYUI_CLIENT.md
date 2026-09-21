# Suivi des tâches ComfyUI

Le client Python existant reste le point d'accès HTTP de l'Asset Creator.
Cette correction n'ajoute aucun service externe, modèle ou abonnement.

## Deux défauts reproduits

Sur le commit `5b6c83bd26f60f7eb5e4da53f958f2d3b06edb4a`, avec des réponses
simulées et les sockets interdites :

- Une entrée d'historique contenant `status_str="error"`, `completed=false`
  et des sorties partielles était renvoyée comme un résultat réussi.
- L'appel HTTP à `/history/{prompt_id}` ne recevait aucun `timeout`.
  La lecture du client montre la même omission pour les autres appels,
  sauf `/system_stats`.

## Comportement du client

| Situation | Résultat |
|---|---|
| `status.status_str == "success"` et `status.completed is True` | Retourne le dictionnaire `outputs`, même vide. |
| `status.status_str == "error"` | Lève `RuntimeError`, même avec des fichiers intermédiaires. |
| Ancien champ `error` au premier niveau | Lève `RuntimeError`. |
| Historique absent, statut inconnu ou incomplet | Continue le suivi jusqu'à son expiration. |
| Budget de suivi écoulé | `ComfyUIWaitTimeout`, avec `reason="wait_deadline"`. |
| `requests.exceptions.Timeout` pendant un GET de suivi | `ComfyUIWaitTimeout`, avec `reason="http_timeout"` et cause conservée. |
| Autre erreur HTTP ou réseau | Exception Requests transmise à l'appelant. |

`ComfyUIWaitTimeout` hérite de `TimeoutError` et expose `prompt_id`.
Le client ne supprime pas la tâche, ne l'annule pas et ne la soumet pas à
nouveau quand le suivi expire. Une expiration ne prouve pas que la tâche a
échoué ou qu'elle tourne encore ; son état doit être relu sur le serveur.

## Deux délais distincts

- `request_timeout=30.0` : délai Requests appliqué à tous les appels HTTP.
  Le contrôle de disponibilité garde un plafond de 5 secondes.
- `wait_for_result(..., timeout=300.0, poll_interval=2.0)` : budget du suivi
  et intervalle entre lectures. Le budget utilise une horloge monotone.
  Avant chaque GET, le délai HTTP est limité au budget restant ; les pauses
  sont également limitées. Le budget est revérifié au retour des GET et
  après le callback avant de dormir.

Ces trois paramètres doivent être finis et strictement positifs.
`get_history` et `get_queue_status` acceptent aussi un `timeout` nommé pour
réduire leur délai HTTP, sans dépasser celui du client.

Le délai Requests concerne la connexion et l'inactivité de lecture. Il
ne garantit **pas** une durée totale stricte : plusieurs adresses réseau,
une réponse qui arrive lentement ou un callback bloquant peuvent dépasser
le budget. Aucun thread n'est abandonné pour simuler une telle garantie.
Voir la [documentation officielle Requests sur les délais](https://requests.readthedocs.io/en/latest/user/advanced/#timeouts).

## Reprendre le suivi

```python
from addons.official.storycore_asset_creator.src.comfyui_client import (
    ComfyUIClient,
    ComfyUIWaitTimeout,
)

client = ComfyUIClient.from_project_config(request_timeout=30.0)
# prompt_id est l'identifiant déjà renvoyé par queue_workflow et sauvegardé.
try:
    outputs = client.wait_for_result(prompt_id, timeout=300.0)
except ComfyUIWaitTimeout as error:
    prompt_id_a_reprendre = error.prompt_id
    # Plus tard : client.wait_for_result(prompt_id_a_reprendre, timeout=300.0)
```

L'appelant doit sauvegarder l'identifiant dès l'acceptation. Cette correction
ne crée pas de stockage persistant de tâches et ne raccorde pas encore la
reprise à une interface MCP, CLI ou Blender.

Si le POST `/prompt` expire avant de renvoyer un identifiant, l'acceptation
reste incertaine. Le client laisse remonter l'exception Requests et n'ajoute
aucune relance automatique. Il faut vérifier la file du serveur avant de
décider d'une nouvelle soumission.

Les réponses des téléchargements sont fermées même en cas d'erreur.
Un téléchargement interrompu peut toujours laisser un fichier partiel :
la correction ne rend pas l'écriture atomique.

## Contrat et vérification

Contrat lu dans ComfyUI au commit
[`387f98aa2822f684b8597959a52a467d88cc4806`](https://github.com/Comfy-Org/ComfyUI/commit/387f98aa2822f684b8597959a52a467d88cc4806) :
[`execution.py`](https://github.com/Comfy-Org/ComfyUI/blob/387f98aa2822f684b8597959a52a467d88cc4806/execution.py#L1316-L1340)
décrit le statut enregistré ;
[`main.py`](https://github.com/Comfy-Org/ComfyUI/blob/387f98aa2822f684b8597959a52a467d88cc4806/main.py#L367-L372)
le renseigne à la fin du traitement. Le client ne déduit pas la réussite
de la seule présence d'un fichier.

Depuis la racine du dépôt, avec `requests` installé :

```bash
python -m unittest discover -s tests/asset_creator -p test_comfyui_client.py -v
```

Les 18 tests utilisent des réponses HTTP simulées et une horloge contrôlée.
La création de sockets y est interdite. Ils couvrent les statuts terminaux,
les sorties partielles, les délais, la reprise et les ressources HTTP.
Vérification locale effectuée avec Python 3.12.14 et Requests 2.34.2.

Il ne s'agit pas d'un test sur un serveur ComfyUI, Blender ou un GPU.
Les recettes Trellis2 locales, leurs extensions et le format API réellement
soumis restent à vérifier dans l'environnement d'exécution.
