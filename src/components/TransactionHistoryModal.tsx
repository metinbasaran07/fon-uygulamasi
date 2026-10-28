import React, { useState } from 'react';
import { X, Plus, Trash2, ArrowDownLeft, ArrowUpRight, History, Percent, ShieldCheck } from 'lucide-react';
import { PortfolioHolding, PortfolioTransaction } from '../types/portfolio';
import { getFundStopajInfo, calculateSellTax } from '../utils/taxEngine';

interface TransactionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  holding: PortfolioHolding | null;
  onAddTransaction: (holdingId: string, tx: PortfolioTransaction) => void;
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

  if (!isOpen || !holding) return null;

  const transactions = holding.islemler || [];
  const stopajInfo = getFundStopajInfo(holding.fonUnvan, holding.kategori);

  const numAdet = parseFloat(adet) || 0;
  const numFiyat = parseFloat(fiyat) || currentPrice || 0;

  const sellTaxPreview =
    type === 'SELL' && numAdet > 0 && numFiyat > 0
      ? calculateSellTax({
          shares: numAdet,
          sellPrice: numFiyat,
          buyPrice: holding.alisFiyati,
          stopajRate: stopajInfo.rate,
        })
      : null;

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

    onAddTransaction(holding.id, newTx);
    setAdet('');
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-lg bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400">
              <History className="w-4 h-4" />
            </div>
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
            <div className="text-slate-500">Mevcut Pay</div>
            <div className="text-white font-bold">{holding.adet.toLocaleString('tr-TR')}</div>
          </div>
          <div>
            <div className="text-slate-500">Ort. Maliyet</div>
            <div className="text-white font-bold">₺{holding.alisFiyati.toFixed(4)}</div>
          </div>
          <div>
            <div className="text-slate-500">Güncel Fiyat</div>
            <div className="text-emerald-400 font-bold">₺{currentPrice.toFixed(4)}</div>
          </div>
        </div>

        {/* Action Toggle to Add Transaction */}
        <div className="flex items-center justify-between py-1.5">
          <span className="text-xs font-bold text-white">İşlem Geçmişi ({transactions.length})</span>
          <button
            onClick={() => {
              setFiyat(currentPrice ? currentPrice.toString() : '');
              setShowAddForm(!showAddForm);
            }}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showAddForm ? 'Vazgeç' : 'Hızlı İşlem Ekle'}</span>
          </button>
        </div>

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
                <label className="text-[10px] text-slate-400 block mb-0.5">Birim Fiyat (₺)</label>
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
                  onChange={(e) => setTarih(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-[11px] focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

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
                  <span className={sellTaxPreview.grossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {sellTaxPreview.grossProfit >= 0 ? '+' : ''}₺{sellTaxPreview.grossProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-amber-400 pt-1 border-t border-slate-800/80">
                  <span className="flex items-center gap-1">
                    <Percent className="w-3 h-3" />
                    Stopaj Kesintisi ({stopajInfo.label}):
                  </span>
                  <span className="font-bold">₺{sellTaxPreview.taxAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-white font-bold pt-0.5">
                  <span className="text-emerald-400">Net Hesaba Geçecek:</span>
                  <span className="text-emerald-400">₺{sellTaxPreview.netAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              className={`w-full py-2 rounded-lg font-bold text-xs cursor-pointer transition-colors shadow-sm ${
                type === 'BUY' ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950' : 'bg-rose-500 hover:bg-rose-400 text-white'
              }`}
            >
              {type === 'BUY' ? 'Alış İşlemini Kaydet' : 'Stopajlı Satış İşlemini Kaydet'}
            </button>
          </form>
        )}

        {/* Transactions List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {transactions.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              Kayıtlı işlem bulunamadı. Yukarıdaki butondan alış veya satış ekleyebilirsiniz.
            </div>
          ) : (
            transactions.map((tx) => {
              const isBuy = tx.type === 'BUY';
              const hasStopaj = !isBuy && tx.stopajTutari !== undefined;
              return (
                <div
                  key={tx.id}
                  className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono gap-2"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isBuy
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {isBuy ? (
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isBuy ? 'ALIŞ' : 'SATIŞ'}
                        </span>
                        <span className="text-white font-bold">{tx.adet.toLocaleString('tr-TR')} Adet</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        ₺{tx.fiyat.toFixed(4)} • {tx.tarih}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-1.5 sm:pt-0 border-slate-800/60">
                    <div className="text-left sm:text-right">
                      <div className="font-bold text-white">₺{tx.toplamTutar.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                      {hasStopaj && (
                        <div className="text-[10px] text-amber-400">
                          Stopaj: -₺{Number(tx.stopajTutari).toFixed(2)} | Net: ₺{Number(tx.netEleGecenTutar || tx.toplamTutar).toFixed(2)}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onDeleteTransaction(holding.id, tx.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
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
