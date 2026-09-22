"""Measure the engine instead of asserting it.

The harness scores a hash-verified corpus, reports a false-positive rate with a cluster
bootstrap interval, and carries the machinery for a detection rate the moment a machine
arm exists. No rate is claimed today: machine-written French requires either an external
corpus or an authorised model call, and neither is available here.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import random
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

from .engine import NarrativeIntegrityEngine
from .input_model import IntegrityInput
from .paths import PathRefused, resolve_output, resolve_read

SCHEMA_VERSION = "1.0"
DEFAULT_SEED = 20260921
DEFAULT_RESAMPLES = 2000

SHA256_RE = re.compile("^[0-9a-f]{64}$")
WORD_RE = re.compile("[0-9A-Za-z\u00C0-\u024F'-]+")


class CorpusIntegrityError(RuntimeError):
    """The corpus does not match what it declares."""


def sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def word_count(text: str) -> int:
    return len(WORD_RE.findall(text))


@dataclass(frozen=True)
class Document:
    document_id: str
    work: str
    author: str
    source: str
    text: str
    words: int
    text_sha256: str
    paired_with: Optional[str] = None
    contamination_rate: Optional[float] = None


@dataclass
class Arm:
    arm_id: str
    label: str
    register: str
    licence: str
    documents: List[Document] = field(default_factory=list)

    def words(self) -> int:
        return sum(document.words for document in self.documents)


@dataclass
class Corpus:
    name: str
    schema_version: str
    language: str
    purpose: str
    provenance: str
    limitations: List[str]
    expectations: Dict[str, Any]
    arms: List[Arm]
    path: Optional[Path] = None
    sha256: str = ""
    sources: List[Dict[str, Any]] = field(default_factory=list)

    def documents(self) -> List[Document]:
        return [document for arm in self.arms for document in arm.documents]

    def label_of(self, document_id: str) -> Optional[str]:
        for arm in self.arms:
            for document in arm.documents:
                if document.document_id == document_id:
                    return arm.label
        return None

    def ref(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "schema_version": self.schema_version,
            "language": self.language,
            "path": str(self.path) if self.path else "<memory>",
            "sha256": self.sha256,
        }


def load_corpus(path, verify: bool = True, root=None) -> Corpus:
    """Load a corpus, refusing anything that disagrees with its own declarations.

    The corpus path comes from the command line and is confined to the declared
    root before it is opened.
    """

    target = resolve_read(path, root=root, label="corpus")
    raw = target.read_bytes()
    data = json.loads(raw.decode("utf-8"))
    return Corpus(
        name=str(data.get("name", "unknown")),
        schema_version=str(data.get("schema_version", "0")),
        language=str(data.get("language", "unknown")),
        purpose=str(data.get("purpose", "")),
        provenance=str(data.get("provenance", "")),
        limitations=list(data.get("limitations", [])),
        expectations=dict(data.get("expectations", {})),
        arms=[_arm_from_payload(raw_arm, verify) for raw_arm in data.get("arms", [])],
        path=target,
        sha256=hashlib.sha256(raw).hexdigest(),
    )


def _verify_document(text: str, declared_hash: str, document_id: str, raw: Dict[str, Any]) -> None:
    """Refuse a document whose text or word count disagrees with its own header."""

    if sha256(text) != declared_hash:
        raise CorpusIntegrityError(
            "text does not match its declared hash: " + document_id
        )
    declared_words = int(raw.get("words", -1))
    if word_count(text) != declared_words:
        raise CorpusIntegrityError(
            "declared word count disagrees with the text: " + document_id
        )


def _document_from_payload(raw: Dict[str, Any], verify: bool) -> Document:
    """One corpus document, with every refusal the corpus format requires."""

    document_id = str(raw.get("document_id", "?"))
    text = str(raw.get("text", ""))
    if not text.strip():
        raise CorpusIntegrityError("empty document: " + document_id)
    declared_hash = str(raw.get("text_sha256", ""))
    if not SHA256_RE.match(declared_hash):
        raise CorpusIntegrityError("missing text hash: " + document_id)
    if verify:
        _verify_document(text, declared_hash, document_id, raw)
    if not str(raw.get("source", "")).strip():
        raise CorpusIntegrityError("missing source: " + document_id)
    contamination = raw.get("contamination_rate")
    return Document(
        document_id=document_id,
        work=str(raw.get("work", "")),
        author=str(raw.get("author", "")),
        source=str(raw.get("source", "")),
        text=text,
        words=int(raw.get("words", 0)),
        text_sha256=declared_hash,
        paired_with=raw.get("paired_with"),
        contamination_rate=float(contamination) if contamination is not None else None,
    )


def _arm_from_payload(raw: Dict[str, Any], verify: bool) -> Arm:
    return Arm(
        arm_id=str(raw.get("arm_id", "?")),
        label=str(raw.get("label", "unknown")),
        register=str(raw.get("register", "")),
        licence=str(raw.get("licence", "")),
        documents=[
            _document_from_payload(raw_document, verify)
            for raw_document in raw.get("documents", [])
        ],
    )


def load_corpora(paths: Sequence, root=None) -> Corpus:
    """Merge several corpora into one measurement set.

    Pairing is validated across the merged set: a machine document that points at a human
    document which is not present is refused, because the paired bootstrap would then be
    computed on an incomplete pair.
    """

    loaded = [load_corpus(path, root=root) for path in paths]
    if not loaded:
        raise CorpusIntegrityError("no corpus supplied")
    arms = [arm for corpus in loaded for arm in corpus.arms]
    merged = Corpus(
        name="+".join(corpus.name for corpus in loaded),
        schema_version=loaded[0].schema_version,
        language=loaded[0].language,
        purpose=" ".join(corpus.purpose for corpus in loaded if corpus.purpose),
        provenance=" ".join(corpus.provenance for corpus in loaded if corpus.provenance),
        limitations=sorted(
            {item for corpus in loaded for item in corpus.limitations}
        ),
        expectations=dict(loaded[0].expectations),
        arms=arms,
        path=None,
        sha256=hashlib.sha256(
            "".join(corpus.sha256 for corpus in loaded).encode("utf-8")
        ).hexdigest(),
        sources=[corpus.ref() for corpus in loaded],
    )

    identifiers = {document.document_id for document in merged.documents()}
    for arm in merged.arms:
        for document in arm.documents:
            if document.paired_with and document.paired_with not in identifiers:
                raise CorpusIntegrityError(
                    "document %s is paired with %s, which is absent from the merged set"
                    % (document.document_id, document.paired_with)
                )
    return merged


def pairing(corpus: Corpus, arm_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """One entry per machine document and the human document it answers."""

    by_id = {document.document_id: document for document in corpus.documents()}
    pairs: List[Dict[str, Any]] = []
    for arm in corpus.arms:
        if arm.label != "machine":
            continue
        if arm_id is not None and arm.arm_id != arm_id:
            continue
        for document in arm.documents:
            if not document.paired_with:
                continue
            human = by_id.get(document.paired_with)
            if human is None:
                raise CorpusIntegrityError(
                    "machine document %s has no human pair" % document.document_id
                )
            pairs.append(
                {
                    "arm_id": arm.arm_id,
                    "work": human.work,
                    "human": human.document_id,
                    "machine": document.document_id,
                    "contamination_rate": document.contamination_rate,
                }
            )
    return pairs


def score_document(document: Document, engine: NarrativeIntegrityEngine) -> Dict[str, Any]:
    """One document, measured. No timestamp enters the result."""

    report = engine.run(
        IntegrityInput(
            project_id="calibration", artifact=document.document_id, text=document.text
        ),
        now="2026-09-21T00:00:00",
    )
    prose = report.aggregates["prose"]
    return {
        "document_id": document.document_id,
        "work": document.work,
        "author": document.author,
        "words": document.words,
        "score": prose["score"],
        "band": prose["band"],
        "guard_triggered": bool(prose["guard_triggered"]),
        "findings": report.aggregates["findings_total"],
        "detectors": sorted({f.detector_id for f in report.findings}),
    }


def measure_arm(arm: Arm, engine: NarrativeIntegrityEngine) -> List[Dict[str, Any]]:
    results = []
    for document in arm.documents:
        result = score_document(document, engine)
        result["arm_id"] = arm.arm_id
        result["label"] = arm.label
        results.append(result)
    return results


def false_positive_rate(
    results: Sequence[Dict[str, Any]], threshold: float, label: str = "human"
) -> float:
    """Share of human-labelled documents that the guard would have flagged."""

    considered = [r for r in results if r.get("label") == label]
    if not considered:
        return 0.0
    flagged = sum(1 for r in considered if r["score"] > threshold)
    return flagged / len(considered)


def band_distribution(results: Sequence[Dict[str, Any]]) -> Dict[str, int]:
    distribution: Dict[str, int] = {}
    for result in results:
        band = str(result["band"])
        distribution[band] = distribution.get(band, 0) + 1
    return distribution


def findings_per_1000_words(results: Sequence[Dict[str, Any]]) -> float:
    words = sum(int(r["words"]) for r in results)
    findings = sum(int(r["findings"]) for r in results)
    if words == 0:
        return 0.0
    return round(findings / words * 1000, 3)


def roc_auc(scores: Sequence[float], labels: Sequence[int]) -> Optional[float]:
    """Rank-based AUC with average ranks for ties. None when a class is missing."""

    pairs = sorted(zip([float(s) for s in scores], [int(l) for l in labels]), key=lambda p: p[0])
    total = len(pairs)
    if total == 0:
        return None
    positives = sum(1 for _, label in pairs if label == 1)
    negatives = total - positives
    if positives == 0 or negatives == 0:
        return None

    ranks = [0.0] * total
    index = 0
    while index < total:
        end = index
        while end + 1 < total and pairs[end + 1][0] == pairs[index][0]:
            end += 1
        average = (index + end) / 2.0 + 1.0
        for position in range(index, end + 1):
            ranks[position] = average
        index = end + 1

    positive_rank_sum = sum(
        ranks[position] for position in range(total) if pairs[position][1] == 1
    )
    return (positive_rank_sum - positives * (positives + 1) / 2.0) / (
        positives * negatives
    )


def _percentile(sorted_values: Sequence[float], fraction: float) -> float:
    if not sorted_values:
        return 0.0
    position = int(round(fraction * (len(sorted_values) - 1)))
    return sorted_values[max(0, min(position, len(sorted_values) - 1))]


def binomial_upper_bound(
    successes: int, trials: int, confidence: float = 0.95
) -> float:
    """Exact Clopper-Pearson upper limit, by bisection on the binomial CDF.

    A percentile bootstrap collapses to a point when every resample is zero, which would
    read as certainty. This bound says what the data can actually support: with no
    flagged work out of a handful, the rate is not bounded tightly.
    """

    if trials <= 0:
        return 1.0
    if successes >= trials:
        return 1.0
    successes = max(0, min(successes, trials))
    alpha = 1.0 - confidence

    def cumulative(probability: float) -> float:
        return sum(
            math.comb(trials, index)
            * probability ** index
            * (1.0 - probability) ** (trials - index)
            for index in range(successes + 1)
        )

    low, high = 0.0, 1.0
    for _ in range(200):
        middle = (low + high) / 2.0
        if cumulative(middle) > alpha:
            low = middle
        else:
            high = middle
    return high


def cluster_rate_interval(
    results: Sequence[Dict[str, Any]],
    threshold: float,
    label: str = "human",
    resamples: int = DEFAULT_RESAMPLES,
    seed: int = DEFAULT_SEED,
) -> Dict[str, Any]:
    """Cluster bootstrap over works, because excerpts of one work are not independent."""

    considered = [r for r in results if r.get("label") == label]
    by_cluster: Dict[str, List[Dict[str, Any]]] = {}
    for result in considered:
        by_cluster.setdefault(str(result["work"]), []).append(result)
    clusters = sorted(by_cluster)
    if not clusters:
        return {"clusters": 0, "low": 0.0, "high": 0.0, "resamples": 0}

    generator = random.Random(seed)
    rates: List[float] = []
    for _ in range(resamples):
        sample: List[Dict[str, Any]] = []
        for _ in range(len(clusters)):
            sample.extend(by_cluster[clusters[generator.randrange(len(clusters))]])
        rates.append(
            sum(1 for r in sample if r["score"] > threshold) / max(1, len(sample))
        )
    rates.sort()
    return {
        "clusters": len(clusters),
        "resamples": resamples,
        "seed": seed,
        "low": round(_percentile(rates, 0.025), 4),
        "high": round(_percentile(rates, 0.975), 4),
        "collapsed_at_boundary": _percentile(rates, 0.975) == _percentile(rates, 0.025),
    }


def detector_histogram(results: Sequence[Dict[str, Any]]) -> Dict[str, int]:
    histogram: Dict[str, int] = {}
    for result in results:
        for detector_id in result.get("detectors", []):
            histogram[detector_id] = histogram.get(detector_id, 0) + 1
    return dict(sorted(histogram.items(), key=lambda item: (-item[1], item[0])))


def _resample_stats(
    sample: Sequence[Dict[str, Any]], by_id: Dict[str, Dict[str, Any]], threshold: float
) -> Tuple[Optional[float], int, int]:
    """AUC, detections and false alarms over one resampled set of pairs."""

    scores: List[float] = []
    labels: List[int] = []
    hits = 0
    alarms = 0
    for pair in sample:
        human = by_id[pair["human"]]
        machine = by_id[pair["machine"]]
        scores.extend([human["score"], machine["score"]])
        labels.extend([0, 1])
        hits += 1 if machine["score"] > threshold else 0
        alarms += 1 if human["score"] > threshold else 0
    return roc_auc(scores, labels), hits, alarms


def _paired_bootstrap(
    pairs: Sequence[Dict[str, Any]],
    by_id: Dict[str, Dict[str, Any]],
    threshold: float,
    resamples: int,
    seed: int,
) -> Tuple[List[float], List[float], List[float]]:
    """Cluster bootstrap over the pairs, resampling pairs rather than documents."""

    generator = random.Random(seed)
    auc_samples: List[float] = []
    tpr_samples: List[float] = []
    fpr_samples: List[float] = []
    for _ in range(resamples):
        sample = [pairs[generator.randrange(len(pairs))] for _ in range(len(pairs))]
        value, hits, alarms = _resample_stats(sample, by_id, threshold)
        if value is not None:
            auc_samples.append(value)
        tpr_samples.append(hits / len(sample))
        fpr_samples.append(alarms / len(sample))

    auc_samples.sort()
    tpr_samples.sort()
    fpr_samples.sort()
    return auc_samples, tpr_samples, fpr_samples


def detection_metrics(
    results: Sequence[Dict[str, Any]],
    pairs: Sequence[Dict[str, Any]],
    threshold: float,
    resamples: int = DEFAULT_RESAMPLES,
    seed: int = DEFAULT_SEED,
) -> Dict[str, Any]:
    """Detection rate and ranking, pooled and on the paired subset.

    Two readings are reported on purpose. The pooled reading answers the practical
    question; the paired reading is the one whose interval means something, because the
    two arms are matched document by document.
    """

    by_id = {result["document_id"]: result for result in results}
    human_ids = [pair["human"] for pair in pairs]
    machine_ids = [pair["machine"] for pair in pairs]

    pooled_auc = roc_auc(
        [result["score"] for result in results],
        [1 if result["label"] == "machine" else 0 for result in results],
    )

    paired_scores: List[float] = []
    paired_labels: List[int] = []
    for human_id, machine_id in zip(human_ids, machine_ids):
        paired_scores.extend([by_id[human_id]["score"], by_id[machine_id]["score"]])
        paired_labels.extend([0, 1])
    paired_auc = roc_auc(paired_scores, paired_labels)

    detected = sum(1 for i in machine_ids if by_id[i]["score"] > threshold)
    false_alarms = sum(1 for i in human_ids if by_id[i]["score"] > threshold)
    true_positive_rate = detected / max(1, len(machine_ids))
    false_positive_rate_paired = false_alarms / max(1, len(human_ids))

    auc_samples, tpr_samples, fpr_samples = _paired_bootstrap(
        pairs, by_id, threshold, resamples, seed
    )
    contaminations = [
        pair["contamination_rate"]
        for pair in pairs
        if pair.get("contamination_rate") is not None
    ]
    return {
        "threshold": threshold,
        "pairs": len(pairs),
        "machine_documents": len(machine_ids),
        "pooled_auc": None if pooled_auc is None else round(pooled_auc, 4),
        "paired_auc": None if paired_auc is None else round(paired_auc, 4),
        "paired_auc_interval": {
            "low": round(_percentile(auc_samples, 0.025), 4),
            "high": round(_percentile(auc_samples, 0.975), 4),
            "resamples": resamples,
            "seed": seed,
        },
        "true_positive_rate": round(true_positive_rate, 4),
        "true_positive_rate_interval": {
            "low": round(_percentile(tpr_samples, 0.025), 4),
            "high": round(_percentile(tpr_samples, 0.975), 4),
        },
        "false_positive_rate_on_pairs": round(false_positive_rate_paired, 4),
        "per_pair": [
            {
                "work": pair["work"],
                "human_score": by_id[pair["human"]]["score"],
                "machine_score": by_id[pair["machine"]]["score"],
                "detected": by_id[pair["machine"]]["score"] > threshold,
                "contamination_rate": pair.get("contamination_rate"),
            }
            for pair in pairs
        ],
        "contamination": {
            "mean": round(sum(contaminations) / len(contaminations), 4)
            if contaminations
            else None,
            "max": max(contaminations) if contaminations else None,
            "note": (
                "Share of generated word n-grams that already appeared in the prompt. "
                "High contamination would make machine text look human."
            ),
        },
    }


def run_calibration(
    corpus: Corpus,
    engine: Optional[NarrativeIntegrityEngine] = None,
    resamples: int = DEFAULT_RESAMPLES,
    seed: int = DEFAULT_SEED,
) -> Dict[str, Any]:
    engine = engine or NarrativeIntegrityEngine()
    threshold = float(engine.thresholds.get("guard.default_threshold", 40))

    per_arm: List[Dict[str, Any]] = []
    every_result: List[Dict[str, Any]] = []
    for arm in corpus.arms:
        results = measure_arm(arm, engine)
        every_result.extend(results)
        per_arm.append(
            {
                "arm_id": arm.arm_id,
                "label": arm.label,
                "register": arm.register,
                "licence": arm.licence,
                "documents": len(results),
                "words": arm.words(),
                "score_mean": round(
                    sum(r["score"] for r in results) / max(1, len(results)), 3
                ),
                "score_max": max((r["score"] for r in results), default=0.0),
                "band_distribution": band_distribution(results),
                "findings_per_1000_words": findings_per_1000_words(results),
                "false_positive_rate": false_positive_rate(results, threshold),
            }
        )

    rate = false_positive_rate(every_result, threshold)
    interval = cluster_rate_interval(every_result, threshold, resamples=resamples, seed=seed)
    labels = {r["label"] for r in every_result}
    considered = [r for r in every_result if r.get("label") == "human"]
    flagged = sum(1 for r in considered if r["score"] > threshold)
    works = {str(r["work"]) for r in considered}

    detections: List[Dict[str, Any]] = []
    for arm in corpus.arms:
        if arm.label != "machine":
            continue
        arm_pairs = pairing(corpus, arm.arm_id)
        if not arm_pairs:
            continue
        block = detection_metrics(
            every_result, arm_pairs, threshold, resamples=resamples, seed=seed
        )
        block["arm_id"] = arm.arm_id
        detections.append(block)

    if not detections:
        not_measured = [
            "Detection rate and ROC-AUC: the corpus ships no machine arm.",
            "Accuracy at any threshold: a rank measure is not a per-document answer.",
            "Modern narrative French and spoken French: not represented here.",
        ]
    else:
        not_measured = [
            "Generalisation beyond one model: a single local model wrote the machine arm.",
            "Accuracy at any threshold: a rank measure is not a per-document answer.",
            "Detection of unassisted modern French: the machine arm continues 18th to 20th century excerpts, so it imitates an older register than the model would use unprompted.",
        ]

    return {
        "schema_version": SCHEMA_VERSION,
        "corpus_ref": corpus.ref(),
        "corpus_limitations": corpus.limitations,
        "corpus_expectations": corpus.expectations,
        "settings_ref": {
            **engine.thresholds.ref().to_dict(),
            "signatures_ref": engine.registry.ref(),
        },
        "threshold": threshold,
        "resamples": resamples,
        "seed": seed,
        "corpus_sources": corpus.sources,
        "summary": {
            "documents": len(every_result),
            "words": sum(int(r["words"]) for r in every_result),
            "labels": sorted(labels),
            "false_positive_rate": round(rate, 4),
            "false_positive_rate_interval": interval,
            "band_distribution": band_distribution(every_result),
            "findings_per_1000_words": findings_per_1000_words(every_result),
            "flagged_documents": flagged,
            "upper_bound": {
                "confidence": 0.95,
                "over_documents": round(
                    binomial_upper_bound(flagged, len(considered)), 4
                ),
                "over_works": round(binomial_upper_bound(flagged, len(works)), 4),
                "works": len(works),
                "note": (
                    "The bootstrap interval collapses to a point when no resample is "
                    "flagged. The exact upper bound is what the corpora can support; it is "
                    "driven by how few works are represented, not by the engine."
                ),
            },
            "detector_histogram": detector_histogram(every_result),
            "max_false_positive_rate_allowed": corpus.expectations.get(
                "max_false_positive_rate"
            ),
            "within_declared_budget": (
                None
                if corpus.expectations.get("max_false_positive_rate") is None
                else rate <= float(corpus.expectations["max_false_positive_rate"])
            ),
        },
        "per_arm": per_arm,
        "per_document": sorted(every_result, key=lambda r: r["document_id"]),
        "detection": detections or None,
        "not_measured": not_measured,
    }


def _calibrate(args) -> int:
    corpus = load_corpora(args.corpus, root=args.root)
    results = run_calibration(corpus, resamples=args.resamples, seed=args.seed)
    document = json.dumps(results, ensure_ascii=False, indent=2)
    if not args.out:
        print(document)
        return 0

    target = resolve_output(args.out, root=args.root, label="results")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(document + "\n", encoding="utf-8")
    print("results written: " + str(target), file=sys.stderr)
    return 0


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(prog="narrative-integrity-calibration")
    parser.add_argument(
        "corpus", nargs="+", help="one or more calibration corpus JSON files"
    )
    parser.add_argument("--out", help="write the results document here")
    parser.add_argument("--resamples", type=int, default=DEFAULT_RESAMPLES)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument(
        "--root",
        help=(
            "directory an operator-supplied path may live in "
            "(default: the working directory)"
        ),
    )
    args = parser.parse_args(argv)

    try:
        return _calibrate(args)
    except CorpusIntegrityError as error:
        print("corpus refused: " + str(error), file=sys.stderr)
        return 2
    except PathRefused as refusal:
        print("refused: " + str(refusal), file=sys.stderr)
        return 2


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
