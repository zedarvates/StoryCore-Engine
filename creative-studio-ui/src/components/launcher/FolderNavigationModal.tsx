import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen,
  Folder,
  File,
  ChevronRight,
  ChevronDown,
  Home,
  Search,
  Loader2,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert } from '@/components/ui/alert';

// ============================================================================
// Types
// ============================================================================

interface DirectoryItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: string;
}

interface FolderNavigationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProject: (projectPath: string) => Promise<void>;
  initialPath?: string;
}

interface TreeNode {
  item: DirectoryItem;
  children?: TreeNode[];
  expanded?: boolean;
  loading?: boolean;
}

// ============================================================================
// Folder Navigation Modal Component
// ============================================================================

export function FolderNavigationModal({
  open,
  onOpenChange,
  onSelectProject,
  initialPath,
}: FolderNavigationModalProps) {
  const [currentPath, setCurrentPath] = useState(initialPath || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize with default path
  useEffect(() => {
    if (open && !currentPath) {
      const defaultPath = initialPath || 'C:/Users/Documents'; // Default to Documents folder
      setCurrentPath(defaultPath);
      if (defaultPath) {
        loadDirectory(defaultPath);
      }
    }
  }, [open, initialPath]);

  // Load directory contents
  const loadDirectory = useCallback(async (path: string, node?: TreeNode) => {
    if (node) {
      node.loading = true;
      setTreeData(prev => [...prev]); // Trigger re-render
    }

    try {
      let contents: DirectoryItem[] = [];

      if (window.electronAPI) {
        contents = await (window.electronAPI.project as any).listDirectory(path);
      } else {
        // Demo mode - simulate directory listing
        contents = [
          { name: 'Documents', path: 'C:/Users/Documents', isDirectory: true, size: 0, modified: new Date().toISOString() },
          { name: 'Downloads', path: 'C:/Users/Downloads', isDirectory: true, size: 0, modified: new Date().toISOString() },
          { name: 'Desktop', path: 'C:/Users/Desktop', isDirectory: true, size: 0, modified: new Date().toISOString() },
        ];
      }

      const children = contents
        .filter(item => item.isDirectory)
        .map(item => ({ item, expanded: false, loading: false }));

      if (node) {
        node.children = children;
        node.loading = false;
      } else {
        setTreeData(children);
      }
      setTreeData(prev => [...prev]); // Trigger re-render
    } catch (err) {
      console.error('Failed to load directory:', err);
      setError('Failed to load directory contents');
      if (node) {
        node.loading = false;
        setTreeData(prev => [...prev]);
      }
    }
  }, []);

  // Toggle directory expansion
  const toggleDirectory = async (node: TreeNode) => {
    if (node.expanded) {
      node.expanded = false;
      setTreeData(prev => [...prev]);
    } else {
      node.expanded = true;
      if (!node.children) {
        await loadDirectory(node.item.path, node);
      } else {
        setTreeData(prev => [...prev]);
      }
    }
  };

  // Handle path selection
  const handleSelectPath = async (path: string) => {
    setSelectedPath(path);
    setError(null);

    // Validate project
    await validateProject(path);
  };

  // Validate project
  const validateProject = async (path: string) => {
    setIsValidating(true);
    setValidationResult(null);

    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.project.validate(path);
        setValidationResult(result);
      } else {
        // Demo validation
        await new Promise(resolve => setTimeout(resolve, 500));
        setValidationResult({
          isValid: true,
          errors: [],
          warnings: [{ type: 'info', message: 'Demo mode: validation skipped' }],
        });
      }
    } catch (err) {
      console.error('Validation failed:', err);
      setValidationResult({
        isValid: false,
        errors: [{ type: 'error', message: err instanceof Error ? err.message : 'Validation failed' }],
        warnings: [],
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Handle open project
  const handleOpenProject = async () => {
    if (!selectedPath || !validationResult?.isValid) return;

    setIsOpening(true);
    setError(null);

    try {
      await onSelectProject(selectedPath);
      onOpenChange(false);
      // Reset state
      setSelectedPath(null);
      setValidationResult(null);
      setSearchQuery('');
    } catch (err) {
      console.error('Failed to open project:', err);
      setError(err instanceof Error ? err.message : 'Failed to open project');
    } finally {
      setIsOpening(false);
    }
  };

  // Render tree node
  const renderTreeNode = (node: TreeNode, level = 0) => (
    <div key={node.item.path}>
      <div
        className={`flex items-center gap-2 px-2 py-1 hover:bg-gray-700 cursor-pointer rounded ${
          selectedPath === node.item.path ? 'bg-blue-600/20 border border-blue-500' : ''
        }`}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={() => handleSelectPath(node.item.path)}
      >
        {node.item.isDirectory ? (
          <>
            {node.expanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
            <Folder className="w-4 h-4 text-blue-400" />
          </>
        ) : (
          <>
            <div className="w-4" /> {/* Spacer */}
            <File className="w-4 h-4 text-gray-400" />
          </>
        )}
        <span className="text-sm text-white truncate">{node.item.name}</span>
        {node.loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400 ml-auto" />}
      </div>
      {node.expanded && node.children && (
        <div>
          {node.children.map(child => renderTreeNode(child, level + 1))}
        </div>
      )}
    </div>
  );

  // Filter tree data based on search
  const filteredTreeData = treeData.filter(node =>
    node.item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] bg-gray-900 border-gray-700 text-white flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-500/20">
              <FolderOpen className="w-5 h-5 text-purple-400" />
            </div>
            Open Existing Project
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Navigate through your folders to find and open a StoryCore project.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
            />
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="bg-red-900/20 border-red-800 text-red-400">
              <AlertCircle className="h-4 w-4" />
              <p>{error}</p>
            </Alert>
          )}

          {/* Directory Tree */}
          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <div className="space-y-1">
                {filteredTreeData.length > 0 ? (
                  filteredTreeData.map(node => renderTreeNode(node))
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    {searchQuery ? 'No folders match your search' : 'No folders to display'}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Selected Path Display */}
          {selectedPath && (
            <div className="p-3 rounded-lg bg-gray-800 border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Home className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-200">Selected:</span>
              </div>
              <p className="text-sm text-gray-300 font-mono break-all">{selectedPath}</p>
            </div>
          )}

          {/* Validation Results */}
          {isValidating && (
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Validating project...</span>
              </div>
            </div>
          )}

          {validationResult && !isValidating && (
            <div className="space-y-2">
              {validationResult.isValid ? (
                <div className="rounded-lg bg-green-900/20 border border-green-800 p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-300">Valid StoryCore project</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-red-900/20 border border-red-800 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-red-400">Invalid project</span>
                      <ul className="mt-1 space-y-1">
                        {validationResult.errors?.map((error: any, index: number) => (
                          <li key={index} className="text-xs text-red-300">• {error.message}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isOpening || isValidating}
            className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleOpenProject}
            disabled={!selectedPath || !validationResult?.isValid || isOpening || isValidating}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isOpening ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opening...
              </>
            ) : (
              <>
                <FolderOpen className="mr-2 h-4 w-4" />
                Open Project
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}