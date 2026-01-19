import { useState, useMemo } from 'react';
import { Search, Image, AlertCircle } from 'lucide-react';
import type { Avatar } from '../types';

interface AssetBrowserProps {
  avatars: Avatar[];
  onAvatarSelect: (avatar: Avatar) => void;
  selectedAvatarId?: string;
  isLoading?: boolean;
  error?: string | null;
}

export function AssetBrowser({
  avatars,
  onAvatarSelect,
  selectedAvatarId,
  isLoading = false,
  error = null
}: AssetBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAvatars = useMemo(() => {
    if (!searchQuery) return avatars;
    return avatars.filter(avatar =>
      avatar.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      avatar.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [avatars, searchQuery]);

  const handleAvatarClick = (avatar: Avatar) => {
    onAvatarSelect(avatar);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading avatars...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-destructive">
        <AlertCircle className="w-5 h-5 mr-2" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <input
          type="text"
          placeholder="Search avatars..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Avatar Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 max-h-96 overflow-y-auto">
        {filteredAvatars.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Image className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm">
              {searchQuery ? 'No avatars match your search' : 'No avatars available'}
            </p>
          </div>
        ) : (
          filteredAvatars.map((avatar) => (
            <AvatarThumbnail
              key={avatar.id}
              avatar={avatar}
              isSelected={avatar.id === selectedAvatarId}
              onClick={() => handleAvatarClick(avatar)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface AvatarThumbnailProps {
  avatar: Avatar;
  isSelected: boolean;
  onClick: () => void;
}

function AvatarThumbnail({ avatar, isSelected, onClick }: AvatarThumbnailProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className={`
        relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all
        ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}
      `}
      onClick={onClick}
    >
      <div className="aspect-square bg-muted flex items-center justify-center">
        {imageError ? (
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <Image className="w-8 h-8 mb-1 opacity-50" />
            <span className="text-xs">No preview</span>
          </div>
        ) : (
          <img
            src={avatar.path}
            alt={avatar.name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        )}
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-primary-foreground rounded-full" />
        </div>
      )}

      {/* Avatar info */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-1">
        <p className="text-xs font-medium truncate" title={avatar.name}>
          {avatar.name}
        </p>
      </div>
    </div>
  );
}