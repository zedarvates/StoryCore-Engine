export interface LUTConfig {
  id: string;
  name: string;
  type: '3d' | '1d' | 'cube';
  strength: number;
  description?: string;
}