import React, { useState } from 'react';
import { X, Github, Zap, Copy, Check, Terminal, Shield, ArrowRight, ExternalLink } from 'lucide-react';

interface DeployModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeployModal: React.FC<DeployModalProps> = ({ isOpen, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const gitCommands = `# 1. Proje dizinine geçin ve git yapılandırmasını kontrol edin
git init -b main
git add .
git commit -m "feat: TEFAS Teknik Analiz ve Puanlama Terminali (Vercel & Gemini AI ready)"

# 2. GitHub üzerinde 'tefas-analiz-app' adında yeni bir repo oluşturduktan sonra depoyu bağlayın:
# (Kendi GitHub kullanıcı adınızı <KULLANICI_ADINIZ> yerine yazın)
git remote add origin https://github.com/<KULLANICI_ADINIZ>/tefas-analiz-app.git

# 3. Dosyaları doğrudan GitHub'a push edin
git push -u origin main`;

  const vercelCliCommand = `# Vercel CLI ile $0 maliyetle anında canlıya alma
npx vercel --prod`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">
                GitHub &amp; Vercel $0 Dağıtım Paketi
              </h3>
              <p className="text-xs text-slate-400">
                Tüm dosyalar (index.html, api/tefas.js, vercel.json) eksiksiz hazırlandı
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Prepared Architecture Checklist */}
        <div className="my-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 font-mono">
              <Zap className="w-4 h-4" />
              <span>vercel.json</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              $0 Vercel Serverless Function rewrites ve Vite SPA yönlendirmeleri hazır.
            </p>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 font-mono">
              <Terminal className="w-4 h-4" />
              <span>api/tefas.js</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Tarayıcı CORS engeline takılmayan resmi TEFAS proxy serverless endpoint'i.
            </p>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 font-mono">
              <Shield className="w-4 h-4" />
              <span>api/gemini.js</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              process.env.GEMINI_API_KEY ile korunan sunucu taraflı yapay zeka analizi.
            </p>
          </div>
        </div>

        {/* Step 1: GitHub Push */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">
                  1
                </span>
                GitHub "tefas-analiz-app" Deposuna Yükleme Komutları
              </span>
              <button
                onClick={() => copyToClipboard(gitCommands, 1)}
                className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 font-mono transition-colors cursor-pointer"
              >
                {copiedIndex === 1 ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> Kopyalandı
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Kopyala
                  </>
                )}
              </button>
            </div>
            <pre className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre leading-relaxed">
              {gitCommands}
            </pre>
          </div>

          {/* Step 2: Vercel Deploy */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px]">
                  2
                </span>
                Vercel Üzerinde $0 Maliyetle Yayınlama
              </span>
              <button
                onClick={() => copyToClipboard(vercelCliCommand, 2)}
                className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 font-mono transition-colors cursor-pointer"
              >
                {copiedIndex === 2 ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> Kopyalandı
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Kopyala
                  </>
                )}
              </button>
            </div>
            <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
              <p>
                <strong>Yöntem A (Vercel Web Paneli - En Kolayı):</strong> vercel.com adresine gidin,
                oluşturduğunuz <span className="text-emerald-400 font-mono">tefas-analiz-app</span>{' '}
                deposunu seçin ve <strong>Deploy</strong> butonuna tıklayın.
              </p>
              <p>
                <strong>Ortam Değişkeni (Environment Variable):</strong> Vercel Settings &gt;
                Environment Variables kısmına <span className="text-cyan-300 font-mono">GEMINI_API_KEY</span>{' '}
                anahtarınızı ekleyin.
              </p>
              <pre className="p-2 bg-slate-950 rounded border border-slate-800 font-mono text-[11px] text-slate-400">
                {vercelCliCommand}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            Tamamen bağımsız, sıfır maliyetli bulut mimarisi
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
          >
            Anladım, Terminale Dön
          </button>
        </div>
      </div>
    </div>
  );
};
