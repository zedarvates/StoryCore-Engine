/**
 * Clipboard Utility
 * 
 * Provides functions to copy text to clipboard using the Clipboard API
 */

/**
 * Copy text to clipboard
 * 
 * Requirements: 1.4
 * 
 * @param text Text to copy
 * @returns Promise that resolves when copy is successful
 * @throws Error if clipboard access fails
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    // Try modern Clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (!successful) {
        throw new Error('Copy command failed');
      }
    } finally {
      document.body.removeChild(textArea);
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    throw new Error('Failed to copy to clipboard. Please copy the template manually.');
  }
}

/**
 * Check if clipboard API is available
 * 
 * @returns True if clipboard API is available
 */
export function isClipboardAvailable(): boolean {
  return !!(navigator.clipboard && navigator.clipboard.writeText) || 
         document.queryCommandSupported?.('copy');
}
