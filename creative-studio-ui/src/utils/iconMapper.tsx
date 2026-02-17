/**
 * Icon Mapper Utility
 * 
 * Converts string icon names from menu config to actual Lucide React icon components.
 * This prevents text from being displayed when icons are not properly resolved.
 * 
 * @module utils/iconMapper
 */

import React from 'react';
import {
  FilePlus,
  FolderOpen,
  Save,
  Download,
  Clock,
  Undo,
  Redo,
  Scissors,
  Copy,
  Clipboard,
  Settings,
  Brain,
  Server,
  Puzzle,
  Sliders,
  Layout,
  ZoomIn,
  ZoomOut,
  Maximize,
  Grid,
  Users,
  Film,
  Image,
  MessageCircle,
  Wand,
  Layers,
  CheckCircle,
  BookOpen,
  Keyboard,
  Info,
  DownloadCloud,
  AlertCircle,
  LogOut,
  XCircle,
  Play,
  LayoutDashboard,
  Globe,
  List,
  Camera,
  Volume2,
  Video,
  FileText,
  Palette,
  GitBranch,
  Search,
  Check,
  ChevronRight,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';

// Type for icon component
type IconComponent = React.ComponentType<{ className?: string }>;

// Icon mapping - converts string names to Lucide components
const iconMap: Record<string, IconComponent> = {
  'file-plus': FilePlus,
  'folder-open': FolderOpen,
  'save': Save,
  'download': Download,
  'clock': Clock,
  'undo': Undo,
  'redo': Redo,
  'scissors': Scissors,
  'copy': Copy,
  'clipboard': Clipboard,
  'settings': Settings,
  'brain': Brain,
  'server': Server,
  'puzzle': Puzzle,
  'sliders': Sliders,
  'layout': Layout,
  'zoom-in': ZoomIn,
  'zoom-out': ZoomOut,
  'maximize': Maximize,
  'grid': Grid,
  'users': Users,
  'film': Film,
  'image': Image,
  'message-circle': MessageCircle,
  'wand': Wand,
  'layers': Layers,
  'check-circle': CheckCircle,
  'book-open': BookOpen,
  'keyboard': Keyboard,
  'info': Info,
  'download-cloud': DownloadCloud,
  'alert-circle': AlertCircle,
  'log-out': LogOut,
  'x-circle': XCircle,
  'play': Play,
  'layout-dashboard': LayoutDashboard,
  'globe': Globe,
  'list': List,
  'camera': Camera,
  'volume-2': Volume2,
  'video': Video,
  'file-text': FileText,
  'palette': Palette,
  'git-branch': GitBranch,
  'search': Search,
  'check': Check,
  'chevron-right': ChevronRight,
  'plus': Plus,
  'trash': Trash2,
  'eye': Eye,
  'eye-off': EyeOff,
  'sparkles': Sparkles,
};

/**
 * Get icon component from icon name
 * 
 * @param iconName - The icon name string from config (e.g., 'undo', 'save')
 * @returns Lucide icon component or null if not found
 * 
 * @example
 * const Icon = getIcon('undo');
 * if (Icon) return <Icon className="w-4 h-4" />;
 */
export function getIcon(iconName: string | undefined): IconComponent | null {
  if (!iconName) return null;
  return iconMap[iconName] || null;
}

/**
 * Get icon JSX element from icon name
 * 
 * @param iconName - The icon name string from config
 * @param className - Optional CSS classes for styling
 * @returns JSX element with icon or null if not found
 * 
 * @example
 * return getIconElement('undo', 'w-4 h-4 text-blue-500');
 */
export function getIconElement(
  iconName: string | undefined,
  className: string = 'w-4 h-4'
): React.ReactNode {
  const Icon = getIcon(iconName);
  if (!Icon) return null;
  return <Icon className={className} />;
}

/**
 * Check if an icon name exists in the mapping
 * 
 * @param iconName - The icon name to check
 * @returns true if icon exists, false otherwise
 */
export function hasIcon(iconName: string): boolean {
  return iconName in iconMap;
}

/**
 * Get list of all available icon names
 * 
 * @returns Array of all available icon names
 */
export function getAvailableIcons(): string[] {
  return Object.keys(iconMap);
}

export default {
  getIcon,
  getIconElement,
  hasIcon,
  getAvailableIcons,
};

