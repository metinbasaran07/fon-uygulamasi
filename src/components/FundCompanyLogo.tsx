import React, { useState } from 'react';

interface FundCompanyLogoProps {
  fonKodu: string;
  fonUnvan?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * GÖRSEL VE LOGO YÖNETİMİ KURALLARI (CLEARBIT LOGO API):
 * 1. Şirket logoları resmi web domainleri üzerinden Clearbit API ile çekilir:
 *    https://logo.clearbit.com/{DOMAIN}
 * 2. Domain Eşleştirme Tablosu:
 *    - İŞ PORTFÖY ➔ isportfoy.com.tr
 *    - AK PORTFÖY ➔ akportfoy.com.tr
 *    - YAPI KREDİ PORTFÖY ➔ yapikrediportfoy.com.tr
 *    - ZİRAAT PORTFÖY ➔ ziraatportfoy.com.tr
 *    - KUVEYT TÜRK PORTFÖY ➔ kuveytturk.com.tr
 *    - GARANTİ PORTFÖY ➔ garantibbvaportfoy.com.tr
 *    - TERA PORTFÖY ➔ teraportfoy.com.tr
 *    - PARDUS PORTFÖY ➔ pardusportfoy.com.tr
 *    - TACİRLER PORTFÖY ➔ tacirlerportfoy.com.tr
 * 3. Fallback ve Hata Yönetimi:
 *    - Clearbit API üzerinden logo bulunamazsa veya görsel yüklenemezse (onError),
 *      yerel varsayılan ikon yolu `/assets/logos/default-fund.png` veya
 *      fon baş harflerinden oluşan şık renkli avatar (badge) gösterilir.
 */
export const COMPANY_DOMAIN_MAP: Record<string, string> = {
  // Kullanıcının Zorunlu Eşleştirme Tablosu:
  'İŞ PORTFÖY': 'isportfoy.com.tr',
  'AK PORTFÖY': 'akportfoy.com.tr',
  'YAPI KREDİ PORTFÖY': 'yapikrediportfoy.com.tr',
  'ZİRAAT PORTFÖY': 'ziraatportfoy.com.tr',
  'KUVEYT TÜRK PORTFÖY': 'kuveytturk.com.tr',
  'KUVEYT TÜRK': 'kuveytturk.com.tr',
  'GARANTİ PORTFÖY': 'garantibbvaportfoy.com.tr',
  'TERA PORTFÖY': 'teraportfoy.com.tr',
  'PARDUS PORTFÖY': 'pardusportfoy.com.tr',
  'TACİRLER PORTFÖY': 'tacirlerportfoy.com.tr',
  'TACOLL PORTFÖY': 'tacirlerportfoy.com.tr',

  // Diğer Yaygın TEFAS Portföy Yönetim Şirketleri:
  'İSTANBUL PORTFÖY': 'istanbulportfoy.com',
  'TEB PORTFÖY': 'tebportfoy.com.tr',
  'QNB PORTFÖY': 'qnbportfoy.com',
  'VAKIF PORTFÖY': 'vakifportfoy.com.tr',
  'DENİZ PORTFÖY': 'denizportfoy.com',
  'FİBA PORTFÖY': 'fibaportfoy.com.tr',
  'AZİMUT PORTFÖY': 'azimutportfoy.com',
  'HEDEF PORTFÖY': 'hedefportfoy.com',
  'OSMANLI PORTFÖY': 'osmanliportfoy.com.tr',
  'OYAK PORTFÖY': 'oyakportfoy.com',
  'RE-PIE PORTFÖY': 're-pie.com',
  'INVEA PORTFÖY': 'inveaportfoy.com',
  'ALBARAKA PORTFÖY': 'albarakaportfoy.com.tr',
  'ROTA PORTFÖY': 'rotaportfoy.com',
  'A1 PORTFÖY': 'a1portfoy.com.tr',
  'ALLBATROSS PORTFÖY': 'allbatrossportfoy.com',
  'NEO PORTFÖY': 'neoportfoy.com',
};

/**
 * Fon kodu veya unvanından resmi şirket domainini tespit eder
 */
export function getCompanyDomain(fonKodu: string, fonUnvan?: string): string | null {
  const code = (fonKodu || '').toUpperCase().trim();
  const title = (fonUnvan || '').toUpperCase().trim();

  // 1. Unvan bazlı eşleştirme
  if (
    title.includes('İŞ PORTFÖY') ||
    title.includes('IS PORTFOY') ||
    title.includes('İŞ BANKASI') ||
    title.includes('IS BANKASI')
  ) {
    return COMPANY_DOMAIN_MAP['İŞ PORTFÖY'];
  }
  if (title.includes('AK PORTFÖY') || title.includes('AK PORTFOY') || title.includes('AKBANK')) {
    return COMPANY_DOMAIN_MAP['AK PORTFÖY'];
  }
  if (
    title.includes('YAPI KREDİ') ||
    title.includes('YAPI KREDI') ||
    title.includes('YAPİKREDİ') ||
    title.includes('KOÇ')
  ) {
    return COMPANY_DOMAIN_MAP['YAPI KREDİ PORTFÖY'];
  }
  if (title.includes('ZİRAAT') || title.includes('ZIRAAT')) {
    return COMPANY_DOMAIN_MAP['ZİRAAT PORTFÖY'];
  }
  if (
    title.includes('KUVEYT TÜRK') ||
    title.includes('KUVEYTTURK') ||
    title.includes('KT PORTFÖY')
  ) {
    return COMPANY_DOMAIN_MAP['KUVEYT TÜRK PORTFÖY'];
  }
  if (
    title.includes('GARANTİ') ||
    title.includes('GARANTI') ||
    title.includes('BBVA')
  ) {
    return COMPANY_DOMAIN_MAP['GARANTİ PORTFÖY'];
  }
  if (title.includes('TERA')) {
    return COMPANY_DOMAIN_MAP['TERA PORTFÖY'];
  }
  if (title.includes('PARDUS')) {
    return COMPANY_DOMAIN_MAP['PARDUS PORTFÖY'];
  }
  if (
    title.includes('TACİRLER') ||
    title.includes('TACIRLER') ||
    title.includes('TACOLL')
  ) {
    return COMPANY_DOMAIN_MAP['TACİRLER PORTFÖY'];
  }
  if (title.includes('İSTANBUL PORTFÖY') || title.includes('ISTANBUL PORTFOY')) {
    return COMPANY_DOMAIN_MAP['İSTANBUL PORTFÖY'];
  }
  if (title.includes('TEB')) {
    return COMPANY_DOMAIN_MAP['TEB PORTFÖY'];
  }
  if (title.includes('QNB') || title.includes('FİNANS') || title.includes('FINANS')) {
    return COMPANY_DOMAIN_MAP['QNB PORTFÖY'];
  }
  if (title.includes('VAKIF') || title.includes('VAKİF')) {
    return COMPANY_DOMAIN_MAP['VAKIF PORTFÖY'];
  }
  if (title.includes('DENİZ') || title.includes('DENIZ')) {
    return COMPANY_DOMAIN_MAP['DENİZ PORTFÖY'];
  }
  if (title.includes('FİBA') || title.includes('FIBA')) {
    return COMPANY_DOMAIN_MAP['FİBA PORTFÖY'];
  }
  if (title.includes('AZİMUT') || title.includes('AZIMUT')) {
    return COMPANY_DOMAIN_MAP['AZİMUT PORTFÖY'];
  }
  if (title.includes('HEDEF')) {
    return COMPANY_DOMAIN_MAP['HEDEF PORTFÖY'];
  }
  if (title.includes('OSMANLI')) {
    return COMPANY_DOMAIN_MAP['OSMANLI PORTFÖY'];
  }
  if (title.includes('OYAK')) {
    return COMPANY_DOMAIN_MAP['OYAK PORTFÖY'];
  }
  if (title.includes('RE-PIE') || title.includes('RE PIE')) {
    return COMPANY_DOMAIN_MAP['RE-PIE PORTFÖY'];
  }
  if (title.includes('INVEA') || title.includes('GEDİK') || title.includes('INVEO')) {
    return COMPANY_DOMAIN_MAP['INVEA PORTFÖY'];
  }
  if (title.includes('ALBARAKA')) {
    return COMPANY_DOMAIN_MAP['ALBARAKA PORTFÖY'];
  }
  if (title.includes('ROTA')) {
    return COMPANY_DOMAIN_MAP['ROTA PORTFÖY'];
  }

  // 2. Fon kodu öneki (Prefix) bazlı eşleştirme
  if (
    code.startsWith('TI') ||
    code.startsWith('TP') ||
    code.startsWith('TH') ||
    code.startsWith('TT') ||
    code.startsWith('TZ') ||
    code === 'TAU' ||
    code === 'TLH' ||
    code === 'TGE'
  ) {
    return 'isportfoy.com.tr';
  }
  if (
    code.startsWith('AK') ||
    code.startsWith('AF') ||
    code.startsWith('AP') ||
    code.startsWith('AY') ||
    code.startsWith('AS') ||
    code.startsWith('AR')
  ) {
    return 'akportfoy.com.tr';
  }
  if (
    code.startsWith('YK') ||
    code.startsWith('YP') ||
    code === 'YDI' ||
    code === 'YAS' ||
    code === 'YTD'
  ) {
    return 'yapikrediportfoy.com.tr';
  }
  if (
    code.startsWith('ZR') ||
    code.startsWith('ZB') ||
    code.startsWith('ZPK') ||
    code === 'ZPE' ||
    code === 'ZRE'
  ) {
    return 'ziraatportfoy.com.tr';
  }
  if (
    code.startsWith('KZ') ||
    code.startsWith('KT') ||
    code.startsWith('KPD') ||
    code === 'KLU' ||
    code === 'KPU'
  ) {
    return 'kuveytturk.com.tr';
  }
  if (
    code.startsWith('GA') ||
    code.startsWith('GT') ||
    code.startsWith('GB') ||
    code.startsWith('GP') ||
    code === 'GMR' ||
    code === 'GBL'
  ) {
    return 'garantibbvaportfoy.com.tr';
  }
  if (code.startsWith('TR') || code === 'TEF' || code === 'TEP' || code === 'TEA') {
    return 'teraportfoy.com.tr';
  }
  if (code.startsWith('PR') || code === 'PRD' || code === 'PRK') {
    return 'pardusportfoy.com.tr';
  }
  if (code.startsWith('TC') || code.startsWith('TA') || code === 'TCR' || code === 'TCP') {
    return 'tacirlerportfoy.com.tr';
  }
  if (
    code.startsWith('II') ||
    code.startsWith('IP') ||
    code === 'IHK' ||
    code === 'IRC' ||
    code === 'IRF'
  ) {
    return 'istanbulportfoy.com';
  }

  return null;
}

/**
 * Clearbit Logo API uç noktası URL'sini döner:
 * https://logo.clearbit.com/{DOMAIN}
 */
export function getCompanyLogoUrl(fonKodu: string, fonUnvan?: string): string {
  const domain = getCompanyDomain(fonKodu, fonUnvan);
  if (!domain) {
    return '/assets/logos/default-fund.png';
  }
  return `https://logo.clearbit.com/${domain}`;
}

/**
 * Fon koduna özel tutarlı renk paleti (Badge Fallback için)
 */
function getBadgeGradient(code: string): string {
  const gradients = [
    'from-indigo-600 to-violet-800',
    'from-blue-600 to-cyan-700',
    'from-emerald-600 to-teal-800',
    'from-amber-600 to-orange-800',
    'from-rose-600 to-pink-800',
    'from-purple-600 to-fuchsia-800',
    'from-cyan-600 to-blue-800',
  ];
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = (hash * 31 + code.charCodeAt(i)) % gradients.length;
  }
  return gradients[hash] || gradients[0];
}

/**
 * Clearbit Logo API Bileşeni:
 * - Domain tespit edilirse: https://logo.clearbit.com/{DOMAIN}
 * - Clearbit yüklenemezse (onError): /assets/logos/default-fund.png
 * - Görsel yoksa veya bulunamazsa: Fon baş harflerinden oluşan renkli avatar (badge)
 */
export const FundCompanyLogo: React.FC<FundCompanyLogoProps> = ({
  fonKodu,
  fonUnvan = '',
  className = '',
  size = 'md',
}) => {
  // state: 'clearbit' -> 'default_png' -> 'badge'
  const [stage, setStage] = useState<'clearbit' | 'default_png' | 'badge'>('clearbit');

  const code = (fonKodu || '').toUpperCase().trim();
  const domain = getCompanyDomain(code, fonUnvan);

  // Boyut sınıfları
  const sizeClasses = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-11 h-11 text-sm',
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.md;
  const initials = code.slice(0, 2) || 'FN';
  const gradientClass = getBadgeGradient(code);

  // 1. Clearbit Logo denemesi
  if (domain && stage === 'clearbit') {
    return (
      <div
        className={`${currentSizeClass} rounded-full bg-slate-900 border border-slate-700/60 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-sm ${className}`}
        title={`${fonUnvan || fonKodu} (${domain})`}
      >
        <img
          src={`https://logo.clearbit.com/${domain}`}
          alt={fonUnvan || fonKodu}
          className="w-full h-full object-contain rounded-full bg-white/5"
          onError={() => setStage('default_png')}
          loading="lazy"
        />
      </div>
    );
  }

  // 2. Varsayılan yerel ikon (/assets/logos/default-fund.png) denemesi
  if (stage === 'default_png') {
    return (
      <div
        className={`${currentSizeClass} rounded-full bg-slate-900 border border-slate-700/60 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-sm ${className}`}
        title={`${fonUnvan || fonKodu}`}
      >
        <img
          src="/assets/logos/default-fund.png"
          alt={fonUnvan || fonKodu}
          className="w-full h-full object-contain rounded-full"
          onError={() => setStage('badge')}
          loading="lazy"
        />
      </div>
    );
  }

  // 3. Renkli Avatar Rozeti (Badge Fallback Standardı)
  return (
    <div
      className={`${currentSizeClass} rounded-full bg-gradient-to-br ${gradientClass} border border-white/20 flex items-center justify-center text-white font-black shrink-0 shadow-sm tabular-nums ${className}`}
      title={fonUnvan || fonKodu}
    >
      <span className="leading-none tracking-tight">{initials}</span>
    </div>
  );
};
