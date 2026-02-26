import React, { useState } from 'react';
import { Copy, Check, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReviewDirectStepProps {
  data: {
    generatedDialogue: string;
  };
  onUpdate: (data: Partial<ReviewDirectStepProps['data']>) => void;
  onLipSync: () => void;
}

export function ReviewDirectStep({ data, onUpdate, onLipSync }: ReviewDirectStepProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(data.generatedDialogue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
          <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
          Review & Direct
        </h3>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-xl shadow-gray-200/20 dark:shadow-none">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h4 className="text-sm font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest">Final Script</h4>
            <p className="text-gray-500 text-xs mt-1">Ready for production or lip-sync integration.</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCopy}
              className="gap-2 rounded-xl"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Final Script</span>
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors"
            >
              {isEditing ? 'Save Changes' : 'Edit Script'}
            </button>
          </div>
          {isEditing ? (
            <textarea
              value={data.generatedDialogue}
              onChange={(e) => onUpdate({ generatedDialogue: e.target.value })}
              className="w-full min-h-[200px] bg-transparent border-none focus:ring-0 font-serif text-lg leading-relaxed text-gray-800 dark:text-gray-200 resize-none outline-none"
              autoFocus
            />
          ) : (
            <div 
              className="cursor-text"
              onClick={() => setIsEditing(true)}
            >
              <p className="text-gray-800 dark:text-gray-200 font-serif leading-relaxed italic whitespace-pre-wrap">
                {data.generatedDialogue}
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-6 rounded-2xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30">
            <div className="flex items-center gap-3 mb-3">
              <Video className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h5 className="font-bold text-gray-900 dark:text-white">Lip Sync Wizard</h5>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Animate your characters automatically using this dialogue.</p>
            <Button onClick={onLipSync} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold">
              Launch Lip Sync
            </Button>
          </div>

          <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-lg font-black text-amber-600">J/L</span>
              <h5 className="font-bold text-gray-900 dark:text-white">Cinematic Flow</h5>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Auto-apply J-cuts or L-cuts to the dialogue transitions.</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 rounded-xl text-[10px] font-bold">J-CUT</Button>
              <Button variant="outline" size="sm" className="flex-1 rounded-xl text-[10px] font-bold">L-CUT</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
