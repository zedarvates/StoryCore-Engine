"""Build the machine arm of the calibration corpus with the local model.

Each machine document is the local model's continuation of one human excerpt, so the two
arms are paired by construction and the paired cluster bootstrap applies. Nothing is sent
anywhere: the endpoint is local.

The generator records everything needed to judge the result: model name, endpoint,
temperature, seed, prompt hash, and the share of generated word n-grams that already
appeared in the prompt. That last figure bounds contamination, which would otherwise
flatter the engine.

Usage:
    python scripts/build_narrative_integrity_machine_arm.py [--limit N] [--out FILE]
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import time
import urllib.request
from datetime import datetime
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
HUMAN_CORPUS = (
    REPO / "tests" / "data" / "narrative_integrity" / "calibration" / "corpus_fr_v1.json"
)
DEFAULT_OUTPUT = (
    REPO
    / "tests"
    / "data"
    / "narrative_integrity"
    / "calibration"
    / "corpus_fr_machine_v1.json"
)

MODEL = "gemma4:26b"
BASE_URL = "http://127.0.0.1:11434"
TEMPERATURE = 0.8
SEED_BASE = 20260921
PROMPT_CHARS = 1200
TARGET_WORDS = 220
NGRAM = 8

INSTRUCTION = (
    "Voici un passage :\n<<<\n%s\n>>>\n\n"
    "Continue ce recit en francais, dans le meme registre et au meme rythme, environ %d "
    "mots. Ecris la suite uniquement, sans reprendre le passage, sans titre et sans "
    "commentaire. Reponds par le texte seul."
)

MODERN_INSTRUCTION = (
    "Voici un document de projet :\n<<<\n%s\n>>>\n\n"
    "Redige a ton tour une note de conception en francais sur le meme sujet, environ %d "
    "mots, ton professionnel. Ecris la note uniquement, sans titre et sans commentaire. "
    "Reponds par le texte seul."
)

PROMO_INSTRUCTION = (
    "Voici un document de projet :\n<<<\n%s\n>>>\n\n"
    "Redige un article promotionnel enthousiaste en francais sur le meme sujet, environ "
    "%d mots, ton inspirant et convaincant, pour convaincre un lecteur presse. Ecris "
    "l'article uniquement, sans titre et sans commentaire. Reponds par le texte seul."
)

WORD_RE = re.compile("[0-9A-Za-z\u00C0-\u024F'-]+")


def sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def words(value: str) -> list:
    return [token.lower() for token in WORD_RE.findall(value)]


def generated_ngrams(text: str, n: int = NGRAM) -> set:
    tokens = words(text)
    return {tuple(tokens[i : i + n]) for i in range(max(0, len(tokens) - n + 1))}


def contamination(generated: str, prompt: str) -> float:
    """Share of the generated n-grams that were already in the prompt."""

    produced = generated_ngrams(generated)
    if not produced:
        return 0.0
    borrowed = generated_ngrams(prompt)
    return round(len(produced & borrowed) / len(produced), 4)


def generate(prompt: str, seed: int, timeout: int = 300) -> str:
    payload = {
        "model": MODEL,
        "stream": False,
        "think": False,
        "messages": [{"role": "user", "content": prompt}],
        "options": {
            "temperature": TEMPERATURE,
            "seed": seed,
            "num_predict": 700,
        },
    }
    request = urllib.request.Request(
        BASE_URL + "/api/chat",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        body = json.loads(response.read().decode("utf-8"))
    return str((body.get("message") or {}).get("content") or "").strip()


def first_document_per_work(corpus: dict) -> list:
    seen = {}
    for arm in corpus["arms"]:
        if arm.get("arm_id") != "human_literary_pd":
            continue
        for document in arm["documents"]:
            seen.setdefault(document["work"], document)
    return [seen[work] for work in sorted(seen)]


def project_documents(corpus: dict) -> list:
    for arm in corpus["arms"]:
        if arm.get("arm_id") == "human_modern_project":
            return list(arm["documents"])
    return []


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(prog="build-machine-arm")
    parser.add_argument("--limit", type=int, default=0, help="only the first N works")
    parser.add_argument("--out", default=str(DEFAULT_OUTPUT))
    parser.add_argument(
        "--regime",
        choices=("continuation", "modern", "promo"),
        default="continuation",
        help=(
            "continuation pastiches a classic; modern writes a register-matched design "
            "note; promo asks for the promotional register the catalogue targets"
        ),
    )
    args = parser.parse_args(argv)

    corpus = json.loads(HUMAN_CORPUS.read_text(encoding="utf-8"))
    if args.regime == "continuation":
        sources = first_document_per_work(corpus)
        instruction = INSTRUCTION
        context_chars = PROMPT_CHARS
        arm_id = "machine_local"
        register = "model continuation of a literary excerpt"
        name = "corpus_fr_machine_v1"
    elif args.regime == "modern":
        sources = project_documents(corpus)
        instruction = MODERN_INSTRUCTION
        context_chars = 800
        arm_id = "machine_modern"
        register = "model design note, register matched to the project documents"
        name = "corpus_fr_machine_modern_v1"
    else:
        sources = project_documents(corpus)
        instruction = PROMO_INSTRUCTION
        context_chars = 800
        arm_id = "machine_promo"
        register = "promotional article, subject matched, register elicited"
        name = "corpus_fr_machine_promo_v1"
    if args.limit:
        sources = sources[: args.limit]
    if not sources:
        print("no human documents found", file=sys.stderr)
        return 1

    documents = []
    for index, source in enumerate(sources):
        context = source["text"][:context_chars]
        prompt = instruction % (context, TARGET_WORDS)
        seed = SEED_BASE + index
        started = time.time()
        try:
            produced = generate(prompt, seed)
        except Exception as error:  # noqa: BLE001 - reported, never guessed
            print(
                "  %s: generation failed: %s" % (source["work"], type(error).__name__),
                file=sys.stderr,
            )
            continue
        elapsed = time.time() - started
        if len(words(produced)) < 60:
            print(
                "  %s: only %d words produced, skipped"
                % (source["work"], len(words(produced))),
                file=sys.stderr,
            )
            continue
        documents.append(
            {
                "document_id": "machine-" + source["document_id"],
                "work": source["work"],
                "author": MODEL,
                "source": "local generation",
                "source_sha256": sha256(prompt),
                "text_sha256": sha256(produced),
                "chars": len(produced),
                "words": len(words(produced)),
                "paired_with": source["document_id"],
                "contamination_rate": contamination(produced, context),
                "text": produced,
            }
        )
        print(
            "  %s: %d words in %.0fs, contamination %.3f"
            % (
                source["work"],
                len(words(produced)),
                elapsed,
                documents[-1]["contamination_rate"],
            ),
            flush=True,
        )

    if not documents:
        print("refusing to write an empty machine arm", file=sys.stderr)
        return 1

    output = {
        "schema_version": "1.0",
        "name": name,
        "language": "fr",
        "purpose": (
            "Machine arm for detection measurement, regime %s. Each document answers one "
            "human document written by the local model, so the arms are paired by "
            "construction." % args.regime
        ),
        "extraction": (
            "The prompt carries the first %d characters of the paired human document and "
            "asks for about %d words. Only the model answer is stored."
            % (context_chars, TARGET_WORDS)
        ),
        "provenance": (
            "Generated locally on %s by %s at %s, temperature %s, one seed per document. "
            "No text left this machine. The result measures detection of this model's "
            "French, not of machine French in general."
            % (datetime.now().date().isoformat(), MODEL, BASE_URL, TEMPERATURE)
        ),
        "limitations": [
            "Six documents from one model: the interval will be wide and the result says nothing about other models.",
            "A continuation shares its prompt with the paired human excerpt, so contamination is measured per document and reported rather than assumed away.",
            "The human arm is 18th to 20th century prose: the model imitates an older register than it would use unprompted.",
        ],
        "generation": {
            "model": MODEL,
            "endpoint": BASE_URL,
            "temperature": TEMPERATURE,
            "seed_base": SEED_BASE,
            "prompt_chars": PROMPT_CHARS,
            "regime": args.regime,
            "target_words": TARGET_WORDS,
            "deliberation": "disabled",
        },
        "arms": [
            {
                "arm_id": arm_id,
                "label": "machine",
                "register": register,
                "licence": "generated locally, no third-party rights",
                "documents": documents,
            }
        ],
    }
    target = Path(args.out)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        json.dumps(output, ensure_ascii=True, indent=1) + "\n", encoding="utf-8"
    )
    total = sum(document["words"] for document in documents)
    print("wrote %s: %d documents, %d words" % (target, len(documents), total))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
