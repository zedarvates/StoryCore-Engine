/**
 * NotificationService - Service de notifications intelligentes
 *
 * Gère les notifications contextuelles, rappels, alertes de mise à jour,
 * et notifications de succès/échec des opérations.
 */

import { LanguageCode } from '@/utils/llmConfigStorage';
import { generateIdWithPrefix } from '@/utils/idGenerator';

export type NotificationType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'update'
  | 'reminder'
  | 'achievement'
  | 'system';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface NotificationAction {
  label: string;
  action: () => void;
  primary?: boolean;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  timestamp: Date;
  expiresAt?: Date;
  actions?: NotificationAction[];
  metadata?: Record<string, unknown>;
  dismissed?: boolean;
  read?: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  showOnScreen: boolean;
  autoHideDelay: number; // milliseconds
  maxNotifications: number;
  enableReminders: boolean;
  enableUpdateAlerts: boolean;
  enableAchievementNotifications: boolean;
  enableSystemNotifications: boolean;
}

export interface NotificationContext {
  userActivity: 'idle' | 'active' | 'away';
  currentPage: string;
  pendingTasks: number;
  lastInteraction: Date;
  language: LanguageCode;
}

/**
 * Interface pour les données de notification sérialisées (sans objets Date)
 */
export interface SerializedNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  timestamp: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
  dismissed?: boolean;
  read?: boolean;
}

/**
 * Service de notifications intelligentes
 */
export class NotificationService {
  private static instance: NotificationService;
  private notifications: Notification[] = [];
  private settings: NotificationSettings;
  private context: NotificationContext;
  private listeners: Array<(notifications: Notification[]) => void> = [];
  private intervals: NodeJS.Timeout[] = [];

  private constructor() {
    this.settings = this.loadSettings();
    this.context = this.initializeContext();

    // Démarrer les vérifications périodiques
    this.startPeriodicChecks();

    // Écouter les changements d'activité utilisateur
    this.setupActivityListeners();

    // Charger les notifications persistantes
    this.loadNotifications();

    // Demander la permission pour les notifications natives
    this.requestNativePermission();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialise le contexte de notification
   */
  private initializeContext(): NotificationContext {
    return {
      userActivity: 'active',
      currentPage: window.location.pathname,
      pendingTasks: 0,
      lastInteraction: new Date(),
      language: 'fr',
    };
  }

  /**
   * Charge les paramètres de notification
   */
  private loadSettings(): NotificationSettings {
    const defaultSettings: NotificationSettings = {
      enabled: true,
      soundEnabled: true,
      showOnScreen: true,
      autoHideDelay: 5000,
      maxNotifications: 50,
      enableReminders: true,
      enableUpdateAlerts: true,
      enableAchievementNotifications: true,
      enableSystemNotifications: true
    };

    try {
      const stored = localStorage.getItem('notification-settings');
      return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  }

  /**
   * Sauvegarde les paramètres de notification
   */
  saveSettings(settings: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...settings };
    localStorage.setItem('notification-settings', JSON.stringify(this.settings));
  }

  /**
   * Met à jour le contexte de notification
   */
  updateContext(updates: Partial<NotificationContext>): void {
    this.context = { ...this.context, ...updates };
  }

  /**
   * Demande la permission pour les notifications système (Optionnel pour Electron, utile pour Browser)
   */
  private async requestNativePermission(): Promise<void> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    }
  }

  /**
   * Charger les notifications depuis le stockage local
   */
  private loadNotifications(): void {
    try {
      const stored = localStorage.getItem('notification-history');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.notifications = parsed.map((n: SerializedNotification) => ({
          ...n,
          timestamp: new Date(n.timestamp),
          expiresAt: n.expiresAt ? new Date(n.expiresAt) : undefined
        }));
      }
    } catch (error) {
      console.warn('[NotificationService] Failed to load history:', error);
    }
  }

  /**
   * Persister les notifications
   */
  private persistNotifications(): void {
    try {
      localStorage.setItem('notification-history', JSON.stringify(this.notifications));
    } catch (error) {
      console.warn('[NotificationService] Failed to persist history:', error);
    }
  }

  /**
   * Crée une notification
   */
  create(notification: Omit<Notification, 'id' | 'timestamp'>): string {
    if (!this.settings.enabled) return '';

    const id = generateIdWithPrefix('notif');
    const fullNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date(),
      read: false,
      dismissed: false
    };

    this.notifications.unshift(fullNotification);

    // Persister l'historique
    this.persistNotifications();

    // Limiter le nombre de notifications
    if (this.notifications.length > this.settings.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.settings.maxNotifications);
    }

    // Jouer un son si activé
    if (this.settings.soundEnabled) {
      this.playNotificationSound(notification.type);
    }

    // Calculer l'expiration automatique
    if (!notification.expiresAt && notification.priority !== 'critical') {
      fullNotification.expiresAt = new Date(Date.now() + this.settings.autoHideDelay);
    }

    // Déclencher une notification native pour les priorités hautes ou critiques
    if (notification.priority === 'high' || notification.priority === 'critical') {
      this.showNativeNotification(fullNotification);
    }

    this.notifyListeners();
    return id;
  }

  /**
   * Affiche une notification système native
   */
  private showNativeNotification(notif: Notification): void {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(notif.title, {
          body: notif.message,
          icon: '/favicon.ico', // On pourrait utiliser une icône spécifique au type
          tag: notif.id // Évite les doublons si même ID
        });
      } catch (error) {
        console.warn('[NotificationService] Native notification failed:', error);
      }
    }
  }

  /**
   * Marque une notification comme lue
   */
  markAsRead(id: string): void {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.notifyListeners();
    }
  }

  /**
   * Marque une notification comme rejetée
   */
  dismiss(id: string): void {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.dismissed = true;
      this.notifyListeners();
    }
  }

  /**
   * Supprime une notification
   */
  remove(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
  }

  /**
   * Vide toutes les notifications
   */
  clearAll(): void {
    this.notifications = [];
    this.notifyListeners();
  }

  /**
   * Récupère les notifications actives
   */
  getActiveNotifications(): Notification[] {
    return this.notifications.filter(n =>
      !n.dismissed &&
      (!n.expiresAt || n.expiresAt > new Date())
    );
  }

  /**
   * Récupère les notifications non lues
   */
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read && !n.dismissed).length;
  }

  /**
   * Abonne un listener aux changements de notifications
   */
  subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notifie tous les listeners
   */
  private notifyListeners(): void {
    const activeNotifications = this.getActiveNotifications();
    this.listeners.forEach(listener => listener(activeNotifications));
  }

  /**
   * Joue un son de notification
   */
  private playNotificationSound(type: NotificationType): void {
    try {
      // Utiliser l'API Web Audio pour des sons personnalisés
      const AudioContextCtor = window.AudioContext ||
        (window as unknown as Record<string, typeof AudioContext>)['webkitAudioContext'];
      const audioContext = new AudioContextCtor();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Sons différents selon le type
      const frequencies = {
        success: 800,
        error: 400,
        warning: 600,
        info: 700,
        update: 900,
        reminder: 500,
        achievement: 1000,
        system: 650
      };

      oscillator.frequency.setValueAtTime(frequencies[type] || 700, audioContext.currentTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      // Fallback silencieux si Web Audio n'est pas disponible
      console.debug('Audio notification not available:', error);
    }
  }

  /**
   * Démarre les vérifications périodiques
   */
  private startPeriodicChecks(): void {
    // Nettoyer les anciennes notifications expirées
    const cleanupInterval = setInterval(() => {
      const now = new Date();
      const hadExpired = this.notifications.some(n => n.expiresAt && n.expiresAt <= now);

      if (hadExpired) {
        this.notifications = this.notifications.filter(n =>
          !n.expiresAt || n.expiresAt > now
        );
        this.notifyListeners();
      }
    }, 10000); // Vérifier toutes les 10 secondes

    // Rappels périodiques pour les tâches en attente
    if (this.settings.enableReminders) {
      const reminderInterval = setInterval(() => {
        this.checkForReminders();
      }, 300000); // Vérifier toutes les 5 minutes

      this.intervals.push(cleanupInterval, reminderInterval);
    } else {
      this.intervals.push(cleanupInterval);
    }
  }

  /**
   * Configure les listeners d'activité utilisateur
   */
  private setupActivityListeners(): void {
    let activityTimeout: NodeJS.Timeout;

    const resetActivityTimeout = () => {
      clearTimeout(activityTimeout);
      this.updateContext({ userActivity: 'active', lastInteraction: new Date() });

      activityTimeout = setTimeout(() => {
        this.updateContext({ userActivity: 'away' });
      }, 300000); // 5 minutes d'inactivité
    };

    // Écouter les événements d'activité
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, resetActivityTimeout, true);
    });

    resetActivityTimeout();
  }

  /**
   * Vérifie s'il faut envoyer des rappels
   */
  private checkForReminders(): void {
    if (!this.settings.enableReminders) return;

    // Rappel pour les tâches en attente
    if (this.context.pendingTasks > 0 && this.context.userActivity === 'active') {
      this.create({
        type: 'reminder',
        title: this.context.language === 'fr' ? 'Tâches en attente' : 'Pending Tasks',
        message: this.context.language === 'fr'
          ? `Vous avez ${this.context.pendingTasks} tâche(s) en attente.`
          : `You have ${this.context.pendingTasks} pending task(s).`,
        priority: 'medium',
        actions: [
          {
            label: this.context.language === 'fr' ? 'Voir les tâches' : 'View Tasks',
            action: () => {
            },
            primary: true
          }
        ]
      });
    }
  }

  /**
   * Notifications prédéfinies pour les événements courants
   */
  success(title: string, message: string, actions?: NotificationAction[]): string {
    return this.create({
      type: 'success',
      title,
      message,
      priority: 'low',
      actions
    });
  }

  error(title: string, message: string, actions?: NotificationAction[]): string {
    return this.create({
      type: 'error',
      title,
      message,
      priority: 'high',
      actions
    });
  }

  warning(title: string, message: string, actions?: NotificationAction[]): string {
    return this.create({
      type: 'warning',
      title,
      message,
      priority: 'medium',
      actions
    });
  }

  info(title: string, message: string, actions?: NotificationAction[]): string {
    return this.create({
      type: 'info',
      title,
      message,
      priority: 'low',
      actions
    });
  }

  update(title: string, message: string, actions?: NotificationAction[]): string {
    if (!this.settings.enableUpdateAlerts) return '';
    return this.create({
      type: 'update',
      title,
      message,
      priority: 'medium',
      actions
    });
  }

  achievement(title: string, message: string, actions?: NotificationAction[]): string {
    if (!this.settings.enableAchievementNotifications) return '';
    return this.create({
      type: 'achievement',
      title,
      message,
      priority: 'low',
      actions
    });
  }

  system(title: string, message: string, actions?: NotificationAction[]): string {
    if (!this.settings.enableSystemNotifications) return '';
    return this.create({
      type: 'system',
      title,
      message,
      priority: 'medium',
      actions
    });
  }

  /**
   * Nettoie les ressources
   */
  destroy(): void {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    this.listeners = [];
    this.notifications = [];
  }
}

// Export de l'instance singleton
export const notificationService = NotificationService.getInstance();

