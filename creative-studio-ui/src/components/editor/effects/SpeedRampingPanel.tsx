import React, { useState, useEffect, useCallback } from 'react';
import { FastForward, Activity } from 'lucide-react';
import aiProAPI, { SpeedRampPoint } from '../../../services/aiProAPI';

const SpeedRampingPanel: React.FC<{ videoPath: string }> = ({ videoPath }) => {
    const defaultPoints: SpeedRampPoint[] = [
        { time: 0, speed: 1.0, curve: 'linear' },
        { time: 0.5, speed: 1.0, curve: 'linear' },
        { time: 1.0, speed: 1.0, curve: 'linear' }
    ];

    const [points, setPoints] = useState<SpeedRampPoint[]>(defaultPoints);
    const [isApplying, setIsApplying] = useState(false);
    const [curveData, setCurveData] = useState<number[]>([]);

    const fetchCurveData = useCallback(async () => {
        try {
            const result = await aiProAPI.getSpeedCurve(points);
            setCurveData(result.curve || []);
        } catch (error) {
            console.error("Failed to fetch speed ramp data", error);
        }
    }, [points]);

    useEffect(() => {
        fetchCurveData();
    }, [fetchCurveData]);

    const handleApply = async () => {
        setIsApplying(true);
        try {
            await aiProAPI.applySpeedRamp({
                input_path: videoPath,
                output_path: "output_speed_ramped.mp4",
                control_points: points
            });
            alert("Speed ramp applied successfully!");
        } catch (error) {
            console.error("Speed ramping failed", error);
            alert("Failed to apply speed ramp.");
        } finally {
            setIsApplying(false);
        }
    };

    const updatePoint = (index: number, updates: Partial<SpeedRampPoint>) => {
        const newPoints = [...points];
        newPoints[index] = { ...newPoints[index], ...updates };
        setPoints(newPoints);
    };

    return (
        <div className="flex flex-col h-full bg-gray-900 text-white p-4 overflow-y-auto">
            <div className="flex items-center gap-2 mb-6 border-b border-gray-800 pb-4">
                <FastForward className="text-yellow-500" size={20} />
                <h2 className="text-lg font-bold">AI Speed Ramping</h2>
            </div>

            <div className="mb-8 p-4 bg-black/40 border border-gray-800 rounded-2xl relative overflow-hidden group">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Speed Curve Visualization</h3>
                    <div className="flex items-center gap-2 px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-[9px] text-yellow-500 font-bold uppercase tracking-widest">
                        <Activity size={10} /> Dynamic Flow
                    </div>
                </div>
                
                <div className="h-32 w-full flex items-end gap-1 px-1 relative">
                    <div className="absolute inset-x-0 top-1/2 border-t border-gray-800 border-dashed" />
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 text-[9px] text-gray-600 font-mono -ml-2">1x</div>
                    
                    {curveData.length > 0 ? (
                        curveData.map((v, i) => (
                            <div 
                                key={i}
                                className="flex-1 bg-yellow-500/40 rounded-t-sm transition-all duration-300 group-hover:bg-yellow-500/60"
                                style={{ height: `${Math.min(100, Math.max(10, v * 50))}%` }}
                            />
                        ))
                    ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-30 text-[10px] italic">
                            Analyzing speed flow...
                        </div>
                    )}
                </div>
                
                <div className="flex justify-between mt-2 text-[9px] text-gray-600 font-mono">
                    <span>START</span>
                    <span>TIMELINE (0:00 - 1:00)</span>
                    <span>END</span>
                </div>
            </div>

            <div className="space-y-4 mb-8">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Control Points</h3>
                {points.map((point, idx) => (
                    <div key={idx} className="bg-gray-800/40 border border-gray-800 rounded-xl p-4 transition-all hover:bg-gray-800/60">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-bold text-gray-500 bg-black/40 border border-gray-800 px-2 py-0.5 rounded-full uppercase tracking-tighter">Point #{idx + 1}</span>
                            <div className="flex gap-2">
                                {(['linear', 'ease_in', 'ease_out', 'ease_in_out', 'exponential'] as const).map(c => (
                                    <button 
                                        key={c}
                                        onClick={() => updatePoint(idx, { curve: c })}
                                        className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded border transition-all ${
                                            point.curve === c ? 'bg-yellow-500 border-yellow-500 text-black' : 'bg-gray-900 border-gray-700 text-gray-500 hover:text-gray-300'
                                        }`}
                                    >
                                        {c.split('_').pop()}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] text-gray-400 uppercase font-bold">Time (0-1)</label>
                                    <span className="text-[10px] font-mono text-yellow-500">{point.time.toFixed(2)}</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="1" 
                                    step="0.01" 
                                    value={point.time}
                                    onChange={(e) => updatePoint(idx, { time: parseFloat(e.target.value) })}
                                    className="w-full h-1 bg-black rounded-lg appearance-none cursor-pointer accent-yellow-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] text-gray-400 uppercase font-bold">Speed (x)</label>
                                    <span className="text-[10px] font-mono text-yellow-500">{point.speed.toFixed(2)}x</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0.1" 
                                    max="4" 
                                    step="0.1" 
                                    value={point.speed}
                                    onChange={(e) => updatePoint(idx, { speed: parseFloat(e.target.value) })}
                                    className="w-full h-1 bg-black rounded-lg appearance-none cursor-pointer accent-yellow-500"
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <button 
                onClick={handleApply}
                disabled={isApplying}
                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all ${
                    isApplying ? 'bg-gray-700 cursor-not-allowed text-gray-400' : 'bg-yellow-500 hover:bg-yellow-400 text-black active:scale-[0.98]'
                }`}
            >
                <div className="flex items-center gap-2">
                    {isApplying ? <Activity className="animate-pulse" size={18} /> : <FastForward size={18} fill="currentColor" />}
                    {isApplying ? 'GENERATING SPEED RAMP...' : 'APPLY AI SPEED RAMP'}
                </div>
            </button>
            <div className="mt-4 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl text-[10px] text-yellow-400/80 leading-relaxed italic">
                Pro Tip: Combine 'Ease' curves with high speeds (3x - 4x) followed by slow motion (0.5x) for the "Matrix" effect.
            </div>
        </div>
    );
};

export default SpeedRampingPanel;
