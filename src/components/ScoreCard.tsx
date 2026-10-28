import React from 'react';
import { FundScoreBreakdown } from '../types/tefas';
import { Award, TrendingUp, ShieldCheck, Activity } from 'lucide-react';

interface ScoreCardProps {
  scores: FundScoreBreakdown;
}

export const ScoreCard: React.FC<ScoreCardProps> = ({ scores }) => {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scores.totalScore / 100) * circumference;

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-400" />
          <h3 className="font-bold text-white text-sm">Matematiksel Fon Skoru</h3>
        </div>
      </div>

      {/* Main Score Display */}
      <div className="my-3.5 flex items-center justify-center gap-5">
        <div className="relative flex items-center justify-center">
          <svg className="w-28 h-28 transform -rotate-90 overflow-visible" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              className="text-slate-800/70"
              fill="transparent"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke={scores.gradeColor}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span
              className="text-3xl font-black tabular-nums tracking-tight"
              style={{ color: scores.gradeColor }}
            >
              {scores.totalScore}
            </span>
            <span className="text-[10px] tabular-nums text-slate-400">/ 100</span>
          </div>
        </div>

        <div className="flex-1">
          <div
            className="text-xs font-bold px-3 py-1.5 rounded-xl border inline-block"
            style={{
              borderColor: `${scores.gradeColor}40`,
              backgroundColor: `${scores.gradeColor}15`,
              color: scores.gradeColor,
            }}
          >
            {scores.gradeBadge}
          </div>
        </div>
      </div>

      {/* 4 Weight Factors Breakdown */}
      <div className="space-y-2.5 pt-3 border-t border-slate-800/80">
        {/* Return Performance (%30) */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-300 flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              Getiri Performansı (%30)
            </span>
            <span className="tabular-nums font-bold text-white">{scores.returnScore}</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-400 h-1.5 rounded-full"
              style={{ width: `${scores.returnScore}%` }}
            ></div>
          </div>
        </div>

        {/* Sharpe (%30) */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Award className="w-3 h-3 text-cyan-400" />
              Sharpe / Risk Oranı (%30)
            </span>
            <span className="tabular-nums font-bold text-white">{scores.sharpeScore}</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-cyan-400 h-1.5 rounded-full"
              style={{ width: `${scores.sharpeScore}%` }}
            ></div>
          </div>
        </div>

        {/* Technical Signals (%20) */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-indigo-400" />
              Teknik Sinyal (RSI &amp; SMA) (%20)
            </span>
            <span className="tabular-nums font-bold text-white">{scores.techSignalScore}</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-400 h-1.5 rounded-full"
              style={{ width: `${scores.techSignalScore}%` }}
            ></div>
          </div>
        </div>

        {/* Volatility & Drawdown (%20) */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-amber-400" />
              Volatilite &amp; Max DD (%20)
            </span>
            <span className="tabular-nums font-bold text-white">{scores.riskDrawdownScore}</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-amber-400 h-1.5 rounded-full"
              style={{ width: `${scores.riskDrawdownScore}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};
