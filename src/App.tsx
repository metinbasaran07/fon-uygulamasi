/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { FundSearch } from './components/FundSearch';
import { FundOverviewCard } from './components/FundOverviewCard';
import { ScoreCard } from './components/ScoreCard';
import { TechnicalIndicatorsGrid } from './components/TechnicalIndicatorsGrid';
import { ChartSection } from './components/ChartSection';
import { GeminiAiCard } from './components/GeminiAiCard';
import { AllFundsDrawer } from './components/AllFundsDrawer';
import { DeployModal } from './components/DeployModal';
import { PortfolioView } from './components/PortfolioView';
import { PortfolioModal } from './components/PortfolioModal';
import { AiPortfolioChat } from './components/AiPortfolioChat';
import { FundComparisonView } from './components/FundComparisonView';
import { TefasListRaw, TefasPriceRaw, FundAnalysisResult } from './types/tefas';
import { PortfolioHolding, PortfolioTransaction } from './types/portfolio';
import { analyzeFundData } from './utils/quantEngine';
import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { AppTab } from './components/Header';

const STORAGE_KEY = 'fontables_user_portfolio_holdings_v3';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('analysis');
  const [currentFundCode, setCurrentFundCode] = useState<string>('TI2');
  const [currentPeriod, setCurrentPeriod] = useState<number>(12); // 12 months
  const [fundsList, setFundsList] = useState<TefasListRaw[]>([]);
  const [fundAnalysis, setFundAnalysis] = useState<FundAnalysisResult | null>(null);
  const [liveProfile, setLiveProfile] = useState<any>(null);
  const [latestPricesMap, setLatestPricesMap] = useState<Record<string, number>>({});
  const [dailyChangesMap, setDailyChangesMap] = useState<
    Record<
      string,
      { currentPrice: number; prevPrice: number; dailyChangeTL: number; dailyChangePercent: number }
    >
  >({});
  const [isLoadingFund, setIsLoadingFund] = useState<boolean>(true);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Portfolio State with initial transactions
  const [holdings, setHoldings] = useState<PortfolioHolding[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not parse portfolio storage:', e);
    }
    return [
      {
        id: 'TI2',
        fonKodu: 'TI2',
        fonUnvan: 'İŞ PORTFÖY HİSSE SENEDİ (TL) FONU',
        kategori: 'Hisse Senedi Şemsiye Fonu',
        adet: 15000,
        alisFiyati: 0.1042,
        tarih: '2026-06-15',
        islemler: [
          {
            id: 'tx-1',
            type: 'BUY',
            tarih: '2026-06-15',
            adet: 15000,
            fiyat: 0.1042,
            toplamTutar: 1563,
          },
        ],
      },
      {
        id: 'IIH',
        fonKodu: 'IIH',
        fonUnvan: 'İSTANBUL PORTFÖY ÜÇÜNCÜ DEĞİŞKEN FON',
        kategori: 'Değişken Şemsiye Fonu',
        adet: 2500,
        alisFiyati: 1.84,
        tarih: '2026-05-10',
        islemler: [
          {
            id: 'tx-2',
            type: 'BUY',
            tarih: '2026-05-10',
            adet: 2500,
            fiyat: 1.84,
            toplamTutar: 4600,
          },
        ],
      },
    ];
  });

  const [isAllFundsDrawerOpen, setIsAllFundsDrawerOpen] = useState<boolean>(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState<boolean>(false);
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState<boolean>(false);
  const [portfolioInitialFund, setPortfolioInitialFund] = useState<{
    fonKodu: string;
    fonUnvan: string;
    kategori?: string;
    guncelFiyat?: number;
  } | null>(null);

  // Fetch real TEFAS daily batch data (daily returns & prices) for portfolio holdings
  useEffect(() => {
    const codes = holdings.map((h) => h.fonKodu).filter(Boolean);
    if (codes.length === 0) return;

    fetch('/api/tefas/daily-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codes }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data.results) {
          setDailyChangesMap((prev) => ({ ...prev, ...data.results }));
          const priceUpdates: Record<string, number> = {};
          Object.entries(data.results).forEach(([c, info]: [string, any]) => {
            if (info?.currentPrice) priceUpdates[c] = info.currentPrice;
          });
          setLatestPricesMap((prev) => ({ ...prev, ...priceUpdates }));
        }
      })
      .catch((err) => console.warn('Daily batch fetch notice:', err));
  }, [holdings]);

  // Save holdings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
    } catch (e) {
      console.warn('Could not save portfolio to localStorage:', e);
    }
  }, [holdings]);

  // 1. Fetch full TEFAS funds list on mount
  const fetchFundsList = useCallback(async () => {
    try {
      const res = await fetch('/api/tefas/list');
      if (res.ok) {
        const data = await res.json();
        if (data.list && Array.isArray(data.list)) {
          setFundsList(data.list);
        }
      }
    } catch (err) {
      console.warn('Fund list prefetch notice:', err);
    }
  }, []);

  useEffect(() => {
    fetchFundsList();
  }, [fetchFundsList]);

  // 2. Fetch price history and perform quant calculations
  const loadFundAnalysis = useCallback(
    async (code: string, period: number) => {
      setIsLoadingFund(true);
      setErrorNotice(null);

      try {
        const response = await fetch('/api/tefas/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fonKodu: code, periyod: period }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `TEFAS servisine ulaşılamadı (${response.status})`);
        }

        const data = await response.json();
        const rawPrices: TefasPriceRaw[] = data.resultList || [];

        if (rawPrices.length === 0) {
          throw new Error(
            `"${code}" fonu için TEFAS'ta fiyat serisi bulunamadı. Lütfen fon kodunu kontrol edin.`
          );
        }

        const meta = fundsList.find((f) => f.fonKodu === code.toUpperCase()) || null;
        const analysis = analyzeFundData(rawPrices, meta);
        setFundAnalysis(analysis);

        // Fetch official live TEFAS profile & stopaj status
        fetch(`/api/tefas/profile/${code}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((pData) => {
            if (pData?.success && pData.profile) {
              setLiveProfile(pData.profile);
            }
          })
          .catch((err) => console.warn('Live profile fetch fallback:', err));

        if (analysis.indicators.currentPrice) {
          setLatestPricesMap((prev) => ({
            ...prev,
            [code.toUpperCase()]: analysis.indicators.currentPrice,
          }));
        }
      } catch (err: any) {
        console.warn('Fund analysis load notice:', err.message);
        setErrorNotice(err.message || 'Fon verisi yüklenirken bir sorun oluştu.');
      } finally {
        setIsLoadingFund(false);
      }
    },
    [fundsList]
  );

  useEffect(() => {
    if (currentFundCode) {
      loadFundAnalysis(currentFundCode, currentPeriod);
    }
  }, [currentFundCode, currentPeriod, loadFundAnalysis]);

  const handleSelectFund = (code: string) => {
    const clean = code.toUpperCase().trim();
    if (clean) {
      setCurrentFundCode(clean);
      if (activeTab !== 'analysis') {
        setActiveTab('analysis');
      }
    }
  };

  const handleOpenAddToPortfolioForCurrent = () => {
    if (fundAnalysis) {
      setPortfolioInitialFund({
        fonKodu: fundAnalysis.fonKodu,
        fonUnvan: fundAnalysis.fonUnvan,
        kategori: fundAnalysis.kategori,
        guncelFiyat: fundAnalysis.indicators.currentPrice,
      });
      setIsPortfolioModalOpen(true);
    }
  };

  const handleSaveHolding = (newHolding: PortfolioHolding, tx?: PortfolioTransaction) => {
    setHoldings((prev) => {
      const existingIdx = prev.findIndex((h) => h.fonKodu === newHolding.fonKodu);
      const transaction = tx || {
        id: `tx-${Date.now()}`,
        type: 'BUY',
        tarih: new Date().toISOString().split('T')[0],
        adet: newHolding.adet,
        fiyat: newHolding.alisFiyati,
        toplamTutar: Math.round(newHolding.adet * newHolding.alisFiyati * 100) / 100,
      };

      if (existingIdx >= 0) {
        const updated = [...prev];
        const old = updated[existingIdx];
        const currentTxs = old.islemler ? [...old.islemler, transaction] : [transaction];

        let totalShares = 0;
        let totalCost = 0;

        currentTxs.forEach((t) => {
          if (t.type === 'BUY') {
            totalShares += t.adet;
            totalCost += t.adet * t.fiyat;
          } else {
            totalShares = Math.max(0, totalShares - t.adet);
          }
        });

        const avgPrice = totalShares > 0 ? totalCost / totalShares : old.alisFiyati;

        updated[existingIdx] = {
          ...old,
          adet: totalShares,
          alisFiyati: avgPrice,
          islemler: currentTxs,
        };
        return updated;
      }

      return [
        {
          ...newHolding,
          islemler: [transaction],
        },
        ...prev,
      ];
    });
  };

  const handleRemoveHolding = (id: string) => {
    setHoldings((prev) => prev.filter((h) => h.id !== id && h.fonKodu !== id));
  };

  // Add Buy or Sell Transaction to existing holding
  const handleAddTransaction = (holdingId: string, tx: PortfolioTransaction) => {
    setHoldings((prev) => {
      return prev.map((h) => {
        if (h.id === holdingId || h.fonKodu === holdingId) {
          const currentTxs = [...(h.islemler || []), tx];
          let totalShares = 0;
          let totalCost = 0;

          currentTxs.forEach((t) => {
            if (t.type === 'BUY') {
              totalShares += t.adet;
              totalCost += t.adet * t.fiyat;
            } else {
              totalShares = Math.max(0, totalShares - t.adet);
            }
          });

          const avgPrice = totalShares > 0 ? totalCost / totalShares : h.alisFiyati;

          return {
            ...h,
            adet: totalShares,
            alisFiyati: avgPrice,
            islemler: currentTxs,
          };
        }
        return h;
      });
    });
  };

  // Delete transaction from holding
  const handleDeleteTransaction = (holdingId: string, txId: string) => {
    setHoldings((prev) => {
      return prev.map((h) => {
        if (h.id === holdingId || h.fonKodu === holdingId) {
          const remainingTxs = (h.islemler || []).filter((t) => t.id !== txId);
          let totalShares = 0;
          let totalCost = 0;

          remainingTxs.forEach((t) => {
            if (t.type === 'BUY') {
              totalShares += t.adet;
              totalCost += t.adet * t.fiyat;
            } else {
              totalShares = Math.max(0, totalShares - t.adet);
            }
          });

          const avgPrice = totalShares > 0 ? totalCost / totalShares : h.alisFiyati;

          return {
            ...h,
            adet: totalShares,
            alisFiyati: avgPrice,
            islemler: remainingTxs,
          };
        }
        return h;
      });
    });
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Fontables Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        portfolioCount={holdings.length}
      />

      {/* Main Workspace (Mobile-Optimized Padding with bottom clearance for mobile nav) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5 pb-20 md:pb-6 space-y-3 sm:space-y-4">
        {/* Subtle, Non-blocking Error Notice */}
        {errorNotice && (
          <div className="p-2.5 sm:p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 flex items-center justify-between text-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{errorNotice}</span>
            </div>
            <button
              onClick={() => setErrorNotice(null)}
              className="p-1 text-slate-500 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* TAB 1: AI PORTFOLIO ADVISOR & CHATBOT */}
        {activeTab === 'chat' && (
          <AiPortfolioChat
            holdings={holdings}
            fundsList={fundsList}
            latestPricesMap={latestPricesMap}
            onSelectFund={handleSelectFund}
          />
        )}

        {/* TAB 2: PORTFOLIO VIEW */}
        {activeTab === 'portfolio' && (
          <PortfolioView
            holdings={holdings}
            fundsList={fundsList}
            onOpenAddModal={() => {
              setPortfolioInitialFund(null);
              setIsPortfolioModalOpen(true);
            }}
            onRemoveHolding={handleRemoveHolding}
            onSelectFundForAnalysis={handleSelectFund}
            latestPricesMap={latestPricesMap}
            dailyChangesMap={dailyChangesMap}
            onAddTransaction={handleAddTransaction}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}

        {/* TAB 3: FUND COMPARISON (FON KARŞILAŞTIRMA) */}
        {activeTab === 'comparison' && (
          <FundComparisonView
            fundsList={fundsList}
            onSelectFundForAnalysis={(code) => {
              handleSelectFund(code);
              setActiveTab('analysis');
            }}
          />
        )}

        {/* TAB 3: SINGLE FUND QUANT ANALYSIS TERMINAL */}
        {activeTab === 'analysis' && (
          <div className="space-y-3 sm:space-y-4">
            {/* Clean Minimal Search Bar */}
            <FundSearch
              currentCode={currentFundCode}
              onSelectFund={handleSelectFund}
              isLoading={isLoadingFund}
              onOpenAllFunds={() => setIsAllFundsDrawerOpen(true)}
            />

            {/* Loading state indicator */}
            {isLoadingFund && !fundAnalysis && (
              <div className="py-16 sm:py-20 flex flex-col items-center justify-center gap-2.5 text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800/80">
                <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                <span className="text-xs tabular-nums text-slate-400">TEFAS verileri hesaplanıyor...</span>
              </div>
            )}

            {/* Single Fund Dashboard */}
            {fundAnalysis && (
              <div className="space-y-3 sm:space-y-4">
                {/* 1. Overview */}
                <FundOverviewCard
                  fund={fundAnalysis}
                  liveProfile={liveProfile}
                  onOpenAddToPortfolio={handleOpenAddToPortfolioForCurrent}
                />

                {/* 2. Main Visuals Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
                  {/* Left (8 cols): Chart + Indicators */}
                  <div className="lg:col-span-8 space-y-3 sm:space-y-4">
                    <ChartSection
                      historySeries={fundAnalysis.historySeries}
                      currentPeriod={currentPeriod}
                      onSelectPeriod={setCurrentPeriod}
                      isLoadingPeriod={isLoadingFund}
                    />

                    <TechnicalIndicatorsGrid indicators={fundAnalysis.indicators} />
                  </div>

                  {/* Right (4 cols): Score + Gemini AI */}
                  <div className="lg:col-span-4 space-y-3 sm:space-y-4">
                    <ScoreCard scores={fundAnalysis.scores} />
                    <GeminiAiCard fund={fundAnalysis} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals & Drawers */}
      <PortfolioModal
        isOpen={isPortfolioModalOpen}
        onClose={() => setIsPortfolioModalOpen(false)}
        onSave={handleSaveHolding}
        initialFund={portfolioInitialFund}
        fundsList={fundsList}
        latestPricesMap={latestPricesMap}
      />

      <AllFundsDrawer
        isOpen={isAllFundsDrawerOpen}
        onClose={() => setIsAllFundsDrawerOpen(false)}
        fundsList={fundsList}
        onSelectFund={handleSelectFund}
        currentCode={currentFundCode}
      />

      <DeployModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
      />
    </div>
  );
}
