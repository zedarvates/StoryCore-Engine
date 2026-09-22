"""Build the French calibration corpus used by the narrative integrity engine.

Two arms, both declared in the output file:

* literary public-domain prose, four works, excerpts taken at evenly spaced positions;
* modern French project prose, taken from this repository's own design documents.

The script fetches the public-domain texts once and writes the corpus with every source
hash recorded. Nothing is fetched at test time, and re-running the script against the
same upstream revisions reproduces the same corpus.

Usage:
    python scripts/build_narrative_integrity_corpus.py [output.json]
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = (
    REPO / "tests" / "data" / "narrative_integrity" / "calibration" / "corpus_fr_v1.json"
)

GUTENBERG = (
    # id, work, author, source url
    (4650, "Candide, ou l'optimisme", "Voltaire", "https://www.gutenberg.org/ebooks/4650"),
    (798, "Le Rouge et le Noir", "Stendhal", "https://www.gutenberg.org/ebooks/798"),
    (14155, "Madame Bovary", "Gustave Flaubert", "https://www.gutenberg.org/ebooks/14155"),
    (17489, "Les Miserables, Tome I", "Victor Hugo", "https://www.gutenberg.org/ebooks/17489"),
    (2650, "Du cote de chez Swann", "Marcel Proust", "https://www.gutenberg.org/ebooks/2650"),
    (2998, "A l'ombre des jeunes filles en fleurs, I", "Marcel Proust", "https://www.gutenberg.org/ebooks/2998"),
)

PROJECT_SOURCES = (
    "docs/rd/RD_PLAN_SEQUENCE_EDITOR.md",
    "docs/plans/PLAN_AMELIORATION.md",
    "docs/plans/TOP5_TACHES.md",
    "AMELIORATION_EDITEUR_CONSEQUENCES.md",
    "plan_editeur_consequences.md",
)

CLASSIC_WINDOW = 8000
CLASSIC_WINDOWS = 3
PROJECT_WINDOW = 3000
PROJECT_WINDOWS = 2
MIN_WORDS_CLASSIC = 200
MIN_WORDS_PROJECT = 120
PARAGRAPH_RE = re.compile(r"[^\n]+(?:\n[^\n]+)*")


def sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def word_count(text: str) -> int:
    return len(re.findall("[0-9A-Za-z\u00C0-\u024F'-]+", text))


def fetch(url: str) -> str:
    with urllib.request.urlopen(url, timeout=60) as response:
        raw = response.read()
    for encoding in ("utf-8", "latin-1"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


def gutenberg_body(text: str) -> str:
    """Keep only the work itself, between the markers Gutenberg adds."""

    start = re.search(r"\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG.*?\*\*\*", text)
    end = re.search(r"\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG.*?\*\*\*", text)
    body = text[start.end() if start else 0 : end.start() if end else len(text)]
    body = re.sub(r"\r\n?", "\n", body)
    body = re.sub(r"\n{3,}", "\n\n", body)
    return body.strip()


def skip_front_matter(body: str) -> str:
    """Drop title pages, tables and editorial notices before sampling.

    A distributor file opens on covers, remprimerie notices and tables of contents.
    Sampling those would measure typography, not narrative prose.
    """

    for match in PARAGRAPH_RE.finditer(body):
        chunk = match.group(0)
        if len(chunk) >= 400 and len(chunk.split()) >= 60:
            return body[match.start() :]
    return body


HEADING_RE = re.compile(r"^\s{0,3}#{1,6}\s")
TABLE_RE = re.compile(r"^\s*\|")
BULLET_RE = re.compile(r"^\s*(?:[-*+]\s|\d+[.)]\s)")
FENCE_RE = re.compile(r"^\s*\x60\x60\x60")


def project_prose(text: str) -> str:
    """Keep prose from a markdown document, dropping structure.

    Headings, tables and code fences are removed. Bullet markers are stripped but the
    sentence they carry is kept: in these documents a bullet usually holds a full
    sentence, and dropping it would discard most of the prose.
    """

    kept: list = []
    in_fence = False
    for line in text.splitlines():
        if FENCE_RE.match(line):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        if HEADING_RE.match(line) or TABLE_RE.match(line):
            continue
        stripped = BULLET_RE.sub("", line).strip()
        if len(stripped) < 40 or len(stripped.split()) < 6:
            continue
        kept.append(stripped)
    return "\n".join(kept)


def windows(text: str, size: int, count: int, min_words: int) -> list:
    """Evenly spaced excerpts, so the sample is not just the opening."""

    if len(text) <= size:
        return [text] if word_count(text) >= min_words else []
    step = max(1, (len(text) - size) // count)
    out = []
    for index in range(count):
        start = index * step
        chunk = text[start : start + size]
        cut = chunk.rfind("\n\n")
        if cut > size // 2:
            chunk = chunk[:cut]
        out.append(chunk.strip())
    return [chunk for chunk in out if word_count(chunk) >= min_words]


def build() -> dict:
    literary = []
    for identifier, work, author, source in GUTENBERG:
        url = "https://www.gutenberg.org/cache/epub/%d/pg%d.txt" % (identifier, identifier)
        raw = fetch(url)
        body = skip_front_matter(gutenberg_body(raw))
        for index, chunk in enumerate(
            windows(body, CLASSIC_WINDOW, CLASSIC_WINDOWS, MIN_WORDS_CLASSIC)
        ):
            literary.append(
                {
                    "document_id": "pg%d-%d" % (identifier, index + 1),
                    "work": work,
                    "author": author,
                    "source": source,
                    "source_url": url,
                    "source_sha256": sha256(raw),
                    "text_sha256": sha256(chunk),
                    "chars": len(chunk),
                    "words": word_count(chunk),
                    "text": chunk,
                }
            )

    modern = []
    for relative in PROJECT_SOURCES:
        path = REPO / relative
        if not path.exists():
            continue
        raw = path.read_text(encoding="utf-8", errors="replace")
        body = project_prose(raw)
        print(
            "  %s: %d words of prose kept"
            % (relative, word_count(body))
        )
        for index, chunk in enumerate(
            windows(body, PROJECT_WINDOW, PROJECT_WINDOWS, MIN_WORDS_PROJECT)
        ):
            modern.append(
                {
                    "document_id": path.stem + "-%d" % (index + 1),
                    "work": path.name,
                    "author": "StoryCore project",
                    "source": relative,
                    "source_sha256": sha256(raw),
                    "text_sha256": sha256(chunk),
                    "chars": len(chunk),
                    "words": word_count(chunk),
                    "text": chunk,
                }
            )

    return {
        "schema_version": "1.0",
        "name": "corpus_fr_v1",
        "language": "fr",
        "purpose": (
            "Control corpus for false-positive measurement. No machine arm is included: "
            "producing machine-written French requires either an external corpus or an "
            "authorised model call, so no detection rate is claimed."
        ),
        "extraction": (
            "Literary excerpts are taken at evenly spaced positions inside the work, after "
            "the distributor markers are removed. Project excerpts keep paragraph prose "
            "only: headings, tables, lists and code fences are dropped."
        ),
        "provenance": (
            "Literary texts: public domain, retrieved from Project Gutenberg, source url and "
            "upstream hash recorded per document. Only excerpts are stored here, never a "
            "complete work, and no distributor boilerplate is reproduced. Project texts: "
            "this repository's own French design documents, MIT licensed, with the source "
            "file hash recorded. Authorship of the project excerpts is human-supervised but "
            "not independently verified."
        ),
        "limitations": [
            "The literary arm is 18th and 19th century prose and contains none of the modern tells, so a low rate there is weak evidence about modern writing.",
            "The project arm is technical documentation, not narrative prose.",
            "Five works means few clusters: any bootstrap interval will be wide.",
        ],
        "expectations": {"max_false_positive_rate": 0.25},
        "arms": [
            {
                "arm_id": "human_literary_pd",
                "label": "human",
                "register": "literary narrative, 18th and 19th century",
                "licence": "public domain",
                "documents": literary,
            },
            {
                "arm_id": "human_modern_project",
                "label": "human",
                "register": "modern technical and design prose",
                "licence": "MIT (this repository)",
                "documents": modern,
            },
        ],
    }


def main(argv=None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    output = Path(argv[0]) if argv else DEFAULT_OUTPUT
    corpus = build()
    floors = {"human_literary_pd": 3000, "human_modern_project": 600}
    for arm in corpus["arms"]:
        words = sum(document["words"] for document in arm["documents"])
        floor = floors.get(arm["arm_id"], 0)
        if words < floor:
            print(
                "refusing to write: arm %s holds %d words, below its floor of %d"
                % (arm["arm_id"], words, floor)
            )
            return 1
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(corpus, ensure_ascii=True, indent=1) + "\n", encoding="utf-8"
    )
    total = sum(len(arm["documents"]) for arm in corpus["arms"])
    words = sum(
        document["words"] for arm in corpus["arms"] for document in arm["documents"]
    )
    print("wrote %s" % output)
    print("documents %d, words %d" % (total, words))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
