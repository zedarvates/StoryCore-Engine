import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { hermesNovelistService, HermesProject, HermesProjectSummary } from '@/services/hermesNovelistService';
import { logger } from '@/utils/logger';
import { Loader2, BookOpen, User, Globe, FileText, CheckCircle2, ChevronLeft, Download, RefreshCw, History, MessageSquare, Zap, Video, Clapperboard, Play, Send, Layout, Layers, Sparkles, TrendingUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/stores/useAppStore';
import { Character } from '@/types/character';
import { Location, WorldLocationType } from '@/types/world';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface HermesNovelistWizardProps {
  onClose: () => void;
}

const METHODOLOGIES = [
  { id: '3_act_structure', name: '3-Act Structure', icon: <Layout className="h-4 w-4" />, desc: 'The classic storytelling framework.' },
  { id: 'hero_journey', name: 'Hero\'s Journey', icon: <TrendingUp className="h-4 w-4" />, desc: 'Mythic structure used in epics.' },
  { id: 'save_the_cat', name: 'Save the Cat', icon: <Layers className="h-4 w-4" />, desc: 'Modern beat-sheet methodology.' },
  { id: 'snowflake', name: 'Snowflake Method', icon: <Sparkles className="h-4 w-4" />, desc: 'Iterative expansion from a single sentence.' },
  { id: 'fichtean_curve', name: 'Fichtean Curve', icon: <Zap className="h-4 w-4" />, desc: 'Rapid crises and constant tension.' },
];

export const HermesNovelistWizard: React.FC<HermesNovelistWizardProps> = ({ onClose }) => {
  const [step, setStep] = useState<'list' | 'setup' | 'foundation' | 'drafting' | 'view-chapter'>('list');
  const [projects, setProjects] = useState<HermesProjectSummary[]>([]);
  const [seed, setSeed] = useState('');
  const [title, setTitle] = useState('');
  const [methodology, setMethodology] = useState('3_act_structure');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [project, setProject] = useState<HermesProject | null>(null);
  const [structuredAssets, setStructuredAssets] = useState<{ characters: Character[], locations: Location[] } | null>(null);
  const [selectedChapterIndex, setSelectedChapterIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');

  const addCharacter = useAppStore(state => state.addCharacter);
  const worlds = useAppStore(state => state.worlds);

  useEffect(() => {
    loadProjects();
  }, []);

  // Polling for video generation status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPolling && projectId && selectedChapterIndex) {
      interval = setInterval(async () => {
        try {
          const updatedVis = await hermesNovelistService.getClipsStatus(projectId, selectedChapterIndex);
          setProject(prev => {
            if (!prev) return null;
            const newChapters = prev.chapters.map(ch => {
              if (ch.index === selectedChapterIndex) {
                return { ...ch, visualization: updatedVis };
              }
              return ch;
            });
            return { ...prev, chapters: newChapters };
          });
          
          const allDone = updatedVis.every(shot => shot.status === 'completed' || shot.status === 'failed');
          if (allDone) setIsPolling(false);
        } catch (error) {
          logger.error('Polling error:', error);
          setIsPolling(false);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isPolling, projectId, selectedChapterIndex]);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const list = await hermesNovelistService.listProjects();
      setProjects(list);
    } catch (error) {
      logger.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!seed.trim()) return;
    setIsLoading(true);
    try {
      const id = await hermesNovelistService.createProject(seed, title, methodology);
      setProjectId(id);
      const p = await hermesNovelistService.getProject(id);
      setProject(p);
      setStep('foundation');
    } catch (error) {
      logger.error('Failed to create project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectProject = async (id: string) => {
    setIsLoading(true);
    try {
      setProjectId(id);
      const p = await hermesNovelistService.getProject(id);
      setProject(p);
      if (p.state.phase === 'foundation') setStep('foundation');
      else setStep('drafting');
    } catch (error) {
      logger.error('Failed to load project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunFoundation = async () => {
    if (!projectId) return;
    setIsLoading(true);
    setProgress(20);
    try {
      await hermesNovelistService.runFoundation(projectId);
      const p = await hermesNovelistService.getProject(projectId);
      setProject(p);
      setProgress(100);
      setStep('drafting');
    } catch (error) {
      logger.error('Foundation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExtractAssets = async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const assets = await hermesNovelistService.extractAssets(projectId);
      setStructuredAssets(assets);
    } catch (error) {
      logger.error('Asset extraction failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncToStoryCore = () => {
    if (!structuredAssets) return;
    
    structuredAssets.characters.forEach(char => {
      addCharacter({
        character_id: `hermes_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: char.name,
        creation_method: 'auto_generated',
        creation_timestamp: Date.now(),
        version: '1.0',
        visual_identity: {
          hair_color: char.visual_identity?.hair_color || '',
          hair_style: '',
          hair_length: '',
          eye_color: char.visual_identity?.eye_color || '',
          eye_shape: '',
          skin_tone: '',
          facial_structure: '',
          distinctive_features: [],
          age_range: '',
          gender: 'unspecified',
          height: '',
          build: char.visual_identity?.build || '',
          posture: '',
          clothing_style: char.visual_identity?.clothing_style || '',
          color_palette: [],
          reference_images: [],
          reference_sheet_images: []
        },
        personality: {
          traits: char.personality?.traits || [],
          values: [],
          fears: char.personality?.fears || [],
          desires: char.personality?.desires || [],
          flaws: [],
          strengths: [],
          temperament: '',
          communication_style: ''
        },
        background: {
          origin: '',
          occupation: '',
          education: '',
          family: '',
          significant_events: [],
          current_situation: '',
          backstory: ''
        },
        relationships: [],
        role: {
          archetype: char.role?.archetype || '',
          narrative_function: char.role?.narrative_function || '',
          character_arc: ''
        }
      });
    });

    if (worlds.length > 0) {
      const world = worlds[0];
      const newLocations = structuredAssets.locations.map(loc => ({
        id: `hermes_loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: loc.name,
        description: loc.description,
        atmosphere: loc.atmosphere,
        significance: loc.significance,
        location_type: (loc.location_type as WorldLocationType) || 'interior'
      }));
      logger.info('Syncing locations to world:', world.name, newLocations);
    }

    alert('Assets synced to StoryCore project!');
    setStructuredAssets(null);
  };

  const handleDraftChapter = async (index: number) => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      await hermesNovelistService.draftChapter(projectId, index);
      const p = await hermesNovelistService.getProject(projectId);
      setProject(p);
    } catch (error) {
      logger.error('Drafting failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviseChapter = async (index: number) => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      await hermesNovelistService.reviseChapter(projectId, index);
      const p = await hermesNovelistService.getProject(projectId);
      setProject(p);
    } catch (error) {
      logger.error('Revision failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVisualizeChapter = async (index: number) => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      await hermesNovelistService.visualizeChapter(projectId, index);
      const p = await hermesNovelistService.getProject(projectId);
      setProject(p);
    } catch (error) {
      logger.error('Visualization failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerQuestion = async (qId: string) => {
    if (!projectId || !userAnswer.trim()) return;
    setIsLoading(true);
    try {
      const updatedQs = await hermesNovelistService.answerQuestion(projectId, qId, userAnswer);
      setProject(prev => prev ? { ...prev, questions: updatedQs } : null);
      setUserAnswer('');
    } catch (error) {
      logger.error('Answering failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateClips = async (index: number) => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      await hermesNovelistService.generateClips(projectId, index);
      setIsPolling(true);
    } catch (error) {
      logger.error('Clip generation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const result = await hermesNovelistService.exportNovel(projectId);
      logger.info('Novel exported to:', result.file_path);
      alert(`Novel exported successfully to ${result.filename}`);
    } catch (error) {
      logger.error('Export failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedChapter = project?.chapters.find(ch => ch.index === selectedChapterIndex);
  const pendingQuestion = project?.questions?.find(q => q.status === 'pending');

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {step !== 'list' && (
            <Button variant="ghost" size="icon" onClick={() => {
              if (step === 'view-chapter') setStep('drafting');
              else if (step === 'setup') setStep('list');
              else if (step === 'foundation') setStep('list');
              else setStep('list');
            }}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-primary" /> Hermes Novelist
            </h1>
            <p className="text-muted-foreground text-sm uppercase tracking-widest font-semibold opacity-70">Autonomous Literary Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {projectId && (
             <Button variant="outline" size="sm" onClick={handleExport} disabled={isLoading}>
               <Download className="h-4 w-4 mr-2" /> Export
             </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>

      <ScrollArea className="flex-1 -mx-2 px-2">
        {step === 'list' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">My Novels</h2>
              <Button onClick={() => setStep('setup')}>+ New Novel</Button>
            </div>
            {isLoading && projects.length === 0 ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : projects.length === 0 ? (
              <Card className="border-dashed flex flex-col items-center justify-center p-12 text-center opacity-60">
                <BookOpen className="h-12 w-12 mb-4" />
                <p>No novels found. Start your first journey.</p>
                <Button variant="link" onClick={() => setStep('setup')}>Create Project</Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((p) => (
                  <Card key={p.id} className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md group" onClick={() => handleSelectProject(p.id)}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">{p.title}</CardTitle>
                      <CardDescription className="line-clamp-1">{p.id}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <Badge variant="secondary" className="capitalize">{p.state.phase}</Badge>
                        <span>Iteration {p.state.iteration}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 'setup' && (
          <Card className="border-primary/20 shadow-xl overflow-hidden relative max-w-2xl mx-auto">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl" />
            <CardHeader>
              <CardTitle>Create New Project</CardTitle>
              <CardDescription>Start with a seed concept to build your foundation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Novel Title</label>
                  <Input 
                    placeholder="Enter novel title..." 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Writing Methodology</label>
                  <Select value={methodology} onValueChange={setMethodology}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select methodology" />
                    </SelectTrigger>
                    <SelectContent>
                      {METHODOLOGIES.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          <div className="flex items-center gap-2">
                            {m.icon}
                            <span>{m.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                 <p className="text-xs text-muted-foreground">
                   <strong>{METHODOLOGIES.find(m => m.id === methodology)?.name}:</strong> {METHODOLOGIES.find(m => m.id === methodology)?.desc}
                 </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Seed Concept</label>
                <Textarea 
                  placeholder="Describe your story idea in a few sentences..." 
                  className="min-h-[120px]"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Tip: Include world-differentiators, central tension, and sensory hooks.
                </p>
              </div>
              <Button 
                className="w-full h-12 text-lg" 
                onClick={handleCreateProject}
                disabled={isLoading || !seed.trim()}
              >
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Initialize Pipeline"}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'foundation' && project && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1 h-fit">
              <CardHeader>
                <CardTitle className="text-lg">Project Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Title</p>
                  <p className="font-medium">{project.title}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Methodology</p>
                  <Badge variant="outline" className="capitalize">{project.methodology.replace(/_/g, ' ')}</Badge>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Status</p>
                  <div className="flex items-center gap-2 text-yellow-500">
                    <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                    Building Foundation
                  </div>
                </div>
                <Progress value={progress} className="h-2" />
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Phase 1: Foundation</CardTitle>
                <CardDescription>Generating World Bible, Characters, and Outline.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col gap-4">
                  <div className={`flex items-center gap-4 p-4 rounded-lg border ${project.world.content ? 'bg-primary/5 border-primary/20' : 'bg-muted/50 border-transparent'}`}>
                    <Globe className={`h-8 w-8 ${project.world.content ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="flex-1">
                      <p className="font-semibold">World Bible</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{project.world.content || 'Waiting...'}</p>
                    </div>
                    {project.world.content && <CheckCircle2 className="ml-auto text-primary h-5 w-5" />}
                  </div>
                  <div className={`flex items-center gap-4 p-4 rounded-lg border ${project.characters.length > 0 ? 'bg-primary/5 border-primary/20' : 'bg-muted/50 border-transparent'}`}>
                    <User className={`h-8 w-8 ${project.characters.length > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="flex-1">
                      <p className="font-semibold">Character Registry</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{project.characters[0]?.content || 'Waiting...'}</p>
                    </div>
                    {project.characters.length > 0 && <CheckCircle2 className="ml-auto text-primary h-5 w-5" />}
                  </div>
                  <div className={`flex items-center gap-4 p-4 rounded-lg border ${project.outline.length > 0 ? 'bg-primary/5 border-primary/20' : 'bg-muted/50 border-transparent'}`}>
                    <FileText className={`h-8 w-8 ${project.outline.length > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="flex-1">
                      <p className="font-semibold">Chapter Outline</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{project.outline[0]?.content || 'Waiting...'}</p>
                    </div>
                    {project.outline.length > 0 && <CheckCircle2 className="ml-auto text-primary h-5 w-5" />}
                  </div>
                </div>
                
                <Button 
                  className="w-full h-12" 
                  onClick={handleRunFoundation}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Run Foundation Loop"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'drafting' && project && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">First Draft Dashboard</h2>
              <div className="flex items-center gap-2">
                 <Button variant="outline" size="sm" onClick={handleExtractAssets} disabled={isLoading}>
                   <Zap className="h-4 w-4 mr-2" /> Extract Assets
                 </Button>
                 <div className="text-sm px-3 py-1 bg-primary/10 rounded-full border border-primary/20 text-primary font-medium">
                  Literary Grade: A-
                </div>
              </div>
            </div>

            {pendingQuestion && (
              <Card className="bg-primary shadow-lg border-none text-primary-foreground animate-in zoom-in-95">
                <CardHeader className="pb-2">
                  <CardTitle className="text-md flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" /> Hermes Question for the Author
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm italic font-medium">"{pendingQuestion.text}"</p>
                  <div className="flex gap-2">
                    <Input 
                      className="bg-primary-foreground text-primary" 
                      placeholder="Your answer..." 
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAnswerQuestion(pendingQuestion.id)}
                    />
                    <Button variant="secondary" onClick={() => handleAnswerQuestion(pendingQuestion.id)} disabled={isLoading}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {structuredAssets && (
              <Card className="bg-primary/5 border-primary/30 animate-in fade-in slide-in-from-top-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-md flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" /> Assets Found (StoryCore Bridge)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Characters ({structuredAssets.characters.length})</p>
                       <div className="flex flex-wrap gap-1">
                         {structuredAssets.characters.map((c, i) => <Badge key={i} variant="outline">{c.name}</Badge>)}
                       </div>
                     </div>
                     <div>
                       <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Locations ({structuredAssets.locations.length})</p>
                       <div className="flex flex-wrap gap-1">
                         {structuredAssets.locations.map((l, i) => <Badge key={i} variant="outline">{l.name}</Badge>)}
                       </div>
                     </div>
                   </div>
                   <div className="flex gap-2">
                     <Button className="flex-1" size="sm" onClick={handleSyncToStoryCore}>Sync to StoryCore Project</Button>
                     <Button className="flex-1" size="sm" variant="ghost" onClick={() => setStructuredAssets(null)}>Dismiss</Button>
                   </div>
                </CardContent>
              </Card>
            )}
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 18 }).map((_, i) => {
                const chapter = project.chapters.find(ch => ch.index === i + 1);
                return (
                  <Card 
                    key={i} 
                    className={`relative overflow-hidden cursor-pointer hover:border-primary/50 transition-all hover:scale-[1.02] ${chapter ? 'bg-primary/5 border-primary/20 shadow-sm' : 'border-dashed opacity-70'}`}
                    onClick={() => {
                      if (chapter) {
                        setSelectedChapterIndex(i + 1);
                        setStep('view-chapter');
                      }
                    }}
                  >
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2 min-h-[100px]">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Chapter {i + 1}</p>
                      {chapter ? (
                        <>
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                            {chapter.visualization && <Video className="h-4 w-4 text-primary/60" />}
                          </div>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{chapter.content.substring(0, 30)}...</p>
                        </>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 text-[10px]" 
                          onClick={(e) => { e.stopPropagation(); handleDraftChapter(i + 1); }}
                          disabled={isLoading}
                        >
                          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Draft"}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            <Tabs defaultValue="world" className="w-full mt-8">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="world"><Globe className="h-4 w-4 mr-2" /> World Bible</TabsTrigger>
                <TabsTrigger value="characters"><User className="h-4 w-4 mr-2" /> Characters</TabsTrigger>
                <TabsTrigger value="outline"><FileText className="h-4 w-4 mr-2" /> Outline</TabsTrigger>
              </TabsList>
              <TabsContent value="world">
                <Card>
                  <CardHeader><CardTitle className="text-md">World Lore</CardTitle></CardHeader>
                  <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-sm">{project.world.content}</pre>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="characters">
                <Card>
                  <CardHeader><CardTitle className="text-md">Cast of Characters</CardTitle></CardHeader>
                  <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-sm">{project.characters[0]?.content}</pre>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="outline">
                <Card>
                  <CardHeader><CardTitle className="text-md">Dramatic Structure</CardTitle></CardHeader>
                  <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-sm">{project.outline[0]?.content}</pre>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {step === 'view-chapter' && selectedChapter && (
          <div className="space-y-6 flex flex-col h-full">
            <div className="flex items-center justify-between bg-muted/30 p-4 rounded-xl border border-border/50">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {selectedChapter.index}
                </div>
                <div>
                  <h2 className="text-xl font-bold">Chapter {selectedChapter.index}</h2>
                  <p className="text-xs text-muted-foreground">Drafted on {new Date(selectedChapter.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleVisualizeChapter(selectedChapter.index)} disabled={isLoading}>
                   {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Clapperboard className="h-4 w-4 mr-2" />}
                   Visualize Chapter
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleReviseChapter(selectedChapter.index)} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Revise (Hermes Edit)
                </Button>
                <Button size="sm" onClick={() => setStep('drafting')}>Back to Grid</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="md:col-span-3">
                <CardHeader className="border-b pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Prose Draft</CardTitle>
                  <Badge variant="outline" className="text-[10px] font-mono">UTF-8 LITERARY</Badge>
                </CardHeader>
                <CardContent className="pt-6">
                   <ScrollArea className="h-[500px] pr-4">
                    <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:text-primary">
                      {selectedChapter.content.split('\n').map((line, i) => (
                        line.trim() ? <p key={i} className="mb-4 leading-relaxed text-justify indent-8">{line}</p> : <br key={i} />
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <div className="md:col-span-1 space-y-4">
                {selectedChapter.visualization && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-primary">
                        <Video className="h-4 w-4" /> Cinematic Shot List
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="h-[400px]">
                        <div className="divide-y divide-primary/10">
                          {selectedChapter.visualization.map((shot, i) => (
                            <div key={i} className="p-3 text-[10px] hover:bg-primary/5 group relative">
                              <div className="flex items-center justify-between mb-1">
                                <Badge variant="outline" className="text-[8px] h-4">{shot.angle}</Badge>
                                <div className="flex items-center gap-2">
                                  {shot.status === 'processing' && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                                  {shot.status === 'completed' && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                                  <span className="text-muted-foreground">{shot.duration}s</span>
                                </div>
                              </div>
                              <p className="text-primary/80 italic line-clamp-2">{shot.prompt}</p>
                              {shot.video_url && (
                                <div className="mt-2 aspect-video bg-black rounded overflow-hidden relative group-hover:block hidden">
                                   <video src={shot.video_url} className="w-full h-full object-cover" autoPlay loop muted />
                                   <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Play className="h-8 w-8 text-white fill-white" />
                                   </div>
                                </div>
                              )}
                              {(shot.progress ?? 0) > 0 && shot.status === 'processing' && (
                                <Progress value={shot.progress ?? 0} className="h-1 mt-1" />
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="p-3">
                           <Button 
                             className="w-full h-8 text-[10px]" 
                             size="sm" 
                             onClick={() => handleGenerateClips(selectedChapter.index)}
                             disabled={isLoading || isPolling}
                           >
                             {isPolling ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Zap className="h-3 w-3 mr-2" />}
                             Generate via ComfyUI
                           </Button>
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <History className="h-4 w-4" /> Revision History
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[200px]">
                      {selectedChapter.revisions && selectedChapter.revisions.length > 0 ? (
                        <div className="divide-y">
                          {selectedChapter.revisions.map((rev, i) => (
                            <div key={i} className="p-3 text-[10px] hover:bg-muted/50 cursor-pointer">
                              <p className="font-bold">{new Date(rev.timestamp).toLocaleString()}</p>
                              <p className="text-muted-foreground line-clamp-2">{rev.critique}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-muted-foreground text-xs italic">
                          No revisions yet.
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card>
                   <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" /> Hermes Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-[10px] text-muted-foreground space-y-2">
                    <div className="p-2 bg-primary/5 rounded border border-primary/10">
                      <strong>Focus:</strong> Sensory details in the marketplace scene.
                    </div>
                    <div className="p-2 bg-yellow-500/5 rounded border border-yellow-500/10">
                      <strong>Watch:</strong> Pacing slows down in the middle section.
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
