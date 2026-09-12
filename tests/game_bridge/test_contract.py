from __future__ import annotations

import hashlib
import io
import json
import os
import tempfile
import unittest
from contextlib import redirect_stderr
from pathlib import Path

from src.game_bridge.contract import (
    ContractError,
    compile_spec,
    main,
    verify_manifest,
)


ROOT = Path(__file__).resolve().parents[2]
FIXTURE = (
    ROOT
    / "fixtures"
    / "storycore-game"
    / "coinfall-chronicle"
    / "storycore_game_spec.json"
)
GODOT_FIXTURE = FIXTURE.parent / "godot"


def load_fixture() -> dict[str, object]:
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


class ContractTests(unittest.TestCase):
    def test_fixture_compiles_and_verifies(self) -> None:
        manifest, evidence = compile_spec(load_fixture())

        self.assertTrue(verify_manifest(manifest))
        self.assertEqual(evidence["status"], "pass")
        self.assertFalse(manifest["boundary"]["private_components_included"])
        self.assertEqual(manifest["runtime"]["authority"], "local-fixture")

    def test_compilation_is_deterministic(self) -> None:
        original = load_fixture()
        reversed_keys = dict(reversed(list(original.items())))

        first = compile_spec(original)
        second = compile_spec(reversed_keys)

        self.assertEqual(first, second)

    def test_tampered_manifest_fails_verification(self) -> None:
        manifest, _ = compile_spec(load_fixture())
        manifest["gameplay"]["score_target"] = 999

        self.assertFalse(verify_manifest(manifest))

    def test_unknown_field_is_rejected(self) -> None:
        spec = load_fixture()
        spec["private_agent_graph"] = {"enabled": True}

        with self.assertRaisesRegex(ContractError, "unknown fields"):
            compile_spec(spec)

    def test_private_components_are_rejected(self) -> None:
        spec = load_fixture()
        spec["boundary"]["private_components_included"] = True

        with self.assertRaisesRegex(ContractError, "must be false"):
            compile_spec(spec)

    def test_unresolved_item_reference_is_rejected(self) -> None:
        spec = load_fixture()
        spec["quest"]["objectives"][0]["target_id"] = "missing_rune"

        with self.assertRaisesRegex(ContractError, "unresolved item reference"):
            compile_spec(spec)

    def test_partial_localization_is_rejected(self) -> None:
        spec = load_fixture()
        del spec["project"]["title"]["fr"]

        with self.assertRaisesRegex(ContractError, "missing locales: fr"):
            compile_spec(spec)

    def test_runtime_and_backend_authority_must_match(self) -> None:
        spec = load_fixture()
        spec["boundary"]["authoritative_backend"] = "external"

        with self.assertRaisesRegex(ContractError, "must match runtime authority"):
            compile_spec(spec)

    def test_cli_writes_manifest_and_evidence(self) -> None:
        with tempfile.TemporaryDirectory(dir=ROOT) as directory:
            output = Path(directory)

            result = main(
                [
                    "--input",
                    str(FIXTURE.relative_to(ROOT)),
                    "--output-dir",
                    str(output.relative_to(ROOT)),
                ]
            )

            self.assertEqual(result, 0)
            manifest = json.loads(
                (output / "storycore_game_manifest.json").read_text(encoding="utf-8")
            )
            evidence = json.loads(
                (output / "storycore_game_evidence.json").read_text(encoding="utf-8")
            )
            self.assertTrue(verify_manifest(manifest))
            self.assertEqual(manifest["content_sha256"], evidence["content_sha256"])

    def test_cli_rejects_absolute_paths(self) -> None:
        errors = io.StringIO()
        argv = ["--input", str(FIXTURE), "--output-dir", "fixtures"]

        with redirect_stderr(errors), self.assertRaises(SystemExit) as raised:
            main(argv)

        self.assertEqual(raised.exception.code, 2)
        self.assertIn("allowlisted workspace-relative path", errors.getvalue())

    def test_cli_rejects_parent_traversal(self) -> None:
        errors = io.StringIO()
        argv = [
            "--input",
            str(FIXTURE.relative_to(ROOT)),
            "--output-dir",
            "../storycore-game-escape",
        ]

        with redirect_stderr(errors), self.assertRaises(SystemExit) as raised:
            main(argv)

        self.assertEqual(raised.exception.code, 2)
        self.assertIn("allowlisted workspace-relative path", errors.getvalue())

    def test_cli_rejects_non_allowlisted_path_characters(self) -> None:
        errors = io.StringIO()
        argv = [
            "--input",
            str(FIXTURE.relative_to(ROOT)),
            "--output-dir",
            "fixtures/storycore-game/$escape",
        ]

        with redirect_stderr(errors), self.assertRaises(SystemExit) as raised:
            main(argv)

        self.assertEqual(raised.exception.code, 2)
        self.assertIn("allowlisted workspace-relative path", errors.getvalue())

    @unittest.skipUnless(hasattr(os, "O_NOFOLLOW"), "requires O_NOFOLLOW")
    def test_cli_refuses_final_output_symlinks(self) -> None:
        with tempfile.TemporaryDirectory(dir=ROOT) as directory:
            output = Path(directory)
            target = output / "target.json"
            target.write_text("unchanged", encoding="utf-8")
            (output / "storycore_game_manifest.json").symlink_to(target)
            errors = io.StringIO()
            argv = [
                "--input",
                str(FIXTURE.relative_to(ROOT)),
                "--output-dir",
                str(output.relative_to(ROOT)),
            ]

            with redirect_stderr(errors), self.assertRaises(SystemExit) as raised:
                main(argv)

            self.assertEqual(raised.exception.code, 2)
            self.assertEqual(target.read_text(encoding="utf-8"), "unchanged")

    def test_checked_in_godot_inputs_match_compiler(self) -> None:
        expected_manifest, expected_evidence = compile_spec(load_fixture())
        checked_manifest = json.loads(
            (GODOT_FIXTURE / "storycore_game_manifest.json").read_text(
                encoding="utf-8"
            )
        )
        checked_evidence = json.loads(
            (GODOT_FIXTURE / "storycore_game_evidence.json").read_text(
                encoding="utf-8"
            )
        )

        self.assertEqual(checked_manifest, expected_manifest)
        self.assertEqual(checked_evidence, expected_evidence)

    def test_godot_smoke_evidence_matches_fixture_sources(self) -> None:
        evidence = json.loads(
            (GODOT_FIXTURE / "godot_smoke_evidence.json").read_text(
                encoding="utf-8"
            )
        )
        expected_hashes = {
            "main_script_sha256": "Main.gd",
            "manifest_file_sha256": "storycore_game_manifest.json",
            "project_file_sha256": "project.godot",
            "smoke_script_sha256": "SmokeTest.gd",
        }

        for evidence_key, file_name in expected_hashes.items():
            content = (GODOT_FIXTURE / file_name).read_bytes()
            self.assertEqual(
                evidence["fixture"][evidence_key], hashlib.sha256(content).hexdigest()
            )
        self.assertEqual(evidence["status"], "pass")
        self.assertEqual(evidence["result"]["marker"], "STORYCORE_GAME_SMOKE_PASS")


if __name__ == "__main__":
    unittest.main()
