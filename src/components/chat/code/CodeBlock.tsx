'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  code: string;
  language: string;
  showLineNumbers?: boolean;
}

export function CodeBlock({ code, language, showLineNumbers = true }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Language color mapping
  const languageColors: Record<string, string> = {
    javascript: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    typescript: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    python: 'bg-green-500/20 text-green-400 border-green-500/30',
    jsx: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    tsx: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    html: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    css: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    json: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    bash: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    sql: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    markdown: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    yaml: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const getLanguageColor = (lang: string) => {
    return languageColors[lang.toLowerCase()] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-gray-700/50 bg-gray-900/50 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <div className={`px-2 py-1 rounded text-xs font-medium border ${getLanguageColor(language)}`}>
            {language}
          </div>
        </div>
        
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-700/50 hover:bg-gray-700 border border-gray-600/50 transition-all text-sm font-medium text-gray-300 hover:text-white"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          showLineNumbers={showLineNumbers}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'transparent',
            fontSize: '0.875rem',
          }}
          lineNumberStyle={{
            minWidth: '3em',
            paddingRight: '1em',
            color: '#6b7280',
            userSelect: 'none',
          }}
          codeTagProps={{
            style: {
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            }
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
