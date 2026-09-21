"""Local ordering regressions; synthetic templates, no ComfyUI or Blender run."""

import copy
import io
import json
from contextlib import redirect_stdout
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import Mock, patch

from addons.official.storycore_asset_creator.src import trellis_workflows as workflows
from addons.official.storycore_asset_creator.src.pipeline_image_to_3d import (
    ImageTo3DPipeline,
)


def synthetic_template():
    """Exercise existing editor fields; this is not an executable API graph."""
    return {
        "nodes": [
            {"type": "Trellis2LoadImageWithTransparency", "widgets_values": ["old.png"]},
            {"type": "PrimitiveString", "widgets_values": ["OldAsset"]},
            {
                "type": "Trellis2MeshWithVoxelAdvancedGenerator",
                "widgets_values": [0, "fixed", "1024"],
            },
            {"type": "Trellis2PreProcessImage", "widgets_values": [25, True]},
        ],
        "extra": {"fixture": "synthetic-editor-template"},
    }


class PreflightTests(unittest.TestCase):
    def setUp(self):
        temporary = TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.recipes = self.root / "workflows"
        self.recipes.mkdir()
        self.image = self.root / "source.png"
        # The fake upload never reads this marker as an image.
        self.image.write_bytes(b"synthetic input marker, not a PNG")
        self.output = self.root / "output"
        recipe_patch = patch.object(workflows, "_WORKFLOWS_DIR", self.recipes)
        recipe_patch.start()
        self.addCleanup(recipe_patch.stop)
        # Fail any accidental request, including a future unmocked code path.
        network_patch = patch(
            "socket.socket", side_effect=AssertionError("network forbidden")
        )
        network_patch.start()
        self.addCleanup(network_patch.stop)
        self.pipeline = ImageTo3DPipeline(comfyui_port=8188)
        self.client = Mock(spec=self.pipeline.client)
        self.pipeline.client = self.client
        self.client.is_alive.return_value = True
        self.client.upload_image.return_value = {"name": "server-renamed.png"}
        self.client.queue_workflow.return_value = "synthetic-prompt-id"
        self.client.wait_for_result.return_value = {"fixture": {}}
        self.client.get_output_files.return_value = []
        self.client.download_output.side_effect = (
            lambda filename, dest: str(Path(dest) / filename)
        )

    def write_recipe(self, template=None, preset="lowvram"):
        path = self.recipes / workflows.PRESETS[preset]
        path.write_text(
            json.dumps(synthetic_template() if template is None else template),
            encoding="utf-8",
        )
        return path

    def run_pipeline(self, **kwargs):
        with redirect_stdout(io.StringIO()):
            return self.pipeline.run(
                image_path=str(self.image),
                asset_name="Fixture",
                output_dir=str(self.output),
                **kwargs,
            )

    def assert_no_client_calls(self):
        self.assertEqual(self.client.mock_calls, [])
        self.assertFalse(self.output.exists())

    def test_missing_recipe_fails_before_any_client_call(self):
        with self.assertRaises(FileNotFoundError):
            self.run_pipeline()
        self.assert_no_client_calls()

    def test_invalid_json_fails_before_any_client_call(self):
        path = self.write_recipe()
        path.write_text("{broken", encoding="utf-8")
        with self.assertRaises(json.JSONDecodeError):
            self.run_pipeline()
        self.assert_no_client_calls()

    def test_unknown_preset_does_not_fall_back_to_lowvram(self):
        self.write_recipe()
        with self.assertRaisesRegex(ValueError, "Preset Trellis2 inconnu"):
            self.run_pipeline(preset="lowvrma")
        self.assert_no_client_calls()

    def test_missing_source_fails_before_any_client_call(self):
        self.write_recipe()
        self.image.unlink()
        with self.assertRaises(FileNotFoundError):
            self.run_pipeline()
        self.assert_no_client_calls()

    def test_invalid_editor_shape_fails_before_any_client_call(self):
        for template in ([], {}, {"nodes": {}}, {"nodes": [None]}):
            with self.subTest(template=template):
                self.write_recipe(template)
                with self.assertRaises(ValueError):
                    self.run_pipeline()
                self.assert_no_client_calls()

    def test_missing_or_unpatchable_image_node_fails_before_upload(self):
        for widgets in (None, [], "not-a-widget-list"):
            with self.subTest(widgets=widgets):
                template = synthetic_template()
                template["nodes"][0]["widgets_values"] = widgets
                self.write_recipe(template)
                with self.assertRaises(ValueError):
                    self.run_pipeline()
                self.assert_no_client_calls()
        self.write_recipe({"nodes": [{"type": "Unrelated", "widgets_values": []}]})
        with self.assertRaises(ValueError):
            self.run_pipeline()
        self.assert_no_client_calls()

    def test_prepared_recipe_is_reused_and_upload_name_is_patched(self):
        path = self.write_recipe()
        original = json.loads(path.read_text(encoding="utf-8"))

        def server_available():
            # A template changed after preflight must not replace the prepared one.
            path.write_text("{changed after preflight", encoding="utf-8")
            return True

        self.client.is_alive.side_effect = server_available
        with patch.object(
            workflows, "load_workflow", wraps=workflows.load_workflow
        ) as load:
            result = self.run_pipeline(seed=73, remove_background=False)
        load.assert_called_once_with("lowvram")
        self.client.upload_image.assert_called_once_with(str(self.image))
        self.client.queue_workflow.assert_called_once()
        submitted = self.client.queue_workflow.call_args.args[0]
        expected = copy.deepcopy(original)
        expected["nodes"][0]["widgets_values"][0] = "server-renamed.png"
        expected["nodes"][1]["widgets_values"][0] = "Fixture"
        expected["nodes"][2]["widgets_values"] = [73, "fixed", "512"]
        expected["nodes"][3]["widgets_values"] = [25, False]
        self.assertEqual(submitted, expected)
        self.assertEqual(result["prompt_id"], "synthetic-prompt-id")
        self.assertEqual(
            [call[0] for call in self.client.mock_calls[:4]],
            ["is_alive", "upload_image", "queue_workflow", "wait_for_result"],
        )

    def test_all_declared_presets_can_prepare_without_modifying_source(self):
        for preset in workflows.PRESETS:
            with self.subTest(preset=preset):
                path = self.write_recipe(preset=preset)
                before = path.read_bytes()
                prepared = workflows.build_workflow(
                    "replacement.png", "Fixture", preset
                )
                self.assertEqual(
                    prepared["nodes"][0]["widgets_values"], ["replacement.png"]
                )
                self.assertEqual(path.read_bytes(), before)

    def test_unavailable_server_never_uploads_or_queues(self):
        self.write_recipe()
        self.client.is_alive.return_value = False
        with self.assertRaises(ConnectionError):
            self.run_pipeline()
        self.client.is_alive.assert_called_once()
        self.client.upload_image.assert_not_called()
        self.client.queue_workflow.assert_not_called()


if __name__ == "__main__":
    unittest.main()
