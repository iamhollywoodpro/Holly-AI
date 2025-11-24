'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  FolderOpen,
  File,
  Search,
  RefreshCw,
  AlertCircle,
  Loader2,
  Home,
  GitBranch,
  Star,
  Clock,
} from 'lucide-react';
import { getFileIcon } from '@/lib/github/github-api';

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  sha?: string;
}

interface BrowseResponse {
  success: boolean;
  operation: string;
  owner: string;
  repo: string;
  path: string;
  branch: string;
  contents: FileItem[];
  repoInfo?: {
    description: string;
    defaultBranch: string;
    language: string;
    stars: number;
    lastUpdated: string;
  };
  error?: string;
  details?: string;
}

interface FileBrowserProps {
  owner: string;
  repo: string;
  branch?: string;
  onFileSelect?: (file: FileItem) => void;
  className?: string;
}

interface TreeNode {
  item: FileItem;
  isExpanded: boolean;
  children?: TreeNode[];
  isLoading?: boolean;
}

export default function FileBrowser({ 
  owner, 
  repo, 
  branch = 'main',
  onFileSelect,
  className = ''
}: FileBrowserProps) {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<FileItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [repoInfo, setRepoInfo] = useState<BrowseResponse['repoInfo'] | null>(null);

  // Load initial directory contents
  useEffect(() => {
    loadDirectory('');
  }, [owner, repo, branch]);

  // Load directory contents
  const loadDirectory = async (path: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        owner,
        repo,
        path,
        branch,
      });

      const response = await fetch(`/api/github/browse?${params}`);
      const data: BrowseResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load directory');
      }

      if (data.success) {
        // Convert contents to tree nodes
        const nodes: TreeNode[] = data.contents.map(item => ({
          item,
          isExpanded: false,
        }));

        // Sort: directories first, then files, alphabetically
        nodes.sort((a, b) => {
          if (a.item.type !== b.item.type) {
            return a.item.type === 'dir' ? -1 : 1;
          }
          return a.item.name.localeCompare(b.item.name);
        });

        setTreeNodes(nodes);
        setCurrentPath(path);
        
        if (data.repoInfo) {
          setRepoInfo(data.repoInfo);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load repository contents');
      console.error('FileBrowser error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle directory expansion
  const toggleDirectory = async (node: TreeNode, index: number) => {
    if (node.item.type !== 'dir') return;

    // If already expanded, just collapse
    if (node.isExpanded) {
      const newNodes = [...treeNodes];
      newNodes[index].isExpanded = false;
      setTreeNodes(newNodes);
      return;
    }

    // Load directory contents
    const newNodes = [...treeNodes];
    newNodes[index].isLoading = true;
    setTreeNodes(newNodes);

    try {
      const params = new URLSearchParams({
        owner,
        repo,
        path: node.item.path,
        branch,
      });

      const response = await fetch(`/api/github/browse?${params}`);
      const data: BrowseResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load directory');
      }

      if (data.success) {
        // Convert to tree nodes
        const childNodes: TreeNode[] = data.contents.map(item => ({
          item,
          isExpanded: false,
        }));

        // Sort children
        childNodes.sort((a, b) => {
          if (a.item.type !== b.item.type) {
            return a.item.type === 'dir' ? -1 : 1;
          }
          return a.item.name.localeCompare(b.item.name);
        });

        newNodes[index].children = childNodes;
        newNodes[index].isExpanded = true;
        newNodes[index].isLoading = false;
        setTreeNodes(newNodes);
      }
    } catch (err: any) {
      console.error('Failed to load directory:', err);
      newNodes[index].isLoading = false;
      setTreeNodes(newNodes);
    }
  };

  // Handle file selection
  const handleFileClick = (file: FileItem) => {
    if (file.type === 'file' && onFileSelect) {
      onFileSelect(file);
    }
  };

  // Search files
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        owner,
        repo,
        search: searchQuery,
      });

      const response = await fetch(`/api/github/browse?${params}`);
      const data: BrowseResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      if (data.success) {
        setSearchResults((data as any).results || []);
      }
    } catch (err: any) {
      setError(err.message || 'Search failed');
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  // Format file size
  const formatSize = (bytes?: number): string => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Render tree node
  const renderTreeNode = (node: TreeNode, depth: number = 0, index: number) => {
    const isDir = node.item.type === 'dir';
    const Icon = isDir ? (node.isExpanded ? FolderOpen : Folder) : File;
    const fileIcon = !isDir ? getFileIcon(node.item.name) : null;

    return (
      <div key={node.item.path} className="select-none">
        {/* Node row */}
        <div
          className={`
            flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer
            hover:bg-gray-100 dark:hover:bg-gray-800
            transition-colors duration-150
          `}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => {
            if (isDir) {
              toggleDirectory(node, index);
            } else {
              handleFileClick(node.item);
            }
          }}
        >
          {/* Expand/collapse indicator */}
          {isDir && (
            <div className="w-4 h-4 flex items-center justify-center">
              {node.isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
              ) : node.isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </div>
          )}

          {/* Icon */}
          {isDir ? (
            <Icon className={`w-4 h-4 ${node.isExpanded ? 'text-blue-500' : 'text-gray-500'}`} />
          ) : (
            <span className="text-lg leading-none">{fileIcon}</span>
          )}

          {/* Name */}
          <span className="flex-1 text-sm truncate text-gray-900 dark:text-gray-200">
            {node.item.name}
          </span>

          {/* Size (for files) */}
          {!isDir && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatSize(node.item.size)}
            </span>
          )}
        </div>

        {/* Render children if expanded */}
        {isDir && node.isExpanded && node.children && (
          <div>
            {node.children.map((child, childIndex) => 
              renderTreeNode(child, depth + 1, childIndex)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex-none border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {owner}/{repo}
            </h3>
            {repoInfo && (
              <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <GitBranch className="w-3 h-3" />
                {branch}
              </span>
            )}
          </div>
          <button
            onClick={() => loadDirectory(currentPath)}
            disabled={loading}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Repo info */}
        {repoInfo && (
          <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 mb-3">
            {repoInfo.language && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                {repoInfo.language}
              </span>
            )}
            {repoInfo.stars > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3" />
                {repoInfo.stars.toLocaleString()}
              </span>
            )}
            {repoInfo.lastUpdated && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(repoInfo.lastUpdated).toLocaleDateString()}
              </span>
            )}
          </div>
        )}

        {/* Search bar */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search files..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg
                     hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors duration-150"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Error state */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg mb-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-sm">Error</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && !error && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}

        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2 px-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Search Results ({searchResults.length})
              </span>
              <button
                onClick={clearSearch}
                className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400"
              >
                Clear
              </button>
            </div>
            <div className="space-y-1">
              {searchResults.map((file) => (
                <div
                  key={file.path}
                  className="flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer
                           hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => handleFileClick(file)}
                >
                  <span className="text-lg">{getFileIcon(file.name)}</span>
                  <span className="flex-1 text-sm truncate text-gray-900 dark:text-gray-200">
                    {file.path}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatSize(file.size)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* File tree */}
        {!loading && !error && searchResults.length === 0 && (
          <div className="space-y-0.5">
            {treeNodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                <Folder className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">This directory is empty</p>
              </div>
            ) : (
              treeNodes.map((node, index) => renderTreeNode(node, 0, index))
            )}
          </div>
        )}
      </div>

      {/* Breadcrumb footer */}
      {currentPath && !searchQuery && (
        <div className="flex-none border-t border-gray-200 dark:border-gray-700 p-2">
          <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
            <Home className="w-3 h-3" />
            <ChevronRight className="w-3 h-3" />
            <span className="truncate">{currentPath || 'root'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
