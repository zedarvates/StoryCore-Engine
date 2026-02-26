import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeType =
    | 'dark-neon'
    | 'dark-onyx'
    | 'light-snow'
    | 'light-sepia'
    | 'classic-slate'
    | 'classic-retro'
    | 'plasma-plex-neon'
    | 'system';

interface ThemeState {
    theme: ThemeType;
    effectiveTheme: 'light' | 'dark'; // Realized theme for logic (icons, etc)
    setTheme: (theme: ThemeType) => void;
    syncWithSystem: () => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            theme: 'system',
            effectiveTheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
            setTheme: (theme: ThemeType) => {
                set({ theme });
                get().syncWithSystem();
            },
            syncWithSystem: () => {
                const { theme } = get();
                let effective: 'light' | 'dark' = 'dark';

                if (theme === 'system') {
                    effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                } else if (theme.startsWith('dark-')) {
                    effective = 'dark';
                } else if (theme.startsWith('light-')) {
                    effective = 'light';
                } else if (theme === 'classic-slate') {
                    effective = 'dark';
                } else if (theme === 'classic-retro') {
                    effective = 'dark';
                } else if (theme === 'plasma-plex-neon') {
                    effective = 'dark';
                }

                set({ effectiveTheme: effective });

                // Apply classes to document element
                const root = window.document.documentElement;

                // Remove all theme classes
                root.classList.remove(
                    'dark',
                    'theme-dark-neon',
                    'theme-dark-onyx',
                    'theme-light-snow',
                    'theme-light-sepia',
                    'theme-classic-slate',
                    'theme-classic-retro',
                    'theme-plasma-plex-neon'
                );

                if (effective === 'dark') {
                    root.classList.add('dark');
                }

                if (theme !== 'system') {
                    root.classList.add(`theme-${theme}`);
                } else {
                    // If system, we might want to add a specific dark/light variation class if we had them
                    // but for now .dark handles the background/etc via the selector in index.css
                }
            },
        }),
        {
            name: 'storycore-theme-storage',
        }
    )
);

// Initialize system listener
if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        useThemeStore.getState().syncWithSystem();
    });
}
