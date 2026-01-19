#!/usr/bin/env python3
"""
Tests pour la surveillance des performances et l'optimisation automatique.
"""

import unittest
import asyncio
import time
from unittest.mock import Mock, patch
from src.advanced_performance_optimizer import (
    AdvancedPerformanceOptimizer,
    PerformanceConfig,
    OptimizationStrategy,
    ResourceMonitor
)
from src.performance_optimizer import AutomaticPerformanceMonitor


class TestPerformanceMonitoring(unittest.TestCase):
    """Tests pour la surveillance des performances."""

    def setUp(self):
        """Configuration initiale pour les tests."""
        self.config = PerformanceConfig(
            max_models_in_memory=2,
            max_batch_size=4,
            enable_profiling=True
        )
        self.optimizer = AdvancedPerformanceOptimizer(self.config)
        self.monitor = ResourceMonitor(self.config)

    def test_resource_monitoring(self):
        """Teste la surveillance des ressources système."""
        # Obtenir les métriques actuelles
        metrics = self.monitor.get_current_metrics()
        
        self.assertIsNotNone(metrics)
        self.assertGreaterEqual(metrics.cpu_percent, 0)
        self.assertLessEqual(metrics.cpu_percent, 100)
        self.assertGreaterEqual(metrics.memory_percent, 0)
        self.assertLessEqual(metrics.memory_percent, 100)

    def test_resource_availability_check(self):
        """Teste la vérification de la disponibilité des ressources."""
        from src.advanced_performance_optimizer import ResourceType
        
        # Vérifier la disponibilité des ressources
        cpu_available = self.monitor.is_resource_available(ResourceType.CPU, threshold=0.8)
        memory_available = self.monitor.is_resource_available(ResourceType.MEMORY, threshold=0.8)
        
        self.assertIsInstance(cpu_available, bool)
        self.assertIsInstance(memory_available, bool)

    def test_performance_stats(self):
        """Teste les statistiques de performance."""
        stats = self.monitor.get_resource_stats()
        
        self.assertIsNotNone(stats)
        self.assertIn('current', stats)
        self.assertIn('averages', stats)
        self.assertIn('peaks', stats)

    def test_workflow_optimization(self):
        """Teste l'optimisation des workflows."""
        async def test_optimization():
            # Exécuter une optimisation de workflow
            result = await self.optimizer.optimize_workflow_execution(
                workflow_id="test_workflow",
                workflow_type="image_generation",
                parameters={
                    'quality_level': 3,
                    'steps': 20,
                    'resolution': (1024, 1024)
                }
            )
            
            self.assertTrue(result['success'])
            self.assertIn('execution_time', result)
            self.assertIn('optimizations_applied', result)
            self.assertGreater(len(result['optimizations_applied']), 0)
        
        asyncio.run(test_optimization())

    def test_batch_optimization(self):
        """Teste l'optimisation des lots."""
        async def test_batch():
            # Soumettre un travail de lot
            batch_items = [{'item_id': i} for i in range(5)]
            job_id = await self.optimizer.optimize_batch_processing(
                workflow_type="image_generation",
                items=batch_items
            )
            
            self.assertIsNotNone(job_id)
            
            # Vérifier le statut du travail
            status = self.optimizer.batch_processor.get_job_status(job_id)
            self.assertIsNotNone(status)
            self.assertIn('status', status)
        
        asyncio.run(test_batch())

    def test_optimization_strategies(self):
        """Teste les différentes stratégies d'optimisation."""
        async def test_strategies():
            strategies = [
                OptimizationStrategy.SPEED_FIRST,
                OptimizationStrategy.MEMORY_FIRST,
                OptimizationStrategy.QUALITY_FIRST,
                OptimizationStrategy.BALANCED,
                OptimizationStrategy.ADAPTIVE
            ]
            
            for strategy in strategies:
                self.optimizer.set_optimization_strategy(strategy)
                
                result = await self.optimizer.optimize_workflow_execution(
                    workflow_id=f"test_{strategy.value}",
                    workflow_type="image_generation",
                    parameters={'quality_level': 3}
                )
                
                self.assertTrue(result['success'])
                self.assertIn(strategy.value, result['optimizations_applied'])
        
        asyncio.run(test_strategies())

    def test_optimization_stats(self):
        """Teste les statistiques d'optimisation."""
        stats = self.optimizer.get_optimization_stats()
        
        self.assertIsNotNone(stats)
        self.assertIn('model_management', stats)
        self.assertIn('resource_monitoring', stats)
        self.assertIn('batch_processing', stats)
        self.assertIn('workflow_profiles', stats)

    def test_performance_report_export(self):
        """Teste l'export des rapports de performance."""
        import tempfile
        from pathlib import Path
        
        with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as tmp:
            tmp_path = Path(tmp.name)
        
        try:
            # Exporter un rapport
            result = self.optimizer.export_performance_report(tmp_path)
            self.assertTrue(result)
            
            # Vérifier que le fichier existe
            self.assertTrue(tmp_path.exists())
            
            # Vérifier le contenu
            import json
            with open(tmp_path, 'r') as f:
                report = json.load(f)
            
            self.assertIn('export_info', report)
            self.assertIn('optimization_stats', report)
        finally:
            # Nettoyer
            if tmp_path.exists():
                tmp_path.unlink()


class TestAutomaticPerformanceMonitor(unittest.TestCase):
    """Tests pour le moniteur automatique de performance."""

    def setUp(self):
        """Configuration initiale pour les tests."""
        from src.performance_optimizer import PerformanceOptimizer, OptimizationConfig
        
        config = OptimizationConfig()
        optimizer = PerformanceOptimizer(config)
        self.monitor = AutomaticPerformanceMonitor(optimizer, check_interval=1.0)

    def test_monitor_start_stop(self):
        """Teste le démarrage et l'arrêt du moniteur."""
        # Démarrer le moniteur
        self.monitor.start()
        self.assertTrue(self.monitor.running)
        
        # Arrêter le moniteur
        self.monitor.stop()
        self.assertFalse(self.monitor.running)

    def test_performance_level_detection(self):
        """Teste la détection des niveaux de performance."""
        # Enregistrer des métriques pour différents niveaux
        from src.performance_optimizer import PerformanceMetrics
        
        # Performance excellente
        for _ in range(10):
            self.monitor.optimizer.record_metrics(PerformanceMetrics(
                processing_time=0.03,
                throughput=32.0,
                gpu_utilization=0.7,
                memory_usage=1500.0,
                quality_score=0.9
            ))
        
        level = self.monitor.optimizer.get_performance_level()
        self.assertEqual(level.value, "excellent")

    def test_optimization_recommendations(self):
        """Teste les recommandations d'optimisation."""
        # Simuler une situation nécessitant des recommandations
        from src.performance_optimizer import PerformanceMetrics
        
        for _ in range(20):
            self.monitor.optimizer.record_metrics(PerformanceMetrics(
                processing_time=0.1,
                throughput=15.0,
                gpu_utilization=0.98,
                memory_usage=3800.0,
                quality_score=0.6
            ))
        
        recommendations = self.monitor.optimizer.get_optimization_recommendations()
        self.assertGreater(len(recommendations), 0)


if __name__ == "__main__":
    unittest.main()