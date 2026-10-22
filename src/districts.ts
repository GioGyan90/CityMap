import { rnd, rr, pick } from './random';
import { makeBuilding, type BuildingStyle } from './buildings';

export const RES_BASES = ['#fff9ed', '#fff1d9', '#e9f7ff', '#ffe0d2', '#edf5df', '#f9e8ee', '#fff0ce', '#e0f3fa', '#ffe8dc'];
export const RES_WINS = ['#4a7ea8', '#3f6f96', '#5a86ad', '#456b8d', '#557f9e'];
export const ROOF_COLS = [0xd5794d, 0x237fae, 0x298da5, 0xc77249, 0x286c96, 0xdf904b, 0x598d79];

/** Each district has its own massing, height range and palette. */
export function fillBlock(bx: number, bz: number) {
  const financial = bz >= -122 && bz <= -80 && bx >= 8 && bx <= 118;
  if (financial) {
    const signature = bx === 36 && bz === -108;
    const style: BuildingStyle = signature ? 'artdeco' : pick(['glass','stepped','round','artdeco'] as const);
    makeBuilding({ x:bx-2,z:bz-2,w:rr(10,14),d:rr(10,13),h:signature?82:rr(bx>70?24:35,bx>70?45:68),
      style,base:pick(['#edf5f8','#fff3de','#d4e8f2']),win:'#3d7e9e',roof:0x315e84 });
    makeBuilding({ x:bx+7,z:bz+7,w:5,d:5,h:rr(9,17),style:'arcade',base:'#ede1cc',roof:0x355c7b });
    return;
  }
  const coastal = bx < 24 && bz > 74;
  const oldTown = (bx < 62 && bz >= -52 && bz <= 60);
  const suburb = bx >= 130 || bz > 116 || bz < -122;
  // Fewer, larger courtyard blocks in the middle; sparse garden villas at the hills.
  if (!coastal && !oldTown && !suburb && bz>=-52 && bz<=88) {
    makeBuilding({x:bx-2,z:bz-3,w:16,d:9,h:rr(13,25),style:'apartment',base:pick(RES_BASES),roof:0x486a83});
    if(rnd()>.4)makeBuilding({x:bx+5,z:bz+7,w:7,d:5,h:rr(6,10),style:'arcade',base:'#eedcbb',roof:0x396a85});
    return;
  }
  const slots = coastal ? [[-5,-5],[6,5]] : suburb ? [[-5,-4],[6,6]] : [[-6,-6],[6,-6],[-6,6],[6,6]];
  for (const [sx,sz] of slots) {
    if (rnd() > (suburb ? .62 : oldTown ? .84 : .9)) continue;
    const style: BuildingStyle = coastal ? pick(['villa','arcade','pitched'] as const)
      : oldTown ? pick(['arcade','apartment','pitched','flat'] as const)
      : suburb ? pick(['villa','pitched','apartment','warehouse'] as const)
      : pick(['apartment','glass','stepped','flat'] as const);
    const h = coastal ? rr(7,15) : oldTown ? rr(8,18) : suburb ? rr(5,13) : rr(15,34);
    makeBuilding({x:bx+sx+rr(-.65,.65),z:bz+sz+rr(-.6,.6),w:rr(6,8.2),d:rr(6,8.2),h,style,ry:suburb?rr(-.12,.12):0,
      base:pick(RES_BASES),win:pick(RES_WINS),roof:pick(ROOF_COLS),lit:.25});
  }
}
