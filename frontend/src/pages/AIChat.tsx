import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Bot, User, Wifi, WifiOff, Trash2,
  BarChart3, Brain, MessageCircle, Loader2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api } from '../api/client';
import { useTranslation } from '../i18n/t';
import type { ChatMessage as ChatMsg } from '../types';

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  streaming?: boolean;
}

export default function AIChat() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<{ status: string; model: string } | null>(null);
  const [activeMode, setActiveMode] = useState<'chat' | 'report' | 'analysis'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    checkOllamaHealth();
    loadHistory();
  }, []);

  const checkOllamaHealth = async () => {
    try {
      const h = await api.aiHealth();
      setHealth(h);
    } catch {
      setHealth({ status: 'disconnected', model: 'phi3.5' });
    }
  };

  const loadHistory = async () => {
    try {
      const res = await api.aiHistory(30);
      const entries = res.entries || [];
      const loaded: DisplayMessage[] = [];
      for (const e of entries.reverse()) {
        loaded.push({
          id: e.id + '-user',
          role: 'user',
          content: e.user_message,
          timestamp: e.timestamp,
        });
        loaded.push({
          id: e.id + '-assistant',
          role: 'assistant',
          content: e.assistant_response,
          timestamp: e.timestamp,
        });
      }
      setMessages(loaded);
    } catch {
      // ignore
    }
  };

  const sendMessage = async (text?: string, mode?: 'chat' | 'report' | 'analysis') => {
    const msg = text || input.trim();
    const currentMode = mode || activeMode;
    if (!msg || loading) return;

    const userMsg: DisplayMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: msg,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const aiMsgId = Date.now().toString() + '-ai-streaming';
    const aiMsg: DisplayMessage = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      streaming: true,
    };
    setMessages((prev) => [...prev, aiMsg]);

    const apiMessages: ChatMsg[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    apiMessages.push({ role: 'user', content: msg });

    api.aiChatStream(
      apiMessages,
      currentMode,
      (chunk) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? { ...m, content: m.content + chunk }
              : m
          )
        );
      },
      (timestamp) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? { ...m, streaming: false, timestamp }
              : m
          )
        );
        setLoading(false);
        inputRef.current?.focus();
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearHistory = async () => {
    try {
      await api.aiClearHistory();
      setMessages([]);
    } catch {}
  };

  const healthColor = health?.status === 'connected'
    ? 'text-green-400'
    : health?.status === 'model_not_found'
    ? 'text-amber-400'
    : 'text-red-400';

  const healthIcon = health?.status === 'connected'
    ? <Wifi size={14} />
    : <WifiOff size={14} />;

  const healthLabel = health?.status === 'connected'
    ? t('ai.connected')
    : health?.status === 'model_not_found'
    ? t('ai.modelNotFound')
    : t('ai.disconnected');

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] md:h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bot size={20} className="text-cosmic-cyan" />
          <span className={`flex items-center gap-1 text-xs ${healthColor}`}>
            {healthIcon}
            {healthLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white/5 rounded-lg p-0.5">
            {[
              { mode: 'chat' as const, icon: <MessageCircle size={14} />, label: t('ai.chatBtn') },
              { mode: 'report' as const, icon: <BarChart3 size={14} />, label: t('ai.reportBtn') },
              { mode: 'analysis' as const, icon: <Brain size={14} />, label: t('ai.analysisBtn') },
            ].map((item) => (
              <button
                key={item.mode}
                onClick={() => setActiveMode(item.mode)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${
                  activeMode === item.mode
                    ? 'bg-cosmic-cyan/20 text-cosmic-cyan'
                    : 'text-navy-300 hover:text-white'
                }`}
              >
                {item.icon}
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={clearHistory}
            className="p-1.5 rounded-lg hover:bg-white/5 text-navy-300 hover:text-red-400 transition-all"
            title={t('ai.clearHistory')}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <Bot size={48} className="text-cosmic-cyan/30 mb-4" />
            <p className="text-navy-300 text-sm max-w-md">{t('ai.welcome')}</p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => sendMessage(t('ai.reportPrompt'), 'report')}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-navy-200 text-xs transition-all"
              >
                {t('ai.reportBtn')}
              </button>
              <button
                onClick={() => sendMessage(t('ai.analysisPrompt'), 'analysis')}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-navy-200 text-xs transition-all"
              >
                {t('ai.analysisBtn')}
              </button>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-cosmic-cyan/10 flex items-center justify-center shrink-0 mt-1">
                  {msg.streaming ? (
                    <Loader2 size={14} className="text-cosmic-cyan animate-spin" />
                  ) : (
                    <Bot size={14} className="text-cosmic-cyan" />
                  )}
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-cosmic-cyan/15 text-white'
                    : 'glass-card text-navy-100'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                    {msg.streaming && (
                      <span className="inline-block w-1.5 h-4 bg-cosmic-cyan/60 animate-pulse ml-0.5" />
                    )}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-1">
                  <User size={14} className="text-navy-200" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="mt-3 flex gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('ai.chatPlaceholder')}
          rows={1}
          disabled={loading}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-navy-300/50 resize-none focus:outline-none focus:border-cosmic-cyan/50 transition-all disabled:opacity-50"
        />
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          className="px-3 py-2 rounded-xl bg-cosmic-cyan/20 hover:bg-cosmic-cyan/30 text-cosmic-cyan disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
