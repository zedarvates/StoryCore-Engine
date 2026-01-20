"""
Metadata extraction for the Public Roadmap System.

This module provides functionality to extract structured metadata from spec markdown
files, including frontmatter parsing, title/description extraction, and intelligent
inference of categories and priorities.
"""

import logging
import re
import yaml
from pathlib import Path
from typing import Any, Dict, Optional
from .models import FeatureCategory, Priority


# Configure logging
logger = logging.getLogger(__name__)


class MetadataExtractor:
    """
    Extracts and infers metadata from specification markdown files.
    
    This class handles:
    - YAML frontmatter parsing
    - Title and description extraction from markdown content
    - Category inference from spec names and content
    - Priority inference from content analysis
    """
    
    # Category inference patterns based on spec names
    CATEGORY_PATTERNS = {
        FeatureCategory.UI: [
            r'ui-', r'-ui$', r'wizard', r'dialog', r'modal', r'dashboard',
            r'interface', r'frontend', r'component', r'layout', r'theme'
        ],
        FeatureCategory.BACKEND: [
            r'backend', r'api', r'server', r'service', r'engine',
            r'processor', r'handler', r'integration'
        ],
        FeatureCategory.INFRASTRUCTURE: [
            r'infrastructure', r'deployment', r'docker', r'cloud',
            r'aws', r'azure', r'kubernetes', r'ci-cd', r'pipeline'
        ],
        FeatureCategory.DOCUMENTATION: [
            r'doc', r'readme', r'guide', r'tutorial', r'documentation'
        ],
        FeatureCategory.TESTING: [
            r'test', r'qa', r'quality', r'validation', r'coverage'
        ],
        FeatureCategory.TOOLING: [
            r'cli', r'tool', r'script', r'automation', r'build',
            r'config', r'setup'
        ],
        FeatureCategory.MIGRATION: [
            r'migration', r'refactor', r'restructure', r'reorganization',
            r'upgrade', r'modernization'
        ],
    }
    
    # Priority keywords for content analysis
    HIGH_PRIORITY_KEYWORDS = [
        'critical', 'urgent', 'blocker', 'security', 'bug', 'fix',
        'production', 'essential', 'required', 'must have'
    ]
    
    MEDIUM_PRIORITY_KEYWORDS = [
        'important', 'should', 'enhancement', 'improvement', 'optimize',
        'performance', 'feature', 'add', 'implement'
    ]
    
    LOW_PRIORITY_KEYWORDS = [
        'nice to have', 'optional', 'future', 'consider', 'explore',
        'polish', 'minor', 'cosmetic', 'cleanup'
    ]
    
    def extract_frontmatter(self, file_path: Path) -> Dict[str, Any]:
        """
        Extract YAML frontmatter from a markdown file.
        
        Frontmatter is expected to be at the beginning of the file, delimited
        by '---' markers:
        
        ---
        priority: High
        category: UI
        timeline: Q1 2026
        ---
        
        Args:
            file_path: Path to the markdown file
            
        Returns:
            Dictionary containing parsed frontmatter, or empty dict if none found
            or if parsing fails
            
        Raises:
            FileNotFoundError: If file_path doesn't exist
            ValueError: If file cannot be read
        """
        if not file_path.exists():
            logger.error("File not found: %s", file_path)
            raise FileNotFoundError(f"File not found: {file_path}")
        
        try:
            content = file_path.read_text(encoding='utf-8')
        except PermissionError as e:
            logger.error("Permission denied reading %s: %s", file_path, e)
            raise ValueError(f"Permission denied reading {file_path}: {e}")
        except UnicodeDecodeError as e:
            logger.error("Unicode decode error reading %s: %s", file_path, e)
            raise ValueError(f"Failed to decode {file_path} as UTF-8: {e}")
        except OSError as e:
            logger.error("OS error reading %s: %s", file_path, e)
            raise ValueError(f"Failed to read {file_path}: {e}")
        except Exception as e:
            logger.error("Unexpected error reading %s: %s", file_path, e, exc_info=True)
            raise ValueError(f"Failed to read {file_path}: {e}")
        
        try:
            # Match frontmatter pattern: --- ... ---
            frontmatter_pattern = r'^---\s*\n(.*?)\n---\s*\n'
            match = re.match(frontmatter_pattern, content, re.DOTALL)
            
            if not match:
                logger.debug("No frontmatter found in %s", file_path)
                return {}
            
            frontmatter_text = match.group(1)
            
            # Parse YAML
            try:
                metadata = yaml.safe_load(frontmatter_text)
                if not isinstance(metadata, dict):
                    logger.warning("Frontmatter in %s is not a dictionary, ignoring", file_path)
                    return {}
                logger.debug("Extracted frontmatter from %s: %d fields", file_path, len(metadata))
                return metadata
            except yaml.YAMLError as e:
                # Log warning but don't fail - return empty dict
                logger.warning("Failed to parse YAML frontmatter in %s: %s", file_path, e)
                return {}
                
        except Exception as e:
            logger.error("Unexpected error extracting frontmatter from %s: %s", file_path, e, exc_info=True)
            return {}
    
    def extract_title(self, content: str) -> str:
        """
        Extract the first H1 heading from markdown content.
        
        Looks for the first line starting with '# ' and returns the text
        after the hash mark.
        
        Args:
            content: Markdown content as string
            
        Returns:
            The title text, or empty string if no H1 found
            
        Raises:
            ValueError: If content is not a string
        """
        if not isinstance(content, str):
            logger.error("Content must be a string, got %s", type(content))
            raise ValueError(f"Content must be a string, got {type(content)}")
        
        try:
            # Match first H1 heading (# Title)
            h1_pattern = r'^#\s+(.+?)$'
            match = re.search(h1_pattern, content, re.MULTILINE)
            
            if match:
                title = match.group(1).strip()
                logger.debug("Extracted title: %s", title[:50])
                return title
            
            logger.debug("No H1 heading found in content")
            return ""
            
        except Exception as e:
            logger.error("Error extracting title: %s", e, exc_info=True)
            return ""
    
    def extract_description(self, content: str) -> str:
        """
        Extract the first paragraph after the title from markdown content.
        
        Skips the frontmatter and title, then returns the first non-empty
        paragraph of text.
        
        Args:
            content: Markdown content as string
            
        Returns:
            The description text, or empty string if no paragraph found
            
        Raises:
            ValueError: If content is not a string
        """
        if not isinstance(content, str):
            logger.error("Content must be a string, got %s", type(content))
            raise ValueError(f"Content must be a string, got {type(content)}")
        
        try:
            # Remove frontmatter if present
            content_without_frontmatter = re.sub(
                r'^---\s*\n.*?\n---\s*\n',
                '',
                content,
                count=1,
                flags=re.DOTALL
            )
            
            # Remove the first H1 heading
            content_without_title = re.sub(
                r'^#\s+.+?$\n*',
                '',
                content_without_frontmatter,
                count=1,
                flags=re.MULTILINE
            )
            
            # Find first non-empty paragraph
            # Split by double newlines and filter empty lines
            paragraphs = [
                p.strip() 
                for p in content_without_title.split('\n\n')
                if p.strip() and not p.strip().startswith('#')
            ]
            
            if paragraphs:
                # Return first paragraph, clean up extra whitespace
                description = ' '.join(paragraphs[0].split())
                logger.debug("Extracted description: %s", description[:50])
                return description
            
            logger.debug("No description paragraph found in content")
            return ""
            
        except Exception as e:
            logger.error("Error extracting description: %s", e, exc_info=True)
            return ""
    
    def infer_category(self, spec_name: str, content: str = "") -> FeatureCategory:
        """
        Infer feature category from spec name and content.
        
        Uses pattern matching on the spec directory name to determine the
        most likely category. Falls back to content analysis if name patterns
        don't match.
        
        Args:
            spec_name: The kebab-case spec directory name
            content: Optional markdown content for additional analysis
            
        Returns:
            The inferred FeatureCategory, defaults to TOOLING if no match
            
        Raises:
            ValueError: If spec_name is not a string
        """
        if not isinstance(spec_name, str):
            logger.error("spec_name must be a string, got %s", type(spec_name))
            raise ValueError(f"spec_name must be a string, got {type(spec_name)}")
        
        if not isinstance(content, str):
            logger.warning("content must be a string, got %s, using empty string", type(content))
            content = ""
        
        try:
            spec_name_lower = spec_name.lower()
            
            # Check each category's patterns in priority order
            # More specific patterns should be checked first
            priority_order = [
                FeatureCategory.INFRASTRUCTURE,
                FeatureCategory.DOCUMENTATION,
                FeatureCategory.UI,
                FeatureCategory.BACKEND,
                FeatureCategory.TESTING,
                FeatureCategory.MIGRATION,
                FeatureCategory.TOOLING,
            ]
            
            for category in priority_order:
                patterns = self.CATEGORY_PATTERNS[category]
                for pattern in patterns:
                    try:
                        if re.search(pattern, spec_name_lower):
                            logger.debug("Inferred category %s from spec name: %s", category.value, spec_name)
                            return category
                    except re.error as e:
                        logger.warning("Invalid regex pattern %s: %s", pattern, e)
                        continue
            
            # If no name match and content provided, analyze content
            if content:
                content_lower = content.lower()
                
                # Count category keyword occurrences in content
                category_scores = {}
                for category, patterns in self.CATEGORY_PATTERNS.items():
                    score = 0
                    for pattern in patterns:
                        try:
                            score += len(re.findall(pattern, content_lower))
                        except re.error as e:
                            logger.warning("Invalid regex pattern %s: %s", pattern, e)
                            continue
                    if score > 0:
                        category_scores[category] = score
                
                # Return category with highest score
                if category_scores:
                    inferred = max(category_scores.items(), key=lambda x: x[1])[0]
                    logger.debug("Inferred category %s from content analysis", inferred.value)
                    return inferred
            
            # Default to TOOLING if no matches
            logger.debug("No category match found, defaulting to TOOLING")
            return FeatureCategory.TOOLING
            
        except Exception as e:
            logger.error("Error inferring category: %s", e, exc_info=True)
            return FeatureCategory.TOOLING
    
    def infer_priority(self, content: str, dependencies: list = None) -> Priority:
        """
        Infer feature priority from content analysis and dependencies.
        
        Analyzes the content for priority-related keywords and considers
        the number of dependencies to determine priority level.
        
        Args:
            content: Markdown content to analyze
            dependencies: List of dependent feature names (optional)
            
        Returns:
            The inferred Priority level
            
        Raises:
            ValueError: If content is not a string
        """
        if not isinstance(content, str):
            logger.error("content must be a string, got %s", type(content))
            raise ValueError(f"content must be a string, got {type(content)}")
        
        if dependencies is not None and not isinstance(dependencies, list):
            logger.warning("dependencies must be a list, got %s, ignoring", type(dependencies))
            dependencies = None
        
        try:
            content_lower = content.lower()
            
            # Count keyword occurrences for each priority level
            high_count = sum(
                content_lower.count(keyword)
                for keyword in self.HIGH_PRIORITY_KEYWORDS
            )
            
            medium_count = sum(
                content_lower.count(keyword)
                for keyword in self.MEDIUM_PRIORITY_KEYWORDS
            )
            
            low_count = sum(
                content_lower.count(keyword)
                for keyword in self.LOW_PRIORITY_KEYWORDS
            )
            
            # Factor in dependencies - more dependencies suggests higher priority
            dependency_factor = 0
            if dependencies:
                dependency_count = len(dependencies)
                if dependency_count >= 3:
                    dependency_factor = 2  # Boost to high
                elif dependency_count >= 1:
                    dependency_factor = 1  # Boost to medium
            
            # Determine priority based on keyword counts and dependencies
            if high_count > 0 or dependency_factor >= 2:
                logger.debug("Inferred HIGH priority (high_count=%d, dep_factor=%d)", high_count, dependency_factor)
                return Priority.HIGH
            elif low_count > medium_count and dependency_factor == 0:
                logger.debug("Inferred LOW priority (low_count=%d, medium_count=%d)", low_count, medium_count)
                return Priority.LOW
            else:
                # Default to MEDIUM for most cases
                logger.debug("Inferred MEDIUM priority (default)")
                return Priority.MEDIUM
                
        except Exception as e:
            logger.error("Error inferring priority: %s", e, exc_info=True)
            return Priority.MEDIUM
