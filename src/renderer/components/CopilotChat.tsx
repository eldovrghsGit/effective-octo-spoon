/**
 * Copilot Chat Component
 * 
 * AI assistant chat interface integrated with GitHub Copilot SDK.
 * Allows users to ask questions about their tasks, habits, and productivity.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, X, Minimize2, Maximize2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface CopilotChatProps {
  isOpen: boolean;
  onClose: () => void;
}

declare global {
  interface Window {
    electronAPI: {
      copilot: {
        init: () => Promise<{ isConnected: boolean; isInitialized: boolean; error?: string }>;
        send: (prompt: string) => Promise<{ success: boolean; response?: string; error?: string }>;
        status: () => Promise<{ isConnected: boolean; isInitialized: boolean; error?: string }>;
        stop: () => Promise<{ success: boolean }>;
        onDelta: (callback: (delta: string) => void) => () => void;
      };
    };
  }
}

export default function CopilotChat({ isOpen, onClose }: CopilotChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Initialize Copilot when component opens
  useEffect(() => {
    if (isOpen && !isInitialized) {
      initializeCopilot();
    }
  }, [isOpen]);

  // Setup streaming listener
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = window.electronAPI.copilot.onDelta((delta: string) => {
      setStreamingContent(prev => prev + delta);
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  const initializeCopilot = async () => {
    try {
      setError(null);
      const status = await window.electronAPI.copilot.init();
      
      if (status.error) {
        setError(status.error);
        setIsInitialized(false);
      } else {
        setIsInitialized(true);
        // Add welcome message
        setMessages([{
          role: 'assistant',
          content: '👋 Hi! I\'m your AI productivity assistant. I can help you with:\n\n• Managing your tasks and priorities\n• Tracking habits and streaks\n• Analyzing your productivity\n• Quick journaling tips\n\nWhat would you like to know?',
          timestamp: new Date(),
        }]);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to initialize Copilot';
      setError(errorMsg);
      setIsInitialized(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setStreamingContent('');
    setError(null);

    try {
      const result = await window.electronAPI.copilot.send(userMessage.content);

      if (result.success && result.response) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: result.response,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
      setStreamingContent('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div 
        className={`bg-slate-800 rounded-lg shadow-2xl border border-slate-700 flex flex-col transition-all duration-300 ${
          isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-900 rounded-t-lg">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-white">AI Assistant</h3>
            {isInitialized && (
              <span className="w-2 h-2 bg-green-500 rounded-full" title="Connected"></span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!isInitialized && !error && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">Initializing AI Assistant...</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                  <p className="text-red-400 text-sm font-semibold mb-2">
                    ⚠️ Copilot Not Available
                  </p>
                  <p className="text-red-300 text-xs mb-3">{error}</p>
                  
                  <div className="bg-slate-800 rounded p-3 text-xs text-slate-300 space-y-2">
                    <p className="font-semibold text-white">Setup Required:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Install GitHub CLI: <code className="bg-slate-900 px-1 rounded">winget install GitHub.cli</code></li>
                      <li>Add to PATH: <code className="bg-slate-900 px-1 rounded">C:\Program Files\GitHub CLI</code></li>
                      <li>Authenticate: <code className="bg-slate-900 px-1 rounded">gh auth login</code></li>
                      <li>Install Copilot: <code className="bg-slate-900 px-1 rounded">gh extension install github/gh-copilot</code></li>
                      <li>Restart the app</li>
                    </ol>
                    <p className="text-xs text-slate-400 mt-2">Requires GitHub Copilot subscription</p>
                  </div>
                  
                  <button
                    onClick={initializeCopilot}
                    className="text-blue-400 hover:text-blue-300 text-sm mt-3 underline"
                  >
                    Try again after setup
                  </button>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    msg.role === 'user' ? 'bg-blue-600' : 'bg-slate-700'
                  }`}>
                    {msg.role === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                  <div className={`flex-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                    <div className={`inline-block max-w-[85%] rounded-lg p-3 ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-700 text-slate-100'
                    }`}>
                      <div className="prose prose-invert prose-sm max-w-none">
                        {msg.content.split('\n').map((line, i) => (
                          <p key={i} className="mb-1 last:mb-0">{line}</p>
                        ))}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {msg.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}

              {/* Streaming indicator */}
              {isLoading && streamingContent && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="inline-block max-w-[85%] rounded-lg p-3 bg-slate-700 text-slate-100">
                      <div className="prose prose-invert prose-sm max-w-none">
                        {streamingContent}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading indicator */}
              {isLoading && !streamingContent && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="inline-block rounded-lg p-3 bg-slate-700">
                      <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-700 bg-slate-900 rounded-b-lg">
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about your tasks, habits, or productivity..."
                  className="flex-1 bg-slate-800 text-white placeholder-slate-500 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                  disabled={!isInitialized || isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || !isInitialized || isLoading}
                  className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
