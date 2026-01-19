"""
Output formatting utilities.
Consistent message formatting and display functions.
"""

import sys
from typing import Optional


def print_success(message: str) -> None:
    """Print success message with consistent formatting."""
    print(f"✓ {message}")


def print_error(message: str) -> None:
    """Print error message with consistent formatting."""
    print(f"✗ {message}", file=sys.stderr)


def print_warning(message: str) -> None:
    """Print warning message with consistent formatting."""
    print(f"⚠️  {message}")


def print_info(message: str) -> None:
    """Print info message with consistent formatting."""
    print(f"ℹ️  {message}")


def print_progress(message: str, current: Optional[int] = None, total: Optional[int] = None) -> None:
    """Print progress message with optional progress indicator."""
    if current is not None and total is not None:
        percentage = (current / total) * 100
        print(f"⏳ {message} ({current}/{total} - {percentage:.1f}%)")
    else:
        print(f"⏳ {message}")


def format_duration(seconds: float) -> str:
    """Format duration in seconds to human-readable string."""
    if seconds < 1:
        return f"{seconds*1000:.0f}ms"
    elif seconds < 60:
        return f"{seconds:.1f}s"
    elif seconds < 3600:
        minutes = int(seconds // 60)
        remaining_seconds = seconds % 60
        return f"{minutes}m {remaining_seconds:.1f}s"
    else:
        hours = int(seconds // 3600)
        remaining_minutes = int((seconds % 3600) // 60)
        return f"{hours}h {remaining_minutes}m"


def format_file_size(bytes_size: int) -> str:
    """Format file size in bytes to human-readable string."""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes_size < 1024.0:
            return f"{bytes_size:.1f} {unit}"
        bytes_size /= 1024.0
    return f"{bytes_size:.1f} PB"


def format_table(headers: list, rows: list, max_width: int = 80) -> str:
    """Format data as a simple table."""
    if not rows:
        return "No data to display"
    
    # Calculate column widths
    col_widths = [len(str(header)) for header in headers]
    
    for row in rows:
        for i, cell in enumerate(row):
            if i < len(col_widths):
                col_widths[i] = max(col_widths[i], len(str(cell)))
    
    # Adjust for max width
    total_width = sum(col_widths) + len(headers) * 3 - 1
    if total_width > max_width:
        # Reduce column widths proportionally
        reduction = (total_width - max_width) / len(col_widths)
        col_widths = [max(10, int(width - reduction)) for width in col_widths]
    
    # Format table
    lines = []
    
    # Header
    header_line = " | ".join(str(headers[i]).ljust(col_widths[i]) for i in range(len(headers)))
    lines.append(header_line)
    lines.append("-" * len(header_line))
    
    # Rows
    for row in rows:
        row_line = " | ".join(str(row[i]).ljust(col_widths[i]) if i < len(row) else "".ljust(col_widths[i]) 
                             for i in range(len(headers)))
        lines.append(row_line)
    
    return "\n".join(lines)


def print_table(headers: list, rows: list, max_width: int = 80) -> None:
    """Print formatted table."""
    print(format_table(headers, rows, max_width))


def truncate_text(text: str, max_length: int, suffix: str = "...") -> str:
    """Truncate text to maximum length with suffix."""
    if len(text) <= max_length:
        return text
    
    return text[:max_length - len(suffix)] + suffix