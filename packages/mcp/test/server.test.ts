import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { createServer } from "../src/server.js";

async function connect(rates: object) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "ecom-"));
  await writeFile(path.join(dir, "rates.json"), JSON.stringify(rates));
  const [a, b] = InMemoryTransport.createLinkedPair();
  await createServer(dir).connect(b);
  const client = new Client({ name: "t", version: "0" });
  await client.connect(a);
  return client;
}
const text = (r: any) => JSON.parse(r.content[0].text);

const full = {
  updatedAt: "2026-10-01",
  settings: { deductInputVat: true, applyWithholding: false, withholdingBp: null },
  channels: { a: { label: "A", commissionBp: 1000, commissionVatBp: 2000, saleVatBp: 2000, shippingVatBp: 2000, fixedFeeKurus: 0 } },
};
const args = { salePriceKurus: 12000, purchaseCostKurus: 6000, purchaseVatBp: 2000, shippingKurus: 1200, returnRateBp: 0, adCostPerSaleKurus: 500 };

describe("mcp sunucusu", () => {
  it("dört aracı listeler, hepsi salt okunur", async () => {
    const c = await connect(full);
    const { tools } = await c.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["compare_channels", "compute_profit", "list_rates", "rates_status"]);
    expect(tools.every((t) => t.annotations?.readOnlyHint)).toBe(true);
  });
  it("compute_profit çekirdek sonucu döner", async () => {
    const c = await connect(full);
    const r = text(await c.callTool({ name: "compute_profit", arguments: { channel: "a", ...args } }));
    expect(r.expectedProfitKurus).toBe(2500);
  });
  it("compare_channels", async () => {
    const c = await connect(full);
    const r = text(await c.callTool({ name: "compare_channels", arguments: args }));
    expect(r[0].ok).toBe(true);
  });
  it("boş oran dosyası oran_eksik hatası verir", async () => {
    const c = await connect({ updatedAt: null, settings: { deductInputVat: null, applyWithholding: null, withholdingBp: null }, channels: {} });
    const res: any = await c.callTool({ name: "compute_profit", arguments: { channel: "a", ...args } });
    expect(res.isError).toBe(true);
    expect(text(res).error).toBe("oran_eksik");
    const st = text(await c.callTool({ name: "rates_status", arguments: {} }));
    expect(st.stale).toBe(true);
    expect(st.settingsMissing.length).toBeGreaterThan(0);
  });
  it("geçersiz girdiyi reddeder", async () => {
    const c = await connect(full);
    const res: any = await c.callTool({ name: "compute_profit", arguments: { channel: "a", ...args, salePriceKurus: 1.5 } });
    expect(res.isError).toBe(true);
  });
});
