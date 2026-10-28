import React, { useState, useEffect } from 'react';
import { X, Plus, Check, RefreshCw, ArrowDownLeft, ArrowUpRight, Percent } from 'lucide-react';
import { PortfolioHolding, PortfolioTransaction } from '../types/portfolio';
import { TefasListRaw } from '../types/tefas';
import { getFundStopajInfo, calculateSellTax } from '../utils/taxEngine';

interface PortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (holding: PortfolioHolding, transaction?: PortfolioTransaction) => void;
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

  useEffect(() => {
    if (initialFund) {
      setFonKodu(initialFund.fonKodu);
      setFonUnvan(initialFund.fonUnvan);
      setKategori(initialFund.kategori || '');
      const price = initialFund.guncelFiyat || latestPricesMap[initialFund.fonKodu];
      if (price) {
        setAlisFiyati(price.toString());
      }
    } else {
      setFonKodu('');
      setFonUnvan('');
      setKategori('');
      setAlisFiyati('');
      setAdet('');
      setTutar('');
    }
    setTransactionType('BUY');
    setTransactionDate(new Date().toISOString().split('T')[0]);
  }, [initialFund, isOpen, latestPricesMap]);

  if (!isOpen) return null;

  // Auto-fill price when fund code changes
  const handleFundCodeChange = async (code: string) => {
    const clean = code.toUpperCase().trim();
    setFonKodu(clean);

    const found = fundsList.find((f) => f.fonKodu === clean);
    if (found) {
      setFonUnvan(found.fonUnvan);
      setKategori(found.fonTurAciklama || 'Yatırım Fonu');
    }

    // Check if price is in cache
    if (latestPricesMap[clean]) {
      setAlisFiyati(latestPricesMap[clean].toString());
      updateTutarOrAdet(latestPricesMap[clean].toString(), inputMode, adet, tutar);
      return;
    }

    // Otherwise fetch latest price from TEFAS
    if (clean.length >= 3) {
      setIsFetchingPrice(true);
      try {
        const res = await fetch('/api/tefas/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fonKodu: clean, periyod: 1 }),
        });
        if (res.ok) {
          const data = await res.json();
          const prices = data.resultList || [];
          if (prices.length > 0) {
            const latest = prices[prices.length - 1];
            setAlisFiyati(latest.fiyat.toString());
            updateTutarOrAdet(latest.fiyat.toString(), inputMode, adet, tutar);
            if (!fonUnvan && latest.fonUnvan) setFonUnvan(latest.fonUnvan);
          }
        }
      } catch (err) {
        console.warn('Auto price fetch non-fatal notice:', err);
      } finally {
        setIsFetchingPrice(false);
      }
    }
  };

  const updateTutarOrAdet = (priceStr: string, mode: 'adet' | 'tutar', currAdet: string, currTutar: string) => {
    const p = parseFloat(priceStr) || 0;
    if (p <= 0) return;
    if (mode === 'adet') {
      const a = parseFloat(currAdet) || 0;
      if (a > 0) setTutar((a * p).toFixed(2));
    } else {
      const t = parseFloat(currTutar) || 0;
      if (t > 0) setAdet((t / p).toFixed(2));
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
    updateTutarOrAdet(val, inputMode, adet, tutar);
  };

  const stopajInfo = getFundStopajInfo(fonUnvan, kategori);
  const numAdetVal = parseFloat(adet) || 0;
  const numPriceVal = parseFloat(alisFiyati) || 0;

  const sellTaxPreview =
    transactionType === 'SELL' && numAdetVal > 0 && numPriceVal > 0
      ? calculateSellTax({
          shares: numAdetVal,
          sellPrice: numPriceVal,
          buyPrice: numPriceVal, // fallback if new entry
          stopajRate: stopajInfo.rate,
        })
      : null;

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
        islemler: [transaction],
      },
      transaction
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-sm sm:max-w-md bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <Plus className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white text-sm sm:text-base">Portföy İşlemi Ekle</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-3.5 space-y-3 text-xs">
          {/* Transaction Type: Alış vs Satış */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
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
              <p className="text-[11px] text-slate-400 mt-1 truncate">{fonUnvan}</p>
            )}
          </div>

          {/* Unit Price (Auto-filled!) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-mono uppercase text-slate-400">
                Birim Fiyat (₺)
              </label>
              {isFetchingPrice && (
                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Fiyat alınıyor...
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
                  Toplam Tutar: <span className="text-white font-bold">₺{tutar}</span>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                Toplam Tutar (₺)
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
                  Hesaplanan Pay: <span className="text-white font-bold">{adet} Adet</span>
                </div>
              )}
            </div>
          )}

          {/* Transaction Date */}
          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
              İşlem Tarihi
            </label>
            <input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

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
