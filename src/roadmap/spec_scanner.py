"""
Spec Scanner component for the Public Roadmap System.

This module provides functionality to discover and enumerate all feature
specifications in the project by recursively scanning the specs directory.
"""

import logging
from pathlib import Path
from typing import List

from .models import SpecFiles


# Configure logging
logger = logging.getLogger(__name__)


class SpecScanner:
    """
    Discovers and enumerates feature specifications in the project.
    
    The SpecScanner recursively walks the specs directory tree and identifies
    valid spec directories based on the presence of specification files
    (requirements.md, design.md, or tasks.md).
    """
    
    def __init__(self, base_path: Path = Path(".kiro/specs")):
        """
        Initialize the SpecScanner.
        
        Args:
            base_path: Root directory containing spec subdirectories
            
        Raises:
            ValueError: If base_path is not a valid path
        """
        if not isinstance(base_path, Path):
            try:
                base_path = Path(base_path)
            except Exception as e:
                logger.error("Invalid base_path provided: %s", e)
                raise ValueError(f"base_path must be a valid path: {e}")
        
        self.base_path = base_path
        logger.debug("SpecScanner initialized with base_path: %s", self.base_path)
    
    def scan_specs_directory(self) -> List[SpecFiles]:
        """
        Recursively scan the specs directory and discover all valid specs.
        
        This method walks the directory tree starting from base_path and
        identifies all directories that contain at least one specification
        file (requirements.md, design.md, or tasks.md).
        
        Returns:
            List of SpecFiles objects, one for each valid spec directory found.
            Returns empty list if base_path doesn't exist or contains no valid specs.
        
        Example:
            >>> scanner = SpecScanner(Path(".kiro/specs"))
            >>> specs = scanner.scan_specs_directory()
            >>> for spec in specs:
            ...     print(f"Found spec: {spec.directory.name}")
        """
        logger.info("Scanning specs directory: %s", self.base_path)
        
        if not self.base_path.exists():
            logger.warning("Specs directory does not exist: %s", self.base_path)
            return []
        
        if not self.base_path.is_dir():
            logger.error("Specs path is not a directory: %s", self.base_path)
            return []
        
        specs = []
        found_spec_dirs = set()
        
        try:
            # Recursively walk the directory tree
            for item in self.base_path.rglob("*"):
                try:
                    # Skip if this is a subdirectory of an already-found spec
                    if any(parent in found_spec_dirs for parent in item.parents):
                        continue
                    
                    # Skip hidden directories (starting with .) relative to base_path
                    # Get the relative path from base_path to check for hidden components
                    try:
                        relative_path = item.relative_to(self.base_path)
                        if any(part.startswith(".") for part in relative_path.parts):
                            continue
                    except ValueError:
                        # item is not relative to base_path, skip it
                        logger.debug("Skipping item not relative to base_path: %s", item)
                        continue
                    
                    # Only process directories
                    if not item.is_dir():
                        continue
                    
                    # Check if this is a valid spec directory
                    if self.is_valid_spec(item):
                        spec_files = self.get_spec_files(item)
                        specs.append(spec_files)
                        found_spec_dirs.add(item)
                        logger.debug("Found valid spec: %s", item.name)
                        
                except PermissionError as e:
                    logger.warning("Permission denied accessing %s: %s", item, e)
                    continue
                except OSError as e:
                    logger.warning("OS error accessing %s: %s", item, e)
                    continue
                except Exception as e:
                    logger.error("Unexpected error processing %s: %s", item, e, exc_info=True)
                    continue
                    
        except PermissionError as e:
            logger.error("Permission denied scanning directory %s: %s", self.base_path, e)
            return []
        except OSError as e:
            logger.error("OS error scanning directory %s: %s", self.base_path, e)
            return []
        except Exception as e:
            logger.error("Unexpected error scanning directory %s: %s", self.base_path, e, exc_info=True)
            return []
        
        logger.info("Found %d valid spec directories", len(specs))
        return specs
    
    def is_valid_spec(self, directory: Path) -> bool:
        """
        Check if a directory is a valid spec directory.
        
        A directory is considered a valid spec if it contains at least one
        of the following files:
        - requirements.md
        - design.md
        - tasks.md
        
        Args:
            directory: Path to the directory to check
        
        Returns:
            True if the directory contains at least one spec file, False otherwise.
        
        Example:
            >>> scanner = SpecScanner()
            >>> is_valid = scanner.is_valid_spec(Path(".kiro/specs/my-feature"))
            >>> print(f"Valid spec: {is_valid}")
        """
        try:
            if not directory.exists() or not directory.is_dir():
                return False
            
            # Check for presence of any spec files
            spec_files = ["requirements.md", "design.md", "tasks.md"]
            
            for spec_file in spec_files:
                try:
                    if (directory / spec_file).exists():
                        return True
                except PermissionError as e:
                    logger.warning("Permission denied checking %s: %s", directory / spec_file, e)
                    continue
                except OSError as e:
                    logger.warning("OS error checking %s: %s", directory / spec_file, e)
                    continue
            
            return False
            
        except Exception as e:
            logger.error("Error validating spec directory %s: %s", directory, e, exc_info=True)
            return False
    
    def get_spec_files(self, directory: Path) -> SpecFiles:
        """
        Collect file paths for all spec files in a directory.
        
        This method examines a spec directory and creates a SpecFiles object
        containing paths to all present specification files (requirements.md,
        design.md, tasks.md).
        
        Args:
            directory: Path to the spec directory
        
        Returns:
            SpecFiles object with paths to found spec files. Files that don't
            exist will have None as their path value.
        
        Raises:
            ValueError: If directory is invalid or inaccessible
        
        Example:
            >>> scanner = SpecScanner()
            >>> spec_files = scanner.get_spec_files(Path(".kiro/specs/my-feature"))
            >>> if spec_files.requirements:
            ...     print(f"Requirements file: {spec_files.requirements}")
        """
        try:
            if not directory.exists():
                logger.error("Directory does not exist: %s", directory)
                raise ValueError(f"Directory does not exist: {directory}")
            
            if not directory.is_dir():
                logger.error("Path is not a directory: %s", directory)
                raise ValueError(f"Path is not a directory: {directory}")
            
            requirements_path = directory / "requirements.md"
            design_path = directory / "design.md"
            tasks_path = directory / "tasks.md"
            
            # Check file accessibility
            for file_path in [requirements_path, design_path, tasks_path]:
                if file_path.exists():
                    try:
                        # Test read access
                        file_path.stat()
                    except PermissionError as e:
                        logger.warning("Permission denied for %s: %s", file_path, e)
                    except OSError as e:
                        logger.warning("OS error accessing %s: %s", file_path, e)
            
            return SpecFiles(
                directory=directory,
                requirements=requirements_path if requirements_path.exists() else None,
                design=design_path if design_path.exists() else None,
                tasks=tasks_path if tasks_path.exists() else None,
                metadata={}  # Will be populated by MetadataExtractor
            )
            
        except Exception as e:
            logger.error("Error getting spec files from %s: %s", directory, e, exc_info=True)
            raise ValueError(f"Failed to get spec files from {directory}: {e}")
