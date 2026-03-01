import React, { useState } from 'react';
import { 
    Palette, 
    FastForward, 
    Scissors, 
    Workflow, 
    Settings2 
} from 'lucide-react';
import { ColorCorrectionPanel } from '../../color-correction/ColorCorrectionPanel';
import SpeedRampingPanel from './SpeedRampingPanel';
import SceneDetectionPanel from './SceneDetectionPanel';
import WorkflowOrchestratorPanel from './WorkflowOrchestratorPanel';

const ProductionToolsHub: React.FC<{ videoPath: string }> = ({ videoPath }) => {
    const [activeTab, setActiveTab] = useState<'color' | 'speed' | 'scene' | 'workflow'>('color');

    const tabs = [
        { id: 'color', label: 'Color Grade', icon: <Palette size={18} />, color: 'text-blue-500' },
        { id: 'speed', label: 'Speed Ramp', icon: <FastForward size={18} />, color: 'text-yellow-500' },
        { id: 'scene', label: 'Scene Detect', icon: <Scissors size={18} />, color: 'text-purple-500' },
        { id: 'workflow', label: 'AI Workflow', icon: <Workflow size={18} />, color: 'text-green-500' },
    ];

    return (
        <div className="flex flex-col h-full bg-black/95 border-l border-gray-800 w-[400px]">
            {/* Header Tabs */}
            <div className="flex border-b border-gray-800 bg-gray-900/50">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        className={`flex-1 py-4 flex flex-col items-center gap-1 transition-all relative ${
                            activeTab === tab.id ? 'bg-gray-800/80 text-white' : 'text-gray-500 hover:text-gray-300'
                        }`}
                    >
                        <span className={activeTab === tab.id ? tab.color : ''}>{tab.icon}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
                        {activeTab === tab.id && (
                            <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-current ${tab.color.replace('text-', 'bg-')}`} />
                        )}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'color' && (
                    <div className="h-full overflow-y-auto">
                        <ColorCorrectionPanel />
                    </div>
                )}
                {activeTab === 'speed' && (
                    <SpeedRampingPanel videoPath={videoPath} />
                )}
                {activeTab === 'scene' && (
                    <SceneDetectionPanel videoPath={videoPath} />
                )}
                {activeTab === 'workflow' && (
                    <WorkflowOrchestratorPanel />
                )}
            </div>

            {/* Footer / Status */}
            <div className="p-3 bg-gray-900 border-t border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[10px] text-gray-400 font-mono uppercase">AI Engine Connected</span>
                </div>
                <button className="p-1 px-2 hover:bg-gray-800 rounded text-gray-500">
                    <Settings2 size={14} />
                </button>
            </div>
        </div>
    );
};

export default ProductionToolsHub;
