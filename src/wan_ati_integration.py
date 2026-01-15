"""
Wan Video ATI (Advanced Trajectory Interface) Integration

This module provides integration for Wan Video ATI models, enabling precise
trajectory-based motion control for video generation.

Key Features:
- JSON-based trajectory input system
- CLIP vision encoding for image conditioning
- Multi-point trajectory support
- Smooth motion interpolation
- Trajectory visualization tools
"""

import json
import logging
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any, Callable
from enum import Enum
from io import BytesIO

import numpy as np
from PIL import Image, ImageDraw

logger = logging.getLogger(__name__)


class TrajectoryInterpolationMethod(Enum):
    """Trajectory interpolation methods"""
    LINEAR = "linear"
    CUBIC = "cubic"
    SPLINE = "spline"
    BEZIER = "bezier"


@dataclass
class TrajectoryPoint:
    """Single trajectory point"""
    x: int
    y: int
    frame: Optional[int] = None
    
    def to_dict(self) -> Dict[str, int]:
        """Convert to dictionary format"""
        return {"x": self.x, "y": self.y}
    
    @classmethod
    def from_dict(cls, data: Dict[str, int]) -> 'TrajectoryPoint':
        """Create from dictionary"""
        return cls(x=data["x"], y=data["y"])


@dataclass
class Trajectory:
    """Complete trajectory with multiple points"""
    points: List[TrajectoryPoint]
    name: Optional[str] = None
    color: str = "red"
    
    def __len__(self) -> int:
        return len(self.points)
    
    def validate(self, image_size: Tuple[int, int]) -> bool:
        """Validate all points are within image bounds"""
        width, height = image_size
        for point in self.points:
            if not (0 <= point.x < width and 0 <= point.y < height):
                logger.warning(
                    f"Trajectory point ({point.x}, {point.y}) outside bounds "
                    f"({width}x{height})"
                )
                return False
        return True
    
    def interpolate(
        self,
        target_frames: int,
        method: TrajectoryInterpolationMethod = TrajectoryInterpolationMethod.CUBIC
    ) -> 'Trajectory':
        """Interpolate trajectory to match target frame count"""
        if len(self.points) >= target_frames:
            # Downsample if we have more points than frames
            indices = np.linspace(0, len(self.points) - 1, target_frames, dtype=int)
            interpolated_points = [self.points[i] for i in indices]
        else:
            # Upsample if we have fewer points than frames
            interpolated_points = self._interpolate_points(target_frames, method)
        
        return Trajectory(
            points=interpolated_points,
            name=self.name,
            color=self.color
        )
    
    def _interpolate_points(
        self,
        target_frames: int,
        method: TrajectoryInterpolationMethod
    ) -> List[TrajectoryPoint]:
        """Perform interpolation using specified method"""
        if method == TrajectoryInterpolationMethod.LINEAR:
            return self._linear_interpolation(target_frames)
        elif method == TrajectoryInterpolationMethod.CUBIC:
            return self._cubic_interpolation(target_frames)
        else:
            # Default to linear for unsupported methods
            logger.warning(f"Interpolation method {method} not implemented, using linear")
            return self._linear_interpolation(target_frames)
    
    def _linear_interpolation(self, target_frames: int) -> List[TrajectoryPoint]:
        """Linear interpolation between points"""
        x_coords = [p.x for p in self.points]
        y_coords = [p.y for p in self.points]
        
        # Create interpolation indices
        old_indices = np.linspace(0, len(self.points) - 1, len(self.points))
        new_indices = np.linspace(0, len(self.points) - 1, target_frames)
        
        # Interpolate coordinates
        new_x = np.interp(new_indices, old_indices, x_coords)
        new_y = np.interp(new_indices, old_indices, y_coords)
        
        return [
            TrajectoryPoint(x=int(x), y=int(y), frame=i)
            for i, (x, y) in enumerate(zip(new_x, new_y))
        ]
    
    def _cubic_interpolation(self, target_frames: int) -> List[TrajectoryPoint]:
        """Cubic spline interpolation for smoother motion"""
        try:
            from scipy.interpolate import CubicSpline
            
            x_coords = [p.x for p in self.points]
            y_coords = [p.y for p in self.points]
            
            # Create parameter t for interpolation
            t = np.linspace(0, 1, len(self.points))
            t_new = np.linspace(0, 1, target_frames)
            
            # Create cubic splines
            cs_x = CubicSpline(t, x_coords)
            cs_y = CubicSpline(t, y_coords)
            
            # Evaluate at new points
            new_x = cs_x(t_new)
            new_y = cs_y(t_new)
            
            return [
                TrajectoryPoint(x=int(x), y=int(y), frame=i)
                for i, (x, y) in enumerate(zip(new_x, new_y))
            ]
        except ImportError:
            logger.warning("scipy not available, falling back to linear interpolation")
            return self._linear_interpolation(target_frames)


@dataclass
class WanATIConfig:
    """Configuration for Wan ATI integration"""
    
    # Model paths
    model_path: str = "Wan2_1-I2V-ATI-14B_fp8_e4m3fn.safetensors"
    text_encoder_path: str = "umt5_xxl_fp8_e4m3fn_scaled.safetensors"
    vae_path: str = "wan_2.1_vae.safetensors"
    clip_vision_path: str = "clip_vision_h.safetensors"
    
    # Generation parameters
    width: int = 720
    height: int = 480
    length: int = 81  # Number of frames
    batch_size: int = 1
    
    # Sampling parameters
    steps: int = 20
    cfg_scale: float = 3.0
    sampler: str = "uni_pc"
    scheduler: str = "simple"
    
    # Trajectory parameters
    trajectory_strength: int = 220  # Trajectory influence (0-500)
    trajectory_decay: int = 10      # Trajectory decay over time (0-50)
    
    # Interpolation settings
    interpolation_method: TrajectoryInterpolationMethod = TrajectoryInterpolationMethod.CUBIC
    
    # Quality settings
    enable_clip_vision: bool = True
    enable_trajectory_validation: bool = True
    
    # Performance settings
    enable_fp8: bool = True
    enable_caching: bool = True


class TrajectoryControlSystem:
    """Manages trajectory-based motion control"""
    
    def __init__(self):
        self.annotation_tool_url = "https://comfyui-wiki.github.io/Trajectory-Annotation-Tool/"
        logger.info(f"Trajectory Control System initialized")
        logger.info(f"Annotation Tool: {self.annotation_tool_url}")
    
    def parse_trajectory_json(self, json_str: str) -> List[Trajectory]:
        """Parse trajectory JSON from annotation tool
        
        Expected format:
        [
            [  # Trajectory 1
                {"x": 393, "y": 126},
                {"x": 393, "y": 126},
                ...
            ],
            [  # Trajectory 2 (optional)
                {"x": 100, "y": 200},
                ...
            ]
        ]
        
        Args:
            json_str: JSON string containing trajectory data
            
        Returns:
            List of Trajectory objects
            
        Raises:
            ValueError: If JSON format is invalid
        """
        try:
            data = json.loads(json_str)
            
            if not isinstance(data, list):
                raise ValueError("Trajectory JSON must be a list")
            
            trajectories = []
            for i, traj_data in enumerate(data):
                if not isinstance(traj_data, list):
                    raise ValueError(f"Trajectory {i} must be a list of points")
                
                points = [TrajectoryPoint.from_dict(p) for p in traj_data]
                trajectory = Trajectory(
                    points=points,
                    name=f"Trajectory_{i+1}",
                    color=self._get_trajectory_color(i)
                )
                trajectories.append(trajectory)
            
            logger.info(f"Parsed {len(trajectories)} trajectories")
            return trajectories
            
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON format: {e}")
        except KeyError as e:
            raise ValueError(f"Missing required field in trajectory point: {e}")
    
    def _get_trajectory_color(self, index: int) -> str:
        """Get color for trajectory visualization"""
        colors = ["red", "blue", "green", "yellow", "purple", "orange", "cyan", "magenta"]
        return colors[index % len(colors)]
    
    def validate_trajectory(
        self,
        trajectory: Trajectory,
        image_size: Tuple[int, int],
        num_frames: int
    ) -> Tuple[bool, List[str]]:
        """Validate trajectory
        
        Checks:
        - All points within image bounds
        - Sufficient points for frame count
        - No invalid coordinate values
        
        Args:
            trajectory: Trajectory to validate
            image_size: Image dimensions (width, height)
            num_frames: Target number of frames
            
        Returns:
            Tuple of (is_valid, list of error messages)
        """
        errors = []
        
        # Check if trajectory has points
        if len(trajectory.points) == 0:
            errors.append("Trajectory has no points")
            return False, errors
        
        # Check bounds
        if not trajectory.validate(image_size):
            errors.append(f"Trajectory points outside image bounds {image_size}")
        
        # Check minimum points
        if len(trajectory.points) < 2:
            errors.append("Trajectory must have at least 2 points")
        
        # Check for valid coordinates
        for i, point in enumerate(trajectory.points):
            if point.x < 0 or point.y < 0:
                errors.append(f"Point {i} has negative coordinates: ({point.x}, {point.y})")
        
        # Warn if trajectory is very short
        if len(trajectory.points) < num_frames // 10:
            logger.warning(
                f"Trajectory has only {len(trajectory.points)} points for "
                f"{num_frames} frames. Interpolation may be less accurate."
            )
        
        is_valid = len(errors) == 0
        return is_valid, errors
    
    def visualize_trajectory(
        self,
        image: Image.Image,
        trajectory: Trajectory,
        line_width: int = 3,
        point_radius: int = 5
    ) -> Image.Image:
        """Overlay trajectory visualization on image
        
        Args:
            image: Base image
            trajectory: Trajectory to visualize
            line_width: Width of trajectory line
            point_radius: Radius of trajectory points
            
        Returns:
            Image with trajectory overlay
        """
        # Create a copy to avoid modifying original
        img_copy = image.copy()
        draw = ImageDraw.Draw(img_copy)
        
        # Draw lines between points
        for i in range(len(trajectory.points) - 1):
            p1 = trajectory.points[i]
            p2 = trajectory.points[i + 1]
            draw.line(
                [(p1.x, p1.y), (p2.x, p2.y)],
                fill=trajectory.color,
                width=line_width
            )
        
        # Draw points
        for point in trajectory.points:
            bbox = [
                point.x - point_radius,
                point.y - point_radius,
                point.x + point_radius,
                point.y + point_radius
            ]
            draw.ellipse(bbox, fill=trajectory.color, outline="white")
        
        # Draw start point (larger)
        if trajectory.points:
            start = trajectory.points[0]
            start_radius = point_radius * 2
            bbox = [
                start.x - start_radius,
                start.y - start_radius,
                start.x + start_radius,
                start.y + start_radius
            ]
            draw.ellipse(bbox, fill="green", outline="white", width=2)
        
        return img_copy
    
    def export_trajectory_template(
        self,
        image_size: Tuple[int, int],
        num_points: int = 10
    ) -> str:
        """Generate empty trajectory JSON template
        
        Args:
            image_size: Image dimensions (width, height)
            num_points: Number of template points
            
        Returns:
            JSON string template
        """
        width, height = image_size
        
        # Create a simple linear trajectory as template
        points = []
        for i in range(num_points):
            x = int(width * (i / (num_points - 1)))
            y = height // 2
            points.append({"x": x, "y": y})
        
        template = [points]
        return json.dumps(template, indent=2)


class WanATIIntegration:
    """Integration for Wan Video ATI (Advanced Trajectory Interface)"""
    
    def __init__(
        self,
        config: WanATIConfig,
        comfyui_config: Optional['ComfyUIConfig'] = None
    ):
        """Initialize Wan ATI integration
        
        Args:
            config: Configuration for Wan ATI
            comfyui_config: Optional ComfyUI configuration for real workflow execution
        """
        self.config = config
        self.trajectory_system = TrajectoryControlSystem()
        
        # Initialize ComfyUI executor if config provided
        self.comfyui_config = comfyui_config
        self.workflow_executor = None
        if comfyui_config:
            try:
                from .comfyui_workflow_executor import ComfyUIWorkflowExecutor
                self.workflow_executor = ComfyUIWorkflowExecutor(comfyui_config)
                logger.info(f"ComfyUI executor initialized: {comfyui_config.host}:{comfyui_config.port}")
            except ImportError:
                logger.warning("ComfyUI executor not available - install aiohttp and websockets")
        
        # Load workflow template
        self.workflow_template = self._load_workflow_template()
        
        logger.info("Wan ATI Integration initialized")
        logger.info(f"Model: {config.model_path}")
        logger.info(f"Resolution: {config.width}x{config.height}")
        logger.info(f"Frames: {config.length}")
        logger.info(f"Trajectory Strength: {config.trajectory_strength}")
        logger.info(f"Trajectory Decay: {config.trajectory_decay}")
    
    def _load_workflow_template(self) -> Dict[str, Any]:
        """Load ComfyUI workflow template
        
        Returns:
            Workflow JSON structure or empty dict if not found
        """
        workflow_path = Path(__file__).parent.parent / "video_wan_ati.json"
        
        if not workflow_path.exists():
            logger.warning(f"Workflow template not found: {workflow_path}")
            return {}
        
        try:
            with open(workflow_path, 'r', encoding='utf-8') as f:
                workflow = json.load(f)
            logger.info(f"Loaded workflow template: {workflow_path}")
            return workflow
        except Exception as e:
            logger.error(f"Failed to load workflow template: {e}")
            return {}
    
    async def generate_trajectory_video(
        self,
        start_image: Image.Image,
        trajectories: List[Trajectory],
        prompt: str,
        negative_prompt: str = "",
        progress_callback: Optional[Callable[[str, float], None]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate video with trajectory-based motion control
        
        Args:
            start_image: Starting frame for video generation
            trajectories: List of trajectory objects
            prompt: Text prompt describing desired motion and scene
            negative_prompt: Negative prompt for generation
            progress_callback: Optional callback for progress updates (message, progress_0_to_1)
            **kwargs: Additional parameters override config
            
        Returns:
            Dictionary containing:
                - video_frames: List of generated frames
                - metadata: Generation metadata
                - quality_metrics: Quality assessment results
        """
        logger.info(f"Generating trajectory video with {len(trajectories)} trajectories")
        logger.info(f"Prompt: {prompt}")
        
        # Validate trajectories
        if self.config.enable_trajectory_validation:
            for i, traj in enumerate(trajectories):
                is_valid, errors = self.trajectory_system.validate_trajectory(
                    traj,
                    (self.config.width, self.config.height),
                    self.config.length
                )
                if not is_valid:
                    raise ValueError(f"Trajectory {i} validation failed: {errors}")
        
        # Interpolate trajectories to match frame count
        interpolated_trajectories = []
        for traj in trajectories:
            interpolated = traj.interpolate(
                self.config.length,
                self.config.interpolation_method
            )
            interpolated_trajectories.append(interpolated)
        
        # Check if ComfyUI executor is available
        if self.workflow_executor:
            # Real ComfyUI execution
            return await self._generate_with_comfyui(
                start_image,
                interpolated_trajectories,
                prompt,
                negative_prompt,
                progress_callback,
                **kwargs
            )
        else:
            # Mock execution (fallback)
            logger.warning("ComfyUI executor not available - returning mock result")
            return self._generate_mock_result(
                start_image,
                interpolated_trajectories,
                prompt,
                negative_prompt
            )
    
    async def _generate_with_comfyui(
        self,
        start_image: Image.Image,
        trajectories: List[Trajectory],
        prompt: str,
        negative_prompt: str,
        progress_callback: Optional[Callable[[str, float], None]],
        **kwargs
    ) -> Dict[str, Any]:
        """Generate video using real ComfyUI workflow execution
        
        Args:
            start_image: Starting frame
            trajectories: Interpolated trajectories
            prompt: Positive prompt
            negative_prompt: Negative prompt
            progress_callback: Progress callback
            **kwargs: Additional parameters
            
        Returns:
            Generation result dictionary
        """
        # Check ComfyUI connection
        if not await self.workflow_executor.check_connection():
            logger.error("ComfyUI is not accessible")
            raise RuntimeError(
                f"Cannot connect to ComfyUI at {self.comfyui_config.host}:{self.comfyui_config.port}. "
                "Please ensure ComfyUI is running."
            )
        
        # Prepare workflow
        workflow = self._prepare_workflow(
            start_image,
            trajectories,
            prompt,
            negative_prompt,
            **kwargs
        )
        
        # Execute workflow
        logger.info("Executing ComfyUI workflow...")
        result = await self.workflow_executor.execute_workflow(
            workflow,
            progress_callback
        )
        
        # Process results
        video_frames = self._extract_video_frames(result)
        
        # Calculate quality metrics
        quality_metrics = {}
        if video_frames:
            quality_metrics = {
                "trajectory_adherence": self._calculate_trajectory_adherence(
                    video_frames,
                    trajectories[0] if trajectories else None
                ),
                "motion_smoothness": self._calculate_motion_smoothness(video_frames),
                "visual_consistency": self._calculate_visual_consistency(video_frames)
            }
        
        return {
            "video_frames": video_frames,
            "metadata": {
                "prompt": prompt,
                "negative_prompt": negative_prompt,
                "width": self.config.width,
                "height": self.config.height,
                "length": self.config.length,
                "num_trajectories": len(trajectories),
                "trajectory_strength": self.config.trajectory_strength,
                "trajectory_decay": self.config.trajectory_decay,
                "steps": self.config.steps,
                "cfg_scale": self.config.cfg_scale,
                "prompt_id": result.get("prompt_id", "unknown")
            },
            "quality_metrics": quality_metrics
        }
    
    def _generate_mock_result(
        self,
        start_image: Image.Image,
        trajectories: List[Trajectory],
        prompt: str,
        negative_prompt: str
    ) -> Dict[str, Any]:
        """Generate mock result when ComfyUI is not available
        
        Args:
            start_image: Starting frame
            trajectories: Interpolated trajectories
            prompt: Positive prompt
            negative_prompt: Negative prompt
            
        Returns:
            Mock generation result
        """
        result = {
            "video_frames": [],  # Would contain actual frames
            "metadata": {
                "prompt": prompt,
                "negative_prompt": negative_prompt,
                "width": self.config.width,
                "height": self.config.height,
                "length": self.config.length,
                "num_trajectories": len(trajectories),
                "trajectory_strength": self.config.trajectory_strength,
                "trajectory_decay": self.config.trajectory_decay,
                "steps": self.config.steps,
                "cfg_scale": self.config.cfg_scale,
                "mode": "mock"
            },
            "quality_metrics": {
                "trajectory_adherence": 0.0,  # Would be calculated
                "motion_smoothness": 0.0,
                "visual_consistency": 0.0
            }
        }
        
        return result
    
    def _prepare_workflow(
        self,
        start_image: Image.Image,
        trajectories: List[Trajectory],
        prompt: str,
        negative_prompt: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Prepare ComfyUI workflow with parameters
        
        Args:
            start_image: Starting frame
            trajectories: List of trajectories
            prompt: Positive prompt
            negative_prompt: Negative prompt
            **kwargs: Additional parameters
            
        Returns:
            Prepared workflow JSON
        """
        if not self.workflow_template:
            raise RuntimeError("Workflow template not loaded")
        
        # Deep copy workflow to avoid modifying template
        import copy
        workflow = copy.deepcopy(self.workflow_template)
        
        # Convert trajectories to JSON string
        trajectory_json = self._trajectories_to_json(trajectories)
        
        # Save start image temporarily
        image_filename = self._save_temp_image(start_image)
        
        # Find nodes by ID and update their parameters
        nodes_by_id = {node["id"]: node for node in workflow["nodes"]}
        
        # Node 6: Positive prompt (CLIPTextEncode)
        if 6 in nodes_by_id:
            nodes_by_id[6]["widgets_values"][0] = prompt
        
        # Node 7: Negative prompt (CLIPTextEncode)
        if 7 in nodes_by_id:
            nodes_by_id[7]["widgets_values"][0] = negative_prompt
        
        # Node 240: Load image
        if 240 in nodes_by_id:
            nodes_by_id[240]["widgets_values"][0] = image_filename
        
        # Node 247: Trajectory JSON (PrimitiveStringMultiline)
        if 247 in nodes_by_id:
            nodes_by_id[247]["widgets_values"][0] = trajectory_json
        
        # Node 248: WanTrackToVideo parameters
        if 248 in nodes_by_id:
            nodes_by_id[248]["widgets_values"] = [
                trajectory_json,  # tracks
                self.config.width,  # width
                self.config.height,  # height
                self.config.length,  # length
                self.config.batch_size,  # batch_size
                self.config.trajectory_strength,  # trajectory_strength
                self.config.trajectory_decay  # trajectory_decay
            ]
        
        # Node 3: KSampler parameters
        if 3 in nodes_by_id:
            nodes_by_id[3]["widgets_values"] = [
                kwargs.get("seed", 48),  # seed
                "fixed",  # control_after_generate
                self.config.steps,  # steps
                self.config.cfg_scale,  # cfg
                self.config.sampler,  # sampler_name
                self.config.scheduler,  # scheduler
                1  # denoise
            ]
        
        logger.info(f"Workflow prepared with {len(trajectories)} trajectories")
        return workflow
    
    def _trajectories_to_json(self, trajectories: List[Trajectory]) -> str:
        """Convert trajectories to JSON string format
        
        Args:
            trajectories: List of trajectory objects
            
        Returns:
            JSON string in ComfyUI format
        """
        data = []
        for traj in trajectories:
            points = [{"x": p.x, "y": p.y} for p in traj.points]
            data.append(points)
        return json.dumps(data)
    
    def _save_temp_image(self, image: Image.Image) -> str:
        """Save image temporarily for ComfyUI
        
        Args:
            image: PIL Image to save
            
        Returns:
            Filename (not full path, just the name)
        """
        temp_dir = Path("temp_assets")
        temp_dir.mkdir(exist_ok=True)
        
        filename = f"wan_ati_input_{uuid.uuid4().hex[:8]}.png"
        temp_path = temp_dir / filename
        image.save(temp_path)
        
        logger.info(f"Saved temporary image: {temp_path}")
        return filename
    
    def _extract_video_frames(self, result: Dict[str, Any]) -> List[Image.Image]:
        """Extract video frames from ComfyUI result
        
        Args:
            result: ComfyUI execution result
            
        Returns:
            List of PIL Images (video frames)
        """
        frames = []
        
        # Find output nodes (typically node 8: VAEDecode or node 258: SaveVideo)
        outputs = result.get("outputs", {})
        
        for node_id, node_outputs in outputs.items():
            if node_outputs:
                for output_data in node_outputs:
                    try:
                        # Convert bytes to PIL Image
                        image = Image.open(BytesIO(output_data))
                        frames.append(image)
                    except Exception as e:
                        logger.error(f"Failed to decode frame from node {node_id}: {e}")
        
        logger.info(f"Extracted {len(frames)} frames from ComfyUI result")
        return frames
    
    def _calculate_trajectory_adherence(
        self,
        video_frames: List[Image.Image],
        trajectory: Optional[Trajectory]
    ) -> float:
        """Calculate how well video follows trajectory
        
        Args:
            video_frames: List of video frames
            trajectory: Expected trajectory
            
        Returns:
            Adherence score (0.0 to 1.0)
        """
        # TODO: Implement actual trajectory adherence calculation
        # This would involve:
        # 1. Detecting motion in video frames (optical flow)
        # 2. Comparing detected motion with expected trajectory
        # 3. Calculating adherence score
        
        if not video_frames or not trajectory:
            return 0.0
        
        # Placeholder implementation
        logger.debug("Trajectory adherence calculation not yet implemented")
        return 0.0
    
    def _calculate_motion_smoothness(
        self,
        video_frames: List[Image.Image]
    ) -> float:
        """Calculate motion smoothness across frames
        
        Args:
            video_frames: List of video frames
            
        Returns:
            Smoothness score (0.0 to 1.0)
        """
        # TODO: Implement motion smoothness calculation
        # This would involve:
        # 1. Calculating optical flow between consecutive frames
        # 2. Measuring smoothness of flow vectors
        # 3. Returning smoothness score
        
        if not video_frames or len(video_frames) < 2:
            return 0.0
        
        # Placeholder implementation
        logger.debug("Motion smoothness calculation not yet implemented")
        return 0.0
    
    def _calculate_visual_consistency(
        self,
        video_frames: List[Image.Image]
    ) -> float:
        """Calculate visual consistency across frames
        
        Args:
            video_frames: List of video frames
            
        Returns:
            Consistency score (0.0 to 1.0)
        """
        # TODO: Implement visual consistency calculation
        # This would involve:
        # 1. Comparing visual features between frames
        # 2. Detecting discontinuities or artifacts
        # 3. Returning consistency score
        
        if not video_frames or len(video_frames) < 2:
            return 0.0
        
        # Placeholder implementation
        logger.debug("Visual consistency calculation not yet implemented")
        return 0.0
    
    def visualize_trajectories(
        self,
        image: Image.Image,
        trajectories: List[Trajectory]
    ) -> Image.Image:
        """Visualize all trajectories on image
        
        Args:
            image: Base image
            trajectories: List of trajectories to visualize
            
        Returns:
            Image with all trajectories overlaid
        """
        result = image.copy()
        for trajectory in trajectories:
            result = self.trajectory_system.visualize_trajectory(result, trajectory)
        return result


# Example usage
if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    # Example trajectory JSON
    trajectory_json = """
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
    trajectories = integration.trajectory_system.parse_trajectory_json(trajectory_json)
    
    # Validate
    for i, traj in enumerate(trajectories):
        is_valid, errors = integration.trajectory_system.validate_trajectory(
            traj,
            (config.width, config.height),
            config.length
        )
        print(f"Trajectory {i}: Valid={is_valid}, Errors={errors}")
    
    # Create template
    template = integration.trajectory_system.export_trajectory_template(
        (config.width, config.height)
    )
    print(f"Template:\n{template}")
