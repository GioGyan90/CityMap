import {buildPromenadeRestaurant} from './promenadeRestaurant';
import {buildSiteDetails} from './siteDetails';
import { ZONES, terrainHeight } from './layout';
import { specialBuildings } from './specialBuildings';
import { buildParcels } from './parcels';
import { buildTransport,buildStreetFurniture } from './transport';
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
registerSpecial('market','台球用品市场 · 2 号球馆','球与交叉球杆屋顶雕塑、高低商铺、拱形屋顶与台球用品街',[8,46],[27,18,54],()=>{
  buildMarket(8,32);marketDetails(8,32);
});
registerSpecial('cafe','海风咖啡馆','蓝白条纹遮棚与露天咖啡座',[36,32],[25,17,24],()=>{
  buildCafe(36,32);cafeDetails(36,32);
});
registerSpecial('restaurant','港口海鲜餐厅','红白遮棚、海鲜招牌与海滨露台',[-20,60],[26,17,27],()=>{
  buildRestaurant(-20,60);restaurantDetails(-20,60);
});
registerSpecial('port','码头市场 · 5 号球馆','灯塔、码头市集、候船楼与港口球馆',[-61,96],[42,25,32],()=>{
  buildPort();billiardsHall(-44,100,5);
});
const ship=world.getObjectByName('cruise-ship') as THREE.Group;
world.attach(ship);
registerGroup('cruise','Lucky Break 豪华邮轮','多层观景甲板、泳池、救生艇与蓝色烟囱',ship,[-101,72],[70,28,18]);
registerSpecial('commercial','市中心商业区 · 3 号球馆','蓝金穹顶高楼、玻璃裙楼与精品球馆',[36,-108],[27,100,27],()=>commercialDistrict(36,-108));
registerSpecial('campus','海岸学院','蓝顶学院、庭院与运动场',[144,42],[28,27,58],()=>buildCampus());
registerSpecial('promenade','海滨长廊餐厅','蓝金亭顶、白桌布餐桌、花箱与弧形临海露台',[0,0],[20,13,18],buildPromenadeRestaurant);
buildMountains();

// Move complete facilities with all their details, animation roots and pick bounds.
for(const entry of specialBuildings){
 const zone=ZONES[entry.id];if(!zone)continue;
 const source=entry.group.position.clone();entry.group.userData.sourceCenter=source.toArray();
 const base=zone.level??terrainHeight(zone.x,zone.z);
 entry.group.position.set(zone.x,base,zone.z);const sy=entry.id==='park'?1.6:entry.id==='civic'?1.25:entry.id==='hospital'||entry.id==='hotel'?1.15:1;
 entry.group.scale.set(zone.sx,sy,zone.sz);
 entry.pick.geometry.dispose();entry.group.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(entry.group);
 entry.pick.geometry=new THREE.BoxGeometry(zone.w,Math.max(25,bounds.max.y-base+3),zone.d);
 const height=(entry.pick.geometry as THREE.BoxGeometry).parameters.height;entry.pick.position.set(zone.x,base+height/2,zone.z);entry.radius=Math.max(zone.w,zone.d)*.56;
}
buildSiteDetails();
buildParcels();
plantTrees();buildTransport();buildCars();buildStreetFurniture();buildClouds();
batchBuildings();finalizeOutlines();collectBackgroundBuildings();
world.userData.layoutVersion='peninsula-terrain-v2';

world.userData.zoneLayout=Object.fromEntries(specialBuildings.map(entry=>[entry.id,{position:entry.group.position.toArray(),scale:entry.group.scale.toArray()}]));
