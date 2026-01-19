#!/usr/bin/env python3
"""
Monitoring Configuration Validation Script
Validates the complete monitoring and alerting setup for StoryCore Engine.
"""

import asyncio
import json
import os
import sys
import yaml
from pathlib import Path
from typing import Dict, List, Tuple
import requests
import subprocess
import time

class MonitoringValidator:
    """Validates monitoring configuration and setup."""

    def __init__(self, base_dir: str = None):
        self.base_dir = Path(base_dir or Path(__file__).parent.parent)
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.successes: List[str] = []

    def log_error(self, msg: str):
        """Log an error."""
        self.errors.append(msg)
        print(f"❌ {msg}")

    def log_warning(self, msg: str):
        """Log a warning."""
        self.warnings.append(msg)
        print(f"⚠️  {msg}")

    def log_success(self, msg: str):
        """Log a success."""
        self.successes.append(msg)
        print(f"✅ {msg}")

    def validate_yaml_file(self, file_path: Path, schema_check: bool = False) -> bool:
        """Validate YAML file syntax."""
        try:
            with open(file_path, 'r') as f:
                data = yaml.safe_load(f)
            self.log_success(f"YAML syntax valid: {file_path.name}")
            return True
        except yaml.YAMLError as e:
            self.log_error(f"YAML syntax error in {file_path.name}: {e}")
            return False
        except FileNotFoundError:
            self.log_error(f"File not found: {file_path}")
            return False

    def validate_prometheus_config(self) -> bool:
        """Validate Prometheus configuration."""
        config_file = self.base_dir / "deployment/monitoring/prometheus.yml"
        if not self.validate_yaml_file(config_file):
            return False

        # Additional Prometheus-specific validation
        try:
            with open(config_file, 'r') as f:
                config = yaml.safe_load(f)

            # Check required sections
            required_sections = ['global', 'rule_files', 'scrape_configs']
            for section in required_sections:
                if section not in config:
                    self.log_error(f"Missing required section '{section}' in prometheus.yml")
                    return False

            # Check scrape configs
            scrape_configs = config.get('scrape_configs', [])
            if not scrape_configs:
                self.log_error("No scrape configurations found")
                return False

            # Validate job names and targets
            for job in scrape_configs:
                if 'job_name' not in job:
                    self.log_error("Scrape config missing job_name")
                    continue

                job_name = job['job_name']
                if 'static_configs' in job:
                    targets = job['static_configs'][0].get('targets', [])
                    if not targets:
                        self.log_warning(f"No targets configured for job '{job_name}'")

            self.log_success("Prometheus configuration validation passed")
            return True

        except Exception as e:
            self.log_error(f"Error validating Prometheus config: {e}")
            return False

    def validate_alertmanager_config(self) -> bool:
        """Validate Alertmanager configuration."""
        config_file = self.base_dir / "deployment/monitoring/alertmanager.yml"
        if not self.validate_yaml_file(config_file):
            return False

        try:
            with open(config_file, 'r') as f:
                config = yaml.safe_load(f)

            # Check required sections
            required_sections = ['global', 'route', 'receivers']
            for section in required_sections:
                if section not in config:
                    self.log_error(f"Missing required section '{section}' in alertmanager.yml")
                    return False

            # Validate receivers
            receivers = config.get('receivers', [])
            if not receivers:
                self.log_error("No receivers configured")
                return False

            # Check for environment variables in sensitive data
            global_config = config.get('global', {})
            smtp_password = global_config.get('smtp_auth_password', '')
            if smtp_password and not smtp_password.startswith('${'):
                self.log_warning("SMTP password should be environment variable")

            self.log_success("Alertmanager configuration validation passed")
            return True

        except Exception as e:
            self.log_error(f"Error validating Alertmanager config: {e}")
            return False

    def validate_alert_rules(self) -> bool:
        """Validate alert rules."""
        rules_file = self.base_dir / "deployment/monitoring/alert_rules.yml"
        if not self.validate_yaml_file(rules_file):
            return False

        try:
            with open(rules_file, 'r') as f:
                config = yaml.safe_load(f)

            groups = config.get('groups', [])
            if not groups:
                self.log_error("No alert rule groups found")
                return False

            total_rules = 0
            for group in groups:
                group_name = group.get('name', 'unnamed')
                rules = group.get('rules', [])

                if not rules:
                    self.log_warning(f"No rules in group '{group_name}'")
                    continue

                for rule in rules:
                    if 'alert' not in rule:
                        self.log_error(f"Rule missing 'alert' field in group '{group_name}'")
                        continue

                    alert_name = rule['alert']
                    if 'expr' not in rule:
                        self.log_error(f"Alert '{alert_name}' missing 'expr' field")
                        continue

                    total_rules += 1

            self.log_success(f"Alert rules validation passed: {total_rules} rules in {len(groups)} groups")
            return True

        except Exception as e:
            self.log_error(f"Error validating alert rules: {e}")
            return False

    def validate_grafana_dashboards(self) -> bool:
        """Validate Grafana dashboard JSON."""
        dashboards_dir = self.base_dir / "deployment/monitoring/grafana/dashboards"

        if not dashboards_dir.exists():
            self.log_error("Grafana dashboards directory not found")
            return False

        dashboard_files = list(dashboards_dir.glob("*.json"))
        if not dashboard_files:
            self.log_error("No dashboard JSON files found")
            return False

        valid_dashboards = 0
        for dashboard_file in dashboard_files:
            try:
                with open(dashboard_file, 'r') as f:
                    dashboard = json.load(f)

                # Basic validation
                if 'dashboard' not in dashboard:
                    self.log_error(f"Dashboard {dashboard_file.name} missing 'dashboard' key")
                    continue

                dashboard_config = dashboard['dashboard']
                title = dashboard_config.get('title', 'Untitled')

                self.log_success(f"Dashboard '{title}' JSON valid")

                valid_dashboards += 1

            except json.JSONDecodeError as e:
                self.log_error(f"Invalid JSON in dashboard {dashboard_file.name}: {e}")
            except Exception as e:
                self.log_error(f"Error validating dashboard {dashboard_file.name}: {e}")

        if valid_dashboards == 0:
            self.log_error("No valid dashboards found")
            return False

        return True

    def validate_grafana_config(self) -> bool:
        """Validate Grafana configuration."""
        config_file = self.base_dir / "deployment/monitoring/grafana/grafana.ini"

        if not config_file.exists():
            self.log_error("Grafana config file not found")
            return False

        # Basic INI validation (simplified)
        try:
            with open(config_file, 'r') as f:
                content = f.read()

            # Check for required sections
            required_sections = ['[server]', '[security]', '[database]']
            for section in required_sections:
                if section not in content:
                    self.log_error(f"Missing section '{section}' in grafana.ini")
                    return False

            self.log_success("Grafana configuration file exists and has required sections")
            return True

        except Exception as e:
            self.log_error(f"Error validating Grafana config: {e}")
            return False

    def validate_application_health_endpoints(self) -> bool:
        """Validate that health endpoints exist in application code."""
        api_server = self.base_dir / "src/api_server.py"

        if not api_server.exists():
            self.log_error("API server file not found")
            return False

        try:
            with open(api_server, 'r') as f:
                content = f.read()

            # Check for health endpoints
            health_endpoints = ['@app.get("/health")', '@app.get("/ready")', '@app.get("/metrics")']

            for endpoint in health_endpoints:
                if endpoint not in content:
                    self.log_error(f"Missing health endpoint: {endpoint}")
                    return False

            self.log_success("Application health endpoints found in code")
            return True

        except Exception as e:
            self.log_error(f"Error validating application endpoints: {e}")
            return False

    def validate_runbooks(self) -> bool:
        """Validate that runbooks exist."""
        runbooks_dir = self.base_dir / "docs/runbooks"

        if not runbooks_dir.exists():
            self.log_error("Runbooks directory not found")
            return False

        runbook_files = list(runbooks_dir.glob("*.md"))
        if len(runbook_files) < 2:
            self.log_warning("Few runbook files found (expected at least 2)")
            return False

        self.log_success(f"Found {len(runbook_files)} runbook files")
        return True

    async def test_service_connectivity(self) -> bool:
        """Test connectivity to monitoring services (if running)."""
        services = [
            ("Prometheus", "http://localhost:9090", "/-/healthy"),
            ("Alertmanager", "http://localhost:9093", "/-/healthy"),
            ("Grafana", "http://localhost:3000", "/api/health"),
            ("StoryCore API", "http://localhost:8080", "/health"),
        ]

        connectivity_results = []
        for name, base_url, health_path in services:
            try:
                url = base_url + health_path
                response = requests.get(url, timeout=5)

                if response.status_code == 200:
                    self.log_success(f"{name} is accessible")
                    connectivity_results.append(True)
                else:
                    self.log_warning(f"{name} returned status {response.status_code}")
                    connectivity_results.append(False)

            except requests.exceptions.RequestException:
                self.log_warning(f"{name} is not accessible (may not be running)")
                connectivity_results.append(None)  # Not running is OK for validation
            except Exception as e:
                self.log_error(f"Error testing {name}: {e}")
                connectivity_results.append(False)

        # At least some services should be testable
        successful_tests = sum(1 for r in connectivity_results if r is True)
        if successful_tests == 0:
            self.log_warning("No services are currently running - this is OK for config validation")
            return True

        return True

    def run_validation(self) -> bool:
        """Run all validations."""
        print("🔍 Starting Monitoring Configuration Validation\n")

        validations = [
            ("Prometheus Configuration", self.validate_prometheus_config),
            ("Alertmanager Configuration", self.validate_alertmanager_config),
            ("Alert Rules", self.validate_alert_rules),
            ("Grafana Dashboards", self.validate_grafana_dashboards),
            ("Grafana Configuration", self.validate_grafana_config),
            ("Application Health Endpoints", self.validate_application_health_endpoints),
            ("Runbooks", self.validate_runbooks),
        ]

        all_passed = True
        for name, validator in validations:
            print(f"\n📋 Validating {name}...")
            try:
                if not validator():
                    all_passed = False
            except Exception as e:
                self.log_error(f"Validation failed for {name}: {e}")
                all_passed = False

        print("\n🌐 Testing Service Connectivity...")
        asyncio.run(self.test_service_connectivity())

        # Summary
        print("\n📊 Validation Summary:")
        print(f"✅ Successes: {len(self.successes)}")
        print(f"⚠️  Warnings: {len(self.warnings)}")
        print(f"❌ Errors: {len(self.errors)}")

        if self.errors:
            print("\n❌ Critical Issues Found:")
            for error in self.errors:
                print(f"  - {error}")

        if self.warnings:
            print("\n⚠️  Warnings:")
            for warning in self.warnings:
                print(f"  - {warning}")

        overall_success = len(self.errors) == 0 and all_passed

        if overall_success:
            print("\n🎉 All validations passed! Monitoring setup is ready for production.")
        else:
            print("\n💥 Validation failed. Please fix the errors before deploying.")
        return overall_success


def main():
    """Main entry point."""
    validator = MonitoringValidator()

    success = validator.run_validation()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()