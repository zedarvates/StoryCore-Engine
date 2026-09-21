# Narrative Integrity Engine — conception V1 (R&D)

**Date :** 21 septembre 2026
**Statut :** conception (design-only). Aucun code modifié, aucun commit, aucune migration.
**Baseline :** à valider explicitement avant toute implémentation.
**Frontière :** moteur générique, compatible couche ouverte MIT StoryCore. Aucune dépendance au runtime privé ni aux données de production.

---

## 1. Décision d'architecture

Le jeu d'idées décrit deux modules — « NarrativeLayerEngine » à quatre couches et « NarrativeImmuneSystem » à double cohérence — qui inspectent en réalité les mêmes objets selon deux axes différents. La proposition V1 est un moteur unique, **`NarrativeIntegrityEngine`**, à deux axes orthogonaux :

- **Axe A — `NarrativeLayer`** : *ce qui* est inspecté.
- **Axe B — `ControlFamily`** : *comment* c'est inspecté.

Le « layer histoires » et le « système immunitaire » ne sont donc pas deux briques concurrentes mais les deux dimensions d'un même plan de contrôle. Le style n'est pas une couche : c'est une projection mesurée, verrouillée par un profil de référence.

Contrat de sortie : `Finding = f(layer, control_family, canon_ref, severity, evidence)`.

---

## 2. Taxonomie corrigée

| Niveau | Objet inspecté | Exemples d'invariants | Source de vérité |
|---|---|---|---|
| **L0 — Canon** | faits, entités, relations, chronologie | aucune contradiction avec le canon accepté, pas d'entité orpheline | `SynopsisDocument.canonical_version_id`, `StoryGraph` |
| **L1 — Structure** | actes, beats, arcs | setup suivi d'un payoff, pas d'acte sans fonction, progression d'arc lisible | structure de projet |
| **L2 — Scènes** | séquences et scènes | POV, lieu, continuité temporelle, présence des personnages | scènes du projet |
| **L3 — Prose** | texte rédigé | tics lexicaux, n-grammes répétés, rythme, ratio show/tell | texte généré |
| **S — Style (transversal)** | signature stylistique | dérive vs profil verrouillé, rupture locale | `ReferenceProfile` |

Justification : dans le découpage initial, « Layer 3 : style » plaçait le style *au-dessus* de la prose, alors qu'une signature stylistique se mesure *sur* la prose et les scènes. Le rendre transversal supprime un niveau sans invariant propre.

### Axe B — familles de contrôle

1. **Déterministe** — règles exactes : présence d'un personnage, ordre chronologique, n-grammes, ponctuation. Reproductible, testable, sans LLM.
2. **Statistique** — mesures agrégées : diversité lexicale, distribution des longueurs de phrase, dérive de style par fenêtre.
3. **Relationnel / RAG** — requêtes sur le canon et les faits indexés.
4. **Juge LLM** — évaluation qualitative, explicitement étiquetée non déterministe.

Règle de conception : un fait établi par un détecteur déterministe n'est jamais écrasé par un juge LLM. Le juge enrichit, il ne certifie pas.

---

## 3. Incohérences détectées

### 3.1 Dans le jeu d'idées

**I1 — Redondance structurelle.** « NarrativeLayerEngine » et « NarrativeImmuneSystem » décrivent les mêmes objets selon deux découpages. La « cohérence stylistique » du système immunitaire correspond exactement au niveau S ; la « cohérence structurelle » au niveau L1. Deux modules séparés produiraient deux registres de findings concurrents pour un même texte.

**I2 — Le style n'est pas une couche.** Voir §2 : le style est une mesure transversale, pas un niveau hiérarchique.

**I3 — « meta tag caché dans les patterns de mots » mélange deux opérations opposées.** Détecter un signal (analyser le texte) et *insérer* un marqueur dissimulé (canal caché) n'ont ni les mêmes risques ni les mêmes garanties. Un marqueur lexical caché survit mal à la paraphrase, reste invisible à l'utilisateur, et expose à un soupçon de traçage silencieux. Proposition : séparer un registre de détection (SlopSignatureRegistry, §7) d'une provenance **explicite** en métadonnées (§8). Aucun marquage lexical caché en V1.

### 3.2 Dans le dépôt — documentation contre implémentation

**I4 — La documentation présente comme garanties des valeurs simulées.** `docs/general/PRESENTATION.md:360` annonce « Style drift | Style vector cosine similarity | > 0.80 » et, ligne 357, une cohérence visuelle SSIM > 0.85. Or la détection correspondante est un mock : `EnhancedQAEngine._validate_visual_coherence` fixe `style_drift = 0.15` en dur sous `if self.mock_mode` (`src/enhanced_qa_engine.py:388`). Le seuil n'est pas mesuré, il est écrit.

**I5 — « No human intervention required » contredit la doctrine canonique.** `docs/general/PRESENTATION.md:362` décrit une régénération automatique sans revue humaine. La conception Synopsis Studio impose l'inverse : « Une génération IA produit toujours une proposition distincte. Elle ne remplace jamais silencieusement le synopsis canonique. » Un « système immunitaire » qui réécrit sans confirmation recréerait précisément le problème que le canon verrouillé cherche à éviter.

**I6 — L'anti-slop existant n'est pas instrumenté.** `backend/hermes_novelist_service.py:58` contient une liste de mots interdits écrite en dur dans un prompt (« tapestry », « testament », « unbeknownst »…). Conséquences : non versionné, non testable, non mesuré, contournable par reformulation. Le même mot peut être un tic dans un contexte et un choix légitime dans un autre.

**I7 — La QA narrative existante est LLM-only, sans persistance ni ancrage canon.** Les neuf endpoints de `src/api/categories/qa_narrative.py` (dont `check_coherence`, ligne 262) renvoient des scores issus d'un prompt, sans identifiant stable, sans empreinte d'entrée, sans lien au canon et sans trace réutilisable. Deux appels sur le même texte peuvent diverger. Ce n'est pas un détecteur d'incohérences reproductible, c'est un avis.

**I8 — Les heuristiques de contradiction sont purement lexicales.** `StoryGraph.detect_contradictions` (`src/assistant/knowledge_graph.py:282`) et `_detect_logical_inconsistencies` (`src/fact_checker/antifake_video_agent.py:266`) s'appuient sur des oppositions de vocabulaire (termes absolus contre termes qualifiés). Elles produisent des faux positifs sur toute prose nuancée et ne détectent aucune contradiction factuelle réelle.

**I9 — La « similarité cosinus » annoncée n'est pas sémantique.** `_text_vector` construit un vecteur de 26 dimensions par hachage de tokens (`src/assistant/knowledge_graph.py:70`) que `_cosine_similarity` (ligne 85) compare ensuite. La mesure est sensible à la langue, aux collisions et à la morphologie ; elle ne peut pas porter une métrique de dérive stylistique présentée comme fiable.

---

## 4. Existant réutilisable

| Brique | Fichier | Apport | Usage proposé |
|---|---|---|---|
| Graphe narratif + RAG | `src/assistant/knowledge_graph.py` | `StoryGraph`, `GraphRAG`, `ingest_project`, timeline, arcs | socle L0 et voie relationnelle, après remplacement du vecteur de hachage |
| QA narrative | `src/api/categories/qa_narrative.py` | 9 analyses, modèles dataclass (`qa_narrative_models.py`) | conservé comme voie « juge LLM », à encapsuler derrière un identifiant de finding |
| Scoring d'alignement | `backend/story_alignment_scorer.py` | `ScoreResult`, `AlignmentReport`, `ScoringCategory` | modèle de rapport agrégé, déjà branché sur `StoryGraph` |
| Moteur QA + autofix | `src/enhanced_qa_engine.py` | `QAIssue`, `QAMetrics`, `QASeverity`, `AutofixAction`, rapport et recommandations | réutiliser le vocabulaire de sévérité et d'action, pas la voie mock |
| Anti-slop Hermes | `backend/hermes_novelist_service.py` | tics et anti-patterns déjà rédigés | matière première du registre de signatures, à externaliser en données versionnées |
| Assistant + RLM | `src/assistant/storycore_assistant.py`, `rlm_engine.py` | boucle critique-correction déjà alimentée par GraphRAG | point d'insertion du moteur sans nouveau chemin d'exécution |
| Continuité personnage | `src/character_wizard/consistency_tracker.py`, `coherence_anchors.py` | suivi de variations, prompts positifs et négatifs | détecteurs L2 côté identité de personnage |
| Templates de prompts | `backend/prompt_template_service.py` | catégories, couches, variables, schéma, composition | injection des contraintes et des profils de style |
| Suite de tests | `tests/property/`, `tests/unit/`, `tests/verification/` | hypothesis déjà en place, tests de propriétés existants | base des tests de déterminisme et de non-régression |

---

## 5. Contrats de données

Schémas persistés, `schema_version` obligatoire, append-only du point de vue éditorial, alignés sur le vocabulaire de version du Synopsis Studio.

``` text
NarrativeIntegrityReport
  schema_version
  report_id            # identifiant stable
  project_id
  canon_ref            # canonical_version_id inspecté
  input_ref            # artefact inspecté + empreinte de contenu
  scope                # layers et control_families exécutés
  profile_ref          # ReferenceProfile utilisé, si niveau S
  findings[]           # liste de Finding
  aggregates           # scores par layer, par famille
  determinism          # deterministic | statistical | probabilistic
  settings_ref         # fichier de seuils versionné
  created_at
```

``` text
Finding
  finding_id           # stable, dérivable de (detector_id, input_hash, locus)
  layer                # L0 | L1 | L2 | L3 | S
  control_family       # deterministic | statistical | relational | llm_judge
  detector_id          # identifie la règle ou le modèle, avec sa version
  severity             # info | low | medium | high | blocking
  confidence           # valeur + nature de la confiance, pas un pourcentage nu
  locus                # scène, paragraphe, plage de caractères, ou fenêtre
  evidence[]           # extraits exacts, jamais une reformulation
  canon_conflict       # référence canonique en conflit, si applicable
  remediation          # suggestion seulement, jamais une écriture
  determinism
```

``` text
ReferenceProfile        # verrou de style, un par projet ou par œuvre
  profile_id
  derived_from[]        # artefacts sources, explicites
  metrics               # dictionnaire de mesures calibrées
  thresholds_ref
  locked_at / locked_by
```

``` text
SlopSignature
  signature_id
  family                # ngram | cliche | connector | rhythm | lexical_treasure
  pattern               # motif déclaratif, pas une liste plate de mots
  weight
  max_allowed_per_1000_words
  examples[] / counter_examples[]   # permet de calibrer les faux positifs
  language
  source                # provenance bibliographique ou corpus
```

---

## 6. Détecteurs V1

Priorité au déterministe, parce que c'est la seule voie testable sans juge.

**L0 — Canon.** Entité citée mais absente du graphe. Relation contredite par une relation acceptée. Date ou âge incompatible avec la chronologie. Objet utilisé avant son introduction.

**L1 — Structure.** Beat attendu sans payoff. Scène sans fonction ni conflit. Rupture de progression d'arc. Déséquilibre de répartition de tension sur l'acte.

**L2 — Scènes.** Changement de POV non marqué. Personnage présent puis absent sans sortie. Incohérence de lieu ou d'heure entre scènes consécutives. Rupture de continuité temporelle.

**L3 — Prose.** Répétition de n-grammes au-delà d'un seuil par millier de mots. Phrase d'ouverture répétée. Tics lexicaux. Distribution de longueurs de phrase pathologiquement plate ou explosive. Densité d'adverbes, voix passive.

**S — Style.** Profil de référence verrouillé, puis dérive mesurée par fenêtre glissante et rupture locale. Mesure présentée comme estimation tant qu'elle n'est pas calibrée sur corpus.

---

## 7. Registre de signatures de slop

L'anti-slop actuel est une liste de mots interdits dans un prompt. La proposition est un registre déclaratif, versionné et testable, vivant à côté des données de projet :

- une signature n'est pas un mot mais une **famille de motifs** avec un contexte autorisé ;
- chaque signature porte un **exemple et un contre-exemple**, ce qui rend la calibration possible ;
- chaque signature porte un **seuil par millier de mots**, donc un tic rare reste toléré ;
- la détection produit un `Finding` avec extrait exact, jamais une réécriture ;
- le registre est modifiable sans toucher au code, ce qui permet l'usage multilingue.

Le registre détecte. Il ne masque rien et n'insère rien.

Voir l'annexe A : une référence externe (sloptrim, Apache-2.0) fournit un procédé documenté, mesuré et testé pour construire ce registre.

---

## 8. Provenance explicite au lieu d'un marquage caché

Un marqueur dissimulé dans les motifs de mots est un canal covert : il survit mal à la paraphrase, il est illisible pour l'auteur et il prête à accusation de traçage silencieux. La proposition est une provenance **visible et vérifiable** :

- identité du générateur, version du modèle, profil utilisé ;
- empreinte du contenu inspecté ;
- identifiant du rapport d'intégrité lié ;
- statut éditorial de l'artefact (proposé, accepté, rejeté).

Ces informations vivent dans les métadonnées du projet, pas dans les phrases. Si un marquage de contenu reste souhaité pour un usage de publication, il devient une décision distincte, documentée, avec ses propres garanties et son propre périmètre — pas une conséquence implicite du détecteur.

---

## 9. Réponses du système immunitaire

Le système observe et propose. Il n'écrit jamais en silence.

| Sévérité | Réponse autorisée | Confirmation humaine |
|---|---|---|
| info | journalisation | non |
| low | signalement | non |
| medium | signalement + suggestion | non |
| high | signalement + proposition de correction en aperçu | oui |
| blocking | blocage de la promotion vers le canon | oui |

Toute correction suit le modèle des propositions du Synopsis Studio : identifiant, version source, diff, état de revue, historique append-only. Une correction automatique appliquée sans revue est hors périmètre, y compris pour les détecteurs déterministes.

---

## 10. Déterminisme, seuils et garde-fous

- Tous les seuils vivent dans un fichier versionné, jamais dans le code.
- Chaque `Finding` porte la nature de sa mesure : déterministe, statistique ou probabiliste.
- Un mode simulé reste possible pour les démonstrations, mais il doit être **explicite** et ne peut jamais produire un statut de réussite. C'est la correction directe du point I4.
- Une métrique non calibrée est publiée comme estimation, jamais comme garantie.
- La sortie d'un détecteur est reproductible : même entrée, même configuration, mêmes findings. Le juge LLM est isolé pour préserver cette propriété sur le reste du moteur.

---

## 11. Tests et schémas

- JSON Schema pour chaque structure persistée, avec test de validation et test de compatibilité ascendante.
- Tests de propriétés (hypothesis déjà présent) : déterminisme, stabilité de `finding_id`, invariance à la mise en forme.
- Corpus de référence : un corpus de prose humaine comme **contrôle des faux positifs**, distinct du corpus de régression.
- Tests de non-régression par détecteur, avec findings attendus figés.
- Preuve négative obligatoire : un corpus volontairement sain ne doit produire aucun finding bloquant.

---

## 12. Voie RAG

Le socle existe : `StoryGraph`, `GraphRAG`, ingestion de projet, timeline et arcs. Trois corrections sont nécessaires avant de s'appuyer dessus :

1. remplacer le vecteur de hachage à 26 dimensions par une représentation sémantique réelle, ou cesser d'appeler la mesure « similarité cosinus » ;
2. indexer non seulement le canon mais aussi les findings acceptés et rejetés, pour que le moteur ne ressignale pas ce qui a déjà été arbitré ;
3. alimenter le juge LLM par récupération sur le canon plutôt que par le texte complet, pour réduire les contradictions inventées.

---

## 13. Découpage en gates

| Gate | Contenu | Preuve de sortie |
|---|---|---|
| G0 | Arbitrage des incohérences I1 à I3 et validation de la taxonomie | conception approuvée, aucune ligne de code |
| G1 | Schémas, identifiants stables, registre de findings | schémas validés, tests de schéma au vert, aucun détecteur |
| G2 | Détecteurs déterministes L1, L2, L3 sur corpus existant | résultats reproductibles, contrôle de faux positifs documenté |
| G3 | Profil de style verrouillé et mesure de dérive | métrique calibrée ou explicitement étiquetée estimation |
| G4 | Registre de signatures de slop et détection instrumentée | remplacement effectif des listes en dur, seuils versionnés |
| G5 | Juge LLM et voie RAG | juge isolé, non-déterminisme confiné, RAG alimenté par le canon |

Chaque gate se termine sur une preuve exécutable. Aucune gate ne franchit un statut publié, ni ne consomme de quota sans autorisation.

---

## 14. Hors périmètre V1

- Toute réécriture automatique sans confirmation humaine.
- Tout marquage caché dans les motifs de mots.
- Correction du canon sans passer par une proposition.
- Remplacement des rapports visuels existants et de leurs seuils annoncés.
- Toute forme de preuve de production, de VR, de GPU ou de qualité éditoriale finale.
- Publication, publication de paquet, tag ou version.

---

## 15. Décisions attendues

1. Moteur unique à deux axes, ou maintien assumé de deux modules séparés avec deux registres distincts ?
2. Taxonomie retenue : L0 canon, L1 structure, L2 scènes, L3 prose, S transversal ?
3. Source du profil de style verrouillé : quels artefacts servent de référence, et qui le verrouille ?
4. Aucun marquage lexical caché en V1 — confirmation ?
5. Corpus de contrôle des faux positifs : quel matériau humain de référence est autorisé ?
6. Persistance du registre de findings : fichier de projet versionné, ou base de données ?
7. Référence sloptrim : adaptation du procédé vers un catalogue original francophone, ou dépendance directe avec attribution ?

---

## 16. Ce qui n'est pas prouvé

Cette conception n'affirme rien sur la qualité du résultat final. Elle établit que le jeu d'idées est cohérent une fois les points I1 à I3 arbitrés, que l'existant du dépôt peut être réutilisé sans réécriture, et que les incohérences I4 à I9 sont des constats vérifiables sur les fichiers cités. Aucune mesure de dérive stylistique, aucun taux de détection et aucun gain qualitatif n'est démontré à ce stade.

---

## Annexe A — Référence externe : sloptrim (Apache-2.0)

**Identité.** Dépôt `seyedehsanhadi/sloptrim`, version 0.9.3, dernier envoi le 16 septembre 2026, licence Apache-2.0, copyright 2026 Seyed Ehsan Hadi. Le fichier NOTICE ne déclare qu'un tiers : une police Archivo embarquée dans le logo, sous licence OFL. Aucun code tiers n'y est listé. Le corpus de mesure n'est pas redistribué : seuls les résultats agrégés et le harnais de reproduction le sont. Sources analysées en lecture seule dans un répertoire temporaire le 21 septembre 2026.

**Procédé.** Détecteur local de motifs d'écriture : bibliothèque standard Python uniquement, aucun réseau, aucun modèle. Un score 0-100 est calculé contre un catalogue documenté de 71 motifs. Il analyse la prose, jamais le code.

**Ce qui confirme notre conception.** Le choix d'un détecteur déterministe, hors ligne et sans modèle est déjà éprouvé à cette échelle, avec 142 tests Python, 72 contrôles de hooks et une CI sur Linux, Windows et macOS. Notre §10 et notre priorité au déterministe ne sont donc pas une précaution théorique : c'est la voie qui tient.

**Discipline à reprendre.**

1. **Motifs rétrogradés, jamais supprimés.** Sur 71 motifs documentés, 62 ont un détecteur, 50 peuvent déplacer le score, et 12 sont rapportés sans aucun poids, parce que la mesure a montré qu'ils marquaient le registre formel plutôt que l'origine machine. Deux motifs typographiques (guillemets courbes, trait d'union au lieu du tiret demi-cadratin) sont explicitement reportés sans note. C'est la réponse directe au constat I6 : remplacer une liste de mots interdits par un catalogue pondéré et versionné, dont les entrées non concluantes restent visibles mais ne pèsent pas.
2. **Plancher de taille.** En dessous de 120 mots, le score n'est pas calculé, car un extrait court peut changer de bande sur une seule phrase. Notre conception n'avait pas cette garde.
3. **Cinq bandes, deux seuils.** `clean`, `light tells`, `mixed`, `heavy tells`, `pervasive tells` ; l'avertissement se déclenche au-dessus de 40, ou de 20 en mode strict. Les seuils sont paramétrés, pas dispersés dans le code.
4. **Troncature déclarée.** L'analyse s'arrête à 262 144 caractères et le rapport porte `truncated` et `scanned_chars` : un rapport partiel ne peut pas ressembler à un rapport complet.
5. **Confiance déclarée.** Chaque rapport porte un niveau de confiance et sa raison, par exemple : 111 mots, sous le plancher, donc une phrase peut changer la bande. La mesure dit sa propre fragilité.
6. **Tests qui vérifient les affirmations.** Un test dédié compare ce que les documents décrivent à ce que le code fait ; un autre interdit toute connexion réseau ; un troisième fixe les planchers de score et les preuves requises pour les relever, avec un texte humain de contrôle. C'est l'antidote exact au constat I4, où la documentation annonçait 0,80 pendant que le code écrivait 0,15.
7. **Preuve mesurée, limites dites.** Banc public apparié (30 humains et 30 machines par bras, cinq bras), ROC-AUC de 0,762 à 0,946, intervalles bootstrap appariés sur 10 000 rééchantillonnages, jeu de données épinglé par commit et empreinte, harnais qui refuse tout autre fichier. Les auteurs précisent eux-mêmes qu'une AUC mesure un rang, pas une exactitude au seuil, et que la sensibilité s'effondre sous paraphrase (bras « humanized », 0,762). Aucune de ces limites n'est dissimulée.

**Mesure faite ici.** Deux textes français écrits pour l'occasion ont été passés au détecteur, sans modifier son code. Le premier est un passage factuel et daté ; le second empile les tics classiques de la prose générée en français (« dans un monde où », « il est important de noter », « joue un rôle crucial », « non seulement… mais », « véritable témoignage de l'ingéniosité humaine », tiret cadratin, « en conclusion », « il convient de souligner », « riche et complexe », « ouvre la voie à d'innombrables possibilités », tricolon final).

| Extrait | Score | Bande | Motifs déclenchés |
|---|---:|---|---:|
| Français factuel (148 mots) | 0 | `clean` | 0 |
| Français empilant les tics (111 mots) | 8 | `clean` | 2 |

Le second texte, saturé de tics français caractéristiques, obtient 8 sur 100 et se classe dans la bande la plus propre. Seuls deux motifs ont réagi : une occurrence de vocabulaire IA et la monotonie de longueur de phrase, qui est un détecteur statistique. Le catalogue lexical, lui, n'a rien vu.

**Ce qui se transpose.** L'architecture, la discipline de preuve, la troncature déclarée, le plancher de taille, la confiance déclarée, le nettoyage des caractères invisibles et les détecteurs statistiques de rythme. Ces éléments sont linguistiquement neutres.

**Ce qui ne se transpose pas.** Le catalogue de motifs. Il est anglophone : vocabulaire IA, suffixes en -ing, absence de contractions, guillemets courbes, tiret cadratin. Nos contenus sont majoritairement francophones et la mesure ci-dessus le montre : le transfert lexical direct ne fonctionne pas. Les familles de motifs doivent être reconstruites pour le français, et les poids ne sont pas transposables tels quels.

**La contradiction sur les tags cachés — point décisif.** Le nettoyeur `--clean` de sloptrim supprime précisément ce qu'une chaîne cachée utilise : espaces de largeur nulle, jointeurs, marque de BOM en milieu de texte, homoglyphes, sélecteurs de variation sans glyphe porteur, et surtout les charges utiles du bloc de balises Unicode (U+E0000 à U+E007F). Ses tests traitent explicitement ces charges comme des canaux cachés sans fonction. Autrement dit, un « meta tag caché dans les patterns de mots » serait vu par un détecteur de cette famille comme un débris à supprimer, et les deux fonctionnalités se combattraient. ETHICS.md va dans le même sens : le nettoyage y est présenté comme générique, avec la consigne explicite de ne pas s'en servir pour dissimuler une provenance requise. Cela **renforce la recommandation I3** : provenance explicite en métadonnées, aucun marqueur invisible dans le texte.

**Le piège francophone à retenir.** La règle de leur nettoyeur est qu'un caractère n'est retiré que s'il n'a aucun rôle, et leurs tests la verrouillent sur 18 cas à conserver : espace insécable avant la ponctuation française, espace fine insécable dans un nombre, guillemets français, plus des cas persan, arabe, mongol, khmer et thaï. Un nettoyeur anglophone mal transposé détruirait la typographie française : espace insécable avant le point d'interrogation, le point d'exclamation, le deux-points et le point-virgule, et guillemets français. Toute reprise de ce procédé doit être validée par un corpus de contrôle francophone.

**Obligations de licence.** Apache-2.0 autorise la réutilisation, la modification et la redistribution, y compris depuis un projet MIT, sous trois conditions : conserver la mention de copyright et le texte de licence, signaler les fichiers modifiés, et conserver l'attribution. Le corpus de mesure n'est pas couvert : sloptrim ne le redistribue pas et il ne nous est pas transférable. Si nous reprenons du code, il faut décider où vit le fichier NOTICE et comment l'attribution apparaît dans le paquet publié. Si nous n'adaptons que le procédé et écrivons notre propre implémentation, aucune obligation de licence ne porte sur nos fichiers ; l'attribution reste une bonne pratique de provenance. Cette lecture n'est pas un avis juridique et doit être confirmée avant toute publication.

**Ce que cette annexe ne prouve pas.** Les deux extraits français sont des illustrations de trois cents mots au total, pas un banc d'essai : ils montrent qu'un catalogue anglophone ne voit pas les tics français, ils ne mesurent pas ce qu'un catalogue français atteindrait. Aucun taux de détection n'a été établi sur nos contenus. Le code de sloptrim n'a pas été modifié ni intégré. Rien ici ne prouve la qualité du résultat final, ni ne remplace une validation sur corpus francophone.

---

## Annexe B — État d'implémentation (21 septembre 2026)

Les sections 1 à 16 restent la conception de référence. Cette annexe décrit ce qui a été construit, mesuré, corrigé, et ce qui reste ouvert.

### Livré

| Élément | Contenu |
|---|---|
| Paquet | `src/narrative_integrity/` : 15 modules (taxonomie, constats, seuils, entrée, texte, slop, détecteurs, canon, style, immunité, provenance, juge, moteur, interface, pont de prompts) |
| Données versionnées | `data/narrative_integrity_v1.json` (seuils, bandes, politique) et `data/slop_signatures_fr_v1.json` (26 signatures originales, dont 2 rétrogradées à poids nul) |
| Schémas | 4 JSON Schema : rapport, constat, signature, profil de référence |
| Tests | 7 fichiers, 78 tests : déterminisme, stabilité d'identité, schémas, typographie française, canaux cachés, signatures, détecteurs, moteur, pont de prompts |
| Service existant | `backend/hermes_novelist_service.py` : la liste de mots interdits en dur est remplacée par une guidance dérivée du catalogue, avec repli conservé si le catalogue est indisponible |

### Gates

G1 à G4 sont couvertes. G5 est partielle : le seam du juge existe et échoue en mode fermé, aucun juge réel n'est branché, et la voie RAG n'est pas encore alimentée par le canon. Les détecteurs déterministes et statistiques fonctionnent sans juge.

### Mesures réalisées

| Mesure | Résultat |
|---|---|
| Catalogue anglophone de référence sur un texte français saturé de tics | 8 sur 100, bande `clean`, 2 motifs |
| Ce moteur, même texte | 100 sur 100, bande `pervasive_tells`, 14 constats |
| Corpus de contrôle humain français | score 0.0, bande `clean`, aucun constat de sévérité moyenne ou supérieure |
| Classes sans poids | rapportées et sans effet sur le score, vérifié par test |
| Déterminisme | même entrée, même rapport, y compris sous test de propriété |

### Défauts trouvés et corrigés pendant l'implémentation

1. Un backslash-b dans une chaîne Python non brute devenait un caractère de retour arrière : le détecteur de voix passive ne matchait rien. Corrigé par des chaînes brutes, verrouillé par un test dédié.
2. Le découpage en mots excluait les alphabets cyrillique et grec, donc la détection d'homoglyphes était aveugle. Corrigé par un découpage dédié.
3. La classe d'apostrophes du catalogue était mal construite, avec des crochets doublés. Détecté par la compilation des motifs.

### Ce qui reste non prouvé

- Les seuils, les poids et la courbe de score ne sont pas calibrés. Ils sont déclarés comme tels dans les données et rapportés comme estimation.
- Le plancher de dérive de style vaut provisoirement 0,62 et n'est pas le 0,80 annoncé par la présentation publique, qui n'était pas mesuré.
- Aucun taux de détection n'a été établi sur un corpus francophone.
- Le juge qualitatif n'est pas branché ; il ne peut ni certifier une mesure ni écraser un constat déterministe.
- Aucune écriture sur un artefact canonique : le moteur observe et propose, et un test vérifie qu'aucun constat ne peut être marqué comme appliqué.
- Les couches sans matière déclarent leur portée partielle ou leur absence plutôt que de conclure.

### Utilisation

```text
python -m src.narrative_integrity.cli chemin/vers/prose.md --with-provenance
```
