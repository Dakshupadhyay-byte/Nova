import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  Search, 
  Download, 
  Moon, 
  Flame, 
  Target, 
  Utensils, 
  ShieldCheck,
  Calendar,
  ChevronDown,
  ChevronUp,
  Activity,
  Zap
} from 'lucide-react';
import { CIRCADIAN_TIMELINE, VELOCITY_DATA, INITIAL_METRICS } from '../data/mockData';
import { CircadianEvent, FocusBlock, MetricOverview } from '../types';

interface HistoryScreenProps {
  focusBlocks: FocusBlock[];
  metrics?: MetricOverview;
}

interface DailySummary {
  id: string;
  day: string;
  fullDate: string;
  isToday: boolean;
  sleepHours: number | null;
  sleepFormatted: string;
  energyLevel: number | null;
  focusScore: number | null;
  events: CircadianEvent[];
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ focusBlocks, metrics = INITIAL_METRICS }) => {
  const [timeRange, setTimeRange] = useState<'today' | '7days'>('7days');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'focus' | 'exercise' | 'sleep' | 'nutrition' | 'recovery'>('all');
  const [search, setSearch] = useState('');
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);

  // Combine mock circadian events + real/recent focus blocks into full activity history
  const allHistoryEvents: CircadianEvent[] = useMemo(() => {
    const dynamicFocusEvents: CircadianEvent[] = focusBlocks.map((block) => ({
      id: block.id,
      time: block.time,
      category: 'focus',
      title: block.title,
      detail: `${block.durationMinutes} min focus session (${block.tier.toLowerCase()} tier). ${block.interruptions} interruptions logged.${block.notes ? ` ${block.notes}` : ''}`,
      impactScore: block.interruptions === 0 ? 'Optimal focus' : `${block.interruptions} switch context`,
    }));

    const additionalHistorical: CircadianEvent[] = [
      {
        id: 'h-past-1',
        time: 'Yesterday 10:30 PM',
        category: 'sleep',
        title: 'Sleep Stage Onset (Baseline 7.8h)',
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
      {
        id: 'h-past-3',
        time: '2 days ago 08:00 AM',
        category: 'workout',
        title: 'Interval Rowing & Core Stability',
        detail: '40 min zone 3 training. Peak heart rate 158 bpm.',
        impactScore: '380 kcal burn',
      },
      {
        id: 'h-past-4',
        time: '3 days ago 01:15 PM',
        category: 'nutrition',
        title: 'Mediterranean Anti-Inflammatory Lunch',
        detail: 'Wild salmon, quinoa, extra virgin olive oil, steamed greens.',
        impactScore: 'High polyphenol load',
      },
      {
        id: 'h-past-5',
        time: '4 days ago 09:00 PM',
        category: 'recovery',
        title: 'Contrast Therapy & Breathwork',
        detail: '15 min sauna followed by cold plunge and 4-7-8 breathing protocol.',
        impactScore: 'Parasympathetic shift',
      }
    ];

    return [...dynamicFocusEvents, ...CIRCADIAN_TIMELINE, ...additionalHistorical];
  }, [focusBlocks]);

  // Structured 7-day data combining real & mock metric points
  const weekDaysData: DailySummary[] = useMemo(() => {
    return [
      {
        id: 'day-mon',
        day: 'Monday',
        fullDate: 'Sep 24',
        isToday: false,
        sleepHours: 7.5,
        sleepFormatted: '7.5h',
        energyLevel: 8,
        focusScore: 76,
        events: allHistoryEvents.filter(e => e.id.includes('past-5') || e.id.includes('c-2')),
      },
      {
        id: 'day-tue',
        day: 'Tuesday',
        fullDate: 'Sep 25',
        isToday: false,
        sleepHours: 6.2,
        sleepFormatted: '6.2h',
        energyLevel: 6,
        focusScore: 61,
        events: allHistoryEvents.filter(e => e.id.includes('past-4') || e.id.includes('c-3')),
      },
      {
        id: 'day-wed',
        day: 'Wednesday',
        fullDate: 'Sep 26',
        isToday: false,
        sleepHours: 8.0,
        sleepFormatted: '8h',
        energyLevel: 9,
        focusScore: 84,
        events: allHistoryEvents.filter(e => e.id.includes('past-3') || e.id.includes('c-4')),
      },
      {
        id: 'day-thu',
        day: 'Thursday',
        fullDate: 'Sep 27',
        isToday: false,
        sleepHours: 7.8,
        sleepFormatted: '7.8h',
        energyLevel: 8,
        focusScore: 79,
        events: allHistoryEvents.filter(e => e.id.includes('past-2') || e.id.includes('c-5')),
      },
      {
        id: 'day-fri',
        day: 'Friday',
        fullDate: 'Sep 28',
        isToday: false,
        sleepHours: 5.9,
        sleepFormatted: '5.9h',
        energyLevel: 5,
        focusScore: 52,
        events: allHistoryEvents.filter(e => e.id.includes('past-1') || e.id.includes('c-6')),
      },
      {
        id: 'day-sat',
        day: 'Saturday',
        fullDate: 'Sep 29',
        isToday: false,
        sleepHours: 8.5,
        sleepFormatted: '8.5h',
        energyLevel: 9,
        focusScore: 90,
        events: allHistoryEvents.filter(e => e.id.includes('c-7') || e.id.includes('c-8')),
      },
      {
        id: 'day-today',
        day: 'Sunday (Today)',
        fullDate: 'Today',
        isToday: true,
        sleepHours: metrics.sleepHours || 6.5,
        sleepFormatted: `${metrics.sleepHours || 6.5}h`,
        energyLevel: 8,
        focusScore: metrics.focusIndex || 76,
        events: allHistoryEvents.filter(e => !e.id.startsWith('h-past-')),
      },
    ];
  }, [allHistoryEvents, metrics]);

  // Filtered dataset for the detailed entries
  const filteredEvents = useMemo(() => {
    return allHistoryEvents.filter((item) => {
      // Time range filter
      if (timeRange === 'today') {
        if (item.id.startsWith('h-past-')) return false;
      }

      // Category filter (mapping 'exercise' <-> 'workout')
      if (categoryFilter !== 'all') {
        if (categoryFilter === 'exercise') {
          if (item.category !== 'workout') return false;
        } else if (item.category !== categoryFilter) {
          return false;
        }
      }

      // Search filter
      if (search.trim() !== '') {
        const query = search.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(query);
        const matchDetail = item.detail.toLowerCase().includes(query);
        const matchCat = item.category.toLowerCase().includes(query);
        const matchTime = item.time.toLowerCase().includes(query);
        if (!matchTitle && !matchDetail && !matchCat && !matchTime) return false;
      }

      return true;
    });
  }, [allHistoryEvents, timeRange, categoryFilter, search]);

  // Export JSON
  const handleExportJSON = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      timeRange,
      categoryFilter,
      summaryRows: timeRange === 'today' ? weekDaysData.filter(d => d.isToday) : weekDaysData,
      entries: filteredEvents,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `nova_history_export_${timeRange}_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getCategoryIcon = (cat: CircadianEvent['category'] | 'exercise') => {
    switch (cat) {
      case 'sleep':
        return <Moon className="w-4 h-4 text-[#712ae2]" />;
      case 'workout':
      case 'exercise':
        return <Flame className="w-4 h-4 text-orange-500" />;
      case 'focus':
        return <Target className="w-4 h-4 text-[#00685f]" />;
      case 'nutrition':
        return <Utensils className="w-4 h-4 text-emerald-600" />;
      case 'recovery':
        return <ShieldCheck className="w-4 h-4 text-blue-500" />;
      default:
        return <Activity className="w-4 h-4 text-[#00685f]" />;
    }
  };

  const displayedSummaryRows = timeRange === 'today' 
    ? weekDaysData.filter(d => d.isToday)
    : weekDaysData;

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-8 space-y-7">
      {/* Top Header Row with Time Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-[34px] font-bold text-[#131b2e] tracking-tight leading-tight">
            History
          </h1>
          <p className="text-[14px] text-[#3d4947] mt-1 leading-relaxed">
            Your recent focus, wellness, and activity patterns.
          </p>
        </div>

        {/* Date Range Selector: Today / Last 7 Days */}
        <div className="flex items-center p-1 bg-[#eaedff]/70 border border-[#dae2fd]/70 rounded-full shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setTimeRange('today')}
            className={`px-4 py-1.5 rounded-full text-[12.5px] font-semibold transition-all duration-150 cursor-pointer ${
              timeRange === 'today'
                ? 'bg-[#00685f] text-white shadow-xs'
                : 'text-[#3d4947] hover:text-[#131b2e]'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setTimeRange('7days')}
            className={`px-4 py-1.5 rounded-full text-[12.5px] font-semibold transition-all duration-150 cursor-pointer ${
              timeRange === '7days'
                ? 'bg-[#00685f] text-white shadow-xs'
                : 'text-[#3d4947] hover:text-[#131b2e]'
            }`}
          >
            Last 7 Days
          </button>
        </div>
      </div>

      {/* Control Bar: Search Input, Category Filter Pills & Export Button */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full lg:w-72 shrink-0">
          <Search className="w-4 h-4 text-[#6d7a77] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search history..."
            className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-[#dae2fd] text-[13px] text-[#131b2e] placeholder-[#6d7a77] focus:outline-hidden focus:border-[#00685f] shadow-2xs transition-colors"
          />
        </div>

        {/* Category Pills & Export */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between lg:justify-end gap-3 flex-1">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 p-1 bg-[#eaedff]/60 border border-[#dae2fd]/60 rounded-2xl overflow-x-auto">
            {(['all', 'focus', 'exercise', 'sleep', 'nutrition', 'recovery'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all capitalize whitespace-nowrap cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-[#00685f] text-white shadow-xs'
                    : 'text-[#3d4947] hover:text-[#131b2e]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportJSON}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-[#faf8ff] border border-[#dae2fd] text-[#131b2e] text-[12.5px] font-semibold transition-colors shadow-2xs cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-[#00685f]" />
            <span>Export Data</span>
          </button>
        </div>
      </div>

      {/* Main Focus History Card (Matching Second Reference Image Design) */}
      <div className="bg-white rounded-3xl border border-[#e2e7ff] shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="flex items-center justify-between px-6 lg:px-8 py-5 border-b border-[#f0f3fd]">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full border-2 border-[#00685f] flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-[#00685f]" />
            </div>
            <h2 className="text-[16px] font-bold text-[#131b2e]">
              Focus History
            </h2>
          </div>
          <span className="text-[13px] font-medium text-[#6d7a77]">
            {timeRange === 'today' ? 'Today' : 'Past 6 days'}
          </span>
        </div>

        {/* Daily Horizontal Rows */}
        <div className="divide-y divide-[#f0f3fd]">
          {displayedSummaryRows.map((row) => {
            const isExpanded = expandedDayId === row.id;
            const sleepWidthPercent = row.sleepHours ? Math.min(100, Math.round((row.sleepHours / 10) * 100)) : 0;

            return (
              <div key={row.id} className="transition-colors">
                <div 
                  onClick={() => setExpandedDayId(isExpanded ? null : row.id)}
                  className="px-6 lg:px-8 py-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#faf8ff]/70 transition-colors cursor-pointer"
                >
                  {/* Left: Day Label */}
                  <div className="w-36 shrink-0">
                    <span className="text-[15px] font-bold text-[#131b2e]">
                      {row.day}
                    </span>
                  </div>

                  {/* Middle: Sleep & Energy Visualizations */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-6 sm:gap-10 flex-1">
                    {/* Sleep */}
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] font-medium text-[#6d7a77] w-10">
                        Sleep
                      </span>
                      <div className="w-24 sm:w-32 h-2 bg-[#eaedff] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#712ae2] rounded-full transition-all duration-300"
                          style={{ width: `${sleepWidthPercent}%` }}
                        />
                      </div>
                      <span className="text-[13px] font-bold text-[#131b2e] tabular-nums min-w-[34px]">
                        {row.sleepFormatted}
                      </span>
                    </div>

                    {/* Energy */}
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] font-medium text-[#6d7a77] w-12">
                        Energy
                      </span>
                      {/* 10-Dot Indicator */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <span
                            key={i}
                            className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-colors ${
                              i < (row.energyLevel || 0) ? 'bg-[#00685f]' : 'bg-[#dae2fd]'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[13px] font-bold text-[#131b2e] tabular-nums min-w-[16px]">
                        {row.energyLevel ?? '--'}
                      </span>
                    </div>
                  </div>

                  {/* Right: Focus Score */}
                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 min-w-[64px]">
                    <div className="text-right">
                      <div className="text-2xl sm:text-[26px] font-bold text-[#131b2e] leading-none tabular-nums">
                        {row.focusScore ?? '--'}
                      </div>
                      <div className="text-[11px] font-semibold text-[#6d7a77] lowercase tracking-wider mt-0.5">
                        focus
                      </div>
                    </div>
                    <div className="text-[#6d7a77] md:block hidden">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Optional Expandable Day Detail */}
                {isExpanded && (
                  <div className="bg-[#f8faff] px-6 lg:px-8 py-4 border-t border-[#eaedff] space-y-2.5">
                    <div className="text-[11.5px] font-bold uppercase tracking-wider text-[#6d7a77]">
                      {row.day} Activity Breakdown ({row.events.length} logs)
                    </div>
                    {row.events.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {row.events.map((ev) => (
                          <div key={ev.id} className="p-3 bg-white rounded-xl border border-[#dae2fd] text-[12.5px]">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-[#131b2e] flex items-center gap-1.5">
                                {getCategoryIcon(ev.category)}
                                {ev.title}
                              </span>
                              <span className="text-[11px] font-mono text-[#6d7a77]">{ev.time}</span>
                            </div>
                            <p className="text-[#3d4947] text-[12px]">{ev.detail}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[12.5px] text-[#6d7a77] italic py-1">
                        No additional activity logs recorded for this day.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Chronological History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-[17px] font-bold text-[#131b2e]">
              {categoryFilter === 'all' 
                ? 'Chronological Activity Log' 
                : `${categoryFilter.charAt(0).toUpperCase() + categoryFilter.slice(1)} Activity History`}
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#eaedff] text-[#00685f]">
              {filteredEvents.length}
            </span>
          </div>
        </div>

        {/* Entries List */}
        <div className="bg-white rounded-3xl p-5 lg:p-6 border border-[#e2e7ff] shadow-xs space-y-3">
          {filteredEvents.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-[#faf8ff] border border-[#eaedff] hover:border-[#b2e7df] transition-colors flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-2xl bg-white border border-[#dae2fd] flex items-center justify-center shadow-2xs shrink-0 mt-0.5">
                {getCategoryIcon(item.category)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-mono font-bold text-[#6d7a77] tabular-nums">
                      {item.time}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-white border border-[#dae2fd] text-[#3d4947]">
                      {item.category === 'workout' ? 'Exercise' : item.category}
                    </span>
                  </div>
                  {item.impactScore && (
                    <span className="text-[12px] font-semibold text-[#00685f]">
                      {item.impactScore}
                    </span>
                  )}
                </div>
                <h4 className="text-[14.5px] font-bold text-[#131b2e] mt-1 truncate">{item.title}</h4>
                <p className="text-[13px] text-[#3d4947] mt-1 leading-relaxed">{item.detail}</p>
              </div>
            </div>
          ))}

          {filteredEvents.length === 0 && (
            <div className="p-8 text-center text-[#6d7a77]">
              No matching activity records found for &ldquo;{search}&rdquo;.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
