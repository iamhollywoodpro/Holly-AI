/**
 * TerminalWindow - Terminal window content
 */

'use client';

import { useState, useRef, useEffect } from 'react';

export interface TerminalWindowProps {
  windowId: string;
}

export default function TerminalWindow({ windowId }: TerminalWindowProps) {
  const [output, setOutput] = useState<string[]>([
    'Holly AI Terminal v1.0.0',
    'Type "help" for available commands',
    '',
  ]);
  const [input, setInput] = useState('');
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    setOutput(prev => [...prev, `$ ${trimmed}`]);

    // Simple command handling
    switch (trimmed.toLowerCase()) {
      case 'help':
        setOutput(prev => [...prev, 
          'Available commands:',
          '  help    - Show this help message',
          '  clear   - Clear terminal',
          '  status  - Show Holly status',
          '  version - Show version',
          ''
        ]);
        break;
      
      case 'clear':
        setOutput([]);
        break;
      
      case 'status':
        setOutput(prev => [...prev, 
          'Holly AI Status: Online',
          'Autonomous Mode: Active',
          'Memory: 87% available',
          ''
        ]);
        break;
      
      case 'version':
        setOutput(prev => [...prev, 'Holly AI v1.0.0', '']);
        break;
      
      default:
        setOutput(prev => [...prev, `Command not found: ${trimmed}`, '']);
    }

    setInput('');
  };

  return (
    <div className="h-full flex flex-col bg-black text-green-400 font-mono text-sm">
      <div 
        ref={outputRef}
        className="flex-1 overflow-auto p-4 space-y-1"
      >
        {output.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>

      <div className="flex items-center px-4 py-2 border-t border-gray-700">
        <span className="mr-2">$</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleCommand(input);
            }
          }}
          className="flex-1 bg-transparent outline-none"
          placeholder="Enter command..."
          autoFocus
        />
      </div>
    </div>
  );
}
