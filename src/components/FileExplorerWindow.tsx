/**
 * FileExplorerWindow - File explorer window content
 */

'use client';

import { useState } from 'react';
import { Folder, File, ChevronRight, ChevronDown } from 'lucide-react';

export interface FileExplorerWindowProps {
  windowId: string;
}

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

const mockFileSystem: FileNode[] = [
  {
    name: 'Projects',
    type: 'folder',
    children: [
      { name: 'holly-ai', type: 'folder', children: [
        { name: 'src', type: 'folder' },
        { name: 'package.json', type: 'file' },
      ]},
      { name: 'website', type: 'folder' },
    ],
  },
  {
    name: 'Documents',
    type: 'folder',
    children: [
      { name: 'notes.txt', type: 'file' },
      { name: 'ideas.md', type: 'file' },
    ],
  },
  {
    name: 'Downloads',
    type: 'folder',
  },
];

function FileTreeItem({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = () => {
    if (node.type === 'folder') {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div>
      <div
        className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={handleClick}
      >
        {node.type === 'folder' && (
          <span className="text-gray-500">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </span>
        )}
        
        {node.type === 'folder' ? (
          <Folder className="w-4 h-4 text-blue-500" />
        ) : (
          <File className="w-4 h-4 text-gray-500" />
        )}
        
        <span className="text-sm">{node.name}</span>
      </div>

      {node.type === 'folder' && isExpanded && node.children && (
        <div>
          {node.children.map((child, i) => (
            <FileTreeItem key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileExplorerWindow({ windowId }: FileExplorerWindowProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <input
          type="text"
          placeholder="Search files..."
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>

      <div className="flex-1 overflow-auto p-2">
        {mockFileSystem.map((node, i) => (
          <FileTreeItem key={i} node={node} />
        ))}
      </div>
    </div>
  );
}
