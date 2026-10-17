# data/

Kullanıcıya ait veri; kaynak kodundan ayrıdır.

`rates.json` **bilerek boştur**. Komisyon/KDV/stopaj oranlarını kendin (veya mali müşavirin) doğrulayıp doldur.
Oran eksikse hesap hata verir; varsayılan oran yoktur. Tutarlar kuruş, oranlar baz puan (bp; %20 = 2000).

Kanal örneği (sayılar örnek değildir, kendi değerlerinle değiştir):

```json
"channels": {
  "kanal-id": {
    "label": "Kanal adı",
    "commissionBp": null,
    "commissionVatBp": null,
    "saleVatBp": null,
    "shippingVatBp": null,
    "fixedFeeKurus": null
  }
}
```
`settings.deductInputVat`: alış/komisyon/kargo KDV'si indirilsin mi. `settings.applyWithholding` + `withholdingBp`: stopaj gider olarak düşülsün mü.
