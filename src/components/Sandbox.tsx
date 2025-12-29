'use client';

import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Play, FileCode, Eye, Terminal, Maximize2, Minimize2 } from 'lucide-react';

interface SandboxFile {
  name: string;
  content: string;
  language: string;
}

interface SandboxProps {
  files?: SandboxFile[];
  onRun?: (code: string) => void;
  showPreview?: boolean;
  showTerminal?: boolean;
}

export default function Sandbox({
  files = [],
  onRun,
  showPreview = true,
  showTerminal = false
}: SandboxProps) {
  const [currentFile, setCurrentFile] = useState<SandboxFile | null>(files[0] || null);
  const [code, setCode] = useState(currentFile?.content || '');
  const [previewUrl, setPreviewUrl] = useState('');
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (currentFile) {
      setCode(currentFile.content);
    }
  }, [currentFile]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
      if (currentFile) {
        currentFile.content = value;
      }
    }
  };

  const handleRun = () => {
    if (onRun) {
      onRun(code);
    }
    setTerminalOutput(prev => [...prev, `> Running ${currentFile?.name || 'code'}...`]);
  };

  const getLanguage = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'yaml': 'yaml',
      'yml': 'yaml',
    };
    return languageMap[ext || ''] || 'plaintext';
  };

  return (
    <div className={`flex flex-col h-full bg-gray-900 text-white ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <FileCode className="w-5 h-5 text-cyan-400" />
          <span className="text-sm font-medium">Sandbox</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRun}
            className="flex items-center space-x-2 px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
          >
            <Play className="w-4 h-4" />
            <span>Run</span>
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 hover:bg-gray-700 rounded"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* File Tabs */}
      {files.length > 0 && (
        <div className="flex items-center space-x-1 px-2 py-1 bg-gray-800 border-b border-gray-700 overflow-x-auto">
          {files.map((file, index) => (
            <button
              key={index}
              onClick={() => setCurrentFile(file)}
              className={`px-3 py-1 text-sm rounded-t ${
                currentFile?.name === file.name
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {file.name}
            </button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <div className={`${showPreview ? 'w-1/2' : 'w-full'} border-r border-gray-700`}>
          <Editor
            height="100%"
            language={currentFile ? getLanguage(currentFile.name) : 'typescript'}
            value={code}
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
            }}
          />
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="w-1/2 flex flex-col">
            <div className="flex items-center space-x-2 px-4 py-2 bg-gray-800 border-b border-gray-700">
              <Eye className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium">Preview</span>
            </div>
            <div className="flex-1 bg-white">
              {previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-0"
                  title="Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Preview will appear here</p>
                    <p className="text-sm mt-1">Click Run to see output</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Terminal */}
      {showTerminal && (
        <div className="h-32 bg-black border-t border-gray-700 flex flex-col">
          <div className="flex items-center space-x-2 px-4 py-1 bg-gray-800 border-b border-gray-700">
            <Terminal className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium">Terminal</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 font-mono text-sm">
            {terminalOutput.map((line, index) => (
              <div key={index} className="text-green-400">
                {line}
              </div>
            ))}
            {terminalOutput.length === 0 && (
              <div className="text-gray-500">Terminal output will appear here...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
