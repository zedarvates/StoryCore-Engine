"""
CLI Interface for Advanced Video Quality Monitor

Command-line interface for video quality analysis and monitoring
specifically designed for advanced ComfyUI workflows.

Author: StoryCore-Engine Team
Version: 1.0.0
"""

import click
import json
import sys
from pathlib import Path
from typing import Optional

from advanced_video_quality_monitor import (
    AdvancedVideoQualityMonitor,
    QualityConfig,
    QualityThresholds,
    create_quality_monitor
)


@click.group()
@click.version_option(version="1.0.0")
def cli():
    """Advanced Video Quality Monitor CLI - Comprehensive video quality analysis for ComfyUI workflows."""
    pass


@cli.command()
@click.argument('video_path', type=click.Path(exists=False))
@click.option('--workflow-type', '-w', default='auto', 
              help='Workflow type (hunyuan_t2v, hunyuan_i2v, wan_alpha_t2v, wan_inpainting, legacy, auto)')
@click.option('--output', '-o', type=click.Path(), 
              help='Output path for quality report (JSON format)')
@click.option('--temporal-threshold', type=float, default=0.75,
              help='Temporal consistency threshold (0.0-1.0)')
@click.option('--visual-threshold', type=float, default=0.80,
              help='Visual quality threshold (0.0-1.0)')
@click.option('--motion-threshold', type=float, default=0.70,
              help='Motion smoothness threshold (0.0-1.0)')
@click.option('--artifact-threshold', type=float, default=0.85,
              help='Artifact detection threshold (0.0-1.0)')
@click.option('--enable-alpha/--disable-alpha', default=False,
              help='Enable alpha channel analysis')
@click.option('--enable-realtime/--disable-realtime', default=True,
              help='Enable real-time analysis mode')
@click.option('--sample-rate', type=float, default=1.0,
              help='Frame sampling rate (0.1-1.0)')
@click.option('--max-time', type=float, default=300.0,
              help='Maximum analysis time in seconds')
@click.option('--verbose', '-v', is_flag=True,
              help='Enable verbose output')
def analyze(video_path: str, workflow_type: str, output: Optional[str],
           temporal_threshold: float, visual_threshold: float, motion_threshold: float,
           artifact_threshold: float, enable_alpha: bool, enable_realtime: bool,
           sample_rate: float, max_time: float, verbose: bool):
    """Analyze video quality for advanced ComfyUI workflows."""
    
    if verbose:
        click.echo(f"🎬 Analyzing video: {video_path}")
        click.echo(f"   Workflow type: {workflow_type}")
        click.echo(f"   Alpha analysis: {'enabled' if enable_alpha else 'disabled'}")
    
    try:
        # Create configuration
        thresholds = QualityThresholds(
            temporal_consistency=temporal_threshold,
            visual_quality=visual_threshold,
            motion_smoothness=motion_threshold,
            artifact_detection=artifact_threshold
        )
        
        config = QualityConfig(
            thresholds=thresholds,
            enable_real_time=enable_realtime,
            enable_alpha_analysis=enable_alpha,
            sample_frame_rate=sample_rate,
            max_analysis_time=max_time,
            output_detailed_reports=True
        )
        
        # Create monitor and analyze
        monitor = AdvancedVideoQualityMonitor(config)
        report = monitor.analyze_video(video_path, workflow_type)
        
        # Display results
        click.echo(f"\n📊 Quality Analysis Results")
        click.echo(f"{'='*50}")
        click.echo(f"Overall Score: {report.overall_score:.3f}")
        click.echo(f"Grade: {monitor._score_to_grade(report.overall_score)}")
        click.echo(f"Analysis Time: {report.analysis_time:.2f}s")
        click.echo(f"Frame Count: {report.frame_count}")
        click.echo(f"Resolution: {report.resolution[1]}x{report.resolution[0]}")
        click.echo(f"Duration: {report.duration:.1f}s")
        
        # Display metrics
        if report.metric_scores:
            click.echo(f"\n📈 Quality Metrics:")
            for metric, score in report.metric_scores.items():
                grade = monitor._score_to_grade(score)
                threshold = monitor._get_threshold(metric)
                status = "✅ PASS" if score >= threshold else "❌ FAIL"
                click.echo(f"   {metric.value}: {score:.3f} ({grade}) {status}")
        
        # Display issues
        if report.issues:
            click.echo(f"\n⚠️ Quality Issues ({len(report.issues)}):")
            for issue in report.issues:
                severity_icon = {
                    "critical": "🔴",
                    "high": "🟠", 
                    "medium": "🟡",
                    "low": "🔵",
                    "info": "ℹ️"
                }.get(issue.severity.value, "❓")
                
                click.echo(f"   {severity_icon} {issue.description}")
                if verbose and issue.suggested_fix:
                    click.echo(f"      💡 {issue.suggested_fix}")
        
        # Display suggestions
        if report.improvement_suggestions:
            click.echo(f"\n💡 Improvement Suggestions:")
            for suggestion in report.improvement_suggestions:
                click.echo(f"   • {suggestion}")
        
        # Export report if requested
        if output:
            success = monitor.export_quality_report(video_path, output)
            if success:
                click.echo(f"\n📄 Report exported to: {output}")
            else:
                click.echo(f"\n❌ Failed to export report to: {output}")
        
        # Exit with appropriate code
        critical_issues = [i for i in report.issues if i.severity.value == "critical"]
        if critical_issues:
            click.echo(f"\n🔴 Critical issues detected - exiting with error code")
            sys.exit(1)
        elif report.overall_score < 0.6:
            click.echo(f"\n⚠️ Low quality score - exiting with warning code")
            sys.exit(2)
        else:
            click.echo(f"\n✅ Quality analysis completed successfully")
            sys.exit(0)
            
    except Exception as e:
        click.echo(f"\n❌ Analysis failed: {e}")
        if verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


@cli.command()
@click.option('--format', 'output_format', type=click.Choice(['table', 'json']), default='table',
              help='Output format')
def metrics():
    """List available quality metrics and their descriptions."""
    
    from advanced_video_quality_monitor import QualityMetric
    
    metrics_info = {
        QualityMetric.TEMPORAL_CONSISTENCY: "Frame-to-frame consistency over time",
        QualityMetric.MOTION_SMOOTHNESS: "Smoothness of motion without jerky movements",
        QualityMetric.VISUAL_QUALITY: "Overall visual quality (sharpness, contrast, brightness)",
        QualityMetric.ARTIFACT_DETECTION: "Detection of visual artifacts and noise",
        QualityMetric.ALPHA_CHANNEL_QUALITY: "Quality of alpha channel for transparency",
        QualityMetric.INPAINTING_QUALITY: "Quality of inpainting and hole filling",
        QualityMetric.FRAME_STABILITY: "Stability of frames without flickering",
        QualityMetric.COLOR_CONSISTENCY: "Consistency of colors across frames",
        QualityMetric.EDGE_COHERENCE: "Coherence of edges across frames",
        QualityMetric.TEXTURE_PRESERVATION: "Preservation of texture details"
    }
    
    if output_format == 'json':
        data = {metric.value: desc for metric, desc in metrics_info.items()}
        click.echo(json.dumps(data, indent=2))
    else:
        click.echo("📊 Available Quality Metrics")
        click.echo("=" * 50)
        for metric, description in metrics_info.items():
            click.echo(f"{metric.value:25} | {description}")


@cli.command()
@click.option('--format', 'output_format', type=click.Choice(['table', 'json']), default='table',
              help='Output format')
def workflows():
    """List supported workflow types."""
    
    workflows_info = {
        'hunyuan_t2v': 'HunyuanVideo Text-to-Video generation',
        'hunyuan_i2v': 'HunyuanVideo Image-to-Video generation',
        'hunyuan_upscale': 'HunyuanVideo super-resolution upscaling',
        'wan_alpha_t2v': 'Wan Video Alpha Text-to-Video with transparency',
        'wan_inpainting': 'Wan Video inpainting and hole filling',
        'legacy': 'Legacy video engine workflows',
        'auto': 'Automatic workflow detection'
    }
    
    if output_format == 'json':
        click.echo(json.dumps(workflows_info, indent=2))
    else:
        click.echo("🎬 Supported Workflow Types")
        click.echo("=" * 50)
        for workflow, description in workflows_info.items():
            click.echo(f"{workflow:20} | {description}")


@cli.command()
@click.argument('config_path', type=click.Path())
@click.option('--template', type=click.Choice(['strict', 'moderate', 'lenient']), default='moderate',
              help='Configuration template to use')
def create_config(config_path: str, template: str):
    """Create a configuration file template."""
    
    templates = {
        'strict': QualityThresholds(
            temporal_consistency=0.90,
            visual_quality=0.90,
            motion_smoothness=0.85,
            artifact_detection=0.90,
            alpha_channel_quality=0.90,
            frame_stability=0.85,
            color_consistency=0.85,
            edge_coherence=0.80,
            texture_preservation=0.85
        ),
        'moderate': QualityThresholds(
            temporal_consistency=0.75,
            visual_quality=0.80,
            motion_smoothness=0.70,
            artifact_detection=0.85,
            alpha_channel_quality=0.85,
            frame_stability=0.75,
            color_consistency=0.80,
            edge_coherence=0.75,
            texture_preservation=0.80
        ),
        'lenient': QualityThresholds(
            temporal_consistency=0.60,
            visual_quality=0.65,
            motion_smoothness=0.55,
            artifact_detection=0.70,
            alpha_channel_quality=0.70,
            frame_stability=0.60,
            color_consistency=0.65,
            edge_coherence=0.60,
            texture_preservation=0.65
        )
    }
    
    thresholds = templates[template]
    config = QualityConfig(
        thresholds=thresholds,
        enable_real_time=True,
        enable_artifact_detection=True,
        enable_temporal_analysis=True,
        enable_alpha_analysis=False,
        sample_frame_rate=1.0,
        max_analysis_time=300.0,
        output_detailed_reports=True,
        auto_improvement=False
    )
    
    # Convert to dictionary for JSON serialization
    config_dict = {
        'thresholds': {
            'temporal_consistency': thresholds.temporal_consistency,
            'motion_smoothness': thresholds.motion_smoothness,
            'visual_quality': thresholds.visual_quality,
            'artifact_detection': thresholds.artifact_detection,
            'alpha_channel_quality': thresholds.alpha_channel_quality,
            'inpainting_quality': thresholds.inpainting_quality,
            'frame_stability': thresholds.frame_stability,
            'color_consistency': thresholds.color_consistency,
            'edge_coherence': thresholds.edge_coherence,
            'texture_preservation': thresholds.texture_preservation
        },
        'settings': {
            'enable_real_time': config.enable_real_time,
            'enable_artifact_detection': config.enable_artifact_detection,
            'enable_temporal_analysis': config.enable_temporal_analysis,
            'enable_alpha_analysis': config.enable_alpha_analysis,
            'sample_frame_rate': config.sample_frame_rate,
            'max_analysis_time': config.max_analysis_time,
            'output_detailed_reports': config.output_detailed_reports,
            'auto_improvement': config.auto_improvement
        },
        'metadata': {
            'template': template,
            'version': '1.0.0',
            'description': f'{template.title()} quality thresholds for video analysis'
        }
    }
    
    try:
        with open(config_path, 'w') as f:
            json.dump(config_dict, f, indent=2)
        
        click.echo(f"✅ Configuration template created: {config_path}")
        click.echo(f"   Template: {template}")
        click.echo(f"   Temporal threshold: {thresholds.temporal_consistency}")
        click.echo(f"   Visual threshold: {thresholds.visual_quality}")
        
    except Exception as e:
        click.echo(f"❌ Failed to create configuration: {e}")
        sys.exit(1)


@cli.command()
@click.argument('video_paths', nargs=-1, required=True)
@click.option('--workflow-type', '-w', default='auto',
              help='Workflow type for all videos')
@click.option('--output-dir', '-d', type=click.Path(),
              help='Output directory for reports')
@click.option('--parallel', '-p', is_flag=True,
              help='Process videos in parallel (future feature)')
@click.option('--summary', '-s', is_flag=True,
              help='Generate summary report')
def batch(video_paths: tuple, workflow_type: str, output_dir: Optional[str],
          parallel: bool, summary: bool):
    """Batch analyze multiple videos."""
    
    if not video_paths:
        click.echo("❌ No video paths provided")
        sys.exit(1)
    
    if parallel:
        click.echo("⚠️ Parallel processing not yet implemented - processing sequentially")
    
    click.echo(f"🎬 Batch analyzing {len(video_paths)} videos")
    
    # Create output directory if specified
    if output_dir:
        Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    # Create monitor
    monitor = create_quality_monitor()
    results = []
    
    for i, video_path in enumerate(video_paths, 1):
        click.echo(f"\n[{i}/{len(video_paths)}] Analyzing: {Path(video_path).name}")
        
        try:
            report = monitor.analyze_video(video_path, workflow_type)
            results.append({
                'video_path': video_path,
                'overall_score': report.overall_score,
                'grade': monitor._score_to_grade(report.overall_score),
                'issues_count': len(report.issues),
                'analysis_time': report.analysis_time
            })
            
            click.echo(f"   Score: {report.overall_score:.3f} ({monitor._score_to_grade(report.overall_score)})")
            click.echo(f"   Issues: {len(report.issues)}")
            
            # Export individual report if output directory specified
            if output_dir:
                output_path = Path(output_dir) / f"{Path(video_path).stem}_quality_report.json"
                monitor.export_quality_report(video_path, str(output_path))
            
        except Exception as e:
            click.echo(f"   ❌ Failed: {e}")
            results.append({
                'video_path': video_path,
                'overall_score': 0.0,
                'grade': 'F',
                'issues_count': 1,
                'analysis_time': 0.0,
                'error': str(e)
            })
    
    # Generate summary
    if summary or len(results) > 1:
        click.echo(f"\n📊 Batch Analysis Summary")
        click.echo("=" * 50)
        
        successful = [r for r in results if 'error' not in r]
        failed = [r for r in results if 'error' in r]
        
        if successful:
            avg_score = sum(r['overall_score'] for r in successful) / len(successful)
            total_issues = sum(r['issues_count'] for r in successful)
            total_time = sum(r['analysis_time'] for r in successful)
            
            click.echo(f"Successful: {len(successful)}/{len(results)}")
            click.echo(f"Average Score: {avg_score:.3f}")
            click.echo(f"Total Issues: {total_issues}")
            click.echo(f"Total Time: {total_time:.1f}s")
        
        if failed:
            click.echo(f"Failed: {len(failed)}")
        
        # Export summary if output directory specified
        if output_dir:
            summary_path = Path(output_dir) / "batch_summary.json"
            with open(summary_path, 'w') as f:
                json.dump({
                    'summary': {
                        'total_videos': len(results),
                        'successful': len(successful),
                        'failed': len(failed),
                        'average_score': avg_score if successful else 0.0,
                        'total_issues': total_issues if successful else 0,
                        'total_time': total_time if successful else 0.0
                    },
                    'results': results
                }, f, indent=2)
            click.echo(f"\n📄 Summary exported to: {summary_path}")


if __name__ == '__main__':
    cli()