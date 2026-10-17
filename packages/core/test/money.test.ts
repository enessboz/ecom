import { describe, expect, it } from "vitest";
import { divRoundHalfEven, mulBp, splitVat } from "../src/index.js";

describe("divRoundHalfEven", () => {
  it.each([
    [5, 2, 2], [7, 2, 4], [3, 2, 2], [1, 2, 0], [4, 2, 2], [10, 3, 3], [11, 3, 4],
    [-5, 2, -2], [-3, 2, -2], [-1, 2, 0], [-7, 3, -2],
  ])("%i / %i = %i", (n, d, want) => expect(divRoundHalfEven(n, d)).toBe(want));
  it("geçersiz girdide hata verir", () => {
    expect(() => divRoundHalfEven(1.5, 2)).toThrow(RangeError);
    expect(() => divRoundHalfEven(1, 0)).toThrow(RangeError);
  });
});

describe("mulBp / splitVat", () => {
  it("mulBp", () => expect(mulBp(12000, 1000)).toBe(1200));
  it("splitVat tam bölünür", () => expect(splitVat(12000, 2000)).toEqual({ net: 10000, vat: 2000 }));
  it("splitVat yuvarlar, toplam korunur", () => {
    const s = splitVat(1, 2000);
    expect(s.net + s.vat).toBe(1);
    expect(s.net).toBe(1);
  });
});
