export interface TefasPriceRaw {
  fonKodu: string;
  fonUnvan?: string;
  kategoriDerece?: number;
  kategoriFonSay?: number;
  tarih: string; // "YYYY-MM-DD"
  fiyat: number;
}

export interface TefasListRaw {
  fonKodu: string;
  fonUnvan: string;
  fonTurAciklama?: string;
  tefasDurum?: boolean;
  getiri1a?: number | null;
  getiri3a?: number | null;
  getiri6a?: number | null;
  getiri1y?: number | null;
  getiriyb?: number | null;
  getiri3y?: number | null;
  getiri5y?: number | null;
  riskDegeri?: string | number | null;
}

export interface FundHistoryDataPoint {
  date: string;
  price: number;
  sma20: number | null;
  sma50: number | null;
  rsi14: number | null;
  drawdown: number; // in percent, e.g. -4.2
}

export interface TechnicalIndicators {
  currentPrice: number;
  previousPrice: number;
  dailyChangePercent: number;
  periodChangePercent: number;
  rsi14: number | null;
  rsiCondition: 'AŞIRI ALIM (ŞİŞKİN)' | 'DENGELİ / NÖTR' | 'AŞIRI SATIM (DİP FIRSATI)';
  rsiTone: 'emerald' | 'amber' | 'rose' | 'cyan';
  sma20: number | null;
  sma50: number | null;
  smaCondition: string;
  smaSignal: 'BOĞA (GÜÇLÜ YÜKSELİŞ)' | 'TOPARLANMA' | 'KISA DÜZELTME' | 'AYI (DÜŞÜŞ TRENDİ)' | 'VERİ YETERSİZ';
  smaCrossSignal: 'GOLDEN CROSS' | 'DEATH CROSS' | 'NÖTR';
  annualizedVolatility: number; // in percent, e.g. 24.5%
  volatilityRiskClass: 'DÜŞÜK OYNAKLIK' | 'ORTA OYNAKLIK' | 'YÜKSEK OYNAKLIK' | 'AŞIRI OYNAK';
  maxDrawdown: number; // in percent, e.g. -12.4%
  sharpeRatio: number; // e.g. 1.45
  sharpeClass: 'MÜKEMMEL' | 'YÜKSEK' | 'ORTA' | 'DÜŞÜK' | 'NEGATİF';
}

export interface FundScoreBreakdown {
  returnScore: number; // 0 - 100 (%30 weight)
  sharpeScore: number; // 0 - 100 (%30 weight)
  techSignalScore: number; // 0 - 100 (%20 weight)
  riskDrawdownScore: number; // 0 - 100 (%20 weight)
  totalScore: number; // 0 - 100
  gradeBadge: string; // e.g. "88 / 100 - Güçlü Performans & Dengeli Risk"
  gradeTier: 'A+' | 'A' | 'B' | 'C' | 'D';
  gradeColor: string; // hex or tailwind
}

export interface FundAnalysisResult {
  fonKodu: string;
  fonUnvan: string;
  kategori?: string;
  kategoriDerece?: number;
  kategoriFonSay?: number;
  riskDegeri?: string | number | null;
  indicators: TechnicalIndicators;
  scores: FundScoreBreakdown;
  historySeries: FundHistoryDataPoint[];
  getiriler: {
    getiri1a?: number | null;
    getiri3a?: number | null;
    getiri6a?: number | null;
    getiri1y?: number | null;
    getiriyb?: number | null;
  };
}
