#!/usr/bin/env python3
"""
StoryCore Engine — LLM Model Dependency Checker
================================================
Audits which Ollama models are available and maps them to StoryCore features.
Tells you exactly what to pull to unlock each capability.

Usage:
    python scripts/check_llm_models.py
    python scripts/check_llm_models.py --pull-recommended   # auto-pull recommended models
    python scripts/check_llm_models.py --json               # machine-readable output
    python scripts/check_llm_models.py --host http://192.168.1.10:11434  # remote Ollama

Exit codes:
    0 = All required models present
    1 = Missing required models (pipeline will use mock/fallback)
    2 = Ollama not reachable
"""

import argparse
import json
import os
import subprocess
import sys
import time
from dataclasses import asdict, dataclass, field
from typing import Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Feature → Model Matrix
# ---------------------------------------------------------------------------
# Maps each StoryCore feature to:
#   - required: minimum model that works (often a small one)
#   - recommended: best experience
#   - tags: which Ollama model name patterns match

FEATURE_MATRIX: List[Dict] = [
    {
        "feature": "Script Analysis & Scene Breakdown",
        "module": "src/ai_script_analysis_engine.py",
        "required_tag": "llama3",
        "recommended_tag": "qwen2.5:7b",
        "alternatives": ["mistral", "gemma2", "llama3.2"],
        "min_params_b": 7,
        "purpose": "Parse user prompt → structured scene breakdown JSON",
        "critical": True,
    },
    {
        "feature": "Recursive LLM Service (RLM)",
        "module": "src/end_to_end/orchestrator.py",
        "required_tag": "llama3",
        "recommended_tag": "qwen2.5:14b",
        "alternatives": ["mistral", "llama3.2", "gemma2"],
        "min_params_b": 7,
        "purpose": "Self-calling LLM for complex narrative reasoning chains",
        "critical": True,
    },
    {
        "feature": "Character Description Generation",
        "module": "src/ai_character_engine.py",
        "required_tag": "llama3",
        "recommended_tag": "qwen2.5:7b",
        "alternatives": ["mistral", "phi3"],
        "min_params_b": 3,
        "purpose": "Generate detailed physical descriptions for image generation",
        "critical": True,
    },
    {
        "feature": "Dialogue Generation",
        "module": "scripts/generate_dialogue.py",
        "required_tag": "llama3",
        "recommended_tag": "qwen2.5:7b",
        "alternatives": ["mistral", "gemma2", "phi3"],
        "min_params_b": 3,
        "purpose": "Generate character dialogue for TTS synthesis",
        "critical": True,
    },
    {
        "feature": "Vision / Multimodal Analysis",
        "module": "src/media_intelligence_engine.py",
        "required_tag": "llava",
        "recommended_tag": "qwen2.5vl",
        "alternatives": ["llava:7b", "bakllava", "moondream"],
        "min_params_b": 7,
        "purpose": "Analyze reference images to extract style & archetypes",
        "critical": False,
    },
    {
        "feature": "Project Translator (Semantic Consistency)",
        "module": "addons/official/project_translator/",
        "required_tag": "llama3",
        "recommended_tag": "qwen2.5:7b",
        "alternatives": ["mistral", "gemma2"],
        "min_params_b": 7,
        "purpose": "Translate full project while preserving character name consistency",
        "critical": False,
    },
    {
        "feature": "Neural Production Assistant",
        "module": "creative-studio-ui/src/services/",
        "required_tag": "llama3",
        "recommended_tag": "qwen2.5:14b",
        "alternatives": ["mistral", "llama3.2:3b"],
        "min_params_b": 3,
        "purpose": "Directorial advice, shot composition suggestions, creative feedback",
        "critical": False,
    },
    {
        "feature": "Total Recall / Living Protocol Memory",
        "module": "creative-studio-ui/src/services/ProjectMemoryService.ts",
        "required_tag": "llama3",
        "recommended_tag": "qwen2.5:7b",
        "alternatives": ["mistral", "phi3"],
        "min_params_b": 3,
        "purpose": "Summarize and distill persistent project memory snapshots",
        "critical": False,
    },
    {
        "feature": "Content Sensitivity Analysis",
        "module": "addons/content_sensitivity/",
        "required_tag": "llama3",
        "recommended_tag": "qwen2.5:3b",
        "alternatives": ["phi3", "gemma2:2b", "llama3.2:1b"],
        "min_params_b": 1,
        "purpose": "Classify sensitive vocabulary. A small model is enough.",
        "critical": False,
    },
]

# Recommended pull list for a complete install
RECOMMENDED_PULL_LIST = [
    ("qwen2.5:7b",   "Primary text model — script, dialogue, characters, memory"),
    ("qwen2.5:14b",  "Upgrade for RLM reasoning chains (optional but better)"),
    ("llava:7b",     "Vision/Multimodal — analyzing reference images"),
]

MINIMAL_PULL_LIST = [
    ("llama3.2:3b",  "Fastest text model — minimal install for quick testing"),
    ("moondream",    "Smallest vision model — reference image analysis"),
]


# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------

@dataclass
class ModelInfo:
    name: str
    size_gb: float
    param_b: Optional[float]
    family: str


@dataclass
class FeatureStatus:
    feature: str
    module: str
    status: str        # OK | FALLBACK | MISSING
    active_model: Optional[str]
    recommended: str
    purpose: str
    critical: bool
    pull_command: Optional[str]


@dataclass
class LLMReport:
    ollama_host: str
    ollama_reachable: bool
    models: List[ModelInfo]
    features: List[FeatureStatus]
    critical_missing: int
    optional_missing: int
    pipeline_mode: str   # FULL | MOCK | BROKEN


# ---------------------------------------------------------------------------
# Ollama helpers
# ---------------------------------------------------------------------------

def fetch_ollama_models(host: str) -> Tuple[bool, List[ModelInfo], str]:
    """Returns (reachable, model_list, error_message)."""
    import urllib.request, urllib.error

    try:
        req = urllib.request.Request(f"{host}/api/tags")
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read())
            models = []
            for m in data.get("models", []):
                name      = m.get("name", "")
                size_gb   = m.get("size", 0) / (1024 ** 3)
                # Estimate params from name (e.g. "qwen2.5:7b" → 7.0)
                param_b: Optional[float] = None
                for part in name.replace(":", "_").split("_"):
                    if part.endswith("b") and part[:-1].replace(".", "").isdigit():
                        try:
                            param_b = float(part[:-1])
                        except ValueError:
                            pass
                # Family
                family = name.split(":")[0].split("/")[-1].lower()
                models.append(ModelInfo(name=name, size_gb=size_gb, param_b=param_b, family=family))
            return True, models, ""
    except urllib.error.URLError as e:
        return False, [], str(e.reason)
    except Exception as e:
        return False, [], str(e)


def pull_model(host: str, model_name: str) -> bool:
    """Pull a model via Ollama CLI."""
    print(f"  ⇣ Pulling {model_name} ...")
    try:
        result = subprocess.run(
            ["ollama", "pull", model_name],
            timeout=600,       # 10 min max
            check=True
        )
        return result.returncode == 0
    except subprocess.CalledProcessError as e:
        print(f"  ❌ Pull failed: {e}")
        return False
    except FileNotFoundError:
        print("  ❌ 'ollama' CLI not found in PATH")
        return False
    except subprocess.TimeoutExpired:
        print("  ❌ Pull timed out after 10 minutes")
        return False


# ---------------------------------------------------------------------------
# Feature mapping
# ---------------------------------------------------------------------------

def evaluate_features(models: List[ModelInfo]) -> List[FeatureStatus]:
    """For each feature, determine if a suitable model is available."""
    model_families = {m.family for m in models}
    model_names    = {m.name for m in models}

    results = []
    for feat in FEATURE_MATRIX:
        required_tag    = feat["required_tag"]
        recommended_tag = feat["recommended_tag"]
        alternatives    = feat["alternatives"]
        min_params      = feat["min_params_b"]

        # Find best matching model
        active: Optional[str] = None

        # 1. Exact recommended match
        if recommended_tag in model_names:
            active = recommended_tag
        # 2. Any model from the right family with enough params
        else:
            for m in models:
                tags_to_check = [required_tag] + alternatives
                if any(tag.split(":")[0] in m.family or m.family in tag for tag in tags_to_check):
                    if m.param_b is None or m.param_b >= min_params:
                        active = m.name
                        break
            # 3. Relaxed: any model with enough params (any family)
            if not active and min_params <= 3:
                for m in sorted(models, key=lambda x: x.param_b or 0, reverse=True):
                    if m.param_b and m.param_b >= min_params:
                        active = m.name
                        break

        if active:
            status = "OK" if active == recommended_tag else "FALLBACK"
        else:
            status = "MISSING"

        pull_cmd = None
        if status == "MISSING":
            pull_cmd = f"ollama pull {recommended_tag}"

        results.append(FeatureStatus(
            feature=feat["feature"],
            module=feat["module"],
            status=status,
            active_model=active,
            recommended=recommended_tag,
            purpose=feat["purpose"],
            critical=feat["critical"],
            pull_command=pull_cmd,
        ))

    return results


# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------

USE_COLOR = sys.stdout.isatty()

def c(text: str, code: str) -> str:
    return f"\033[{code}m{text}\033[0m" if USE_COLOR else text

RED    = lambda t: c(t, "91")
YELLOW = lambda t: c(t, "93")
GREEN  = lambda t: c(t, "92")
CYAN   = lambda t: c(t, "96")
BOLD   = lambda t: c(t, "1")
DIM    = lambda t: c(t, "2")


def render_report(report: LLMReport) -> None:
    print()
    print(BOLD("╔══════════════════════════════════════════════════════╗"))
    print(BOLD("║     StoryCore Engine — LLM Model Dependency Check   ║"))
    print(BOLD("╚══════════════════════════════════════════════════════╝"))
    print(DIM(f"  Ollama host : {report.ollama_host}"))
    print()

    if not report.ollama_reachable:
        print(RED(BOLD("  ❌  OLLAMA NOT REACHABLE")))
        print(RED("     Start Ollama: ollama serve"))
        print(RED(f"     Or configure OLLAMA_HOST in .env (current: {report.ollama_host})"))
        print()
        return

    # Installed models
    print(CYAN(BOLD("  [INSTALLED MODELS]")))
    if not report.models:
        print(YELLOW("  ⚠️  No models installed."))
    for m in report.models:
        size_str  = f"{m.size_gb:.1f} GB"
        param_str = f"{m.param_b:.0f}B params" if m.param_b else "?"
        print(f"  • {m.name:<30} {size_str:<10} {param_str}")

    # Feature matrix
    print()
    print(CYAN(BOLD("  [FEATURE COMPATIBILITY MATRIX]")))
    print()

    critical_rows  = [f for f in report.features if f.critical]
    optional_rows  = [f for f in report.features if not f.critical]

    def render_rows(rows: List[FeatureStatus], label: str) -> None:
        print(BOLD(f"  ── {label} ──"))
        for feat in rows:
            if feat.status == "OK":
                icon  = GREEN("✅")
                model = GREEN(feat.active_model or "")
            elif feat.status == "FALLBACK":
                icon  = YELLOW("⚡")
                model = YELLOW(f"{feat.active_model} (suboptimal — recommend {feat.recommended})")
            else:
                icon  = RED("❌")
                model = RED(f"NOT FOUND — {feat.pull_command}")

            print(f"  {icon} {feat.feature}")
            print(DIM(f"       Module  : {feat.module}"))
            print(DIM(f"       Purpose : {feat.purpose}"))
            print(f"       Model   : {model}")
            if feat.status == "MISSING":
                print(YELLOW(f"       Fix     : {feat.pull_command}"))
            print()

    render_rows(critical_rows,  "CRITICAL FEATURES (pipeline will fail without these)")
    render_rows(optional_rows,  "OPTIONAL FEATURES (degraded quality without)")

    # Summary
    print(BOLD("─" * 56))
    total_ok      = sum(1 for f in report.features if f.status in ("OK", "FALLBACK"))
    total_missing = sum(1 for f in report.features if f.status == "MISSING")

    print(
        f"  {GREEN(str(total_ok) + ' feature(s) active')}  "
        f"{RED(str(total_missing) + ' missing')}"
    )
    print(f"  Pipeline mode: {BOLD(report.pipeline_mode)}")
    print()

    # Pull recommendations
    if report.critical_missing > 0 or report.optional_missing > 0:
        print(BOLD("  ── RECOMMENDED ACTION ──"))
        print("  Run the following to get the best experience:\n")
        for model, desc in RECOMMENDED_PULL_LIST:
            already = any(m.name == model for m in report.models)
            if not already:
                print(f"    ollama pull {model:<25}  # {desc}")
        print()
        print("  Minimal install (fastest, for testing):")
        for model, desc in MINIMAL_PULL_LIST:
            already = any(m.name == model for m in report.models)
            if not already:
                print(f"    ollama pull {model:<25}  # {desc}")
        print()


def render_dependency_table() -> None:
    """Print the full feature→model dependency matrix as a reference table."""
    print()
    print(BOLD("  StoryCore Feature → Minimum Model Requirements"))
    print(BOLD("  " + "─" * 70))
    print(f"  {'Feature':<40} {'Min':<10} {'Recommended':<18} {'Critical'}")
    print("  " + "─" * 70)
    for feat in FEATURE_MATRIX:
        crit_str = RED("YES") if feat["critical"] else DIM("no")
        print(
            f"  {feat['feature']:<40} "
            f"{feat['required_tag']:<10} "
            f"{feat['recommended_tag']:<18} "
            f"{crit_str}"
        )
    print()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="StoryCore Engine — LLM Model Dependency Checker"
    )
    parser.add_argument("--host",             default=os.environ.get("OLLAMA_HOST", "http://localhost:11434"),
                        help="Ollama API host (default: http://localhost:11434 or OLLAMA_HOST env)")
    parser.add_argument("--pull-recommended", action="store_true",
                        help="Auto-pull recommended models that are missing")
    parser.add_argument("--pull-minimal",     action="store_true",
                        help="Auto-pull minimal model set only")
    parser.add_argument("--matrix",           action="store_true",
                        help="Print feature→model dependency table and exit")
    parser.add_argument("--json",             action="store_true",
                        help="Output machine-readable JSON")
    args = parser.parse_args()

    if args.matrix:
        render_dependency_table()
        return

    host = args.host.rstrip("/")
    reachable, models, error = fetch_ollama_models(host)

    if not reachable:
        print(RED(f"\n❌  Cannot reach Ollama at {host}"))
        print(RED(f"    Error: {error}"))
        print(YELLOW("    Fix: run 'ollama serve' (or set OLLAMA_HOST in .env)"))
        sys.exit(2)

    features = evaluate_features(models)
    critical_missing = sum(1 for f in features if f.critical and f.status == "MISSING")
    optional_missing = sum(1 for f in features if not f.critical and f.status == "MISSING")

    if critical_missing > 0:
        pipeline_mode = "MOCK (no critical models)" if models else "BROKEN"
    elif optional_missing > 0:
        pipeline_mode = "PARTIAL (some features disabled)"
    else:
        pipeline_mode = "FULL"

    report = LLMReport(
        ollama_host=host,
        ollama_reachable=reachable,
        models=models,
        features=features,
        critical_missing=critical_missing,
        optional_missing=optional_missing,
        pipeline_mode=pipeline_mode,
    )

    if args.json:
        print(json.dumps(asdict(report), ensure_ascii=False, indent=2))
        sys.exit(0 if critical_missing == 0 else 1)

    render_report(report)

    # Auto-pull if requested
    if args.pull_recommended:
        print(BOLD("  Auto-pulling recommended models..."))
        for model, desc in RECOMMENDED_PULL_LIST:
            if not any(m.name == model for m in models):
                pull_model(host, model)
        print()

    elif args.pull_minimal:
        print(BOLD("  Auto-pulling minimal model set..."))
        for model, desc in MINIMAL_PULL_LIST:
            if not any(m.name == model for m in models):
                pull_model(host, model)
        print()

    sys.exit(0 if critical_missing == 0 else 1)


if __name__ == "__main__":
    main()
