"""Text scanning utilities, French-aware.

Rule inherited from the reference study and pinned by tests: a character is removed
only where it has no job. A no-break space before a French punctuation mark is doing
work, so it is kept and never reported as debris.
"""

from __future__ import annotations

import math
import re
from typing import Any, Dict, List, NamedTuple, Optional, Sequence, Tuple

WORD_RE = re.compile("[0-9A-Za-z\u00C0-\u024F\u2019'-]+")
HOMOGLYPH_TOKEN_RE = re.compile(r"[^\W\d_]+", re.UNICODE)
SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?\u2026])\s+")

ABBREVIATIONS = {
    "m.", "mm.", "mme", "mmes.", "dr.", "etc.", "cf.", "ex.", "p.", "pp.",
    "art.", "no.", "n°", "env.", "av.", "apr.", "j.-c.", "ap.", "vol.",
}

ADVERB_STOPLIST = {
    "moment", "document", "element", "argument", "mouvement", "changement",
    "departement", "compliment", "instrument", "monument", "parlement",
    "reglement", "sentiment", "batiment", "vetement", "traitement", "jugement",
    "logement", "placement", "tournoi", "comment", "autrement",
}

BE_AUX = (
    "est", "sont", "etait", "etaient", "était", "étaient", "fut", "furent",
    "sera", "seront", "soit", "soient",
)

PARTICIPLE_RE = re.compile(
    r"[A-Za-z\u00C0-\u024F]{3,}(?:é|ée|és|ées|ie|ies|is|i|ue|ues|us|u)\b"
)

# Words that end like a participle but are not one. Bare -e endings are excluded
# above precisely because they match ordinary nouns and adjectives.
PASSIVE_STOPLIST = {
    "aussi", "ainsi", "ici", "oui", "lui", "nuit", "avis", "ceci", "celui",
    "merci", "souci", "appui", "ennui", "pays", "vie", "suite", "site",
}


def words(text: str) -> List[str]:
    """Word tokens. Accented Latin, digits, apostrophes and internal hyphens."""

    return WORD_RE.findall(text)


def count_words(text: str) -> int:
    return len(words(text))


def split_sentences(text: str) -> List[str]:
    """Sentence split that does not break on common abbreviations."""

    if not text.strip():
        return []
    pieces = SENTENCE_SPLIT_RE.split(text)
    sentences: List[str] = []
    for piece in pieces:
        stripped = piece.strip()
        if not stripped:
            continue
        if sentences and sentences[-1].lower().endswith(tuple(ABBREVIATIONS)):
            sentences[-1] = sentences[-1] + " " + stripped
        else:
            sentences.append(stripped)
    return sentences


def split_paragraphs(text: str) -> List[str]:
    return [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]


def sentence_lengths(sentences: Sequence[str]) -> List[int]:
    return [count_words(s) for s in sentences]


def coefficient_of_variation(values: Sequence[float]) -> Optional[float]:
    """Standard deviation over mean. None when undefined."""

    clean = [float(v) for v in values]
    if len(clean) < 2:
        return None
    mean = sum(clean) / len(clean)
    if mean == 0:
        return None
    variance = sum((v - mean) ** 2 for v in clean) / len(clean)
    return math.sqrt(variance) / mean


def first_two_words(sentence: str) -> str:
    tokens = words(sentence)
    return " ".join(t.lower() for t in tokens[:2])


def degenerate_repetition(
    text: str, n: int, min_words: int, rate_threshold: float
) -> Dict[str, Any]:
    """Repeated n-grams over the whole text."""

    tokens = [w.lower() for w in words(text)]
    if len(tokens) < max(min_words, n * 3):
        return {"applicable": False, "worst_rate": 0.0, "repeats": []}
    grams = [tuple(tokens[i:i + n]) for i in range(len(tokens) - n + 1)]
    total = len(grams)
    if total == 0:
        return {"applicable": False, "worst_rate": 0.0, "repeats": []}
    counts: Dict[Tuple[str, ...], int] = {}
    for gram in grams:
        counts[gram] = counts.get(gram, 0) + 1
    repeated = {g: c for g, c in counts.items() if c > 1}
    repeated_total = sum(c - 1 for c in repeated.values())
    rate = repeated_total / total
    ranked = sorted(repeated.items(), key=lambda kv: (-kv[1], kv[0]))[:5]
    return {
        "applicable": True,
        "worst_rate": round(rate, 4),
        "exceeds": rate > rate_threshold,
        "repeats": [
            {"ngram": " ".join(g), "count": c} for g, c in ranked
        ],
    }


def opener_repetition(sentences: Sequence[str], min_repeats: int) -> List[Dict[str, Any]]:
    """Sentences opening on the same two words."""

    seen: Dict[str, List[int]] = {}
    for position, sentence in enumerate(sentences):
        key = first_two_words(sentence)
        if not key:
            continue
        seen.setdefault(key, []).append(position)
    out: List[Dict[str, Any]] = []
    for key, positions in sorted(seen.items()):
        if len(positions) >= min_repeats:
            out.append({"opener": key, "count": len(positions), "sentences": positions})
    return out


def adverb_rate(text: str, stoplist: Optional[set] = None) -> Dict[str, Any]:
    """Density of -ment adverbs per 1000 words, excluding -ment nouns."""

    blocked = stoplist if stoplist is not None else ADVERB_STOPLIST
    tokens = [w.lower() for w in words(text)]
    adverbs: List[str] = []
    for token in tokens:
        if len(token) <= 5 or not token.endswith("ment"):
            continue
        if token in blocked:
            continue
        adverbs.append(token)
    total = max(len(tokens), 1)
    rate = len(adverbs) / total * 1000
    return {
        "rate_per_1000": round(rate, 2),
        "count": len(adverbs),
        "samples": sorted(set(adverbs))[:8],
    }


def passive_ratio(text: str) -> Dict[str, Any]:
    """Heuristic French passive detection: auxiliary followed by a participle."""

    sentences = split_sentences(text)
    if not sentences:
        return {"ratio": 0.0, "count": 0, "samples": []}
    hits = [sentence[:120] for sentence in sentences if _sentence_is_passive(sentence)]
    ratio = len(hits) / len(sentences)
    return {"ratio": round(ratio, 4), "count": len(hits), "samples": hits[:3]}


def _sentence_is_passive(sentence: str) -> bool:
    """True when an auxiliary is followed by something that looks like a participle."""

    tokens = words(sentence.lower())
    for token, candidate in zip(tokens[:-1], tokens[1:]):
        if token not in BE_AUX:
            continue
        if candidate in PASSIVE_STOPLIST or len(candidate) < 4:
            continue
        if PARTICIPLE_RE.match(candidate):
            return True
    return False


def _ranges_from_settings(settings: Dict[str, Any], key: str) -> List[Tuple[int, int]]:
    out: List[Tuple[int, int]] = []
    for entry in settings.get(key, []) or []:
        if isinstance(entry, (list, tuple)) and len(entry) == 2:
            out.append((int(entry[0]), int(entry[1])))
    return out


def _default_hidden_channels() -> Dict[str, Any]:
    return {
        "zero_width": [
            chr(0x200B), chr(0x200C), chr(0x200D), chr(0x2060), chr(0xFEFF),
            chr(0x180E),
        ],
        "tag_block_ranges": [[0xE0000, 0xE007F]],
        "variation_selector_ranges": [[0xFE00, 0xFE0F], [0xE0100, 0xE01EF]],
        "interlinear_ranges": [[0xFFF9, 0xFFFB]],
        "nonstandard_spaces": [
            chr(0x00A0), chr(0x202F), chr(0x2009), chr(0x2007), chr(0x3000),
        ],
    }


def _french_space_roles(settings: Dict[str, Any]) -> Tuple[set, set]:
    before = set(settings.get("space_before", []) or [])
    after = set(settings.get("space_after", []) or [])
    if not before:
        before = {":", ";", "!", "?", "»", "›", "%", "€", "°"}
    if not after:
        after = {"«", "‹"}
    return before, after


def _is_french_typography(text: str, index: int, before: set, after: set) -> bool:
    """True when the space at index is load-bearing French typography."""

    previous = text[index - 1] if index > 0 else ""
    following = text[index + 1] if index + 1 < len(text) else ""
    if following and following in before:
        return True
    if previous and previous in after:
        return True
    return False


class _Channels(NamedTuple):
    """The hidden channels to look for, and the French spaces that carry meaning."""

    zero_width: frozenset
    nonstandard_spaces: frozenset
    tag_block_ranges: List[Tuple[int, int]]
    variation_selector_ranges: List[Tuple[int, int]]
    interlinear_ranges: List[Tuple[int, int]]
    before: frozenset
    after: frozenset

    def hidden_kind(self, char: str) -> str:
        """The channel a character belongs to, or an empty string when it is ordinary."""

        if char in self.zero_width:
            return "zero_width"
        if char in self.nonstandard_spaces:
            return "nonstandard_space"
        code = ord(char)
        for kind, ranges in (
            ("tag_block", self.tag_block_ranges),
            ("variation_selector", self.variation_selector_ranges),
            ("interlinear", self.interlinear_ranges),
        ):
            if any(low <= code <= high for low, high in ranges):
                return kind
        return ""


def _resolve_channels(
    settings: Optional[Dict[str, Any]], roles_settings: Dict[str, Any]
) -> _Channels:
    """The default channels, overridden by the supplied settings.

    The French space roles are read through a separate argument because the counter
    and the cleaner do not read them from the same place: only the cleaner is
    settings-aware there.
    """

    channels = dict(_default_hidden_channels())
    if settings:
        for key, value in settings.items():
            if key in channels and value:
                channels[key] = value
    before, after = _french_space_roles(roles_settings)
    return _Channels(
        zero_width=frozenset(channels.get("zero_width", [])),
        nonstandard_spaces=frozenset(channels.get("nonstandard_spaces", [])),
        tag_block_ranges=_ranges_from_settings(channels, "tag_block_ranges"),
        variation_selector_ranges=_ranges_from_settings(
            channels, "variation_selector_ranges"
        ),
        interlinear_ranges=_ranges_from_settings(channels, "interlinear_ranges"),
        before=before,
        after=after,
    )


def _count_hidden(channels: _Channels, text: str) -> Dict[str, int]:
    """Count each hidden channel present in the text."""

    counts = {
        "zero_width": 0,
        "tag_block": 0,
        "variation_selector": 0,
        "interlinear": 0,
        "nonstandard_spaces_removable": 0,
        "nonstandard_spaces_french": 0,
        "bom_mid_text": 0,
    }
    for index, char in enumerate(text):
        kind = channels.hidden_kind(char)
        if kind == "zero_width":
            if char == chr(0xFEFF) and index > 0:
                counts["bom_mid_text"] += 1
            else:
                counts["zero_width"] += 1
        elif kind == "nonstandard_space":
            if _is_french_typography(text, index, channels.before, channels.after):
                counts["nonstandard_spaces_french"] += 1
            else:
                counts["nonstandard_spaces_removable"] += 1
        elif kind:
            counts[kind] += 1
    return counts


def hidden_channel_scan(
    text: str, settings: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Count hidden channels. Detection only: this engine never inserts them."""

    channels = _resolve_channels(settings, {})
    counts = _count_hidden(channels, text)
    counts["total_removable"] = (
        counts["zero_width"] + counts["tag_block"] + counts["variation_selector"]
        + counts["interlinear"] + counts["nonstandard_spaces_removable"]
        + counts["bom_mid_text"]
    )
    counts["homoglyph_runs"] = homoglyph_runs(text)
    return counts


_LATIN = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")
_CYRILLIC = {chr(code) for code in range(0x0400, 0x04FF)}
_GREEK = {chr(code) for code in range(0x0370, 0x03FF)}
_CONFUSABLE = {
    "а": "a", "е": "e", "о": "o", "р": "p", "с": "c",
    "х": "x", "у": "y", "к": "k", "м": "m", "т": "t",
    "в": "b", "н": "h", "і": "i", "α": "a", "ο": "o",
    "ρ": "p", "ε": "e", "ν": "v",
}


def homoglyph_runs(text: str) -> List[str]:
    """Tokens mixing Latin with Cyrillic or Greek lookalikes."""

    found: List[str] = []
    for token in HOMOGLYPH_TOKEN_RE.findall(text):
        has_latin = any(c in _LATIN for c in token)
        has_cyrillic = any(c in _CYRILLIC for c in token)
        has_greek = any(c in _GREEK for c in token)
        if has_latin and (has_cyrillic or has_greek):
            found.append(token)
    return found


def fold_homoglyphs(text: str) -> Tuple[str, List[str]]:
    """Replace confusable lookalikes with their Latin form. Off by default."""

    out: List[str] = []
    folded: List[str] = []
    for token in re.split(r"(\s+)", text):
        if token.strip() and any(c in _CONFUSABLE for c in token):
            folded.append(token)
            out.append("".join(_CONFUSABLE.get(c, c) for c in token))
        else:
            out.append(token)
    return "".join(out), folded


def _clean_character(
    channels: _Channels,
    text: str,
    index: int,
    char: str,
    out: List[str],
    removed: Dict[str, int],
) -> bool:
    """Keep or drop one character; True when a load-bearing French space was kept."""

    kind = channels.hidden_kind(char)
    if kind == "zero_width":
        if char == chr(0xFEFF) and index == 0:
            out.append(char)
        else:
            removed["zero_width"] += 1
        return False
    if kind == "nonstandard_space":
        if _is_french_typography(text, index, channels.before, channels.after):
            out.append(char)
            return True
        out.append(" ")
        removed["nonstandard_space"] += 1
        return False
    if kind:
        removed[kind] += 1
        return False
    out.append(char)
    return False


def clean_text(
    text: str, settings: Optional[Dict[str, Any]] = None, fold: bool = False
) -> Tuple[str, Dict[str, Any]]:
    """Remove hidden channels, keeping characters that carry meaning.

    French typography spaces are preserved. Homoglyph folding is opt-in, because
    folding a genuine Cyrillic or Greek word would destroy meaning.
    """

    channels = _resolve_channels(settings, settings or {})
    out: List[str] = []
    removed: Dict[str, int] = {
        "zero_width": 0, "tag_block": 0, "variation_selector": 0,
        "interlinear": 0, "nonstandard_space": 0,
    }
    kept_french = 0
    for index, char in enumerate(text):
        if _clean_character(channels, text, index, char, out, removed):
            kept_french += 1

    cleaned = "".join(out)
    folded_tokens: List[str] = []
    if fold:
        cleaned, folded_tokens = fold_homoglyphs(cleaned)
    report = {
        "removed": {k: v for k, v in removed.items() if v},
        "removed_total": sum(removed.values()),
        "kept_french_spaces": kept_french,
        "folded_homoglyphs": folded_tokens,
        "fold_applied": fold,
    }
    return cleaned, report
