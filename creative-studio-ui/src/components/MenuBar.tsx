import { useEffect } from 'react';
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
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppStore } from '@/stores/useAppStore';
import { undo, redo, canUndo, canRedo } from '@/store/undoRedo';
import { downloadProject } from '@/utils/projectManager';

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
  const project = useAppStore((state) => state.project);
  const showChat = useAppStore((state) => state.showChat);
  const setShowChat = useAppStore((state) => state.setShowChat);
  const showTaskQueue = useAppStore((state) => state.showTaskQueue);
  const setShowTaskQueue = useAppStore((state) => state.setShowTaskQueue);
  const setShowWorldWizard = useAppStore((state) => state.setShowWorldWizard);
  const setShowCharacterWizard = useAppStore((state) => state.setShowCharacterWizard);
  const setShowLLMSettings = useAppStore((state) => state.setShowLLMSettings);
  const setShowComfyUISettings = useAppStore((state) => state.setShowComfyUISettings);
  const setShowInstallationWizard = useAppStore((state) => state.setShowInstallationWizard);
  const setShowAddonsModal = useAppStore((state) => state.setShowAddonsModal);
  const setShowCharactersModal = useAppStore((state) => state.setShowCharactersModal);
  const setShowWorldModal = useAppStore((state) => state.setShowWorldModal);
  const setShowLocationsModal = useAppStore((state) => state.setShowLocationsModal);
  const setShowObjectsModal = useAppStore((state) => state.setShowObjectsModal);
  const setShowImageGalleryModal = useAppStore((state) => state.setShowImageGalleryModal);

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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNewProject, onOpenProject, onSaveProject, onExportProject]);

  // Edit operations
  const handleCut = () => {
    // TODO: Implement cut functionality
    ;
  };

  const handleCopy = () => {
    // TODO: Implement copy functionality
    ;
  };

  const handlePaste = () => {
    // TODO: Implement paste functionality
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
    // TODO: Implement asset library toggle
    ;
  };

  const handleToggleTimeline = () => {
    // TODO: Implement timeline toggle
    ;
  };

  const handleZoomIn = () => {
    // TODO: Implement zoom in
    ;
  };

  const handleZoomOut = () => {
    // TODO: Implement zoom out
    ;
  };

  const handleResetZoom = () => {
    // TODO: Implement reset zoom
    ;
  };

  const handleToggleGrid = () => {
    // TODO: Implement grid toggle
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

  // API Settings
  const handleAPISettings = () => {
    // TODO: Open API settings dialog
    alert('API Settings\n\nConfigure connections to:\n- LLM (OpenAI, Claude, etc.)\n- ComfyUI Server\n\nThis feature will be implemented soon.');
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

      {/* Create Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger>
          <span className="px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded">
            Create
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => setShowWorldWizard(true)}>
            <GlobeIcon className="mr-2 h-4 w-4" />
            Create World
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setShowCharacterWizard(true)}>
            <UserIcon className="mr-2 h-4 w-4" />
            Create Character
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
          <DropdownMenuItem onSelect={handleToggleAssetLibrary}>
            <EyeIcon className="mr-2 h-4 w-4" />
            Toggle Asset Library
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleToggleTimeline}>
            <EyeIcon className="mr-2 h-4 w-4" />
            Toggle Timeline
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleToggleChat}>
            <EyeIcon className="mr-2 h-4 w-4" />
            {showChat ? 'Hide' : 'Show'} Chat Assistant
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleToggleTaskQueue}>
            <EyeIcon className="mr-2 h-4 w-4" />
            {showTaskQueue ? 'Hide' : 'Show'} Task Queue
          </DropdownMenuItem>
          <DropdownMenuSeparator />
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
          <DropdownMenuItem onSelect={handleToggleGrid}>
            <GridIcon className="mr-2 h-4 w-4" />
            Toggle Grid
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setShowImageGalleryModal(true)} disabled={!project}>
            <BookOpenIcon className="mr-2 h-4 w-4" />
            Image Gallery
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
          {/* COMMENTED OUT: ComfyUI Portable installation feature not ready for release
          <DropdownMenuItem onSelect={handleInstallComfyUI}>
            <DownloadIcon className="mr-2 h-4 w-4" />
            Install ComfyUI Portable
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          */}
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
          <DropdownMenuItem onSelect={handleAPISettings}>
            <SettingsIcon className="mr-2 h-4 w-4" />
            General Settings
          </DropdownMenuItem>
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