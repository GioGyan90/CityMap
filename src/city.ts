import { rr, pick } from "./random";
import { Z0, COAST, BEACH_W, Z1 } from "./config";
import { finalizeOutlines, makeBuilding } from "./buildings";
import { RES_BASES, RES_WINS, ROOF_COLS, fillBlock } from "./districts";
import { buildAmusement } from "./amusement";
import { buildGovernment, buildHospital, buildHotel, buildMarket, buildCafe, buildRestaurant } from "./landmarks";
import { buildPort } from "./port";
import { buildMountains } from "./mountains";
import { blocked, plantTrees } from "./vegetation";
import { buildCars } from "./traffic";
import { buildClouds } from "./clouds";

/* 地标 */
buildAmusement(-20, -24);
buildGovernment(8, 4);
buildHospital(36, -24);
buildHotel(-20, 32);
buildMarket(8, 32);
buildCafe(36, 32);
buildRestaurant(-20, 60);
buildPort();
buildMountains();

/* 住宅与商业填充 */
export const BLOCK_X = [-20, 8, 36, 62];
export const BLOCK_Z = [-52, -24, 4, 32, 60];
export const RESERVED = new Set(["-20,-24", "8,4", "36,-24", "-20,32", "8,32", "36,32", "-20,60"]);

for (const bx of BLOCK_X) {
  for (const bz of BLOCK_Z) {
    if (RESERVED.has(`${bx},${bz}`)) continue;
    const far = Math.hypot(bx, bz);
    fillBlock(bx, bz, {
      maxH: far > 90 ? 14 : (far > 60 ? 20 : 30),
      pitched: far > 90
    });
  }
}

/* 城市外围零散小楼 */
for (let i = 0; i < 26; i++) {
  const x = rr(-30, 86);
  const z = rr(Z0 + 10, Z1 - 10);
  if (x < COAST(z) + BEACH_W + 2) continue;
  if (blocked(x, z)) continue;
  makeBuilding({
    x, z,
    w: rr(5, 8), d: rr(5, 8), h: rr(5, 11),
    ry: rr(-0.15, 0.15),
    base: pick(RES_BASES), win: pick(RES_WINS), roof: pick(ROOF_COLS),
    style: 'pitched', lit: 0.2
  });
}

plantTrees();
buildCars();
buildClouds();
finalizeOutlines();

