/**
 * Media Library Component
 * Import and manage media files for the video editor
 */

import React, { useCallback, useRef, useState } from 'react';
import { useVideoEditor } from '../../../contexts/VideoEditorContext';
import { MediaType, MediaFile } from '../../../types/video-editor';
import './MediaLibrary.css';

export const MediaLibrary: React.FC = () => {
  const {
    mediaLibrary,
    importMedia,
    addClipToTimeline,
    deleteMedia,
  } = useVideoEditor();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<'all' | MediaType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        await importMedia(files);
        e.target.value = '';
      }
    },
    [importMedia]
  );

  const handleDragStart = (e: React.DragEvent, mediaId: string) => {
    e.dataTransfer.setData('mediaId', mediaId);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const mediaId = e.dataTransfer.getData('mediaId');
      if (mediaId) {
        // Calculate drop position in timeline
        // This would be handled by the Timeline component
        console.log('Dropped media:', mediaId);
      }
    },
    []
  );

  const filteredMedia = mediaLibrary.filter((media: MediaFile) => {
    if (filter !== 'all' && media.type !== filter) return false;
    if (searchQuery && !media.name.toLowerCase().includes(searchQuery.toLowerCase()))
      return false;
    return true;
  });

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="media-library">
      <div className="media-library-header">
        <h3>Media</h3>
        <button className="import-btn" onClick={handleImportClick}>
          + Import
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,audio/*,image/*"
          multiple
          onChange={handleFileChange}
          style={{ display: 'none' }}
          aria-label="Import media files"
        />
      </div>

      <div className="media-search">
        <label htmlFor="media-search" className="sr-only">Search media</label>
        <input
          id="media-search"
          type="text"
          placeholder="Search media..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search media"
        />
      </div>

      <div className="media-filter">
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={filter === 'video' ? 'active' : ''}
          onClick={() => setFilter('video')}
        >
          Video
        </button>
        <button
          className={filter === 'audio' ? 'active' : ''}
          onClick={() => setFilter('audio')}
        >
          Audio
        </button>
        <button
          className={filter === 'image' ? 'active' : ''}
          onClick={() => setFilter('image')}
        >
          Images
        </button>
      </div>

      <div
        className="media-grid"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {filteredMedia.map((media) => (
          <div
            key={media.id}
            className="media-item"
            draggable
            onDragStart={(e) => handleDragStart(e, media.id)}
          >
            <div className="media-thumbnail">
              {media.thumbnail ? (
                <img src={media.thumbnail} alt={media.name} />
              ) : (
                <div className="media-icon">
                  {media.type === 'video' && '🎬'}
                  {media.type === 'audio' && '🎵'}
                  {media.type === 'image' && '🖼️'}
                </div>
              )}
              {media.type === 'video' && media.metadata.duration && (
                <span className="media-duration">
                  {formatDuration(media.metadata.duration)}
                </span>
              )}
            </div>
            <div className="media-info">
              <span className="media-name" title={media.name}>
                {media.name}
              </span>
              <span className="media-meta">
                {formatFileSize(media.metadata.fileSize)}
              </span>
            </div>
            <div className="media-actions">
              <button
                className="action-btn add"
                onClick={() => addClipToTimeline(media.id, '', 0)}
                title="Add to timeline"
              >
                +
              </button>
              <button
                className="action-btn delete"
                onClick={() => deleteMedia(media.id)}
                title="Delete"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredMedia.length === 0 && (
        <div className="media-empty">
          <p>No media files</p>
          <p className="hint">Click "Import" to add media</p>
        </div>
      )}
    </div>
  );
};

export default MediaLibrary;

