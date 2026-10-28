# TEFAS Teknik Analiz ve Matematiksel Puanlama Terminali (tefas-analiz-app)

TEFAS yatırım fonlarını resmi gerçek zamanlı veriler, RSI (14), SMA 20, SMA 50, Yıllıklandırılmış Volatilite, Sharpe Oranı, Maksimum Düşüş (Max Drawdown) ve **0-100 Ağırlıklı Matematiksel Puanlama Algoritması** ile inceleyen, **Gemini AI** destekli modern Fintech web uygulaması.

---

## 🚀 Öne Çıkan Özellikler ve Mimari

1. **%100 Gerçek TEFAS Verisi (Sıfır Mock Data):**
   - TEFAS'ın resmi `https://www.tefas.gov.tr/api/funds/...` JSON servisleriyle doğrudan entegredir.
   - Tarayıcıların CORS kısıtlamalarına takılmamak için Serverless Function proxy mimarisi (`/api/tefas`) kullanılır.

2. **Gelişmiş Teknik Göstergeler:**
   - **RSI (14 Günlük):** Wilder yumuşatmalı Relative Strength Index ile aşırı alım (>70) ve aşırı satım (<30) tespiti.
   - **SMA 20 & SMA 50:** Fiyatın hareketli ortalamalarla ilişkisi, Boğa/Ayı trendleri ve Golden/Death Cross analizleri.
   - **Yıllıklandırılmış Volatilite:** Günlük getirilerin standart sapması ve 252 işlem günü bazlı yıllık oynaklık.
   - **Sharpe Oranı:** Birim risk başına üretilen getiri verimliliği.
   - **Maksimum Düşüş (Max Drawdown):** Tarihsel zirveden gerçekleşen en derin değer kaybı.

3. **0 - 100 Matematiksel Puanlama Algoritması:**
   - **%30 Getiri Performansı:** Dönemsel getiri seviyeleri ve tutarlılığı.
   - **%30 Sharpe / Risk Oranı:** Risk-getiri verimliliği.
   - **%20 Teknik Sinyal:** RSI ve SMA hareketli ortalama uyumu.
   - **%20 Volatilite ve Sermaye Koruma:** Max Drawdown derinliği ve oynaklık direnci.
   - Otomatik Rozet ve Sınıflandırma: Örn: `88 / 100 - Güçlü Performans & Dengeli Risk (Grade: A+)`.

4. **Dahili Gemini AI Analiz Motoru:**
   - `gemini-3.8-flash` modeli hesaplanan teknik değerleri yorumlayarak 3 maddelik objektif durum tespiti sunar.
   - Kesinlikle "Al/Sat" gibi spekülatif yatırım tavsiyesi vermez; tamamen matematiksel verilere dayanır (SPK uyumlu).

5. **$0 Maliyetle Vercel ve GitHub Uyumlu:**
   - Proje içerisinde `vercel.json`, `api/tefas.js`, `api/gemini.js` ve Vite yapılandırması eksiksiz olarak mevcuttur.

---

## 🛠️ GitHub'a Otomatik / Hızlı Yükleme (Push) Talimatı

Proje dizininde terminali açıp şu komutları sırasıyla çalıştırarak GitHub'daki **tefas-analiz-app** deponuza yükleyebilirsiniz:

```bash
# 1. Git deposunu hazırlayın ve dosyaları ekleyin
git init -b main
git add .
git commit -m "feat: TEFAS Teknik Analiz ve Puanlama Terminali (Vercel & Gemini AI ready)"

# 2. GitHub hesabınızda 'tefas-analiz-app' adında yeni bir repository (depo) oluşturun.
# Ardından aşağıdaki komutta <GITHUB_KULLANICI_ADINIZ> kısmını kendi kullanıcı adınızla değiştirip çalıştırın:
git remote add origin https://github.com/<GITHUB_KULLANICI_ADINIZ>/tefas-analiz-app.git

# 3. Dosyaları GitHub'a push edin
git push -u origin main
```

---

## ⚡ Vercel Üzerinde $0 Maliyetle Yayınlama (Deploy)

1. [vercel.com](https://vercel.com) adresine gidin ve GitHub hesabınızla giriş yapın.
2. **Add New Project** butonuna basarak `tefas-analiz-app` deposunu seçin.
3. **Environment Variables** (Ortam Değişkenleri) bölümüne:
   - İsim: `GEMINI_API_KEY`
   - Değer: `[Google AI Studio'dan aldığınız API anahtarınız]`
4. **Deploy** butonuna tıklayın. Yaklaşık 45 saniyede uygulamanız $0 maliyetle yayında olacaktır!

---

## 💻 Yerel Geliştirme (Local Development)

```bash
# Bağımlılıkları yükleyin
npm install

# .env dosyasını oluşturun
cp .env.example .env
# .env içine GEMINI_API_KEY anahtarınızı ekleyin

# Sunucuyu başlatın
npm run dev
```

Tarayıcınızda `http://localhost:3000` adresini açarak terminali kullanabilirsiniz.
