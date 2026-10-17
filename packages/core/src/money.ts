// Tüm tutarlar kuruş (tamsayı), oranlar baz puan (bp; 10000 = %100).

export function divRoundHalfEven(n: number, d: number): number {
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d) || d <= 0) {
    throw new RangeError(`divRoundHalfEven: geçersiz girdi n=${n} d=${d}`);
  }
  const q = Math.floor(n / d);
  const twiceRem = 2 * (n - q * d);
  if (twiceRem < d) return q;
  if (twiceRem > d) return q + 1;
  return q % 2 === 0 ? q : q + 1;
}

export function mulBp(amount: number, bp: number): number {
  return divRoundHalfEven(amount * bp, 10000);
}

/** KDV dahil tutarı KDV hariç + KDV olarak ayırır. */
export function splitVat(gross: number, vatBp: number): { net: number; vat: number } {
  const net = divRoundHalfEven(gross * 10000, 10000 + vatBp);
  return { net, vat: gross - net };
}
