/**
 * Copilot Chat Component
 *
 * AI assistant chat interface powered by @github/copilot-sdk.
 * Theme-aware, supports streaming, settings, and quick-action chips.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Bot, User, Loader2, X, Minimize2, Maximize2,
  Settings, Sparkles, ListTodo, BarChart3, Calendar, Brain,
  RefreshCw,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface CopilotChatProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SafeSettings {
  provider: string;
  model: string;
  baseUrl?: string;
  hasApiKey: boolean;
  hasGithubToken: boolean;
}

declare global {
  interface Window {
    electronAPI: {
      copilot: {
        init: () => Promise<{ isConnected: boolean; isInitialized: boolean; model?: string; error?: string }>;
        send: (prompt: string) => Promise<{ success: boolean; response?: string; error?: string }>;
        generateContent: (prompt: string) => Promise<{ success: boolean; content?: string; error?: string }>;
        status: () => Promise<{ isConnected: boolean; isInitialized: boolean; error?: string }>;
        stop: () => Promise<{ success: boolean }>;
        getSettings: () => Promise<SafeSettings>;
        updateSettings: (s: any) => Promise<{ isConnected: boolean; isInitialized: boolean; error?: string }>;
        onDelta: (callback: (delta: string) => void) => () => void;
        onInlineDelta: (callback: (delta: string) => void) => () => void;
      };
      [key: string]: any;
    };
  }
}

// Quick-action chips shown above the input
const QUICK_ACTIONS = [
  { label: 'My tasks', prompt: 'Show my pending tasks grouped by priority', icon: ListTodo },
  { label: 'Productivity', prompt: 'Give me a productivity summary for the last 7 days', icon: BarChart3 },
  { label: 'Plan today', prompt: 'What should I work on today? Check my tasks, due dates, and suggest a focus plan.', icon: Calendar },
  { label: 'Plan week', prompt: 'Help me plan my week. Look at my tasks, habits, and suggest goals.', icon: Brain },
];

export default function CopilotChat({ isOpen, onClose }: CopilotChatProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [modelName, setModelName] = useState('');

  // Settings form
  const [settingsForm, setSettingsForm] = useState({
    provider: 'github',
    model: 'gpt-4o',
    apiKey: '',
    baseUrl: '',
    githubToken: '',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Theme styles
  const s = {
    panel:     isDark ? 'bg-[#16162a]'               : 'bg-white',
    panelAlt:  isDark ? 'bg-[#1a1a30]'               : 'bg-gray-50',
    card:      isDark ? 'bg-white/[0.04]'            : 'bg-gray-50',
    border:    isDark ? 'border-white/[0.06]'        : 'border-gray-200',
    text:      isDark ? 'text-slate-100'              : 'text-gray-900',
    textMuted: isDark ? 'text-slate-400'              : 'text-gray-500',
    textDim:   isDark ? 'text-slate-500'              : 'text-gray-400',
    hover:     isDark ? 'hover:bg-white/[0.06]'      : 'hover:bg-gray-100',
    input:     isDark ? 'bg-white/[0.05] border-white/[0.08] text-slate-200 placeholder-slate-500'
                      : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400',
    userBubble:     'bg-violet-600 text-white',
    assistBubble:   isDark ? 'bg-white/[0.06] text-slate-100' : 'bg-gray-100 text-gray-900',
    chip:      isDark ? 'bg-white/[0.06] hover:bg-white/[0.10] text-slate-300'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700',
  };

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Init on open
  useEffect(() => {
    if (isOpen && !isInitialized && !isInitializing) {
      initializeCopilot();
    }
  }, [isOpen]);

  // Streaming listener
  useEffect(() => {
    if (!isOpen) return;
    const unsub = window.electronAPI.copilot.onDelta((delta: string) => {
      setStreamingContent(prev => prev + delta);
    });
    return () => { unsub(); };
  }, [isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen && !isMinimized && isInitialized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized, isInitialized]);

  const initializeCopilot = async () => {
    try {
      setIsInitializing(true);
      setError(null);
      const status = await window.electronAPI.copilot.init();

      if (status.error) {
        setError(status.error);
        setIsInitialized(false);
      } else {
        setIsInitialized(true);
        setModelName(status.model || '');
        setMessages([{
          role: 'assistant',
          content: `Hey! I'm your AI productivity assistant powered by **GitHub Copilot**.\n\nI can access your tasks, habits, journal, notes, and time-tracking data. Try asking me:\n\n- "What should I work on today?"\n- "Show my pending tasks"\n- "Create a task: Review PR #42"\n- "Give me a productivity summary"\n- "Plan my week"\n\nOr use the quick actions below!`,
          timestamp: new Date(),
        }]);
      }

      // Load settings for the form
      try {
        const settings = await window.electronAPI.copilot.getSettings();
        setSettingsForm(prev => ({
          ...prev,
          provider: settings.provider || 'github',
          model: settings.model || 'gpt-4o',
          baseUrl: settings.baseUrl || '',
        }));
      } catch { /* ignore */ }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize Copilot';
      setError(msg);
      setIsInitialized(false);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSend = useCallback(async (overridePrompt?: string) => {
    const text = overridePrompt || input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    if (!overridePrompt) setInput('');
    setIsLoading(true);
    setStreamingContent('');
    setError(null);

    try {
      const result = await window.electronAPI.copilot.send(text);

      if (result.success && result.response) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: result.response!,
          timestamp: new Date(),
        }]);
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
      setStreamingContent('');
    }
  }, [input, isLoading]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSaveSettings = async () => {
    const payload: any = {
      provider: settingsForm.provider,
      model: settingsForm.model,
    };
    if (settingsForm.baseUrl) payload.baseUrl = settingsForm.baseUrl;
    if (settingsForm.apiKey) payload.apiKey = settingsForm.apiKey;
    if (settingsForm.githubToken) payload.githubToken = settingsForm.githubToken;

    setIsInitializing(true);
    try {
      const status = await window.electronAPI.copilot.updateSettings(payload);
      if (status.error) {
        setError(status.error);
        setIsInitialized(false);
      } else {
        setIsInitialized(true);
        setError(null);
        setShowSettings(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Settings update failed');
    } finally {
      setIsInitializing(false);
    }
  };

  if (!isOpen) return null;

  // ────────── Render ──────────
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={`${s.panel} rounded-xl shadow-2xl border ${s.border} flex flex-col transition-all duration-300 ${
          isMinimized ? 'w-80 h-14' : 'w-[420px] h-[620px]'
        }`}
      >
        {/* ─── Header ─── */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${s.border} ${s.panelAlt} rounded-t-xl`}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className={`text-sm font-semibold ${s.text}`}>AI Assistant</h3>
              {modelName && !isMinimized && (
                <p className={`text-[10px] ${s.textDim}`}>{modelName}</p>
              )}
            </div>
            {isInitialized && (
              <span className="w-2 h-2 bg-emerald-500 rounded-full ml-1" title="Connected" />
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1.5 rounded-lg transition-colors ${s.hover} ${s.textMuted}`}
              title="Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className={`p-1.5 rounded-lg transition-colors ${s.hover} ${s.textMuted}`}
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ${s.hover} ${s.textMuted}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* ─── Settings panel ─── */}
            {showSettings && (
              <div className={`p-4 border-b ${s.border} space-y-3`}>
                <h4 className={`text-xs font-semibold uppercase tracking-wider ${s.textMuted}`}>
                  Copilot Settings
                </h4>

                <div className="space-y-2">
                  <label className={`block text-xs ${s.textMuted}`}>Provider</label>
                  <select
                    value={settingsForm.provider}
                    onChange={e => setSettingsForm(p => ({ ...p, provider: e.target.value }))}
                    className={`w-full text-sm rounded-lg px-3 py-1.5 border ${s.input} outline-none`}
                  >
                    <option value="github">GitHub Copilot (default)</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="azure">Azure OpenAI</option>
                    <option value="ollama">Ollama (local)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className={`block text-xs ${s.textMuted}`}>Model</label>
                  <input
                    value={settingsForm.model}
                    onChange={e => setSettingsForm(p => ({ ...p, model: e.target.value }))}
                    placeholder="gpt-4o"
                    className={`w-full text-sm rounded-lg px-3 py-1.5 border ${s.input} outline-none`}
                  />
                </div>

                {settingsForm.provider !== 'github' && (
                  <>
                    <div className="space-y-2">
                      <label className={`block text-xs ${s.textMuted}`}>Base URL</label>
                      <input
                        value={settingsForm.baseUrl}
                        onChange={e => setSettingsForm(p => ({ ...p, baseUrl: e.target.value }))}
                        placeholder={settingsForm.provider === 'ollama' ? 'http://localhost:11434/v1' : 'https://api.openai.com/v1'}
                        className={`w-full text-sm rounded-lg px-3 py-1.5 border ${s.input} outline-none`}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={`block text-xs ${s.textMuted}`}>API Key</label>
                      <input
                        type="password"
                        value={settingsForm.apiKey}
                        onChange={e => setSettingsForm(p => ({ ...p, apiKey: e.target.value }))}
                        placeholder="sk-..."
                        className={`w-full text-sm rounded-lg px-3 py-1.5 border ${s.input} outline-none`}
                      />
                    </div>
                  </>
                )}

                {settingsForm.provider === 'github' && (
                  <div className="space-y-2">
                    <label className={`block text-xs ${s.textMuted}`}>GitHub Token (optional)</label>
                    <input
                      type="password"
                      value={settingsForm.githubToken}
                      onChange={e => setSettingsForm(p => ({ ...p, githubToken: e.target.value }))}
                      placeholder="Uses logged-in gh CLI user by default"
                      className={`w-full text-sm rounded-lg px-3 py-1.5 border ${s.input} outline-none`}
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSaveSettings}
                    disabled={isInitializing}
                    className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors disabled:opacity-50"
                  >
                    {isInitializing ? 'Connecting...' : 'Save & Connect'}
                  </button>
                  <button
                    onClick={() => setShowSettings(false)}
                    className={`text-xs px-3 py-1.5 rounded-lg ${s.chip} transition-colors`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* ─── Messages ─── */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {/* Initializing state */}
              {isInitializing && !isInitialized && !error && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Loader2 className="w-7 h-7 text-violet-500 animate-spin mx-auto mb-2" />
                    <p className={`text-sm ${s.textMuted}`}>Connecting to Copilot...</p>
                  </div>
                </div>
              )}

              {/* Error state */}
              {error && (
                <div className={`rounded-lg p-4 border ${isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
                  <p className={`text-sm font-semibold mb-1 ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                    Connection Issue
                  </p>
                  <p className={`text-xs mb-3 ${isDark ? 'text-red-300/80' : 'text-red-600'}`}>{error}</p>

                  <div className={`rounded-lg p-3 text-xs space-y-2 ${s.card}`}>
                    <p className={`font-semibold ${s.text}`}>Setup:</p>
                    <ol className={`list-decimal list-inside space-y-1 ${s.textMuted}`}>
                      <li>Install GitHub CLI: <code className={`${isDark ? 'bg-white/10' : 'bg-gray-200'} px-1 rounded`}>gh auth login</code></li>
                      <li>Install Copilot: <code className={`${isDark ? 'bg-white/10' : 'bg-gray-200'} px-1 rounded`}>gh extension install github/gh-copilot</code></li>
                      <li>Or configure a custom provider in Settings above</li>
                    </ol>
                  </div>

                  <button
                    onClick={initializeCopilot}
                    className="flex items-center gap-1.5 text-violet-500 hover:text-violet-400 text-xs mt-3 font-medium"
                  >
                    <RefreshCw className="w-3 h-3" /> Retry connection
                  </button>
                </div>
              )}

              {/* Message list */}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
                    msg.role === 'user'
                      ? 'bg-violet-600'
                      : isDark ? 'bg-white/[0.06]' : 'bg-gray-100'
                  }`}>
                    {msg.role === 'user'
                      ? <User className="w-3.5 h-3.5 text-white" />
                      : <Sparkles className={`w-3.5 h-3.5 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
                    }
                  </div>
                  <div className={`flex-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                    <div className={`inline-block max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user' ? s.userBubble : s.assistBubble
                    }`}>
                      <div className="prose prose-sm max-w-none [&_p]:mb-1 [&_p:last-child]:mb-0 [&_ul]:mt-1 [&_ol]:mt-1 [&_li]:mb-0.5">
                        {msg.content.split('\n').map((line, i) => {
                          // Basic markdown-ish rendering
                          const formatted = line
                            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                            .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 rounded text-xs ' + (isDark ? 'bg-white/10' : 'bg-gray-200') + '">$1</code>');
                          return <p key={i} className="mb-1 last:mb-0" dangerouslySetInnerHTML={{ __html: formatted }} />;
                        })}
                      </div>
                    </div>
                    <div className={`text-[10px] ${s.textDim} mt-0.5 px-1`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}

              {/* Streaming bubble */}
              {isLoading && streamingContent && (
                <div className="flex gap-2.5">
                  <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? 'bg-white/[0.06]' : 'bg-gray-100'}`}>
                    <Sparkles className={`w-3.5 h-3.5 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
                  </div>
                  <div className={`inline-block max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${s.assistBubble}`}>
                    {streamingContent.split('\n').map((line, i) => {
                      const formatted = line
                        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                        .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 rounded text-xs ' + (isDark ? 'bg-white/10' : 'bg-gray-200') + '">$1</code>');
                      return <p key={i} className="mb-1 last:mb-0" dangerouslySetInnerHTML={{ __html: formatted }} />;
                    })}
                    <span className="inline-block w-1.5 h-4 bg-violet-500 animate-pulse rounded-sm ml-0.5 align-middle" />
                  </div>
                </div>
              )}

              {/* Loading dots */}
              {isLoading && !streamingContent && (
                <div className="flex gap-2.5">
                  <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? 'bg-white/[0.06]' : 'bg-gray-100'}`}>
                    <Sparkles className={`w-3.5 h-3.5 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
                  </div>
                  <div className={`rounded-xl px-3.5 py-2.5 ${s.assistBubble}`}>
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ─── Quick actions ─── */}
            {isInitialized && messages.length <= 1 && !isLoading && (
              <div className={`px-4 pb-2 flex flex-wrap gap-1.5`}>
                {QUICK_ACTIONS.map(action => (
                  <button
                    key={action.label}
                    onClick={() => handleSend(action.prompt)}
                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${s.chip}`}
                  >
                    <action.icon className="w-3 h-3" />
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            {/* ─── Input ─── */}
            <div className={`px-3 py-3 border-t ${s.border}`}>
              <div className={`flex gap-2 items-end rounded-xl border px-3 py-2 ${s.input} focus-within:ring-2 focus-within:ring-violet-500/30 transition-all`}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={isInitialized ? 'Ask anything about your tasks, habits, or productivity...' : 'Connecting...'}
                  className="flex-1 bg-transparent text-sm outline-none resize-none min-h-[36px] max-h-[100px]"
                  rows={1}
                  disabled={!isInitialized || isLoading}
                  style={{ height: 'auto', overflow: 'hidden' }}
                  onInput={e => {
                    const el = e.target as HTMLTextAreaElement;
                    el.style.height = 'auto';
                    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
                  }}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || !isInitialized || isLoading}
                  className="flex-shrink-0 w-8 h-8 rounded-lg bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isLoading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Send className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
