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
  Cpu,
  Sparkles,
  Bell,
  User,
  HelpCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
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
  const { theme, effectiveTheme, toggleTheme } = useTheme();
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

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 256 }}
      className={cn(
        'flex flex-col h-screen glass-panel border-r border-white/5 transition-all duration-300 z-40',
        className
      )}
    >
      {/* Header / Logo */}
      <div className={cn(
        'flex items-center gap-3 p-4 border-b border-white/5',
        collapsed ? 'justify-center' : ''
      )}>
        <motion.div 
          whileHover={{ rotate: 15, scale: 1.1 }}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary shadow-lg shadow-primary/20"
        >
          <Sparkles className="w-6 h-6 text-primary-foreground" />
        </motion.div>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="font-bold text-lg text-white leading-none tracking-tight">StoryCore</h1>
            <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold mt-1">Creative Studio</p>
          </motion.div>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            whileHover={{ x: collapsed ? 0 : 5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onViewChange(item.id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative group',
              activeView === item.id
                ? 'bg-primary/20 text-white shadow-lg shadow-primary/5 border border-primary/20'
                : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'
            )}
            title={collapsed ? item.label : undefined}
          >
            {activeView === item.id && (
              <motion.div 
                layoutId="active-indicator"
                className="absolute left-0 w-1 h-6 bg-primary rounded-r-full" 
              />
            )}
            <span className={cn(
              'flex-shrink-0 transition-transform group-hover:scale-110',
              activeView === item.id ? 'text-primary' : ''
            )}>
              {item.icon}
            </span>
            {!collapsed && (
              <>
                <span className="flex-1 text-left text-sm font-semibold tracking-tight">
                  {item.label}
                </span>
                {item.badge && (
                  <span className={cn(
                    'px-2 py-0.5 text-[10px] font-bold rounded-lg',
                    activeView === item.id
                      ? 'bg-primary text-white'
                      : 'bg-white/10 text-white/40'
                  )}>
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </motion.button>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-white/5 space-y-2">
        {/* Notifications */}
        <button
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative group',
            'hover:bg-white/5 text-white/50 hover:text-white'
          )}
          title={collapsed ? 'Notifications' : undefined}
        >
          <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          {!collapsed && <span className="text-sm font-semibold">Notifications</span>}
          {notifications > 0 && (
            <span className="absolute top-2 right-2 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {notifications}
            </span>
          )}
        </button>

        {/* Theme Toggle */}
        <ThemeToggle 
          theme={theme} 
          effectiveTheme={effectiveTheme} 
          toggleTheme={toggleTheme} 
          collapsed={collapsed} 
        />

        {/* Service Status */}
        {!collapsed && (
           <div className="mt-4 px-1">
             <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-3 ml-1">System Health</div>
             <ServiceStatus 
               isOllamaConnected={isOllamaConnected} 
               isComfyUIConnected={isComfyUIConnected} 
             />
           </div>
        )}

        {/* Bottom Nav Items */}
        <div className="space-y-1 mt-2">
          {bottomItems.map((item) => (
            <button
              key={item.id}
              onClick={item.onClick}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all',
                'hover:bg-white/5 text-white/40 hover:text-white'
              )}
              title={collapsed ? item.label : undefined}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && (
                <span className="text-sm font-semibold">{item.label}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Collapse Toggle */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className={cn(
            'flex items-center justify-center p-4 border-t border-white/5',
            'hover:bg-white/5 transition-colors text-white/30 hover:text-white'
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <div className="flex items-center gap-2">
              <ChevronLeft className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-widest">Collapse Sidebar</span>
            </div>
          )}
        </button>
      )}
    </motion.aside>
  );
}

// =============================================================================
// Sub-components (Moved outside render to improve performance and fix ESLint)
// =============================================================================

const ServiceStatus = ({ isOllamaConnected, isComfyUIConnected }: { isOllamaConnected: boolean, isComfyUIConnected: boolean }) => (
  <div className="space-y-2 p-1">
    {/* Ollama Status */}
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all',
      isOllamaConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
    )}>
      <Wifi className="w-3 h-3" />
      <span className="flex-1 tracking-widest">Ollama</span>
      <div className={cn(
        'w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]',
        isOllamaConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
      )} />
    </div>

    {/* ComfyUI Status */}
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all',
      isComfyUIConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
    )}>
      <Cpu className="w-3 h-3" />
      <span className="flex-1 tracking-widest">ComfyUI</span>
      <div className={cn(
        'w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]',
        isComfyUIConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
      )} />
    </div>
  </div>
);

const ThemeToggle = ({ 
  theme, 
  effectiveTheme, 
  toggleTheme, 
  collapsed 
}: { 
  theme: string, 
  effectiveTheme: string, 
  toggleTheme: () => void, 
  collapsed: boolean 
}) => (
  <button
    onClick={() => toggleTheme()}
    className={cn(
      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all',
      'hover:bg-white/5 text-white/40 hover:text-white border border-transparent hover:border-white/5'
    )}
    title={`Theme actuel: ${theme}`}
  >
    {effectiveTheme === 'dark' ? (
      <Moon className="w-5 h-5 text-indigo-400" />
    ) : (
      <Sun className="w-5 h-5 text-amber-400" />
    )}
    {!collapsed && <span className="text-sm font-semibold">Theme Space</span>}
  </button>
);

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

