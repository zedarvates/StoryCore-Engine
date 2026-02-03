"""
Asset Manager for StoryCore LLM Memory System.

This module handles asset storage, indexing, and summarization.
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
import uuid

from .data_models import (
    AssetInfo,
    AssetType,
    AssetMetadata,
)


class AssetManager:
    """
    Manages asset storage, indexing, and summarization.
    
    Responsibilities:
    - Store assets in appropriate subdirectories
    - Maintain attachments_index.txt
    - Generate asset metadata
    - Create asset summaries
    
    Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5
    """
    
    ASSETS_DIR = "assets"
    INDEX_FILENAME = "attachments_index.txt"
    SUMMARY_FILENAME = "assets_summary.txt"
    
    # Subdirectory mapping for asset types
    SUBDIRECTORIES = {
        AssetType.IMAGE: "images",
        AssetType.AUDIO: "audio",
        AssetType.VIDEO: "video",
        AssetType.DOCUMENT: "documents",
    }
    
    def __init__(self, project_path: Path):
        """
        Initialize the AssetManager.
        
        Args:
            project_path: Root path for the project
        """
        self.project_path = Path(project_path)
        self.assets_path = self.project_path / self.ASSETS_DIR
        self.index_path = self.assets_path / self.INDEX_FILENAME
        self.summary_path = self.assets_path / self.SUMMARY_FILENAME
    
    def store_asset(
        self, 
        asset_path: Path, 
        asset_type: AssetType,
        description: str = ""
    ) -> Optional[AssetInfo]:
        """
        Copy asset to appropriate subdirectory based on type.
        
        Args:
            asset_path: Path to the source asset
            asset_type: Type of the asset
            description: Optional description
            
        Returns:
            AssetInfo if stored successfully, None otherwise
            
        Validates: Requirement 6.1
        """
        if not asset_path.exists():
            print(f"Asset not found: {asset_path}")
            return None
        
        try:
            # Determine target subdirectory
            subdir = self.SUBDIRECTORIES.get(asset_type, "documents")
            target_dir = self.assets_path / subdir
            target_dir.mkdir(parents=True, exist_ok=True)
            
            # Generate unique filename if needed
            filename = self._generate_unique_filename(asset_path.name, target_dir)
            target_path = target_dir / filename
            
            # Copy file
            self._copy_file(asset_path, target_path)
            
            # Generate asset info
            asset_info = self._create_asset_info(
                filename=filename,
                path=target_path,
                asset_type=asset_type,
                description=description
            )
            
            # Update index
            self.update_index(asset_info)
            
            return asset_info
            
        except Exception as e:
            print(f"Error storing asset: {e}")
            return None
    
    def _generate_unique_filename(self, filename: str, directory: Path) -> str:
        """
        Generate a unique filename if file already exists.
        
        Args:
            filename: Original filename
            directory: Target directory
            
        Returns:
            Unique filename
        """
        name, ext = os.path.splitext(filename)
        counter = 1
        new_filename = filename
        
        while (directory / new_filename).exists():
            new_filename = f"{name}_{counter}{ext}"
            counter += 1
        
        return new_filename
    
    def _copy_file(self, source: Path, target: Path) -> None:
        """Copy a file from source to target."""
        with open(source, 'rb') as src:
            with open(target, 'wb') as dst:
                dst.write(src.read())
    
    def _create_asset_info(
        self,
        filename: str,
        path: Path,
        asset_type: AssetType,
        description: str = ""
    ) -> AssetInfo:
        """Create AssetInfo object for an asset."""
        # Generate metadata
        metadata = self.generate_asset_metadata(path)
        
        # Get file size
        size_bytes = path.stat().st_size if path.exists() else 0
        
        return AssetInfo(
            filename=filename,
            path=path,
            type=asset_type,
            size_bytes=size_bytes,
            timestamp=datetime.now().isoformat(),
            description=description,
            metadata=metadata
        )
    
    def generate_asset_metadata(self, asset_path: Path) -> Optional[AssetMetadata]:
        """
        Extract metadata from an asset file.
        
        Args:
            asset_path: Path to the asset file
            
        Returns:
            AssetMetadata with extracted information
            
        Validates: Requirements 7.2, 7.3
        """
        if not asset_path.exists():
            return None
        
        metadata = AssetMetadata()
        metadata.size_bytes = asset_path.stat().st_size
        metadata.format = asset_path.suffix.lower().lstrip('.')
        
        try:
            # Image metadata
            if self._is_image(asset_path):
                dims = self._get_image_dimensions(asset_path)
                if dims:
                    metadata.dimensions = dims
            
            # Document metadata
            elif self._is_document(asset_path):
                metadata.pages = self._get_document_pages(asset_path)
            
            # Audio/Video metadata
            elif self._is_audio_or_video(asset_path):
                duration = self._get_media_duration(asset_path)
                if duration:
                    metadata.duration = duration
                dims = self._get_video_dimensions(asset_path)
                if dims:
                    metadata.dimensions = dims
        
        except Exception as e:
            print(f"Error extracting metadata: {e}")
        
        return metadata
    
    def _is_image(self, path: Path) -> bool:
        """Check if file is an image."""
        image_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg'}
        return path.suffix.lower() in image_extensions
    
    def _is_document(self, path: Path) -> bool:
        """Check if file is a document."""
        doc_extensions = {'.pdf', '.doc', '.docx', '.txt', '.md', '.rst'}
        return path.suffix.lower() in doc_extensions
    
    def _is_audio_or_video(self, path: Path) -> bool:
        """Check if file is audio or video."""
        media_extensions = {'.mp3', '.wav', '.mp4', '.avi', '.mov', '.mkv', '.webm'}
        return path.suffix.lower() in media_extensions
    
    def _get_image_dimensions(self, path: Path) -> Optional[tuple]:
        """Get image dimensions."""
        try:
            from PIL import Image
            with Image.open(path) as img:
                return img.size
        except ImportError:
            # PIL not available, try simple approach
            pass
        except Exception:
            pass
        return None
    
    def _get_document_pages(self, path: Path) -> Optional[int]:
        """Get document page count."""
        # PDF pages
        if path.suffix.lower() == '.pdf':
            try:
                import PyPDF2
                with open(path, 'rb') as f:
                    reader = PyPDF2.PdfReader(f)
                    return len(reader.pages)
            except ImportError:
                pass
            except Exception:
                pass
        
        # For other document types, return None
        return None
    
    def _get_media_duration(self, path: Path) -> Optional[float]:
        """Get media file duration in seconds."""
        try:
            import mutagen
            audio = mutagen.File(str(path))
            if audio and hasattr(audio, 'info') and hasattr(audio.info, 'length'):
                return audio.info.length
        except ImportError:
            pass
        except Exception:
            pass
        return None
    
    def _get_video_dimensions(self, path: Path) -> Optional[tuple]:
        """Get video dimensions."""
        # This would processing require video libraries
        return None
    
    def update_index(self, asset_info: AssetInfo) -> bool:
        """
        Add entry to attachments_index.txt.
        
        Args:
            asset_info: Information about the asset
            
        Returns:
            True if updated successfully, False otherwise
            
        Validates: Requirement 6.2
        """
        try:
            # Read existing index
            index_content = ""
            if self.index_path.exists():
                with open(self.index_path, 'r', encoding='utf-8') as f:
                    index_content = f.read()
            
            # Create new entry
            entry = self._format_index_entry(asset_info)
            
            # Append to index
            with open(self.index_path, 'a', encoding='utf-8') as f:
                f.write(entry)
            
            return True
            
        except Exception as e:
            print(f"Error updating index: {e}")
            return False
    
    def _format_index_entry(self, asset_info: AssetInfo) -> str:
        """Format an asset info entry for the index."""
        lines = []
        lines.append(f"=== {asset_info.type.value.upper()}: {asset_info.filename} ===")
        lines.append(f"Path: {asset_info.path}")
        lines.append(f"Type: {asset_info.type.value.upper()}")
        lines.append(f"Size: {self._format_size(asset_info.size_bytes)}")
        
        if asset_info.metadata:
            if asset_info.metadata.dimensions:
                lines.append(f"Dimensions: {asset_info.metadata.dimensions[0]}x{asset_info.metadata.dimensions[1]}")
            if asset_info.metadata.duration:
                lines.append(f"Duration: {asset_info.metadata.duration:.1f}s")
            if asset_info.metadata.pages:
                lines.append(f"Pages: {asset_info.metadata.pages}")
        
        lines.append(f"Added: {asset_info.timestamp}")
        
        if asset_info.description:
            lines.append(f"Description: {asset_info.description}")
        
        lines.append("")
        lines.append("")
        
        return "\n".join(lines)
    
    def _format_size(self, size_bytes: int) -> str:
        """Format file size in human-readable format."""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024
        return f"{size_bytes:.1f} TB"
    
    def find_asset(self, query: str) -> List[AssetInfo]:
        """
        Search assets by name, type, or metadata.
        
        Args:
            query: Search query
            
        Returns:
            List of matching assets
            
        Validates: Requirement 6.4
        """
        if not self.index_path.exists():
            return []
        
        results = []
        
        try:
            with open(self.index_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Simple text search (can be enhanced with structured parsing)
            query_lower = query.lower()
            
            if query_lower in content.lower():
                # Parse matching entries
                results = self._parse_index_search(content, query)
        
        except Exception as e:
            print(f"Error searching assets: {e}")
        
        return results
    
    def _parse_index_search(self, content: str, query: str) -> List[AssetInfo]:
        """Parse index content to find matching assets."""
        # This is a simplified implementation
        # A full implementation would parse the structured format
        assets = []
        
        # Scan all assets directory for files
        query_lower = query.lower()
        
        for asset_type, subdir in self.SUBDIRECTORIES.items():
            dir_path = self.assets_path / subdir
            if not dir_path.exists():
                continue
            
            for file_path in dir_path.iterdir():
                if file_path.is_file() and query_lower in file_path.name.lower():
                    metadata = self.generate_asset_metadata(file_path)
                    assets.append(AssetInfo(
                        filename=file_path.name,
                        path=file_path,
                        type=asset_type,
                        size_bytes=file_path.stat().st_size,
                        timestamp=datetime.now().isoformat(),
                        metadata=metadata
                    ))
        
        return assets
    
    def summarize_assets(self) -> bool:
        """
        Generate assets_summary.txt from all assets.
        
        Returns:
            True if summary was generated successfully, False otherwise
            
        Validates: Requirements 7.1, 7.4, 7.5
        """
        try:
            # Collect all assets by type
            assets_by_type = {asset_type: [] for asset_type in AssetType}
            
            for asset_type, subdir in self.SUBDIRECTORIES.items():
                dir_path = self.assets_path / subdir
                if not dir_path.exists():
                    continue
                
                for file_path in dir_path.iterdir():
                    if file_path.is_file():
                        metadata = self.generate_asset_metadata(file_path)
                        asset_info = AssetInfo(
                            filename=file_path.name,
                            path=file_path,
                            type=asset_type,
                            size_bytes=file_path.stat().st_size,
                            timestamp=datetime.now().isoformat(),
                            metadata=metadata
                        )
                        assets_by_type[asset_type].append(asset_info)
            
            # Generate summary content
            summary_content = self._generate_summary_content(assets_by_type)
            
            # Write summary
            with open(self.summary_path, 'w', encoding='utf-8') as f:
                f.write(summary_content)
            
            return True
            
        except Exception as e:
            print(f"Error generating asset summary: {e}")
            return False
    
    def _generate_summary_content(self, assets_by_type: Dict[AssetType, List[AssetInfo]]) -> str:
        """Generate summary content from assets grouped by type."""
        lines = []
        lines.append("=" * 60)
        lines.append("ASSETS SUMMARY")
        lines.append(f"Generated: {datetime.now().isoformat()}")
        lines.append("=" * 60)
        lines.append("")
        
        total_size = 0
        total_count = 0
        
        for asset_type in AssetType:
            assets = assets_by_type.get(asset_type, [])
            if not assets:
                continue
            
            lines.append(f"--- {asset_type.value.upper()} ({len(assets)}) ---")
            lines.append("")
            
            for asset in assets:
                lines.append(f"• {asset.filename}")
                lines.append(f"  Size: {self._format_size(asset.size_bytes)}")
                if asset.metadata:
                    if asset.metadata.dimensions:
                        lines.append(f"  Dimensions: {asset.metadata.dimensions[0]}x{asset.metadata.dimensions[1]}")
                    if asset.metadata.duration:
                        lines.append(f"  Duration: {asset.metadata.duration:.1f}s")
                    if asset.metadata.pages:
                        lines.append(f"  Pages: {asset.metadata.pages}")
                if asset.description:
                    lines.append(f"  Description: {asset.description}")
                lines.append("")
                
                total_size += asset.size_bytes
                total_count += 1
        
        lines.append("=" * 60)
        lines.append(f"TOTAL: {total_count} assets, {self._format_size(total_size)}")
        lines.append("=" * 60)
        
        return "\n".join(lines)
    
    def get_asset_index(self) -> str:
        """
        Get the asset index as a string for LLM consumption.
        
        Returns:
            Asset index content
            
        Validates: Requirements 6.4, 6.5
        """
        if not self.index_path.exists():
            return "No assets indexed."
        
        try:
            with open(self.index_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception:
            return "Error reading asset index."
    
    def get_all_assets(self) -> List[AssetInfo]:
        """
        Get all assets in the project.
        
        Returns:
            List of all assets
        """
        all_assets = []
        
        for asset_type, subdir in self.SUBDIRECTORIES.items():
            dir_path = self.assets_path / subdir
            if not dir_path.exists():
                continue
            
            for file_path in dir_path.iterdir():
                if file_path.is_file():
                    metadata = self.generate_asset_metadata(file_path)
                    all_assets.append(AssetInfo(
                        filename=file_path.name,
                        path=file_path,
                        type=asset_type,
                        size_bytes=file_path.stat().st_size,
                        timestamp=datetime.now().isoformat(),
                        metadata=metadata
                    ))
        
        return all_assets
    
    def delete_asset(self, filename: str) -> bool:
        """
        Delete an asset from the project.
        
        Args:
            filename: Name of the asset to delete
            
        Returns:
            True if deleted successfully, False otherwise
        """
        for asset_type, subdir in self.SUBDIRECTORIES.items():
            dir_path = self.assets_path / subdir
            file_path = dir_path / filename
            
            if file_path.exists():
                try:
                    file_path.unlink()
                    # Rebuild index
                    self._rebuild_index()
                    return True
                except Exception as e:
                    print(f"Error deleting asset: {e}")
                    return False
        
        return False
    
    def _rebuild_index(self) -> None:
        """Rebuild the asset index from all current assets."""
        if self.index_path.exists():
            self.index_path.unlink()
        
        for asset_type, subdir in self.SUBDIRECTORIES.items():
            dir_path = self.assets_path / subdir
            if not dir_path.exists():
                continue
            
            for file_path in dir_path.iterdir():
                if file_path.is_file():
                    metadata = self.generate_asset_metadata(file_path)
                    asset_info = AssetInfo(
                        filename=file_path.name,
                        path=file_path,
                        type=asset_type,
                        size_bytes=file_path.stat().st_size,
                        timestamp=datetime.now().isoformat(),
                        metadata=metadata
                    )
                    self._format_index_entry(asset_info)
                    with open(self.index_path, 'a', encoding='utf-8') as f:
                        f.write(self._format_index_entry(asset_info))

