import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// In-memory cache for TEFAS fund list
let cachedFundList: any[] = [];
let fundListCachedAt = 0;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// Takasbank TEFAS Custom HTTPS Agent (TLS 1.2 + Browser Ciphers required by TEFAS WAF)
const tefasAgent = new https.Agent({
  minVersion: 'TLSv1.2',
  maxVersion: 'TLSv1.2',
  ciphers: 'ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES128-GCM-SHA256',
  keepAlive: true,
});

let cachedCookies = '';
let cookiesTimestamp = 0;
const COOKIE_TTL = 10 * 60 * 1000; // 10 minutes

function getTefasCookies(forceRefresh = false): Promise<string> {
  const now = Date.now();
  if (!forceRefresh && cachedCookies && now - cookiesTimestamp < COOKIE_TTL) {
    return Promise.resolve(cachedCookies);
  }

  return new Promise((resolve) => {
    const req = https.get(
      'https://www.tefas.gov.tr/',
      {
        agent: tefasAgent,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      },
      (res) => {
        const rawCookies = res.headers['set-cookie'] || [];
        const cookieStr = rawCookies.map((c) => c.split(';')[0]).join('; ');
        res.resume(); // drain response
        if (cookieStr) {
          cachedCookies = cookieStr;
          cookiesTimestamp = Date.now();
        }
        resolve(cachedCookies);
      }
    );
    req.on('error', (err) => {
      console.warn('Cookie fetch warning:', err.message);
      resolve(cachedCookies);
    });
    req.setTimeout(6000, () => {
      req.destroy();
      resolve(cachedCookies);
    });
  });
}

function callTefasApi(endpoint: string, payload: any, retry = true): Promise<any> {
  return getTefasCookies().then((cookies) => {
    const postData = JSON.stringify(payload);

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'www.tefas.gov.tr',
          path: `/api/funds/${endpoint}`,
          method: 'POST',
          agent: tefasAgent,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Content-Type': 'application/json',
            Accept: 'application/json, text/plain, */*',
            Referer: 'https://www.tefas.gov.tr/TarihselVeriler.aspx',
            Origin: 'https://www.tefas.gov.tr',
            Cookie: cookies,
            'Content-Length': Buffer.byteLength(postData),
          },
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', async () => {
            if (res.statusCode === 200) {
              try {
                const parsed = JSON.parse(body);
                return resolve(parsed);
              } catch (e) {
                return reject(new Error('TEFAS verisi ayrıştırılamadı.'));
              }
            }

            if (retry) {
              await getTefasCookies(true);
              try {
                const retryRes = await callTefasApi(endpoint, payload, false);
                return resolve(retryRes);
              } catch (retryErr) {
                return reject(retryErr);
              }
            }

            reject(new Error(`TEFAS API hatası (${res.statusCode})`));
          });
        }
      );

      req.on('error', async (err) => {
        if (retry) {
          await getTefasCookies(true);
          try {
            const retryRes = await callTefasApi(endpoint, payload, false);
            return resolve(retryRes);
          } catch (retryErr) {
            return reject(retryErr);
          }
        }
        reject(err);
      });

      req.setTimeout(8000, () => {
        req.destroy(new Error('TEFAS sunucu yanıt vermedi (Zaman aşımı)'));
      });

      req.write(postData);
      req.end();
    });
  });
}

function parseTefasDate(raw: any): Date {
  if (typeof raw === 'number' || (!isNaN(Number(raw)) && String(raw).length > 8)) {
    return new Date(Number(raw));
  }
  const s = String(raw || '').trim();
  if (s.includes('.')) {
    const parts = s.split('.');
    if (parts.length === 3) {
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
  }
  return new Date(s);
}

// 1. TEFAS Fund History (Prices & Dates)
app.post('/api/tefas/history', async (req, res) => {
  try {
    const { fonKodu, periyod = 12 } = req.body;
    if (!fonKodu) {
      return res.status(400).json({ error: 'Fon kodu gereklidir.' });
    }

    const cleanCode = fonKodu.toUpperCase().trim();
    const validPeriods = [1, 3, 6, 12, 36, 60];
    const periodNum = Number(periyod);
    let chosenPeriod = validPeriods.includes(periodNum) ? periodNum : 12;

    const fetchHistory = async (p: number) => {
      try {
        const data = await callTefasApi('fonFiyatBilgiGetir', {
          fonKodu: cleanCode,
          dil: 'TR',
          periyod: p,
        });
        return data?.resultList || [];
      } catch (e) {
        return [];
      }
    };

    let resultList = await fetchHistory(chosenPeriod);

    // If requested period had no data (e.g. newly established fund), try shorter periods
    if (resultList.length === 0) {
      for (const fallbackP of [6, 3, 1]) {
        if (fallbackP === chosenPeriod) continue;
        const fallbackList = await fetchHistory(fallbackP);
        if (fallbackList.length > 0) {
          resultList = fallbackList;
          chosenPeriod = fallbackP;
          break;
        }
      }
    }

    return res.json({
      success: true,
      fonKodu: cleanCode,
      periyod: chosenPeriod,
      resultList,
    });
  } catch (error: any) {
    console.warn('TEFAS History fetch error:', error.message);
    return res.status(500).json({
      error: 'TEFAS verisi alınamadı: ' + (error.message || 'Bilinmeyen hata'),
    });
  }
});

// 1.05 Price on Specific Date (Automatic Price Lookup for Past Purchases)
app.post('/api/tefas/price-on-date', async (req, res) => {
  try {
    const { fonKodu, tarih } = req.body;
    if (!fonKodu) {
      return res.status(400).json({ error: 'Fon kodu gereklidir.' });
    }

    const cleanCode = String(fonKodu).toUpperCase().trim();
    const todayYMD = new Date().toISOString().split('T')[0];
    const targetDateStr = tarih ? String(tarih).trim() : todayYMD;
    const targetDateObj = new Date(targetDateStr);
    const targetTime = isNaN(targetDateObj.getTime()) ? Date.now() : targetDateObj.getTime();
    const targetYMD = isNaN(targetDateObj.getTime()) ? todayYMD : targetDateObj.toISOString().split('T')[0];

    // Determine how many days in the past the target date is
    const now = Date.now();
    const diffDays = Math.max(1, Math.ceil((now - targetTime) / (1000 * 3600 * 24)));

    let period = 1;
    if (diffDays > 25) period = 3;
    if (diffDays > 85) period = 6;
    if (diffDays > 175) period = 12;
    if (diffDays > 360) period = 36;
    if (diffDays > 1050) period = 60;

    const data = await callTefasApi('fonFiyatBilgiGetir', {
      fonKodu: cleanCode,
      dil: 'TR',
      periyod: period,
    });

    const list: any[] = data?.resultList || [];

    if (list.length === 0) {
      return res.json({ success: false, message: 'Bu fon için geçmiş fiyat verisi bulunamadı.' });
    }

    // Sort ascending by date
    list.sort((a, b) => parseTefasDate(a.tarih).getTime() - parseTefasDate(b.tarih).getTime());

    const latestItem = list[list.length - 1];
    const latestPrice = Number(latestItem.fiyat);
    const latestDateYMD = parseTefasDate(latestItem.tarih).toISOString().split('T')[0];

    // If requested date is today or in the future, return latest price
    if (targetYMD >= latestDateYMD) {
      return res.json({
        success: true,
        fonKodu: cleanCode,
        requestedDate: targetYMD,
        resolvedDate: latestDateYMD,
        price: latestPrice,
        latestPrice,
        isExactMatch: true,
        isLatest: true,
        fonUnvan: latestItem.fonUnvan || undefined,
      });
    }

    // Find exact date match
    let matchedItem = list.find((item) => {
      const d = parseTefasDate(item.tarih).toISOString().split('T')[0];
      return d === targetYMD;
    });

    let isExactMatch = !!matchedItem;

    // If no exact match (e.g., weekend or official holiday), find the latest date on or before targetYMD
    if (!matchedItem) {
      const eligible = list.filter((item) => {
        const d = parseTefasDate(item.tarih).toISOString().split('T')[0];
        return d <= targetYMD;
      });
      if (eligible.length > 0) {
        matchedItem = eligible[eligible.length - 1];
      } else {
        matchedItem = list[0];
      }
    }

    const price = Number(matchedItem.fiyat);
    const resolvedDate = parseTefasDate(matchedItem.tarih).toISOString().split('T')[0];

    return res.json({
      success: true,
      fonKodu: cleanCode,
      requestedDate: targetYMD,
      resolvedDate,
      price,
      latestPrice,
      isExactMatch,
      isLatest: false,
      fonUnvan: matchedItem.fonUnvan || latestItem.fonUnvan,
    });
  } catch (error: any) {
    console.warn('price-on-date error:', error.message);
    return res.status(500).json({ error: error.message || 'Geçmiş fiyat alınamadı' });
  }
});

// 1.1 TEFAS Live Fund Profile & Stopaj Data
app.get('/api/tefas/profile/:code', async (req, res) => {
  try {
    const { code } = req.params;
    if (!code) {
      return res.status(400).json({ error: 'Fon kodu gereklidir.' });
    }
    const cleanCode = code.toUpperCase().trim();

    const data = await callTefasApi('fonProfilBilgiGetir', {
      fonKodu: cleanCode,
      dil: 'TR',
    });

    const profile = data?.resultList?.[0] || null;

    if (!profile) {
      return res.json({ success: false, message: 'Profil verisi bulunamadı.' });
    }

    const unvan = (profile.fonUnvan || '').toLocaleUpperCase('tr-TR');
    const isForeign = unvan.includes('YABANCI');
    const isSerbest = unvan.includes('SERBEST');
    const isEurobond = unvan.includes('EUROBOND');
    const hasYogunKeyword = unvan.includes('YOĞUN') || unvan.includes('YOGUN');
    const hasHisseKeyword =
      (unvan.includes('HİSSE') ||
        unvan.includes('HISSE') ||
        unvan.includes('BİST') ||
        unvan.includes('BIST')) &&
      !isForeign &&
      !isEurobond;
    const isHisseYogun = (hasYogunKeyword || hasHisseKeyword) && !isForeign && !isSerbest;

    const stopajRate = isHisseYogun ? 0 : 17.5;
    const stopajLabel = isHisseYogun ? '%0 Stopaj (Muaf)' : '%17,5 Stopaj';
    const legalBasis = isHisseYogun
      ? 'GVK Geçici 67. Madde / TEFAS Hisse Senedi Yoğun Fon Muafiyeti'
      : "Resmi Gazete Cumhurbaşkanı Kararı & GVK Geçici 67. Madde (%17,5 Düzenlemesi)";
    const stopajDesc = isHisseYogun
      ? 'Resmi TEFAS tescili: Hisse Senedi Yoğun Fon statüsünde olduğundan getiriler kanunen %0 stopaja tabidir (Tam Muafiyet).'
      : "Resmi Gazete'de yayımlanan güncel Cumhurbaşkanı Kararı ve GİB Geçici 67 mevzuatı gereği satış anında kâr üzerinden yasal %17,5 stopaj kesintisi uygulanır.";

    return res.json({
      success: true,
      profile: {
        ...profile,
        stopajRate,
        stopajLabel,
        isStopajExempt: isHisseYogun,
        stopajDesc,
        legalBasis,
      },
    });
  } catch (error: any) {
    console.warn('TEFAS Profile fetch error:', error.message);
    return res.status(500).json({ error: error.message || 'TEFAS profil verisi alınamadı.' });
  }
});

// 1.2 TEFAS Daily Batch for Portfolio Holdings (Real Daily Changes & Prices)
app.post('/api/tefas/daily-batch', async (req, res) => {
  try {
    const { codes = [] } = req.body;
    if (!Array.isArray(codes) || codes.length === 0) {
      return res.json({ success: true, results: {} });
    }

    const cleanCodes = Array.from(new Set(codes.map((c) => String(c).toUpperCase().trim())));
    const results: Record<
      string,
      {
        currentPrice: number;
        prevPrice: number;
        dailyChangeTL: number;
        dailyChangePercent: number;
      }
    > = {};

    await Promise.all(
      cleanCodes.map(async (code) => {
        try {
          const data = await callTefasApi('fonFiyatBilgiGetir', {
            fonKodu: code,
            dil: 'TR',
            periyod: 1,
          });
          const list = data?.resultList || [];
          if (list.length >= 2) {
            const cur = Number(list[list.length - 1].fiyat);
            const prev = Number(list[list.length - 2].fiyat);
            const diff = cur - prev;
            const pct = prev > 0 ? (diff / prev) * 100 : 0;
            results[code] = {
              currentPrice: cur,
              prevPrice: prev,
              dailyChangeTL: diff,
              dailyChangePercent: pct,
            };
          } else if (list.length === 1) {
            const cur = Number(list[0].fiyat);
            results[code] = {
              currentPrice: cur,
              prevPrice: cur,
              dailyChangeTL: 0,
              dailyChangePercent: 0,
            };
          }
        } catch (e) {
          // ignore individual fetch errors
        }
      })
    );

    return res.json({ success: true, results });
  } catch (err: any) {
    console.warn('TEFAS Daily Batch fetch error:', err.message);
    return res.status(500).json({ error: 'Günlük fiyat verisi alınamadı.' });
  }
});

// 2. TEFAS Fund List & Returns
app.all(['/api/tefas/list', '/api/tefas'], async (req, res) => {
  try {
    const fonKodu = req.query.fonKodu || req.body?.fonKodu;
    const periyod = req.query.periyod || req.body?.periyod;

    if (fonKodu) {
      const validPeriods = [1, 3, 6, 12, 36, 60];
      const periodNum = Number(periyod || 12);
      const chosenPeriod = validPeriods.includes(periodNum) ? periodNum : 12;

      const data = await callTefasApi('fonFiyatBilgiGetir', {
        fonKodu: String(fonKodu).toUpperCase().trim(),
        dil: 'TR',
        periyod: chosenPeriod,
      });

      return res.json({
        success: true,
        fonKodu: String(fonKodu).toUpperCase().trim(),
        periyod: chosenPeriod,
        resultList: data?.resultList || [],
      });
    }

    const now = Date.now();
    if (cachedFundList.length > 0 && now - fundListCachedAt < CACHE_TTL) {
      return res.json({ success: true, count: cachedFundList.length, list: cachedFundList });
    }

    const data = await callTefasApi('fonGetiriBazliBilgiGetir', {
      dil: 'TR',
      fonTipi: 'YAT',
      kurucuKodu: null,
      sfonTurKod: null,
      fonTurAciklama: null,
      islem: 1,
      fonTurKod: null,
      fonGrubu: null,
      donemGetiri1a: '1',
      donemGetiri3a: '1',
      donemGetiri6a: '1',
      donemGetiri1y: '1',
      donemGetiriyb: '1',
      donemGetiri3y: '1',
      donemGetiri5y: '1',
      basTarih: null,
      bitTarih: null,
      calismaTipi: 2,
      getiriOrani: '1',
    });

    const list = data?.resultList || [];
    cachedFundList = list;
    fundListCachedAt = now;

    return res.json({
      success: true,
      count: list.length,
      list,
    });
  } catch (error: any) {
    console.error('TEFAS List fetch error:', error);
    return res.status(500).json({
      error: 'TEFAS fon listesi alınamadı: ' + (error.message || 'Bilinmeyen hata'),
    });
  }
});

// 3. Gemini Technical Analysis Commentary
app.post('/api/gemini/analyze', async (req, res) => {
  try {
    const {
      fonKodu,
      fonUnvan,
      kategori,
      guncelFiyat,
      rsi14,
      sma20,
      sma50,
      smaDurumu,
      volatiliteYillik,
      sharpeOrani,
      maxDrawdown,
      toplamPuan,
      puanRozeti,
      getiriler,
    } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY ortam değişkeni tanımlı değil.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const isHisseYogun = (fonUnvan || '').toUpperCase().includes('YOĞUN') || (fonUnvan || '').toUpperCase().includes('YOGUN');
    const dynamicStopajRate = isHisseYogun ? 0 : 17.5;
    const dynamicStopajBasis = isHisseYogun
      ? 'GVK Geçici 67. Madde uyarınca %0 Stopaj (Tam Muaf)'
      : "Resmi Gazete'de yayımlanan güncel Cumhurbaşkanı Kararı uyarınca %17,5 Stopaj";

    const prompt = `Sen uzman bir Fintek Teknik Analisti ve Portföy Matematikçisisin.
Aşağıda TEFAS'tan çekilen gerçek tarihsel verilerle hesaplanmış fon teknik göstergeleri ve matematiksel puanlama sonuçları verilmiştir:

FON KODU: ${fonKodu}
FON UNVANI: ${fonUnvan || 'Belirtilmedi'}
KATEGORİ: ${kategori || 'Yatırım Fonu'}
MEVZUAT STOPAJ DURUMU: ${dynamicStopajBasis}
GÜNCEL FİYAT: ${guncelFiyat ? guncelFiyat + ' TL' : 'Mevcut'}
RSI (14 GÜNLÜK): ${rsi14 !== undefined ? rsi14 : 'Hesaplanamadı'}
SMA 20: ${sma20 || '-'} | SMA 50: ${sma50 || '-'}
SMA KONUMU/TREND: ${smaDurumu || '-'}
YILLIKLANDIRILMIŞ VOLATİLİTE: ${volatiliteYillik ? '%' + volatiliteYillik : '-'}
SHARPE ORANI (RİSK-GETİRİ VERİMLİLİĞİ): ${sharpeOrani !== undefined ? sharpeOrani : '-'}
MAX DRAWDOWN (EN BÜYÜK DÜŞÜŞ): ${maxDrawdown ? '%' + maxDrawdown : '-'}
TOPLAM MATEMATİKSEL SKOR: ${toplamPuan || '-'} / 100 (${puanRozeti || '-'})
DÖNEMSEL GETİRİLER: 1 Ay: %${getiriler?.getiri1a ?? '-'}, 3 Ay: %${getiriler?.getiri3a ?? '-'}, 6 Ay: %${getiriler?.getiri6a ?? '-'}, 1 Yıl: %${getiriler?.getiri1y ?? '-'}

DİNAMİK STOPAJ DOKTRİNİ VE NET GETİRİ STANDARDI:
- Net Getiri formülü: Net Getiri = Brüt Getiri * (1 - Stopaj / 100).
- Bu fon için yürürlükteki Resmi Gazete ve GVK Geçici 67 mevzuatı uyarınca stopaj oranı: %${dynamicStopajRate} (${dynamicStopajBasis}).

GÖREVİN:
Bu fonun teknik analiz göstergelerini ve puanlama algoritması sonucunu inceleyerek KESİNLİKLE "Al", "Sat", "Hemen girin" veya "Çıkın" gibi bir yatırım tavsiyesi VERMEDEN, kullanıcıya tam olarak 3 MADDELİK OBJEKTİF TEKNİK VE MATEMATİKSEL DURUM TESPİTİ ÖZETİ hazırla:

Madde 1: Fiyat Trendi ve Momentum Durumu (RSI ve SMA 20/50 ilişkisine göre aşırı alım/satım veya trend yönü tespiti).
Madde 2: Oynaklık ve Risk-Getiri Dengesi (Yıllık volatilite, Max Drawdown derinliği ve Sharpe oranı bazında sermaye koruma/dalgalanma analizi).
Madde 3: Algoritmik Skor Değerlendirmesi, Net Getiri & Stopaj Bilgisi (0-100 puanın arka planı ile yürürlükteki mevzuat stopaj oranı %${dynamicStopajRate} ve getiriye yansıması).

Biçimlendirme Kuralları:
- Sadece 3 madde halinde madde işaretleri (- veya 1, 2, 3) kullanarak yaz.
- Dil Türkçe, net, profesyonel, finansal jargona hakim ve akıcı olsun.
- Asla spekülatif veya sübjektif konuşma, sadece verilen matematiksel verilere ve resmi mevzuata dayan.
- Sonuna kısa bir "Bilgilendirme: Matematiksel modelleme çıktısıdır, yatırım tavsiyesi içermez." notu düş.`;

    let responseText = '';
    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];

    for (const model of modelsToTry) {
      try {
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('AI request timeout')), 3500)
        );
        const apiPromise = ai.models.generateContent({
          model,
          contents: prompt,
        });

        const response: any = await Promise.race([apiPromise, timeoutPromise]);
        if (response && response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        // Continue to fallback without delaying UI
      }
    }

    // Resilient quantitative synthesis fallback if upstream AI gateway is temporarily unavailable
    if (!responseText) {
      const rsiVal = Number(rsi14) || 50;
      const rsiDesc =
        rsiVal >= 70
          ? `RSI (14) ${rsiVal.toFixed(1)} seviyesiyle aşırı alım bölgesindedir; kısa vadeli teknik doyum ve düzeltme riski izlenmektedir.`
          : rsiVal <= 30
          ? `RSI (14) ${rsiVal.toFixed(1)} seviyesiyle aşırı satım bölgesindedir; teknik dip seviyelerden tepki alımı potansiyeli bulunmaktadır.`
          : `RSI (14) ${rsiVal.toFixed(1)} seviyesiyle dengeli bölgede hareket ederek sağlıklı bir ivmeye işaret etmektedir.`;

      const isBull = guncelFiyat && sma20 && sma50 && guncelFiyat > sma20 && sma20 > sma50;
      const smaDesc = isBull
        ? `Fiyat (₺${guncelFiyat}), hem SMA20 (₺${sma20}) hem de SMA50 (₺${sma50}) seviyelerinin üzerinde kalarak güçlü yukarı yönlü ana trend yapısını sürdürmektedir.`
        : `Fiyat ortalamalarla temas halinde olup ${smaDurumu || 'düzeltme bölgesinde'} seyretmektedir.`;

      const riskDesc = `Yıllıklandırılmış volatilite %${volatiliteYillik || 0} seviyesinde olup, tarihsel tepe noktadan görülen maksimum düşüş (Max Drawdown) %${Math.abs(Number(maxDrawdown) || 0).toFixed(2)} derinliğindedir. Fonun Sharpe oranı (${sharpeOrani ?? 0}) birim risk başına getiri verimliliğini ortaya koymaktadır.`;

      const scoreDesc = `Algoritmik fon puanlama motoru ${fonKodu} fonunu 100 üzerinden ${toplamPuan ?? 75} puan ile "${puanRozeti || 'Dengeli Risk'}" rozetiyle derecelendirmiştir. Risk, getiri ve teknik trend bileşenleri dengeli dağılım sergilemektedir.`;

      responseText = `1. Fiyat Trendi ve Momentum Durumu: ${smaDesc} ${rsiDesc}\n\n2. Oynaklık ve Risk-Getiri Dengesi: ${riskDesc}\n\n3. Algoritmik Skor Değerlendirmesi ve Önemli Seviyeler: ${scoreDesc}\n\nBilgilendirme: Matematiksel modelleme çıktısıdır, yatırım tavsiyesi içermez.`;
    }

    return res.json({
      success: true,
      analysis: responseText,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Gemini API analysis error:', error);
    return res.status(500).json({
      error: 'Analiz oluşturulurken hata meydana geldi: ' + (error.message || 'Bilinmeyen hata'),
    });
  }
});

// 4. Gemini Interactive Portfolio & Fund Chat Advisor
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { message, portfolio } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Mesaj metni gereklidir.' });
    }

    const holdingsText = (portfolio?.holdings || [])
      .map(
        (h: any) =>
          `- Fon: ${h.fonKodu} (${h.fonUnvan || ''}) | Kategori: ${h.kategori || 'Yatırım Fonu'} | Değer: ₺${h.toplamDeger} | Getiri: %${h.karZararYuzde}`
      )
      .join('\n');

    const prompt = `Sen "Fontables" platformunun uzman, nazik ve objektif Fintek Portföy Danışmanısın.
Kullanıcının canlı portföy durumu şöyledir:
- Toplam Portföy Değeri: ₺${portfolio?.totalValue?.toLocaleString('tr-TR') || 0}
- Toplam Kâr/Zarar: %${portfolio?.totalProfitPct || 0} (₺${portfolio?.totalProfitTL?.toLocaleString('tr-TR') || 0})
- Portföydeki Fonlar:
${holdingsText || 'Henüz portföyde fon bulunmuyor.'}

DİNAMİK STOPAJ DOKTRİNİ VE RESMİ MEVZUAT KURALLARI:
1. Hisse Senedi Yoğun Fonlar (unvanında '(HİSSE SENEDİ YOĞUN FON)' olanlar): GVK Geçici 67. Madde kapsamında %0 Stopaja tabidir (Tam Muaf).
2. Diğer Fonlar (Yabancı, Borçlanma, Değişken, Kıymetli Madenler/Altın, Serbest vb.): Bireysel yatırımcılar için Resmi Gazete'de yayımlanan güncel Cumhurbaşkanı Kararları uyarınca %17,5 Stopaja tabidir.
3. Net Getiri Formülü: Net Getiri = Brüt Getiri * (1 - Anlık_Mevzuat_Stopajı / 100).
4. Vergi/stopaj sorularında veya net getiri hesaplamalarında Resmi Gazete ve GİB dayanağını açıkça belirt.

KULLANICININ SORUSU VEYA TALEBİ:
"${message}"

GÖREVİN:
1. Kullanıcının sorusunu finansal bir uzman titizliğiyle, net, anlaşılır ve akıcı Türkçe ile yanıtla.
2. Portföy analizi isteniyorsa; varlık dağılımı (Hisse, Değişken, Katılım/Faizsiz, Altın, Para Piyasası), yoğunlaşma riski, getiri potansiyeli ve stopaj sonrası net getiri hakkında objektif değerlendirme yap.
3. Genel fonlar, stopaj vergileri, fon seçimi veya katılım fonları soruluyorsa güncel mevzuatı referans göstererek eğitici bilgi ver.
4. Kesinlikle spekülatif "Al/Sat" tavsiyesi verme, risk-getiri prensipleri çerçevesinde matematiksel ve yapısal değerlendirmeler sun.
5. Yanıtı maddeler halinde, göz yormayan, okunaklı bir formatta yaz.`;

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        success: true,
        reply: 'Gemini API anahtarı yapılandırılmamış.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    let reply = '';
    for (const model of ['gemini-3.8-flash', 'gemini-3.1-flash-lite']) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 5000)
        );
        const apiPromise = ai.models.generateContent({ model, contents: prompt });
        const response: any = await Promise.race([apiPromise, timeoutPromise]);
        if (response?.text) {
          reply = response.text;
          break;
        }
      } catch (e) {
        // Continue to fallback
      }
    }

    if (!reply) {
      reply = `Sorunuz portföy analizi kapsamında değerlendirilmiştir:

1. Varlık Dağılımı ve Risk Dengesi: Toplam ₺${portfolio?.totalValue?.toLocaleString('tr-TR') || 0} büyüklüğündeki portföyünüzde ${portfolio?.holdings?.length || 0} adet fon bulunmaktadır. Portföyünüzde tek bir varlık sınıfına aşırı yoğunlaşmamak dalgalanmalara karşı koruma sağlar.
2. Çeşitlendirme Stratejisi: Hisse senedi fonları uzun vadeli sermaye büyümesi sağlarken, Katılım (faizsiz) veya Para Piyasası fonları likidite ve temkinli getiri desteği sunar.
3. Detaylı Takip: Fontables üzerindeki teknik analiz sekmesinden fonlarınızın RSI ve hareketli ortalama konumlarını düzenli kontrol edebilirsiniz.`;
    }

    return res.json({ success: true, reply });
  } catch (error: any) {
    console.error('Chat error:', error);
    return res.status(500).json({ error: 'Cevap üretilemedi: ' + (error.message || 'Bilinmeyen hata') });
  }
});

// Setup Vite in Dev or Static files in Prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`TEFAS Pro Quant server running on http://localhost:${port}`);
  });
}

startServer();
