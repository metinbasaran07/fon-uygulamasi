import {
  TefasPriceRaw,
  FundHistoryDataPoint,
  TechnicalIndicators,
  FundScoreBreakdown,
  FundAnalysisResult,
  TefasListRaw,
} from '../types/tefas';

/**
 * Calculates Wilder's 14-period Relative Strength Index (RSI)
 */
export function calculateRSI(prices: number[], period: number = 14): (number | null)[] {
  const rsiValues: (number | null)[] = new Array(prices.length).fill(null);
  if (prices.length <= period) return rsiValues;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  if (avgLoss === 0) {
    rsiValues[period] = 100;
  } else {
    const rs = avgGain / avgLoss;
    rsiValues[period] = Math.round((100 - 100 / (1 + rs)) * 100) / 100;
  }

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      rsiValues[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsiValues[i] = Math.round((100 - 100 / (1 + rs)) * 100) / 100;
    }
  }

  return rsiValues;
}

/**
 * Calculates Simple Moving Average (SMA)
 */
export function calculateSMA(prices: number[], period: number): (number | null)[] {
  const smaValues: (number | null)[] = new Array(prices.length).fill(null);
  if (prices.length < period) return smaValues;

  let windowSum = 0;
  for (let i = 0; i < period; i++) {
    windowSum += prices[i];
  }
  smaValues[period - 1] = windowSum / period;

  for (let i = period; i < prices.length; i++) {
    windowSum += prices[i] - prices[i - period];
    smaValues[i] = windowSum / period;
  }

  return smaValues;
}

/**
 * Calculates Maximum Drawdown (MDD) and Drawdown series
 */
export function calculateDrawdown(prices: number[]): {
  maxDrawdown: number;
  drawdownSeries: number[];
} {
  if (prices.length === 0) return { maxDrawdown: 0, drawdownSeries: [] };

  let peak = prices[0];
  let maxDD = 0;
  const drawdownSeries: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    const p = prices[i];
    if (p > peak) peak = p;
    const dd = peak > 0 ? ((p - peak) / peak) * 100 : 0;
    if (dd < maxDD) maxDD = dd;
    drawdownSeries.push(Math.round(dd * 100) / 100);
  }

  return {
    maxDrawdown: Math.round(maxDD * 100) / 100,
    drawdownSeries,
  };
}

/**
 * Calculates Annualized Volatility from daily price returns
 */
export function calculateAnnualizedVolatility(prices: number[]): number {
  if (prices.length < 3) return 0;

  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
  }

  if (returns.length < 2) return 0;

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
  const dailyStdev = Math.sqrt(variance);

  // 252 trading days per year
  const annualized = dailyStdev * Math.sqrt(252) * 100;
  return Math.round(annualized * 100) / 100;
}

/**
 * Calculates Sharpe Ratio
 * rf: Risk-free annual rate (default 35% for TRY benchmark or 0.35)
 */
export function calculateSharpeRatio(
  prices: number[],
  annualizedVolatility: number,
  periodDays: number
): number {
  if (prices.length < 10 || annualizedVolatility <= 0) return 0;

  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  const totalReturn = (lastPrice - firstPrice) / firstPrice;

  // Annualize the period return based on actual sample length
  const years = Math.max(periodDays / 365, 0.08); // min ~1 month
  const annualizedReturn = Math.pow(1 + totalReturn, 1 / years) - 1;

  // Assume reasonable benchmark rate (e.g. 35% in Turkey)
  const rf = 0.35;
  const excessReturn = annualizedReturn - rf;

  const sharpe = excessReturn / (annualizedVolatility / 100);
  return Math.round(Math.max(-5, Math.min(sharpe, 5)) * 100) / 100;
}

/**
 * Complete Mathematical Scoring Algorithm (0 - 100 Puan)
 * Ağırlıklar:
 * 1. Getiri Performansı: %30
 * 2. Sharpe / Risk Oranı: %30
 * 3. Teknik Sinyal Skoru (RSI & SMA): %20
 * 4. Volatilite ve Max Drawdown: %20
 */
export function calculateFundScore(params: {
  annualizedReturn: number;
  sharpeRatio: number;
  rsi: number | null;
  currentPrice: number;
  sma20: number | null;
  sma50: number | null;
  volatility: number;
  maxDrawdown: number;
}): FundScoreBreakdown {
  const { annualizedReturn, sharpeRatio, rsi, currentPrice, sma20, sma50, volatility, maxDrawdown } =
    params;

  // 1. Return Score (%30)
  let returnScore = 50;
  if (annualizedReturn >= 80) returnScore = 95;
  else if (annualizedReturn >= 60) returnScore = 88;
  else if (annualizedReturn >= 40) returnScore = 78;
  else if (annualizedReturn >= 25) returnScore = 68;
  else if (annualizedReturn >= 10) returnScore = 58;
  else if (annualizedReturn >= 0) returnScore = 48;
  else if (annualizedReturn >= -15) returnScore = 32;
  else returnScore = 15;

  // 2. Sharpe / Risk Ratio Score (%30)
  let sharpeScore = 50;
  if (sharpeRatio >= 1.8) sharpeScore = 96;
  else if (sharpeRatio >= 1.4) sharpeScore = 88;
  else if (sharpeRatio >= 1.0) sharpeScore = 80;
  else if (sharpeRatio >= 0.6) sharpeScore = 68;
  else if (sharpeRatio >= 0.2) sharpeScore = 55;
  else if (sharpeRatio >= 0.0) sharpeScore = 45;
  else if (sharpeRatio >= -0.5) sharpeScore = 30;
  else sharpeScore = 18;

  // 3. Technical Signal Score (%20)
  // RSI Subscore (0 - 100)
  let rsiScore = 60;
  if (rsi !== null) {
    if (rsi >= 48 && rsi <= 64) {
      rsiScore = 92; // Saflık ve güçlü dengeli trend
    } else if (rsi >= 35 && rsi < 48) {
      rsiScore = 80; // Toparlanma / potansiyel
    } else if (rsi < 35) {
      rsiScore = 72; // Aşırı satım, dip fırsatı
    } else if (rsi > 64 && rsi <= 72) {
      rsiScore = 75; // Güçlü ama doyum yaklaşıyor
    } else {
      rsiScore = 42; // Aşırı alım > 72, düzeltme riski
    }
  }

  // SMA Subscore (0 - 100)
  let smaScore = 50;
  if (sma20 !== null && sma50 !== null) {
    if (currentPrice > sma20 && sma20 > sma50) {
      smaScore = 98; // Mükemmel boğa dizilimi
    } else if (currentPrice > sma20 && sma20 <= sma50) {
      smaScore = 75; // Kısa vadeli toparlanma
    } else if (currentPrice <= sma20 && currentPrice > sma50) {
      smaScore = 60; // Düzeltme bölgesi, ana trend üstünde
    } else if (currentPrice < sma20 && sma20 < sma50) {
      smaScore = 30; // Belirgin düşüş trendi
    } else {
      smaScore = 50;
    }
  } else if (sma20 !== null) {
    smaScore = currentPrice > sma20 ? 80 : 45;
  }
  const techSignalScore = Math.round((rsiScore * 0.45 + smaScore * 0.55));

  // 4. Volatility and Max Drawdown Protection Score (%20)
  let ddScore = 50;
  const absDD = Math.abs(maxDrawdown);
  if (absDD <= 4) ddScore = 96;
  else if (absDD <= 8) ddScore = 88;
  else if (absDD <= 14) ddScore = 76;
  else if (absDD <= 22) ddScore = 62;
  else if (absDD <= 32) ddScore = 46;
  else ddScore = 25;

  let volScore = 50;
  if (volatility <= 12) volScore = 94; // Çok düşük dalgalanma
  else if (volatility <= 20) volScore = 85;
  else if (volatility <= 32) volScore = 72;
  else if (volatility <= 45) volScore = 55;
  else volScore = 35;

  const riskDrawdownScore = Math.round((ddScore * 0.6 + volScore * 0.4));

  // Weighted Total Calculation
  const totalScore = Math.round(
    returnScore * 0.3 + sharpeScore * 0.3 + techSignalScore * 0.2 + riskDrawdownScore * 0.2
  );

  let gradeBadge = '';
  let gradeTier: 'A+' | 'A' | 'B' | 'C' | 'D' = 'B';
  let gradeColor = '#f59e0b'; // amber

  if (totalScore >= 85) {
    gradeTier = 'A+';
    gradeBadge = `${totalScore} / 100 - Güçlü Performans & Dengeli Risk`;
    gradeColor = '#10b981'; // emerald
  } else if (totalScore >= 70) {
    gradeTier = 'A';
    gradeBadge = `${totalScore} / 100 - Yüksek Getiri Potansiyeli`;
    gradeColor = '#06b6d4'; // cyan
  } else if (totalScore >= 55) {
    gradeTier = 'B';
    gradeBadge = `${totalScore} / 100 - Dengeli ve Orta Riskli`;
    gradeColor = '#f59e0b'; // amber
  } else if (totalScore >= 40) {
    gradeTier = 'C';
    gradeBadge = `${totalScore} / 100 - Dalgalı & Yüksek Risk Profili`;
    gradeColor = '#f97316'; // orange
  } else {
    gradeTier = 'D';
    gradeBadge = `${totalScore} / 100 - Zayıf Moment & Yüksek Risk`;
    gradeColor = '#f43f5e'; // rose
  }

  return {
    returnScore,
    sharpeScore,
    techSignalScore,
    riskDrawdownScore,
    totalScore,
    gradeBadge,
    gradeTier,
    gradeColor,
  };
}

/**
 * Main Analysis Pipeline: takes raw TEFAS prices & info and produces complete analysis
 */
export function analyzeFundData(
  rawPrices: TefasPriceRaw[],
  fundMeta?: TefasListRaw | null
): FundAnalysisResult {
  if (!rawPrices || rawPrices.length === 0) {
    throw new Error('Analiz için fiyat verisi bulunamadı.');
  }

  // Sort ascending by date
  const sorted = [...rawPrices].sort(
    (a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime()
  );

  const prices = sorted.map((d) => d.fiyat);
  const dates = sorted.map((d) => d.tarih);

  const rsiSeries = calculateRSI(prices, 14);
  const sma20Series = calculateSMA(prices, 20);
  const sma50Series = calculateSMA(prices, 50);
  const { maxDrawdown, drawdownSeries } = calculateDrawdown(prices);
  const annualizedVolatility = calculateAnnualizedVolatility(prices);

  const lastIdx = prices.length - 1;
  const currentPrice = prices[lastIdx];
  const previousPrice = lastIdx > 0 ? prices[lastIdx - 1] : currentPrice;
  const firstPrice = prices[0];

  const dailyChangePercent =
    previousPrice > 0 ? ((currentPrice - previousPrice) / previousPrice) * 100 : 0;
  const periodChangePercent =
    firstPrice > 0 ? ((currentPrice - firstPrice) / firstPrice) * 100 : 0;

  const currentRsi = rsiSeries[lastIdx];
  const currentSma20 = sma20Series[lastIdx];
  const currentSma50 = sma50Series[lastIdx];

  // Calculate days spanned
  const firstDate = new Date(dates[0]);
  const lastDate = new Date(dates[lastIdx]);
  const daysDiff = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (1000 * 3600 * 24));

  const sharpeRatio = calculateSharpeRatio(prices, annualizedVolatility, daysDiff);

  // Annualized return for scoring
  const years = Math.max(daysDiff / 365, 0.08);
  const annualizedReturn =
    firstPrice > 0 ? (Math.pow(currentPrice / firstPrice, 1 / years) - 1) * 100 : 0;

  // Build History Series
  const historySeries: FundHistoryDataPoint[] = sorted.map((item, idx) => ({
    date: item.tarih,
    price: item.fiyat,
    sma20: sma20Series[idx] !== null ? Math.round(sma20Series[idx]! * 100000) / 100000 : null,
    sma50: sma50Series[idx] !== null ? Math.round(sma50Series[idx]! * 100000) / 100000 : null,
    rsi14: rsiSeries[idx] !== null ? Math.round(rsiSeries[idx]! * 10) / 10 : null,
    drawdown: drawdownSeries[idx] || 0,
  }));

  // RSI Condition
  let rsiCondition: TechnicalIndicators['rsiCondition'] = 'DENGELİ / NÖTR';
  let rsiTone: TechnicalIndicators['rsiTone'] = 'cyan';
  if (currentRsi !== null) {
    if (currentRsi >= 70) {
      rsiCondition = 'AŞIRI ALIM (ŞİŞKİN)';
      rsiTone = 'rose';
    } else if (currentRsi <= 30) {
      rsiCondition = 'AŞIRI SATIM (DİP FIRSATI)';
      rsiTone = 'emerald';
    } else {
      rsiCondition = 'DENGELİ / NÖTR';
      rsiTone = 'cyan';
    }
  }

  // SMA Trend Signal & Cross
  let smaSignal: TechnicalIndicators['smaSignal'] = 'VERİ YETERSİZ';
  let smaCondition = 'Yetersiz geçmiş veri';
  let smaCrossSignal: TechnicalIndicators['smaCrossSignal'] = 'NÖTR';

  if (currentSma20 !== null && currentSma50 !== null) {
    if (currentPrice > currentSma20 && currentSma20 > currentSma50) {
      smaSignal = 'BOĞA (GÜÇLÜ YÜKSELİŞ)';
      smaCondition = 'Fiyat > SMA20 > SMA50 (Kusursuz yukarı yönlü momentum)';
    } else if (currentPrice > currentSma20 && currentPrice <= currentSma50) {
      smaSignal = 'TOPARLANMA';
      smaCondition = 'Fiyat SMA20 üzerinde, 50 günlük direnci test ediyor';
    } else if (currentPrice <= currentSma20 && currentPrice > currentSma50) {
      smaSignal = 'KISA DÜZELTME';
      smaCondition = 'Fiyat 20 günlük ortalama altında düzeltmede, ana destek SMA50';
    } else {
      smaSignal = 'AYI (DÜŞÜŞ TRENDİ)';
      smaCondition = 'Fiyat < SMA20 < SMA50 (Negatif baskı hakim)';
    }

    // Check if Golden or Death cross occurred in last 10 days
    if (prices.length >= 55) {
      const prev20 = sma20Series[lastIdx - 5];
      const prev50 = sma50Series[lastIdx - 5];
      if (prev20 !== null && prev50 !== null) {
        if (prev20 <= prev50 && currentSma20 > currentSma50) {
          smaCrossSignal = 'GOLDEN CROSS';
        } else if (prev20 >= prev50 && currentSma20 < currentSma50) {
          smaCrossSignal = 'DEATH CROSS';
        }
      }
    }
  } else if (currentSma20 !== null) {
    smaSignal = currentPrice > currentSma20 ? 'TOPARLANMA' : 'KISA DÜZELTME';
    smaCondition = currentPrice > currentSma20 ? 'Fiyat SMA20 üzerinde' : 'Fiyat SMA20 altında';
  }

  // Volatility classification
  let volatilityRiskClass: TechnicalIndicators['volatilityRiskClass'] = 'ORTA OYNAKLIK';
  if (annualizedVolatility < 15) volatilityRiskClass = 'DÜŞÜK OYNAKLIK';
  else if (annualizedVolatility < 28) volatilityRiskClass = 'ORTA OYNAKLIK';
  else if (annualizedVolatility < 45) volatilityRiskClass = 'YÜKSEK OYNAKLIK';
  else volatilityRiskClass = 'AŞIRI OYNAK';

  // Sharpe classification
  let sharpeClass: TechnicalIndicators['sharpeClass'] = 'ORTA';
  if (sharpeRatio >= 1.6) sharpeClass = 'MÜKEMMEL';
  else if (sharpeRatio >= 1.1) sharpeClass = 'YÜKSEK';
  else if (sharpeRatio >= 0.5) sharpeClass = 'ORTA';
  else if (sharpeRatio >= 0) sharpeClass = 'DÜŞÜK';
  else sharpeClass = 'NEGATİF';

  const indicators: TechnicalIndicators = {
    currentPrice: Math.round(currentPrice * 1000000) / 1000000,
    previousPrice: Math.round(previousPrice * 1000000) / 1000000,
    dailyChangePercent: Math.round(dailyChangePercent * 100) / 100,
    periodChangePercent: Math.round(periodChangePercent * 100) / 100,
    rsi14: currentRsi,
    rsiCondition,
    rsiTone,
    sma20: currentSma20 ? Math.round(currentSma20 * 100000) / 100000 : null,
    sma50: currentSma50 ? Math.round(currentSma50 * 100000) / 100000 : null,
    smaCondition,
    smaSignal,
    smaCrossSignal,
    annualizedVolatility,
    volatilityRiskClass,
    maxDrawdown,
    sharpeRatio,
    sharpeClass,
  };

  const scores = calculateFundScore({
    annualizedReturn,
    sharpeRatio,
    rsi: currentRsi,
    currentPrice,
    sma20: currentSma20,
    sma50: currentSma50,
    volatility: annualizedVolatility,
    maxDrawdown,
  });

  const lastItem = sorted[lastIdx];

  return {
    fonKodu: lastItem.fonKodu,
    fonUnvan: fundMeta?.fonUnvan || lastItem.fonUnvan || `${lastItem.fonKodu} Fonu`,
    kategori: fundMeta?.fonTurAciklama || 'Yatırım Fonu',
    kategoriDerece: lastItem.kategoriDerece,
    kategoriFonSay: lastItem.kategoriFonSay,
    riskDegeri: fundMeta?.riskDegeri,
    indicators,
    scores,
    historySeries,
    getiriler: {
      getiri1a: fundMeta?.getiri1a ?? null,
      getiri3a: fundMeta?.getiri3a ?? null,
      getiri6a: fundMeta?.getiri6a ?? null,
      getiri1y: fundMeta?.getiri1y ?? null,
      getiriyb: fundMeta?.getiriyb ?? null,
    },
  };
}
