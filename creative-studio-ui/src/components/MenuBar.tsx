import { useEffect, useState } from 'react';
import {
  FileIcon,
  FolderOpenIcon,
  SaveIcon,
  DownloadIcon,
  UndoIcon,
  RedoIcon,
  ScissorsIcon,
  CopyIcon,
  ClipboardIcon,
  EyeIcon,
  ZoomInIcon,
  GridIcon,
  HelpCircleIcon,
  FileTextIcon,
  SettingsIcon,
  PlugIcon,
  BookOpenIcon,
  InfoIcon,
  GithubIcon,
  ScaleIcon,
  GlobeIcon,
  UserIcon,
  PuzzleIcon,
  WrenchIcon,
  SparklesIcon,
  MonitorIcon,
  PaletteIcon,
  MusicIcon,
  CpuIcon,
  ZapIcon,
  RotateCcwIcon,
  MaximizeIcon,
  SplitIcon,
  LayersIcon,
  KeyboardIcon,
  SunIcon,
  ClockIcon,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppStore } from '@/stores/useAppStore';
import { undo, redo, canUndo, canRedo } from '@/store/undoRedo';
import { downloadProject, getRecentProjects, RecentProject } from '@/utils/projectManager';

// ============================================================================
// MenuBar Component
// ============================================================================

interface MenuBarProps {
  onNewProject?: () => void;
  onOpenProject?: () => void;
  onSaveProject?: () => void;
  onExportProject?: () => void;
  onCloseProject?: () => void;
}

export function MenuBar({ onNewProject, onOpenProject, onSaveProject, onExportProject, onCloseProject }: MenuBarProps) {
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);

  const project = useAppStore((state) => state.project);
  const showChat = useAppStore((state) => state.showChat);
  const setShowChat = useAppStore((state) => state.setShowChat);
  const showTaskQueue = useAppStore((state) => state.showTaskQueue);
  const setShowTaskQueue = useAppStore((state) => state.setShowTaskQueue);
  const setShowWorldWizard = useAppStore((state) => state.setShowWorldWizard);
  const setShowCharacterWizard = useAppStore((state) => state.setShowCharacterWizard);
  const setShowLLMSettings = useAppStore((state) => state.setShowLLMSettings);
  const setShowComfyUISettings = useAppStore((state) => state.setShowComfyUISettings);
  const setShowGeneralSettings = useAppStore((state) => state.setShowGeneralSettings);
  const setShowInstallationWizard = useAppStore((state) => state.setShowInstallationWizard);
  const setShowAddonsModal = useAppStore((state) => state.setShowAddonsModal);
  const setShowCharactersModal = useAppStore((state) => state.setShowCharactersModal);
  const setShowWorldModal = useAppStore((state) => state.setShowWorldModal);
  const setShowLocationsModal = useAppStore((state) => state.setShowLocationsModal);
  const setShowObjectsModal = useAppStore((state) => state.setShowObjectsModal);
  const setShowImageGalleryModal = useAppStore((state) => state.setShowImageGalleryModal);
  const setShowDialogueEditor = useAppStore((state) => state.setShowDialogueEditor);

  // Load recent projects on mount
  useEffect(() => {
    setRecentProjects(getRecentProjects());
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isCtrlOrCmd = event.ctrlKey || event.metaKey;

      // File operations
      if (isCtrlOrCmd && event.key === 'n') {
        event.preventDefault();
        onNewProject?.();
      }

      if (isCtrlOrCmd && event.key === 'o') {
        event.preventDefault();
        onOpenProject?.();
      }

      if (isCtrlOrCmd && event.key === 's') {
        event.preventDefault();
        if (event.shiftKey) {
          onExportProject?.();
        } else {
          onSaveProject?.();
        }
      }

      // Edit operations
      if (isCtrlOrCmd && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        if (canUndo()) {
          undo();
        }
      }

      if (isCtrlOrCmd && (event.key === 'y' || (event.shiftKey && event.key === 'z'))) {
        event.preventDefault();
        if (canRedo()) {
          redo();
        }
      }

      if (isCtrlOrCmd && event.key === 'x') {
        event.preventDefault();
        handleCut();
      }

      if (isCtrlOrCmd && event.key === 'c') {
        event.preventDefault();
        handleCopy();
      }

      if (isCtrlOrCmd && event.key === 'v') {
        event.preventDefault();
        handlePaste();
      }

      // View operations - Window toggles (Ctrl+1-5)
      if (isCtrlOrCmd && event.key === '1') {
        event.preventDefault();
        handleToggleAssetLibrary();
      }

      if (isCtrlOrCmd && event.key === '2') {
        event.preventDefault();
        handleToggleTimeline();
      }

      if (isCtrlOrCmd && event.key === '3') {
        event.preventDefault();
        handleToggleChat();
      }

      if (isCtrlOrCmd && event.key === '4') {
        event.preventDefault();
        handleToggleTaskQueue();
      }

      // Ctrl+5 reserved for Properties Panel (not implemented yet)

      // Grid toggle
      if (isCtrlOrCmd && event.key === 'g') {
        event.preventDefault();
        handleToggleGrid();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNewProject, onOpenProject, onSaveProject, onExportProject]);

  // Edit operations
  const handleCut = () => {
    ;
  };

  const handleCopy = () => {
    ;
  };

  const handlePaste = () => {
    ;
  };

  // View operations
  const handleToggleChat = () => {
    setShowChat(!showChat);
  };

  const handleToggleTaskQueue = () => {
    setShowTaskQueue(!showTaskQueue);
  };

  const handleToggleAssetLibrary = () => {
    ;
  };

  const handleToggleTimeline = () => {
    ;
  };

  const handleZoomIn = () => {
    ;
  };

  const handleZoomOut = () => {
    ;
  };

  const handleResetZoom = () => {
    ;
  };

  const handleToggleGrid = () => {
    ;
  };

  // Help operations
  const handleDocumentation = () => {
    // Open the local documentation
    if (window.electronAPI) {
      // In Electron, use the electron API to open docs
      window.electronAPI.openExternal('https://github.com/zedarvates/StoryCore-Engine/tree/main/docs');
    } else {
      // In web, open GitHub docs
      window.open('https://github.com/zedarvates/StoryCore-Engine/tree/main/docs', '_blank');
    }
  };

  const handleLearnMore = () => {
    window.open('https://github.com/zedarvates/StoryCore-Engine', '_blank');
  };

  const handleAbout = () => {
    const aboutMessage = `StoryCore Creative Studio
Version: 1.0.0
License: MIT

GitHub Repository:
https://github.com/zedarvates/StoryCore-Engine

© 2026 StoryCore Team
All rights reserved.`;
    
    if (window.electronAPI) {
      // In Electron, could show a proper dialog
      alert(aboutMessage);
    } else {
      alert(aboutMessage);
    }
  };

  // General Settings
  const handleGeneralSettings = () => {
    setShowGeneralSettings(true);
  };

  const handleLLMSettings = () => {
    setShowLLMSettings(true);
  };

  const handleComfyUISettings = () => {
    setShowComfyUISettings(true);
  };

  const handleInstallComfyUI = () => {
    setShowInstallationWizard(true);
  };

  const handleExport = () => {
    if (project) {
      downloadProject(project);
    } else {
      alert('No project to export');
    }
  };

  const handleOpenAddonsPanel = () => {
    setShowAddonsModal(true);
  };

  // Handle opening recent project
  const handleOpenRecentProject = (recentProject: RecentProject) => {
    // This would need to be passed from parent component
    // For now, just log the action
    console.log('Opening recent project:', recentProject);
  };

  return (
    <div className="flex h-10 items-center border-b bg-background px-2">
      {/* File Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger>
          <span className="px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded">
            File
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={onNewProject} shortcut="Ctrl+N">
            <FileIcon className="mr-2 h-4 w-4" />
            New Project
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onOpenProject} shortcut="Ctrl+O">
            <FolderOpenIcon className="mr-2 h-4 w-4" />
            Open Project
          </DropdownMenuItem>
          {/* Recent Projects Submenu */}
          {recentProjects.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ClockIcon className="mr-2 h-4 w-4" />
                Recent Projects
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {recentProjects.slice(0, 5).map((recent, index) => (
                  <DropdownMenuItem
                    key={recent.id}
                    onSelect={() => handleOpenRecentProject(recent)}
                  >
                    <FileIcon className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{recent.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {recent.lastAccessed.toLocaleDateString()}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onSaveProject} shortcut="Ctrl+S" disabled={!project}>
            <SaveIcon className="mr-2 h-4 w-4" />
            Save Project
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleExport} shortcut="Ctrl+Shift+S" disabled={!project}>
            <DownloadIcon className="mr-2 h-4 w-4" />
            Export Project
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onCloseProject} disabled={!project}>
            <FileIcon className="mr-2 h-4 w-4" />
            Close Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Wizards Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger>
          <span className="px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded">
            Wizards
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => setShowWorldWizard(true)}>
            <GlobeIcon className="mr-2 h-4 w-4" />
            World Building Wizard
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setShowCharacterWizard(true)}>
            <UserIcon className="mr-2 h-4 w-4" />
            Character Creation Wizard
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setShowDialogueEditor(true)} disabled={!project}>
            <FileTextIcon className="mr-2 h-4 w-4" />
            Dialogue Generation Wizard
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <SparklesIcon className="mr-2 h-4 w-4" />
            Scene Generator Wizard
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <BookOpenIcon className="mr-2 h-4 w-4" />
            Storyboard Creator
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <ZapIcon className="mr-2 h-4 w-4" />
            Sequence Planner
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Tools Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger>
          <span className="px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded">
            Tools
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <PaletteIcon className="mr-2 h-4 w-4" />
              Creative Tools
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem disabled>
                <GlobeIcon className="mr-2 h-4 w-4" />
                World Builder
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <UserIcon className="mr-2 h-4 w-4" />
                Character Creator
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <SparklesIcon className="mr-2 h-4 w-4" />
                Scene Generator
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <FileTextIcon className="mr-2 h-4 w-4" />
                Dialogue Writer
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <WrenchIcon className="mr-2 h-4 w-4" />
              Media Tools
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem disabled>
                <MusicIcon className="mr-2 h-4 w-4" />
                Audio Editor
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <MonitorIcon className="mr-2 h-4 w-4" />
                Video Editor
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <LayersIcon className="mr-2 h-4 w-4" />
                Effects Browser
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <CpuIcon className="mr-2 h-4 w-4" />
              AI Tools
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem disabled>
                <FileTextIcon className="mr-2 h-4 w-4" />
                Prompt Generator
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <PaletteIcon className="mr-2 h-4 w-4" />
                Style Transfer
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <ZapIcon className="mr-2 h-4 w-4" />
                Batch Processor
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Window Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger>
          <span className="px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded">
            Window
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem disabled>
            <MaximizeIcon className="mr-2 h-4 w-4" />
            Full Screen
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <SplitIcon className="mr-2 h-4 w-4" />
            Split View
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <MonitorIcon className="mr-2 h-4 w-4" />
            New Window
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <RotateCcwIcon className="mr-2 h-4 w-4" />
            Reset Layout
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <SaveIcon className="mr-2 h-4 w-4" />
            Save Layout
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <FolderOpenIcon className="mr-2 h-4 w-4" />
            Load Layout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger>
          <span className="px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded">
            Edit
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={undo} shortcut="Ctrl+Z" disabled={!canUndo()}>
            <UndoIcon className="mr-2 h-4 w-4" />
            Undo
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={redo} shortcut="Ctrl+Y" disabled={!canRedo()}>
            <RedoIcon className="mr-2 h-4 w-4" />
            Redo
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleCut} shortcut="Ctrl+X">
            <ScissorsIcon className="mr-2 h-4 w-4" />
            Cut
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleCopy} shortcut="Ctrl+C">
            <CopyIcon className="mr-2 h-4 w-4" />
            Copy
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handlePaste} shortcut="Ctrl+V">
            <ClipboardIcon className="mr-2 h-4 w-4" />
            Paste
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setShowCharactersModal(true)} disabled={!project}>
            <UserIcon className="mr-2 h-4 w-4" />
            Personnages
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setShowWorldModal(true)} disabled={!project}>
            <GlobeIcon className="mr-2 h-4 w-4" />
            Monde
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setShowLocationsModal(true)} disabled={!project}>
            <FileTextIcon className="mr-2 h-4 w-4" />
            Lieux
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setShowObjectsModal(true)} disabled={!project}>
            <BookOpenIcon className="mr-2 h-4 w-4" />
            Objets
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* View Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger>
          <span className="px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded">
            View
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {/* Window Toggles */}
          <DropdownMenuItem onSelect={handleToggleAssetLibrary} shortcut="Ctrl+1">
            <EyeIcon className="mr-2 h-4 w-4" />
            Asset Library
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleToggleTimeline} shortcut="Ctrl+2">
            <EyeIcon className="mr-2 h-4 w-4" />
            Timeline
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleToggleChat} shortcut="Ctrl+3">
            <EyeIcon className="mr-2 h-4 w-4" />
            Chat Assistant
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleToggleTaskQueue} shortcut="Ctrl+4">
            <EyeIcon className="mr-2 h-4 w-4" />
            Task Queue
          </DropdownMenuItem>
          <DropdownMenuItem disabled shortcut="Ctrl+5">
            <EyeIcon className="mr-2 h-4 w-4" />
            Properties Panel
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* Zoom & Display */}
          <DropdownMenuItem onSelect={handleZoomIn} shortcut="Ctrl++">
            <ZoomInIcon className="mr-2 h-4 w-4" />
            Zoom In
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleZoomOut} shortcut="Ctrl+-">
            <ZoomInIcon className="mr-2 h-4 w-4 rotate-180" />
            Zoom Out
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleResetZoom} shortcut="Ctrl+0">
            <ZoomInIcon className="mr-2 h-4 w-4" />
            Reset Zoom
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleToggleGrid} shortcut="Ctrl+G">
            <GridIcon className="mr-2 h-4 w-4" />
            Toggle Grid
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* Galleries */}
          <DropdownMenuItem onSelect={() => setShowImageGalleryModal(true)} disabled={!project}>
            <BookOpenIcon className="mr-2 h-4 w-4" />
            Image Gallery
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <MusicIcon className="mr-2 h-4 w-4" />
            Audio Library
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <SparklesIcon className="mr-2 h-4 w-4" />
            Template Browser
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Settings Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger>
          <span className="px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded">
            Settings
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {/* Direct access to main settings (legacy options) */}
          <DropdownMenuItem onSelect={handleLLMSettings}>
            <PlugIcon className="mr-2 h-4 w-4" />
            LLM Configuration
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleComfyUISettings}>
            <PlugIcon className="mr-2 h-4 w-4" />
            ComfyUI Configuration
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleOpenAddonsPanel}>
            <PuzzleIcon className="mr-2 h-4 w-4" />
            Add-ons
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleGeneralSettings}>
            <SettingsIcon className="mr-2 h-4 w-4" />
            General Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* AI Configuration */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <CpuIcon className="mr-2 h-4 w-4" />
              AI Configuration
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onSelect={handleLLMSettings}>
                <PlugIcon className="mr-2 h-4 w-4" />
                LLM Settings
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleComfyUISettings}>
                <PlugIcon className="mr-2 h-4 w-4" />
                ComfyUI Settings
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleInstallComfyUI}>
                <DownloadIcon className="mr-2 h-4 w-4" />
                Install ComfyUI
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          {/* Application */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <SettingsIcon className="mr-2 h-4 w-4" />
              Application
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onSelect={handleGeneralSettings}>
                <SettingsIcon className="mr-2 h-4 w-4" />
                General Settings
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <KeyboardIcon className="mr-2 h-4 w-4" />
                Keyboard Shortcuts
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <SunIcon className="mr-2 h-4 w-4" />
                Appearance
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          {/* Extensions */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <PuzzleIcon className="mr-2 h-4 w-4" />
              Extensions
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onSelect={handleOpenAddonsPanel}>
                <PuzzleIcon className="mr-2 h-4 w-4" />
                Add-ons Manager
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <WrenchIcon className="mr-2 h-4 w-4" />
                Plugin Settings
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Documentation Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger>
          <span className="px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded">
            Documentation
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={handleDocumentation}>
            <BookOpenIcon className="mr-2 h-4 w-4" />
            User Guide
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleLearnMore}>
            <FileTextIcon className="mr-2 h-4 w-4" />
            Learn More
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Help Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger>
          <span className="px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded">
            Help
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={handleAbout}>
            <InfoIcon className="mr-2 h-4 w-4" />
            About StoryCore
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleLearnMore}>
            <GithubIcon className="mr-2 h-4 w-4" />
            GitHub Repository
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleDocumentation}>
            <BookOpenIcon className="mr-2 h-4 w-4" />
            Documentation
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => window.open('https://opensource.org/licenses/MIT', '_blank')}>
            <ScaleIcon className="mr-2 h-4 w-4" />
            MIT License
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Project Name Display */}
      {project && (
        <div className="ml-auto flex items-center text-sm text-muted-foreground">
          <span className="font-medium">{project.project_name}</span>
        </div>
      )}
    </div>
  );
}
