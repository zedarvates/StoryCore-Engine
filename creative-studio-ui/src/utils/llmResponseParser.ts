/**
 * LLM Response Parser Utility
 * 
 * Provides robust parsing for LLM responses with comprehensive logging
 * and fallback strategies for handling various response formats.
 */

/**
 * Parse JSON from LLM response with detailed logging
 * Handles empty responses, malformed JSON, and various edge cases
 */
export function parseLLMJSON<T = any>(
  response: string,
  context: string = 'LLM Response'
): T | null {
  console.log(`🔍 [${context}] Raw response:`, response);
  console.log(`🔍 [${context}] Response length:`, response?.length || 0);

  if (!response || response.trim().length === 0) {
    console.warn(`⚠️ [${context}] Empty response received`);
    return null;
  }

  try {
    const trimmed = response.trim();
    console.log(`🔍 [${context}] Trimmed response (first 100 chars):`, trimmed.substring(0, 100));

    // Try to find JSON array or object
    const jsonMatch = trimmed.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (jsonMatch) {
      console.log(`📦 [${context}] Found JSON match`);
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log(`✅ [${context}] Successfully parsed JSON:`, parsed);
        return parsed as T;
      } catch (jsonError) {
        console.error(`❌ [${context}] JSON parsing failed:`, jsonError);
        console.error(`❌ [${context}] Failed JSON string:`, jsonMatch[0].substring(0, 200));
      }
    } else {
      console.warn(`⚠️ [${context}] No JSON object found in response`);
      console.log(`🔍 [${context}] Response starts with:`, trimmed.substring(0, 100));
    }
  } catch (error) {
    console.error(`❌ [${context}] Unexpected error:`, error);
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
    console.log(`✨ [${context}] Extracted array with ${parsed.length} items`);
    return parsed;
  }

  // If it's a single object, wrap it in an array
  console.log(`✨ [${context}] Wrapped single object in array`);
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
    console.log(`✨ [${context}] Extracted first object from array`);
    return parsed[0] || null;
  }

  // If it's already an object, return it
  console.log(`✨ [${context}] Extracted object`);
  return parsed as T;
}

/**
 * Validate that response is not empty (for debugging)
 */
export function validateLLMResponse(response: string, context: string = 'LLM Response'): boolean {
  if (!response || response.trim().length === 0) {
    console.error(`❌ [${context}] Response is empty!`);
    console.error(`❌ [${context}] This usually means the LLM model has extended thinking enabled`);
    console.error(`❌ [${context}] and is consuming all tokens without producing output.`);
    console.error(`❌ [${context}] Try using a different model like llama3.1:8b instead of qwen3-vl`);
    return false;
  }

  console.log(`✅ [${context}] Response is valid (${response.length} chars)`);
  return true;
}

/**
 * Extract text content from LLM response (for non-JSON responses)
 */
export function extractLLMText(response: string, context: string = 'LLM Text Response'): string {
  console.log(`🔍 [${context}] Extracting text from response`);

  if (!response || response.trim().length === 0) {
    console.warn(`⚠️ [${context}] Empty response`);
    return '';
  }

  const trimmed = response.trim();
  console.log(`✨ [${context}] Extracted text (${trimmed.length} chars)`);
  return trimmed;
}

/**
 * Parse comma-separated values from LLM response
 */
export function parseLLMCSV(response: string, context: string = 'LLM CSV Response'): string[] {
  console.log(`🔍 [${context}] Parsing CSV from response`);

  if (!response || response.trim().length === 0) {
    console.warn(`⚠️ [${context}] Empty response`);
    return [];
  }

  const items = response
    .split(/[,\n]/)
    .map(item => item.trim())
    .filter(item => item.length > 0);

  console.log(`✨ [${context}] Extracted ${items.length} items`);
  return items;
}

/**
 * Parse numbered list from LLM response
 */
export function parseLLMNumberedList(response: string, context: string = 'LLM List Response'): string[] {
  console.log(`🔍 [${context}] Parsing numbered list from response`);

  if (!response || response.trim().length === 0) {
    console.warn(`⚠️ [${context}] Empty response`);
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

  console.log(`✨ [${context}] Extracted ${items.length} items from numbered list`);
  return items;
}
