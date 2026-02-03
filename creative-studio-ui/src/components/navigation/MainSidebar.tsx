/**
 * Main Sidebar Navigation Component
 * Primary navigation for the application with service status indicators
 */

import React, { useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useTheme } from '@/hooks/useTheme';
import {
  LayoutDashboard,
  FolderOpen,
  Wand2,
  Image,
  Settings,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Wifi,
  WifiOff,
  Cpu,
  Sparkles,
  Bell,
  User,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
  badgeColor?: 'default' | 'success' | 'warning' | 'error' | 'info';
  onClick?: () => void;
}

interface MainSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export function MainSidebar({
  activeView,
  onViewChange,
  collapsed = false,
  onToggleCollapse,
  className,
}: MainSidebarProps) {
  const { theme, setTheme } = useTheme();
  const [notifications] = useState(3); // Mock notifications count

  // Get service status from store
  const isOllamaConnected = useAppStore((state) => state.ollamaStatus === 'connected');
  const isComfyUIConnected = useAppStore((state) => state.comfyuiStatus === 'connected');

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'projects',
      label: 'Projets',
      icon: <FolderOpen className="w-5 h-5" />,
    },
    {
      id: 'wizards',
      label: 'Wizards',
      icon: <Wand2 className="w-5 h-5" />,
      badge: '6',
      badgeColor: 'info',
    },
    {
      id: 'ai-services',
      label: 'Local AI',
      icon: <Sparkles className="w-5 h-5" />,
    },
    {
      id: 'media',
      label: 'Médiathèque',
      icon: <Image className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: 'Réglages',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  const bottomItems: NavItem[] = [
    {
      id: 'help',
      label: 'Aide',
      icon: <HelpCircle className="w-5 h-5" />,
      onClick: () => window.open('/docs', '_blank'),
    },
    {
      id: 'profile',
      label: 'Profil',
      icon: <User className="w-5 h-5" />,
    },
  ];

  const ServiceStatus = () => (
    <div className="space-y-2 px-3 py-2 border-t border-border">
      {/* Ollama Status */}
      <div className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs',
        isOllamaConnected ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
      )}>
        {isOllamaConnected ? (
          <Wifi className="w-3.5 h-3.5" />
        ) : (
          <WifiOff className="w-3.5 h-3.5" />
        )}
        <span className="flex-1">Ollama</span>
        <span className={cn(
          'w-2 h-2 rounded-full',
          isOllamaConnected ? 'bg-green-500' : 'bg-red-500'
        )} />
      </div>

      {/* ComfyUI Status */}
      <div className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs',
        isComfyUIConnected ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
      )}>
        {isComfyUIConnected ? (
          <Cpu className="w-3.5 h-3.5" />
        ) : (
          <Cpu className="w-3.5 h-3.5" />
        )}
        <span className="flex-1">ComfyUI</span>
        <span className={cn(
          'w-2 h-2 rounded-full',
          isComfyUIConnected ? 'bg-green-500' : 'bg-red-500'
        )} />
      </div>
    </div>
  );

  const ThemeToggle = () => (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
        'hover:bg-accent text-muted-foreground hover:text-foreground'
      )}
      title={`Theme actuel: ${theme === 'dark' ? 'Sombre' : 'Clair'}`}
    >
      {theme === 'dark' ? (
        <Moon className="w-5 h-5" />
      ) : (
        <Sun className="w-5 h-5" />
      )}
      {!collapsed && <span className="text-sm">Theme</span>}
    </button>
  );

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-background border-r transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Header / Logo */}
      <div className={cn(
        'flex items-center gap-3 p-4 border-b border-border',
        collapsed ? 'justify-center' : ''
      )}>
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
          <Sparkles className="w-6 h-6 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="font-bold text-lg">StoryCore</h1>
            <p className="text-xs text-muted-foreground">Creative Studio</p>
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
              'hover:bg-accent',
              activeView === item.id
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title={collapsed ? item.label : undefined}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && (
              <>
                <span className="flex-1 text-left text-sm font-medium">
                  {item.label}
                </span>
                {item.badge && (
                  <span className={cn(
                    'px-2 py-0.5 text-xs rounded-full',
                    activeView === item.id
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : cn(
                        'bg-primary/10 text-primary',
                        item.badgeColor === 'success' && 'bg-green-500/10 text-green-600',
                        item.badgeColor === 'warning' && 'bg-yellow-500/10 text-yellow-600',
                        item.badgeColor === 'error' && 'bg-red-500/10 text-red-600',
                        item.badgeColor === 'info' && 'bg-blue-500/10 text-blue-600'
                      )
                  )}>
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </button>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="p-2 border-t border-border space-y-1">
        {/* Notifications */}
        <button
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative',
            'hover:bg-accent text-muted-foreground hover:text-foreground'
          )}
          title={collapsed ? 'Notifications' : undefined}
        >
          <Bell className="w-5 h-5" />
          {!collapsed && <span className="text-sm">Notifications</span>}
          {notifications > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
              {notifications}
            </span>
          )}
        </button>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Service Status */}
        {!collapsed && <ServiceStatus />}

        {/* Bottom Nav Items */}
        {bottomItems.map((item) => (
          <button
            key={item.id}
            onClick={item.onClick}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
              'hover:bg-accent text-muted-foreground hover:text-foreground'
            )}
            title={collapsed ? item.label : undefined}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && (
              <span className="text-sm font-medium">{item.label}</span>
            )}
          </button>
        ))}
      </div>

      {/* Collapse Toggle */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className={cn(
            'flex items-center justify-center p-3 border-t border-border',
            'hover:bg-accent transition-colors text-muted-foreground'
          )}
          title={collapsed ? 'Développer' : 'Réduire'}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      )}
    </aside>
  );
}

/**
 * Compact sidebar for mobile or secondary views
 */
export function CompactSidebar({
  items,
  activeItem,
  onItemClick,
  className,
}: {
  items: NavItem[];
  activeItem: string;
  onItemClick: (id: string) => void;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-background border-r',
        className
      )}
    >
      <nav className="flex-1 p-2 space-y-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemClick(item.id)}
            className={cn(
              'w-full flex items-center justify-center gap-3 px-3 py-2.5 rounded-lg transition-all',
              'hover:bg-accent',
              activeItem === item.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title={item.label}
          >
            <span className="flex-shrink-0">{item.icon}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

/**
 * Breadcrumb navigation component
 */
interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  icon?: React.ReactNode;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn('flex items-center gap-2 text-sm', className)}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <span className="text-muted-foreground">/</span>
          )}
          {item.onClick ? (
            <button
              onClick={item.onClick}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ) : (
            <span className="flex items-center gap-1 text-foreground font-medium">
              {item.icon}
              <span>{item.label}</span>
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

export default MainSidebar;

