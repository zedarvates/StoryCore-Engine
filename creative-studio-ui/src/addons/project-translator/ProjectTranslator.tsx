import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Languages, 
  Cpu, 
  Play, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Download,
  Info
} from 'lucide-react';
import { projectTranslatorService } from './projectTranslatorService';
import { SUPPORTED_LANGUAGES, TranslationTaskStatus } from './types';
import './ProjectTranslator.css';

interface ProjectTranslatorProps {
  projectId: string;
  projectData: Record<string, unknown>;
  onTranslationComplete?: (translatedData: Record<string, unknown>) => void;
}

const ProjectTranslator: React.FC<ProjectTranslatorProps> = ({ 
  projectId, 
  projectData,
  onTranslationComplete 
}) => {
  const [targetLang, setTargetLang] = useState('en');
  const [model, setModel] = useState('llama3');
  const [status, setStatus] = useState<TranslationTaskStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (taskId && status?.status === 'processing') {
      interval = setInterval(async () => {
        try {
          const newStatus = await projectTranslatorService.getTaskStatus(taskId);
          setStatus(newStatus);
          if (newStatus.status === 'completed') {
            clearInterval(interval);
            if (onTranslationComplete && newStatus.result) {
              onTranslationComplete(newStatus.result);
            }
          } else if (newStatus.status === 'error') {
            clearInterval(interval);
            setError(newStatus.message);
          }
        } catch (err) {
          console.error("Poll error:", err);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [taskId, status?.status, onTranslationComplete]);

  const handleTranslate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await projectTranslatorService.startTranslation({
        project_id: projectId,
        project_data: projectData,
        target_lang: targetLang,
        translation_model: model
      });
      setTaskId(res.task_id);
      setStatus({
        task_id: res.task_id,
        status: 'processing',
        progress: 0,
        message: 'Initialisation...'
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || "Échec du lancement de la traduction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="project-translator-container">
      <div className="translator-header">
        <div className="header-icon">
          <Globe size={24} />
        </div>
        <div className="header-text">
          <h2>Project Translator</h2>
          <p>Traduisez votre projet complet avec l'IA locale (Ollama)</p>
        </div>
      </div>

      <div className="translator-content">
        {!status ? (
          <div className="setup-view">
            <div className="section-title">
              <Languages size={18} />
              <span>Langue cible</span>
            </div>
            <div className="language-grid">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button 
                  key={lang.code}
                  className={`lang-card ${targetLang === lang.code ? 'active' : ''}`}
                  onClick={() => setTargetLang(lang.code)}
                >
                  <span className="lang-icon">{lang.icon}</span>
                  <span className="lang-name">{lang.name}</span>
                </button>
              ))}
            </div>

            <div className="section-title">
              <Cpu size={18} />
              <span>Modèle d'IA</span>
            </div>
            <select 
              className="model-select"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              <option value="llama3">Llama 3 (Equilibré)</option>
              <option value="mistral">Mistral (Rapide)</option>
              <option value="gemma">Gemma (Léger)</option>
              <option value="llama3:70b">Llama 3 70B (Précis - VRAM++ )</option>
            </select>

            <div className="info-box">
              <Info size={16} />
              <p>
                Utilise <strong>Jina Embeddings v5</strong> pour assurer la cohérence des noms 
                de personnages et des lieux à travers tout le projet.
              </p>
            </div>

            {error && (
              <div className="error-message">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button 
              className="translate-btn"
              disabled={loading}
              onClick={handleTranslate}
            >
              {loading ? <Loader2 className="spin" size={20} /> : <Play size={20} />}
              <span>Lancer la traduction</span>
            </button>
          </div>
        ) : (
          <div className="progress-view">
            <div className={`status-badge ${status.status}`}>
              {status.status === 'processing' && <Loader2 className="spin" size={16} />}
              {status.status === 'completed' && <CheckCircle size={16} />}
              {status.status === 'error' && <AlertCircle size={16} />}
              <span>{status.status.toUpperCase()}</span>
            </div>

            <div className="progress-container">
              <div className="progress-label">
                <span>{status.message}</span>
                <span>{Math.round(status.progress * 100)}%</span>
              </div>
              <div className="progress-bar-bg">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${status.progress * 100}%` }}
                ></div>
              </div>
            </div>

            {status.status === 'completed' && (
              <div className="completion-actions">
                <p className="success-txt">Votre projet a été traduit avec succès !</p>
                <div className="action-buttons">
                  <button className="download-btn">
                    <Download size={18} />
                    <span>Sauvegarder le projet traduit</span>
                  </button>
                  <button className="reset-btn" onClick={() => setStatus(null)}>
                    Nouvelle traduction
                  </button>
                </div>
              </div>
            )}

            {status.status === 'error' && (
              <div className="error-actions">
                <p>{status.message}</p>
                <button className="reset-btn" onClick={() => setStatus(null)}>
                  Réessayer
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectTranslator;
