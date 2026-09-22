"""Style drift needs a real reference, never the subject measured against itself."""

import hashlib
import json
from pathlib import Path

from src.narrative_integrity import IntegrityInput, NarrativeIntegrityEngine
from src.narrative_integrity.cli import main
from src.narrative_integrity.style_profile import drift, lock_profile, save_profile

ENGINE = NarrativeIntegrityEngine()
FIXED_NOW = "2026-09-21T00:00:00"

FACTUAL = (
    "Le pont a porté du charbon jusqu'en 1958. Ses six arches ont été montées en pierre. "
    "Le mortier a été repris après l'inondation de 1911, puis en 1963. Le parapet ouest "
    "garde la trace d'un camion. La circulation a été déviée en 1981. Seuls les piétons "
    "passent, avec l'occasionnel véhicule agricole autorisé sous trois tonnes. Une inspection "
    "récente a jugé la culée saine. La pierre venait d'Ashby, fermée depuis 1936. Le conseil "
    "a déposé deux demandes de subvention. Des bénévoles curent les caniveaux chaque printemps."
)

FACTUAL_MORE = (
    "Le tablier porte une chaussée étroite. Les joints de dilatation ont été refaits. "
    "Un garde-corps remplace la barrière d'origine. La culée nord montre un affaissement léger. "
    "Le dossier de travaux reste ouvert. La commune attend une réponse. Les relevés "
    "topographiques datent de la même campagne. Le géomètre a consigné chaque fissure. "
    "Le rapport sera versé au dossier."
)

FACTUAL_THIRD = (
    "La travée centrale mesure trente mètres. Les piles reposent sur le bedrock. "
    "Un batardeau a été posé en 1962. Le tablier a reçu une chape neuve. "
    "Les essieux lourds empruntent la déviation. Le gel a fissuré deux claveaux. "
    "Une entreprise locale a refait les joints. Le devis a été validé en mars. "
    "Les travaux dureront six semaines."
)

TELEGRAPHIC = (
    "Pont. Charbon. 1958. Arches. Pierre. Mortier. Inondation. 1911. 1963. Parapet. "
    "Camion. 1974. Circulation. 1981. Piétons. Véhicule. Tonnes. Inspection. Culée. "
    "Ashby. 1936. Conseil. Subventions. Caniveaux. Printemps. Écaillage. Tablier. "
    "Joints. Claveaux. Géomètre. Fissure. Rapport. Devis. Travaux."
)


def test_profile_identifier_is_stable_and_content_bound():
    first = lock_profile([FACTUAL], ENGINE.thresholds)
    second = lock_profile([FACTUAL], ENGINE.thresholds)
    other = lock_profile([FACTUAL_MORE], ENGINE.thresholds)
    assert first["profile_id"] == second["profile_id"]
    assert first["profile_id"] != other["profile_id"]


def test_recorded_hash_matches_the_reference_text():
    profile = lock_profile([FACTUAL], ENGINE.thresholds, sources=["ref.md"])
    record = profile["derived_from_records"][0]
    assert record["sha256"] == hashlib.sha256(FACTUAL.encode("utf-8")).hexdigest()
    assert record["source"] == "ref.md"
    assert record["words"] > 0


def test_saved_profile_round_trips_through_disk(tmp_path):
    profile = lock_profile([FACTUAL], ENGINE.thresholds, sources=["ref.md"])
    path = save_profile(profile, Path("nested") / "profile.json", root=tmp_path)
    assert path.exists()
    reloaded = json.loads(path.read_text(encoding="utf-8"))
    assert reloaded["profile_id"] == profile["profile_id"]
    assert reloaded["locked"] is True
    assert reloaded["derived_from_records"] == profile["derived_from_records"]


def test_drift_fires_when_the_register_really_differs():
    profile = lock_profile([FACTUAL], ENGINE.thresholds, sources=["ref.md"])
    findings, metrics = drift(profile, TELEGRAPHIC * 16, ENGINE.thresholds, "hash")
    assert metrics["applicable"] is True
    assert metrics["windows"] >= 2
    assert metrics["min_similarity"] < ENGINE.thresholds.get("style.drift_min_cosine")
    assert any(f.detector_id == "style.drift" for f in findings)


def test_drift_is_silent_when_the_register_matches():
    sources = [FACTUAL, FACTUAL_MORE, FACTUAL_THIRD]
    profile = lock_profile(sources, ENGINE.thresholds, sources=["a", "b", "c"])
    subject = (" ".join(sources) + " ") * 2
    findings, metrics = drift(profile, subject, ENGINE.thresholds, "hash")
    assert metrics["applicable"] is True
    assert metrics["windows"] >= 2
    assert findings == []


def test_engine_reports_style_findings_as_estimates():
    profile = lock_profile([FACTUAL], ENGINE.thresholds, sources=["ref.md"])
    report = ENGINE.run(
        IntegrityInput(project_id="p", artifact="subject.md", text=TELEGRAPHIC * 16),
        now=FIXED_NOW,
        profile=profile,
    )
    style = [f for f in report.findings if f.layer.value == "S"]
    assert style
    assert all(f.determinism.value == "statistical" for f in style)
    assert all(
        "estimate" in f.confidence_basis or "calibrated" in f.confidence_basis
        for f in style
    )
    assert report.profile_ref == profile["profile_id"]


def test_cli_refuses_to_measure_style_without_a_reference(tmp_path, capsys):
    subject = tmp_path / "subject.md"
    subject.write_text(FACTUAL, encoding="utf-8")
    assert main([str(subject), "--root", str(tmp_path)]) == 0
    captured = capsys.readouterr()
    assert "no reference supplied" in captured.err
    report = json.loads(captured.out)
    scope = {item["layer"]: item["status"] for item in report["scope"]}
    assert scope["S"] == "skipped"
    assert report["profile_ref"] is None


def test_cli_uses_an_explicit_reference(tmp_path, capsys):
    subject = tmp_path / "subject.md"
    subject.write_text(FACTUAL_MORE, encoding="utf-8")
    reference = tmp_path / "reference.md"
    reference.write_text(FACTUAL, encoding="utf-8")
    assert (
        main([str(subject), "--reference", str(reference), "--root", str(tmp_path)])
        == 0
    )
    report = json.loads(capsys.readouterr().out)
    expected = lock_profile(
        [FACTUAL], ENGINE.thresholds, sources=[str(reference)]
    )["profile_id"]
    assert report["profile_ref"] == expected
    scope = {item["layer"]: item["status"] for item in report["scope"]}
    assert scope["S"] in ("ran", "partial")


def test_cli_reports_a_missing_reference(tmp_path, capsys):
    subject = tmp_path / "subject.md"
    subject.write_text(FACTUAL, encoding="utf-8")
    assert (
        main(
            [
                str(subject),
                "--reference",
                str(tmp_path / "absent.md"),
                "--root",
                str(tmp_path),
            ]
        )
        == 2
    )
    assert "reference not found" in capsys.readouterr().err


def test_cli_can_lock_the_reference_profile(tmp_path, capsys):
    subject = tmp_path / "subject.md"
    subject.write_text(FACTUAL_MORE, encoding="utf-8")
    reference = tmp_path / "reference.md"
    reference.write_text(FACTUAL, encoding="utf-8")
    target = tmp_path / "profiles" / "locked.json"
    assert (
        main(
            [
                str(subject),
                "--reference",
                str(reference),
                "--lock-profile",
                str(target),
                "--root",
                str(tmp_path),
            ]
        )
        == 0
    )
    report = json.loads(capsys.readouterr().out)
    saved = json.loads(target.read_text(encoding="utf-8"))
    assert saved["locked"] is True
    assert saved["profile_id"] == report["profile_ref"]
