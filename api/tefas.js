// Vercel Serverless Function: /api/tefas
// Comprehensive TEFAS proxy supporting list, fund history, profiles with stopaj, and daily batch

const TEFAS_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Content-Type': 'application/json',
  Accept: 'application/json, text/plain, */*',
};

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const rawMatch = req.query?.match;
    const matchPath = Array.isArray(rawMatch)
      ? rawMatch.join('/')
      : typeof rawMatch === 'string'
      ? rawMatch
      : '';
    const url = req.url || '';

    // Route 1: DAILY BATCH (/api/tefas/daily-batch)
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
            const resp = await fetch('https://www.tefas.gov.tr/api/funds/fonFiyatBilgiGetir', {
              method: 'POST',
              headers: TEFAS_HEADERS,
              body: JSON.stringify({ fonKodu: code, dil: 'TR', periyod: 1 }),
            });
            if (!resp.ok) return;
            const data = await resp.json();
            const list = data.resultList || [];
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

    // Route 2: FUND PROFILE & STOPAJ (/api/tefas/profile/:code)
    if (matchPath.includes('profile') || url.includes('profile')) {
      const parts = matchPath.split('/').filter(Boolean);
      const urlCode = parts.length > 1 ? parts[parts.length - 1] : '';
      const code = (req.query?.code || req.query?.fonKodu || urlCode || '').toUpperCase().trim();

      if (!code) {
        return res.status(400).json({ error: 'Fon kodu gereklidir.' });
      }

      const response = await fetch('https://www.tefas.gov.tr/api/funds/fonProfilBilgiGetir', {
        method: 'POST',
        headers: TEFAS_HEADERS,
        body: JSON.stringify({
          fonKodu: code,
          dil: 'TR',
        }),
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: 'TEFAS profil servisine ulaşılamadı.' });
      }

      const data = await response.json();
      const profile = data.resultList?.[0] || null;

      if (!profile) {
        return res.status(200).json({ success: false, message: 'Profil verisi bulunamadı.' });
      }

      const unvan = (profile.fonUnvan || '').toUpperCase();
      const isHisseYogun = unvan.includes('YOĞUN') || unvan.includes('YOGUN');
      const stopajRate = isHisseYogun ? 0 : 10;
      const stopajLabel = isHisseYogun ? '%0 Stopaj (Muaf)' : '%10 Stopaj';
      const stopajDesc = isHisseYogun
        ? 'Resmi TEFAS tescili: Hisse Senedi Yoğun Fon statüsünde olduğundan getiriler kanunen %0 stopaja tabidir.'
        : 'Resmi TEFAS tescili: Satış anında kâr üzerinden yasal %10 stopaj kesintisi uygulanır.';

      return res.status(200).json({
        success: true,
        profile: {
          ...profile,
          stopajRate,
          stopajLabel,
          isStopajExempt: isHisseYogun,
          stopajDesc,
        },
      });
    }

    // Route 3: FUND HISTORY (/api/tefas/history or query.fonKodu)
    const fonKodu = (req.query?.fonKodu || req.body?.fonKodu || '').toUpperCase().trim();
    const periyod = Number(req.query?.periyod || req.body?.periyod || 12);
    const validPeriods = [1, 3, 6, 12, 36, 60];
    const chosenPeriod = validPeriods.includes(periyod) ? periyod : 12;

    if (fonKodu) {
      const fetchHistory = async (p) => {
        const response = await fetch('https://www.tefas.gov.tr/api/funds/fonFiyatBilgiGetir', {
          method: 'POST',
          headers: TEFAS_HEADERS,
          body: JSON.stringify({
            fonKodu,
            dil: 'TR',
            periyod: p,
          }),
        });
        if (!response.ok) return [];
        const data = await response.json();
        return data.resultList || [];
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

    // Route 4: FULL FUND LIST WITH RETURNS (/api/tefas or /api/tefas/list)
    const listResponse = await fetch('https://www.tefas.gov.tr/api/funds/fonGetiriBazliBilgiGetir', {
      method: 'POST',
      headers: TEFAS_HEADERS,
      body: JSON.stringify({
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
      }),
    });

    if (!listResponse.ok) {
      return res.status(listResponse.status).json({
        error: `TEFAS Liste API hatası: ${listResponse.status}`,
      });
    }

    const listData = await listResponse.json();
    return res.status(200).json({
      success: true,
      count: (listData.resultList || []).length,
      list: listData.resultList || [],
    });
  } catch (err) {
    return res.status(500).json({
      error: 'TEFAS verisi çekilemedi: ' + (err.message || 'Bilinmeyen hata'),
    });
  }
}
