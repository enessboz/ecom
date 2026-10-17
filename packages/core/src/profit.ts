import { z } from "zod";
import { divRoundHalfEven, mulBp, splitVat } from "./money.js";
import { type Rates, RatesMissingError, missingForChannel } from "./rates.js";

const kurus = z.number().int().min(0);
const bp = z.number().int().min(0).max(100000);

export const profitBaseSchema = z.object({
  salePriceKurus: z.number().int().positive(), // KDV dahil satış fiyatı
  purchaseCostKurus: kurus, // KDV dahil alış
  purchaseVatBp: bp, // alış KDV oranı; varsayılan yok
  shippingKurus: kurus, // KDV dahil kargo
  returnRateBp: bp.max(10000),
  returnShippingKurus: kurus.optional(), // yoksa giden kargo kadar
  adCostPerSaleKurus: kurus,
  targetMarginBp: bp.optional(),
});
export const profitInputSchema = profitBaseSchema.extend({ channel: z.string().min(1) });

export type ProfitBase = z.infer<typeof profitBaseSchema>;
export type ProfitInput = z.infer<typeof profitInputSchema>;

export interface ProfitResult {
  channel: string;
  revenueNetKurus: number; // KDV hariç ciro
  breakdown: {
    purchase: number;
    commission: number;
    fixedFee: number;
    shipping: number;
    ad: number;
    withholding: number;
  };
  profitIfKeptKurus: number;
  lossIfReturnedKurus: number; // negatif sayı
  expectedProfitKurus: number; // iade olasılığıyla ağırlıklı, satış başına
  netMarginBp: number; // beklenen kâr / KDV hariç ciro
  meetsTarget: boolean | null;
  assumptions: string[];
}

/**
 * Varsayımlar (sonuçta da döner):
 * - İadede komisyon ve sabit ücret iade edilir, mal yeniden satılabilir; kayıp = giden + dönüş kargosu + reklam.
 * - deductInputVat açıkken alış/komisyon/kargo KDV'si indirilir (KDV hariç tutar gider); kapalıyken KDV dahil tutar gider.
 * - Stopaj açıksa KDV hariç cironun stopaj oranı kadarı gider sayılır (ihtiyatlı).
 * - Komisyon KDV dahil satış fiyatı üzerinden hesaplanır; komisyon KDV oranı commissionVatBp.
 */
export function computeProfit(input: ProfitInput, rates: Rates): ProfitResult {
  const i = profitInputSchema.parse(input);
  const missing = missingForChannel(rates, i.channel);
  if (missing.length) throw new RatesMissingError(missing);

  const ch = rates.channels[i.channel]!;
  const deduct = rates.settings.deductInputVat!;
  const exp = (gross: number, vatBp: number) => (deduct ? splitVat(gross, vatBp).net : gross);

  const revenueNet = splitVat(i.salePriceKurus, ch.saleVatBp!).net;
  const purchase = exp(i.purchaseCostKurus, i.purchaseVatBp);
  const commission = exp(mulBp(i.salePriceKurus, ch.commissionBp!), ch.commissionVatBp!);
  const fixedFee = exp(ch.fixedFeeKurus!, ch.commissionVatBp!);
  const shipping = exp(i.shippingKurus, ch.shippingVatBp!);
  const returnShipping = exp(i.returnShippingKurus ?? i.shippingKurus, ch.shippingVatBp!);
  const ad = i.adCostPerSaleKurus;
  const withholding = rates.settings.applyWithholding ? mulBp(revenueNet, rates.settings.withholdingBp!) : 0;

  const profitIfKept = revenueNet - purchase - commission - fixedFee - shipping - ad - withholding;
  const lossIfReturned = -(shipping + returnShipping + ad);
  const r = i.returnRateBp;
  const expected = divRoundHalfEven(profitIfKept * (10000 - r) + lossIfReturned * r, 10000);
  const netMarginBp = divRoundHalfEven(expected * 10000, revenueNet);

  return {
    channel: i.channel,
    revenueNetKurus: revenueNet,
    breakdown: { purchase, commission, fixedFee, shipping, ad, withholding },
    profitIfKeptKurus: profitIfKept,
    lossIfReturnedKurus: lossIfReturned,
    expectedProfitKurus: expected,
    netMarginBp,
    meetsTarget: i.targetMarginBp === undefined ? null : netMarginBp >= i.targetMarginBp,
    assumptions: [
      "İadede komisyon/sabit ücret iade edilir, mal yeniden satılabilir; kayıp = giden+dönüş kargosu+reklam",
      deduct ? "Girdi KDV'si indirilir (KDV hariç tutarlar gider)" : "Girdi KDV'si indirilmez (KDV dahil tutarlar gider)",
      rates.settings.applyWithholding ? "Stopaj KDV hariç cirodan gider sayıldı" : "Stopaj hesaba katılmadı",
      "Komisyon KDV dahil satış fiyatı üzerinden hesaplandı",
    ],
  };
}

export type ChannelOutcome =
  | { channel: string; ok: true; result: ProfitResult }
  | { channel: string; ok: false; missing: string[] };

/** Her kanal için sonuç; oranı eksik kanal hata satırı olarak döner, diğerleri engellenmez. */
export function compareChannels(base: ProfitBase, rates: Rates, channels?: string[]): ChannelOutcome[] {
  const b = profitBaseSchema.parse(base);
  const ids = channels ?? Object.keys(rates.channels);
  return ids.map((channel): ChannelOutcome => {
    try {
      return { channel, ok: true, result: computeProfit({ ...b, channel }, rates) };
    } catch (e) {
      if (e instanceof RatesMissingError) return { channel, ok: false, missing: e.missing };
      throw e;
    }
  });
}
