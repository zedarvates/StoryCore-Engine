import { CheckCircle2, Edit, Globe, MapPin, BookOpen, Users } from 'lucide-react';
import { useWizard } from '@/contexts/WizardContext';
import type { World } from '@/types/world';
import { WizardFormLayout } from '../WizardFormLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ============================================================================
// Step 6: Genesis Verification (Review and Finalize)
// ============================================================================

export function Step6GenesisVerification() {
    const { formData, goToStep } = useWizard<World>();

    const handleEditSection = (step: number) => {
        // goToStep uses 0-indexed step numbers in most implementations, 
        // but the indicators and common refs often use 1-indexed.
        // In WorldWizard renderStepContent, case 0 is Step 1.
        // So handleEditSection(1) should take us to case 0.
        // Actually, in useWizard, goToStep(n) usually takes you to step index n.
        // Let's check how goToStep is used in WorldWizardContent.
        // goToStep(currentStep) is passed to ProductionWizardContainer.
        // We'll stick to the convention used in the file, but fix the Societal Matrix index.
        goToStep(step - 1);
    };

    return (
        <WizardFormLayout
            title="Genesis Verification"
            description="Review all ontological parameters before reality instantiation"
        >
            <div className="space-y-10">
                {/* Basic Information: Reality Anchor */}
                <div className="border border-primary/20 bg-primary/5 backdrop-blur-sm overflow-hidden relative group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                    <div className="p-4 border-b border-primary/10 flex items-center justify-between bg-primary/5">
                        <h3 className="text-sm font-black flex items-center gap-2 neon-text text-primary uppercase tracking-[0.2em] font-mono">
                            <Globe className="h-4 w-4" />
                            Reality Anchor
                        </h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSection(1)}
                            className="h-7 text-[10px] font-black uppercase tracking-widest text-primary/60 hover:text-primary hover:bg-primary/10 font-mono"
                        >
                            <Edit className="h-3 w-3 mr-2" />
                            Modify
                        </Button>
                    </div>
                    <div className="p-4 space-y-6 pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <p className="text-[9px] font-black text-primary/40 uppercase tracking-[0.2em] font-mono mb-1">// Reality Designation</p>
                                <p className="text-sm text-white font-black uppercase tracking-wider font-mono">{formData.name || 'UNIDENTIFIED'}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-primary/40 uppercase tracking-[0.2em] font-mono mb-1">// Temporal Coordinates</p>
                                <p className="text-xs text-primary-foreground/80 font-mono uppercase italic">{formData.timePeriod || 'NOT_DEFINED'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <div>
                                <p className="text-[9px] font-black text-primary/40 uppercase tracking-[0.2em] font-mono mb-2">// Causal Frameworks</p>
                                <div className="flex flex-wrap gap-2">
                                    {formData.genre && formData.genre.length > 0 ? (
                                        formData.genre.map((g) => (
                                            <Badge key={g} variant="outline" className="border-primary/20 bg-primary/5 text-primary/60 font-mono text-[9px] uppercase">
                                                {g}
                                            </Badge>
                                        ))
                                    ) : (
                                        <p className="text-[10px] text-primary/20 italic font-mono uppercase">NULL_SET</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <p className="text-[9px] font-black text-primary/40 uppercase tracking-[0.2em] font-mono mb-2">// Experiential Parameters</p>
                                <div className="flex flex-wrap gap-2">
                                    {formData.tone && formData.tone.length > 0 ? (
                                        formData.tone.map((t) => (
                                            <Badge key={t} variant="outline" className="border-primary/20 bg-primary/5 text-primary/60 font-mono text-[9px] uppercase">
                                                {t}
                                            </Badge>
                                        ))
                                    ) : (
                                        <p className="text-[10px] text-primary/20 italic font-mono uppercase">NULL_SET</p>
                                    )}
                                </div>
                            </div>

                            {/* Visual Intent */}
                            <div>
                                <p className="text-[9px] font-black text-primary/40 uppercase tracking-[0.2em] font-mono mb-2">// Artistic Signature</p>
                                <div className="space-y-2">
                                    <p className="text-xs text-white font-mono uppercase tracking-widest">{formData.visualIntent?.style || 'STANDARD_REALISM'}</p>
                                    <div className="flex gap-1 mt-1">
                                        {formData.visualIntent?.colors?.map((c, i) => (
                                            <div key={i} className="w-8 h-1" style={{ backgroundColor: c }} title={c} />
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {formData.visualIntent?.vibe?.split(',').map((v, i) => (
                                            <span key={i} className="text-[8px] text-primary/60 border border-primary/10 px-1 font-mono uppercase">
                                                {v.trim()}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* World Rules: Ontological Governance */}
                <div className="border border-primary/20 bg-primary/5 backdrop-blur-sm overflow-hidden relative group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/60" />
                    <div className="p-4 border-b border-primary/10 flex items-center justify-between bg-primary/5">
                        <h3 className="text-sm font-black flex items-center gap-2 neon-text text-primary uppercase tracking-[0.2em] font-mono">
                            <BookOpen className="h-4 w-4" />
                            Ontological Governance
                        </h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSection(2)}
                            className="h-7 text-[10px] font-black uppercase tracking-widest text-primary/60 hover:text-primary hover:bg-primary/10 font-mono"
                        >
                            <Edit className="h-3 w-3 mr-2" />
                            Modify
                        </Button>
                    </div>
                    <div className="p-4 space-y-6 pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Technology */}
                            {formData.technology && (
                                <div>
                                    <p className="text-[9px] font-black text-primary/40 uppercase tracking-[0.2em] font-mono mb-1">// Applied Singularity</p>
                                    <p className="text-xs text-primary-foreground/80 font-mono italic">{formData.technology}</p>
                                </div>
                            )}

                            {/* Magic */}
                            {formData.magic && (
                                <div>
                                    <p className="text-[9px] font-black text-primary/40 uppercase tracking-[0.2em] font-mono mb-1">// Anomalous Protocols</p>
                                    <p className="text-xs text-primary-foreground/80 font-mono italic">{formData.magic}</p>
                                </div>
                            )}
                        </div>

                        {/* Custom Rules */}
                        {formData.rules && formData.rules.length > 0 && (
                            <div>
                                <p className="text-[9px] font-black text-primary/40 uppercase tracking-[0.2em] font-mono mb-3">// Governance Subroutines</p>
                                <div className="space-y-3">
                                    {formData.rules.slice(0, 3).map((rule) => (
                                        <div key={rule.id} className="p-3 border border-primary/10 bg-black/40 relative">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[9px] text-primary/40 font-mono uppercase tracking-widest font-black">PROTO_ID: {rule.id.substring(0, 6)}</span>
                                                <Badge variant="outline" className="text-[8px] border-primary/10 py-0 text-primary/40 uppercase font-mono">
                                                    CLASS: {rule.category}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-white/90 font-mono italic">{rule.rule}</p>
                                        </div>
                                    ))}
                                    {formData.rules.length > 3 && (
                                        <p className="text-[9px] text-primary/20 font-mono text-center uppercase tracking-[0.3em] font-black pt-2">
                                            + {formData.rules.length - 3} ADDITIONAL_SUBROUTINES_BUFFERED
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {!formData.technology && !formData.magic && (!formData.rules || formData.rules.length === 0) && (
                            <p className="text-[10px] text-primary/20 italic font-mono uppercase">SYSTEM_SCHEMA_EMPTY</p>
                        )}
                    </div>
                </div>

                {/* Locations: Topographic Matrix */}
                <div className="border border-primary/20 bg-primary/5 backdrop-blur-sm overflow-hidden relative group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/40" />
                    <div className="p-4 border-b border-primary/10 flex items-center justify-between bg-primary/5">
                        <h3 className="text-sm font-black flex items-center gap-2 neon-text text-primary uppercase tracking-[0.2em] font-mono">
                            <MapPin className="h-4 w-4" />
                            Topographic Matrix
                        </h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSection(3)}
                            className="h-7 text-[10px] font-black uppercase tracking-widest text-primary/60 hover:text-primary hover:bg-primary/10 font-mono"
                        >
                            <Edit className="h-3 w-3 mr-2" />
                            Modify
                        </Button>
                    </div>
                    <div className="p-4 pt-6">
                        {formData.locations && formData.locations.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {formData.locations.map((location) => (
                                    <div key={location.id} className="p-3 border border-primary/10 bg-black/40 group hover:border-primary/30 transition-colors">
                                        <div className="flex items-start gap-3">
                                            <MapPin className="h-3 w-3 text-primary/40 mt-1 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black text-primary uppercase tracking-wider font-mono">{location.name}</p>
                                                {location.description && (
                                                    <p className="text-[10px] text-primary-foreground/60 mt-1 line-clamp-1 font-mono italic">
                                                        {location.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[10px] text-primary/20 italic font-mono uppercase">TOPOGRAPHIC_CHART_EMPTY</p>
                        )}
                    </div>
                </div>

                {/* Key Objects: Registry of Relics */}
                <div className="border border-primary/20 bg-primary/5 backdrop-blur-sm overflow-hidden relative group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
                    <div className="p-4 border-b border-primary/10 flex items-center justify-between bg-primary/5">
                        <h3 className="text-sm font-black flex items-center gap-2 neon-text text-primary uppercase tracking-[0.2em] font-mono">
                            <BookOpen className="h-4 w-4" />
                            Registry of Relics
                        </h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSection(4)}
                            className="h-7 text-[10px] font-black uppercase tracking-widest text-primary/60 hover:text-primary hover:bg-primary/10 font-mono"
                        >
                            <Edit className="h-3 w-3 mr-2" />
                            Modify
                        </Button>
                    </div>
                    <div className="p-4 pt-6">
                        {formData.keyObjects && formData.keyObjects.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {formData.keyObjects.map((object) => (
                                    <div key={object.id} className="p-3 border border-primary/10 bg-black/40 group hover:border-primary/30 transition-colors">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <p className="text-xs font-black text-primary uppercase tracking-wider font-mono">{object.name}</p>
                                                <Badge variant="outline" className="text-[8px] py-0 border-primary/10 bg-black/20 text-primary/40 font-mono">
                                                    {object.type?.toUpperCase()}
                                                </Badge>
                                            </div>
                                            {object.description && (
                                                <p className="text-[10px] text-primary-foreground/60 mt-1 line-clamp-1 font-mono italic">
                                                    {object.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[10px] text-primary/20 italic font-mono uppercase">RELIC_DATABASE_EMPTY</p>
                        )}
                    </div>
                </div>

                {/* Cultural Elements: Societal Matrix */}
                <div className="border border-primary/20 bg-primary/5 backdrop-blur-sm overflow-hidden relative group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/10" />
                    <div className="p-4 border-b border-primary/10 flex items-center justify-between bg-primary/5">
                        <h3 className="text-sm font-black flex items-center gap-2 neon-text text-primary uppercase tracking-[0.2em] font-mono">
                            <Users className="h-4 w-4" />
                            Societal Matrix
                        </h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSection(5)}
                            className="h-7 text-[10px] font-black uppercase tracking-widest text-primary/60 hover:text-primary hover:bg-primary/10 font-mono"
                        >
                            <Edit className="h-3 w-3 mr-2" />
                            Modify
                        </Button>
                    </div>
                    <div className="p-4 space-y-8 pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Languages */}
                            {formData.culturalElements?.languages && formData.culturalElements.languages.length > 0 && (
                                <div>
                                    <p className="text-[9px] font-black text-primary/40 uppercase tracking-[0.2em] font-mono mb-2">// Linguistic Protocols</p>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.culturalElements.languages.map((lang, index) => (
                                            <Badge key={index} variant="outline" className="text-[9px] border-primary/10 bg-primary/5 text-primary/60 font-mono uppercase">
                                                {lang}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Religions */}
                            {formData.culturalElements?.religions && formData.culturalElements.religions.length > 0 && (
                                <div>
                                    <p className="text-[9px] font-black text-primary/40 uppercase tracking-[0.2em] font-mono mb-2">// Belief Architectures</p>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.culturalElements.religions.map((religion, index) => (
                                            <Badge key={index} variant="outline" className="text-[9px] border-primary/10 bg-primary/5 text-primary/60 font-mono uppercase">
                                                {religion}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Traditions & History */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {formData.culturalElements?.traditions && formData.culturalElements.traditions.length > 0 && (
                                <div>
                                    <p className="text-[9px] font-black text-primary/40 uppercase tracking-[0.2em] font-mono mb-2">// Social Subroutines</p>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.culturalElements.traditions.map((tradition, index) => (
                                            <Badge key={index} variant="outline" className="text-[9px] border-primary/10 bg-primary/5 text-primary/60 font-mono uppercase">
                                                {tradition}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {formData.culturalElements?.historicalEvents && formData.culturalElements.historicalEvents.length > 0 && (
                                <div>
                                    <p className="text-[9px] font-black text-primary/40 uppercase tracking-[0.2em] font-mono mb-2">// Temporal Logs</p>
                                    <div className="space-y-1">
                                        {formData.culturalElements.historicalEvents.map((event, index) => (
                                            <p key={index} className="text-[10px] text-primary-foreground/60 font-mono italic">
                                                • {event}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Atmosphere */}
                        {formData.atmosphere && (
                            <div className="p-3 border border-primary/10 bg-black/40">
                                <p className="text-[9px] font-black text-primary/40 uppercase tracking-[0.2em] font-mono mb-1">// Aesthetic Calibration</p>
                                <p className="text-[10px] text-white/80 font-mono italic">{formData.atmosphere}</p>
                            </div>
                        )}

                        {!formData.culturalElements && !formData.atmosphere && (
                            <p className="text-[10px] text-primary/20 italic font-mono uppercase">SOCIETAL_MATRIX_NULL</p>
                        )}
                    </div>
                </div>

                {/* Completion Message */}
                <div className="border border-primary/40 bg-primary/10 backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
                    <div className="p-6 relative z-10">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]">
                                <CheckCircle2 className="h-7 w-7 text-primary pulse-neon" />
                            </div>
                            <div className="pt-1">
                                <h3 className="text-sm font-black text-primary neon-text uppercase tracking-[0.3em] font-mono mb-2">
                                    Ontological Blueprint Verified
                                </h3>
                                <p className="text-xs text-primary-foreground/80 font-mono italic leading-relaxed">
                                    The parameters for <span className="text-primary font-black not-italic">"{formData.name || 'UNNAMED_WORLD'}"</span> are synchronized with the genesis engine.
                                    Initiate instantiation sequence to manifest this reality.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </WizardFormLayout>
    );
}
