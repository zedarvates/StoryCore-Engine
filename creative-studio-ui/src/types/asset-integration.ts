export interface ProjectTemplate {
  project: {
    id: string;
    name: string;
    version: string;
    created_at: string;
    updated_at: string;
    description: string;
    format: {
      type: string;
      duration_range: {
        min_minutes: number;
        max_minutes: number;
      };
      specifications: {
        aspect_ratio: string;
        frame_rate: number;
        resolution: string;
        audio_channels: string;
      };
      available_formats: Record<string, {
        min_minutes: number;
        max_minutes: number | null;
        description: string;
      }>;
    };
    genres: string[];
    available_genres: string[];
    metadata: {
      director: string;
      producer: string;
      writer: string;
      budget: number;
      target_audience: string;
      language: string;
      country: string;
      release_year: number | null;
      production_company: string;
      distribution_company: string;
    };
    narrative: {
      plot_outline: string;
      logline: string;
      themes: string[];
      tone: string;
      setting: {
        time_period: string;
        locations: string[];
      };
      characters: Character[];
      acts: Act[];
    };
    custom_fields: Record<string, any>;
    documentation: {
      usage: string;
      extensibility: string;
      version_history: {
        version: string;
        changes: string;
      }[];
    };
  };
}

export interface Character {
  id: string;
  name: string;
  description: string;
  personality?: string[];
  appearance?: string;
  role?: string;
  arc?: string;
}

export interface Act {
  act_number: number;
  description: string;
  duration_estimate: number;
}

export interface VideoTimelineMetadata {
  metadata: {
    title: string;
    version: string;
    created_at: string;
    updated_at: string;
    total_duration: number;
    total_frames: number;
    frame_rate: number;
    resolution: string;
    aspect_ratio: string;
    video_codec: string;
    audio_codec: string;
    bitrate_video: string;
    bitrate_audio: string;
    sample_rate: number;
    channels: number;
    color_space: string;
    projection: string;
    stereoscopic: boolean;
  };
  scenes: Scene[];
}

export interface Scene {
  scene_number: number;
  start_time: number;
  end_time: number;
  duration: number;
  description: string;
  timing: {
    timestamps: {
      time: number;
      frame: number;
      description: string;
    }[];
  };
  elements: {
    audio: AudioElement[];
    video: VideoElement[];
  };
  characters: CharacterAction[];
  camera: CameraMovement[];
  dialogue: Dialogue[];
  effects: Effect[];
  transitions: Transition[];
}

export interface AudioElement {
  type: 'music' | 'sfx' | 'dialogue';
  start_time: number;
  end_time: number;
  description: string;
  volume: number;
  fade_in?: number;
  fade_out?: number;
  sync_offset?: number;
}

export interface VideoElement {
  type: string;
  start_time: number;
  end_time: number;
  description: string;
  layer: number;
  opacity: number;
}

export interface CharacterAction {
  name: string;
  actions: {
    time: number;
    action: string;
    description: string;
  }[];
  position: {
    x: number;
    y: number;
    z: number;
  };
}

export interface CameraMovement {
  movement: string;
  start_time: number;
  end_time: number;
  description: string;
  start_position?: { x: number; y: number; z: number };
  end_position?: { x: number; y: number; z: number };
  position?: { x: number; y: number; z: number };
  focal_length?: number;
  focal_length_start?: number;
  focal_length_end?: number;
  speed?: string;
  cuts?: { time: number; description: string }[];
}

export interface Dialogue {
  speaker: string;
  start_time: number;
  end_time: number;
  text: string;
  language: string;
  sync_accuracy: number;
}

export interface Effect {
  type: string;
  start_time: number;
  end_time: number;
  description: string;
  parameters?: Record<string, any>;
  speed_multiplier?: number;
  intensity?: number;
}

export interface Transition {
  type: string;
  start_time: number;
  end_time: number;
  description: string;
  duration: number;
}

export interface NarrativeText {
  id: string;
  title: string;
  content: string;
  type: 'plot_outline' | 'character_bio' | 'dialogue_script' | 'notes';
  related_project?: string;
  created_at: string;
  updated_at: string;
}