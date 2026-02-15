/**
 * LocationsModal - Location management modal
 *
 * Allows viewing, creating, editing, and deleting project locations.
 * Unfied with the global location system and file-based storage.
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FileTextIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  SaveIcon,
  XIcon,
  SearchIcon,
  MapPinIcon,
  HomeIcon,
  BuildingIcon,
  TreePineIcon,
  MountainIcon,
  WavesIcon,
  CastleIcon,
  StoreIcon,
  ChurchIcon,
  RefreshCwIcon,
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useLocationStore } from '@/stores/locationStore';
import { notificationService } from '@/services/NotificationService';
import { Location, LocationType } from '@/types/location';
import { saveLocationToProject, deleteLocationFromProject } from '@/utils/locationStorage';

interface LocationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LocationsModal({ isOpen, onClose }: LocationsModalProps) {
  const project = useAppStore((state) => state.project);
  const {
    locations: storeLocations,
    fetchLocations,
    fetchProjectLocations,
    addLocation,
    updateLocation,
    deleteLocation,
    isLoading
  } = useLocationStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedImportance, setSelectedImportance] = useState<string>('all');
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Load locations from the project and central API when the modal opens
  useEffect(() => {
    if (project && isOpen) {
      loadAllLocations();
    }
  }, [project, isOpen, fetchLocations, fetchProjectLocations]);

  const loadAllLocations = async () => {
    if (!project) return;

    try {
      // Fetch central locations from API
      await fetchLocations();

      // Fetch project-local locations from locations folder
      const projectId = project?.path ? project.path.split(/[/\\]/).pop() || project.id : project.id;
      await fetchProjectLocations(projectId);
    } catch (error) {
      console.error('Failed to load locations:', error);
      notificationService.error('Error', 'Failed to load locations');
    }
  };

  const filteredLocations = storeLocations.filter(location => {
    const matchesSearch = searchQuery === '' ||
      location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.metadata.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.metadata.genre_tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = selectedType === 'all' || location.location_type === selectedType;
    const matchesImportance = selectedImportance === 'all' || location.metadata.importance === selectedImportance;

    return matchesSearch && matchesType && matchesImportance;
  });

  const handleCreateLocation = () => {
    const newLocation: Location = {
      location_id: `loc_${Date.now()}`,
      name: '',
      creation_method: 'manual',
      creation_timestamp: new Date().toISOString(),
      version: '1.0',
      location_type: 'exterior',
      texture_direction: 'outward',
      metadata: {
        description: '',
        atmosphere: '',
        genre_tags: [],
        importance: 'medium',
        accessibility: 'public',
      },
      cube_textures: {},
      placed_assets: [],
      is_world_derived: false,
    };

    setEditingLocation(newLocation);
    setShowEditModal(true);
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocation({ ...location });
    setShowEditModal(true);
  };

  const handleSaveLocation = async (location: Location) => {
    if (!location.name.trim()) {
      notificationService.warning('Error', 'Location name is required');
      return;
    }

    try {
      if (project) {
        const projectId = project?.path ? project.path.split(/[/\\]/).pop() || project.id : project.id;

        // Save to file system if possible
        await saveLocationToProject(projectId, location.location_id, location);

        // Update store
        const exists = storeLocations.some(l => l.location_id === location.location_id);
        if (exists) {
          await updateLocation(location.location_id, location);
        } else {
          await addLocation(location);
        }

        notificationService.success(
          'Location saved',
          `Location "${location.name}" has been ${exists ? 'updated' : 'created'} successfully.`
        );
      }
    } catch (error) {
      console.error('Failed to save location:', error);
      notificationService.error('Error', 'Failed to save location');
    }

    setEditingLocation(null);
    setShowEditModal(false);
  };

  const handleDeleteLocation = async (locationId: string) => {
    const location = storeLocations.find(l => l.location_id === locationId);
    if (!location) return;

    if (confirm(`Are you sure you want to delete "${location.name}"?`)) {
      try {
        if (project) {
          const projectId = project?.path ? project.path.split(/[/\\]/).pop() || project.id : project.id;
          await deleteLocationFromProject(projectId, locationId);
        }
        await deleteLocation(locationId);
        notificationService.info('Location deleted', `Location "${location.name}" has been removed.`);
      } catch (error) {
        console.error('Failed to delete location:', error);
        notificationService.error('Error', 'Failed to delete location');
      }
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'interior': return <HomeIcon className="w-4 h-4" />;
      case 'exterior': return <TreePineIcon className="w-4 h-4" />;
      default: return <MapPinIcon className="w-4 h-4" />;
    }
  };

  const getImportanceColor = (imp?: string) => {
    switch (imp) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 overflow-hidden bg-white">
          <DialogHeader className="p-6 border-b bg-black text-white shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <MapPinIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-white">Location Management</DialogTitle>
                  <p className="text-sm text-gray-400">View and manage story locations</p>
                </div>
              </div>
              <Button
                onClick={handleCreateLocation}
                className="bg-white text-black hover:bg-gray-200"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                New Location
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 mb-6 sticky top-0 z-10 bg-gray-50/95 py-2 backdrop-blur-sm">
              <div className="relative flex-1 max-w-sm">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[180px] h-10">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="interior">Interior</SelectItem>
                  <SelectItem value="exterior">Exterior</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedImportance} onValueChange={setSelectedImportance}>
                <SelectTrigger className="w-[180px] h-10">
                  <SelectValue placeholder="All importance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All importance</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="ghost" className="h-10 ml-auto" onClick={loadAllLocations}>
                <RefreshCwIcon className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Reload
              </Button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLocations.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400">
                  <MapPinIcon className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-lg">No locations found</p>
                  <p className="text-sm">Try changing your filters or create a new location.</p>
                </div>
              ) : (
                filteredLocations.map((location) => (
                  <div
                    key={location.location_id}
                    className="group bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col h-full"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          {getTypeIcon(location.location_type)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {location.name}
                          </h3>
                          <Badge variant="outline" className={`text-[10px] mt-1 ${getImportanceColor(location.metadata.importance)}`}>
                            {location.metadata.importance?.toUpperCase() || 'MEDIUM'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 line-clamp-3 mb-4 flex-1">
                      {location.metadata.description}
                    </p>

                    <div className="space-y-2 mb-4">
                      {location.metadata.address && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <MapPinIcon className="w-3 h-3" />
                          <span className="truncate">{location.metadata.address}</span>
                        </div>
                      )}

                      {location.metadata.genre_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {location.metadata.genre_tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditLocation(location)}
                        className="h-8 px-2 text-gray-600 hover:text-blue-600"
                      >
                        <EditIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteLocation(location.location_id)}
                        className="h-8 px-2 text-gray-600 hover:text-red-600"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      {editingLocation && (
        <LocationEditModal
          location={editingLocation}
          onSave={handleSaveLocation}
          onCancel={() => {
            setEditingLocation(null);
            setShowEditModal(false);
          }}
          isOpen={showEditModal}
        />
      )}
    </>
  );
}

interface LocationEditModalProps {
  location: Location;
  onSave: (location: Location) => void;
  onCancel: () => void;
  isOpen: boolean;
}

function LocationEditModal({ location, onSave, onCancel, isOpen }: LocationEditModalProps) {
  const [editedLocation, setEditedLocation] = useState<Location>(location);
  const [newTag, setNewTag] = useState('');

  const handleUpdateMetadata = (updates: Partial<typeof location.metadata>) => {
    setEditedLocation(prev => ({
      ...prev,
      metadata: { ...prev.metadata, ...updates }
    }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !editedLocation.metadata.genre_tags.includes(newTag.trim())) {
      handleUpdateMetadata({
        genre_tags: [...editedLocation.metadata.genre_tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    handleUpdateMetadata({
      genre_tags: editedLocation.metadata.genre_tags.filter(t => t !== tagToRemove)
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl bg-white p-0 overflow-hidden">
        <DialogHeader className="p-6 bg-gray-900 text-white">
          <DialogTitle className="text-xl">
            {location.name ? `Edit Location: ${location.name}` : 'New Location'}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Location Name</label>
              <Input
                value={editedLocation.name}
                onChange={(e) => setEditedLocation({ ...editedLocation, name: e.target.value })}
                placeholder="Ex: Whispering Forest"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Type</label>
              <Select
                value={editedLocation.location_type}
                onValueChange={(val: any) => setEditedLocation({ ...editedLocation, location_type: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interior">Interior</SelectItem>
                  <SelectItem value="exterior">Exterior</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Short Description</label>
            <Textarea
              value={editedLocation.metadata.description}
              onChange={(e) => handleUpdateMetadata({ description: e.target.value })}
              placeholder="Describe this location..."
              className="min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Atmosphere</label>
              <Input
                value={editedLocation.metadata.atmosphere}
                onChange={(e) => handleUpdateMetadata({ atmosphere: e.target.value })}
                placeholder="Ex: Dark and spooky"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Importance</label>
              <Select
                value={editedLocation.metadata.importance || 'medium'}
                onValueChange={(val: any) => handleUpdateMetadata({ importance: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Address / Location</label>
            <Input
              value={editedLocation.metadata.address || ''}
              onChange={(e) => handleUpdateMetadata({ address: e.target.value })}
              placeholder="Ex: South of the village"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Tags</label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              />
              <Button onClick={handleAddTag} type="button">Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {editedLocation.metadata.genre_tags.map(tag => (
                <Badge key={tag} className="flex items-center gap-1">
                  {tag}
                  <XIcon
                    className="w-3 h-3 cursor-pointer hover:text-red-200"
                    onClick={() => handleRemoveTag(tag)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t flex justify-end gap-3 bg-gray-50">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSave(editedLocation)} className="bg-blue-600 hover:bg-blue-700 text-white">
            <SaveIcon className="w-4 h-4 mr-2" />
            Save Location
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
