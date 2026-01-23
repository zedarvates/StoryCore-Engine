"""
Test cases for the 3D camera system module.
"""
import unittest
from src.3d.camera_system import CameraSystem, CameraKeyframe, CameraEasing


class TestCameraSystem(unittest.TestCase):
    """Test cases for the CameraSystem class."""

    def setUp(self):
        """Set up test fixtures."""
        self.camera_system = CameraSystem()
        
        # Mock Camera3D object
        class MockCamera3D:
            def __init__(self):
                self.position = (0.0, 0.0, 0.0)
                self.target = (0.0, 0.0, 0.0)
                self.fov = 45.0
        
        self.mock_camera = MockCamera3D()
        self.camera_system.set_current_camera(self.mock_camera)

    def test_create_camera_path(self):
        """Test creating a camera path."""
        keyframes = [
            CameraKeyframe(
                time=0.0,
                position=(0.0, 0.0, 10.0),
                target=(0.0, 0.0, 0.0),
                fov=45.0
            ),
            CameraKeyframe(
                time=2.0,
                position=(5.0, 0.0, 10.0),
                target=(0.0, 0.0, 0.0),
                fov=50.0
            )
        ]
        
        result = self.camera_system.create_camera_path("test_path", keyframes)
        
        self.assertTrue(result)
        self.assertIn("test_path", self.camera_system.camera_paths)
        self.assertEqual(len(self.camera_system.camera_paths["test_path"].keyframes), 2)

    def test_create_duplicate_camera_path(self):
        """Test creating a duplicate camera path."""
        keyframes = [
            CameraKeyframe(
                time=0.0,
                position=(0.0, 0.0, 10.0),
                target=(0.0, 0.0, 0.0),
                fov=45.0
            )
        ]
        
        # Create first path
        self.camera_system.create_camera_path("duplicate_path", keyframes)
        
        # Try to create duplicate
        result = self.camera_system.create_camera_path("duplicate_path", keyframes)
        
        self.assertFalse(result)

    def test_start_camera_animation(self):
        """Test starting camera animation."""
        keyframes = [
            CameraKeyframe(
                time=0.0,
                position=(0.0, 0.0, 10.0),
                target=(0.0, 0.0, 0.0),
                fov=45.0
            ),
            CameraKeyframe(
                time=2.0,
                position=(5.0, 0.0, 10.0),
                target=(0.0, 0.0, 0.0),
                fov=50.0
            )
        ]
        
        self.camera_system.create_camera_path("animation_path", keyframes)
        result = self.camera_system.start_camera_animation("animation_path")
        
        self.assertTrue(result)
        self.assertTrue(self.camera_system.is_animating)
        self.assertEqual(self.camera_system.current_path, "animation_path")

    def test_start_nonexistent_animation(self):
        """Test starting animation with non-existent path."""
        result = self.camera_system.start_camera_animation("nonexistent_path")
        
        self.assertFalse(result)
        self.assertFalse(self.camera_system.is_animating)

    def test_stop_camera_animation(self):
        """Test stopping camera animation."""
        keyframes = [
            CameraKeyframe(
                time=0.0,
                position=(0.0, 0.0, 10.0),
                target=(0.0, 0.0, 0.0),
                fov=45.0
            ),
            CameraKeyframe(
                time=2.0,
                position=(5.0, 0.0, 10.0),
                target=(0.0, 0.0, 0.0),
                fov=50.0
            )
        ]
        
        self.camera_system.create_camera_path("stop_path", keyframes)
        self.camera_system.start_camera_animation("stop_path")
        
        self.camera_system.stop_camera_animation()
        
        self.assertFalse(self.camera_system.is_animating)
        self.assertIsNone(self.camera_system.current_path)

    def test_update_animation(self):
        """Test updating camera animation."""
        keyframes = [
            CameraKeyframe(
                time=0.0,
                position=(0.0, 0.0, 10.0),
                target=(0.0, 0.0, 0.0),
                fov=45.0
            ),
            CameraKeyframe(
                time=2.0,
                position=(5.0, 0.0, 10.0),
                target=(0.0, 0.0, 0.0),
                fov=50.0
            )
        ]
        
        self.camera_system.create_camera_path("update_path", keyframes)
        self.camera_system.start_camera_animation("update_path")
        
        # Update animation
        self.camera_system.update_animation(0.5)
        
        # Check that camera position has been updated
        self.assertNotEqual(self.mock_camera.position, (0.0, 0.0, 0.0))

    def test_create_orbit_path(self):
        """Test creating an orbit camera path."""
        result = self.camera_system.create_orbit_path(
            name="orbit_test",
            center=(0.0, 0.0, 0.0),
            radius=10.0,
            duration=5.0,
            samples=10
        )
        
        self.assertTrue(result)
        self.assertIn("orbit_test", self.camera_system.camera_paths)
        
        # Check that we have the expected number of keyframes (samples + 1 for loop)
        path = self.camera_system.camera_paths["orbit_test"]
        self.assertEqual(len(path.keyframes), 11)  # 10 samples + 1 final keyframe

    def test_create_dolly_path(self):
        """Test creating a dolly camera path."""
        result = self.camera_system.create_dolly_path(
            name="dolly_test",
            start_pos=(0.0, 0.0, 10.0),
            end_pos=(0.0, 0.0, 5.0),
            target=(0.0, 0.0, 0.0),
            duration=3.0
        )
        
        self.assertTrue(result)
        self.assertIn("dolly_test", self.camera_system.camera_paths)
        
        # Check that we have exactly 2 keyframes for dolly
        path = self.camera_system.camera_paths["dolly_test"]
        self.assertEqual(len(path.keyframes), 2)

    def test_add_camera_shake(self):
        """Test adding camera shake effect."""
        result = self.camera_system.add_camera_shake(intensity=0.2, duration=0.5)
        
        self.assertTrue(result)

    def test_create_camera_rig(self):
        """Test creating a camera rig."""
        result = self.camera_system.create_camera_rig(
            name="test_rig",
            position=(5.0, 0.0, 10.0)
        )
        
        self.assertTrue(result)
        self.assertIn("test_rig", self.camera_system.camera_rigs)

    def test_attach_camera_to_rig(self):
        """Test attaching camera to rig."""
        # Create a rig first
        self.camera_system.create_camera_rig("attach_rig", (0.0, 0.0, 0.0))
        
        result = self.camera_system.attach_camera_to_rig("test_camera", "attach_rig")
        
        self.assertTrue(result)


if __name__ == '__main__':
    unittest.main()