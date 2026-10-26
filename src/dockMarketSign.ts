import * as THREE from 'three';
import {kit} from './referenceArchitecture';

// The same raised square-pixel construction as the police station sign.
export function createDockMarketSign(){
 const root=new THREE.Group();root.name='dock-market-pixel-sign';root.userData.signText='DOCK MARKET';const k=kit(root);
 k.box(17,3,.24,0x245875).name='dock-market-sign-board';
 for(const x of [-7.6,7.6])k.box(.18,4,.18,0x547680,x,-3.5,0).name='dock-market-sign-post';
 for(const y of [-1.4,1.4])k.box(16.8,.1,.08,0xe9c775,0,y,.15);
 for(const x of [-8.35,8.35])k.box(.1,2.8,.08,0xe9c775,x,0,.15);
 const glyphs:Record<string,string>={D:'11110/10001/10001/10001/10001/10001/11110',O:'01110/10001/10001/10001/10001/10001/01110',C:'01111/10000/10000/10000/10000/10000/01111',K:'10001/10010/10100/11000/10100/10010/10001',M:'10001/11011/10101/10101/10001/10001/10001',A:'01110/10001/10001/11111/10001/10001/10001',R:'11110/10001/10001/11110/10100/10010/10001',E:'11111/10000/10000/11110/10000/10000/11111',T:'11111/00100/00100/00100/00100/00100/00100'};
 for(const [letter,char]of [...root.userData.signText as string].entries()){
  if(char===' ')continue;
  for(const [row,line]of glyphs[char].split('/').entries())for(let col=0;col<5;col++)if(line[col]==='1')k.box(.19,.19,.05,0xfff4d4,-6.38+letter*1.32+col*.22,.66-row*.22,.17).name='dock-market-letter-pixel';
 }
 return root;
}
