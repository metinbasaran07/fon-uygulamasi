import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, ArrowDownLeft, ArrowUpRight, History, Percent, ShieldCheck, RefreshCw, Check, Calendar, TrendingUp } from 'lucide-react';
import { PortfolioHolding, PortfolioTransaction } from '../types/portfolio';
import { getFundStopajInfo, calculateSellTax } from '../utils/taxEngine';
import { FundCompanyLogo } from './FundCompanyLogo';

interface TransactionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  holding: PortfolioHolding | null;
  onAddTransaction: (holdingId: string, tx: PortfolioTransaction, latestPrice?: number) => void;
  onDeleteTransaction: (holdingId: string, txId: string) => void;
  currentPrice: number;
}

export const TransactionHistoryModal: React.FC<TransactionHistoryModalProps> = ({
  isOpen,
  onClose,
  holding,
  onAddTransaction,
  onDeleteTransaction,
  currentPrice,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
  const [adet, setAdet] = useState('');
  const [fiyat, setFiyat] = useState(() => (currentPrice ? currentPrice.toString() : ''));
  const [tarih, setTarih] = useState(() => new Date().toISOString().split('T')[0]);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [priceLookupNotice, setPriceLookupNotice] = useState<string | null>(null);
  const [latestLivePrice, setLatestLivePrice] = useState<number>(currentPrice || 0);

  const getDateDaysAgo = (days: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };

  const fetchPriceForDate = useCallback(
    async (code: string, dateStr: string) => {
      const clean = code.toUpperCase().trim();
      if (!clean || !dateStr) return;

      setIsFetchingPrice(true);
      setPriceLookupNotice(null);

      try {
        const res = await fetch('/api/tefas/price-on-date', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fonKodu: clean, tarih: dateStr }),
        });

        if (res.ok) {
          const data = await res.json();
          const pNum = Number(data?.price);
          if (data?.success && !isNaN(pNum) && pNum > 0) {
            setFiyat(pNum.toString());
            if (data.latestPrice) {
              setLatestLivePrice(Number(data.latestPrice));
            }
            if (data.isLatest) {
              setPriceLookupNotice(`Güncel TEFAS Fiyatı: ₺${pNum.toFixed(4)} (Otomatik)`);
            } else if (data.isExactMatch) {
              setPriceLookupNotice(`${data.resolvedDate} TEFAS Fiyatı: ₺${pNum.toFixed(4)} (Otomatik)`);
            } else {
              setPriceLookupNotice(
                `${data.requestedDate} (İşlemsiz gün) ➔ ${data.resolvedDate} Fiyatı: ₺${pNum.toFixed(4)} (Otomatik)`
              );
            }
          }
        }
      } catch (err) {
        console.warn('History modal price-on-date error:', err);
      } finally {
        setIsFetchingPrice(false);
      }
    },
    []
  );

  useEffect(() => {
    if (holding) {
      const today = new Date().toISOString().split('T')[0];
      setTarih(today);
      if (currentPrice) {
        setFiyat(currentPrice.toString());
        setLatestLivePrice(currentPrice);
        setPriceLookupNotice(`Güncel TEFAS Fiyatı: ₺${currentPrice.toFixed(4)}`);
      } else {
        fetchPriceForDate(holding.fonKodu, today);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, holding?.id]);

  if (!isOpen || !holding) return null;

  const transactions = holding.islemler || [];
  const stopajInfo = getFundStopajInfo(holding.fonUnvan, holding.kategori, holding.fonKodu);

  const numAdet = parseFloat(adet) || 0;
  const numFiyat = parseFloat(fiyat) || currentPrice || 0;

  const handleDateChange = (newDate: string) => {
    setTarih(newDate);
    if (holding?.fonKodu && newDate && newDate.length === 10) {
      fetchPriceForDate(holding.fonKodu, newDate);
    }
  };

  const handleDatePreset = (daysAgo: number) => {
    const newDate = daysAgo === 0 ? new Date().toISOString().split('T')[0] : getDateDaysAgo(daysAgo);
    setTarih(newDate);
    fetchPriceForDate(holding.fonKodu, newDate);
  };

  const sellTaxPreview =
    type === 'SELL' && numAdet > 0 && numFiyat > 0
      ? calculateSellTax({
          shares: numAdet,
          sellPrice: numFiyat,
          buyPrice: holding.alisFiyati,
          stopajRate: stopajInfo.rate,
        })
      : null;

  // Past profit calculation for Buy transaction
  const liveTargetPrice = latestLivePrice || currentPrice || numFiyat;
  const hasPastProfit =
    type === 'BUY' &&
    numAdet > 0 &&
    numFiyat > 0 &&
    liveTargetPrice > 0 &&
    Math.abs(liveTargetPrice - numFiyat) > 0.000001;

  const pastGainTL = hasPastProfit ? numAdet * (liveTargetPrice - numFiyat) : 0;
  const pastGainPct = hasPastProfit && numFiyat > 0 ? ((liveTargetPrice - numFiyat) / numFiyat) * 100 : 0;

  const handleCreateTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(numAdet) || numAdet <= 0 || isNaN(numFiyat) || numFiyat <= 0) return;

    let taxAmount = 0;
    let netAmount = Math.round(numAdet * numFiyat * 100) / 100;

    if (type === 'SELL') {
      const calc = calculateSellTax({
        shares: numAdet,
        sellPrice: numFiyat,
        buyPrice: holding.alisFiyati,
        stopajRate: stopajInfo.rate,
      });
      taxAmount = calc.taxAmount;
      netAmount = calc.netAmount;
    }

    const newTx: PortfolioTransaction = {
      id: `tx-${Date.now()}`,
      type,
      tarih,
      adet: numAdet,
      fiyat: numFiyat,
      toplamTutar: Math.round(numAdet * numFiyat * 100) / 100,
      stopajOrani: stopajInfo.rate,
      stopajTutari: taxAmount,
      netEleGecenTutar: netAmount,
    };

    onAddTransaction(holding.id, newTx, latestLivePrice || undefined);
    setAdet('');
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-lg bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <FundCompanyLogo fonKodu={holding.fonKodu} fonUnvan={holding.fonUnvan} size="md" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm sm:text-base font-mono">
                  {holding.fonKodu}
                </span>
                <span className="text-[10px] text-slate-400 px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800">
                  {holding.kategori}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold border ${
                    stopajInfo.isExempt
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {stopajInfo.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-xs">{holding.fonUnvan}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Holding Summary */}
        <div className="my-3 grid grid-cols-3 gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 text-[11px] font-mono">
          <div>
            <span className="text-[10px] text-slate-500 block">Toplam Pay</span>
            <span className="text-white font-bold">{holding.adet.toLocaleString('tr-TR')}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">Ortalama Maliyet</span>
            <span className="text-white font-bold">₺{holding.alisFiyati.toFixed(4)}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">Güncel Fiyat</span>
            <span className="text-emerald-400 font-bold">₺{currentPrice.toFixed(4)}</span>
          </div>
        </div>

        {/* Action Button: Yeni İşlem Ekle */}
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="mb-3 py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Alış / Satış İşlemi Ekle</span>
          </button>
        )}

        {/* Add Transaction Form Inline */}
        {showAddForm && (
          <form
            onSubmit={handleCreateTx}
            className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2.5 text-xs mb-3 animate-in fade-in"
          >
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-lg">
              <button
                type="button"
                onClick={() => setType('BUY')}
                className={`py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                  type === 'BUY' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Alış (+)
              </button>
              <button
                type="button"
                onClick={() => setType('SELL')}
                className={`py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                  type === 'SELL' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Satış (-)
              </button>
            </div>

            {/* Date Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-emerald-400" />
                  İşlem Tarihi:
                </span>
                <span className="text-[10px] text-slate-500 font-mono">{tarih}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Adet</label>
                <input
                  type="number"
                  step="any"
                  value={adet}
                  onChange={(e) => setAdet(e.target.value)}
                  placeholder="1000"
                  className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[10px] text-slate-400 block">Birim Fiyat (₺)</label>
                  {isFetchingPrice && <RefreshCw className="w-2.5 h-2.5 animate-spin text-emerald-400" />}
                </div>
                <input
                  type="number"
                  step="any"
                  value={fiyat}
                  onChange={(e) => setFiyat(e.target.value)}
                  placeholder="0.0000"
                  className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Tarih</label>
                <input
                  type="date"
                  value={tarih}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-[11px] focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Price lookup notice */}
            {priceLookupNotice && (
              <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                <Check className="w-3 h-3 shrink-0" />
                <span className="truncate">{priceLookupNotice}</span>
              </div>
            )}

            {/* Past Profit Preview for Buy Transaction */}
            {hasPastProfit && (
              <div className="p-2 rounded-lg bg-slate-950/90 border border-emerald-500/30 text-[10px] space-y-0.5 font-mono">
                <div className="flex justify-between items-center text-emerald-400 font-bold">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    O Günden Bugüne Kâr:
                  </span>
                  <span>
                    {pastGainTL >= 0 ? '+' : ''}₺{pastGainTL.toFixed(2)} ({pastGainTL >= 0 ? '+' : ''}%{pastGainPct.toFixed(2)})
                  </span>
                </div>
                <p className="text-slate-400 text-[9px]">
                  Maliyet: ₺{numFiyat.toFixed(4)} ➔ Güncel Değer: ₺{(numAdet * liveTargetPrice).toFixed(2)}
                </p>
              </div>
            )}

            {/* Live Sell Tax & Stopaj Breakdown */}
            {sellTaxPreview && (
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1 text-[11px] font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Brüt Satış Tutarı:</span>
                  <span className="text-white font-semibold">₺{sellTaxPreview.grossAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Maliyet Tutarı:</span>
                  <span className="text-slate-300">₺{sellTaxPreview.costBasis.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Elde Edilen Kâr:</span>
                  <span className={`font-bold ${sellTaxPreview.grossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ₺{sellTaxPreview.grossProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-amber-400 pt-1 border-t border-slate-800">
                  <span>Stopaj Kesintisi ({stopajInfo.label}):</span>
                  <span className="font-bold">-₺{sellTaxPreview.taxAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-white font-bold pt-1 border-t border-slate-800 text-xs">
                  <span>Hesaba Geçecek Net Tutar:</span>
                  <span className="text-emerald-400">₺{sellTaxPreview.netAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer shadow-sm transition-colors"
              >
                İşlemi Kaydet
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs cursor-pointer"
              >
                Vazgeç
              </button>
            </div>
          </form>
        )}

        {/* Transaction History List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[48vh]">
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              <History className="w-6 h-6 mx-auto mb-1 opacity-40" />
              Henüz kayıtlı işlem bulunmuyor.
            </div>
          ) : (
            transactions.map((tx) => {
              const isBuy = tx.type === 'BUY';
              return (
                <div
                  key={tx.id}
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isBuy ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      {isBuy ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isBuy ? 'ALIŞ' : 'SATIŞ'}
                        </span>
                        <span className="text-[10px] text-slate-500">{tx.tarih}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {tx.adet.toLocaleString('tr-TR')} adet × ₺{tx.fiyat.toFixed(4)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-white font-bold">
                        ₺{tx.toplamTutar.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      {tx.stopajTutari !== undefined && tx.stopajTutari > 0 && (
                        <div className="text-[10px] text-amber-400">
                          Stopaj: -₺{tx.stopajTutari.toFixed(2)}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onDeleteTransaction(holding.id, tx.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                      title="İşlemi Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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
