import React, { useState, useEffect } from 'react';
import { useWorldBuilderSelectors, useWorldBuilderActions } from '../../../../stores/worldBuilderStore';
import { StepValidator } from '../StepValidator';

export const FoundationsStep: React.FC = () => {
  const { worldData, currentStep } = useWorldBuilderSelectors();
  const { updateStep, markStepComplete } = useWorldBuilderActions();

  const [formData, setFormData] = useState(worldData?.foundations || {
    name: '',
    genre: '',
    tone: '',
    setting: '',
    scale: 'medium' as const,
  });

  useEffect(() => {
    if (worldData?.foundations) {
      setFormData(worldData.foundations);
    }
  }, [worldData?.foundations]);

  const handleChange = (field: string, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    updateStep('foundations', newData);
  };

  const handleSubmit = () => {
    if (formData.name && formData.genre && formData.setting) {
      markStepComplete('foundations');
    }
  };

  return (
    <div className="step-container foundations-step">
      <h2>World Foundations</h2>
      <p>Define the basic elements of your world.</p>

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <div className="form-group">
          <label htmlFor="world-name">World Name</label>
          <input
            id="world-name"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Enter world name"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="genre">Genre</label>
          <select
            id="genre"
            value={formData.genre}
            onChange={(e) => handleChange('genre', e.target.value)}
            required
          >
            <option value="">Select genre</option>
            <option value="fantasy">Fantasy</option>
            <option value="sci-fi">Science Fiction</option>
            <option value="historical">Historical</option>
            <option value="modern">Modern</option>
            <option value="post-apocalyptic">Post-Apocalyptic</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="tone">Tone</label>
          <select
            id="tone"
            value={formData.tone}
            onChange={(e) => handleChange('tone', e.target.value)}
          >
            <option value="">Select tone</option>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="neutral">Neutral</option>
            <option value="humorous">Humorous</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="setting">Setting</label>
          <textarea
            id="setting"
            value={formData.setting}
            onChange={(e) => handleChange('setting', e.target.value)}
            placeholder="Describe the world's setting"
            rows={3}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="scale">World Scale</label>
          <select
            id="scale"
            value={formData.scale}
            onChange={(e) => handleChange('scale', e.target.value)}
          >
            <option value="small">Small (village/town)</option>
            <option value="medium">Medium (region/country)</option>
            <option value="large">Large (continent/world)</option>
          </select>
        </div>

        <button type="submit" className="btn-primary">
          Save Foundations
        </button>
      </form>

      <StepValidator step="foundations" />
    </div>
  );
};