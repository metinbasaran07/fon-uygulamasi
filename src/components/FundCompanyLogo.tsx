import React, { useState } from 'react';
import fundDomainMapRaw from '../data/fundDomainMap.json';
import fundCompanyMapRaw from '../data/fundCompanyMap.json';

interface FundCompanyLogoProps {
  fonKodu: string;
  fonUnvan?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * TEFAS Fon Kodu ➔ Doğrulanmış Logo Domain Haritası (817 Fon)
 */
const FUND_CODE_TO_DOMAIN: Record<string, string> = fundDomainMapRaw as Record<string, string>;

/**
 * TEFAS Fon Kodu ➔ Kurucu Portföy Yönetim Şirketi (PYŞ) Haritası (1071 Fon)
 */
const FUND_CODE_TO_COMPANY: Record<string, string> = fundCompanyMapRaw as Record<string, string>;

/**
 * GÖRSEL VE LOGO YÖNETİMİ:
 * 1. Şirket logoları resmi web domainleri üzerinden Google Favicon API (128x128px) ile çekilir:
 *    https://www.google.com/s2/favicons?domain={DOMAIN}&sz=128
 * 2. Logosu bulunmayan veya doğrulanamayan portföyler için varsayılan küre simgesi yerine
 *    doğrudan fon kodunun harflerinden oluşan şık badge gösterilir.
 * 3. Badge Arka Plan Standardı:
 *    Her portföy şirketinin kendine ait özel bir rengi vardır ve o şirkete ait BÜTÜN fonlar
 *    kendi içinde aynı arka plan rengini taşır (Örn: Deniz Portföy fonlarının hepsi Deniz Mavisi).
 */
export const COMPANY_DOMAIN_MAP: Record<string, string> = {
  // Kullanıcının Zorunlu Eşleştirme Tablosu:
  'İŞ': 'isportfoy.com.tr',
  'IS': 'isportfoy.com.tr',
  'İŞ PORTFÖY': 'isportfoy.com.tr',
  'AK': 'akportfoy.com.tr',
  'AK PORTFÖY': 'akportfoy.com.tr',
  'YAPI KREDİ': 'yapikredi.com.tr',
  'YAPI KREDİ PORTFÖY': 'yapikredi.com.tr',
  'GARANTİ': 'garantibbvaportfoy.com.tr',
  'GARANTİ PORTFÖY': 'garantibbvaportfoy.com.tr',
  'ZİRAAT': 'ziraatportfoy.com.tr',
  'ZİRAAT PORTFÖY': 'ziraatportfoy.com.tr',
  'KUVEYT TÜRK': 'kuveytturk.com.tr',
  'KUVEYT TÜRK PORTFÖY': 'kuveytturk.com.tr',
  'TERA': 'terayatirim.com.tr',
  'TERA PORTFÖY': 'terayatirim.com.tr',
  'PARDUS': 'pardusportfoy.com',
  'PARDUS PORTFÖY': 'pardusportfoy.com',
  'ALLBATROSS': 'allbatrossportfoy.com',
  'ALLBATROSS PORTFÖY': 'allbatrossportfoy.com',
  'TACİRLER': 'tacirlerportfoy.com.tr',
  'TACİRLER PORTFÖY': 'tacirlerportfoy.com.tr',
  'TACOLL': 'tacirlerportfoy.com.tr',
  'TACOLL PORTFÖY': 'tacirlerportfoy.com.tr',

  // Doğrulanmış Yüksek Çözünürlüklü Logolu Diğer TEFAS PYŞ Domainleri:
  'QNB': 'qnbportfoy.com',
  'QNB PORTFÖY': 'qnbportfoy.com',
  'AZİMUT': 'azimutportfoy.com',
  'AZİMUT PORTFÖY': 'azimutportfoy.com',
  'AZIMUT': 'azimutportfoy.com',
  'AZIMUT PORTFÖY': 'azimutportfoy.com',
  'HEDEF': 'hedefportfoy.com.tr',
  'HEDEF PORTFÖY': 'hedefportfoy.com.tr',
  'NEO': 'neoportfoy.com.tr',
  'NEO PORTFÖY': 'neoportfoy.com.tr',
  'ROTA': 'rotaportfoy.com.tr',
  'ROTA PORTFÖY': 'rotaportfoy.com.tr',
  'INVEO': 'inveo.com.tr',
  'INVEO PORTFÖY': 'inveo.com.tr',
  'RE-PIE': 're-pie.com',
  'RE-PIE PORTFÖY': 're-pie.com',
  'FİBA': 'fibabanka.com.tr',
  'FİBA PORTFÖY': 'fibabanka.com.tr',
  'HSBC': 'hsbc.com.tr',
  'HSBC PORTFÖY': 'hsbc.com.tr',
  'EMAA BLUE': 'emaablue.com',
  'EMAA BLUE PORTFÖY': 'emaablue.com',
  'NUROL': 'nurolbank.com.tr',
  'NUROL PORTFÖY': 'nurolbank.com.tr',
  'OSMANLI': 'osmanliportfoy.com.tr',
  'OSMANLI PORTFÖY': 'osmanliportfoy.com.tr',
  'ATA': 'atayatirim.com.tr',
  'ATA PORTFÖY': 'atayatirim.com.tr',
  'BV': 'bvportfoy.com',
  'BV PORTFÖY': 'bvportfoy.com',
  'ONE': 'oneportfoy.com.tr',
  'ONE PORTFÖY': 'oneportfoy.com.tr',
  'OYAK': 'oyakyatirim.com.tr',
  'OYAK PORTFÖY': 'oyakyatirim.com.tr',
  'A1 CAPİTAL': 'a1capital.com.tr',
  'A1 CAPİTAL PORTFÖY': 'a1capital.com.tr',
  'GLOBAL MD': 'globalmdportfoy.com',
  'GLOBAL MD PORTFÖY': 'globalmdportfoy.com',
  'ÜNLÜ': 'unluportfoy.com',
  'ÜNLÜ PORTFÖY': 'unluportfoy.com',
  'ALBARAKA': 'albarakaportfoy.com.tr',
  'ALBARAKA PORTFÖY': 'albarakaportfoy.com.tr',
  'PHİLLİP': 'phillip.com.tr',
  'PHİLLİP PORTFÖY': 'phillip.com.tr',
  'AHLATCI': 'ahlatciportfoy.com.tr',
  'AHLATCI PORTFÖY': 'ahlatciportfoy.com.tr',
  'STRATEJİ': 'stratejiportfoy.com.tr',
  'STRATEJİ PORTFÖY': 'stratejiportfoy.com.tr',
  'TRIVE': 'trive.com.tr',
  'TRIVE PORTFÖY': 'trive.com.tr',
  'TRİVE': 'trive.com.tr',
  'TRİVE PORTFÖY': 'trive.com.tr',
  'FONMAP': 'fonmap.com',
  'FONMAP PORTFÖY': 'fonmap.com',
  'VAKIF KATILIM': 'vakifkatilim.com.tr',
  'VAKIF KATILIM PORTFÖY': 'vakifkatilim.com.tr',
  'VEGA': 'vegaportfoy.com',
  'VEGA PORTFÖY': 'vegaportfoy.com',
  'MARMARA CAPİTAL': 'marmaracapital.com.tr',
  'MARMARA CAPİTAL PORTFÖY': 'marmaracapital.com.tr',
  'MARMARA CAPITAL': 'marmaracapital.com.tr',
  'MARMARA CAPITAL PORTFÖY': 'marmaracapital.com.tr',
  'BTCTURK': 'btcturk.com',
  'BTCTURK PORTFÖY': 'btcturk.com',
  'STATECH': 'statechportfoy.com',
  'STATECH PORTFÖY': 'statechportfoy.com',
};

/**
 * Fon kodu veya unvanından resmi şirket domainini tespit eder (100% Deterministik)
 */
export function getCompanyDomain(fonKodu: string, fonUnvan?: string): string | null {
  const code = (fonKodu || '').toUpperCase().trim();

  // 1. Doğrudan Kod Bazlı Doğrulanmış Harita
  if (code && FUND_CODE_TO_DOMAIN[code]) {
    return FUND_CODE_TO_DOMAIN[code];
  }

  // 2. Unvan başındaki resmi PYŞ adını deterministik olarak ayrıştırma:
  const title = (fonUnvan || '').trim();
  if (title) {
    const match = title.match(/^(.+?)\s+(?:PORTF[ÖO]Y|PYŞ)(?:\s|$)/i);
    if (match) {
      const companyName = match[1].trim().toLocaleUpperCase('tr-TR');
      if (COMPANY_DOMAIN_MAP[companyName]) {
        return COMPANY_DOMAIN_MAP[companyName];
      }
    }
  }

  return null;
}

/**
 * Fon kodu veya unvanından fonun kurucu portföy yönetim şirketini (PYŞ) tespit eder
 */
export function getFundCompany(fonKodu: string, fonUnvan?: string): string {
  const code = (fonKodu || '').toUpperCase().trim();
  if (code && FUND_CODE_TO_COMPANY[code]) {
    return FUND_CODE_TO_COMPANY[code];
  }
  const title = (fonUnvan || '').trim();
  if (title) {
    const match = title.match(/^(.+?)\s+(?:PORTF[ÖO]Y|PYŞ)(?:\s|$)/i);
    if (match) {
      return match[1].trim().toLocaleUpperCase('tr-TR');
    }
  }
  return 'DİĞER';
}

/**
 * Portföy Şirketlerine Özel Kurumsal Renk Paleti:
 * Her portföy yönetim şirketi (PYŞ) için farklıdır ve aynı şirkete ait tüm fonlar birebir aynı rengi alır.
 */
const COMPANY_BADGE_STYLES: Record<string, { gradient: string; border: string; text?: string }> = {
  // Kullanıcının Özel İsteği: Deniz Portföy'ün bütün logo arka planları mavi olsun
  'DENİZ': {
    gradient: 'from-blue-600 via-blue-700 to-sky-900',
    border: 'border-sky-400/50',
    text: 'text-white',
  },
  // Bulls Portföy: Karakteristik Boğa Kırmızısı
  'BULLS': {
    gradient: 'from-red-600 via-rose-700 to-red-900',
    border: 'border-rose-400/50',
    text: 'text-white',
  },
  // Aktif Portföy: Karakteristik Aktif Bordo
  'AKTİF': {
    gradient: 'from-rose-800 via-red-900 to-slate-950',
    border: 'border-rose-500/50',
    text: 'text-white',
  },
  'AKTIF': {
    gradient: 'from-rose-800 via-red-900 to-slate-950',
    border: 'border-rose-500/50',
    text: 'text-white',
  },
  // TEB Portföy: TEB BNP Kurumsal Yeşil
  'TEB': {
    gradient: 'from-emerald-600 via-teal-700 to-emerald-900',
    border: 'border-emerald-400/50',
    text: 'text-white',
  },
  // Vakıf Portföy / Vakıfbank: Vakıf Sarı / Altın
  'VAKIF': {
    gradient: 'from-amber-500 to-yellow-600',
    border: 'border-yellow-300/60',
    text: 'text-slate-950 font-black',
  },
  // İstanbul Portföy: Turkuaz / Okyanus
  'İSTANBUL': {
    gradient: 'from-cyan-600 via-teal-700 to-blue-800',
    border: 'border-cyan-400/50',
    text: 'text-white',
  },
  // Kare Portföy: Karakteristik Mor
  'KARE': {
    gradient: 'from-violet-600 via-purple-700 to-indigo-900',
    border: 'border-violet-400/50',
    text: 'text-white',
  },
  // Astra Portföy: Çivit Mavisi / Gece Mavisi
  'ASTRA': {
    gradient: 'from-indigo-600 via-slate-700 to-slate-900',
    border: 'border-indigo-400/50',
    text: 'text-white',
  },
  // Pusula Portföy: Petrol Yeşili
  'PUSULA': {
    gradient: 'from-teal-600 via-emerald-700 to-teal-900',
    border: 'border-teal-400/50',
    text: 'text-white',
  },
  // Meksa Portföy: Canlı Turuncu
  'MEKSA': {
    gradient: 'from-orange-600 via-amber-600 to-orange-800',
    border: 'border-orange-400/50',
    text: 'text-white',
  },
  // Piramit Portföy: Fuşya / Magenta
  'PİRAMİT': {
    gradient: 'from-fuchsia-600 via-pink-700 to-purple-900',
    border: 'border-fuchsia-400/50',
    text: 'text-white',
  },
  // Sparta Portföy: Titanyum / Taş Gri
  'SPARTA': {
    gradient: 'from-stone-600 via-zinc-700 to-stone-900',
    border: 'border-zinc-400/50',
    text: 'text-white',
  },
  // Atlas Portföy: Karakteristik Atlas Laciverti / Gece Mavisi
  'ATLAS': {
    gradient: 'from-blue-700 via-indigo-900 to-slate-950',
    border: 'border-blue-400/50',
    text: 'text-white',
  },
  // İncir Portföy: Koyu Bordo / Mürdüm
  'İNCİR': {
    gradient: 'from-rose-900 via-purple-950 to-stone-900',
    border: 'border-rose-400/50',
    text: 'text-white',
  },
  // Destek Portföy: Lacivert / Kobalt
  'DESTEK': {
    gradient: 'from-blue-700 via-indigo-800 to-slate-950',
    border: 'border-blue-400/50',
    text: 'text-white',
  },
  // Golden Global: Altın Bronz
  'GOLDEN GLOBAL': {
    gradient: 'from-amber-600 via-yellow-600 to-amber-800',
    border: 'border-amber-300/50',
    text: 'text-slate-950 font-black',
  },
  // Emlak Katılım: Zümrüt Yeşili
  'EMLAK KATILIM': {
    gradient: 'from-emerald-700 via-teal-800 to-slate-900',
    border: 'border-emerald-400/50',
    text: 'text-white',
  },
  // Logos Portföy: Çelik Mavisi
  'LOGOS': {
    gradient: 'from-slate-700 via-blue-900 to-slate-950',
    border: 'border-slate-400/50',
    text: 'text-white',
  },
};

/**
 * Dinamik Şirket Bazlı Gradyan Havuzu (Belirli bir şirketin tüm fonları aynı rengi alır)
 */
const DYNAMIC_COMPANY_GRADIENTS = [
  { gradient: 'from-blue-600 via-indigo-700 to-slate-900', border: 'border-blue-400/40' },
  { gradient: 'from-emerald-600 via-teal-700 to-slate-900', border: 'border-emerald-400/40' },
  { gradient: 'from-purple-600 via-violet-700 to-purple-950', border: 'border-purple-400/40' },
  { gradient: 'from-amber-600 via-orange-600 to-amber-900', border: 'border-amber-400/40' },
  { gradient: 'from-rose-600 via-pink-700 to-rose-950', border: 'border-rose-400/40' },
  { gradient: 'from-cyan-600 via-sky-700 to-blue-900', border: 'border-cyan-400/40' },
  { gradient: 'from-teal-600 via-cyan-700 to-slate-900', border: 'border-teal-400/40' },
  { gradient: 'from-indigo-600 via-blue-700 to-indigo-950', border: 'border-indigo-400/40' },
  { gradient: 'from-fuchsia-600 via-purple-700 to-pink-900', border: 'border-fuchsia-400/40' },
  { gradient: 'from-sky-600 via-cyan-700 to-slate-900', border: 'border-sky-400/40' },
  { gradient: 'from-orange-600 via-red-600 to-amber-950', border: 'border-orange-400/40' },
  { gradient: 'from-violet-600 via-indigo-700 to-purple-950', border: 'border-violet-400/40' },
];

/**
 * Şirket adına göre benzersiz ve o şirketin tüm fonları için TUTARLI badge stilini döner
 */
export function getCompanyBadgeStyle(companyName: string): { gradient: string; border: string; text: string } {
  const norm = (companyName || 'DİĞER').trim().toLocaleUpperCase('tr-TR');
  if (COMPANY_BADGE_STYLES[norm]) {
    const s = COMPANY_BADGE_STYLES[norm];
    return {
      gradient: s.gradient,
      border: s.border,
      text: s.text || 'text-white',
    };
  }
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = (hash * 37 + norm.charCodeAt(i)) % DYNAMIC_COMPANY_GRADIENTS.length;
  }
  const item = DYNAMIC_COMPANY_GRADIENTS[hash] || DYNAMIC_COMPANY_GRADIENTS[0];
  return {
    gradient: item.gradient,
    border: item.border,
    text: 'text-white',
  };
}

/**
 * Domain Tabanlı Google Favicon API uç noktası URL'sini döner (128x128px):
 * https://www.google.com/s2/favicons?domain={DOMAIN}&sz=128
 */
export function getCompanyLogoUrl(fonKodu: string, fonUnvan?: string): string {
  const domain = getCompanyDomain(fonKodu, fonUnvan);
  if (!domain) {
    return '';
  }
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

/**
 * Google Favicon Logo Servisi Bileşeni:
 * - Domain tespit edilirse ve geçerli logo varsa: https://www.google.com/s2/favicons?domain={DOMAIN}&sz=128
 * - Logo bulunamazsa veya 16x16 varsayılan küre dönerse:
 *   Portföy şirketine özel belirlenen kurumsal renk arka planı üzerinde fon kodunun harfleri gösterilir.
 *   (Örn: Deniz Portföy fonlarının tümü aynı Deniz Mavisi arka plana sahiptir).
 */
export const FundCompanyLogo: React.FC<FundCompanyLogoProps> = ({
  fonKodu,
  fonUnvan = '',
  className = '',
  size = 'md',
}) => {
  const [hasError, setHasError] = useState(false);

  const code = (fonKodu || '').toUpperCase().trim();
  const domain = getCompanyDomain(code, fonUnvan);
  const companyName = getFundCompany(code, fonUnvan);
  const badgeStyle = getCompanyBadgeStyle(companyName);

  // Boyut sınıfları
  const sizeClasses = {
    sm: 'w-7 h-7 text-[8.5px]',
    md: 'w-9 h-9 text-[10.5px]',
    lg: 'w-11 h-11 text-xs',
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.md;
  // Kullanıcı kuralı: Logosu olmayan veya yüklenemeyen fonlarda doğrudan fon kodunun harfleri gösterilir (Örn: DBA, BLT, ONN)
  const codeLetters = code.slice(0, 4) || 'FON';

  // 1. Google Favicon API ile Doğrulanmış Şirket Logosu Gösterimi
  if (domain && !hasError) {
    return (
      <div
        className={`${currentSizeClass} rounded-full bg-slate-900 border border-slate-700/60 p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-sm ${className}`}
        title={`${fonUnvan || fonKodu} (${domain})`}
      >
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
          alt={fonUnvan || fonKodu}
          className="w-full h-full object-contain rounded-full"
          onLoad={(e) => {
            // Google Favicon API, logosu olmayan domainler için HTTP 200 ile varsayılan 16x16 piksel dünya/küre simgesi döndürür.
            // 24 piksel veya daha küçük gelen varsayılan küre simgelerini reddedip kurumsal renkli harf avatarına geçiyoruz:
            if (e.currentTarget.naturalWidth <= 24 || e.currentTarget.naturalHeight <= 24) {
              setHasError(true);
            }
          }}
          onError={() => setHasError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  // 2. Fon Kodunun Harflerinden Oluşan Şık Kurumsal Rozet (Şirkete Özel Tek Tip Renk)
  return (
    <div
      className={`${currentSizeClass} rounded-full bg-gradient-to-br ${badgeStyle.gradient} border ${badgeStyle.border} ${badgeStyle.text} flex items-center justify-center font-extrabold shrink-0 shadow-sm select-none tracking-tight ${className}`}
      title={`${fonUnvan || fonKodu} (${companyName} Portföy)`}
    >
      <span className="leading-none font-mono uppercase">{codeLetters}</span>
    </div>
  );
};

