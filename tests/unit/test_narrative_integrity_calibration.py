"""The measurement harness: verified maths, hash-verified corpus, honest claims."""

import json
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator

from src.narrative_integrity.calibration import (
    CorpusIntegrityError,
    binomial_upper_bound,
    cluster_rate_interval,
    false_positive_rate,
    findings_per_1000_words,
    load_corpus,
    roc_auc,
    run_calibration,
)

DATA = Path(__file__).resolve().parents[1] / "data" / "narrative_integrity" / "calibration"
CORPUS = DATA / "corpus_fr_v1.json"
RESULTS = DATA / "results_fr_v1.json"
SCHEMA = (
    Path(__file__).resolve().parents[2]
    / "src"
    / "narrative_integrity"
    / "schemas"
    / "calibration_results.schema.json"
)


def synthetic(scores, labels, work="w"):
    return [
        {
            "document_id": "d%d" % index,
            "work": work,
            "label": label,
            "words": 100,
            "score": score,
            "band": "clean",
            "findings": 1,
            "detectors": [],
        }
        for index, (score, label) in enumerate(zip(scores, labels))
    ]


def test_auc_is_one_for_a_perfect_separation():
    # The two positive documents carry the two highest scores.
    assert roc_auc([3, 4, 1, 2], [1, 1, 0, 0]) == 1.0


def test_auc_is_zero_for_a_perfect_inversion():
    assert roc_auc([1, 2, 3, 4], [1, 1, 0, 0]) == 0.0


def test_auc_is_a_half_when_the_scores_carry_no_information():
    assert roc_auc([2, 2, 2, 2], [1, 1, 0, 0]) == 0.5


def test_auc_is_undefined_with_a_single_class():
    assert roc_auc([1, 2, 3], [1, 1, 1]) is None
    assert roc_auc([], []) is None


def test_auc_handles_ties_with_average_ranks():
    # Positives score 2 and 3, negatives 1 and 2. Counting every pair:
    # 1 + 0.5 + 1 + 1 = 3.5, over four pairs.
    assert roc_auc([1, 2, 2, 3], [0, 0, 1, 1]) == 0.875


def test_upper_bound_matches_the_closed_form_when_nothing_is_flagged():
    assert binomial_upper_bound(0, 22) == pytest.approx(1 - 0.05 ** (1 / 22), abs=1e-4)
    assert binomial_upper_bound(0, 10) == pytest.approx(0.2589, abs=1e-3)


def test_upper_bound_grows_with_the_number_of_failures():
    assert binomial_upper_bound(0, 22) < binomial_upper_bound(1, 22)
    assert binomial_upper_bound(1, 22) < binomial_upper_bound(5, 22)


def test_upper_bound_edge_cases():
    assert binomial_upper_bound(0, 0) == 1.0
    assert binomial_upper_bound(4, 4) == 1.0


def test_rate_and_histogram_helpers():
    results = synthetic([0, 50, 0, 60], ["human", "human", "human", "human"])
    assert false_positive_rate(results, 40) == 0.5
    assert findings_per_1000_words(results) == 10.0


def test_cluster_interval_is_reproducible_and_counts_clusters():
    results = []
    for work_index in range(3):
        for score in (0, 50):
            results.extend(
                synthetic([score], ["human"], work="work%d" % work_index)
            )
    first = cluster_rate_interval(results, 40, resamples=200, seed=7)
    second = cluster_rate_interval(results, 40, resamples=200, seed=7)
    assert first == second
    assert first["clusters"] == 3
    assert first["low"] <= first["high"]


def test_shipped_corpus_loads_and_declares_only_human_arms():
    corpus = load_corpus(CORPUS)
    assert corpus.language == "fr"
    labels = {arm.label for arm in corpus.arms}
    assert labels == {"human"}, "no machine arm is available, and none is invented"
    assert len(corpus.documents()) >= 15
    assert sum(document.words for document in corpus.documents()) > 15000
    assert corpus.expectations.get("max_false_positive_rate") is not None
    assert len(corpus.limitations) >= 3, "the corpus must state what it cannot support"


def test_corpus_refuses_text_that_does_not_match_its_hash(tmp_path):
    data = json.loads(CORPUS.read_text(encoding="utf-8"))
    data["arms"][0]["documents"][0]["text"] = data["arms"][0]["documents"][0]["text"] + " edit"
    target = tmp_path / "tampered.json"
    target.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    with pytest.raises(CorpusIntegrityError):
        load_corpus(target)


def test_corpus_refuses_a_word_count_that_disagrees(tmp_path):
    data = json.loads(CORPUS.read_text(encoding="utf-8"))
    data["arms"][0]["documents"][0]["words"] = 999999
    target = tmp_path / "words.json"
    target.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    with pytest.raises(CorpusIntegrityError):
        load_corpus(target)


def test_corpus_refuses_a_document_without_a_source():
    data = json.loads(CORPUS.read_text(encoding="utf-8"))
    for document in data["arms"][0]["documents"]:
        assert document["source"].strip()
        assert len(document["source_sha256"]) == 64


def test_results_document_declares_what_it_did_not_measure():
    results = json.loads(RESULTS.read_text(encoding="utf-8"))
    joined = " ".join(results["not_measured"]).lower()
    assert "detection rate" in joined
    assert "machine arm" in joined
    Draft202012Validator(
        json.loads(SCHEMA.read_text(encoding="utf-8"))
    ).validate(results)


def test_recorded_results_match_a_fresh_run():
    """A stale measurement is worse than none: the artefact must track the instrument."""

    recorded = json.loads(RESULTS.read_text(encoding="utf-8"))
    fresh = run_calibration(load_corpus(CORPUS), resamples=2000, seed=20260921)
    assert fresh["summary"] == recorded["summary"], (
        "thresholds or detectors changed since the recorded run: "
        "re-run python -m src.narrative_integrity.calibration"
    )
    assert fresh["per_document"] == recorded["per_document"]


def test_human_prose_stays_inside_the_declared_false_positive_budget():
    results = json.loads(RESULTS.read_text(encoding="utf-8"))
    summary = results["summary"]
    assert summary["within_declared_budget"] is True
    assert summary["band_distribution"] == {"clean": summary["documents"]}
