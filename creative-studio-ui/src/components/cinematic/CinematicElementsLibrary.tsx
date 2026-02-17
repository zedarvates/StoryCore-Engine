import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import {
    Users,
    MapPin,
    Search,
    Plus,
    Grid,
    List,
    MoreVertical,
    History,
    CheckCircle2,
    Shield,
    Sparkles,
    UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import './CinematicElementsLibrary.css';

/**
 * Cinematic Elements Library
 * Manages characters and locations as persistent "Elements" for cinematic generation.
 * Inspired by Kling 3.0's Character Coherence and Assets system.
 */
export function CinematicElementsLibrary({
    onSelectBoard
}: {
    onSelectBoard?: (name: string) => void
}) {
    const { characters, project, setShowCharacterWizard, setShowWorldWizard } = useAppStore();
    const [activeTab, setActiveTab] = useState<'characters' | 'locations' | 'history'>('characters');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Filtered characters
    const filteredCharacters = useMemo(() => {
        return characters.filter(char =>
            char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            char.background?.current_situation?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [characters, searchQuery]);

    // Mock locations (since worlds/locations are often nested)
    const locations = useMemo(() => {
        // In a real app, we'd fetch from worldBuilderStore or locationStore
        return [
            { id: 'loc-1', name: 'Cyberpunk Alley', type: 'Exterior', consistency: 0.95, thumbnail: null },
            { id: 'loc-2', name: 'Neon Bar', type: 'Interior', consistency: 0.88, thumbnail: null },
        ];
    }, []);

    return (
        <div className="cinematic-elements-library">
            <div className="library-header">
                <div className="library-title">
                    <Shield className="w-5 h-5 text-primary" />
                    <h2>Bibliothèque d'Éléments</h2>
                </div>

                <div className="library-actions">
                    <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
                        {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
                    </Button>
                    <Button size="sm" onClick={() => activeTab === 'characters' ? setShowCharacterWizard(true) : setShowWorldWizard(true)}>
                        <Plus className="w-4 h-4 mr-1" />
                        Nouveau
                    </Button>
                </div>
            </div>

            <div className="library-search">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={`Rechercher ${activeTab === 'characters' ? 'un personnage' : 'un lieu'}...`}
                        className="pl-9 h-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="library-tabs">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="characters">
                        <Users className="w-4 h-4 mr-2" />
                        Persos
                    </TabsTrigger>
                    <TabsTrigger value="locations">
                        <MapPin className="w-4 h-4 mr-2" />
                        Lieux
                    </TabsTrigger>
                    <TabsTrigger value="history">
                        <History className="w-4 h-4 mr-2" />
                        Historique
                    </TabsTrigger>
                </TabsList>

                <div className="tab-content mt-4 overflow-y-auto max-h-[500px]">
                    {activeTab === 'characters' && (
                        <div className={viewMode === 'grid' ? 'element-grid' : 'element-list'}>
                            {filteredCharacters.length === 0 ? (
                                <div className="empty-state">
                                    <UserCheck className="w-12 h-12 text-muted-foreground mb-2 opacity-20" />
                                    <p>Aucun personnage trouvé</p>
                                </div>
                            ) : (
                                filteredCharacters.map(char => (
                                    <div key={char.character_id} className="element-card character">
                                        <div className="element-thumbnail">
                                            {char.visual_identity?.generated_portrait ? (
                                                <img src={char.visual_identity.generated_portrait} alt={char.name} />
                                            ) : (
                                                <div className="placeholder-avatar">
                                                    <Users className="w-8 h-8 opacity-20" />
                                                </div>
                                            )}
                                            <div className="consistency-badge" title="Score de cohérence">
                                                <Sparkles className="w-3 h-3 mr-1" />
                                                98%
                                            </div>
                                        </div>
                                        <div className="element-info">
                                            <div className="element-header">
                                                <span className="element-name">{char.name}</span>
                                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <span className="element-meta">{char.role?.archetype || 'Personnage principal'}</span>
                                            <div className="element-actions">
                                                <Button variant="secondary" size="sm" className="text-[10px] h-6 px-2">
                                                    Utiliser Element
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-[10px] h-6 px-2"
                                                    onClick={() => onSelectBoard?.(char.name)}
                                                >
                                                    Planche
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'locations' && (
                        <div className={viewMode === 'grid' ? 'element-grid' : 'element-list'}>
                            {locations.map(loc => (
                                <div key={loc.id} className="element-card location">
                                    <div className="element-thumbnail">
                                        <div className="placeholder-location">
                                            <MapPin className="w-8 h-8 opacity-20" />
                                        </div>
                                        <div className="consistency-badge">
                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                            Stable
                                        </div>
                                    </div>
                                    <div className="element-info">
                                        <div className="element-header">
                                            <span className="element-name">{loc.name}</span>
                                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <span className="element-meta">{loc.type}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="history-list p-2 text-center text-muted-foreground">
                            <History className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">L'historique des générations apparaîtra ici.</p>
                        </div>
                    )}
                </div>
            </Tabs>
        </div>
    );
}
