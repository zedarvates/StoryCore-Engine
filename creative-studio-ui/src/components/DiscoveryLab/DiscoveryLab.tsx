import React, { useState } from 'react';
import {
  Telescope,
  FileText,
  Sparkles,
  Brain,
  ChevronRight,
  Download,
  AlertCircle,
  Lightbulb,
  MessageSquare,
  Layout,
  CheckCircle2,
  Globe,
  Share2,
  Layers,
  ListVideo,
  UserSquare2,
  Activity,
  Server,
  Loader2,
  Zap,
  Bot
} from 'lucide-react';
import { aiPerformanceService, QueueStats, CacheStats } from '@/services/aiPerformanceService';
import { discoveryService, DiscoveryAnalysis } from '@/services/discoveryService';
import { CinematicAssembler } from '../CinematicAssembler/CinematicAssembler';
import { sequencePlanService, SequencePlanData } from '@/services/sequencePlanService';
import { automationService, PaperEditResponse, SocialMediaAdaptResponse } from '@/services/automationService';
import { CastStudio } from '../CastStudio/CastStudio';
import { Shot } from '@/types';
import { AgentDashboard } from './AgentDashboard';

import { gemRewardService } from '@/services/gemRewardService';
import { useAppStore } from '@/stores/useAppStore';

export const DiscoveryLab: React.FC = () => {
  const [content, setContent] = useState('');
  const [projectName, setProjectName] = useState('Nouveau Projet');
  const [projectGoal, setProjectGoal] = useState('Série documentaire ou animation');
  const [analysisResult, setAnalysisResult] = useState<DiscoveryAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingSequence, setCreatingSequence] = useState(false);
  const [sequenceCreated, setSequenceCreated] = useState(false);
  const [createdPlan, setCreatedPlan] = useState<SequencePlanData | null>(null);
  const [view, setView] = useState<'discovery' | 'assembler' | 'narrative_lab' | 'distribution_hub' | 'casting' | 'performance' | 'effort_analysis' | 'agent_economy'>('discovery');

  // Phase 4: AI Effort Analysis States
  const [effortText, setEffortText] = useState('');
  const [contributionType, setContributionType] = useState('bug_report');
  const [analyzingEffort, setAnalyzingEffort] = useState(false);
  const [effortResult, setEffortResult] = useState<{ gems_awarded: number, analysis: { effort: number, impact_multiplier: number, agent: string } } | null>(null);

  const currentProjectId = useAppStore(state => state.project?.id || 'storycore-main');
  console.log("Labo actif pour le projet:", currentProjectId);

  // Phase 2 & 3 States
  const [paperEdit, setPaperEdit] = useState<PaperEditResponse | null>(null);
  const [socialPack, setSocialPack] = useState<SocialMediaAdaptResponse | null>(null);
  const [generatingPaper, setGeneratingPaper] = useState(false);
  const [generatingSocial, setGeneratingSocial] = useState(false);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);

  const handleAnalyze = async () => {
    if (!content.trim()) return;
    setLoading(true);
    setError(null);
    setSequenceCreated(false);
    try {
      const rawResult = await discoveryService.analyzeContent(projectName, projectGoal, content);
      const parsed = discoveryService.parseAnalysis(rawResult);
      setAnalysisResult(parsed);
      setCreatedPlan(null);
      setView('discovery');
    } catch (err: unknown) {
      setError("La découverte narrative a échoué. Vérifiez votre connexion API.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSequence = async () => {
    if (!analysisResult) return;
    setCreatingSequence(true);
    try {
      const planName = `Discovery: ${projectName}`;
      const description = `Narrative Structure generated from discovery analysis.\nConflict: ${analysisResult.conflict}`;

      // 1. Create the plan
      const plan = await sequencePlanService.createSequencePlan(planName, description);

      // 2. Create shots for each act
      const shots: Shot[] = [
        {
          id: `shot-${Date.now()}-1`,
          title: "Act I - The Hook",
          description: analysisResult.rough_structure.act1,
          prompt: `Act 1: ${analysisResult.rough_structure.act1.substring(0, 100)}...`,
          duration: 20,
          position: 0,
          metadata: { cameraAngle: 'Wide Shot', camera_movement: 'Cinematic Pan', lighting: 'Dusk' }
        },
        {
          id: `shot-${Date.now()}-2`,
          title: "Act II - The Conflict",
          description: analysisResult.rough_structure.act2,
          prompt: `Act 2: ${analysisResult.rough_structure.act2.substring(0, 100)}...`,
          duration: 30,
          position: 1,
          metadata: { cameraAngle: 'Medium Close-up', camera_movement: 'Static', lighting: 'High Contrast' }
        },
        {
          id: `shot-${Date.now()}-3`,
          title: "Act III - The Resolution",
          description: analysisResult.rough_structure.act3,
          prompt: `Act 3: ${analysisResult.rough_structure.act3.substring(0, 100)}...`,
          duration: 15,
          position: 2,
          metadata: { cameraAngle: 'Extreme Close-up', camera_movement: 'Slow Zoom', lighting: 'Soft Glow' }
        }
      ];

      // 3. Add shots to the plan
      const updatedPlan = await sequencePlanService.updateSequencePlan(plan.id, { shots });

      setCreatedPlan(updatedPlan);
      setSequenceCreated(true);

      // Auto-switch to assembler after 1.5s
      setTimeout(() => setView('assembler'), 1500);

    } catch (err) {
      console.error("Failed to create sequence:", err);
      setError("Échec de la création de la séquence.");
    } finally {
      setCreatingSequence(false);
    }
  };

  const handlePaperEdit = async () => {
    if (!content) return;
    setGeneratingPaper(true);
    setView('narrative_lab');
    try {
      const result = await automationService.createPaperEdit(content);
      setPaperEdit(result);
    } catch (err) {
      console.error("Paper Edit failed:", err);
    } finally {
      setGeneratingPaper(false);
    }
  };

  const handleSocialPack = async () => {
    setGeneratingSocial(true);
    setView('distribution_hub');
    try {
      const summary = analysisResult?.rough_structure?.act1 || projectName;
      const result = await automationService.generateSocialPack(summary);
      setSocialPack(result);
    } catch (err) {
      console.error("Social Pack failed:", err);
    } finally {
      setGeneratingSocial(false);
    }
  };

  const loadPerformanceStats = async () => {
    setLoadingPerformance(true);
    try {
      const [q, c] = await Promise.all([
        aiPerformanceService.getQueueStats(),
        aiPerformanceService.getCacheStats()
      ]);
      setQueueStats(q);
      setCacheStats(c);
    } catch (err) {
      console.error("Failed to load performance stats:", err);
    } finally {
      setLoadingPerformance(false);
    }
  };

  const handleAnalyzeEffort = async () => {
    if (!effortText.trim()) return;
    setAnalyzingEffort(true);
    setError(null);
    try {
      const result = await gemRewardService.analyzeContribution(
        'storycore-studio',
        'current-user', // In real app, get from auth
        effortText,
        contributionType
      );
      setEffortResult(result);
    } catch (err) {
      console.error("Effort analysis failed:", err);
      setError("Échec de l'analyse d'effort Gem Protocol.");
    } finally {
      setAnalyzingEffort(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] text-slate-200 overflow-hidden font-sans">
      {/* Header Area */}
      <div className="p-6 bg-gradient-to-r from-violet-900/20 to-transparent border-b border-slate-800">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-violet-600 rounded-xl shadow-lg shadow-violet-500/20">
            <Telescope className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Discovery Lab</h1>
            <p className="text-sm text-slate-400">Assistant Éditeur IA — Intelligence Narrative & R&D</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Raw Input */}
        <div className="w-1/2 flex flex-col border-r border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Matière Brute (Transcriptions / Notes)
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
              {content.length} caractères
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Nom du Projet</label>
              <input 
                type="text" 
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-md py-2 px-3 text-sm focus:ring-1 focus:ring-violet-500 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Objectif</label>
              <input 
                type="text" 
                value={projectGoal}
                onChange={(e) => setProjectGoal(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-md py-2 px-3 text-sm focus:ring-1 focus:ring-violet-500 outline-none"
              />
            </div>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Collez ici vos transcriptions d'interviews, scripts bruts ou notes de recherche..."
            className="flex-1 w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm leading-relaxed resize-none focus:ring-2 focus:ring-violet-600 outline-none transition-all placeholder:opacity-30"
          />

          <button
            onClick={handleAnalyze}
            disabled={loading || !content.trim()}
            className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold text-white transition-all shadow-xl ${
              loading 
                ? 'bg-slate-800 cursor-not-allowed opacity-50' 
                : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-95 shadow-violet-500/20'
            }`}
          >
            {loading ? (
              <Sparkles className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Brain className="w-5 h-5" /> EXÉCUTER LA DÉCOUVERTE NARRATIVE
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Phase 2 Quick Nav */}
          <div className="grid grid-cols-2 gap-3 mt-4">
             <button 
              onClick={handlePaperEdit}
              className="p-3 bg-slate-900 border border-slate-800 rounded-xl hover:bg-violet-900/10 hover:border-violet-800/50 transition-all text-left group"
            >
              <div className="flex items-center gap-2 text-violet-400 mb-1">
                <Brain className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Labo Narratif</span>
              </div>
              <p className="text-xs text-slate-300 group-hover:text-white">Générer un Paper Edit (Phase 2)</p>
            </button>
            <button 
              onClick={handleSocialPack}
              className="p-3 bg-slate-900 border border-slate-800 rounded-xl hover:bg-indigo-900/10 hover:border-indigo-800/50 transition-all text-left group"
            >
              <div className="flex items-center gap-2 text-indigo-400 mb-1">
                <Globe className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Distribution</span>
              </div>
              <p className="text-xs text-slate-300 group-hover:text-white">Pack de diffusion Social (Phase 2)</p>
            </button>
             <button 
              onClick={() => { setView('performance'); loadPerformanceStats(); }}
              className="p-3 bg-slate-900 border border-slate-800 rounded-xl hover:bg-amber-900/10 hover:border-amber-800/50 transition-all text-left group"
            >
              <div className="flex items-center gap-2 text-amber-400 mb-1">
                <Activity className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Performance</span>
              </div>
              <p className="text-xs text-slate-300 group-hover:text-white">Rapport d'efficacité IA (Phase 9)</p>
            </button>
            <button 
              onClick={() => setView('effort_analysis')}
              className="p-3 bg-slate-900 border border-slate-800 rounded-xl hover:bg-emerald-900/10 hover:border-emerald-800/50 transition-all text-left group"
            >
              <div className="flex items-center gap-2 text-emerald-400 mb-1">
                <Zap className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Humain</span>
              </div>
              <p className="text-xs text-slate-300 group-hover:text-white">Analyse d'Effort (Phase 4)</p>
            </button>
            <button 
              onClick={() => setView('agent_economy')}
              className="p-3 bg-slate-900 border border-slate-800 rounded-xl hover:bg-violet-900/10 hover:border-violet-800/50 transition-all text-left group col-span-2 shadow-inner shadow-violet-500/10"
            >
              <div className="flex items-center gap-2 text-violet-400 mb-1">
                <Bot className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Agent Economy</span>
              </div>
              <p className="text-xs text-slate-300 group-hover:text-white">Tableau de bord des Agents autonomes (Phase 4 & 5)</p>
            </button>
          </div>
        </div>

        {/* Right Panel: Analysis Results */}
        <div className="w-1/2 bg-[#020617] p-6 overflow-y-auto">
          {!analysisResult && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center">
                <Lightbulb className="w-8 h-8 text-slate-600" />
              </div>
              <div className="max-w-xs">
                <p className="text-lg font-medium text-slate-400 italic">"L'histoire attend d'être découverte dans vos données..."</p>
                <p className="text-sm mt-2 text-slate-500">Ajoutez des transcriptions à gauche pour commencer l'analyse professionnelle.</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="h-full flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
                <Brain className="w-8 h-8 text-violet-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-white mb-1">Analyse Multi-Couches en cours...</p>
                <p className="text-sm text-slate-500">Extraction des thèmes, conflits et enjeux narratifs.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-xl flex gap-3 text-red-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {analysisResult && view === 'discovery' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-violet-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Rapport d'Intelligence Narrative
                </h2>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors" title="Télécharger le rapport">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Analysis Summary Tiles */}
              <div className="grid grid-cols-1 gap-4">
                {analysisResult.themes.length > 0 && (
                  <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
                    <h3 className="text-[10px] text-slate-500 uppercase font-bold mb-2">Thèmes Identifiés</h3>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.themes.map((t, i) => (
                        <span key={i} className="px-2 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[11px] rounded-md">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Structured Acts Display */}
              <div className="space-y-4">
                <h3 className="text-[10px] text-slate-500 uppercase font-bold">Structure Narratif Suggérée (3 Actes)</h3>
                <div className="grid grid-cols-1 gap-3">
                  {['act1', 'act2', 'act3'].map((actKey, idx) => (
                    <div key={actKey} className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-violet-600 opacity-30 group-hover:opacity-100 transition-opacity" />
                      <div className="flex justify-between mb-1">
                        <span className="text-[10px] font-bold text-violet-400 uppercase">Acte {idx + 1}</span>
                      </div>
                      <p className="text-sm text-slate-300 italic line-clamp-3 group-hover:line-clamp-none transition-all">
                        {analysisResult.rough_structure[actKey as keyof typeof analysisResult.rough_structure]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sequence Automation CTA */}
              <div className="bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/30 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <Layout className="w-24 h-24 text-white" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" /> Convertir en Séquence
                  </h3>
                  <p className="text-sm text-slate-300 mb-6 max-w-md">
                    L'IA a structuré votre matière brute. Voulez-vous créer automatiquement une séquence de 3 plans basée sur cette analyse ?
                  </p>
                  
                  <button 
                    onClick={handleCreateSequence}
                    disabled={creatingSequence}
                    className={`flex items-center gap-3 px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${
                      sequenceCreated 
                        ? 'bg-emerald-600 text-white cursor-default'
                        : creatingSequence
                          ? 'bg-slate-800 text-slate-400 cursor-wait'
                          : 'bg-white text-violet-900 hover:bg-violet-50 hover:scale-105 active:scale-95'
                    }`}
                  >
                    {sequenceCreated ? (
                      <><CheckCircle2 className="w-5 h-5 text-white" /> SÉQUENCE CRÉÉE !</>
                    ) : creatingSequence ? (
                      <>... GÉNÉRATION EN COURS</>
                    ) : (
                      <><Layout className="w-5 h-5" /> GÉNÉRER LA SÉQUENCE DÉCOUVERTE</>
                    )}
                  </button>
                </div>
              </div>

              {/* Original Full Text (Collapsible-like) */}
              <div className="prose prose-invert prose-slate max-w-none prose-p:text-slate-400 prose-headings:text-white prose-strong:text-violet-300">
                <h3 className="text-[10px] text-slate-500 uppercase font-bold mb-2">Rapport IA Complet</h3>
                <div className="bg-slate-900/40 rounded-xl p-6 border border-slate-800 whitespace-pre-wrap leading-relaxed text-[13px]">
                  {analysisResult.raw_text}
                </div>
              </div>

              {/* Quick Actions for further R&D */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <button 
                  onClick={() => setView('assembler')}
                  disabled={!createdPlan}
                  className="flex items-center justify-start gap-3 p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition-all group disabled:opacity-30"
                >
                  <div className="p-2 bg-indigo-500/20 rounded-lg group-hover:bg-indigo-500/30 transition-colors">
                    <MessageSquare className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Cinematic Assembler</p>
                    <p className="text-[10px] text-slate-500 italic">Phase 1 : Raffinement visuel</p>
                  </div>
                </button>
                <button 
                  onClick={() => setView('casting')}
                  className="flex items-center justify-start gap-3 p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition-all group"
                >
                  <div className="p-2 bg-emerald-500/20 rounded-lg group-hover:bg-emerald-500/30 transition-colors">
                    <UserSquare2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Générer Identités</p>
                    <p className="text-[10px] text-slate-500 italic">Phase 3 : Cast Studio & Stabilité</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {createdPlan && view === 'assembler' && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
              <button 
                onClick={() => setView('discovery')}
                className="mb-4 text-[10px] text-slate-500 uppercase font-bold hover:text-white transition-colors flex items-center gap-1"
              >
                ← Retour au rapport
              </button>
              <CinematicAssembler 
                plan={createdPlan} 
                onComplete={() => {
                  console.log("Assembly Complete");
                }}
              />
            </div>
          )}

          {/* PHASE 2: NARRATIVE LAB VIEW */}
          {view === 'narrative_lab' && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-6">
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setView('discovery')}
                  className="text-[10px] text-slate-500 uppercase font-bold hover:text-white transition-colors flex items-center gap-1"
                >
                  ← Rapport Global
                </button>
                <div className="px-3 py-1 bg-violet-600 rounded-full text-[10px] font-bold text-white uppercase tracking-widest">
                  Phase 2 : Intelligence Narrative
                </div>
              </div>

              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Layers className="w-6 h-6 text-violet-400" /> Paper Edit : Le Montage Narratif
                </h2>
                
                {generatingPaper && (
                  <div className="py-20 flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
                    <p className="text-sm text-slate-400">Recherche des "Golden Quotes" et synchronisation sur la structure...</p>
                  </div>
                )}

                {paperEdit && !generatingPaper && (
                  <div className="space-y-6">
                    <div className="p-4 bg-violet-500/5 border border-violet-500/20 rounded-xl">
                      <p className="text-xs text-violet-300 font-medium italic">
                        "Structure détectée : {paperEdit.structure_found}. Nous avons identifié {paperEdit.beats.length} segments clés dans votre transcription."
                      </p>
                    </div>

                    <div className="space-y-4">
                      {paperEdit.beats.map((beat, i) => (
                        <div key={i} className="group bg-slate-800/30 border border-slate-800 rounded-xl p-5 hover:bg-slate-800/50 transition-all hover:border-violet-500/30">
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-[10px] font-black text-violet-500 uppercase tracking-tighter">[{beat.narrative_function}]</span>
                            <span className="text-[10px] bg-slate-900 px-2 py-1 rounded text-slate-500">{beat.estimated_duration}s</span>
                          </div>
                          <h4 className="text-lg font-bold text-white group-hover:text-violet-200 transition-colors mb-2">{beat.segment_title}</h4>
                          <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800 mb-4 quotes-panel">
                            <p className="text-sm text-slate-300 italic">"{beat.transcript_quote}"</p>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            <span className="font-bold text-slate-400">Direction Visuelle :</span>
                            <span className="italic">{beat.visual_suggestion}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button className="w-full py-4 bg-white text-violet-900 rounded-xl font-bold hover:bg-violet-50 transition-all flex items-center justify-center gap-2">
                      <ListVideo className="w-5 h-5" /> PASSER AU STORYBOARD COMPLET
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PHASE 2: DISTRIBUTION HUB VIEW */}
          {view === 'distribution_hub' && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-6">
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setView('discovery')}
                  className="text-[10px] text-slate-500 uppercase font-bold hover:text-white transition-colors flex items-center gap-1"
                >
                  ← Retour au Labo
                </button>
                <div className="px-3 py-1 bg-indigo-600 rounded-full text-[10px] font-bold text-white uppercase tracking-widest">
                  Phase 2 : Distribution Multicanal
                </div>
              </div>

              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <Share2 className="w-6 h-6 text-indigo-400" /> Distribution Hub
                </h2>
                <p className="text-sm text-slate-400 mb-8">Adaptez automatiquement vos hooks et vos métadonnées pour exploser sur les réseaux.</p>
                
                {generatingSocial && (
                  <div className="py-20 flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                    <p className="text-sm text-slate-400">Calcul du score viral et adaptation des formats...</p>
                  </div>
                )}

                {socialPack && !generatingSocial && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 text-center">
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Score Viral Estimaté</p>
                        <p className="text-3xl font-black text-emerald-400">{Math.round(socialPack.viral_score * 100)}%</p>
                      </div>
                      <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 text-center">
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Plateformes</p>
                        <p className="text-2xl font-black text-white">{socialPack.posts.length}</p>
                      </div>
                      <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 text-center">
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Format</p>
                        <p className="text-2xl font-black text-white">4K / 9:16</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {socialPack.posts.map((post, i) => (
                        <div key={i} className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
                          <div className="px-5 py-3 bg-slate-800/50 border-b border-slate-800 flex justify-between items-center">
                            <span className="text-sm font-bold text-white flex items-center gap-2">
                              {post.platform === 'TikTok' ? <MessageSquare className="w-4 h-4 text-pink-500" /> : <Layers className="w-4 h-4 text-blue-500" />}
                              {post.platform}
                            </span>
                            <button className="text-[10px] font-bold text-indigo-400 hover:text-white uppercase">Modifier</button>
                          </div>
                          <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] text-slate-500 uppercase font-black mb-1 block">Hook Strategique ({post.hook_timer})</label>
                                <div className="p-3 bg-red-900/10 border border-red-900/20 rounded-lg text-sm text-red-200 font-medium">
                                  {post.caption.split('.')[0]}...
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 uppercase font-black mb-1 block">Légende Optimisée</label>
                                <p className="text-sm text-slate-300 leading-relaxed">{post.caption}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {post.hashtags.map((tag, j) => (
                                <span key={j} className="text-[11px] text-indigo-400 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">#{tag}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PHASE 3: CAST STUDIO VIEW */}
          {view === 'casting' && (
            <div className="animate-in fade-in slide-in-from-top-8 duration-500 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <button 
                  onClick={() => setView('discovery')}
                  className="text-[10px] text-slate-500 uppercase font-bold hover:text-white transition-colors flex items-center gap-1"
                >
                  ← Rapport Global
                </button>
                <div className="px-3 py-1 bg-emerald-600 rounded-full text-[10px] font-bold text-white uppercase tracking-widest">
                  Phase 3 : Visual Stability & Character Casting
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                <CastStudio 
                  projectId={createdPlan?.id || 'default-project'} 
                  onSelect={(identity) => {
                    console.log("Identity Selected for Storyboard:", identity);
                  }} 
                />
              </div>
            </div>
          )}

          {/* PHASE 9: PERFORMANCE HUB VIEW */}
          {view === 'performance' && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-6">
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setView('discovery')}
                  className="text-[10px] text-slate-500 uppercase font-bold hover:text-white transition-colors flex items-center gap-1"
                >
                  ← Retour au Labo
                </button>
                <div className="px-3 py-1 bg-amber-600 rounded-full text-[10px] font-bold text-white uppercase tracking-widest">
                  Phase 9 : Performance & Production
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-amber-400" /> Job Queue Intelligence
                  </h3>
                  {loadingPerformance ? (
                    <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-slate-600" /></div>
                  ) : queueStats ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                         <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Processing</p>
                          <p className="text-2xl font-black text-indigo-400">{queueStats.processing}</p>
                        </div>
                        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Queued</p>
                          <p className="text-2xl font-black text-white">{queueStats.queued}</p>
                        </div>
                        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Completed</p>
                          <p className="text-2xl font-black text-emerald-400">{queueStats.completed}</p>
                        </div>
                        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Active Workers</p>
                          <p className="text-2xl font-black text-amber-400">{queueStats.workers_active}</p>
                        </div>
                      </div>
                    </div>
                  ) : <p className="text-center text-slate-500 py-10">Aucune donnée de queue.</p>}
                </div>

                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Server className="w-5 h-5 text-blue-400" /> AI Cache Layer
                  </h3>
                   {loadingPerformance ? (
                    <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-slate-600" /></div>
                  ) : cacheStats ? (
                    <div className="space-y-4">
                      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-3xl rounded-full" />
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 relative z-10">Hit Rate Actuel</p>
                        <p className="text-5xl font-black text-blue-400 relative z-10">{Math.round(cacheStats.hit_rate * 100)}%</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                         <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Total Hits</p>
                          <p className="text-xl font-black text-white">{cacheStats.hits}</p>
                        </div>
                        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Cache Size</p>
                          <p className="text-xl font-black text-white">{cacheStats.size}</p>
                        </div>
                      </div>
                    </div>
                  ) : <p className="text-center text-slate-500 py-10">Aucune donnée de cache.</p>}
                </div>
              </div>

               <div className="bg-gradient-to-br from-indigo-900/20 to-violet-900/20 border border-indigo-500/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-2">Production Batch Control</h3>
                <p className="text-sm text-slate-400 mb-6">Optimisez le rendu parallèle via Phase 9 Control.</p>
                <button className="px-6 py-2 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-100 transition-all">BOOST MULTI-NODE</button>
              </div>
            </div>
          )}

          {/* PHASE 4: GEM EFFORT ANALYSIS VIEW */}
          {view === 'effort_analysis' && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-6 overflow-y-auto pb-20 px-4">
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setView('discovery')}
                  className="text-[10px] text-slate-500 uppercase font-bold hover:text-white transition-colors flex items-center gap-1"
                >
                  ← Retour au Labo
                </button>
                <div className="px-3 py-1 bg-emerald-600 rounded-full text-[10px] font-bold text-white uppercase tracking-widest">
                  Phase 4 : Quantification d'Effort (Gem Protocol)
                </div>
              </div>

              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <Brain className="w-6 h-6 text-emerald-400" /> Labo de Découverte d'Effort
                </h2>
                <p className="text-sm text-slate-400 mb-8">
                  Soumettez vos contributions (code, bug hunters, idées) pour une analyse par IA. Le protocole transformera votre effort intellectuel en Gemmes.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-black mb-2 block">Nature de la Contribution</label>
                    <div className="flex gap-2">
                      {['bug_report', 'bug_fix', 'feature_idea', 'documentation'].map(type => (
                        <button
                          key={type}
                          onClick={() => setContributionType(type)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            contributionType === type 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                        >
                          {type.replace('_', ' ').toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-black mb-2 block">Détails de l'Effort</label>
                    <textarea
                      value={effortText}
                      onChange={(e) => setEffortText(e.target.value)}
                      placeholder="Décrivez ce que vous avez accompli, le problème résolu ou votre idée innovante..."
                      className="w-full h-40 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm leading-relaxed resize-none focus:ring-2 focus:ring-emerald-600 outline-none transition-all"
                    />
                  </div>

                  <button
                    onClick={handleAnalyzeEffort}
                    disabled={analyzingEffort || !effortText.trim()}
                    className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold text-white transition-all shadow-xl ${
                      analyzingEffort 
                        ? 'bg-slate-800 cursor-not-allowed opacity-50' 
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 shadow-emerald-500/20'
                    }`}
                  >
                    {analyzingEffort ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" /> ANALYSER & RÉCOMPENSER L'EFFORT
                      </>
                    )}
                  </button>
                </div>

                {effortResult && (
                  <div className="mt-8 p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl animate-in zoom-in-95 duration-500">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-emerald-400">Rapport de Quantification</h3>
                      <div className="text-2xl font-black text-white">+{effortResult.gems_awarded} 💎</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Score d'Effort</p>
                        <p className="text-xl font-black text-white">{effortResult.analysis.effort}/10</p>
                      </div>
                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Impact Multiplier</p>
                        <p className="text-xl font-black text-white">x{effortResult.analysis.impact_multiplier}</p>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 italic text-center">
                      "L'agent <strong>{effortResult.analysis.agent}</strong> a validé votre contribution. Vos Gemmes sont prêtes pour le cycle de compute."
                    </p>
                  </div>
                )}
              </div>

               <div className="p-6 bg-violet-900/10 border border-violet-500/20 rounded-2xl">
                <h3 className="text-sm font-bold text-violet-300 mb-2">Pourquoi quantifier l'effort ?</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Le protocole Gem ne se contente pas de mesurer le temps passé. Il analyse la complexité via LLM 
                  pour garantir une redistribution équitable de la valeur produite.
                </p>
              </div>
            </div>
          )}

          {/* AGENT ECONOMY DASHBOARD */}
          {view === 'agent_economy' && (
            <AgentDashboard />
          )}
        </div>
      </div>
    </div>
  );
};
