/**
 * Feedback & Diagnostics Module
 * 
 * Export all feedback-related components and types
 */

export * from './types';

// Components
export { FeedbackPanel } from './FeedbackPanel';
export { PrivacyNotice, loadConsentPreference, saveConsentPreference } from './PrivacyNotice';
export { PendingReportsList } from './PendingReportsList';

// 💎 GemReward System
export { GemWallet } from './GemWallet';
export type { GemBalance, GemTransaction, GemTier } from './GemWallet';

