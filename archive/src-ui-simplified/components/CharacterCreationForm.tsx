import React, { useState } from 'react';
import './CharacterCreationForm.css';

export type CharacterGender = 'male' | 'female' | 'non_binary' | 'other';

export interface CharacterFormData {
  name: string;
  role: string;
  genre: string;
  gender: CharacterGender;
  genderCustom: string;
  ageRange: string;
  description: string;
  personalityTraits: string[];
  backstory: string;
}

interface CharacterCreationFormProps {
  onSubmit: (data: CharacterFormData) => void;
  onCancel: () => void;
}

const CharacterCreationForm: React.FC<CharacterCreationFormProps> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<CharacterFormData>({
    name: '',
    role: 'protagonist',
    genre: 'fantasy',
    gender: 'male',
    genderCustom: '',
    ageRange: 'adult',
    description: '',
    personalityTraits: [],
    backstory: ''
  });

  const [traitInput, setTraitInput] = useState('');

  const handleChange = (field: keyof CharacterFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenderChange = (gender: CharacterGender) => {
    setFormData(prev => ({ 
      ...prev, 
      gender,
      genderCustom: gender !== 'other' ? '' : prev.genderCustom 
    }));
  };

  const handleAddTrait = () => {
    if (traitInput.trim() && formData.personalityTraits.length < 5) {
      setFormData(prev => ({
        ...prev,
        personalityTraits: [...prev.personalityTraits, traitInput.trim()]
      }));
      setTraitInput('');
    }
  };

  const handleRemoveTrait = (index: number) => {
    setFormData(prev => ({
      ...prev,
      personalityTraits: prev.personalityTraits.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="character-creation-form">
      <h2 className="form-title">🎭 Création de personnage</h2>
      <p className="form-description">
        Créez un personnage détaillé pour votre histoire
      </p>

      <form onSubmit={handleSubmit}>
        {/* Nom du personnage */}
        <div className="form-group">
          <label htmlFor="name">Nom du personnage</label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Entrez le nom du personnage"
            required
          />
        </div>

        {/* Genre du personnage - PRINCIPAUX CHAMPS DEMANDÉS */}
        <div className="form-group gender-group">
          <label className="gender-label">
            Genre du personnage <span className="required">*</span>
          </label>
          <p className="gender-hint">Sélectionnez le genre pour les prompts IA</p>
          
          <div className="gender-options">
            <label className={`gender-option ${formData.gender === 'male' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="gender"
                value="male"
                checked={formData.gender === 'male'}
                onChange={() => handleGenderChange('male')}
              />
              <span className="gender-radio"></span>
              <span className="gender-text">👨 Masculin</span>
            </label>

            <label className={`gender-option ${formData.gender === 'female' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="gender"
                value="female"
                checked={formData.gender === 'female'}
                onChange={() => handleGenderChange('female')}
              />
              <span className="gender-radio"></span>
              <span className="gender-text">👩 Féminin</span>
            </label>

            <label className={`gender-option ${formData.gender === 'non_binary' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="gender"
                value="non_binary"
                checked={formData.gender === 'non_binary'}
                onChange={() => handleGenderChange('non_binary')}
              />
              <span className="gender-radio"></span>
              <span className="gender-text">🧑 Non genré</span>
            </label>

            <label className={`gender-option ${formData.gender === 'other' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="gender"
                value="other"
                checked={formData.gender === 'other'}
                onChange={() => handleGenderChange('other')}
              />
              <span className="gender-radio"></span>
              <span className="gender-text">🌌 Autre</span>
            </label>
          </div>

          {/* Champ pour "Autre" - pour les extraterrestres etc. */}
          {formData.gender === 'other' && (
            <div className="gender-custom-field">
              <label htmlFor="genderCustom">
                Précisez le genre (ex: extraterrestre, robot, être mystique...)
              </label>
              <input
                type="text"
                id="genderCustom"
                value={formData.genderCustom}
                onChange={(e) => handleChange('genderCustom', e.target.value)}
                placeholder="Ex: Zorgalien, androïde, être énergétique..."
                required
              />
            </div>
          )}
        </div>

        {/* Rôle du personnage */}
        <div className="form-group">
          <label htmlFor="role">Rôle dans l'histoire</label>
          <select
            id="role"
            value={formData.role}
            onChange={(e) => handleChange('role', e.target.value)}
          >
            <option value="protagonist">Protagoniste (Personnage principal)</option>
            <option value="antagonist">Antagoniste (Villain/opposant)</option>
            <option value="supporting">Personnage secondaire important</option>
            <option value="minor">Personnage mineur</option>
          </select>
        </div>

        {/* Genre narratif */}
        <div className="form-group">
          <label htmlFor="genre">Genre narratif</label>
          <select
            id="genre"
            value={formData.genre}
            onChange={(e) => handleChange('genre', e.target.value)}
          >
            <option value="fantasy">Fantaisie</option>
            <option value="sci-fi">Science-fiction</option>
            <option value="modern">Moderne</option>
            <option value="horror">Horreur</option>
            <option value="romance">Romance</option>
            <option value="thriller">Thriller</option>
            <option value="historical">Historique</option>
          </select>
        </div>

        {/* Tranche d'âge */}
        <div className="form-group">
          <label htmlFor="ageRange">Tranche d'âge</label>
          <select
            id="ageRange"
            value={formData.ageRange}
            onChange={(e) => handleChange('ageRange', e.target.value)}
          >
            <option value="child">Enfant (5-12 ans)</option>
            <option value="teen">Adolescent (13-19 ans)</option>
            <option value="young_adult">Jeune adulte (20-35 ans)</option>
            <option value="adult">Adulte (36-55 ans)</option>
            <option value="elderly">Senior (55+ ans)</option>
          </select>
        </div>

        {/* Description physique */}
        <div className="form-group">
          <label htmlFor="description">Description physique</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Décrivez l'apparence du personnage (cheveux, yeux, taille, vêtements...)"
            rows={3}
          />
        </div>

        {/* Traits de personnalité */}
        <div className="form-group">
          <label>Traits de personnalité (5 maximum)</label>
          <div className="traits-input">
            <input
              type="text"
              value={traitInput}
              onChange={(e) => setTraitInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTrait())}
              placeholder="Tapez un trait et appuyez sur Entrée"
              disabled={formData.personalityTraits.length >= 5}
            />
            <button 
              type="button" 
              onClick={handleAddTrait}
              disabled={formData.personalityTraits.length >= 5 || !traitInput.trim()}
            >
              Ajouter
            </button>
          </div>
          <div className="traits-list">
            {formData.personalityTraits.map((trait, index) => (
              <span key={index} className="trait-tag">
                {trait}
                <button 
                  type="button" 
                  onClick={() => handleRemoveTrait(index)}
                  className="trait-remove"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Histoire du personnage */}
        <div className="form-group">
          <label htmlFor="backstory">Histoire/Contexte</label>
          <textarea
            id="backstory"
            value={formData.backstory}
            onChange={(e) => handleChange('backstory', e.target.value)}
            placeholder="Racontez l'histoire de ce personnage, son passé, ses motivations..."
            rows={4}
          />
        </div>

        {/* Boutons d'action */}
        <div className="form-actions">
          <button type="button" className="btn-cancel" onClick={onCancel}>
            Annuler
          </button>
          <button type="submit" className="btn-submit">
            Créer le personnage
          </button>
        </div>
      </form>
    </div>
  );
};

export default CharacterCreationForm;
