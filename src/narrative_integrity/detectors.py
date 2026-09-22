"""Layer detectors. Deterministic and statistical first, no judge required."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Sequence, Tuple

from .findings import Evidence, Finding
from .input_model import ActInput, BeatInput, SceneInput
from .taxonomy import ControlFamily, Determinism, NarrativeLayer, Severity
from .text_scan import (
    adverb_rate,
    coefficient_of_variation,
    count_words,
    degenerate_repetition,
    hidden_channel_scan,
    opener_repetition,
    passive_ratio,
    sentence_lengths,
    split_sentences,
)

POV_CHANGE_MARKERS = (
    "point de vue",
    "pov",
    "de son cote",
    "pendant ce temps",
    "ailleurs",
    "plus tard",
)

EXIT_MARKERS = (
    "sort",
    "sortit",
    "part",
    "partit",
    "quitte",
    "quitta",
    "s'en va",
    "s'en alla",
    "disparait",
    "est absent",
)

# One prefix for every scene-level locus, so the shape of a locus stays a constant
# rather than a literal repeated in each detector.
SCENE_LOCUS_PREFIX = "scene:"

# Sentence openings led by a pronoun are anaphora, a legitimate device in narrative
# prose: "Il y", "Elle ne", "Ce qui". Repetition of a pronoun link is not monotony.
# Openings led by an article or a preposition stay reportable, because "Dans le",
# repeated three times, is a formulaic opener.
PRONOUN_LEAD = frozenset(
    {
        "je", "tu", "il", "elle", "on", "nous", "vous", "ils", "elles",
        "ce", "cet", "cette", "ces", "cela", "ça", "ca", "celui", "celle",
        "ceux", "celles", "qui", "que", "qu", "quoi", "dont", "où", "ou",
        "y", "en", "se", "me", "te", "moi", "toi", "soi", "lui", "leur", "leurs",
    }
)

FUNCTION_WORD_SET = frozenset(
    {
        "le", "la", "les", "l", "un", "une", "des", "du", "de", "d",
        "à", "a", "au", "aux", "dans", "sur", "sous", "par", "pour", "avec",
        "sans", "vers", "chez", "entre", "contre", "depuis", "pendant",
        "après", "apres", "avant",
        "et", "ou", "ni", "mais", "car", "donc", "or", "ne", "n", "pas", "plus",
        "moins", "que", "qu", "quand", "comme", "si", "lorsque", "puisque",
        "est", "sont", "était", "etait", "étaient", "etaient",
        "été", "ete", "être", "etre", "sera", "seront", "serait",
        "fut", "furent", "avait", "avaient", "ont", "ai", "as", "avons", "avez",
        "y", "en", "se", "me", "te", "lui", "leur", "leurs",
    }
)

# Pronoun links count as function words: the rule is about the whole opening.
FUNCTION_WORD_SET = frozenset(set(FUNCTION_WORD_SET) | set(PRONOUN_LEAD))


def is_anaphoric_opener(opener: str) -> bool:
    """True when a repeated opener is a pronoun link rather than a content phrase."""

    tokens = [token for token in str(opener).split() if token]
    if not tokens or tokens[0] not in PRONOUN_LEAD:
        return False
    return all(token in FUNCTION_WORD_SET for token in tokens)


def _finding(**kwargs: Any) -> Finding:
    return Finding(**kwargs)


def inspect_text_hygiene(
    text: str, settings: Dict[str, Any], input_hash: str
) -> Tuple[List[Finding], Dict[str, Any]]:
    """Hidden channels in prose. Detection only: this engine never inserts them."""

    scan = hidden_channel_scan(text, settings)
    findings: List[Finding] = []
    if scan.get("tag_block"):
        findings.append(
            _finding(
                layer=NarrativeLayer.PROSE,
                control_family=ControlFamily.DETERMINISTIC,
                detector_id="prose.hidden_tag_block",
                severity=Severity.HIGH,
                locus="hidden_channels:tag_block",
                determinism=Determinism.DETERMINISTIC,
                confidence=1.0,
                confidence_basis="Unicode tag block range is exact, not heuristic",
                evidence=[
                    Evidence(
                        excerpt="<" + str(scan["tag_block"]) + " tag-block code points>",
                        locus="hidden_channels:tag_block",
                        detail="Variation selectors, zero-width joiners and tag payloads "
                        "carry no meaning in prose. Provenance belongs in metadata.",
                    )
                ],
                remediation="Retirer les caracteres invisibles avant publication.",
                input_hash=input_hash,
            )
        )
    if scan.get("zero_width") or scan.get("bom_mid_text"):
        findings.append(
            _finding(
                layer=NarrativeLayer.PROSE,
                control_family=ControlFamily.DETERMINISTIC,
                detector_id="prose.hidden_zero_width",
                severity=Severity.MEDIUM,
                locus="hidden_channels:zero_width",
                determinism=Determinism.DETERMINISTIC,
                confidence=0.9,
                confidence_basis="Zero-width characters are hidden channels in Latin prose",
                evidence=[
                    Evidence(
                        excerpt="<"
                        + str(int(scan.get("zero_width", 0)) + int(scan.get("bom_mid_text", 0)))
                        + " zero-width code points>",
                        locus="hidden_channels:zero_width",
                        detail="Preserved where they carry meaning, for example inside "
                        "Persian, Thai or Indic text.",
                    )
                ],
                remediation="Verifier l'origine de ces caracteres avant publication.",
                input_hash=input_hash,
            )
        )
    if scan.get("homoglyph_runs"):
        findings.append(
            _finding(
                layer=NarrativeLayer.PROSE,
                control_family=ControlFamily.DETERMINISTIC,
                detector_id="prose.mixed_script",
                severity=Severity.MEDIUM,
                locus="hidden_channels:mixed_script",
                determinism=Determinism.DETERMINISTIC,
                confidence=0.7,
                confidence_basis="Mixed-script tokens can be legitimate transliteration",
                evidence=[
                    Evidence(excerpt=token, locus="chars", detail="Latin mixed with Cyrillic or Greek")
                    for token in scan["homoglyph_runs"][:5]
                ],
                remediation="Confirmer que le melange d'alphabets est voulu.",
                input_hash=input_hash,
            )
        )
    return findings, scan


def inspect_prose(
    text: str, thresholds, input_hash: str
) -> Tuple[List[Finding], Dict[str, Any]]:
    """L3: repetition, rhythm and register measures on the prose itself."""

    settings = thresholds.section("prose")
    findings: List[Finding] = []
    sentences = split_sentences(text)
    lengths = sentence_lengths(sentences)
    word_total = count_words(text)

    metrics: Dict[str, Any] = {
        "words": word_total,
        "sentences": len(sentences),
        "sentence_length_cv": coefficient_of_variation(lengths),
    }

    if len(sentences) < int(settings.get("min_sentences", 5)):
        metrics["applicable"] = False
        metrics["note"] = "too few sentences for rhythm measures"
        return findings, metrics
    metrics["applicable"] = True

    repetition = degenerate_repetition(
        text,
        n=int(settings.get("ngram_n", 6)),
        min_words=int(settings.get("ngram_min_words", 18)),
        rate_threshold=float(settings.get("ngram_repeat_rate", 0.2)),
    )
    metrics["ngram_repetition"] = repetition
    if repetition.get("exceeds"):
        findings.append(
            _finding(
                layer=NarrativeLayer.PROSE,
                control_family=ControlFamily.STATISTICAL,
                detector_id="prose.ngram_repetition",
                severity=Severity.MEDIUM,
                locus="prose:repetition",
                determinism=Determinism.STATISTICAL,
                confidence=0.7,
                confidence_basis="Repeated n-gram rate above the configured threshold",
                evidence=[
                    Evidence(
                        excerpt=item["ngram"],
                        locus="ngram",
                        detail="repeated " + str(item["count"]) + " times",
                    )
                    for item in repetition.get("repeats", [])[:5]
                ],
                remediation="Varier les formulations repetees. Proposition seulement.",
                input_hash=input_hash,
            )
        )

    openers = opener_repetition(sentences, int(settings.get("opener_min_repeats", 3)))
    reportable = [item for item in openers if not is_anaphoric_opener(item["opener"])]
    anaphoric = [item for item in openers if is_anaphoric_opener(item["opener"])]
    metrics["opener_repetition"] = reportable
    metrics["anaphoric_openers"] = anaphoric
    for opener in reportable:
        findings.append(
            _finding(
                layer=NarrativeLayer.PROSE,
                control_family=ControlFamily.DETERMINISTIC,
                detector_id="prose.opener_repetition",
                severity=Severity.LOW,
                locus="prose:opener:" + opener["opener"],
                determinism=Determinism.DETERMINISTIC,
                confidence=0.8,
                confidence_basis="Identical first two words counted exactly",
                evidence=[
                    Evidence(
                        excerpt=sentences[position][:120],
                        locus="sentence:" + str(position),
                        detail="opener '" + opener["opener"] + "'",
                    )
                    for position in opener["sentences"][:3]
                ],
                remediation="Varier les ouvertures de phrase.",
                input_hash=input_hash,
            )
        )

    cv = metrics["sentence_length_cv"]
    floor = float(settings.get("sentence_length_cv_min", 0.35))
    metrics["monotonous"] = bool(cv is not None and cv < floor)
    if cv is not None and cv < floor:
        findings.append(
            _finding(
                layer=NarrativeLayer.PROSE,
                control_family=ControlFamily.STATISTICAL,
                detector_id="prose.sentence_monotony",
                severity=Severity.MEDIUM,
                locus="prose:sentence_length",
                determinism=Determinism.STATISTICAL,
                confidence=0.65,
                confidence_basis="Coefficient of variation below the configured floor",
                evidence=[
                    Evidence(
                        excerpt="cv=" + str(round(cv, 3)) + " below " + str(floor),
                        locus="prose:sentence_length",
                        detail="Uniform sentence lengths across " + str(len(sentences)) + " sentences",
                    )
                ],
                remediation="Alterner phrases courtes et longues.",
                input_hash=input_hash,
            )
        )

    adverbs = adverb_rate(text)
    metrics["adverbs"] = adverbs
    adverb_floor = float(settings.get("adverb_rate_per_1000", 25.0))
    if adverbs["rate_per_1000"] > adverb_floor:
        findings.append(
            _finding(
                layer=NarrativeLayer.PROSE,
                control_family=ControlFamily.STATISTICAL,
                detector_id="prose.adverb_density",
                severity=Severity.LOW,
                locus="prose:adverbs",
                determinism=Determinism.STATISTICAL,
                confidence=0.6,
                confidence_basis="Heuristic on -ment endings with a noun stoplist",
                evidence=[
                    Evidence(
                        excerpt=", ".join(adverbs["samples"][:6]),
                        locus="prose:adverbs",
                        detail="rate "
                        + str(adverbs["rate_per_1000"])
                        + " per 1000 words, floor "
                        + str(adverb_floor),
                    )
                ],
                remediation="Reduire la densite d'adverbes en -ment.",
                input_hash=input_hash,
            )
        )

    passive = passive_ratio(text)
    metrics["passive"] = passive
    passive_floor = float(settings.get("passive_ratio_max", 0.15))
    if passive["ratio"] > passive_floor:
        findings.append(
            _finding(
                layer=NarrativeLayer.PROSE,
                control_family=ControlFamily.STATISTICAL,
                detector_id="prose.passive_density",
                severity=Severity.LOW,
                locus="prose:passive",
                determinism=Determinism.STATISTICAL,
                confidence=0.55,
                confidence_basis="Auxiliary plus participle heuristic, French forms only",
                evidence=[
                    Evidence(
                        excerpt=sample[:120],
                        locus="sentence",
                        detail="ratio " + str(passive["ratio"]) + " above " + str(passive_floor),
                    )
                    for sample in passive["samples"][:3]
                ],
                remediation="Verifier si la voix passive est justifiee.",
                input_hash=input_hash,
            )
        )

    return findings, metrics


def _has_marker(text: str, markers: Sequence[str]) -> bool:
    lowered = text.lower()
    return any(marker in lowered for marker in markers)


def inspect_structure(
    acts: Sequence[ActInput],
    beats: Sequence[BeatInput],
    scenes: Sequence[SceneInput],
    thresholds,
    input_hash: str,
) -> Tuple[List[Finding], Dict[str, Any]]:
    """L1: acts, beats and scene functions."""

    settings = thresholds.section("structure")
    findings: List[Finding] = []
    metrics: Dict[str, Any] = {
        "acts": len(acts),
        "beats": len(beats),
        "scenes": len(scenes),
    }

    setups = [b for b in beats if b.kind == "setup"]
    payoffs = [b for b in beats if b.kind == "payoff"]
    metrics["setups"] = len(setups)
    metrics["payoffs"] = len(payoffs)

    if setups:
        ratio = len(payoffs) / len(setups)
        metrics["payoff_ratio"] = round(ratio, 4)
        required = float(settings.get("min_payoff_ratio", 0.5))
        if ratio < required:
            findings.append(
                _finding(
                    layer=NarrativeLayer.STRUCTURE,
                    control_family=ControlFamily.DETERMINISTIC,
                    detector_id="structure.missing_payoff",
                    severity=Severity.MEDIUM,
                    locus="structure:payoff_ratio",
                    determinism=Determinism.DETERMINISTIC,
                    confidence=0.8,
                    confidence_basis="Declared setup and payoff beats counted exactly",
                    evidence=[
                        Evidence(
                            excerpt="setups=" + str(len(setups)) + " payoffs=" + str(len(payoffs)),
                            locus="structure:beats",
                            detail="payoff ratio below " + str(required),
                        )
                    ],
                    remediation="Amener une contrepartie aux amorces declarees.",
                    input_hash=input_hash,
                )
            )

    if settings.get("require_scene_function", True) and scenes:
        without = [s for s in scenes if not (s.function or "").strip()]
        metrics["scenes_without_function"] = len(without)
        if without:
            findings.append(
                _finding(
                    layer=NarrativeLayer.STRUCTURE,
                    control_family=ControlFamily.DETERMINISTIC,
                    detector_id="structure.scene_without_function",
                    severity=Severity.MEDIUM if len(without) > 1 else Severity.LOW,
                    locus="structure:scene_function",
                    determinism=Determinism.DETERMINISTIC,
                    confidence=0.75,
                    confidence_basis="Declared field absent on the scene record",
                    evidence=[
                        Evidence(
                        excerpt=(s.summary or s.scene_id or "")[:120],
                            locus=SCENE_LOCUS_PREFIX + str(s.index),
                            detail="no declared function",
                        )
                        for s in without[:5]
                    ],
                    remediation="Declarer la fonction de la scene ou la retirer.",
                    input_hash=input_hash,
                )
            )

    tensions = [a.tension for a in acts if a.tension is not None]
    metrics["acts_with_tension"] = len(tensions)
    if len(tensions) >= 2:
        drops = [
            (acts[i].index, acts[i - 1].index)
            for i in range(1, len(tensions))
            if tensions[i] < tensions[i - 1]
        ]
        metrics["tension_drops"] = len(drops)
        if drops:
            findings.append(
                _finding(
                    layer=NarrativeLayer.STRUCTURE,
                    control_family=ControlFamily.DETERMINISTIC,
                    detector_id="structure.tension_regression",
                    severity=Severity.LOW,
                    locus="structure:tension",
                    determinism=Determinism.DETERMINISTIC,
                    confidence=0.7,
                    confidence_basis="Declared tension values compared in act order",
                    evidence=[
                        Evidence(
                            excerpt="act " + str(after) + " below act " + str(before),
                            locus="act:" + str(after),
                            detail="declared tension decreases",
                        )
                        for after, before in drops[:5]
                    ],
                    remediation="Confirmer la baisse de tension ou la corriger.",
                    input_hash=input_hash,
                )
            )

    return findings, metrics


def _pov_jumps(ordered: Sequence[SceneInput]) -> List[Tuple[SceneInput, SceneInput]]:
    """Point-of-view changes that the previous scene does not announce."""

    jumps: List[Tuple[SceneInput, SceneInput]] = []
    for previous, current in zip(ordered, ordered[1:]):
        if not (previous.pov and current.pov and previous.pov != current.pov):
            continue
        if not _has_marker(previous.summary, POV_CHANGE_MARKERS):
            jumps.append((previous, current))
    return jumps


def _presence_gaps(ordered: Sequence[SceneInput]) -> List[Tuple[int, str, int]]:
    """A character present, then absent, then present again without an exit marker."""

    gaps: List[Tuple[int, str, int]] = []
    for i in range(len(ordered) - 2):
        first, middle, last = ordered[i], ordered[i + 1], ordered[i + 2]
        first_set = {c.lower() for c in first.characters}
        middle_set = {c.lower() for c in middle.characters}
        last_set = {c.lower() for c in last.characters}
        for name in first_set & last_set - middle_set:
            if not _has_marker(middle.summary, EXIT_MARKERS):
                gaps.append((first.index, name, middle.index))
    return gaps


def _time_reversals(
    ordered: Sequence[SceneInput],
) -> List[Tuple[SceneInput, SceneInput]]:
    """Consecutive scenes whose declared time labels go backwards."""

    reversals: List[Tuple[SceneInput, SceneInput]] = []
    for previous, current in zip(ordered, ordered[1:]):
        if not (previous.time_label and current.time_label):
            continue
        before = _first_int(previous.time_label)
        after = _first_int(current.time_label)
        if before is not None and after is not None and after < before:
            reversals.append((previous, current))
    return reversals


def inspect_scenes(
    scenes: Sequence[SceneInput], thresholds, input_hash: str
) -> Tuple[List[Finding], Dict[str, Any]]:
    """L2: point of view, presence and continuity between consecutive scenes."""

    settings = thresholds.section("scenes")
    findings: List[Finding] = []
    ordered = sorted(scenes, key=lambda s: s.index)
    metrics: Dict[str, Any] = {"scenes": len(ordered)}
    if len(ordered) < 2:
        return findings, metrics

    pov_jumps = _pov_jumps(ordered)
    metrics["pov_jumps_unmarked"] = len(pov_jumps)
    if pov_jumps:
        findings.append(
            _finding(
                layer=NarrativeLayer.SCENES,
                control_family=ControlFamily.DETERMINISTIC,
                detector_id="scenes.pov_shift_unmarked",
                severity=Severity.LOW,
                locus="scenes:pov",
                determinism=Determinism.DETERMINISTIC,
                confidence=0.6,
                confidence_basis="Declared POV compared; marker search is a simple keyword test",
                evidence=[
                    Evidence(
                        excerpt=(current.summary or current.scene_id or "")[:120],
                        locus=SCENE_LOCUS_PREFIX + str(current.index),
                        detail="POV " + str(previous.pov) + " to " + str(current.pov),
                    )
                    for previous, current in pov_jumps[:5]
                ],
                remediation="Marquer le changement de point de vue.",
                input_hash=input_hash,
            )
        )

    gaps = _presence_gaps(ordered)
    metrics["presence_gaps"] = len(gaps)
    if gaps:
        findings.append(
            _finding(
                layer=NarrativeLayer.SCENES,
                control_family=ControlFamily.DETERMINISTIC,
                detector_id="scenes.presence_gap",
                severity=Severity.LOW,
                locus="scenes:presence",
                determinism=Determinism.DETERMINISTIC,
                confidence=0.55,
                confidence_basis="Character lists are declared data; absence may be unmarked",
                evidence=[
                    Evidence(
                        excerpt=name,
                        locus=SCENE_LOCUS_PREFIX + str(middle),
                        detail="present in scene " + str(first) + " and " + str(middle + 1),
                    )
                    for first, name, middle in gaps[:5]
                ],
                remediation="Signaler la sortie ou l'absence du personnage.",
                input_hash=input_hash,
            )
        )

    reversals = _time_reversals(ordered)
    metrics["time_reversals"] = len(reversals)
    tolerance = int(settings.get("time_reversal_tolerance", 0))
    if len(reversals) > tolerance:
        findings.append(
            _finding(
                layer=NarrativeLayer.SCENES,
                control_family=ControlFamily.DETERMINISTIC,
                detector_id="scenes.time_reversal",
                severity=Severity.MEDIUM,
                locus="scenes:timeline",
                determinism=Determinism.DETERMINISTIC,
                confidence=0.7,
                confidence_basis="First integer of the declared time label compared",
                evidence=[
                    Evidence(
                        excerpt=str(current.time_label),
                        locus=SCENE_LOCUS_PREFIX + str(current.index),
                        detail="after " + str(previous.time_label),
                    )
                    for previous, current in reversals[:5]
                ],
                remediation="Verifier l'ordre chronologique ou le declarer comme flash-back.",
                input_hash=input_hash,
            )
        )

    return findings, metrics


def _first_int(label: str) -> Optional[int]:
    digits = ""
    for char in str(label):
        if char.isdigit():
            digits += char
        elif digits:
            break
    if digits:
        return int(digits)
    return None
