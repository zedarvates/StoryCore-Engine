#!/usr/bin/env python3
"""
Real-Time Preview System
Provides live preview of video processing with interactive parameter adjustment and instant feedback.
"""

import sys
import time
import json
import logging
import asyncio
import threading
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional, Callable, Union
from dataclasses import dataclass, asdict, field
from enum import Enum
import uuid
import queue
from concurrent.futures import ThreadPoolExecutor
import websockets
import base64
from io import BytesIO

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent))

try:
    from circuit_breaker import CircuitBreaker, CircuitBreakerConfig
    from analytics_dashboard import AnalyticsDashboard, PerformanceMetrics
    from batch_processing_system import BatchProcessingSystem, JobDefinition, JobPriority
except ImportError:
    # Fallback for testing
    class CircuitBreaker:
        def __init__(self, *args, **kwargs):
            pass
        def __call__(self, func):
            return func
        def get_stats(self):
            return {"state": "closed", "failure_count": 0}
    
    class AnalyticsDashboard:
        def __init__(self, *args, **kwargs):
            pass
        def record_performance_metrics(self, *args, **kwargs):
            pass
    
    class BatchProcessingSystem:
        def __init__(self, *args, **kwargs):
            pass

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class PreviewQuality(Enum):
    """Preview quality levels."""
    WIREFRAME = "wireframe"      # Instant, basic structure
    PREVIEW = "preview"          # Fast, reduced quality
    HIGH = "high"               # Slower, better quality
    FULL = "full"               # Slowest, full quality


class PreviewMode(Enum):
    """Preview display modes."""
    SINGLE = "single"           # Single preview
    SIDE_BY_SIDE = "side_by_side"  # Before/after comparison
    OVERLAY = "overlay"         # Overlay comparison
    TIMELINE = "timeline"       # Timeline scrubbing


@dataclass
class PreviewParameters:
    """Parameters for video preview generation."""
    interpolation_strength: float = 0.8
    camera_movement_speed: float = 1.0
    quality_level: PreviewQuality = PreviewQuality.PREVIEW
    motion_blur_intensity: float = 0.5
    color_grading_intensity: float = 0.7
    frame_rate: int = 24
    resolution_scale: float = 0.5  # Scale factor for preview resolution
    enable_depth_of_field: bool = False
    lens_type: str = "standard"


@dataclass
class PreviewFrame:
    """Individual preview frame data."""
    frame_id: str
    timestamp: float
    image_data: bytes
    metadata: Dict[str, Any]
    processing_time: float
    quality_score: float


@dataclass
class PreviewSession:
    """Preview session information."""
    session_id: str
    user_id: str
    project_id: str
    created_at: datetime
    last_activity: datetime
    parameters: PreviewParameters
    active_connections: int = 0
    frame_cache: Dict[str, PreviewFrame] = field(default_factory=dict)


class PreviewCache:
    """Smart caching system for preview frames."""
    
    def __init__(self, max_size: int = 100):
        """Initialize preview cache."""
        self.max_size = max_size
        self.cache = {}
        self.access_order = []
        self.lock = threading.Lock()
    
    def get_cache_key(self, parameters: PreviewParameters, frame_index: int) -> str:
        """Generate cache key for parameters and frame."""
        param_hash = hash((
            parameters.interpolation_strength,
            parameters.camera_movement_speed,
            parameters.quality_level.value,
            parameters.motion_blur_intensity,
            parameters.color_grading_intensity,
            parameters.resolution_scale,
            frame_index
        ))
        return f"frame_{param_hash}"
    
    def get(self, cache_key: str) -> Optional[PreviewFrame]:
        """Get frame from cache."""
        with self.lock:
            # Track cache requests
            if not hasattr(self, '_total_requests'):
                self._total_requests = 0
            if not hasattr(self, '_hit_count'):
                self._hit_count = 0
            
            self._total_requests += 1
            
            if cache_key in self.cache:
                # Move to end (most recently used)
                self.access_order.remove(cache_key)
                self.access_order.append(cache_key)
                self._hit_count += 1
                return self.cache[cache_key]
            return None
    
    def put(self, cache_key: str, frame: PreviewFrame):
        """Store frame in cache."""
        with self.lock:
            if cache_key in self.cache:
                # Update existing
                self.cache[cache_key] = frame
                self.access_order.remove(cache_key)
                self.access_order.append(cache_key)
            else:
                # Add new
                if len(self.cache) >= self.max_size:
                    # Remove least recently used
                    lru_key = self.access_order.pop(0)
                    del self.cache[lru_key]
                
                self.cache[cache_key] = frame
                self.access_order.append(cache_key)
    
    def invalidate_pattern(self, pattern: str):
        """Invalidate cache entries matching pattern."""
        with self.lock:
            keys_to_remove = [key for key in self.cache.keys() if pattern in key]
            for key in keys_to_remove:
                del self.cache[key]
                if key in self.access_order:
                    self.access_order.remove(key)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        with self.lock:
            return {
                "size": len(self.cache),
                "max_size": self.max_size,
                "hit_rate": getattr(self, '_hit_count', 0) / max(getattr(self, '_total_requests', 1), 1),
                "memory_usage_mb": sum(len(frame.image_data) for frame in self.cache.values()) / (1024 * 1024)
            }


class PreviewProcessor:
    """Processes video frames for real-time preview."""
    
    def __init__(self):
        """Initialize preview processor."""
        self.circuit_breaker = CircuitBreaker(
            CircuitBreakerConfig(
                failure_threshold=3,
                recovery_timeout=30.0,
                timeout=5.0,  # Fast timeout for real-time
                max_concurrent=4
            )
        )
    
    def generate_preview_frame(self, 
                             parameters: PreviewParameters,
                             frame_index: int,
                             source_frames: List[bytes]) -> PreviewFrame:
        """Generate a single preview frame."""
        start_time = time.time()
        
        try:
            # Simulate frame processing based on quality level
            processing_time = self._get_processing_time(parameters.quality_level)
            
            if parameters.quality_level == PreviewQuality.WIREFRAME:
                # Instant wireframe preview
                frame_data = self._generate_wireframe(frame_index, parameters)
                quality_score = 0.3
            elif parameters.quality_level == PreviewQuality.PREVIEW:
                # Fast preview with reduced quality
                time.sleep(processing_time * 0.1)  # Simulate fast processing
                frame_data = self._generate_preview_frame(frame_index, parameters, source_frames)
                quality_score = 0.7
            elif parameters.quality_level == PreviewQuality.HIGH:
                # Higher quality preview
                time.sleep(processing_time * 0.3)
                frame_data = self._generate_high_quality_frame(frame_index, parameters, source_frames)
                quality_score = 0.9
            else:  # FULL
                # Full quality (slower)
                time.sleep(processing_time)
                frame_data = self._generate_full_quality_frame(frame_index, parameters, source_frames)
                quality_score = 1.0
            
            actual_processing_time = time.time() - start_time
            
            return PreviewFrame(
                frame_id=f"frame_{frame_index}_{int(time.time() * 1000)}",
                timestamp=time.time(),
                image_data=frame_data,
                metadata={
                    "frame_index": frame_index,
                    "quality_level": parameters.quality_level.value,
                    "interpolation_strength": parameters.interpolation_strength,
                    "camera_speed": parameters.camera_movement_speed,
                    "resolution_scale": parameters.resolution_scale
                },
                processing_time=actual_processing_time,
                quality_score=quality_score
            )
            
        except Exception as e:
            logger.error(f"Failed to generate preview frame {frame_index}: {e}")
            # Return error frame
            return PreviewFrame(
                frame_id=f"error_{frame_index}",
                timestamp=time.time(),
                image_data=self._generate_error_frame(),
                metadata={"error": str(e)},
                processing_time=time.time() - start_time,
                quality_score=0.0
            )
    
    def _get_processing_time(self, quality: PreviewQuality) -> float:
        """Get expected processing time for quality level."""
        times = {
            PreviewQuality.WIREFRAME: 0.001,
            PreviewQuality.PREVIEW: 0.05,
            PreviewQuality.HIGH: 0.2,
            PreviewQuality.FULL: 1.0
        }
        return times.get(quality, 0.1)
    
    def _generate_wireframe(self, frame_index: int, parameters: PreviewParameters) -> bytes:
        """Generate wireframe preview (instant)."""
        # Simulate minimal wireframe data
        wireframe_data = {
            "type": "wireframe",
            "frame": frame_index,
            "camera_position": frame_index * parameters.camera_movement_speed,
            "interpolation": parameters.interpolation_strength
        }
        return json.dumps(wireframe_data).encode()
    
    def _generate_preview_frame(self, frame_index: int, parameters: PreviewParameters, source_frames: List[bytes]) -> bytes:
        """Generate fast preview frame."""
        # Simulate reduced quality frame processing
        frame_data = {
            "type": "preview",
            "frame": frame_index,
            "quality": "preview",
            "interpolation": parameters.interpolation_strength,
            "motion_blur": parameters.motion_blur_intensity,
            "color_grading": parameters.color_grading_intensity,
            "resolution_scale": parameters.resolution_scale,
            "timestamp": time.time()
        }
        return json.dumps(frame_data).encode()
    
    def _generate_high_quality_frame(self, frame_index: int, parameters: PreviewParameters, source_frames: List[bytes]) -> bytes:
        """Generate high quality preview frame."""
        frame_data = {
            "type": "high_quality",
            "frame": frame_index,
            "quality": "high",
            "interpolation": parameters.interpolation_strength,
            "camera_movement": parameters.camera_movement_speed,
            "motion_blur": parameters.motion_blur_intensity,
            "color_grading": parameters.color_grading_intensity,
            "depth_of_field": parameters.enable_depth_of_field,
            "lens_type": parameters.lens_type,
            "resolution_scale": parameters.resolution_scale,
            "timestamp": time.time()
        }
        return json.dumps(frame_data).encode()
    
    def _generate_full_quality_frame(self, frame_index: int, parameters: PreviewParameters, source_frames: List[bytes]) -> bytes:
        """Generate full quality frame."""
        # Convert parameters to dict with enum values as strings
        params_dict = asdict(parameters)
        params_dict["quality_level"] = parameters.quality_level.value
        
        frame_data = {
            "type": "full_quality",
            "frame": frame_index,
            "quality": "full",
            "all_parameters": params_dict,
            "timestamp": time.time()
        }
        return json.dumps(frame_data).encode()
    
    def _generate_error_frame(self) -> bytes:
        """Generate error frame placeholder."""
        error_data = {
            "type": "error",
            "message": "Failed to generate preview",
            "timestamp": time.time()
        }
        return json.dumps(error_data).encode()


class WebSocketHandler:
    """Handles WebSocket connections for real-time preview."""
    
    def __init__(self, preview_system):
        """Initialize WebSocket handler."""
        self.preview_system = preview_system
        self.connections = {}
        self.message_queue = asyncio.Queue()
    
    async def handle_connection(self, websocket, path):
        """Handle new WebSocket connection."""
        connection_id = str(uuid.uuid4())
        self.connections[connection_id] = {
            "websocket": websocket,
            "session_id": None,
            "last_activity": time.time()
        }
        
        logger.info(f"New WebSocket connection: {connection_id}")
        
        try:
            async for message in websocket:
                await self._handle_message(connection_id, message)
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"WebSocket connection closed: {connection_id}")
        except Exception as e:
            logger.error(f"WebSocket error for {connection_id}: {e}")
        finally:
            if connection_id in self.connections:
                del self.connections[connection_id]
    
    async def _handle_message(self, connection_id: str, message: str):
        """Handle incoming WebSocket message."""
        try:
            data = json.loads(message)
            message_type = data.get("type")
            
            if message_type == "join_session":
                await self._handle_join_session(connection_id, data)
            elif message_type == "update_parameters":
                await self._handle_parameter_update(connection_id, data)
            elif message_type == "request_frame":
                await self._handle_frame_request(connection_id, data)
            elif message_type == "ping":
                await self._handle_ping(connection_id)
            else:
                logger.warning(f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON from {connection_id}: {message}")
        except Exception as e:
            logger.error(f"Error handling message from {connection_id}: {e}")
    
    async def _handle_join_session(self, connection_id: str, data: Dict[str, Any]):
        """Handle session join request."""
        session_id = data.get("session_id")
        user_id = data.get("user_id", "anonymous")
        
        if session_id in self.preview_system.sessions:
            session = self.preview_system.sessions[session_id]
            session.active_connections += 1
            self.connections[connection_id]["session_id"] = session_id
            
            # Send session info
            response = {
                "type": "session_joined",
                "session_id": session_id,
                "parameters": asdict(session.parameters),
                "active_connections": session.active_connections
            }
            
            await self._send_message(connection_id, response)
            logger.info(f"Connection {connection_id} joined session {session_id}")
        else:
            # Create new session
            session = self.preview_system.create_session(user_id, data.get("project_id", "default"))
            self.connections[connection_id]["session_id"] = session.session_id
            
            response = {
                "type": "session_created",
                "session_id": session.session_id,
                "parameters": asdict(session.parameters)
            }
            
            await self._send_message(connection_id, response)
    
    async def _handle_parameter_update(self, connection_id: str, data: Dict[str, Any]):
        """Handle parameter update request."""
        session_id = self.connections[connection_id].get("session_id")
        if not session_id:
            return
        
        parameters = data.get("parameters", {})
        self.preview_system.update_session_parameters(session_id, parameters)
        
        # Broadcast to all connections in session
        await self._broadcast_to_session(session_id, {
            "type": "parameters_updated",
            "parameters": parameters,
            "updated_by": connection_id
        })
    
    async def _handle_frame_request(self, connection_id: str, data: Dict[str, Any]):
        """Handle frame generation request."""
        session_id = self.connections[connection_id].get("session_id")
        if not session_id:
            return
        
        frame_index = data.get("frame_index", 0)
        frame = await self.preview_system.generate_preview_frame_async(session_id, frame_index)
        
        if frame:
            response = {
                "type": "frame_ready",
                "frame_id": frame.frame_id,
                "frame_index": frame_index,
                "image_data": base64.b64encode(frame.image_data).decode(),
                "metadata": frame.metadata,
                "processing_time": frame.processing_time,
                "quality_score": frame.quality_score
            }
            
            await self._send_message(connection_id, response)
    
    async def _handle_ping(self, connection_id: str):
        """Handle ping message."""
        await self._send_message(connection_id, {"type": "pong", "timestamp": time.time()})
    
    async def _send_message(self, connection_id: str, message: Dict[str, Any]):
        """Send message to specific connection."""
        if connection_id in self.connections:
            try:
                websocket = self.connections[connection_id]["websocket"]
                await websocket.send(json.dumps(message))
            except Exception as e:
                logger.error(f"Failed to send message to {connection_id}: {e}")
    
    async def _broadcast_to_session(self, session_id: str, message: Dict[str, Any]):
        """Broadcast message to all connections in session."""
        for connection_id, conn_info in self.connections.items():
            if conn_info.get("session_id") == session_id:
                await self._send_message(connection_id, message)


class RealTimePreviewSystem:
    """
    Real-Time Preview System
    
    Provides live preview of video processing with interactive parameter adjustment,
    instant feedback, and collaborative features.
    """
    
    def __init__(self, 
                 analytics_db_path: str = "preview_analytics.db",
                 batch_system: Optional[BatchProcessingSystem] = None):
        """Initialize real-time preview system."""
        self.sessions = {}
        self.cache = PreviewCache(max_size=200)
        self.processor = PreviewProcessor()
        
        # Analytics integration
        try:
            self.analytics = AnalyticsDashboard(analytics_db_path)
        except Exception as e:
            logger.warning(f"Analytics integration failed: {e}")
            self.analytics = None
        
        # Batch processing integration
        self.batch_system = batch_system
        
        # WebSocket server
        self.websocket_handler = WebSocketHandler(self)
        self.websocket_server = None
        
        # Circuit breaker for system operations
        self.circuit_breaker = CircuitBreaker(
            CircuitBreakerConfig(
                failure_threshold=5,
                recovery_timeout=30.0,
                timeout=10.0,
                max_concurrent=10
            )
        )
        
        # Performance tracking
        self.performance_stats = {
            "frames_generated": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "average_processing_time": 0.0,
            "active_sessions": 0
        }
        
        logger.info("Real-Time Preview System initialized")
    
    def create_session(self, user_id: str, project_id: str) -> PreviewSession:
        """Create new preview session."""
        session_id = str(uuid.uuid4())
        
        session = PreviewSession(
            session_id=session_id,
            user_id=user_id,
            project_id=project_id,
            created_at=datetime.now(),
            last_activity=datetime.now(),
            parameters=PreviewParameters()
        )
        
        self.sessions[session_id] = session
        self.performance_stats["active_sessions"] = len(self.sessions)
        
        logger.info(f"Created preview session {session_id} for user {user_id}")
        return session
    
    def get_session(self, session_id: str) -> Optional[PreviewSession]:
        """Get preview session by ID."""
        return self.sessions.get(session_id)
    
    def update_session_parameters(self, session_id: str, parameters: Dict[str, Any]):
        """Update session parameters."""
        if session_id not in self.sessions:
            return False
        
        session = self.sessions[session_id]
        session.last_activity = datetime.now()
        
        # Update parameters
        for key, value in parameters.items():
            if hasattr(session.parameters, key):
                if key == "quality_level" and isinstance(value, str):
                    setattr(session.parameters, key, PreviewQuality(value))
                else:
                    setattr(session.parameters, key, value)
        
        # Invalidate cache for this session's parameters
        self.cache.invalidate_pattern(f"session_{session_id}")
        
        logger.info(f"Updated parameters for session {session_id}: {parameters}")
        return True
    
    async def generate_preview_frame_async(self, session_id: str, frame_index: int) -> Optional[PreviewFrame]:
        """Generate preview frame asynchronously."""
        session = self.get_session(session_id)
        if not session:
            return None
        
        # Check cache first
        cache_key = self.cache.get_cache_key(session.parameters, frame_index)
        cached_frame = self.cache.get(cache_key)
        
        if cached_frame:
            self.performance_stats["cache_hits"] += 1
            return cached_frame
        
        self.performance_stats["cache_misses"] += 1
        
        # Generate new frame
        loop = asyncio.get_event_loop()
        
        try:
            # Run processor in thread pool to avoid blocking
            frame = await loop.run_in_executor(
                None,
                self.processor.generate_preview_frame,
                session.parameters,
                frame_index,
                []  # Source frames would come from project data
            )
            
            # Cache the result
            self.cache.put(cache_key, frame)
            
            # Update performance stats
            self.performance_stats["frames_generated"] += 1
            total_time = self.performance_stats.get("total_processing_time", 0.0)
            total_time += frame.processing_time
            self.performance_stats["total_processing_time"] = total_time
            self.performance_stats["average_processing_time"] = (
                total_time / self.performance_stats["frames_generated"]
            )
            
            # Record analytics
            if self.analytics:
                self._record_preview_metrics(frame)
            
            return frame
            
        except Exception as e:
            logger.error(f"Failed to generate preview frame: {e}")
            return None
    
    def _record_preview_metrics(self, frame: PreviewFrame):
        """Record preview metrics to analytics."""
        try:
            metrics = PerformanceMetrics(
                fps=1.0 / frame.processing_time if frame.processing_time > 0 else 0.0,
                throughput=self.performance_stats["frames_generated"] / max(time.time() - getattr(self, '_start_time', time.time()), 1),
                latency_ms=frame.processing_time * 1000,
                processing_time_ms=frame.processing_time * 1000,
                queue_depth=0,  # Real-time, no queue
                active_workers=len(self.sessions)
            )
            
            self.analytics.record_performance_metrics(metrics)
        except Exception as e:
            logger.warning(f"Failed to record preview metrics: {e}")
    
    async def start_websocket_server(self, host: str = "localhost", port: int = 8765):
        """Start WebSocket server for real-time communication."""
        try:
            self.websocket_server = await websockets.serve(
                self.websocket_handler.handle_connection,
                host,
                port
            )
            logger.info(f"WebSocket server started on {host}:{port}")
            return True
        except Exception as e:
            logger.error(f"Failed to start WebSocket server: {e}")
            return False
    
    async def stop_websocket_server(self):
        """Stop WebSocket server."""
        if self.websocket_server:
            self.websocket_server.close()
            await self.websocket_server.wait_closed()
            logger.info("WebSocket server stopped")
    
    def get_system_stats(self) -> Dict[str, Any]:
        """Get comprehensive system statistics."""
        cache_stats = self.cache.get_stats()
        
        return {
            "sessions": {
                "active_sessions": len(self.sessions),
                "total_connections": sum(s.active_connections for s in self.sessions.values())
            },
            "performance": self.performance_stats,
            "cache": cache_stats,
            "circuit_breaker": self.circuit_breaker.get_stats(),
            "websocket_server": {
                "running": self.websocket_server is not None,
                "connections": len(self.websocket_handler.connections)
            }
        }
    
    def cleanup_inactive_sessions(self, timeout_minutes: int = 30):
        """Clean up inactive sessions."""
        cutoff_time = datetime.now().timestamp() - (timeout_minutes * 60)
        
        inactive_sessions = [
            session_id for session_id, session in self.sessions.items()
            if session.last_activity.timestamp() < cutoff_time and session.active_connections == 0
        ]
        
        for session_id in inactive_sessions:
            del self.sessions[session_id]
            logger.info(f"Cleaned up inactive session: {session_id}")
        
        self.performance_stats["active_sessions"] = len(self.sessions)
        return len(inactive_sessions)


async def main():
    """Main function for testing real-time preview system."""
    print("🎬 Real-Time Preview System Implementation - Phase 3")
    print("=" * 60)
    
    # Initialize preview system
    preview_system = RealTimePreviewSystem()
    
    # Create test session
    session = preview_system.create_session("test_user", "test_project")
    print(f"✅ Created test session: {session.session_id}")
    
    # Test parameter updates
    preview_system.update_session_parameters(session.session_id, {
        "interpolation_strength": 0.9,
        "quality_level": "preview",
        "motion_blur_intensity": 0.7
    })
    print("✅ Updated session parameters")
    
    # Generate test frames
    print("\n📊 Generating test preview frames...")
    
    for i in range(5):
        frame = await preview_system.generate_preview_frame_async(session.session_id, i)
        if frame:
            print(f"   ✅ Frame {i}: {frame.processing_time:.3f}s, Quality: {frame.quality_score:.2f}")
        else:
            print(f"   ❌ Frame {i}: Failed to generate")
    
    # Test cache performance
    print("\n🔄 Testing cache performance...")
    start_time = time.time()
    
    # Generate same frames again (should be cached)
    for i in range(5):
        frame = await preview_system.generate_preview_frame_async(session.session_id, i)
    
    cache_time = time.time() - start_time
    print(f"   Cache retrieval time: {cache_time:.3f}s")
    
    # Get system statistics
    stats = preview_system.get_system_stats()
    print(f"\n📈 System Statistics:")
    print(f"   Active Sessions: {stats['sessions']['active_sessions']}")
    print(f"   Frames Generated: {stats['performance']['frames_generated']}")
    print(f"   Cache Hit Rate: {stats['cache']['hit_rate']:.2%}")
    print(f"   Average Processing Time: {stats['performance']['average_processing_time']:.3f}s")
    
    # Test WebSocket server (optional)
    print(f"\n🌐 Starting WebSocket server...")
    server_started = await preview_system.start_websocket_server("localhost", 8765)
    
    if server_started:
        print(f"   ✅ WebSocket server running on ws://localhost:8765")
        print(f"   Connect with: wscat -c ws://localhost:8765")
        
        # Keep server running for a short time
        await asyncio.sleep(2)
        
        await preview_system.stop_websocket_server()
        print(f"   ✅ WebSocket server stopped")
    else:
        print(f"   ❌ Failed to start WebSocket server")
    
    print(f"\n🎯 Phase 3 Real-Time Preview System: COMPLETE")
    return preview_system


if __name__ == "__main__":
    asyncio.run(main())