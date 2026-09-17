"""HTTP/status regressions without a ComfyUI server, Blender or GPU."""

import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, Mock, patch

import requests

SOURCE = (
    Path(__file__).resolve().parents[2]
    / "addons/official/storycore_asset_creator/src/comfyui_client.py"
)
SPEC = importlib.util.spec_from_file_location("asset_creator_client", SOURCE)
client_module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(client_module)
ComfyUIClient = client_module.ComfyUIClient
PROMPT_ID = "accepted-prompt-id"
OUTPUTS = {"7": {"images": [{"filename": "partial.png"}]}}


def history(outputs=None, *, status="success", completed=True):
    return {
        "outputs": OUTPUTS if outputs is None else outputs,
        "status": {
            "status_str": status,
            "completed": completed,
            "messages": [["execution_error", {"exception_message": "out of memory"}]]
            if status == "error"
            else [],
        },
    }


def response(payload=None):
    result = MagicMock()
    result.json.return_value = payload
    result.status_code = 200
    result.__enter__.return_value = result
    return result


class Clock:
    def __init__(self):
        self.now = 0.0
        self.sleeps = []

    def monotonic(self):
        return self.now

    def sleep(self, seconds):
        self.sleeps.append(seconds)
        self.now += seconds


class ComfyUIClientTests(unittest.TestCase):
    def setUp(self):
        sockets = patch(
            "socket.socket", side_effect=AssertionError("network forbidden")
        )
        sockets.start()
        self.addCleanup(sockets.stop)
        self.clock = Clock()
        clock_patch = patch.object(client_module, "time", self.clock)
        clock_patch.start()
        self.addCleanup(clock_patch.stop)
        self.client = ComfyUIClient(port=8188, request_timeout=7.0)

    def test_error_status_wins_over_partial_outputs(self):
        for completed in (False, True):
            with (
                self.subTest(completed=completed),
                patch.object(
                    self.client,
                    "get_history",
                    return_value=history(status="error", completed=completed),
                ),
            ):
                with self.assertRaisesRegex(RuntimeError, "out of memory") as caught:
                    self.client.wait_for_result(PROMPT_ID)
                self.assertIn(PROMPT_ID, str(caught.exception))
        self.assertEqual([], self.clock.sleeps)

    def test_legacy_top_level_error_still_fails(self):
        with (
            patch.object(
                self.client,
                "get_history",
                return_value={"error": "failed", "outputs": OUTPUTS},
            ),
            self.assertRaisesRegex(RuntimeError, "failed"),
        ):
            self.client.wait_for_result(PROMPT_ID)

    def test_only_explicit_completed_success_returns_outputs(self):
        for outputs in ({}, OUTPUTS):
            with (
                self.subTest(outputs=outputs),
                patch.object(self.client, "get_history", return_value=history(outputs)),
            ):
                self.assertEqual(outputs, self.client.wait_for_result(PROMPT_ID))
        self.assertEqual([], self.clock.sleeps)

    def test_unknown_or_incomplete_status_does_not_return_partial_outputs(self):
        cases = [
            {"outputs": OUTPUTS},
            {"outputs": OUTPUTS, "status": None},
            {"outputs": OUTPUTS, "status": "success"},
            history(completed=False),
            history(completed="true"),
            history(status="unknown"),
        ]
        for item in cases:
            with (
                self.subTest(item=item),
                patch.object(self.client, "get_history", return_value=item),
                self.assertRaises(TimeoutError),
            ):
                self.client.wait_for_result(PROMPT_ID, timeout=1)

    def test_success_with_malformed_outputs_fails(self):
        with (
            patch.object(self.client, "get_history", return_value=history([])),
            self.assertRaisesRegex(RuntimeError, "outputs invalides"),
        ):
            self.client.wait_for_result(PROMPT_ID)

    def test_sleep_is_clipped_and_no_request_starts_after_deadline(self):
        with (
            patch.object(
                client_module.requests, "get", return_value=response({})
            ) as get,
            self.assertRaises(client_module.ComfyUIWaitTimeout) as caught,
        ):
            self.client.wait_for_result(PROMPT_ID, timeout=5, poll_interval=3)
        self.assertEqual([3, 2], self.clock.sleeps)
        self.assertEqual(
            [5, 2], [call.kwargs["timeout"] for call in get.call_args_list]
        )
        self.assertEqual(PROMPT_ID, caught.exception.prompt_id)
        self.assertEqual("wait_deadline", caught.exception.reason)

    def test_late_history_response_does_not_start_queue_poll(self):
        def late_history(*args, **kwargs):
            self.clock.now += 6
            return response({PROMPT_ID: history()})

        callback = Mock()
        with (
            patch.object(
                client_module.requests, "get", side_effect=late_history
            ) as get,
            self.assertRaises(client_module.ComfyUIWaitTimeout),
        ):
            self.client.wait_for_result(
                PROMPT_ID, timeout=5, progress_callback=callback
            )
        self.assertEqual(1, get.call_count)
        callback.assert_not_called()
        self.assertEqual([], self.clock.sleeps)

    def test_queue_poll_uses_remaining_budget(self):
        budgets = []

        def get(url, **kwargs):
            budgets.append(kwargs["timeout"])
            if "/history/" in url:
                self.clock.now += 3
                return response({})
            self.clock.now += 2
            return response({"queue_running": [], "queue_pending": []})

        callback = Mock()
        with (
            patch.object(client_module.requests, "get", side_effect=get),
            self.assertRaises(client_module.ComfyUIWaitTimeout),
        ):
            self.client.wait_for_result(
                PROMPT_ID, timeout=5, progress_callback=callback
            )
        self.assertEqual([5, 2], budgets)
        callback.assert_not_called()

    def test_callback_time_counts_towards_deadline(self):
        def slow_callback(status):
            self.clock.now += 5

        with (
            patch.object(
                client_module.requests,
                "get",
                side_effect=[
                    response({}),
                    response({"queue_running": [], "queue_pending": []}),
                ],
            ) as get,
            self.assertRaises(client_module.ComfyUIWaitTimeout),
        ):
            self.client.wait_for_result(
                PROMPT_ID, timeout=5, progress_callback=slow_callback
            )
        self.assertEqual(2, get.call_count)
        self.assertEqual([], self.clock.sleeps)

    def test_http_timeout_preserves_prompt_and_cause_for_both_poll_endpoints(self):
        for endpoint in ("history", "queue"):
            error = requests.exceptions.ReadTimeout("server silent")
            effects = [error] if endpoint == "history" else [response({}), error]
            with (
                self.subTest(endpoint=endpoint),
                patch.object(client_module.requests, "get", side_effect=effects) as get,
                patch.object(client_module.requests, "post") as post,
            ):
                with self.assertRaises(client_module.ComfyUIWaitTimeout) as caught:
                    self.client.wait_for_result(PROMPT_ID, progress_callback=Mock())
                self.assertEqual(PROMPT_ID, caught.exception.prompt_id)
                self.assertEqual("http_timeout", caught.exception.reason)
                self.assertIs(error, caught.exception.__cause__)
                self.assertEqual(len(effects), get.call_count)
                post.assert_not_called()

    def test_resume_wait_after_timeout_does_not_submit_again(self):
        with (
            patch.object(
                client_module.requests,
                "get",
                side_effect=[
                    requests.exceptions.ReadTimeout(),
                    response({PROMPT_ID: history()}),
                ],
            ) as get,
            patch.object(client_module.requests, "post") as post,
        ):
            with self.assertRaises(client_module.ComfyUIWaitTimeout) as caught:
                self.client.wait_for_result(PROMPT_ID)
            outputs = self.client.wait_for_result(caught.exception.prompt_id)
        self.assertEqual(OUTPUTS, outputs)
        self.assertTrue(
            all(call.args[0].endswith(PROMPT_ID) for call in get.call_args_list)
        )
        post.assert_not_called()

    def test_invalid_durations_fail_before_http(self):
        for value in (0, -1, float("nan"), float("inf"), -float("inf")):
            with (
                self.subTest(value=value),
                patch.object(client_module.requests, "get") as get,
            ):
                with self.assertRaises(ValueError):
                    ComfyUIClient(port=8188, request_timeout=value)
                for argument in ("timeout", "poll_interval"):
                    with self.assertRaises(ValueError):
                        self.client.wait_for_result(PROMPT_ID, **{argument: value})
                get.assert_not_called()

    def test_all_http_operations_receive_timeout(self):
        for duration in (1.5, 30.0):
            with self.subTest(duration=duration), tempfile.TemporaryDirectory() as temp:
                client = ComfyUIClient(port=8188, request_timeout=duration)
                source = Path(temp) / "source.png"
                source.write_bytes(b"synthetic image")
                reply = response({"prompt_id": PROMPT_ID})
                with patch.object(
                    client_module.requests, "post", return_value=reply
                ) as post:
                    client.upload_image(str(source), subfolder="assets")
                    self.assertEqual(PROMPT_ID, client.queue_workflow({}))
                self.assertEqual(
                    [duration, duration],
                    [c.kwargs["timeout"] for c in post.call_args_list],
                )
                self.assertTrue(
                    post.call_args_list[0].kwargs["files"]["image"][1].closed
                )
                reply = response({})
                reply.iter_content.return_value = [b"mesh"]
                with patch.object(
                    client_module.requests, "get", return_value=reply
                ) as get:
                    self.assertTrue(client.is_alive())
                    client.get_queue_status()
                    client.get_history(PROMPT_ID)
                    output = client.download_output("mesh.glb", temp)
                self.assertEqual(
                    [min(5, duration), duration, duration, duration],
                    [c.kwargs["timeout"] for c in get.call_args_list],
                )
                self.assertEqual(b"mesh", Path(output).read_bytes())
                reply.__exit__.assert_called_once()

    def test_get_timeouts_are_capped_by_client_configuration(self):
        with patch.object(
            client_module.requests, "get", return_value=response({})
        ) as get:
            self.client.get_history(PROMPT_ID, timeout=99)
            self.client.get_queue_status(timeout=1)
        self.assertEqual([7, 1], [c.kwargs["timeout"] for c in get.call_args_list])

    def test_submission_timeout_is_not_retried(self):
        error = requests.exceptions.ReadTimeout("response lost")
        with (
            patch.object(client_module.requests, "post", side_effect=error) as post,
            self.assertRaises(requests.exceptions.ReadTimeout) as caught,
        ):
            self.client.queue_workflow({})
        self.assertIs(error, caught.exception)
        post.assert_called_once()

    def test_http_error_is_preserved(self):
        reply = response()
        reply.raise_for_status.side_effect = requests.exceptions.HTTPError("503")
        with (
            patch.object(client_module.requests, "get", return_value=reply),
            self.assertRaises(requests.exceptions.HTTPError),
        ):
            self.client.wait_for_result(PROMPT_ID)

    def test_download_closes_response_on_stream_error(self):
        reply = response()
        reply.iter_content.side_effect = requests.exceptions.ConnectionError(
            "lost stream"
        )
        with (
            tempfile.TemporaryDirectory() as temp,
            patch.object(client_module.requests, "get", return_value=reply),
            self.assertRaises(requests.exceptions.ConnectionError),
        ):
            self.client.download_output("mesh.glb", temp)
        reply.__exit__.assert_called_once()

    def test_health_check_handles_missing_dependency_and_network_errors(self):
        with patch.object(client_module, "requests", None):
            self.assertFalse(self.client.is_alive())
        with patch.object(
            client_module.requests, "get", side_effect=requests.exceptions.ReadTimeout()
        ):
            self.assertFalse(self.client.is_alive())


if __name__ == "__main__":
    unittest.main()
