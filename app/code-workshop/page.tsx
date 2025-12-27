'use client';

import { useState } from 'react';
import { 
  Code, FolderTree, FileCode, Search, Play, Save, Download,
  GitBranch, History, Loader2, AlertCircle, CheckCircle, Eye
} from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';

interface FileNode {
  path: string;
  type: 'file' | 'dir';
  size?: number;
}

export default function CodeWorkshopPage() {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadRepositoryStructure = async () => {
    setIsLoading(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/self-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list-files', path: '' }),
      });

      const data = await response.json();

      if (data.success && data.files) {
        setFiles(data.files);
        setMessage({ type: 'success', text: `Loaded ${data.files.length} files` });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to load repository' });
      }
    } catch (error) {
      console.error('Load error:', error);
      setMessage({ type: 'error', text: 'Failed to load repository structure' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadFileContent = async (path: string) => {
    setIsLoading(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/self-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read-file', path }),
      });

      const data = await response.json();

      if (data.success && data.content) {
        setSelectedFile(path);
        setFileContent(data.content);
        setMessage({ type: 'success', text: `Loaded ${path}` });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to load file' });
      }
    } catch (error) {
      console.error('Read error:', error);
      setMessage({ type: 'error', text: 'Failed to read file' });
    } finally {
      setIsLoading(false);
    }
  };

  const saveFileContent = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/self-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'write-file', 
          path: selectedFile,
          content: fileContent,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: `Saved ${selectedFile}` });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save file' });
      }
    } catch (error) {
      console.error('Save error:', error);
      setMessage({ type: 'error', text: 'Failed to save file' });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredFiles = files.filter(file =>
    file.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: cyberpunkTheme.colors.background.primary,
      color: cyberpunkTheme.colors.text.primary,
    }}>
      {/* Header */}
      <div style={{
        background: cyberpunkTheme.colors.background.secondary,
        borderBottom: `1px solid ${cyberpunkTheme.colors.border.primary}`,
        padding: '2rem',
      }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <Code size={32} style={{ color: cyberpunkTheme.colors.primary.cyan }} />
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              background: cyberpunkTheme.colors.gradients.holographic,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Code Workshop
            </h1>
          </div>
          <p style={{ color: cyberpunkTheme.colors.text.secondary, fontSize: '0.95rem' }}>
            View and modify HOLLY's source code - Self-evolution in action
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '2rem' }}>
        {/* Action Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          padding: '1rem',
          borderRadius: '12px',
          background: cyberpunkTheme.colors.background.secondary,
          border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
        }}>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={loadRepositoryStructure}
              disabled={isLoading}
              style={{
                padding: '0.75rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                background: cyberpunkTheme.colors.gradients.primary,
                color: '#fff',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <FolderTree size={16} />}
              Load Repository
            </button>

            <button
              onClick={saveFileContent}
              disabled={!selectedFile || isLoading}
              style={{
                padding: '0.75rem 1.25rem',
                borderRadius: '8px',
                border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                background: cyberpunkTheme.colors.background.tertiary,
                color: selectedFile ? cyberpunkTheme.colors.primary.cyan : cyberpunkTheme.colors.text.tertiary,
                cursor: !selectedFile || isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem',
              }}
            >
              <Save size={16} />
              Save Changes
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                background: 'transparent',
                color: cyberpunkTheme.colors.text.secondary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem',
              }}
            >
              <GitBranch size={16} />
              main
            </button>
            <button
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                background: 'transparent',
                color: cyberpunkTheme.colors.text.secondary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem',
              }}
            >
              <History size={16} />
              History
            </button>
          </div>
        </div>

        {/* Message Banner */}
        {message && (
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            background: message.type === 'success' ? '#10b98120' : '#ef444420',
            border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: message.type === 'success' ? '#10b981' : '#ef4444',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {message.text}
          </div>
        )}

        {/* Main Content Area */}
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem', height: 'calc(100vh - 300px)' }}>
          {/* File Explorer */}
          <div style={{
            borderRadius: '12px',
            background: cyberpunkTheme.colors.background.secondary,
            border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Search */}
            <div style={{ padding: '1rem', borderBottom: `1px solid ${cyberpunkTheme.colors.border.primary}` }}>
              <div style={{ position: 'relative' }}>
                <Search 
                  size={16} 
                  style={{ 
                    position: 'absolute', 
                    left: '0.75rem', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    color: cyberpunkTheme.colors.text.tertiary,
                  }} 
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search files..."
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem 0.5rem 2.5rem',
                    borderRadius: '6px',
                    border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                    background: cyberpunkTheme.colors.background.tertiary,
                    color: cyberpunkTheme.colors.text.primary,
                    fontSize: '0.85rem',
                  }}
                />
              </div>
            </div>

            {/* File List */}
            <div style={{ flex: 1, overflow: 'auto', padding: '0.5rem' }}>
              {filteredFiles.length === 0 ? (
                <div style={{
                  padding: '2rem 1rem',
                  textAlign: 'center',
                  color: cyberpunkTheme.colors.text.tertiary,
                  fontSize: '0.85rem',
                }}>
                  {files.length === 0 ? 'Click "Load Repository" to start' : 'No files found'}
                </div>
              ) : (
                filteredFiles.map((file, i) => (
                  <button
                    key={i}
                    onClick={() => file.type === 'file' && loadFileContent(file.path)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      border: 'none',
                      background: selectedFile === file.path ? cyberpunkTheme.colors.background.tertiary : 'transparent',
                      color: file.type === 'dir' ? cyberpunkTheme.colors.text.secondary : cyberpunkTheme.colors.text.primary,
                      cursor: file.type === 'file' ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.85rem',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                      marginBottom: '0.25rem',
                    }}
                  >
                    {file.type === 'dir' ? (
                      <FolderTree size={14} style={{ color: cyberpunkTheme.colors.primary.purple }} />
                    ) : (
                      <FileCode size={14} style={{ color: cyberpunkTheme.colors.primary.cyan }} />
                    )}
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.path.split('/').pop()}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Code Editor */}
          <div style={{
            borderRadius: '12px',
            background: cyberpunkTheme.colors.background.secondary,
            border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Editor Header */}
            <div style={{
              padding: '0.75rem 1rem',
              borderBottom: `1px solid ${cyberpunkTheme.colors.border.primary}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileCode size={16} style={{ color: cyberpunkTheme.colors.primary.cyan }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                  {selectedFile || 'No file selected'}
                </span>
              </div>
              {selectedFile && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      border: 'none',
                      background: 'transparent',
                      color: cyberpunkTheme.colors.text.secondary,
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                    }}
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      border: 'none',
                      background: 'transparent',
                      color: cyberpunkTheme.colors.text.secondary,
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                    }}
                  >
                    <Download size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Editor Content */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {selectedFile ? (
                <textarea
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  style={{
                    width: '100%',
                    height: '100%',
                    padding: '1rem',
                    border: 'none',
                    background: cyberpunkTheme.colors.background.primary,
                    color: cyberpunkTheme.colors.text.primary,
                    fontSize: '0.9rem',
                    fontFamily: 'monospace',
                    resize: 'none',
                    lineHeight: '1.6',
                  }}
                  spellCheck={false}
                />
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: cyberpunkTheme.colors.text.tertiary,
                  fontSize: '0.9rem',
                }}>
                  Select a file to view and edit
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
