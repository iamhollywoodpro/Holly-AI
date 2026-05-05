'use client';

/**
 * SANDBOX TEST PAGE
 * 
 * Test page for sandbox execution
 */

import { useState } from 'react';
import { useSandbox } from '@/hooks/useSandbox';
import SandboxWindow from '@/components/sandbox-window';
import { Play, Code, FileText } from 'lucide-react';

export default function TestSandboxPage() {
  const { execute, getPreview, clearOutput, isExecuting, terminalOutput, result } = useSandbox();
  const [code, setCode] = useState(`// Test JavaScript code
console.log('Hello from Holly Sandbox!');

const sum = (a, b) => a + b;
console.log('2 + 3 =', sum(2, 3));

// Return a value
return 'Execution complete!';`);
  
  const [language, setLanguage] = useState<'javascript' | 'html'>('javascript');
  const [showSandbox, setShowSandbox] = useState(true);
  const [preview, setPreview] = useState<{ type: 'code' | 'text'; content: string } | undefined>();

  const handleExecute = async () => {
    try {
      clearOutput();
      setPreview(undefined);
      await execute(code, language);
    } catch (error) {
      console.error('Execution failed:', error);
    }
  };

  const handlePreview = async () => {
    try {
      const html = await getPreview(code, language);
      setPreview({ type: 'code', content: html });
      setShowSandbox(true);
    } catch (error) {
      console.error('Preview failed:', error);
    }
  };

  const examples = {
    javascript: `// Test JavaScript code
console.log('Hello from Holly Sandbox!');

const sum = (a, b) => a + b;
console.log('2 + 3 =', sum(2, 3));

return 'Execution complete!';`,
    
    html: `<div style="text-align: center; padding: 40px;">
  <h1 style="color: #8b5cf6;">Holly Sandbox</h1>
  <p style="color: #666;">Live HTML Preview</p>
  <button style="background: #8b5cf6; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer;">
    Click Me!
  </button>
</div>`
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🚀 Holly Sandbox Test</h1>
          <p className="text-gray-400">
            Test the sandbox execution system with live code execution and preview
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-4">
          <select
            value={language}
            onChange={(e) => {
              const newLang = e.target.value as 'javascript' | 'html';
              setLanguage(newLang);
              setCode(examples[newLang]);
            }}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
          >
            <option value="javascript">JavaScript</option>
            <option value="html">HTML</option>
          </select>

          <button
            onClick={handleExecute}
            disabled={isExecuting}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 rounded-lg transition-colors"
          >
            <Play className="w-4 h-4" />
            {isExecuting ? 'Executing...' : 'Execute'}
          </button>

          {language === 'html' && (
            <button
              onClick={handlePreview}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4" />
              Preview
            </button>
          )}

          <button
            onClick={clearOutput}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            Clear
          </button>

          <button
            onClick={() => setShowSandbox(!showSandbox)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            {showSandbox ? 'Hide' : 'Show'} Sandbox
          </button>
        </div>

        {/* Code Editor */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Code className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-gray-400">Code Editor</span>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-64 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg font-mono text-sm text-gray-300 resize-none focus:outline-none focus:border-purple-500"
            placeholder="Enter your code here..."
          />
        </div>

        {/* Results */}
        {result && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Results</h2>
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    result.success ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className={result.success ? 'text-green-400' : 'text-red-400'}>
                  {result.success ? 'Success' : 'Failed'}
                </span>
                {result.execution_time_ms && (
                  <span className="text-gray-500 text-sm ml-auto">
                    {result.execution_time_ms}ms
                  </span>
                )}
              </div>

              {result.output && (
                <div className="mt-3">
                  <div className="text-xs text-gray-500 mb-1">Output:</div>
                  <div className="text-sm text-gray-300 font-mono bg-gray-800 p-2 rounded">
                    {result.output}
                  </div>
                </div>
              )}

              {result.error && (
                <div className="mt-3">
                  <div className="text-xs text-red-500 mb-1">Error:</div>
                  <div className="text-sm text-red-400 font-mono bg-gray-800 p-2 rounded">
                    {result.error}
                  </div>
                </div>
              )}

              {result.console_logs && result.console_logs.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-gray-500 mb-1">Console:</div>
                  <div className="text-sm text-gray-300 font-mono bg-gray-800 p-2 rounded space-y-1">
                    {result.console_logs.map((log, i) => (
                      <div key={i}>{log}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sandbox Window */}
        <SandboxWindow
          isOpen={showSandbox}
          onClose={() => setShowSandbox(false)}
          currentAction={isExecuting ? 'Executing code...' : undefined}
          terminalOutput={terminalOutput}
          preview={preview}
        />
      </div>
    </div>
  );
}
