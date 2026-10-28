import React from 'react';
import { FundAnalysisResult } from '../types/tefas';
import { ArrowUpRight, ArrowDownRight, Plus, Percent, Award } from 'lucide-react';
import { getFundStopajInfo } from '../utils/taxEngine';

interface FundOverviewCardProps {
  fund: FundAnalysisResult;
  onOpenAddToPortfolio: () => void;
  liveProfile?: {
    stopajRate: number;
    stopajLabel: string;
    isStopajExempt: boolean;
    stopajDesc: string;
    fonSatisValor?: number;
    fonGeriAlisValor?: number;
    kapLink?: string;
  } | null;
}

export const FundOverviewCard: React.FC<FundOverviewCardProps> = ({
  fund,
  onOpenAddToPortfolio,
  liveProfile,
}) => {
  const isDailyPositive = fund.indicators.dailyChangePercent >= 0;
  const fallbackStopaj = getFundStopajInfo(fund.fonUnvan, fund.kategori);

  const stopajInfo = liveProfile
    ? {
        rate: liveProfile.stopajRate,
        label: liveProfile.stopajLabel,
        isExempt: liveProfile.isStopajExempt,
        description: liveProfile.stopajDesc,
      }
    : fallbackStopaj;

  const scoreBadgeColor = fund.scores.gradeColor || '#10b981';

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Fund Code */}
            <span className="text-xl sm:text-2xl font-black tabular-nums tracking-tight text-white bg-slate-950 px-2.5 py-0.5 rounded-lg border border-slate-800">
              {fund.fonKodu}
            </span>

            {/* Fund Quant Score Displayed Next to Name */}
            <div
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold tabular-nums shadow-sm"
              style={{
                backgroundColor: `${scoreBadgeColor}15`,
                borderColor: `${scoreBadgeColor}40`,
                color: scoreBadgeColor,
              }}
              title="Algoritmik Matematiksel Fon Skoru (0 - 100)"
            >
              <Award className="w-3.5 h-3.5" />
              <span>{fund.scores.totalScore} / 100</span>
              <span className="text-[10px] opacity-80 hidden sm:inline">
                ({fund.scores.gradeTier})
              </span>
            </div>

            {/* Risk */}
            {fund.riskDegeri && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-md bg-slate-950 text-slate-400 border border-slate-800 tabular-nums">
                Risk: {fund.riskDegeri}/7
              </span>
            )}

            {/* Live TEFAS Stopaj Badge */}
            <span
              className={`px-2 py-0.5 text-[10px] rounded-md font-semibold flex items-center gap-1 border tabular-nums ${
                stopajInfo.isExempt
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              }`}
              title={`${stopajInfo.description}${
                liveProfile?.fonSatisValor !== undefined
                  ? ` (Alış Valörü: T+${liveProfile.fonSatisValor}, Satış Valörü: T+${liveProfile.fonGeriAlisValor})`
                  : ''
              }`}
            >
              <Percent className="w-2.5 h-2.5" />
              <span>{stopajInfo.label}</span>
            </span>

            {/* Add to Portfolio Button */}
            <button
              onClick={onOpenAddToPortfolio}
              className="ml-auto sm:ml-2 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Portföye Ekle</span>
            </button>
          </div>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <h2 className="text-xs sm:text-sm font-semibold text-slate-200 line-clamp-1">
              {fund.fonUnvan}
            </h2>
            <span
              className="text-[10px] px-1.5 py-0.2 rounded font-medium border"
              style={{
                borderColor: `${scoreBadgeColor}30`,
                color: scoreBadgeColor,
              }}
            >
              {fund.scores.gradeBadge.split(' - ')[1] || 'Dengeli'}
            </span>
          </div>
        </div>

        {/* Price & Daily Return (Clean tabular sans-serif digits, no slashed zeros) */}
        <div className="flex items-center gap-3 bg-slate-950/60 px-3 py-1.5 sm:py-2 rounded-lg border border-slate-800 self-start sm:self-auto tabular-nums">
          <div>
            <div className="text-[9px] uppercase font-semibold text-slate-400">Birim Fiyat</div>
            <div className="text-base sm:text-lg font-bold text-white tracking-tight">
              ₺
              {fund.indicators.currentPrice.toLocaleString('tr-TR', {
                minimumFractionDigits: 4,
                maximumFractionDigits: 6,
              })}
            </div>
          </div>

          <div className="border-l border-slate-800 pl-3">
            <div className="text-[9px] uppercase font-semibold text-slate-400">Günlük Değişim</div>
            <div
              className={`flex items-center text-xs sm:text-sm font-bold ${
                isDailyPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isDailyPositive ? (
                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
              )}
              %{Math.abs(fund.indicators.dailyChangePercent).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Dönemsel Getiriler Bar (Clean non-slashed digits) */}
      <div className="mt-2.5 grid grid-cols-3 sm:grid-cols-5 gap-1.5 tabular-nums">
        {[
          { label: '1 Ay', val: fund.getiriler.getiri1a },
          { label: '3 Ay', val: fund.getiriler.getiri3a },
          { label: '6 Ay', val: fund.getiriler.getiri6a },
          { label: '1 Yıl', val: fund.getiriler.getiri1y },
          { label: 'YTD', val: fund.getiriler.getiriyb },
        ].map((item, i) => {
          const hasVal = item.val !== null && item.val !== undefined;
          const isPos = hasVal && Number(item.val) >= 0;
          return (
            <div
              key={i}
              className="bg-slate-950/40 border border-slate-800/60 rounded-lg px-2 py-1.5 flex items-center justify-between"
            >
              <span className="text-[10px] text-slate-400 font-medium">{item.label}</span>
              <span
                className={`text-[11px] font-bold ${
                  hasVal ? (isPos ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-500'
                }`}
              >
                {hasVal ? `${isPos ? '+' : ''}%${Number(item.val).toFixed(1)}` : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
