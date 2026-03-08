import React, { useEffect, useState } from 'react';
import { 
  Bot, 
  Activity, 
  Settings2, 
  ShieldCheck, 
  Coins, 
  TrendingUp,
  BrainCircuit,
  TerminalSquare
} from 'lucide-react';
import { gemRewardService, AgentNode } from '@/services/gemRewardService';

export const AgentDashboard: React.FC = () => {
  const [agents, setAgents] = useState<AgentNode[]>([]);
  const [totalAgents, setTotalAgents] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgents();
    // Poll every 10 seconds for real-time vibe
    const interval = setInterval(loadAgents, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadAgents = async () => {
    try {
      const { agents, total_registered } = await gemRewardService.getAgents();
      setAgents(agents);
      setTotalAgents(total_registered);
    } catch (e) {
      console.error('Failed to load agents:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-6 overflow-y-auto pb-20 px-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="px-3 py-1 bg-violet-600 rounded-full text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
          <Bot className="w-3 h-3" />
          Pillar 4: Agent Economy Dashboard
        </div>
      </div>

      {/* Main Banner */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <BrainCircuit className="w-64 h-64 text-white" />
        </div>
        
        <div className="relative z-10">
          <h2 className="text-3xl font-black text-white tracking-tight mb-2 flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-violet-400" /> 
            Autonomous Intelligence Registry
          </h2>
          <p className="text-slate-400 max-w-2xl mb-8 leading-relaxed">
            Monitor the fleet of autonomous agents deployed across the StoryCore mesh. 
            Agents earn Gems through Proof-of-Intelligence, establishing algorithmic reputation points via their contribution history.
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-black/40 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl hover:border-violet-500/50 transition-all">
              <div className="flex items-center gap-3 text-slate-400 mb-2">
                <TerminalSquare className="w-4 h-4" />
                <span className="text-xs uppercase font-bold tracking-wider">Registered Nodes</span>
              </div>
              <div className="text-3xl font-black text-white">{loading ? '-' : totalAgents}</div>
            </div>
            
            <div className="bg-black/40 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl hover:border-emerald-500/50 transition-all">
              <div className="flex items-center gap-3 text-slate-400 mb-2">
                <Coins className="w-4 h-4" />
                <span className="text-xs uppercase font-bold tracking-wider">Total Value Secured</span>
              </div>
              <div className="text-3xl font-black text-white truncate">
                {loading ? '-' : agents.reduce((acc, a) => acc + a.total_gems_earned, 0).toLocaleString()} 💎
              </div>
            </div>

            <div className="bg-black/40 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl hover:border-amber-500/50 transition-all">
              <div className="flex items-center gap-3 text-slate-400 mb-2">
                <Activity className="w-4 h-4" />
                <span className="text-xs uppercase font-bold tracking-wider">Total Contributions</span>
              </div>
              <div className="text-3xl font-black text-white">
                {loading ? '-' : agents.reduce((acc, a) => acc + a.total_contributions, 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Agents Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-md">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-violet-400" /> Active Agents Leaderboard
          </h3>
          <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-white transition-colors flex items-center gap-2">
            <Settings2 className="w-4 h-4" /> API Integration
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/20 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <th className="p-4 pl-6">Agent ID</th>
                <th className="p-4">Platform / Model</th>
                <th className="p-4">Avg Quality</th>
                <th className="p-4">Reputation Factor</th>
                <th className="p-4 text-right pr-6">Vault Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-sm">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Scanning mesh network...</td></tr>
              ) : agents.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">No agents registered currently.</td></tr>
              ) : (
                agents.map(agent => (
                  <tr key={agent.agent_id} className="hover:bg-violet-900/10 transition-colors group">
                    <td className="p-4 pl-6 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center border border-violet-500/30 text-violet-400">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-200 group-hover:text-white transition-colors">{agent.agent_name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{agent.agent_id}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 w-fit">{agent.platform}</span>
                        <span className="text-[11px] text-slate-500">{agent.model}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${Math.min(100, agent.avg_quality_score * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 font-mono">{(agent.avg_quality_score * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold gap-1">
                        x{agent.reputation_factor.toFixed(2)}
                      </div>
                    </td>
                    <td className="p-4 text-right pr-6">
                      <p className="font-black text-white text-lg">{agent.total_gems_earned} 💎</p>
                      <p className="text-[10px] text-slate-500 uppercase font-bold">{agent.total_contributions} tasks</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
};
