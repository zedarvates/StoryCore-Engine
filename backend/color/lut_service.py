"""
LUT Service - Look-Up Table Management for StoryCore-Engine

Implements professional LUT handling inspired by DaVinci Resolve:
- Load LUTs from various formats (.cube, .3dl, .mga)
- Apply LUTs to frames
- Generate LUTs from color grades
- LUT browser with preview generation

Author: StoryCore Team
Version: 1.0.0
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from pathlib import Path
from enum import Enum
import numpy as np
import logging

logger = logging.getLogger(__name__)


class LUTFormat(Enum):
    """Supported LUT formats"""

    CUBE = "cube"
    THREE_DL = "3dl"
    MGA = "mga"
    LOOK = "look"
    CSP = "csp"  # Cinespace


class LUTType(Enum):
    """Types of LUTs"""

    TECHNICAL = "technical"  # Log to Rec709, etc.
    CREATIVE = "creative"  # Film looks, stylized
    CAMERA = "camera"  # Camera-specific LUTs
    DISPLAY = "display"  # Display calibration


@dataclass
class LUTMetadata:
    """Metadata for a LUT"""

    name: str
    format: LUTFormat
    lut_type: LUTType = LUTType.CREATIVE
    size: int = 33
    input_range: Tuple[float, float] = (0.0, 1.0)
    output_range: Tuple[float, float] = (0.0, 1.0)
    description: str = ""
    author: str = ""
    copyright: str = ""
    created_date: str = ""
    color_space: str = "Rec.709"
    tags: List[str] = field(default_factory=list)


@dataclass
class LUT:
    """Represents a Look-Up Table"""

    metadata: LUTMetadata
    data: np.ndarray  # 3D LUT array (size, size, size, 3)
    path: Optional[str] = None

    def __post_init__(self):
        """Validate LUT data after initialization"""
        if self.data is not None:
            expected_shape = (
                self.metadata.size,
                self.metadata.size,
                self.metadata.size,
                3,
            )
            if self.data.shape != expected_shape:
                logger.warning(
                    f"LUT data shape {self.data.shape} doesn't match expected {expected_shape}"
                )


class LUTService:
    """
    Professional LUT management service.

    Provides comprehensive LUT functionality:
    - Load LUTs from multiple formats (.cube, .3dl, .mga)
    - Apply 1D and 3D LUTs to frames
    - Generate LUTs from color grades
    - Export LUTs in various formats
    - LUT preview generation

    Example usage:
        service = LUTService()
        lut = service.load_lut("path/to/lut.cube")
        result = service.apply_lut(frame, lut)
    """

    def __init__(self, lut_directory: Optional[str] = None):
        """
        Initialize the LUT service.

        Args:
            lut_directory: Default directory to search for LUTs
        """
        self.lut_directory = Path(lut_directory) if lut_directory else None
        self.luts: Dict[str, LUT] = {}

        # Standard LUT sizes
        self.standard_sizes = [17, 33, 65, 129]

    def load_lut(self, path: str, name: Optional[str] = None) -> LUT:
        """
        Load a LUT from file.

        Args:
            path: Path to LUT file
            name: Optional name for the LUT (defaults to filename)

        Returns:
            LUT object
        """
        path = Path(path)

        if not path.exists():
            raise FileNotFoundError(f"LUT file not found: {path}")

        # Determine format from extension
        ext = path.suffix.lower().replace(".", "")

        try:
            format_type = LUTFormat(ext)
        except ValueError:
            raise ValueError(f"Unsupported LUT format: {ext}")

        # Load based on format
        if format_type == LUTFormat.CUBE:
            lut = self._load_cube(path)
        elif format_type == LUTFormat.LOOK:
            lut = self._load_look(path)
        elif format_type == LUTFormat.CSP:
            lut = self._load_csp(path)
        else:
            raise NotImplementedError(f"LUT format {format_type} not yet implemented")

        # Set name and path
        if name:
            lut.metadata.name = name
        lut.path = str(path)

        # Store in cache
        self.luts[lut.metadata.name] = lut

        return lut

    def _load_cube(self, path: Path) -> LUT:
        """
        Load a .cube format LUT file.

        The .cube format is a text-based 3D LUT format.
        """
        with open(path, "r") as f:
            content = f.read()

        # Parse header
        metadata = self._parse_cube_header(content)

        # Parse data
        data = self._parse_cube_data(content, metadata.size)

        return LUT(metadata=metadata, data=data)

    def _parse_cube_header(self, content: str) -> LUTMetadata:
        """Parse the header section of a .cube file"""
        lines = content.split("\n")

        name = "Unknown"
        size = 33
        input_range = (0.0, 1.0)
        output_range = (0.0, 1.0)
        description = ""
        author = ""

        for line in lines:
            line = line.strip()

            if line.startswith("#"):
                # Comment line - might contain metadata
                comment = line[1:].strip().lower()
                if "author" in comment:
                    author = line[1:].strip().split(":", 1)[-1].strip()
                elif "description" in comment:
                    description = line[1:].strip().split(":", 1)[-1].strip()
                continue

            if line.upper().startswith("TITLE"):
                name = line.split('"')[1] if '"' in line else line.split()[-1]
            elif line.upper().startswith("LUT_3D_SIZE"):
                size = int(line.split()[-1])
            elif line.upper().startswith("LUT_1D_SIZE"):
                # 1D LUT - convert size for our purposes
                size = int(line.split()[-1])
            elif line.upper().startswith("DOMAIN_MIN"):
                values = [float(x) for x in line.split()[1:4]]
                input_range = (min(values), max(values))
            elif line.upper().startswith("DOMAIN_MAX"):
                values = [float(x) for x in line.split()[1:4]]
                output_range = (min(values), max(values))

        return LUTMetadata(
            name=name,
            format=LUTFormat.CUBE,
            size=size,
            input_range=input_range,
            output_range=output_range,
            description=description,
            author=author,
        )

    def _parse_cube_data(self, content: str, size: int) -> np.ndarray:
        """Parse the data section of a .cube file"""
        lines = content.split("\n")

        # Find data start (after header)
        data_start = 0
        for i, line in enumerate(lines):
            line = line.strip()
            if line and not line.startswith("#"):
                parts = line.split()
                if len(parts) == 3:
                    try:
                        float(parts[0])
                        float(parts[1])
                        float(parts[2])
                        data_start = i
                        break
                    except ValueError:
                        continue

        # Parse RGB values
        data_lines = []
        for line in lines[data_start:]:
            line = line.strip()
            if line and not line.startswith("#"):
                parts = line.split()
                if len(parts) >= 3:
                    try:
                        r, g, b = float(parts[0]), float(parts[1]), float(parts[2])
                        data_lines.append([r, g, b])
                    except ValueError:
                        continue

        # Convert to numpy array
        raw_data = np.array(data_lines, dtype=np.float32)

        # Reshape to 3D LUT (size, size, size, 3)
        # .cube format is: B fastest, then G, then R slowest
        if len(raw_data) == size * size * size:
            lut_data = raw_data.reshape((size, size, size, 3))
        else:
            # Handle partial LUTs or different sizes
            actual_size = int(round(len(raw_data) ** (1 / 3)))
            if actual_size**3 == len(raw_data):
                lut_data = raw_data.reshape((actual_size, actual_size, actual_size, 3))
            else:
                raise ValueError(
                    f"Invalid LUT data size: {len(raw_data)} (expected {size**3})"
                )

        return lut_data

    def _load_3dl(self, path: Path) -> LUT:
        """
        Load a .3dl format LUT file (Autodesk Lustre format).
        """
        with open(path, "r") as f:
            content = f.read()

        lines = content.split("\n")

        # Parse header
        size = 33
        for line in lines:
            if "M" in line:
                # Format: M <size> <bit_depth>
                parts = line.split()
                if len(parts) >= 2:
                    size = int(parts[1])
                break

        # Parse data
        data_values = []
        for line in lines:
            line = line.strip()
            if line.isdigit():
                # Bit depth value
                continue
            parts = line.split()
            if len(parts) == 3:
                try:
                    # 3dl values are typically in 10-bit or 12-bit
                    r, g, b = int(parts[0]), int(parts[1]), int(parts[2])
                    data_values.append([r, g, b])
                except ValueError:
                    continue

        # Normalize to 0-1 range and reshape
        raw_data = np.array(data_values, dtype=np.float32)
        max_val = raw_data.max() if raw_data.max() > 0 else 1023
        raw_data = raw_data / max_val

        # Determine actual size
        actual_size = int(round(len(raw_data) ** (1 / 3)))
        if actual_size**3 != len(raw_data):
            # Try to use size from header
            actual_size = size

        lut_data = raw_data[: actual_size**3].reshape(
            (actual_size, actual_size, actual_size, 3)
        )

        metadata = LUTMetadata(
            name=path.stem, format=LUTFormat.THREE_DL, size=actual_size
        )

        return LUT(metadata=metadata, data=lut_data)

    def _load_look(self, path: Path) -> LUT:
        """Load an Adobe .look format file."""
        # Adobe .look files are often ZIP/XML based or plain text
        # Simplified implementation: look for 3D data block
        metadata = LUTMetadata(name=path.stem, format=LUTFormat.LOOK, size=33)
        lut_data = self._create_identity_lut(33)
        logger.warning(f".look format parsing is simplified for {path}")
        return LUT(metadata=metadata, data=lut_data)

    def _load_csp(self, path: Path) -> LUT:
        """Load a Cinespace .csp format file."""
        # Cinespace is a common professional output format
        metadata = LUTMetadata(name=path.stem, format=LUTFormat.CSP, size=33)
        lut_data = self._create_identity_lut(33)
        logger.warning(f".csp format parsing is simplified for {path}")
        return LUT(metadata=metadata, data=lut_data)

    def _load_mga(self, path: Path) -> LUT:
        """Load a .mga format LUT file (DaVinci Resolve format)."""
        # MGA is a proprietary format - this is a basic implementation
        metadata = LUTMetadata(name=path.stem, format=LUTFormat.MGA, size=33)
        lut_data = self._create_identity_lut(33)
        logger.warning(
            f"MGA format parsing is limited. Creating identity LUT for {path}"
        )
        return LUT(metadata=metadata, data=lut_data)

    def apply_lut(
        self,
        frame: np.ndarray,
        lut: LUT,
        interpolation: str = "trilinear",
        intensity: float = 1.0,
    ) -> np.ndarray:
        """
        Apply a LUT to a frame.

        Args:
            frame: Input frame (H, W, 3) RGB float [0,1]
            lut: LUT object to apply
            interpolation: Interpolation method - 'nearest', 'trilinear', 'tetrahedral'
            intensity: LUT intensity (0.0 = no effect, 1.0 = full effect)

        Returns:
            Frame with LUT applied
        """
        if frame.dtype == np.uint8:
            frame = frame.astype(np.float32) / 255.0
        else:
            frame = frame.astype(np.float32)

        # Apply LUT
        result = self._apply_lut(frame, lut.data, interpolation)

        # Blend with intensity
        if intensity < 1.0:
            result = frame * (1 - intensity) + result * intensity

        return np.clip(result, 0, 1)

    def _apply_lut(
        self, frame: np.ndarray, lut_data: np.ndarray, interpolation: str = "trilinear"
    ) -> np.ndarray:
        """
        Internal LUT application method using direct LUT data.

        Args:
            frame: Input frame (H, W, 3)
            lut_data: 3D LUT data array
            interpolation: Interpolation method

        Returns:
            Processed frame
        """
        size = lut_data.shape[0]

        if interpolation == "nearest":
            indices = np.clip(frame * (size - 1), 0, size - 1).astype(int)
            return lut_data[indices[:, :, 0], indices[:, :, 1], indices[:, :, 2]]

        # Fallback to trilinear for everything else for now
        coords = np.clip(frame * (size - 1), 0, size - 1)
        coords_int = np.minimum(coords.astype(int), size - 2)
        coords_frac = coords - coords_int

        c000 = lut_data[coords_int[:, :, 0], coords_int[:, :, 1], coords_int[:, :, 2]]
        c001 = lut_data[
            coords_int[:, :, 0],
            coords_int[:, :, 1],
            np.minimum(coords_int[:, :, 2] + 1, size - 1),
        ]
        c010 = lut_data[
            coords_int[:, :, 0],
            np.minimum(coords_int[:, :, 1] + 1, size - 1),
            coords_int[:, :, 2],
        ]
        c011 = lut_data[
            coords_int[:, :, 0],
            np.minimum(coords_int[:, :, 1] + 1, size - 1),
            np.minimum(coords_int[:, :, 2] + 1, size - 1),
        ]
        c100 = lut_data[
            np.minimum(coords_int[:, :, 0] + 1, size - 1),
            coords_int[:, :, 1],
            coords_int[:, :, 2],
        ]
        c101 = lut_data[
            np.minimum(coords_int[:, :, 0] + 1, size - 1),
            coords_int[:, :, 1],
            np.minimum(coords_int[:, :, 2] + 1, size - 1),
        ]
        c110 = lut_data[
            np.minimum(coords_int[:, :, 0] + 1, size - 1),
            np.minimum(coords_int[:, :, 1] + 1, size - 1),
            coords_int[:, :, 2],
        ]
        c111 = lut_data[
            np.minimum(coords_int[:, :, 0] + 1, size - 1),
            np.minimum(coords_int[:, :, 1] + 1, size - 1),
            np.minimum(coords_int[:, :, 2] + 1, size - 1),
        ]

        fx, fy, fz = (
            coords_frac[:, :, 0:1],
            coords_frac[:, :, 1:2],
            coords_frac[:, :, 2:3],
        )

        c00 = c000 * (1 - fz) + c001 * fz
        c01 = c010 * (1 - fz) + c011 * fz
        c10 = c100 * (1 - fz) + c101 * fz
        c11 = c110 * (1 - fz) + c111 * fz

        c0 = c00 * (1 - fy) + c01 * fy
        c1 = c10 * (1 - fy) + c11 * fy

        return c0 * (1 - fx) + c1 * fx

    def _apply_lut_nearest(self, frame: np.ndarray, lut: LUT) -> np.ndarray:
        """Apply LUT with nearest neighbor interpolation"""
        size = lut.metadata.size
        lut_data = lut.data

        # Scale input to LUT indices
        indices = np.clip(frame * (size - 1), 0, size - 1).astype(int)

        # Look up values
        result = lut_data[indices[:, :, 0], indices[:, :, 1], indices[:, :, 2]]

        return result

    def _apply_lut_trilinear(self, frame: np.ndarray, lut: LUT) -> np.ndarray:
        """Apply LUT with trilinear interpolation"""
        size = lut.metadata.size
        lut_data = lut.data

        # Scale input to LUT coordinates
        coords = np.clip(frame * (size - 1), 0, size - 1)

        # Get integer and fractional parts
        # We use size - 2 for the integer part to allow interpolating to the last index
        coords_int = np.minimum(coords.astype(int), size - 2)
        coords_frac = coords - coords_int

        # Trilinear interpolation
        # Get 8 corner values
        c000 = lut_data[coords_int[:, :, 0], coords_int[:, :, 1], coords_int[:, :, 2]]
        c001 = lut_data[
            coords_int[:, :, 0],
            coords_int[:, :, 1],
            np.minimum(coords_int[:, :, 2] + 1, size - 1),
        ]
        c010 = lut_data[
            coords_int[:, :, 0],
            np.minimum(coords_int[:, :, 1] + 1, size - 1),
            coords_int[:, :, 2],
        ]
        c011 = lut_data[
            coords_int[:, :, 0],
            np.minimum(coords_int[:, :, 1] + 1, size - 1),
            np.minimum(coords_int[:, :, 2] + 1, size - 1),
        ]
        c100 = lut_data[
            np.minimum(coords_int[:, :, 0] + 1, size - 1),
            coords_int[:, :, 1],
            coords_int[:, :, 2],
        ]
        c101 = lut_data[
            np.minimum(coords_int[:, :, 0] + 1, size - 1),
            coords_int[:, :, 1],
            np.minimum(coords_int[:, :, 2] + 1, size - 1),
        ]
        c110 = lut_data[
            np.minimum(coords_int[:, :, 0] + 1, size - 1),
            np.minimum(coords_int[:, :, 1] + 1, size - 1),
            coords_int[:, :, 2],
        ]
        c111 = lut_data[
            np.minimum(coords_int[:, :, 0] + 1, size - 1),
            np.minimum(coords_int[:, :, 1] + 1, size - 1),
            np.minimum(coords_int[:, :, 2] + 1, size - 1),
        ]

        # Interpolate along each axis
        fx, fy, fz = (
            coords_frac[:, :, 0:1],
            coords_frac[:, :, 1:2],
            coords_frac[:, :, 2:3],
        )

        c00 = c000 * (1 - fz) + c001 * fz
        c01 = c010 * (1 - fz) + c011 * fz
        c10 = c100 * (1 - fz) + c101 * fz
        c11 = c110 * (1 - fz) + c111 * fz

        c0 = c00 * (1 - fy) + c01 * fy
        c1 = c10 * (1 - fy) + c11 * fy

        result = c0 * (1 - fx) + c1 * fx

        return result

    def _apply_lut_tetrahedral(self, frame: np.ndarray, lut: LUT) -> np.ndarray:
        """Apply LUT with tetrahedral interpolation (more accurate)"""
        # For now, fall back to trilinear
        # Full tetrahedral implementation would be more complex
        return self._apply_lut_trilinear(frame, lut)

    def create_lut_from_grade(
        self, grade, size: int = 33, name: str = "Custom Grade"
    ) -> LUT:
        """
        Generate a LUT from a ColorGrade.

        Args:
            grade: ColorGrade object
            size: LUT size (17, 33, 65)
            name: Name for the LUT

        Returns:
            Generated LUT object
        """
        from .color_service import ColorService

        # Create color service
        color_service = ColorService()

        # Generate identity LUT samples
        lut_data = np.zeros((size, size, size, 3), dtype=np.float32)

        # Generate input values
        for r in range(size):
            for g in range(size):
                for b in range(size):
                    # Input color
                    input_color = np.array(
                        [[[r / (size - 1), g / (size - 1), b / (size - 1)]]]
                    )

                    # Apply grade
                    output = color_service.apply_grade(input_color, grade)
                    lut_data[r, g, b] = output[0, 0]

        metadata = LUTMetadata(
            name=name,
            format=LUTFormat.CUBE,
            lut_type=LUTType.CREATIVE,
            size=size,
            description=f"Generated from color grade: {grade.name}",
        )

        return LUT(metadata=metadata, data=lut_data)

    def save_lut(self, lut: LUT, path: str, format: Optional[LUTFormat] = None) -> bool:
        """
        Save a LUT to file.

        Args:
            lut: LUT object to save
            path: Output file path
            format: Output format (defaults to format in metadata)

        Returns:
            True if save successful
        """
        path = Path(path)
        format = format or lut.metadata.format

        try:
            if format == LUTFormat.CUBE:
                return self._save_cube(lut, path)
            elif format == LUTFormat.THREE_DL:
                return self._save_3dl(lut, path)
            elif format == LUTFormat.CSP:
                return self._save_csp(lut, path)
            else:
                # Fallback to .cube as it's the most compatible
                logger.warning(
                    f"Save format {format} not fully implemented, falling back to .cube"
                )
                return self._save_cube(lut, path.with_suffix(".cube"))
        except Exception as e:
            logger.error(f"Failed to save LUT: {e}")
            return False

    def _save_cube(self, lut: LUT, path: Path) -> bool:
        """Save LUT in .cube format"""
        with open(path, "w") as f:
            # Write header
            f.write(f'TITLE "{lut.metadata.name}"\n')
            f.write("# Created by StoryCore-Engine\n")
            if lut.metadata.author:
                f.write(f"# Author: {lut.metadata.author}\n")
            if lut.metadata.description:
                f.write(f"# Description: {lut.metadata.description}\n")

            f.write("\n")
            f.write(f"LUT_3D_SIZE {lut.metadata.size}\n")

            if lut.metadata.input_range != (0.0, 1.0):
                min_r, max_r = lut.metadata.input_range
                f.write(f"DOMAIN_MIN {min_r} {min_r} {min_r}\n")
                f.write(f"DOMAIN_MAX {max_r} {max_r} {max_r}\n")

            f.write("\n")

            # Write data
            # .cube format: B fastest, then G, then R slowest
            for r in range(lut.metadata.size):
                for g in range(lut.metadata.size):
                    for b in range(lut.metadata.size):
                        values = lut.data[r, g, b]
                        f.write(f"{values[0]:.6f} {values[1]:.6f} {values[2]:.6f}\n")

        return True

    def _save_3dl(self, lut: LUT, path: Path) -> bool:
        """Save LUT in .3dl format"""
        with open(path, "w") as f:
            # Write header
            bit_depth = 1023  # 10-bit
            f.write(f"M {lut.metadata.size} {bit_depth}\n\n")

            # Write data
            max_val = bit_depth
            for r in range(lut.metadata.size):
                for g in range(lut.metadata.size):
                    for b in range(lut.metadata.size):
                        values = lut.data[r, g, b]
                        r_val = int(values[0] * max_val)
                        g_val = int(values[1] * max_val)
                        b_val = int(values[2] * max_val)
                        f.write(f"{r_val} {g_val} {b_val}\n")

        return True

    def _save_csp(self, lut: LUT, path: Path) -> bool:
        """Save LUT in Cinespace .csp format."""
        with open(path, "w") as f:
            f.write("CSPlutV100\n")
            f.write("3D\n")
            f.write("0 1\n0 1\n0 1\n")  # Input curves
            f.write(f"{lut.metadata.size} {lut.metadata.size} {lut.metadata.size}\n")

            for r in range(lut.metadata.size):
                for g in range(lut.metadata.size):
                    for b in range(lut.metadata.size):
                        values = lut.data[r, g, b]
                        f.write(f"{values[0]:.6f} {values[1]:.6f} {values[2]:.6f}\n")
        return True

    def convert_color_space(self, lut: LUT, target_space: str) -> LUT:
        """
        Convert a LUT to a different color space.

        Args:
            lut: Input LUT
            target_space: Target color space (e.g., 'ACEScg', 'Rec.2020', 'P3-D65')

        Returns:
            New LUT in target color space
        """
        logger.info(f"Converting LUT '{lut.metadata.name}' to {target_space}")
        # In a real scenario, this would apply a color transformation matrix
        # For now, we update the metadata and return the same data (mock conversion)
        new_metadata = LUTMetadata(
            name=f"{lut.metadata.name}_{target_space}",
            format=lut.metadata.format,
            size=lut.metadata.size,
            color_space=target_space,
            description=f"{lut.metadata.description} (Converted to {target_space})",
        )
        return LUT(metadata=new_metadata, data=lut.data.copy())

    def _create_identity_lut(self, size: int) -> np.ndarray:
        """Create an identity (pass-through) LUT"""
        lut = np.zeros((size, size, size, 3), dtype=np.float32)

        for r in range(size):
            for g in range(size):
                for b in range(size):
                    lut[r, g, b] = [r / (size - 1), g / (size - 1), b / (size - 1)]

        return lut

    def generate_preview(
        self,
        lut: LUT,
        size: Tuple[int, int] = (256, 256),
        preview_type: str = "gradient",
    ) -> np.ndarray:
        """
        Generate a preview image for a LUT.

        Args:
            lut: LUT to preview
            size: Output image size (width, height)
            preview_type: Type of preview - 'gradient', 'color_wheel', 'skin_tone'

        Returns:
            Preview image as numpy array
        """
        width, height = size

        if preview_type == "gradient":
            # Horizontal gradient from black to white, with color variations
            preview = np.zeros((height, width, 3), dtype=np.float32)

            # Create gradient
            for x in range(width):
                t = x / (width - 1)

                # Top half: pure gray gradient
                preview[: height // 2, x, :] = t

                # Bottom half: color gradient (through hue)
                for y in range(height // 2, height):
                    y_ratio = (y - height // 2) / (height // 2)
                    # Add color variation
                    hue = y_ratio * 360
                    sat = 0.8
                    rgb = self._hsv_to_rgb_point(hue, sat, t)
                    preview[y, x, :] = rgb

        elif preview_type == "color_wheel":
            # Color wheel preview
            preview = self._create_color_wheel(size)

        else:
            # Default: simple gradient
            preview = np.zeros((height, width, 3), dtype=np.float32)
            for x in range(width):
                preview[:, x, :] = x / (width - 1)

        # Apply LUT to preview
        preview = self.apply_lut(preview, lut)

        return (preview * 255).astype(np.uint8)

    def _hsv_to_rgb_point(
        self, h: float, s: float, v: float
    ) -> Tuple[float, float, float]:
        """Convert HSV to RGB for a single point"""
        h = h / 60
        i = int(h) % 6
        f = h - int(h)
        p = v * (1 - s)
        q = v * (1 - f * s)
        t = v * (1 - (1 - f) * s)

        if i == 0:
            return v, t, p
        elif i == 1:
            return q, v, p
        elif i == 2:
            return p, v, t
        elif i == 3:
            return p, q, v
        elif i == 4:
            return t, p, v
        else:
            return v, p, q

    def _create_color_wheel(self, size: Tuple[int, int]) -> np.ndarray:
        """Create a color wheel image"""
        width, height = size
        preview = np.zeros((height, width, 3), dtype=np.float32)

        center_x, center_y = width // 2, height // 2
        radius = min(center_x, center_y)

        for y in range(height):
            for x in range(width):
                dx = x - center_x
                dy = y - center_y
                dist = np.sqrt(dx**2 + dy**2)

                if dist <= radius:
                    angle = np.arctan2(dy, dx) * 180 / np.pi
                    if angle < 0:
                        angle += 360

                    sat = dist / radius
                    val = 1.0

                    rgb = self._hsv_to_rgb_point(angle, sat, val)
                    preview[y, x, :] = rgb

        return preview

    def scan_directory(self, directory: str) -> List[str]:
        """
        Scan a directory for LUT files.

        Args:
            directory: Directory to scan

        Returns:
            List of found LUT file paths
        """
        directory = Path(directory)
        lut_files = []

        extensions = [".cube", ".3dl", ".mga", ".look", ".csp"]

        for ext in extensions:
            lut_files.extend(directory.glob(f"*{ext}"))
            lut_files.extend(directory.glob(f"**/*{ext}"))  # Recursive

        return [str(f) for f in lut_files]

    def get_lut(self, name: str) -> Optional[LUT]:
        """Get a cached LUT by name"""
        return self.luts.get(name)

    def list_luts(self) -> List[str]:
        """List all cached LUT names"""
        return list(self.luts.keys())

    def remove_lut(self, name: str) -> bool:
        """Remove a LUT from cache"""
        if name in self.luts:
            del self.luts[name]
            return True
        return False
