import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface ManifestedAsset {
    id: string;
    characterId?: string;
    locationId?: string;
    objectId?: string;
    characterName?: string;
    generatedAt: string;
    type: 'CHARACTER_REFERENCE_SHEET' | 'LOCATION_REFERENCE_SHEET' | 'OBJECT_REFERENCE_SHEET' | 'GLOBAL_STYLE_GUIDE';
    url: string;
    metadata?: Record<string, any>;
}

export interface DirectorialAdvice {
    id: string;
    text: string;
    timestamp: string;
    context: string;
}

interface ProductionState {
    manifestedAssets: ManifestedAsset[];
    adviceHistory: DirectorialAdvice[];
    lastTrajectory: any[]; // RLM Trajectory
    lastSyncTimestamp: number | null;

    // Actions
    addManifestedAsset: (asset: ManifestedAsset) => void;
    removeManifestedAsset: (id: string) => void;
    addAdvice: (text: string, context: string) => void;
    setLastTrajectory: (trajectory: any[]) => void;
    clearSession: () => void;
}

/**
 * Production Store
 * 
 * Manages the "Neural Production Ledger" and directorial intelligence history.
 * Persists manifested assets across sessions via localStorage.
 */
export const useProductionStore = create<ProductionState>()(
    persist(
        (set) => ({
            manifestedAssets: [],
            adviceHistory: [],
            lastTrajectory: [],
            lastSyncTimestamp: null,

            addManifestedAsset: (asset) =>
                set((state) => ({
                    manifestedAssets: [asset, ...state.manifestedAssets],
                    lastSyncTimestamp: Date.now()
                })),

            removeManifestedAsset: (id) =>
                set((state) => ({
                    manifestedAssets: state.manifestedAssets.filter(a => a.id !== id),
                    lastSyncTimestamp: Date.now()
                })),

            addAdvice: (text, context) =>
                set((state) => ({
                    adviceHistory: [
                        {
                            id: crypto.randomUUID(),
                            text,
                            context,
                            timestamp: new Date().toISOString()
                        },
                        ...state.adviceHistory
                    ].slice(0, 50) // Keep last 50 advice items
                })),

            setLastTrajectory: (trajectory) =>
                set({ lastTrajectory: trajectory }),

            clearSession: () =>
                set({
                    manifestedAssets: [],
                    adviceHistory: [],
                    lastTrajectory: [],
                    lastSyncTimestamp: null
                }),
        }),
        {
            name: 'storycore-production-ledger',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
