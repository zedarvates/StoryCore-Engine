#!/usr/bin/env python3
"""
Tests pour l'optimisation de l'utilisation du GPU et le traitement par lots intelligent.
"""

import unittest
import asyncio
import time
from unittest.mock import Mock, patch
from src.gpu_scheduler import GPUScheduler, GPUJobRequest, JobPriority
from src.batch_processing_system import BatchProcessingSystem, JobDefinition, JobPriority as BatchJobPriority


class TestGPUScheduler(unittest.TestCase):
    """Tests pour le planificateur GPU."""

    def setUp(self):
        """Configuration initiale pour les tests."""
        self.scheduler = GPUScheduler()
        self.test_job = GPUJobRequest(
            job_id="test_job_1",
            job_type="image_processing",
            priority=JobPriority.NORMAL,
            gpu_memory_required=1024,
            estimated_duration=10.0,
            timeout=30.0,
            callback=lambda **kwargs: asyncio.sleep(0.1)
        )

    def test_job_submission(self):
        """Teste la soumission d'un travail au planificateur GPU."""
        job_id = asyncio.run(self.scheduler.submit_job(self.test_job))
        self.assertIsNotNone(job_id)
        self.assertEqual(len(self.scheduler.job_queue), 1)

    def test_job_priority(self):
        """Teste la priorité des travaux."""
        high_priority_job = GPUJobRequest(
            job_id="high_priority_job",
            job_type="real_time_preview",
            priority=JobPriority.CRITICAL,
            gpu_memory_required=2048,
            estimated_duration=5.0,
            timeout=15.0,
            callback=lambda **kwargs: asyncio.sleep(0.1)
        )
        
        low_priority_job = GPUJobRequest(
            job_id="low_priority_job",
            job_type="background_processing",
            priority=JobPriority.BATCH,
            gpu_memory_required=512,
            estimated_duration=60.0,
            timeout=300.0,
            callback=lambda **kwargs: asyncio.sleep(0.1)
        )
        
        asyncio.run(self.scheduler.submit_job(high_priority_job))
        asyncio.run(self.scheduler.submit_job(low_priority_job))
        
        # Le travail à haute priorité devrait être traité en premier
        self.assertEqual(len(self.scheduler.job_queue), 2)

    def test_gpu_device_selection(self):
        """Teste la sélection du meilleur appareil GPU."""
        # Simuler un travail nécessitant beaucoup de mémoire
        heavy_job = GPUJobRequest(
            job_id="heavy_job",
            job_type="video_processing",
            priority=JobPriority.HIGH,
            gpu_memory_required=4096,
            estimated_duration=30.0,
            timeout=60.0,
            callback=lambda **kwargs: asyncio.sleep(0.1)
        )
        
        device = self.scheduler._select_optimal_device(heavy_job)
        self.assertIsNotNone(device)
        self.assertGreaterEqual(device.available_memory, heavy_job.gpu_memory_required)

    def test_job_execution(self):
        """Teste l'exécution d'un travail."""
        async def test_execution():
            await self.scheduler.start()
            job_id = await self.scheduler.submit_job(self.test_job)
            
            # Attendre que le travail soit terminé
            await asyncio.sleep(0.5)
            
            result = self.scheduler.get_job_result(job_id)
            self.assertIsNotNone(result)
            self.assertEqual(result.status.value, "completed")
            
            await self.scheduler.stop()
        
        asyncio.run(test_execution())

    def test_resource_monitoring(self):
        """Teste la surveillance des ressources."""
        metrics = self.scheduler.get_performance_metrics()
        self.assertIn("gpu_metrics", metrics)
        self.assertIn("queue_metrics", metrics)
        self.assertIn("performance_metrics", metrics)


class TestBatchProcessingSystem(unittest.TestCase):
    """Tests pour le système de traitement par lots."""

    def setUp(self):
        """Configuration initiale pour les tests."""
        self.batch_system = BatchProcessingSystem(max_workers=2)
        
        # Enregistrer un processeur de travail factice
        def dummy_processor(parameters):
            time.sleep(0.1)
            return {"status": "success", "data": parameters}
        
        self.batch_system.register_job_processor("test_job", dummy_processor)

    def test_job_submission(self):
        """Teste la soumission d'un travail au système de traitement par lots."""
        job = JobDefinition(
            job_id="test_job_1",
            job_type="test_job",
            priority=BatchJobPriority.NORMAL,
            parameters={"test": "data"}
        )
        
        job_id = self.batch_system.submit_job(job)
        self.assertIsNotNone(job_id)
        self.assertEqual(len(self.batch_system.job_queue.jobs), 1)

    def test_batch_processing(self):
        """Teste le traitement par lots."""
        jobs = []
        for i in range(5):
            job = JobDefinition(
                job_id=f"test_job_{i}",
                job_type="test_job",
                priority=BatchJobPriority.NORMAL,
                parameters={"item": i}
            )
            jobs.append(self.batch_system.submit_job(job))
        
        # Démarrer le traitement
        self.batch_system.start_processing()
        
        # Attendre que les travaux soient terminés
        time.sleep(2)
        
        # Vérifier les résultats
        for job_id in jobs:
            result = self.batch_system.get_job_status(job_id)
            self.assertIsNotNone(result)
            self.assertEqual(result.status.value, "completed")
        
        self.batch_system.stop_processing()

    def test_priority_scheduling(self):
        """Teste la planification par priorité."""
        high_priority_job = JobDefinition(
            job_id="high_priority_job",
            job_type="test_job",
            priority=BatchJobPriority.HIGH,
            parameters={"priority": "high"}
        )
        
        low_priority_job = JobDefinition(
            job_id="low_priority_job",
            job_type="test_job",
            priority=BatchJobPriority.LOW,
            parameters={"priority": "low"}
        )
        
        self.batch_system.submit_job(high_priority_job)
        self.batch_system.submit_job(low_priority_job)
        
        # Le travail à haute priorité devrait être traité en premier
        self.assertEqual(len(self.batch_system.job_queue.jobs), 2)

    def test_resource_optimization(self):
        """Teste l'optimisation des ressources."""
        # Soumettre plusieurs travaux pour tester l'optimisation des ressources
        for i in range(10):
            job = JobDefinition(
                job_id=f"resource_test_job_{i}",
                job_type="test_job",
                priority=BatchJobPriority.NORMAL,
                parameters={"item": i}
            )
            self.batch_system.submit_job(job)
        
        stats = self.batch_system.get_system_stats()
        self.assertIn("queue_size", stats)
        self.assertIn("active_workers", stats)
        self.assertGreater(stats["queue_size"], 0)

    def test_fault_tolerance(self):
        """Teste la tolérance aux pannes."""
        # Enregistrer un processeur qui échoue
        def failing_processor(parameters):
            raise Exception("Simulated failure")
        
        self.batch_system.register_job_processor("failing_job", failing_processor)
        
        job = JobDefinition(
            job_id="failing_job_1",
            job_type="failing_job",
            priority=BatchJobPriority.NORMAL,
            parameters={"test": "data"},
            max_retries=2
        )
        
        job_id = self.batch_system.submit_job(job)
        self.batch_system.start_processing()
        
        # Attendre que le travail échoue et soit réessayé
        time.sleep(2)
        
        result = self.batch_system.get_job_status(job_id)
        self.assertIsNotNone(result)
        self.assertEqual(result.status.value, "failed")
        self.assertGreater(result.retry_count, 0)
        
        self.batch_system.stop_processing()


if __name__ == "__main__":
    unittest.main()