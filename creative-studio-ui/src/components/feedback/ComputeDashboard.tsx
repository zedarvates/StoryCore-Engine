import React, { useState, useEffect } from 'react';
import { Cpu, Zap, Activity, ShieldCheck } from 'lucide-react';

import { 
  gemRewardService, 
  TaskCategory, 
  WorkerNode, 
  GemEscrow 
} from '@/services/gemRewardService';
import { useAppStore } from '@/stores/useAppStore';

export const ComputeDashboard: React.FC = () => {
  const [tasks, setTasks] = useState<TaskCategory[]>([]);
  const [workers, setWorkers] = useState<WorkerNode[]>([]);
  const [escrows, setEscrows] = useState<GemEscrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const projectId = useAppStore(state => state.project?.id || 'unknown-project');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [w, t, e] = await Promise.all([
        gemRewardService.getWorkers(),
        gemRewardService.getTaskCategories(),
        gemRewardService.getEscrows()
      ]);
      setWorkers(w);
      setTasks(t);
      setEscrows(e);
    } catch (err) {
      console.error('Failed to fetch compute data:', err);
      setError('Impossible de se connecter au maillage de calcul. Vérifiez que le service GemReward est actif.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const handleSeed = async () => {
    await gemRewardService.seedTasks();
    fetchData();
  };

  const handleRegisterMe = async () => {
    // Basic simulation: register the current user as a worker
    await gemRewardService.registerWorker(
        projectId, 
        `Creator-Node-${projectId.substring(0, 4)}`,
        12, 
        ['video_draft', 'audio_sfx']
    );
    fetchData();
  };

  const glassStyle: React.CSSProperties = {
    background: 'rgba(15, 23, 42, 0.8)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(148, 163, 184, 0.1)',
    borderRadius: '16px',
    padding: '20px',
    color: '#f8fafc',
  };

  if (loading && workers.length === 0) return <div style={{ color: '#94a3b8', padding: 40, textAlign: 'center' }}>Initialisation du maillage de calcul...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      
      {error && (
        <div style={{ ...glassStyle, background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontSize: '0.8rem' }}>
            ⚠️ {error}
        </div>
      )}

      {/* TOOLBAR */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
         {tasks.length === 0 && (
            <button 
                onClick={handleSeed}
                style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid #fbbf24', color: '#fbbf24', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}
            >
                Initialiser les Catégories (Seed)
            </button>
         )}
         <button 
            onClick={handleRegisterMe}
            style={{ background: 'rgba(52, 211, 153, 0.1)', border: '1px solid #34d399', color: '#34d399', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}
         >
            Devenir un Node de Calcul
         </button>
         <button 
            onClick={fetchData}
            style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}
         >
            Actualiser
         </button>
      </div>

      {/* HEADER SUMMARY */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <div style={glassStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '8px' }}>
                <Activity size={16} color="#34d399" /> RÉSEAU ACTIF
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{workers.length} Nodes</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Prêt pour l'effort collectif</div>
        </div>
        <div style={glassStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '8px' }}>
                <Zap size={16} color="#fbbf24" /> ÉNERGIE BLOQUÉE
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24' }}>
                {escrows.reduce((acc, e) => acc + e.amount, 0)}💎
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Séquestres en cours de rendu</div>
        </div>
        <div style={glassStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '8px' }}>
                <ShieldCheck size={16} color="#818cf8" /> SÉCURITÉ
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>Vérifié</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Hardware compatible uniquement</div>
        </div>
      </div>

      {/* WORKERS LIST */}
      <div style={glassStyle}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cpu size={18} /> Maillage de Calcul (Workers)
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {workers.map(w => (
                <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: w.status === 'online' ? '#34d399' : '#f87171' }} />
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{w.name}</div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{w.vram_gb}GB VRAM · {w.capabilities.length} Capacité{w.capabilities.length > 1 ? 's' : ''}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {w.capabilities.map(c => (
                            <span key={c} style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.2)', borderRadius: '4px', color: '#818cf8' }}>{c}</span>
                        ))}
                    </div>
                </div>
            ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* TASK PRICING */}
        <div style={glassStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: '0.9rem', color: '#cbd5e1' }}>Valeur de l'Effort (Tasks)</h3>
            {tasks.map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.8rem' }}>{t.display_name}</div>
                    <div style={{ fontWeight: 700, color: '#fbbf24', fontSize: '0.85rem' }}>{t.base_cost}💎</div>
                </div>
            ))}
        </div>

        {/* ACTIVE ESCROWS */}
        <div style={glassStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: '0.9rem', color: '#cbd5e1' }}>Séquestres Actifs</h3>
            {escrows.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '0.8rem', textAlign: 'center', paddingTop: '10px' }}>Aucun calcul en attente</div>
            ) : (
                escrows.map(e => (
                    <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.1)', borderRadius: '8px' }}>
                        <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{e.reason}</div>
                            <div style={{ fontSize: '0.65rem', color: '#92400e' }}>Type: {e.task_type}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, color: '#fbbf24' }}>{e.amount}💎</div>
                            <div style={{ fontSize: '0.6rem', color: '#34d399' }}>{e.status}</div>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>

    </div>
  );
};

export default ComputeDashboard;
