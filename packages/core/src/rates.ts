import { z } from "zod";

const nullableBp = z.number().int().min(0).max(100000).nullable();

export const channelRatesSchema = z.object({
  label: z.string(),
  commissionBp: nullableBp,
  commissionVatBp: nullableBp,
  saleVatBp: nullableBp,
  shippingVatBp: nullableBp,
  fixedFeeKurus: z.number().int().min(0).nullable(),
});

export const ratesSchema = z.object({
  updatedAt: z.string().nullable(),
  settings: z.object({
    deductInputVat: z.boolean().nullable(),
    applyWithholding: z.boolean().nullable(),
    withholdingBp: nullableBp,
  }),
  channels: z.record(z.string(), channelRatesSchema),
});

export type Rates = z.infer<typeof ratesSchema>;
export type ChannelRates = z.infer<typeof channelRatesSchema>;

export class RatesMissingError extends Error {
  constructor(public readonly missing: string[]) {
    super(`Eksik oran/ayar: ${missing.join(", ")}`);
    this.name = "RatesMissingError";
  }
}

const CHANNEL_FIELDS = ["commissionBp", "commissionVatBp", "saleVatBp", "shippingVatBp", "fixedFeeKurus"] as const;

/** Bir kanal için hesaba lazım olup eksik olan oran/ayar adları. Kanal yoksa tek madde döner. */
export function missingForChannel(rates: Rates, channelId: string): string[] {
  const missing: string[] = [];
  const s = rates.settings;
  if (s.deductInputVat === null) missing.push("settings.deductInputVat");
  if (s.applyWithholding === null) missing.push("settings.applyWithholding");
  if (s.applyWithholding === true && s.withholdingBp === null) missing.push("settings.withholdingBp");
  const ch = rates.channels[channelId];
  if (!ch) return [...missing, `channels.${channelId}`];
  for (const f of CHANNEL_FIELDS) if (ch[f] === null) missing.push(`channels.${channelId}.${f}`);
  return missing;
}

export const STALE_AFTER_DAYS = 90;

export interface RatesStatus {
  updatedAt: string | null;
  stale: boolean;
  settingsMissing: string[];
  channels: Record<string, { ready: boolean; missing: string[] }>;
}

export function ratesStatus(rates: Rates, now: Date = new Date()): RatesStatus {
  let stale = true;
  if (rates.updatedAt) {
    const t = Date.parse(rates.updatedAt);
    stale = Number.isNaN(t) || now.getTime() - t > STALE_AFTER_DAYS * 86_400_000;
  }
  const channels: RatesStatus["channels"] = {};
  for (const id of Object.keys(rates.channels)) {
    const missing = missingForChannel(rates, id);
    channels[id] = { ready: missing.length === 0, missing };
  }
  const settingsMissing = missingForChannel(rates, "__none__").filter((m) => m.startsWith("settings."));
  return { updatedAt: rates.updatedAt, stale, settingsMissing, channels };
}
