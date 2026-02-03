"""
GitHub Template Generator Module

Generates Markdown-formatted GitHub issue templates and pre-filled URLs
for the Feedback & Diagnostics system.
"""

import json
import urllib.parse
from typing import Dict, Any
from src.feedback_error_logger import log_error


class GitHubTemplateGenerator:
    """Generates GitHub issue templates and URLs for feedback submissions."""
    
    def __init__(self, repository: str = "zedarvates/StoryCore-Engine"):
        """
        Initialize the GitHub template generator.
        
        Args:
            repository: GitHub repository in format "owner/repo"
        """
        self.repository = repository
        self.github_base_url = f"https://github.com/{repository}"
    
    def format_issue_body(self, payload: Dict[str, Any]) -> str:
        """
        Generate structured Markdown template from report payload.
        
        Requirements: 6.1, 8.3
        
        Args:
            payload: Report payload dictionary containing all report data
            
        Returns:
            Markdown-formatted issue body string with sections:
            - Report Type
            - System Context
            - Description
            - Reproduction Steps
            - Diagnostics (with collapsible details)
            - Screenshot (if provided)
        """
        try:
            # Extract data from payload with safe defaults
            report_type = payload.get("report_type", "bug")
            system_info = payload.get("system_info", {})
            module_context = payload.get("module_context", {})
            user_input = payload.get("user_input", {})
            diagnostics = payload.get("diagnostics", {})
            screenshot_base64 = payload.get("screenshot_base64")
            
            # Map report type to display name
            report_type_display = {
                "bug": "Bug Report",
                "enhancement": "Feature Request",
                "question": "Question"
            }.get(report_type, "Bug Report")
            
            # Build the template
            template_parts = []
            
            # Report Type section
            template_parts.append(f"## Report Type\n{report_type_display}\n")
            
            # System Context section
            template_parts.append("## System Context")
            template_parts.append(f"- **StoryCore Version:** {system_info.get('storycore_version', 'unknown')}")
            template_parts.append(f"- **Active Module:** {module_context.get('active_module', 'unknown')}")
            template_parts.append(f"- **OS Platform:** {system_info.get('os_platform', 'unknown')} {system_info.get('os_version', '')}")
            template_parts.append(f"- **Python Version:** {system_info.get('python_version', 'unknown')}")
            template_parts.append(f"- **Language:** {system_info.get('language', 'en_US')}\n")
            
            # Description section
            description = user_input.get("description", "No description provided")
            template_parts.append(f"## Description\n{description}\n")
            
            # Reproduction Steps section
            reproduction_steps = user_input.get("reproduction_steps", "")
            if reproduction_steps:
                template_parts.append(f"## Reproduction Steps\n{reproduction_steps}\n")
            
            # Diagnostics section with collapsible details
            template_parts.append("## Diagnostics")
            
            # Stacktrace (collapsible)
            stacktrace = diagnostics.get("stacktrace")
            if stacktrace:
                template_parts.append("<details>")
                template_parts.append("<summary>Stacktrace</summary>\n")
                template_parts.append("```")
                template_parts.append(stacktrace)
                template_parts.append("```")
                template_parts.append("</details>\n")
            
            # Application Logs (collapsible)
            logs = diagnostics.get("logs", [])
            if logs:
                template_parts.append("<details>")
                template_parts.append("<summary>Application Logs (Last 500 lines)</summary>\n")
                template_parts.append("```")
                template_parts.append("\n".join(logs))
                template_parts.append("```")
                template_parts.append("</details>\n")
            
            # Memory State (collapsible)
            memory_usage = diagnostics.get("memory_usage_mb")
            process_state = diagnostics.get("process_state", {})
            if memory_usage or process_state:
                template_parts.append("<details>")
                template_parts.append("<summary>Memory State</summary>\n")
                template_parts.append("```json")
                memory_data = {
                    "memory_usage_mb": memory_usage,
                    "process_state": process_state
                }
                template_parts.append(json.dumps(memory_data, indent=2))
                template_parts.append("```")
                template_parts.append("</details>\n")
            
            # Screenshot section
            if screenshot_base64:
                template_parts.append("## Screenshot")
                template_parts.append("*Screenshot attached (base64 encoded)*\n")
            
            # Footer
            template_parts.append("---")
            template_parts.append("*This issue was automatically generated by StoryCore-Engine Feedback & Diagnostics module*")
            
            return "\n".join(template_parts)
        
        except Exception as e:
            # Log error and return minimal template
            log_error(
                error_type="TemplateGenerationError",
                message="Failed to format issue body",
                context={"report_type": payload.get("report_type", "unknown")},
                exception=e
            )
            # Return minimal template with error notice
            return f"""## Report Type
Bug Report

## Description
{payload.get("user_input", {}).get("description", "Error generating full template")}

## Error
An error occurred while generating the full issue template. Please review the payload manually.

---
*This issue was automatically generated by StoryCore-Engine Feedback & Diagnostics module*
"""
    
    def generate_github_url(self, payload: Dict[str, Any]) -> str:
        """
        Create pre-filled GitHub issue URL with report data.
        
        Requirements: 1.1, 8.3
        
        Args:
            payload: Report payload dictionary containing all report data
            
        Returns:
            GitHub issue creation URL with pre-filled template in query parameters
        """
        try:
            # Generate the issue body template
            issue_body = self.format_issue_body(payload)
            
            # Generate issue title based on report type and description
            report_type = payload.get("report_type", "bug")
            description = payload.get("user_input", {}).get("description", "")
            
            # Create a concise title (first 80 chars of description)
            title_prefix = {
                "bug": "[Bug]",
                "enhancement": "[Feature Request]",
                "question": "[Question]"
            }.get(report_type, "[Bug]")
            
            # Truncate description for title
            title_description = description[:80] + "..." if len(description) > 80 else description
            issue_title = f"{title_prefix} {title_description}"
            
            # Generate labels
            labels = self._generate_labels(payload)
            
            # Build query parameters
            query_params = {
                "title": issue_title,
                "body": issue_body,
                "labels": ",".join(labels)
            }
            
            # URL encode the parameters
            encoded_params = urllib.parse.urlencode(query_params, safe='')
            
            # Construct the full URL
            github_url = f"{self.github_base_url}/issues/new?{encoded_params}"
            
            return github_url
        
        except Exception as e:
            # Log error and return basic URL
            log_error(
                error_type="URLGenerationError",
                message="Failed to generate GitHub URL",
                context={"repository": self.repository},
                exception=e
            )
            # Return basic issue creation URL without parameters
            return f"{self.github_base_url}/issues/new"
    
    def _generate_labels(self, payload: Dict[str, Any]) -> list:
        """
        Generate issue labels based on payload context.
        
        Requirements: 5.4, 6.2, 6.3, 6.4, 6.5, 6.6
        
        Args:
            payload: Report payload dictionary
            
        Returns:
            List of label strings
        """
        labels = ["from-storycore"]
        
        # Add report type label
        report_type = payload.get("report_type", "bug")
        if report_type == "bug":
            labels.append("bug")
        elif report_type == "enhancement":
            labels.append("enhancement")
        elif report_type == "question":
            labels.append("question")
        
        # Add module label
        module_context = payload.get("module_context", {})
        active_module = module_context.get("active_module")
        if active_module and active_module != "unknown":
            labels.append(f"module:{active_module}")
        
        # Add OS label
        system_info = payload.get("system_info", {})
        os_platform = system_info.get("os_platform", "").lower()
        if "windows" in os_platform:
            labels.append("os:windows")
        elif "darwin" in os_platform or "macos" in os_platform:
            labels.append("os:macos")
        elif "linux" in os_platform:
            labels.append("os:linux")
        
        return labels
