# StoryCore — reprise DOMPurify de la PR #70

État au 29 octobre 2026 : **correctif ciblé vérifié ; intégration globale bloquée** (`outcome: blocked`). Aucun verdict de validation complète de Creative Studio, aucune fusion, aucun déploiement.

## Provenance et périmètre

- Dépôt : <https://github.com/zedarvates/StoryCore-Engine> ; PR existante : <https://github.com/zedarvates/StoryCore-Engine/pull/70>.
- Base de travail exacte : tête de la PR #70 `8c2a1eb6a140558de7db47fbd861b357a79529f1`.
- Branche isolée : `fix/dompurify-ghsa-cg2g-20261029` ; `main` observée : `7e0b7875515ab8c1e9ee107961b407f95f3de9b2`.
- La branche conserve les corrections Axios, Undici, selector parser et autres dépendances de #70. Elle n'est pas une nouvelle correction concurrente destinée à `main`.
- Environnement de test cloud Linux : Node 24.22.1, npm 11.9.0, Vitest 4.1.11, jsdom 27.4.0, Vite 7.3.6. Aucun service ou fichier Ultimate Odycer, Odin, Glyph, Thor ou EurekAI n'a été modifié.

## Frontière de sécurité et exposition observée

L'[avis GHSA-cg2g-xh64-v4q7](https://github.com/advisories/GHSA-cg2g-xh64-v4q7), critique, concerne DOMPurify 3.4.4 à 3.4.16 incluses. La [version 3.4.17](https://github.com/cure53/DOMPurify/releases/tag/3.4.17) corrige le passage des expressions de modèles recomposées dans une racine Shadow DOM. L'invariant attendu est que `SAFE_FOR_TEMPLATES` neutralise aussi les expressions qui se forment après retrait d'éléments et concaténation des nœuds texte.

La chaîne d'exploitation exige des options non activées par défaut, une entrée DOM portant une racine attachée et l'évaluation ultérieure du contenu assaini par un moteur de modèles. Le texte descriptif de l'avis conserve une ancienne mention « non corrigé » ; sa plage structurée et les notes de version désignent bien 3.4.17. La reproduction et les tests différentiels ci-dessous vérifient le comportement plutôt que déduire la correction de cette seule mention.

Constats sur les sources exactes de #70 :

| Élément | Preuve et implication |
| --- | --- |
| Dépendance indirecte | `creative-studio-ui/package.json:62` déclare jsPDF ; `package-lock.json:8242` résout jsPDF 4.2.1, dont la dépendance optionnelle DOMPurify `^3.3.1` résout 3.4.16 avant correction (`:6702`). |
| Export projet utilisé par l'interface | `MenuBar.tsx:257` et `menuBar/menuActions.ts:434` délèguent à `ProjectExportService.exportPDF` (`services/projectExportService.ts:351`). La génération à partir de `:521` utilise `text`, les pages, polices et la sortie Blob. |
| Export conversation | `services/ConversationExportService.ts:289` utilise également l'API texte de jsPDF. Aucun consommateur de ce service n'a été trouvé dans les autres sources : le test protège cette API existante sans prétendre démontrer un parcours UI actif. |
| Options et Shadow DOM | Aucun import/appel applicatif DOMPurify, hook DOMPurify, `SAFE_FOR_TEMPLATES`, `RETURN_DOM`, `RETURN_DOM_FRAGMENT`, `IN_PLACE`, `attachShadow`, `shadowRoot`, `setHTMLUnsafe` ou `parseHTMLUnsafe` trouvé dans les sources initiales de Creative Studio. |
| HTML vers PDF | Aucun appel applicatif `jsPDF.html`, `fromHTML`, `addHTML` ou html2canvas. Dans jsPDF 4.2.1 installé, `dist/jspdf.es.js:13492` charge DOMPurify ; `:13526` appelle `sanitize(opt.innerHTML)` sans options ; `:13638` réserve ce chemin aux chaînes du plugin HTML. Le cas DOM n'appelle pas cette sanitisation. Ce plugin n'est pas atteint par les exports actuels. |
| Autres filtres et sinks | `PromptSanitizer.ts` est un filtre distinct sans DOMPurify. Les sinks React HTML trouvés ne passent pas par cette dépendance. Leur sûreté générale n'est pas validée par ce correctif. |

**Démontré :** la bibliothèque vulnérable est présente et le défaut de recomposition se reproduit sur son API synthétique. **Non démontré :** une exploitation de cette vulnérabilité dans Creative Studio. Les tests ne lancent aucun moteur de modèles ni code issu du témoin.

## Modification retenue

1. Ajouter l'override exact `"dompurify": "3.4.17"` à Creative Studio, en conservant `postcss-selector-parser: ^7.1.6`.
2. Mettre à jour uniquement la version, l'URL du tarball et son intégrité SHA-512 dans l'unique entrée DOMPurify du lockfile. La version reste compatible avec la plage de jsPDF.
3. Ajouter `dompurify.security.test.ts` et `pdfExport.security.test.ts` dans `creative-studio-ui/src/services/__tests__/`.

Une génération npm du lockfile avec `--legacy-peer-deps` retirait aussi des entrées peer étrangères au correctif. Ce résultat a été écarté ; seuls les trois champs DOMPurify issus du registre ont été conservés. L'installation propre a ensuite vérifié ce lockfile ciblé. Aucun autre nœud de dépendance n'a changé, ni les manifestes/lockfiles racine et `config`.

Aucun changement de sanitisation applicative n'est ajouté : les exports doivent conserver prose, balises apparentes et délimiteurs de modèles comme texte PDF littéral. L'API, les noms de fichiers, la validation, la progression et l'anonymisation doivent rester compatibles.

## Validation exécutée

Les journaux et empreintes sont dans [dompurify-2026-10-29](dompurify-2026-10-29/validation.json).

| Vérification | Avant / après et résultat |
| --- | --- |
| Installation propre avec scripts | `npm ci --legacy-peer-deps --no-fund --audit=false` réussit sur la base puis sur le candidat ; aucun `--ignore-scripts` pour ces installations. Le mode legacy respecte la contrainte existante du graphe de peers. |
| Résolution | `npm ls dompurify jspdf html2canvas postcss-selector-parser axios undici --all` réussit ; jsPDF résout une seule instance DOMPurify 3.4.17 ; selector parser reste 7.1.6, Axios 1.20.0 et Undici 7.30.0. |
| Syntaxe et lint | `git diff --check` et ESLint des deux nouveaux fichiers réussissent. Vitest transforme/import les nouveaux tests. |
| Déclencheur de sécurité | Sur 3.4.16, quatre tests échouent comme attendu : expressions `${…}`, `{{…}}`, `<%=…%>` fragmentées et racines imbriquées. Le contrôle de sanitisation de chaîne réussit. Sur 3.4.17, les cinq tests réussissent : les expressions ne survivent plus et la prose reste présente. |
| Compatibilité PDF | Cinq nouveaux tests passent avec jsPDF réel : PDF projet, validation négative, conversation avec métadonnées, anonymisation et conversation absente. Le plugin `jsPDF.API.html` est surveillé et ferait échouer le test s'il était appelé. Les PDF contiennent des en-têtes/terminaisons valides et les témoins littéraux attendus. |
| Suite ciblée complète | Les cinq tests bibliothèque, cinq tests PDF et quatorze tests `projectExportService.test.ts` passent : **24/24**. Les notices de navigation jsdom des tests existants ne sont pas des succès de navigation navigateur. |
| Bundle de production ciblé | Vite construit réellement les deux services PDF, 253 modules et leurs chunks ; le chunk DOMPurify embarqué déclare 3.4.17. Cette construction limitée ne remplace pas celle de l'application. |
| Compilation complète | `npm run build` échoue avant et après : `src/providers/ComfyUIProvider`, importé par `src/AppProviders.tsx`, manque. Ce blocage préexiste au patch. |
| Intégration menu | La suite `menuActions.integration.test.ts` a **12 succès / 8 échecs** sur un second checkout propre de la tête originale et le même résultat sur le candidat. Les huit noms d'échec sont identiques : contrats de sauvegarde, `loadRecentProject` absent et modal Save As. Les cas d'export PDF de cette suite passent. |
| Revue indépendante | Une investigation en lecture seule a retracé les appels avant modification. Une revue fraîche du diff et des tests n'a signalé aucun contournement ni régression concret. |

Commandes de reproduction depuis `creative-studio-ui` :

```bash
npm ci --legacy-peer-deps --no-fund --audit=false
npm ls dompurify jspdf html2canvas postcss-selector-parser axios undici --all
npx eslint src/services/__tests__/dompurify.security.test.ts src/services/__tests__/pdfExport.security.test.ts
npm test -- src/services/__tests__/dompurify.security.test.ts src/services/__tests__/pdfExport.security.test.ts src/services/__tests__/projectExportService.test.ts --maxWorkers=2
npm test -- src/components/menuBar/__tests__/menuActions.integration.test.ts --maxWorkers=2
npm run build
npm audit --json
```

Bundle ciblé, également depuis ce dossier (sortie temporaire hors des sources) :

```javascript
// node --input-type=module
import { build } from 'vite';
import path from 'node:path';
await build({
  configFile: false,
  resolve: { alias: { '@': path.resolve('src') } },
  build: {
    outDir: '../evidence/pdf-bundle',
    emptyOutDir: true,
    lib: {
      entry: ['src/services/projectExportService.ts', 'src/services/ConversationExportService.ts'],
      formats: ['es'],
    },
  },
});
```

## Vulnérabilités et risques résiduels

Le relevé npm avant/après retire DOMPurify et les trois avis qui lui étaient associés : GHSA-cg2g-xh64-v4q7 (critique), GHSA-mrv2-3pqr-j5jr (haute) et GHSA-c6gr-qvv4-5v3f (faible). Seul le premier est reproduit dynamiquement ici ; la disparition des deux autres est une preuve de plage de version/audit, pas une validation individuelle de leurs scénarios.

L'audit global reste en échec : **11 → 10 entrées**, **2 → 1 critiques**, cinq hautes et quatre modérées inchangées. Ces nombres portent sur le lockfile, y compris des peers qui peuvent être omis de l'installation legacy. L'entrée critique restante est Storybook. Electron, follow-redirects, Undici, Vite, Zod et des outils Vitest restent signalés. Les validations historiques de #70 ne prouvent donc pas leur sûreté au 29 octobre. Aucun de ces paquets n'est modifié ici.

Le bundle statique Swagger de `docs/api/static/swagger-ui/swagger-ui-bundle.js` contient séparément DOMPurify 3.0.6. Il n'est pas issu du lockfile Creative Studio et est hors de la plage 3.4.4–3.4.16 de cet avis. Il reste inchangé et n'est pas déclaré sûr ou corrigé par cette intervention.

Limites explicites : tests de sécurité sous jsdom en `IN_PLACE`, sans validation navigateur des retours DOM/fragment ni de Shadow DOM déclaratif ; aucune recette Electron native, aucune CI applicative complète réussie, aucun contrôle authentifié de clôture de l'alerte Dependabot #621. Toute évolution vers un rendu HTML, des hooks, un objet DOM ou un moteur de modèles doit faire réévaluer l'exposition.

## Intégration et reprise

Le supplément doit prolonger la PR #70, en avance rapide et avec contrôle de sa tête attendue, sans remplacer ses commits précédents. Les preuves sont attachées aux quatre empreintes de code de `validation.json` et à la base exacte ci-dessus. Aucun auto-merge ne doit être déduit de ces résultats ciblés.

Avant fusion globale : résoudre le défaut de compilation déjà suivi dans #74, remettre les contrats du menu en cohérence, obtenir une CI sur le commit final intégrant les corrections retenues, puis effectuer une recette navigateur/Electron appropriée. La disponibilité de 3.4.17 et les tests ciblés ne ferment pas ces blocages.
