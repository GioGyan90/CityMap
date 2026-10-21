import { rnd, rr, pick, clamp } from "./random";
import { makeBuilding } from "./buildings";

export const RES_BASES = ['#f6ede0', '#ffe6c4', '#e8f1f8', '#ffdcd2', '#e4f3e2', '#ded7f3', '#fceaba', '#e1e9f2', '#f7e2ea'];
export const RES_WINS = ['#4a7ea8', '#3f6f96', '#5a86ad', '#456b8d', '#557f9e'];
export const ROOF_COLS = [0xb5543f, 0x7a8ca8, 0x3f6f8c, 0x9b5f4a, 0x50657f, 0xc4703f, 0x6d8a72];

export function fillBlock(bx, bz, opt: { minH?: number; hMul?: number; maxH?: number; pitched?: boolean } = {}) {
  const minH = opt.minH ?? 6;
  const maxH = opt.maxH ?? 16;
  const pitched = opt.pitched ?? rnd() < 0.35;
  const slots = [[-6, -6], [6, -6], [-6, 6], [6, 6]];

  for (const [sx, sz] of slots) {
    if (rnd() > 0.86) continue;
    const w = rr(6, 8.6);
    const d = rr(6, 8.6);
    const dist = Math.hypot(bx + sx, bz + sz);
    const hBase = clamp(10 + (1 - dist / 110) * 16, 7, 28);
    const h = clamp(rr(hBase * 0.65, hBase * 1.25) * (opt.hMul ?? 1), minH, maxH);

    makeBuilding({
      x: bx + sx + rr(-0.8, 0.8),
      z: bz + sz + rr(-0.8, 0.8),
      w, d, h,
      ry: rr(-0.07, 0.07),
      base: pick(RES_BASES),
      win: pick(RES_WINS),
      roof: pick(ROOF_COLS),
      lit: rr(0.15, 0.4),
      style: (pitched && h < 14) ? 'pitched' : 'flat'
    });
  }
}

