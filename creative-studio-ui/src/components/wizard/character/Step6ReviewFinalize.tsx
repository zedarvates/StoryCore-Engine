import { useWizard } from '@/contexts/WizardContext';
import { WizardFormLayout } from '../WizardFormLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Edit, HardDrive, Binary, Cpu, Activity, Share2, Terminal, ShieldCheck, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Character } from '@/types/character';
import type { StoryContext } from './CharacterWizard';

// ============================================================================
// Step 6: Final Materialization (Review and Finalize)
// ============================================================================

interface Step6ReviewFinalizeProps {
  storyContext?: StoryContext;
}

export function Step6ReviewFinalize({ storyContext }: Step6ReviewFinalizeProps = {}) {
  const { formData, goToStep, previousStep, submitWizard, isSubmitting } =
    useWizard<Character>();

  const handleEdit = (step: number) => {
    goToStep(step);
  };

  return (
    <WizardFormLayout
      title="Final Materialization"
      description="Validate consciousness parameters and commit entity to active archives"
    >
      <div className="space-y-8">
        {/* Neural Signature (Basic Identity) */}
        <div className="p-6 border border-primary/20 bg-primary/5 backdrop-blur-sm relative transition-all hover:border-primary/40">
          <div className="absolute -top-3 left-6 bg-[#050b10] px-3 py-0.5 border border-primary/20 flex items-center gap-2">
            <ShieldCheck className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-black text-primary neon-text uppercase tracking-widest font-mono">// Neural Signature</span>
          </div>
          <Button
            onClick={() => handleEdit(1)}
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 h-7 text-[10px] uppercase font-black tracking-widest text-primary/40 hover:text-primary hover:bg-primary/10"
          >
            <Edit className="w-3 h-3 mr-2" />
            Modify
          </Button>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase text-primary/40 tracking-widest">Entity Designation</p>
              <p className="text-sm font-black text-primary uppercase tracking-wider font-mono">{formData.name || 'UNSPECIFIED'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase text-primary/40 tracking-widest">Core Archetype</p>
              <p className="text-xs font-mono text-primary/80 uppercase">{formData.role?.archetype || 'DATA MISSING'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase text-primary/40 tracking-widest">Maturity / Variant</p>
              <p className="text-xs font-mono text-primary/80 uppercase">{formData.visual_identity?.age_range} | {formData.visual_identity?.gender}</p>
            </div>
          </div>
        </div>

        {/* Morphological Profile (Physical Appearance) */}
        <div className="p-6 border border-primary/20 bg-primary/5 backdrop-blur-sm relative transition-all hover:border-primary/40">
          <div className="absolute -top-3 left-6 bg-[#050b10] px-3 py-0.5 border border-primary/20 flex items-center gap-2">
            <Binary className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-black text-primary neon-text uppercase tracking-widest font-mono">// Morphological Profile</span>
          </div>
          <Button
            onClick={() => handleEdit(2)}
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 h-7 text-[10px] uppercase font-black tracking-widest text-primary/40 hover:text-primary hover:bg-primary/10"
          >
            <Edit className="w-3 h-3 mr-2" />
            Modify
          </Button>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4">
            <div className="space-y-1 col-span-2">
              <p className="text-[9px] font-black uppercase text-primary/40 tracking-widest">Spectral Data (Ocular/Follicular)</p>
              <div className="flex flex-wrap gap-2">
                {formData.visual_identity?.eye_color && <Badge variant="outline" className="bg-primary/5 border-primary/20 text-[9px] font-mono text-primary/60 uppercase">EYE: {formData.visual_identity.eye_color}</Badge>}
                {formData.visual_identity?.hair_color && <Badge variant="outline" className="bg-primary/5 border-primary/20 text-[9px] font-mono text-primary/60 uppercase">HAIR: {formData.visual_identity.hair_color}</Badge>}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase text-primary/40 tracking-widest">Structural Build</p>
              <p className="text-xs font-mono text-primary/80 uppercase">{formData.visual_identity?.build || 'GENERIC'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase text-primary/40 tracking-widest">Dimensional Height</p>
              <p className="text-xs font-mono text-primary/80 uppercase">{formData.visual_identity?.height || 'STANDARD'}</p>
            </div>
          </div>
        </div>

        {/* Cognitive Matrix (Personality) */}
        <div className="p-6 border border-primary/20 bg-primary/5 backdrop-blur-sm relative transition-all hover:border-primary/40">
          <div className="absolute -top-3 left-6 bg-[#050b10] px-3 py-0.5 border border-primary/20 flex items-center gap-2">
            <Cpu className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-black text-primary neon-text uppercase tracking-widest font-mono">// Cognitive Matrix</span>
          </div>
          <Button
            onClick={() => handleEdit(3)}
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 h-7 text-[10px] uppercase font-black tracking-widest text-primary/40 hover:text-primary hover:bg-primary/10"
          >
            <Edit className="w-3 h-3 mr-2" />
            Modify
          </Button>

          <div className="space-y-6 pt-4">
            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase text-primary/40 tracking-widest">Heuristic Attributes (Traits)</p>
              <div className="flex flex-wrap gap-2">
                {formData.personality?.traits?.map((trait, i) => (
                  <Badge key={i} className="bg-primary/20 text-primary border-primary/20 text-[9px] font-mono uppercase tracking-widest">{trait}</Badge>
                ))}
                {(!formData.personality?.traits || formData.personality.traits.length === 0) && <span className="text-[10px] text-primary/20 uppercase font-mono italic">No traits initialized</span>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase text-primary/40 tracking-widest">Emotional Baseline</p>
                <p className="text-xs font-mono text-primary/80 uppercase">{formData.personality?.temperament || 'UNDEFINED'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase text-primary/40 tracking-widest">Interface Protocol</p>
                <p className="text-xs font-mono text-primary/80 uppercase">{formData.personality?.communication_style || 'UNDEFINED'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chronological Data (Background) */}
        <div className="p-6 border border-primary/20 bg-primary/5 backdrop-blur-sm relative transition-all hover:border-primary/40">
          <div className="absolute -top-3 left-6 bg-[#050b10] px-3 py-0.5 border border-primary/20 flex items-center gap-2">
            <HardDrive className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-black text-primary neon-text uppercase tracking-widest font-mono">// Chronological Data</span>
          </div>
          <Button
            onClick={() => handleEdit(4)}
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 h-7 text-[10px] uppercase font-black tracking-widest text-primary/40 hover:text-primary hover:bg-primary/10"
          >
            <Edit className="w-3 h-3 mr-2" />
            Modify
          </Button>

          <div className="space-y-4 pt-4">
            {formData.background?.origin && (
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase text-primary/40 tracking-widest">Causal Inception (Origin)</p>
                <p className="text-[11px] font-mono text-primary/60 italic">"{formData.background.origin}"</p>
              </div>
            )}
            {formData.background?.significant_events && formData.background.significant_events.length > 0 && (
              <div className="space-y-2">
                <p className="text-[9px] font-black uppercase text-primary/40 tracking-widest">Critical Iterations (Significant Events)</p>
                <div className="space-y-1.5">
                  {formData.background.significant_events.map((event, i) => (
                    <div key={i} className="flex items-start gap-2 border-l border-primary/20 pl-3">
                      <Terminal className="w-2.5 h-2.5 text-primary/40 mt-0.5" />
                      <p className="text-[10px] font-mono text-primary/80 uppercase tracking-tighter">{event}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SocialGrid Nexus (Relationships) */}
        <div className="p-6 border border-primary/20 bg-primary/5 backdrop-blur-sm relative transition-all hover:border-primary/40">
          <div className="absolute -top-3 left-6 bg-[#050b10] px-3 py-0.5 border border-primary/20 flex items-center gap-2">
            <Share2 className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-black text-primary neon-text uppercase tracking-widest font-mono">// SocialGrid Nexus</span>
          </div>
          <Button
            onClick={() => handleEdit(5)}
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 h-7 text-[10px] uppercase font-black tracking-widest text-primary/40 hover:text-primary hover:bg-primary/10"
          >
            <Edit className="w-3 h-3 mr-2" />
            Modify
          </Button>

          <div className="pt-4">
            {formData.relationships && formData.relationships.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.relationships.map((rel, i) => (
                  <div key={i} className="p-3 border border-primary/10 bg-primary/5 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-black text-primary uppercase tracking-wider">{rel.character_name}</p>
                      <p className="text-[9px] font-mono text-primary/60 uppercase">{rel.relationship_type} | {rel.dynamic}</p>
                    </div>
                    <Activity className="w-3.5 h-3.5 text-primary/20" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] font-mono text-primary/20 uppercase italic pt-2">No interpersonal linkages detected</p>
            )}
          </div>
        </div>

        {/* Final Confirmation Message */}
        <div className="p-4 border border-primary/20 bg-primary/10 flex items-center gap-4">
          <Zap className="h-5 w-5 text-primary pulse-neon shrink-0" />
          <p className="text-[10px] font-mono text-primary/80 uppercase tracking-widest leading-relaxed">
            System components verified. All heuristic datasets and morphological profiles are synchronized. Press the button below to materialize this entity into the primary narrative archive.
          </p>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t border-primary/10">
          <Button
            type="button"
            variant="ghost"
            onClick={previousStep}
            disabled={isSubmitting}
            className="text-[10px] font-black uppercase tracking-widest text-primary/60 hover:text-primary"
          >
            ← Access Previous Data
          </Button>
          <Button
            type="button"
            onClick={submitWizard}
            disabled={isSubmitting}
            className="btn-neon bg-primary text-black font-black uppercase tracking-widest px-8"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-3 w-3 border-2 border-black border-t-transparent rounded-full" />
                <span>Materializing...</span>
              </div>
            ) : 'Materialize Entity'}
          </Button>
        </div>
      </div>
    </WizardFormLayout>
  );
}
