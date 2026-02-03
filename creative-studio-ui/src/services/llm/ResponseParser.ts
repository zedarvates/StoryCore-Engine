/**
 * Response Parser Service
 * 
 * Extracts and validates thinking/summary blocks from LLM responses.
 * Handles malformed responses gracefully with fallback parsing.
 */

export interface ReasoningResponse {
  thinking?: string;
  summary: string;
  rawResponse: string;
  modelUsed: string;
  formatValid: boolean;
  timestamp: number;
}

export interface FormatValidation {
  valid: boolean;
  errors: string[];
}

/**
 * Response Parser for thinking/summary format
 */
export class ResponseParser {
  /**
   * Parse LLM response and extract thinking/summary blocks
   */
  parseResponse(rawResponse: string, modelUsed: string = ''): ReasoningResponse {
    const thinkingMatch = rawResponse.match(/<thinking>([\s\S]*?)<\/thinking>/);
    const summaryMatch = rawResponse.match(/<summary>([\s\S]*?)<\/summary>/);
    
    const thinking = thinkingMatch ? thinkingMatch[1].trim() : undefined;
    const summary = summaryMatch 
      ? summaryMatch[1].trim() 
      : this.extractFallbackSummary(rawResponse);
    
    return {
      thinking,
      summary,
      rawResponse,
      modelUsed,
      formatValid: !!(thinkingMatch && summaryMatch),
      timestamp: Date.now(),
    };
  }

  /**
   * Extract summary if format is incorrect
   * Removes any partial tags and cleans up the response
   */
  private extractFallbackSummary(response: string): string {
    // Remove any partial or complete thinking blocks
    let cleaned = response
      .replace(/<thinking>[\s\S]*?<\/thinking>/g, '')
      .replace(/<summary>[\s\S]*?<\/summary>/g, '')
      .replace(/<\/?thinking>/g, '')
      .replace(/<\/?summary>/g, '')
      .trim();
    
    // If nothing left after cleaning, return original
    return cleaned || response;
  }

  /**
   * Validate response format
   */
  validateFormat(response: string): FormatValidation {
    const errors: string[] = [];
    
    // Check for opening tags
    if (!response.includes('<thinking>')) {
      errors.push('Missing <thinking> opening tag');
    }
    if (!response.includes('<summary>')) {
      errors.push('Missing <summary> opening tag');
    }
    
    // Check for closing tags
    if (!response.includes('</thinking>')) {
      errors.push('Missing </thinking> closing tag');
    }
    if (!response.includes('</summary>')) {
      errors.push('Missing </summary> closing tag');
    }
    
    // Check for proper nesting (thinking should come before summary)
    const thinkingStart = response.indexOf('<thinking>');
    const thinkingEnd = response.indexOf('</thinking>');
    const summaryStart = response.indexOf('<summary>');
    const summaryEnd = response.indexOf('</summary>');
    
    if (thinkingStart !== -1 && thinkingEnd !== -1) {
      if (thinkingEnd < thinkingStart) {
        errors.push('Thinking closing tag appears before opening tag');
      }
    }
    
    if (summaryStart !== -1 && summaryEnd !== -1) {
      if (summaryEnd < summaryStart) {
        errors.push('Summary closing tag appears before opening tag');
      }
    }
    
    if (thinkingEnd !== -1 && summaryStart !== -1) {
      if (summaryStart < thinkingEnd) {
        errors.push('Summary block starts before thinking block ends');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Handle edge cases like missing tags or nested tags
   */
  handleEdgeCases(response: string): ReasoningResponse {
    // Try to extract content even with malformed tags
    let thinking: string | undefined;
    let summary: string;
    
    // Handle missing closing tags
    const thinkingStartMatch = response.match(/<thinking>([\s\S]*?)(?:<\/thinking>|<summary>|$)/);
    if (thinkingStartMatch) {
      thinking = thinkingStartMatch[1].trim();
    }
    
    const summaryStartMatch = response.match(/<summary>([\s\S]*?)(?:<\/summary>|$)/);
    if (summaryStartMatch) {
      summary = summaryStartMatch[1].trim();
    } else {
      // If no summary tag at all, use fallback
      summary = this.extractFallbackSummary(response);
    }
    
    // Handle nested tags (extract outermost content)
    if (thinking && thinking.includes('<thinking>')) {
      // Remove nested thinking tags
      thinking = thinking.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
    }
    
    if (summary && summary.includes('<summary>')) {
      // Remove nested summary tags
      summary = summary.replace(/<summary>[\s\S]*?<\/summary>/g, '').trim();
    }
    
    return {
      thinking,
      summary,
      rawResponse: response,
      modelUsed: '',
      formatValid: false,
      timestamp: Date.now(),
    };
  }

  /**
   * Extract just the summary for display (removes thinking)
   */
  extractSummaryOnly(response: string): string {
    const parsed = this.parseResponse(response);
    return parsed.summary;
  }

  /**
   * Extract just the thinking for display
   */
  extractThinkingOnly(response: string): string | undefined {
    const parsed = this.parseResponse(response);
    return parsed.thinking;
  }

  /**
   * Check if response has valid thinking/summary format
   */
  hasValidFormat(response: string): boolean {
    const validation = this.validateFormat(response);
    return validation.valid;
  }

  /**
   * Get format errors for debugging
   */
  getFormatErrors(response: string): string[] {
    const validation = this.validateFormat(response);
    return validation.errors;
  }
}
