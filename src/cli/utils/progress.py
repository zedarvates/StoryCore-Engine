"""
Progress indicator utilities for long-running operations.
Provides consistent progress feedback across CLI commands.
"""

import sys
import time
from typing import Optional


class ProgressIndicator:
    """Simple progress indicator for long-running operations."""
    
    def __init__(self, message: str = "Processing", show_spinner: bool = True):
        """
        Initialize progress indicator.
        
        Args:
            message: Message to display
            show_spinner: Whether to show animated spinner
        """
        self.message = message
        self.show_spinner = show_spinner
        self.spinner_chars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
        self.spinner_index = 0
        self.start_time = None
        self.is_active = False
    
    def start(self) -> None:
        """Start the progress indicator."""
        self.start_time = time.time()
        self.is_active = True
        self._update()
    
    def _update(self) -> None:
        """Update the progress display."""
        if not self.is_active:
            return
        
        if self.show_spinner:
            spinner = self.spinner_chars[self.spinner_index]
            self.spinner_index = (self.spinner_index + 1) % len(self.spinner_chars)
            
            elapsed = time.time() - self.start_time
            sys.stdout.write(f'\r{spinner} {self.message}... ({elapsed:.1f}s)')
        else:
            sys.stdout.write(f'\r{self.message}...')
        
        sys.stdout.flush()
    
    def update(self, message: Optional[str] = None) -> None:
        """
        Update the progress message.
        
        Args:
            message: New message to display (optional)
        """
        if message:
            self.message = message
        self._update()
    
    def stop(self, final_message: Optional[str] = None) -> None:
        """
        Stop the progress indicator.
        
        Args:
            final_message: Final message to display (optional)
        """
        self.is_active = False
        
        if final_message:
            elapsed = time.time() - self.start_time
            sys.stdout.write(f'\r✓ {final_message} ({elapsed:.1f}s)\n')
        else:
            sys.stdout.write('\r' + ' ' * 80 + '\r')  # Clear line
        
        sys.stdout.flush()
    
    def __enter__(self):
        """Context manager entry."""
        self.start()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        if exc_type is None:
            self.stop()
        else:
            self.stop(final_message="Failed")
        return False


class ProgressBar:
    """Progress bar for operations with known total steps."""
    
    def __init__(self, total: int, message: str = "Progress", width: int = 40):
        """
        Initialize progress bar.
        
        Args:
            total: Total number of steps
            message: Message to display
            width: Width of progress bar in characters
        """
        self.total = total
        self.current = 0
        self.message = message
        self.width = width
        self.start_time = None
    
    def start(self) -> None:
        """Start the progress bar."""
        self.start_time = time.time()
        self.current = 0
        self._update()
    
    def _update(self) -> None:
        """Update the progress bar display."""
        if self.total == 0:
            percent = 100
        else:
            percent = int((self.current / self.total) * 100)
        
        filled = int((self.current / self.total) * self.width) if self.total > 0 else 0
        bar = '█' * filled + '░' * (self.width - filled)
        
        elapsed = time.time() - self.start_time if self.start_time else 0
        
        # Estimate time remaining
        if self.current > 0 and elapsed > 0:
            rate = self.current / elapsed
            remaining = (self.total - self.current) / rate if rate > 0 else 0
            time_str = f" ETA: {remaining:.0f}s"
        else:
            time_str = ""
        
        sys.stdout.write(f'\r{self.message}: [{bar}] {percent}% ({self.current}/{self.total}){time_str}')
        sys.stdout.flush()
    
    def update(self, increment: int = 1) -> None:
        """
        Update progress by incrementing current step.
        
        Args:
            increment: Number of steps to increment
        """
        self.current = min(self.current + increment, self.total)
        self._update()
    
    def set_progress(self, current: int) -> None:
        """
        Set absolute progress value.
        
        Args:
            current: Current step number
        """
        self.current = min(current, self.total)
        self._update()
    
    def finish(self, message: Optional[str] = None) -> None:
        """
        Finish the progress bar.
        
        Args:
            message: Final message to display (optional)
        """
        self.current = self.total
        self._update()
        
        elapsed = time.time() - self.start_time if self.start_time else 0
        
        if message:
            sys.stdout.write(f'\n✓ {message} ({elapsed:.1f}s)\n')
        else:
            sys.stdout.write(f'\n✓ Complete ({elapsed:.1f}s)\n')
        
        sys.stdout.flush()
    
    def __enter__(self):
        """Context manager entry."""
        self.start()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        if exc_type is None:
            self.finish()
        else:
            sys.stdout.write('\n✗ Failed\n')
            sys.stdout.flush()
        return False


def show_progress(message: str, duration: float = 0.5) -> None:
    """
    Show a simple progress message for a short duration.
    
    Args:
        message: Message to display
        duration: Duration to show message in seconds
    """
    sys.stdout.write(f'{message}...')
    sys.stdout.flush()
    time.sleep(duration)
    sys.stdout.write(' done\n')
    sys.stdout.flush()


def format_duration(seconds: float) -> str:
    """
    Format duration in seconds to human-readable string.
    
    Args:
        seconds: Duration in seconds
        
    Returns:
        Formatted duration string
    """
    if seconds < 60:
        return f"{seconds:.1f}s"
    elif seconds < 3600:
        minutes = int(seconds / 60)
        secs = seconds % 60
        return f"{minutes}m {secs:.0f}s"
    else:
        hours = int(seconds / 3600)
        minutes = int((seconds % 3600) / 60)
        return f"{hours}h {minutes}m"


def format_size(bytes: int) -> str:
    """
    Format file size in bytes to human-readable string.
    
    Args:
        bytes: Size in bytes
        
    Returns:
        Formatted size string
    """
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes < 1024.0:
            return f"{bytes:.1f} {unit}"
        bytes /= 1024.0
    return f"{bytes:.1f} PB"
