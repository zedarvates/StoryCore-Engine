/**
 * LLM Services - Confucian LLM Assistant
 * 
 * Core services for multi-model management, prompt engineering,
 * and response parsing with thinking/summary format.
 */

export { OllamaClient } from './OllamaClient';
export type { ModelMetadata, OllamaGenerateOptions, OllamaGenerateResponse } from './OllamaClient';

export { ResponseParser } from './ResponseParser';
export type { ReasoningResponse, FormatValidation } from './ResponseParser';

export { PromptEngineeringEngine } from './PromptEngineeringEngine';
export type { PromptTemplate, FewShotExample, EnhancedPromptOptions } from './PromptEngineeringEngine';

export { MultiModelManager } from './MultiModelManager';
export type { LLMConfig, TaskType } from './MultiModelManager';

export { ConfigManager, DEFAULT_CONFIG } from './ConfigManager';
export type { LLMConfig as ConfigManagerLLMConfig } from './ConfigManager';
