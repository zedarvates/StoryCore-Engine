"""Read-only inventory contracts; no model or node implementation is imported."""

import hashlib
import io
import json
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from addons.official.storycore_asset_creator.src import (
    workflow_inspection as inspection,
)
from addons.official.storycore_asset_creator.src.trellis_workflows import PRESETS


class WorkflowInspectionTests(unittest.TestCase):
    def setUp(self):
        temporary = TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.directory = Path(temporary.name)
        network = patch(
            "socket.socket", side_effect=AssertionError("network forbidden")
        )
        network.start()
        self.addCleanup(network.stop)

    def write(self, document, name="recipe.json"):
        path = self.directory / name
        path.write_text(json.dumps(document), encoding="utf-8")
        return path

    def test_editor_inventory_includes_disabled_nodes_as_declarations(self):
        path = self.write(
            {
                "nodes": [
                    {
                        "id": 1,
                        "type": "ImageInput",
                        "widgets_values": ["reference.png"],
                        "properties": {
                            "cnr_id": "sample-extension",
                            "ver": "revision-one",
                        },
                    },
                    {
                        "id": 2,
                        "type": "DisabledNode",
                        "mode": 2,
                        "properties": {
                            "aux_id": "example/nodes",
                            "ver": "revision-two",
                        },
                    },
                ]
            }
        )
        report = inspection.inspect_workflow_file(path)
        self.assertEqual(report["status"], "inspected")
        self.assertEqual(report["format"], "editor")
        self.assertTrue(report["api_export_required"])
        self.assertEqual(report["node_count"], 2)
        self.assertEqual(report["node_types"], ["DisabledNode", "ImageInput"])
        self.assertEqual(
            report["declared_extensions"],
            [
                {
                    "id_source": "aux_id",
                    "id": "example/nodes",
                    "version": "revision-two",
                },
                {
                    "id_source": "cnr_id",
                    "id": "sample-extension",
                    "version": "revision-one",
                },
            ],
        )
        self.assertFalse(report["execution_verified"])

    def test_api_shape_is_not_runtime_or_link_validation(self):
        path = self.write(
            {
                "1": {
                    "class_type": "NotInstalled",
                    "inputs": {
                        "image": ["missing-source", 0],
                    },
                }
            }
        )
        report = inspection.inspect_workflow_file(path)
        self.assertEqual(report["status"], "inspected")
        self.assertEqual(report["format"], "api")
        self.assertFalse(report["api_export_required"])
        self.assertFalse(report["execution_verified"])
        self.assertEqual(report["declared_extensions"], [])

    def test_original_bytes_are_identified_without_modification(self):
        path = self.directory / "bom.json"
        raw = b'\xef\xbb\xbf{ "1": {"class_type":"Fixture", "inputs":{}} }\n'
        path.write_bytes(raw)
        report = inspection.inspect_workflow_file(path)
        self.assertEqual(report["sha256"], hashlib.sha256(raw).hexdigest())
        self.assertEqual(report["bytes"], len(raw))
        self.assertEqual(report["status"], "inspected")
        self.assertEqual(path.read_bytes(), raw)

    def test_missing_and_unreadable_files_are_separate(self):
        missing = inspection.inspect_workflow_file(self.directory / "missing.json")
        self.assertEqual(missing["status"], "missing")
        self.assertIsNone(missing["sha256"])
        unreadable = inspection.inspect_workflow_file(self.directory)
        self.assertEqual(unreadable["errors"], ["file_unreadable"])

    def test_invalid_json_reports_its_fingerprint(self):
        for raw in (b"{", b'{"same":1,"same":2}', b'{"n":NaN}', b"\xff"):
            with self.subTest(raw=raw):
                path = self.directory / "invalid.json"
                path.write_bytes(raw)
                report = inspection.inspect_workflow_file(path)
                self.assertEqual(report["errors"], ["invalid_json"])
                self.assertEqual(report["sha256"], hashlib.sha256(raw).hexdigest())

    def test_invalid_editor_shapes_and_duplicate_ids_are_rejected(self):
        for nodes in (
            [],
            [None],
            [{"id": True, "type": "Example"}],
            [{"id": 1, "type": ""}],
            [{"id": 1, "type": "A"}, {"id": "1", "type": "B"}],
        ):
            with self.subTest(nodes=nodes):
                report = inspection.inspect_workflow_file(self.write({"nodes": nodes}))
                self.assertEqual(report["status"], "invalid")
                self.assertFalse(report["execution_verified"])

    def test_invalid_api_shapes_and_request_wrappers_are_rejected(self):
        for document in (
            [],
            {},
            {"1": {}},
            {"1": {"class_type": "A", "inputs": []}},
            {"prompt": {"1": {"class_type": "A", "inputs": {}}}},
        ):
            with self.subTest(document=document):
                report = inspection.inspect_workflow_file(self.write(document))
                self.assertEqual(report["status"], "invalid")

    def test_inventory_reports_each_missing_preset_without_fallback(self):
        self.write({"1": {"class_type": "A", "inputs": {}}}, PRESETS["lowvram"])
        before = sorted(path.name for path in self.directory.iterdir())
        reports = inspection.inspect_presets(self.directory)
        self.assertEqual([item["preset"] for item in reports], list(PRESETS))
        self.assertEqual(
            [item["preset"] for item in reports if item["status"] == "missing"],
            ["standard", "lowpoly", "trunk_only"],
        )
        self.assertEqual(sorted(path.name for path in self.directory.iterdir()), before)

    def test_cli_inspected_does_not_mean_execution_approved(self):
        path = self.write({"nodes": [{"id": 1, "type": "Example"}]})
        output = io.StringIO()
        with redirect_stdout(output):
            code = inspection.main([str(path)])
        result = json.loads(output.getvalue())
        self.assertEqual(code, 0)
        self.assertEqual(result["schema"], inspection.SCHEMA)
        self.assertTrue(result["reports"][0]["api_export_required"])
        self.assertFalse(result["execution_verified"])

    def test_cli_errors_and_default_inventory_remain_json(self):
        for arguments in (
            ["--unknown-option"],
            ["a.json", "--presets-dir", "folder"],
            ["--presets-dir", str(self.directory)],
        ):
            with self.subTest(arguments=arguments):
                output = io.StringIO()
                with redirect_stdout(output):
                    code = inspection.main(arguments)
                result = json.loads(output.getvalue())
                self.assertEqual(code, 2)
                self.assertEqual(result["schema"], inspection.SCHEMA)
                self.assertFalse(result["execution_verified"])
        output = io.StringIO()
        with (
            patch.object(inspection, "_WORKFLOWS_DIR", self.directory),
            redirect_stdout(output),
        ):
            self.assertEqual(inspection.main([]), 2)
        self.assertEqual(len(json.loads(output.getvalue())["reports"]), 4)


if __name__ == "__main__":
    unittest.main()
