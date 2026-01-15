"""
Real-time Monitoring Dashboard for Integrated Workflow System

Provides real-time monitoring, metrics collection, and visualization
for security, resilience, and workflow execution.

Author: StoryCore-Engine Team
Date: 2026-01-14
"""

import asyncio
import json
import logging
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from src.integrated_workflow_system import IntegratedWorkflowSystem


# Configure logging
logger = logging.getLogger(__name__)


@dataclass
class MetricPoint:
    """Single metric data point"""
    timestamp: datetime
    value: float
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Alert:
    """System alert"""
    timestamp: datetime
    severity: str  # info, warning, error, critical
    category: str
    message: str
    details: Dict[str, Any] = field(default_factory=dict)
    acknowledged: bool = False


class MetricsCollector:
    """Collects and stores metrics over time"""
    
    def __init__(self, max_points: int = 1000):
        self.max_points = max_points
        self.metrics: Dict[str, deque] = {}
    
    def record_metric(self, metric_name: str, value: float, 
                     metadata: Optional[Dict[str, Any]] = None):
        """Record a metric value"""
        if metric_name not in self.metrics:
            self.metrics[metric_name] = deque(maxlen=self.max_points)
        
        point = MetricPoint(
            timestamp=datetime.now(),
            value=value,
            metadata=metadata or {}
        )
        self.metrics[metric_name].append(point)
    
    def get_metric_history(self, metric_name: str, 
                          time_window: Optional[timedelta] = None) -> List[MetricPoint]:
        """Get metric history"""
        if metric_name not in self.metrics:
            return []
        
        points = list(self.metrics[metric_name])
        
        if time_window:
            cutoff = datetime.now() - time_window
            points = [p for p in points if p.timestamp >= cutoff]
        
        return points
    
    def get_metric_stats(self, metric_name: str, 
                        time_window: Optional[timedelta] = None) -> Dict[str, float]:
        """Get metric statistics"""
        points = self.get_metric_history(metric_name, time_window)
        
        if not points:
            return {'count': 0, 'min': 0, 'max': 0, 'avg': 0, 'latest': 0}
        
        values = [p.value for p in points]
        
        return {
            'count': len(values),
            'min': min(values),
            'max': max(values),
            'avg': sum(values) / len(values),
            'latest': values[-1]
        }
    
    def get_all_metrics(self) -> List[str]:
        """Get list of all metric names"""
        return list(self.metrics.keys())


class AlertManager:
    """Manages system alerts"""
    
    def __init__(self, max_alerts: int = 500):
        self.max_alerts = max_alerts
        self.alerts: deque = deque(maxlen=max_alerts)
        self.alert_thresholds = {
            'error_rate': {'warning': 0.05, 'critical': 0.10},
            'response_time': {'warning': 5.0, 'critical': 10.0},
            'memory_usage': {'warning': 0.80, 'critical': 0.95},
            'circuit_breaker_open': {'warning': 1, 'critical': 3}
        }
    
    def create_alert(self, severity: str, category: str, message: str,
                    details: Optional[Dict[str, Any]] = None):
        """Create a new alert"""
        alert = Alert(
            timestamp=datetime.now(),
            severity=severity,
            category=category,
            message=message,
            details=details or {}
        )
        self.alerts.append(alert)
        logger.log(
            logging.CRITICAL if severity == 'critical' else
            logging.ERROR if severity == 'error' else
            logging.WARNING if severity == 'warning' else
            logging.INFO,
            f"Alert [{severity.upper()}] {category}: {message}"
        )
    
    def check_thresholds(self, metrics: Dict[str, float]):
        """Check metrics against thresholds and create alerts"""
        for metric_name, value in metrics.items():
            if metric_name in self.alert_thresholds:
                thresholds = self.alert_thresholds[metric_name]
                
                if value >= thresholds.get('critical', float('inf')):
                    self.create_alert(
                        'critical',
                        metric_name,
                        f"{metric_name} is critically high: {value}",
                        {'value': value, 'threshold': thresholds['critical']}
                    )
                elif value >= thresholds.get('warning', float('inf')):
                    self.create_alert(
                        'warning',
                        metric_name,
                        f"{metric_name} is above warning threshold: {value}",
                        {'value': value, 'threshold': thresholds['warning']}
                    )
    
    def get_active_alerts(self, severity: Optional[str] = None) -> List[Alert]:
        """Get active (unacknowledged) alerts"""
        alerts = [a for a in self.alerts if not a.acknowledged]
        
        if severity:
            alerts = [a for a in alerts if a.severity == severity]
        
        return alerts
    
    def acknowledge_alert(self, alert_index: int):
        """Acknowledge an alert"""
        if 0 <= alert_index < len(self.alerts):
            self.alerts[alert_index].acknowledged = True
    
    def get_alert_summary(self) -> Dict[str, int]:
        """Get alert count by severity"""
        active_alerts = self.get_active_alerts()
        
        return {
            'total': len(active_alerts),
            'critical': len([a for a in active_alerts if a.severity == 'critical']),
            'error': len([a for a in active_alerts if a.severity == 'error']),
            'warning': len([a for a in active_alerts if a.severity == 'warning']),
            'info': len([a for a in active_alerts if a.severity == 'info'])
        }


class MonitoringDashboard:
    """Real-time monitoring dashboard"""
    
    def __init__(self, system: IntegratedWorkflowSystem):
        self.system = system
        self.metrics_collector = MetricsCollector()
        self.alert_manager = AlertManager()
        self.monitoring_active = False
        self.update_interval = 5.0  # seconds
    
    async def start_monitoring(self):
        """Start monitoring loop"""
        self.monitoring_active = True
        logger.info("Monitoring dashboard started")
        
        while self.monitoring_active:
            await self._collect_metrics()
            await self._check_health()
            await asyncio.sleep(self.update_interval)
    
    def stop_monitoring(self):
        """Stop monitoring loop"""
        self.monitoring_active = False
        logger.info("Monitoring dashboard stopped")
    
    async def _collect_metrics(self):
        """Collect current metrics"""
        # Get system status
        status = self.system.get_system_status()
        
        # Execution metrics
        stats = status['execution_stats']
        total = stats['total_requests']
        
        if total > 0:
            success_rate = stats['successful_requests'] / total
            error_rate = stats['failed_requests'] / total
            security_block_rate = stats['security_blocked'] / total
            
            self.metrics_collector.record_metric('success_rate', success_rate)
            self.metrics_collector.record_metric('error_rate', error_rate)
            self.metrics_collector.record_metric('security_block_rate', security_block_rate)
        
        # Resilience metrics
        resilience_health = status['resilience_health']
        degradation_level = resilience_health.get('degradation_level', 'full')
        degradation_value = {
            'full': 1.0, 'high': 0.8, 'medium': 0.6, 'low': 0.4, 'minimal': 0.2
        }.get(degradation_level, 1.0)
        
        self.metrics_collector.record_metric('degradation_level', degradation_value)
        self.metrics_collector.record_metric('error_rate_rpm', 
                                            resilience_health.get('error_rate', 0))
        self.metrics_collector.record_metric('recovery_rate', 
                                            resilience_health.get('recovery_rate', 0))
        
        # Circuit breaker metrics
        circuit_breakers = resilience_health.get('circuit_breakers', {})
        open_breakers = sum(1 for cb in circuit_breakers.values() 
                          if cb.get('state') == 'open')
        self.metrics_collector.record_metric('circuit_breakers_open', open_breakers)
        
        # Security metrics
        security_health = status['security_health']
        self.metrics_collector.record_metric('audit_log_count', 
                                            security_health.get('audit_log_count', 0))
    
    async def _check_health(self):
        """Check system health and create alerts"""
        # Get recent metrics
        metrics = {
            'error_rate': self.metrics_collector.get_metric_stats('error_rate').get('latest', 0),
            'circuit_breaker_open': self.metrics_collector.get_metric_stats('circuit_breakers_open').get('latest', 0),
        }
        
        # Check thresholds
        self.alert_manager.check_thresholds(metrics)
        
        # Check degradation
        degradation_value = self.metrics_collector.get_metric_stats('degradation_level').get('latest', 1.0)
        if degradation_value < 1.0:
            self.alert_manager.create_alert(
                'warning',
                'degradation',
                f"System is degraded (level: {degradation_value:.0%})",
                {'degradation_value': degradation_value}
            )
    
    def get_dashboard_data(self) -> Dict[str, Any]:
        """Get current dashboard data"""
        # Get system status
        status = self.system.get_system_status()
        
        # Get metric statistics
        metric_stats = {}
        for metric_name in self.metrics_collector.get_all_metrics():
            metric_stats[metric_name] = self.metrics_collector.get_metric_stats(
                metric_name,
                timedelta(minutes=15)
            )
        
        # Get alerts
        alert_summary = self.alert_manager.get_alert_summary()
        active_alerts = self.alert_manager.get_active_alerts()
        
        return {
            'timestamp': datetime.now().isoformat(),
            'system_status': status,
            'metrics': metric_stats,
            'alerts': {
                'summary': alert_summary,
                'active': [
                    {
                        'timestamp': a.timestamp.isoformat(),
                        'severity': a.severity,
                        'category': a.category,
                        'message': a.message
                    }
                    for a in active_alerts[-10:]  # Last 10 alerts
                ]
            },
            'health_score': self._calculate_health_score(metric_stats)
        }
    
    def _calculate_health_score(self, metric_stats: Dict[str, Dict[str, float]]) -> float:
        """Calculate overall system health score (0-100)"""
        score = 100.0
        
        # Deduct for errors
        error_rate = metric_stats.get('error_rate', {}).get('latest', 0)
        score -= error_rate * 50  # Up to -50 for 100% error rate
        
        # Deduct for degradation
        degradation = metric_stats.get('degradation_level', {}).get('latest', 1.0)
        score -= (1.0 - degradation) * 30  # Up to -30 for minimal degradation
        
        # Deduct for open circuit breakers
        open_breakers = metric_stats.get('circuit_breakers_open', {}).get('latest', 0)
        score -= open_breakers * 10  # -10 per open breaker
        
        return max(0, min(100, score))
    
    def export_dashboard_html(self, output_path: Path):
        """Export dashboard as HTML"""
        dashboard_data = self.get_dashboard_data()
        
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <title>StoryCore-Engine Monitoring Dashboard</title>
    <style>
        body {{
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f5f5f5;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
        }}
        .header {{
            background-color: #2c3e50;
            color: white;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
        }}
        .metrics-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }}
        .metric-card {{
            background-color: white;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .metric-value {{
            font-size: 32px;
            font-weight: bold;
            color: #3498db;
        }}
        .metric-label {{
            font-size: 14px;
            color: #7f8c8d;
            margin-top: 5px;
        }}
        .health-score {{
            font-size: 48px;
            font-weight: bold;
            text-align: center;
        }}
        .health-excellent {{ color: #27ae60; }}
        .health-good {{ color: #f39c12; }}
        .health-poor {{ color: #e74c3c; }}
        .alerts-section {{
            background-color: white;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .alert {{
            padding: 10px;
            margin: 10px 0;
            border-left: 4px solid;
            border-radius: 3px;
        }}
        .alert-critical {{ border-color: #e74c3c; background-color: #fadbd8; }}
        .alert-error {{ border-color: #e67e22; background-color: #fdebd0; }}
        .alert-warning {{ border-color: #f39c12; background-color: #fcf3cf; }}
        .alert-info {{ border-color: #3498db; background-color: #d6eaf8; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>StoryCore-Engine Monitoring Dashboard</h1>
            <p>Last updated: {dashboard_data['timestamp']}</p>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="health-score {'health-excellent' if dashboard_data['health_score'] >= 80 else 'health-good' if dashboard_data['health_score'] >= 60 else 'health-poor'}">
                    {dashboard_data['health_score']:.0f}
                </div>
                <div class="metric-label">Health Score</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value">{dashboard_data['system_status']['execution_stats']['total_requests']}</div>
                <div class="metric-label">Total Requests</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value">{dashboard_data['system_status']['execution_stats']['successful_requests']}</div>
                <div class="metric-label">Successful</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value">{dashboard_data['system_status']['execution_stats']['failed_requests']}</div>
                <div class="metric-label">Failed</div>
            </div>
        </div>
        
        <div class="alerts-section">
            <h2>Active Alerts ({dashboard_data['alerts']['summary']['total']})</h2>
            {''.join([f'''
            <div class="alert alert-{alert['severity']}">
                <strong>[{alert['severity'].upper()}]</strong> {alert['category']}: {alert['message']}
                <br><small>{alert['timestamp']}</small>
            </div>
            ''' for alert in dashboard_data['alerts']['active']])}
        </div>
    </div>
</body>
</html>
"""
        
        output_path.write_text(html)
        logger.info(f"Dashboard exported to {output_path}")
    
    def export_metrics_json(self, output_path: Path):
        """Export metrics as JSON"""
        dashboard_data = self.get_dashboard_data()
        
        with open(output_path, 'w') as f:
            json.dump(dashboard_data, f, indent=2)
        
        logger.info(f"Metrics exported to {output_path}")


# Example usage
if __name__ == "__main__":
    import asyncio
    from src.integrated_workflow_system import IntegratedWorkflowSystem, WorkflowRequest, SecurityLevel
    
    async def example_usage():
        # Initialize system
        system = IntegratedWorkflowSystem()
        system.set_user_access_level('user123', SecurityLevel.AUTHENTICATED)
        
        # Register sample workflow
        async def sample_workflow(request):
            await asyncio.sleep(0.1)
            return {'result': 'success'}
        
        system.register_workflow('test_workflow', sample_workflow)
        
        # Initialize dashboard
        dashboard = MonitoringDashboard(system)
        
        # Simulate some requests
        for i in range(10):
            request = WorkflowRequest(
                workflow_type='test_workflow',
                user_id='user123',
                prompt=f'Test request {i}'
            )
            await system.execute_workflow(request)
        
        # Collect metrics
        await dashboard._collect_metrics()
        
        # Get dashboard data
        data = dashboard.get_dashboard_data()
        print(f"Health Score: {data['health_score']:.0f}")
        print(f"Total Requests: {data['system_status']['execution_stats']['total_requests']}")
        
        # Export dashboard
        dashboard.export_dashboard_html(Path('monitoring_dashboard.html'))
        dashboard.export_metrics_json(Path('monitoring_metrics.json'))
        
        print("\nDashboard exported successfully!")
    
    asyncio.run(example_usage())
