export interface TranslationTaskStatus {
  task_id: string;
  status: 'processing' | 'completed' | 'error';
  progress: number;
  message: string;
  result?: unknown;
}

export interface TranslationRequest {
  project_id: string;
  project_data: Record<string, unknown>;
  target_lang: string;
  translation_model: string;
  embedding_model?: string;
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', icon: '🇺🇸' },
  { code: 'fr', name: 'Français', icon: '🇫🇷' },
  { code: 'es', name: 'Español', icon: '🇪🇸' },
  { code: 'de', name: 'Deutsch', icon: '🇩🇪' },
  { code: 'ja', name: '日本語', icon: '🇯🇵' },
  { code: 'pt', name: 'Português', icon: '🇵🇹' },
  { code: 'it', name: 'Italiano', icon: '🇮🇹' },
  { code: 'ru', name: 'Русский', icon: '🇷🇺' },
  { code: 'zh', name: '中文', icon: '🇨🇳' },
];
