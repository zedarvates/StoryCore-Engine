import type { Shot } from '@/types';

export function getShotVideoUrl(shot: Pick<Shot, 'image' | 'metadata'>): string | undefined {
  const videoUrl = shot.metadata?.videoUrl;
  return typeof videoUrl === 'string' && videoUrl.length > 0 ? videoUrl : shot.image;
}
