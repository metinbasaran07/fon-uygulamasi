// Vercel Serverless Function: /api/tefas
// Comprehensive TEFAS proxy supporting list, fund history, profiles with stopaj, daily batch, and price-on-date

import https from 'https';

// Takasbank TEFAS Custom HTTPS Agent (TLS 1.2 + Browser Ciphers required by TEFAS WAF)
const tefasAgent = new https.Agent({
  minVersion: 'TLSv1.2',
  maxVersion: 'TLSv1.2',
  ciphers:
    'ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES128-GCM-SHA256',
  keepAlive: true,
});

let cachedCookies = '';
let cookiesTimestamp = 0;
const COOKIE_TTL = 10 * 60 * 1000; // 10 minutes

function getTefasCookies(forceRefresh = false) {
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
        res.resume();
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

function callTefasApi(endpoint, payload, retry = true) {
  return getTefasCookies().then((cookies) => {
    const postData = JSON.stringify(payload);

    return new Promise((resolve, reject) => {
      let isSettled = false;

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
            if (isSettled) return;
            if (res.statusCode === 200) {
              try {
                const parsed = JSON.parse(body);
                isSettled = true;
                return resolve(parsed);
              } catch (e) {
                isSettled = true;
                return reject(new Error('TEFAS verisi ayrıştırılamadı.'));
              }
            }

            if (retry) {
              isSettled = true;
              await new Promise((r) => setTimeout(r, 600));
              await getTefasCookies(true);
              try {
                const retryRes = await callTefasApi(endpoint, payload, false);
                return resolve(retryRes);
              } catch (retryErr) {
                return reject(retryErr);
              }
            }

            isSettled = true;
            reject(new Error(`TEFAS API hatası (${res.statusCode})`));
          });
        }
      );

      req.on('error', async (err) => {
        if (isSettled) return;
        if (retry) {
          isSettled = true;
          await new Promise((r) => setTimeout(r, 600));
          await getTefasCookies(true);
          try {
            const retryRes = await callTefasApi(endpoint, payload, false);
            return resolve(retryRes);
          } catch (retryErr) {
            return reject(retryErr);
          }
        }
        isSettled = true;
        reject(err);
      });

      req.setTimeout(15000, () => {
        if (!isSettled) {
          req.destroy(new Error('TEFAS sunucu yanıt vermedi (Zaman aşımı)'));
        }
      });

      req.write(postData);
      req.end();
    });
  });
}

function parseTefasDate(raw) {
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

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let body = req.body || {};
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }

    const rawMatch = req.query?.match;
    const matchPath = Array.isArray(rawMatch)
      ? rawMatch.join('/')
      : typeof rawMatch === 'string'
      ? rawMatch
      : '';
    const url = req.url || '';

    // Route 1: PRICE ON SPECIFIC DATE (/api/tefas/price-on-date)
    // Used by PortfolioModal for automatic price lookup when adding a fund or selecting a past date
    if (
      matchPath.includes('price-on-date') ||
      url.includes('price-on-date') ||
      Boolean(body?.tarih)
    ) {
      const { fonKodu, tarih } = body || req.query || {};
      if (!fonKodu) {
        return res.status(400).json({ error: 'Fon kodu gereklidir.' });
      }

      const cleanCode = String(fonKodu).toUpperCase().trim();
      const todayYMD = new Date().toISOString().split('T')[0];
      const targetYMD = tarih && String(tarih).trim().length === 10 ? String(tarih).trim() : todayYMD;

      const nowMs = Date.now();
      const targetMs = new Date(targetYMD).getTime();
      const diffDays = Math.max(1, Math.ceil((nowMs - targetMs) / (1000 * 3600 * 24)));

      let period = 1;
      if (diffDays > 25) period = 3;
      if (diffDays > 85) period = 6;
      if (diffDays > 175) period = 12;
      if (diffDays > 360) period = 36;
      if (diffDays > 1050) period = 60;

      let data = await callTefasApi('fonFiyatBilgiGetir', {
        fonKodu: cleanCode,
        dil: 'TR',
        periyod: period,
      });

      let list = data?.resultList || [];
      let validList = list.filter((item) => Number(item.fiyat) > 0);

      if (validList.length > 0) {
        validList.sort((a, b) => parseTefasDate(a.tarih).getTime() - parseTefasDate(b.tarih).getTime());
        const earliestDateYMD = parseTefasDate(validList[0].tarih).toISOString().split('T')[0];
        if (targetYMD < earliestDateYMD && period < 60) {
          data = await callTefasApi('fonFiyatBilgiGetir', {
            fonKodu: cleanCode,
            dil: 'TR',
            periyod: 60,
          });
          list = data?.resultList || [];
          validList = list.filter((item) => Number(item.fiyat) > 0);
          validList.sort((a, b) => parseTefasDate(a.tarih).getTime() - parseTefasDate(b.tarih).getTime());
        }
      }

      if (validList.length === 0) {
        if (list.length > 0) {
          validList = list;
        } else {
          return res.status(200).json({ success: false, message: 'Bu fon için fiyat verisi bulunamadı.' });
        }
      }

      validList.sort((a, b) => parseTefasDate(a.tarih).getTime() - parseTefasDate(b.tarih).getTime());

      const latestItem = validList[validList.length - 1];
      const latestPrice = Number(latestItem.fiyat);
      const latestDateYMD = parseTefasDate(latestItem.tarih).toISOString().split('T')[0];

      if (targetYMD >= latestDateYMD) {
        return res.status(200).json({
          success: true,
          fonKodu: cleanCode,
          requestedDate: targetYMD,
          resolvedDate: latestDateYMD,
          price: latestPrice,
          latestPrice,
          isExactMatch: targetYMD === latestDateYMD,
          isLatest: true,
          fonUnvan: latestItem.fonUnvan || undefined,
        });
      }

      let matchedItem = validList.find((item) => {
        const d = parseTefasDate(item.tarih).toISOString().split('T')[0];
        return d === targetYMD;
      });

      let isExactMatch = !!matchedItem;

      if (!matchedItem) {
        const onOrBefore = validList.filter((item) => {
          const d = parseTefasDate(item.tarih).toISOString().split('T')[0];
          return d <= targetYMD;
        });
        if (onOrBefore.length > 0) {
          matchedItem = onOrBefore[onOrBefore.length - 1];
        } else {
          matchedItem = validList[0];
        }
      }

      const price = Number(matchedItem.fiyat);
      const resolvedDate = parseTefasDate(matchedItem.tarih).toISOString().split('T')[0];

      return res.status(200).json({
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
    }

    // Route 2: DAILY BATCH (/api/tefas/daily-batch)
    if (matchPath.includes('daily-batch') || url.includes('daily-batch') || req.body?.codes) {
      const codes = req.body?.codes || (req.query?.codes ? String(req.query.codes).split(',') : []);
      if (!Array.isArray(codes) || codes.length === 0) {
        return res.status(200).json({ success: true, results: {} });
      }

      const cleanCodes = Array.from(new Set(codes.map((c) => String(c).toUpperCase().trim())));
      const results = {};

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
            // Ignore individual fund failure
          }
        })
      );

      return res.status(200).json({ success: true, results });
    }

    // Route 3: FUND PROFILE & STOPAJ (/api/tefas/profile/:code)
    if (matchPath.includes('profile') || url.includes('profile')) {
      const parts = matchPath.split('/').filter(Boolean);
      const urlCode = parts.length > 1 ? parts[parts.length - 1] : '';
      const code = (req.query?.code || req.query?.fonKodu || urlCode || '').toUpperCase().trim();

      if (!code) {
        return res.status(400).json({ error: 'Fon kodu gereklidir.' });
      }

      const data = await callTefasApi('fonProfilBilgiGetir', {
        fonKodu: code,
        dil: 'TR',
      });

      const profile = data?.resultList?.[0] || null;

      if (!profile) {
        return res.status(200).json({ success: false, message: 'Profil verisi bulunamadı.' });
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
        : 'Resmi Gazete Cumhurbaşkanı Kararı & GVK Geçici 67. Madde (%17,5 Düzenlemesi)';
      const stopajDesc = isHisseYogun
        ? 'Resmi TEFAS tescili: Hisse Senedi Yoğun Fon statüsünde olduğundan getiriler kanunen %0 stopaja tabidir (Tam Muafiyet).'
        : "Resmi Gazete'de yayımlanan güncel Cumhurbaşkanı Kararı ve GİB Geçici 67 mevzuatı gereği satış anında kâr üzerinden yasal %17,5 stopaj kesintisi uygulanır.";

      return res.status(200).json({
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
    }

    // Route 4: FUND HISTORY (/api/tefas/history or query.fonKodu)
    const fonKodu = (req.query?.fonKodu || req.body?.fonKodu || '').toUpperCase().trim();
    const periyod = Number(req.query?.periyod || req.body?.periyod || 12);
    const validPeriods = [1, 3, 6, 12, 36, 60];
    const chosenPeriod = validPeriods.includes(periyod) ? periyod : 12;

    if (fonKodu) {
      const fetchHistory = async (p) => {
        try {
          const data = await callTefasApi('fonFiyatBilgiGetir', {
            fonKodu,
            dil: 'TR',
            periyod: p,
          });
          return data?.resultList || [];
        } catch (e) {
          return [];
        }
      };

      let resultList = await fetchHistory(chosenPeriod);

      if (resultList.length === 0) {
        for (const fallbackP of [6, 3, 1]) {
          if (fallbackP === chosenPeriod) continue;
          const fallbackList = await fetchHistory(fallbackP);
          if (fallbackList.length > 0) {
            resultList = fallbackList;
            break;
          }
        }
      }

      return res.status(200).json({
        success: true,
        fonKodu,
        periyod: chosenPeriod,
        resultList,
      });
    }

    // Route 5: FULL FUND LIST WITH RETURNS (/api/tefas or /api/tefas/list)
    const listData = await callTefasApi('fonGetiriBazliBilgiGetir', {
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

    const list = listData?.resultList || [];
    return res.status(200).json({
      success: true,
      count: list.length,
      list,
    });
  } catch (err) {
    let msg = err?.message || 'Bilinmeyen hata';
    if (msg.includes('fetch failed') || msg.includes('Zaman aşımı') || msg.includes('ETIMEDOUT')) {
      msg = 'Takasbank TEFAS sunucuları anlık yoğunluk yaşıyor. Lütfen birazdan tekrar deneyiniz.';
    }
    return res.status(500).json({
      error: 'TEFAS verisi çekilemedi: ' + msg,
    });
  }
}
