import React from 'react';
import { BarChart3, Users, Eye, UserX } from 'lucide-react';
import type { CastingAnalytics } from '../types';

interface CastingAnalyticsProps {
  analytics: CastingAnalytics;
}

export function CastingAnalytics({ analytics }: CastingAnalyticsProps) {
  const {
    characterSceneCounts,
    avatarUsageCounts,
    uncastCharacters,
    uniqueActorCount
  } = analytics;

  const totalCharacters = Object.keys(characterSceneCounts).length + uncastCharacters.length;
  const castCharacters = totalCharacters - uncastCharacters.length;
  const castPercentage = totalCharacters > 0 ? Math.round((castCharacters / totalCharacters) * 100) : 0;

  return (
    <div className="bg-card border rounded-lg p-6 space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5" />
        <h3 className="text-lg font-semibold">Casting Analytics</h3>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          icon={<Users className="w-5 h-5" />}
          label="Total Characters"
          value={totalCharacters}
        />
        <MetricCard
          icon={<Eye className="w-5 h-5" />}
          label="Cast Characters"
          value={`${castCharacters} (${castPercentage}%)`}
        />
        <MetricCard
          icon={<UserX className="w-5 h-5" />}
          label="Uncast Characters"
          value={uncastCharacters.length}
        />
        <MetricCard
          icon={<BarChart3 className="w-5 h-5" />}
          label="Unique Actors"
          value={uniqueActorCount}
        />
      </div>

      {/* Character Scene Distribution */}
      <div className="space-y-4">
        <h4 className="font-medium">Character Scene Distribution</h4>
        {Object.keys(characterSceneCounts).length === 0 ? (
          <p className="text-muted-foreground text-sm">No scene data available</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(characterSceneCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([characterId, sceneCount]) => (
                <CharacterSceneBar
                  key={characterId}
                  characterId={characterId}
                  sceneCount={sceneCount}
                />
              ))}
          </div>
        )}
      </div>

      {/* Avatar Usage */}
      <div className="space-y-4">
        <h4 className="font-medium">Most Used Avatars</h4>
        {Object.keys(avatarUsageCounts).length === 0 ? (
          <p className="text-muted-foreground text-sm">No avatar usage data</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(avatarUsageCounts)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([avatarId, usageCount]) => (
                <AvatarUsageBar
                  key={avatarId}
                  avatarId={avatarId}
                  usageCount={usageCount}
                />
              ))}
          </div>
        )}
      </div>

      {/* Uncast Characters */}
      {uncastCharacters.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium">Uncast Characters</h4>
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex flex-wrap gap-2">
              {uncastCharacters.map((characterId) => (
                <span
                  key={characterId}
                  className="px-3 py-1 bg-background border rounded-full text-sm"
                >
                  {characterId}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}

function MetricCard({ icon, label, value }: MetricCardProps) {
  return (
    <div className="bg-background border rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="text-muted-foreground">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

interface CharacterSceneBarProps {
  characterId: string;
  sceneCount: number;
}

function CharacterSceneBar({ characterId, sceneCount }: CharacterSceneBarProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 text-sm truncate" title={characterId}>
        {characterId}
      </div>
      <div className="flex-1 bg-muted rounded-full h-2">
        <div
          className="bg-primary rounded-full h-2 transition-all"
          style={{ width: `${Math.min((sceneCount / 10) * 100, 100)}%` }}
        />
      </div>
      <div className="text-sm font-medium w-8 text-right">
        {sceneCount}
      </div>
    </div>
  );
}

interface AvatarUsageBarProps {
  avatarId: string;
  usageCount: number;
}

function AvatarUsageBar({ avatarId, usageCount }: AvatarUsageBarProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 text-sm truncate" title={avatarId}>
        {avatarId}
      </div>
      <div className="flex-1 bg-muted rounded-full h-2">
        <div
          className="bg-secondary rounded-full h-2 transition-all"
          style={{ width: `${Math.min((usageCount / 5) * 100, 100)}%` }}
        />
      </div>
      <div className="text-sm font-medium w-8 text-right">
        {usageCount}
      </div>
    </div>
  );
}
