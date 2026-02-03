"""
Performance Testing for Fact-Checking System

This module tests the performance requirements specified in task 18.3:
- Text processing < 30s for 5000 words
- Transcript processing < 60s for 10000 words
- Cache retrieval < 1s
- Batch processing performance

Requirements: 9.1, 9.2, 9.5, 9.6
"""

import pytest
import time
from pathlib import Path
import tempfile
import shutil

from src.fact_checker.scientific_audit_agent import ScientificAuditAgent
from src.fact_checker.antifake_video_agent import AntiFakeVideoAgent
from src.fact_checker.caching import FactCheckerCache, get_cache, reset_cache
from src.fact_checker.batch_processing import BatchProcessor
from src.fact_checker.models import Configuration


class TestTextProcessingPerformance:
    """Test performance of text processing (Scientific Audit Agent)."""
    
    def test_text_processing_5000_words_under_30_seconds(self):
        """
        Verify text processing completes within 30 seconds for 5000 words.
        
        Requirements: 9.1
        """
        # Generate 5000-word text with factual claims
        words = []
        base_claims = [
            "Water boils at 100 degrees Celsius at sea level.",
            "The Earth orbits the Sun once every 365.25 days.",
            "DNA contains genetic information in living organisms.",
            "The speed of light is approximately 299,792 kilometers per second.",
            "Photosynthesis converts light energy into chemical energy.",
        ]
        
        # Repeat claims to reach 5000 words
        while len(words) < 5000:
            for claim in base_claims:
                words.extend(claim.split())
                if len(words) >= 5000:
                    break
        
        text = " ".join(words[:5000])
        word_count = len(text.split())
        
        print(f"\n[Performance Test] Processing {word_count} words...")
        
        # Create agent and measure processing time
        agent = ScientificAuditAgent()
        start_time = time.time()
        
        report = agent.analyze(text)
        
        elapsed_time = time.time() - start_time
        
        print(f"[Performance Test] Processing completed in {elapsed_time:.2f}s")
        print(f"[Performance Test] Claims extracted: {report.summary_statistics['total_claims']}")
        
        # Verify performance requirement
        assert elapsed_time < 30.0, (
            f"Text processing took {elapsed_time:.2f}s, "
            f"exceeding 30s limit for {word_count} words"
        )
        
        # Verify report was generated
        assert report is not None
        assert report.metadata['processing_time_ms'] > 0
        assert len(report.human_summary) > 0
    
    def test_text_processing_1000_words_performance(self):
        """
        Test performance with smaller text (1000 words) for baseline.
        
        This should complete much faster than the 5000-word test.
        """
        # Generate 1000-word text
        base_text = "The scientific method involves observation, hypothesis, experimentation, and conclusion. "
        text = base_text * 100  # Approximately 1000 words
        word_count = len(text.split())
        
        print(f"\n[Performance Test] Processing {word_count} words (baseline)...")
        
        agent = ScientificAuditAgent()
        start_time = time.time()
        
        report = agent.analyze(text)
        
        elapsed_time = time.time() - start_time
        
        print(f"[Performance Test] Baseline processing completed in {elapsed_time:.2f}s")
        
        # Should be significantly faster than 30s
        assert elapsed_time < 10.0, (
            f"Baseline processing took {elapsed_time:.2f}s, "
            f"which is unexpectedly slow for {word_count} words"
        )
    
    def test_text_processing_empty_input_fast(self):
        """
        Test that empty/invalid input fails fast without timeout.
        """
        agent = ScientificAuditAgent()
        
        start_time = time.time()
        
        with pytest.raises(ValueError, match="Input text cannot be empty"):
            agent.analyze("")
        
        elapsed_time = time.time() - start_time
        
        # Should fail immediately
        assert elapsed_time < 1.0, (
            f"Empty input validation took {elapsed_time:.2f}s, should be instant"
        )


class TestTranscriptProcessingPerformance:
    """Test performance of transcript processing (Anti-Fake Video Agent)."""
    
    def test_transcript_processing_10000_words_under_60_seconds(self):
        """
        Verify transcript processing completes within 60 seconds for 10000 words.
        
        Requirements: 9.2
        """
        # Generate 10000-word transcript
        base_segments = [
            "Welcome to today's presentation on scientific discoveries.",
            "Recent research has shown significant progress in renewable energy.",
            "The data suggests that solar panel efficiency has improved dramatically.",
            "However, some experts argue that more research is needed.",
            "In conclusion, the future looks promising for sustainable technology.",
        ]
        
        words = []
        while len(words) < 10000:
            for segment in base_segments:
                words.extend(segment.split())
                if len(words) >= 10000:
                    break
        
        transcript = " ".join(words[:10000])
        word_count = len(transcript.split())
        
        print(f"\n[Performance Test] Processing {word_count}-word transcript...")
        
        # Create agent and measure processing time
        agent = AntiFakeVideoAgent()
        start_time = time.time()
        
        report = agent.analyze(transcript)
        
        elapsed_time = time.time() - start_time
        
        print(f"[Performance Test] Transcript processing completed in {elapsed_time:.2f}s")
        print(f"[Performance Test] Manipulation signals: {len(report.manipulation_signals)}")
        print(f"[Performance Test] Coherence score: {report.summary_statistics.get('coherence_score', 0):.1f}")
        
        # Verify performance requirement
        assert elapsed_time < 60.0, (
            f"Transcript processing took {elapsed_time:.2f}s, "
            f"exceeding 60s limit for {word_count} words"
        )
        
        # Verify report was generated
        assert report is not None
        assert report.metadata['processing_time_ms'] > 0
        assert len(report.human_summary) > 0
    
    def test_transcript_processing_2000_words_performance(self):
        """
        Test performance with smaller transcript (2000 words) for baseline.
        """
        # Generate 2000-word transcript
        base_text = "This is a video transcript discussing various topics in science and technology. "
        transcript = base_text * 200  # Approximately 2000 words
        word_count = len(transcript.split())
        
        print(f"\n[Performance Test] Processing {word_count}-word transcript (baseline)...")
        
        agent = AntiFakeVideoAgent()
        start_time = time.time()
        
        report = agent.analyze(transcript)
        
        elapsed_time = time.time() - start_time
        
        print(f"[Performance Test] Baseline transcript processing completed in {elapsed_time:.2f}s")
        
        # Should be significantly faster than 60s
        assert elapsed_time < 20.0, (
            f"Baseline transcript processing took {elapsed_time:.2f}s, "
            f"which is unexpectedly slow for {word_count} words"
        )
    
    def test_transcript_with_timestamps_performance(self):
        """
        Test performance with transcript including timestamp data.
        """
        # Generate transcript with timestamps
        transcript = "This is a test transcript. " * 500  # ~1500 words
        
        timestamps = [
            {"start": "00:00:00", "end": "00:00:10", "text": "Introduction"},
            {"start": "00:00:10", "end": "00:00:30", "text": "Main content"},
            {"start": "00:00:30", "end": "00:00:45", "text": "Conclusion"},
        ]
        
        agent = AntiFakeVideoAgent()
        start_time = time.time()
        
        report = agent.analyze(transcript, timestamps=timestamps)
        
        elapsed_time = time.time() - start_time
        
        print(f"\n[Performance Test] Transcript with timestamps processed in {elapsed_time:.2f}s")
        
        # Should complete quickly
        assert elapsed_time < 15.0
        assert report is not None


class TestCachePerformance:
    """Test cache retrieval performance."""
    
    def setup_method(self):
        """Set up test cache before each test."""
        reset_cache()
        self.temp_dir = Path(tempfile.mkdtemp())
        self.cache = FactCheckerCache(cache_dir=self.temp_dir)
    
    def teardown_method(self):
        """Clean up test cache after each test."""
        if self.temp_dir.exists():
            shutil.rmtree(self.temp_dir)
        reset_cache()
    
    def test_cache_retrieval_under_1_second(self):
        """
        Verify cache retrieval completes within 1 second.
        
        Requirements: 9.6
        """
        # Store test data in cache
        test_content = "This is test content for cache performance testing."
        test_data = {
            "result": "cached_result",
            "timestamp": "2024-01-01T00:00:00",
            "claims": [{"text": "test claim", "confidence": 85.0}]
        }
        
        self.cache.set(test_content, test_data)
        
        # Measure cache retrieval time
        start_time = time.time()
        
        retrieved_data = self.cache.get(test_content)
        
        elapsed_time = time.time() - start_time
        
        print(f"\n[Performance Test] Cache retrieval completed in {elapsed_time:.6f}s")
        
        # Verify performance requirement
        assert elapsed_time < 1.0, (
            f"Cache retrieval took {elapsed_time:.6f}s, exceeding 1s limit"
        )
        
        # Verify data was retrieved correctly
        assert retrieved_data is not None
        assert retrieved_data["result"] == "cached_result"
    
    def test_cache_retrieval_memory_only(self):
        """
        Test cache retrieval performance with memory-only cache.
        
        Memory cache should be even faster than disk cache.
        """
        # Create memory-only cache
        memory_cache = FactCheckerCache(cache_dir=None)
        
        test_content = "Memory cache test content"
        test_data = {"result": "memory_cached"}
        
        memory_cache.set(test_content, test_data)
        
        # Measure retrieval time
        start_time = time.time()
        
        retrieved_data = memory_cache.get(test_content)
        
        elapsed_time = time.time() - start_time
        
        print(f"\n[Performance Test] Memory cache retrieval in {elapsed_time:.6f}s")
        
        # Should be very fast (< 0.1s)
        assert elapsed_time < 0.1, (
            f"Memory cache retrieval took {elapsed_time:.6f}s, should be nearly instant"
        )
        
        assert retrieved_data is not None
        assert retrieved_data["result"] == "memory_cached"
    
    def test_cache_miss_performance(self):
        """
        Test performance of cache miss (content not in cache).
        
        Cache misses should also be fast.
        """
        test_content = "Content that is not in cache"
        
        start_time = time.time()
        
        result = self.cache.get(test_content)
        
        elapsed_time = time.time() - start_time
        
        print(f"\n[Performance Test] Cache miss check completed in {elapsed_time:.6f}s")
        
        # Should be fast even for misses
        assert elapsed_time < 0.5
        assert result is None
    
    def test_cache_set_performance(self):
        """
        Test performance of storing data in cache.
        """
        test_content = "Content to cache"
        test_data = {"large_result": "x" * 10000}  # 10KB of data
        
        start_time = time.time()
        
        self.cache.set(test_content, test_data)
        
        elapsed_time = time.time() - start_time
        
        print(f"\n[Performance Test] Cache set completed in {elapsed_time:.6f}s")
        
        # Should complete quickly
        assert elapsed_time < 1.0
    
    def test_multiple_cache_operations_performance(self):
        """
        Test performance of multiple cache operations in sequence.
        """
        num_operations = 100
        
        start_time = time.time()
        
        # Perform multiple set and get operations
        for i in range(num_operations):
            content = f"Test content {i}"
            data = {"index": i, "result": f"result_{i}"}
            
            self.cache.set(content, data)
            retrieved = self.cache.get(content)
            
            assert retrieved is not None
            assert retrieved["index"] == i
        
        elapsed_time = time.time() - start_time
        avg_time = elapsed_time / num_operations
        
        print(f"\n[Performance Test] {num_operations} cache operations in {elapsed_time:.2f}s")
        print(f"[Performance Test] Average time per operation: {avg_time:.6f}s")
        
        # Average should be well under 1s
        assert avg_time < 0.1


class TestBatchProcessingPerformance:
    """Test batch processing performance."""
    
    def test_batch_processing_parallel_speedup(self):
        """
        Test that batch processing with multiple workers is faster than sequential.
        
        Requirements: 9.3, 9.4
        """
        # Create test items
        num_items = 10
        items = [
            {"id": f"item_{i}", "content": f"Test content {i} " * 100}
            for i in range(num_items)
        ]
        
        # Simple processing function that takes some time
        def process_func(content: str) -> dict:
            time.sleep(0.1)  # Simulate processing time
            return {"processed": True, "length": len(content)}
        
        # Test sequential processing (1 worker)
        sequential_processor = BatchProcessor(max_workers=1)
        start_time = time.time()
        sequential_result = sequential_processor.process_batch(items, process_func)
        sequential_time = time.time() - start_time
        
        print(f"\n[Performance Test] Sequential processing: {sequential_time:.2f}s")
        
        # Test parallel processing (5 workers)
        parallel_processor = BatchProcessor(max_workers=5)
        start_time = time.time()
        parallel_result = parallel_processor.process_batch(items, process_func)
        parallel_time = time.time() - start_time
        
        print(f"[Performance Test] Parallel processing (5 workers): {parallel_time:.2f}s")
        print(f"[Performance Test] Speedup: {sequential_time / parallel_time:.2f}x")
        
        # Parallel should be significantly faster
        assert parallel_time < sequential_time * 0.6, (
            f"Parallel processing ({parallel_time:.2f}s) should be faster than "
            f"sequential ({sequential_time:.2f}s)"
        )
        
        # Both should complete successfully
        assert sequential_result.get_success_rate() == 100.0
        assert parallel_result.get_success_rate() == 100.0
    
    def test_batch_processing_large_batch(self):
        """
        Test batch processing with a larger number of items.
        """
        num_items = 50
        items = [
            {"id": f"item_{i}", "content": f"Content {i}"}
            for i in range(num_items)
        ]
        
        def fast_process_func(content: str) -> dict:
            return {"length": len(content)}
        
        processor = BatchProcessor(max_workers=10)
        
        start_time = time.time()
        result = processor.process_batch(items, fast_process_func)
        elapsed_time = time.time() - start_time
        
        print(f"\n[Performance Test] Processed {num_items} items in {elapsed_time:.2f}s")
        print(f"[Performance Test] Average time per item: {elapsed_time / num_items:.4f}s")
        
        # Should complete in reasonable time
        assert elapsed_time < 10.0
        assert result.get_success_rate() == 100.0
    
    def test_batch_processing_with_failures(self):
        """
        Test batch processing performance when some items fail.
        """
        items = [
            {"id": f"item_{i}", "content": f"Content {i}"}
            for i in range(20)
        ]
        
        def sometimes_fail_func(content: str) -> dict:
            # Fail on every 5th item
            if "5" in content or "10" in content or "15" in content:
                raise ValueError("Simulated failure")
            return {"processed": True}
        
        processor = BatchProcessor(max_workers=5)
        
        start_time = time.time()
        result = processor.process_batch(items, sometimes_fail_func)
        elapsed_time = time.time() - start_time
        
        print(f"\n[Performance Test] Batch with failures completed in {elapsed_time:.2f}s")
        print(f"[Performance Test] Success rate: {result.get_success_rate():.1f}%")
        print(f"[Performance Test] Failed items: {len(result.failed_items)}")
        
        # Should handle failures gracefully and complete quickly
        assert elapsed_time < 5.0
        assert len(result.failed_items) > 0  # Some items should have failed
        assert len(result.successful_items) > 0  # Some items should have succeeded
    
    def test_batch_processing_progress_tracking(self):
        """
        Test that progress tracking works correctly during batch processing.
        """
        items = [
            {"id": f"item_{i}", "content": f"Content {i}"}
            for i in range(10)
        ]
        
        progress_updates = []
        
        def progress_callback(progress):
            progress_updates.append(progress.to_dict())
        
        def process_func(content: str) -> dict:
            time.sleep(0.05)
            return {"processed": True}
        
        processor = BatchProcessor(max_workers=3, progress_callback=progress_callback)
        
        result = processor.process_batch(items, process_func)
        
        print(f"\n[Performance Test] Progress updates received: {len(progress_updates)}")
        
        # Should have received progress updates
        assert len(progress_updates) > 0
        
        # Final progress should show completion
        final_progress = progress_updates[-1]
        assert final_progress["completion_percentage"] == 100.0
        assert final_progress["completed"] + final_progress["failed"] == 10


class TestEndToEndPerformance:
    """Test end-to-end performance scenarios."""
    
    def test_complete_workflow_with_caching(self):
        """
        Test complete workflow: process, cache, retrieve from cache.
        
        Second retrieval should be much faster due to caching.
        """
        reset_cache()
        temp_dir = Path(tempfile.mkdtemp())
        
        try:
            # Initialize cache
            cache = FactCheckerCache(cache_dir=temp_dir)
            
            # Create agent with caching enabled
            config = Configuration(cache_enabled=True)
            agent = ScientificAuditAgent(config)
            
            # First processing (no cache)
            text = "Water boils at 100 degrees Celsius. " * 500  # ~1500 words
            
            start_time = time.time()
            report1 = agent.analyze(text)
            first_time = time.time() - start_time
            
            # Cache the result
            cache.set(text, {
                "metadata": report1.metadata,
                "summary": report1.human_summary
            })
            
            # Second retrieval (from cache)
            start_time = time.time()
            cached_result = cache.get(text)
            cache_time = time.time() - start_time
            
            print(f"\n[Performance Test] First processing: {first_time:.2f}s")
            print(f"[Performance Test] Cache retrieval: {cache_time:.6f}s")
            
            # Calculate speedup (handle case where cache_time is 0)
            if cache_time > 0:
                speedup = first_time / cache_time
                print(f"[Performance Test] Speedup: {speedup:.0f}x")
            else:
                print(f"[Performance Test] Speedup: >1000x (cache retrieval too fast to measure)")
            
            # Cache retrieval should be much faster
            assert cache_time < 1.0
            # If cache_time is measurable, it should be at least 10x faster
            if cache_time > 0:
                assert cache_time < first_time * 0.1  # At least 10x faster
            assert cached_result is not None
            
        finally:
            if temp_dir.exists():
                shutil.rmtree(temp_dir)
            reset_cache()
    
    def test_mixed_workload_performance(self):
        """
        Test performance with mixed workload (text and transcript processing).
        """
        # Create agents
        text_agent = ScientificAuditAgent()
        video_agent = AntiFakeVideoAgent()
        
        # Prepare workload
        text_content = "Scientific claims about physics and biology. " * 200
        transcript_content = "Video transcript discussing various topics. " * 300
        
        start_time = time.time()
        
        # Process text
        text_report = text_agent.analyze(text_content)
        
        # Process transcript
        video_report = video_agent.analyze(transcript_content)
        
        total_time = time.time() - start_time
        
        print(f"\n[Performance Test] Mixed workload completed in {total_time:.2f}s")
        
        # Should complete in reasonable time
        assert total_time < 20.0
        assert text_report is not None
        assert video_report is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
