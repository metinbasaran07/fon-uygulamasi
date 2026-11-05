export interface PortfolioTransaction {
  id: string;
  type: 'BUY' | 'SELL'; // Alış veya Satış
  tarih: string; // "YYYY-MM-DD"
  adet: number;
  fiyat: number;
  toplamTutar: number;
  stopajOrani?: number; // e.g. 0 or 10
  stopajTutari?: number; // TL
  netEleGecenTutar?: number; // TL
  not?: string;
}

export interface PortfolioHolding {
  id: string;
  fonKodu: string;
  fonUnvan: string;
  kategori?: string;
  adet: number; // Güncel toplam pay adedi
  alisFiyati: number; // Ağırlıklı ortalama alış maliyeti
  islemler?: PortfolioTransaction[]; // İşlem geçmişi
  tarih?: string;
  stopajOrani?: number;
}

export interface PortfolioHoldingCalculated extends PortfolioHolding {
  guncelFiyat: number;
  toplamDeger: number;
  toplamMaliyet: number;
  karZararTL: number;
  karZararYuzde: number;
  portfoyOrani: number; // %
  toplamOdenenStopajTL?: number;
  tahminiStopajTL: number;
  stopajSonrasiNetKarTL: number; // Stopaj hesaplanmış (düşülmüş) net kâr
  stopajSonrasiNetKarYuzde: number; // Stopaj hesaplanmış getiri yüzdesi
  netDegerTL: number;
  gunlukDegisimTL: number; // Günlük fark TL (adet * günlük birim fiyat farkı)
  gunlukDegisimYuzde: number; // Günlük yüzde değişim (%)
  priceDate?: string; // Latest TEFAS closing price date e.g. "2026-11-05"
  historicalPrice?: number; // Real TEFAS price on chosen historical date
  historicalResolvedDate?: string;
  historicalDiffTL?: number;
  historicalDiffPct?: number;
}

export interface PortfolioSummary {
  toplamDeger: number;
  toplamMaliyet: number;
  toplamKarZararTL: number;
  toplamKarZararYuzde: number;
  toplamTahminiStopajTL: number;
  stopajSonrasiNetKarTL: number; // Stopaj hesaplanmış net kâr (₺)
  stopajSonrasiNetKarYuzde: number; // Stopaj hesaplanmış net getiri (%)
  netToplamDegerTL: number;
  holdingCount: number;
  toplamGunlukDegisimTL: number;
  toplamGunlukDegisimYuzde: number;
}

