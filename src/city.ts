import * as THREE from 'three';
import { registerSpecial, registerGroup, collectBackgroundBuildings } from './specialBuildings';
import { billiardsHall, marketDetails, commercialDistrict, hospitalDetails, hotelDetails, restaurantDetails, cafeDetails } from './conceptDetails';
import { rr, pick } from "./random";
import { finalizeOutlines, makeBuilding, batchBuildings } from "./buildings";
import { RES_BASES, RES_WINS, ROOF_COLS, fillBlock } from "./districts";
import { buildAmusement } from "./amusement";
import { buildGovernment, buildHospital, buildHotel, buildMarket, buildCafe, buildRestaurant } from "./landmarks";
import { buildPort } from "./port";
import { buildMountains } from "./mountains";
import { plantTrees } from "./vegetation";
import { world } from "./scene";
import { buildCars } from "./traffic";
import { buildUrbanDetails, buildCampus } from "./urbanDetails";
import { buildClouds } from "./clouds";

/* Each landmark is an independent ground-pivoted root for focus animation. */
registerSpecial('park','海滨游乐场 · 1 号球馆','摩天轮、过山车、旋转木马与海滨球馆',[-20,-10],[25,28,54],()=>{
  buildAmusement(-20,-24);billiardsHall(-20,4,1);
});
registerSpecial('civic','政府广场','蓝色穹顶、柱廊与中央喷泉',[8,4],[27,27,27],()=>buildGovernment(8,4));
registerSpecial('hospital','医院学院区 · 4 号球馆','蓝白医院、屋顶停机坪与街角球馆',[36,-10],[27,25,54],()=>{
  buildHospital(36,-24);hospitalDetails(36,-24);
});
registerSpecial('hotel','海滨酒店','蓝色坡屋顶、阳台与露天泳池',[-20,32],[28,32,26],()=>{
  buildHotel(-20,32);hotelDetails(-20,32);
});
registerSpecial('market','台球用品市场 · 2 号球馆','遮棚商铺、球杆摊位与台球用品街',[8,46],[27,18,54],()=>{
  buildMarket(8,32);marketDetails(8,32);
});
registerSpecial('cafe','海风咖啡馆','蓝白条纹遮棚与露天咖啡座',[36,32],[25,17,24],()=>{
  buildCafe(36,32);cafeDetails(36,32);
});
registerSpecial('restaurant','港口海鲜餐厅','红白遮棚、海鲜招牌与海滨露台',[-20,60],[26,17,27],()=>{
  buildRestaurant(-20,60);restaurantDetails(-20,60);
});
registerSpecial('port','港口餐饮区 · 5 号球馆','灯塔、码头、候船楼与港口球馆',[-61,96],[42,25,32],()=>{
  buildPort();billiardsHall(-44,100,5);
});
const ship=world.getObjectByName('cruise-ship') as THREE.Group;
world.attach(ship);
registerGroup('cruise','Lucky Break 豪华邮轮','多层观景甲板、泳池、救生艇与蓝色烟囱',ship,[-101,72],[70,28,18]);
registerSpecial('commercial','市中心商业区 · 3 号球馆','蓝金穹顶高楼、玻璃裙楼与精品球馆',[36,-108],[27,100,27],()=>commercialDistrict(36,-108));
registerSpecial('campus','海岸学院','蓝顶学院、庭院与运动场',[144,42],[28,27,58],()=>buildCampus());
buildMountains();

/* 7 × 11 connected city blocks, with landmarks kept as open reservations. */
export const BLOCK_X = [-20, 8, 36, 62, 88, 116, 144, 172];
export const BLOCK_Z = [-136, -108, -80, -52, -24, 4, 32, 60, 88, 116, 144];
export const RESERVED = new Set([
  '-20,-24','8,4','36,-24','-20,32','8,32','36,32','-20,60',
  '-20,4','8,60','36,4','36,-108',
  '8,-24','62,4','88,32','88,60','144,32','144,60','116,116','62,88'
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
collectBackgroundBuildings();

