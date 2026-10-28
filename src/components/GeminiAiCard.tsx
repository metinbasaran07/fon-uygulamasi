import React, { useState, useEffect } from 'react';
import { FundAnalysisResult } from '../types/tefas';
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

interface GeminiAiCardProps {
  fund: FundAnalysisResult;
}

export const GeminiAiCard: React.FC<GeminiAiCardProps> = ({ fund }) => {
  const [analysis, setAnalysis] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAiAnalysis = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fonKodu: fund.fonKodu,
          fonUnvan: fund.fonUnvan,
          kategori: fund.kategori,
          guncelFiyat: fund.indicators.currentPrice,
          rsi14: fund.indicators.rsi14,
          sma20: fund.indicators.sma20,
          sma50: fund.indicators.sma50,
          smaDurumu: fund.indicators.smaCondition,
          volatiliteYillik: fund.indicators.annualizedVolatility,
          sharpeOrani: fund.indicators.sharpeRatio,
          maxDrawdown: fund.indicators.maxDrawdown,
          toplamPuan: fund.scores.totalScore,
          puanRozeti: fund.scores.gradeBadge,
          getiriler: fund.getiriler,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setAnalysis(data.analysis || 'Analiz oluşturulamadı.');
    } catch (err: any) {
      console.warn('AI analysis load notice:', err.message);
      setError('Analiz geçici olarak yüklenemedi.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (fund && fund.fonKodu) {
      fetchAiAnalysis();
    }
  }, [fund.fonKodu]);

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <h3 className="font-bold text-white text-sm">Yapay Zeka Durum Özeti</h3>
        </div>

        <button
          onClick={fetchAiAnalysis}
          disabled={isLoading}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          title="Yenile"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="mt-3">
        {isLoading && !analysis ? (
          <div className="py-6 flex flex-col items-center justify-center text-slate-500 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-400 mb-2" />
            <span>Matematiksel veriler inceleniyor...</span>
          </div>
        ) : error ? (
          <div className="p-3 rounded-xl bg-rose-950/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-slate-300 text-xs leading-relaxed whitespace-pre-line bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60 font-sans">
              {analysis}
            </div>
            <div className="text-[10px] text-slate-500 text-right">
              Bilgilendirme amaçlıdır, yatırım tavsiyesi içermez.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
