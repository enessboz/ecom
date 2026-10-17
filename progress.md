# İlerleme

## Yapıldı
- S1 iskele: pnpm workspace, `packages/core`, `packages/mcp`, TypeScript + vitest. `scripts/check.sh` (typecheck + test).
- S2 kâr motoru (`core`): kuruş tamsayı, `divRoundHalfEven`, kanal × KDV × gider; eksik oran = `RatesMissingError`. Elle hesaplanmış örneklerle 27 test.
- S3 MCP iskeleti: `rates_status`, `list_rates`, `compute_profit`, `compare_channels` (salt okunur). 5 test + stdio duman testi.
- `data/rates.json` bilerek boş; oranları kullanıcı/mali müşavir doldurur.

## Doğrulanmadı / açık
- Linux'ta denendi; **Windows'ta `pnpm i` + `pnpm test` denenmedi** (S1 kabul ölçütü).
- `.mcp.json` biçimi ve Claude Code'da gerçek sohbetle uçtan uca deneme yapılmadı (S3 kabul ölçütü).
- Hermes (S4), SQLite sürücüsü, toplayıcılar (S5) başlamadı.
- Kâr modelindeki varsayımlar (iade, stopaj, komisyon tabanı) `computeProfit` yorumunda ve sonuçta `assumptions` olarak yazılı; mali müşavirle doğrulanmalı.
