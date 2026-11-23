import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Trash2, Zap, Sparkles } from 'lucide-react';
import { useLocation } from 'react-router';
import { apiFetch } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export default function DawahChatbot() {
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [modelMode, setModelMode] = useState<'standard' | 'fast'>('standard');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: isAdmin
        ? 'আসসালামু আলাইকুম! আমি কোটবাড়ি দাওয়াহ সহায়ক। সদস্যদের ফলো-আপ পরিকল্পনা, দাওয়াতি কথোপকথন বা ১৬টি স্টেজ সম্পর্কে আমাকে যেকোনো প্রশ্ন করতে পারেন।'
        : 'আসসালামু আলাইকুম! আমি আপনার ব্যক্তিগত আমল ও দাওয়াহ সহায়ক। সালাহ, কুরআন ও দ্বীনি অগ্রগতি নিয়ে যেকোনো পরামর্শের জন্য লিখুন।',
    },
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  useEffect(() => {
    const handleOpenEvent = () => setIsOpen(true);
    window.addEventListener('open-dawah-chatbot', handleOpenEvent);
    return () => window.removeEventListener('open-dawah-chatbot', handleOpenEvent);
  }, []);

  if (!user) return null;

  // Detect if currently viewing a contact profile to provide optional context
  const contactMatch = location.pathname.match(/^\/contacts\/([a-f0-9-]+)$/i);
  const activeContactId = contactMatch ? contactMatch[1] : undefined;

  const quickPrompts = isAdmin
    ? [
        'ফজরের সালাতে উৎসাহিত করার বিনয়ী উপায় বলুন',
        'অনুপস্থিত ভাইদের সাথে ফলো-আপের জন্য একটি সুন্দর বাংলা মেসেজ লিখে দিন',
        'ইলমি মুহাজারায় দাওয়াত দেওয়ার কৌশল কী হতে পারে?',
      ]
    : [
        '৫ ওয়াক্ত সালাহ জামাতে আদায়ের ধারাবাহিকতা কীভাবে ধরে রাখব?',
        'দৈনিক কুরআন ও দ্বীনি শিক্ষার সহজ রুটিন দিন',
      ];

  const sendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    if (!textOverride) setInput('');
    setLoading(true);

    try {
      const historyPayload = nextMessages
        .filter((m) => m.id !== 'welcome')
        .slice(0, -1)
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await apiFetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
          modelMode,
          contactId: activeContactId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'উত্তর পাওয়া যায়নি');

      setMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          role: 'model',
          text: data.reply,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          text: `দুঃখিত: ${err.message || 'সার্ভারের সাথে সংযোগে সমস্যা হয়েছে।'}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'model',
        text: isAdmin
          ? 'নতুন কথোপকথন শুরু হয়েছে। দাওয়াহ পরিকল্পনা বা সদস্য পরিচর্যা বিষয়ে প্রশ্ন করুন।'
          : 'নতুন কথোপকথন শুরু হয়েছে। আপনার আমল ও দ্বীনি উন্নতি বিষয়ে প্রশ্ন করুন।',
      },
    ]);
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {isOpen ? (
        <div className="w-[calc(100vw-2rem)] sm:w-96 h-[520px] max-h-[80vh] glass-modal rounded-[22px] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-white/10 bg-black/25 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#EDF4F0] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#34D399] shrink-0" />
                <span className="truncate">দাওয়াহ AI সহায়ক</span>
              </div>
              <div className="text-[11px] text-[#8EA39A] truncate">
                {modelMode === 'fast' ? 'দ্রুত মোড (Flash Lite)' : 'গভীর পরামর্শ মোড (Hydrogen)'}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setModelMode((m) => (m === 'standard' ? 'fast' : 'standard'))}
                className="px-2.5 py-1 rounded-lg border border-white/15 bg-white/[0.04] text-[11px] text-[#EDF4F0] hover:bg-white/10 flex items-center gap-1 transition-colors"
                title="Switch response speed"
              >
                <Zap className="w-3 h-3 text-[#34D399]" />
                {modelMode === 'fast' ? 'Fast' : 'Deep'}
              </button>
              <button
                type="button"
                onClick={clearHistory}
                className="p-1.5 text-[#8EA39A] hover:text-[#EDF4F0] rounded-lg hover:bg-white/10 transition-colors"
                title="Clear conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-[#8EA39A] hover:text-[#EDF4F0] rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Message Thread */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-black/20">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'forest-btn-primary'
                      : 'glass-2 text-[#EDF4F0]'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="glass-2 rounded-2xl px-3.5 py-2.5 text-xs text-[#8EA39A] flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#34D399]" />
                  <span>চিন্তা করছে...</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompts */}
          {messages.length <= 2 && (
            <div className="px-3 py-2 border-t border-white/10 bg-black/20 flex gap-1.5 overflow-x-auto">
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => sendMessage(p)}
                  className="text-[11px] text-[#EDF4F0]/85 hover:text-[#B6F5D8] glass-2 hover:border-[#34D399]/35 rounded-lg px-2.5 py-1 whitespace-nowrap shrink-0 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="p-3 border-t border-white/10 bg-black/25 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="আপনার প্রশ্ন লিখুন..."
              className="flex-1 h-10 rounded-xl forest-input px-3 text-xs sm:text-sm text-[#EDF4F0] placeholder:text-[#5D726A]"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="h-10 px-3.5 rounded-xl forest-btn-primary disabled:opacity-40 flex items-center justify-center transition-all"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="h-12 px-5 rounded-full forest-btn-primary flex items-center gap-2 text-xs sm:text-sm font-semibold transition-transform hover:-translate-y-0.5"
        >
          <MessageSquare className="w-4 h-4" />
          <span>দাওয়াহ AI সহায়ক</span>
        </button>
      )}
    </div>
  );
}
