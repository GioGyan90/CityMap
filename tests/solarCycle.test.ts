import {airlinerPass,createAirliner} from '../src/airliner';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SolarClock,civilTimestamp,civilParts,formatTime,directionFromAngles,sampleSolar,solarEvents} from '../src/solarCycle';
test('solar directions map SunCalc degree angles to east +X and north -Z',()=>{
 for(const [h,a,want] of [[0,90,[1,0,0]],[0,0,[0,0,-1]],[0,270,[-1,0,0]],[90,0,[0,1,0]]] as [number,number,number[]][]){const d=directionFromAngles(h,a);assert.ok(d.every((v,i)=>Math.abs(v-want[i])<1e-10));}
});
test('accelerated civil clock crosses midnight and year boundaries without resetting or speeding up paused time',()=>{
 const c=new SolarClock();c.seek('2026-12-31',1439);c.setSpeed(360);c.advance(1);assert.deepEqual(civilParts(c.timestamp),{date:'2027-01-01',minutes:5});assert.equal(formatTime(c.timestamp),'00:05');const t=c.timestamp;c.playing=false;c.advance(60);assert.equal(c.timestamp,t);c.playing=true;c.advance(NaN);c.advance(-1);assert.equal(c.timestamp,t);assert.throws(()=>c.setSpeed(12));assert.throws(()=>civilTimestamp('2026-02-30',60));assert.throws(()=>civilTimestamp('2026-09-22',NaN));
});
test('astronomical sunlight rises in the east, sets in the west and vanishes below the horizon',()=>{
 const date='2026-09-22',morning=sampleSolar(civilTimestamp(date,420)),noon=sampleSolar(civilTimestamp(date,720)),evening=sampleSolar(civilTimestamp(date,1020)),midnight=sampleSolar(civilTimestamp(date,0));assert.ok(morning.sunDirection[0]>.5);assert.ok(evening.sunDirection[0]<-.5);assert.ok(noon.sun.altitude>45&&noon.direct>1.4);assert.equal(midnight.direct,0);assert.equal(midnight.night,1);
 const events=solarEvents(civilTimestamp(date,720));assert.ok(events.sunrise&&events.sunset);assert.ok(civilParts(+events.sunrise!).minutes>300&&civilParts(+events.sunrise!).minutes<420);assert.ok(civilParts(+events.sunset!).minutes>1020&&civilParts(+events.sunset!).minutes<1140);
 const summer=solarEvents(civilTimestamp('2026-06-21',720)),winter=solarEvents(civilTimestamp('2026-12-21',720));assert.ok(+summer.sunset!-+summer.sunrise!>+winter.sunset!-+winter.sunrise!+3*3600000,'season changes actual daylight duration');
});
test('a complete day has finite lighting and continuous sunrise, sunset and midnight transitions',()=>{
 const start=civilTimestamp('2026-09-22',0);for(let minute=0;minute<=1440;minute+=15){const s=sampleSolar(start+minute*60000);for(const v of [...s.sunDirection,...s.moonDirection,s.sun.altitude,s.direct,s.daylight,s.night,s.warm,s.moonFraction])assert.ok(Number.isFinite(v));assert.ok(s.direct>=0&&s.direct<=1.8);for(const v of [s.daylight,s.night,s.warm,s.moonFraction])assert.ok(v>=0&&v<=1);assert.ok(Math.abs(Math.hypot(...s.sunDirection)-1)<1e-10);if(s.sun.altitude<=0)assert.equal(s.direct,0);}
 const e=solarEvents(start+12*3600000);for(const t of [+e.sunrise!,+e.sunset!,start+24*3600000]){const a=sampleSolar(t-500),b=sampleSolar(t+500);assert.ok(a.sunDirection.every((v,i)=>Math.abs(v-b.sunDirection[i])<.001));assert.ok(Math.abs(a.night-b.night)<.001);assert.ok(Math.abs(a.direct-b.direct)<.001);}
});

test('twilight persists below the horizon, clears by full day/night and remains continuous across seasons',async()=>{
 const {twilightProfile}=await import('../src/twilight');
 for(const az of [90,270]){
  assert.equal(twilightProfile(25,az).glow,0);
  assert.equal(twilightProfile(-15,az).glow,0);
  assert.ok(twilightProfile(-4,az).glow>.9,'afterglow survives sunset');
  assert.ok(twilightProfile(0,az).glow>.9,'sunrise/sunset has full colour');
 }
 assert.notEqual(twilightProfile(0,90).horizon,twilightProfile(0,270).horizon,'dawn and dusk have different art direction');
 for(const date of ['2026-03-21','2026-06-21','2026-09-23','2026-12-21']){
  const start=civilTimestamp(date,0);let previous=twilightProfile(sampleSolar(start).sun.altitude,0).glow;
  for(let minute=1;minute<=1440;minute++){
   const s=sampleSolar(start+minute*60000),p=twilightProfile(s.sun.altitude,s.sun.azimuth);
   assert.ok(Number.isFinite(p.glow)&&p.glow>=0&&p.glow<=1);
   assert.ok(Math.abs(p.glow-previous)<.06,'no one-minute flashes at colour boundaries');previous=p.glow;
  }
 }
});


test('airliner has exactly two daily timed passes and a shadow-casting assembly',()=>{
  for(let m=0;m<1440;m++) assert.equal(airlinerPass(m)!==null,(m>=540&&m<576)||(m>=900&&m<936));
  assert.equal(airlinerPass(558),.5);assert.equal(airlinerPass(918),.5);
  const plane=createAirliner();assert.deepEqual(plane.children.map(c=>c.name),['fuselage','wings','engines','tail','details']);
  let meshes=0;plane.traverse(o=>{if('isMesh' in o){meshes++;assert.equal((o as any).castShadow,true);}});assert.ok(meshes>0);
});
