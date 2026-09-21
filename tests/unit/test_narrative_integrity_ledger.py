"""Arbitration memory: a settled observation is never raised again as if it were new."""

import json
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator

from src.narrative_integrity import IntegrityInput, NarrativeIntegrityEngine
from src.narrative_integrity.cli import main
from src.narrative_integrity.ledger import (
    Decision,
    FindingsLedger,
    arbitration_key,
    normalise_locus,
)

ENGINE = NarrativeIntegrityEngine()
FIXED_NOW = "2026-09-21T00:00:00"
SCHEMA = (
    Path(__file__).resolve().parents[2]
    / "src"
    / "narrative_integrity"
    / "schemas"
    / "ledger_entry.schema.json"
)

SUBJECT = "En conclusion, " * 20 + (
    "Dans un monde où tout change, il est important de noter cela. " * 3
)
CONCL_KEY = "slop.fr_concl_compulsive|signature:fr_concl_compulsive"


@pytest.mark.parametrize(
    "locus,expected",
    [
        ("style:window:3", "style:window"),
        ("chars:120-180", "chars"),
        ("scene:5", "scene"),
        ("sentence:12", "sentence"),
        ("act:2", "act"),
        ("prose:opener:le chat", "prose:opener:le chat"),
        ("prose:adverbs", "prose:adverbs"),
        ("signature:fr_cliche_danse", "signature:fr_cliche_danse"),
        ("canon:entities", "canon:entities"),
        ("", "unknown"),
    ],
)
def test_locus_normalisation(locus, expected):
    assert normalise_locus(locus) == expected


def test_a_decision_covers_the_whole_positional_family():
    ledger = FindingsLedger.empty()
    ledger.record("style.drift", "style:window:0", Decision.REJECTED, now=FIXED_NOW)
    assert ledger.suppresses("style.drift", "style:window:7")
    assert ledger.suppresses("style.drift", "style:window:41")


def test_a_decision_does_not_leak_to_another_detector():
    ledger = FindingsLedger.empty()
    ledger.record("style.drift", "style:window:0", Decision.REJECTED, now=FIXED_NOW)
    assert not ledger.suppresses("prose.ngram_repetition", "style:window:0")


def test_deferred_keeps_raising_and_the_latest_decision_wins():
    ledger = FindingsLedger.empty()
    key = "slop.fr_concl_compulsive|signature:fr_concl_compulsive"
    ledger.record_key(key, Decision.REJECTED, now=FIXED_NOW)
    assert ledger.suppresses("slop.fr_concl_compulsive", "signature:fr_concl_compulsive")
    ledger.record_key(key, Decision.DEFERRED, now=FIXED_NOW)
    assert not ledger.suppresses(
        "slop.fr_concl_compulsive", "signature:fr_concl_compulsive"
    )
    assert len(ledger) == 2, "history is append-only, the decision is not overwritten"


def test_record_key_requires_a_well_formed_key():
    with pytest.raises(ValueError):
        FindingsLedger.empty().record_key("no-separator", Decision.REJECTED)


def test_engine_marks_arbitrated_findings_without_dropping_them():
    integrity_input = IntegrityInput(project_id="p", artifact="a", text=SUBJECT)
    plain = ENGINE.run(integrity_input, now=FIXED_NOW)
    ledger = FindingsLedger.empty()
    ledger.record(
        "slop.fr_concl_compulsive",
        "signature:fr_concl_compulsive",
        Decision.REJECTED,
        decided_by="editor",
        now=FIXED_NOW,
    )
    settled = ENGINE.run(integrity_input, now=FIXED_NOW, ledger=ledger)

    assert len(settled.findings) == len(plain.findings), "nothing may be dropped"
    marked = [f for f in settled.findings if f.arbitrated()]
    assert len(marked) == 1
    assert marked[0].arbitration["decision"] == "rejected"
    assert marked[0].arbitration["decided_by"] == "editor"
    assert len(settled.active_findings()) == len(plain.findings) - 1
    assert settled.aggregates["arbitrated"]["total"] == 1
    assert settled.aggregates["arbitrated"]["by_decision"] == {"rejected": 1}
    assert settled.aggregates["arbitrated"]["ledger_entries"] == 1
    assert settled.aggregates["immune"]["arbitrated"] == 1
    assert settled.aggregates["immune"]["active"] == len(plain.findings) - 1


def test_the_ledger_never_changes_the_prose_score():
    integrity_input = IntegrityInput(project_id="p", artifact="a", text=SUBJECT)
    plain = ENGINE.run(integrity_input, now=FIXED_NOW)
    ledger = FindingsLedger.empty()
    ledger.record(
        "slop.fr_concl_compulsive",
        "signature:fr_concl_compulsive",
        Decision.ACCEPTED,
        now=FIXED_NOW,
    )
    settled = ENGINE.run(integrity_input, now=FIXED_NOW, ledger=ledger)
    assert (
        settled.aggregates["prose"]["score"] == plain.aggregates["prose"]["score"]
    ), "the score measures the text, not the reader's earlier decisions"


def test_an_arbitrated_finding_no_longer_waits_for_confirmation():
    integrity_input = IntegrityInput(project_id="p", artifact="a", text=SUBJECT)
    plain = ENGINE.run(integrity_input, now=FIXED_NOW)
    pending_before = plain.aggregates["immune"]["awaiting_confirmation"]
    high = [f for f in plain.findings if f.severity.value == "high"]
    assert high, "the fixture must produce a finding that asks for confirmation"
    target = high[0]
    assert target.finding_id in pending_before

    ledger = FindingsLedger.empty()
    ledger.record(
        target.detector_id, target.locus, Decision.ACCEPTED, now=FIXED_NOW
    )
    settled = ENGINE.run(integrity_input, now=FIXED_NOW, ledger=ledger)
    pending_after = settled.aggregates["immune"]["awaiting_confirmation"]
    assert target.finding_id not in pending_after
    assert len(pending_after) == len(pending_before) - 1
    still_marked = [f for f in settled.findings if f.arbitrated()]
    assert still_marked, "the finding stays in the report, only its standing changes"


def test_ledger_round_trips_and_its_entries_validate(tmp_path):
    ledger = FindingsLedger.empty()
    ledger.record(
        "slop.fr_cliche_danse",
        "signature:fr_cliche_danse",
        Decision.REJECTED,
        decided_by="editor",
        note="figure voulue par l'auteur",
        now=FIXED_NOW,
    )
    path = ledger.save(tmp_path / "nested" / "ledger.json")
    reloaded = FindingsLedger.from_file(path)
    assert len(reloaded) == 1
    assert reloaded.suppresses("slop.fr_cliche_danse", "signature:fr_cliche_danse")
    validator = Draft202012Validator(json.loads(SCHEMA.read_text(encoding="utf-8")))
    for entry in json.loads(path.read_text(encoding="utf-8"))["entries"]:
        validator.validate(entry)


def test_missing_ledger_file_starts_empty(tmp_path):
    ledger = FindingsLedger.from_file(tmp_path / "absent.json")
    assert len(ledger) == 0
    assert not ledger.suppresses("x.y", "z")


def test_cli_records_a_decision_and_honours_it_on_the_next_run(tmp_path, capsys):
    subject = tmp_path / "subject.md"
    subject.write_text(SUBJECT, encoding="utf-8")
    ledger_path = tmp_path / "ledger.json"

    assert (
        main(
            [
                str(subject),
                "--ledger",
                str(ledger_path),
                "--decide",
                CONCL_KEY + "=rejected",
                "--decided-by",
                "editor",
            ]
        )
        == 0
    )
    first = json.loads(capsys.readouterr().out)
    assert first["aggregates"]["arbitrated"]["total"] == 1
    assert ledger_path.exists()

    assert main([str(subject), "--ledger", str(ledger_path)]) == 0
    second = json.loads(capsys.readouterr().out)
    assert second["aggregates"]["arbitrated"]["total"] == 1
    assert second["aggregates"]["arbitrated"]["by_decision"] == {"rejected": 1}


def test_cli_refuses_a_decision_that_has_nowhere_to_live(tmp_path, capsys):
    subject = tmp_path / "subject.md"
    subject.write_text(SUBJECT, encoding="utf-8")
    assert main([str(subject), "--decide", CONCL_KEY + "=rejected"]) == 2
    assert "needs --ledger" in capsys.readouterr().err


def test_cli_reports_an_unknown_decision(tmp_path, capsys):
    subject = tmp_path / "subject.md"
    subject.write_text(SUBJECT, encoding="utf-8")
    code = main(
        [
            str(subject),
            "--ledger",
            str(tmp_path / "ledger.json"),
            "--decide",
            CONCL_KEY + "=maybe",
        ]
    )
    assert code == 2
    assert "unknown decision" in capsys.readouterr().err
