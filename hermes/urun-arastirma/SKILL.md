---
name: urun-arastirma
description: Kullanıcı ürün, niş veya kâr sorusu sorduğunda Claude Code'a düşük bütçeyle devreder; basit "oranlar güncel mi?" sorularını kendi cevaplar.
---

# Ürün araştırma devri (Hermes)

> Hermes'in skill dizini/biçimi bu repoda doğrulanmadı (plan §10). Dosyayı Hermes'in beklediği yere ve biçime uyarlamadan önce Hermes belgelerinden kontrol et.

## Karar

- **Kendin cevapla:** "oranlar güncel mi?", "son kontrol ne zaman?" gibi tek araç çağrılık sorular.
- **Devret:** ürün/niş/kâr/aday soruları.

## Devir

`scripts/delegate` ile Claude Code'a gönder:

- Bütçe tavanı **her koşuda** zorunlu; varsayılan 1–2 USD. Bayrak adı (`--max-budget-usd` vb.) `claude --help` ile doğrulanmadan betiğe yazılmaz.
- Görev metnine kullanıcının sorusunu aynen koy ve "önce `rates_status`, rakamı araçla hesapla, aday listesi kazanan garantisi değildir" kurallarını ekle.
- Tavan aşılırsa koşu durur; sonucu yarım olarak bildir.

## Kullanıcıya dönüş

Sonuç + **maliyet satırı** (ölçülen değer; tahmin yazma). Maliyet okunamıyorsa "ölçülemedi" de.

## Zamanlanmış toplama

Önce `scripts/has-work` mantığı: iş yoksa çık. Toplama LLM'siz betiktir (Görev Zamanlayıcı veya Hermes cron). Claude yalnız yeni veri varsa özet için çağrılır.
