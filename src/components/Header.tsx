import React from 'react';
import { Layers, PieChart, BarChart2, Sparkles, GitCompare } from 'lucide-react';

export type AppTab = 'analysis' | 'portfolio' | 'comparison' | 'chat';

interface HeaderProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  portfolioCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  portfolioCount,
}) => {
  return (
    <>
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between relative">
          {/* Brand: Fontables */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                  Fontables<span className="text-emerald-400">.</span>
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Central Tab Navigation (Centered) */}
          <div className="hidden md:flex items-center absolute left-1/2 -translate-x-1/2 bg-slate-900 p-1 rounded-xl border border-slate-800 gap-1 shadow-sm">
            <button
              onClick={() => onTabChange('analysis')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'analysis'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Fon Analizi</span>
            </button>

            <button
              onClick={() => onTabChange('portfolio')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'portfolio'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>Portföyüm</span>
            </button>

            <button
              onClick={() => onTabChange('comparison')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'comparison'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Karşılaştır</span>
            </button>

            <button
              onClick={() => onTabChange('chat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Asistan</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Rock-solid fixed to viewport bottom, no detachment) */}
      <nav
        className="md:hidden fixed inset-x-0 bottom-0 z-40 w-full bg-[#090d16] border-t border-slate-800 shadow-[0_-4px_25px_rgba(0,0,0,0.6)] select-none"
        style={{
          transform: 'translate3d(0, 0, 0)',
          WebkitTransform: 'translate3d(0, 0, 0)',
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0.5rem))',
        }}
      >
        <div className="grid grid-cols-4 gap-1 px-2 pt-1.5 pb-1">
          <button
            type="button"
            onClick={() => onTabChange('analysis')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
              activeTab === 'analysis'
                ? 'text-emerald-400 bg-emerald-500/10 font-bold'
                : 'text-slate-400 hover:text-slate-200 active:bg-slate-900'
            }`}
          >
            <BarChart2 className={`w-5 h-5 mb-1 ${activeTab === 'analysis' ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>Analiz</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('portfolio')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-semibold transition-all relative cursor-pointer ${
              activeTab === 'portfolio'
                ? 'text-emerald-400 bg-emerald-500/10 font-bold'
                : 'text-slate-400 hover:text-slate-200 active:bg-slate-900'
            }`}
          >
            <div className="relative">
              <PieChart className={`w-5 h-5 mb-1 ${activeTab === 'portfolio' ? 'text-emerald-400' : 'text-slate-400'}`} />
              {portfolioCount > 0 && (
                <span className="absolute -top-1 -right-2 px-1 py-0.2 bg-emerald-500 text-slate-950 text-[9px] font-extrabold rounded-full min-w-[14px] text-center">
                  {portfolioCount}
                </span>
              )}
            </div>
            <span>Portföy</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('comparison')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
              activeTab === 'comparison'
                ? 'text-emerald-400 bg-emerald-500/10 font-bold'
                : 'text-slate-400 hover:text-slate-200 active:bg-slate-900'
            }`}
          >
            <GitCompare className={`w-5 h-5 mb-1 ${activeTab === 'comparison' ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>Kıyas</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('chat')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'text-emerald-400 bg-emerald-500/10 font-bold'
                : 'text-slate-400 hover:text-slate-200 active:bg-slate-900'
            }`}
          >
            <Sparkles className={`w-5 h-5 mb-1 ${activeTab === 'chat' ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>AI Asistan</span>
          </button>
        </div>
      </nav>
    </>
  );
};
