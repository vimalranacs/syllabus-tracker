import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudyStore } from '../store/studyStore';
import { Search, ChevronRight, BookOpen, Layers } from 'lucide-react';
import { StatusIcon } from '../components/ui/StatusIcon';
import type { SyllabusNode } from '../types';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const { syllabusFlat, progress, getDisplayTitle } = useStudyStore();
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    return syllabusFlat
      .filter(n => {
        const title = getDisplayTitle(n).toLowerCase();
        const raw = n.title.replace(/_/g, ' ').toLowerCase();
        return title.includes(q) || raw.includes(q);
      })
      .slice(0, 60);
  }, [query, syllabusFlat, getDisplayTitle]);

  const handleSelect = (node: SyllabusNode) => {
    if (node.isLeaf && node.children.length === 0) {
      navigate('/topic/' + node.id);
    } else {
      navigate('/node/' + node.id);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
          Global Syllabus Search
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Quickly jump to any subject, topic, or subtopic across 1,500+ records · <kbd className="bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded text-[10px] font-mono">Ctrl+K</kbd>
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          id="global-search-input"
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Type keywords: e.g. Indus Valley, Fundamental Rights, UP Budget..."
          autoFocus
          className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all shadow-xs"
        />
      </div>

      {/* Results Box */}
      {query.trim().length >= 2 ? (
        <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-xs">
          <div className="px-5 py-2.5 bg-zinc-50/80 border-b border-zinc-100 flex items-center justify-between text-xs text-zinc-400">
            <span>Found {results.length} matches</span>
            <span>Showing top relevant results</span>
          </div>

          {results.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-400">
              No syllabus items found matching "{query}".
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {results.map(node => {
                const s = progress[node.id]?.status || 'not_started';
                return (
                  <div
                    key={node.id}
                    onClick={() => handleSelect(node)}
                    className="px-5 py-3 hover:bg-zinc-50 cursor-pointer flex items-center gap-3.5 transition-colors group"
                  >
                    <StatusIcon status={s} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-zinc-800 truncate group-hover:text-pink-600 transition-colors">
                        {getDisplayTitle(node)}
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                        {node.path.map(p => p.replace(/_/g, ' ')).join(' › ')}
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-pink-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="py-16 text-center space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto text-zinc-400">
            <Search className="w-5 h-5" />
          </div>
          <p className="text-xs text-zinc-400">
            Type at least 2 characters to search the entire curriculum.
          </p>
        </div>
      )}
    </div>
  );
}
