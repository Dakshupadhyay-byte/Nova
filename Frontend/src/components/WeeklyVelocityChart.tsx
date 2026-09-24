import React, { useState } from 'react';
import { ExternalLink, Layers, ArrowUpRight } from 'lucide-react';
import { VELOCITY_DATA } from '../data/mockData';
import { VelocityDay } from '../types';

interface WeeklyVelocityChartProps {
  onOpenTimelineModal: () => void;
}

export const WeeklyVelocityChart: React.FC<WeeklyVelocityChartProps> = ({
  onOpenTimelineModal,
}) => {
  const [activePoint, setActivePoint] = useState<VelocityDay | null>(null);

  // Chart coordinates mapping (Width: 620, Height: 150)
  const width = 640;
  const height = 140;
  const paddingX = 40;
  const paddingY = 24;

  const points = VELOCITY_DATA.map((d, index) => {
    const x = paddingX + (index * (width - 2 * paddingX)) / (VELOCITY_DATA.length - 1);
    // Invert Y: 100 is at top (paddingY), 0 is at bottom (height - paddingY)
    const y = height - paddingY - ((d.value / 100) * (height - 2 * paddingY));
    return { ...d, x, y };
  });

  // Generate smooth cubic bezier SVG path
  const createSmoothPath = () => {
    if (points.length === 0) return '';
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const midX = (p0.x + p1.x) / 2;
      path += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return path;
  };

  const linePath = createSmoothPath();
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <div className="bg-white rounded-3xl p-6 border border-[#e2e7ff]/80 shadow-xs relative overflow-hidden transition-all duration-200">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-bold tracking-wider text-[#6d7a77] uppercase font-mono">
            CHRONOMETRIC PROGRESSION
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#f0f3fd] border border-[#dae2fd] text-[#3d4947] text-[11px] font-medium">
            24-Hr Timeline Matrix
          </span>
        </div>

        <button
          onClick={onOpenTimelineModal}
          className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-[12px] font-medium text-[#00685f] bg-[#eefaf8] hover:bg-[#e2f5f1] border border-[#b2e7df]/80 transition-colors"
        >
          <span>Inspect Timeline Graph</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <h2 className="text-[22px] font-bold tracking-tight text-[#131b2e] mb-4">
        Weekly Focus Velocity
      </h2>

      {/* SVG Chart Area */}
      <div className="relative w-full h-[155px] mt-2 select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="velocityAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00685f" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#00685f" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Subtle horizontal grid lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={width - paddingX}
            y2={paddingY}
            stroke="#f0f3fd"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={height / 2}
            x2={width - paddingX}
            y2={height / 2}
            stroke="#f0f3fd"
            strokeDasharray="4 4"
          />

          {/* Gradient Area Fill */}
          <path d={areaPath} fill="url(#velocityAreaGradient)" />

          {/* Smooth Velocity Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#00685f"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive Data Points */}
          {points.map((pt, idx) => {
            const isToday = pt.day === 'Today';
            const isHovered = activePoint?.day === pt.day;

            return (
              <g
                key={pt.day}
                className="cursor-pointer"
                onMouseEnter={() => setActivePoint(pt)}
                onMouseLeave={() => setActivePoint(null)}
              >
                {/* Invisible hover hitbox */}
                <circle cx={pt.x} cy={pt.y} r={16} fill="transparent" />

                {/* Outer ring on hover/today */}
                {(isHovered || isToday) && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 8 : 6}
                    fill="none"
                    stroke="#00685f"
                    strokeWidth="2"
                    className="transition-all duration-150"
                  />
                )}

                {/* Main dot: White circle with teal border or filled */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isToday ? 4.5 : 3.5}
                  fill={isToday ? '#00685f' : '#ffffff'}
                  stroke="#00685f"
                  strokeWidth="2.5"
                  className="transition-transform duration-150 hover:scale-125"
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {activePoint && (
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#131b2e] text-white px-3 py-1.5 rounded-xl text-[11px] shadow-lg pointer-events-none flex items-center gap-2.5 z-20 whitespace-nowrap animate-in fade-in zoom-in-95 duration-100"
          >
            <span className="font-semibold text-[#89f5e7]">{activePoint.label}</span>
            <span>·</span>
            <span>Focus: <strong className="text-white tabular-nums">{activePoint.value}%</strong></span>
            <span>·</span>
            <span>Flow: <strong className="text-white tabular-nums">{activePoint.deepMinutes}m</strong></span>
          </div>
        )}
      </div>

      {/* Day Labels Axis */}
      <div className="flex justify-between px-6 text-[12px] font-medium text-[#6d7a77] mt-1 border-b border-[#e2e7ff]/60 pb-3">
        {VELOCITY_DATA.map((d) => (
          <span
            key={d.day}
            className={`${
              d.day === 'Today' ? 'font-bold text-[#00685f]' : 'hover:text-[#131b2e]'
            }`}
          >
            {d.day}
          </span>
        ))}
      </div>

      {/* Expand Circadian Timeline Bar */}
      <div
        onClick={onOpenTimelineModal}
        className="mt-3.5 flex items-center justify-between text-[12px] text-[#3d4947] hover:text-[#00685f] hover:bg-[#f4f7ff] p-2.5 rounded-xl cursor-pointer transition-colors group"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#00685f] group-hover:scale-110 transition-transform" />
          <span className="font-medium">
            Expand 24-hr multi-modal circadian timeline (Sleep, Nutrition, Workout, Focus)
          </span>
        </div>
        <span className="text-[11px] text-[#6d7a77] group-hover:text-[#00685f] transition-colors">
          Click anywhere to view
        </span>
      </div>
    </div>
  );
};
