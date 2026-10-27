/** Park layout in metres relative to the relocated park centre. */
export const PARK_CENTER={x:-13,z:-91.4,scale:1.15,verticalScale:1.6,level:3.5974665423};
export const PARK_RIDES={wheel:{x:-14,z:-.6},coaster:{x:3,z:-4.6},carousel:{x:1,z:10.4}};
export const PARK_LOOP:[number,number][]=[[-35,-104],[-29,-110],[-19,-112],[-8,-109],[0,-99],[-3,-86],[-6,-77],[-14,-73],[-26,-73],[-35,-79],[-38,-91]];
export const PARK_LOOP_WIDTH=2.2;
/** Extra planting and parcel reservation, without changing terrain under the railway. */
export function parkExtensionReserved(x:number,z:number,w:number,d:number){return x+w/2>-40&&x-w/2<3&&z+d/2>-114&&z-d/2< -68;}
