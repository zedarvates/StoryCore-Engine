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

# A segment is a plain name: a letter, a digit or an underscore to start with, then
# letters (accented ones included), digits, spaces and a small set of punctuation. A
# leading dot is allowed for dot-files, but a name that is nothing but dots is not, so
# traversal cannot be written at all. Drive syntax, wildcards, redirection characters
# and control characters are refused by the same rule, before the file system is
# touched.
_SEGMENT = r"(?:\w[\w ._()+\-,@%\[\]]*|\.\w[\w ._()+\-,@%\[\]]*)"
_SEGMENT_RE = re.compile(r"\A" + _SEGMENT + r"\Z")
PLAIN_PATH_RE = re.compile(
    r"\A(?:[A-Za-z]:[\\/]|[\\/])?(?:" + _SEGMENT + r"[\\/])*" + _SEGMENT + r"\Z"
)


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
        if not _SEGMENT_RE.match(name):
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


def write_text_in_root(
    raw: PathArgument, payload: str, root=None, label: str = "path"
) -> Path:
    """Write a payload to an operator-supplied path, inside the declared root.

    The name chain is validated here, immediately before the write, so the sink never
    receives a path that nothing has checked: traversal, drive-relative syntax,
    wildcards and control characters are refused first. Confinement to the root is
    then applied to the validated chain rather than to the argument as written.
    """

    text = str(raw).strip()
    if not PLAIN_PATH_RE.match(text):
        raise PathRefused("refused %s: %s" % (label, raw))
    target = _resolve(text, root=root, label=label, must_exist=False)
    target.parent.mkdir(parents=True, exist_ok=True)
    # The destination is operator-supplied by design: this is a local CLI whose caller
    # names the file it wants written, and the name chain was just checked against
    # PLAIN_PATH_RE and confined to the root. Static taint analysis cannot see that
    # check across the call into _resolve, so the flow is reviewed in SonarCloud, not
    # annotated in the code.
    target.write_text(payload, encoding="utf-8")
    return target
