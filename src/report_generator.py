"""
Report Generator Module for StoryCore-Engine.

This module generates comprehensive quality validation reports in JSON and HTML formats,
including visualizations, aggregate statistics, and autofix comparisons.
"""

from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime
import json
import base64
import io
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from quality_validator import QualityScore, QualityIssue, ImprovementSuggestion
from quality_feedback import ImprovementTracking
import numpy as np

class NumpyEncoder(json.JSONEncoder):
    """Custom JSON encoder for numpy types."""
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, np.bool_):
            return bool(obj)
        return super(NumpyEncoder, self).default(obj)


@dataclass
class ReportMetrics:
    """Aggregate metrics for quality validation reports."""

    total_shots: int
    passed_shots: int
    failed_shots: int
    average_overall_score: float
    average_sharpness_score: float
    average_motion_score: float
    average_audio_score: float
    average_continuity_score: float
    critical_issues_count: int
    high_issues_count: int
    medium_issues_count: int
    low_issues_count: int
    total_suggestions: int

    def to_dict(self) -> dict:
        """Serializes metrics to dictionary."""
        return {
            "total_shots": self.total_shots,
            "passed_shots": self.passed_shots,
            "failed_shots": self.failed_shots,
            "pass_rate": (self.passed_shots / self.total_shots * 100) if self.total_shots > 0 else 0.0,
            "average_overall_score": self.average_overall_score,
            "average_sharpness_score": self.average_sharpness_score,
            "average_motion_score": self.average_motion_score,
            "average_audio_score": self.average_audio_score,
            "average_continuity_score": self.average_continuity_score,
            "issues_breakdown": {
                "critical": self.critical_issues_count,
                "high": self.high_issues_count,
                "medium": self.medium_issues_count,
                "low": self.low_issues_count
            },
            "total_suggestions": self.total_suggestions
        }


@dataclass
class AutofixComparison:
    """Before/after comparison for autofix operations."""

    shot_id: str
    before_score: QualityScore
    after_score: QualityScore
    applied_fixes: List[str]
    improvement_delta: float
    timestamp: float

    def to_dict(self) -> dict:
        """Serializes comparison to dictionary."""
        return {
            "shot_id": self.shot_id,
            "before": self.before_score.to_dict(),
            "after": self.after_score.to_dict(),
            "applied_fixes": self.applied_fixes,
            "improvement_delta": self.improvement_delta,
            "timestamp": self.timestamp
        }


class JSONReportGenerator:
    """Generates JSON-format quality validation reports."""

    def generate_comprehensive_report(
        self,
        quality_scores: List[QualityScore],
        project_name: str = "StoryCore Project",
        generation_timestamp: Optional[float] = None
    ) -> str:
        """
        Generates comprehensive JSON report with all quality metrics and aggregate statistics.

        Args:
            quality_scores: List of quality scores to include
            project_name: Name of the project
            generation_timestamp: Timestamp when report was generated

        Returns:
            JSON string of the comprehensive report
        """
        if generation_timestamp is None:
            generation_timestamp = datetime.now().timestamp()

        # Calculate aggregate metrics
        metrics = self._calculate_aggregate_metrics(quality_scores)

        # Build report structure
        report = {
            "report_type": "comprehensive_quality_validation",
            "project_name": project_name,
            "generation_timestamp": generation_timestamp,
            "generation_datetime": datetime.fromtimestamp(generation_timestamp).isoformat(),
            "metrics": metrics.to_dict(),
            "quality_scores": [score.to_dict() for score in quality_scores],
            "issues_summary": self._summarize_issues(quality_scores),
            "suggestions_summary": self._summarize_suggestions(quality_scores)
        }

        return json.dumps(report, indent=2, cls=NumpyEncoder)

    def _calculate_aggregate_metrics(self, quality_scores: List[QualityScore]) -> ReportMetrics:
        """Calculate aggregate metrics from quality scores."""
        if not quality_scores:
            return ReportMetrics(0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.0, 0, 0, 0, 0, 0)

        total_shots = len(quality_scores)
        passed_shots = sum(1 for score in quality_scores if score.passed())
        failed_shots = total_shots - passed_shots

        avg_overall = sum(score.overall_score for score in quality_scores) / total_shots
        avg_sharpness = sum(score.sharpness_score for score in quality_scores) / total_shots
        avg_motion = sum(score.motion_score for score in quality_scores) / total_shots
        avg_audio = sum(score.audio_score for score in quality_scores) / total_shots
        avg_continuity = sum(score.continuity_score for score in quality_scores) / total_shots

        # Count issues by severity
        critical_count = 0
        high_count = 0
        medium_count = 0
        low_count = 0
        total_suggestions = 0

        for score in quality_scores:
            for issue in score.issues:
                if issue.severity == "critical":
                    critical_count += 1
                elif issue.severity == "high":
                    high_count += 1
                elif issue.severity == "medium":
                    medium_count += 1
                elif issue.severity == "low":
                    low_count += 1
            total_suggestions += len(score.suggestions)

        return ReportMetrics(
            total_shots=total_shots,
            passed_shots=passed_shots,
            failed_shots=failed_shots,
            average_overall_score=round(avg_overall, 2),
            average_sharpness_score=round(avg_sharpness, 2),
            average_motion_score=round(avg_motion, 2),
            average_audio_score=round(avg_audio, 2),
            average_continuity_score=round(avg_continuity, 2),
            critical_issues_count=critical_count,
            high_issues_count=high_count,
            medium_issues_count=medium_count,
            low_issues_count=low_count,
            total_suggestions=total_suggestions
        )

    def _summarize_issues(self, quality_scores: List[QualityScore]) -> Dict[str, Any]:
        """Summarize issues by type and severity."""
        issue_types = {}
        severity_breakdown = {"critical": 0, "high": 0, "medium": 0, "low": 0}

        for score in quality_scores:
            for issue in score.issues:
                # Count by type
                issue_type = issue.issue_type
                if issue_type not in issue_types:
                    issue_types[issue_type] = 0
                issue_types[issue_type] += 1

                # Count by severity
                if issue.severity in severity_breakdown:
                    severity_breakdown[issue.severity] += 1

        return {
            "by_type": issue_types,
            "by_severity": severity_breakdown,
            "total_unique_types": len(issue_types)
        }

    def _summarize_suggestions(self, quality_scores: List[QualityScore]) -> Dict[str, Any]:
        """Summarize suggestions by priority."""
        priority_breakdown = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        total_expected_improvement = 0.0

        for score in quality_scores:
            for suggestion in score.suggestions:
                if suggestion.priority in priority_breakdown:
                    priority_breakdown[suggestion.priority] += 1
                total_expected_improvement += suggestion.expected_improvement

        return {
            "by_priority": priority_breakdown,
            "total_expected_improvement": round(total_expected_improvement, 2)
        }


class AutofixComparisonGenerator:
    """Generates before/after comparisons for autofix operations."""

    def generate_comparison_report(
        self,
        comparisons: List[AutofixComparison],
        project_name: str = "StoryCore Project",
        generation_timestamp: Optional[float] = None
    ) -> str:
        """
        Generates JSON report showing autofix improvements.

        Args:
            comparisons: List of before/after comparisons
            project_name: Name of the project
            generation_timestamp: Timestamp when report was generated

        Returns:
            JSON string of the comparison report
        """
        if generation_timestamp is None:
            generation_timestamp = datetime.now().timestamp()

        # Calculate aggregate improvements
        total_improvement = sum(comp.improvement_delta for comp in comparisons)
        avg_improvement = total_improvement / len(comparisons) if comparisons else 0.0

        successful_fixes = sum(1 for comp in comparisons if comp.improvement_delta > 0)
        success_rate = (successful_fixes / len(comparisons) * 100) if comparisons else 0.0

        # Build report
        report = {
            "report_type": "autofix_comparison",
            "project_name": project_name,
            "generation_timestamp": generation_timestamp,
            "generation_datetime": datetime.fromtimestamp(generation_timestamp).isoformat(),
            "summary": {
                "total_comparisons": len(comparisons),
                "total_improvement": round(total_improvement, 2),
                "average_improvement": round(avg_improvement, 2),
                "successful_fixes": successful_fixes,
                "success_rate": round(success_rate, 2)
            },
            "comparisons": [comp.to_dict() for comp in comparisons]
        }

        return json.dumps(report, indent=2, cls=NumpyEncoder)


class VisualizationGenerator:
    """Generates charts and visualizations for quality metrics."""

    def generate_quality_trends_chart(
        self,
        quality_scores: List[QualityScore],
        timestamps: Optional[List[float]] = None
    ) -> str:
        """
        Generates a chart showing quality metrics over time.

        Args:
            quality_scores: List of quality scores
            timestamps: Corresponding timestamps (if None, uses indices)

        Returns:
            Base64-encoded PNG image data
        """
        if not quality_scores:
            return ""

        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 8))

        # Prepare data
        indices = range(len(quality_scores))
        if timestamps:
            x_data = [datetime.fromtimestamp(ts) for ts in timestamps]
        else:
            x_data = indices

        overall_scores = [score.overall_score for score in quality_scores]
        sharpness_scores = [score.sharpness_score for score in quality_scores]
        motion_scores = [score.motion_score for score in quality_scores]
        audio_scores = [score.audio_score for score in quality_scores]
        continuity_scores = [score.continuity_score for score in quality_scores]

        # Plot overall and component scores
        ax1.plot(x_data, overall_scores, 'k-', linewidth=2, label='Overall', marker='o')
        ax1.plot(x_data, sharpness_scores, 'b-', label='Sharpness', alpha=0.7)
        ax1.plot(x_data, motion_scores, 'g-', label='Motion', alpha=0.7)
        ax1.plot(x_data, audio_scores, 'r-', label='Audio', alpha=0.7)
        ax1.plot(x_data, continuity_scores, 'm-', label='Continuity', alpha=0.7)

        ax1.set_title('Quality Metrics Over Time')
        ax1.set_ylabel('Score (0-100)')
        ax1.legend()
        ax1.grid(True, alpha=0.3)

        if timestamps:
            ax1.xaxis.set_major_formatter(mdates.DateFormatter('%H:%M:%S'))
            plt.setp(ax1.xaxis.get_majorticklabels(), rotation=45)

        # Plot issues count
        issues_count = [len(score.issues) for score in quality_scores]
        ax2.bar(x_data, issues_count, color='orange', alpha=0.7)
        ax2.set_title('Quality Issues Count')
        ax2.set_ylabel('Number of Issues')
        ax2.grid(True, alpha=0.3)

        if timestamps:
            ax2.xaxis.set_major_formatter(mdates.DateFormatter('%H:%M:%S'))
            plt.setp(ax2.xaxis.get_majorticklabels(), rotation=45)

        plt.tight_layout()

        # Convert to base64
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        plt.close(fig)

        return f"data:image/png;base64,{image_base64}"

    def generate_comparison_chart(self, comparisons: List[AutofixComparison]) -> str:
        """
        Generates a chart comparing before/after scores for autofix operations.

        Args:
            comparisons: List of autofix comparisons

        Returns:
            Base64-encoded PNG image data
        """
        if not comparisons:
            return ""

        fig, ax = plt.subplots(figsize=(10, 6))

        # Prepare data
        shot_ids = [comp.shot_id for comp in comparisons]
        before_scores = [comp.before_score.overall_score for comp in comparisons]
        after_scores = [comp.after_score.overall_score for comp in comparisons]
        improvements = [comp.improvement_delta for comp in comparisons]

        x = range(len(comparisons))

        # Plot before/after bars
        ax.bar([i - 0.2 for i in x], before_scores, width=0.4, label='Before Fix', color='red', alpha=0.7)
        ax.bar([i + 0.2 for i in x], after_scores, width=0.4, label='After Fix', color='green', alpha=0.7)

        # Add improvement labels
        for i, imp in enumerate(improvements):
            ax.text(i, max(before_scores[i], after_scores[i]) + 2, f'+{imp:.1f}',
                   ha='center', va='bottom', fontweight='bold')

        ax.set_title('Autofix Quality Improvements')
        ax.set_ylabel('Overall Quality Score')
        ax.set_xticks(x)
        ax.set_xticklabels(shot_ids, rotation=45, ha='right')
        ax.legend()
        ax.grid(True, alpha=0.3)

        plt.tight_layout()

        # Convert to base64
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        plt.close(fig)

        return f"data:image/png;base64,{image_base64}"


class HTMLReportGenerator:
    """Generates HTML-format quality validation reports with embedded visualizations."""

    def __init__(self):
        self.visualization_generator = VisualizationGenerator()

    def generate_comprehensive_report(
        self,
        quality_scores: List[QualityScore],
        project_name: str = "StoryCore Project",
        generation_timestamp: Optional[float] = None,
        include_visualizations: bool = True
    ) -> str:
        """
        Generates comprehensive HTML report with visualizations.

        Args:
            quality_scores: List of quality scores
            project_name: Name of the project
            generation_timestamp: Timestamp when report was generated
            include_visualizations: Whether to include charts

        Returns:
            HTML string of the report
        """
        if generation_timestamp is None:
            generation_timestamp = datetime.now().timestamp()

        json_generator = JSONReportGenerator()
        json_report = json_generator.generate_comprehensive_report(
            quality_scores, project_name, generation_timestamp
        )
        report_data = json.loads(json_report)

        # Generate visualizations
        trends_chart = ""
        if include_visualizations and quality_scores:
            trends_chart = self.visualization_generator.generate_quality_trends_chart(quality_scores)

        # Build HTML
        html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>StoryCore Quality Validation Report</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        .header {{
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #007acc;
            padding-bottom: 20px;
        }}
        .header h1 {{
            color: #007acc;
            margin: 0;
        }}
        .header p {{
            color: #666;
            margin: 5px 0 0 0;
        }}
        .metrics-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        .metric-card {{
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #007acc;
        }}
        .metric-card h3 {{
            margin: 0 0 10px 0;
            color: #333;
            font-size: 1.1em;
        }}
        .metric-value {{
            font-size: 2em;
            font-weight: bold;
            color: #007acc;
        }}
        .chart-container {{
            margin: 30px 0;
            text-align: center;
        }}
        .chart-container img {{
            max-width: 100%;
            height: auto;
            border: 1px solid #ddd;
            border-radius: 8px;
        }}
        .issues-table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }}
        .issues-table th, .issues-table td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }}
        .issues-table th {{
            background-color: #f8f9fa;
            font-weight: bold;
        }}
        .severity-critical {{ color: #dc3545; font-weight: bold; }}
        .severity-high {{ color: #fd7e14; font-weight: bold; }}
        .severity-medium {{ color: #ffc107; }}
        .severity-low {{ color: #28a745; }}
        .summary-section {{
            margin: 30px 0;
        }}
        .summary-section h2 {{
            color: #333;
            border-bottom: 1px solid #ddd;
            padding-bottom: 10px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>StoryCore Quality Validation Report</h1>
            <p>Project: {project_name}</p>
            <p>Generated: {datetime.fromtimestamp(generation_timestamp).strftime('%Y-%m-%d %H:%M:%S')}</p>
        </div>

        <div class="summary-section">
            <h2>Summary Metrics</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <h3>Total Shots</h3>
                    <div class="metric-value">{report_data['metrics']['total_shots']}</div>
                </div>
                <div class="metric-card">
                    <h3>Pass Rate</h3>
                    <div class="metric-value">{report_data['metrics']['pass_rate']:.1f}%</div>
                </div>
                <div class="metric-card">
                    <h3>Average Score</h3>
                    <div class="metric-value">{report_data['metrics']['average_overall_score']:.1f}</div>
                </div>
                <div class="metric-card">
                    <h3>Total Issues</h3>
                    <div class="metric-value">{sum(report_data['metrics']['issues_breakdown'].values())}</div>
                </div>
            </div>
        </div>

        {f'<div class="chart-container"><h2>Quality Trends</h2><img src="{trends_chart}" alt="Quality Trends Chart"></div>' if trends_chart else ''}

        <div class="summary-section">
            <h2>Issues Breakdown</h2>
            <table class="issues-table">
                <thead>
                    <tr>
                        <th>Severity</th>
                        <th>Count</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="severity-critical">Critical</td>
                        <td>{report_data['metrics']['issues_breakdown']['critical']}</td>
                    </tr>
                    <tr>
                        <td class="severity-high">High</td>
                        <td>{report_data['metrics']['issues_breakdown']['high']}</td>
                    </tr>
                    <tr>
                        <td class="severity-medium">Medium</td>
                        <td>{report_data['metrics']['issues_breakdown']['medium']}</td>
                    </tr>
                    <tr>
                        <td class="severity-low">Low</td>
                        <td>{report_data['metrics']['issues_breakdown']['low']}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="summary-section">
            <h2>Detailed Quality Scores</h2>
            <table class="issues-table">
                <thead>
                    <tr>
                        <th>Shot</th>
                        <th>Overall</th>
                        <th>Sharpness</th>
                        <th>Motion</th>
                        <th>Audio</th>
                        <th>Continuity</th>
                        <th>Issues</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
"""

        for i, score in enumerate(quality_scores):
            status = "[PASS]" if score.passed() else "[FAIL]"
            status_class = "severity-low" if score.passed() else "severity-critical"
            html += f"""
                    <tr>
                        <td>{i+1}</td>
                        <td>{score.overall_score:.1f}</td>
                        <td>{score.sharpness_score:.1f}</td>
                        <td>{score.motion_score:.1f}</td>
                        <td>{score.audio_score:.1f}</td>
                        <td>{score.continuity_score:.1f}</td>
                        <td>{len(score.issues)}</td>
                        <td class="{status_class}">{status}</td>
                    </tr>
"""

        html += """
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>
"""

        return html

    def generate_autofix_comparison_report(
        self,
        comparisons: List[AutofixComparison],
        project_name: str = "StoryCore Project",
        generation_timestamp: Optional[float] = None
    ) -> str:
        """
        Generates HTML report for autofix comparisons.

        Args:
            comparisons: List of autofix comparisons
            project_name: Name of the project
            generation_timestamp: Timestamp when report was generated

        Returns:
            HTML string of the comparison report
        """
        if generation_timestamp is None:
            generation_timestamp = datetime.now().timestamp()

        comparison_generator = AutofixComparisonGenerator()
        json_report = comparison_generator.generate_comparison_report(
            comparisons, project_name, generation_timestamp
        )
        report_data = json.loads(json_report)

        # Generate comparison chart
        comparison_chart = self.visualization_generator.generate_comparison_chart(comparisons)

        # Build HTML
        html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>StoryCore Autofix Comparison Report</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        .header {{
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #28a745;
            padding-bottom: 20px;
        }}
        .header h1 {{
            color: #28a745;
            margin: 0;
        }}
        .header p {{
            color: #666;
            margin: 5px 0 0 0;
        }}
        .summary-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        .summary-card {{
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #28a745;
            text-align: center;
        }}
        .summary-card h3 {{
            margin: 0 0 10px 0;
            color: #333;
        }}
        .summary-value {{
            font-size: 2em;
            font-weight: bold;
            color: #28a745;
        }}
        .chart-container {{
            margin: 30px 0;
            text-align: center;
        }}
        .chart-container img {{
            max-width: 100%;
            height: auto;
            border: 1px solid #ddd;
            border-radius: 8px;
        }}
        .comparison-table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }}
        .comparison-table th, .comparison-table td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }}
        .comparison-table th {{
            background-color: #f8f9fa;
            font-weight: bold;
        }}
        .improvement-positive {{ color: #28a745; font-weight: bold; }}
        .improvement-negative {{ color: #dc3545; font-weight: bold; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>StoryCore Autofix Comparison Report</h1>
            <p>Project: {project_name}</p>
            <p>Generated: {datetime.fromtimestamp(generation_timestamp).strftime('%Y-%m-%d %H:%M:%S')}</p>
        </div>

        <div class="summary-grid">
            <div class="summary-card">
                <h3>Total Comparisons</h3>
                <div class="summary-value">{report_data['summary']['total_comparisons']}</div>
            </div>
            <div class="summary-card">
                <h3>Average Improvement</h3>
                <div class="summary-value">{report_data['summary']['average_improvement']:.1f}</div>
            </div>
            <div class="summary-card">
                <h3>Success Rate</h3>
                <div class="summary-value">{report_data['summary']['success_rate']:.1f}%</div>
            </div>
            <div class="summary-card">
                <h3>Total Improvement</h3>
                <div class="summary-value">{report_data['summary']['total_improvement']:.1f}</div>
            </div>
        </div>

        {f'<div class="chart-container"><h2>Autofix Improvements</h2><img src="{comparison_chart}" alt="Autofix Comparison Chart"></div>' if comparison_chart else ''}

        <h2>Detailed Comparisons</h2>
        <table class="comparison-table">
            <thead>
                <tr>
                    <th>Shot ID</th>
                    <th>Before Score</th>
                    <th>After Score</th>
                    <th>Improvement</th>
                    <th>Applied Fixes</th>
                </tr>
            </thead>
            <tbody>
"""

        for comp in comparisons:
            improvement_class = "improvement-positive" if comp.improvement_delta > 0 else "improvement-negative"
            fixes_str = ", ".join(comp.applied_fixes) if comp.applied_fixes else "None"
            html += f"""
                <tr>
                    <td>{comp.shot_id}</td>
                    <td>{comp.before_score.overall_score:.1f}</td>
                    <td>{comp.after_score.overall_score:.1f}</td>
                    <td class="{improvement_class}">{comp.improvement_delta:+.1f}</td>
                    <td>{fixes_str}</td>
                </tr>
"""

        html += """
            </tbody>
        </table>
    </div>
</body>
</html>
"""

        return html