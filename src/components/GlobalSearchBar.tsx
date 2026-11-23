import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Search, X, ArrowRight, Loader2 } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface SearchResult {
  id: string;
  name: string;
  area?: string | null;
  phone?: string | null;
  currentStage: number;
  stageName: string;
  priorityLevel: string;
  categories: string[];
}

export default function GlobalSearchBar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Cmd/Ctrl+K or '/'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search fetch
  useEffect(() => {
    if (!isOpen && !query.trim()) return;
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  const handleSelect = (id: string) => {
    setIsOpen(false);
    setQuery('');
    navigate(`/contacts/${id}`);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-[#8EA39A] absolute left-3.5 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder="নাম বা ক্যাটাগরি দিয়ে খুঁজুন... (Search name or category)"
          aria-label="Search contacts by name or category"
          className="w-full h-10 pl-10 pr-16 rounded-xl forest-input text-xs sm:text-sm text-[#EDF4F0] placeholder:text-[#5D726A] transition-all"
        />
        <div className="absolute right-2.5 flex items-center gap-1.5">
          {loading && <Loader2 className="w-3.5 h-3.5 text-[#34D399] animate-spin" />}
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 text-[#8EA39A] hover:text-[#EDF4F0] rounded transition-colors"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-block text-[10px] font-mono text-[#8EA39A] px-1.5 py-0.5 border border-white/15 bg-white/[0.04] rounded-md">
            ⌘K
          </kbd>
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 glass-modal rounded-2xl overflow-hidden z-50 max-h-96 overflow-y-auto">
          {loading && results.length === 0 ? (
            <div className="p-4 text-xs text-[#8EA39A] text-center">সদস্য খোঁজা হচ্ছে...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-xs text-[#8EA39A] text-center">
              কোনো সদস্য বা ক্যাটাগরি পাওয়া যায়নি
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  className="w-full text-left px-4 py-3 hover:bg-white/[0.06] transition-colors flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-[#EDF4F0] group-hover:text-[#B6F5D8] transition-colors truncate">
                      {item.name}
                    </div>
                    <div className="text-xs text-[#8EA39A] flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span className="tabular-nums">স্টেজ {item.currentStage}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{item.stageName}</span>
                      {item.area && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{item.area}</span>
                        </>
                      )}
                    </div>
                    {item.categories.length > 0 && (
                      <div className="text-[11px] text-[#34D399] mt-1 truncate">
                        {item.categories.join(' · ')}
                      </div>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#5D726A] group-hover:text-[#34D399] shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
