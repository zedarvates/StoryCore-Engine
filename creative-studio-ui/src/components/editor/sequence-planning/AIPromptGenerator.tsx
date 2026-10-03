import React from 'react';
import { Settings, Wand2, Save, X } from 'lucide-react';
import { Scene } from '@/types/sequencePlan';

export interface AIPromptGeneratorProps {
  scene: Scene | undefined;
  onPromptGenerated: (prompt: string) => void;
  onClose: () => void;
  className?: string;
}

export const AIPromptGenerator: React.FC<AIPromptGeneratorProps> = ({
  scene,
  onPromptGenerated,
  onClose,
  className = ''
}) => {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generatedPrompt, setGeneratedPrompt] = React.useState('');

  const handleGenerate = async () => {
    if (!scene) return;

    setIsGenerating(true);
    // Mock AI generation - would call actual LLM service
    setTimeout(() => {
      const prompt = `Create a cinematic scene in ${scene.title}: ${scene.description}. The scene should be visually striking with dramatic lighting and composition.`;
      setGeneratedPrompt(prompt);
      setIsGenerating(false);
    }, 2000);
  };

  const handleAccept = () => {
    if (generatedPrompt) {
      onPromptGenerated(generatedPrompt);
      onClose();
    }
  };

  return (
    <div className={`ai-prompt-generator ${className}`}>
      <div className="generator-header">
        <h3>Génération de Prompt IA</h3>
        <button className="close-btn" onClick={onClose} aria-label="Close prompt generator">
          <X size={16} />
        </button>
      </div>

      <div className="generator-content">
        <div className="scene-info">
          <h4>{scene?.title}</h4>
          <p>{scene?.description}</p>
        </div>

        <div className="prompt-output">
          <textarea
            value={generatedPrompt}
            onChange={(e) => setGeneratedPrompt(e.target.value)}
            placeholder="Le prompt généré apparaîtra ici..."
            rows={8}
          />
        </div>

        <div className="generator-actions">
          <button
            className="generate-btn"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>Génération...</>
            ) : (
              <>
                <Wand2 size={16} />
                Générer Prompt
              </>
            )}
          </button>

          {generatedPrompt && (
            <button className="accept-btn" onClick={handleAccept}>
              <Save size={16} />
              Accepter
            </button>
          )}
        </div>
      </div>
    </div>
  );
};