"""
Multilingual API Data Models

This module defines data models for multilingual and internationalization (i18n)
operations including translation, language detection, localization, voice mapping,
and validation.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List
from datetime import datetime


@dataclass
class TranslationRequest:
    """Request for text translation."""
    text: str
    target_language: str
    source_language: Optional[str] = None
    preserve_formatting: bool = True
    glossary: Optional[Dict[str, str]] = None
    context: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TranslationResult:
    """Result of text translation."""
    translated_text: str
    source_language: str
    target_language: str
    confidence_score: float
    detected_source: bool
    character_count: int
    word_count: int
    translation_time_ms: float
    service_used: str
    metadata: Dict[str, Any]


@dataclass
class LanguageDetectionRequest:
    """Request for language detection."""
    text: str
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class LanguageDetectionResult:
    """Result of language detection."""
    detected_language: str
    language_name: str
    confidence_score: float
    character_count: int
    detection_time_ms: float
    alternative_languages: List[Dict[str, Any]] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class LocalizationRequest:
    """Request for content localization."""
    content: Dict[str, Any]
    target_locale: str
    content_type: str  # "text", "ui", "narrative", "dialogue"
    cultural_adaptation: bool = True
    preserve_tone: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class LocalizationResult:
    """Result of content localization."""
    localized_content: Dict[str, Any]
    target_locale: str
    content_type: str
    localization_time_ms: float
    adaptations_made: List[str] = field(default_factory=list)
    cultural_notes: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class VoiceMapping:
    """Voice actor mapping for a language."""
    language: str
    voice_id: str
    voice_name: str
    gender: str
    age_range: str
    accent: Optional[str] = None
    style: Optional[str] = None
    sample_url: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class VoiceMappingRequest:
    """Request for voice mapping."""
    target_language: str
    character_profile: Optional[Dict[str, Any]] = None
    voice_preferences: Optional[Dict[str, Any]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class VoiceMappingResult:
    """Result of voice mapping."""
    target_language: str
    total_voices_available: int
    mapping_time_ms: float
    recommended_voices: List[VoiceMapping] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TranslationValidationRequest:
    """Request for translation validation."""
    original_text: str
    translated_text: str
    source_language: str
    target_language: str
    validation_criteria: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ValidationIssue:
    """Translation validation issue."""
    issue_type: str
    severity: str  # "error", "warning", "info"
    description: str
    location: Optional[str] = None
    suggestion: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TranslationValidationResult:
    """Result of translation validation."""
    valid: bool
    overall_score: float
    accuracy_score: float
    fluency_score: float
    consistency_score: float
    cultural_appropriateness_score: float
    validation_time_ms: float
    issues: List[ValidationIssue] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


# Language code mappings (ISO 639-1)
SUPPORTED_LANGUAGES = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "ru": "Russian",
    "ja": "Japanese",
    "zh": "Chinese",
    "ko": "Korean",
    "ar": "Arabic",
    "hi": "Hindi",
    "nl": "Dutch",
    "pl": "Polish",
    "tr": "Turkish",
    "sv": "Swedish",
    "da": "Danish",
    "fi": "Finnish",
    "no": "Norwegian",
    "cs": "Czech",
    "el": "Greek",
    "he": "Hebrew",
    "th": "Thai",
    "vi": "Vietnamese",
    "id": "Indonesian",
}


# Locale mappings (language-region)
SUPPORTED_LOCALES = {
    "en-US": "English (United States)",
    "en-GB": "English (United Kingdom)",
    "en-CA": "English (Canada)",
    "en-AU": "English (Australia)",
    "es-ES": "Spanish (Spain)",
    "es-MX": "Spanish (Mexico)",
    "es-AR": "Spanish (Argentina)",
    "fr-FR": "French (France)",
    "fr-CA": "French (Canada)",
    "de-DE": "German (Germany)",
    "de-AT": "German (Austria)",
    "de-CH": "German (Switzerland)",
    "it-IT": "Italian (Italy)",
    "pt-BR": "Portuguese (Brazil)",
    "pt-PT": "Portuguese (Portugal)",
    "ja-JP": "Japanese (Japan)",
    "zh-CN": "Chinese (Simplified)",
    "zh-TW": "Chinese (Traditional)",
    "ko-KR": "Korean (South Korea)",
    "ar-SA": "Arabic (Saudi Arabia)",
    "hi-IN": "Hindi (India)",
}


def validate_language_code(language_code: str) -> bool:
    """Validate if language code is supported."""
    return language_code.lower() in SUPPORTED_LANGUAGES


def validate_locale_code(locale_code: str) -> bool:
    """Validate if locale code is supported."""
    return locale_code in SUPPORTED_LOCALES


def get_language_name(language_code: str) -> Optional[str]:
    """Get language name from code."""
    return SUPPORTED_LANGUAGES.get(language_code.lower())


def get_locale_name(locale_code: str) -> Optional[str]:
    """Get locale name from code."""
    return SUPPORTED_LOCALES.get(locale_code)
