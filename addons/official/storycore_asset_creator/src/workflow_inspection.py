"""Read-only ComfyUI workflow inventory shared by Python callers and the CLI.

Recognition of an editor document or API prompt is not runtime validation.
This module never imports custom nodes, converts graphs or contacts a server.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any

from .trellis_workflows import _WORKFLOWS_DIR, PRESETS

SCHEMA = "storycore.workflow-inspection/v1"

# A file this module is willing to open: an optional anchor, then one or more plain
# names. Traversal, drive-relative syntax, wildcards, redirection characters and
# control characters are refused by the same rule, before anything is opened.
_PLAIN_SEGMENT = r"(?:[\w][\w ._()+\-,@%\[\]']*|\.[\w][\w ._()+\-,@%\[\]']*)"
_PLAIN_PATH_RE = re.compile(
    r"\A(?:[A-Za-z]:[\\/]|[\\/])?(?:" + _PLAIN_SEGMENT + r"[\\/])*" + _PLAIN_SEGMENT + r"\Z"
)


class WorkflowPathRefused(ValueError):
    """The requested path is not a plain local path this module will open."""


def _source_path(raw: str | Path) -> Path:
    """The file to read, once its name chain has been checked.

    The inventory exists to open a local JSON file named by its caller, so the name is
    taken as a plain chain of segments and refused otherwise. That is not a permission
    system: it only keeps the read on the file that was actually named.
    """

    text = str(raw).strip()
    if not text or not _PLAIN_PATH_RE.match(text):
        raise WorkflowPathRefused("refused path: %s" % (raw,))
    return Path(text).resolve()


def _unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate_json_key")
        result[key] = value
    return result


def _reject_constant(value: str) -> None:
    raise ValueError("nonfinite_json_number")


def _blank_report(path: Path) -> dict[str, Any]:
    """The report of a file that has not been read yet."""
    return {
        "path": str(path),
        "status": "invalid",
        "format": "unknown",
        "sha256": None,
        "bytes": None,
        "node_count": 0,
        "node_types": [],
        "declared_extensions": [],
        "api_export_required": None,
        "execution_verified": False,
        "errors": [],
    }


def _editor_errors(nodes: list) -> str | None:
    """Why the declared editor nodes are unusable, or nothing."""
    if not nodes:
        return "invalid_editor_nodes"
    for node in nodes:
        if not isinstance(node, dict):
            return "invalid_editor_nodes"
        if type(node.get("id")) not in (str, int) or not str(node["id"]):
            return "invalid_editor_nodes"
        if not isinstance(node.get("type"), str) or not node["type"].strip():
            return "invalid_editor_nodes"
    if len({str(node["id"]) for node in nodes}) != len(nodes):
        return "duplicate_node_id"
    return None


def _api_errors(document: dict) -> str | None:
    """Why the declared API nodes are unusable, or nothing."""
    if any(not key.strip() for key in document):
        return "invalid_api_nodes"
    for node in document.values():
        if not isinstance(node, dict) or not isinstance(node.get("class_type"), str):
            return "invalid_api_nodes"
        if not node["class_type"].strip() or not isinstance(node.get("inputs"), dict):
            return "invalid_api_nodes"
    return None


def _declare(document: dict) -> tuple[str | None, str, list, set]:
    """Declared nodes, their types and the shape they were declared in.

    Returns the reason the document cannot be read as a workflow, or the format, the
    node list and the node types. An editor document carries its nodes under "nodes";
    an API prompt is a mapping of node identifiers to node objects.
    """
    if isinstance(document.get("nodes"), list):
        nodes = document["nodes"]
        error = _editor_errors(nodes)
        if error:
            return error, "editor", [], set()
        return None, "editor", nodes, {node["type"] for node in nodes}
    nodes = list(document.values())
    error = _api_errors(document)
    if error:
        return error, "api", [], set()
    return None, "api", nodes, {node["class_type"] for node in nodes}


def _declared_extensions(nodes: list) -> list[dict[str, Any]]:
    """The extension identifiers the nodes declare, each next to its version."""
    extensions = set()
    for node in nodes:
        properties = node.get("properties", {})
        if not isinstance(properties, dict):
            continue
        version = properties.get("ver")
        for field in ("cnr_id", "aux_id"):
            extension = properties.get(field)
            if isinstance(extension, str) and isinstance(version, str):
                extensions.add((field, extension, version))
    return [
        {"id_source": field, "id": extension, "version": version}
        for field, extension, version in sorted(extensions)
    ]


def inspect_workflow_file(path: str | Path) -> dict[str, Any]:
    """Read one JSON file and inventory declared nodes without changing it.

    The SHA-256 identifies the original bytes, including invalid JSON. Node
    versions are declarations from the file, not installed-version evidence.
    """
    report = _blank_report(Path(path))
    try:
        source = _source_path(path)
    except WorkflowPathRefused:
        report["errors"] = ["path_refused"]
        return report
    try:
        raw = source.read_bytes()
    except FileNotFoundError:
        report.update(status="missing", errors=["file_missing"])
        return report
    except OSError:
        report["errors"] = ["file_unreadable"]
        return report
    report.update(sha256=hashlib.sha256(raw).hexdigest(), bytes=len(raw))
    try:
        document = json.loads(
            raw.decode("utf-8-sig"),
            object_pairs_hook=_unique_object,
            parse_constant=_reject_constant,
        )
    except (ValueError, RecursionError):  # UnicodeError already is a ValueError
        report["errors"] = ["invalid_json"]
        return report

    if not isinstance(document, dict) or not document:
        report["errors"] = ["invalid_structure"]
        return report

    error, document_format, nodes, node_types = _declare(document)
    if error:
        report["errors"] = [error]
        return report

    report.update(
        format=document_format,
        api_export_required=document_format == "editor",
        status="inspected",
        node_count=len(nodes),
        node_types=sorted(node_types),
        declared_extensions=_declared_extensions(nodes),
    )
    return report


def inspect_presets(directory: str | Path = _WORKFLOWS_DIR) -> list[dict[str, Any]]:
    """Inventory exactly the four declared presets, including missing files."""
    return [
        {"preset": preset, **inspect_workflow_file(Path(directory) / filename)}
        for preset, filename in PRESETS.items()
    ]


class _Parser(argparse.ArgumentParser):
    def error(self, message: str) -> None:
        raise ValueError(message)


def main(argv: list[str] | None = None) -> int:
    """Print one JSON result; 0 means inspected, not approved for execution."""
    parser = _Parser(description=__doc__)
    parser.add_argument("files", nargs="*", help="Local JSON files to inspect")
    parser.add_argument(
        "--presets-dir", type=Path, help="Directory of the four presets"
    )
    result: dict[str, Any] = {
        "schema": SCHEMA,
        "execution_verified": False,
        "reports": [],
        "errors": [],
    }
    try:
        args = parser.parse_args(argv)
        if args.files and args.presets_dir is not None:
            raise ValueError("Choose files or --presets-dir, not both")
    except ValueError as error:
        result["errors"] = [{"code": "usage_error", "message": str(error)}]
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 2
    if args.files:
        result["reports"] = [inspect_workflow_file(path) for path in args.files]
    else:
        result["reports"] = inspect_presets(
            args.presets_dir if args.presets_dir is not None else _WORKFLOWS_DIR
        )
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if all(item["status"] == "inspected" for item in result["reports"]) else 2


if __name__ == "__main__":
    raise SystemExit(main())
