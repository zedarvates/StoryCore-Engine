import React, { useState, useEffect } from 'react';
import {
  Search,
  FolderOpen,
  Users,
  Mountain,
  Box,
  LayoutTemplate,
  Palette,
  Camera,
  Sun,
  Plus,
  Play,
  SkipBack,
  SkipForward,
  Image as ImageIcon,
  MessageCircle,
  X,
  Send,
  Sparkles,
} from 'lucide-react';
import { TimelineTracks } from './TimelineTracks';
import './VideoEditorPage.css';

interface Shot {
  id: number;
  title: string;
  duration: number;
  prompt: string;
  thumbnail?: string;
}

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface VideoEditorPageProps {
  sequenceId?: string;
  sequenceName?: string;
  initialShots?: any[];
  projectName?: string;
  onBackToDashboard?: () => void;
}

const VideoEditorPage: React.FC<VideoEditorPageProps> = ({
  sequenceId,
  sequenceName: propSequenceName,
  initialShots = [],
  projectName = 'Untitled Project',
  onBackToDashboard,
}) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Bonjour ! Je suis l'assistant Storycore. Comment puis-je vous aider aujourd'hui ?",
      sender: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedShot, setSelectedShot] = useState<number | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(true);
  const [sequenceName, setSequenceName] = useState(propSequenceName || 'Plan sequence 1');

  // Initialize shots from props or use default
  const [shots, setShots] = useState<Shot[]>(() => {
    if (initialShots && initialShots.length > 0) {
      return initialShots.map((shot, index) => ({
        id: index + 1,
        title: shot.title || `Shot ${index + 1}`,
        duration: shot.duration || 5,
        // FIXED: Check multiple possible fields for prompt data
        prompt: shot.prompt || shot.description || shot.text || '',
        thumbnail: shot.thumbnail,
      }));
    }
    return [
      { id: 1, title: 'Shot 1', duration: 6, prompt: 'Prompt text image et animation' },
      { id: 2, title: 'Shot 2', duration: 10, prompt: 'Prompt text image et animation' }
    ];
  });

  // Update shots when initialShots changes
  useEffect(() => {
    if (initialShots && initialShots.length > 0) {
      const converted = initialShots.map((shot, index) => ({
        id: index + 1,
        title: shot.title || `Shot ${index + 1}`,
        duration: shot.duration || 5,
        // FIXED: Check multiple possible fields for prompt data
        prompt: shot.prompt || shot.description || shot.text || '',
        thumbnail: shot.thumbnail,
      }));
      setShots(converted);
    }
  }, [initialShots]);

  // Update sequence name when prop changes
  useEffect(() => {
    if (propSequenceName) {
      setSequenceName(propSequenceName);
    }
  }, [propSequenceName]);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const newMessage: Message = {
      id: messages.length + 1,
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages([...messages, newMessage]);
    setInputMessage('');

    // Simulate assistant response
    setTimeout(() => {
      const response: Message = {
        id: messages.length + 2,
        text: "Je comprends votre demande. Laissez-moi vous aider avec ça...",
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, response]);
    }, 1000);
  };

  const handleAddShot = () => {
    const newShot: Shot = {
      id: shots.length + 1,
      title: `Shot ${shots.length + 1}`,
      duration: 5,
      prompt: 'Nouveau prompt'
    };
    setShots([...shots, newShot]);
  };

  const handleGenerateSequence = () => {
    console.log('Génération de la séquence...');
    // Logic for sequence generation
  };

  const handleDropMedia = (trackType: 'video' | 'image' | 'audio' | 'text', file: File) => {
    console.log(`Dropped ${file.name} on ${trackType} track`);
    // Logic for handling dropped media files
    // In a real implementation, this would:
    // 1. Upload/process the file
    // 2. Create a clip object
    // 3. Add it to the appropriate track
  };

  const handlePromptChange = (shotId: number, newPrompt: string) => {
    // Update the shot's prompt in local state
    setShots(prevShots =>
      prevShots.map(shot =>
        shot.id === shotId ? { ...shot, prompt: newPrompt } : shot
      )
    );
    
    // In a real implementation, this would also:
    // 1. Debounce the save operation
    // 2. Call an API to persist the change
    // 3. Show a toast notification on success
    console.log(`Updated prompt for shot ${shotId}:`, newPrompt);
  };

  return (
    <div className="video-editor-container">
      {/* Toolbar - Simplified header without duplicate menu */}
      <div className="editor-toolbar">
        {onBackToDashboard && (
          <button className="btn-back" onClick={onBackToDashboard}>
            ← Back to Dashboard
          </button>
        )}
        <span className="project-name">{projectName}</span>
        <span className="sequence-name">{sequenceName}</span>
      </div>

      <div className="editor-main">
        {/* Left Sidebar - Library */}
        <aside className="sidebar-left">
          <div className="search-bar">
            <Search size={16} className="search-icon" />
            <input type="text" placeholder="Rechercher assets..." />
          </div>

          {/* Library Assets Section */}
          <div className="library-section">
            <button
              className="section-header"
              onClick={() => setIsLibraryOpen(!isLibraryOpen)}
            >
              <FolderOpen size={18} className="section-icon purple" />
              <span>BIBLIOTHÈQUE ASSETS</span>
              <span className="badge">12</span>
            </button>
            {isLibraryOpen && (
              <div className="section-content">
                <div className="asset-category">
                  <Users size={16} className="category-icon" />
                  <span>Personnages</span>
                  <span className="count">3</span>
                </div>
                <div className="asset-list">
                  <div className="asset-item">Protagoniste_A</div>
                  <div className="asset-item">Antagoniste_B</div>
                  <div className="asset-item">Support_C</div>
                </div>

                <div className="asset-category">
                  <Mountain size={16} className="category-icon" />
                  <span>Environnements</span>
                  <span className="count">5</span>
                </div>
                <div className="asset-list">
                  <div className="asset-item">Ville_Futuriste</div>
                  <div className="asset-item">Forêt_Mystique</div>
                  <div className="asset-item">Désert_Aride</div>
                </div>

                <div className="asset-category">
                  <Box size={16} className="category-icon" />
                  <span>Props & Objets</span>
                  <span className="count">4</span>
                </div>
                <div className="asset-list">
                  <div className="asset-item">Épée_Légendaire</div>
                  <div className="asset-item">Véhicule_Hover</div>
                </div>
              </div>
            )}
          </div>

          {/* Templates Section */}
          <div className="library-section">
            <button
              className="section-header"
              onClick={() => setIsTemplatesOpen(!isTemplatesOpen)}
            >
              <LayoutTemplate size={18} className="section-icon cyan" />
              <span>TEMPLATES & STYLES</span>
              <span className="badge">8</span>
            </button>
            {isTemplatesOpen && (
              <div className="section-content">
                <div className="asset-category">
                  <Palette size={16} className="category-icon" />
                  <span>Styles Visuels</span>
                </div>
                <div className="asset-list">
                  <div className="asset-item">Cinématique</div>
                  <div className="asset-item">Concept Art</div>
                  <div className="asset-item">Anime</div>
                </div>

                <div className="asset-category">
                  <Camera size={16} className="category-icon" />
                  <span>Presets Caméra</span>
                </div>
                <div className="asset-list">
                  <div className="asset-item">Travelling</div>
                  <div className="asset-item">Plongée</div>
                  <div className="asset-item">Contre-plongée</div>
                </div>

                <div className="asset-category">
                  <Sun size={16} className="category-icon" />
                  <span>Lighting Rig</span>
                </div>
                <div className="asset-list">
                  <div className="asset-item">Golden Hour</div>
                  <div className="asset-item">Studio</div>
                  <div className="asset-item">Nuit</div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="quick-actions">
            <button className="btn-new-asset">
              <Plus size={18} />
              Nouvel Asset IA
            </button>
            <div className="action-grid">
              <button className="action-btn dreamina">
                <ImageIcon size={20} />
                <span>Dreamina</span>
              </button>
              <button className="action-btn prompt-gen">
                <MessageCircle size={20} />
                <span>Prompt Gen</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Center Area - Player & Timeline */}
        <main className="center-area">
          <div className="video-player">
            <div className="player-content">
              <ImageIcon size={48} className="player-icon" />
              <p>Fais glisser les ressources ici...</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="timeline-container">
            <div className="timeline-controls">
              <button className="control-btn">
                <SkipBack size={20} />
              </button>
              <button className="control-btn play">
                <Play size={20} />
              </button>
              <button className="control-btn">
                <SkipForward size={20} />
              </button>
            </div>

            <div className="timeline-track">
              {shots.map((shot, index) => (
                <div
                  key={shot.id}
                  className={`timeline-shot ${selectedShot === shot.id ? 'selected' : ''}`}
                  style={{ width: `${(shot.duration / 20) * 100}%` }}
                  onClick={() => setSelectedShot(shot.id)}
                >
                  <span className="shot-label">
                    {shot.title} : Durée {shot.duration} secondes
                  </span>
                </div>
              ))}
              <button className="timeline-add-btn" onClick={handleAddShot}>
                <Plus size={16} />
              </button>
            </div>

            <p className="timeline-hint">
              Fais glisser les ressources ici et commence à créer
            </p>

            {/* Timeline Tracks for Media */}
            <TimelineTracks onDropMedia={handleDropMedia} />
          </div>
        </main>

        {/* Right Panel - Sequence Plan */}
        <aside className="sidebar-right">
          <div className="panel-header">
            <h2>{sequenceName}</h2>
            <button className="btn-generate" onClick={handleGenerateSequence}>
              <Sparkles size={18} />
              Générer Séquence
            </button>
          </div>

          <div className="shots-grid">
            {shots.map((shot) => (
              <div key={shot.id} className="shot-card">
                <div className="shot-number">{shot.id}</div>
                <div className="shot-thumbnail">
                  <ImageIcon size={32} />
                </div>
                <div className="shot-info">
                  <h4>{shot.title}</h4>
                  <p className="shot-duration">{shot.duration}s</p>
                  <textarea
                    className="shot-prompt"
                    placeholder="Prompt text image et animation"
                    value={shot.prompt}
                    onChange={(e) => handlePromptChange(shot.id, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="panel-footer">
            <div className="project-details">
              <div className="detail-row">
                <span className="label">Chemin:</span>
                <span className="value">/projects/demo</span>
              </div>
              <div className="detail-row">
                <span className="label">Format:</span>
                <span className="value">16:9</span>
              </div>
              <div className="detail-row">
                <span className="label">Résolution:</span>
                <span className="value">1920×1080</span>
              </div>
              <div className="detail-row">
                <span className="label">FPS:</span>
                <span className="value">30</span>
              </div>
            </div>
            <button className="btn-modify">Modifier</button>
          </div>
        </aside>
      </div>

      {/* Floating Chat Assistant */}
      <div className="chat-assistant">
        {isChatOpen && (
          <div className="chat-window">
            <div className="chat-header">
              <div className="chat-avatar">SC</div>
              <div className="chat-title">
                <h3>Storycore Assistant</h3>
                <span className="status">En ligne</span>
              </div>
              <button className="chat-close" onClick={() => setIsChatOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="chat-messages">
              {messages.map((msg) => (
                <div key={msg.id} className={`message ${msg.sender}`}>
                  <div className="message-bubble">{msg.text}</div>
                </div>
              ))}
            </div>

            <div className="chat-input">
              <input
                type="text"
                placeholder="Tapez votre message..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button className="send-btn" onClick={handleSendMessage}>
                <Send size={18} />
              </button>
            </div>
          </div>
        )}

        <button
          className="chat-toggle"
          onClick={() => setIsChatOpen(!isChatOpen)}
        >
          {isChatOpen ? <X size={24} /> : <MessageCircle size={24} />}
        </button>
      </div>
    </div>
  );
};

export default VideoEditorPage;
