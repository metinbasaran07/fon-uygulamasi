import React, { useState } from 'react';
import { Search, ListFilter, TrendingUp, RefreshCw } from 'lucide-react';

interface FundSearchProps {
  currentCode: string;
  onSelectFund: (code: string) => void;
  isLoading: boolean;
  onOpenAllFunds: () => void;
}

export const FUND_CATEGORIES = [
  'Tümü',
  'Hisse Senedi',
  'Değişken',
  'Katılım',
  'Para Piyasası',
  'Kıymetli Madenler',
  'Fon Sepeti',
  'Borçlanma Araçları',
  'Karma',
  'Serbest',
  'Gayrimenkul / Girişim',
];

export const FundSearch: React.FC<FundSearchProps> = ({
  currentCode,
  onSelectFund,
  isLoading,
  onOpenAllFunds,
}) => {
  const [searchInput, setSearchInput] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchInput.trim().toUpperCase();
    if (clean) {
      onSelectFund(clean);
      setSearchInput('');
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Search input form */}
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
              placeholder="Fon Kodu Girin (Örn: TI2, MAC, IIH, PK1...)"
              maxLength={6}
              className="w-full pl-9 pr-3 py-2 sm:py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs sm:text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500 transition-all uppercase"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !searchInput.trim()}
            className="px-3.5 py-2 sm:py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <TrendingUp className="w-3.5 h-3.5" />
            )}
            <span>İncele</span>
          </button>
        </form>

        {/* Full Catalog Button */}
        <button
          type="button"
          onClick={onOpenAllFunds}
          className="px-3 py-2 sm:py-2.5 rounded-lg bg-slate-950 hover:bg-slate-900 text-slate-300 border border-slate-800 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          <ListFilter className="w-3.5 h-3.5 text-emerald-400" />
          <span>Tüm Fonlar (1000+)</span>
        </button>
      </div>
    </div>
  );
};
