#!/usr/bin/env python3
"""
Tests pour l'ajustement dynamique de la qualité.
"""

import unittest
import time
from src.performance_optimizer import PerformanceOptimizer, PerformanceMetrics, OptimizationConfig, OptimizationStrategy


class TestDynamicQualityAdjustment(unittest.TestCase):
    """Tests pour l'ajustement dynamique de la qualité."""

    def setUp(self):
        """Configuration initiale pour les tests."""
        self.config = OptimizationConfig(
            strategy=OptimizationStrategy.ADAPTIVE,
            target_fps=30.0,
            quality_threshold=0.7
        )
        self.optimizer = PerformanceOptimizer(self.config)

    def test_quality_adjustment_speed_strategy(self):
        """Teste l'ajustement de la qualité avec une stratégie axée sur la vitesse."""
        # Changer la stratégie pour la vitesse
        self.optimizer.config.strategy = OptimizationStrategy.SPEED
        
        # Simuler une performance inférieure à la cible
        quality_level = self.optimizer.adjust_quality_level(
            current_performance=20.0,  # 20 FPS
            target_performance=30.0     # Cible 30 FPS
        )
        
        self.assertLess(quality_level, 1.0)
        self.assertGreaterEqual(quality_level, self.optimizer.config.quality_threshold)

    def test_quality_adjustment_quality_strategy(self):
        """Teste l'ajustement de la qualité avec une stratégie axée sur la qualité."""
        # Changer la stratégie pour la qualité
        self.optimizer.config.strategy = OptimizationStrategy.QUALITY
        
        # La qualité devrait toujours être maximale
        quality_level = self.optimizer.adjust_quality_level(
            current_performance=30.0,
            target_performance=30.0
        )
        
        self.assertEqual(quality_level, 1.0)

    def test_quality_adjustment_balanced_strategy(self):
        """Teste l'ajustement de la qualité avec une stratégie équilibrée."""
        # Changer la stratégie pour équilibrée
        self.optimizer.config.strategy = OptimizationStrategy.BALANCED
        
        # Simuler une performance légèrement inférieure à la cible
        quality_level = self.optimizer.adjust_quality_level(
            current_performance=27.0,  # 27 FPS
            target_performance=30.0    # Cible 30 FPS
        )
        
        self.assertLess(quality_level, 1.0)
        self.assertGreater(quality_level, 0.8)

    def test_quality_adjustment_adaptive_strategy(self):
        """Teste l'ajustement de la qualité avec une stratégie adaptative."""
        # La stratégie est déjà adaptative dans setUp
        
        # Simuler une performance très faible
        quality_level_low = self.optimizer.adjust_quality_level(
            current_performance=15.0,  # 15 FPS
            target_performance=30.0    # Cible 30 FPS
        )
        
        self.assertLess(quality_level_low, 1.0)
        self.assertGreaterEqual(quality_level_low, self.optimizer.config.quality_threshold)
        
        # Simuler une performance excellente
        quality_level_high = self.optimizer.adjust_quality_level(
            current_performance=45.0,  # 45 FPS
            target_performance=30.0    # Cible 30 FPS
        )
        
        self.assertLessEqual(quality_level_high, 1.0)
        self.assertGreater(quality_level_high, quality_level_low)

    def test_quality_adjustment_with_metrics(self):
        """Teste l'ajustement de la qualité basé sur les métriques de performance."""
        # Enregistrer des métriques de performance
        metrics = PerformanceMetrics(
            processing_time=0.05,
            throughput=25.0,  # 25 FPS
            gpu_utilization=0.85,
            memory_usage=2048.0,
            quality_score=0.8
        )
        
        self.optimizer.record_metrics(metrics)
        
        # Ajustement basé sur les métriques enregistrées
        quality_level = self.optimizer.adjust_quality_level(
            current_performance=25.0,
            target_performance=30.0
        )
        
        # Avec une utilisation GPU élevée, la qualité devrait être ajustée
        self.assertLess(quality_level, 1.0)

    def test_performance_level_assessment(self):
        """Teste l'évaluation du niveau de performance."""
        # Simuler des métriques pour différents niveaux de performance
        
        # Performance excellente
        for _ in range(10):
            self.optimizer.record_metrics(PerformanceMetrics(
                processing_time=0.03,
                throughput=32.0,  # > 90% de la cible
                gpu_utilization=0.7,
                memory_usage=1500.0,
                quality_score=0.9
            ))
        
        level = self.optimizer.get_performance_level()
        self.assertEqual(level.value, "excellent")
        
        # Performance médiocre
        self.optimizer.reset()
        for _ in range(10):
            self.optimizer.record_metrics(PerformanceMetrics(
                processing_time=0.1,
                throughput=12.0,  # < 50% de la cible
                gpu_utilization=0.95,
                memory_usage=3500.0,
                quality_score=0.6
            ))
        
        level = self.optimizer.get_performance_level()
        self.assertEqual(level.value, "poor")

    def test_optimization_recommendations(self):
        """Teste les recommandations d'optimisation."""
        # Simuler une utilisation GPU élevée
        for _ in range(20):
            self.optimizer.record_metrics(PerformanceMetrics(
                processing_time=0.08,
                throughput=20.0,
                gpu_utilization=0.98,  # Très élevée
                memory_usage=3800.0,
                quality_score=0.75
            ))
        
        recommendations = self.optimizer.get_optimization_recommendations()
        self.assertGreater(len(recommendations), 0)
        self.assertIn("GPU overutilized", recommendations[0])

    def test_batch_size_optimization(self):
        """Teste l'optimisation de la taille des lots."""
        # Tester avec différents niveaux de complexité
        
        # Faible complexité
        batch_size_low = self.optimizer.optimize_batch_size(
            num_items=100,
            item_complexity=0.2
        )
        
        # Haute complexité
        batch_size_high = self.optimizer.optimize_batch_size(
            num_items=100,
            item_complexity=0.9
        )
        
        self.assertGreater(batch_size_low, batch_size_high)
        self.assertLessEqual(batch_size_low, self.optimizer.config.max_batch_size)
        self.assertGreaterEqual(batch_size_high, self.optimizer.config.min_batch_size)

    def test_adaptive_batch_creation(self):
        """Teste la création adaptative de lots."""
        # Créer des éléments avec différentes complexités
        items = [{"size": i} for i in range(1, 21)]
        
        def complexity_fn(item):
            return item["size"] / 20.0  # Normalisé entre 0.05 et 1.0
        
        batches = self.optimizer.create_batches(items, complexity_fn)
        
        self.assertGreater(len(batches), 1)
        self.assertLess(len(batches), len(items))  # Doit créer des lots
        
        # Vérifier que les lots sont raisonnables
        for batch in batches:
            self.assertGreater(len(batch), 0)
            self.assertLessEqual(len(batch), self.optimizer.config.max_batch_size)


if __name__ == "__main__":
    unittest.main()