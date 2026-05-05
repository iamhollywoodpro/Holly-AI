'use client';

import { useState } from 'react';
import { 
  Code, FolderTree, FileCode, Search, Play, Save, Download,
  GitBranch, History, Loader2, AlertCircle, CheckCircle, Eye, ArrowLeft
} from 'lucide-react';
import { sovereignTheme } from '@/styles/themes/sovereign';

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
      background: sovereignTheme.colors.background.primary,
      color: sovereignTheme.colors.text.primary,
      fontFamily: sovereignTheme.typography.fontFamily.serif,
    }}>
      {/* Header */}
      <div style={{
        background: sovereignTheme.colors.background.secondary,
        borderBottom: `1px solid ${sovereignTheme.colors.border.primary}`,
        padding: '2.5rem 2rem',
      }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '0.5rem',
                borderRadius: '12px',
                border: `1px solid ${sovereignTheme.colors.border.primary}`,
                background: sovereignTheme.colors.background.tertiary,
                color: sovereignTheme.colors.text.primary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = sovereignTheme.colors.primary.gold}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = sovereignTheme.colors.border.primary}
              title="Back to HOLLY Chat"
            >
              <ArrowLeft size={20} />
            </button>
            <Code size={32} style={{ color: sovereignTheme.colors.primary.gold }} />
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              background: sovereignTheme.colors.gradients.holographic,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Neural Workshop
            </h1>
          </div>
          <p style={{ color: sovereignTheme.colors.text.tertiary, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700 }}>
            Self-Evolution Protocol — Intentional Source Optimization
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
          padding: '1.25rem',
          borderRadius: '16px',
          background: sovereignTheme.colors.background.secondary,
          border: `1px solid ${sovereignTheme.colors.border.primary}`,
          boxShadow: sovereignTheme.colors.shadows.lg,
        }}>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={loadRepositoryStructure}
              disabled={isLoading}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '12px',
                border: 'none',
                background: sovereignTheme.colors.gradients.primary,
                color: '#fff',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                fontSize: '0.75rem',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                boxShadow: sovereignTheme.colors.shadows.glow,
              }}
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <FolderTree size={16} />}
              Load Repository
            </button>
 
            <button
              onClick={saveFileContent}
              disabled={!selectedFile || isLoading}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '12px',
                border: `1px solid ${sovereignTheme.colors.border.primary}`,
                background: sovereignTheme.colors.background.tertiary,
                color: selectedFile ? sovereignTheme.colors.primary.gold : sovereignTheme.colors.text.muted,
                cursor: !selectedFile || isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                fontSize: '0.75rem',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              <Save size={16} />
              Commit Changes
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                border: `1px solid ${sovereignTheme.colors.border.primary}`,
                background: 'transparent',
                color: sovereignTheme.colors.text.tertiary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              <GitBranch size={16} />
              main
            </button>
            <button
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                border: `1px solid ${sovereignTheme.colors.border.primary}`,
                background: 'transparent',
                color: sovereignTheme.colors.text.tertiary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
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
            borderRadius: '12px',
            background: message.type === 'success' ? `${sovereignTheme.colors.primary.gold}10` : `${sovereignTheme.colors.primary.crimson}10`,
            border: `1px solid ${message.type === 'success' ? sovereignTheme.colors.primary.gold : sovereignTheme.colors.primary.crimson}`,
            color: message.type === 'success' ? sovereignTheme.colors.primary.gold : sovereignTheme.colors.primary.crimson,
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            fontSize: '0.85rem',
            fontWeight: 600,
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
            background: sovereignTheme.colors.background.secondary,
            border: `1px solid ${sovereignTheme.colors.border.primary}`,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Search */}
            <div style={{ padding: '1rem', borderBottom: `1px solid ${sovereignTheme.colors.border.primary}` }}>
              <div style={{ position: 'relative' }}>
                <Search 
                  size={14} 
                  style={{ 
                    position: 'absolute', 
                    left: '0.875rem', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    color: sovereignTheme.colors.text.muted,
                  }} 
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="SEARCH REPOSITORY..."
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem 0.625rem 2.5rem',
                    borderRadius: '10px',
                    border: `1px solid ${sovereignTheme.colors.border.primary}`,
                    background: sovereignTheme.colors.background.tertiary,
                    color: sovereignTheme.colors.text.primary,
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    letterSpacing: '0.1em',
                  }}
                />
              </div>
            </div>

            {/* File List */}
            <div style={{ flex: 1, overflow: 'auto', padding: '0.75rem' }}>
              {filteredFiles.length === 0 ? (
                <div style={{
                  padding: '3rem 1rem',
                  textAlign: 'center',
                  color: sovereignTheme.colors.text.muted,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}>
                  {files.length === 0 ? 'Initialize Repository Access' : 'No matches found'}
                </div>
              ) : (
                filteredFiles.map((file, i) => (
                  <button
                    key={i}
                    onClick={() => file.type === 'file' && loadFileContent(file.path)}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      borderRadius: '10px',
                      border: 'none',
                      background: selectedFile === file.path ? `${sovereignTheme.colors.primary.gold}15` : 'transparent',
                      color: selectedFile === file.path ? sovereignTheme.colors.primary.gold : (file.type === 'dir' ? sovereignTheme.colors.text.tertiary : sovereignTheme.colors.text.secondary),
                      cursor: file.type === 'file' ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      fontSize: '0.8rem',
                      fontWeight: selectedFile === file.path ? 700 : 500,
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      marginBottom: '0.375rem',
                    }}
                  >
                    {file.type === 'dir' ? (
                      <FolderTree size={14} style={{ color: sovereignTheme.colors.primary.gold, opacity: 0.6 }} />
                    ) : (
                      <FileCode size={14} style={{ color: sovereignTheme.colors.primary.gold }} />
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
            borderRadius: '16px',
            background: sovereignTheme.colors.background.secondary,
            border: `1px solid ${sovereignTheme.colors.border.primary}`,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: sovereignTheme.colors.shadows.xl,
          }}>
            {/* Editor Header */}
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: `1px solid ${sovereignTheme.colors.border.primary}`,
              background: sovereignTheme.colors.background.tertiary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FileCode size={16} style={{ color: sovereignTheme.colors.primary.gold }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: sovereignTheme.colors.text.primary }}>
                  {selectedFile || 'NEURAL BUFFER EMPTY'}
                </span>
              </div>
              {selectedFile && (
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    style={{
                      padding: '0.5rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'transparent',
                      color: sovereignTheme.colors.text.muted,
                      cursor: 'pointer',
                    }}
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    style={{
                      padding: '0.5rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'transparent',
                      color: sovereignTheme.colors.text.muted,
                      cursor: 'pointer',
                    }}
                  >
                    <Download size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Editor Content */}
            <div style={{ flex: 1, overflow: 'auto', background: sovereignTheme.colors.background.primary }}>
              {selectedFile ? (
                <textarea
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  style={{
                    width: '100%',
                    height: '100%',
                    padding: '1.5rem',
                    border: 'none',
                    background: 'transparent',
                    color: sovereignTheme.colors.text.secondary,
                    fontSize: '0.9rem',
                    fontFamily: sovereignTheme.typography.fontFamily.mono,
                    resize: 'none',
                    lineHeight: '1.8',
                    outline: 'none',
                  }}
                  spellCheck={false}
                />
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: sovereignTheme.colors.text.muted,
                  gap: '1rem',
                }}>
                  <div style={{ width: '40px', height: '1px', background: sovereignTheme.colors.border.primary }} />
                  <p style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                    Awaiting Architectural Selection
                  </p>
                  <div style={{ width: '40px', height: '1px', background: sovereignTheme.colors.border.primary }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
