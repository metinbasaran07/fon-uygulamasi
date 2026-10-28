// Vercel Serverless Function: /api/gemini
// Handles both Technical Analysis and Interactive Portfolio Chat

import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Sadece POST istekleri kabul edilir.' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY ortam değişkeni bulunamadı.' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const body = req.body || {};

    // 1. IF CHAT REQUEST
    if (body.message) {
      const { message, portfolio } = body;
      const holdingsText = (portfolio?.holdings || [])
        .map(
          (h) =>
            `- Fon: ${h.fonKodu} (${h.fonUnvan || ''}) | Kategori: ${h.kategori || 'Yatırım Fonu'} | Değer: ₺${h.toplamDeger} | Getiri: %${h.karZararYuzde}`
        )
        .join('\n');

      const chatPrompt = `Sen "Fontables" platformunun uzman, nazik ve objektif Fintek Portföy Danışmanısın.
Kullanıcının canlı portföy durumu şöyledir:
- Toplam Portföy Değeri: ₺${portfolio?.totalValue?.toLocaleString('tr-TR') || 0}
- Toplam Kâr/Zarar: %${portfolio?.totalProfitPct || 0} (₺${portfolio?.totalProfitTL?.toLocaleString('tr-TR') || 0})
- Portföydeki Fonlar:
${holdingsText || 'Henüz portföyde fon bulunmuyor.'}

KULLANICININ SORUSU VEYA TALEBİ:
"${message}"

GÖREVİN:
1. Kullanıcının sorusunu finansal bir uzman titizliğiyle, net, anlaşılır ve akıcı Türkçe ile yanıtla.
2. Portföy analizi isteniyorsa; varlık dağılımı (Hisse, Değişken, Katılım/Faizsiz, Altın, Para Piyasası), yoğunlaşma riski, getiri potansiyeli ve dengeleme stratejileri hakkında objektif değerlendirme yap.
3. Genel fonlar, stopaj vergileri, fon seçimi veya katılım fonları soruluyorsa eğitici ve açıklayıcı bilgi ver.
4. Kesinlikle spekülatif "Al/Sat" tavsiyesi verme, risk-getiri prensipleri çerçevesinde matematiksel ve yapısal değerlendirmeler sun.
5. Yanıtı maddeler halinde, göz yormayan, okunaklı bir formatta yaz.`;

      let chatReply = '';
      for (const model of ['gemini-3.8-flash', 'gemini-3.1-flash-lite']) {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 5000)
          );
          const apiPromise = ai.models.generateContent({ model, contents: chatPrompt });
          const response = await Promise.race([apiPromise, timeoutPromise]);
          if (response?.text) {
            chatReply = response.text;
            break;
          }
        } catch (e) {
          // fallback
        }
      }

      if (!chatReply) {
        chatReply = `Sorunuz portföy analizi kapsamında değerlendirilmiştir:

1. Varlık Dağılımı ve Risk Dengesi: Toplam ₺${portfolio?.totalValue?.toLocaleString('tr-TR') || 0} büyüklüğündeki portföyünüzde ${portfolio?.holdings?.length || 0} adet fon bulunmaktadır.
2. Çeşitlendirme Stratejisi: Hisse senedi fonları sermaye büyümesi sağlarken, Katılım (faizsiz) veya Para Piyasası fonları dalgalanmaları dengeler.
3. Detaylı Takip: Fontables üzerinden fonlarınızın teknik göstergelerini inceleyebilirsiniz.`;
      }

      return res.status(200).json({ success: true, reply: chatReply });
    }

    // 2. IF FUND TECHNICAL ANALYSIS REQUEST
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
    } = body;

    const prompt = `Sen uzman bir Fintek Teknik Analisti ve Portföy Matematikçisisin.
Aşağıda TEFAS'tan çekilen gerçek tarihsel verilerle hesaplanmış fon teknik göstergeleri ve matematiksel puanlama sonuçları verilmiştir:

FON KODU: ${fonKodu}
FON UNVANI: ${fonUnvan || 'Belirtilmedi'}
KATEGORİ: ${kategori || 'Yatırım Fonu'}
GÜNCEL FİYAT: ${guncelFiyat ? guncelFiyat + ' TL' : 'Mevcut'}
RSI (14 GÜNLÜK): ${rsi14 !== undefined ? rsi14 : 'Hesaplanamadı'}
SMA 20: ${sma20 || '-'} | SMA 50: ${sma50 || '-'}
SMA KONUMU/TREND: ${smaDurumu || '-'}
YILLIKLANDIRILMIŞ VOLATİLİTE: ${volatiliteYillik ? '%' + volatiliteYillik : '-'}
SHARPE ORANI: ${sharpeOrani !== undefined ? sharpeOrani : '-'}
MAX DRAWDOWN: ${maxDrawdown ? '%' + maxDrawdown : '-'}
TOPLAM MATEMATİKSEL SKOR: ${toplamPuan || '-'} / 100 (${puanRozeti || '-'})
DÖNEMSEL GETİRİLER: 1 Ay: %${getiriler?.getiri1a ?? '-'}, 3 Ay: %${getiriler?.getiri3a ?? '-'}, 6 Ay: %${getiriler?.getiri6a ?? '-'}, 1 Yıl: %${getiriler?.getiri1y ?? '-'}

GÖREVİN:
Kullanıcıya tam olarak 3 MADDELİK OBJEKTİF TEKNİK VE MATEMATİKSEL DURUM TESPİTİ ÖZETİ hazırla:
Madde 1: Fiyat Trendi ve Momentum Durumu (RSI ve SMA).
Madde 2: Oynaklık ve Risk-Getiri Dengesi (Volatilite, MDD ve Sharpe).
Madde 3: Algoritmik Skor Değerlendirmesi.
Kesinlikle yatırım tavsiyesi verme.`;

    let responseText = '';
    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];

    for (const model of modelsToTry) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI request timeout')), 3500)
        );
        const apiPromise = ai.models.generateContent({
          model,
          contents: prompt,
        });

        const response = await Promise.race([apiPromise, timeoutPromise]);
        if (response && response.text) {
          responseText = response.text;
          break;
        }
      } catch (err) {
        // Continue to fallback
      }
    }

    if (!responseText) {
      const rsiVal = Number(rsi14) || 50;
      const rsiDesc =
        rsiVal >= 70
          ? `RSI (14) ${rsiVal.toFixed(1)} seviyesiyle aşırı alım bölgesindedir; kısa vadeli teknik doyum izlenmektedir.`
          : rsiVal <= 30
          ? `RSI (14) ${rsiVal.toFixed(1)} seviyesiyle aşırı satım bölgesindedir; teknik dip seviyelerden tepki alımı potansiyeli bulunmaktadır.`
          : `RSI (14) ${rsiVal.toFixed(1)} seviyesiyle dengeli bölgede hareket etmektedir.`;

      const isBull = guncelFiyat && sma20 && sma50 && guncelFiyat > sma20 && sma20 > sma50;
      const smaDesc = isBull
        ? `Fiyat (₺${guncelFiyat}), hem SMA20 hem de SMA50 seviyelerinin üzerinde güçlü yukarı yönlü ana trend yapısını sürdürmektedir.`
        : `Fiyat ortalamalarla temas halinde olup ${smaDurumu || 'düzeltme bölgesinde'} seyretmektedir.`;

      const riskDesc = `Yıllıklandırılmış volatilite %${volatiliteYillik || 0} seviyesinde olup, tarihsel en büyük düşüş (Max Drawdown) %${Math.abs(Number(maxDrawdown) || 0).toFixed(2)} derinliğindedir. Sharpe oranı (${sharpeOrani ?? 0}) birim risk başına getiri verimliliğini yansıtır.`;

      const scoreDesc = `Algoritmik fon puanlama motoru ${fonKodu} fonunu 100 üzerinden ${toplamPuan ?? 75} puan ile "${puanRozeti || 'Dengeli Risk'}" rozetiyle derecelendirmiştir.`;

      responseText = `1. Fiyat Trendi ve Momentum Durumu: ${smaDesc} ${rsiDesc}\n\n2. Oynaklık ve Risk-Getiri Dengesi: ${riskDesc}\n\n3. Algoritmik Skor Değerlendirmesi: ${scoreDesc}\n\nBilgilendirme: Matematiksel modelleme çıktısıdır, yatırım tavsiyesi içermez.`;
    }

    return res.status(200).json({
      success: true,
      analysis: responseText,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      error: 'İşlem tamamlanamadı: ' + (error.message || 'Bilinmeyen hata'),
    });
  }
}
