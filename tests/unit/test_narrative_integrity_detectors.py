"""Layer detectors: structure, scenes, prose and canon."""

from src.narrative_integrity.canon import inspect_canon
from src.narrative_integrity.detectors import (
    inspect_prose,
    inspect_scenes,
    inspect_structure,
    inspect_text_hygiene,
    is_anaphoric_opener,
)
from src.narrative_integrity.input_model import (
    ActInput,
    BeatInput,
    CanonInput,
    SceneInput,
)
from src.narrative_integrity.text_scan import passive_ratio
from src.narrative_integrity.thresholds import Thresholds

THRESHOLDS = Thresholds.default()
HASH = "0123456789abcdef"

HUMAN_FR = (
    "Le pont a porté du charbon jusqu'en 1958. Ses six arches ont été montées en pierre. "
    "Deux fois, le mortier a été repris : après l'inondation de 1911, puis en 1963. "
    "Le parapet ouest garde la trace d'un camion. La circulation a été déviée en 1981, et depuis, "
    "seuls les piétons passent, avec l'occasionnel véhicule agricole autorisé sous trois tonnes. "
    "Une inspection récente a jugé la culée saine. Elle recommande cependant un rejointoiement dans les dix ans. "
    "La pierre venait d'Ashby, fermée depuis 1936. Le conseil a déposé deux demandes de subvention : "
    "la première a échoué sur un dossier incomplet. Des bénévoles curent les caniveaux chaque printemps, "
    "ce qui ralentit l'écaillage de la face nord."
)


def detectors_of(findings):
    return {f.detector_id for f in findings}


def test_repetitive_prose_is_flagged():
    text = "Le vieux pont traverse la riviere tranquille. " * 12
    findings, metrics = inspect_prose(text, THRESHOLDS, HASH)
    assert "prose.ngram_repetition" in detectors_of(findings)
    assert "prose.opener_repetition" in detectors_of(findings)
    assert metrics["monotonous"] is True


def test_varied_human_prose_produces_no_prose_findings():
    findings, metrics = inspect_prose(HUMAN_FR, THRESHOLDS, HASH)
    assert detectors_of(findings) == set(), detectors_of(findings)
    assert metrics["applicable"] is True
    assert metrics["monotonous"] is False


def test_french_passive_is_detected_when_the_participle_is_accented():
    text = (
        "Les arches sont montées en pierre. La route est déviée depuis 1981. "
        "Le parapet garde une trace. Le tablier porte des pietons. "
        "Le conseil a depose deux demandes."
    )
    findings, metrics = inspect_prose(text, THRESHOLDS, HASH)
    assert metrics["passive"]["count"] == 2
    assert "prose.passive_density" in detectors_of(findings)


def test_calm_text_is_not_called_passive():
    text = "Il dort paisiblement dans la chambre. La lampe eclaire le mur."
    assert passive_ratio(text)["count"] == 0


def test_short_text_skips_rhythm_measures():
    findings, metrics = inspect_prose("Trop court.", THRESHOLDS, HASH)
    assert findings == []
    assert metrics["applicable"] is False


def test_hidden_tag_block_in_prose_is_reported_as_high():
    text = "Rapport pret." + chr(0xE0068) + chr(0xE0069)
    findings, scan = inspect_text_hygiene(text, {}, HASH)
    assert scan["tag_block"] == 2
    assert "prose.hidden_tag_block" in detectors_of(findings)
    assert findings[0].severity.value == "high"


def test_clean_prose_reports_no_hidden_channel():
    findings, scan = inspect_text_hygiene("Un texte propre, sans marque.", {}, HASH)
    assert findings == []
    assert scan["total_removable"] == 0


def test_structure_reports_setup_without_payoff():
    beats = [BeatInput(beat_id="b1", kind="setup", ref="porte"), BeatInput(beat_id="b2", kind="setup", ref="arme")]
    scenes = [SceneInput(index=0, function="goal"), SceneInput(index=1, function="turn")]
    findings, metrics = inspect_structure([], beats, scenes, THRESHOLDS, HASH)
    assert metrics["payoff_ratio"] == 0.0
    assert "structure.missing_payoff" in detectors_of(findings)


def test_structure_reports_scenes_without_function():
    scenes = [SceneInput(index=0, function="goal"), SceneInput(index=1), SceneInput(index=2)]
    findings, metrics = inspect_structure([], [], scenes, THRESHOLDS, HASH)
    assert metrics["scenes_without_function"] == 2
    assert "structure.scene_without_function" in detectors_of(findings)


def test_structure_reports_tension_regression():
    acts = [ActInput(index=0, tension=0.3), ActInput(index=1, tension=0.8), ActInput(index=2, tension=0.4)]
    findings, metrics = inspect_structure(acts, [], [], THRESHOLDS, HASH)
    assert metrics["tension_drops"] == 1
    assert "structure.tension_regression" in detectors_of(findings)


def test_scenes_report_time_reversal():
    scenes = [
        SceneInput(index=0, time_label="1981", function="goal"),
        SceneInput(index=1, time_label="1963", function="turn"),
    ]
    findings, metrics = inspect_scenes(scenes, THRESHOLDS, HASH)
    assert metrics["time_reversals"] == 1
    assert "scenes.time_reversal" in detectors_of(findings)


def test_scenes_report_unmarked_point_of_view_shift():
    scenes = [
        SceneInput(index=0, pov="Ida", summary="Le marche continue.", function="goal"),
        SceneInput(index=1, pov="Marc", summary="Le marche continue.", function="turn"),
        SceneInput(index=2, pov="Marc", function="turn"),
    ]
    findings, _ = inspect_scenes(scenes, THRESHOLDS, HASH)
    assert "scenes.pov_shift_unmarked" in detectors_of(findings)


def test_scenes_report_presence_gap():
    scenes = [
        SceneInput(index=0, characters=["Ida"], function="goal"),
        SceneInput(index=1, characters=["Marc"], function="turn"),
        SceneInput(index=2, characters=["Ida"], function="turn"),
    ]
    findings, metrics = inspect_scenes(scenes, THRESHOLDS, HASH)
    assert metrics["presence_gaps"] == 1
    assert "scenes.presence_gap" in detectors_of(findings)


def test_canon_reports_entity_missing_from_the_canon():
    canon = CanonInput(entities=[{"name": "Ida", "aliases": ["Ida Voss"]}])
    scenes = [
        SceneInput(index=0, characters=["Ida"], function="goal"),
        SceneInput(index=1, characters=["Sylvain"], function="turn"),
    ]
    findings, metrics = inspect_canon(canon, scenes, THRESHOLDS, HASH, "v1")
    assert metrics["unknown_entities"] == 1
    finding = [f for f in findings if f.detector_id == "canon.unknown_entity"][0]
    assert finding.canon_conflict == "entity missing from canon"
    assert finding.evidence[0].excerpt == "sylvain"


def test_canon_reports_a_self_contradictory_relation():
    canon = CanonInput(
        entities=[{"name": "Ida"}],
        relations=[
            {"subject": "Ida", "predicate": "vit_a", "object": "Lyon"},
            {"subject": "Ida", "predicate": "vit_a", "object": "Nantes"},
        ],
    )
    findings, metrics = inspect_canon(canon, [], THRESHOLDS, HASH)
    assert metrics["conflicting_relation_pairs"] == 1
    finding = [f for f in findings if f.detector_id == "canon.relation_self_contradiction"][0]
    assert finding.severity.value == "high"


def test_canon_reports_an_ambiguous_timeline():
    canon = CanonInput(timeline=[{"label": "a", "order": 1}, {"label": "b", "order": 1}])
    findings, _ = inspect_canon(canon, [], THRESHOLDS, HASH)
    assert "canon.timeline_collision" in detectors_of(findings)


def test_anaphora_rule_needs_a_pronoun_and_no_content_word():
    assert is_anaphoric_opener("il y")
    assert is_anaphoric_opener("elle ne")
    assert is_anaphoric_opener("il était")
    assert is_anaphoric_opener("ce qui")
    assert not is_anaphoric_opener("il court")
    assert not is_anaphoric_opener("le vieux")
    assert not is_anaphoric_opener("dans le")
    assert not is_anaphoric_opener("personne ne")


def test_anaphoric_openers_are_reported_but_not_scored():
    text = "Il y a un pont ancien. " * 4 + "Personne ne le traverse plus. " * 2
    findings, metrics = inspect_prose(text, THRESHOLDS, HASH)
    assert metrics["anaphoric_openers"], "the repetition must stay visible in metrics"
    assert "prose.opener_repetition" not in detectors_of(findings)


def test_content_openers_are_still_reported_as_monotony():
    text = "Le vieux pont traverse la riviere tranquille. " * 12
    findings, _ = inspect_prose(text, THRESHOLDS, HASH)
    assert "prose.opener_repetition" in detectors_of(findings)


def test_preposition_led_openers_remain_reportable():
    text = (
        "Dans le village, la route s'arrete. Dans le vallon, la route reprend. "
        "Dans le bois, elle disparait. "
    ) * 3
    findings, _ = inspect_prose(text, THRESHOLDS, HASH)
    assert "prose.opener_repetition" in detectors_of(findings)
