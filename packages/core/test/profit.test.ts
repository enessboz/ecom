import { describe, expect, it } from "vitest";
import { type Rates, RatesMissingError, compareChannels, computeProfit, ratesStatus } from "../src/index.js";

// Test düzeneği; gerçek oran değildir.
const rates = (over: Partial<Rates["settings"]> = {}): Rates => ({
  updatedAt: "2026-10-01",
  settings: { deductInputVat: true, applyWithholding: false, withholdingBp: null, ...over },
  channels: {
    a: { label: "A", commissionBp: 1000, commissionVatBp: 2000, saleVatBp: 2000, shippingVatBp: 2000, fixedFeeKurus: 0 },
    eksik: { label: "E", commissionBp: null, commissionVatBp: 2000, saleVatBp: 2000, shippingVatBp: 2000, fixedFeeKurus: 0 },
  },
});

// Elle hesap: fiyat 12000 (KDV hariç 10000), alış 6000 (net 5000), komisyon 1200 (net 1000),
// kargo 1200 (net 1000), reklam 500 => iade yokken kâr 10000-5000-1000-1000-500 = 2500.
const base = {
  channel: "a", salePriceKurus: 12000, purchaseCostKurus: 6000, purchaseVatBp: 2000,
  shippingKurus: 1200, returnRateBp: 0, adCostPerSaleKurus: 500,
};

describe("computeProfit", () => {
  it("KDV indirimli, iadesiz", () => {
    const r = computeProfit(base, rates());
    expect(r.revenueNetKurus).toBe(10000);
    expect(r.profitIfKeptKurus).toBe(2500);
    expect(r.expectedProfitKurus).toBe(2500);
    expect(r.netMarginBp).toBe(2500);
  });
  it("%10 iade: (2500*9000 - 2500*1000)/10000 = 2000", () => {
    const r = computeProfit({ ...base, returnRateBp: 1000 }, rates());
    expect(r.lossIfReturnedKurus).toBe(-2500);
    expect(r.expectedProfitKurus).toBe(2000);
    expect(r.netMarginBp).toBe(2000);
  });
  it("KDV indirilmezse gider KDV dahil: 10000-6000-1200-1200-500 = 1100", () => {
    expect(computeProfit(base, rates({ deductInputVat: false })).profitIfKeptKurus).toBe(1100);
  });
  it("stopaj açıkken cironun %1'i (100) düşer", () => {
    const r = computeProfit(base, rates({ applyWithholding: true, withholdingBp: 100 }));
    expect(r.breakdown.withholding).toBe(100);
    expect(r.profitIfKeptKurus).toBe(2400);
  });
  it("hedef marj", () => {
    expect(computeProfit({ ...base, targetMarginBp: 2500 }, rates()).meetsTarget).toBe(true);
    expect(computeProfit({ ...base, targetMarginBp: 2501 }, rates()).meetsTarget).toBe(false);
    expect(computeProfit(base, rates()).meetsTarget).toBeNull();
  });
  it("eksik oran hata verir ve alanı söyler", () => {
    expect(() => computeProfit({ ...base, channel: "eksik" }, rates())).toThrow(RatesMissingError);
    try { computeProfit({ ...base, channel: "eksik" }, rates()); } catch (e) {
      expect((e as RatesMissingError).missing).toEqual(["channels.eksik.commissionBp"]);
    }
  });
  it("bilinmeyen kanal ve boş ayar hata verir", () => {
    expect(() => computeProfit({ ...base, channel: "yok" }, rates())).toThrow(/channels\.yok/);
    expect(() => computeProfit(base, rates({ deductInputVat: null }))).toThrow(/deductInputVat/);
  });
  it("tamamen boş oran dosyası hata verir", () => {
    const empty: Rates = { updatedAt: null, settings: { deductInputVat: null, applyWithholding: null, withholdingBp: null }, channels: {} };
    expect(() => computeProfit(base, empty)).toThrow(RatesMissingError);
  });
  it("geçersiz girdiyi reddeder (ondalık kuruş)", () => {
    expect(() => computeProfit({ ...base, salePriceKurus: 120.5 }, rates())).toThrow();
  });
});

describe("compareChannels", () => {
  it("hazır kanal sonuç, eksik kanal hata satırı döner", () => {
    const { channel: _c, ...b } = base;
    const out = compareChannels(b, rates());
    expect(out[0]).toMatchObject({ channel: "a", ok: true });
    expect(out[1]).toEqual({ channel: "eksik", ok: false, missing: ["channels.eksik.commissionBp"] });
  });
});

describe("ratesStatus", () => {
  it("eski tarih bayat sayılır, null bayat sayılır", () => {
    expect(ratesStatus(rates(), new Date("2026-10-17")).stale).toBe(false);
    expect(ratesStatus({ ...rates(), updatedAt: "2026-01-01" }, new Date("2026-10-17")).stale).toBe(true);
    expect(ratesStatus({ ...rates(), updatedAt: null }).stale).toBe(true);
  });
  it("kanal hazırlığı", () => {
    const s = ratesStatus(rates());
    expect(s.channels.a?.ready).toBe(true);
    expect(s.channels.eksik?.ready).toBe(false);
  });
});
