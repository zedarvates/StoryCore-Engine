/**
 * LLM Response Parser Utility
 * 
 * Provides robust parsing for LLM responses with development-only logging
 * and fallback strategies for handling various response formats.
 */

import { logger } from './logger';
import { devLog, devWarn } from './devOnly';

/**
 * Parse JSON from LLM response with detailed logging
 * Handles empty responses, malformed JSON, and various edge cases
 */
export function parseLLMJSON<T = any>(
  response: string,
  context: string = 'LLM Response'
): T | null {
  devLog(`🔍 [${context}] Raw response:`, response);
  devLog(`🔍 [${context}] Response length:`, response?.length || 0);

  if (!response || response.trim().length === 0) {
    devWarn(`⚠️ [${context}] Empty response received`);
    return null;
  }

  try {
    const trimmed = response.trim();
    devLog(`🔍 [${context}] Trimmed response (first 100 chars):`, trimmed.substring(0, 100));

    // Try to find JSON array or object
    const jsonMatch = trimmed.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (jsonMatch) {
      devLog(`📦 [${context}] Found JSON match`);
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        devLog(`✅ [${context}] Successfully parsed JSON:`, parsed);
        return parsed as T;
      } catch (jsonError) {
        logger.error(`❌ [${context}] JSON parsing failed:`, jsonError);
        logger.error(`❌ [${context}] Failed JSON string:`, jsonMatch[0].substring(0, 200));
      }
    } else {
      devWarn(`⚠️ [${context}] No JSON object found in response`);
      devLog(`🔍 [${context}] Response starts with:`, trimmed.substring(0, 100));
    }
  } catch (error) {
    logger.error(`❌ [${context}] Unexpected error:`, error);
  }

  return null;
}

/**
 * Parse array of items from LLM response
 */
export function parseLLMArray<T = any>(
  response: string,
  context: string = 'LLM Array Response'
): T[] {
  const parsed = parseLLMJSON<T[] | T>(response, context);

  if (!parsed) {
    return [];
  }

  // If it's already an array, return it
  if (Array.isArray(parsed)) {
    devLog(`✨ [${context}] Extracted array with ${parsed.length} items`);
    return parsed;
  }

  // If it's a single object, wrap it in an array
  devLog(`✨ [${context}] Wrapped single object in array`);
  return [parsed];
}

/**
 * Parse object from LLM response
 */
export function parseLLMObject<T = any>(
  response: string,
  context: string = 'LLM Object Response'
): T | null {
  const parsed = parseLLMJSON<T | T[]>(response, context);

  if (!parsed) {
    return null;
  }

  // If it's an array, take the first element
  if (Array.isArray(parsed)) {
    devLog(`✨ [${context}] Extracted first object from array`);
    return parsed[0] || null;
  }

  // If it's already an object, return it
  devLog(`✨ [${context}] Extracted object`);
  return parsed as T;
}

/**
 * Validate that response is not empty (for debugging)
 */
export function validateLLMResponse(response: string, context: string = 'LLM Response'): boolean {
  if (!response || response.trim().length === 0) {
    logger.error(`❌ [${context}] Response is empty!`);
    logger.error(`❌ [${context}] This usually means the LLM model has extended thinking enabled`);
    logger.error(`❌ [${context}] and is consuming all tokens without producing output.`);
    logger.error(`❌ [${context}] Try using a different model like llama3.1:8b instead of qwen3-vl`);
    return false;
  }

  devLog(`✅ [${context}] Response is valid (${response.length} chars)`);
  return true;
}

/**
 * Extract text content from LLM response (for non-JSON responses)
 */
export function extractLLMText(response: string, context: string = 'LLM Text Response'): string {
  devLog(`🔍 [${context}] Extracting text from response`);

  if (!response || response.trim().length === 0) {
    devWarn(`⚠️ [${context}] Empty response`);
    return '';
  }

  const trimmed = response.trim();
  devLog(`✨ [${context}] Extracted text (${trimmed.length} chars)`);
  return trimmed;
}

/**
 * Parse comma-separated values from LLM response
 */
export function parseLLMCSV(response: string, context: string = 'LLM CSV Response'): string[] {
  devLog(`🔍 [${context}] Parsing CSV from response`);

  if (!response || response.trim().length === 0) {
    devWarn(`⚠️ [${context}] Empty response`);
    return [];
  }

  const items = response
    .split(/[,\n]/)
    .map(item => item.trim())
    .filter(item => item.length > 0);

  devLog(`✨ [${context}] Extracted ${items.length} items`);
  return items;
}

/**
 * Parse numbered list from LLM response
 */
export function parseLLMNumberedList(response: string, context: string = 'LLM List Response'): string[] {
  devLog(`🔍 [${context}] Parsing numbered list from response`);

  if (!response || response.trim().length === 0) {
    devWarn(`⚠️ [${context}] Empty response`);
    return [];
  }

  const items: string[] = [];
  const lines = response.split('\n');

  for (const line of lines) {
    const match = line.match(/^\d+\.\s*(.+)$/);
    if (match) {
      items.push(match[1].trim());
    }
  }

  devLog(`✨ [${context}] Extracted ${items.length} items from numbered list`);
  return items;
}
