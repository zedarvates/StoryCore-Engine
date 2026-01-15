#!/usr/bin/env python3
"""
Advanced Analytics Dashboard
Provides comprehensive analytics and monitoring for the Video Engine system.
"""

import sys
import time
import json
import logging
import sqlite3
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import threading
from collections import defaultdict, deque

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent))

try:
    from circuit_breaker import CircuitBreaker, CircuitBreakerConfig
except ImportError:
    # Fallback for testing
    class CircuitBreaker:
        def __init__(self, *args, **kwargs):
            pass
        def __call__(self, func):
            return func
        def get_stats(self):
            return {"state": "closed", "failure_count": 0}

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class MetricType(Enum):
    """Types of metrics tracked by the analytics system."""
    PERFORMANCE = "performance"
    QUALITY = "quality"
    RESOURCE = "resource"
    ERROR = "error"
    USAGE = "usage"
    SYSTEM_HEALTH = "system_health"


@dataclass
class MetricData:
    """Individual metric data point."""
    timestamp: datetime
    metric_type: MetricType
    name: str
    value: float
    unit: str
    metadata: Dict[str, Any]


@dataclass
class PerformanceMetrics:
    """Performance-related metrics."""
    fps: float
    throughput: float
    latency_ms: float
    processing_time_ms: float
    queue_depth: int
    active_workers: int


@dataclass
class QualityMetrics:
    """Quality-related metrics."""
    ssim_score: float
    psnr_score: float
    quality_grade: str
    artifact_count: int
    coherence_score: float
    user_rating: Optional[float] = None


@dataclass
class ResourceMetrics:
    """Resource utilization metrics."""
    cpu_percent: float
    memory_percent: float
    gpu_percent: float
    disk_io_mbps: float
    network_io_mbps: float
    temperature_celsius: float


@dataclass
class SystemHealthMetrics:
    """System health and reliability metrics."""
    uptime_hours: float
    error_rate_percent: float
    circuit_breaker_trips: int
    dependency_status: Dict[str, bool]
    last_backup: Optional[datetime] = None


class AnalyticsDatabase:
    """SQLite database for storing analytics data."""
    
    def __init__(self, db_path: str = "analytics.db"):
        """Initialize analytics database."""
        self.db_path = db_path
        self.connection = None
        self._init_database()
    
    def _init_database(self):
        """Initialize database schema."""
        self.connection = sqlite3.connect(self.db_path, check_same_thread=False)
        self.connection.execute("""
            CREATE TABLE IF NOT EXISTS metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                metric_type TEXT NOT NULL,
                name TEXT NOT NULL,
                value REAL NOT NULL,
                unit TEXT NOT NULL,
                metadata TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        self.connection.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT UNIQUE NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT,
                total_operations INTEGER DEFAULT 0,
                success_rate REAL DEFAULT 0.0,
                metadata TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        self.connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp);
        """)
        
        self.connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_metrics_type ON metrics(metric_type);
        """)
        
        self.connection.commit()
    
    def store_metric(self, metric: MetricData):
        """Store a metric in the database."""
        try:
            self.connection.execute("""
                INSERT INTO metrics (timestamp, metric_type, name, value, unit, metadata)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                metric.timestamp.isoformat(),
                metric.metric_type.value,
                metric.name,
                metric.value,
                metric.unit,
                json.dumps(metric.metadata)
            ))
            self.connection.commit()
        except Exception as e:
            logger.error(f"Failed to store metric: {e}")
    
    def get_metrics(self, 
                   metric_type: Optional[MetricType] = None,
                   start_time: Optional[datetime] = None,
                   end_time: Optional[datetime] = None,
                   limit: int = 1000) -> List[MetricData]:
        """Retrieve metrics from database."""
        query = "SELECT timestamp, metric_type, name, value, unit, metadata FROM metrics WHERE 1=1"
        params = []
        
        if metric_type:
            query += " AND metric_type = ?"
            params.append(metric_type.value)
        
        if start_time:
            query += " AND timestamp >= ?"
            params.append(start_time.isoformat())
        
        if end_time:
            query += " AND timestamp <= ?"
            params.append(end_time.isoformat())
        
        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)
        
        try:
            cursor = self.connection.execute(query, params)
            results = []
            for row in cursor.fetchall():
                results.append(MetricData(
                    timestamp=datetime.fromisoformat(row[0]),
                    metric_type=MetricType(row[1]),
                    name=row[2],
                    value=row[3],
                    unit=row[4],
                    metadata=json.loads(row[5]) if row[5] else {}
                ))
            return results
        except Exception as e:
            logger.error(f"Failed to retrieve metrics: {e}")
            return []


class AnalyticsDashboard:
    """
    Advanced Analytics Dashboard
    
    Provides comprehensive analytics, monitoring, and insights for the Video Engine system.
    Tracks performance metrics, quality scores, resource utilization, and system health.
    """
    
    def __init__(self, db_path: str = "analytics.db"):
        """Initialize analytics dashboard."""
        self.db = AnalyticsDatabase(db_path)
        self.session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.start_time = datetime.now()
        
        # In-memory metric storage for real-time access
        self.recent_metrics = defaultdict(lambda: deque(maxlen=100))
        self.metric_lock = threading.Lock()
        
        # Circuit breaker for analytics operations
        circuit_breaker_config = CircuitBreakerConfig(
            failure_threshold=5,
            recovery_timeout=30.0,
            timeout=10.0,
            max_concurrent=2
        )
        self.circuit_breaker = CircuitBreaker(circuit_breaker_config)
        
        logger.info(f"Analytics Dashboard initialized - Session: {self.session_id}")
    
    def record_performance_metrics(self, metrics: PerformanceMetrics):
        """Record performance metrics."""
    def record_performance_metrics(self, metrics: PerformanceMetrics):
        """Record performance metrics."""
        try:
            timestamp = datetime.now()
            
            # Store individual metrics
            metric_data = [
                MetricData(timestamp, MetricType.PERFORMANCE, "fps", metrics.fps, "fps", {}),
                MetricData(timestamp, MetricType.PERFORMANCE, "throughput", metrics.throughput, "ops/sec", {}),
                MetricData(timestamp, MetricType.PERFORMANCE, "latency", metrics.latency_ms, "ms", {}),
                MetricData(timestamp, MetricType.PERFORMANCE, "processing_time", metrics.processing_time_ms, "ms", {}),
                MetricData(timestamp, MetricType.PERFORMANCE, "queue_depth", metrics.queue_depth, "count", {}),
                MetricData(timestamp, MetricType.PERFORMANCE, "active_workers", metrics.active_workers, "count", {})
            ]
            
            for metric in metric_data:
                self.db.store_metric(metric)
                with self.metric_lock:
                    self.recent_metrics[metric.name].append(metric)
        except Exception as e:
            logger.error(f"Failed to record performance metrics: {e}")
    
    def record_quality_metrics(self, metrics: QualityMetrics):
        """Record quality metrics."""
        try:
            timestamp = datetime.now()
            
            metric_data = [
                MetricData(timestamp, MetricType.QUALITY, "ssim_score", metrics.ssim_score, "score", {}),
                MetricData(timestamp, MetricType.QUALITY, "psnr_score", metrics.psnr_score, "dB", {}),
                MetricData(timestamp, MetricType.QUALITY, "artifact_count", metrics.artifact_count, "count", {}),
                MetricData(timestamp, MetricType.QUALITY, "coherence_score", metrics.coherence_score, "score", {}),
            ]
            
            if metrics.user_rating is not None:
                metric_data.append(
                    MetricData(timestamp, MetricType.QUALITY, "user_rating", metrics.user_rating, "rating", {})
                )
            
            for metric in metric_data:
                self.db.store_metric(metric)
                with self.metric_lock:
                    self.recent_metrics[metric.name].append(metric)
        except Exception as e:
            logger.error(f"Failed to record quality metrics: {e}")
    
    def record_resource_metrics(self, metrics: ResourceMetrics):
        """Record resource utilization metrics."""
        try:
            timestamp = datetime.now()
            
            metric_data = [
                MetricData(timestamp, MetricType.RESOURCE, "cpu_percent", metrics.cpu_percent, "%", {}),
                MetricData(timestamp, MetricType.RESOURCE, "memory_percent", metrics.memory_percent, "%", {}),
                MetricData(timestamp, MetricType.RESOURCE, "gpu_percent", metrics.gpu_percent, "%", {}),
                MetricData(timestamp, MetricType.RESOURCE, "disk_io", metrics.disk_io_mbps, "MB/s", {}),
                MetricData(timestamp, MetricType.RESOURCE, "network_io", metrics.network_io_mbps, "MB/s", {}),
                MetricData(timestamp, MetricType.RESOURCE, "temperature", metrics.temperature_celsius, "°C", {})
            ]
            
            for metric in metric_data:
                self.db.store_metric(metric)
                with self.metric_lock:
                    self.recent_metrics[metric.name].append(metric)
        except Exception as e:
            logger.error(f"Failed to record resource metrics: {e}")
    
    def record_system_health(self, metrics: SystemHealthMetrics):
        """Record system health metrics."""
        try:
            timestamp = datetime.now()
            
            metric_data = [
                MetricData(timestamp, MetricType.SYSTEM_HEALTH, "uptime", metrics.uptime_hours, "hours", {}),
                MetricData(timestamp, MetricType.SYSTEM_HEALTH, "error_rate", metrics.error_rate_percent, "%", {}),
                MetricData(timestamp, MetricType.SYSTEM_HEALTH, "circuit_breaker_trips", metrics.circuit_breaker_trips, "count", {}),
            ]
            
            # Store dependency status as individual metrics
            for dep_name, status in metrics.dependency_status.items():
                metric_data.append(
                    MetricData(timestamp, MetricType.SYSTEM_HEALTH, f"dependency_{dep_name}", 
                              1.0 if status else 0.0, "status", {"dependency": dep_name})
                )
            
            for metric in metric_data:
                self.db.store_metric(metric)
                with self.metric_lock:
                    self.recent_metrics[metric.name].append(metric)
        except Exception as e:
            logger.error(f"Failed to record system health metrics: {e}")
    
    def get_performance_summary(self, hours: int = 24) -> Dict[str, Any]:
        """Get performance summary for the last N hours."""
        end_time = datetime.now()
        start_time = end_time - timedelta(hours=hours)
        
        metrics = self.db.get_metrics(
            metric_type=MetricType.PERFORMANCE,
            start_time=start_time,
            end_time=end_time
        )
        
        if not metrics:
            return {"error": "No performance data available"}
        
        # Group metrics by name
        grouped = defaultdict(list)
        for metric in metrics:
            grouped[metric.name].append(metric.value)
        
        summary = {}
        for name, values in grouped.items():
            if values:
                summary[name] = {
                    "current": values[0],  # Most recent
                    "average": sum(values) / len(values),
                    "min": min(values),
                    "max": max(values),
                    "count": len(values)
                }
        
        return summary
    
    def get_quality_trends(self, hours: int = 24) -> Dict[str, Any]:
        """Get quality trends for the last N hours."""
        end_time = datetime.now()
        start_time = end_time - timedelta(hours=hours)
        
        metrics = self.db.get_metrics(
            metric_type=MetricType.QUALITY,
            start_time=start_time,
            end_time=end_time
        )
        
        if not metrics:
            return {"error": "No quality data available"}
        
        # Calculate trends
        grouped = defaultdict(list)
        for metric in metrics:
            grouped[metric.name].append((metric.timestamp, metric.value))
        
        trends = {}
        for name, data_points in grouped.items():
            if len(data_points) >= 2:
                # Sort by timestamp
                data_points.sort(key=lambda x: x[0])
                
                # Calculate trend (simple linear)
                first_value = data_points[0][1]
                last_value = data_points[-1][1]
                trend = "improving" if last_value > first_value else "declining" if last_value < first_value else "stable"
                
                trends[name] = {
                    "trend": trend,
                    "change": last_value - first_value,
                    "current": last_value,
                    "data_points": len(data_points)
                }
        
        return trends
    
    def get_resource_utilization(self, hours: int = 1) -> Dict[str, Any]:
        """Get current resource utilization."""
        end_time = datetime.now()
        start_time = end_time - timedelta(hours=hours)
        
        metrics = self.db.get_metrics(
            metric_type=MetricType.RESOURCE,
            start_time=start_time,
            end_time=end_time
        )
        
        if not metrics:
            return {"error": "No resource data available"}
        
        # Get most recent values
        latest = {}
        for metric in metrics:
            if metric.name not in latest or metric.timestamp > latest[metric.name]["timestamp"]:
                latest[metric.name] = {
                    "value": metric.value,
                    "unit": metric.unit,
                    "timestamp": metric.timestamp
                }
        
        return {name: {"value": data["value"], "unit": data["unit"]} 
                for name, data in latest.items()}
    
    def get_system_health_status(self) -> Dict[str, Any]:
        """Get current system health status."""
        end_time = datetime.now()
        start_time = end_time - timedelta(hours=1)
        
        metrics = self.db.get_metrics(
            metric_type=MetricType.SYSTEM_HEALTH,
            start_time=start_time,
            end_time=end_time
        )
        
        if not metrics:
            return {"status": "unknown", "message": "No health data available"}
        
        # Analyze health metrics
        error_rate = 0.0
        uptime = 0.0
        dependencies = {}
        
        for metric in metrics:
            if metric.name == "error_rate":
                error_rate = max(error_rate, metric.value)
            elif metric.name == "uptime":
                uptime = max(uptime, metric.value)
            elif metric.name.startswith("dependency_"):
                dep_name = metric.name.replace("dependency_", "")
                dependencies[dep_name] = metric.value > 0.5
        
        # Determine overall health
        if error_rate > 10.0:
            status = "critical"
        elif error_rate > 5.0:
            status = "warning"
        elif any(not status for status in dependencies.values()):
            status = "warning"
        else:
            status = "healthy"
        
        return {
            "status": status,
            "error_rate": error_rate,
            "uptime_hours": uptime,
            "dependencies": dependencies,
            "last_check": end_time.isoformat()
        }
    
    def generate_dashboard_data(self) -> Dict[str, Any]:
        """Generate comprehensive dashboard data."""
        return {
            "session_info": {
                "session_id": self.session_id,
                "start_time": self.start_time.isoformat(),
                "uptime_minutes": (datetime.now() - self.start_time).total_seconds() / 60
            },
            "performance": self.get_performance_summary(hours=24),
            "quality": self.get_quality_trends(hours=24),
            "resources": self.get_resource_utilization(hours=1),
            "system_health": self.get_system_health_status(),
            "circuit_breaker_stats": self.circuit_breaker.get_stats(),
            "generated_at": datetime.now().isoformat()
        }
    
    def export_analytics_report(self, hours: int = 24) -> Dict[str, Any]:
        """Export comprehensive analytics report."""
        end_time = datetime.now()
        start_time = end_time - timedelta(hours=hours)
        
        # Get all metrics for the time period
        all_metrics = self.db.get_metrics(start_time=start_time, end_time=end_time)
        
        # Group by type
        by_type = defaultdict(list)
        for metric in all_metrics:
            by_type[metric.metric_type].append(metric)
        
        report = {
            "report_info": {
                "generated_at": end_time.isoformat(),
                "time_range": {
                    "start": start_time.isoformat(),
                    "end": end_time.isoformat(),
                    "duration_hours": hours
                },
                "total_metrics": len(all_metrics)
            },
            "summary": {
                "performance": self.get_performance_summary(hours),
                "quality": self.get_quality_trends(hours),
                "resources": self.get_resource_utilization(hours),
                "system_health": self.get_system_health_status()
            },
            "metrics_by_type": {
                metric_type.value: len(metrics) 
                for metric_type, metrics in by_type.items()
            }
        }
        
        return report
    
    def close(self):
        """Close database connection and cleanup resources."""
        try:
            if hasattr(self, 'db') and hasattr(self.db, 'connection'):
                self.db.connection.close()
                logger.info("Analytics Dashboard database connection closed")
        except Exception as e:
            logger.warning(f"Error closing analytics database: {e}")


def main():
    """Main function for testing analytics dashboard."""
    print("🔧 Testing Analytics Dashboard")
    print("=" * 50)
    
    # Initialize dashboard
    dashboard = AnalyticsDashboard("test_analytics.db")
    
    # Simulate some metrics
    print("📊 Recording sample metrics...")
    
    # Performance metrics
    perf_metrics = PerformanceMetrics(
        fps=95.5,
        throughput=1.8,
        latency_ms=45.2,
        processing_time_ms=523.1,
        queue_depth=3,
        active_workers=8
    )
    dashboard.record_performance_metrics(perf_metrics)
    
    # Quality metrics
    quality_metrics = QualityMetrics(
        ssim_score=0.94,
        psnr_score=28.5,
        quality_grade="excellent",
        artifact_count=0,
        coherence_score=0.92,
        user_rating=4.5
    )
    dashboard.record_quality_metrics(quality_metrics)
    
    # Resource metrics
    resource_metrics = ResourceMetrics(
        cpu_percent=45.2,
        memory_percent=62.1,
        gpu_percent=78.3,
        disk_io_mbps=125.4,
        network_io_mbps=15.2,
        temperature_celsius=65.0
    )
    dashboard.record_resource_metrics(resource_metrics)
    
    # System health
    health_metrics = SystemHealthMetrics(
        uptime_hours=24.5,
        error_rate_percent=2.1,
        circuit_breaker_trips=0,
        dependency_status={
            "ffmpeg": True,
            "gpu_driver": True,
            "storage": True,
            "network": True
        }
    )
    dashboard.record_system_health(health_metrics)
    
    # Generate dashboard data
    print("📈 Generating dashboard data...")
    dashboard_data = dashboard.generate_dashboard_data()
    
    print("✅ Dashboard Data Generated:")
    print(f"   Session: {dashboard_data['session_info']['session_id']}")
    print(f"   Performance Metrics: {len(dashboard_data['performance'])} categories")
    print(f"   Quality Trends: {len(dashboard_data['quality'])} metrics")
    print(f"   Resource Utilization: {len(dashboard_data['resources'])} resources")
    print(f"   System Health: {dashboard_data['system_health']['status']}")
    
    # Export report
    print("\n📄 Exporting analytics report...")
    report = dashboard.export_analytics_report(hours=1)
    
    print("✅ Analytics Report Generated:")
    print(f"   Total Metrics: {report['report_info']['total_metrics']}")
    print(f"   Time Range: {report['report_info']['time_range']['duration_hours']} hours")
    print(f"   Performance Summary: {len(report['summary']['performance'])} metrics")
    print(f"   Quality Trends: {len(report['summary']['quality'])} trends")
    
    # Save report to file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_file = f"analytics_report_{timestamp}.json"
    
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2, default=str)
    
    print(f"\n📁 Report saved to: {report_file}")
    
    return dashboard_data, report


if __name__ == "__main__":
    dashboard_data, report = main()