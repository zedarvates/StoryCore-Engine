"""Confinement for every path that comes from outside the engine.

A path given on the command line is untrusted input like any other. It is checked
against a plain-name whitelist, then resolved inside one declared root, and refused
as soon as it leaves that root or addresses anything other than a plain file. The
root is the working directory unless NARRATIVE_INTEGRITY_ROOT names another one, so
the fence an operator works behind is always explicit.

Path confinement is not a permission system: it does not add rights, it only keeps
the engine on the files the operator actually named.
"""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import List, Optional, Union

ROOT_ENV_VAR = "NARRATIVE_INTEGRITY_ROOT"

PathArgument = Union[str, "os.PathLike[str]"]

# A segment is a plain name: a first character that cannot be a separator, then
# letters, digits and a small set of punctuation. Drive syntax, wildcards,
# redirection characters, control characters and traversal are refused by
# construction, before the file system is touched at all.
_SEGMENT_RE = re.compile(r"\A[A-Za-z0-9_.][A-Za-z0-9 ._()+-]*\Z")
_REFUSED_SEGMENTS = frozenset({".", ".."})


class PathRefused(ValueError):
    """An operator-supplied path is not a plain path inside the declared root."""


def root_directory(explicit: Optional[PathArgument] = None) -> Path:
    """The single directory an operator-supplied path is allowed to live in."""

    if explicit is not None:
        return Path(explicit).resolve()
    configured = os.environ.get(ROOT_ENV_VAR, "").strip()
    return Path(configured).resolve() if configured else Path.cwd().resolve()


def _validated_names(candidate: Path, raw: PathArgument) -> List[str]:
    """The plain names the path is made of, or a refusal."""

    anchor = candidate.anchor
    names = [part for part in candidate.parts if part != anchor]
    for name in names:
        if name in _REFUSED_SEGMENTS or not _SEGMENT_RE.match(name):
            raise PathRefused(
                "refused segment %r in %s: a path is a plain name or a chain of "
                "plain names" % (name, raw)
            )
    if not names and not candidate.is_absolute():
        raise PathRefused("no file name in %s" % (raw,))
    return names


def _inside(child: Path, parent: Path) -> bool:
    child_text = os.path.normcase(str(child))
    parent_text = os.path.normcase(str(parent)).rstrip("\\/")
    if not parent_text:
        return True
    return child_text == parent_text or child_text.startswith(parent_text + os.sep)


def _resolve(
    raw: PathArgument, root=None, label: str = "path", must_exist: bool = True
) -> Path:
    base = root_directory(root)
    text = str(raw).strip()
    if not text:
        raise PathRefused("empty %s" % label)

    candidate = Path(text)
    names = _validated_names(candidate, raw)
    # A relative path is rebuilt from the validated names, never reused as written.
    resolved = candidate.resolve() if candidate.is_absolute() else base.joinpath(*names).resolve()

    if not _inside(resolved, base):
        raise PathRefused(
            "%s is outside the declared root %s; move it inside, or point %s at its "
            "directory" % (raw, base, ROOT_ENV_VAR)
        )
    if must_exist and not resolved.is_file():
        raise PathRefused("%s not found: %s" % (label, resolved))
    return resolved


def resolve_read(raw: PathArgument, root=None, label: str = "path") -> Path:
    """Resolve a path the operator named for reading, inside the declared root."""

    return _resolve(raw, root=root, label=label, must_exist=True)


def resolve_output(raw: PathArgument, root=None, label: str = "path") -> Path:
    """Resolve a path the operator named for writing, inside the declared root.

    The target itself may not exist yet; its directory must be inside the root.
    """

    return _resolve(raw, root=root, label=label, must_exist=False)
