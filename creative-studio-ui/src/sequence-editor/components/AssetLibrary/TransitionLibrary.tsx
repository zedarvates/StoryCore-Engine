import React, { useMemo } from 'react';
import { AssetGrid } from './AssetGrid';
import type { AssetSource } from '../../../services/assetLibraryService';
import './assetLibrary.css';

interface TransitionLibraryProps {
    sources: AssetSource[];
    searchQuery: string;
}

export const TransitionLibrary: React.FC<TransitionLibraryProps> = ({
    sources,
    searchQuery,
}) => {
    const transitionAssets = useMemo(() => {
        const allAssets: any[] = [];
        for (const source of sources) {
            const sourceAssets = source.assets || [];
            allAssets.push(...sourceAssets.filter(a =>
                a.type === 'template' && (
                    a.name.toLowerCase().includes('transition') ||
                    a.metadata?.category === 'transition'
                )
            ));

            // Default transitions if empty
            if (allAssets.length === 0 && source.id === 'builtin') {
                ['Dissolve', 'Wipe', 'Slide', 'Zoom', 'Smooth Cut'].forEach(name => {
                    allAssets.push({
                        id: `trans_${name.toLowerCase().replace(' ', '_')}`,
                        name,
                        type: 'template',
                        metadata: { category: 'transition' }
                    });
                });
            }
        }
        return allAssets;
    }, [sources]);

    return (
        <div className="transition-library">
            <AssetGrid
                assets={transitionAssets}
                categoryId="transitions"
                searchQuery={searchQuery}
            />
        </div>
    );
};
