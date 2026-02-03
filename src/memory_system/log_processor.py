"""
Log Processor for StoryCore LLM Memory System.

This module handles log cleaning and translation for better LLM consumption.
"""

from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime


class LogProcessor:
    """
    Processes and transforms build logs for better readability and LLM parsing.
    
    Responsibilities:
    - Clean raw logs by removing redundancy
    - Translate logs to target languages
    - Format logs for optimal LLM consumption
    
    Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5
    """
    
    BUILD_LOGS_DIR = "build_logs"
    RAW_LOG_FILENAME = "build_steps_raw.log"
    CLEAN_LOG_FILENAME = "build_steps_clean.txt"
    TRANSLATED_LOG_FILENAME = "build_steps_translated.txt"
    
    def __init__(self, project_path: Path):
        """
        Initialize the LogProcessor.
        
        Args:
            project_path: Root path for the project
        """
        self.project_path = Path(project_path)
        self.logs_path = self.project_path / self.BUILD_LOGS_DIR
        self.raw_log_path = self.logs_path / self.RAW_LOG_FILENAME
        self.clean_log_path = self.logs_path / self.CLEAN_LOG_FILENAME
        self.translated_log_path = self.logs_path / self.TRANSLATED_LOG_FILENAME
    
    def clean_logs(self) -> Optional[Path]:
        """
        Generate build_steps_clean.txt from raw logs.
        
        This method removes redundant information and normalizes formatting
        to create a more readable log file.
        
        Returns:
            Path to the clean log file, or None if cleaning failed
            
        Validates: Requirements 9.1, 9.2
        """
        if not self.raw_log_path.exists():
            return None
        
        try:
            # Read raw logs
            with open(self.raw_log_path, 'r', encoding='utf-8') as f:
                raw_content = f.read()
            
            # Clean the logs
            clean_content = self._remove_redundancy(raw_content)
            clean_content = self._normalize_formatting(clean_content)
            
            # Write clean log
            self.logs_path.mkdir(parents=True, exist_ok=True)
            
            with open(self.clean_log_path, 'w', encoding='utf-8') as f:
                f.write(clean_content)
            
            return self.clean_log_path
            
        except Exception as e:
            print(f"Error cleaning logs: {e}")
            return None
    
    def _remove_redundancy(self, log_text: str) -> str:
        """
        Remove duplicate or unnecessary log entries.
        
        Args:
            log_text: Raw log text
            
        Returns:
            Cleaned log text
        """
        lines = log_text.split('\n')
        cleaned_lines = []
        
        # Track seen entries to remove duplicates
        seen_entries = set()
        consecutive_empty_lines = 0
        
        for line in lines:
            stripped = line.strip()
            
            # Skip purely duplicate lines
            if stripped and stripped not in seen_entries:
                cleaned_lines.append(line)
                seen_entries.add(stripped)
            
            # Track consecutive empty lines (max 2)
            if not stripped:
                consecutive_empty_lines += 1
                if consecutive_empty_lines <= 2:
                    cleaned_lines.append(line)
            else:
                consecutive_empty_lines = 0
        
        return '\n'.join(cleaned_lines)
    
    def _normalize_formatting(self, log_text: str) -> str:
        """
        Normalize formatting for consistency.
        
        Args:
            log_text: Log text to normalize
            
        Returns:
            Normalized log text
        """
        lines = log_text.split('\n')
        normalized = []
        
        for i, line in enumerate(lines):
            stripped = line.strip()
            
            # Normalize timestamp format
            if stripped.startswith('[') and '] ACTION:' in stripped:
                timestamp = stripped[1:stripped.index(']')]
                try:
                    # Try to normalize timestamp
                    dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                    normalized_line = f"[{dt.strftime('%Y-%m-%d %H:%M:%S')}] ACTION:{stripped[stripped.index('] ACTION:') + 9:]}"
                    normalized.append(normalized_line)
                    continue
                except ValueError:
                    pass
            
            # Normalize parameter indentation
            if stripped.startswith('Parameters:') or stripped.startswith('Files:'):
                normalized.append(f"\n  {stripped}")
            elif stripped.startswith('- ') and not stripped.startswith('---'):
                # Keep file list items but normalize
                normalized.append(f"    {stripped}")
            else:
                normalized.append(line)
        
        return '\n'.join(normalized)
    
    def translate_logs(
        self, 
        target_language: str = "fr"
    ) -> Optional[Path]:
        """
        Generate translated version of logs.
        
        Args:
            target_language: Target language code (e.g., "fr" for French)
            
        Returns:
            Path to the translated log file, or None if translation failed
            
        Validates: Requirements 9.3, 9.4, 9.5
        """
        # Read clean logs (or raw if clean doesn't exist)
        source_path = self.clean_log_path if self.clean_log_path.exists() else self.raw_log_path
        
        if not source_path.exists():
            return None
        
        try:
            with open(source_path, 'r', encoding='utf-8') as f:
                source_content = f.read()
            
            # Translate content
            translated_content = self._translate_content(source_content, target_language)
            
            # Write translated log
            self.logs_path.mkdir(parents=True, exist_ok=True)
            
            with open(self.translated_log_path, 'w', encoding='utf-8') as f:
                f.write(translated_content)
            
            return self.translated_log_path
            
        except Exception as e:
            print(f"Error translating logs: {e}")
            return None
    
    def _translate_content(self, content: str, target_language: str) -> str:
        """
        Translate log content to target language.
        
        Args:
            content: Content to translate
            target_language: Target language code
            
        Returns:
            Translated content
        """
        # Translation mappings for common terms
        translations = {
            "fr": {
                "ACTION": "ACTION",
                "Files": "Fichiers",
                "Parameters": "Paramètres",
                "Triggered_By": "Déclenché_par",
                "FILE_CREATED": "FICHIER_CRÉÉ",
                "ASSET_ADDED": "ACTIF_AJOUTÉ",
                "MEMORY_UPDATED": "MÉMOIRE_MISE_À_JOUR",
                "VARIABLE_CHANGED": "VARIABLE_MODIFIÉE",
                "SUMMARY_GENERATED": "RÉSUMÉ_GÉNÉRÉ",
                "LLM_DECISION": "DÉCISION_IA",
                "ERROR_DETECTED": "ERREUR DÉTECTÉE",
                "Generated": "Généré",
                "TOTAL": "TOTAL",
                "ACTION LOG": "JOURNAL DES ACTIONS",
            }
        }
        
        if target_language not in translations:
            # Unknown language, return original
            return content
        
        translation_map = translations[target_language]
        translated = content
        
        for english, localized in translation_map.items():
            translated = translated.replace(english, localized)
        
        # Add header with language info
        header = f"""================================================================================
JOURNAL DES ACTIONS - TRADUCTION ({target_language.upper()})
Traduit le: {datetime.now().isoformat()}
================================================================================

"""
        
        return header + translated
    
    def format_for_llm(self, log_entries: Optional[List[Dict[str, Any]]] = None) -> str:
        """
        Format log entries for optimal LLM parsing.
        
        Args:
            log_entries: Optional list of log entries to format
                         If None, reads from raw log
            
        Returns:
            Formatted log text
            
        Validates: Requirement 9.2
        """
        if log_entries is None:
            # Read from raw log
            if not self.raw_log_path.exists():
                return "No log entries found."
            
            try:
                with open(self.raw_log_path, 'r', encoding='utf-8') as f:
                    raw_content = f.read()
                
                log_entries = self._parse_entries_for_llm(raw_content)
            except Exception:
                return "Error reading log entries."
        
        # Format entries for LLM
        lines = []
        lines.append("=== BUILD LOG SUMMARY ===")
        lines.append(f"Total entries: {len(log_entries)}")
        lines.append("")
        
        # Group by action type
        action_counts = {}
        for entry in log_entries:
            action_type = entry.get('action_type', 'UNKNOWN')
            action_counts[action_type] = action_counts.get(action_type, 0) + 1
        
        lines.append("Action breakdown:")
        for action_type, count in sorted(action_counts.items(), key=lambda x: -x[1]):
            lines.append(f"  - {action_type}: {count}")
        
        lines.append("")
        lines.append("=== RECENT ACTIONS ===")
        
        # Show last 20 entries in condensed format
        recent_entries = log_entries[-20:]
        for entry in recent_entries:
            timestamp = entry.get('timestamp', 'Unknown')
            action_type = entry.get('action_type', 'UNKNOWN')
            files = entry.get('affected_files', [])
            
            lines.append(f"[{timestamp}] {action_type}")
            if files:
                for f in files[:3]:  # Show max 3 files
                    lines.append(f"    → {f}")
                if len(files) > 3:
                    lines.append(f"    → ... and {len(files) - 3} more")
        
        return '\n'.join(lines)
    
    def _parse_entries_for_llm(self, content: str) -> List[Dict[str, Any]]:
        """Parse log content into structured entries for LLM."""
        entries = []
        lines = content.split('\n')
        
        current_entry = None
        
        for line in lines:
            line = line.strip()
            
            if not line:
                continue
            
            if line.startswith('[') and '] ACTION:' in line:
                if current_entry:
                    entries.append(current_entry)
                
                timestamp = line[1:line.index(']')]
                action_type = line[line.index('] ACTION:') + 10:].strip()  # +10 to skip '] ACTION: ' and strip whitespace
                
                current_entry = {
                    'timestamp': timestamp,
                    'action_type': action_type,
                    'affected_files': [],
                    'parameters': {}
                }
            
            elif current_entry:
                if line.startswith('- '):
                    current_entry['affected_files'].append(line[2:])
                elif ': ' in line:
                    parts = line.split(': ', 1)
                    if len(parts) == 2:
                        current_entry['parameters'][parts[0]] = parts[1]
        
        if current_entry:
            entries.append(current_entry)
        
        return entries
    
    def get_log_summary(self) -> Dict[str, Any]:
        """
        Get a summary of the log contents.
        
        Returns:
            Dictionary with log summary information
        """
        if not self.raw_log_path.exists():
            return {
                "total_entries": 0,
                "action_types": {},
                "date_range": None,
                "file_size": 0
            }
        
        try:
            with open(self.raw_log_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Parse entries
            entries = self._parse_entries_for_llm(content)
            
            # Count action types
            action_counts = {}
            timestamps = []
            
            for entry in entries:
                action_type = entry.get('action_type', 'UNKNOWN')
                action_counts[action_type] = action_counts.get(action_type, 0) + 1
                
                timestamp = entry.get('timestamp', '')
                if timestamp:
                    try:
                        dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                        timestamps.append(dt)
                    except ValueError:
                        pass
            
            # Determine date range
            date_range = None
            if timestamps:
                min_date = min(timestamps)
                max_date = max(timestamps)
                date_range = {
                    "earliest": min_date.isoformat(),
                    "latest": max_date.isoformat()
                }
            
            return {
                "total_entries": len(entries),
                "action_types": action_counts,
                "date_range": date_range,
                "file_size": self.raw_log_path.stat().st_size
            }
            
        except Exception as e:
            print(f"Error getting log summary: {e}")
            return {"error": str(e)}

