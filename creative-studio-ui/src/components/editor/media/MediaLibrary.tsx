import React, { useState, useCallback, useRef } from 'react';
import {
  Folder,
  FolderOpen,
  File,
  Image,
  Video,
  Music,
  Upload,
  Search,
  Filter,
  Grid,
  List,
  Download,
  Trash2,
  Star,
  Tag,
  Calendar,
  HardDrive
} from 'lucide-react';
import './MediaLibrary.css';

interface MediaAsset {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'image' | 'document';
  url: string;
  thumbnail?: string;
  duration?: number; // for video/audio
  size: number; // bytes
  dimensions?: { width: number; height: number }; // for images/videos
  dateCreated: Date;
  dateModified: Date;
  tags: string[];
  folderId: string;
  favorite: boolean;
  metadata: {
    codec?: string;
    bitrate?: number;
    frameRate?: number;
    sampleRate?: number;
  };
}

interface MediaFolder {
  id: string;
  name: string;
  parentId?: string;
  children: string[];
  expanded: boolean;
  assetCount: number;
}

interface MediaLibraryProps {
  assets: MediaAsset[];
  folders: MediaFolder[];
  selectedAssetIds: string[];
  onAssetSelect: (assetId: string, multiSelect?: boolean) => void;
  onAssetImport: (files: FileList) => void;
  onAssetDelete: (assetId: string) => void;
  onAssetDownload: (assetId: string) => void;
  onAssetFavorite: (assetId: string) => void;
  onFolderCreate: (name: string, parentId?: string) => void;
  onFolderDelete: (folderId: string) => void;
  onAssetMove: (assetId: string, folderId: string) => void;
}

const VIEW_MODES = {
  GRID: 'grid',
  LIST: 'list'
} as const;

const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'dateModified', label: 'Date Modified' },
  { value: 'dateCreated', label: 'Date Created' },
  { value: 'size', label: 'Size' },
  { value: 'type', label: 'Type' }
];

export function MediaLibrary({
  assets,
  folders,
  selectedAssetIds,
  onAssetSelect,
  onAssetImport,
  onAssetDelete,
  onAssetDownload,
  onAssetFavorite,
  onFolderCreate,
  onFolderDelete,
  onAssetMove
}: MediaLibraryProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('root');
  const [sortBy, setSortBy] = useState('dateModified');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState<string>('all');
  const [showUpload, setShowUpload] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Get current folder assets
  const currentFolderAssets = assets.filter(asset =>
    asset.folderId === selectedFolderId
  );

  // Filter and sort assets
  const filteredAssets = currentFolderAssets
    .filter(asset => {
      const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           asset.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = filterType === 'all' || asset.type === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      let aValue: any = a[sortBy as keyof MediaAsset];
      let bValue: any = b[sortBy as keyof MediaAsset];

      if (sortBy === 'size') {
        aValue = a.size;
        bValue = b.size;
      } else if (sortBy.startsWith('date')) {
        aValue = a[sortBy as keyof MediaAsset] as Date;
        bValue = b[sortBy as keyof MediaAsset] as Date;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  // Build folder tree
  const buildFolderTree = useCallback(() => {
    const folderMap = new Map(folders.map(f => [f.id, f]));
    const rootFolders: MediaFolder[] = [];

    folders.forEach(folder => {
      if (!folder.parentId) {
        rootFolders.push(folder);
      }
    });

    const attachChildren = (parent: MediaFolder): MediaFolder => {
      parent.children.forEach(childId => {
        if (folderMap.has(childId)) {
          attachChildren(folderMap.get(childId)!);
        }
      });
      return parent;
    };

    return rootFolders.map(attachChildren);
  }, [folders]);

  const folderTree = buildFolderTree();

  const getAssetIcon = (type: MediaAsset['type']) => {
    switch (type) {
      case 'video': return <Video size={16} />;
      case 'audio': return <Music size={16} />;
      case 'image': return <Image size={16} />;
      default: return <File size={16} />;
    }
  };

  const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileUpload = useCallback((files: FileList) => {
    onAssetImport(files);
    setShowUpload(false);
  }, [onAssetImport]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  const handleFolderClick = useCallback((folderId: string) => {
    setSelectedFolderId(folderId);
  }, []);

  const renderFolderTree = (folderList: MediaFolder[], depth = 0) => {
    return folderList.map(folder => (
      <div key={folder.id} style={{ paddingLeft: `${depth * 16}px` }}>
        <div
          className={`folder-item ${selectedFolderId === folder.id ? 'selected' : ''}`}
          onClick={() => handleFolderClick(folder.id)}
        >
          {folder.children.length > 0 ? (
            folder.expanded ? <FolderOpen size={16} /> : <Folder size={16} />
          ) : (
            <Folder size={16} />
          )}
          <span className="folder-name">{folder.name}</span>
          <span className="folder-count">({folder.assetCount})</span>
        </div>

        {folder.expanded && folder.children.length > 0 && (
          <div className="folder-children">
            {renderFolderTree(
              folders.filter(f => folder.children.includes(f.id)),
              depth + 1
            )}
          </div>
        )}
      </div>
    ));
  };

  const renderAssetGrid = (asset: MediaAsset) => (
    <div
      key={asset.id}
      className={`asset-item grid ${selectedAssetIds.includes(asset.id) ? 'selected' : ''}`}
      onClick={() => onAssetSelect(asset.id, false)}
    >
      <div className="asset-preview">
        {asset.thumbnail ? (
          <img src={asset.thumbnail} alt={asset.name} />
        ) : (
          <div className="asset-placeholder">
            {getAssetIcon(asset.type)}
          </div>
        )}

        {asset.favorite && (
          <div className="favorite-badge">
            <Star size={12} />
          </div>
        )}
      </div>

      <div className="asset-info">
        <div className="asset-name" title={asset.name}>
          {asset.name}
        </div>
        <div className="asset-meta">
          {asset.type === 'video' || asset.type === 'audio' ? (
            <span>{formatDuration(asset.duration)}</span>
          ) : asset.dimensions ? (
            <span>{asset.dimensions.width}×{asset.dimensions.height}</span>
          ) : null}
          <span>{formatFileSize(asset.size)}</span>
        </div>
      </div>

      <div className="asset-actions">
        <button
          className={`favorite-btn ${asset.favorite ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onAssetFavorite(asset.id);
          }}
          title={asset.favorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star size={14} />
        </button>

        <button
          className="download-btn"
          onClick={(e) => {
            e.stopPropagation();
            onAssetDownload(asset.id);
          }}
          title="Download"
        >
          <Download size={14} />
        </button>

        <button
          className="delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete "${asset.name}"?`)) {
              onAssetDelete(asset.id);
            }
          }}
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );

  const renderAssetList = (asset: MediaAsset) => (
    <div
      key={asset.id}
      className={`asset-item list ${selectedAssetIds.includes(asset.id) ? 'selected' : ''}`}
      onClick={() => onAssetSelect(asset.id, false)}
    >
      <div className="asset-icon">
        {getAssetIcon(asset.type)}
      </div>

      <div className="asset-preview-small">
        {asset.thumbnail ? (
          <img src={asset.thumbnail} alt={asset.name} />
        ) : (
          <div className="asset-placeholder-small">
            {getAssetIcon(asset.type)}
          </div>
        )}
      </div>

      <div className="asset-details">
        <div className="asset-name">{asset.name}</div>
        <div className="asset-meta">
          <span className="asset-type">{asset.type}</span>
          <span className="asset-size">{formatFileSize(asset.size)}</span>
          {asset.duration && (
            <span className="asset-duration">{formatDuration(asset.duration)}</span>
          )}
          <span className="asset-date">
            {asset.dateModified.toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="asset-tags">
        {asset.tags.slice(0, 3).map(tag => (
          <span key={tag} className="tag">{tag}</span>
        ))}
        {asset.tags.length > 3 && (
          <span className="tag more">+{asset.tags.length - 3}</span>
        )}
      </div>

      <div className="asset-actions">
        <button
          className={`favorite-btn ${asset.favorite ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onAssetFavorite(asset.id);
          }}
        >
          <Star size={14} />
        </button>

        <button
          className="download-btn"
          onClick={(e) => {
            e.stopPropagation();
            onAssetDownload(asset.id);
          }}
        >
          <Download size={14} />
        </button>

        <button
          className="delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete "${asset.name}"?`)) {
              onAssetDelete(asset.id);
            }
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="media-library">
      {/* Header */}
      <div className="library-header">
        <div className="header-left">
          <HardDrive size={20} />
          <h3>Media Library</h3>
        </div>

        <div className="header-actions">
          <button
            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid View"
          >
            <Grid size={16} />
          </button>

          <button
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List View"
          >
            <List size={16} />
          </button>

          <button
            className="upload-btn"
            onClick={() => setShowUpload(true)}
            title="Upload Files"
          >
            <Upload size={16} />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="library-toolbar">
        <div className="search-bar">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search media..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filters">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="video">Videos</option>
            <option value="audio">Audio</option>
            <option value="image">Images</option>
            <option value="document">Documents</option>
          </select>

          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order as 'asc' | 'desc');
            }}
          >
            {SORT_OPTIONS.map(option => (
              <>
                <option key={`${option.value}-desc`} value={`${option.value}-desc`}>
                  {option.label} ↓
                </option>
                <option key={`${option.value}-asc`} value={`${option.value}-asc`}>
                  {option.label} ↑
                </option>
              </>
            ))}
          </select>
        </div>
      </div>

      <div className="library-content">
        {/* Folders Sidebar */}
        <div className="folders-sidebar">
          <div className="folders-header">
            <h4>Folders</h4>
            <button
              className="add-folder-btn"
              onClick={() => {
                const name = prompt('Enter folder name:');
                if (name) {
                  onFolderCreate(name, selectedFolderId === 'root' ? undefined : selectedFolderId);
                }
              }}
              title="Create Folder"
            >
              <Folder size={14} />
            </button>
          </div>

          <div className="folders-tree">
            <div
              className={`folder-item ${selectedFolderId === 'root' ? 'selected' : ''}`}
              onClick={() => handleFolderClick('root')}
            >
              <HardDrive size={16} />
              <span className="folder-name">All Media</span>
              <span className="folder-count">({assets.length})</span>
            </div>

            {renderFolderTree(folderTree)}
          </div>
        </div>

        {/* Assets Area */}
        <div className="assets-area">
          <div
            ref={dropZoneRef}
            className={`assets-container ${viewMode}`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {filteredAssets.length === 0 ? (
              <div className="no-assets">
                <Upload size={48} />
                <h4>No media found</h4>
                <p>Drag files here or click upload to get started</p>
                <button
                  className="upload-empty-btn"
                  onClick={() => setShowUpload(true)}
                >
                  Upload Files
                </button>
              </div>
            ) : (
              filteredAssets.map(asset =>
                viewMode === 'grid'
                  ? renderAssetGrid(asset)
                  : renderAssetList(asset)
              )
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="upload-modal-overlay">
          <div className="upload-modal">
            <div className="upload-header">
              <h4>Upload Media Files</h4>
              <button onClick={() => setShowUpload(false)}>×</button>
            </div>

            <div className="upload-content">
              <div
                className="upload-dropzone"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <Upload size={48} />
                <h4>Drop files here or click to browse</h4>
                <p>Supported formats: MP4, MOV, JPG, PNG, MP3, WAV</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="video/*,audio/*,image/*"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}