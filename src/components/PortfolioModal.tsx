import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Plus, Check, RefreshCw, ArrowDownLeft, ArrowUpRight, Percent, Calendar, TrendingUp } from 'lucide-react';
import { PortfolioHolding, PortfolioTransaction } from '../types/portfolio';
import { TefasListRaw } from '../types/tefas';
import { getFundStopajInfo, calculateSellTax } from '../utils/taxEngine';
import { FundCompanyLogo } from './FundCompanyLogo';

interface PortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (holding: PortfolioHolding, transaction?: PortfolioTransaction, latestPrice?: number) => void;
  initialFund?: {
    fonKodu: string;
    fonUnvan: string;
    kategori?: string;
    guncelFiyat?: number;
  } | null;
  fundsList: TefasListRaw[];
  latestPricesMap: Record<string, number>;
}

export const PortfolioModal: React.FC<PortfolioModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialFund,
  fundsList,
  latestPricesMap,
}) => {
  const [fonKodu, setFonKodu] = useState('');
  const [fonUnvan, setFonUnvan] = useState('');
  const [kategori, setKategori] = useState('');
  const [adet, setAdet] = useState('');
  const [alisFiyati, setAlisFiyati] = useState('');
  const [tutar, setTutar] = useState('');
  const [inputMode, setInputMode] = useState<'adet' | 'tutar'>('adet');
  const [transactionType, setTransactionType] = useState<'BUY' | 'SELL'>('BUY');
  const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [priceLookupNotice, setPriceLookupNotice] = useState<string | null>(null);
  const [latestLivePrice, setLatestLivePrice] = useState<number | null>(null);

  // References to keep callbacks stable and prevent unwanted form resets
  const adetRef = useRef(adet);
  adetRef.current = adet;
  const tutarRef = useRef(tutar);
  tutarRef.current = tutar;
  const inputModeRef = useRef(inputMode);
  inputModeRef.current = inputMode;

  const updateTutarOrAdet = useCallback((priceNum: number) => {
    if (priceNum <= 0) return;
    if (inputModeRef.current === 'adet') {
      const a = parseFloat(adetRef.current) || 0;
      if (a > 0) setTutar((a * priceNum).toFixed(2));
    } else {
      const t = parseFloat(tutarRef.current) || 0;
      if (t > 0) setAdet((t / priceNum).toFixed(2));
    }
  }, []);

  // Fetch TEFAS unit price for specific fund and date
  const fetchPriceForDate = useCallback(
    async (code: string, dateStr: string) => {
      const clean = code.toUpperCase().trim();
      if (clean.length < 3 || !dateStr) return;

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
          if (data?.success && data.price) {
            const pNum = Number(data.price);
            setAlisFiyati(pNum.toString());
            updateTutarOrAdet(pNum);

            if (data.latestPrice) {
              setLatestLivePrice(Number(data.latestPrice));
            }
            if (data.fonUnvan) {
              setFonUnvan((prev) => prev || data.fonUnvan);
            }

            if (data.isLatest) {
              setPriceLookupNotice(`Güncel TEFAS Fiyatı: ₺${pNum.toFixed(4)} (Otomatik)`);
            } else if (data.isExactMatch) {
              setPriceLookupNotice(`${data.resolvedDate} TEFAS Fiyatı: ₺${pNum.toFixed(4)} (Otomatik)`);
            } else {
              setPriceLookupNotice(
                `${data.requestedDate} (Tatil/Hafta sonu) ➔ ${data.resolvedDate} Fiyatı: ₺${pNum.toFixed(4)} (Otomatik)`
              );
            }
          }
        }
      } catch (err) {
        console.warn('price-on-date fetch notice:', err);
      } finally {
        setIsFetchingPrice(false);
      }
    },
    [updateTutarOrAdet]
  );

  // Initialize form ONLY when modal is opened
  useEffect(() => {
    if (!isOpen) return;

    if (initialFund) {
      setFonKodu(initialFund.fonKodu);
      setFonUnvan(initialFund.fonUnvan);
      setKategori(initialFund.kategori || '');
      const todayStr = new Date().toISOString().split('T')[0];
      setTransactionDate(todayStr);

      const price = initialFund.guncelFiyat || latestPricesMap[initialFund.fonKodu];
      if (price) {
        setAlisFiyati(price.toString());
        setLatestLivePrice(price);
        setPriceLookupNotice(`Güncel TEFAS Fiyatı: ₺${price.toFixed(4)} (Otomatik)`);
      } else {
        fetchPriceForDate(initialFund.fonKodu, todayStr);
      }
    } else {
      setFonKodu('');
      setFonUnvan('');
      setKategori('');
      setAlisFiyati('');
      setAdet('');
      setTutar('');
      setLatestLivePrice(null);
      setPriceLookupNotice(null);
      setTransactionDate(new Date().toISOString().split('T')[0]);
    }
    setTransactionType('BUY');
    // Only re-run when isOpen or initialFund identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialFund]);

  if (!isOpen) return null;

  // Auto-fill price when fund code changes
  const handleFundCodeChange = (code: string) => {
    const clean = code.toUpperCase().trim();
    setFonKodu(clean);

    const found = fundsList.find((f) => f.fonKodu === clean);
    if (found) {
      setFonUnvan(found.fonUnvan);
      setKategori(found.fonTurAciklama || 'Yatırım Fonu');
    }

    if (clean.length >= 3) {
      fetchPriceForDate(clean, transactionDate);
    }
  };

  const handleDateChange = (newDate: string) => {
    setTransactionDate(newDate);
    if (fonKodu.trim().length >= 3) {
      fetchPriceForDate(fonKodu.trim(), newDate);
    }
  };

  const handleAdetChange = (val: string) => {
    setAdet(val);
    const numAdet = parseFloat(val) || 0;
    const numPrice = parseFloat(alisFiyati) || 0;
    if (numAdet > 0 && numPrice > 0) {
      setTutar((numAdet * numPrice).toFixed(2));
    }
  };

  const handleTutarChange = (val: string) => {
    setTutar(val);
    const numTutar = parseFloat(val) || 0;
    const numPrice = parseFloat(alisFiyati) || 0;
    if (numTutar > 0 && numPrice > 0) {
      setAdet((numTutar / numPrice).toFixed(2));
    }
  };

  const handlePriceChange = (val: string) => {
    setAlisFiyati(val);
    const p = parseFloat(val) || 0;
    updateTutarOrAdet(p);
  };

  const stopajInfo = getFundStopajInfo(fonUnvan, kategori, fonKodu);
  const numAdetVal = parseFloat(adet) || 0;
  const numPriceVal = parseFloat(alisFiyati) || 0;

  // Sell Tax Calculation
  const sellTaxPreview =
    transactionType === 'SELL' && numAdetVal > 0 && numPriceVal > 0
      ? calculateSellTax({
          shares: numAdetVal,
          sellPrice: numPriceVal,
          buyPrice: numPriceVal,
          stopajRate: stopajInfo.rate,
        })
      : null;

  // Live Past Profit Calculation for Buy Transaction
  const livePriceForProfit = latestLivePrice || latestPricesMap[fonKodu] || numPriceVal;
  const hasPastProfit =
    transactionType === 'BUY' &&
    numPriceVal > 0 &&
    livePriceForProfit > 0 &&
    numAdetVal > 0 &&
    Math.abs(livePriceForProfit - numPriceVal) > 0.000001;

  const pastGainTL = hasPastProfit ? numAdetVal * (livePriceForProfit - numPriceVal) : 0;
  const pastGainPct = hasPastProfit && numPriceVal > 0 ? ((livePriceForProfit - numPriceVal) / numPriceVal) * 100 : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAdet = parseFloat(adet);
    const finalPrice = parseFloat(alisFiyati);

    if (!fonKodu.trim() || isNaN(finalAdet) || finalAdet <= 0 || isNaN(finalPrice) || finalPrice <= 0) {
      return;
    }

    let taxAmount = 0;
    let netAmount = Math.round(finalAdet * finalPrice * 100) / 100;

    if (transactionType === 'SELL') {
      const calc = calculateSellTax({
        shares: finalAdet,
        sellPrice: finalPrice,
        buyPrice: finalPrice,
        stopajRate: stopajInfo.rate,
      });
      taxAmount = calc.taxAmount;
      netAmount = calc.netAmount;
    }

    const transaction: PortfolioTransaction = {
      id: `tx-${Date.now()}`,
      type: transactionType,
      tarih: transactionDate,
      adet: finalAdet,
      fiyat: finalPrice,
      toplamTutar: Math.round(finalAdet * finalPrice * 100) / 100,
      stopajOrani: stopajInfo.rate,
      stopajTutari: taxAmount,
      netEleGecenTutar: netAmount,
    };

    onSave(
      {
        id: `${fonKodu.trim().toUpperCase()}`,
        fonKodu: fonKodu.trim().toUpperCase(),
        fonUnvan: fonUnvan || `${fonKodu.trim().toUpperCase()} Fonu`,
        kategori: kategori || 'Yatırım Fonu',
        adet: finalAdet,
        alisFiyati: finalPrice,
        tarih: transactionDate,
      },
      transaction,
      latestLivePrice || undefined
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>{initialFund ? `${initialFund.fonKodu} İşlemi Ekle` : 'Portföye Yeni Fon Ekle'}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              İşlem tarihini seçtiğinizde o günün TEFAS fiyatı otomatik gelir.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          {/* Transaction Type: BUY or SELL */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs font-mono">
            <button
              type="button"
              onClick={() => setTransactionType('BUY')}
              className={`py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                transactionType === 'BUY'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Alış (Portföye Ekle)</span>
            </button>
            <button
              type="button"
              onClick={() => setTransactionType('SELL')}
              className={`py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                transactionType === 'SELL'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Satış (Çıkış Yap)</span>
            </button>
          </div>

          {/* Fund Code Input */}
          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
              Fon Kodu
            </label>
            <input
              type="text"
              value={fonKodu}
              onChange={(e) => handleFundCodeChange(e.target.value)}
              placeholder="Örn: TI2, MAC, IIH, PK1..."
              maxLength={6}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm uppercase focus:outline-none focus:border-emerald-500"
              required
            />
            {fonUnvan && (
              <div className="flex items-center gap-2 mt-1.5 p-1.5 bg-slate-900/60 rounded-lg border border-slate-800/80">
                <FundCompanyLogo fonKodu={fonKodu} fonUnvan={fonUnvan} size="sm" />
                <p className="text-[11px] text-slate-300 truncate flex-1 font-medium">{fonUnvan}</p>
              </div>
            )}
          </div>

          {/* Transaction Date (Clean Standard Date Input - Presets Removed as requested) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-400" />
                İşlem Tarihi
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                {transactionDate}
              </span>
            </div>

            <input
              type="date"
              value={transactionDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
              required
            />
          </div>

          {/* Unit Price (Auto-filled from TEFAS on selected date!) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-mono uppercase text-slate-400">
                İşlem Günü Birim Fiyatı (₺)
              </label>
              {isFetchingPrice && (
                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> TEFAS fiyatı çekiliyor...
                </span>
              )}
            </div>
            <input
              type="number"
              step="any"
              value={alisFiyati}
              onChange={(e) => handlePriceChange(e.target.value)}
              placeholder="0.000000"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
              required
            />
            {priceLookupNotice && (
              <div className="text-[10px] text-emerald-400 font-mono mt-1 flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                <Check className="w-3 h-3 shrink-0" />
                <span className="truncate">{priceLookupNotice}</span>
              </div>
            )}
          </div>

          {/* Mode switch: By Shares (Adet) or By Total Amount (Tutar) */}
          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setInputMode('adet')}
              className={`flex-1 py-1 rounded-lg text-center font-medium transition-all cursor-pointer ${
                inputMode === 'adet'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Adet Gir
            </button>
            <button
              type="button"
              onClick={() => setInputMode('tutar')}
              className={`flex-1 py-1 rounded-lg text-center font-medium transition-all cursor-pointer ${
                inputMode === 'tutar'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Toplam Tutar Gir (₺)
            </button>
          </div>

          {inputMode === 'adet' ? (
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                Pay Adedi
              </label>
              <input
                type="number"
                step="any"
                value={adet}
                onChange={(e) => handleAdetChange(e.target.value)}
                placeholder="Örn: 1000"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                required
              />
              {tutar && (
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  Toplam Alış Maliyeti: <span className="text-white font-bold">₺{tutar}</span>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                Toplam Yatırılan Tutar (₺)
              </label>
              <input
                type="number"
                step="any"
                value={tutar}
                onChange={(e) => handleTutarChange(e.target.value)}
                placeholder="Örn: 10000"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                required
              />
              {adet && (
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  Hesaplanan Pay: <span className="text-white font-bold">{adet} adet</span>
                </div>
              )}
            </div>
          )}

          {/* Live Past Profit Banner (O Günden Bugüne Kâr) */}
          {hasPastProfit && (
            <div className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/30 space-y-1.5 animate-in fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  O Günden Bugüne Oluşan Kâr:
                </span>
                <span className={`font-mono font-bold ${pastGainTL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {pastGainTL >= 0 ? '+' : ''}₺{pastGainTL.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({pastGainTL >= 0 ? '+' : ''}%{pastGainPct.toFixed(2)})
                </span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between font-mono pt-1 border-t border-slate-800/80">
                <span>Alış Maliyeti: ₺{numPriceVal.toFixed(4)}</span>
                <span className="text-slate-300">Bugünkü Değer: ₺{(numAdetVal * livePriceForProfit).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
              </div>
              <p className="text-[10px] text-emerald-400/80 italic">
                ✓ Portföyünüze eklendiğinde bu kâr sıfırlanmaz, güncel portföy kârınıza doğrudan yansıtılır.
              </p>
            </div>
          )}

          {/* Sell Stopaj Tax Preview */}
          {transactionType === 'SELL' && fonKodu && (
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Stopaj Oranı:</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                    stopajInfo.isExempt
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {stopajInfo.label}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-sans leading-tight">
                {stopajInfo.description}
              </p>
              {sellTaxPreview && (
                <div className="pt-1.5 border-t border-slate-800/80 flex justify-between items-center text-[11px]">
                  <span className="text-amber-400 flex items-center gap-1">
                    <Percent className="w-3 h-3" />
                    Stopaj Kesintisi:
                  </span>
                  <span className="text-amber-400 font-bold">
                    ₺{sellTaxPreview.taxAmount.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer ${
                transactionType === 'BUY'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  : 'bg-rose-500 hover:bg-rose-400 text-white'
              }`}
            >
              {transactionType === 'BUY' ? 'Alış İşlemini Kaydet' : 'Stopajlı Satış İşlemini Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
