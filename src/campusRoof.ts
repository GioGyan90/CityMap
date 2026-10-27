import * as THREE from 'three';
import {toon} from './materials';

export const CAMPUS_ROOF_PARTS: Record<string,string> = {
  'cornice':'承托檐口', 'hip-roof':'四坡屋面', 'ridge':'屋脊饰件'
};

/** Academy-specific crown. Origin is the top of the tower's upper setback. */
export function createCampusRoof() {
  const root=new THREE.Group(); root.name='campus-roof';
  const cream=toon(0xf4e8ce), blue=toon(0x355a7a), gold=toon(0xd6ad59);
  const add=(parent:THREE.Group,geo:THREE.BufferGeometry,mat:THREE.Material,x:number,y:number,z:number)=>{
    const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
  };
  // The existing flat roof is at y=.18; this inset curb sits on it inside its parapet.
  const cornice=new THREE.Group();cornice.name='cornice';root.add(cornice);
  add(cornice,new THREE.BoxGeometry(5.4,.32,3.28),cream,0,.34,0);
  add(cornice,new THREE.BoxGeometry(5.5,.12,3.38),blue,0,.56,0);
  // Four continuous triangular/trapezoidal planes meet along a short ridge.
  const roof=new THREE.Group();roof.name='hip-roof';root.add(roof);
  const vertices=[-2.75,.62,-1.69, 2.75,.62,-1.69, 2.75,.62,1.69, -2.75,.62,1.69, -1.06,2.18,0, 1.06,2.18,0];
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setIndex([0,4,5,0,5,1, 1,5,2, 2,5,4,2,4,3, 3,4,0, 0,1,2,0,2,3]);geometry.computeVertexNormals();
  // Flat normals keep the low-poly roof planes readable from every direction.
  const flat=geometry.toNonIndexed();geometry.dispose();flat.computeVertexNormals();add(roof,flat,blue,0,0,0);
  const ridge=new THREE.Group();ridge.name='ridge';root.add(ridge);
  add(ridge,new THREE.BoxGeometry(2.24,.12,.16),cream,0,2.2,0);
  for(const x of [-1.02,1.02]) add(ridge,new THREE.CylinderGeometry(.08,.12,.28,8),gold,x,2.39,0);
  return root;
}
