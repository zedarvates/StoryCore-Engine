import React, { useState } from 'react';
import { Scissors, Search, FileJson, Play } from 'lucide-react';
import aiProAPI from '../../../services/aiProAPI';

interface Scene {
  start_time: number;
  end_time: number;
}

const SceneDetectionPanel: React.FC<{ videoPath: string }> = ({ videoPath }) => {
    const [method, setMethod] = useState<'threshold' | 'content' | 'adaptive'>('content');
    const [threshold, setThreshold] = useState(30);
    const [isDetecting, setIsDetecting] = useState(false);
    const [scenes, setScenes] = useState<Scene[]>([]);

    const handleDetect = async () => {
        setIsDetecting(true);
        try {
            const result = await aiProAPI.detectScenes({
                input_path: videoPath,
                method,
                threshold
            });
            setScenes(result.scenes || []);
        } catch (error) {
            console.error("Scene detection failed", error);
            alert("Failed to detect scenes.");
        } finally {
            setIsDetecting(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-900 text-white p-4 overflow-y-auto">
            <div className="flex items-center gap-2 mb-6 border-b border-gray-800 pb-4">
                <Scissors className="text-purple-500" size={20} />
                <h2 className="text-lg font-bold">AI Scene Detection</h2>
            </div>

            <div className="space-y-6 mb-8">
                <div className="space-y-2">
                    <label className="text-xs text-gray-400">Detection Method</label>
                    <select 
                        value={method}
                        onChange={(e) => setMethod(e.target.value as 'threshold' | 'content' | 'adaptive')}
                        className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm focus:border-purple-500 outline-none"
                    >
                        <option value="threshold">Threshold (Fast)</option>
                        <option value="content">Content-Aware (Balanced)</option>
                        <option value="adaptive">Adaptive (Precision)</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-xs text-gray-400">Sensitivity Threshold</label>
                        <span className="text-xs text-purple-400">{threshold}</span>
                    </div>
                    <input 
                        type="range" 
                        min="1" 
                        max="100" 
                        value={threshold}
                        onChange={(e) => setThreshold(parseInt(e.target.value))}
                        className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                </div>

                <button 
                    onClick={handleDetect}
                    disabled={isDetecting}
                    className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                        isDetecting ? 'bg-gray-700 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 text-white'
                    }`}
                >
                    {isDetecting ? 'Analyzing Video...' : 'Detect Scenes'}
                </button>
            </div>

            <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Detected Scenes ({scenes.length})</h3>
                    {scenes.length > 0 && (
                        <button className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1">
                            <FileJson size={10} /> Export JSON
                        </button>
                    )}
                </div>

                {scenes.length === 0 ? (
                    <div className="border border-dashed border-gray-800 rounded-xl p-8 flex flex-col items-center justify-center opacity-40">
                        <Search size={32} className="mb-2" />
                        <p className="text-xs">No scenes detected yet.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {scenes.map((scene, idx) => (
                            <div key={idx} className="bg-gray-800/30 border border-gray-800 rounded-lg p-3 group hover:border-purple-500/50 transition-all cursor-pointer">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-6 bg-black rounded flex items-center justify-center text-[10px] font-mono text-gray-500">
                                            #{idx + 1}
                                        </div>
                                        <div>
                                            <div className="text-xs font-medium">Scene {idx + 1}</div>
                                            <div className="text-[10px] text-gray-500">{scene.start_time.toFixed(2)}s - {scene.end_time.toFixed(2)}s</div>
                                        </div>
                                    </div>
                                    <button className="p-1.5 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white">
                                        <Play size={12} fill="currentColor" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="mt-6 p-3 bg-purple-500/5 rounded-lg border border-purple-500/10 text-[10px] text-purple-400/80 italic leading-relaxed">
                Tip: Use Content-Aware for cinematic cuts and Threshold for static camera transitions.
            </div>
        </div>
    );
};

export default SceneDetectionPanel;
