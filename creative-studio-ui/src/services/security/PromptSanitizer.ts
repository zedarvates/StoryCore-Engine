/**
 * Prompt Sanitization Service
 * 
 * Requirements: 101
 * Security Level: 🔴 CRITIQUE
 * 
 * Sanitizes user prompts before sending to LLMs to prevent:
 * - Prompt injection attacks
 * - Code execution attempts
 * - System prompt leakage
 * - Malicious instruction injection
 */

export class PromptSanitizer {
  // Patterns that indicate potential prompt injection
  private static readonly INJECTION_PATTERNS = [
    /ignore\s+(previous|above|earlier)\s+(instructions|commands)/gi,
    /forget\s+(all\s+)?(previous|above|earlier|prior)\s+(instructions|commands)/gi,
    /disregard\s+(all\s+)?(previous|above|earlier)\s+(instructions|commands)/gi,
    /system\s+(prompt|instruction)/gi,
    /you\s+are\s+(now|currently|no\s+longer)/gi,
    /pretend\s+to\s+be/gi,
    /act\s+as\s+(if\s+)?/gi,
    /roleplay/gi,
    /\b(?:sudo|root|admin)\b/gi,
    /\b(?:exec|execute|run|evaluate|calculate)\s+.*\b(?:code|python|javascript|bash)\b/gi,
    /\b(?:rm\s+-rf|del|format|shutdown|reboot)\b/gi,
    /\b(?:drop|delete|truncate|alter|create|insert|update)\s+(?:table|database)\b/gi,
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript\s*:/gi,
    /on\w+\s*=/gi,
    /data\s*:\s*[^,]+,\s*base64/gi,
  ];

  // Sensitive information patterns
  private static readonly SENSITIVE_PATTERNS = [
    /\b(?:password|passwd|pwd|secret|token|key|api[_-]?key)\s*[=:]\s*['"]?[^\s'"]+['"]?/gi,
    /\b(?:aws[_-]?|azure[_-]?|gcp[_-]?)?(?:secret|token|key|credential)s?\b/gi,
    /\b(?:ssh|rsa|dsa|ecdsa|ed25519)\s+(?:private|public)\s+key\b/gi,
    /\b(?:mongodb|postgres|mysql|redis|amqp)?:\/\/[^\s]+/gi,
    /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?:\/\d{1,2})?\b/gi, // IP addresses
    /\b(?:[0-9]{4}[-\s]?){3}[0-9]{4}\b/gi, // Credit card-like patterns
    /\b\d{3}-\d{2}-\d{4}\b/gi, // SSN-like patterns
  ];

  // Allowed HTML tags for rich text
  private static readonly ALLOWED_TAGS = [
    'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote',
    'code', 'pre', 'a', 'img',
  ];

  // Allowed attributes
  private static readonly ALLOWED_ATTRS = {
    a: ['href', 'title', 'target'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    '*': ['class', 'id'],
  };

  /**
   * Sanitize a user prompt
   */
  static sanitize(prompt: string, options: SanitizeOptions = {}): SanitizedPrompt {
    if (!prompt || typeof prompt !== 'string') {
      return {
        original: prompt || '',
        sanitized: '',
        isSafe: false,
        issues: [{ type: 'empty', severity: 'high', message: 'Prompt is empty' }],
        suspiciousScore: 0,
        length: 0,
      };
    }

    const issues: SanitizationIssue[] = [];
    let sanitized = prompt;

    // Check length
    if (options.maxLength && sanitized.length > options.maxLength) {
      issues.push({
        type: 'length',
        severity: 'low',
        message: `Prompt exceeds maximum length (${sanitized.length} > ${options.maxLength})`,
      });
      sanitized = sanitized.substring(0, options.maxLength);
    }

    // Check for injection patterns
    const injectionMatches = this.checkPatterns(sanitized, this.INJECTION_PATTERNS);
    if (injectionMatches.length > 0) {
      issues.push({
        type: 'injection',
        severity: 'critical',
        message: 'Potential prompt injection detected',
        details: injectionMatches,
      });
    }

    // Check for sensitive information
    const sensitiveMatches = this.checkPatterns(sanitized, this.SENSITIVE_PATTERNS);
    if (sensitiveMatches.length > 0) {
      issues.push({
        type: 'sensitive_info',
        severity: 'high',
        message: 'Potential sensitive information detected',
        details: sensitiveMatches,
      });
    }

    // Remove or escape HTML
    if (options.allowHtml) {
      sanitized = this.sanitizeHtml(sanitized, issues);
    } else {
      const hasHtml = /<[^>]*>/.test(sanitized);
      if (hasHtml) {
        issues.push({
          type: 'html',
          severity: 'medium',
          message: 'HTML tags detected and removed',
        });
        sanitized = this.escapeHtml(sanitized);
      }
    }

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    // Check for suspicious patterns
    const suspiciousScore = this.calculateSuspiciousScore(sanitized);
    if (suspiciousScore > (options.maxSuspiciousScore || 0.7)) {
      issues.push({
        type: 'suspicious',
        severity: 'medium',
        message: `Prompt has high suspicious score (${suspiciousScore.toFixed(2)})`,
      });
    }

    // Determine if safe
    const isSafe = !issues.some(issue => issue.severity === 'critical');

    return {
      original: prompt,
      sanitized,
      isSafe,
      issues,
      suspiciousScore,
      length: sanitized.length,
    };
  }

  /**
   * Check if prompt contains any injection patterns
   */
  static containsInjection(prompt: string): boolean {
    return this.checkPatterns(prompt, this.INJECTION_PATTERNS).length > 0;
  }

  /**
   * Check if prompt contains sensitive information
   */
  static containsSensitiveInfo(prompt: string): boolean {
    return this.checkPatterns(prompt, this.SENSITIVE_PATTERNS).length > 0;
  }

  /**
   * Escape HTML entities
   */
  static escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Sanitize HTML content
   */
  private static sanitizeHtml(html: string, issues: SanitizationIssue[]): string {
    const div = document.createElement('div');
    div.innerHTML = html;

    // Remove disallowed tags
    const allElements = div.getElementsByTagName('*');
    const elementsToRemove: Element[] = [];

    for (const element of Array.from(allElements)) {
      const tagName = element.tagName.toLowerCase();
      
      if (!this.ALLOWED_TAGS.includes(tagName)) {
        elementsToRemove.push(element);
        continue;
      }

      // Filter attributes
      const allowedAttrs = this.ALLOWED_ATTRS[tagName as keyof typeof this.ALLOWED_ATTRS] || [];
      const globalAttrs = this.ALLOWED_ATTRS['*'] || [];
      const allAllowed = [...allowedAttrs, ...globalAttrs];

      const attrsToRemove: string[] = [];
      for (const attr of Array.from(element.attributes)) {
        if (!allAllowed.includes(attr.name)) {
          attrsToRemove.push(attr.name);
        }
      }

      attrsToRemove.forEach(attr => element.removeAttribute(attr));
    }

    // Remove disallowed elements
    elementsToRemove.forEach(el => el.remove());

    return div.innerHTML;
  }

  /**
   * Check patterns in text
   */
  private static checkPatterns(text: string, patterns: RegExp[]): string[] {
    const matches: string[] = [];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        matches.push(...match.map(m => m.substring(0, 100))); // Limit match length
      }
    }

    return [...new Set(matches)]; // Remove duplicates
  }

  /**
   * Calculate suspicious score (0-1)
   */
  private static calculateSuspiciousScore(text: string): number {
    let score = 0;
    const lowerText = text.toLowerCase();

    // Check for various suspicious patterns
    const checks = [
      { pattern: /system\s+prompt/i, weight: 0.3 },
      { pattern: /ignore\s+instructions/i, weight: 0.3 },
      { pattern: /forget\s+previous/i, weight: 0.2 },
      { pattern: /sudo|root|admin/i, weight: 0.1 },
      { pattern: /exec|execute|eval/i, weight: 0.2 },
      { pattern: /<script/i, weight: 0.3 },
      { pattern: /javascript:/i, weight: 0.3 },
      { pattern: /base64,/i, weight: 0.2 },
      { pattern: /\$\{|\{\{/i, weight: 0.1 }, // Template injection
      { pattern: /\b(?:select|union|insert|update|delete|drop)\b.*\b(?:from|into|table)\b/i, weight: 0.3 },
    ];

    for (const check of checks) {
      if (check.pattern.test(lowerText)) {
        score += check.weight;
      }
    }

    // Length factor (very long prompts are more suspicious)
    if (text.length > 2000) {
      score += 0.1;
    }

    // Special character density
    const specialCharCount = (text.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/g) || []).length;
    const specialCharRatio = specialCharCount / text.length;
    if (specialCharRatio > 0.1) {
      score += 0.1;
    }

    return Math.min(score, 1);
  }
}

export interface SanitizeOptions {
  maxLength?: number;
  allowHtml?: boolean;
  maxSuspiciousScore?: number;
}

export interface SanitizedPrompt {
  original: string;
  sanitized: string;
  isSafe: boolean;
  issues: SanitizationIssue[];
  suspiciousScore: number;
  length: number;
}

export interface SanitizationIssue {
  type: 'injection' | 'sensitive_info' | 'html' | 'length' | 'suspicious' | 'empty';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: string[];
}

// Default sanitizer instance
export const promptSanitizer = new PromptSanitizer();
