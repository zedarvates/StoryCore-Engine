from __future__ import annotations

import json
import tempfile
import unittest
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
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)

            result = main(
                ["--input", str(FIXTURE), "--output-dir", str(output)]
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


if __name__ == "__main__":
    unittest.main()
