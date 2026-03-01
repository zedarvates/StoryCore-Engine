import React, { useEffect, useRef, useState } from 'react';
import { rlmService, LoreGraph, LoreNode } from '../../services/RecursiveLLMService';
import './LoreGraphVisualizer.css';

interface InternalNode extends LoreNode {
    x: number;
    y: number;
    vx: number;
    vy: number;
}

interface InternalEdge {
    source: string;
    relation: string;
    target: string;
    sourceNode?: InternalNode;
    targetNode?: InternalNode;
}

interface LoreGraphVisualizerProps {
    refreshKey?: number;
}

const LoreGraphVisualizer: React.FC<LoreGraphVisualizerProps> = ({ refreshKey }) => {
    const [graphData, setGraphData] = useState<LoreGraph | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedNode, setSelectedNode] = useState<LoreNode | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const fetchGraph = async () => {
            try {
                setLoading(true);
                const data = await rlmService.getLoreGraph();
                setGraphData(data);
                setError(null);
            } catch (err) {
                console.error('Error fetching lore graph:', err);
                setError('Could not load knowledge graph.');
            } finally {
                setLoading(false);
            }
        };

        fetchGraph();
    }, [refreshKey]);

    useEffect(() => {
        if (!graphData || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Simple Force-Directed Layout Simulation
        const nodes: InternalNode[] = graphData.nodes.map((n) => ({
            ...n,
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: 0,
            vy: 0
        }));

        const nodeMap = new Map(nodes.map(n => [n.name, n]));

        const edges: InternalEdge[] = graphData.edges.map(e => ({
            ...e,
            sourceNode: nodeMap.get(e.source),
            targetNode: nodeMap.get(e.target)
        })).filter(e => e.sourceNode && e.targetNode);

        const nodeRefs = { current: nodes };

        let animationFrame: number;
        
        const update = () => {
            // Forces
            for (const n of nodeRefs.current) {
                // Center force
                n.vx += (canvas.width / 2 - n.x) * 0.01;
                n.vy += (canvas.height / 2 - n.y) * 0.01;

                // Repulsion
                for (const other of nodeRefs.current) {
                    if (n === other) continue;
                    const dx = n.x - other.x;
                    const dy = n.y - other.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    if (dist < 200) {
                        const force = (200 - dist) / 200;
                        n.vx += (dx / dist) * force * 5;
                        n.vy += (dy / dist) * force * 5;
                    }
                }
            }

            // Attraction (edges)
            for (const e of edges) {
                const s = e.sourceNode!;
                const t = e.targetNode!;
                const dx = t.x - s.x;
                const dy = t.y - s.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const force = (dist - 100) * 0.01;
                s.vx += (dx / dist) * force;
                s.vy += (dy / dist) * force;
                t.vx -= (dx / dist) * force;
                t.vy -= (dy / dist) * force;
            }

            // Apply velocity
            for (const n of nodeRefs.current) {
                n.x += n.vx;
                n.y += n.vy;
                n.vx *= 0.9;
                n.vy *= 0.9;

                // Bounds
                n.x = Math.max(50, Math.min(canvas.width - 50, n.x));
                n.y = Math.max(50, Math.min(canvas.height - 50, n.y));
            }

            // Draw
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw edges
            ctx.lineWidth = 1.5;
            for (const e of edges) {
                const s = e.sourceNode!;
                const t = e.targetNode!;
                
                const gradient = ctx.createLinearGradient(s.x, s.y, t.x, t.y);
                gradient.addColorStop(0, 'rgba(0, 243, 255, 0.2)');
                gradient.addColorStop(1, 'rgba(188, 19, 254, 0.2)');
                
                ctx.strokeStyle = gradient;
                ctx.beginPath();
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(t.x, t.y);
                ctx.stroke();

                // Relation Label
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.font = '10px "Outfit", sans-serif';
                ctx.fillText(e.relation, (s.x + t.x) / 2, (s.y + t.y) / 2);
            }


            // Draw nodes
            for (const n of nodeRefs.current) {
                const isSelected = selectedNode?.name === n.name;
                
                // Outer Glow
                ctx.shadowBlur = isSelected ? 20 : 10;
                ctx.shadowColor = n.type === 'character' ? '#00f3ff' : '#bc13fe';
                
                ctx.fillStyle = n.type === 'character' ? '#00f3ff' : '#bc13fe';
                ctx.beginPath();
                ctx.arc(n.x, n.y, isSelected ? 8 : 5, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#ffffff';
                ctx.font = isSelected ? 'bold 12px "Outfit", sans-serif' : '10px "Outfit", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(n.name, n.x, n.y + 20);
            }

            animationFrame = requestAnimationFrame(update);
        };

        update();

        // Node picking logic
        const handleClick = (ev: MouseEvent) => {
           const rect = canvas.getBoundingClientRect();
           const mx = ev.clientX - rect.left;
           const my = ev.clientY - rect.top;
           
           for (const n of nodeRefs.current) {
               const dist = Math.sqrt((n.x - mx)**2 + (n.y - my)**2);
               if (dist < 20) {
                   setSelectedNode(n);
                   return;
               }
           }
        };

        canvas.addEventListener('click', handleClick);

        return () => {
            cancelAnimationFrame(animationFrame);
            canvas.removeEventListener('click', handleClick);
        };
    }, [graphData, selectedNode]);

    const handleCanvasClick = (_e: React.MouseEvent<HTMLCanvasElement>) => {
        // Selection is now handled by the native click listener to access node coordinates
    };


    if (loading) return <div className="lore-graph-loading">Analyzing Lore Connections...</div>;
    if (error) return <div className="lore-graph-error">{error}</div>;

    return (
        <div className="lore-graph-container">
            <div className="lore-graph-header">
                <h3>Knowledge Graph Explorer</h3>
                <div className="lore-graph-stats">
                    <span>{graphData?.stats.nodes} Entities</span>
                    <span>{graphData?.stats.edges} Relations</span>
                </div>
            </div>
            
            <div className="lore-graph-canvas-wrapper">
                <canvas 
                    ref={canvasRef} 
                    width={800} 
                    height={500}
                    onClick={handleCanvasClick}
                />
            </div>

            <div className="lore-graph-legend">
                <div className="legend-item"><span className="dot char"></span> Character</div>
                <div className="legend-item"><span className="dot location"></span> Location</div>
                <div className="legend-item"><span className="dot event"></span> Event</div>
            </div>

            {selectedNode && (
                <div className="node-details-overlay glass-morphism">
                    <h4>{selectedNode.name}</h4>
                    <p className="node-type">{selectedNode.type}</p>
                    <div className="node-attrs">
                        {Object.entries(selectedNode.attributes).map(([k, v]) => (
                            <div key={k} className="attr-row">
                                <span className="attr-key">{k}:</span>
                                <span className="attr-val">{String(v)}</span>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => setSelectedNode(null)}>Close</button>
                </div>
            )}
        </div>
    );
};

export default LoreGraphVisualizer;
