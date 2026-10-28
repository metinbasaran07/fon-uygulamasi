import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, RefreshCw, User, PieChart, Shield, ArrowRight } from 'lucide-react';
import { PortfolioHolding } from '../types/portfolio';
import { TefasListRaw } from '../types/tefas';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface AiPortfolioChatProps {
  holdings: PortfolioHolding[];
  fundsList: TefasListRaw[];
  latestPricesMap: Record<string, number>;
  onSelectFund: (code: string) => void;
}

const QUICK_QUESTIONS = [
  'Portföyümün risk seviyesi ve varlık dağılımı dengeli mi?',
  'Portföyüme çeşitlendirme sağlamak için hangi fon kategorileri uygun?',
  'Katılım (faizsiz) fonları hakkında bilgi ver ve dağılımımı incele',
  'Hisse senedi fonu ile değişken fon arasındaki temel fark nedir?',
  'Fon getirilerinde stopaj kesintisi nasıl işler?',
];

export const AiPortfolioChat: React.FC<AiPortfolioChatProps> = ({
  holdings,
  fundsList,
  latestPricesMap,
  onSelectFund,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Merhaba! Ben Fontables Yapay Zeka Fon Danışmanıyım. 

Portföyünüzdeki fonları, varlık dağılımınızı ve risk dengenizi inceleyebilir; merak ettiğiniz tüm TEFAS fonları, kategoriler (Hisse, Değişken, Katılım, Altın vb.) ve finansal terimler hakkında sorularınızı yanıtlayabilirim.

Nasıl yardımcı olabilirim? Aşağıdaki hızlı sorulardan birini seçebilir veya dilediğinizi yazabilirsiniz.`,
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Compute portfolio summary for context
  const portfolioSummary = React.useMemo(() => {
    let totalVal = 0;
    let totalCost = 0;
    const items = holdings.map((h) => {
      const price = latestPricesMap[h.fonKodu] || h.alisFiyati;
      const val = h.adet * price;
      const cost = h.adet * h.alisFiyati;
      totalVal += val;
      totalCost += cost;
      return {
        fonKodu: h.fonKodu,
        fonUnvan: h.fonUnvan,
        kategori: h.kategori,
        adet: h.adet,
        maliyet: h.alisFiyati,
        guncelFiyat: price,
        toplamDeger: Math.round(val),
        karZararTL: Math.round(val - cost),
        karZararYuzde: cost > 0 ? (((val - cost) / cost) * 100).toFixed(2) : '0',
      };
    });
    return {
      totalValue: Math.round(totalVal),
      totalCost: Math.round(totalCost),
      totalProfitTL: Math.round(totalVal - totalCost),
      totalProfitPct: totalCost > 0 ? (((totalVal - totalCost) / totalCost) * 100).toFixed(2) : '0',
      holdings: items,
    };
  }, [holdings, latestPricesMap]);

  const handleSend = async (questionToSend?: string) => {
    const text = (questionToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!questionToSend) setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          portfolio: portfolioSummary,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: data.reply || 'Cevap üretilemedi.',
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.warn('Chat error:', err);
      const fallbackReply = generateClientFallbackReply(text, portfolioSummary);
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: fallbackReply,
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl flex flex-col h-[750px] shadow-sm overflow-hidden">
      {/* Top Header & Portfolio Snapshot */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              Fontables AI Asistanı
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono">
                Portföy Odaklı
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Portföyünüze özel analiz, varlık dağılımı tavsiyesi ve TEFAS fon rehberliği
            </p>
          </div>
        </div>

        {/* Portfolio Live Snapshot Badge */}
        <div className="flex items-center gap-3 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono self-start sm:self-auto">
          <PieChart className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-300">Portföyünüz:</span>
          <span className="font-bold text-white">₺{portfolioSummary.totalValue.toLocaleString('tr-TR')}</span>
          <span
            className={`font-bold ${
              Number(portfolioSummary.totalProfitTL) >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            %{portfolioSummary.totalProfitPct}
          </span>
        </div>
      </div>

      {/* Quick Question Chips */}
      <div className="px-4 py-2.5 bg-slate-950/40 border-b border-slate-800/60 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
        <span className="text-[10px] font-mono text-slate-500 uppercase shrink-0">Öneriler:</span>
        {QUICK_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            disabled={isLoading}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800/80 text-[11px] whitespace-nowrap transition-colors cursor-pointer shrink-0"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-slate-800 text-slate-200'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-line ${
                  isUser
                    ? 'bg-emerald-500 text-slate-950 font-medium rounded-tr-none'
                    : 'bg-slate-950/70 border border-slate-800 text-slate-200 rounded-tl-none font-sans'
                }`}
              >
                {msg.text}
                <div
                  className={`mt-1.5 text-[10px] font-mono text-right ${
                    isUser ? 'text-slate-800/80' : 'text-slate-500'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-3 text-slate-400 text-xs">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-slate-950/70 border border-slate-800 px-4 py-2.5 rounded-2xl flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              <span>Yanıt hazırlanıyor...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 border-t border-slate-800/80 bg-slate-950/80 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Portföyünüz veya fonlar hakkında dilediğinizi sorun..."
          className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Gönder</span>
        </button>
      </form>
    </div>
  );
};

// Fallback response engine in case of offline/network limits
function generateClientFallbackReply(question: string, portfolio: any): string {
  const q = question.toLowerCase();

  if (q.includes('risk') || q.includes('dağılım') || q.includes('denge')) {
    const count = portfolio.holdings?.length || 0;
    return `Portföyünüzde şu anda ${count} adet fon bulunmaktadır (Toplam Değer: ₺${portfolio.totalValue.toLocaleString('tr-TR')}, Getiri: %${portfolio.totalProfitPct}).

Varlık Dağılımı ve Risk Tespiti:
1. Yoğunlaşma Riski: Portföyünüzde az sayıda fon bulunuyorsa, piyasa dalgalanmalarına karşı hassasiyet artabilir. İdeal bir portföyde Hisse Senedi, Değişken ve Para Piyasası/Kıymetli Madenler dengesi korunmalıdır.
2. Vade Uyumu: Yüksek getirili Hisse veya Değişken fonlar en az 6-12 ay vadeli değerlendirilmeli, likidite ihtiyaçları için Para Piyasası fonları ayrılmalıdır.
3. Çeşitlendirme Önerisi: Portföyünüze farklı varlık sınıflarına yatırım yapan Fon Sepeti veya Altın/Kıymetli Maden fonları eklemek portföy oynaklığını (volatilitesini) belirgin şekilde düşürür.`;
  }

  if (q.includes('katılım') || q.includes('faizsiz')) {
    return `Katılım (Faizsiz) Fonları Rehberi:

1. Katılım Şemsiye Fonları, BIST Katılım Endeksi kriterlerine ve faizsiz finans ilkelerine uygun hisse senetleri, kira sertifikaları (sukuk), altın ve katılma hesaplarından oluşur.
2. Portföyünüzde faizsiz finans tercihiniz varsa, Fontables ana ekranındaki "Katılım (Faizsiz)" filtresini açarak sadece helal finans ilkelerine uyumlu 150+ fonu anında listeleyebilirsiniz.
3. Kira sertifikaları fonları düşük riskli getiri sağlarken, Katılım Hisse Senedi fonları uzun vadeli büyüme potansiyeli sunar.`;
  }

  if (q.includes('stopaj') || q.includes('vergi')) {
    return `Yatırım Fonlarında Stopaj Oranları:

1. Hisse Senedi Yoğun Fonlar (portföyünün en az %80'i BIST hisselerinden oluşan fonlar): Stopaj oranı %0'dır (Tam vergi muafiyeti).
2. Diğer Fonlar (Değişken, Borçlanma, Para Piyasası, Fon Sepeti): Mevzuat güncellemelerine göre genellikle %7.5 - %10 stopaja tabidir.
3. Stopaj Fon Satışında Tahsil Edilir: Vergiler doğrudan fon bozumunda kâr üzerinden otomatik kesilir, ek beyanname vermeniz gerekmez.`;
  }

  return `Sorunuzla ilgili finansal durum değerlendirmesi:

1. Portföy Stratejisi: Portföyünüzdeki fonların performansını ve getiri hedeflerinizi düzenli takip etmek önemlidir.
2. Teknik Göstergeler: İncelemek istediğiniz fonun RSI değerini (30-70 bandı) ve SMA 20/50 hareketli ortalamalarını kontrol ederek doğru giriş/çıkış zamanlaması yapabilirsiniz.
3. Detaylı İnceleme: İlgilendiğiniz herhangi bir fonun kodunu arama çubuğuna yazarak 0-100 matematiksel skorunu ve risk analizini detaylı görebilirsiniz.`;
}
