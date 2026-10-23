import {createRoadTunnel} from './roadTunnels';
import {buildTrafficInfrastructure} from './trafficInfrastructure';
import {createResidentialCliff} from './residentialCliff';
import {createBeachFishMarket} from './beachFishMarket';
import {HALL_THEMES,createThemedHall} from './themedHalls';
import {auditPlacedPlants} from './plantPlacement';
import {buildSuppliesMarket} from './billiardsArchitecture';
import {buildBilliardsAccess,buildFishMarketTramCrossing} from './billiardsAccess';
import {buildCargoHarbor,buildPassengerHarbor,buildHarborAccess} from './harbors';
import {buildCruiseShip} from './cruiseShip';
import {buildCoastalRealm} from './coastalRealm';
import {buildHillAccess} from './hillAccess';
import {referenceHotel,referenceHospital} from './referenceLandmarks';
import {buildPromenadeRestaurant} from './promenadeRestaurant';
import {buildSiteDetails} from './siteDetails';
import { ZONES, terrainHeight } from './layout';
import { specialBuildings } from './specialBuildings';
import { buildParcels } from './parcels';
import { buildTransport,buildStreetFurniture,transit } from './transport';
import * as THREE from 'three';
import { registerSpecial, registerGroup, collectBackgroundBuildings } from './specialBuildings';
import { billiardsHall, marketDetails, commercialDistrict, hospitalDetails, hotelDetails, restaurantDetails, cafeDetails } from './conceptDetails';
import { rr, pick } from "./random";
import { finalizeOutlines, makeBuilding, batchBuildings } from "./buildings";
import { RES_BASES, RES_WINS, ROOF_COLS, fillBlock } from "./districts";
import { buildAmusement } from "./amusement";
import { buildGovernment, buildHospital, buildHotel, buildMarket, buildCafe, buildRestaurant } from "./landmarks";
import {buildHillVilla} from './hillVilla';
import { buildPort,buildLighthouse } from "./port";
import { buildMountains } from "./mountains";
import { plantTrees } from "./vegetation";
import { world } from "./scene";
import { buildCars } from "./traffic";
import { buildUrbanDetails, buildCampus } from "./urbanDetails";
import { buildClouds } from "./clouds";

/* Each landmark is an independent ground-pivoted root for focus animation. */
registerSpecial('park','海滨游乐场','摩天轮、过山车与旋转木马',[-20,-24],[25,28,28],()=>{
  buildAmusement(-20,-24);
});
registerSpecial('civic','政府广场','蓝色穹顶、柱廊与中央喷泉',[8,4],[27,27,27],()=>buildGovernment(8,4));
registerSpecial('hospital','医院学院区','蓝白医院与屋顶停机坪',[36,-10],[27,25,54],()=>{
  referenceHospital(36,-24);
});
registerSpecial('hotel','海滨酒店','蓝金穹顶、拱窗阳台、入口雨棚与喷泉花园',[-20,32],[28,32,26],()=>{
  referenceHotel(-20,32);
});
registerSpecial('market','台球用品市场','拱洞橱窗、用品展架、球杆与三角球架的室外展示区',[0,0],[30,20,28],buildSuppliesMarket);
for(const t of HALL_THEMES){const hall=createThemedHall(t.theme);world.add(hall);registerGroup(t.id,t.name,t.description,hall,[0,0],[18,14,22]);}
const beachMarket=createBeachFishMarket();world.add(beachMarket);registerGroup('fishmarket','码头鱼市','木屋、帆布鱼摊、竹筐、木板桌与小渔船码头',beachMarket,[0,0],[24,12,42]);
registerSpecial('cafe','海风咖啡馆','奶油石墙、蓝色百叶窗、花箱与波浪遮棚的老城咖啡馆',[36,32],[25,17,24],()=>{
  buildCafe(36,32);
});
registerSpecial('restaurant','港口海鲜餐厅','红白遮棚、海鲜招牌与海滨露台',[-20,60],[26,17,27],()=>{
  buildRestaurant(-20,60);restaurantDetails(-20,60);
});
registerSpecial('port','码头市场','渔船栈桥与鲜鱼摊位',[0,0],[50,25,38],()=>{
  buildPort();
});
registerSpecial('villa','山麓别墅','坡屋顶、阳台、庭院与独立入户台阶',[0,0],[20,18,24],buildHillVilla);
registerSpecial('lighthouse','海岬灯塔','独立海岸山头、红白塔身与观海灯室',[0,0],[18,24,18],buildLighthouse);
registerSpecial('cargo','集装箱货运码头','独立货场、集装箱与装卸起重机',[0,0],[56,24,34],buildCargoHarbor);
registerSpecial('passenger','邮轮客运码头','候船大厅、旅客雨棚与登船廊桥',[0,0],[66,15,35],buildPassengerHarbor);
const ship=buildCruiseShip();
world.attach(ship);
registerGroup('cruise','Lucky Break 豪华邮轮','弧形船首、蓝窗观景甲板、救生艇与条纹烟囱',ship,[-101,72],[70,28,18]);
registerSpecial('commercial','市中心商业区','蓝金穹顶高楼与玻璃裙楼',[36,-108],[27,100,27],()=>commercialDistrict(36,-108));
registerSpecial('campus','海岸学院','蓝顶学院、庭院与运动场',[144,42],[28,27,58],()=>buildCampus());
registerSpecial('promenade','海滨长廊餐厅','蓝金亭顶、白桌布餐桌、花箱与弧形临海露台',[0,0],[20,13,18],buildPromenadeRestaurant);
buildMountains();

// Move complete facilities with all their details, animation roots and pick bounds.
for(const entry of specialBuildings){
 const zone=ZONES[entry.id];if(!zone)continue;
 const source=entry.group.position.clone();entry.group.userData.sourceCenter=source.toArray();
 const base=zone.level??terrainHeight(zone.x,zone.z);
 entry.group.position.set(zone.x,base,zone.z);const sy=entry.id==='park'?1.6:entry.id==='civic'?1.25:entry.id==='hospital'||entry.id==='hotel'?1.15:1;
 entry.group.scale.set(zone.sx,sy,zone.sz);entry.group.rotation.y=zone.ry??0;
 entry.pick.geometry.dispose();entry.group.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(entry.group);
 entry.pick.geometry=new THREE.BoxGeometry(zone.w,Math.max(25,bounds.max.y-base+3),zone.d);
 const height=(entry.pick.geometry as THREE.BoxGeometry).parameters.height;entry.pick.position.set(zone.x,base+height/2,zone.z);entry.radius=Math.max(zone.w,zone.d)*.56;
}
world.add(createRoadTunnel());
buildHarborAccess();
buildBilliardsAccess();
buildHillAccess();
buildCoastalRealm();
const residentialCliff=createResidentialCliff();world.add(residentialCliff);
buildSiteDetails();
buildTransport();
buildParcels();buildFishMarketTramCrossing(transit[0].curve);buildCars();buildStreetFurniture();buildTrafficInfrastructure();plantTrees();buildClouds();
auditPlacedPlants(world);
batchBuildings();finalizeOutlines();collectBackgroundBuildings();
world.userData.layoutVersion='peninsula-terrain-v2';

world.userData.zoneLayout=Object.fromEntries(specialBuildings.map(entry=>[entry.id,{position:entry.group.position.toArray(),scale:entry.group.scale.toArray()}]));
