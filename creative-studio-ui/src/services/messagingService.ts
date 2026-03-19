/**
 * Messaging Service (Telegram & Discord)
 */

export interface MessagingStatus {
  telegram: 'configured' | 'missing_token';
  discord: 'configured' | 'missing_webhook';
}

class MessagingService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL || 'http://localhost:8080';
  }

  /**
   * Check connection status for Telegram and Discord
   */
  async getStatus(): Promise<MessagingStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/api/messaging/status`);
      if (!response.ok) throw new Error('Failed to fetch messaging status');
      return await response.json() as MessagingStatus;
    } catch (_error) {
      // Background check - log as info only
      console.debug('Messaging getStatus: Service not reachable (expected if backend is down)');
      return { telegram: 'missing_token', discord: 'missing_webhook' };
    }
  }

  /**
   * Send a message to Telegram
   */
  async sendTelegram(message: string, chatId?: string): Promise<unknown> {
    try {
      const response = await fetch(`${this.baseUrl}/api/messaging/telegram/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, target_id: chatId }),
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to send Telegram message');
      }
      return await response.json();
    } catch (error) {
      console.error('Messaging sendTelegram error:', error);
      throw error;
    }
  }

  /**
   * Send a message to Discord via webhook
   */
  async sendDiscord(message: string, webhookUrl?: string): Promise<unknown> {
    try {
      const response = await fetch(`${this.baseUrl}/api/messaging/discord/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, target_id: webhookUrl }),
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to send Discord message');
      }
      return await response.json();
    } catch (error) {
      console.error('Messaging sendDiscord error:', error);
      throw error;
    }
  }
}

export const messagingService = new MessagingService();
export default messagingService;
