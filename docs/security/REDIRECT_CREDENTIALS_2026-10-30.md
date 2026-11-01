# PR #70 — restauration du contrôle des redirections

Correctif ciblé du 30 octobre 2026. La validation globale de l'application reste bloquée. Aucune fusion, activation d'auto-merge ou livraison.

## Provenance et modification minimale

- Branche existante : `fix/security-axios-undici-2026-10`, parent exact `862d6138b6485d5c0de56bc7341a23ae77603bd0`.
- Échec initial : [Redirect Credential Security #40819121454](https://github.com/zedarvates/StoryCore-Engine/actions/runs/40819121454), fichier de test absent après installation réussie du paquet.
- Test restauré octet pour octet depuis le snapshot `main` `7e0b7875515ab8c1e9ee107961b407f95f3de9b2` : blob Git `78a3703cc5da4cba004570bd4744b7a5389c5f95`.
- Les trois lockfiles de la PR utilisaient encore `follow-redirects 1.16.0`. Ils reprennent le nœud `1.16.1` déjà présent dans ce snapshot de `main`, compatible avec la plage Axios `^1.16.0`.
- Dans chaque lockfile, seuls `version`, `resolved` et `integrity` de cet unique nœud changent. Tous les manifestes et autres nœuds sont identiques au parent. Aucun override, source applicative ou workflow n'est changé.
- La correction de `main` provient de [#81](https://github.com/zedarvates/StoryCore-Engine/pull/81). Les avis [GHSA-q3jh-wrc6-jgq8](https://github.com/advisories/GHSA-q3jh-wrc6-jgq8) et [GHSA-8r9p-f939-6h3c](https://github.com/advisories/GHSA-8r9p-f939-6h3c), classés hauts dans la base GitHub révisée, affectent 1.16.0 et désignent 1.16.1 comme corrigée.
- Le workflow est déjà sur `main` et utilise explicitement la tête de PR. Son absence héritée sur la branche n'exige pas de le réécrire pour cette correction.

## Contrôles locaux

Cloud Linux isolé, Node 24.22.1, npm 11.9.0. Aucun poste ou service Ultimate Odycer n'est utilisé.

| Contrôle | Résultat |
| --- | --- |
| Témoin initial exact | `node --test tests/security/follow-redirects.test.cjs` échoue car le fichier manque. |
| Test restauré avec les lockfiles/paquet 1.16.0 du parent | 5 succès / 6 échecs : 3 contrôles de lockfiles et 3 assertions de confidentialité échouent. Les témoins utilisent uniquement des identifiants fictifs et deux serveurs locaux. |
| Procédure du workflow : racine | Installation isolée de la version verrouillée 1.16.1, puis 11/11 tests réussis. |
| Procédure du workflow : config | Installation isolée de la version verrouillée 1.16.1, puis 11/11 tests réussis. |
| Procédure du workflow : Creative Studio | Installation isolée de la version verrouillée 1.16.1, puis 11/11 tests réussis. |
| Installation Studio complète | `npm ci --legacy-peer-deps --no-fund --audit=false`, scripts activés : succès. |
| Résolution Studio installée | DOMPurify 3.4.17, follow-redirects 1.16.1, Axios 1.20.0, Undici 7.30.0, selector parser 7.1.6. |
| DOMPurify et exports PDF | 24/24 tests réussis : 5 bibliothèque, 5 PDF réels, 14 export projet existants. |
| Compilation Studio complète | Échec : `src/providers/ComfyUIProvider`, importé par `src/AppProviders.tsx`, absent. Voir #74 et comparaison au parent. |
| Intégration menu | 12 succès / 8 échecs ; cas PDF réussis. Voir comparaison au parent. |
| Revue et intégrité | Revue indépendante sans défaut bloquant ; test identique au blob canonique ; comparaison JSON complète des trois lockfiles ; `node --check` et `git diff --check` réussis. |

Les trois exécutions utilisent chacune le paquet désigné par son propre lockfile, comme la matrice CI ; ce ne sont pas trois installations complètes de l'application. Chaque exécution vérifie aussi les trois lockfiles. Les assertions couvrent objets et tableaux d'en-têtes, identifiants intégrés/personnalisés, préservation des requêtes ordinaires et des redirections de même origine.

Commandes représentatives depuis la racine :

```bash
# Reproduire pour PROJECT_DIR=., config, creative-studio-ui, avec un répertoire temporaire distinct.
export PROJECT_DIR=.
version="$(node -p 'require("./" + process.env.PROJECT_DIR + "/package-lock.json").packages["node_modules/follow-redirects"].version')"
npm install --prefix "$RUNNER_TEMP/redirect-regression" --no-save --package-lock=false --ignore-scripts --no-audit --no-fund "follow-redirects@$version"
FOLLOW_REDIRECTS_MODULE="$RUNNER_TEMP/redirect-regression/node_modules/follow-redirects" node --test tests/security/follow-redirects.test.cjs
```

`PROJECT_DIR` est exporté comme dans le workflow. `RUNNER_TEMP` est le répertoire temporaire choisi pour le contrôle.

## Comparaison propre au parent

Un second worktree isolé au commit exact `862d6138b6485d5c0de56bc7341a23ae77603bd0`, avec sa propre installation `npm ci --legacy-peer-deps --no-fund --audit=false` réussie, reproduit les deux échecs. Les huit noms complets des tests du menu sont exactement égaux à ceux du candidat (12 succès / 8 échecs de part et d’autre). La compilation échoue sur le même import absent `ComfyUIProvider`, après normalisation du chemin du worktree. Le checkout parent reste propre. Ces défauts sont donc préexistants au présent correctif ; aucune nouvelle défaillance n’est observée dans ces contrôles.

## Conditions restant avant une fusion validée

1. Obtenir la réussite des trois jobs Redirect Credential Security sur le nouveau commit exact. Les résultats hébergés, disponibles après publication, sont consignés dans la description de la PR ; les tests locaux ne les remplacent pas.
2. Corriger et vérifier séparément le défaut de compilation suivi dans [#74](https://github.com/zedarvates/StoryCore-Engine/issues/74), ainsi que les contrats du menu. Ils sont hors du changement des redirections.
3. Traiter séparément les alertes résiduelles et requalifier leurs chemins réellement exposés. Le dernier audit Studio disponible, daté du 29 octobre dans [candidate-audit.json](dompurify-2026-10-29/candidate-audit.json), contient 10 entrées : Storybook critique ; Electron, follow-redirects, Undici, Vite et Zod hautes ; quatre entrées de la famille Vitest modérées. Cette liste est historique, inclut des peers potentiellement omis de l'installation legacy et ne prouve pas une exploitation applicative. Le présent graphe corrige les versions follow-redirects concernées, sans prétendre produire un nouvel audit ni corriger les autres paquets.
4. Exécuter une CI complète et une recette navigateur/Electron sur la combinaison finale retenue. La réussite de la seule matrice de sécurité ne suffit pas à valider toute l'application. La fermeture authentifiée des alertes Dependabot reste à vérifier.

L'actualisation de `npm audit` a été refusée par le contrôle automatique : transmission de métadonnées de dépendances au registre public sans autorisation explicite du contenu et de la destination. Aucun résultat frais n'a été produit et aucun contournement n'a été tenté. Une comparaison hors ligne confirme que les 802 / 550 / 856 nœuds des trois lockfiles ne changent que par le nœud décrit ci-dessus.

Les règles complètes de protection de `main` ne sont pas toutes lisibles avec l'intégration disponible ; aucune approbation ou obligation de check non observée n'est inventée. Cette note décrit les conditions de validation technique, pas une autorisation de fusion.
