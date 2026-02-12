import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useStore } from '@/store';
import { ollamaClient } from '@/services/llm/OllamaClient';
import { Button } from '@/components/ui/button';
import { Sparkles, Save, Edit3, Loader2, BookOpen } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import type { Character } from '@/types/character';
import './ProjectResumeSection.css';

export interface ProjectResumeSectionProps {
    className?: string;
}

export const ProjectResumeSection: React.FC<ProjectResumeSectionProps> = ({ className }) => {
    const project = useAppStore((state: unknown) => state.project);
    const shots = useAppStore((state: unknown) => state.shots);
    const ollamaStatus = useAppStore((state: unknown) => state.ollamaStatus);
    const characters = useStore((state: unknown) => state.characters);
    const { showSuccess, showError, showInfo } = useNotifications();

    const [resume, setResume] = useState<string>('');
    const [isEditing, setIsEditing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Sync with project data
    useEffect(() => {
        if (project?.global_resume) {
            setResume(project.global_resume);
        } else if (project?.metadata?.description) {
            setResume(project.metadata.description);
        }
    }, [project]);

    const handleSave = async () => {
        if (!project) return;
        setIsSaving(true);
        try {
            // In a real app, this would call ProjectService.updateGlobalResume
            // For now, we update the store and simulate persistence
            const updatedProject = {
                ...project,
                global_resume: resume,
                metadata: {
                    ...project.metadata,
                    description: resume // Keep them in sync
                }
            };

            useAppStore.getState().setProject(updatedProject);

            // If Electron, save to disk
            if (window.electronAPI && project.metadata?.path) {
                try {
                    const projectData = JSON.stringify(updatedProject, null, 2);
                    await window.electronAPI.fs.writeFile(`${project.metadata.path}/project.json`, projectData);
                } catch (err) {
                    console.error('Failed to save project.json:', err);
                }
            }

            showSuccess('Resume Saved', 'Project summary has been updated.');
            setIsEditing(false);
        } catch (error) {
            showError('Save Failed', 'Could not save the resume.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerate = async () => {
        if (ollamaStatus !== 'connected') {
            showError('Ollama Offline', 'Please connect Ollama to generate a resume.');
            return;
        }

        setIsGenerating(true);
        try {
            const models = await ollamaClient.listModels();
            const model = models.find(m => m.category === 'storytelling' || m.name.includes('llama'))?.name || models[0]?.name;

            if (!model) throw new Error('No suitable LLM model found');

            const context = {
                name: project?.metadata?.name || 'Untitled',
                genre: project?.metadata?.genre || 'Not specified',
                characters: characters?.map((c: unknown) => `${c.name} (${c.role?.archetype || c.archetype || 'Unnamed Archetype'})`).join(', ') || 'None',
                sequences: shots?.length || 0,
            };

            const prompt = `You are a creative director. Summarize the following project into a compelling, high-level "Creative Resume" (3-5 sentences).
      
      Project Name: ${context.name}
      Genre: ${context.genre}
      Characters: ${context.characters}
      Current Progress: ${context.sequences} scenes planned.
      
      Output only the resume text. Make it sound professional and inspiring.`;

            const result = await ollamaClient.generate(model, prompt);
            setResume(result.trim());
            setIsEditing(true); // Open for review
            showInfo('Resume Generated', 'AI has created a summary based on your project data.');
        } catch (error) {
            showError('Generation Failed', error instanceof Error ? error.message : 'AI could not generate the resume.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className={`project-resume-section ${className || ''}`}>
            <div className="section-header">
                <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <h3>Project Creative Resume</h3>
                </div>
                <div className="header-actions">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleGenerate}
                        disabled={isGenerating || ollamaStatus !== 'connected'}
                        className="gap-2"
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        Generate with AI
                    </Button>
                    {!isEditing ? (
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                            <Edit3 className="w-4 h-4" />
                        </Button>
                    ) : (
                        <Button variant="ghost" size="sm" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </Button>
                    )}
                </div>
            </div>

            <div className="resume-body">
                {isEditing ? (
                    <textarea
                        className="resume-textarea"
                        value={resume}
                        onChange={(e) => setResume(e.target.value)}
                        placeholder="Describe your story and project vision here..."
                    />
                ) : (
                    <p className="resume-text">
                        {resume || "No resume yet. Use the 'Generate with AI' button to create one from your project data."}
                    </p>
                )}
            </div>
        </div>
    );
};


