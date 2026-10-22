import * as SunCalc from 'suncalc';
/** Fictional coastal city: +X east, -Z north. SunCalc 2.x angles are degrees. */
export const SOLAR_SITE={latitude:34,longitude:135,utcOffsetMinutes:540};
export const INITIAL_DATE='2026-09-22';
export const TIME_SPEEDS=[1,60,360,1440] as const;
const rad=Math.PI/180;
export function smooth(a:number,b:number,x:number){const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);}
export function directionFromAngles(altitude:number,azimuth:number):[number,number,number]{const h=altitude*rad,a=azimuth*rad;return [Math.cos(h)*Math.sin(a),Math.sin(h),-Math.cos(h)*Math.cos(a)];}
export function civilParts(timestamp:number){const d=new Date(timestamp+SOLAR_SITE.utcOffsetMinutes*60000);return {date:d.toISOString().slice(0,10),minutes:d.getUTCHours()*60+d.getUTCMinutes()+d.getUTCSeconds()/60};}
export function civilTimestamp(date:string,minutes:number){if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(minutes)||minutes<0||minutes>=1440)throw Error('日期或时间无效');const t=Date.parse(date+'T00:00:00Z');if(!Number.isFinite(t)||new Date(t).toISOString().slice(0,10)!==date)throw Error('日期无效');return t-SOLAR_SITE.utcOffsetMinutes*60000+minutes*60000;}
export function formatTime(timestamp:number){const m=Math.floor(civilParts(timestamp).minutes);return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;}
export class SolarClock{
 timestamp=civilTimestamp(INITIAL_DATE,600);speed:number=360;playing=true;
 advance(seconds:number){if(this.playing&&Number.isFinite(seconds)&&seconds>0)this.timestamp+=seconds*this.speed*1000;return this.timestamp;}
 seek(date:string,minutes:number){this.timestamp=civilTimestamp(date,minutes);}
 setSpeed(speed:number){if(!TIME_SPEEDS.includes(speed as typeof TIME_SPEEDS[number]))throw Error('不支持的速度');this.speed=speed;}
}
export function solarEvents(timestamp:number){return SunCalc.getTimes(new Date(timestamp),SOLAR_SITE.latitude,SOLAR_SITE.longitude,0,SOLAR_SITE.utcOffsetMinutes);}
export function sampleSolar(timestamp:number){
 const date=new Date(timestamp),sun=SunCalc.getPosition(date,SOLAR_SITE.latitude,SOLAR_SITE.longitude),moon=SunCalc.getMoonPosition(date,SOLAR_SITE.latitude,SOLAR_SITE.longitude),phase=SunCalc.getMoonIllumination(date);
 const daylight=smooth(-6,12,sun.altitude),night=1-smooth(-9,1,sun.altitude),warm=(1-smooth(5,28,sun.altitude))*smooth(-4,2,sun.altitude),direct=smooth(0,4,sun.altitude)*( .55+1.25*Math.sqrt(Math.max(0,Math.sin(sun.altitude*rad))));
 return {sun,moon,sunDirection:directionFromAngles(sun.altitude,sun.azimuth),moonDirection:directionFromAngles(moon.altitude,moon.azimuth),moonFraction:phase.fraction,daylight,night,warm,direct,moonVisibility:smooth(-1,4,moon.altitude),phase:sun.altitude< -9?'深夜':sun.altitude< -1?'曙暮光':sun.altitude<10?(sun.azimuth<180?'日出':'日落'):sun.altitude<25?'晨昏':'白天'};
}
