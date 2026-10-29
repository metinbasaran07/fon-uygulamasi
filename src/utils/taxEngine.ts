/**
 * TEFAS Fonları Stopaj (Gelir Vergisi) Hesaplama Motoru
 *
 * Mevzuat Kuralları:
 * - Hisse Senedi Yoğun Fonlar (%80+ hisse taşıyan fonlar): %0 Stopaj (Vergiden Tam Muaf)
 * - Katılım Hisse Senedi Fonları: %0 Stopaj
 * - Diğer Yatırım Fonları (Para Piyasası, Değişken, Borçlanma, Kıymetli Madenler, Fon Sepeti): %10 Stopaj
 */

export interface FundStopajInfo {
  rate: number; // 0 veya 10
  label: string; // "%0 (Stopajsız)" veya "%10 Stopaj"
  isExempt: boolean;
  description: string;
}

export interface SellTaxCalculation {
  shares: number;
  sellPrice: number;
  buyPrice: number;
  grossAmount: number; // shares * sellPrice
  costBasis: number; // shares * buyPrice
  grossProfit: number; // grossAmount - costBasis
  taxAmount: number; // max(0, grossProfit) * (rate / 100)
  netAmount: number; // grossAmount - taxAmount
  netProfit: number; // grossProfit - taxAmount
}

export function getFundStopajInfo(fonUnvan?: string, kategori?: string): FundStopajInfo {
  const unvan = (fonUnvan || '').toUpperCase();

  // TEFAS ve Resmi Gelir Vergisi Mevzuatı:
  // Portföyünün en az %80'ini Borsa İstanbul paylarında tutan ve TEFAS unvanında tescilli olarak
  // "(HİSSE SENEDİ YOĞUN FON)" ibaresi yer alan fonlar kanunen %0 Stopaja tabidir (Tam Muafiyet).
  // Yabancı Hisse Senedi fonları (AFA, AFV, TFF vb.), Altın/Kıymetli Madenler (KZL vb.),
  // Para Piyasası, Borçlanma Araçları ve Değişken fonlar mevzuat gereği %10 stopaja tabidir.
  const isHisseYogun = unvan.includes('YOĞUN') || unvan.includes('YOGUN');

  if (isHisseYogun) {
    return {
      rate: 0,
      label: '%0 Stopaj (Muaf)',
      isExempt: true,
      description: 'TEFAS resmi tescilli Hisse Senedi Yoğun Fon statüsünde olduğundan getiriler %0 stopaja tabidir (Tam Muafiyet).',
    };
  }

  // Diğer fonlar genel stopaja tabidir (%10)
  return {
    rate: 10,
    label: '%10 Stopaj',
    isExempt: false,
    description: 'TEFAS mevzuatı: Satış anında elde edilen kâr üzerinden yasal %10 stopaj kesintisi uygulanır.',
  };
}

export function calculateSellTax(params: {
  shares: number;
  sellPrice: number;
  buyPrice: number;
  stopajRate: number; // e.g. 0 or 10
}): SellTaxCalculation {
  const { shares, sellPrice, buyPrice, stopajRate } = params;
  const grossAmount = Math.round(shares * sellPrice * 100) / 100;
  const costBasis = Math.round(shares * buyPrice * 100) / 100;
  const grossProfit = Math.round((grossAmount - costBasis) * 100) / 100;

  // Stopaj sadece elde edilen kâr pozitif ise kesilir!
  const taxAmount = grossProfit > 0 ? Math.round(grossProfit * (stopajRate / 100) * 100) / 100 : 0;
  const netAmount = Math.round((grossAmount - taxAmount) * 100) / 100;
  const netProfit = Math.round((grossProfit - taxAmount) * 100) / 100;

  return {
    shares,
    sellPrice,
    buyPrice,
    grossAmount,
    costBasis,
    grossProfit,
    taxAmount,
    netAmount,
    netProfit,
  };
}
