/**
 * UI Components - Exports
 * 
 * Error handling and validation UI components
 */

export { InlineErrorMessage } from './InlineErrorMessage';
export type { InlineErrorMessageProps } from './InlineErrorMessage';

export { 
  FieldHighlight, 
  getFieldStyle, 
  EnhancedInput 
} from './FieldHighlight';
export type { 
  FieldHighlightProps, 
  EnhancedInputProps 
} from './FieldHighlight';

export { 
  ErrorNotification, 
  NotificationContainer 
} from './ErrorNotification';
export type { 
  NotificationType,
  NotificationAction,
  Notification,
  NotificationContainerProps
} from './ErrorNotification';

export {
  ConnectionStatus,
  InlineConnectionStatus
} from './ConnectionStatus';
export type {
  ConnectionState,
  ConnectionStatusProps,
  InlineConnectionStatusProps
} from './ConnectionStatus';

export {
  SaveButton,
  CompactSaveButton
} from './SaveButton';
export type {
  SaveButtonProps,
  CompactSaveButtonProps
} from './SaveButton';

export {
  ExportButton,
  ImportButton,
  ExportImportPanel
} from './ExportImportButtons';
export type {
  ExportButtonProps,
  ImportButtonProps,
  ExportImportPanelProps
} from './ExportImportButtons';

export {
  KeyboardShortcutsHelp,
  ShortcutBadge
} from './KeyboardShortcutsHelp';
export type {
  KeyboardShortcutsHelpProps,
  ShortcutBadgeProps
} from './KeyboardShortcutsHelp';

// Shadcn/ui Base Components
export { Button, buttonVariants } from './button';
export type { ButtonProps } from './button';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card';

export { Input } from './input';

export { Label } from './label';

export { Textarea } from './textarea';

export { Select } from './select';

export { Checkbox } from './checkbox';

export { Switch } from './switch';

export { Slider } from './slider';

export { Badge } from './badge';

export { Alert } from './alert';

export { Progress } from './progress';

export { Separator } from './separator';

export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';

export { Dialog } from './dialog';

export { 
  DropdownMenu 
} from './dropdown-menu';

export { ScrollArea } from './scroll-area';

export { 
  Toast,
  ToastProvider,
  ToastViewport,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} from './toast';
export type { ToastProps, ToastActionElement } from './toast';

export { Toaster } from './toaster';

export { 
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider 
} from './tooltip';

export { ThemeToggle, ThemeToggleWithLabel } from './theme-toggle';
export type { ThemeToggleProps, ThemeToggleWithLabelProps } from './theme-toggle';

export { 
  SettingsPanel, 
  SettingsSection, 
  SettingsItem 
} from './settings-panel';
export type { 
  SettingsPanelProps, 
  SettingsSectionProps, 
  SettingsItemProps 
} from './settings-panel';

// Pagination Components
export { 
  Pagination, 
  PaginationCompact, 
  PaginationInfo 
} from './pagination';
export type { 
  PaginationProps, 
  PaginationCompactProps, 
  PaginationInfoProps 
} from './pagination';
