"""
Integrated System Example - Complete Workflow with Monitoring

This example demonstrates how to use the complete integrated system:
- Security validation
- Error handling and resilience
- Workflow execution
- Real-time monitoring
- Dashboard export

Author: StoryCore-Engine Team
Date: 2026-01-14
"""

import asyncio
import json
import logging
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.integrated_workflow_system import (
    IntegratedWorkflowSystem,
    WorkflowRequest,
)
from src.monitoring_dashboard import MonitoringDashboard
from src.security_validation_system import SecurityLevel


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def example_video_handler(request: WorkflowRequest):
    """Example video generation handler"""
    logger.info(f"Processing video request: {request.prompt}")
    
    # Simulate video generation
    await asyncio.sleep(0.1)
    
    return {
        'video_path': 'output/video.mp4',
        'duration': 5.0,
        'resolution': '1920x1080',
        'fps': 30
    }


async def example_image_handler(request: WorkflowRequest):
    """Example image generation handler"""
    logger.info(f"Processing image request: {request.prompt}")
    
    # Simulate image generation
    await asyncio.sleep(0.05)
    
    return {
        'image_path': 'output/image.png',
        'resolution': '1024x1024',
        'format': 'PNG'
    }


async def flaky_handler(request: WorkflowRequest):
    """Example handler that sometimes fails (for testing resilience)"""
    import random
    
    if random.random() < 0.2:  # 20% failure rate
        raise ConnectionError("Simulated network failure")
    
    await asyncio.sleep(0.05)
    return {'result': 'success'}


async def main():
    """Main example workflow"""
    
    print("=" * 70)
    print("Integrated System Example - Complete Workflow with Monitoring")
    print("=" * 70)
    print()
    
    # Step 1: Initialize the integrated system
    print("Step 1: Initializing Integrated Workflow System...")
    system = IntegratedWorkflowSystem()
    
    # Step 2: Register workflow handlers
    print("Step 2: Registering workflow handlers...")
    system.register_workflow('video_generation', example_video_handler)
    system.register_workflow('image_generation', example_image_handler)
    system.register_workflow('flaky_workflow', flaky_handler)
    
    # Register workflows as resources for access control
    system.security.access_control.add_custom_permission(
        'video_generation',
        {SecurityLevel.AUTHENTICATED, SecurityLevel.PRIVILEGED, SecurityLevel.ADMIN}
    )
    system.security.access_control.add_custom_permission(
        'image_generation',
        {SecurityLevel.AUTHENTICATED, SecurityLevel.PRIVILEGED, SecurityLevel.ADMIN}
    )
    system.security.access_control.add_custom_permission(
        'flaky_workflow',
        {SecurityLevel.AUTHENTICATED, SecurityLevel.PRIVILEGED, SecurityLevel.ADMIN}
    )
    
    # Step 3: Set up user access levels
    print("Step 3: Setting up user access levels...")
    system.set_user_access_level('user_admin', SecurityLevel.ADMIN)
    system.set_user_access_level('user_auth', SecurityLevel.AUTHENTICATED)
    system.set_user_access_level('user_public', SecurityLevel.PUBLIC)
    
    # Step 4: Initialize monitoring dashboard
    print("Step 4: Initializing Monitoring Dashboard...")
    dashboard = MonitoringDashboard(system)
    dashboard.update_interval = 1.0  # Set update interval to 1 second
    
    # Step 5: Start monitoring in background
    print("Step 5: Starting background monitoring...")
    monitor_task = asyncio.create_task(dashboard.start_monitoring())
    
    print()
    print("-" * 70)
    print("Executing Workflows...")
    print("-" * 70)
    print()
    
    # Step 6: Execute various workflows
    workflows_to_execute = [
        # Video generation requests
        WorkflowRequest(
            workflow_type='video_generation',
            user_id='user_admin',
            prompt='A beautiful sunset over mountains',
            parameters={'duration': 5, 'resolution': '1920x1080'}
        ),
        WorkflowRequest(
            workflow_type='video_generation',
            user_id='user_auth',
            prompt='Ocean waves crashing on beach',
            parameters={'duration': 3, 'resolution': '1280x720'}
        ),
        
        # Image generation requests
        WorkflowRequest(
            workflow_type='image_generation',
            user_id='user_admin',
            prompt='Futuristic city skyline',
            parameters={'style': 'cyberpunk'}
        ),
        WorkflowRequest(
            workflow_type='image_generation',
            user_id='user_auth',
            prompt='Peaceful forest scene',
            parameters={'style': 'realistic'}
        ),
        
        # Flaky workflow requests (to test resilience)
        *[
            WorkflowRequest(
                workflow_type='flaky_workflow',
                user_id='user_auth',
                prompt=f'Test request {i}'
            )
            for i in range(10)
        ],
    ]
    
    # Execute workflows
    results = []
    for i, request in enumerate(workflows_to_execute, 1):
        print(f"[{i}/{len(workflows_to_execute)}] Executing {request.workflow_type}...")
        
        try:
            result = await system.execute_workflow(request)
            results.append(result)
            
            if result.success:
                print(f"  ✅ Success (time: {result.execution_time:.3f}s)")
                if result.retry_count > 0:
                    print(f"     (recovered after {result.retry_count} retries)")
            else:
                print(f"  ❌ Failed: {result.error}")
                
        except Exception as e:
            print(f"  ❌ Exception: {e}")
            results.append(None)
    
    print()
    print("-" * 70)
    print("Workflow Execution Complete")
    print("-" * 70)
    print()
    
    # Step 7: Wait for monitoring to collect final metrics
    print("Step 7: Collecting final metrics...")
    await asyncio.sleep(2)
    
    # Step 8: Stop monitoring
    print("Step 8: Stopping monitoring...")
    dashboard.stop_monitoring()
    await asyncio.sleep(0.5)  # Give time for monitoring to stop
    
    # Step 9: Get system status
    print()
    print("=" * 70)
    print("System Status Report")
    print("=" * 70)
    print()
    
    status = system.get_system_status()
    
    print("Execution Statistics:")
    print(f"  Total Requests:      {status['execution_stats']['total_requests']}")
    print(f"  Successful:          {status['execution_stats']['successful_requests']}")
    print(f"  Failed:              {status['execution_stats']['failed_requests']}")
    print(f"  Security Blocked:    {status['execution_stats']['security_blocked']}")
    if 'success_rate' in status['execution_stats']:
        print(f"  Success Rate:        {status['execution_stats']['success_rate']:.1%}")
    print()
    
    print("Security Status:")
    if 'security_stats' in status:
        print(f"  Total Validations:   {status['security_stats']['total_validations']}")
        print(f"  Passed:              {status['security_stats']['passed_validations']}")
        print(f"  Failed:              {status['security_stats']['failed_validations']}")
    else:
        print("  (Security stats not available)")
    print()
    
    print("Resilience Status:")
    if 'resilience_stats' in status:
        print(f"  Total Errors:        {status['resilience_stats']['total_errors']}")
        print(f"  Retries:             {status['resilience_stats']['total_retries']}")
        print(f"  Circuit Breakers:    {status['resilience_stats']['circuit_breakers_open']}")
    else:
        print("  (Resilience stats not available)")
    print()
    
    # Step 10: Get dashboard data
    print("=" * 70)
    print("Monitoring Dashboard Data")
    print("=" * 70)
    print()
    
    dashboard_data = dashboard.get_dashboard_data()
    
    print(f"Health Score:        {dashboard_data['health_score']:.1f}/100")
    print()
    
    print("Active Alerts:")
    if 'alerts' in dashboard_data and 'active_alerts' in dashboard_data['alerts']:
        if dashboard_data['alerts']['active_alerts']:
            for alert in dashboard_data['alerts']['active_alerts']:
                print(f"  [{alert['severity'].upper()}] {alert['message']}")
        else:
            print("  No active alerts")
    else:
        print("  (Alert data not available)")
    print()
    
    print("Key Metrics:")
    if 'metrics' in dashboard_data:
        for metric_name, stats in dashboard_data['metrics'].items():
            if stats['count'] > 0:
                print(f"  {metric_name}:")
                print(f"    Latest: {stats['latest']:.3f}")
                print(f"    Average: {stats['avg']:.3f}")
                print(f"    Min/Max: {stats['min']:.3f} / {stats['max']:.3f}")
    else:
        print("  (Metrics not available)")
    print()
    
    # Step 11: Export dashboard
    print("=" * 70)
    print("Exporting Dashboard")
    print("=" * 70)
    print()
    
    output_dir = Path('examples/output')
    output_dir.mkdir(exist_ok=True)
    
    html_path = output_dir / 'monitoring_dashboard.html'
    json_path = output_dir / 'monitoring_metrics.json'
    
    print(f"Exporting HTML dashboard to: {html_path}")
    dashboard.export_dashboard_html(html_path)
    
    print(f"Exporting JSON metrics to: {json_path}")
    dashboard.export_metrics_json(json_path)
    
    print()
    print("✅ Dashboard exported successfully!")
    print()
    
    # Step 12: Generate comprehensive report
    print("=" * 70)
    print("Generating Comprehensive Report")
    print("=" * 70)
    print()
    
    report_path = output_dir / 'system_report.json'
    print(f"Saving report to: {report_path}")
    
    report = system.generate_comprehensive_report()
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2, default=str)
    
    print()
    print("✅ Report generated successfully!")
    print()
    
    # Summary
    print("=" * 70)
    print("Example Complete!")
    print("=" * 70)
    print()
    print("Summary:")
    print(f"  - Executed {len(workflows_to_execute)} workflows")
    print(f"  - Successful: {status['execution_stats']['successful_requests']}")
    print(f"  - Failed: {status['execution_stats']['failed_requests']}")
    print(f"  - Health score: {dashboard_data['health_score']:.1f}/100")
    print(f"  - Exported dashboard to: {output_dir}")
    print()
    print("Next steps:")
    print(f"  1. Open {html_path} in your browser")
    print(f"  2. Review {json_path} for detailed metrics")
    print(f"  3. Check {report_path} for comprehensive system report")
    print()


if __name__ == '__main__':
    asyncio.run(main())
