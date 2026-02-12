/**
 * CharactersModal - Modale de gestion des personnages
 *
 * Permet de voir, créer, modifier et supprimer les personnages du projet
 */

import React, { useState, useEffect } from 'react';
import './SharedModalStyles.css';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  UserIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  SaveIcon,
  XIcon,
  SearchIcon,
  StarIcon,
  UsersIcon,
  TargetIcon,
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { notificationService } from '@/services/NotificationService';

interface Character {
  character_id: string;
  name: string;
  description: string;
  personality: string;
  goals: string;
  background: string;
  relationships: string;
  appearance: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  importance: 'high' | 'medium' | 'low';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface CharactersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CharactersModal({ isOpen, onClose }: CharactersModalProps) {
  const project = useAppStore((state) => state.project);

  // État local pour les personnages
  const [characters, setCharacters] = useState<Character[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<Character['role'] | 'all'>('all');
  const [selectedImportance, setSelectedImportance] = useState<Character['importance'] | 'all'>('all');
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);

  // Charger les personnages du projet
  useEffect(() => {
    if (project && isOpen) {
      loadCharacters();
    }
  }, [project, isOpen]);

  const loadCharacters = () => {
    if (!project) return;

    try {
      // Load characters from project object
      if (project.characters && project.characters.length > 0) {
        const charactersWithDates = (project.characters as any[]).map((char: unknown) => ({
          ...char,
          createdAt: char.createdAt instanceof Date ? char.createdAt : new Date(char.createdAt || Date.now()),
          updatedAt: char.updatedAt instanceof Date ? char.updatedAt : new Date(char.updatedAt || Date.now())
        }));
        setCharacters(charactersWithDates);
        console.log(`✅ [CharactersModal] Loaded ${charactersWithDates.length} characters from project`);
      } else {
        // No characters in project, set empty array
        setCharacters([]);
        console.log('ℹ️ [CharactersModal] No characters found in project');
      }
    } catch (error) {
      console.error('Failed to load characters:', error);
      notificationService.error('Erreur', 'Impossible de charger les personnages');
      setCharacters([]);
    }
  };

  const saveCharacters = (chars: Character[]) => {
    if (!project) return;

    try {
      // Update project in store with new characters
      const setProject = useAppStore.getState().setProject;
      const updatedProject = {
        ...project,
        characters: chars
      } as any;
      setProject(updatedProject);
      console.log(`✅ [CharactersModal] Saved ${chars.length} characters to project`);
    } catch (error) {
      console.error('Failed to save characters:', error);
      notificationService.error('Erreur', 'Impossible de sauvegarder les personnages');
    }
  };

  const filteredCharacters = characters.filter(char => {
    const matchesSearch = searchQuery === '' ||
      char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      char.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      char.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = selectedRole === 'all' || char.role === selectedRole;
    const matchesImportance = selectedImportance === 'all' || char.importance === selectedImportance;

    return matchesSearch && matchesRole && matchesImportance;
  });

  const handleCreateCharacter = () => {
    const newCharacter: Character = {
      character_id: `char_${Date.now()}`,
      name: '',
      description: '',
      personality: '',
      goals: '',
      background: '',
      relationships: '',
      appearance: '',
      role: 'minor',
      importance: 'low',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setEditingCharacter(newCharacter);
    // showCreateForm is no longer needed as separate state
  };

  const handleEditCharacter = (character: Character) => {
    setEditingCharacter({ ...character });
  };

  const handleSaveCharacter = (character: Character) => {
    if (!character.name.trim()) {
      notificationService.warning('Erreur', 'Le nom du personnage est requis');
      return;
    }

    const updatedCharacters = editingCharacter?.character_id
      ? characters.map(c => c.character_id === character.character_id ? { ...character, updatedAt: new Date() } : c)
      : [...characters, character];

    setCharacters(updatedCharacters);
    saveCharacters(updatedCharacters);
    setEditingCharacter(null);

    notificationService.success(
      'Personnage sauvegardé',
      `Le personnage "${character.name}" a été ${editingCharacter ? 'modifié' : 'créé'} avec succès.`
    );
  };

  const handleDeleteCharacter = (characterId: string) => {
    const character = characters.find(c => c.character_id === characterId);
    if (!character) return;

    if (confirm(`Êtes-vous sûr de vouloir supprimer le personnage "${character.name}" ?`)) {
      const updatedCharacters = characters.filter(c => c.character_id !== characterId);
      setCharacters(updatedCharacters);
      saveCharacters(updatedCharacters);

      notificationService.info('Personnage supprimé', `Le personnage "${character.name}" a été supprimé.`);
    }
  };

  const getRoleIcon = (role: Character['role']) => {
    switch (role) {
      case 'protagonist':
        return <StarIcon className="w-4 h-4 text-yellow-500" />;
      case 'antagonist':
        return <TargetIcon className="w-4 h-4 text-red-500" />;
      case 'supporting':
        return <UsersIcon className="w-4 h-4 text-blue-500" />;
      case 'minor':
        return <UserIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleLabel = (role: Character['role']) => {
    switch (role) {
      case 'protagonist':
        return 'Protagoniste';
      case 'antagonist':
        return 'Antagoniste';
      case 'supporting':
        return 'Secondaire';
      case 'minor':
        return 'Figurant';
    }
  };

  const getImportanceColor = (importance: Character['importance']) => {
    switch (importance) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!project) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="shared-modal-dialog max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Personnages du projet</DialogTitle>
          </DialogHeader>
          <div className="p-8 text-center no-project-state">
            <UserIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="title">Aucun projet ouvert</p>
            <p className="text-sm subtitle">Ouvrez un projet pour gérer ses personnages</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="shared-modal-dialog max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <UserIcon className="w-5 h-5" />
              Personnages - {project.project_name}
            </DialogTitle>
          </DialogHeader>

          {/* Toolbar */}
          <div className="flex-shrink-0 p-4 toolbar border-b border-gray-200">
            <div className="flex items-center justify-between gap-4">
              {/* Search and filters */}
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                  <Input
                    placeholder="Rechercher des personnages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    aria-label="Rechercher des personnages"
                  />
                </div>

                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as Character['role'] | 'all')}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  aria-label="Filtrer par rôle"
                  title="Filtrer les personnages par rôle"
                >
                  <option value="all">Tous les rôles</option>
                  <option value="protagonist">Protagonistes</option>
                  <option value="antagonist">Antagonistes</option>
                  <option value="supporting">Secondaires</option>
                  <option value="minor">Figurants</option>
                </select>

                <select
                  value={selectedImportance}
                  onChange={(e) => setSelectedImportance(e.target.value as Character['importance'] | 'all')}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  aria-label="Filtrer par importance"
                  title="Filtrer les personnages par niveau d'importance"
                >
                  <option value="all">Toute importance</option>
                  <option value="high">Haute</option>
                  <option value="medium">Moyenne</option>
                  <option value="low">Faible</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button onClick={handleCreateCharacter} className="flex items-center gap-2" aria-label="Créer un nouveau personnage">
                  <PlusIcon className="w-4 h-4" />
                  Nouveau personnage
                </Button>
              </div>
            </div>
          </div>

          {/* Characters List - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4">
            <CharacterGrid
              characters={filteredCharacters}
              onEdit={handleEditCharacter}
              onDelete={handleDeleteCharacter}
              searchQuery={searchQuery}
              selectedRole={selectedRole}
              selectedImportance={selectedImportance}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit/Create Modal */}
      {editingCharacter && (
        <CharacterEditModal
          character={editingCharacter}
          isCreate={!characters.some(c => c.character_id === editingCharacter.character_id)}
          onSave={handleSaveCharacter}
          onCancel={() => setEditingCharacter(null)}
        />
      )}
    </>
  );
}

/**
 * CharacterGrid - Optimized grid component with React.memo
 * Prevents unnecessary re-renders when parent state changes
 */
const CharacterGrid = React.memo(function CharacterGrid({
  characters,
  onEdit,
  onDelete,
  searchQuery,
  selectedRole,
  selectedImportance
}: {
  characters: Character[];
  onEdit: (character: Character) => void;
  onDelete: (characterId: string) => void;
  searchQuery: string;
  selectedRole: Character['role'] | 'all';
  selectedImportance: Character['importance'] | 'all';
}) {
  if (characters.length === 0) {
    return (
      <div className="col-span-full text-center py-12 empty-state">
        <UserIcon className="w-12 h-12 mx-auto mb-4 empty-state-icon" />
        <h3 className="text-lg font-medium empty-state-title mb-2">
          Aucun personnage trouvé
        </h3>
        <p className="empty-state-text mb-4">
          {searchQuery || selectedRole !== 'all' || selectedImportance !== 'all'
            ? 'Essayez de modifier vos critères de recherche.'
            : 'Créez votre premier personnage pour commencer.'}
        </p>
        {searchQuery === '' && selectedRole === 'all' && selectedImportance === 'all' && (
          <Button onClick={() => {/* This would need to be passed from parent */}} className="flex items-center gap-2">
            <PlusIcon className="w-4 h-4" />
            Créer un personnage
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {characters.map(character => (
        <CharacterCard
          key={character.character_id}
          character={character}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
});

/**
 * CharacterCard - Memoized individual character card
 */
const CharacterCard = React.memo(function CharacterCard({
  character,
  onEdit,
  onDelete
}: {
  character: Character;
  onEdit: (character: Character) => void;
  onDelete: (characterId: string) => void;
}) {
  const getRoleIcon = (role: Character['role']) => {
    switch (role) {
      case 'protagonist':
        return <StarIcon className="w-4 h-4 text-yellow-500" />;
      case 'antagonist':
        return <TargetIcon className="w-4 h-4 text-red-500" />;
      case 'supporting':
        return <UsersIcon className="w-4 h-4 text-blue-500" />;
      case 'minor':
        return <UserIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleLabel = (role: Character['role']) => {
    switch (role) {
      case 'protagonist': return 'Protagoniste';
      case 'antagonist': return 'Antagoniste';
      case 'supporting': return 'Secondaire';
      case 'minor': return 'Figurant';
    }
  };

  const getImportanceColor = (importance: Character['importance']) => {
    switch (importance) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div
      className="element-card bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
      data-testid={`character-card-${character.character_id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {getRoleIcon(character.role)}
          <h3 className="text-lg font-semibold element-title">
            {character.name}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <Badge className={getImportanceColor(character.importance)}>
            {character.importance === 'high' ? 'Élevé' :
             character.importance === 'medium' ? 'Moyen' : 'Faible'}
          </Badge>
        </div>
      </div>

      {/* Role */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm meta-label">Rôle:</span>
        <Badge variant="outline">
          {getRoleLabel(character.role)}
        </Badge>
      </div>

      {/* Description */}
      <p className="text-sm element-description mb-3 line-clamp-3">
        {character.description}
      </p>

      {/* Tags */}
      {character.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {character.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {character.tags.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{character.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="text-xs element-meta">
          Modifié {character.updatedAt.toLocaleDateString('fr-FR')}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(character)}
            className="text-blue-600 hover:text-blue-800"
            aria-label={`Modifier ${character.name}`}
            title={`Modifier ${character.name}`}
          >
            <EditIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(character.character_id)}
            className="text-red-600 hover:text-red-800"
            aria-label={`Supprimer ${character.name}`}
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
});

/**
 * CharacterEditModal - Modale d'édition de personnage
 */
interface CharacterEditModalProps {
  character: Character;
  isCreate: boolean;
  onSave: (character: Character) => void;
  onCancel: () => void;
}

function CharacterEditModal({ character, isCreate, onSave, onCancel }: CharacterEditModalProps) {
  const [editedCharacter, setEditedCharacter] = useState<Character>(character);
  const [newTag, setNewTag] = useState('');

  const handleSave = () => {
    onSave(editedCharacter);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !editedCharacter.tags.includes(newTag.trim())) {
      setEditedCharacter(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditedCharacter(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {isCreate ? 'Créer un personnage' : 'Modifier le personnage'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom *
                </label>
                <Input
                  value={editedCharacter.name}
                  onChange={(e) => setEditedCharacter(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nom du personnage"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rôle
                </label>
                <select
                  value={editedCharacter.role}
                  onChange={(e) => setEditedCharacter(prev => ({ ...prev, role: e.target.value as Character['role'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  aria-label="Sélectionner le rôle du personnage"
                  title="Rôle du personnage dans l'histoire"
                >
                  <option value="protagonist">Protagoniste</option>
                  <option value="antagonist">Antagoniste</option>
                  <option value="supporting">Secondaire</option>
                  <option value="minor">Figurant</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Textarea
                value={editedCharacter.description}
                onChange={(e) => setEditedCharacter(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Courte description du personnage"
                rows={3}
              />
            </div>

            {/* Detailed Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Personnalité
                </label>
                <Textarea
                  value={editedCharacter.personality}
                  onChange={(e) => setEditedCharacter(prev => ({ ...prev, personality: e.target.value }))}
                  placeholder="Traits de personnalité"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Objectifs
                </label>
                <Textarea
                  value={editedCharacter.goals}
                  onChange={(e) => setEditedCharacter(prev => ({ ...prev, goals: e.target.value }))}
                  placeholder="Objectifs et motivations"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Arrière-plan
                </label>
                <Textarea
                  value={editedCharacter.background}
                  onChange={(e) => setEditedCharacter(prev => ({ ...prev, background: e.target.value }))}
                  placeholder="Histoire personnelle"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relations
                </label>
                <Textarea
                  value={editedCharacter.relationships}
                  onChange={(e) => setEditedCharacter(prev => ({ ...prev, relationships: e.target.value }))}
                  placeholder="Relations avec autres personnages"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Apparence
                </label>
                <Textarea
                  value={editedCharacter.appearance}
                  onChange={(e) => setEditedCharacter(prev => ({ ...prev, appearance: e.target.value }))}
                  placeholder="Description physique"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Importance
                </label>
                <select
                  value={editedCharacter.importance}
                  onChange={(e) => setEditedCharacter(prev => ({ ...prev, importance: e.target.value as Character['importance'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  aria-label="Sélectionner l'importance du personnage"
                  title="Niveau d'importance du personnage dans l'histoire"
                >
                  <option value="high">Élevée</option>
                  <option value="medium">Moyenne</option>
                  <option value="low">Faible</option>
                </select>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Ajouter un tag"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  aria-label="Nouveau tag"
                />
                <Button 
                  onClick={handleAddTag} 
                  variant="outline"
                  aria-label="Ajouter le tag"
                >
                  <PlusIcon className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {editedCharacter.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 text-gray-500 hover:text-gray-700"
                      aria-label={`Retirer le tag ${tag}`}
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button onClick={handleSave} className="flex items-center gap-2">
            <SaveIcon className="w-4 h-4" />
            Sauvegarder
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

