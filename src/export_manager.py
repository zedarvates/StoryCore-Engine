#!/usr/bin/env python3
"""
StoryCore-Engine Export Manager
Handles frame sequence export, file organization, and metadata generation for video production.
"""

import logging
import json
import shutil
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple, Union
from dataclasses import dataclass, asdict
from enum import Enum
import time
import zipfile
from datetime import datetime

logger = logging.getLogger(__name__)


class ExportFormat(Enum):
    """Available export formats."""
    PNG = "png"
    JPEG = "jpeg"
    TIFF = "tiff"
    EXR = "exr"
    MP4 = "mp4"
    MOV = "mov"
    AVI = "avi"


class OrganizationStructure(Enum):
    """File organization structures."""
    FLAT = "flat"
    BY_SHOT = "by_shot"
    BY_SEQUENCE = "by_sequence"
    HIERARCHICAL = "hierarchical"
    PROFESSIONAL = "professional"


class ExportFormat(Enum):
    """Available export formats."""
    PNG = "png"
    JPEG = "jpeg"
    TIFF = "tiff"
    EXR = "exr"
    MP4 = "mp4"
    MOV = "mov"
    AVI = "avi"


class OrganizationStructure(Enum):
    """File organization structures."""
    FLAT = "flat"
    BY_SHOT = "by_shot"
    BY_SEQUENCE = "by_sequence"
    HIERARCHICAL = "hierarchical"
    PROFESSIONAL = "professional"


class MetadataFormat(Enum):
    """Metadata export formats."""
    JSON = "json"
    XML = "xml"
    YAML = "yaml"


@dataclass
class ExportConfig:
    """Export configuration."""
    output_directory: str
    include_metadata: bool = True
    metadata_format: MetadataFormat = MetadataFormat.JSON
    organize_by_shot: bool = True
    include_timeline: bool = True
    include_qa_reports: bool = True
    compress_output: bool = False
    quality_level: int = 95


@dataclass
class ExportResult:
    """Result of export operation."""
    success: bool
    metadata_path: str = ""
    error_message: str = ""
    exported_files: List[str] = None
    
    def __post_init__(self):
        if self.exported_files is None:
            self.exported_files = []


@dataclass
class ExportSettings:
    """Export configuration settings."""
    output_format: ExportFormat
    organization: OrganizationStructure
    include_metadata: bool
    include_timeline: bool
    include_qa_reports: bool
    compress_output: bool
    quality_level: int  # 1-100
    frame_naming_pattern: str
    metadata_format: str  # json, xml, yaml


@dataclass
class FrameExportInfo:
    """Information about exported frame."""
    frame_index: int
    filename: str
    filepath: Path
    timestamp: float
    shot_id: Optional[str]
    sequence_id: Optional[str]
    metadata: Dict[str, Any]


@dataclass
class ExportManifest:
    """Complete export manifest."""
    export_id: str
    timestamp: datetime
    settings: ExportSettings
    frame_count: int
    total_duration: float
    exported_frames: List[FrameExportInfo]
    metadata_files: List[str]
    timeline_data: Dict[str, Any]
    qa_reports: List[str]
    file_structure: Dict[str, Any]
    export_path: Path
    package_size: int


class ExportManager:
    """
    Manages export of frame sequences with comprehensive file organization and metadata.
    
    Features:
    - Multiple export formats (PNG, JPEG, TIFF, EXR, MP4, MOV, AVI)
    - Organized file structure generation
    - Comprehensive metadata export
    - Timeline synchronization data generation
    - QA report integration
    - Professional packaging
    """
    
    def __init__(self, 
                 base_export_path: Path = Path("exports"),
                 default_settings: Optional[ExportSettings] = None):
        """Initialize export manager."""
        self.base_export_path = Path(base_export_path)
        self.base_export_path.mkdir(exist_ok=True)
        
        self.default_settings = default_settings or ExportSettings(
            output_format=ExportFormat.PNG,
            organization=OrganizationStructure.PROFESSIONAL,
            include_metadata=True,
            include_timeline=True,
            include_qa_reports=True,
            compress_output=True,
            quality_level=95,
            frame_naming_pattern="frame_{index:06d}",
            metadata_format="json"
        )
        
        logger.info(f"Export Manager initialized")
        logger.info(f"  Base export path: {self.base_export_path}")
        logger.info(f"  Default format: {self.default_settings.output_format.value}")
        logger.info(f"  Default organization: {self.default_settings.organization.value}")
    
    def validate_export_config(self, config: Dict[str, Any]) -> bool:
        """Validate export configuration."""
        try:
            # Check required fields
            if "output_format" not in config:
                return False
            
            # Validate output format
            output_format = config["output_format"]
            valid_formats = ["png", "jpg", "jpeg", "tiff", "exr", "mp4", "mov", "avi"]
            
            if output_format.lower() not in valid_formats:
                return False
            
            # Validate optional fields if present
            if "organize_by_shot" in config and not isinstance(config["organize_by_shot"], bool):
                return False
            
            if "include_metadata" in config and not isinstance(config["include_metadata"], bool):
                return False
            
            if "generate_timeline" in config and not isinstance(config["generate_timeline"], bool):
                return False
            
            if "quality_level" in config:
                quality = config["quality_level"]
                if not isinstance(quality, (int, float)) or quality < 0 or quality > 100:
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Export config validation failed: {e}")
            return False
    
    def export_frame_sequence(self, 
                            frames: List[list],
                            project_name: str,
                            settings: Optional[ExportSettings] = None,
                            timeline_data: Optional[Dict[str, Any]] = None,
                            qa_reports: Optional[List[Dict[str, Any]]] = None,
                            shot_metadata: Optional[List[Dict[str, Any]]] = None) -> ExportManifest:
        """
        Export frame sequence with comprehensive organization and metadata.
        
        Args:
            frames: List of frame arrays
            project_name: Name of the project
            settings: Export settings (uses default if None)
            timeline_data: Timeline synchronization data
            qa_reports: Quality assessment reports
            shot_metadata: Shot-level metadata
            
        Returns:
            ExportManifest: Complete export information
        """
        start_time = time.time()
        
        try:
            # Use provided settings or default
            export_settings = settings or self.default_settings
            
            # Generate unique export ID
            export_id = f"{project_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            # Create export directory structure
            export_path = self._create_export_structure(export_id, export_settings)
            
            # Export frames
            exported_frames = self._export_frames(frames, export_path, export_settings, shot_metadata)
            
            # Export metadata
            metadata_files = []
            if export_settings.include_metadata:
                metadata_files = self._export_metadata(exported_frames, export_path, export_settings)
            
            # Export timeline data
            timeline_files = []
            if export_settings.include_timeline and timeline_data:
                timeline_files = self._export_timeline_data(timeline_data, export_path, export_settings)
                metadata_files.extend(timeline_files)
            
            # Export QA reports
            qa_files = []
            if export_settings.include_qa_reports and qa_reports:
                qa_files = self._export_qa_reports(qa_reports, export_path, export_settings)
                metadata_files.extend(qa_files)
            
            # Generate file structure documentation
            file_structure = self._generate_file_structure_doc(export_path)
            
            # Calculate package size
            package_size = self._calculate_directory_size(export_path)
            
            # Create export manifest
            manifest = ExportManifest(
                export_id=export_id,
                timestamp=datetime.now(),
                settings=export_settings,
                frame_count=len(frames),
                total_duration=len(frames) / 24.0,  # Assume 24fps
                exported_frames=exported_frames,
                metadata_files=metadata_files,
                timeline_data=timeline_data or {},
                qa_reports=qa_files,
                file_structure=file_structure,
                export_path=export_path,
                package_size=package_size
            )
            
            # Save manifest
            self._save_manifest(manifest, export_path)
            
            # Create compressed package if requested
            if export_settings.compress_output:
                self._create_compressed_package(export_path, manifest)
            
            processing_time = time.time() - start_time
            
            logger.info(f"Export completed: {export_id}")
            logger.info(f"  Frames exported: {len(exported_frames)}")
            logger.info(f"  Processing time: {processing_time:.2f}s")
            logger.info(f"  Package size: {package_size / (1024*1024):.1f} MB")
            
            return manifest
            
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"Export failed: {e}")
            raise
    
    def _create_export_structure(self, export_id: str, settings: ExportSettings) -> Path:
        """Create organized export directory structure."""
        export_path = self.base_export_path / export_id
        export_path.mkdir(exist_ok=True)
        
        if settings.organization == OrganizationStructure.PROFESSIONAL:
            # Professional structure
            (export_path / "frames").mkdir(exist_ok=True)
            (export_path / "metadata").mkdir(exist_ok=True)
            (export_path / "timeline").mkdir(exist_ok=True)
            (export_path / "qa_reports").mkdir(exist_ok=True)
            (export_path / "documentation").mkdir(exist_ok=True)
            
        elif settings.organization == OrganizationStructure.BY_SHOT:
            # Organize by shots (will create shot directories as needed)
            (export_path / "shots").mkdir(exist_ok=True)
            (export_path / "metadata").mkdir(exist_ok=True)
            
        elif settings.organization == OrganizationStructure.BY_SEQUENCE:
            # Organize by sequences
            (export_path / "sequences").mkdir(exist_ok=True)
            (export_path / "metadata").mkdir(exist_ok=True)
            
        elif settings.organization == OrganizationStructure.HIERARCHICAL:
            # Hierarchical structure
            (export_path / "video" / "frames").mkdir(parents=True, exist_ok=True)
            (export_path / "video" / "metadata").mkdir(exist_ok=True)
            (export_path / "audio").mkdir(exist_ok=True)
            (export_path / "documentation").mkdir(exist_ok=True)
            
        # FLAT structure needs no subdirectories
        
        return export_path
    
    def _export_frames(self, 
                      frames: List[list], 
                      export_path: Path, 
                      settings: ExportSettings,
                      shot_metadata: Optional[List[Dict[str, Any]]] = None) -> List[FrameExportInfo]:
        """Export individual frames with proper naming and organization."""
        exported_frames = []
        
        for i, frame in enumerate(frames):
            # Determine shot and sequence info
            shot_id = None
            sequence_id = None
            if shot_metadata and i < len(shot_metadata):
                shot_id = shot_metadata[i].get('shot_id')
                sequence_id = shot_metadata[i].get('sequence_id')
            
            # Generate filename
            filename = settings.frame_naming_pattern.format(
                index=i,
                shot_id=shot_id or "unknown",
                sequence_id=sequence_id or "seq01"
            ) + f".{settings.output_format.value}"
            
            # Determine output directory based on organization
            if settings.organization == OrganizationStructure.PROFESSIONAL:
                output_dir = export_path / "frames"
            elif settings.organization == OrganizationStructure.BY_SHOT and shot_id:
                output_dir = export_path / "shots" / shot_id
                output_dir.mkdir(exist_ok=True)
            elif settings.organization == OrganizationStructure.BY_SEQUENCE and sequence_id:
                output_dir = export_path / "sequences" / sequence_id
                output_dir.mkdir(exist_ok=True)
            elif settings.organization == OrganizationStructure.HIERARCHICAL:
                output_dir = export_path / "video" / "frames"
            else:  # FLAT
                output_dir = export_path
            
            filepath = output_dir / filename
            
            # Export frame (mock implementation)
            self._save_frame(frame, filepath, settings)
            
            # Calculate timestamp (assuming 24fps)
            timestamp = i / 24.0
            
            # Create frame export info
            frame_info = FrameExportInfo(
                frame_index=i,
                filename=filename,
                filepath=filepath,
                timestamp=timestamp,
                shot_id=shot_id,
                sequence_id=sequence_id,
                metadata={
                    "frame_size": self._get_frame_size(frame),
                    "export_format": settings.output_format.value,
                    "quality_level": settings.quality_level,
                    "export_timestamp": datetime.now().isoformat()
                }
            )
            
            exported_frames.append(frame_info)
        
        return exported_frames
    
    def _save_frame(self, frame: list, filepath: Path, settings: ExportSettings):
        """Save frame to file (mock implementation)."""
        # In a real implementation, this would use PIL, OpenCV, or similar
        # to save the frame in the specified format
        
        # Create a simple text representation for testing
        frame_data = {
            "format": settings.output_format.value,
            "quality": settings.quality_level,
            "dimensions": self._get_frame_size(frame),
            "data": "mock_frame_data"
        }
        
        # Save as JSON for testing (in real implementation, would save as image)
        with open(filepath.with_suffix('.json'), 'w') as f:
            json.dump(frame_data, f, indent=2)
        
        logger.debug(f"Saved frame to {filepath}")
    
    def _get_frame_size(self, frame: list) -> Tuple[int, int]:
        """Get frame dimensions."""
        if not frame or not frame[0]:
            return (0, 0)
        return (len(frame[0]), len(frame))
    
    def _export_metadata(self, 
                        exported_frames: List[FrameExportInfo], 
                        export_path: Path, 
                        settings: ExportSettings) -> List[str]:
        """Export comprehensive metadata."""
        metadata_files = []
        
        # Determine metadata directory
        if settings.organization == OrganizationStructure.PROFESSIONAL:
            metadata_dir = export_path / "metadata"
        elif settings.organization == OrganizationStructure.HIERARCHICAL:
            metadata_dir = export_path / "video" / "metadata"
        else:
            metadata_dir = export_path / "metadata"
            metadata_dir.mkdir(exist_ok=True)
        
        # Export frame manifest
        frame_manifest = {
            "total_frames": len(exported_frames),
            "frame_rate": 24,  # Default
            "duration": len(exported_frames) / 24.0,
            "frames": [
                {
                    "index": frame.frame_index,
                    "filename": frame.filename,
                    "timestamp": frame.timestamp,
                    "shot_id": frame.shot_id,
                    "sequence_id": frame.sequence_id,
                    "metadata": frame.metadata
                }
                for frame in exported_frames
            ]
        }
        
        manifest_file = metadata_dir / f"frame_manifest.{settings.metadata_format}"
        self._save_metadata_file(frame_manifest, manifest_file, settings.metadata_format)
        metadata_files.append(str(manifest_file.relative_to(export_path)))
        
        # Export shot metadata if available
        shots = {}
        for frame in exported_frames:
            if frame.shot_id:
                if frame.shot_id not in shots:
                    shots[frame.shot_id] = {
                        "shot_id": frame.shot_id,
                        "sequence_id": frame.sequence_id,
                        "start_frame": frame.frame_index,
                        "end_frame": frame.frame_index,
                        "start_time": frame.timestamp,
                        "end_time": frame.timestamp,
                        "frame_count": 0
                    }
                
                shots[frame.shot_id]["end_frame"] = frame.frame_index
                shots[frame.shot_id]["end_time"] = frame.timestamp
                shots[frame.shot_id]["frame_count"] += 1
        
        if shots:
            shots_file = metadata_dir / f"shots.{settings.metadata_format}"
            self._save_metadata_file({"shots": list(shots.values())}, shots_file, settings.metadata_format)
            metadata_files.append(str(shots_file.relative_to(export_path)))
        
        return metadata_files
    
    def _export_timeline_data(self, 
                            timeline_data: Dict[str, Any], 
                            export_path: Path, 
                            settings: ExportSettings) -> List[str]:
        """Export timeline synchronization data."""
        timeline_files = []
        
        # Determine timeline directory
        if settings.organization == OrganizationStructure.PROFESSIONAL:
            timeline_dir = export_path / "timeline"
        else:
            timeline_dir = export_path / "timeline"
            timeline_dir.mkdir(exist_ok=True)
        
        # Export main timeline data
        timeline_file = timeline_dir / f"timeline.{settings.metadata_format}"
        self._save_metadata_file(timeline_data, timeline_file, settings.metadata_format)
        timeline_files.append(str(timeline_file.relative_to(export_path)))
        
        # Export synchronization markers
        sync_data = {
            "frame_rate": timeline_data.get("frame_rate", 24),
            "total_duration": timeline_data.get("total_duration", 0),
            "sync_markers": timeline_data.get("sync_markers", []),
            "audio_sync": timeline_data.get("audio_sync", {}),
            "transitions": timeline_data.get("transitions", [])
        }
        
        sync_file = timeline_dir / f"synchronization.{settings.metadata_format}"
        self._save_metadata_file(sync_data, sync_file, settings.metadata_format)
        timeline_files.append(str(sync_file.relative_to(export_path)))
        
        return timeline_files
    
    def _export_qa_reports(self, 
                          qa_reports: List[Dict[str, Any]], 
                          export_path: Path, 
                          settings: ExportSettings) -> List[str]:
        """Export quality assessment reports."""
        qa_files = []
        
        # Determine QA directory
        if settings.organization == OrganizationStructure.PROFESSIONAL:
            qa_dir = export_path / "qa_reports"
        else:
            qa_dir = export_path / "qa_reports"
            qa_dir.mkdir(exist_ok=True)
        
        # Export individual QA reports
        for i, report in enumerate(qa_reports):
            report_file = qa_dir / f"qa_report_{i:03d}.{settings.metadata_format}"
            self._save_metadata_file(report, report_file, settings.metadata_format)
            qa_files.append(str(report_file.relative_to(export_path)))
        
        # Export summary report
        summary = {
            "total_reports": len(qa_reports),
            "overall_quality": sum(r.get("overall_score", 0) for r in qa_reports) / len(qa_reports) if qa_reports else 0,
            "issues_found": sum(len(r.get("detected_issues", [])) for r in qa_reports),
            "recommendations": sum(len(r.get("recommendations", [])) for r in qa_reports),
            "processing_time": sum(r.get("processing_time", 0) for r in qa_reports)
        }
        
        summary_file = qa_dir / f"qa_summary.{settings.metadata_format}"
        self._save_metadata_file(summary, summary_file, settings.metadata_format)
        qa_files.append(str(summary_file.relative_to(export_path)))
        
        return qa_files
    
    def _save_metadata_file(self, data: Dict[str, Any], filepath: Path, format_type: str):
        """Save metadata in specified format."""
        if format_type == "json":
            with open(filepath, 'w') as f:
                json.dump(data, f, indent=2, default=str)
        elif format_type == "yaml":
            try:
                import yaml
                with open(filepath, 'w') as f:
                    yaml.dump(data, f, default_flow_style=False)
            except ImportError:
                logger.warning("YAML not available, saving as JSON")
                with open(filepath.with_suffix('.json'), 'w') as f:
                    json.dump(data, f, indent=2, default=str)
        elif format_type == "xml":
            # Simple XML export (in real implementation, would use proper XML library)
            xml_content = self._dict_to_xml(data)
            with open(filepath, 'w') as f:
                f.write(xml_content)
        else:
            # Default to JSON
            with open(filepath, 'w') as f:
                json.dump(data, f, indent=2, default=str)
    
    def _dict_to_xml(self, data: Dict[str, Any], root_name: str = "metadata") -> str:
        """Convert dictionary to simple XML (basic implementation)."""
        def dict_to_xml_recursive(d, indent=0):
            xml = ""
            for key, value in d.items():
                spaces = "  " * indent
                if isinstance(value, dict):
                    xml += f"{spaces}<{key}>\n"
                    xml += dict_to_xml_recursive(value, indent + 1)
                    xml += f"{spaces}</{key}>\n"
                elif isinstance(value, list):
                    xml += f"{spaces}<{key}>\n"
                    for item in value:
                        if isinstance(item, dict):
                            xml += f"{spaces}  <item>\n"
                            xml += dict_to_xml_recursive(item, indent + 2)
                            xml += f"{spaces}  </item>\n"
                        else:
                            xml += f"{spaces}  <item>{item}</item>\n"
                    xml += f"{spaces}</{key}>\n"
                else:
                    xml += f"{spaces}<{key}>{value}</{key}>\n"
            return xml
        
        return f"<?xml version='1.0' encoding='UTF-8'?>\n<{root_name}>\n{dict_to_xml_recursive(data, 1)}</{root_name}>\n"
    
    def _generate_file_structure_doc(self, export_path: Path) -> Dict[str, Any]:
        """Generate documentation of file structure."""
        def scan_directory(path: Path, relative_to: Path) -> Dict[str, Any]:
            structure = {
                "type": "directory" if path.is_dir() else "file",
                "name": path.name,
                "path": str(path.relative_to(relative_to)),
                "size": path.stat().st_size if path.is_file() else 0
            }
            
            if path.is_dir():
                structure["children"] = []
                try:
                    for child in sorted(path.iterdir()):
                        structure["children"].append(scan_directory(child, relative_to))
                except PermissionError:
                    structure["error"] = "Permission denied"
            
            return structure
        
        return scan_directory(export_path, export_path)
    
    def _calculate_directory_size(self, path: Path) -> int:
        """Calculate total size of directory."""
        total_size = 0
        try:
            for item in path.rglob('*'):
                if item.is_file():
                    total_size += item.stat().st_size
        except (PermissionError, OSError):
            logger.warning(f"Could not calculate size for {path}")
        
        return total_size
    
    def _save_manifest(self, manifest: ExportManifest, export_path: Path):
        """Save export manifest."""
        manifest_data = {
            "export_id": manifest.export_id,
            "timestamp": manifest.timestamp.isoformat(),
            "settings": {
                "output_format": manifest.settings.output_format.value,
                "organization": manifest.settings.organization.value,
                "include_metadata": manifest.settings.include_metadata,
                "include_timeline": manifest.settings.include_timeline,
                "include_qa_reports": manifest.settings.include_qa_reports,
                "compress_output": manifest.settings.compress_output,
                "quality_level": manifest.settings.quality_level,
                "frame_naming_pattern": manifest.settings.frame_naming_pattern,
                "metadata_format": manifest.settings.metadata_format
            },
            "frame_count": manifest.frame_count,
            "total_duration": manifest.total_duration,
            "exported_frames": [
                {
                    "frame_index": frame.frame_index,
                    "filename": frame.filename,
                    "filepath": str(frame.filepath),
                    "timestamp": frame.timestamp,
                    "shot_id": frame.shot_id,
                    "sequence_id": frame.sequence_id,
                    "metadata": frame.metadata
                }
                for frame in manifest.exported_frames
            ],
            "metadata_files": manifest.metadata_files,
            "timeline_data": manifest.timeline_data,
            "qa_reports": manifest.qa_reports,
            "file_structure": manifest.file_structure,
            "export_path": str(manifest.export_path),
            "package_size": manifest.package_size
        }
        
        manifest_file = export_path / "export_manifest.json"
        with open(manifest_file, 'w') as f:
            json.dump(manifest_data, f, indent=2, default=str)
        
        logger.info(f"Export manifest saved: {manifest_file}")
    
    def _create_compressed_package(self, export_path: Path, manifest: ExportManifest):
        """Create compressed ZIP package."""
        package_path = export_path.with_suffix('.zip')
        
        with zipfile.ZipFile(package_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for file_path in export_path.rglob('*'):
                if file_path.is_file():
                    arcname = file_path.relative_to(export_path)
                    zipf.write(file_path, arcname)
        
        package_size = package_path.stat().st_size
        logger.info(f"Compressed package created: {package_path} ({package_size / (1024*1024):.1f} MB)")
        
        return package_path
    
    def load_manifest(self, export_path: Path) -> Optional[ExportManifest]:
        """Load export manifest from directory."""
        manifest_file = export_path / "export_manifest.json"
        
        if not manifest_file.exists():
            logger.debug(f"No manifest found at {manifest_file}")
            return None
        
        try:
            with open(manifest_file, 'r') as f:
                data = json.load(f)
            
            # Reconstruct manifest (simplified)
            settings_data = data['settings']
            
            # Handle enum conversion
            if isinstance(settings_data['output_format'], str):
                output_format = ExportFormat(settings_data['output_format'])
            else:
                output_format = ExportFormat.PNG
            
            if isinstance(settings_data['organization'], str):
                organization = OrganizationStructure(settings_data['organization'])
            else:
                organization = OrganizationStructure.PROFESSIONAL
            
            settings = ExportSettings(
                output_format=output_format,
                organization=organization,
                include_metadata=settings_data.get('include_metadata', True),
                include_timeline=settings_data.get('include_timeline', True),
                include_qa_reports=settings_data.get('include_qa_reports', True),
                compress_output=settings_data.get('compress_output', True),
                quality_level=settings_data.get('quality_level', 95),
                frame_naming_pattern=settings_data.get('frame_naming_pattern', 'frame_{index:06d}'),
                metadata_format=settings_data.get('metadata_format', 'json')
            )
            
            exported_frames = [
                FrameExportInfo(
                    frame_index=frame_data['frame_index'],
                    filename=frame_data['filename'],
                    filepath=Path(frame_data['filepath']),
                    timestamp=frame_data['timestamp'],
                    shot_id=frame_data.get('shot_id'),
                    sequence_id=frame_data.get('sequence_id'),
                    metadata=frame_data.get('metadata', {})
                )
                for frame_data in data['exported_frames']
            ]
            
            manifest = ExportManifest(
                export_id=data['export_id'],
                timestamp=datetime.fromisoformat(data['timestamp']),
                settings=settings,
                frame_count=data['frame_count'],
                total_duration=data['total_duration'],
                exported_frames=exported_frames,
                metadata_files=data['metadata_files'],
                timeline_data=data['timeline_data'],
                qa_reports=data['qa_reports'],
                file_structure=data['file_structure'],
                export_path=Path(data['export_path']),
                package_size=data['package_size']
            )
            
            return manifest
            
        except Exception as e:
            logger.debug(f"Failed to load manifest from {manifest_file}: {e}")
            return None
    
    def list_exports(self) -> List[Dict[str, Any]]:
        """List all available exports."""
        exports = []
        
        for export_dir in self.base_export_path.iterdir():
            if export_dir.is_dir():
                manifest = self.load_manifest(export_dir)
                if manifest:
                    exports.append({
                        "export_id": manifest.export_id,
                        "timestamp": manifest.timestamp,
                        "frame_count": manifest.frame_count,
                        "duration": manifest.total_duration,
                        "format": manifest.settings.output_format.value,
                        "organization": manifest.settings.organization.value,
                        "size": manifest.package_size,
                        "path": str(manifest.export_path)
                    })
        
        return sorted(exports, key=lambda x: x['timestamp'], reverse=True)
    
    def export_shot_metadata(self, shot_data, export_config: ExportConfig) -> ExportResult:
        """Export metadata for a single shot."""
        try:
            # Create output directory
            output_path = Path(export_config.output_directory)
            output_path.mkdir(parents=True, exist_ok=True)
            
            # Prepare metadata
            metadata = {
                "shot_id": shot_data.shot_id,
                "duration": shot_data.duration,
                "frame_count": shot_data.frame_count,
                "keyframes": [
                    {
                        "frame_id": kf.frame_id,
                        "image_path": kf.image_path,
                        "timestamp": kf.timestamp,
                        "metadata": kf.metadata
                    }
                    for kf in shot_data.keyframes
                ],
                "camera_movement": {
                    "movement_type": shot_data.camera_movement.movement_type.value,
                    "start_position": shot_data.camera_movement.start_position,
                    "end_position": shot_data.camera_movement.end_position,
                    "duration": shot_data.camera_movement.duration,
                    "easing": shot_data.camera_movement.easing.value
                },
                "metadata": shot_data.metadata,
                "export_timestamp": datetime.now().isoformat()
            }
            
            # Determine filename
            filename = f"{shot_data.shot_id}_metadata.{export_config.metadata_format.value}"
            metadata_path = output_path / filename
            
            # Save metadata
            self._save_metadata_file(metadata, metadata_path, export_config.metadata_format.value)
            
            return ExportResult(
                success=True,
                metadata_path=str(metadata_path),
                exported_files=[str(metadata_path)]
            )
            
        except Exception as e:
            return ExportResult(
                success=False,
                error_message=str(e)
            )


def main():
    """Test export manager functionality."""
    # Initialize export manager
    export_manager = ExportManager()
    
    # Create test frame sequence
    test_frames = []
    for i in range(10):
        # Create test frame
        frame = [[[100 + i * 10, 150, 200] for _ in range(100)] for _ in range(100)]
        test_frames.append(frame)
    
    # Create test timeline data
    timeline_data = {
        "frame_rate": 24,
        "total_duration": len(test_frames) / 24.0,
        "sync_markers": [
            {"time": 0.0, "type": "start"},
            {"time": len(test_frames) / 24.0, "type": "end"}
        ],
        "transitions": []
    }
    
    # Create test QA reports
    qa_reports = [
        {
            "overall_score": 0.85,
            "detected_issues": [],
            "recommendations": ["Improve lighting consistency"],
            "processing_time": 0.5
        }
    ]
    
    # Create test shot metadata
    shot_metadata = [
        {"shot_id": f"shot_{i//3 + 1:03d}", "sequence_id": "seq001"}
        for i in range(len(test_frames))
    ]
    
    # Export frame sequence
    manifest = export_manager.export_frame_sequence(
        frames=test_frames,
        project_name="test_project",
        timeline_data=timeline_data,
        qa_reports=qa_reports,
        shot_metadata=shot_metadata
    )
    
    print(f"✓ Export completed: {manifest.export_id}")
    print(f"  Frames exported: {manifest.frame_count}")
    print(f"  Total duration: {manifest.total_duration:.2f}s")
    print(f"  Export path: {manifest.export_path}")
    print(f"  Package size: {manifest.package_size / (1024*1024):.1f} MB")
    print(f"  Metadata files: {len(manifest.metadata_files)}")
    print(f"  Organization: {manifest.settings.organization.value}")
    
    # List all exports
    exports = export_manager.list_exports()
    print(f"  Total exports available: {len(exports)}")


if __name__ == "__main__":
    main()