import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ============================================================================
// Internationalisation (i18n) Utilities
// Support multilingue avec détection automatique et RTL
// ============================================================================

export type SupportedLanguage = 'fr' | 'en' | 'es' | 'de' | 'ja' | 'pt' | 'it' | 'ru' | 'zh';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  dir?: 'ltr' | 'rtl';
}

export const LANGUAGES: LanguageInfo[] = [
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', dir: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
];

// ============================================================================
// i18n Context
// ============================================================================

interface I18nContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
  isRtl: boolean;
  languages: LanguageInfo[];
}

const I18nContext = createContext<I18nContextType | null>(null);

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

// ============================================================================
// Simple Translation Dictionary (Fallback)
// ============================================================================

const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  fr: {
    'common.next': 'Suivant',
    'common.previous': 'Précédent',
    'common.save': 'Sauvegarder',
    'common.cancel': 'Annuler',
    'common.close': 'Fermer',
    'common.generate': 'Générer',
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.success': 'Succès',
    'common.step': 'Étape',
    'common.of': 'sur',
    'common.required': 'Ce champ est obligatoire',
    'common.saveDraft': 'Brouillon sauvegardé',
    
    // Menu Bar - Main Menus
    'menu.file': 'Fichier',
    'menu.edit': 'Édition',
    'menu.view': 'Affichage',
    'menu.project': 'Projet',
    'menu.tools': 'Outils',
    'menu.help': 'Aide',
    
    // File Menu
    'menu.file.new': 'Nouveau Projet',
    'menu.file.open': 'Ouvrir un Projet',
    'menu.file.save': 'Enregistrer le Projet',
    'menu.file.saveAs': 'Enregistrer Sous',
    'menu.file.export': 'Exporter',
    'menu.file.export.json': 'Exporter en JSON',
    'menu.file.export.pdf': 'Exporter en PDF',
    'menu.file.export.video': 'Exporter en Vidéo',
    'menu.file.recent': 'Projets Récents',
    
    // Edit Menu
    'menu.edit.undo': 'Annuler',
    'menu.edit.redo': 'Rétablir',
    'menu.edit.cut': 'Couper',
    'menu.edit.copy': 'Copier',
    'menu.edit.paste': 'Coller',
    'menu.edit.preferences': 'Préférences',
    'menu.edit.settings': 'Paramètres',
    'menu.edit.settings.llm': 'Configuration LLM',
    'menu.edit.settings.comfyui': 'Configuration ComfyUI',
    'menu.edit.settings.addons': 'Extensions',
    'menu.edit.settings.general': 'Paramètres Généraux',
    
    // View Menu
    'menu.view.timeline': 'Chronologie',
    'menu.view.zoomIn': 'Zoom Avant',
    'menu.view.zoomOut': 'Zoom Arrière',
    'menu.view.resetZoom': 'Réinitialiser le Zoom',
    'menu.view.toggleGrid': 'Afficher/Masquer la Grille',
    'menu.view.panels': 'Panneaux',
    'menu.view.panels.properties': 'Propriétés',
    'menu.view.panels.assets': 'Ressources',
    'menu.view.panels.preview': 'Aperçu',
    'menu.view.fullScreen': 'Plein Écran',
    
    // Project Menu
    'menu.project.settings': 'Paramètres du Projet',
    'menu.project.characters': 'Personnages',
    'menu.project.sequences': 'Séquences',
    'menu.project.assets': 'Bibliothèque de Ressources',
    
    // Tools Menu
    'menu.tools.llmAssistant': 'Assistant LLM',
    'menu.tools.comfyUIServer': 'Serveur ComfyUI',
    'menu.tools.scriptWizard': 'Assistant de Script',
    'menu.tools.batchGeneration': 'Génération par Lot',
    'menu.tools.qualityAnalysis': 'Analyse de Qualité',
    
    // Help Menu
    'menu.help.documentation': 'Documentation',
    'menu.help.keyboardShortcuts': 'Raccourcis Clavier',
    'menu.help.about': 'À Propos de StoryCore',
    'menu.help.checkUpdates': 'Vérifier les Mises à Jour',
    'menu.help.reportIssue': 'Signaler un Problème',
  },
  en: {
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.generate': 'Generate',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.step': 'Step',
    'common.of': 'of',
    'common.required': 'This field is required',
    'common.saveDraft': 'Draft saved',
    
    // Menu Bar - Main Menus
    'menu.file': 'File',
    'menu.edit': 'Edit',
    'menu.view': 'View',
    'menu.project': 'Project',
    'menu.tools': 'Tools',
    'menu.help': 'Help',
    
    // File Menu
    'menu.file.new': 'New Project',
    'menu.file.open': 'Open Project',
    'menu.file.save': 'Save Project',
    'menu.file.saveAs': 'Save As',
    'menu.file.export': 'Export',
    'menu.file.export.json': 'Export as JSON',
    'menu.file.export.pdf': 'Export as PDF',
    'menu.file.export.video': 'Export as Video',
    'menu.file.recent': 'Recent Projects',
    
    // Edit Menu
    'menu.edit.undo': 'Undo',
    'menu.edit.redo': 'Redo',
    'menu.edit.cut': 'Cut',
    'menu.edit.copy': 'Copy',
    'menu.edit.paste': 'Paste',
    'menu.edit.preferences': 'Preferences',
    'menu.edit.settings': 'Settings',
    'menu.edit.settings.llm': 'LLM Configuration',
    'menu.edit.settings.comfyui': 'ComfyUI Configuration',
    'menu.edit.settings.addons': 'Add-ons',
    'menu.edit.settings.general': 'General Settings',
    
    // View Menu
    'menu.view.timeline': 'Timeline',
    'menu.view.zoomIn': 'Zoom In',
    'menu.view.zoomOut': 'Zoom Out',
    'menu.view.resetZoom': 'Reset Zoom',
    'menu.view.toggleGrid': 'Toggle Grid',
    'menu.view.panels': 'Panels',
    'menu.view.panels.properties': 'Properties',
    'menu.view.panels.assets': 'Assets',
    'menu.view.panels.preview': 'Preview',
    'menu.view.fullScreen': 'Full Screen',
    
    // Project Menu
    'menu.project.settings': 'Project Settings',
    'menu.project.characters': 'Characters',
    'menu.project.sequences': 'Sequences',
    'menu.project.assets': 'Asset Library',
    
    // Tools Menu
    'menu.tools.llmAssistant': 'LLM Assistant',
    'menu.tools.comfyUIServer': 'ComfyUI Server',
    'menu.tools.scriptWizard': 'Script Wizard',
    'menu.tools.batchGeneration': 'Batch Generation',
    'menu.tools.qualityAnalysis': 'Quality Analysis',
    
    // Help Menu
    'menu.help.documentation': 'Documentation',
    'menu.help.keyboardShortcuts': 'Keyboard Shortcuts',
    'menu.help.about': 'About StoryCore',
    'menu.help.checkUpdates': 'Check for Updates',
    'menu.help.reportIssue': 'Report Issue',
  },
  es: {
    'common.next': 'Siguiente',
    'common.previous': 'Anterior',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.close': 'Cerrar',
    'common.generate': 'Generar',
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.success': 'Éxito',
    'common.step': 'Paso',
    'common.of': 'de',
    'common.required': 'Este campo es obligatorio',
    'common.saveDraft': 'Borrador guardado',
    
    // Menu Bar - Main Menus
    'menu.file': 'Archivo',
    'menu.edit': 'Editar',
    'menu.view': 'Ver',
    'menu.project': 'Proyecto',
    'menu.tools': 'Herramientas',
    'menu.help': 'Ayuda',
    
    // File Menu
    'menu.file.new': 'Nuevo Proyecto',
    'menu.file.open': 'Abrir Proyecto',
    'menu.file.save': 'Guardar Proyecto',
    'menu.file.saveAs': 'Guardar Como',
    'menu.file.export': 'Exportar',
    'menu.file.export.json': 'Exportar como JSON',
    'menu.file.export.pdf': 'Exportar como PDF',
    'menu.file.export.video': 'Exportar como Video',
    'menu.file.recent': 'Proyectos Recientes',
    
    // Edit Menu
    'menu.edit.undo': 'Deshacer',
    'menu.edit.redo': 'Rehacer',
    'menu.edit.cut': 'Cortar',
    'menu.edit.copy': 'Copiar',
    'menu.edit.paste': 'Pegar',
    'menu.edit.preferences': 'Preferencias',
    'menu.edit.settings': 'Configuración',
    'menu.edit.settings.llm': 'Configuración LLM',
    'menu.edit.settings.comfyui': 'Configuración ComfyUI',
    'menu.edit.settings.addons': 'Complementos',
    'menu.edit.settings.general': 'Configuración General',
    
    // View Menu
    'menu.view.timeline': 'Línea de Tiempo',
    'menu.view.zoomIn': 'Acercar',
    'menu.view.zoomOut': 'Alejar',
    'menu.view.resetZoom': 'Restablecer Zoom',
    'menu.view.toggleGrid': 'Mostrar/Ocultar Cuadrícula',
    'menu.view.panels': 'Paneles',
    'menu.view.panels.properties': 'Propiedades',
    'menu.view.panels.assets': 'Recursos',
    'menu.view.panels.preview': 'Vista Previa',
    'menu.view.fullScreen': 'Pantalla Completa',
    
    // Project Menu
    'menu.project.settings': 'Configuración del Proyecto',
    'menu.project.characters': 'Personajes',
    'menu.project.sequences': 'Secuencias',
    'menu.project.assets': 'Biblioteca de Recursos',
    
    // Tools Menu
    'menu.tools.llmAssistant': 'Asistente LLM',
    'menu.tools.comfyUIServer': 'Servidor ComfyUI',
    'menu.tools.scriptWizard': 'Asistente de Guion',
    'menu.tools.batchGeneration': 'Generación por Lotes',
    'menu.tools.qualityAnalysis': 'Análisis de Calidad',
    
    // Help Menu
    'menu.help.documentation': 'Documentación',
    'menu.help.keyboardShortcuts': 'Atajos de Teclado',
    'menu.help.about': 'Acerca de StoryCore',
    'menu.help.checkUpdates': 'Buscar Actualizaciones',
    'menu.help.reportIssue': 'Reportar Problema',
  },
  de: {
    'common.next': 'Weiter',
    'common.previous': 'Zurück',
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.close': 'Schließen',
    'common.generate': 'Generieren',
    'common.loading': 'Laden...',
    'common.error': 'Fehler',
    'common.success': 'Erfolg',
    'common.step': 'Schritt',
    'common.of': 'von',
    'common.required': 'Dieses Feld ist erforderlich',
    'common.saveDraft': 'Entwurf gespeichert',
    
    // Menu Bar - Main Menus
    'menu.file': 'Datei',
    'menu.edit': 'Bearbeiten',
    'menu.view': 'Ansicht',
    'menu.project': 'Projekt',
    'menu.tools': 'Werkzeuge',
    'menu.help': 'Hilfe',
    
    // File Menu
    'menu.file.new': 'Neues Projekt',
    'menu.file.open': 'Projekt Öffnen',
    'menu.file.save': 'Projekt Speichern',
    'menu.file.saveAs': 'Speichern Unter',
    'menu.file.export': 'Exportieren',
    'menu.file.export.json': 'Als JSON Exportieren',
    'menu.file.export.pdf': 'Als PDF Exportieren',
    'menu.file.export.video': 'Als Video Exportieren',
    'menu.file.recent': 'Zuletzt Verwendete Projekte',
    
    // Edit Menu
    'menu.edit.undo': 'Rückgängig',
    'menu.edit.redo': 'Wiederholen',
    'menu.edit.cut': 'Ausschneiden',
    'menu.edit.copy': 'Kopieren',
    'menu.edit.paste': 'Einfügen',
    'menu.edit.preferences': 'Einstellungen',
    'menu.edit.settings': 'Einstellungen',
    'menu.edit.settings.llm': 'LLM-Konfiguration',
    'menu.edit.settings.comfyui': 'ComfyUI-Konfiguration',
    'menu.edit.settings.addons': 'Erweiterungen',
    'menu.edit.settings.general': 'Allgemeine Einstellungen',
    
    // View Menu
    'menu.view.timeline': 'Zeitleiste',
    'menu.view.zoomIn': 'Vergrößern',
    'menu.view.zoomOut': 'Verkleinern',
    'menu.view.resetZoom': 'Zoom Zurücksetzen',
    'menu.view.toggleGrid': 'Raster Ein/Aus',
    'menu.view.panels': 'Bereiche',
    'menu.view.panels.properties': 'Eigenschaften',
    'menu.view.panels.assets': 'Ressourcen',
    'menu.view.panels.preview': 'Vorschau',
    'menu.view.fullScreen': 'Vollbild',
    
    // Project Menu
    'menu.project.settings': 'Projekteinstellungen',
    'menu.project.characters': 'Charaktere',
    'menu.project.sequences': 'Sequenzen',
    'menu.project.assets': 'Ressourcenbibliothek',
    
    // Tools Menu
    'menu.tools.llmAssistant': 'LLM-Assistent',
    'menu.tools.comfyUIServer': 'ComfyUI-Server',
    'menu.tools.scriptWizard': 'Skript-Assistent',
    'menu.tools.batchGeneration': 'Stapelverarbeitung',
    'menu.tools.qualityAnalysis': 'Qualitätsanalyse',
    
    // Help Menu
    'menu.help.documentation': 'Dokumentation',
    'menu.help.keyboardShortcuts': 'Tastenkombinationen',
    'menu.help.about': 'Über StoryCore',
    'menu.help.checkUpdates': 'Nach Updates Suchen',
    'menu.help.reportIssue': 'Problem Melden',
  },
  ja: {
    'common.next': '次へ',
    'common.previous': '前へ',
    'common.save': '保存',
    'common.cancel': 'キャンセル',
    'common.close': '閉じる',
    'common.generate': '生成',
    'common.loading': '読み込み中...',
    'common.error': 'エラー',
    'common.success': '成功',
    'common.step': 'ステップ',
    'common.of': '/',
    'common.required': 'この項目は必須です',
    'common.saveDraft': '下書きを保存しました',
    
    // Menu Bar - Main Menus
    'menu.file': 'ファイル',
    'menu.edit': '編集',
    'menu.view': '表示',
    'menu.project': 'プロジェクト',
    'menu.tools': 'ツール',
    'menu.help': 'ヘルプ',
    
    // File Menu
    'menu.file.new': '新規プロジェクト',
    'menu.file.open': 'プロジェクトを開く',
    'menu.file.save': 'プロジェクトを保存',
    'menu.file.saveAs': '名前を付けて保存',
    'menu.file.export': 'エクスポート',
    'menu.file.export.json': 'JSONとしてエクスポート',
    'menu.file.export.pdf': 'PDFとしてエクスポート',
    'menu.file.export.video': 'ビデオとしてエクスポート',
    'menu.file.recent': '最近使用したプロジェクト',
    
    // Edit Menu
    'menu.edit.undo': '元に戻す',
    'menu.edit.redo': 'やり直す',
    'menu.edit.cut': '切り取り',
    'menu.edit.copy': 'コピー',
    'menu.edit.paste': '貼り付け',
    'menu.edit.preferences': '環境設定',
    'menu.edit.settings': '設定',
    'menu.edit.settings.llm': 'LLM設定',
    'menu.edit.settings.comfyui': 'ComfyUI設定',
    'menu.edit.settings.addons': 'アドオン',
    'menu.edit.settings.general': '一般設定',
    
    // View Menu
    'menu.view.timeline': 'タイムライン',
    'menu.view.zoomIn': 'ズームイン',
    'menu.view.zoomOut': 'ズームアウト',
    'menu.view.resetZoom': 'ズームをリセット',
    'menu.view.toggleGrid': 'グリッドの表示/非表示',
    'menu.view.panels': 'パネル',
    'menu.view.panels.properties': 'プロパティ',
    'menu.view.panels.assets': 'アセット',
    'menu.view.panels.preview': 'プレビュー',
    'menu.view.fullScreen': 'フルスクリーン',
    
    // Project Menu
    'menu.project.settings': 'プロジェクト設定',
    'menu.project.characters': 'キャラクター',
    'menu.project.sequences': 'シーケンス',
    'menu.project.assets': 'アセットライブラリ',
    
    // Tools Menu
    'menu.tools.llmAssistant': 'LLMアシスタント',
    'menu.tools.comfyUIServer': 'ComfyUIサーバー',
    'menu.tools.scriptWizard': 'スクリプトウィザード',
    'menu.tools.batchGeneration': 'バッチ生成',
    'menu.tools.qualityAnalysis': '品質分析',
    
    // Help Menu
    'menu.help.documentation': 'ドキュメント',
    'menu.help.keyboardShortcuts': 'キーボードショートカット',
    'menu.help.about': 'StoryCoreについて',
    'menu.help.checkUpdates': 'アップデートを確認',
    'menu.help.reportIssue': '問題を報告',
  },
  pt: {
    'common.next': 'Próximo',
    'common.previous': 'Anterior',
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar',
    'common.close': 'Fechar',
    'common.generate': 'Gerar',
    'common.loading': 'Carregando...',
    'common.error': 'Erro',
    'common.success': 'Sucesso',
    'common.step': 'Passo',
    'common.of': 'de',
    'common.required': 'Este campo é obrigatório',
    'common.saveDraft': 'Rascunho salvo',
    
    // Menu Bar - Main Menus
    'menu.file': 'Arquivo',
    'menu.edit': 'Editar',
    'menu.view': 'Visualizar',
    'menu.project': 'Projeto',
    'menu.tools': 'Ferramentas',
    'menu.help': 'Ajuda',
    
    // File Menu
    'menu.file.new': 'Novo Projeto',
    'menu.file.open': 'Abrir Projeto',
    'menu.file.save': 'Salvar Projeto',
    'menu.file.saveAs': 'Salvar Como',
    'menu.file.export': 'Exportar',
    'menu.file.export.json': 'Exportar como JSON',
    'menu.file.export.pdf': 'Exportar como PDF',
    'menu.file.export.video': 'Exportar como Vídeo',
    'menu.file.recent': 'Projetos Recentes',
    
    // Edit Menu
    'menu.edit.undo': 'Desfazer',
    'menu.edit.redo': 'Refazer',
    'menu.edit.cut': 'Recortar',
    'menu.edit.copy': 'Copiar',
    'menu.edit.paste': 'Colar',
    'menu.edit.preferences': 'Preferências',
    'menu.edit.settings': 'Configurações',
    'menu.edit.settings.llm': 'Configuração LLM',
    'menu.edit.settings.comfyui': 'Configuração ComfyUI',
    'menu.edit.settings.addons': 'Complementos',
    'menu.edit.settings.general': 'Configurações Gerais',
    
    // View Menu
    'menu.view.timeline': 'Linha do Tempo',
    'menu.view.zoomIn': 'Aumentar Zoom',
    'menu.view.zoomOut': 'Diminuir Zoom',
    'menu.view.resetZoom': 'Redefinir Zoom',
    'menu.view.toggleGrid': 'Alternar Grade',
    'menu.view.panels': 'Painéis',
    'menu.view.panels.properties': 'Propriedades',
    'menu.view.panels.assets': 'Recursos',
    'menu.view.panels.preview': 'Visualização',
    'menu.view.fullScreen': 'Tela Cheia',
    
    // Project Menu
    'menu.project.settings': 'Configurações do Projeto',
    'menu.project.characters': 'Personagens',
    'menu.project.sequences': 'Sequências',
    'menu.project.assets': 'Biblioteca de Recursos',
    
    // Tools Menu
    'menu.tools.llmAssistant': 'Assistente LLM',
    'menu.tools.comfyUIServer': 'Servidor ComfyUI',
    'menu.tools.scriptWizard': 'Assistente de Script',
    'menu.tools.batchGeneration': 'Geração em Lote',
    'menu.tools.qualityAnalysis': 'Análise de Qualidade',
    
    // Help Menu
    'menu.help.documentation': 'Documentação',
    'menu.help.keyboardShortcuts': 'Atalhos de Teclado',
    'menu.help.about': 'Sobre o StoryCore',
    'menu.help.checkUpdates': 'Verificar Atualizações',
    'menu.help.reportIssue': 'Relatar Problema',
  },
  it: {
    'common.next': 'Avanti',
    'common.previous': 'Indietro',
    'common.save': 'Salva',
    'common.cancel': 'Annulla',
    'common.close': 'Chiudi',
    'common.generate': 'Genera',
    'common.loading': 'Caricamento...',
    'common.error': 'Errore',
    'common.success': 'Successo',
    'common.step': 'Passo',
    'common.of': 'di',
    'common.required': 'Questo campo è obbligatorio',
    'common.saveDraft': 'Bozza salvata',
    
    // Menu Bar - Main Menus
    'menu.file': 'File',
    'menu.edit': 'Modifica',
    'menu.view': 'Visualizza',
    'menu.project': 'Progetto',
    'menu.tools': 'Strumenti',
    'menu.help': 'Aiuto',
    
    // File Menu
    'menu.file.new': 'Nuovo Progetto',
    'menu.file.open': 'Apri Progetto',
    'menu.file.save': 'Salva Progetto',
    'menu.file.saveAs': 'Salva Come',
    'menu.file.export': 'Esporta',
    'menu.file.export.json': 'Esporta come JSON',
    'menu.file.export.pdf': 'Esporta come PDF',
    'menu.file.export.video': 'Esporta come Video',
    'menu.file.recent': 'Progetti Recenti',
    
    // Edit Menu
    'menu.edit.undo': 'Annulla',
    'menu.edit.redo': 'Ripeti',
    'menu.edit.cut': 'Taglia',
    'menu.edit.copy': 'Copia',
    'menu.edit.paste': 'Incolla',
    'menu.edit.preferences': 'Preferenze',
    'menu.edit.settings': 'Impostazioni',
    'menu.edit.settings.llm': 'Configurazione LLM',
    'menu.edit.settings.comfyui': 'Configurazione ComfyUI',
    'menu.edit.settings.addons': 'Componenti Aggiuntivi',
    'menu.edit.settings.general': 'Impostazioni Generali',
    
    // View Menu
    'menu.view.timeline': 'Timeline',
    'menu.view.zoomIn': 'Ingrandisci',
    'menu.view.zoomOut': 'Riduci',
    'menu.view.resetZoom': 'Ripristina Zoom',
    'menu.view.toggleGrid': 'Mostra/Nascondi Griglia',
    'menu.view.panels': 'Pannelli',
    'menu.view.panels.properties': 'Proprietà',
    'menu.view.panels.assets': 'Risorse',
    'menu.view.panels.preview': 'Anteprima',
    'menu.view.fullScreen': 'Schermo Intero',
    
    // Project Menu
    'menu.project.settings': 'Impostazioni Progetto',
    'menu.project.characters': 'Personaggi',
    'menu.project.sequences': 'Sequenze',
    'menu.project.assets': 'Libreria Risorse',
    
    // Tools Menu
    'menu.tools.llmAssistant': 'Assistente LLM',
    'menu.tools.comfyUIServer': 'Server ComfyUI',
    'menu.tools.scriptWizard': 'Assistente Script',
    'menu.tools.batchGeneration': 'Generazione Batch',
    'menu.tools.qualityAnalysis': 'Analisi Qualità',
    
    // Help Menu
    'menu.help.documentation': 'Documentazione',
    'menu.help.keyboardShortcuts': 'Scorciatoie da Tastiera',
    'menu.help.about': 'Informazioni su StoryCore',
    'menu.help.checkUpdates': 'Verifica Aggiornamenti',
    'menu.help.reportIssue': 'Segnala Problema',
  },
  ru: {
    'common.next': 'Далее',
    'common.previous': 'Назад',
    'common.save': 'Сохранить',
    'common.cancel': 'Отмена',
    'common.close': 'Закрыть',
    'common.generate': 'Создать',
    'common.loading': 'Загрузка...',
    'common.error': 'Ошибка',
    'common.success': 'Успех',
    'common.step': 'Шаг',
    'common.of': 'из',
    'common.required': 'Это поле обязательно',
    'common.saveDraft': 'Черновик сохранён',
    
    // Menu Bar - Main Menus
    'menu.file': 'Файл',
    'menu.edit': 'Правка',
    'menu.view': 'Вид',
    'menu.project': 'Проект',
    'menu.tools': 'Инструменты',
    'menu.help': 'Справка',
    
    // File Menu
    'menu.file.new': 'Новый Проект',
    'menu.file.open': 'Открыть Проект',
    'menu.file.save': 'Сохранить Проект',
    'menu.file.saveAs': 'Сохранить Как',
    'menu.file.export': 'Экспорт',
    'menu.file.export.json': 'Экспорт в JSON',
    'menu.file.export.pdf': 'Экспорт в PDF',
    'menu.file.export.video': 'Экспорт в Видео',
    'menu.file.recent': 'Недавние Проекты',
    
    // Edit Menu
    'menu.edit.undo': 'Отменить',
    'menu.edit.redo': 'Повторить',
    'menu.edit.cut': 'Вырезать',
    'menu.edit.copy': 'Копировать',
    'menu.edit.paste': 'Вставить',
    'menu.edit.preferences': 'Настройки',
    'menu.edit.settings': 'Параметры',
    'menu.edit.settings.llm': 'Конфигурация LLM',
    'menu.edit.settings.comfyui': 'Конфигурация ComfyUI',
    'menu.edit.settings.addons': 'Дополнения',
    'menu.edit.settings.general': 'Общие Параметры',
    
    // View Menu
    'menu.view.timeline': 'Временная Шкала',
    'menu.view.zoomIn': 'Увеличить',
    'menu.view.zoomOut': 'Уменьшить',
    'menu.view.resetZoom': 'Сбросить Масштаб',
    'menu.view.toggleGrid': 'Показать/Скрыть Сетку',
    'menu.view.panels': 'Панели',
    'menu.view.panels.properties': 'Свойства',
    'menu.view.panels.assets': 'Ресурсы',
    'menu.view.panels.preview': 'Предпросмотр',
    'menu.view.fullScreen': 'Полный Экран',
    
    // Project Menu
    'menu.project.settings': 'Настройки Проекта',
    'menu.project.characters': 'Персонажи',
    'menu.project.sequences': 'Последовательности',
    'menu.project.assets': 'Библиотека Ресурсов',
    
    // Tools Menu
    'menu.tools.llmAssistant': 'Помощник LLM',
    'menu.tools.comfyUIServer': 'Сервер ComfyUI',
    'menu.tools.scriptWizard': 'Мастер Сценариев',
    'menu.tools.batchGeneration': 'Пакетная Генерация',
    'menu.tools.qualityAnalysis': 'Анализ Качества',
    
    // Help Menu
    'menu.help.documentation': 'Документация',
    'menu.help.keyboardShortcuts': 'Горячие Клавиши',
    'menu.help.about': 'О StoryCore',
    'menu.help.checkUpdates': 'Проверить Обновления',
    'menu.help.reportIssue': 'Сообщить о Проблеме',
  },
  zh: {
    'common.next': '下一步',
    'common.previous': '上一步',
    'common.save': '保存',
    'common.cancel': '取消',
    'common.close': '关闭',
    'common.generate': '生成',
    'common.loading': '加载中...',
    'common.error': '错误',
    'common.success': '成功',
    'common.step': '步骤',
    'common.of': '/',
    'common.required': '此字段为必填项',
    'common.saveDraft': '草稿已保存',
    
    // Menu Bar - Main Menus
    'menu.file': '文件',
    'menu.edit': '编辑',
    'menu.view': '查看',
    'menu.project': '项目',
    'menu.tools': '工具',
    'menu.help': '帮助',
    
    // File Menu
    'menu.file.new': '新建项目',
    'menu.file.open': '打开项目',
    'menu.file.save': '保存项目',
    'menu.file.saveAs': '另存为',
    'menu.file.export': '导出',
    'menu.file.export.json': '导出为JSON',
    'menu.file.export.pdf': '导出为PDF',
    'menu.file.export.video': '导出为视频',
    'menu.file.recent': '最近的项目',
    
    // Edit Menu
    'menu.edit.undo': '撤销',
    'menu.edit.redo': '重做',
    'menu.edit.cut': '剪切',
    'menu.edit.copy': '复制',
    'menu.edit.paste': '粘贴',
    'menu.edit.preferences': '偏好设置',
    'menu.edit.settings': '设置',
    'menu.edit.settings.llm': 'LLM配置',
    'menu.edit.settings.comfyui': 'ComfyUI配置',
    'menu.edit.settings.addons': '扩展',
    'menu.edit.settings.general': '常规设置',
    
    // View Menu
    'menu.view.timeline': '时间轴',
    'menu.view.zoomIn': '放大',
    'menu.view.zoomOut': '缩小',
    'menu.view.resetZoom': '重置缩放',
    'menu.view.toggleGrid': '切换网格',
    'menu.view.panels': '面板',
    'menu.view.panels.properties': '属性',
    'menu.view.panels.assets': '资源',
    'menu.view.panels.preview': '预览',
    'menu.view.fullScreen': '全屏',
    
    // Project Menu
    'menu.project.settings': '项目设置',
    'menu.project.characters': '角色',
    'menu.project.sequences': '序列',
    'menu.project.assets': '资源库',
    
    // Tools Menu
    'menu.tools.llmAssistant': 'LLM助手',
    'menu.tools.comfyUIServer': 'ComfyUI服务器',
    'menu.tools.scriptWizard': '脚本向导',
    'menu.tools.batchGeneration': '批量生成',
    'menu.tools.qualityAnalysis': '质量分析',
    
    // Help Menu
    'menu.help.documentation': '文档',
    'menu.help.keyboardShortcuts': '键盘快捷键',
    'menu.help.about': '关于StoryCore',
    'menu.help.checkUpdates': '检查更新',
    'menu.help.reportIssue': '报告问题',
  },
};

// ============================================================================
// I18n Provider Component
// ============================================================================

interface I18nProviderProps {
  children: React.ReactNode;
  defaultLanguage?: SupportedLanguage;
  enableAutoDetect?: boolean;
  storageKey?: string;
}

export function I18nProvider({
  children,
  defaultLanguage = 'en',
  enableAutoDetect = false,  // Disabled by default to prevent French auto-detection
  storageKey = 'storycore-language',
}: I18nProviderProps) {
  const [language, setLanguageState] = useState<SupportedLanguage>(defaultLanguage);

  // Détection automatique de la langue du navigateur
  useEffect(() => {
    if (!enableAutoDetect) {
      // Force English if auto-detect is disabled
      const savedLanguage = localStorage.getItem(storageKey);
      if (savedLanguage && LANGUAGES.some(l => l.code === savedLanguage)) {
        setLanguageState(savedLanguage as SupportedLanguage);
      } else {
        // No saved language, use default (English)
        setLanguageState(defaultLanguage);
      }
      return;
    }

    const savedLanguage = localStorage.getItem(storageKey);
    if (savedLanguage && LANGUAGES.some(l => l.code === savedLanguage)) {
      setLanguageState(savedLanguage as SupportedLanguage);
      return;
    }

    const browserLang = navigator.language.split('-')[0];
    const matchingLang = LANGUAGES.find(
      l => l.code === browserLang || browserLang.startsWith(l.code)
    );

    if (matchingLang) {
      setLanguageState(matchingLang.code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableAutoDetect, storageKey]);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem(storageKey, lang);

    // Mettre à jour l'attribut dir pour RTL
    const languageInfo = LANGUAGES.find(l => l.code === lang);
    document.documentElement.dir = languageInfo?.dir || 'ltr';
    document.documentElement.lang = lang;
  }, [storageKey]);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const translations = TRANSLATIONS[language] || TRANSLATIONS.en;
    let text = translations[key] || key;

    // Remplacer les paramètres
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), String(value));
      });
    }

    return text;
  }, [language]);

  const languageInfo = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];
  const dir = languageInfo?.dir || 'ltr';

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        t,
        dir,
        isRtl: dir === 'rtl',
        languages: LANGUAGES,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

// ============================================================================
// RTL Utilities
// ============================================================================

/**
 * Obtenir la direction miroir pour les positions
 */
export function mirrorPosition(position: string): string {
  const mirrorMap: Record<string, string> = {
    left: 'right',
    right: 'left',
    'margin-left': 'margin-right',
    'margin-right': 'margin-left',
    'border-left': 'border-right',
    'border-right': 'border-left',
    'padding-left': 'padding-right',
    'padding-right': 'padding-left',
    'text-left': 'text-right',
    'text-right': 'text-left',
    'rounded-l': 'rounded-r',
    'rounded-r': 'rounded-l',
  };

  return mirrorMap[position] || position;
}

/**
 * Obtenir la valeur transformée pour RTL
 */
export function getRtlValue(value: string, isRtl: boolean): string {
  if (!isRtl) return value;

  // Extraire la valeur numérique et la position
  const match = value.match(/^(-?\d+\.?\d*)(px|em|rem|%|vh|vw)?$/);
  if (match) {
    // Les valeurs positives ne changent pas en RTL
    // Seules les valeurs négatives changent de signe
    const num = parseFloat(match[1]);
    if (num > 0) return value;
    return `${Math.abs(num)}${match[2] || 'px'}`;
  }

  return value;
}

// ============================================================================
// Translation Hook with Namespace
// ============================================================================

export function useTranslation(namespace: string = 'common') {
  const { t, language } = useI18n();

  const translate = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const fullKey = `${namespace}.${key}`;
      return t(fullKey, params);
    },
    [t, namespace]
  );

  return { t: translate, language };
}

export default I18nProvider;
