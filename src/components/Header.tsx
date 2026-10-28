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
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
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

          {/* Desktop Central Tab Navigation (Hidden on Mobile) */}
          <div className="hidden md:flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 gap-1">
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

      {/* Mobile Bottom Navigation Bar (No Overlapping, Perfect Touch Targets) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-lg px-2 py-1.5 shadow-2xl">
        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={() => onTabChange('analysis')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
              activeTab === 'analysis'
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-4 h-4 mb-0.5" />
            <span>Analiz</span>
          </button>

          <button
            onClick={() => onTabChange('portfolio')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-lg text-[10px] font-semibold transition-all relative cursor-pointer ${
              activeTab === 'portfolio'
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex flex-col items-center">
              <PieChart className="w-4 h-4 mb-0.5" />
              <span>Portföy</span>
            </div>
          </button>

          <button
            onClick={() => onTabChange('comparison')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
              activeTab === 'comparison'
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitCompare className="w-4 h-4 mb-0.5" />
            <span>Kıyas</span>
          </button>

          <button
            onClick={() => onTabChange('chat')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 mb-0.5" />
            <span>AI Asistan</span>
          </button>
        </div>
      </nav>
    </>
  );
};
