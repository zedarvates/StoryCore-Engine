import React, { useMemo } from 'react';
import { Sparkles, RefreshCw, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DialogueDraftStepProps {
  data: {
    isGenerating?: boolean;
    generatedDialogue?: string;
  };
  onGenerate: () => void;
  onUpdate: (data: Partial<DialogueDraftStepProps['data']>) => void;
}

export function DialogueDraftStep({ data, onGenerate, onUpdate }: DialogueDraftStepProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const isGenerating = useMemo(() => data.isGenerating || false, [data.isGenerating]);
  const generatedDialogue = useMemo(() => data.generatedDialogue || '', [data.generatedDialogue]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            Dialogue Draft
          </h3>
        </div>
        <Button 
          onClick={onGenerate}
          disabled={isGenerating}
          variant="outline"
          className="gap-2 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold"
        >
          <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          {generatedDialogue ? 'Regenerate' : 'Generate'}
        </Button>
      </div>

      <div className="relative min-h-[400px] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
        {isGenerating ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-3xl z-10">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-widest text-xs animate-pulse">Drafting lines...</p>
          </div>
        ) : null}

        {!generatedDialogue && !isGenerating ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-20">
            <Sparkles className="w-16 h-16 text-gray-100 dark:text-gray-800 mb-6" />
            <h4 className="text-lg font-bold text-gray-400">Ready to script?</h4>
            <p className="text-gray-400 text-sm max-w-xs mx-auto mt-2">Hit generate to see AI-powered dialogue based on your scene setup.</p>
            <Button onClick={onGenerate} className="mt-8 bg-indigo-600 hover:bg-indigo-700 text-white px-8 rounded-full font-bold">
              Start Generation
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-[0.2em]">
                {isEditing ? 'Editing Script' : 'Script Preview'}
              </span>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className={`p-2 transition-colors rounded-lg ${isEditing ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40' : 'text-gray-400 hover:text-indigo-500'}`}
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
            <div className="prose dark:prose-invert max-w-none">
              {isEditing ? (
                <textarea
                  value={generatedDialogue}
                  onChange={(e) => onUpdate({ generatedDialogue: e.target.value })}
                  className="w-full min-h-[300px] bg-transparent border-none focus:ring-0 font-serif text-lg leading-relaxed text-gray-800 dark:text-gray-200 resize-none outline-none"
                  autoFocus
                />
              ) : (
                <pre className="whitespace-pre-wrap font-serif text-lg leading-relaxed text-gray-800 dark:text-gray-200 bg-transparent border-none p-0 cursor-text" onClick={() => setIsEditing(true)}>
                  {generatedDialogue}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
