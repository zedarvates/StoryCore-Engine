"""
Tests for Wan ATI Integration

Tests cover:
- Trajectory parsing and validation
- Trajectory interpolation
- Trajectory visualization
- WanATI integration functionality
"""

import json
import pytest
import asyncio
from PIL import Image
import numpy as np

from src.wan_ati_integration import (
    TrajectoryPoint,
    Trajectory,
    TrajectoryInterpolationMethod,
    TrajectoryControlSystem,
    WanATIConfig,
    WanATIIntegration
)


class TestTrajectoryPoint:
    """Tests for TrajectoryPoint class"""
    
    def test_create_trajectory_point(self):
        """Test creating a trajectory point"""
        point = TrajectoryPoint(x=100, y=200)
        assert point.x == 100
        assert point.y == 200
        assert point.frame is None
    
    def test_trajectory_point_to_dict(self):
        """Test converting trajectory point to dictionary"""
        point = TrajectoryPoint(x=100, y=200, frame=5)
        data = point.to_dict()
        assert data == {"x": 100, "y": 200}
    
    def test_trajectory_point_from_dict(self):
        """Test creating trajectory point from dictionary"""
        data = {"x": 150, "y": 250}
        point = TrajectoryPoint.from_dict(data)
        assert point.x == 150
        assert point.y == 250


class TestTrajectory:
    """Tests for Trajectory class"""
    
    def test_create_trajectory(self):
        """Test creating a trajectory"""
        points = [
            TrajectoryPoint(x=100, y=100),
            TrajectoryPoint(x=200, y=200),
            TrajectoryPoint(x=300, y=300)
        ]
        trajectory = Trajectory(points=points, name="test_traj")
        assert len(trajectory) == 3
        assert trajectory.name == "test_traj"
    
    def test_trajectory_validate_success(self):
        """Test trajectory validation with valid points"""
        points = [
            TrajectoryPoint(x=100, y=100),
            TrajectoryPoint(x=200, y=200)
        ]
        trajectory = Trajectory(points=points)
        assert trajectory.validate((640, 480)) is True
    
    def test_trajectory_validate_out_of_bounds(self):
        """Test trajectory validation with out-of-bounds points"""
        points = [
            TrajectoryPoint(x=100, y=100),
            TrajectoryPoint(x=700, y=200)  # Out of bounds for 640x480
        ]
        trajectory = Trajectory(points=points)
        assert trajectory.validate((640, 480)) is False
    
    def test_trajectory_linear_interpolation(self):
        """Test linear interpolation of trajectory"""
        points = [
            TrajectoryPoint(x=0, y=0),
            TrajectoryPoint(x=100, y=100)
        ]
        trajectory = Trajectory(points=points)
        
        # Interpolate to 5 frames
        interpolated = trajectory.interpolate(5, TrajectoryInterpolationMethod.LINEAR)
        assert len(interpolated) == 5
        
        # Check first and last points
        assert interpolated.points[0].x == 0
        assert interpolated.points[0].y == 0
        assert interpolated.points[-1].x == 100
        assert interpolated.points[-1].y == 100
    
    def test_trajectory_downsample(self):
        """Test downsampling trajectory with more points than frames"""
        points = [TrajectoryPoint(x=i*10, y=i*10) for i in range(100)]
        trajectory = Trajectory(points=points)
        
        # Downsample to 10 frames
        interpolated = trajectory.interpolate(10, TrajectoryInterpolationMethod.LINEAR)
        assert len(interpolated) == 10


class TestTrajectoryControlSystem:
    """Tests for TrajectoryControlSystem"""
    
    def test_parse_single_trajectory(self):
        """Test parsing single trajectory from JSON"""
        json_str = """
        [
            [
                {"x": 100, "y": 100},
                {"x": 200, "y": 200},
                {"x": 300, "y": 300}
            ]
        ]
        """
        system = TrajectoryControlSystem()
        trajectories = system.parse_trajectory_json(json_str)
        
        assert len(trajectories) == 1
        assert len(trajectories[0]) == 3
        assert trajectories[0].points[0].x == 100
        assert trajectories[0].points[0].y == 100
    
    def test_parse_multiple_trajectories(self):
        """Test parsing multiple trajectories from JSON"""
        json_str = """
        [
            [
                {"x": 100, "y": 100},
                {"x": 200, "y": 200}
            ],
            [
                {"x": 300, "y": 300},
                {"x": 400, "y": 400}
            ]
        ]
        """
        system = TrajectoryControlSystem()
        trajectories = system.parse_trajectory_json(json_str)
        
        assert len(trajectories) == 2
        assert len(trajectories[0]) == 2
        assert len(trajectories[1]) == 2
    
    def test_parse_invalid_json(self):
        """Test parsing invalid JSON raises error"""
        system = TrajectoryControlSystem()
        with pytest.raises(ValueError, match="Invalid JSON format"):
            system.parse_trajectory_json("not valid json")
    
    def test_parse_invalid_format(self):
        """Test parsing invalid format raises error"""
        system = TrajectoryControlSystem()
        with pytest.raises(ValueError, match="must be a list"):
            system.parse_trajectory_json('{"x": 100, "y": 100}')
    
    def test_validate_trajectory_success(self):
        """Test successful trajectory validation"""
        system = TrajectoryControlSystem()
        points = [
            TrajectoryPoint(x=100, y=100),
            TrajectoryPoint(x=200, y=200)
        ]
        trajectory = Trajectory(points=points)
        
        is_valid, errors = system.validate_trajectory(
            trajectory,
            (640, 480),
            81
        )
        assert is_valid is True
        assert len(errors) == 0
    
    def test_validate_trajectory_empty(self):
        """Test validation fails for empty trajectory"""
        system = TrajectoryControlSystem()
        trajectory = Trajectory(points=[])
        
        is_valid, errors = system.validate_trajectory(
            trajectory,
            (640, 480),
            81
        )
        assert is_valid is False
        assert "no points" in errors[0].lower()
    
    def test_validate_trajectory_out_of_bounds(self):
        """Test validation fails for out-of-bounds points"""
        system = TrajectoryControlSystem()
        points = [
            TrajectoryPoint(x=100, y=100),
            TrajectoryPoint(x=700, y=200)  # Out of bounds
        ]
        trajectory = Trajectory(points=points)
        
        is_valid, errors = system.validate_trajectory(
            trajectory,
            (640, 480),
            81
        )
        assert is_valid is False
        assert any("outside" in err.lower() for err in errors)
    
    def test_validate_trajectory_negative_coordinates(self):
        """Test validation fails for negative coordinates"""
        system = TrajectoryControlSystem()
        points = [
            TrajectoryPoint(x=-10, y=100),
            TrajectoryPoint(x=200, y=200)
        ]
        trajectory = Trajectory(points=points)
        
        is_valid, errors = system.validate_trajectory(
            trajectory,
            (640, 480),
            81
        )
        assert is_valid is False
        assert any("negative" in err.lower() for err in errors)
    
    def test_visualize_trajectory(self):
        """Test trajectory visualization"""
        system = TrajectoryControlSystem()
        
        # Create test image
        image = Image.new('RGB', (640, 480), color='white')
        
        # Create trajectory
        points = [
            TrajectoryPoint(x=100, y=100),
            TrajectoryPoint(x=200, y=200),
            TrajectoryPoint(x=300, y=300)
        ]
        trajectory = Trajectory(points=points, color="red")
        
        # Visualize
        result = system.visualize_trajectory(image, trajectory)
        
        # Check result is an image
        assert isinstance(result, Image.Image)
        assert result.size == (640, 480)
        
        # Check image was modified (not all white anymore)
        pixels = np.array(result)
        assert not np.all(pixels == 255)
    
    def test_export_trajectory_template(self):
        """Test exporting trajectory template"""
        system = TrajectoryControlSystem()
        template = system.export_trajectory_template((720, 480), num_points=5)
        
        # Parse template
        data = json.loads(template)
        assert isinstance(data, list)
        assert len(data) == 1
        assert len(data[0]) == 5
        
        # Check points are valid
        for point in data[0]:
            assert "x" in point
            assert "y" in point
            assert 0 <= point["x"] <= 720
            assert 0 <= point["y"] <= 480


class TestWanATIConfig:
    """Tests for WanATIConfig"""
    
    def test_default_config(self):
        """Test default configuration values"""
        config = WanATIConfig()
        assert config.width == 720
        assert config.height == 480
        assert config.length == 81
        assert config.trajectory_strength == 220
        assert config.trajectory_decay == 10
    
    def test_custom_config(self):
        """Test custom configuration values"""
        config = WanATIConfig(
            width=1280,
            height=720,
            trajectory_strength=300
        )
        assert config.width == 1280
        assert config.height == 720
        assert config.trajectory_strength == 300


class TestWanATIIntegration:
    """Tests for WanATIIntegration"""
    
    def test_initialization(self):
        """Test WanATI integration initialization"""
        config = WanATIConfig()
        integration = WanATIIntegration(config)
        
        assert integration.config == config
        assert integration.trajectory_system is not None
    
    @pytest.mark.asyncio
    async def test_generate_trajectory_video_mock(self):
        """Test trajectory video generation (mock)"""
        config = WanATIConfig()
        integration = WanATIIntegration(config)
        
        # Create test image
        image = Image.new('RGB', (720, 480), color='white')
        
        # Create trajectory
        points = [
            TrajectoryPoint(x=100, y=100),
            TrajectoryPoint(x=200, y=200),
            TrajectoryPoint(x=300, y=300)
        ]
        trajectory = Trajectory(points=points)
        
        # Generate video (mock)
        result = await integration.generate_trajectory_video(
            start_image=image,
            trajectories=[trajectory],
            prompt="Test prompt"
        )
        
        # Check result structure
        assert "video_frames" in result
        assert "metadata" in result
        assert "quality_metrics" in result
        
        # Check metadata
        assert result["metadata"]["prompt"] == "Test prompt"
        assert result["metadata"]["width"] == 720
        assert result["metadata"]["height"] == 480
        assert result["metadata"]["num_trajectories"] == 1
    
    @pytest.mark.asyncio
    async def test_generate_trajectory_video_validation_error(self):
        """Test trajectory video generation with invalid trajectory"""
        config = WanATIConfig(enable_trajectory_validation=True)
        integration = WanATIIntegration(config)
        
        # Create test image
        image = Image.new('RGB', (720, 480), color='white')
        
        # Create invalid trajectory (out of bounds)
        points = [
            TrajectoryPoint(x=1000, y=100),  # Out of bounds
            TrajectoryPoint(x=200, y=200)
        ]
        trajectory = Trajectory(points=points)
        
        # Should raise validation error
        with pytest.raises(ValueError, match="validation failed"):
            await integration.generate_trajectory_video(
                start_image=image,
                trajectories=[trajectory],
                prompt="Test prompt"
            )
    
    def test_visualize_trajectories(self):
        """Test visualizing multiple trajectories"""
        config = WanATIConfig()
        integration = WanATIIntegration(config)
        
        # Create test image
        image = Image.new('RGB', (720, 480), color='white')
        
        # Create multiple trajectories
        traj1 = Trajectory(points=[
            TrajectoryPoint(x=100, y=100),
            TrajectoryPoint(x=200, y=200)
        ], color="red")
        
        traj2 = Trajectory(points=[
            TrajectoryPoint(x=300, y=300),
            TrajectoryPoint(x=400, y=400)
        ], color="blue")
        
        # Visualize
        result = integration.visualize_trajectories(image, [traj1, traj2])
        
        # Check result
        assert isinstance(result, Image.Image)
        assert result.size == (720, 480)


class TestIntegrationScenarios:
    """Integration tests for complete workflows"""
    
    @pytest.mark.asyncio
    async def test_complete_workflow(self):
        """Test complete workflow from JSON to video generation"""
        # Parse trajectory JSON
        json_str = """
        [
            [
                {"x": 100, "y": 100},
                {"x": 200, "y": 150},
                {"x": 300, "y": 200},
                {"x": 400, "y": 250}
            ]
        ]
        """
        
        # Initialize system
        config = WanATIConfig()
        integration = WanATIIntegration(config)
        
        # Parse trajectories
        trajectories = integration.trajectory_system.parse_trajectory_json(json_str)
        
        # Validate
        for traj in trajectories:
            is_valid, errors = integration.trajectory_system.validate_trajectory(
                traj,
                (config.width, config.height),
                config.length
            )
            assert is_valid, f"Validation failed: {errors}"
        
        # Create test image
        image = Image.new('RGB', (720, 480), color='white')
        
        # Visualize
        viz_image = integration.visualize_trajectories(image, trajectories)
        assert isinstance(viz_image, Image.Image)
        
        # Generate video (mock)
        result = await integration.generate_trajectory_video(
            start_image=image,
            trajectories=trajectories,
            prompt="Camera pans across landscape"
        )
        
        # Check result
        assert result["metadata"]["num_trajectories"] == 1
        assert result["metadata"]["prompt"] == "Camera pans across landscape"
    
    def test_trajectory_interpolation_workflow(self):
        """Test trajectory interpolation workflow"""
        # Create sparse trajectory
        points = [
            TrajectoryPoint(x=0, y=0),
            TrajectoryPoint(x=100, y=100),
            TrajectoryPoint(x=200, y=200)
        ]
        trajectory = Trajectory(points=points)
        
        # Interpolate to 81 frames
        interpolated = trajectory.interpolate(81, TrajectoryInterpolationMethod.LINEAR)
        
        # Check interpolation
        assert len(interpolated) == 81
        assert interpolated.points[0].x == 0
        assert interpolated.points[0].y == 0
        assert interpolated.points[-1].x == 200
        assert interpolated.points[-1].y == 200
        
        # Check intermediate points are reasonable
        mid_point = interpolated.points[40]
        assert 90 <= mid_point.x <= 110  # Should be around 100
        assert 90 <= mid_point.y <= 110


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
