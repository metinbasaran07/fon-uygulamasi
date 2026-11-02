/**
 * TEFAS Fonları Dinamik Stopaj (Gelir Vergisi) Hesaplama Motoru
 *
 * Yürürlükteki Resmi Gazete ve Gelir İdaresi Başkanlığı (GİB) Mevzuatı:
 * 1. Hisse Senedi Yoğun Fonlar (BİST %80+): %0 Stopaj (GVK Geçici 67. Madde - Tam Muafiyet)
 * 2. Diğer Yatırım Fonları (Borçlanma, Değişken, Yabancı, Kıymetli Madenler, Fon Sepeti): %17,5 Stopaj
 *    (Resmi Gazete'de yayımlanan güncel Cumhurbaşkanı Kararları ve GVK Geçici 67 tebliği uyarınca)
 * 3. TEFAS'ta işlem görmeyen Serbest Hisse Yoğun Fonlar: %17,5 (11107 Sayılı CB Kararı, 33206 Sayılı RG)
 * 4. Kurumsal Para Piyasası / Serbest PPF: %10 (11734 Sayılı CB Kararı, 33361 Sayılı RG)
 *
 * Hesaplama Standardı:
 * Net Getiri = Brüt Getiri * (1 - Anlık_Mevzuat_Stopajı / 100)
 */

export interface FundStopajInfo {
  rate: number; // 0 veya 17.5
  label: string; // "%0 (Muaf)" veya "%17,5 Stopaj"
  isExempt: boolean;
  description: string;
  legalBasis: string; // Resmi mevzuat dayanağı
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
  netReturnPct: number; // net profit percentage
}

/**
 * Dinamik olarak fon unvanı ve türüne göre yürürlükteki mevzuat stopaj oranını belirler
 */
export function getFundStopajInfo(
  fonUnvan?: string,
  kategori?: string,
  fonKodu?: string
): FundStopajInfo {
  const unvan = (fonUnvan || '').toLocaleUpperCase('tr-TR');
  const kat = (kategori || '').toLocaleUpperCase('tr-TR');
  const code = (fonKodu || '').toLocaleUpperCase('tr-TR').trim();

  // 1. Yabancı (Foreign), Serbest ve Eurobond fonları hisse senedi içerse dahi %0 muafiyete tabi DEĞİLDİR
  const isForeign = unvan.includes('YABANCI') || kat.includes('YABANCI');
  const isSerbest = unvan.includes('SERBEST') || kat.includes('SERBEST');
  const isEurobond = unvan.includes('EUROBOND') || kat.includes('EUROBOND');

  // 2. TEFAS ve Resmi Gelir Vergisi Kanunu (GVK) Geçici 67. Madde:
  // Portföyünün en az %80'ini Borsa İstanbul hisse senetlerinde değerlendiren ve
  // TEFAS unvanında "(HİSSE SENEDİ YOĞUN FON)" tescili olan veya TEFAS'ta "Hisse Senedi Şemsiye Fonu"
  // statüsündeki tüm yerli hisse fonları kanunen %0 stopaja tabidir (Tam Muafiyet).
  const hasYogunKeyword = unvan.includes('YOĞUN') || unvan.includes('YOGUN');
  const isHisseSemsiye =
    kat.includes('HİSSE SENEDİ') ||
    kat.includes('HISSE SENEDI') ||
    kat.includes('HİSSE') ||
    kat.includes('HISSE');
  const hasHisseTitle =
    (unvan.includes('HİSSE') ||
      unvan.includes('HISSE') ||
      unvan.includes('BİST') ||
      unvan.includes('BIST')) &&
    !isForeign &&
    !isEurobond;

  const isHisseYogun =
    (hasYogunKeyword || isHisseSemsiye || hasHisseTitle) && !isForeign && !isSerbest;

  if (isHisseYogun) {
    return {
      rate: 0,
      label: '%0 Stopaj (Muaf)',
      isExempt: true,
      description:
        'GVK Geçici 67 uyarınca TEFAS tescilli Hisse Senedi Yoğun Fon statüsünde olduğundan getiriler kanunen %0 stopaja tabidir (Tam Muafiyet).',
      legalBasis: 'GVK Geçici 67. Madde / BİST Asgari %80 Pay Tam Muafiyeti',
    };
  }

  // Diğer tüm fonlar (Borçlanma Araçları, Yabancı Hisse/Emtia Fonları, Değişken, Altın/Kıymetli Madenler vb.):
  // Resmi Gazete'de yayımlanan güncel Cumhurbaşkanı Kararları gereğince bireysel yatırımcılar için %17,5 stopaja tabidir.
  return {
    rate: 17.5,
    label: '%17,5 Stopaj',
    isExempt: false,
    description:
      "Resmi Gazete'de yayımlanan güncel Cumhurbaşkanı Kararları ve GİB Geçici 67 mevzuatı uyarınca satış anında kâr üzerinden yasal %17,5 stopaj kesintisi uygulanır.",
    legalBasis: "Resmi Gazete Cumhurbaşkanı Kararı & GVK Geçici 67. Madde (%17,5 Düzenlemesi)",
  };
}

/**
 * Net Getiri Standardı: Net Getiri = Brüt Getiri * (1 - Stopaj / 100)
 */
export function calculateNetReturn(grossReturnPct: number, stopajRate: number): number {
  if (grossReturnPct <= 0) return grossReturnPct; // Zararda stopaj kesintisi olmaz
  const net = grossReturnPct * (1 - stopajRate / 100);
  return Math.round(net * 100) / 100;
}

export function calculateSellTax(params: {
  shares: number;
  sellPrice: number;
  buyPrice: number;
  stopajRate: number; // e.g. 0 or 17.5
}): SellTaxCalculation {
  const { shares, sellPrice, buyPrice, stopajRate } = params;
  const grossAmount = Math.round(shares * sellPrice * 100) / 100;
  const costBasis = Math.round(shares * buyPrice * 100) / 100;
  const grossProfit = Math.round((grossAmount - costBasis) * 100) / 100;

  // Stopaj sadece elde edilen kâr pozitif ise kesilir!
  const taxAmount = grossProfit > 0 ? Math.round(grossProfit * (stopajRate / 100) * 100) / 100 : 0;
  const netAmount = Math.round((grossAmount - taxAmount) * 100) / 100;
  const netProfit = Math.round((grossProfit - taxAmount) * 100) / 100;
  const netReturnPct = costBasis > 0 ? Math.round((netProfit / costBasis) * 10000) / 100 : 0;

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
    netReturnPct,
  };
}
