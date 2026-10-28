import React, { useState, useEffect } from 'react';
import { TefasListRaw, FundAnalysisResult, TefasPriceRaw } from '../types/tefas';
import { analyzeFundData } from '../utils/quantEngine';
import { getFundStopajInfo } from '../utils/taxEngine';
import { Plus, X, Search, GitCompare, Award, Activity, TrendingUp, ShieldAlert, Zap, RefreshCw } from 'lucide-react';

interface FundComparisonViewProps {
  fundsList: TefasListRaw[];
  onSelectFundForAnalysis: (fonKodu: string) => void;
  initialFunds?: string[];
}

export const FundComparisonView: React.FC<FundComparisonViewProps> = ({
  fundsList,
  onSelectFundForAnalysis,
  initialFunds = ['TI2', 'MAC', 'IIH'],
}) => {
  const [comparedCodes, setComparedCodes] = useState<string[]>(initialFunds);
  const [fundsData, setFundsData] = useState<Record<string, FundAnalysisResult>>({});
  const [loadingCodes, setLoadingCodes] = useState<Record<string, boolean>>({});
  const [searchInput, setSearchInput] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<number>(12); // 12 months = 1 year

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

  const handleAddCode = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchInput.trim().toUpperCase();
    if (clean && !comparedCodes.includes(clean)) {
      if (comparedCodes.length >= 4) {
        alert('En fazla 4 fonu aynı anda karşılaştırabilirsiniz.');
        return;
      }
      setComparedCodes((prev) => [...prev, clean]);
      fetchFundData(clean, selectedPeriod);
      setSearchInput('');
    }
  };

  const handleRemoveCode = (code: string) => {
    setComparedCodes((prev) => prev.filter((c) => c !== code));
  };

  // Build Normalized Return Chart
  const lineColors = ['#10b981', '#38bdf8', '#f59e0b', '#ec4899'];

  // Find common date count
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

        {/* Add Fund Form */}
        <form onSubmit={handleAddCode} className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
              placeholder="Fon Kodu Ekle..."
              maxLength={6}
              className="pl-8 pr-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 font-mono uppercase focus:outline-none focus:border-emerald-500 w-32 sm:w-40"
            />
          </div>
          <button
            type="submit"
            disabled={!searchInput.trim()}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ekle</span>
          </button>
        </form>
      </div>

      {/* Selected Fund Chips */}
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
              <button
                onClick={() => onSelectFundForAnalysis(code)}
                className="font-bold text-white hover:text-emerald-400 transition-colors cursor-pointer"
                title="Detaylı Analize Git"
              >
                {code}
              </button>
              {isLoading && <RefreshCw className="w-3 h-3 text-slate-400 animate-spin" />}
              {comparedCodes.length > 1 && (
                <button
                  onClick={() => handleRemoveCode(code)}
                  className="p-0.5 text-slate-500 hover:text-rose-400 cursor-pointer ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

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

              {/* Stopaj Bilgisi (NEW!) */}
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
                  return (
                    <td key={c} className="py-2 px-3 text-right font-bold text-white">
                      ₺{f ? f.indicators.currentPrice.toFixed(4) : '—'}
                    </td>
                  );
                })}
              </tr>

              {/* Algorithmic Score */}
              <tr className="hover:bg-slate-900/40">
                <td className="py-2 px-3 text-slate-400 font-sans">Fon Skoru (0-100)</td>
                {comparedCodes.map((c) => {
                  const f = fundsData[c];
                  return (
                    <td key={c} className="py-2 px-3 text-right">
                      {f ? (
                        <span className="font-bold text-xs" style={{ color: f.scores.gradeColor }}>
                          {f.scores.totalScore} ({f.scores.gradeTier})
                        </span>
                      ) : (
                        '—'
                      )}
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
                  const isPos = val !== null && val !== undefined && Number(val) >= 0;
                  return (
                    <td key={c} className={`py-2 px-3 text-right font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {val !== null && val !== undefined ? `${isPos ? '+' : ''}%${Number(val).toFixed(2)}` : '—'}
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
                  const isPos = val !== null && val !== undefined && Number(val) >= 0;
                  return (
                    <td key={c} className={`py-2 px-3 text-right font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {val !== null && val !== undefined ? `${isPos ? '+' : ''}%${Number(val).toFixed(2)}` : '—'}
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
                  const isPos = val !== null && val !== undefined && Number(val) >= 0;
                  return (
                    <td key={c} className={`py-2 px-3 text-right font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {val !== null && val !== undefined ? `${isPos ? '+' : ''}%${Number(val).toFixed(2)}` : '—'}
                    </td>
                  );
                })}
              </tr>

              {/* RSI (14) */}
              <tr className="hover:bg-slate-900/40">
                <td className="py-2 px-3 text-slate-400 font-sans">RSI (14 Günlük)</td>
                {comparedCodes.map((c) => {
                  const f = fundsData[c];
                  const rsi = f?.indicators.rsi14;
                  return (
                    <td key={c} className="py-2 px-3 text-right font-semibold text-cyan-400">
                      {rsi ? rsi.toFixed(1) : '—'}
                    </td>
                  );
                })}
              </tr>

              {/* Annual Volatility */}
              <tr className="hover:bg-slate-900/40">
                <td className="py-2 px-3 text-slate-400 font-sans">Yıllık Volatilite</td>
                {comparedCodes.map((c) => {
                  const f = fundsData[c];
                  return (
                    <td key={c} className="py-2 px-3 text-right text-orange-400 font-semibold">
                      {f ? `%${f.indicators.annualizedVolatility.toFixed(1)}` : '—'}
                    </td>
                  );
                })}
              </tr>

              {/* Sharpe Ratio */}
              <tr className="hover:bg-slate-900/40">
                <td className="py-2 px-3 text-slate-400 font-sans">Sharpe Oranı</td>
                {comparedCodes.map((c) => {
                  const f = fundsData[c];
                  return (
                    <td key={c} className="py-2 px-3 text-right text-emerald-400 font-bold">
                      {f ? f.indicators.sharpeRatio.toFixed(2) : '—'}
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
    </div>
  );
};
