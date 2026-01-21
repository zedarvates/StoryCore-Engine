import { User, UserCheck, Plus } from 'lucide-react';
import type { Character } from '@/types/character';
import type { Avatar } from '../types';

interface CharacterCardProps {
  character: Character;
  assignedAvatar?: Avatar | null;
  onCast: () => void;
  onReplace: () => void;
  isSelected?: boolean;
}

export function CharacterCard({
  character,
  assignedAvatar,
  onCast,
  onReplace,
  isSelected = false
}: CharacterCardProps) {
  const isCast = !!assignedAvatar;

  return (
    <div
      className={`
        relative p-4 border rounded-lg transition-all cursor-pointer
        ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
        ${isCast ? 'bg-green-50 dark:bg-green-950/20' : 'bg-muted/50'}
      `}
      onClick={isCast ? onReplace : onCast}
    >
      {/* Cast Status Indicator */}
      <div className="absolute top-2 right-2">
        {isCast ? (
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <UserCheck className="w-4 h-4" />
            <span className="text-xs font-medium">Cast</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-muted-foreground">
            <User className="w-4 h-4" />
            <span className="text-xs font-medium">Uncast</span>
          </div>
        )}
      </div>

      {/* Character Avatar or Placeholder */}
      <div className="flex items-center gap-4 mb-3">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex items-center justify-center">
          {assignedAvatar ? (
            <img
              src={assignedAvatar.path}
              alt={assignedAvatar.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = '<div class="text-muted-foreground text-xs">No image</div>';
                }
              }}
            />
          ) : (
            <div className="text-muted-foreground">
              <User className="w-6 h-6" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <h3 className="font-medium text-sm">{character.name}</h3>
          <p className="text-xs text-muted-foreground">
            {character.role.archetype}
          </p>
        </div>
      </div>

      {/* Actor Info */}
      {assignedAvatar && (
        <div className="mb-3 p-2 bg-background rounded border">
          <p className="text-xs font-medium text-green-700 dark:text-green-300">
            Actor: {assignedAvatar.name}
          </p>
        </div>
      )}

      {/* Action Button */}
      <button
        className={`
          w-full py-2 px-3 rounded-md text-sm font-medium transition-colors
          ${isCast
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }
        `}
        onClick={(e) => {
          e.stopPropagation();
          isCast ? onReplace() : onCast();
        }}
      >
        <div className="flex items-center justify-center gap-2">
          {isCast ? (
            <>
              <UserCheck className="w-4 h-4" />
              Replace Actor
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Cast Actor
            </>
          )}
        </div>
      </button>

      {/* Character Details */}
      <div className="mt-3 pt-3 border-t border-border">
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Age: {character.visual_identity.age_range}</div>
          <div>Function: {character.role.narrative_function || 'Not specified'}</div>
        </div>
      </div>
    </div>
  );
}
