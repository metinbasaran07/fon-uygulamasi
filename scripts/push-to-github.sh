#!/bin/bash
# TEFAS Analiz App - Otomatik GitHub Yükleme Scripti
# Kullanım: ./scripts/push-to-github.sh <github_kullanici_adiniz>

if [ -z "$1" ]; then
  echo "Hata: Lütfen GitHub kullanıcı adınızı parametre olarak girin."
  echo "Örnek: ./scripts/push-to-github.sh metinbasharan"
  exit 1
fi

GITHUB_USER=$1
REPO_NAME="tefas-analiz-app"

echo "=== TEFAS Analiz Terminali: GitHub Yükleme Başlatılıyor ==="
echo "Kullanıcı: $GITHUB_USER"
echo "Hedef Depo: https://github.com/$GITHUB_USER/$REPO_NAME.git"

git init -b main
git add .
git commit -m "feat: TEFAS Teknik Analiz ve Puanlama Terminali (Vercel & Gemini AI ready)"

# Mevcut origin varsa kaldırıp yenisini ekle
git remote remove origin 2>/dev/null
git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"

echo "Depoya push ediliyor..."
git push -u origin main

echo "=== Tamamlandı! Projeniz https://github.com/$GITHUB_USER/$REPO_NAME adresinde yayında. ==="
