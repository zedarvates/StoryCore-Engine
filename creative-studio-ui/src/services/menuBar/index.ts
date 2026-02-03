/**
 * Menu Bar Services
 * 
 * Exports all menu bar related services and utilities.
 */

export { MenuStateManager } from './MenuStateManager';
export type { StateChangeCallback } from './MenuStateManager';

export {
  MenuConfigValidator,
  validateMenuConfig,
  getDefaultMenuConfig,
  validateAndGetConfig,
} from './MenuConfigValidator';
export type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from './MenuConfigValidator';

export { ModalManager, modalManager } from './ModalManager';
export type { ModalConfig, ModalState } from './ModalManager';

export { useModalManager } from './useModalManager';
export type { UseModalManagerReturn } from './useModalManager';

export { ModalRenderer } from './ModalRenderer';
export type { ModalRendererProps } from './ModalRenderer';

export { NotificationService, notificationService } from './NotificationService';
export type {
  Notification,
  NotificationType,
  NotificationListener,
  NotificationDismissListener,
} from './NotificationService';
