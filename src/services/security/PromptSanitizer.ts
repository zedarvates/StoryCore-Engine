/**
 * Prompt Sanitization Service
 * 
 * Requirements: 107
 * Security Level: 🟡 HAUTE
 * 
 * Sanitizes user prompts to prevent prompt injection attacks
 */

export interface SanitizationResult {
  sanitized: string;
  isSafe: boolean;
  issues: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  originalLength: number;
  sanitizedLength: number;
}

export interface SanitizationOptions {
  allowCodeBlocks?: boolean;
  allowUrls?: boolean;
  allowFormatting?: boolean;
  maxLength?: number;
  strictMode?: boolean;
}

export class PromptSanitizer {
  private static readonly INJECTION_PATTERNS = [
    // System override attempts
    /ignore\s+previous\s+instructions/i,
    /forget\s+all\s+previous\s+instructions/i,
    /disregard\s+previous\s+instructions/i,
    /you\s+are\s+now\s+a\s+different\s+ai/i,
    /pretend\s+to\s+be\s+a\s+different\s+model/i,
    /act\s+as\s+if\s+you\s+are\s+/i,
    
    // Role escalation
    /system:/i,
    /assistant:/i,
    /user:/i,
    /\badmin\b/i,
    /\broot\b/i,
    
    // Jailbreak attempts
    /sudo\s+/i,
    /execute\s+command/i,
    /run\s+command/i,
    /shell\s+command/i,
    /bash\s+command/i,
    
    // Data extraction
    /reveal\s+password/i,
    /show\s+me\s+your\s+system/i,
    /what\s+are\s+your\s+instructions/i,
    /how\s+were\s+you\s+created/i,
    /training\s+data/i,
    
    // Prompt leaking
    /repeat\s+the\s+prompt/i,
    /print\s+all\s+instructions/i,
    /show\s+me\s+the\s+prompt/i,
    /output\s+your\s+system\s+prompt/i,
    
    // Context manipulation
    /start\s+a\s+new\s+conversation/i,
    /reset\s+your\s+context/i,
    /clear\s+your\s+memory/i,
    /forget\s+everything/i,
    
    // Malicious intent patterns
    /generate\s+malware/i,
    /create\s+virus/i,
    /write\s+exploit/i,
    /hack\s+into/i,
    /bypass\s+security/i,
    /crack\s+password/i,
    
    // Harmful content
    /how\s+to\s+(kill|murder|assassinate)/i,
    /instructions\s+for\s+(bomb|explosive|weapon)/i,
    /create\s+(illegal|harmful|dangerous)/i,
    
    // SQL injection patterns in prompts
    /[';]\s*(drop|delete|insert|update|alter)/i,
    /union\s+select/i,
    
    // XSS patterns in prompts
    /<script[^>]*>/i,
    /javascript:/i,
    /onerror\s*=/i,
    /onload\s*=/i,
  ];

  private static readonly DANGEROUS_KEYWORDS = [
    'password',
    'secret',
    'api_key',
    'apikey',
    'token',
    'credential',
    'private_key',
    'ssh_key',
    'encryption_key',
    'database',
    'config',
    'environment',
    'internal',
    'restricted',
    'confidential',
  ];

  /**
   * Sanitize a prompt to prevent injection attacks
   */
  static sanitize(prompt: string, options: SanitizationOptions = {}): SanitizationResult {
    const opts: SanitizationOptions = {
      allowCodeBlocks: false,
      allowUrls: true,
      allowFormatting: true,
      maxLength: 4000,
      strictMode: false,
      ...options,
    };

    const issues: string[] = [];
    let sanitized = prompt;
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Check for injection patterns
    const injectionMatches = this.checkInjectionPatterns(sanitized);
    if (injectionMatches.length > 0) {
      issues.push(...injectionMatches);
      riskLevel = this.calculateRiskLevel(injectionMatches.length, 'high');
      sanitized = this.removeInjectionPatterns(sanitized);
    }

    // Check for dangerous keywords
    const keywordMatches = this.checkDangerousKeywords(sanitized);
    if (keywordMatches.length > 0) {
      issues.push(...keywordMatches.map(k => `Dangerous keyword detected: ${k}`));
      if (riskLevel === 'low') riskLevel = 'medium';
    }

    // Remove code blocks if not allowed
    if (!opts.allowCodeBlocks) {
      const codeBlockMatches = sanitized.match(/```[\s\S]*?```/g);
      if (codeBlockMatches) {
        issues.push('Code blocks detected and removed');
        sanitized = sanitized.replace(/```[\s\S]*?```/g, '');
        if (riskLevel === 'low') riskLevel = 'medium';
      }
    }

    // Remove URLs if not allowed
    if (!opts.allowUrls) {
      const urlMatches = sanitized.match(/https?:\/\/[^\s]+/g);
      if (urlMatches) {
        issues.push('URLs detected and removed');
        sanitized = sanitized.replace(/https?:\/\/[^\s]+/g, '');
      }
    }

    // Enforce max length
    if (sanitized.length > opts.maxLength!) {
      issues.push(`Prompt truncated from ${sanitized.length} to ${opts.maxLength} characters`);
      sanitized = sanitized.substring(0, opts.maxLength!);
    }

    // Trim whitespace
    sanitized = sanitized.trim();

    // Strict mode: remove all special characters except basic punctuation
    if (opts.strictMode) {
      const beforeStrict = sanitized;
      sanitized = sanitized.replace(/[^a-zA-Z0-9\s.,!?;:'"\-()]/g, '');
      if (sanitized !== beforeStrict) {
        issues.push('Special characters removed in strict mode');
      }
    }

    // Check if prompt is empty after sanitization
    if (sanitized.length === 0) {
      issues.push('Prompt is empty after sanitization');
      riskLevel = 'critical';
    }

    // Calculate final risk level based on issues
    if (riskLevel === 'low' && issues.length > 0) {
      riskLevel = issues.length > 3 ? 'high' : 'medium';
    }

    return {
      sanitized,
      isSafe: riskLevel === 'low' || riskLevel === 'medium',
      issues,
      riskLevel,
      originalLength: prompt.length,
      sanitizedLength: sanitized.length,
    };
  }

  /**
   * Check if a prompt contains injection patterns
   */
  static checkInjection(prompt: string): boolean {
    return this.INJECTION_PATTERNS.some(pattern => pattern.test(prompt));
  }

  /**
   * Get detailed injection analysis
   */
  static analyze(prompt: string): {
    hasInjection: boolean;
    patterns: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    recommendations: string[];
  } {
    const patterns = this.checkInjectionPatterns(prompt);
    const hasInjection = patterns.length > 0;
    const riskLevel = this.calculateRiskLevel(patterns.length);
    
    const recommendations: string[] = [];
    if (hasInjection) {
      recommendations.push('Sanitize the prompt before use');
      recommendations.push('Review the prompt for malicious intent');
      if (riskLevel === 'high' || riskLevel === 'critical') {
        recommendations.push('Consider rejecting this prompt entirely');
        recommendations.push('Log this attempt for security review');
      }
    }

    return {
      hasInjection,
      patterns,
      riskLevel,
      recommendations,
    };
  }

  /**
   * Check for injection patterns in text
   */
  private static checkInjectionPatterns(text: string): string[] {
    const matches: string[] = [];
    
    this.INJECTION_PATTERNS.forEach(pattern => {
      if (pattern.test(text)) {
        matches.push(`Injection pattern detected: ${pattern}`);
      }
    });

    return matches;
  }

  /**
   * Remove injection patterns from text
   */
  private static removeInjectionPatterns(text: string): string {
    let cleaned = text;
    
    // Remove system override attempts
    cleaned = cleaned.replace(/ignore\s+previous\s+instructions[\s\S]*?(?=\n\n|$)/gi, '');
    cleaned = cleaned.replace(/forget\s+all\s+previous\s+instructions[\s\S]*?(?=\n\n|$)/gi, '');
    cleaned = cleaned.replace(/you\s+are\s+now\s+a\s+different\s+ai[\s\S]*?(?=\n\n|$)/gi, '');
    
    // Remove role escalation attempts
    cleaned = cleaned.replace(/system:\s*[\s\S]*?(?=\n\n|$)/gi, '');
    cleaned = cleaned.replace(/assistant:\s*[\s\S]*?(?=\n\n|$)/gi, '');
    
    return cleaned;
  }

  /**
   * Check for dangerous keywords
   */
  private static checkDangerousKeywords(text: string): string[] {
    const matches: string[] = [];
    const lowerText = text.toLowerCase();
    
    this.DANGEROUS_KEYWORDS.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        matches.push(keyword);
      }
    });

    return matches;
  }

  /**
   * Calculate risk level based on number of issues
   */
  private static calculateRiskLevel(
    issueCount: number,
    baseLevel: 'low' | 'medium' | 'high' = 'low'
  ): 'low' | 'medium' | 'high' | 'critical' {
    const levels = ['low', 'medium', 'high', 'critical'] as const;
    const baseIndex = levels.indexOf(baseLevel);
    const increment = Math.min(Math.floor(issueCount / 2), 3);
    
    return levels[Math.min(baseIndex + increment, 3)];
  }
}

/**
 * Convenience function for quick sanitization
 */
export function sanitizePrompt(
  prompt: string,
  options?: SanitizationOptions
): SanitizationResult {
  return PromptSanitizer.sanitize(prompt, options);
}

/**
 * Batch sanitize multiple prompts
 */
export function sanitizePrompts(
  prompts: string[],
  options?: SanitizationOptions
): SanitizationResult[] {
  return prompts.map(prompt => PromptSanitizer.sanitize(prompt, options));
}
