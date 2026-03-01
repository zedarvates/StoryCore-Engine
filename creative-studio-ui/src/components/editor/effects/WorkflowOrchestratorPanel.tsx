import React, { useState, useEffect } from 'react';
import { 
    Workflow, 
    Play, 
    CheckCircle2, 
    Clock, 
    AlertCircle, 
    RefreshCcw,
    Layers,
    Save
} from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = '/api/ai/workflow';

interface WorkflowStep {
    id: string;
    type: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    started_at?: string;
    error?: string;
    output_data?: Record<string, unknown>;
}

interface WorkflowTemplate {
    id: string;
    name: string;
    description: string;
    steps: string[];
}

interface WorkflowInstance {
    id: string;
    name: string;
    status: string;
    progress: number;
    current_step_index: number;
    steps: WorkflowStep[];
}

const WorkflowOrchestratorPanel: React.FC = () => {
    const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
    const [runningWorkflow, setRunningWorkflow] = useState<WorkflowInstance | null>(null);
    const [isPolling, setIsPolling] = useState(false);

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/templates/available`);
                setTemplates(response.data);
                if (response.data.length > 0) setSelectedTemplate(response.data[0]);
            } catch (error) {
                console.error("Failed to fetch workflow templates", error);
            }
        };
        fetchTemplates();
    }, []);

    const runWorkflow = async () => {
        if (!selectedTemplate) return;
        
        try {
            const response = await axios.post(`${API_BASE_URL}/run`, {
                name: `Production Pipeline: ${selectedTemplate.name}`,
                project_id: "current_project",
                steps: selectedTemplate.steps,
                initial_context: {
                    prompt: "A cinematic cinematic landscape",
                    color_preset: "cinematic"
                }
            });
            
            setRunningWorkflow({ 
                id: response.data.workflow_id, 
                status: 'pending', 
                progress: 0,
                current_step_index: 0,
                steps: [],
                name: `Production Pipeline: ${selectedTemplate.name}`
            });
            setIsPolling(true);
        } catch (error) {
            console.error("Failed to run workflow", error);
            alert("Workflow failed to start.");
        }
    };

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPolling && runningWorkflow?.id) {
            interval = setInterval(async () => {
                try {
                    const response = await axios.get(`${API_BASE_URL}/${runningWorkflow.id}`);
                    setRunningWorkflow(response.data);
                    if (response.data.status === 'completed' || response.data.status === 'failed') {
                        setIsPolling(false);
                    }
                } catch (error) {
                    console.error("Polling error", error);
                    setIsPolling(false);
                }
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [isPolling, runningWorkflow?.id]);

    return (
        <div className="flex flex-col h-full bg-gray-900 text-white p-4 overflow-y-auto">
            <div className="flex items-center gap-2 mb-6 border-b border-gray-800 pb-4">
                <Workflow className="text-green-500" size={20} />
                <h2 className="text-lg font-bold">AI Workflow Orchestrator</h2>
            </div>

            {!runningWorkflow ? (
                <div className="space-y-6">
                    <div className="space-y-3">
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Select Production Template</label>
                        <div className="grid grid-cols-1 gap-3">
                            {templates.map((template) => (
                                <div 
                                    key={template.id}
                                    onClick={() => setSelectedTemplate(template)}
                                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                                        selectedTemplate?.id === template.id 
                                        ? 'bg-green-500/10 border-green-500' 
                                        : 'bg-black/40 border-gray-800 hover:border-gray-600'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-sm font-bold">{template.name}</h3>
                                        {selectedTemplate?.id === template.id && <CheckCircle2 size={16} className="text-green-500" />}
                                    </div>
                                    <p className="text-[11px] text-gray-500 mb-4">{template.description}</p>
                                    
                                    <div className="flex flex-wrap gap-1">
                                        {template.steps.map((step: string, idx: number) => (
                                            <span key={idx} className="bg-gray-800 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-tighter text-gray-400 border border-gray-700">
                                                {step.replace('_', ' ')}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={runWorkflow}
                        className="w-full py-4 bg-green-600 hover:bg-green-500 rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-green-900/20 transition-all active:scale-95"
                    >
                        <Play size={18} fill="currentColor" />
                        Run Pipeline
                    </button>
                    
                    <div className="border border-dashed border-gray-800 rounded-xl p-4 flex gap-4 items-center bg-black/20">
                        <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-gray-500">
                            <Save size={18} />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-gray-300">Custom Template</h4>
                            <p className="text-[10px] text-gray-400">Save current sequence as a reusable template.</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-sm font-bold">{runningWorkflow.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                    runningWorkflow.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                                    runningWorkflow.status === 'failed' ? 'bg-red-500/20 text-red-500' :
                                    'bg-blue-500/20 text-blue-500 animate-pulse'
                                }`}>
                                    {runningWorkflow.status}
                                </span>
                                <span className="text-[10px] text-gray-500">{runningWorkflow.id.slice(0, 8)}</span>
                            </div>
                        </div>
                        <button 
                            onClick={() => setRunningWorkflow(null)}
                            className="p-2 hover:bg-gray-800 rounded-full text-gray-400"
                        >
                            <RefreshCcw size={16} />
                        </button>
                    </div>

                    <div className="bg-black/40 rounded-xl border border-gray-800 overflow-hidden">
                        <div className="h-1 bg-gray-800 w-full">
                            <div 
                                className="h-full bg-green-500 transition-all duration-500" 
                                style={{ width: `${runningWorkflow.progress}%` }} 
                            />
                        </div>
                        
                        <div className="p-4 space-y-4">
                            {runningWorkflow.steps.map((step, idx) => (
                                <div key={step.id} className="flex gap-4 items-start relative pb-4 last:pb-0">
                                    {idx < runningWorkflow.steps.length - 1 && (
                                        <div className="absolute left-2.5 top-6 bottom-0 w-0.5 bg-gray-800" />
                                    )}
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center z-10 shrink-0 ${
                                        step.status === 'completed' ? 'bg-green-500' :
                                        step.status === 'running' ? 'bg-blue-500 animate-pulse' :
                                        step.status === 'failed' ? 'bg-red-500' :
                                        'bg-gray-800'
                                    }`}>
                                        {step.status === 'completed' ? <CheckCircle2 size={12} className="text-white" /> : 
                                         step.status === 'failed' ? <AlertCircle size={12} className="text-white" /> :
                                         <Clock size={10} className="text-gray-400" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`text-xs font-medium uppercase tracking-tighter ${
                                                step.status === 'running' ? 'text-blue-400' : 
                                                step.status === 'completed' ? 'text-gray-300' : 'text-gray-500'
                                            }`}>
                                                {step.type.replace('_', ' ')}
                                            </span>
                                            {step.started_at && <span className="text-[9px] text-gray-600 font-mono">
                                                {new Date(step.started_at).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' })}
                                            </span>}
                                        </div>
                                        {step.error && <p className="text-[10px] text-red-500 mt-1 italic">{step.error}</p>}
                                        {step.output_data && idx === runningWorkflow.current_step_index && (
                                            <div className="mt-2 p-2 bg-gray-900 rounded border border-gray-800">
                                                <div className="text-[9px] text-gray-500 uppercase flex items-center gap-1 mb-1">
                                                    <Layers size={9} /> Last Output
                                                </div>
                                                <pre className="text-[9px] text-green-400 overflow-x-auto">
                                                    {JSON.stringify(step.output_data, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {runningWorkflow.status === 'completed' && (
                        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3">
                            <div className="w-12 h-12 bg-black rounded shrink-0 flex items-center justify-center text-green-500">
                                <Play size={24} fill="currentColor" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-green-500">Production Ready!</h4>
                                <p className="text-[10px] text-green-400/70">The final video has been exported to /output/exports.</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default WorkflowOrchestratorPanel;
