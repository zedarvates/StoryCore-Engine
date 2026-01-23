/**
 * Main Layout Component
 * Primary application layout with sidebar and main content area
 */

import React, { useState } from 'react';
import { MainSidebar } from './MainSidebar';
import { Toaster } from '@/components/ui/toaster';
import { ProjectDashboardNew } from '@/components/ProjectDashboardNew';
import { WizardLauncher } from '@/components/wizards/WizardLauncher';
import { EditorLayout } from '@/components/EditorLayout';
import { useAppStore } from '@/stores/useAppStore';
import { useWizardDefinitions } from '@/hooks/useWizardDefinitions';
import { cn } from '@/lib/utils';
import { FolderOpen, Wand2, Settings, Image, X } from 'lucide-react';

interface MainLayoutProps {
  children?: React.ReactNode;
  className?: string;
}

type ViewType = 'dashboard' | 'projects' | 'wizards' | 'media' | 'settings';

export function MainLayout({ children, className }: MainLayoutProps) {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Get wizard definitions
  const { availableWizards } = useWizardDefinitions();

  // Mock project data
  const project = useAppStore((state) => state.project);

  const handleViewChange = (view: ViewType) => {
    setActiveView(view);
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <div className="h-full overflow-auto">
            <ProjectDashboardNew />
          </div>
        );
      
      case 'projects':
        return (
          <div className="h-full p-6 overflow-auto">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">Mes Projets</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <EmptyStateCard
                  icon={<FolderOpen className="w-8 h-8" />}
                  title="Créer un projet"
                  description="Commencez un nouveau projet vidéo avec l'IA"
                  actionLabel="Nouveau Projet"
                  onAction={() => setActiveView('wizards')}
                />
              </div>
            </div>
          </div>
        );
      
      case 'wizards':
        return (
          <div className="h-full overflow-auto">
            <WizardLauncher
              availableWizards={availableWizards}
              onLaunchWizard={(wizardId) => {
                console.log('Launching wizard:', wizardId);
              }}
            />
          </div>
        );
      
      case 'media':
        return (
          <div className="h-full p-6 overflow-auto">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">Médiathèque</h2>
              <EmptyStateCard
                icon={<Image className="w-8 h-8" />}
                title="Importer des médias"
                description="Ajoutez des images, vidéos et fichiers audio"
                actionLabel="Importer"
                onAction={() => {}}
              />
            </div>
          </div>
        );
      
      case 'settings':
        return (
          <div className="h-full p-6 overflow-auto">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">Réglages</h2>
              <EmptyStateCard
                icon={<Settings className="w-8 h-8" />}
                title="Configuration"
                description="Gérez les paramètres de l'application"
                actionLabel="Ouvrir les réglages"
                onAction={() => {}}
              />
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={cn('flex h-screen bg-background', className)}>
      {/* Main Sidebar */}
      <MainSidebar
        activeView={activeView}
        onViewChange={handleViewChange}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Bar */}
        <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-background">
          <div className="flex items-center gap-4">
            <h2 className="font-semibold capitalize">{activeView}</h2>
            {project && (
              <span className="text-sm text-muted-foreground">
                {project.name}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Quick actions could go here */}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-hidden">
            {children || renderContent()}
          </div>
        </main>
      </div>

      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}

/**
 * Empty state card for placeholders
 */
interface EmptyStateCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  className?: string;
}

function EmptyStateCard({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateCardProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg text-center',
      className
    )}>
      <div className="text-muted-foreground mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">{description}</p>
      <button
        onClick={onAction}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        {actionLabel}
      </button>
    </div>
  );
}

/**
 * Resizable panel container
 */
interface ResizablePanelProps {
  leftPanel: React.ReactNode;
  rightPanel?: React.ReactNode;
  leftWidth?: number;
  rightWidth?: number;
  minLeftWidth?: number;
  minRightWidth?: number;
  className?: string;
}

export function ResizablePanelContainer({
  leftPanel,
  rightPanel,
  leftWidth = 300,
  rightWidth = 320,
  minLeftWidth = 200,
  minRightWidth = 250,
  className,
}: ResizablePanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [currentLeftWidth, setCurrentLeftWidth] = useState(leftWidth);
  const [currentRightWidth, setCurrentRightWidth] = useState(rightWidth);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const newWidth = e.clientX;
    const containerWidth = window.innerWidth;
    
    if (newWidth >= minLeftWidth && newWidth <= containerWidth - minRightWidth) {
      setCurrentLeftWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  return (
    <div className={cn('flex h-full', className)}>
      <div
        style={{ width: currentLeftWidth }}
        className="border-r border-border overflow-hidden"
      >
        {leftPanel}
      </div>

      <div
        className={cn(
          'w-1 bg-border hover:bg-primary cursor-col-resize transition-colors',
          isDragging && 'bg-primary'
        )}
        onMouseDown={handleMouseDown}
      />

      <div className="flex-1 overflow-hidden">
        <EditorLayout />
      </div>

      {rightPanel && (
        <>
          <div
            className={cn(
              'w-1 bg-border hover:bg-primary cursor-col-resize transition-colors',
              isDragging && 'bg-primary'
            )}
            onMouseDown={handleMouseDown}
          />
          
          <div
            style={{ width: currentRightWidth }}
            className="border-l border-border overflow-hidden"
          >
            {rightPanel}
          </div>
        </>
      )}
    </div>
  );
}

export default MainLayout;

