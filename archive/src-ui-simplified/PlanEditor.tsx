import React, { useState, useEffect } from 'react';
import { Save, Edit3, Eye, Trash2, Plus } from 'lucide-react';

interface VideoPlanEntry {
  shot_id: string;
  shot_number: number;
  source_image: string;
  camera_movement: string;
  duration: number;
  style_anchor: any;
  transition: string;
  description: string;
  title: string;
}

interface VideoPlan {
  video_plan_id: string;
  project_id: string;
  storyboard_id: string;
  created_at: string;
  total_shots: number;
  total_duration: number;
  video_entries: VideoPlanEntry[];
  metadata: {
    global_style_applied: boolean;
    camera_movements: Record<string, number>;
    transitions: Record<string, number>;
  };
}

interface PlanEditorProps {
  projectId: string;
  onSave?: (plan: VideoPlan) => void;
}

const PlanEditor: React.FC<PlanEditorProps> = ({ projectId, onSave }) => {
  const [videoPlan, setVideoPlan] = useState<VideoPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<Partial<VideoPlanEntry>>({});

  useEffect(() => {
    loadVideoPlan();
  }, [projectId]);

  const loadVideoPlan = async () => {
    try {
      const response = await fetch(`http://localhost:8080/projects/${projectId}/video-plan`);
      if (response.ok) {
        const plan = await response.json();
        setVideoPlan(plan);
      } else {
        // Create a new plan if none exists
        await createNewPlan();
      }
    } catch (error) {
      console.error('Failed to load video plan:', error);
      await createNewPlan();
    } finally {
      setLoading(false);
    }
  };

  const createNewPlan = async () => {
    const newPlan: VideoPlan = {
      video_plan_id: `vp_${projectId}_${Date.now()}`,
      project_id: projectId,
      storyboard_id: '',
      created_at: new Date().toISOString(),
      total_shots: 0,
      total_duration: 0,
      video_entries: [],
      metadata: {
        global_style_applied: false,
        camera_movements: {},
        transitions: {}
      }
    };
    setVideoPlan(newPlan);
  };

  const saveVideoPlan = async () => {
    if (!videoPlan) return;

    try {
      // Recalculate totals
      const updatedPlan = {
        ...videoPlan,
        total_shots: videoPlan.video_entries.length,
        total_duration: videoPlan.video_entries.reduce((sum, entry) => sum + entry.duration, 0),
        metadata: {
          ...videoPlan.metadata,
          camera_movements: videoPlan.video_entries.reduce((acc, entry) => {
            acc[entry.camera_movement] = (acc[entry.camera_movement] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          transitions: videoPlan.video_entries.reduce((acc, entry) => {
            acc[entry.transition] = (acc[entry.transition] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        }
      };

      const response = await fetch(`http://localhost:8080/projects/${projectId}/video-plan`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedPlan)
      });

      if (response.ok) {
        setVideoPlan(updatedPlan);
        onSave?.(updatedPlan);
        alert('Plan sauvegardé avec succès!');
      } else {
        alert('Erreur lors de la sauvegarde du plan');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const startEditing = (entryId: string, entry: VideoPlanEntry) => {
    setEditingEntry(entryId);
    setEditedData({ ...entry });
  };

  const saveEntry = () => {
    if (!videoPlan || !editingEntry) return;

    const updatedEntries = videoPlan.video_entries.map(entry =>
      entry.shot_id === editingEntry ? { ...entry, ...editedData } : entry
    );

    setVideoPlan({ ...videoPlan, video_entries: updatedEntries });
    setEditingEntry(null);
    setEditedData({});
  };

  const cancelEditing = () => {
    setEditingEntry(null);
    setEditedData({});
  };

  const deleteEntry = (entryId: string) => {
    if (!videoPlan) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette entrée?')) return;

    const updatedEntries = videoPlan.video_entries.filter(entry => entry.shot_id !== entryId);
    setVideoPlan({ ...videoPlan, video_entries: updatedEntries });
  };

  const addNewEntry = () => {
    if (!videoPlan) return;

    const newEntry: VideoPlanEntry = {
      shot_id: `shot_${String(videoPlan.video_entries.length + 1).padStart(2, '0')}`,
      shot_number: videoPlan.video_entries.length + 1,
      source_image: '',
      camera_movement: 'static',
      duration: 3.0,
      style_anchor: {},
      transition: 'cut',
      description: 'Nouvelle scène',
      title: `Scène ${videoPlan.video_entries.length + 1}`
    };

    setVideoPlan({
      ...videoPlan,
      video_entries: [...videoPlan.video_entries, newEntry]
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Chargement du plan...</div>;
  }

  if (!videoPlan) {
    return <div className="text-red-500 p-8">Erreur de chargement du plan</div>;
  }

  return (
    <div className="plan-editor bg-gray-900 text-white p-6 rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Éditeur de Plan Scène</h2>
          <p className="text-gray-400">Projet: {projectId}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={addNewEntry}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ajouter Scène
          </button>
          <button
            onClick={saveVideoPlan}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            Sauvegarder
          </button>
        </div>
      </div>

      {/* Plan Summary */}
      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-semibold mb-3">Résumé du Plan</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Total Scènes:</span>
            <span className="ml-2 font-bold text-blue-400">{videoPlan.total_shots}</span>
          </div>
          <div>
            <span className="text-gray-400">Durée Totale:</span>
            <span className="ml-2 font-bold text-green-400">{videoPlan.total_duration}s</span>
          </div>
          <div>
            <span className="text-gray-400">Mouvements Caméra:</span>
            <span className="ml-2 font-bold text-purple-400">{Object.keys(videoPlan.metadata.camera_movements).length}</span>
          </div>
          <div>
            <span className="text-gray-400">Transitions:</span>
            <span className="ml-2 font-bold text-orange-400">{Object.keys(videoPlan.metadata.transitions).length}</span>
          </div>
        </div>
      </div>

      {/* Scene Entries */}
      <div className="space-y-4">
        {videoPlan.video_entries.map((entry) => (
          <div key={entry.shot_id} className="bg-gray-800 p-4 rounded-lg">
            {editingEntry === entry.shot_id ? (
              // Edit Mode
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold">Modifier Scène {entry.shot_number}</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={saveEntry}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
                    >
                      Sauvegarder
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm"
                    >
                      Annuler
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="scene-title" className="block text-sm text-gray-400 mb-1">Titre</label>
                    <input
                      id="scene-title"
                      type="text"
                      value={editedData.title || ''}
                      onChange={(e) => setEditedData({ ...editedData, title: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="camera-movement" className="block text-sm text-gray-400 mb-1" title="Mouvement Caméra">Mouvement Caméra</label>
                    <select
                      id="camera-movement"
                      value={editedData.camera_movement || ''}
                      onChange={(e) => setEditedData({ ...editedData, camera_movement: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    >
                      <option value="static">Statique</option>
                      <option value="pan">Panoramique</option>
                      <option value="zoom">Zoom</option>
                      <option value="dolly">Dolly</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="duration" className="block text-sm text-gray-400 mb-1">Durée (secondes)</label>
                    <input
                      id="duration"
                      type="number"
                      step="0.1"
                      value={editedData.duration || 0}
                      onChange={(e) => setEditedData({ ...editedData, duration: Number.parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="transition" className="block text-sm text-gray-400 mb-1" title="Transition">Transition</label>
                    <select
                      id="transition"
                      value={editedData.transition || ''}
                      onChange={(e) => setEditedData({ ...editedData, transition: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    >
                      <option value="cut">Cut</option>
                      <option value="fade">Fade</option>
                      <option value="dissolve">Dissolve</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm text-gray-400 mb-1">Description</label>
                  <textarea
                    id="description"
                    value={editedData.description || ''}
                    onChange={(e) => setEditedData({ ...editedData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </div>
              </div>
            ) : (
              // View Mode
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h4 className="text-lg font-semibold">{entry.title}</h4>
                    <span className="text-sm text-gray-400">#{entry.shot_number}</span>
                    <span className="px-2 py-1 bg-blue-600 rounded text-xs">{entry.camera_movement}</span>
                    <span className="px-2 py-1 bg-green-600 rounded text-xs">{entry.duration}s</span>
                  </div>
                  <p className="text-gray-300 text-sm">{entry.description}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEditing(entry.shot_id, entry)}
                    className="p-2 text-blue-400 hover:bg-gray-700 rounded"
                    title="Modifier"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteEntry(entry.shot_id)}
                    className="p-2 text-red-400 hover:bg-gray-700 rounded"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {videoPlan.video_entries.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucune scène dans le plan. Cliquez sur "Ajouter Scène" pour commencer.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanEditor;

