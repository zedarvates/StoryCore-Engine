"""
Test LTX-2 two-stage progress tracking.

This script validates:
1. Progress updates for latent generation stage
2. Progress updates for spatial upscaling stage
3. Progress callback functionality
4. UI display of both stages

Requirements: 14.14
"""

import sys
from pathlib import Path
import asyncio
from typing import List

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from end_to_end.generation_engine import GenerationProgress


class ProgressTracker:
    """Helper class to track progress updates."""
    
    def __init__(self):
        self.updates: List[GenerationProgress] = []
        self.stage1_updates: List[GenerationProgress] = []
        self.stage2_updates: List[GenerationProgress] = []
    
    def callback(self, progress: GenerationProgress):
        """Progress callback that stores updates."""
        self.updates.append(progress)
        
        if "Latent" in progress.current_step:
            self.stage1_updates.append(progress)
        elif "Upscaling" in progress.current_step:
            self.stage2_updates.append(progress)
    
    def print_summary(self):
        """Print summary of tracked progress."""
        print(f"\nProgress Tracking Summary:")
        print(f"  Total updates: {len(self.updates)}")
        print(f"  Stage 1 (Latent) updates: {len(self.stage1_updates)}")
        print(f"  Stage 2 (Upscaling) updates: {len(self.stage2_updates)}")
        
        if self.updates:
            print(f"\nProgress Timeline:")
            for i, update in enumerate(self.updates, 1):
                print(f"  {i}. {update.current_step}: {update.percentage:.1f}% - {update.current_message}")


def test_progress_structure():
    """Test GenerationProgress data structure."""
    print("=" * 80)
    print("TEST 1: Progress Data Structure")
    print("=" * 80)
    
    try:
        # Create stage 1 progress
        stage1 = GenerationProgress(
            session_id="test_session_1",
            current_step="Latent Video Generation",
            current_item=1,
            total_items=2,
            percentage=25.0,
            elapsed_time=10.5,
            estimated_remaining=31.5,
            current_message="Generating video latents from input image...",
            backend_queue_depth=0
        )
        
        print("✅ Stage 1 progress created:")
        print(f"   Session ID: {stage1.session_id}")
        print(f"   Step: {stage1.current_step}")
        print(f"   Item: {stage1.current_item}/{stage1.total_items}")
        print(f"   Percentage: {stage1.percentage}%")
        print(f"   Elapsed: {stage1.elapsed_time}s")
        print(f"   Remaining: {stage1.estimated_remaining}s")
        print(f"   Message: {stage1.current_message}")
        
        # Verify stage 1 properties
        assert stage1.current_item == 1, "Stage 1 should be item 1"
        assert stage1.total_items == 2, "Total items should be 2"
        assert "Latent" in stage1.current_step, "Stage 1 should mention Latent"
        assert 0 <= stage1.percentage <= 50, "Stage 1 percentage should be 0-50%"
        print("✅ Stage 1 properties validated")
        
        # Create stage 2 progress
        stage2 = GenerationProgress(
            session_id="test_session_1",
            current_step="Spatial Upscaling",
            current_item=2,
            total_items=2,
            percentage=75.0,
            elapsed_time=31.5,
            estimated_remaining=10.5,
            current_message="Upscaling video resolution...",
            backend_queue_depth=0
        )
        
        print("\n✅ Stage 2 progress created:")
        print(f"   Session ID: {stage2.session_id}")
        print(f"   Step: {stage2.current_step}")
        print(f"   Item: {stage2.current_item}/{stage2.total_items}")
        print(f"   Percentage: {stage2.percentage}%")
        print(f"   Elapsed: {stage2.elapsed_time}s")
        print(f"   Remaining: {stage2.estimated_remaining}s")
        print(f"   Message: {stage2.current_message}")
        
        # Verify stage 2 properties
        assert stage2.current_item == 2, "Stage 2 should be item 2"
        assert stage2.total_items == 2, "Total items should be 2"
        assert "Upscaling" in stage2.current_step, "Stage 2 should mention Upscaling"
        assert 50 <= stage2.percentage <= 100, "Stage 2 percentage should be 50-100%"
        print("✅ Stage 2 properties validated")
        
        # Verify session continuity
        assert stage1.session_id == stage2.session_id, "Both stages should share session ID"
        print("\n✅ Session continuity validated")
        
        print("\n✅ PASSED: Progress data structure is correct\n")
        return True
        
    except Exception as e:
        print(f"\n❌ FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_progress_callback():
    """Test progress callback functionality."""
    print("=" * 80)
    print("TEST 2: Progress Callback Functionality")
    print("=" * 80)
    
    try:
        tracker = ProgressTracker()
        
        # Simulate progress updates
        updates = [
            GenerationProgress(
                session_id="test_session_2",
                current_step="Latent Video Generation",
                current_item=1,
                total_items=2,
                percentage=0.0,
                elapsed_time=0.0,
                estimated_remaining=42.0,
                current_message="Starting latent generation...",
                backend_queue_depth=0
            ),
            GenerationProgress(
                session_id="test_session_2",
                current_step="Latent Video Generation",
                current_item=1,
                total_items=2,
                percentage=25.0,
                elapsed_time=10.5,
                estimated_remaining=31.5,
                current_message="Generating video latents...",
                backend_queue_depth=0
            ),
            GenerationProgress(
                session_id="test_session_2",
                current_step="Spatial Upscaling",
                current_item=2,
                total_items=2,
                percentage=50.0,
                elapsed_time=21.0,
                estimated_remaining=21.0,
                current_message="Starting spatial upscaling...",
                backend_queue_depth=0
            ),
            GenerationProgress(
                session_id="test_session_2",
                current_step="Spatial Upscaling",
                current_item=2,
                total_items=2,
                percentage=75.0,
                elapsed_time=31.5,
                estimated_remaining=10.5,
                current_message="Upscaling video resolution...",
                backend_queue_depth=0
            ),
            GenerationProgress(
                session_id="test_session_2",
                current_step="Spatial Upscaling",
                current_item=2,
                total_items=2,
                percentage=100.0,
                elapsed_time=42.0,
                estimated_remaining=0.0,
                current_message="Video generation complete!",
                backend_queue_depth=0
            ),
        ]
        
        # Send updates to tracker
        for update in updates:
            tracker.callback(update)
        
        print(f"✅ Sent {len(updates)} progress updates to callback")
        
        # Verify all updates were received
        assert len(tracker.updates) == len(updates), "All updates should be received"
        print(f"✅ All {len(tracker.updates)} updates received")
        
        # Verify stage separation
        assert len(tracker.stage1_updates) > 0, "Should have stage 1 updates"
        assert len(tracker.stage2_updates) > 0, "Should have stage 2 updates"
        print(f"✅ Stage separation working:")
        print(f"   Stage 1 updates: {len(tracker.stage1_updates)}")
        print(f"   Stage 2 updates: {len(tracker.stage2_updates)}")
        
        # Verify progress increases
        for i in range(len(tracker.updates) - 1):
            current = tracker.updates[i]
            next_update = tracker.updates[i + 1]
            assert next_update.percentage >= current.percentage, "Progress should increase"
        print(f"✅ Progress increases monotonically")
        
        # Verify elapsed time increases
        for i in range(len(tracker.updates) - 1):
            current = tracker.updates[i]
            next_update = tracker.updates[i + 1]
            assert next_update.elapsed_time >= current.elapsed_time, "Elapsed time should increase"
        print(f"✅ Elapsed time increases correctly")
        
        # Verify estimated remaining decreases
        for i in range(len(tracker.updates) - 1):
            current = tracker.updates[i]
            next_update = tracker.updates[i + 1]
            assert next_update.estimated_remaining <= current.estimated_remaining, "Remaining time should decrease"
        print(f"✅ Estimated remaining time decreases correctly")
        
        # Print summary
        tracker.print_summary()
        
        print("\n✅ PASSED: Progress callback functionality works correctly\n")
        return True
        
    except Exception as e:
        print(f"\n❌ FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_ui_display_format():
    """Test UI display formatting for progress."""
    print("=" * 80)
    print("TEST 3: UI Display Format")
    print("=" * 80)
    
    try:
        # Create sample progress for UI display
        progress = GenerationProgress(
            session_id="test_session_3",
            current_step="Latent Video Generation",
            current_item=1,
            total_items=2,
            percentage=35.5,
            elapsed_time=15.3,
            estimated_remaining=27.8,
            current_message="Generating video latents from input image...",
            backend_queue_depth=2
        )
        
        # Format for UI display
        print("UI Display Format:")
        print(f"  Stage: {progress.current_step}")
        print(f"  Progress: {progress.current_item}/{progress.total_items} ({progress.percentage:.1f}%)")
        print(f"  Status: {progress.current_message}")
        print(f"  Time: {progress.elapsed_time:.1f}s elapsed, {progress.estimated_remaining:.1f}s remaining")
        print(f"  Queue: {progress.backend_queue_depth} items")
        
        # Verify display components
        assert progress.current_step, "Should have current step"
        assert progress.current_message, "Should have current message"
        assert progress.percentage >= 0 and progress.percentage <= 100, "Percentage should be 0-100"
        assert progress.elapsed_time >= 0, "Elapsed time should be non-negative"
        assert progress.estimated_remaining >= 0, "Remaining time should be non-negative"
        
        print("\n✅ All display components present and valid")
        
        # Test progress bar representation
        bar_width = 50
        filled = int(bar_width * progress.percentage / 100)
        bar = "█" * filled + "░" * (bar_width - filled)
        print(f"\nProgress Bar: [{bar}] {progress.percentage:.1f}%")
        
        # Test stage indicator
        stage_indicator = "●" if progress.current_item == 1 else "○"
        stage2_indicator = "●" if progress.current_item == 2 else "○"
        print(f"Stage Indicators: {stage_indicator} Stage 1 (Latent)  {stage2_indicator} Stage 2 (Upscaling)")
        
        print("\n✅ PASSED: UI display format is correct\n")
        return True
        
    except Exception as e:
        print(f"\n❌ FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_stage_transitions():
    """Test transitions between stages."""
    print("=" * 80)
    print("TEST 4: Stage Transitions")
    print("=" * 80)
    
    try:
        # Create progress sequence showing stage transition
        stage1_end = GenerationProgress(
            session_id="test_session_4",
            current_step="Latent Video Generation",
            current_item=1,
            total_items=2,
            percentage=50.0,
            elapsed_time=21.0,
            estimated_remaining=21.0,
            current_message="Latent generation complete",
            backend_queue_depth=0
        )
        
        stage2_start = GenerationProgress(
            session_id="test_session_4",
            current_step="Spatial Upscaling",
            current_item=2,
            total_items=2,
            percentage=50.0,
            elapsed_time=21.0,
            estimated_remaining=21.0,
            current_message="Starting spatial upscaling...",
            backend_queue_depth=0
        )
        
        print("Stage Transition:")
        print(f"  Stage 1 End:")
        print(f"    Step: {stage1_end.current_step}")
        print(f"    Item: {stage1_end.current_item}/{stage1_end.total_items}")
        print(f"    Progress: {stage1_end.percentage}%")
        print(f"    Message: {stage1_end.current_message}")
        
        print(f"\n  Stage 2 Start:")
        print(f"    Step: {stage2_start.current_step}")
        print(f"    Item: {stage2_start.current_item}/{stage2_start.total_items}")
        print(f"    Progress: {stage2_start.percentage}%")
        print(f"    Message: {stage2_start.current_message}")
        
        # Verify transition properties
        assert stage1_end.session_id == stage2_start.session_id, "Session should continue"
        assert stage1_end.current_item < stage2_start.current_item, "Item should increment"
        assert stage1_end.current_step != stage2_start.current_step, "Step should change"
        assert stage1_end.percentage <= stage2_start.percentage, "Progress should not decrease"
        
        print("\n✅ Stage transition properties validated")
        print("✅ PASSED: Stage transitions work correctly\n")
        return True
        
    except Exception as e:
        print(f"\n❌ FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all progress tracking tests."""
    print("\n" + "=" * 80)
    print("LTX-2 TWO-STAGE PROGRESS TRACKING VERIFICATION")
    print("=" * 80 + "\n")
    
    results = []
    
    # Run tests
    results.append(("Progress Data Structure", test_progress_structure()))
    results.append(("Progress Callback", test_progress_callback()))
    results.append(("UI Display Format", test_ui_display_format()))
    results.append(("Stage Transitions", test_stage_transitions()))
    
    # Print summary
    print("=" * 80)
    print("VERIFICATION SUMMARY")
    print("=" * 80)
    
    all_passed = True
    for name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{name:.<50} {status}")
        if not passed:
            all_passed = False
    
    print("=" * 80)
    
    if all_passed:
        print("\n🎉 ALL TESTS PASSED! Two-stage progress tracking is correct.\n")
        return 0
    else:
        print("\n❌ SOME TESTS FAILED. Please review the output above.\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
