"""
Test de validation des corrections des tâches 7 et 8.

Ce test vérifie que:
1. Les imports fonctionnent sans conflit
2. Les classes peuvent être instanciées
3. Les types sont correctement définis
"""

import sys
import asyncio
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))


def test_imports_no_conflict():
    """Test que les imports fonctionnent sans conflit de noms."""
    print("🔍 Test 1: Vérification des imports...")

    try:
        # Import des types depuis ai_enhancement_engine
        from ai_enhancement_engine import EnhancementType as SystemEnhancementType

        # Import des types depuis quality_optimizer
        from quality_optimizer import QualityEnhancementType, QualityOptimizer

        # Import depuis preview_ai_integration
        from preview_ai_integration import PreviewAIIntegration, PreviewMode

        print("✅ Tous les imports réussis sans conflit")
        return True

    except ImportError as e:
        print(f"❌ Erreur d'import: {e}")
        return False


def test_enum_values():
    """Test que les enums ont les bonnes valeurs."""
    print("\n🔍 Test 2: Vérification des valeurs d'enum...")

    try:
        from ai_enhancement_engine import EnhancementType as SystemEnhancementType
        from quality_optimizer import QualityEnhancementType
        from preview_ai_integration import PreviewMode

        # Vérifier SystemEnhancementType
        assert hasattr(SystemEnhancementType, "STYLE_TRANSFER")
        assert hasattr(SystemEnhancementType, "SUPER_RESOLUTION")
        print("  ✅ SystemEnhancementType a les bonnes valeurs")

        # Vérifier QualityEnhancementType
        assert hasattr(QualityEnhancementType, "SHARPEN")
        assert hasattr(QualityEnhancementType, "DENOISE")
        assert hasattr(QualityEnhancementType, "COLOR_CORRECTION")
        print("  ✅ QualityEnhancementType a les bonnes valeurs")

        # Vérifier PreviewMode
        assert hasattr(PreviewMode, "FAST")
        assert hasattr(PreviewMode, "BALANCED")
        assert hasattr(PreviewMode, "QUALITY")
        assert hasattr(PreviewMode, "PROGRESSIVE")
        print("  ✅ PreviewMode a les bonnes valeurs")

        print("✅ Toutes les valeurs d'enum sont correctes")
        return True

    except (AssertionError, AttributeError) as e:
        print(f"❌ Erreur de validation: {e}")
        return False


def test_class_instantiation():
    """Test que les classes peuvent être instanciées."""
    print("\n🔍 Test 3: Vérification de l'instanciation des classes...")

    try:
        from quality_optimizer import QualityOptimizer
        from preview_ai_integration import (
            PreviewAIIntegration,
            PreviewSettings,
            PreviewMode,
        )
        from model_manager import ModelManager, ModelConfig
        from gpu_scheduler import GPUScheduler

        # Créer ModelManager
        model_config = ModelConfig()
        model_manager = ModelManager(model_config)
        print("  ✅ ModelManager instancié")

        # Créer GPUScheduler
        gpu_scheduler = GPUScheduler()
        print("  ✅ GPUScheduler instancié")

        # Créer QualityOptimizer
        QualityOptimizer(model_manager)
        print("  ✅ QualityOptimizer instancié")

        # Créer PreviewAIIntegration
        PreviewAIIntegration(model_manager, gpu_scheduler)
        print("  ✅ PreviewAIIntegration instancié")

        # Créer PreviewSettings
        PreviewSettings(mode=PreviewMode.BALANCED)
        print("  ✅ PreviewSettings instancié")

        print("✅ Toutes les classes peuvent être instanciées")
        return True

    except Exception as e:
        print(f"❌ Erreur d'instanciation: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_type_compatibility():
    """Test que les types sont compatibles entre modules."""
    print("\n🔍 Test 4: Vérification de la compatibilité des types...")

    try:
        from quality_optimizer import (
            QualityEnhancementType,
            EnhancementSuggestion,
            QualityDimension,
        )

        # Créer une suggestion d'amélioration
        suggestion = EnhancementSuggestion(
            enhancement_type=QualityEnhancementType.SHARPEN,
            target_dimension=QualityDimension.SHARPNESS,
            confidence_score=0.85,
            priority=1,
            parameters={"strength": 0.7},
            expected_improvement=0.15,
            description="Test suggestion",
        )

        # Vérifier que le type est correct
        assert isinstance(suggestion.enhancement_type, QualityEnhancementType)
        assert suggestion.enhancement_type == QualityEnhancementType.SHARPEN
        print("  ✅ EnhancementSuggestion utilise correctement QualityEnhancementType")

        # Vérifier la sérialisation
        suggestion_dict = suggestion.to_dict()
        assert suggestion_dict["enhancement_type"] == "sharpen"
        print("  ✅ Sérialisation fonctionne correctement")

        print("✅ Compatibilité des types vérifiée")
        return True

    except Exception as e:
        print(f"❌ Erreur de compatibilité: {e}")
        import traceback

        traceback.print_exc()
        return False


async def test_preview_integration_async():
    """Test asynchrone de l'intégration preview."""
    print("\n🔍 Test 5: Test asynchrone de PreviewAIIntegration...")

    try:
        from preview_ai_integration import PreviewAIIntegration, PreviewMode
        from model_manager import ModelManager, ModelConfig
        from gpu_scheduler import GPUScheduler

        # Créer les dépendances
        model_config = ModelConfig()
        model_manager = ModelManager(model_config)
        gpu_scheduler = GPUScheduler()

        # Créer PreviewAIIntegration
        preview_integration = PreviewAIIntegration(model_manager, gpu_scheduler)
        print("  ✅ PreviewAIIntegration créé")

        # Tester le changement de mode
        result = await preview_integration.switch_preview_mode(
            PreviewMode.QUALITY, smooth_transition=False
        )
        assert result["success"]
        print("  ✅ Changement de mode fonctionne")

        # Tester l'ajustement qualité-vitesse
        result = await preview_integration.adjust_quality_speed_balance(0.7)
        assert result["success"]
        print("  ✅ Ajustement qualité-vitesse fonctionne")

        # Tester l'activation d'enhancement
        result = await preview_integration.enable_enhancement("style_transfer", True)
        assert result["success"]
        print("  ✅ Activation d'enhancement fonctionne")

        # Obtenir le statut
        status = preview_integration.get_integration_status()
        assert "current_mode" in status
        assert "enhancements_enabled" in status
        print("  ✅ Statut d'intégration disponible")

        print("✅ Tests asynchrones réussis")
        return True

    except Exception as e:
        print(f"❌ Erreur dans test asynchrone: {e}")
        import traceback

        traceback.print_exc()
        return False


def main():
    """Exécuter tous les tests."""
    print("=" * 60)
    print("🧪 TESTS DE VALIDATION - CORRECTIONS TÂCHES 7 & 8")
    print("=" * 60)

    results = []

    # Tests synchrones
    results.append(("Imports sans conflit", test_imports_no_conflict()))
    results.append(("Valeurs d'enum", test_enum_values()))
    results.append(("Instanciation des classes", test_class_instantiation()))
    results.append(("Compatibilité des types", test_type_compatibility()))

    # Test asynchrone
    try:
        async_result = asyncio.run(test_preview_integration_async())
        results.append(("Tests asynchrones", async_result))
    except Exception as e:
        print(f"❌ Erreur lors de l'exécution du test asynchrone: {e}")
        results.append(("Tests asynchrones", False))

    # Résumé
    print("\n" + "=" * 60)
    print("📊 RÉSUMÉ DES TESTS")
    print("=" * 60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")

    print("\n" + "=" * 60)
    print(f"Résultat: {passed}/{total} tests réussis ({(passed / total) * 100:.1f}%)")
    print("=" * 60)

    if passed == total:
        print("\n🎉 TOUS LES TESTS SONT PASSÉS!")
        print("✅ Les corrections des tâches 7 et 8 sont validées")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) ont échoué")
        print("❌ Des corrections supplémentaires sont nécessaires")
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
