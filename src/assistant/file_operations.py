"""
Secure file operations manager for StoryCore AI Assistant

Handles all file system operations with security validation and path restrictions.
All operations are restricted to the designated project directory.
"""

from pathlib import Path
from typing import List, Optional
import json
import shutil

from .exceptions import (
    SecurityError,
    PathValidationError,
    ConfirmationRequiredError,
    ResourceError
)
from .logging_config import get_logger

logger = get_logger(__name__)


class FileOperationsManager:
    """
    Secure file operations within project directory
    
    All file operations (read, write, delete) are validated to ensure they
    only access files within the designated project directory. This prevents
    directory traversal attacks and unauthorized file access.
    """
    
    def __init__(self, project_directory: Path):
        """
        Initialize file operations manager
        
        Args:
            project_directory: Root directory for all project files
        """
        self.project_directory = Path(project_directory).resolve()
        
        # Ensure project directory exists
        self.project_directory.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"FileOperationsManager initialized with directory: {self.project_directory}")
    
    def validate_path(self, path: Path) -> bool:
        """
        Validate that path is within project directory
        
        This method prevents directory traversal attacks by:
        1. Resolving the path to its absolute form
        2. Checking if it's within the project directory
        3. Handling symbolic links and relative paths
        
        Args:
            path: Path to validate
            
        Returns:
            True if path is valid and within project directory
            
        Raises:
            PathValidationError: If path is outside project directory
        """
        try:
            # Convert to Path object if string
            if isinstance(path, str):
                path = Path(path)
            
            # Resolve to absolute path (follows symlinks)
            resolved = path.resolve()
            
            # Check if path is relative to project directory
            try:
                resolved.relative_to(self.project_directory)
                logger.debug(f"Path validation successful: {path}")
                return True
            except ValueError:
                # Path is outside project directory
                logger.warning(f"Path validation failed: {path} is outside {self.project_directory}")
                raise PathValidationError(
                    path=str(path),
                    reason=f"Path is outside project directory: {self.project_directory}"
                )
        
        except (OSError, RuntimeError) as e:
            # Handle invalid paths, circular symlinks, etc.
            logger.error(f"Path validation error for {path}: {e}")
            raise PathValidationError(
                path=str(path),
                reason=f"Invalid path: {str(e)}"
            )
    
    def read_file(self, path: Path) -> bytes:
        """
        Read file with path validation
        
        Args:
            path: Path to file to read
            
        Returns:
            File contents as bytes
            
        Raises:
            PathValidationError: If path is outside project directory
            ResourceError: If file doesn't exist or can't be read
        """
        # Validate path
        self.validate_path(path)
        
        try:
            path = Path(path)
            if not path.exists():
                raise ResourceError(
                    message=f"File not found: {path}",
                    code="FILE_NOT_FOUND",
                    details={"path": str(path)},
                    suggested_action="Check file path and try again"
                )
            
            if not path.is_file():
                raise ResourceError(
                    message=f"Path is not a file: {path}",
                    code="NOT_A_FILE",
                    details={"path": str(path)},
                    suggested_action="Provide a file path, not a directory"
                )
            
            content = path.read_bytes()
            logger.info(f"Read file: {path} ({len(content)} bytes)")
            return content
        
        except (OSError, IOError) as e:
            logger.error(f"Error reading file {path}: {e}")
            raise ResourceError(
                message=f"Failed to read file: {str(e)}",
                code="FILE_READ_ERROR",
                details={"path": str(path), "error": str(e)},
                suggested_action="Check file permissions and try again"
            )
    
    def read_json(self, path: Path) -> dict:
        """
        Read and parse JSON file
        
        Args:
            path: Path to JSON file
            
        Returns:
            Parsed JSON data as dictionary
            
        Raises:
            PathValidationError: If path is outside project directory
            ResourceError: If file doesn't exist or can't be parsed
        """
        content = self.read_file(path)
        
        try:
            data = json.loads(content.decode('utf-8'))
            logger.debug(f"Parsed JSON from {path}")
            return data
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error in {path}: {e}")
            raise ResourceError(
                message=f"Invalid JSON in file: {str(e)}",
                code="JSON_PARSE_ERROR",
                details={"path": str(path), "error": str(e)},
                suggested_action="Check JSON syntax and try again"
            )
    
    def write_file(self, path: Path, content: bytes) -> None:
        """
        Write file with path validation
        
        Creates parent directories if they don't exist.
        
        Args:
            path: Path to file to write
            content: File contents as bytes
            
        Raises:
            PathValidationError: If path is outside project directory
            ResourceError: If file can't be written
        """
        # Validate path
        self.validate_path(path)
        
        try:
            path = Path(path)
            
            # Create parent directories
            path.parent.mkdir(parents=True, exist_ok=True)
            
            # Write file
            path.write_bytes(content)
            logger.info(f"Wrote file: {path} ({len(content)} bytes)")
        
        except (OSError, IOError) as e:
            logger.error(f"Error writing file {path}: {e}")
            raise ResourceError(
                message=f"Failed to write file: {str(e)}",
                code="FILE_WRITE_ERROR",
                details={"path": str(path), "error": str(e)},
                suggested_action="Check disk space and permissions"
            )
    
    def write_json(self, path: Path, data: dict, indent: int = 2) -> None:
        """
        Write data to JSON file
        
        Args:
            path: Path to JSON file
            data: Data to write
            indent: JSON indentation level
            
        Raises:
            PathValidationError: If path is outside project directory
            ResourceError: If file can't be written
        """
        try:
            content = json.dumps(data, indent=indent).encode('utf-8')
            self.write_file(path, content)
            logger.debug(f"Wrote JSON to {path}")
        except (TypeError, ValueError) as e:
            logger.error(f"JSON serialization error: {e}")
            raise ResourceError(
                message=f"Failed to serialize JSON: {str(e)}",
                code="JSON_SERIALIZATION_ERROR",
                details={"path": str(path), "error": str(e)},
                suggested_action="Check data structure and try again"
            )
    
    def delete_file(self, path: Path, confirmed: bool = False) -> bool:
        """
        Delete file with confirmation requirement
        
        Args:
            path: Path to file to delete
            confirmed: Whether deletion has been confirmed by user
            
        Returns:
            True if file was deleted
            
        Raises:
            PathValidationError: If path is outside project directory
            ConfirmationRequiredError: If deletion not confirmed
            ResourceError: If file can't be deleted
        """
        # Validate path
        self.validate_path(path)
        
        path = Path(path)
        
        # Check if file exists
        if not path.exists():
            logger.warning(f"Attempted to delete non-existent file: {path}")
            return False
        
        # Require confirmation for deletion
        if not confirmed:
            file_size = path.stat().st_size if path.is_file() else None
            logger.info(f"Deletion requires confirmation: {path}")
            raise ConfirmationRequiredError(
                message=f"Deletion requires explicit confirmation: {path}",
                file_path=str(path),
                file_size=file_size
            )
        
        try:
            if path.is_file():
                path.unlink()
                logger.info(f"Deleted file: {path}")
            elif path.is_dir():
                shutil.rmtree(path)
                logger.info(f"Deleted directory: {path}")
            
            return True
        
        except (OSError, IOError) as e:
            logger.error(f"Error deleting {path}: {e}")
            raise ResourceError(
                message=f"Failed to delete file: {str(e)}",
                code="FILE_DELETE_ERROR",
                details={"path": str(path), "error": str(e)},
                suggested_action="Check file permissions and try again"
            )
    
    def list_files(self, pattern: str = "*", recursive: bool = True) -> List[Path]:
        """
        List files matching pattern within project directory
        
        Args:
            pattern: Glob pattern to match (default: "*" for all files)
            recursive: Whether to search recursively
            
        Returns:
            List of matching file paths
        """
        try:
            if recursive:
                files = list(self.project_directory.rglob(pattern))
            else:
                files = list(self.project_directory.glob(pattern))
            
            # Filter to only files (not directories)
            files = [f for f in files if f.is_file()]
            
            logger.debug(f"Listed {len(files)} files matching pattern '{pattern}'")
            return files
        
        except (OSError, ValueError) as e:
            logger.error(f"Error listing files with pattern '{pattern}': {e}")
            raise ResourceError(
                message=f"Failed to list files: {str(e)}",
                code="FILE_LIST_ERROR",
                details={"pattern": pattern, "error": str(e)},
                suggested_action="Check pattern syntax and try again"
            )
    
    def file_exists(self, path: Path) -> bool:
        """
        Check if file exists within project directory
        
        Args:
            path: Path to check
            
        Returns:
            True if file exists
        """
        try:
            self.validate_path(path)
            return Path(path).exists()
        except PathValidationError:
            return False
    
    def get_file_size(self, path: Path) -> int:
        """
        Get file size in bytes
        
        Args:
            path: Path to file
            
        Returns:
            File size in bytes
            
        Raises:
            PathValidationError: If path is outside project directory
            ResourceError: If file doesn't exist
        """
        self.validate_path(path)
        
        path = Path(path)
        if not path.exists():
            raise ResourceError(
                message=f"File not found: {path}",
                code="FILE_NOT_FOUND",
                details={"path": str(path)}
            )
        
        return path.stat().st_size
    
    def copy_file(self, source: Path, destination: Path) -> None:
        """
        Copy file within project directory
        
        Args:
            source: Source file path
            destination: Destination file path
            
        Raises:
            PathValidationError: If either path is outside project directory
            ResourceError: If copy fails
        """
        # Validate both paths
        self.validate_path(source)
        self.validate_path(destination)
        
        try:
            source = Path(source)
            destination = Path(destination)
            
            if not source.exists():
                raise ResourceError(
                    message=f"Source file not found: {source}",
                    code="FILE_NOT_FOUND",
                    details={"path": str(source)}
                )
            
            # Create destination directory
            destination.parent.mkdir(parents=True, exist_ok=True)
            
            # Copy file
            shutil.copy2(source, destination)
            logger.info(f"Copied file: {source} -> {destination}")
        
        except (OSError, IOError) as e:
            logger.error(f"Error copying file {source} to {destination}: {e}")
            raise ResourceError(
                message=f"Failed to copy file: {str(e)}",
                code="FILE_COPY_ERROR",
                details={"source": str(source), "destination": str(destination), "error": str(e)},
                suggested_action="Check disk space and permissions"
            )
    
    def move_file(self, source: Path, destination: Path) -> None:
        """
        Move file within project directory
        
        Args:
            source: Source file path
            destination: Destination file path
            
        Raises:
            PathValidationError: If either path is outside project directory
            ResourceError: If move fails
        """
        # Validate both paths
        self.validate_path(source)
        self.validate_path(destination)
        
        try:
            source = Path(source)
            destination = Path(destination)
            
            if not source.exists():
                raise ResourceError(
                    message=f"Source file not found: {source}",
                    code="FILE_NOT_FOUND",
                    details={"path": str(source)}
                )
            
            # Create destination directory
            destination.parent.mkdir(parents=True, exist_ok=True)
            
            # Move file
            shutil.move(str(source), str(destination))
            logger.info(f"Moved file: {source} -> {destination}")
        
        except (OSError, IOError) as e:
            logger.error(f"Error moving file {source} to {destination}: {e}")
            raise ResourceError(
                message=f"Failed to move file: {str(e)}",
                code="FILE_MOVE_ERROR",
                details={"source": str(source), "destination": str(destination), "error": str(e)},
                suggested_action="Check disk space and permissions"
            )
