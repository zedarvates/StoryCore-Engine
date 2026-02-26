import { 
  Clock, 
  Maximize, 
  Layers, 
  Clapperboard, 
  Keyboard, 
  Search,
  CheckCircle2
} from 'lucide-react';
import { useVideoEditor } from '@/contexts/VideoEditorContext';
import './StatusBar.css';

export const StatusBar: React.FC = () => {
  const {
    currentTime,
    duration,
    project,
    tracks,
    clips,
  } = useVideoEditor();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  const trackCount = tracks.length;
  const clipCount = clips.length;
  const resolution = project?.resolution
    ? `${project.resolution.width}×${project.resolution.height}`
    : '1920×1080';

  return (
    <div className="status-bar">
      <div className="status-bar-left">
        <Clock className="w-3 h-3" />
        <span className="status-item time-current">
          {formatTime(currentTime)}
        </span>
        <span className="status-separator">/</span>
        <span className="status-item time-duration">
          {formatTime(duration)}
        </span>
      </div>

      <div className="status-bar-center">
        <div className="status-item" title="Résolution">
          <Maximize className="w-3 h-3" />
          <span>{resolution}</span>
        </div>
        <span className="status-separator">|</span>
        <div className="status-item" title="Images par seconde">
          <Clapperboard className="w-3 h-3" />
          <span>{project?.frameRate || 30} fps</span>
        </div>
        <span className="status-separator">|</span>
        <div className="status-item" title="Pistes">
          <Layers className="w-3 h-3" />
          <span>{trackCount} pistes</span>
        </div>
        <span className="status-separator">|</span>
        <div className="status-item" title="Clips">
          <Clapperboard className="w-3 h-3" />
          <span>{clipCount} clips</span>
        </div>
      </div>

      <div className="status-bar-right">
        <div className="status-item shortcut" title="Raccourcis clavier">
          <Keyboard className="w-3 h-3" />
        </div>
        <div className="status-item" title="Zoom">
          <Search className="w-3 h-3" />
          <span>100%</span>
        </div>
        <div className="status-item text-green-500" title="Système prêt">
          <CheckCircle2 className="w-3 h-3" />
        </div>
      </div>
    </div>
  );
};

export default StatusBar;

