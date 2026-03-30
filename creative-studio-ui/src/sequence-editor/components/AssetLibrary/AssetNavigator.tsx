import React from 'react';
import { 
  Plus, ChevronDown 
} from 'lucide-react';
import { useAssetLibrary } from '../../hooks/useAssetLibrary';

interface AssetNavigatorProps {
  onGenerateAsset?: () => void;
}

export const AssetNavigator: React.FC<AssetNavigatorProps> = ({ onGenerateAsset }) => {
  const { activeCategory, handleCategorySelect, categoryConfigs } = useAssetLibrary();

  return (
    <aside className="asset-library-sidebar toolbox-sidebar">
      <div className="sidebar-header">
        <span className="toolbox-title font-black uppercase tracking-widest text-[10px] opacity-40">Browser</span>
      </div>
      <div className="sidebar-scroll-area">
        <div className="toolbox-accordion">
          {categoryConfigs.map((cat) => {
            const Icon = cat.icon as any;
            const isActive = activeCategory === cat.id;

            return (
              <div 
                key={cat.id} 
                className={`accordion-item ${isActive ? 'active' : ''}`}
                onClick={() => handleCategorySelect(cat.id)}
              >
                <div className="accordion-trigger group">
                  <ChevronDown className={`w-3 h-3 mr-2 opacity-20 transition-transform ${isActive ? '' : '-rotate-90'}`} />
                  <Icon className={`w-4 h-4 mr-2 ${isActive ? 'text-indigo-400' : 'opacity-60'}`} />
                  <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-white/40 group-hover:text-white/70'}`}>
                    {cat.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="sidebar-footer">
         <button className="new-asset-fab glassmorphic-dark" onClick={onGenerateAsset}>
           <Plus className="w-4 h-4 text-indigo-400" />
           <span className="text-[10px] font-black uppercase tracking-tighter ml-2">Quick Generate</span>
         </button>
      </div>
    </aside>
  );
};

export default AssetNavigator;
