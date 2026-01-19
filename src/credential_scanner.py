"""
Credential Scanner Module

Scans code files for hardcoded credentials including passwords, API keys, and tokens.
Generates detailed violation reports with file location, line number, type, and severity.
"""

import re
from pathlib import Path
from dataclasses import dataclass
from typing import List, Optional
from enum import Enum


class CredentialType(Enum):
    """Types of credentials that can be detected."""
    PASSWORD = "password"
    API_KEY = "api_key"
    TOKEN = "token"
    SECRET = "secret"
    PRIVATE_KEY = "private_key"
    AWS_KEY = "aws_key"
    DATABASE_URL = "database_url"


class Severity(Enum):
    """Severity levels for credential violations."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass
class CredentialViolation:
    """Represents a detected credential violation."""
    file_path: Path
    line_number: int
    credential_type: CredentialType
    severity: Severity
    context: str
    matched_pattern: str
    
    def __str__(self) -> str:
        return (
            f"[{self.severity.value.upper()}] {self.credential_type.value} "
            f"found in {self.file_path}:{self.line_number}\n"
            f"Context: {self.context[:80]}..."
        )


class CredentialScanner:
    """
    Scans files and directories for hardcoded credentials.
    
    Uses pattern matching to detect various types of credentials including:
    - Passwords
    - API keys
    - Authentication tokens
    - AWS credentials
    - Database connection strings
    - Private keys
    """
    
    # Pattern definitions for different credential types
    PATTERNS = {
        CredentialType.PASSWORD: [
            (r'password\s*=\s*["\']([^"\']{3,})["\']', Severity.CRITICAL),
            (r'passwd\s*=\s*["\']([^"\']{3,})["\']', Severity.CRITICAL),
            (r'pwd\s*=\s*["\']([^"\']{3,})["\']', Severity.CRITICAL),
            (r'PASSWORD\s*=\s*["\']([^"\']{3,})["\']', Severity.CRITICAL),
        ],
        CredentialType.API_KEY: [
            (r'api[_-]?key\s*=\s*["\']([^"\']{10,})["\']', Severity.CRITICAL),
            (r'apikey\s*=\s*["\']([^"\']{10,})["\']', Severity.CRITICAL),
            (r'API[_-]?KEY\s*=\s*["\']([^"\']{10,})["\']', Severity.CRITICAL),
            (r'key\s*=\s*["\']([A-Za-z0-9]{20,})["\']', Severity.HIGH),
        ],
        CredentialType.TOKEN: [
            (r'token\s*=\s*["\']([^"\']{10,})["\']', Severity.CRITICAL),
            (r'auth[_-]?token\s*=\s*["\']([^"\']{10,})["\']', Severity.CRITICAL),
            (r'access[_-]?token\s*=\s*["\']([^"\']{10,})["\']', Severity.CRITICAL),
            (r'bearer\s+([A-Za-z0-9\-._~+/]+=*)', Severity.CRITICAL),
        ],
        CredentialType.SECRET: [
            (r'secret\s*=\s*["\']([^"\']{10,})["\']', Severity.CRITICAL),
            (r'client[_-]?secret\s*=\s*["\']([^"\']{10,})["\']', Severity.CRITICAL),
            (r'SECRET\s*=\s*["\']([^"\']{10,})["\']', Severity.CRITICAL),
        ],
        CredentialType.AWS_KEY: [
            (r'AKIA[0-9A-Z]{16}', Severity.CRITICAL),
            (r'aws[_-]?access[_-]?key[_-]?id\s*=\s*["\']([^"\']+)["\']', Severity.CRITICAL),
            (r'aws[_-]?secret[_-]?access[_-]?key\s*=\s*["\']([^"\']+)["\']', Severity.CRITICAL),
        ],
        CredentialType.PRIVATE_KEY: [
            (r'-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----', Severity.CRITICAL),
            (r'private[_-]?key\s*=\s*["\']([^"\']{20,})["\']', Severity.CRITICAL),
        ],
        CredentialType.DATABASE_URL: [
            (r'(?:mysql|postgresql|mongodb)://[^:]+:[^@]+@', Severity.CRITICAL),
            (r'database[_-]?url\s*=\s*["\']([^"\']+:[^"\']+@[^"\']+)["\']', Severity.CRITICAL),
        ],
    }
    
    # Patterns to exclude (false positives)
    EXCLUDE_PATTERNS = [
        r'password\s*=\s*["\'](?:your_password|password|changeme|example|test|dummy|placeholder|<[^>]+>|\{[^}]+\})["\']',
        r'api[_-]?key\s*=\s*["\'](?:your_api_key|api_key|example|test|dummy|placeholder|<[^>]+>|\{[^}]+\})["\']',
        r'token\s*=\s*["\'](?:your_token|token|example|test|dummy|placeholder|<[^>]+>|\{[^}]+\})["\']',
        r'secret\s*=\s*["\'](?:your_secret|secret|example|test|dummy|placeholder|<[^>]+>|\{[^}]+\})["\']',
    ]
    
    # File extensions to scan
    SCANNABLE_EXTENSIONS = {
        '.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.go', '.rb', '.php',
        '.cs', '.cpp', '.c', '.h', '.hpp', '.sh', '.bash', '.zsh', '.yaml',
        '.yml', '.json', '.xml', '.env', '.config', '.conf', '.ini', '.toml'
    }
    
    # Directories to skip
    SKIP_DIRECTORIES = {
        'node_modules', '.git', '.venv', 'venv', '__pycache__', '.pytest_cache',
        'dist', 'build', '.hypothesis', 'coverage', '.coverage', 'htmlcov'
    }
    
    def __init__(self):
        """Initialize the credential scanner."""
        self.compiled_patterns = self._compile_patterns()
        self.compiled_exclude_patterns = [
            re.compile(pattern, re.IGNORECASE) for pattern in self.EXCLUDE_PATTERNS
        ]
    
    def _compile_patterns(self):
        """Compile all regex patterns for efficiency."""
        compiled = {}
        for cred_type, patterns in self.PATTERNS.items():
            compiled[cred_type] = [
                (re.compile(pattern, re.IGNORECASE), severity)
                for pattern, severity in patterns
            ]
        return compiled
    
    def _is_false_positive(self, line: str) -> bool:
        """Check if a line matches any exclude patterns (false positives)."""
        return any(pattern.search(line) for pattern in self.compiled_exclude_patterns)
    
    def _should_scan_file(self, file_path: Path) -> bool:
        """Determine if a file should be scanned based on extension."""
        return file_path.suffix.lower() in self.SCANNABLE_EXTENSIONS
    
    def _should_skip_directory(self, dir_path: Path) -> bool:
        """Determine if a directory should be skipped."""
        return dir_path.name in self.SKIP_DIRECTORIES
    
    def scan_file(self, file_path: Path) -> List[CredentialViolation]:
        """
        Scan a single file for hardcoded credentials.
        
        Args:
            file_path: Path to the file to scan
            
        Returns:
            List of CredentialViolation objects found in the file
        """
        violations = []
        
        if not file_path.exists() or not file_path.is_file():
            return violations
        
        if not self._should_scan_file(file_path):
            return violations
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
            
            for line_num, line in enumerate(lines, start=1):
                # Skip if it's a false positive
                if self._is_false_positive(line):
                    continue
                
                # Check each credential type pattern
                for cred_type, patterns in self.compiled_patterns.items():
                    for pattern, severity in patterns:
                        match = pattern.search(line)
                        if match:
                            violation = CredentialViolation(
                                file_path=file_path,
                                line_number=line_num,
                                credential_type=cred_type,
                                severity=severity,
                                context=line.strip(),
                                matched_pattern=pattern.pattern
                            )
                            violations.append(violation)
                            # Only report first match per line to avoid duplicates
                            break
                    if violations and violations[-1].line_number == line_num:
                        break
        
        except Exception as e:
            # Log error but continue scanning
            print(f"Error scanning {file_path}: {e}")
        
        return violations
    
    def scan_directory(self, directory_path: Path, recursive: bool = True) -> List[CredentialViolation]:
        """
        Scan a directory for hardcoded credentials.
        
        Args:
            directory_path: Path to the directory to scan
            recursive: Whether to scan subdirectories recursively
            
        Returns:
            List of all CredentialViolation objects found in the directory
        """
        violations = []
        
        if not directory_path.exists() or not directory_path.is_dir():
            return violations
        
        try:
            if recursive:
                for item in directory_path.rglob('*'):
                    if item.is_file():
                        # Check if any parent directory should be skipped
                        if any(self._should_skip_directory(parent) for parent in item.parents):
                            continue
                        violations.extend(self.scan_file(item))
            else:
                for item in directory_path.iterdir():
                    if item.is_file():
                        violations.extend(self.scan_file(item))
        
        except Exception as e:
            print(f"Error scanning directory {directory_path}: {e}")
        
        return violations
    
    def scan_content(self, content: str) -> List[CredentialViolation]:
        """
        Scan string content for hardcoded credentials.
        
        Args:
            content: String content to scan
            
        Returns:
            List of CredentialViolation objects found in the content
        """
        violations = []
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, start=1):
            # Skip if it's a false positive
            if self._is_false_positive(line):
                continue
            
            # Check each credential type pattern
            for cred_type, patterns in self.compiled_patterns.items():
                for pattern, severity in patterns:
                    match = pattern.search(line)
                    if match:
                        violation = CredentialViolation(
                            file_path=Path("<string>"),
                            line_number=line_num,
                            credential_type=cred_type,
                            severity=severity,
                            context=line.strip(),
                            matched_pattern=pattern.pattern
                        )
                        violations.append(violation)
                        # Only report first match per line to avoid duplicates
                        break
                if violations and violations[-1].line_number == line_num:
                    break
        
        return violations
    
    def generate_report(self, violations: List[CredentialViolation]) -> str:
        """
        Generate a formatted report of credential violations.
        
        Args:
            violations: List of violations to report
            
        Returns:
            Formatted string report
        """
        if not violations:
            return "No credential violations found."
        
        report = [
            "=" * 80,
            "CREDENTIAL SECURITY SCAN REPORT",
            "=" * 80,
            f"\nTotal violations found: {len(violations)}\n",
        ]
        
        # Group by severity
        by_severity = {}
        for violation in violations:
            severity = violation.severity
            if severity not in by_severity:
                by_severity[severity] = []
            by_severity[severity].append(violation)
        
        # Report by severity (critical first)
        for severity in [Severity.CRITICAL, Severity.HIGH, Severity.MEDIUM, Severity.LOW]:
            if severity in by_severity:
                report.append(f"\n{severity.value.upper()} SEVERITY ({len(by_severity[severity])} violations):")
                report.append("-" * 80)
                for violation in by_severity[severity]:
                    report.append(f"\n{violation}")
        
        report.append("\n" + "=" * 80)
        return "\n".join(report)


def main():
    """CLI interface for credential scanner."""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python credential_scanner.py <file_or_directory>")
        sys.exit(1)
    
    scanner = CredentialScanner()
    target = Path(sys.argv[1])
    
    if target.is_file():
        violations = scanner.scan_file(target)
    elif target.is_dir():
        violations = scanner.scan_directory(target)
    else:
        print(f"Error: {target} is not a valid file or directory")
        sys.exit(1)
    
    print(scanner.generate_report(violations))
    
    # Exit with error code if violations found
    sys.exit(1 if violations else 0)


if __name__ == "__main__":
    main()
