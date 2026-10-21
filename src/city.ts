import { rr, pick } from "./random";
import { Z0, COAST, BEACH_W, Z1 } from "./config";
import { finalizeOutlines, makeBuilding, batchBuildings } from "./buildings";
import { RES_BASES, RES_WINS, ROOF_COLS, fillBlock } from "./districts";
import { buildAmusement } from "./amusement";
import { buildGovernment, buildHospital, buildHotel, buildMarket, buildCafe, buildRestaurant } from "./landmarks";
import { buildPort } from "./port";
import { buildMountains } from "./mountains";
import { blocked, plantTrees } from "./vegetation";
import { buildCars } from "./traffic";
import { buildUrbanDetails } from "./urbanDetails";
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

/* 7 × 11 connected city blocks, with landmarks kept as open reservations. */
export const BLOCK_X = [-20, 8, 36, 62, 88, 116, 144, 172];
export const BLOCK_Z = [-136, -108, -80, -52, -24, 4, 32, 60, 88, 116, 144];
export const RESERVED = new Set([
  '-20,-24','8,4','36,-24','-20,32','8,32','36,32','-20,60',
  '88,32','88,60','144,32','144,60','116,116','62,88'
]);
for (const bx of BLOCK_X) {
  for (const bz of BLOCK_Z) {
    if (!RESERVED.has(`${bx},${bz}`)) fillBlock(bx,bz);
  }
}

/* Transition to small houses and warehouses along the foot of the hills. */
for (let z=-130;z<155;z+=20) {
  makeBuilding({x:205,z,w:rr(7,11),d:rr(7,11),h:rr(5,10),style:z%40===10?'warehouse':'villa',
    base:pick(RES_BASES),roof:pick(ROOF_COLS)});
}
buildUrbanDetails();

plantTrees();
buildCars();
buildClouds();
batchBuildings();
finalizeOutlines();

