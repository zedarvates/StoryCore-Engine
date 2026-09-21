# Calibration du moteur d'integrite narrative — mesure de faux positifs (francais)

**Date :** 21 septembre 2026
**Perimetre :** `src/narrative_integrity`, seuils `narrative_integrity_v1` (empreinte 9bf3d281...), catalogue `slop_signatures_fr_v1`
**Statut :** mesure reelle sur corpus versionne. Aucun taux de detection n'est annonce.

---

## 1. Ce qui est mesure, et ce qui ne l'est pas

**Mesure :** le taux de faux positifs sur de la prose humaine francaise, la repartition par bande, la densite de constats pour 1000 mots, et l'exactitude des bornes statistiques.

**Non mesure :** le taux de detection, l'AUC, et toute precision par document. Ces mesures exigent une armure de textes machines. Le corpus n'en contient aucune et le harnais n'en fabrique pas : il faudrait soit un corpus externe, soit un appel de modele autorise. C'est precisement ce que la gate suivante rendra possible.

---

## 2. Corpus

Fichier : `tests/data/narrative_integrity/calibration/corpus_fr_v1.json`, empreinte `a3a21a92...`, construit par `scripts/build_narrative_integrity_corpus.py`.

| Armure | Registre | Documents | Mots |
|---|---|---:|---:|
| humaine, domaine public | recit litteraire, XVIIIe a XXe siecle | 18 | 22 536 |
| humaine, projet | documentation technique moderne | 4 | 860 |
| **total** | | **22** | **23 396** |

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

Elle ne dit rien sur la capacite du moteur a reconnaitre un texte machine : cette capacite n'a pas ete mesuree, et le harnais est pret a la mesurer le jour ou une armure machine existe. Elle ne dit rien sur la prose francaise moderne narrative ou parlee. Elle ne dit rien sur la qualite editoriale d'un texte, ni sur l'auteur.
