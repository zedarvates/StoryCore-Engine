"""Read-only ComfyUI workflow inventory shared by Python callers and the CLI.

Recognition of an editor document or API prompt is not runtime validation.
This module never imports custom nodes, converts graphs or contacts a server.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

from .trellis_workflows import _WORKFLOWS_DIR, PRESETS

SCHEMA = "storycore.workflow-inspection/v1"


def _unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate_json_key")
        result[key] = value
    return result


def _reject_constant(value: str) -> None:
    raise ValueError("nonfinite_json_number")


def inspect_workflow_file(path: str | Path) -> dict[str, Any]:
    """Read one JSON file and inventory declared nodes without changing it.

    The SHA-256 identifies the original bytes, including invalid JSON. Node
    versions are declarations from the file, not installed-version evidence.
    """
    source = Path(path)
    report: dict[str, Any] = {
        "path": str(source),
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
    except (UnicodeError, ValueError, RecursionError):
        report["errors"] = ["invalid_json"]
        return report

    if not isinstance(document, dict) or not document:
        report["errors"] = ["invalid_structure"]
        return report
    if isinstance(document.get("nodes"), list):
        nodes = document["nodes"]
        if not nodes or any(
            not isinstance(node, dict)
            or type(node.get("id")) not in (str, int)
            or not str(node["id"])
            or not isinstance(node.get("type"), str)
            or not node["type"].strip()
            for node in nodes
        ):
            report["errors"] = ["invalid_editor_nodes"]
            return report
        if len({str(node["id"]) for node in nodes}) != len(nodes):
            report["errors"] = ["duplicate_node_id"]
            return report
        node_types = {node["type"] for node in nodes}
        report.update(format="editor", api_export_required=True)
    else:
        nodes = list(document.values())
        if any(not key.strip() for key in document) or any(
            not isinstance(node, dict)
            or not isinstance(node.get("class_type"), str)
            or not node["class_type"].strip()
            or not isinstance(node.get("inputs"), dict)
            for node in nodes
        ):
            report["errors"] = ["invalid_api_nodes"]
            return report
        node_types = {node["class_type"] for node in nodes}
        report.update(format="api", api_export_required=False)

    extensions = set()
    for node in nodes:
        properties = node.get("properties", {})
        if isinstance(properties, dict):
            version = properties.get("ver")
            for field in ("cnr_id", "aux_id"):
                extension = properties.get(field)
                if isinstance(extension, str) and isinstance(version, str):
                    extensions.add((field, extension, version))
    report.update(
        status="inspected",
        node_count=len(nodes),
        node_types=sorted(node_types),
        declared_extensions=[
            {"id_source": field, "id": extension, "version": version}
            for field, extension, version in sorted(extensions)
        ],
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
