import React, { useState } from 'react';
import { 
  Clock, 
  Search, 
  Download, 
  Filter, 
  Moon, 
  Flame, 
  Target, 
  Utensils, 
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { CIRCADIAN_TIMELINE } from '../data/mockData';
import { CircadianEvent, FocusBlock } from '../types';

interface HistoryScreenProps {
  focusBlocks: FocusBlock[];
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ focusBlocks }) => {
  const [filter, setFilter] = useState<'all' | 'focus' | 'workout' | 'sleep' | 'nutrition' | 'recovery'>('all');
  const [search, setSearch] = useState('');

  const events: CircadianEvent[] = [
    ...CIRCADIAN_TIMELINE,
    // Add additional historical events
    {
      id: 'h-past-1',
      time: 'Yesterday 10:30 PM',
      category: 'sleep',
      title: 'Sleep Stage Onset (Baseline 6.5h)',
      detail: 'Latency 11m. High REM consolidation in early cycles.',
      impactScore: 'Restorative',
    },
    {
      id: 'h-past-2',
      time: 'Yesterday 04:00 PM',
      category: 'focus',
      title: 'Async Architecture Code Review',
      detail: '35 min flow session with 0 interruptions.',
      impactScore: 'High execution',
    },
  ];

  const filtered = events.filter((e) => {
    const matchesFilter = filter === 'all' || e.category === filter;
    const matchesSearch =
      search.trim() === '' ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.detail.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filtered, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `nova_telemetry_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getCategoryIcon = (cat: CircadianEvent['category']) => {
    switch (cat) {
      case 'sleep':
        return <Moon className="w-4 h-4 text-[#712ae2]" />;
      case 'workout':
        return <Flame className="w-4 h-4 text-orange-500" />;
      case 'focus':
        return <Target className="w-4 h-4 text-[#00685f]" />;
      case 'nutrition':
        return <Utensils className="w-4 h-4 text-emerald-600" />;
      case 'recovery':
        return <ShieldCheck className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[12px] font-semibold text-[#00685f] tracking-wide mb-1 font-mono">
            <Clock className="w-3.5 h-3.5" />
            <span>CHRONOLOGICAL TELEMETRY REGISTRY</span>
          </div>
          <h1 className="text-3xl font-bold text-[#131b2e] tracking-tight">
            Full 24-Hour Multimodal Logbook
          </h1>
          <p className="text-[14px] text-[#3d4947] mt-1">
            Complete chronological audit trail of biological rhythms, focus blocks, and somatic inputs.
          </p>
        </div>

        <button
          onClick={handleExportJSON}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#faf8ff] border border-[#dae2fd] text-[#131b2e] text-[13px] font-semibold transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-4 h-4 text-[#00685f]" />
          <span>Export Telemetry (JSON)</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#6d7a77] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search log entries..."
            className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-[#dae2fd] text-[13px] text-[#131b2e] placeholder-[#6d7a77] focus:outline-hidden focus:border-[#00685f]"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-[#eaedff]/60 rounded-xl overflow-x-auto w-full sm:w-auto">
          {(['all', 'focus', 'workout', 'sleep', 'nutrition', 'recovery'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-all capitalize whitespace-nowrap ${
                filter === cat
                  ? 'bg-white text-[#131b2e] shadow-2xs'
                  : 'text-[#6d7a77] hover:text-[#131b2e]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Log Entries List */}
      <div className="bg-white rounded-3xl p-6 lg:p-8 border border-[#e2e7ff] shadow-xs space-y-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-2xl bg-[#faf8ff] border border-[#eaedff] hover:border-[#b2e7df] transition-colors flex items-start gap-4"
          >
            <div className="w-10 h-10 rounded-2xl bg-white border border-[#dae2fd] flex items-center justify-center shadow-2xs shrink-0">
              {getCategoryIcon(item.category)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-mono font-bold text-[#6d7a77] tabular-nums">
                    {item.time}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-white border border-[#dae2fd] text-[#3d4947]">
                    {item.category}
                  </span>
                </div>
                {item.impactScore && (
                  <span className="text-[12px] font-semibold text-[#00685f]">
                    {item.impactScore}
                  </span>
                )}
              </div>
              <h4 className="text-[15px] font-bold text-[#131b2e] mt-1 truncate">{item.title}</h4>
              <p className="text-[13px] text-[#3d4947] mt-1 leading-relaxed">{item.detail}</p>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="p-8 text-center text-[#6d7a77]">
            No matching logbook entries found for &ldquo;{search}&rdquo;.
          </div>
        )}
      </div>
    </div>
  );
};
