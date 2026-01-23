"""
Integration tests for audio, 3D, and HTTP components.
"""
import unittest
import numpy as np
from unittest.mock import patch, MagicMock
from src.audio.amplifier import Amplifier
from src.3d.camera_system import CameraSystem, CameraKeyframe, CameraEasing
from src.services.backendApiService import BackendApiService, MockBackendApiService


class TestIntegration(unittest.TestCase):
    """Integration tests for audio, 3D, and HTTP components."""

    def setUp(self):
        """Set up test fixtures."""
        # Audio component
        self.amplifier = Amplifier(sample_rate=44100)
        
        # 3D component
        self.camera_system = CameraSystem()
        
        # Mock Camera3D object
        class MockCamera3D:
            def __init__(self):
                self.position = (0.0, 0.0, 0.0)
                self.target = (0.0, 0.0, 0.0)
                self.fov = 45.0
        
        self.mock_camera = MockCamera3D()
        self.camera_system.set_current_camera(self.mock_camera)
        
        # HTTP component
        self.api_service = MockBackendApiService()

    async def test_audio_3d_integration(self):
        """Test integration between audio and 3D components."""
        # Process audio
        test_audio = np.array([0.1, 0.2, 0.3, -0.1, -0.2, -0.3])
        amplified_audio = self.amplifier.amplify(test_audio, gain_db=6.0)
        
        # Create camera path based on audio characteristics
        audio_rms = np.sqrt(np.mean(amplified_audio**2))
        camera_distance = 5.0 + (audio_rms * 10)  # Scale camera distance based on audio level
        
        keyframes = [
            CameraKeyframe(
                time=0.0,
                position=(0.0, 0.0, camera_distance),
                target=(0.0, 0.0, 0.0),
                fov=45.0
            ),
            CameraKeyframe(
                time=2.0,
                position=(camera_distance/2, 0.0, camera_distance),
                target=(0.0, 0.0, 0.0),
                fov=50.0
            )
        ]
        
        # Create and start camera animation
        path_created = self.camera_system.create_camera_path("audio_driven_path", keyframes)
        animation_started = self.camera_system.start_camera_animation("audio_driven_path")
        
        # Update animation
        self.camera_system.update_animation(0.5)
        
        # Verify integration
        self.assertTrue(path_created)
        self.assertTrue(animation_started)
        self.assertNotEqual(self.mock_camera.position, (0.0, 0.0, 0.0))

    async def test_3d_http_integration(self):
        """Test integration between 3D and HTTP components."""
        # Create camera path
        keyframes = [
            CameraKeyframe(
                time=0.0,
                position=(10.0, -10.0, 10.0),
                target=(0.0, 0.0, 0.0),
                fov=45.0
            ),
            CameraKeyframe(
                time=2.0,
                position=(0.0, -10.0, 10.0),
                target=(0.0, 0.0, 0.0),
                fov=50.0
            )
        ]
        
        self.camera_system.create_camera_path("http_path", keyframes)
        self.camera_system.start_camera_animation("http_path")
        
        # Simulate sending camera data to backend
        camera_data = {
            "path_name": "http_path",
            "keyframes": [
                {
                    "time": kf.time,
                    "position": kf.position,
                    "target": kf.target,
                    "fov": kf.fov
                }
                for kf in keyframes
            ]
        }
        
        # Submit camera data to backend
        result = await self.api_service.submitProject({
            "name": "camera_animation",
            "type": "3d",
            "data": camera_data
        })
        
        # Verify integration
        self.assertTrue(result.success)
        self.assertIn('mock-task-', result.data.taskId)

    async def test_full_integration_workflow(self):
        """Test complete integration workflow: audio -> 3D -> HTTP."""
        # 1. Process audio
        test_audio = np.array([0.1, 0.2, 0.3, -0.1, -0.2, -0.3])
        normalized_audio = self.amplifier.normalize(test_audio, target_db=-3.0)
        
        # 2. Create 3D camera path based on audio
        audio_rms = np.sqrt(np.mean(normalized_audio**2))
        camera_distance = 5.0 + (audio_rms * 10)
        
        keyframes = [
            CameraKeyframe(
                time=0.0,
                position=(0.0, 0.0, camera_distance),
                target=(0.0, 0.0, 0.0),
                fov=45.0,
                easing=CameraEasing.EASE_IN_OUT
            ),
            CameraKeyframe(
                time=2.0,
                position=(camera_distance/2, 0.0, camera_distance),
                target=(0.0, 0.0, 0.0),
                fov=50.0,
                easing=CameraEasing.EASE_IN_OUT
            ),
            CameraKeyframe(
                time=4.0,
                position=(0.0, 0.0, camera_distance),
                target=(0.0, 0.0, 0.0),
                fov=45.0,
                easing=CameraEasing.EASE_IN_OUT
            )
        ]
        
        self.camera_system.create_camera_path("full_integration_path", keyframes)
        self.camera_system.start_camera_animation("full_integration_path")
        
        # 3. Update animation and capture state
        for _ in range(3):
            self.camera_system.update_animation(0.5)
        
        # 4. Send complete project to backend
        project_data = {
            "name": "full_integration_test",
            "audio": {
                "rms": audio_rms,
                "sample_rate": 44100,
                "duration": len(test_audio) / 44100
            },
            "camera": {
                "path_name": "full_integration_path",
                "keyframes": [
                    {
                        "time": kf.time,
                        "position": kf.position,
                        "target": kf.target,
                        "fov": kf.fov
                    }
                    for kf in keyframes
                ],
                "current_position": self.mock_camera.position
            }
        }
        
        result = await self.api_service.submitProject(project_data)
        
        # 5. Verify complete workflow
        self.assertTrue(result.success)
        self.assertIn('mock-task-', result.data.taskId)
        
        # 6. Check task status
        task_id = result.data.taskId
        status_result = await self.api_service.getTaskStatus(task_id)
        
        self.assertTrue(status_result.success)
        self.assertEqual(status_result.data.taskId, task_id)

    async def test_error_handling_integration(self):
        """Test error handling in integration workflow."""
        # Test with real API service that will fail
        real_api = BackendApiService({
            baseUrl: 'http://localhost:9999',  # Non-existent server
            timeout: 100,
            retryAttempts: 1
        })
        
        # Try to submit project to non-existent server
        with patch('fetch', side_effect=Exception('Connection refused')):
            result = await real_api.submitProject({'name': 'test'})
            
            # Should fail gracefully
            self.assertFalse(result.success)
            self.assertIn('Connection refused', result.error)


if __name__ == '__main__':
    unittest.main()