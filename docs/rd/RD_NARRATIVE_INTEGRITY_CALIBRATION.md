# Calibration du moteur d'integrite narrative — mesure de faux positifs (francais)

**Date :** 21 septembre 2026
**Perimetre :** `src/narrative_integrity`, seuils `narrative_integrity_v1` (empreinte 9bf3d281...), catalogue `slop_signatures_fr_v1`
**Statut :** mesure reelle sur corpus versionne. Aucun taux de detection n'est annonce.

---

## 1. Ce qui est mesure, et ce qui ne l'est pas

**Mesure :** le taux de faux positifs sur de la prose humaine francaise, la repartition par bande, la densite de constats pour 1000 mots, l'exactitude des bornes statistiques, et depuis qu'une armure machine existe, le taux de detection et l'AUC sur trois regimes.

**Non mesure :** toute precision par document. Une AUC est une mesure de rang : elle ne dit pas si un texte donne sera classe correctement.

**Le resultat de detection est negatif.** Il est detaille en section 9, et il est important : le moteur ne reconnait pas l'origine machine d'un texte.

---

## 2. Corpus

Fichiers : `corpus_fr_v1.json` pour les deux armures humaines, puis `corpus_fr_machine_v1.json`, `corpus_fr_machine_modern_v1.json` et `corpus_fr_machine_promo_v1.json` pour les trois regimes machines. Construits par `scripts/build_narrative_integrity_corpus.py` et `scripts/build_narrative_integrity_machine_arm.py`.

| Armure | Registre | Documents | Mots |
|---|---|---:|---:|
| humaine, domaine public | recit litteraire, XVIIIe a XXe siecle | 18 | 22 536 |
| humaine, projet | documentation technique moderne | 4 | 860 |
| machine, continuation | suite d'un extrait litteraire | 6 | 1 250 |
| machine, moderne | note de conception appariee par sujet | 4 | 868 |
| machine, promotionnel | article provoque, sujet apparie | 4 | 868 |
| **total** | | **36** | **26 382** |

Les trois regimes machines sont produits localement, sans aucun envoi externe, et la contamination est mesuree pour chacun : la part des n-grammes de huit mots de la reponse qui figuraient deja dans le prompt. Elle vaut zero partout, donc l'armure machine n'est pas un echo du texte humain.

Six oeuvres : Voltaire, Stendhal, Flaubert, Hugo, Proust (deux volumes). Les extraits sont pris a positions regulieres apres retrait des pages de titre et des mentions du distributeur. Textes du domaine public ; source et empreinte amont enregistrees par document ; seuls des extraits sont conserves, jamais une oeuvre entiere, et aucune mention du distributeur n'est reproduite.

Le corpus declare lui-meme ses limites, et elles comptent :

1. Le recit du XVIIIe et du XIXe siecle ne contient aucun des tics modernes. Un faible taux y est donc une preuve faible pour l'ecriture contemporaine.
2. La prose projet est technique, pas narrative, et quatre documents seulement la representent.
3. Dix oeuvres, c'est peu de grappes : tout intervalle bootstrap sera large.

---

## 3. Resultats

| Mesure | Valeur |
|---|---|
| Taux de faux positifs, seuil d'avertissement 40 | 0,000 |
| Intervalle bootstrap par grappes | [0,000 ; 0,000], ecrase a la borne |
| Borne superieure exacte, par document (n = 22) | 12,73 % |
| Borne superieure exacte, par oeuvre (n = 10) | 25,89 % |
| Bandes observees | 22 documents sur 22 en `clean` |
| Constats pour 1000 mots | 0,94 |
| Score maximal observe | 10,19 (Proust) |

**Lecture.** Aucune des dix oeuvres n'a ete signalee, et aucun document ne depasse 11 sur 100. L'intervalle bootstrap s'ecrase a zero parce qu'aucun reechantillonnage ne contient le moindre document signale : il ne faut pas le lire comme une certitude. La borne exacte dit ce que les donnees supportent vraiment : avec dix oeuvres et aucun signalement, le taux reste borne autour de 26 % au niveau des oeuvres. Ce n'est pas le moteur qui fixe cette borne, c'est le nombre d'oeuvres du corpus.

**Detail par armure.**

| Armure | Documents | Mots | Score moyen | Score max | Constats / 1000 mots |
|---|---:|---:|---:|---:|---:|
| litteraire, domaine public | 18 | 22 536 | 0,732 | 10,19 | 0,843 |
| projet, moderne | 4 | 860 | 0,000 | 0,00 | 3,488 |

La prose projet affiche une densite de constats plus elevee malgre un score nul : elle est courte, et un ou deux constats de faible severite suffisent a faire monter un taux calcule sur 860 mots. C'est un artefact de taille d'echantillon, pas un signal.

---

## 4. Ce que la mesure a change

Le detecteur `prose.opener_repetition` se declenchait sur 7 documents litteraires. Cause identifiee : l'anaphore narrative. « Il y », « elle ne », « ce qui » sont des liens pronominaux, pas de la monotonie. Une regle a ete ajoutee : une ouverture repetee n'est exemptee que si son premier mot est un pronom et si tous ses mots sont grammaticaux. « Dans le », « le vieux » et « personne ne » restent signales, et l'anaphore elle-meme reste visible dans les mesures, sans poids.

| Indicateur | Avant | Apres |
|---|---:|---:|
| Documents declenchant l'ouverture repetee | 7 | 5 |
| Constats pour 1000 mots | 1,111 | 0,94 |

Gain modeste, et mesure. Les cinq documents restants declenchent sur des ouvertures porteuses de contenu, ce qui est un choix litteraire legitime : c'est le comportement attendu d'un detecteur qui prefere signaler trop tot que jamais, et le registre d'arbitrage permet de trancher une fois pour toutes.

---

## 5. Observations volontairement laissees telles quelles

Le catalogue a produit, sur 23 000 mots de prose humaine, une poignee de constats de classe non nulle : deux densites de passif, deux adverbes intensifs, une occurrence de « non seulement… mais », une abstraction humaniste, une question rhetorique. Ce sont des occurrences isolees, parfois une seule dans tout le corpus.

Je ne modifie pas les tolerances ni les poids sur un point de donnee. Ce serait de la retouche non mesuree, exactement ce que cette gate reproche ailleurs. Arbitrer ces classes demande un corpus sensiblement plus large, et cette decision vous revient.

---

## 6. Bornes du harnais

Le calcul de l'AUC, des intervalles bootstrap et des bornes exactes est verifie sur des cas construits : separation parfaite, inversion parfaite, ex aequo avec rangs moyens, classe unique absente. Le chargement du corpus est refuse si le texte ne correspond pas a son empreinte ou si le nombre de mots declare diverge. Un test compare le fichier de resultats enregistre a une execution neuve : si un seuil ou un detecteur change, l'artefact doit etre regenere, faute de quoi la mesure devient un vestige.

---

## 7. Reproduire

```text
python scripts/build_narrative_integrity_corpus.py
python -m src.narrative_integrity.calibration tests/data/narrative_integrity/calibration/corpus_fr_v1.json --out tests/data/narrative_integrity/calibration/results_fr_v1.json
```

---

## 8. Ce que cette mesure ne dit pas

Elle ne dit rien sur la prose francaise moderne narrative ou parlee, qui n'est pas representee. Elle ne dit rien sur la qualite editoriale d'un texte, ni sur l'auteur. Et elle ne dit rien sur les autres modeles : un seul modele a ecrit l'armure machine.

---

## 9. Detection : le resultat est negatif

Chaque document machine est la reponse du modele local au document humain qui lui est apparie. Les deux bras sont donc apparies par construction, ce qui autorise le bootstrap par paires plutot qu'un intervalle sur des echantillons independants.

| Regime machine | Paires | AUC appariee | Intervalle | Taux de detection | Faux positifs sur paires |
|---|---:|---:|---|---:|---:|
| continuation d'un classique | 6 | 0,417 | 0,25 a 0,50 | 0,00 | 0,00 |
| note de conception moderne | 4 | 0,625 | 0,50 a 0,875 | 0,25 | 0,00 |
| article promotionnel provoque | 4 | 0,625 | 0,50 a 0,875 | 0,25 | 0,00 |

AUC groupee, toutes armures confondues : 0,49. Sur 36 documents et 26 382 mots, un seul texte machine franchit le seuil d'avertissement : un article promotionnel, a 44,6 sur 100.

**Lecture.** Le moteur ne reconnait pas l'origine machine d'un texte. L'AUC groupee vaut le hasard, et l'intervalle apparie descend jusqu'a 0,25 : avec quatre a six paires, la mesure ne tranche pas, mais rien dans ces donnees ne soutient une capacite de detection.

C'est coherent avec ce que le moteur annonce etre. Il ne mesure pas un auteur, il mesure des motifs de prose documentes. Un modele competent qui redige une note de conception en francais ne produit pas ces motifs ; meme lorsqu'on lui demande explicitement le registre promotionnel, il n'en produit qu'episodiquement, une fois sur quatre ici.

Trois causes restent indiscernables dans ces donnees : un catalogue trop etroit, des textes trop courts, ou une generation trop propre. Un texte machine long, un registre degrade, ou plusieurs modeles changeraient la mesure. En l'etat, je ne peux annoncer aucun taux de detection superieur au hasard.

Et cela ne vaut que pour ce qui a ete mesure : quatorze paires, un seul modele, des textes d'environ deux cents mots. Rien ici ne se generalise a un autre modele, a un autre registre, ni a une autre longueur.
