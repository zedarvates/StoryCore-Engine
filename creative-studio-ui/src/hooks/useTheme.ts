import { useEffect } from 'react';
import { useThemeStore, ThemeType } from '@/stores/themeStore';

export function useTheme() {
    const { theme, effectiveTheme, setTheme, syncWithSystem } = useThemeStore();

    useEffect(() => {
        syncWithSystem();
    }, [syncWithSystem]);

    return {
        theme,
        effectiveTheme, // The computed 'light' or 'dark'
        setTheme: (newTheme: ThemeType) => setTheme(newTheme),
        // Helper for the toggle button in sidebar
        toggleTheme: () => {
            if (effectiveTheme === 'dark') {
                setTheme('light-snow');
            } else {
                setTheme('dark-neon');
            }
        }
    };
}
