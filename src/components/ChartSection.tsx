import React, { useState, useId, useRef } from 'react';
import { FundHistoryDataPoint } from '../types/tefas';
import { Calendar, Activity, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

interface ChartSectionProps {
  historySeries: FundHistoryDataPoint[];
  currentPeriod: number;
  onSelectPeriod: (period: number) => void;
  isLoadingPeriod: boolean;
}

const PERIOD_OPTIONS = [
  { label: '1 Ay', value: 1 },
  { label: '3 Ay', value: 3 },
  { label: '6 Ay', value: 6 },
  { label: '1 Yıl', value: 12 },
  { label: '3 Yıl', value: 36 },
  { label: '5 Yıl', value: 60 },
];

export const ChartSection: React.FC<ChartSectionProps> = ({
  historySeries,
  currentPeriod,
  onSelectPeriod,
  isLoadingPeriod,
}) => {
  const gradientId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  // Requirement: SMA and other parameters should NOT be shown unless user explicitly enables them
  const [showPrice, setShowPrice] = useState(true);
  const [showSma20, setShowSma20] = useState(false);
  const [showSma50, setShowSma50] = useState(false);
  const [showRsiSubchart, setShowRsiSubchart] = useState(false);

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  if (!historySeries || historySeries.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
        Grafik verisi bulunamadı.
      </div>
    );
  }

  // Calculate scales for Price Chart
  const prices = historySeries.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const pricePadding = (maxPrice - minPrice) * 0.08 || minPrice * 0.05;
  const priceScaleMin = Math.max(0, minPrice - pricePadding);
  const priceScaleMax = maxPrice + pricePadding;
  const priceRange = priceScaleMax - priceScaleMin || 1;

  // Chart dimensions in SVG viewBox coordinate space
  const svgWidth = 900;
  const priceSvgHeight = 280;
  const rsiSvgHeight = 85;
  const paddingLeft = 12;
  const paddingRight = 12;
  const chartWidth = svgWidth - paddingLeft - paddingRight;

  const getX = (index: number) => {
    if (historySeries.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (historySeries.length - 1)) * chartWidth;
  };

  const getPriceY = (val: number | null) => {
    if (val === null) return null;
    const norm = (val - priceScaleMin) / priceRange;
    return priceSvgHeight - norm * (priceSvgHeight - 30) - 15;
  };

  const getRsiY = (val: number | null) => {
    if (val === null) return null;
    const clamped = Math.max(0, Math.min(100, val));
    return rsiSvgHeight - (clamped / 100) * (rsiSvgHeight - 20) - 10;
  };

  // Build SVG Path strings
  let pricePath = '';
  let areaPath = '';
  let sma20Path = '';
  let sma50Path = '';
  let rsiPath = '';

  historySeries.forEach((pt, i) => {
    const x = getX(i);
    const py = getPriceY(pt.price);

    if (py !== null) {
      if (i === 0) {
        pricePath += `M ${x.toFixed(1)} ${py.toFixed(1)}`;
        areaPath += `M ${x.toFixed(1)} ${priceSvgHeight} L ${x.toFixed(1)} ${py.toFixed(1)}`;
      } else {
        pricePath += ` L ${x.toFixed(1)} ${py.toFixed(1)}`;
        areaPath += ` L ${x.toFixed(1)} ${py.toFixed(1)}`;
      }
    }

    // SMA 20
    const s20y = getPriceY(pt.sma20);
    if (s20y !== null) {
      if (!sma20Path) sma20Path = `M ${x.toFixed(1)} ${s20y.toFixed(1)}`;
      else sma20Path += ` L ${x.toFixed(1)} ${s20y.toFixed(1)}`;
    }

    // SMA 50
    const s50y = getPriceY(pt.sma50);
    if (s50y !== null) {
      if (!sma50Path) sma50Path = `M ${x.toFixed(1)} ${s50y.toFixed(1)}`;
      else sma50Path += ` L ${x.toFixed(1)} ${s50y.toFixed(1)}`;
    }

    // RSI 14
    const ry = getRsiY(pt.rsi14);
    if (ry !== null) {
      if (!rsiPath) rsiPath = `M ${x.toFixed(1)} ${ry.toFixed(1)}`;
      else rsiPath += ` L ${x.toFixed(1)} ${ry.toFixed(1)}`;
    }
  });

  if (areaPath) {
    areaPath += ` L ${getX(historySeries.length - 1).toFixed(1)} ${priceSvgHeight} Z`;
  }

  // Active or selected point inspection
  const activeIdx =
    hoverIndex !== null
      ? hoverIndex
      : selectedIndex !== null
      ? selectedIndex
      : historySeries.length - 1;

  const activePoint = historySeries[activeIdx] || historySeries[historySeries.length - 1];
  const activeX = activeIdx !== null ? getX(activeIdx) : null;

  // Calculate daily change for activePoint
  const prevPoint = activeIdx > 0 ? historySeries[activeIdx - 1] : null;
  const dailyDiff = prevPoint ? activePoint.price - prevPoint.price : 0;
  const dailyDiffPct =
    prevPoint && prevPoint.price > 0 ? (dailyDiff / prevPoint.price) * 100 : 0;
  const isDailyPos = dailyDiff >= 0;

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const ratio = Math.max(0, Math.min(1, clientX / rect.width));
    const idx = Math.round(ratio * (historySeries.length - 1));
    setHoverIndex(idx);
    setCursorPos({ x: clientX, y: clientY });
  };

  const handlePointerLeave = () => {
    setHoverIndex(null);
    setCursorPos(null);
  };

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clientX / rect.width));
    const idx = Math.round(ratio * (historySeries.length - 1));
    setSelectedIndex(idx === selectedIndex ? null : idx);
  };

  return (
    <div
      ref={containerRef}
      className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-sm relative select-none"
    >
      {/* Top Chart Header & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-xs sm:text-sm">
              Fiyat &amp; Tarihsel Seyir
            </h3>
            {selectedIndex !== null && (
              <p className="text-[10px] text-emerald-400 font-medium">
                Seçilen Gün: {activePoint.date} (sıfırlamak için tıklayın)
              </p>
            )}
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 self-start sm:self-auto overflow-x-auto no-scrollbar">
          {PERIOD_OPTIONS.map((period) => (
            <button
              key={period.value}
              onClick={() => {
                setSelectedIndex(null);
                onSelectPeriod(period.value);
              }}
              disabled={isLoadingPeriod}
              className={`px-2.5 py-1 text-[11px] rounded font-semibold tabular-nums transition-all cursor-pointer ${
                currentPeriod === period.value
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {period.label}
            </button>
          ))}
          {isLoadingPeriod && (
            <div className="px-1">
              <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Indicator Controls & Inspection Bar */}
      <div className="py-2 px-2.5 my-2 bg-slate-950/70 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Toggle Tickers - SMA & Indicators off by default */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showPrice}
              onChange={(e) => setShowPrice(e.target.checked)}
              className="accent-emerald-500 rounded"
            />
            <span className="w-2.5 h-0.5 bg-emerald-400 inline-block"></span>
            <span className="text-slate-300 text-[11px] font-semibold">Fiyat</span>
          </label>

          <label className="flex items-center gap-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showSma20}
              onChange={(e) => setShowSma20(e.target.checked)}
              className="accent-blue-500 rounded"
            />
            <span className="w-2.5 h-0.5 bg-blue-400 inline-block"></span>
            <span className="text-slate-400 hover:text-blue-400 text-[11px] font-semibold">
              SMA 20
            </span>
          </label>

          <label className="flex items-center gap-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showSma50}
              onChange={(e) => setShowSma50(e.target.checked)}
              className="accent-amber-500 rounded"
            />
            <span className="w-2.5 h-0.5 bg-amber-400 inline-block"></span>
            <span className="text-slate-400 hover:text-amber-400 text-[11px] font-semibold">
              SMA 50
            </span>
          </label>

          <label className="flex items-center gap-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showRsiSubchart}
              onChange={(e) => setShowRsiSubchart(e.target.checked)}
              className="accent-cyan-500 rounded"
            />
            <span className="w-2.5 h-0.5 bg-cyan-400 inline-block"></span>
            <span className="text-slate-400 hover:text-cyan-400 text-[11px] font-semibold">
              RSI (14)
            </span>
          </label>
        </div>

        {/* Selected / Hover Point Readout */}
        {activePoint && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs tabular-nums">
            <div className="text-slate-400 flex items-center gap-1 text-[11px]">
              <Calendar className="w-3 h-3" />
              <span className="text-slate-200 font-semibold">{activePoint.date}</span>
            </div>

            <div className="text-slate-300">
              Fiyat:{' '}
              <span className="text-white font-bold">
                ₺{activePoint.price.toFixed(4)}
              </span>
            </div>

            {/* Daily change on selected day */}
            <div
              className={`flex items-center gap-1 font-bold ${
                isDailyPos ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isDailyPos ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>
                Günlük: {isDailyPos ? '+' : ''}₺{dailyDiff.toFixed(4)} ({isDailyPos ? '+' : ''}
                %{dailyDiffPct.toFixed(2)})
              </span>
            </div>

            {showSma20 && activePoint.sma20 !== null && (
              <div className="text-blue-400 text-[11px]">
                SMA20: <span>₺{activePoint.sma20.toFixed(4)}</span>
              </div>
            )}
            {showSma50 && activePoint.sma50 !== null && (
              <div className="text-amber-400 text-[11px]">
                SMA50: <span>₺{activePoint.sma50.toFixed(4)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Interactive SVG Chart Container */}
      <div className="relative w-full overflow-hidden select-none">
        {/* Floating Cursor Popup Tooltip (follows cursor on hover) */}
        {hoverIndex !== null && cursorPos && activePoint && (
          <div
            className="pointer-events-none absolute z-30 transition-transform duration-75 ease-out"
            style={{
              left: `${Math.min(
                Math.max(10, cursorPos.x - 85),
                (containerRef.current?.clientWidth || 700) - 180
              )}px`,
              top: `${Math.max(10, cursorPos.y - 85)}px`,
            }}
          >
            <div className="bg-slate-950/95 border border-slate-700/80 rounded-xl px-3 py-2 shadow-2xl backdrop-blur-md text-xs tabular-nums min-w-[155px]">
              <div className="text-[10px] text-slate-400 border-b border-slate-800 pb-1 mb-1.5 flex items-center justify-between">
                <span>{activePoint.date}</span>
                <span className="text-slate-500 font-medium">TEFAS</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 text-[11px]">Birim Fiyat:</span>
                <span className="font-bold text-white text-xs">
                  ₺{activePoint.price.toFixed(4)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <span className="text-slate-400 text-[11px]">Günlük Değişim:</span>
                <span
                  className={`font-bold text-xs ${
                    isDailyPos ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isDailyPos ? '+' : ''}%{dailyDiffPct.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5 text-[10px]">
                <span className="text-slate-500">Günlük Fark:</span>
                <span className={isDailyPos ? 'text-emerald-400' : 'text-rose-400'}>
                  {isDailyPos ? '+' : ''}₺{dailyDiff.toFixed(4)}
                </span>
              </div>
              {showSma20 && activePoint.sma20 !== null && (
                <div className="flex items-center justify-between gap-2 mt-1 pt-1 border-t border-slate-800 text-[10px] text-blue-400">
                  <span>SMA 20:</span>
                  <span>₺{activePoint.sma20.toFixed(4)}</span>
                </div>
              )}
              {showSma50 && activePoint.sma50 !== null && (
                <div className="flex items-center justify-between gap-2 mt-0.5 text-[10px] text-amber-400">
                  <span>SMA 50:</span>
                  <span>₺{activePoint.sma50.toFixed(4)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${svgWidth} ${priceSvgHeight}`}
          className="w-full h-auto cursor-crosshair touch-none"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onClick={handleClick}
        >
          <defs>
            <linearGradient id={`area-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0.2, 0.4, 0.6, 0.8].map((ratio, idx) => {
            const y = priceSvgHeight * ratio;
            const priceLevel = priceScaleMax - ratio * priceRange;
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#1e293b"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={svgWidth - paddingRight - 4}
                  y={y - 4}
                  fill="#64748b"
                  fontSize="10"
                  textAnchor="end"
                  className="tabular-nums"
                >
                  ₺{priceLevel.toFixed(4)}
                </text>
              </g>
            );
          })}

          {/* Area gradient under price */}
          {showPrice && areaPath && <path d={areaPath} fill={`url(#area-${gradientId})`} />}

          {/* SMA 50 line (yellow) - only when enabled */}
          {showSma50 && sma50Path && (
            <path
              d={sma50Path}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* SMA 20 line (blue) - only when enabled */}
          {showSma20 && sma20Path && (
            <path
              d={sma20Path}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Price line (emerald) */}
          {showPrice && pricePath && (
            <path
              d={pricePath}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Crosshair vertical line on hover or selection */}
          {activeX !== null && (
            <line
              x1={activeX}
              y1={0}
              x2={activeX}
              y2={priceSvgHeight}
              stroke="#94a3b8"
              strokeDasharray="3 3"
              strokeWidth="1.2"
            />
          )}

          {/* Circle indicator on active point */}
          {activeX !== null && activePoint && (
            <circle
              cx={activeX}
              cy={getPriceY(activePoint.price) || 0}
              r="5"
              fill={isDailyPos ? '#10b981' : '#f43f5e'}
              stroke="#ffffff"
              strokeWidth="2"
            />
          )}
        </svg>

        {/* Min / Max Watermarks */}
        <div className="flex justify-between items-center text-[10px] tabular-nums text-slate-500 px-2 mt-1">
          <span>
            Dönem Dip: <strong className="text-slate-300">₺{minPrice.toFixed(4)}</strong>
          </span>
          <span className="text-slate-400 font-medium">
            {historySeries[0]?.date} — {historySeries[historySeries.length - 1]?.date}
          </span>
          <span>
            Dönem Zirve: <strong className="text-slate-300">₺{maxPrice.toFixed(4)}</strong>
          </span>
        </div>
      </div>

      {/* RSI (14) Oscillator Sub-Chart - only when toggled on by user */}
      {showRsiSubchart && (
        <div className="mt-4 pt-3 border-t border-slate-800 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs mb-1.5 tabular-nums">
            <span className="text-cyan-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              RSI (14) Gösterge Paneli
            </span>
            <div className="flex items-center gap-3 text-[10px] text-slate-400">
              <span className="text-rose-400 font-semibold">Aşırı Alım: 70</span>
              <span className="text-slate-500">Nötr: 50</span>
              <span className="text-emerald-400 font-semibold">Aşırı Satım: 30</span>
            </div>
          </div>

          <div className="relative w-full overflow-hidden select-none bg-slate-950/60 rounded-xl border border-slate-800/80 p-2">
            <svg
              viewBox={`0 0 ${svgWidth} ${rsiSvgHeight}`}
              className="w-full h-auto cursor-crosshair touch-none"
              onPointerMove={handlePointerMove}
              onPointerLeave={handlePointerLeave}
              onClick={handleClick}
            >
              {/* 70 overbought band line */}
              <line
                x1={paddingLeft}
                y1={getRsiY(70)!}
                x2={svgWidth - paddingRight}
                y2={getRsiY(70)!}
                stroke="#f43f5e"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={svgWidth - paddingRight - 4}
                y={getRsiY(70)! - 3}
                fill="#f43f5e"
                fontSize="9"
                textAnchor="end"
                className="tabular-nums"
              >
                70
              </text>

              {/* 50 neutral line */}
              <line
                x1={paddingLeft}
                y1={getRsiY(50)!}
                x2={svgWidth - paddingRight}
                y2={getRsiY(50)!}
                stroke="#334155"
                strokeDasharray="2 2"
                strokeWidth="1"
              />

              {/* 30 oversold band line */}
              <line
                x1={paddingLeft}
                y1={getRsiY(30)!}
                x2={svgWidth - paddingRight}
                y2={getRsiY(30)!}
                stroke="#10b981"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={svgWidth - paddingRight - 4}
                y={getRsiY(30)! - 3}
                fill="#10b981"
                fontSize="9"
                textAnchor="end"
                className="tabular-nums"
              >
                30
              </text>

              {/* RSI path */}
              {rsiPath && (
                <path
                  d={rsiPath}
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Hover crosshair line */}
              {activeX !== null && (
                <line
                  x1={activeX}
                  y1={0}
                  x2={activeX}
                  y2={rsiSvgHeight}
                  stroke="#94a3b8"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
              )}

              {/* Hover circle on RSI */}
              {activeX !== null && activePoint && activePoint.rsi14 !== null && (
                <circle
                  cx={activeX}
                  cy={getRsiY(activePoint.rsi14)!}
                  r="3.5"
                  fill="#06b6d4"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              )}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};
