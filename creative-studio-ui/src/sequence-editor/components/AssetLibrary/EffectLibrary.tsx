import React, { useMemo } from 'react';
import { AssetGrid } from './AssetGrid';
import type { AssetSource } from '../../../services/assetLibraryService';
import './assetLibrary.css';

interface EffectLibraryProps {
    sources: AssetSource[];
    searchQuery: string;
}

export const EffectLibrary: React.FC<EffectLibraryProps> = ({
    sources,
    searchQuery,
}) => {
    const effectAssets = useMemo(() => {
        const allAssets: any[] = [];
        for (const source of sources) {
            const sourceAssets = source.assets || [];
            allAssets.push(...sourceAssets.filter(a =>
                a.type === 'template' && (
                    a.name.toLowerCase().includes('effect') ||
                    a.metadata?.category === 'effect' ||
                    a.metadata?.category === 'lut'
                )
            ));
        }
        return allAssets;
    }, [sources]);

    return (
        <div className="effect-library">
            <AssetGrid
                assets={effectAssets}
                categoryId="effects"
                searchQuery={searchQuery}
            />
        </div>
    );
};
