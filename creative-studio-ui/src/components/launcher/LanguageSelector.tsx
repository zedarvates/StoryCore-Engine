import React, { memo } from 'react';
import { Check, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type LanguageCode } from '@/utils/llmConfigStorage';

// ============================================================================
// Types
// ============================================================================

export type { LanguageCode };

export interface LanguageOption {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
}

export interface LanguageSelectorProps {
  currentLanguage: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
  position?: 'top' | 'bottom';
}

// ============================================================================
// Constants
// ============================================================================

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
];

// ============================================================================
// Language Selector Component
// ============================================================================

export const LanguageSelector = memo(function LanguageSelector({
  currentLanguage,
  onLanguageChange,
  position = 'bottom',
}: LanguageSelectorProps) {
  const currentLanguageOption = SUPPORTED_LANGUAGES.find(
    (lang) => lang.code === currentLanguage
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-400 hover:text-white hover:bg-gray-700"
          title="Change Language"
          aria-label={`Change language. Current language: ${currentLanguageOption?.nativeName || currentLanguage}`}
          aria-haspopup="menu"
        >
          <Globe className="w-5 h-5" aria-hidden="true" />
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 bg-gray-800 border-gray-700 text-gray-200"
      >
        {SUPPORTED_LANGUAGES.map((language) => {
          const isSelected = language.code === currentLanguage;
          
          return (
            <DropdownMenuItem
              key={language.code}
              onSelect={() => onLanguageChange(language.code)}
              className="hover:bg-gray-700 focus:bg-gray-700 cursor-pointer"
            >
              <div className="flex items-center gap-3 w-full">
                <span className="text-xl" role="img" aria-label={`${language.name} flag`}>{language.flag}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-200">
                    {language.nativeName}
                  </div>
                  <div className="text-xs text-gray-400">{language.name}</div>
                </div>
                {isSelected && (
                  <Check className="w-4 h-4 text-purple-400" aria-hidden="true" />
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
