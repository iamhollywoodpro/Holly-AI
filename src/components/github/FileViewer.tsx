'use client';

import React, { useState, useEffect } from 'react';
import { 
  X,
  Copy,
  Check,
  Download,
  ExternalLink,
  FileText,
  Code,
  Image as ImageIcon,
  FileJson,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { 
  atomOneDark, 
  atomOneLight 
} from 'react-syntax-highlighter/dist/esm/styles/hljs';

// Import language support
import javascript from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import typescript from 'react-syntax-highlighter/dist/esm/languages/hljs/typescript';
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python';
import java from 'react-syntax-highlighter/dist/esm/languages/hljs/java';
import cpp from 'react-syntax-highlighter/dist/esm/languages/hljs/cpp';
import css from 'react-syntax-highlighter/dist/esm/languages/hljs/css';
import scss from 'react-syntax-highlighter/dist/esm/languages/hljs/scss';
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json';
import xml from 'react-syntax-highlighter/dist/esm/languages/hljs/xml';
import markdown from 'react-syntax-highlighter/dist/esm/languages/hljs/markdown';
import bash from 'react-syntax-highlighter/dist/esm/languages/hljs/bash';
import sql from 'react-syntax-highlighter/dist/esm/languages/hljs/sql';
import yaml from 'react-syntax-highlighter/dist/esm/languages/hljs/yaml';
import rust from 'react-syntax-highlighter/dist/esm/languages/hljs/rust';
import go from 'react-syntax-highlighter/dist/esm/languages/hljs/go';

// Register languages
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('cpp', cpp);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('scss', scss);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('xml', xml);
SyntaxHighlighter.registerLanguage('markdown', markdown);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('sql', sql);
SyntaxHighlighter.registerLanguage('yaml', yaml);
SyntaxHighlighter.registerLanguage('rust', rust);
SyntaxHighlighter.registerLanguage('go', go);

interface FileContent {
  content: string;
  encoding?: string;
  size: number;
  sha: string;
  path: string;
}

interface FileViewerProps {
  owner: string;
  repo: string;
  filePath: string;
  fileName: string;
  branch?: string;
  onClose?: () => void;
  className?: string;
}

export default function FileViewer({
  owner,
  repo,
  filePath,
  fileName,
  branch = 'main',
  onClose,
  className = ''
}: FileViewerProps) {
  const [content, setContent] = useState<string>('');
  const [fileInfo, setFileInfo] = useState<FileContent | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isDark, setIsDark] = useState<boolean>(false);
  
  // Detect theme from DOM
  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    
    checkTheme();
    
    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    loadFileContent();
  }, [owner, repo, filePath, branch]);

  // Load file content from API
  const loadFileContent = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        owner,
        repo,
        file: filePath,
        branch,
      });

      const response = await fetch(`/api/github/browse?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load file content');
      }

      if (data.success && data.content) {
        setFileInfo(data.content);
        setContent(data.content.content);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load file content');
      console.error('FileViewer error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Copy content to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Download file
  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Open in GitHub
  const openInGitHub = () => {
    const url = `https://github.com/${owner}/${repo}/blob/${branch}/${filePath}`;
    window.open(url, '_blank');
  };

  // Get language for syntax highlighting
  const getLanguage = (): string => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'cpp',
      'h': 'cpp',
      'hpp': 'cpp',
      'cs': 'cpp',
      'css': 'css',
      'scss': 'scss',
      'sass': 'scss',
      'less': 'css',
      'json': 'json',
      'xml': 'xml',
      'html': 'xml',
      'svg': 'xml',
      'md': 'markdown',
      'markdown': 'markdown',
      'sh': 'bash',
      'bash': 'bash',
      'zsh': 'bash',
      'sql': 'sql',
      'yaml': 'yaml',
      'yml': 'yaml',
      'rs': 'rust',
      'go': 'go',
      'php': 'php',
      'rb': 'ruby',
      'swift': 'swift',
      'kt': 'kotlin',
    };

    return languageMap[ext] || 'plaintext';
  };

  // Check if file is image
  const isImage = (): boolean => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(ext);
  };

  // Check if file is binary
  const isBinary = (): boolean => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return [
      'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
      'zip', 'tar', 'gz', '7z', 'rar',
      'mp3', 'mp4', 'avi', 'mov', 'wav',
      'exe', 'dll', 'so', 'dylib',
    ].includes(ext);
  };

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex-none flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Code className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {fileName}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {owner}/{repo} / {filePath}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 ml-4">
          {!loading && !error && (
            <>
              <button
                onClick={handleCopy}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                title="Copy content"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                )}
              </button>
              <button
                onClick={handleDownload}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                title="Download file"
              >
                <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={openInGitHub}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                title="Open in GitHub"
              >
                <ExternalLink className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              title="Close"
            >
              <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* File info bar */}
      {fileInfo && !loading && !error && (
        <div className="flex-none flex items-center gap-4 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {formatSize(fileInfo.size)}
          </span>
          <span className="flex items-center gap-1">
            <Code className="w-3 h-3" />
            {getLanguage()}
          </span>
          <span className="font-mono text-xs">
            SHA: {fileInfo.sha.substring(0, 7)}
          </span>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-auto">
        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex items-center justify-center h-full p-8">
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg max-w-md">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm mb-1">Failed to load file</p>
                <p className="text-sm opacity-90">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Binary file warning */}
        {!loading && !error && isBinary() && (
          <div className="flex items-center justify-center h-full p-8">
            <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
              <FileText className="w-16 h-16 opacity-50" />
              <p className="text-sm font-medium">Binary file</p>
              <p className="text-xs text-center max-w-xs">
                This file cannot be displayed. Use the download button to save it locally.
              </p>
            </div>
          </div>
        )}

        {/* Image preview */}
        {!loading && !error && isImage() && content && (
          <div className="flex items-center justify-center h-full p-8">
            <div className="max-w-full max-h-full">
              <img
                src={`data:image;base64,${content}`}
                alt={fileName}
                className="max-w-full max-h-full object-contain rounded"
              />
            </div>
          </div>
        )}

        {/* Code content with syntax highlighting */}
        {!loading && !error && !isBinary() && !isImage() && content && (
          <div className="h-full overflow-auto">
            <SyntaxHighlighter
              language={getLanguage()}
              style={isDark ? atomOneDark : atomOneLight}
              showLineNumbers
              wrapLines
              customStyle={{
                margin: 0,
                padding: '1rem',
                background: 'transparent',
                fontSize: '0.875rem',
                lineHeight: '1.5',
              }}
              lineNumberStyle={{
                minWidth: '3em',
                paddingRight: '1em',
                color: isDark ? '#4b5563' : '#9ca3af',
                userSelect: 'none',
              }}
            >
              {content}
            </SyntaxHighlighter>
          </div>
        )}
      </div>
    </div>
  );
}
