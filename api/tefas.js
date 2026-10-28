// Vercel Serverless Function: /api/tefas
// TEFAS CORS proxy and live market data aggregator

const TEFAS_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Content-Type': 'application/json',
  Accept: 'application/json, text/plain, */*',
};

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const fonKodu = (req.query?.fonKodu || req.body?.fonKodu || '').toUpperCase().trim();
    const periyod = Number(req.query?.periyod || req.body?.periyod || 12);
    const validPeriods = [1, 3, 6, 12, 36, 60];
    const chosenPeriod = validPeriods.includes(periyod) ? periyod : 12;

    // 1. If fonKodu is requested, return fund history
    if (fonKodu) {
      const response = await fetch('https://www.tefas.gov.tr/api/funds/fonFiyatBilgiGetir', {
        method: 'POST',
        headers: TEFAS_HEADERS,
        body: JSON.stringify({
          fonKodu,
          dil: 'TR',
          periyod: chosenPeriod,
        }),
      });

      if (!response.ok) {
        return res.status(response.status).json({
          error: `TEFAS API hatası: ${response.status}`,
        });
      }

      const data = await response.json();
      return res.status(200).json({
        success: true,
        fonKodu,
        periyod: chosenPeriod,
        resultList: data.resultList || [],
      });
    }

    // 2. Otherwise return full funds list with return rates
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
