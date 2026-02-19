import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type MemoryCategory =
    | 'CREATIVE_STYLE'
    | 'CHARACTER_INSIGHT'
    | 'PRODUCTION_RULE'
    | 'PROJECT_LORE'
    | 'TECHNICAL_CONSTRAINT'
    | 'USER_PREFERENCE';

export interface MemoryInsight {
    id: string;
    text: string;
    category: MemoryCategory;
    timestamp: number;
    confidence: number; // 0-1
    isPermanent: boolean;
    source?: string; // e.g., 'directorial_advice', 'user_chat'
}

interface MemoryState {
    insights: MemoryInsight[];
    workingContext: string; // The "Counter" - condensed persistent personality/rules

    // Actions
    addInsight: (insight: Omit<MemoryInsight, 'id' | 'timestamp'>) => void;
    promoteInsight: (id: string) => void;
    removeInsight: (id: string) => void;
    updateWorkingContext: (text: string) => void;
    summarizeLogs: () => Promise<void>;
    clearMemory: () => void;
}

/**
 * Project Memory Store
 * 
 * Implements a "Total Recall" inspired tiered memory system:
 * 1. Log: All new insights land here (addInsight).
 * 2. Registers: Promoted insights become permanent anchors.
 * 3. Working Context: A distilled summary of active rules.
 */
export const useMemoryStore = create<MemoryState>()(
    persist(
        (set, get) => ({
            insights: [],
            workingContext: "Standard StoryCore production protocols active.",

            addInsight: (insight) => {
                const newInsight: MemoryInsight = {
                    ...insight,
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                };
                set((state) => ({
                    insights: [newInsight, ...state.insights]
                }));
            },

            promoteInsight: (id) => {
                set((state) => ({
                    insights: state.insights.map(i =>
                        i.id === id ? { ...i, isPermanent: true, confidence: 1.0 } : i
                    )
                }));
            },

            removeInsight: (id) => {
                set((state) => ({
                    insights: state.insights.filter(i => i.id !== id)
                }));
            },

            updateWorkingContext: (text) => set({ workingContext: text }),

            summarizeLogs: async () => {
                // Logic to be implemented in a service: taking permanent insights
                // and recent high-confidence logs to rebuild workingContext.
            },

            clearMemory: () => set({ insights: [], workingContext: '' })
        }),
        {
            name: 'storycore-project-memory',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
