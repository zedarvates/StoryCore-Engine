"""Hidden channels and French typography.

The rule under test: a character is removed only where it has no job. A no-break space
before a French punctuation mark is doing work and must survive.
"""

from src.narrative_integrity.text_scan import (
    clean_text,
    count_words,
    fold_homoglyphs,
    hidden_channel_scan,
    homoglyph_runs,
    split_sentences,
)

NBSP = chr(0x00A0)
NNBSP = chr(0x202F)
ZWSP = chr(0x200B)
ZWNJ = chr(0x200C)
ZWJ = chr(0x200D)
BOM = chr(0xFEFF)
TAG_H = chr(0xE0068)
TAG_I = chr(0xE0069)


def test_french_no_break_space_before_punctuation_survives():
    text = "Vraiment" + NBSP + "? Oui."
    cleaned, report = clean_text(text)
    assert cleaned == text
    assert report["kept_french_spaces"] == 1
    assert report["removed_total"] == 0


def test_french_narrow_no_break_space_before_a_unit_survives():
    text = "Une hausse de 40" + NNBSP + "% depuis 2019."
    cleaned, report = clean_text(text)
    assert cleaned == text
    assert report["kept_french_spaces"] == 1
    assert report["removed_total"] == 0


def test_french_quotation_marks_keep_their_inner_spaces():
    text = "Le " + NBSP + "prix" + NBSP + " compte."
    text = "«" + NBSP + "prix" + NBSP + "»"
    cleaned, report = clean_text(text)
    assert cleaned == text
    assert report["kept_french_spaces"] == 2


def test_ordinary_word_separator_space_is_normalised():
    cleaned, report = clean_text("le" + NBSP + "chat dort")
    assert cleaned == "le chat dort"
    assert report["kept_french_spaces"] == 0
    assert report["removed"].get("nonstandard_space") == 1


def test_zero_width_characters_are_removed():
    cleaned, report = clean_text("pum" + ZWSP + "p" + ZWNJ + " " + ZWJ + "moves")
    assert ZWSP not in cleaned
    assert ZWNJ not in cleaned
    assert ZWJ not in cleaned
    assert report["removed"]["zero_width"] == 3


def test_tag_block_payload_is_removed_and_counted():
    cleaned, report = clean_text("Rapport pret." + TAG_H + TAG_I)
    assert cleaned == "Rapport pret."
    assert report["removed"]["tag_block"] == 2


def test_leading_byte_order_mark_is_preserved():
    cleaned, report = clean_text(BOM + "Titre du document")
    assert cleaned.startswith(BOM)
    assert report["removed_total"] == 0


def test_mid_text_byte_order_mark_is_removed():
    cleaned, _ = clean_text("Titre" + BOM + " suite")
    assert cleaned == "Titre suite"


def test_scan_reports_channels_without_changing_text():
    text = "a" + ZWSP + "b" + TAG_H + "c" + NBSP + "!" + "d"
    scan = hidden_channel_scan(text)
    assert scan["zero_width"] == 1
    assert scan["tag_block"] == 1
    assert scan["nonstandard_spaces_french"] == 1
    assert text == "a" + ZWSP + "b" + TAG_H + "c" + NBSP + "!" + "d"


def test_homoglyphs_are_reported_but_not_folded_by_default():
    text = "Le p" + chr(0x0430) + "per est pret."
    cleaned, report = clean_text(text)
    assert cleaned == text
    assert report["fold_applied"] is False
    assert homoglyph_runs(text) == ["p" + chr(0x0430) + "per"]


def test_folding_homoglyphs_is_opt_in():
    text = "Le p" + chr(0x0430) + "per est pret."
    folded, tokens = fold_homoglyphs(text)
    assert folded == "Le paper est pret."
    assert tokens == ["p" + chr(0x0430) + "per"]


def test_genuine_cyrillic_sentence_is_untouched():
    text = "Насос перекачивает воду."
    cleaned, report = clean_text(text)
    assert cleaned == text
    assert report["removed_total"] == 0
    assert homoglyph_runs(text) == []


def test_sentence_split_does_not_break_on_abbreviations():
    sentences = split_sentences("Le Dr. Martin arrive. Il salue l'assemblee.")
    assert len(sentences) == 2
    assert "Martin" in sentences[0]


def test_word_count_handles_french_accents_and_apostrophes():
    assert count_words("L'etre humain change") == 3
    assert count_words("ete") == 1
