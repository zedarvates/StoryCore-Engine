import React, { useState } from 'react';
import { Settings, Save, X, Trash2, AlertCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import { updateMetadata, updateSettings } from '../../store/slices/projectSlice';
import './dialogs.css';

interface SettingsDialogProps {
  onClose: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ onClose }) => {
  const dispatch = useAppDispatch();
  const project = useAppSelector(state => state.project);
  
  const [name, setName] = useState(project.metadata?.name || '');
  const [description, setDescription] = useState(project.metadata?.description || '');
  const [resolution, setResolution] = useState(project.settings?.resolution || { width: 1920, height: 1080 });
  const [fps, setFps] = useState(project.settings?.fps || 24);

  const handleSave = () => {
    dispatch(updateMetadata({ name, description }));
    dispatch(updateSettings({ resolution, fps }));
    onClose();
  };

  return (
    <div className="sequence-dialog-overlay" onClick={onClose}>
      <div className="sequence-dialog-content settings-dialog" onClick={e => e.stopPropagation()}>
        <header className="dialog-header">
          <div className="header-title">
            <Settings className="w-5 h-5 text-primary mr-2" />
            <h3>Project Settings</h3>
          </div>
          <button className="close-btn" onClick={onClose} title="Close Settings"><X className="w-4 h-4" /></button>
        </header>

        <div className="dialog-body">
          <div className="settings-form">
            <div className="form-group">
              <label>Project Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)}
                placeholder="My Epic Sequence"
              />
            </div>

            <div className="form-group">
              <label>Description (Optional)</label>
              <textarea 
                value={description} 
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe your cinematic vision..."
                rows={3}
              />
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label>Resolution</label>
                <select 
                  value={`${resolution.width}x${resolution.height}`}
                  title="Project Resolution"
                  onChange={e => {
                    const [w, h] = e.target.value.split('x').map(Number);
                    setResolution({ width: w, height: h });
                  }}
                >
                  <option value="1920x1080">FHD (1920 x 1080)</option>
                  <option value="2560x1440">QHD (2560 x 1440)</option>
                  <option value="3840x2160">4K (3840 x 2160)</option>
                  <option value="1080x1920">Vertical (1080 x 1920)</option>
                </select>
              </div>

              <div className="form-group">
                <label>FPS</label>
                <select value={fps} title="Frame Rate" onChange={e => setFps(Number(e.target.value))}>
                  <option value={24}>24 fps (Cinematic)</option>
                  <option value={30}>30 fps (Broadcast)</option>
                  <option value={60}>60 fps (High Motion)</option>
                </select>
              </div>
            </div>

            <div className="danger-zone mt-8">
              <h4 className="flex items-center text-red-400 font-bold mb-2">
                <AlertCircle className="w-4 h-4 mr-2" />
                Danger Zone
              </h4>
              <button className="btn-danger w-full flex items-center justify-center py-2 rounded">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Project permanently
              </button>
            </div>
          </div>
        </div>

        <footer className="dialog-footer">
          <button className="btn-secondary" onClick={onClose}>Discard</button>
          <button className="btn-primary flex items-center" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </button>
        </footer>
      </div>
    </div>
  );
};
