import React from 'react';
import { TechnicalIndicators } from '../types/tefas';
import { Activity, TrendingUp, ShieldAlert, Zap, Compass, ArrowUp, ArrowDown } from 'lucide-react';

interface TechnicalIndicatorsGridProps {
  indicators: TechnicalIndicators;
}

export const TechnicalIndicatorsGrid: React.FC<TechnicalIndicatorsGridProps> = ({ indicators }) => {
  const getRsiColor = (val: number | null) => {
    if (val === null) return 'text-slate-400';
    if (val >= 70) return 'text-rose-400';
    if (val <= 30) return 'text-emerald-400';
    return 'text-cyan-400';
  };

  const isPriceAboveSma20 =
    indicators.sma20 !== null && indicators.currentPrice >= indicators.sma20;
  const isPriceAboveSma50 =
    indicators.sma50 !== null && indicators.currentPrice >= indicators.sma50;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 tabular-nums">
      {/* 1. RSI (14) */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
        <div>
          <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-cyan-400" />
              RSI (14)
            </span>
            <span className="text-slate-500">Momentum</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className={`text-xl font-bold ${getRsiColor(indicators.rsi14)}`}>
              {indicators.rsi14 !== null ? indicators.rsi14.toFixed(1) : '—'}
            </span>
            <span className="text-[10px] text-slate-500">/ 100</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-800/60">
          <span className="text-[10px] font-semibold text-slate-300 block truncate">
            {indicators.rsiCondition}
          </span>
        </div>
      </div>

      {/* 2. SMA 20 */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
        <div>
          <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-blue-400" />
              SMA 20
            </span>
            <span className="text-slate-500">20 Gün</span>
          </div>
          <div className="mt-2 text-xl font-bold text-white">
            ₺{indicators.sma20 ? indicators.sma20.toLocaleString('tr-TR', { minimumFractionDigits: 4 }) : '—'}
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center gap-1">
          <span
            className={`text-[10px] font-semibold flex items-center ${
              isPriceAboveSma20 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isPriceAboveSma20 ? <ArrowUp className="w-3 h-3 mr-0.5" /> : <ArrowDown className="w-3 h-3 mr-0.5" />}
            {isPriceAboveSma20 ? 'Fiyat Üstte' : 'Fiyat Altta'}
          </span>
        </div>
      </div>

      {/* 3. SMA 50 */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
        <div>
          <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Compass className="w-3 h-3 text-amber-400" />
              SMA 50
            </span>
            <span className="text-slate-500">Ana Trend</span>
          </div>
          <div className="mt-2 text-xl font-bold text-white">
            ₺{indicators.sma50 ? indicators.sma50.toLocaleString('tr-TR', { minimumFractionDigits: 4 }) : '—'}
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-800/60">
          <span className="text-[10px] font-semibold text-slate-300 block truncate">
            {indicators.smaCrossSignal !== 'NÖTR' ? indicators.smaCrossSignal : indicators.smaSignal.split(' ')[0]}
          </span>
        </div>
      </div>

      {/* 4. Volatilite */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
        <div>
          <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-orange-400" />
              Yıllık Volatilite
            </span>
            <span className="text-slate-500">Oynaklık</span>
          </div>
          <div className="mt-2 text-xl font-bold text-white">
            %{indicators.annualizedVolatility.toFixed(1)}
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-800/60">
          <span className="text-[10px] text-slate-400 block truncate">
            {indicators.volatilityRiskClass}
          </span>
        </div>
      </div>

      {/* 5. Sharpe & MDD */}
      <div className="col-span-2 sm:col-span-1 bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
        <div>
          <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-emerald-400" />
              Sharpe &amp; Max DD
            </span>
            <span className="text-slate-500">Risk/Getiri</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-emerald-400">
                {indicators.sharpeRatio.toFixed(2)}
              </div>
              <div className="text-[9px] text-slate-500">Sharpe</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-rose-400">
                %{Math.abs(indicators.maxDrawdown).toFixed(1)}
              </div>
              <div className="text-[9px] text-slate-500">Max DD</div>
            </div>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-800/60">
          <span className="text-[10px] text-emerald-400 font-semibold block truncate">
            Verimlilik: {indicators.sharpeClass}
          </span>
        </div>
      </div>
    </div>
  );
};
