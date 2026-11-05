import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TefasListRaw, FundAnalysisResult, TefasPriceRaw } from '../types/tefas';
import { analyzeFundData } from '../utils/quantEngine';
import { getFundStopajInfo } from '../utils/taxEngine';
import { FundCompanyLogo } from './FundCompanyLogo';
import { formatPriceDate } from '../utils/dateFormatter';
import {
  Plus,
  X,
  Search,
  GitCompare,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';

const COMPARISON_STORAGE_KEY = 'fontables_user_comparison_codes_v2';

interface FundComparisonViewProps {
  fundsList: TefasListRaw[];
  onSelectFundForAnalysis: (fonKodu: string) => void;
  initialFunds?: string[];
}

export const FundComparisonView: React.FC<FundComparisonViewProps> = ({
  fundsList,
  onSelectFundForAnalysis,
  initialFunds = [],
}) => {
  // Karşılaştırma fonları: Kullanıcı ekleyene kadar boştur; eklenenler localStorage'da saklanır
  const [comparedCodes, setComparedCodes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(COMPARISON_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Could not parse comparison storage:', e);
    }
    return initialFunds;
  });

  const [fundsData, setFundsData] = useState<Record<string, FundAnalysisResult>>({});
  const [loadingCodes, setLoadingCodes] = useState<Record<string, boolean>>({});
  const [searchInput, setSearchInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(12); // 12 months = 1 year
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Save to localStorage whenever comparedCodes changes
  useEffect(() => {
    try {
      localStorage.setItem(COMPARISON_STORAGE_KEY, JSON.stringify(comparedCodes));
    } catch (e) {
      console.warn('Could not save comparison storage:', e);
    }
  }, [comparedCodes]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch data for a code
  const fetchFundData = async (code: string, period: number) => {
    setLoadingCodes((prev) => ({ ...prev, [code]: true }));
    try {
      const res = await fetch('/api/tefas/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fonKodu: code, periyod: period }),
      });
      if (res.ok) {
        const data = await res.json();
        const rawPrices: TefasPriceRaw[] = data.resultList || [];
        if (rawPrices.length > 0) {
          const meta = fundsList.find((f) => f.fonKodu === code.toUpperCase()) || null;
          const analysis = analyzeFundData(rawPrices, meta);
          setFundsData((prev) => ({ ...prev, [code]: analysis }));
        }
      }
    } catch (e) {
      console.warn('Comparison fetch error for', code, e);
    } finally {
      setLoadingCodes((prev) => ({ ...prev, [code]: false }));
    }
  };

  useEffect(() => {
    comparedCodes.forEach((code) => {
      if (!fundsData[code] || fundsData[code].historySeries.length === 0) {
        fetchFundData(code, selectedPeriod);
      }
    });
  }, [comparedCodes, selectedPeriod]);

  const addCode = (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    if (comparedCodes.includes(clean)) {
      setSearchInput('');
      setShowSuggestions(false);
      return;
    }
    if (comparedCodes.length >= 4) {
      alert('En fazla 4 fonu aynı anda karşılaştırabilirsiniz.');
      return;
    }
    setComparedCodes((prev) => [...prev, clean]);
    fetchFundData(clean, selectedPeriod);
    setSearchInput('');
    setShowSuggestions(false);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addCode(searchInput);
  };

  const handleRemoveCode = (code: string) => {
    setComparedCodes((prev) => prev.filter((c) => c !== code));
  };

  // Autocomplete suggestions based on user search
  const suggestions = useMemo(() => {
    const q = searchInput.trim().toUpperCase();
    if (!q) return [];
    return fundsList
      .filter((f) => f.fonKodu.includes(q) || (f.fonUnvan && f.fonUnvan.toUpperCase().includes(q)))
      .filter((f) => !comparedCodes.includes(f.fonKodu))
      .slice(0, 6);
  }, [searchInput, fundsList, comparedCodes]);

  // Build Normalized Return Chart
  const lineColors = ['#10b981', '#38bdf8', '#f59e0b', '#ec4899'];

  const validFunds = comparedCodes
    .map((c) => fundsData[c])
    .filter((d): d is FundAnalysisResult => !!d && d.historySeries.length > 0);

  // SVG dimensions
  const svgWidth = 800;
  const svgHeight = 220;
  const padLeft = 35;
  const padRight = 15;
  const padTop = 15;
  const padBottom = 25;
  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;

  // Compute normalized returns series (% return since first point)
  const normalizedSeries = validFunds.map((fund) => {
    const series = fund.historySeries;
    const basePrice = series[0]?.price || 1;
    return {
      code: fund.fonKodu,
      points: series.map((pt) => ({
        date: pt.date,
        returnPct: basePrice > 0 ? ((pt.price - basePrice) / basePrice) * 100 : 0,
      })),
    };
  });

  // Calculate min and max return % across all compared funds
  let minReturn = 0;
  let maxReturn = 0;
  normalizedSeries.forEach((s) => {
    s.points.forEach((p) => {
      if (p.returnPct < minReturn) minReturn = p.returnPct;
      if (p.returnPct > maxReturn) maxReturn = p.returnPct;
    });
  });
  const returnRange = maxReturn - minReturn || 1;

  const getY = (ret: number) => {
    const norm = (ret - minReturn) / returnRange;
    return padTop + chartHeight - norm * chartHeight;
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Top Header & Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm sm:text-base font-bold text-white">Fon Karşılaştırma</h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {comparedCodes.length} / 4 Fon
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Getiri, stopaj vergisi, risk göstergeleri ve puanları yan yana kıyaslayın
          </p>
        </div>

        {/* Add Fund Form with Autocomplete */}
        <div ref={searchContainerRef} className="relative">
          <form onSubmit={handleAddSubmit} className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => {
                  setSearchInput(e.target.value.toUpperCase());
                  setShowSuggestions(true);
                }}
                placeholder="Fon Kodu Ekle..."
                maxLength={6}
                className="pl-8 pr-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 font-mono uppercase focus:outline-none focus:border-emerald-500 w-36 sm:w-44"
              />
            </div>
            <button
              type="submit"
              disabled={!searchInput.trim()}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-40 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ekle</span>
            </button>
          </form>

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute right-0 top-full mt-1.5 w-64 sm:w-72 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-30 overflow-hidden divide-y divide-slate-800/60">
              {suggestions.map((fund) => (
                <button
                  key={fund.fonKodu}
                  type="button"
                  onClick={() => addCode(fund.fonKodu)}
                  className="w-full text-left p-2.5 hover:bg-slate-900/80 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <FundCompanyLogo fonKodu={fund.fonKodu} fonUnvan={fund.fonUnvan} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold font-mono text-white flex items-center justify-between">
                      <span>{fund.fonKodu}</span>
                      <span className="text-[10px] text-emerald-400 font-normal">Kıyasa Ekle +</span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{fund.fonUnvan}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Fund Chips */}
      {comparedCodes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {comparedCodes.map((code, idx) => {
            const color = lineColors[idx % lineColors.length];
            const isLoading = loadingCodes[code];
            return (
              <div
                key={code}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono"
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <FundCompanyLogo fonKodu={code} fonUnvan={fundsData[code]?.fonUnvan} size="sm" />
                <button
                  onClick={() => onSelectFundForAnalysis(code)}
                  className="font-bold text-white hover:text-emerald-400 transition-colors cursor-pointer"
                  title="Detaylı Analize Git"
                >
                  {code}
                </button>
                {isLoading && <RefreshCw className="w-3 h-3 text-slate-400 animate-spin" />}
                <button
                  onClick={() => handleRemoveCode(code)}
                  className="p-0.5 text-slate-500 hover:text-rose-400 cursor-pointer ml-1"
                  title={`${code} fonunu karşılaştırmadan çıkar`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State when no funds are in comparison */}
      {comparedCodes.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 sm:p-12 text-center max-w-lg mx-auto my-6">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3 border border-emerald-500/20">
            <GitCompare className="w-6 h-6" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white">Karşılaştırma Listeniz Boş</h3>
          <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
            Kıyaslamak istediğiniz fonları yukarıdaki arama kutusuna yazarak ekleyin; dönemsel getiri, stopaj oranı, risk göstergeleri ve puanları yan yana inceleyin. Eklediğiniz fonlar tarayıcınızda otomatik saklanır.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="text-[11px] text-slate-500 w-full mb-1">Hızlı Karşılaştırma Önerileri:</span>
            {['TI2', 'MAC', 'TTE', 'AFT'].map((suggestCode) => (
              <button
                key={suggestCode}
                onClick={() => addCode(suggestCode)}
                className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white font-mono text-xs flex items-center gap-1.5 border border-slate-800 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3 text-emerald-400" />
                <span>{suggestCode}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Normalized Return Chart (% Getiri Kıyaslaması) */}
          {validFunds.length > 0 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  Kümülatif Getiri Kıyaslama Grafiği (%)
                </span>
                <div className="flex items-center gap-1 text-[11px] font-mono">
                  {[
                    { label: '3A', val: 3 },
                    { label: '6A', val: 6 },
                    { label: '1Y', val: 12 },
                  ].map((p) => (
                    <button
                      key={p.val}
                      onClick={() => setSelectedPeriod(p.val)}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        selectedPeriod === p.val
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative w-full overflow-hidden select-none bg-slate-950/40 rounded-lg p-2">
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto">
                  {/* Zero baseline */}
                  <line
                    x1={padLeft}
                    y1={getY(0)}
                    x2={svgWidth - padRight}
                    y2={getY(0)}
                    stroke="#334155"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                  <text x={padLeft - 5} y={getY(0) + 3} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">
                    %0
                  </text>

                  {/* Min & Max Y labels */}
                  <text x={padLeft - 5} y={getY(maxReturn) + 8} fill="#10b981" fontSize="9" textAnchor="end" fontFamily="monospace">
                    +%{maxReturn.toFixed(0)}
                  </text>
                  <text x={padLeft - 5} y={getY(minReturn)} fill="#f43f5e" fontSize="9" textAnchor="end" fontFamily="monospace">
                    %{minReturn.toFixed(0)}
                  </text>

                  {/* Lines for each fund */}
                  {normalizedSeries.map((s, idx) => {
                    const color = lineColors[idx % lineColors.length];
                    let path = '';
                    s.points.forEach((pt, pIdx) => {
                      const x = padLeft + (pIdx / (s.points.length - 1 || 1)) * chartWidth;
                      const y = getY(pt.returnPct);
                      if (pIdx === 0) path += `M ${x.toFixed(1)} ${y.toFixed(1)}`;
                      else path += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
                    });
                    return (
                      <path
                        key={s.code}
                        d={path}
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    );
                  })}
                </svg>
              </div>
            </div>
          )}

          {/* Side-by-Side Comparison Matrix */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono divide-y divide-slate-800">
                <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Metrik / Gösterge</th>
                    {comparedCodes.map((code, idx) => (
                      <th key={code} className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lineColors[idx % lineColors.length] }} />
                          <FundCompanyLogo fonKodu={code} fonUnvan={fundsData[code]?.fonUnvan} size="sm" />
                          <span className="font-bold text-white text-xs">{code}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {/* Category */}
                  <tr className="hover:bg-slate-900/40">
                    <td className="py-2 px-3 text-slate-400 font-sans">Kategori</td>
                    {comparedCodes.map((c) => {
                      const f = fundsData[c];
                      return (
                        <td key={c} className="py-2 px-3 text-right text-slate-200 truncate max-w-[140px]">
                          {f?.kategori || '—'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Stopaj Bilgisi */}
                  <tr className="hover:bg-slate-900/40 bg-slate-950/20">
                    <td className="py-2 px-3 text-slate-300 font-sans font-semibold">Stopaj Vergisi</td>
                    {comparedCodes.map((c) => {
                      const f = fundsData[c];
                      const tax = getFundStopajInfo(f?.fonUnvan, f?.kategori);
                      return (
                        <td key={c} className="py-2 px-3 text-right font-bold">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                              tax.isExempt
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {tax.label}
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Current Price */}
                  <tr className="hover:bg-slate-900/40">
                    <td className="py-2 px-3 text-slate-400 font-sans">Birim Fiyat</td>
                    {comparedCodes.map((c) => {
                      const f = fundsData[c];
                      const dateStr = f?.priceDate || f?.historySeries?.[f.historySeries.length - 1]?.date;
                      return (
                        <td key={c} className="py-2 px-3 text-right font-bold text-white">
                          <div>₺{f ? f.indicators.currentPrice.toFixed(4) : '—'}</div>
                          {dateStr && (
                            <div className="text-[9px] text-slate-500 font-normal tabular-nums">
                              ({formatPriceDate(dateStr)})
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Algorithmic Quant Score */}
                  <tr className="hover:bg-slate-900/40 bg-slate-950/20">
                    <td className="py-2 px-3 text-slate-300 font-sans font-semibold">Model Skoru</td>
                    {comparedCodes.map((c) => {
                      const f = fundsData[c];
                      return (
                        <td key={c} className="py-2 px-3 text-right">
                          <span className="font-extrabold text-emerald-400 text-sm">
                            {f ? `${f.scores.totalScore}/100` : '—'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* 1 Month Return */}
                  <tr className="hover:bg-slate-900/40">
                    <td className="py-2 px-3 text-slate-400 font-sans">1 Aylık Getiri</td>
                    {comparedCodes.map((c) => {
                      const f = fundsData[c];
                      const val = f?.getiriler.getiri1a;
                      return (
                        <td
                          key={c}
                          className={`py-2 px-3 text-right font-bold ${
                            val && val >= 0 ? 'text-emerald-400' : val ? 'text-rose-400' : 'text-slate-500'
                          }`}
                        >
                          {val !== null && val !== undefined ? `${val >= 0 ? '+' : ''}%${val.toFixed(2)}` : '—'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* 3 Month Return */}
                  <tr className="hover:bg-slate-900/40">
                    <td className="py-2 px-3 text-slate-400 font-sans">3 Aylık Getiri</td>
                    {comparedCodes.map((c) => {
                      const f = fundsData[c];
                      const val = f?.getiriler.getiri3a;
                      return (
                        <td
                          key={c}
                          className={`py-2 px-3 text-right font-bold ${
                            val && val >= 0 ? 'text-emerald-400' : val ? 'text-rose-400' : 'text-slate-500'
                          }`}
                        >
                          {val !== null && val !== undefined ? `${val >= 0 ? '+' : ''}%${val.toFixed(2)}` : '—'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* 6 Month Return */}
                  <tr className="hover:bg-slate-900/40">
                    <td className="py-2 px-3 text-slate-400 font-sans">6 Aylık Getiri</td>
                    {comparedCodes.map((c) => {
                      const f = fundsData[c];
                      const val = f?.getiriler.getiri6a;
                      return (
                        <td
                          key={c}
                          className={`py-2 px-3 text-right font-bold ${
                            val && val >= 0 ? 'text-emerald-400' : val ? 'text-rose-400' : 'text-slate-500'
                          }`}
                        >
                          {val !== null && val !== undefined ? `${val >= 0 ? '+' : ''}%${val.toFixed(2)}` : '—'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* 1 Year Return */}
                  <tr className="hover:bg-slate-900/40">
                    <td className="py-2 px-3 text-slate-400 font-sans">1 Yıllık Getiri</td>
                    {comparedCodes.map((c) => {
                      const f = fundsData[c];
                      const val = f?.getiriler.getiri1y;
                      return (
                        <td
                          key={c}
                          className={`py-2 px-3 text-right font-bold ${
                            val && val >= 0 ? 'text-emerald-400' : val ? 'text-rose-400' : 'text-slate-500'
                          }`}
                        >
                          {val !== null && val !== undefined ? `${val >= 0 ? '+' : ''}%${val.toFixed(2)}` : '—'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* RSI (14) */}
                  <tr className="hover:bg-slate-900/40 bg-slate-950/20">
                    <td className="py-2 px-3 text-slate-400 font-sans">RSI (14)</td>
                    {comparedCodes.map((c) => {
                      const f = fundsData[c];
                      const rsi = f?.indicators.rsi14;
                      return (
                        <td key={c} className="py-2 px-3 text-right font-bold text-white">
                          {rsi ? rsi.toFixed(1) : '—'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Annualized Volatility */}
                  <tr className="hover:bg-slate-900/40">
                    <td className="py-2 px-3 text-slate-400 font-sans">Yıllık Volatilite</td>
                    {comparedCodes.map((c) => {
                      const f = fundsData[c];
                      return (
                        <td key={c} className="py-2 px-3 text-right text-slate-200">
                          {f ? `%${f.indicators.annualizedVolatility.toFixed(1)}` : '—'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Sharpe Ratio */}
                  <tr className="hover:bg-slate-900/40 bg-slate-950/20">
                    <td className="py-2 px-3 text-slate-400 font-sans">Sharpe Oranı</td>
                    {comparedCodes.map((c) => {
                      const f = fundsData[c];
                      const sharpe = f?.indicators.sharpeRatio;
                      return (
                        <td
                          key={c}
                          className={`py-2 px-3 text-right font-bold ${
                            sharpe && sharpe >= 1 ? 'text-emerald-400' : sharpe && sharpe < 0 ? 'text-rose-400' : 'text-slate-300'
                          }`}
                        >
                          {sharpe !== null && sharpe !== undefined ? sharpe.toFixed(2) : '—'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Max Drawdown */}
                  <tr className="hover:bg-slate-900/40">
                    <td className="py-2 px-3 text-slate-400 font-sans">Max Drawdown</td>
                    {comparedCodes.map((c) => {
                      const f = fundsData[c];
                      return (
                        <td key={c} className="py-2 px-3 text-right text-rose-400 font-bold">
                          {f ? `%${Math.abs(f.indicators.maxDrawdown).toFixed(1)}` : '—'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Detailed Analysis Button */}
                  <tr className="hover:bg-slate-900/40">
                    <td className="py-2 px-3 text-slate-400 font-sans">İşlem</td>
                    {comparedCodes.map((c) => (
                      <td key={c} className="py-2 px-3 text-right">
                        <button
                          onClick={() => onSelectFundForAnalysis(c)}
                          className="px-2.5 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-emerald-400 transition-colors cursor-pointer"
                        >
                          Analiz Et
                        </button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
