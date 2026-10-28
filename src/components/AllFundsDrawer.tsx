import React, { useState, useMemo } from 'react';
import { TefasListRaw } from '../types/tefas';
import { X, Search, Check, ChevronRight, Award, ArrowUpDown, Filter } from 'lucide-react';
import { FUND_CATEGORIES } from './FundSearch';

interface AllFundsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  fundsList: TefasListRaw[];
  onSelectFund: (code: string) => void;
  currentCode: string;
}

export const isFundKatilim = (fund: TefasListRaw): boolean => {
  const unvan = (fund.fonUnvan || '').toUpperCase();
  const tur = (fund.fonTurAciklama || '').toUpperCase();
  return (
    tur.includes('KATILIM') ||
    unvan.includes('KATILIM') ||
    unvan.includes('KİRA') ||
    unvan.includes('KIRA') ||
    unvan.includes('SUKUK') ||
    unvan.includes('FAİZSİZ')
  );
};

export const matchesCategory = (fund: TefasListRaw, cat: string): boolean => {
  if (cat === 'Tümü') return true;
  const t = (fund.fonTurAciklama || '').toLowerCase();
  const u = (fund.fonUnvan || '').toLowerCase();

  if (cat === 'Hisse Senedi') return t.includes('hisse') || u.includes('hisse');
  if (cat === 'Değişken')
    return (
      t.includes('değişken') ||
      t.includes('degisken') ||
      u.includes('değişken') ||
      u.includes('degisken')
    );
  if (cat === 'Kıymetli Madenler')
    return (
      t.includes('kıymetli') ||
      t.includes('maden') ||
      u.includes('altın') ||
      u.includes('altin') ||
      u.includes('gümüş') ||
      u.includes('gumus')
    );
  if (cat === 'Para Piyasası')
    return t.includes('para') || u.includes('para') || u.includes('likit');
  if (cat === 'Fon Sepeti') return t.includes('sepeti') || u.includes('sepeti');
  if (cat === 'Borçlanma Araçları')
    return (
      t.includes('borçlanma') ||
      t.includes('borclanma') ||
      t.includes('tahvil') ||
      t.includes('bono') ||
      u.includes('kira') ||
      u.includes('sukuk')
    );
  if (cat === 'Katılım') return isFundKatilim(fund);
  if (cat === 'Karma') return t.includes('karma') || u.includes('karma');
  if (cat === 'Serbest') return t.includes('serbest') || u.includes('serbest');
  if (cat === 'Gayrimenkul / Girişim')
    return (
      t.includes('gayrimenkul') ||
      t.includes('girişim') ||
      u.includes('gyf') ||
      u.includes('gsyf')
    );

  return true;
};

// Fast mathematical score calculation (0 - 100) for catalog listing
export const calculateFastScore = (fund: TefasListRaw): number => {
  const r1y = typeof fund.getiri1y === 'number' ? fund.getiri1y : null;
  const r6m = typeof fund.getiri6a === 'number' ? fund.getiri6a : null;
  const r1m = typeof fund.getiri1a === 'number' ? fund.getiri1a : null;
  const ryb = typeof fund.getiriyb === 'number' ? fund.getiriyb : null;
  const risk = Number(fund.riskDegeri) || 4;

  let retBase = 50;
  if (r1y !== null) {
    retBase = Math.min(100, Math.max(10, 45 + (r1y - 35) * 0.7));
  } else if (r6m !== null) {
    retBase = Math.min(100, Math.max(10, 45 + (r6m - 18) * 1.2));
  } else if (r1m !== null) {
    retBase = Math.min(100, Math.max(10, 45 + (r1m - 3.5) * 4));
  }

  // Risk-adjusted efficiency
  let riskScore = 75;
  if (risk >= 6) {
    // High risk needs high return to justify score
    riskScore = retBase > 65 ? 80 : 55;
  } else if (risk <= 3) {
    // Low risk capital preservation
    riskScore = retBase > 40 ? 85 : 70;
  }

  // Momentum (YTD)
  let momScore = 65;
  if (ryb !== null) {
    momScore = Math.min(95, Math.max(30, 50 + ryb * 0.9));
  }

  const finalScore = Math.round(retBase * 0.45 + riskScore * 0.35 + momScore * 0.2);
  return Math.min(99, Math.max(25, finalScore));
};

export const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
  if (score >= 65) return 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30';
  if (score >= 50) return 'text-amber-400 bg-amber-500/15 border-amber-500/30';
  return 'text-rose-400 bg-rose-500/15 border-rose-500/30';
};

export const AllFundsDrawer: React.FC<AllFundsDrawerProps> = ({
  isOpen,
  onClose,
  fundsList,
  onSelectFund,
  currentCode,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');
  const [isKatilimOnly, setIsKatilimOnly] = useState(false);
  const [sortBy, setSortBy] = useState<
    'score' | 'getiri1y' | 'getiriyb' | 'getiri6a' | 'getiri3a' | 'getiri1a' | 'code' | 'risk'
  >('score');

  // Compute scores and sort
  const scoredFunds = useMemo(() => {
    return fundsList.map((f) => ({
      ...f,
      calcScore: calculateFastScore(f),
    }));
  }, [fundsList]);

  const filteredFunds = useMemo(() => {
    let result = scoredFunds.filter((f) => {
      const matchSearch =
        !searchTerm ||
        f.fonKodu.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.fonUnvan.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCat = matchesCategory(f, selectedCategory);
      const matchKatilim = !isKatilimOnly || isFundKatilim(f);

      return matchSearch && matchCat && matchKatilim;
    });

    result.sort((a, b) => {
      if (sortBy === 'score') return b.calcScore - a.calcScore;
      if (sortBy === 'getiri1y') return (b.getiri1y || -999) - (a.getiri1y || -999);
      if (sortBy === 'getiriyb') return (b.getiriyb || -999) - (a.getiriyb || -999);
      if (sortBy === 'getiri6a') return (b.getiri6a || -999) - (a.getiri6a || -999);
      if (sortBy === 'getiri3a') return (b.getiri3a || -999) - (a.getiri3a || -999);
      if (sortBy === 'getiri1a') return (b.getiri1a || -999) - (a.getiri1a || -999);
      if (sortBy === 'code') return a.fonKodu.localeCompare(b.fonKodu);
      if (sortBy === 'risk') return Number(b.riskDegeri || 0) - Number(a.riskDegeri || 0);
      return 0;
    });

    return result;
  }, [scoredFunds, searchTerm, selectedCategory, isKatilimOnly, sortBy]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      {/* Centered Modal Window */}
      <div
        className="w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white">
                  TEFAS Fon Kataloğu &amp; Puan Tablosu
                </h2>
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/10 text-emerald-400 font-bold tabular-nums border border-emerald-500/20">
                  {filteredFunds.length} Fon
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Puan ve getirilere göre sıralanmış fonları inceleyin ve seçin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters & Sorting Controls */}
        <div className="p-3 sm:p-4 border-b border-slate-800 space-y-2.5 bg-slate-900/40">
          {/* Search + Katilim Filter + Sort Selector */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Fon ara (Kod veya fon adı)..."
                className="w-full pl-8 pr-3 py-1.5 sm:py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 uppercase"
              />
            </div>

            {/* Katılım Toggle */}
            <button
              onClick={() => setIsKatilimOnly(!isKatilimOnly)}
              className={`px-2.5 py-1.5 sm:py-2 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 border transition-all cursor-pointer shrink-0 ${
                isKatilimOnly
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <span
                className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[8px] ${
                  isKatilimOnly
                    ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                    : 'border-slate-700 bg-slate-900'
                }`}
              >
                {isKatilimOnly && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </span>
              <span>Katılım (Faizsiz)</span>
            </button>

            {/* Sort Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px] text-slate-400 hidden sm:inline">Sırala:</span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="score">Puana Göre (En Yüksek Skor)</option>
                <option value="getiri1y">1 Yıllık Getiri (% En Çok)</option>
                <option value="getiriyb">Yılbaşı (YTD) Getirisi</option>
                <option value="getiri6a">6 Aylık Getiri</option>
                <option value="getiri3a">3 Aylık Getiri</option>
                <option value="getiri1a">1 Aylık Getiri</option>
                <option value="code">Fon Kodu (A-Z)</option>
                <option value="risk">Risk Değerine Göre</option>
              </select>
            </div>
          </div>

          {/* All Categories Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] no-scrollbar">
            {FUND_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Funds List Grid */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 divide-y divide-slate-800/60 max-h-[58vh]">
          {filteredFunds.length === 0 ? (
            <div className="py-14 text-center text-slate-500 text-xs">
              Arama kriterlerine uygun fon bulunamadı.
            </div>
          ) : (
            filteredFunds.map((fund) => {
              const isSelected = fund.fonKodu === currentCode;
              const has1y = fund.getiri1y !== null && fund.getiri1y !== undefined;
              const isPos1y = has1y && Number(fund.getiri1y) >= 0;
              const has1m = fund.getiri1a !== null && fund.getiri1a !== undefined;
              const isPos1m = has1m && Number(fund.getiri1a) >= 0;
              const katilimBadge = isFundKatilim(fund);
              const scoreColorClass = getScoreColor(fund.calcScore);

              return (
                <div
                  key={fund.fonKodu}
                  onClick={() => {
                    onSelectFund(fund.fonKodu);
                    onClose();
                  }}
                  className={`py-2.5 px-3 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-emerald-500/15 border border-emerald-500/30'
                      : 'hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex-1 pr-3 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Fund Code */}
                      <span className="font-extrabold text-xs text-white bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 tabular-nums">
                        {fund.fonKodu}
                      </span>

                      {/* Quant Score Badge Next to Name */}
                      <span
                        className={`text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-md border flex items-center gap-1 ${scoreColorClass}`}
                        title="Algoritmik Matematiksel Skor (0-100)"
                      >
                        <Award className="w-3 h-3" />
                        <span>{fund.calcScore} Puan</span>
                      </span>

                      {/* Category */}
                      <span className="text-[10px] text-slate-400 truncate max-w-[140px] sm:max-w-[220px]">
                        {fund.fonTurAciklama || 'Yatırım Fonu'}
                      </span>

                      {katilimBadge && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                          Katılım
                        </span>
                      )}

                      {fund.riskDegeri && (
                        <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800 tabular-nums">
                          Risk {fund.riskDegeri}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-200 font-semibold mt-1 truncate">
                      {fund.fonUnvan}
                    </div>
                  </div>

                  {/* Return Badges on right side */}
                  <div className="flex items-center gap-3 sm:gap-4 shrink-0 text-right tabular-nums">
                    {/* 1 Month */}
                    <div className="hidden sm:block">
                      <div className="text-[9px] uppercase font-semibold text-slate-500">1 Ay</div>
                      <div
                        className={`text-xs font-bold ${
                          has1m
                            ? isPos1m
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {has1m ? `${isPos1m ? '+' : ''}%${Number(fund.getiri1a).toFixed(1)}` : '—'}
                      </div>
                    </div>

                    {/* 1 Year */}
                    <div>
                      <div className="text-[9px] uppercase font-semibold text-slate-500">1 Yıl</div>
                      <div
                        className={`text-xs sm:text-sm font-bold ${
                          has1y
                            ? isPos1y
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {has1y ? `${isPos1y ? '+' : ''}%${Number(fund.getiri1y).toFixed(1)}` : '—'}
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
