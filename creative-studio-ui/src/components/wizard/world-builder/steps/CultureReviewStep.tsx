import React, { useState, useRef, useEffect } from 'react';
import { Languages, HandMetal, CheckCircle, Wand2, Info, ScrollText, History, Swords, Loader2, Sparkles } from 'lucide-react';
import type { World, CulturalElements } from '@/types/world';
import { ollamaClient, type ModelMetadata } from '@/services/llm/OllamaClient';
import { useAppStore } from '@/stores/useAppStore';
import { useToast } from '@/hooks/use-toast';

interface CultureReviewStepProps {
  data: Partial<World>;
  onUpdate: (data: Partial<World>) => void;
}

export function CultureReviewStep({ data, onUpdate }: CultureReviewStepProps) {
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [isBatchRefining, setIsBatchRefining] = useState(false);
  const [addingField, setAddingField] = useState<keyof CulturalElements | null>(null);
  const [newItemValue, setNewItemValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const ollamaStatus = useAppStore(state => state.ollamaStatus);
  const { toast, dismiss } = useToast();

  const elements = data.culturalElements || {
    languages: [],
    religions: [],
    traditions: [],
    historicalEvents: [],
    culturalConflicts: [],
  };

  const updateElements = (updates: Partial<CulturalElements>) => {
    onUpdate({
      culturalElements: { ...elements, ...updates },
    });
  };

  const addItem = (field: keyof CulturalElements) => {
    setAddingField(field);
    setNewItemValue('');
  };

  const confirmAddItem = (field: keyof CulturalElements) => {
    if (newItemValue.trim()) {
      updateElements({ [field]: Array.from(new Set([...elements[field], newItemValue.trim()])) });
    }
    setAddingField(null);
    setNewItemValue('');
  };

  useEffect(() => {
    if (addingField && inputRef.current) {
      inputRef.current.focus();
    }
  }, [addingField]);

  const removeItem = (field: keyof CulturalElements, index: number) => {
    const newList = [...elements[field]];
    newList.splice(index, 1);
    updateElements({ [field]: newList });
  };

  const generateCulture = async (field: keyof CulturalElements) => {
    if (ollamaStatus !== 'connected') {
        toast({ title: "AI Service not connected", description: "Start Ollama to generate ideas.", variant: "destructive" });
        return;
    }

    setIsGenerating(field);
    
    try {
        const models = await ollamaClient.listModels();
        const model = models.find((m: ModelMetadata) => m.name.includes('stable-beluga'))?.name || 
                      models.find((m: ModelMetadata) => m.name.includes('llama3'))?.name || 
                      models[0]?.name || 'mistral';
        
        const prompt = `You are a world-building expert. Generate 3 unique and creative ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} for a ${data.genre?.join('/') || 'diverse'} world named "${data.name || 'Unnamed'}".
Context: ${data.atmosphere || 'No specific atmosphere'}.
Tone: ${data.tone?.join(', ') || 'Neutral'}.
Current ${field}: ${elements[field].join(', ') || 'None'}.
Return ONLY a comma-separated list of 3 items. No preamble. No numbers.`;

        const response = await ollamaClient.generate(model, prompt);
        const newItems = response.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
        
        updateElements({ [field]: Array.from(new Set([...elements[field], ...newItems])) });
        toast({ title: `Generated new ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}!`, variant: "success" });
    } catch (_err) {
        console.error("AI Generation failed:", _err);
        toast({ title: "Failed to generate ideas.", variant: "destructive" });
    } finally {
        setIsGenerating(null);
    }
  };

  const handleRefineAllCulture = async () => {
    if (ollamaStatus !== 'connected') {
        toast({ title: "AI Service not connected", variant: "destructive" });
        return;
    }

    setIsBatchRefining(true);
    const toastId = toast({ 
        title: "AI Synthesis Started", 
        description: "AI is weaving your world's cultural fabric...", 
        variant: "info",
        duration: 0 
    });

    try {
        const fields: (keyof CulturalElements)[] = ['languages', 'religions', 'traditions', 'historicalEvents', 'culturalConflicts'];
        const updatedElements = { ...elements };

        const models = await ollamaClient.listModels();
        const model = models.find((m: ModelMetadata) => m.name.includes('stable-beluga'))?.name || 
                      models.find((m: ModelMetadata) => m.name.includes('llama3'))?.name || 
                      models[0]?.name || 'mistral';

        for (const field of fields) {
            const prompt = `Generate 2 high-concept ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} for the world "${data.name}". Genre: ${data.genre?.join('/')}. Return comma-separated ONLY.`;
            const response = await ollamaClient.generate(model, prompt);
            const newItems = response.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
            updatedElements[field] = Array.from(new Set([...updatedElements[field], ...newItems]));
        }

        onUpdate({ culturalElements: updatedElements });
        dismiss(toastId);
        toast({ title: "Cultural fabric fully enriched!", variant: "success" });
    } catch (_err) {
        dismiss(toastId);
        toast({ title: "Batch refinement failed.", variant: "destructive" });
    } finally {
        setIsBatchRefining(false);
    }
  };

  const fieldConfig: Record<keyof CulturalElements, { icon: React.ReactNode, title: string, color: string, placeholder: string }> = {
    languages: { 
      icon: <Languages className="w-6 h-6 text-purple-600 dark:text-purple-400" />, 
      title: 'Languages', 
      color: 'purple',
      placeholder: 'Name...'
    },
    religions: { 
      icon: <HandMetal className="w-6 h-6 text-amber-600 dark:text-amber-400" />, 
      title: 'Belief Systems', 
      color: 'amber',
      placeholder: 'Faith/Belief...'
    },
    traditions: { 
      icon: <ScrollText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />, 
      title: 'Traditions', 
      color: 'emerald',
      placeholder: 'Custom/Rite...'
    },
    historicalEvents: { 
      icon: <History className="w-6 h-6 text-blue-600 dark:text-blue-400" />, 
      title: 'History', 
      color: 'blue',
      placeholder: 'Event...'
    },
    culturalConflicts: { 
      icon: <Swords className="w-6 h-6 text-red-600 dark:text-red-400" />, 
      title: 'Social Tension', 
      color: 'red',
      placeholder: 'Conflict...'
    }
  };

  const renderSection = (field: keyof CulturalElements) => {
    const config = fieldConfig[field];
    const colorClasses: Record<string, string> = {
      purple: 'bg-purple-100/50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200/30',
      amber: 'bg-amber-100/50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200/30',
      emerald: 'bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200/30',
      blue: 'bg-blue-100/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200/30',
      red: 'bg-red-100/50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200/30',
    };
    
    const tagClasses: Record<string, string> = {
      purple: 'bg-purple-100/50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200/30',
      amber: 'bg-amber-100/50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200/30',
      emerald: 'bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200/30',
      blue: 'bg-blue-100/50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200/30',
      red: 'bg-red-100/50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200/30',
    };

    const buttonClasses: Record<string, string> = {
      purple: 'text-purple-500 border-purple-300/50 dark:border-purple-700/50 hover:bg-purple-500/5',
      amber: 'text-amber-500 border-amber-300/50 dark:border-amber-700/50 hover:bg-amber-500/5',
      emerald: 'text-emerald-500 border-emerald-300/50 dark:border-emerald-700/50 hover:bg-emerald-500/5',
      blue: 'text-blue-500 border-blue-300/50 dark:border-blue-700/50 hover:bg-blue-500/5',
      red: 'text-red-500 border-red-300/50 dark:border-red-700/50 hover:bg-red-500/5',
    };

    const genButtonClasses: Record<string, string> = {
      purple: 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-600',
      amber: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600',
      emerald: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600',
      blue: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-600',
      red: 'bg-red-500/10 hover:bg-red-500/20 text-red-600',
    };

    const inputBorderClasses: Record<string, string> = {
      purple: 'border-purple-500 ring-purple-500/20',
      amber: 'border-amber-500 ring-amber-500/20',
      emerald: 'border-emerald-500 ring-emerald-500/20',
      blue: 'border-blue-500 ring-blue-500/20',
      red: 'border-red-500 ring-red-500/20',
    };

    return (
      <div className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/20 dark:border-white/5 shadow-xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${colorClasses[config.color].split(' ').slice(0, 2).join(' ')}`}>
              {config.icon}
            </div>
            <h4 className="text-xl font-black text-gray-800 dark:text-white tracking-tight">{config.title}</h4>
          </div>
          <button
            onClick={() => generateCulture(field)}
            title={`Generate ${config.title}`}
            disabled={isGenerating === field}
            className={`p-2 rounded-xl transition-all ${genButtonClasses[config.color]} ${isGenerating === field ? 'animate-pulse' : ''}`}
          >
            {isGenerating === field ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 min-h-[40px]">
          {elements[field].map((item, i) => (
            <span key={i} className={`px-4 py-2 rounded-xl text-[10px] font-bold border flex items-center gap-2 group ${tagClasses[config.color]}`}>
              {item}
              <button 
                onClick={() => removeItem(field, i)} 
                aria-label={`Remove ${item}`}
                className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
              >
                ×
              </button>
            </span>
          ))}
          {addingField === field ? (
            <input
              ref={inputRef}
              type="text"
              value={newItemValue}
              onChange={(e) => setNewItemValue(e.target.value)}
              onBlur={() => confirmAddItem(field)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmAddItem(field);
                if (e.key === 'Escape') setAddingField(null);
              }}
              className={`px-4 py-2 border-2 bg-white dark:bg-gray-800 rounded-xl text-[10px] font-bold outline-none ring-2 ${inputBorderClasses[config.color]}`}
              placeholder={config.placeholder}
            />
          ) : (
            <button onClick={() => addItem(field)} className={`px-4 py-2 border-2 border-dashed rounded-xl text-[10px] font-bold transition-all ${buttonClasses[config.color]}`}>
              + Add
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-10">
      <div className="flex justify-between items-center bg-white/5 dark:bg-gray-950/20 p-4 rounded-[2rem] border border-white/10">
        <div className="px-4">
            <h3 className="text-2xl font-black text-gray-800 dark:text-white tracking-tighter uppercase">Cultural Fabric</h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest opacity-60">Society, legacy, and social tensions.</p>
        </div>
        <button
          onClick={handleRefineAllCulture}
          disabled={isBatchRefining}
          className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
        >
          {isBatchRefining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          AI Mesh Synthesis
        </button>
      </div>

      {/* Cultural Fabric Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {renderSection('languages')}
        {renderSection('religions')}
        {renderSection('traditions')}
        {renderSection('historicalEvents')}
        <div className="md:col-span-2">
          {renderSection('culturalConflicts')}
        </div>
      </section>

      {/* Narrative Summary / Final Review */}
      <section className="relative p-10 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 rounded-[3rem] border border-white/20 dark:border-white/5 overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] -z-10 group-hover:scale-150 transition-transform duration-1000" />
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-white/50 dark:bg-gray-950/50 rounded-2xl shadow-xl">
            <CheckCircle className="w-6 h-6 text-indigo-500" />
          </div>
          <h3 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">Synchronization Complete</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           <div className="space-y-2">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Communication</span>
              <p className="text-lg font-black text-gray-700 dark:text-gray-200">{(elements.languages?.length || 0)} Languages Recorded</p>
            </div>
            <div className="space-y-2">
               <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Growth</span>
               <p className="text-lg font-black text-gray-700 dark:text-gray-200">{(elements.historicalEvents?.length || 0)} Eras Defined</p>
            </div>
            <div className="space-y-2">
               <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Legacy</span>
               <p className="text-lg font-black text-gray-700 dark:text-gray-200">{(elements.religions?.length || 0)} Faiths Established</p>
           </div>
        </div>

        <div className="mt-10 p-6 bg-white/30 dark:bg-black/20 rounded-3xl border border-white/20 dark:border-white/5">
           <div className="flex items-center gap-3 mb-3">
              <Info className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-gray-500">World Manifest Ready</span>
           </div>
           <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
             Your world-state metadata has been correctly serialized. You can now finalize the creation process and proceed to manifest characters within this reality.
           </p>
        </div>
      </section>
    </div>
  );
}
