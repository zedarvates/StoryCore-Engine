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
    
    // Menu Bar - Main Menus (simplified)
    'file': 'Fichier',
    'edit': 'Édition',
    'view': 'Affichage',
    'project': 'Projet',
    'wizards': 'Assistants',
    'tools': 'Outils',
    'help': 'Aide',
    
    // File Menu (simplified)
    'file.new': 'Nouveau',
    'file.open': 'Ouvrir',
    'file.save': 'Enregistrer',
    'file.saveAs': 'Enregistrer sous',
    'file.export': 'Exporter',
    'file.export.json': 'JSON',
    'file.export.pdf': 'PDF',
    'file.export.video': 'Vidéo',
    'file.preferences': 'Préférences',
    'file.addons': 'Extensions',
    'file.exit': 'Quitter',
    'file.quit': 'Quitter',
    
    // Edit Menu (simplified)
    'edit.undo': 'Annuler',
    'edit.redo': 'Rétablir',
    'edit.cut': 'Couper',
    'edit.copy': 'Copier',
    'edit.paste': 'Coller',
    
    // View Menu (simplified)
    'view.timeline': 'Chronologie',
    'view.assetsPanel': 'Panneau Ressources',
    'view.previewPanel': 'Panneau Aperçu',
    'view.grid': 'Grille',
    'view.zoomIn': 'Zoom +',
    'view.zoomOut': 'Zoom -',
    'view.resetZoom': 'Reset zoom',
    'view.fullScreen': 'Plein écran',
    
    // Project Menu (simplified)
    'project.backToDashboard': 'Retour',
    'project.characters': 'Personnages',
    'project.assets': 'Ressources',
    
    // Wizards Menu (simplified)
    'wizards.projectSetup': 'Configuration',
    'wizards.characters': 'Personnages',
    'wizards.world': 'Monde',
    'wizards.sequences': 'Séquences',
    'wizards.script': 'Script',
    
    // Tools Menu (simplified)
    'tools.llmAssistant': 'Assistant LLM',
    'tools.comfyUIServer': 'ComfyUI',
    'tools.llmConfiguration': 'Configuration LLM',
    'tools.scriptWizard': 'Script',
    'tools.batchGeneration': 'Lot',
    'tools.qualityAnalysis': 'Qualité',
    'tools.factCheck': 'Vérification',
    
    // Help Menu (simplified)
    'help.documentation': 'Documentation',
    'help.keyboardShortcuts': 'Raccourcis',
    'help.about': 'À propos',
    'help.checkUpdates': 'Mises à jour',
    'help.reportIssue': 'Signaler',
    
    // Continuous Creation Menu
    'continuousCreation': 'Création Continue',
    'continuousCreation.referenceSheetManager': 'Fiches de Référence',
    'continuousCreation.videoReplication': 'Réplication Vidéo',
    'continuousCreation.crossShotReference': 'Références Croisées',
    'continuousCreation.styleTransfer': 'Transfert de Style',
    'continuousCreation.consistencyCheck': 'Vérification Cohérence',
    'continuousCreation.projectBranching': 'Branches Projet',
    'continuousCreation.episodeReferences': 'Épisodes Précédents',
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
    
    // Menu Bar - Main Menus (simplified)
    'file': 'File',
    'edit': 'Edit',
    'view': 'View',
    'project': 'Project',
    'wizards': 'Wizards',
    'tools': 'Tools',
    'help': 'Help',
    
    // File Menu (simplified)
    'file.new': 'New',
    'file.open': 'Open',
    'file.save': 'Save',
    'file.saveAs': 'Save As',
    'file.export': 'Export',
    'file.export.json': 'JSON',
    'file.export.pdf': 'PDF',
    'file.export.video': 'Video',
    'file.preferences': 'Preferences',
    'file.addons': 'Add-ons',
    'file.exit': 'Exit',
    'file.quit': 'Quit',
    
    // Edit Menu (simplified)
    'edit.undo': 'Undo',
    'edit.redo': 'Redo',
    'edit.cut': 'Cut',
    'edit.copy': 'Copy',
    'edit.paste': 'Paste',
    
    // View Menu (simplified)
    'view.timeline': 'Timeline',
    'view.assetsPanel': 'Assets Panel',
    'view.previewPanel': 'Preview Panel',
    'view.grid': 'Grid',
    'view.zoomIn': 'Zoom +',
    'view.zoomOut': 'Zoom -',
    'view.resetZoom': 'Reset zoom',
    'view.fullScreen': 'Full screen',
    
    // Project Menu (simplified)
    'project.backToDashboard': 'Back',
    'project.characters': 'Characters',
    'project.assets': 'Assets',
    
    // Wizards Menu (simplified)
    'wizards.projectSetup': 'Setup',
    'wizards.characters': 'Characters',
    'wizards.world': 'World',
    'wizards.sequences': 'Sequences',
    'wizards.script': 'Script',
    
    // Tools Menu (simplified)
    'tools.llmAssistant': 'LLM Assistant',
    'tools.comfyUIServer': 'ComfyUI',
    'tools.llmConfiguration': 'LLM Configuration',
    'tools.scriptWizard': 'Script',
    'tools.batchGeneration': 'Batch',
    'tools.qualityAnalysis': 'Quality',
    'tools.factCheck': 'Verify',
    
    // Help Menu (simplified)
    'help.documentation': 'Docs',
    'help.keyboardShortcuts': 'Shortcuts',
    'help.about': 'About',
    'help.checkUpdates': 'Updates',
    'help.reportIssue': 'Report',
    
    // Continuous Creation Menu
    'continuousCreation': 'Continuous Creation',
    'continuousCreation.referenceSheetManager': 'Reference Sheets',
    'continuousCreation.videoReplication': 'Video Replication',
    'continuousCreation.crossShotReference': 'Cross-Shot References',
    'continuousCreation.styleTransfer': 'Style Transfer',
    'continuousCreation.consistencyCheck': 'Consistency Check',
    'continuousCreation.projectBranching': 'Project Branching',
    'continuousCreation.episodeReferences': 'Episode References',
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
    
    // Menu Bar - Main Menus (simplified)
    'file': 'Archivo',
    'edit': 'Editar',
    'view': 'Ver',
    'project': 'Proyecto',
    'wizards': 'Asistentes',
    'tools': 'Herramientas',
    'help': 'Ayuda',
    
    // File Menu (simplified)
    'file.new': 'Nuevo',
    'file.open': 'Abrir',
    'file.save': 'Guardar',
    'file.saveAs': 'Guardar como',
    'file.export': 'Exportar',
    'file.export.json': 'JSON',
    'file.export.pdf': 'PDF',
    'file.export.video': 'Vídeo',
    'file.preferences': 'Preferencias',
    'file.addons': 'Extensiones',
    'file.exit': 'Salir',
    'file.quit': 'Cerrar',
    
    // Edit Menu (simplified)
    'edit.undo': 'Deshacer',
    'edit.redo': 'Rehacer',
    'edit.cut': 'Cortar',
    'edit.copy': 'Copiar',
    'edit.paste': 'Pegar',
    
    // View Menu (simplified)
    'view.timeline': 'Línea temporal',
    'view.assetsPanel': 'Panel Recursos',
    'view.previewPanel': 'Panel Vista Previa',
    'view.grid': 'Cuadrícula',
    'view.zoomIn': 'Zoom +',
    'view.zoomOut': 'Zoom -',
    'view.resetZoom': 'Reset zoom',
    'view.fullScreen': 'Pantalla completa',
    
    // Project Menu (simplified)
    'project.backToDashboard': 'Volver',
    'project.characters': 'Personajes',
    'project.assets': 'Recursos',
    
    // Wizards Menu (simplified)
    'wizards.projectSetup': 'Configuración',
    'wizards.characters': 'Personajes',
    'wizards.world': 'Mundo',
    'wizards.sequences': 'Secuencias',
    'wizards.script': 'Guión',
    
    // Tools Menu (simplified)
    'tools.llmAssistant': 'Asistente LLM',
    'tools.comfyUIServer': 'ComfyUI',
    'tools.llmConfiguration': 'Configuración LLM',
    'tools.scriptWizard': 'Guión',
    'tools.batchGeneration': 'Lote',
    'tools.qualityAnalysis': 'Calidad',
    'tools.factCheck': 'Verificar',
    
    // Help Menu (simplified)
    'help.documentation': 'Docs',
    'help.keyboardShortcuts': 'Atajos',
    'help.about': 'Acerca de',
    'help.checkUpdates': 'Actualizaciones',
    'help.reportIssue': 'Reportar',
    
    // Continuous Creation Menu
    'continuousCreation': 'Creación Continua',
    'continuousCreation.referenceSheetManager': 'Fichas de Referencia',
    'continuousCreation.videoReplication': 'Replicación de Video',
    'continuousCreation.crossShotReference': 'Referencias Cruzadas',
    'continuousCreation.styleTransfer': 'Transferencia de Estilo',
    'continuousCreation.consistencyCheck': 'Verificación Consistencia',
    'continuousCreation.projectBranching': 'Ramas de Proyecto',
    'continuousCreation.episodeReferences': 'Episodios Anteriores',
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
    
    // Menu Bar - Main Menus (simplified)
    'file': 'Datei',
    'edit': 'Bearbeiten',
    'view': 'Ansicht',
    'project': 'Projekt',
    'wizards': 'Assistenten',
    'tools': 'Werkzeuge',
    'help': 'Hilfe',
    
    // File Menu (simplified)
    'file.new': 'Neu',
    'file.open': 'Öffnen',
    'file.save': 'Speichern',
    'file.saveAs': 'Speichern unter',
    'file.export': 'Exportieren',
    'file.export.json': 'JSON',
    'file.export.pdf': 'PDF',
    'file.export.video': 'Video',
    'file.preferences': 'Einstellungen',
    'file.addons': 'Erweiterungen',
    'file.exit': 'Beenden',
    'file.quit': 'Schließen',
    
    // Edit Menu (simplified)
    'edit.undo': 'Rückgängig',
    'edit.redo': 'Wiederholen',
    'edit.cut': 'Ausschneiden',
    'edit.copy': 'Kopieren',
    'edit.paste': 'Einfügen',
    
    // View Menu (simplified)
    'view.timeline': 'Zeitleiste',
    'view.assetsPanel': 'Assets Panel',
    'view.previewPanel': 'Vorschau Panel',
    'view.grid': 'Raster',
    'view.zoomIn': 'Zoom +',
    'view.zoomOut': 'Zoom -',
    'view.resetZoom': 'Reset zoom',
    'view.fullScreen': 'Vollbild',
    
    // Project Menu (simplified)
    'project.backToDashboard': 'Zurück',
    'project.characters': 'Charaktere',
    'project.assets': 'Ressourcen',
    
    // Wizards Menu (simplified)
    'wizards.projectSetup': 'Konfiguration',
    'wizards.characters': 'Charaktere',
    'wizards.world': 'Welt',
    'wizards.sequences': 'Sequenzen',
    'wizards.script': 'Skript',
    
    // Tools Menu (simplified)
    'tools.llmAssistant': 'LLM-Assistent',
    'tools.comfyUIServer': 'ComfyUI',
    'tools.llmConfiguration': 'LLM-Konfiguration',
    'tools.scriptWizard': 'Skript',
    'tools.batchGeneration': 'Stapel',
    'tools.qualityAnalysis': 'Qualität',
    'tools.factCheck': 'Überprüfen',
    
    // Help Menu (simplified)
    'help.documentation': 'Doku',
    'help.keyboardShortcuts': 'Tasten',
    'help.about': 'Über',
    'help.checkUpdates': 'Updates',
    'help.reportIssue': 'Melden',
    
    // Continuous Creation Menu
    'continuousCreation': 'Kontinuierliche Erstellung',
    'continuousCreation.referenceSheetManager': 'Referenzblätter',
    'continuousCreation.videoReplication': 'Videoreplikation',
    'continuousCreation.crossShotReference': 'Kreuzverweise',
    'continuousCreation.styleTransfer': 'Stilübertragung',
    'continuousCreation.consistencyCheck': 'Konsistenzprüfung',
    'continuousCreation.projectBranching': 'Projektzweige',
    'continuousCreation.episodeReferences': 'Vorherige Episoden',
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
    'file': 'ファイル',
    'edit': '編集',
    'view': '表示',
    'project': 'プロジェクト',
    'wizards': 'ウィザード',
    'tools': 'ツール',
    'help': 'ヘルプ',
    'file.new': '新規',
    'file.open': '開く',
    'file.save': '保存',
    'file.saveAs': '名前保存',
    'file.export': 'エクスポート',
    'file.export.json': 'JSON',
    'file.export.pdf': 'PDF',
    'file.export.video': '動画',
    'file.preferences': '設定',
    'file.addons': '拡張',
    'file.exit': '終了',
    'file.quit': '閉じる',
    'edit.undo': '元に戻す',
    'edit.redo': 'やり直す',
    'edit.cut': '切り取り',
    'edit.copy': 'コピー',
    'edit.paste': '貼り付け',
    'view.timeline': 'タイムライン',
    'view.assetsPanel': 'アセットパネル',
    'view.previewPanel': 'プレビューパネル',
    'view.grid': 'グリッド',
    'view.zoomIn': 'ズーム+',
    'view.zoomOut': 'ズーム-',
    'view.resetZoom': 'リセット',
    'view.fullScreen': 'フルスクリーン',
    'project.backToDashboard': '戻る',
    'project.characters': 'キャラクター',
    'project.assets': 'アセット',
    'wizards.projectSetup': '設定',
    'wizards.characters': 'キャラクター',
    'wizards.world': '世界',
    'wizards.sequences': 'シーケンス',
    'wizards.script': 'スクリプト',
    'tools.llmAssistant': 'LLM助手',
    'tools.comfyUIServer': 'ComfyUI',
    'tools.llmConfiguration': 'LLM設定',
    'tools.scriptWizard': 'スクリプト',
    'tools.batchGeneration': 'バッチ',
    'tools.qualityAnalysis': '品質',
    'tools.factCheck': '確認',
    'help.documentation': 'ドキュメント',
    'help.keyboardShortcuts': 'ショートカット',
    'help.about': 'について',
    'help.checkUpdates': '更新',
    'help.reportIssue': '報告',
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
    'file': 'Arquivo',
    'edit': 'Editar',
    'view': 'Visualizar',
    'project': 'Projeto',
    'wizards': 'Assistentes',
    'tools': 'Ferramentas',
    'help': 'Ajuda',
    'file.new': 'Novo',
    'file.open': 'Abrir',
    'file.save': 'Salvar',
    'file.saveAs': 'Salvar como',
    'file.export': 'Exportar',
    'file.export.json': 'JSON',
    'file.export.pdf': 'PDF',
    'file.export.video': 'Vídeo',
    'file.preferences': 'Preferências',
    'file.addons': 'Extensões',
    'file.exit': 'Sair',
    'file.quit': 'Fechar',
    'edit.undo': 'Desfazer',
    'edit.redo': 'Refazer',
    'edit.cut': 'Recortar',
    'edit.copy': 'Copiar',
    'edit.paste': 'Colar',
    'view.timeline': 'Linha do tempo',
    'view.assetsPanel': 'Painel Recursos',
    'view.previewPanel': 'Painel Visualização',
    'view.grid': 'Grade',
    'view.zoomIn': 'Zoom +',
    'view.zoomOut': 'Zoom -',
    'view.resetZoom': 'Reset zoom',
    'view.fullScreen': 'Tela cheia',
    'project.backToDashboard': 'Voltar',
    'project.characters': 'Personagens',
    'project.assets': 'Recursos',
    'wizards.projectSetup': 'Configuração',
    'wizards.characters': 'Personagens',
    'wizards.world': 'Mundo',
    'wizards.sequences': 'Sequências',
    'wizards.script': 'Script',
    'tools.llmAssistant': 'Assistente LLM',
    'tools.comfyUIServer': 'ComfyUI',
    'tools.llmConfiguration': 'Configuração LLM',
    'tools.scriptWizard': 'Script',
    'tools.batchGeneration': 'Lote',
    'tools.qualityAnalysis': 'Qualidade',
    'tools.factCheck': 'Verificar',
    'help.documentation': 'Docs',
    'help.keyboardShortcuts': 'Atalhos',
    'help.about': 'Sobre',
    'help.checkUpdates': 'Atualizações',
    'help.reportIssue': 'Reportar',
    
    // Continuous Creation Menu
    'continuousCreation': 'Criação Contínua',
    'continuousCreation.referenceSheetManager': 'Fichas de Referência',
    'continuousCreation.videoReplication': 'Replicação de Vídeo',
    'continuousCreation.crossShotReference': 'Referências Cruzadas',
    'continuousCreation.styleTransfer': 'Transferência de Estilo',
    'continuousCreation.consistencyCheck': 'Verificação Consistência',
    'continuousCreation.projectBranching': 'Ramos do Projeto',
    'continuousCreation.episodeReferences': 'Episódios Anteriores',
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
    'file': 'File',
    'edit': 'Modifica',
    'view': 'Visualizza',
    'project': 'Progetto',
    'wizards': 'Assistenti',
    'tools': 'Strumenti',
    'help': 'Aiuto',
    'file.new': 'Nuovo',
    'file.open': 'Apri',
    'file.save': 'Salva',
    'file.saveAs': 'Salva come',
    'file.export': 'Esporta',
    'file.export.json': 'JSON',
    'file.export.pdf': 'PDF',
    'file.export.video': 'Video',
    'file.preferences': 'Preferenze',
    'file.addons': 'Estensioni',
    'file.exit': 'Esci',
    'file.quit': 'Chiudi',
    'edit.undo': 'Annulla',
    'edit.redo': 'Ripeti',
    'edit.cut': 'Taglia',
    'edit.copy': 'Copia',
    'edit.paste': 'Incolla',
    'view.timeline': 'Timeline',
    'view.assetsPanel': 'Pannello Risorse',
    'view.previewPanel': 'Pannello Anteprima',
    'view.grid': 'Griglia',
    'view.zoomIn': 'Zoom +',
    'view.zoomOut': 'Zoom -',
    'view.resetZoom': 'Reset zoom',
    'view.fullScreen': 'Schermo intero',
    'project.backToDashboard': 'Indietro',
    'project.characters': 'Personaggi',
    'project.assets': 'Risorse',
    'wizards.projectSetup': 'Configurazione',
    'wizards.characters': 'Personaggi',
    'wizards.world': 'Mondo',
    'wizards.sequences': 'Sequenze',
    'wizards.script': 'Script',
    'tools.llmAssistant': 'Assistente LLM',
    'tools.comfyUIServer': 'ComfyUI',
    'tools.llmConfiguration': 'Configurazione LLM',
    'tools.scriptWizard': 'Script',
    'tools.batchGeneration': 'Lotto',
    'tools.qualityAnalysis': 'Qualità',
    'tools.factCheck': 'Verifica',
    'help.documentation': 'Docs',
    'help.keyboardShortcuts': 'Scorciatoie',
    'help.about': 'Informazioni',
    'help.checkUpdates': 'Aggiornamenti',
    'help.reportIssue': 'Segnala',
    
    // Continuous Creation Menu
    'continuousCreation': 'Creazione Continua',
    'continuousCreation.referenceSheetManager': 'Schede di Riferimento',
    'continuousCreation.videoReplication': 'Replicazione Video',
    'continuousCreation.crossShotReference': 'Riferimenti Incrociati',
    'continuousCreation.styleTransfer': 'Trasferimento Stile',
    'continuousCreation.consistencyCheck': 'Verifica Coerenza',
    'continuousCreation.projectBranching': 'Rami Progetto',
    'continuousCreation.episodeReferences': 'Episodi Precedenti',
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
    'file': 'Файл',
    'edit': 'Правка',
    'view': 'Вид',
    'project': 'Проект',
    'wizards': 'Мастера',
    'tools': 'Инструменты',
    'help': 'Справка',
    'file.new': 'Новый',
    'file.open': 'Открыть',
    'file.save': 'Сохранить',
    'file.saveAs': 'Сохранить как',
    'file.export': 'Экспорт',
    'file.export.json': 'JSON',
    'file.export.pdf': 'PDF',
    'file.export.video': 'Видео',
    'file.preferences': 'Настройки',
    'file.addons': 'Расширения',
    'file.exit': 'Выйти',
    'file.quit': 'Закрыть',
    'edit.undo': 'Отменить',
    'edit.redo': 'Повторить',
    'edit.cut': 'Вырезать',
    'edit.copy': 'Копировать',
    'edit.paste': 'Вставить',
    'view.timeline': 'Временная шкала',
    'view.assetsPanel': 'Панель ресурсов',
    'view.previewPanel': 'Панель просмотра',
    'view.grid': 'Сетка',
    'view.zoomIn': 'Увеличить',
    'view.zoomOut': 'Уменьшить',
    'view.resetZoom': 'Сбросить',
    'view.fullScreen': 'Полный экран',
    'project.backToDashboard': 'Назад',
    'project.characters': 'Персонажи',
    'project.assets': 'Ресурсы',
    'wizards.projectSetup': 'Настройки',
    'wizards.characters': 'Персонажи',
    'wizards.world': 'Мир',
    'wizards.sequences': 'Последовательности',
    'wizards.script': 'Скрипт',
    'tools.llmAssistant': 'Помощник LLM',
    'tools.comfyUIServer': 'ComfyUI',
    'tools.llmConfiguration': 'Конфигурация LLM',
    'tools.scriptWizard': 'Скрипт',
    'tools.batchGeneration': 'Пакет',
    'tools.qualityAnalysis': 'Качество',
    'tools.factCheck': 'Проверка',
    'help.documentation': 'Документы',
    'help.keyboardShortcuts': 'Клавиши',
    'help.about': 'О программе',
    'help.checkUpdates': 'Обновления',
    'help.reportIssue': 'Проблема',
    
    // Continuous Creation Menu
    'continuousCreation': 'Непрерывное создание',
    'continuousCreation.referenceSheetManager': 'Справочные листы',
    'continuousCreation.videoReplication': 'Репликация видео',
    'continuousCreation.crossShotReference': 'Перекрёстные ссылки',
    'continuousCreation.styleTransfer': 'Перенос стиля',
    'continuousCreation.consistencyCheck': 'Проверка согласованности',
    'continuousCreation.projectBranching': 'Ветви проекта',
    'continuousCreation.episodeReferences': 'Предыдущие эпизоды',
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
    'file': '文件',
    'edit': '编辑',
    'view': '查看',
    'project': '项目',
    'wizards': '向导',
    'tools': '工具',
    'help': '帮助',
    
    // File Menu
    'file.new': '新建',
    'file.open': '打开',
    'file.save': '保存',
    'file.saveAs': '另存为',
    'file.export': '导出',
    'file.export.json': 'JSON',
    'file.export.pdf': 'PDF',
    'file.export.video': '视频',
    'file.preferences': '偏好设置',
    'file.exit': '退出',
    'file.quit': '关闭',
    
    // Edit Menu
    'edit.undo': '撤销',
    'edit.redo': '重做',
    'edit.cut': '剪切',
    'edit.copy': '复制',
    'edit.paste': '粘贴',
    
    // View Menu
    'view.timeline': '时间轴',
    'view.assetsPanel': '资源面板',
    'view.previewPanel': '预览面板',
    'view.grid': '网格',
    'view.zoomIn': '放大',
    'view.zoomOut': '缩小',
    'view.resetZoom': '重置',
    'view.fullScreen': '全屏',
    
    // Project Menu
    'project.backToDashboard': '返回',
    'project.characters': '角色',
    'project.assets': '资源',
    
    // Wizards Menu
    'wizards.projectSetup': '设置',
    'wizards.characters': '角色',
    'wizards.world': '世界',
    'wizards.sequences': '序列',
    'wizards.script': '脚本',
    
    // Tools Menu
    'tools.llmAssistant': 'LLM助手',
    'tools.comfyUIServer': 'ComfyUI',
    'tools.llmConfiguration': 'LLM配置',
    'tools.scriptWizard': '脚本',
    'tools.batchGeneration': '批量',
    'tools.qualityAnalysis': '质量',
    'tools.factCheck': '核查',
    
    // Help Menu
    'help.documentation': '文档',
    'help.keyboardShortcuts': '快捷键',
    'help.about': '关于',
    'help.checkUpdates': '更新',
    'help.reportIssue': '报告',
    
    // Continuous Creation Menu
    'continuousCreation': '持续创作',
    'continuousCreation.referenceSheetManager': '参考表',
    'continuousCreation.videoReplication': '视频复制',
    'continuousCreation.crossShotReference': '跨镜头参考',
    'continuousCreation.styleTransfer': '风格迁移',
    'continuousCreation.consistencyCheck': '一致性检查',
    'continuousCreation.projectBranching': '项目分支',
    'continuousCreation.episodeReferences': '前几集',
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
