"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Loader2, Sparkles } from "lucide-react";
import ToolExecutionPanel, { ToolExecution } from "@/components/tool-execution-panel";
import SandboxWindow from "@/components/sandbox-window";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface StatusUpdate {
  type: 'status' | 'text' | 'tool';
  content?: string;
  toolName?: string;
  status?: 'start' | 'complete' | 'error';
  result?: any;
}

export default function HollyChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>("");
  const [streamingMessage, setStreamingMessage] = useState("");
  const [toolExecutions, setToolExecutions] = useState<ToolExecution[]>([]);
  const [sandboxOpen, setSandboxOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  // Handle message send
  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const messageText = input.trim();
    setInput("");
    setIsProcessing(true);
    setStreamingMessage("");
    setCurrentStatus("");
    setToolExecutions([]);

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      // Call streaming API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          conversationId: `conv-${Date.now()}`
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let assistantMessage = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: StatusUpdate = JSON.parse(line.slice(6));

              if (data.type === 'status') {
                // Update status
                setCurrentStatus(data.content || '');
              } else if (data.type === 'text') {
                // Append text to streaming message
                assistantMessage += data.content || '';
                setStreamingMessage(assistantMessage);
              } else if (data.type === 'tool') {
                // Add/update tool execution
                const execution: ToolExecution = {
                  id: `${data.toolName}-${Date.now()}`,
                  toolName: data.toolName || '',
                  status: data.status || 'start',
                  result: data.result,
                  timestamp: new Date(),
                };

                setToolExecutions((prev) => {
                  // Update existing or add new
                  const existing = prev.findIndex(
                    (e) => e.toolName === execution.toolName && e.status === 'start'
                  );
                  if (existing >= 0 && execution.status !== 'start') {
                    const updated = [...prev];
                    updated[existing] = execution;
                    return updated;
                  }
                  return [...prev, execution];
                });

                // Open sandbox if tool is executed
                if (data.status === 'start') {
                  setSandboxOpen(true);
                }
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }

      // Add final assistant message
      if (assistantMessage) {
        const finalMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: assistantMessage,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, finalMessage]);
      }

      setStreamingMessage("");
      setCurrentStatus("");
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request aborted');
      } else {
        console.error("Failed to send message:", error);
        setCurrentStatus(`❌ Error: ${error.message}`);
      }
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h1 className="text-lg font-semibold text-white">HOLLY</h1>
          <span className="text-xs text-gray-400">AI Development Partner</span>
        </div>
        
        {isProcessing && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Working...</span>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.role === "user"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-800 text-gray-100"
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <span className="text-xs opacity-70 mt-2 block">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}

        {/* Streaming Message */}
        {streamingMessage && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg p-4 bg-gray-800 text-gray-100">
              <p className="whitespace-pre-wrap">{streamingMessage}</p>
              <Loader2 className="w-4 h-4 animate-spin mt-2 text-purple-400" />
            </div>
          </div>
        )}

        {/* Tool Execution Panel */}
        {toolExecutions.length > 0 && (
          <ToolExecutionPanel executions={toolExecutions} />
        )}

        {/* Status Update */}
        {currentStatus && (
          <div className="flex justify-center">
            <div className="px-4 py-2 bg-gray-800 rounded-full text-sm text-gray-300 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
              {currentStatus}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Sandbox Window */}
      {sandboxOpen && (
        <div className="border-t border-gray-800">
          <SandboxWindow
            isOpen={sandboxOpen}
            onClose={() => setSandboxOpen(false)}
            currentAction={currentStatus}
            terminalOutput={toolExecutions.map(e => ({
              type: e.status === 'error' ? 'stderr' : 'stdout',
              content: JSON.stringify(e.result, null, 2),
              timestamp: e.timestamp.getTime()
            }))}
          />
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-800 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask HOLLY anything..."
            disabled={isProcessing}
            className="flex-1 bg-gray-900 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={isProcessing || !input.trim()}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg px-6 py-3 flex items-center gap-2 transition-colors"
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
