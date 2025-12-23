"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, VolumeX, Send, Loader2 } from "lucide-react";
import SandboxWindow from "./sandbox-window";
import ToolVisualizer from "./tool-visualizer";
import type { ChatMessage } from "@/lib/voice/bidirectional-controller";
import type { ToolCall } from "./tool-visualizer";
import type { SandboxOutput } from "./sandbox-window";

export default function EnhancedChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [autoPlayVoice, setAutoPlayVoice] = useState(false);
  
  // Sandbox state
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [sandboxAction, setSandboxAction] = useState<string>();
  const [terminalOutput, setTerminalOutput] = useState<SandboxOutput[]>([]);
  
  // Tool state
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  
  // Streaming state
  const [streamingMessage, setStreamingMessage] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  // Handle voice input
  const startListening = async () => {
    try {
      setIsListening(true);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Use Web Speech API for speech-to-text
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        
        // Auto-send if voice input
        handleSend(transcript, "voice");
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (error) {
      console.error("Failed to start listening:", error);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    setIsListening(false);
  };

  // Handle message send
  const handleSend = async (text?: string, inputMode: "text" | "voice" = "text") => {
    const messageText = text || input;
    if (!messageText.trim() || isProcessing) return;

    setInput("");
    setIsProcessing(true);

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
      inputMode,
      outputMode: "text",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Determine if voice should auto-play
    const shouldAutoPlay = inputMode === "voice" && autoPlayVoice;

    try {
      // Call API to get response
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          voiceEnabled,
          autoPlayVoice: shouldAutoPlay,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      // Process streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === "content") {
                  accumulatedText += data.content;
                  setStreamingMessage(accumulatedText);
                } else if (data.type === "tool_start") {
                  // Show sandbox window
                  setSandboxOpen(true);
                  setSandboxAction(data.toolName);
                  
                  // Add tool call
                  setToolCalls((prev) => [
                    ...prev,
                    {
                      id: data.toolName + Date.now(),
                      name: data.toolName,
                      args: data.toolArgs,
                      status: "running",
                      startTime: Date.now(),
                    },
                  ]);
                } else if (data.type === "tool_result") {
                  // Update tool call
                  setToolCalls((prev) =>
                    prev.map((tool) =>
                      tool.status === "running"
                        ? {
                            ...tool,
                            status: "success",
                            result: data.toolResult,
                            endTime: Date.now(),
                          }
                        : tool
                    )
                  );
                } else if (data.type === "done") {
                  // Finalize message
                  const assistantMessage: ChatMessage = {
                    id: `assistant-${Date.now()}`,
                    role: "assistant",
                    content: accumulatedText,
                    inputMode: "text",
                    outputMode: shouldAutoPlay ? "voice" : "both",
                    audioUrl: data.audioUrl,
                    timestamp: new Date(),
                  };

                  setMessages((prev) => [...prev, assistantMessage]);
                  setStreamingMessage("");

                  // Auto-play voice if requested
                  if (shouldAutoPlay && data.audioUrl && audioRef.current) {
                    audioRef.current.src = data.audioUrl;
                    audioRef.current.play();
                  }
                }
              } catch (e) {
                // Ignore JSON parse errors
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          inputMode: "text",
          outputMode: "text",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Play audio for a message
  const playAudio = (audioUrl: string) => {
    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">HOLLY AI</h1>
          <p className="text-sm text-gray-500">Your Creative AI Assistant</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setAutoPlayVoice(!autoPlayVoice)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              autoPlayVoice
                ? "bg-purple-100 text-purple-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {autoPlayVoice ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="text-sm">Auto-play Voice</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`mb-4 flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[70%] rounded-lg px-4 py-3 ${
                message.role === "user"
                  ? "bg-purple-600 text-white"
                  : "bg-white text-gray-900 border border-gray-200"
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              
              {/* Voice button for assistant messages */}
              {message.role === "assistant" && message.audioUrl && (
                <button
                  onClick={() => playAudio(message.audioUrl!)}
                  className="mt-2 flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700"
                >
                  <Volume2 className="w-3 h-3" />
                  Play Voice
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Streaming message */}
        {streamingMessage && (
          <div className="mb-4 flex justify-start">
            <div className="max-w-[70%] rounded-lg px-4 py-3 bg-white text-gray-900 border border-gray-200">
              <div className="whitespace-pre-wrap">{streamingMessage}</div>
              <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                HOLLY is typing...
              </div>
            </div>
          </div>
        )}

        {/* Tool visualizer */}
        {toolCalls.length > 0 && <ToolVisualizer toolCalls={toolCalls} />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 bg-white border-t">
        <div className="flex items-center gap-2">
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing}
            className={`p-3 rounded-lg ${
              isListening
                ? "bg-red-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            } disabled:opacity-50`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message or click the mic to speak..."
            disabled={isProcessing || isListening}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          />

          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isProcessing}
            className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Sandbox Window */}
      <SandboxWindow
        isOpen={sandboxOpen}
        onClose={() => setSandboxOpen(false)}
        currentAction={sandboxAction}
        terminalOutput={terminalOutput}
      />

      {/* Hidden audio element */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
