"""Operator-supplied paths stay inside the declared root."""

from pathlib import Path

import pytest

from src.narrative_integrity.paths import (
    PathRefused,
    resolve_output,
    resolve_read,
    write_text_in_root,
)


def test_a_plain_name_inside_the_root_is_accepted(tmp_path):
    subject = tmp_path / "subject.md"
    subject.write_text("Un texte.", encoding="utf-8")

    assert resolve_read("subject.md", root=tmp_path) == subject.resolve()


def test_a_nested_relative_path_is_accepted(tmp_path):
    nested = tmp_path / "chapters"
    nested.mkdir()
    (nested / "one.md").write_text("Un texte.", encoding="utf-8")

    assert resolve_read("chapters/one.md", root=tmp_path) == (nested / "one.md").resolve()


def test_an_absolute_path_inside_the_root_is_accepted(tmp_path):
    subject = tmp_path / "subject.md"
    subject.write_text("Un texte.", encoding="utf-8")

    assert resolve_read(str(subject), root=tmp_path) == subject.resolve()


def test_traversal_out_of_the_root_is_refused(tmp_path):
    with pytest.raises(PathRefused):
        resolve_read("../outside.md", root=tmp_path)


def test_an_absolute_path_outside_the_root_is_refused(tmp_path):
    outside = Path(tmp_path).parent / "outside.md"
    outside.write_text("Un texte.", encoding="utf-8")

    with pytest.raises(PathRefused):
        resolve_read(str(outside), root=tmp_path / "inside")


def test_a_missing_input_is_refused_rather_than_read(tmp_path):
    with pytest.raises(PathRefused):
        resolve_read("absent.md", root=tmp_path)


@pytest.mark.parametrize(
    "name", ["*.md", "a|b.md", "c:d.md", "e\x00f.md", "g<h.md"]
)
def test_a_name_that_is_not_a_plain_name_is_refused(tmp_path, name):
    with pytest.raises(PathRefused):
        resolve_read(name, root=tmp_path)


def test_an_output_may_not_exist_yet_but_stays_inside_the_root(tmp_path):
    target = resolve_output("profiles/locked.json", root=tmp_path)

    assert target == (tmp_path / "profiles" / "locked.json").resolve()


def test_an_output_outside_the_root_is_refused(tmp_path):
    with pytest.raises(PathRefused):
        resolve_output("../outside.json", root=tmp_path)


def test_an_empty_path_is_refused(tmp_path):
    with pytest.raises(PathRefused):
        resolve_read("   ", root=tmp_path)


def test_an_accented_name_is_accepted(tmp_path):
    subject = tmp_path / "chapitre-é.md"
    subject.write_text("Un texte.", encoding="utf-8")

    assert resolve_read("chapitre-é.md", root=tmp_path) == subject.resolve()


def test_a_write_creates_its_directory_inside_the_root(tmp_path):
    target = write_text_in_root("profiles/locked.json", "{}", root=tmp_path)

    assert target.read_text(encoding="utf-8") == "{}"
    assert target == (tmp_path / "profiles" / "locked.json").resolve()


def test_a_write_that_asks_to_escape_the_root_is_refused(tmp_path):
    with pytest.raises(PathRefused):
        write_text_in_root("../outside.json", "{}", root=tmp_path)


def test_a_write_re_checks_the_name_chain(tmp_path):
    with pytest.raises(PathRefused):
        write_text_in_root("profiles/*.json", "{}", root=tmp_path)
