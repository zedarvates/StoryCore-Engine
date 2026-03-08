#!/usr/bin/env python3
"""
GemReward Setup Utility
========================
Script utilitaire pour configurer le système GemReward de StoryCore.

Usage :
    python -m backend.gem_setup              → Menu interactif
    python -m backend.gem_setup --gen-secret → Générer un webhook secret
    python -m backend.gem_setup --check      → Vérifier la configuration
    python -m backend.gem_setup --guide      → Afficher le guide de configuration GitHub
"""

import secrets
import os
import sys
import json
from datetime import datetime

# ─────────────────────────────────────────────
# Couleurs terminal
# ─────────────────────────────────────────────

class C:
    RESET  = "\033[0m"
    BOLD   = "\033[1m"
    GREEN  = "\033[92m"
    YELLOW = "\033[93m"
    RED    = "\033[91m"
    CYAN   = "\033[96m"
    PURPLE = "\033[95m"
    BLUE   = "\033[94m"
    DIM    = "\033[2m"


def ok(msg):  print(f"  {C.GREEN}✅{C.RESET} {msg}")
def warn(msg): print(f"  {C.YELLOW}⚠️ {C.RESET} {msg}")
def err(msg):  print(f"  {C.RED}❌{C.RESET} {msg}")
def info(msg): print(f"  {C.CYAN}ℹ️ {C.RESET} {msg}")
def gem(msg):  print(f"  {C.PURPLE}💎{C.RESET} {msg}")


# ─────────────────────────────────────────────
# Génération du Webhook Secret
# ─────────────────────────────────────────────

def generate_webhook_secret():
    """Génère un secret HMAC fort pour le webhook GitHub."""
    secret = secrets.token_hex(32)
    print(f"\n{C.BOLD}{C.PURPLE}💎 Webhook Secret généré{C.RESET}")
    print("=" * 60)
    print(f"\n  {C.GREEN}{C.BOLD}{secret}{C.RESET}\n")
    print(f"{C.DIM}  (256 bits d'entropie — cryptographiquement sûr){C.RESET}")
    print("\n  Ajoutez cette valeur dans :")
    print(f"  {C.CYAN}1. Votre fichier .env :{C.RESET}")
    print(f"     GITHUB_WEBHOOK_SECRET={secret}")
    print(f"\n  {C.CYAN}2. GitHub → Settings → Webhooks → Secret{C.RESET}")
    print("\n  ⚠️  NE COMMITTEZ PAS cette valeur dans Git !")
    print("=" * 60)
    return secret


# ─────────────────────────────────────────────
# Vérification de la configuration
# ─────────────────────────────────────────────

def check_configuration():
    """Vérifie que toutes les variables d'environnement GemReward sont configurées."""

    # Charger le .env si disponible
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    env_vars = {}
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, _, val = line.partition("=")
                    env_vars[key.strip()] = val.strip()

    # Fusionner avec les vrais env vars
    for k, v in env_vars.items():
        if k not in os.environ:
            os.environ[k] = v

    print(f"\n{C.BOLD}{C.PURPLE}💎 GemReward — Vérification de la configuration{C.RESET}")
    print("=" * 60)

    checks = [
        # (label, env_var, required, secret)
        ("JWT Secret",             "JWT_SECRET",            True,  True),
        ("GitHub API Token",        "GITHUB_API_TOKEN",      False, True),
        ("GitHub Webhook Secret",   "GITHUB_WEBHOOK_SECRET", True,  True),
        ("GitHub Repo Owner",       "GITHUB_REPO_OWNER",     True,  False),
        ("GitHub Repo Name",        "GITHUB_REPO_NAME",      True,  False),
        ("Database URL",            "DATABASE_URL",           False, True),
        ("Rate Limit Human",        "GEM_RATE_LIMIT_HUMAN",  False, False),
        ("Rate Limit Agent",        "GEM_RATE_LIMIT_AGENT",  False, False),
    ]

    all_required_ok = True

    print(f"\n  {'Variable':<30} {'Statut':<12} {'Valeur'}")
    print(f"  {'─'*30} {'─'*12} {'─'*20}")

    for label, var, required, is_secret in checks:
        val = os.getenv(var, "")
        if val and val not in ("your-super-secret-key-change-in-production", ""):
            display = f"{'*' * min(len(val), 8)}..." if is_secret else val[:30]
            status = f"{C.GREEN}✅ Configuré{C.RESET}"
        elif val == "":
            display = "(vide)"
            if required:
                status = f"{C.RED}❌ REQUIS{C.RESET}"
                all_required_ok = False
            else:
                status = f"{C.YELLOW}⚠️  Optionnel{C.RESET}"
        else:
            display = "(valeur par défaut)"
            if required:
                status = f"{C.RED}❌ À CHANGER{C.RESET}"
                all_required_ok = False
            else:
                status = f"{C.YELLOW}⚠️  Défaut{C.RESET}"

        print(f"  {label:<30} {status:<20} {C.DIM}{display}{C.RESET}")

    print()

    if all_required_ok:
        print(f"  {C.GREEN}{C.BOLD}✅ Configuration valide — GemReward prêt !{C.RESET}")
    else:
        print(f"  {C.RED}{C.BOLD}❌ Configuration incomplète — voir les variables REQUISES ci-dessus{C.RESET}")
        print(f"\n  Conseil : python -m backend.gem_setup --gen-secret")

    # Vérification modules Python
    print(f"\n  {'─'*60}")
    print(f"  {C.BOLD}Modules Python{C.RESET}")
    modules = [
        ("fastapi", "FastAPI"),
        ("sqlalchemy", "SQLAlchemy"),
        ("pydantic", "Pydantic"),
        ("requests", "Requests (Duplicate Checker)"),
        ("asyncpg", "asyncpg (Migration async)"),
    ]
    for module, name in modules:
        try:
            __import__(module)
            ok(name)
        except ImportError:
            warn(f"{name} — {C.DIM}pip install {module}{C.RESET}")

    print("=" * 60)
    return all_required_ok


# ─────────────────────────────────────────────
# Guide de configuration GitHub Webhook
# ─────────────────────────────────────────────

def show_github_guide():
    """Affiche le guide étape par étape pour configurer le webhook GitHub."""

    print(f"\n{C.BOLD}{C.PURPLE}💎 Guide de configuration du Webhook GitHub{C.RESET}")
    print("=" * 70)

    steps = [
        (
            "Générer votre Webhook Secret",
            [
                "Exécutez : python -m backend.gem_setup --gen-secret",
                "Copiez la valeur générée",
            ]
        ),
        (
            "Configurer .env",
            [
                "Ouvrez .env dans StoryCore Engine",
                "GITHUB_WEBHOOK_SECRET=<votre_secret>",
                "GITHUB_REPO_OWNER=zedarvates",
                "GITHUB_REPO_NAME=StoryCore-Engine",
            ]
        ),
        (
            "Exposer le serveur (développement)",
            [
                "Installez ngrok : https://ngrok.com",
                "Démarrez : ngrok http 8080",
                "Copiez l'URL HTTPS fournie (ex: https://abc123.ngrok.io)",
            ]
        ),
        (
            "Ajouter le Webhook sur GitHub",
            [
                "GitHub → zedarvates/StoryCore-Engine → Settings → Webhooks",
                "→ Add webhook",
                "Payload URL  : https://<votre-ngrok>.ngrok.io/api/webhooks/github",
                "Content type : application/json",
                "Secret       : <votre_webhook_secret>",
                "Events       : ✅ Issues (cocher seulement 'Issues')",
                "→ Add webhook",
            ]
        ),
        (
            "Tester le webhook",
            [
                "Sur GitHub : Webhooks → votre webhook → Recent Deliveries",
                "Cliquez 'Redeliver' sur le ping initial",
                "Vous devriez voir {'status': 'pong'} dans la réponse",
            ]
        ),
        (
            "Configurer les labels GitHub",
            [
                "GitHub → Issues → Labels → New label",
                "Créer ces labels :",
                "  • gem-awarded    (color: #FFD700) → déclenche la récompense",
                "  • severity:critical (color: #FF0000) → 3 gemmes",
                "  • severity:major    (color: #FF8C00) → 2 gemmes",
                "  • severity:minor    (color: #FFA500) → 1 gemme",
                "  • roadmap           (color: #9400D3) → 3 gemmes (idées)",
                "  • accepted          (color: #1E90FF) → 2 gemmes (features)",
            ]
        ),
    ]

    for i, (title, substeps) in enumerate(steps, 1):
        print(f"\n  {C.BOLD}{C.CYAN}Étape {i} — {title}{C.RESET}")
        for substep in substeps:
            if substep.startswith("  "):
                print(f"    {C.DIM}{substep}{C.RESET}")
            elif ":" in substep and not substep.startswith("→"):
                key, _, val = substep.partition(":")
                print(f"     {C.YELLOW}{key}:{C.RESET}{val}")
            else:
                print(f"    {substep}")

    print(f"\n  {'─'*70}")
    print(f"\n  {C.GREEN}{C.BOLD}🎉 Workflow complet :{C.RESET}")
    print(f"  Utilisateur soumet un bug → Issue GitHub créée → Mainteneur valide")
    print(f"  → Ajoute label 'gem-awarded' → Webhook → StoryCore → 💎 crédité")
    print()
    print("=" * 70)


# ─────────────────────────────────────────────
# Test d'intégration rapide
# ─────────────────────────────────────────────

def run_quick_test():
    """Lance un test d'intégration rapide des composants GemReward."""
    print(f"\n{C.BOLD}{C.PURPLE}💎 GemReward — Tests d'intégration rapide{C.RESET}")
    print("=" * 60)

    # Test 1 : Duplicate Checker
    print(f"\n  {C.BOLD}1. Duplicate Checker{C.RESET}")
    try:
        from backend.duplicate_checker import (
            compute_fingerprint, normalize_text,
            extract_keywords, levenshtein_ratio
        )
        fp1 = compute_fingerprint("Crash lors de la génération vidéo LTX2")
        fp2 = compute_fingerprint("Crash lors de la génération vidéo LTX2")  # identique
        fp3 = compute_fingerprint("Bug dans l'export MP4")

        assert fp1 == fp2, "Même texte → même fingerprint"
        assert fp1 != fp3, "Textes différents → fingerprints différents"

        score = levenshtein_ratio("crash in video generation", "crash video generation mode")
        assert 0.0 < score < 1.0

        keywords = extract_keywords("Crash lors de la génération vidéo avec LTX2 en mode Ultra")
        assert len(keywords) >= 2

        ok("compute_fingerprint (idempotent)")
        ok(f"levenshtein_ratio={score:.2f}")
        ok(f"extract_keywords={keywords[:3]}")

    except Exception as e:
        err(f"Duplicate Checker : {e}")

    # Test 2 : GemEngine calculs
    print(f"\n  {C.BOLD}2. GemEngine (calculs){C.RESET}")
    try:
        from backend.gem_engine import calculate_gems_from_labels, calculate_tier

        assert calculate_gems_from_labels([{"name": "severity:critical"}]) == 3
        assert calculate_gems_from_labels([{"name": "severity:major"}]) == 2
        assert calculate_gems_from_labels([{"name": "severity:minor"}]) == 1
        assert calculate_gems_from_labels([{"name": "random-label"}]) == 1  # défaut
        assert calculate_gems_from_labels([]) == 1

        assert calculate_tier(0) == "contributor"
        assert calculate_tier(10) == "silver"
        assert calculate_tier(30) == "gold"
        assert calculate_tier(100) == "legend"

        ok("calculate_gems_from_labels (critical=3, major=2, minor=1)")
        ok("calculate_tier (contributor/silver/gold/legend)")

    except Exception as e:
        err(f"GemEngine : {e}")

    # Test 3 : Contributor Auth (génération de clé)
    print(f"\n  {C.BOLD}3. Contributor Auth (API Key){C.RESET}")
    try:
        from backend.contributor_auth import generate_agent_api_key, hash_api_key, is_agent_key

        full_key, prefix, key_hash = generate_agent_api_key()

        assert full_key.startswith("sc_agent_")
        assert is_agent_key(full_key) == True
        assert is_agent_key("eyJhbGci...") == False
        assert hash_api_key(full_key) == key_hash
        assert len(key_hash) == 64  # SHA256 hex = 64 chars

        ok(f"Agent Key format : {prefix}")
        ok(f"Hash SHA256 : {key_hash[:16]}...")
        ok("is_agent_key détection OK")

    except Exception as e:
        err(f"Contributor Auth : {e}")

    # Test 4 : Webhook signature
    print(f"\n  {C.BOLD}4. Webhook GitHub (HMAC vérification){C.RESET}")
    try:
        import hmac
        import hashlib
        from backend.webhook_api import verify_github_signature

        secret = "test_secret_123"
        body = b'{"action": "labeled", "issue": {"number": 42}}'
        correct_sig = "sha256=" + hmac.new(
            secret.encode(), body, hashlib.sha256
        ).hexdigest()

        assert verify_github_signature(body, correct_sig, secret) == True
        assert verify_github_signature(body, "sha256=badvalue", secret) == False
        assert verify_github_signature(body, None, secret) == False

        ok("Signature valide acceptée")
        ok("Signature invalide rejetée")
        ok("Signature manquante rejetée")

    except Exception as e:
        err(f"Webhook : {e}")

    print(f"\n  {'─'*60}")
    print(f"  {C.GREEN}{C.BOLD}Tests terminés{C.RESET}")
    print("=" * 60)


# ─────────────────────────────────────────────
# Point d'entrée
# ─────────────────────────────────────────────

if __name__ == "__main__":
    print(f"""\n{C.BOLD}{C.PURPLE}
  ╔══════════════════════════════════════════╗
  ║     💎 StoryCore GemReward Setup v1.0    ║
  ╚══════════════════════════════════════════╝
{C.RESET}""")

    args = sys.argv[1:]

    if "--gen-secret" in args:
        generate_webhook_secret()

    elif "--check" in args:
        check_configuration()

    elif "--guide" in args:
        show_github_guide()

    elif "--test" in args:
        run_quick_test()

    elif "--all" in args:
        generate_webhook_secret()
        check_configuration()
        show_github_guide()

    else:
        # Menu interactif
        print(f"  {C.CYAN}Choisissez une action :{C.RESET}\n")
        print(f"  {C.BOLD}1{C.RESET}  Générer un Webhook Secret")
        print(f"  {C.BOLD}2{C.RESET}  Vérifier la configuration")
        print(f"  {C.BOLD}3{C.RESET}  Afficher le guide GitHub Webhook")
        print(f"  {C.BOLD}4{C.RESET}  Lancer les tests d'intégration")
        print(f"  {C.BOLD}5{C.RESET}  Tout faire")
        print(f"  {C.BOLD}q{C.RESET}  Quitter\n")

        choice = input("  Votre choix : ").strip().lower()
        print()

        if choice == "1":   generate_webhook_secret()
        elif choice == "2": check_configuration()
        elif choice == "3": show_github_guide()
        elif choice == "4": run_quick_test()
        elif choice == "5":
            generate_webhook_secret()
            check_configuration()
            show_github_guide()
            run_quick_test()
        elif choice in ("q", ""):
            print("  Au revoir !")
        else:
            print("  Choix invalide.")
