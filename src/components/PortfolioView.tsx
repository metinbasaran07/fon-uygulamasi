import React, { useState, useMemo } from 'react';
import {
  PortfolioHolding,
  PortfolioHoldingCalculated,
  PortfolioSummary,
  PortfolioTransaction,
} from '../types/portfolio';
import { TefasListRaw } from '../types/tefas';
import {
  Plus,
  Trash2,
  PieChart,
  Calendar,
  History,
  ArrowUpRight,
  ArrowDownRight,
  BarChart2,
  Filter,
  Percent,
} from 'lucide-react';
import { TransactionHistoryModal } from './TransactionHistoryModal';
import { getFundStopajInfo } from '../utils/taxEngine';

interface PortfolioViewProps {
  holdings: PortfolioHolding[];
  fundsList: TefasListRaw[];
  onOpenAddModal: () => void;
  onRemoveHolding: (id: string) => void;
  onSelectFundForAnalysis: (fonKodu: string) => void;
  latestPricesMap: Record<string, number>;
  dailyChangesMap?: Record<
    string,
    { currentPrice: number; prevPrice: number; dailyChangeTL: number; dailyChangePercent: number }
  >;
  onAddTransaction: (holdingId: string, tx: PortfolioTransaction) => void;
  onDeleteTransaction: (holdingId: string, txId: string) => void;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  holdings,
  fundsList,
  onOpenAddModal,
  onRemoveHolding,
  onSelectFundForAnalysis,
  latestPricesMap,
  dailyChangesMap,
  onAddTransaction,
  onDeleteTransaction,
}) => {
  const [selectedTxHolding, setSelectedTxHolding] = useState<PortfolioHolding | null>(null);

  // Midas-style toggle: 'daily' (Günlük) or 'total' (Toplam)
  const [displayMode, setDisplayMode] = useState<'daily' | 'total'>('daily');

  // Historical Date Profit feature state ("Tarihe Göre Göster")
  const [valuationDate, setValuationDate] = useState<'today' | '1w' | '1m' | '3m' | '1y' | 'ytd' | 'custom'>('today');
  const [customDate, setCustomDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });

  // Calculate live values
  const { calculatedHoldings, summary, categoryAllocation, historicalMetrics } = useMemo(() => {
    let toplamDeger = 0;
    let toplamMaliyet = 0;
    let toplamTahminiStopajTL = 0;
    let toplamGunlukDegisimTL = 0;

    const list: PortfolioHoldingCalculated[] = holdings.map((h) => {
      const meta = fundsList.find((f) => f.fonKodu === h.fonKodu);
      const dailyInfo = dailyChangesMap?.[h.fonKodu];
      const livePrice = dailyInfo?.currentPrice || latestPricesMap[h.fonKodu] || h.alisFiyati;
      const deg = h.adet * livePrice;
      const mal = h.adet * h.alisFiyati;
      const kzTL = deg - mal;
      const kzPct = mal > 0 ? (kzTL / mal) * 100 : 0;

      // Real TEFAS daily price difference for this holding
      const prevP = dailyInfo?.prevPrice ?? (dailyInfo?.currentPrice ? dailyInfo.currentPrice - dailyInfo.dailyChangeTL : livePrice);
      const fundDailyPct = dailyInfo?.dailyChangePercent ?? 0;
      const fundDailyTL = h.adet * (livePrice - prevP);

      toplamGunlukDegisimTL += fundDailyTL;

      const stopaj = getFundStopajInfo(h.fonUnvan, h.kategori || meta?.fonTurAciklama);
      const estTax = kzTL > 0 && !stopaj.isExempt ? kzTL * 0.1 : 0;
      toplamTahminiStopajTL += estTax;

      toplamDeger += deg;
      toplamMaliyet += mal;

      return {
        ...h,
        guncelFiyat: livePrice,
        toplamDeger: deg,
        toplamMaliyet: mal,
        karZararTL: kzTL,
        karZararYuzde: kzPct,
        portfoyOrani: 0,
        tahminiStopajTL: estTax,
        netDegerTL: deg - estTax,
        kategori: h.kategori || meta?.fonTurAciklama || 'Yatırım Fonu',
        gunlukDegisimTL: fundDailyTL,
        gunlukDegisimYuzde: fundDailyPct,
      };
    });

    list.forEach((item) => {
      item.portfoyOrani = toplamDeger > 0 ? (item.toplamDeger / toplamDeger) * 100 : 0;
    });

    const toplamKarZararTL = toplamDeger - toplamMaliyet;
    const toplamKarZararYuzde =
      toplamMaliyet > 0 ? (toplamKarZararTL / toplamMaliyet) * 100 : 0;

    // Total portfolio daily percentage
    const prevTotalDeger = toplamDeger - toplamGunlukDegisimTL;
    const toplamGunlukDegisimYuzde =
      prevTotalDeger > 0 ? (toplamGunlukDegisimTL / prevTotalDeger) * 100 : 0;

    // Category breakdown
    const catMap: Record<string, number> = {};
    list.forEach((item) => {
      const cat = item.kategori || 'Diğer';
      catMap[cat] = (catMap[cat] || 0) + item.toplamDeger;
    });

    const categoryAllocation = Object.entries(catMap)
      .map(([name, val]) => ({
        name: name.replace(' Şemsiye Fonu', ''),
        val,
        pct: toplamDeger > 0 ? (val / toplamDeger) * 100 : 0,
      }))
      .sort((a, b) => b.val - a.val);

    // Calculate historical return estimate based on TEFAS return rates
    let pastValuationMultiplier = 1;
    let periodLabel = 'Bugün';

    if (valuationDate === '1w') {
      periodLabel = '1 Hafta';
      pastValuationMultiplier = 0.99; // approx week return adjustment
    } else if (valuationDate === '1m') {
      periodLabel = '1 Ay';
      let weightedReturn = 0;
      list.forEach((it) => {
        const meta = fundsList.find((f) => f.fonKodu === it.fonKodu);
        const r1a = meta?.getiri1a ?? 2.5;
        weightedReturn += (Number(r1a) * it.portfoyOrani) / 100;
      });
      pastValuationMultiplier = 1 / (1 + weightedReturn / 100);
    } else if (valuationDate === '3m') {
      periodLabel = '3 Ay';
      let weightedReturn = 0;
      list.forEach((it) => {
        const meta = fundsList.find((f) => f.fonKodu === it.fonKodu);
        const r3a = meta?.getiri3a ?? 8;
        weightedReturn += (Number(r3a) * it.portfoyOrani) / 100;
      });
      pastValuationMultiplier = 1 / (1 + weightedReturn / 100);
    } else if (valuationDate === '1y') {
      periodLabel = '1 Yıl';
      let weightedReturn = 0;
      list.forEach((it) => {
        const meta = fundsList.find((f) => f.fonKodu === it.fonKodu);
        const r1y = meta?.getiri1y ?? 38;
        weightedReturn += (Number(r1y) * it.portfoyOrani) / 100;
      });
      pastValuationMultiplier = 1 / (1 + weightedReturn / 100);
    } else if (valuationDate === 'ytd') {
      periodLabel = 'Yılbaşı (YTD)';
      let weightedReturn = 0;
      list.forEach((it) => {
        const meta = fundsList.find((f) => f.fonKodu === it.fonKodu);
        const ryb = meta?.getiriyb ?? 15;
        weightedReturn += (Number(ryb) * it.portfoyOrani) / 100;
      });
      pastValuationMultiplier = 1 / (1 + weightedReturn / 100);
    } else if (valuationDate === 'custom') {
      periodLabel = customDate;
      const past = new Date(customDate);
      const now = new Date();
      const months = Math.max(0.5, (now.getTime() - past.getTime()) / (1000 * 3600 * 24 * 30));
      let weightedReturn = 0;
      list.forEach((it) => {
        const meta = fundsList.find((f) => f.fonKodu === it.fonKodu);
        const r1y = meta?.getiri1y ?? 35;
        const monthlyRate = Number(r1y) / 12;
        weightedReturn += (monthlyRate * months * it.portfoyOrani) / 100;
      });
      pastValuationMultiplier = 1 / (1 + weightedReturn / 100);
    }

    const estimatedPastVal = toplamDeger * pastValuationMultiplier;
    const pastDiffTL = toplamDeger - estimatedPastVal;
    const pastDiffPct = estimatedPastVal > 0 ? (pastDiffTL / estimatedPastVal) * 100 : 0;

    return {
      calculatedHoldings: list,
      summary: {
        toplamDeger,
        toplamMaliyet,
        toplamKarZararTL,
        toplamKarZararYuzde,
        toplamTahminiStopajTL,
        netToplamDegerTL: toplamDeger - toplamTahminiStopajTL,
        holdingCount: holdings.length,
        toplamGunlukDegisimTL,
        toplamGunlukDegisimYuzde,
      },
      categoryAllocation,
      historicalMetrics: {
        estimatedPastVal,
        pastDiffTL,
        pastDiffPct,
        periodLabel,
      },
    };
  }, [holdings, fundsList, latestPricesMap, dailyChangesMap, valuationDate, customDate]);

  const isProfit = summary.toplamKarZararTL >= 0;

  if (holdings.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 sm:p-12 text-center max-w-lg mx-auto my-6">
        <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3 border border-emerald-500/20">
          <PieChart className="w-6 h-6" />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-white">Portföyünüz Boş</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Fintables tarzı fon portföyünüzü oluşturun, alış-satış işlemlerinizi kaydedin ve kârınızı anlık takip edin.
        </p>
        <button
          onClick={onOpenAddModal}
          className="mt-5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>İlk Fonunuzu Ekleyin</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Top Header with Prominent "+ Yeni Fon Ekle" Button */}
      <div className="flex items-center justify-between gap-3 bg-slate-900/60 p-3 sm:p-4 rounded-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-white">Portföyüm</h2>
          </div>
        </div>

        {/* PROMINENT NEW FUND BUTTON */}
        <button
          onClick={onOpenAddModal}
          className="px-3.5 sm:px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-500/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Fon Ekle</span>
        </button>
      </div>

      {/* Summary KPI Cards (Compact on Mobile: 2x2 grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Value */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 sm:p-4">
          <span className="text-[10px] sm:text-[11px] tabular-nums uppercase text-slate-400">
            Toplam Portföy Değeri
          </span>
          <div className="text-lg sm:text-2xl font-black tabular-nums text-white mt-0.5">
            ₺{summary.toplamDeger.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Piyasa Değeri</div>
        </div>

        {/* Total Cost */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 sm:p-4">
          <span className="text-[10px] sm:text-[11px] tabular-nums uppercase text-slate-400">
            Toplam Maliyet
          </span>
          <div className="text-lg sm:text-2xl font-bold tabular-nums text-slate-300 mt-0.5">
            ₺{summary.toplamMaliyet.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Yatırılan Sermaye</div>
        </div>

        {/* Total Profit (TL) */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 sm:p-4">
          <span className="text-[10px] sm:text-[11px] tabular-nums uppercase text-slate-400">
            Net Kâr / Zarar (₺)
          </span>
          <div
            className={`text-lg sm:text-2xl font-black tabular-nums mt-0.5 ${
              isProfit ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isProfit ? '+' : ''}₺
            {summary.toplamKarZararTL.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-between">
            <span>Gerçekleşmemiş Fark</span>
            {summary.toplamTahminiStopajTL > 0 && (
              <span className="text-amber-400 tabular-nums">
                Stopaj: -₺{summary.toplamTahminiStopajTL.toFixed(0)}
              </span>
            )}
          </div>
        </div>

        {/* Total Return (%) */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 sm:p-4 flex flex-col justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] tabular-nums uppercase text-slate-400">
              Toplam Getiri (%)
            </span>
            <div
              className={`text-lg sm:text-2xl font-black tabular-nums mt-0.5 flex items-center ${
                isProfit ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isProfit ? <ArrowUpRight className="w-4 h-4 mr-0.5" /> : <ArrowDownRight className="w-4 h-4 mr-0.5" />}
              %{Math.abs(summary.toplamKarZararYuzde).toFixed(2)}
            </div>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Maliyet Oranı</div>
        </div>
      </div>

      {/* Historical Date Valuation Tool (Tarihe Göre Göster) */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 sm:p-4 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-white font-bold">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tarihe Göre Göster</span>
          </div>

          {/* Quick Date Filters */}
          <div className="flex items-center gap-1 overflow-x-auto text-[11px] no-scrollbar">
            {[
              { id: 'today', label: 'Bugün' },
              { id: '1w', label: '1 Hafta' },
              { id: '1m', label: '1 Ay' },
              { id: '3m', label: '3 Ay' },
              { id: '1y', label: '1 Yıl' },
              { id: 'ytd', label: 'Yılbaşı (YTD)' },
              { id: 'custom', label: 'Özel Tarih' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setValuationDate(p.id as any)}
                className={`px-2 py-1 rounded-md font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  valuationDate === p.id
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom date input if selected */}
        {valuationDate === 'custom' && (
          <div className="flex items-center gap-2 pt-1 text-xs">
            <span className="text-slate-400">Tarih Seçin:</span>
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-white tabular-nums text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
        )}

        {/* Historical comparison metrics */}
        {valuationDate !== 'today' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800/60 text-xs tabular-nums">
            <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">{historicalMetrics.periodLabel} Değeri</span>
              <span className="text-white font-bold text-sm">
                ₺{historicalMetrics.estimatedPastVal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">O Günden Bugüne Getiri</span>
              <span
                className={`font-bold text-sm flex items-center ${
                  historicalMetrics.pastDiffTL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {historicalMetrics.pastDiffTL >= 0 ? '+' : ''}₺
                {historicalMetrics.pastDiffTL.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">Dönemsel Büyüme Oranı</span>
              <span
                className={`font-bold text-sm ${
                  historicalMetrics.pastDiffPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {historicalMetrics.pastDiffPct >= 0 ? '+' : ''}%{historicalMetrics.pastDiffPct.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Asset Allocation Bar (Compact) */}
      {categoryAllocation.length > 0 && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 sm:p-4 space-y-2">
          <div className="flex items-center justify-between text-xs tabular-nums text-slate-400">
            <span className="flex items-center gap-1.5 text-white font-semibold">
              <PieChart className="w-3.5 h-3.5 text-emerald-400" />
              Varlık Dağılımı
            </span>
          </div>

          <div className="h-2 w-full bg-slate-950 rounded-full flex overflow-hidden border border-slate-800">
            {categoryAllocation.map((cat, idx) => {
              const colors = ['bg-emerald-500', 'bg-cyan-500', 'bg-amber-500', 'bg-indigo-500', 'bg-rose-500'];
              return (
                <div
                  key={cat.name}
                  style={{ width: `${cat.pct}%` }}
                  className={`${colors[idx % colors.length]} transition-all duration-300`}
                  title={`${cat.name}: %${cat.pct.toFixed(1)}`}
                />
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-[11px] tabular-nums pt-1">
            {categoryAllocation.map((cat, idx) => {
              const dotColors = ['bg-emerald-400', 'bg-cyan-400', 'bg-amber-400', 'bg-indigo-400', 'bg-rose-400'];
              return (
                <div key={cat.name} className="flex items-center gap-1 text-slate-300">
                  <span className={`w-1.5 h-1.5 rounded-full ${dotColors[idx % dotColors.length]}`}></span>
                  <span>{cat.name}:</span>
                  <span className="font-bold text-white">%{cat.pct.toFixed(1)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Midas-Style Holdings List: Responsive Cards for Mobile & Table for Desktop */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {/* Section Header with Midas-style toggle */}
        <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white text-sm sm:text-base tracking-tight">Yatırım Fonları</h3>
            <span className="text-[11px] tabular-nums text-slate-500 hidden sm:inline">
              ({calculatedHoldings.length})
            </span>
          </div>

          {/* Right Header Status: Total or Daily Net Gain/Loss + Midas Toggle Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right tabular-nums">
              <span
                className={`text-xs sm:text-sm font-bold ${
                  (displayMode === 'daily' ? summary.toplamGunlukDegisimTL >= 0 : summary.toplamKarZararTL >= 0)
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}
              >
                {displayMode === 'daily'
                  ? `(%${summary.toplamGunlukDegisimYuzde.toFixed(2)})`
                  : `(%${summary.toplamKarZararYuzde.toFixed(2)})`}
              </span>
            </div>

            {/* Toggle Switch Button: "Günlük ◄►" or "Toplam ◄►" */}
            <button
              onClick={() => setDisplayMode(displayMode === 'daily' ? 'total' : 'daily')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-[11px] font-bold cursor-pointer transition-all shadow-sm select-none"
              title="Günlük ve Toplam görünümü arasında geçiş yapmak için tıklayın"
            >
              <span className={displayMode === 'daily' ? 'text-emerald-400' : 'text-cyan-400'}>
                {displayMode === 'daily' ? 'Günlük' : 'Toplam'}
              </span>
              <span className="text-slate-500 text-[10px]">◄►</span>
            </button>
          </div>
        </div>

        {/* Mobile View: Midas-Style Compact Holding Rows */}
        <div className="block lg:hidden divide-y divide-slate-800/80">
          {calculatedHoldings.map((item, idx) => {
            const isDailyPos = item.gunlukDegisimTL >= 0;
            const isTotalPos = item.karZararTL >= 0;
            const txCount = item.islemler?.length || 0;
            const itemTaxInfo = getFundStopajInfo(item.fonUnvan, item.kategori);

            // Midas-style avatar colors
            const avatarGradients = [
              'from-indigo-600 to-purple-600',
              'from-blue-600 to-cyan-600',
              'from-rose-600 to-orange-600',
              'from-emerald-600 to-teal-600',
              'from-amber-600 to-yellow-600',
            ];
            const gradient = avatarGradients[idx % avatarGradients.length];

            return (
              <div key={item.id} className="p-3 hover:bg-slate-850/40 transition-colors">
                <div className="flex items-center justify-between">
                  {/* Left: Avatar + Fund Code + Name */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                    <div
                      className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-extrabold text-xs shadow-sm shrink-0`}
                    >
                      {item.fonKodu.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onSelectFundForAnalysis(item.fonKodu)}
                          className="font-black text-white text-sm hover:text-emerald-400 tabular-nums transition-colors cursor-pointer"
                        >
                          {item.fonKodu}
                        </button>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded tabular-nums font-semibold border ${
                            itemTaxInfo.isExempt
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {itemTaxInfo.rate === 0 ? '%0' : '%10'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium truncate max-w-[170px]">
                        {item.fonUnvan}
                      </div>
                    </div>
                  </div>

                  {/* Right: Midas-Style Value + (Daily or Total) Return */}
                  <div className="text-right tabular-nums shrink-0">
                    <div className="text-sm font-bold text-white tracking-tight">
                      ₺{item.toplamDeger.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>

                    {displayMode === 'daily' ? (
                      /* Daily return view */
                      <div
                        className={`text-xs font-semibold ${
                          isDailyPos ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isDailyPos ? '+' : ''}₺{item.gunlukDegisimTL.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({isDailyPos ? '+' : ''}%{item.gunlukDegisimYuzde.toFixed(2)})
                      </div>
                    ) : (
                      /* Total return view */
                      <div
                        className={`text-xs font-semibold ${
                          isTotalPos ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isTotalPos ? '+' : ''}₺{item.karZararTL.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({isTotalPos ? '+' : ''}%{item.karZararYuzde.toFixed(2)})
                      </div>
                    )}
                  </div>
                </div>

                {/* Sub-row: Share count, price & actions */}
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-800/60 text-[10px] tabular-nums text-slate-400">
                  <div className="flex items-center gap-3">
                    <span>
                      Pay: <strong className="text-slate-200">{item.adet.toLocaleString('tr-TR')}</strong>
                    </span>
                    <span>
                      Fiyat: <strong className="text-slate-200">₺{item.guncelFiyat.toFixed(4)}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedTxHolding(item)}
                      className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <History className="w-2.5 h-2.5 text-emerald-400" />
                      <span>İşlemler ({txCount})</span>
                    </button>
                    <button
                      onClick={() => onSelectFundForAnalysis(item.fonKodu)}
                      className="px-2 py-0.5 rounded bg-slate-950 text-slate-400 hover:text-emerald-400 cursor-pointer font-medium"
                    >
                      Analiz
                    </button>
                    <button
                      onClick={() => onRemoveHolding(item.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                      title="Sil"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View: Full Table with Günlük/Toplam Toggle */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs tabular-nums divide-y divide-slate-800">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Fon</th>
                <th className="py-2.5 px-3 text-right">Pay Adedi</th>
                <th className="py-2.5 px-3 text-right">Maliyet / Güncel</th>
                <th className="py-2.5 px-3 text-right">Piyasa Değeri</th>
                <th className="py-2.5 px-3 text-right">
                  {displayMode === 'daily' ? 'Günlük Değişim' : 'Toplam Kâr / Zarar'}
                </th>
                <th className="py-2.5 px-3 text-right">Ağırlık</th>
                <th className="py-2.5 px-4 text-center">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {calculatedHoldings.map((item, idx) => {
                const isDailyPos = item.gunlukDegisimTL >= 0;
                const isTotalPos = item.karZararTL >= 0;
                const txCount = item.islemler?.length || 0;
                const itemTaxInfo = getFundStopajInfo(item.fonUnvan, item.kategori);

                const avatarGradients = [
                  'from-indigo-600 to-purple-600',
                  'from-blue-600 to-cyan-600',
                  'from-rose-600 to-orange-600',
                  'from-emerald-600 to-teal-600',
                  'from-amber-600 to-yellow-600',
                ];
                const gradient = avatarGradients[idx % avatarGradients.length];

                return (
                  <tr key={item.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-extrabold text-[10px] shadow-sm shrink-0`}
                        >
                          {item.fonKodu.slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onSelectFundForAnalysis(item.fonKodu)}
                              className="font-bold text-white hover:text-emerald-400 transition-colors cursor-pointer text-sm tabular-nums"
                            >
                              {item.fonKodu}
                            </button>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded tabular-nums font-semibold border ${
                                itemTaxInfo.isExempt
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              }`}
                              title={itemTaxInfo.description}
                            >
                              {itemTaxInfo.label}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-sans truncate max-w-xs mt-0.5">
                            {item.fonUnvan}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-right text-slate-200">
                      {item.adet.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <div className="text-white font-semibold">
                        ₺{item.guncelFiyat.toFixed(4)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Maliyet: ₺{item.alisFiyati.toFixed(4)}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-right font-bold text-white">
                      ₺{item.toplamDeger.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Dynamic Column: Günlük or Toplam */}
                    <td className="py-2.5 px-3 text-right">
                      {displayMode === 'daily' ? (
                        <div>
                          <div className={`font-bold ${isDailyPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isDailyPos ? '+' : ''}₺{item.gunlukDegisimTL.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className={`text-[10px] ${isDailyPos ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
                            {isDailyPos ? '+' : ''}%{item.gunlukDegisimYuzde.toFixed(2)}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className={`font-bold ${isTotalPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isTotalPos ? '+' : ''}₺{item.karZararTL.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className={`text-[10px] ${isTotalPos ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
                            {isTotalPos ? '+' : ''}%{item.karZararYuzde.toFixed(2)}
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right text-slate-300 font-semibold">
                      %{item.portfoyOrani.toFixed(1)}
                    </td>

                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedTxHolding(item)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                          title="Alış/Satış İşlem Geçmişi"
                        >
                          <History className="w-3 h-3 text-emerald-400" />
                          <span>İşlemler ({txCount})</span>
                        </button>
                        <button
                          onClick={() => onSelectFundForAnalysis(item.fonKodu)}
                          className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors text-[11px] cursor-pointer"
                        >
                          Analiz
                        </button>
                        <button
                          onClick={() => onRemoveHolding(item.id)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction History Modal */}
      <TransactionHistoryModal
        isOpen={!!selectedTxHolding}
        onClose={() => setSelectedTxHolding(null)}
        holding={selectedTxHolding}
        onAddTransaction={onAddTransaction}
        onDeleteTransaction={onDeleteTransaction}
        currentPrice={selectedTxHolding ? (latestPricesMap[selectedTxHolding.fonKodu] || selectedTxHolding.alisFiyati) : 0}
      />
    </div>
  );
};
