'use client';

import { useState } from 'react';
import Sandbox from '@/components/Sandbox';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SandboxPage() {
  const [files] = useState([
    {
      name: 'index.html',
      content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Holly AI Sandbox</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    h1 {
      font-size: 3rem;
      margin-bottom: 1rem;
    }
    p {
      font-size: 1.2rem;
      line-height: 1.6;
    }
    .card {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 1rem;
      padding: 2rem;
      margin-top: 2rem;
    }
  </style>
</head>
<body>
  <h1>🚀 Welcome to Holly AI Sandbox</h1>
  <p>This is a live code editor where you can see what Holly is building in real-time!</p>
  
  <div class="card">
    <h2>✨ Features</h2>
    <ul>
      <li>Real-time code editing</li>
      <li>Live preview</li>
      <li>Multiple file support</li>
      <li>Syntax highlighting</li>
    </ul>
  </div>
  
  <div class="card">
    <h2>🎯 Try editing the code!</h2>
    <p>Change any HTML, CSS, or JavaScript and see the results instantly.</p>
  </div>
</body>
</html>`,
      language: 'html'
    },
    {
      name: 'app.js',
      content: `// Holly AI Sandbox - JavaScript Example
console.log('Welcome to Holly AI Sandbox!');

// Example: Interactive button
document.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('.card');
  
  cards.forEach((card, index) => {
    card.style.animation = \`fadeIn 0.5s ease-in-out \${index * 0.2}s both\`;
  });
});

// Add fade-in animation
const style = document.createElement('style');
style.textContent = \`
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
\`;
document.head.appendChild(style);`,
      language: 'javascript'
    },
    {
      name: 'README.md',
      content: `# Holly AI Sandbox

## What is this?

This is Holly's sandbox environment where you can see code being written and executed in real-time.

## Features

- **Code Editor**: Monaco Editor (same as VS Code)
- **Live Preview**: See your changes instantly
- **Multi-file Support**: Work with multiple files at once
- **Syntax Highlighting**: Full language support

## How to use

1. Select a file from the tabs above
2. Edit the code in the editor
3. Click "Run" to see the preview
4. Watch the magic happen!

## Supported Languages

- HTML
- CSS
- JavaScript
- TypeScript
- Python
- Markdown
- And more!

---

**Built with ❤️ by Holly AI**`,
      language: 'markdown'
    }
  ]);

  const handleRun = (code: string) => {
    console.log('Running code:', code);
    // In a real implementation, this would execute the code
    // and update the preview iframe
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <Link
            href="/"
            className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Holly</span>
          </Link>
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Holly AI Sandbox</h1>
          <p className="text-sm text-gray-400">Live Code Editor & Preview</p>
        </div>
        <div className="w-32" /> {/* Spacer for centering */}
      </div>

      {/* Sandbox */}
      <div className="flex-1 overflow-hidden">
        <Sandbox
          files={files}
          onRun={handleRun}
          showPreview={true}
          showTerminal={true}
        />
      </div>
    </div>
  );
}
