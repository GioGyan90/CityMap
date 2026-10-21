import { rnd, rr, pick } from './random';
import { makeBuilding, type BuildingStyle } from './buildings';

export const RES_BASES = ['#f6ede0', '#ffe6c4', '#e8f1f8', '#ffdcd2', '#e4f3e2', '#ded7f3', '#fceaba', '#e1e9f2', '#f7e2ea'];
export const RES_WINS = ['#4a7ea8', '#3f6f96', '#5a86ad', '#456b8d', '#557f9e'];
export const ROOF_COLS = [0xb5543f, 0x365b83, 0x3f6f8c, 0x9b5f4a, 0x50657f, 0xc4703f, 0x6d8a72];

/** Each district has its own massing, height range and palette. */
export function fillBlock(bx: number, bz: number) {
  const financial = bz >= -122 && bz <= -80 && bx >= 8 && bx <= 118;
  if (financial) {
    const signature = bx === 36 && bz === -108;
    const style: BuildingStyle = signature ? 'artdeco' : pick(['glass','stepped','round','artdeco'] as const);
    makeBuilding({ x:bx-2,z:bz-2,w:rr(10,14),d:rr(10,13),h:signature?91:rr(37,69),
      style,base:pick(['#d9e6e9','#f1e2c3','#c1d7de']),win:'#3d7e9e',roof:0x315e84 });
    makeBuilding({ x:bx+7,z:bz+7,w:5,d:5,h:rr(9,17),style:'arcade',base:'#ede1cc',roof:0x355c7b });
    return;
  }
  const coastal = bx < 24 && bz > 74;
  const oldTown = (bx < 62 && bz >= -52 && bz <= 60);
  const suburb = bx >= 130 || bz > 116 || bz < -122;
  for (const [sx,sz] of [[-6,-6],[6,-6],[-6,6],[6,6]]) {
    if (rnd() > (suburb ? .82 : .95)) continue;
    const style: BuildingStyle = coastal ? pick(['villa','arcade','pitched'] as const)
      : oldTown ? pick(['arcade','apartment','pitched','flat'] as const)
      : suburb ? pick(['villa','pitched','apartment','warehouse'] as const)
      : pick(['apartment','glass','stepped','flat'] as const);
    const h = coastal ? rr(7,15) : oldTown ? rr(8,18) : suburb ? rr(5,13) : rr(15,34);
    makeBuilding({x:bx+sx,z:bz+sz,w:rr(6.5,8.8),d:rr(6.5,8.8),h,style,
      base:pick(RES_BASES),win:pick(RES_WINS),roof:pick(ROOF_COLS),lit:.25});
  }
}
