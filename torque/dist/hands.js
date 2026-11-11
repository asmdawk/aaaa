import * as T from './assets/three.module.js';

// Anatomical mesh: immersive-web/webxr-input-profiles, generic-hand, MIT.
// The source's tracked joints are global siblings. Here they are rebuilt into
// finger chains so the authored skin can wrap around a steering rim.
const Y=new T.Vector3(0,1,0),Z=new T.Vector3(0,0,1);
const clamp=T.MathUtils.clamp;
function skinMaterial(){
 const m=new T.MeshPhysicalMaterial({color:'#bc8c6c',roughness:.54,metalness:0,clearcoat:.07,clearcoatRoughness:.58,reflectivity:.24});
 m.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vHandPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nvHandPosition=position;');s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vHandPosition;').replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nfloat skinPore=sin(vHandPosition.x*3200.0)*sin(vHandPosition.y*2900.0)*sin(vHandPosition.z*3100.0);\nnormal=normalize(normal+vec3(skinPore*.012));\ndiffuseColor.rgb*=.985+skinPore*.012;');};
 m.customProgramCacheKey=()=> 'driver-skin-pores-1';return m;
}
function glbData(buffer){
 const view=new DataView(buffer);if(view.getUint32(0,true)!==0x46546c67)throw Error('Invalid hand GLB');let offset=12,json,bin;
 while(offset<buffer.byteLength){const size=view.getUint32(offset,true),type=view.getUint32(offset+4,true);if(type===0x4e4f534a)json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,offset+8,size)));if(type===0x004e4942)bin=buffer.slice(offset+8,offset+8+size);offset+=8+size;}
 if(!json||!bin)throw Error('Incomplete hand GLB');return {json,bin};
}
function accessor(data,id){
 const a=data.json.accessors[id],v=data.json.bufferViews[a.bufferView],components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type],types={5121:Uint8Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},Type=types[a.componentType];if(!Type)throw Error('Unsupported hand accessor');
 const offset=(v.byteOffset||0)+(a.byteOffset||0),stride=v.byteStride||components*Type.BYTES_PER_ELEMENT,result=new Type(a.count*components);
 if(stride===components*Type.BYTES_PER_ELEMENT)result.set(new Type(data.bin,offset,a.count*components));else for(let i=0;i<a.count;i++)result.set(new Type(data.bin,offset+i*stride,components),i*components);
 return {array:result,itemSize:components,normalized:!!a.normalized};
}
function canonical(v,side){return side==='left'?new T.Vector3(-v.z,-v.y,-v.x):new T.Vector3(v.z,-v.y,v.x);}
function parentName(name){
 if(name==='wrist')return null;if(name.endsWith('-metacarpal'))return 'wrist';
 if(name.startsWith('thumb-'))return ({'thumb-phalanx-proximal':'thumb-metacarpal','thumb-phalanx-distal':'thumb-phalanx-proximal','thumb-tip':'thumb-phalanx-distal'})[name];
 if(name.endsWith('-phalanx-proximal'))return name.replace('-phalanx-proximal','-metacarpal');
 if(name.endsWith('-phalanx-intermediate'))return name.replace('-phalanx-intermediate','-phalanx-proximal');
 if(name.endsWith('-phalanx-distal'))return name.replace('-phalanx-distal','-phalanx-intermediate');
 if(name.endsWith('-tip'))return name.replace('-tip','-phalanx-distal');return 'wrist';
}
export function buildHandFromGLB(buffer,side='left'){
 const data=glbData(buffer),primitive=data.json.meshes[0].primitives[0],jointIds=data.json.skins[0].joints,wristNode=data.json.nodes.find(n=>n.name==='wrist'),wrist=new T.Vector3(...wristNode.translation),g=new T.BufferGeometry();
 for(const [source,target] of [['POSITION','position'],['NORMAL','normal'],['TEXCOORD_0','uv'],['JOINTS_0','skinIndex'],['WEIGHTS_0','skinWeight']]){const a=accessor(data,primitive.attributes[source]);g.setAttribute(target,new T.BufferAttribute(a.array,a.itemSize,a.normalized));}
 const pos=g.attributes.position,norm=g.attributes.normal,v=new T.Vector3();for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).sub(wrist);v.copy(canonical(v,side));pos.setXYZ(i,v.x,v.y,v.z);v.fromBufferAttribute(norm,i);v.copy(canonical(v,side)).normalize();norm.setXYZ(i,v.x,v.y,v.z);}
 const ind=accessor(data,primitive.indices);g.setIndex(new T.BufferAttribute(ind.array,1));g.computeBoundingSphere();
 const root=new T.Group();root.name=side+'-anatomical-hand';const nodes=jointIds.map(i=>data.json.nodes[i]),bones=nodes.map(n=>{const b=new T.Bone();b.name=n.name;b.userData.rest=canonical(new T.Vector3(...n.translation).sub(wrist),side);return b}),byName=Object.fromEntries(bones.map(b=>[b.name,b]));
 for(const b of bones){const name=parentName(b.name),p=name?byName[name]:null;b.position.copy(b.userData.rest);if(p){b.position.sub(p.userData.rest);p.add(b)}else root.add(b);}
 root.updateMatrixWorld(true);const skeleton=new T.Skeleton(bones),mesh=new T.SkinnedMesh(g,skinMaterial());mesh.name=side+'-hand-skin';root.add(mesh);mesh.bind(skeleton,new T.Matrix4());mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;
 const nailMat=new T.MeshPhysicalMaterial({color:'#d1ad94',roughness:.3,metalness:0,clearcoat:.45,clearcoatRoughness:.3});
 for(const finger of ['thumb','index-finger','middle-finger','ring-finger','pinky-finger']){const b=byName[finger+'-phalanx-distal'];if(!b)continue;const nail=new T.Mesh(new T.SphereGeometry(1,12,8),nailMat);nail.scale.set(finger==='thumb'?.006:.0045,finger==='thumb'?.007:.0065,.0012);nail.position.set(0,.005,.0065);b.add(nail);}
 return {root,mesh,skeleton,bones:byName,side,geometry:g};
}
function taperedGeometry(start=0,end=1,sleeve=false){
 const ringCount=24,radial=32,positions=[],uvs=[],indices=[];
 for(let j=0;j<=ringCount;j++){const t=start+(end-start)*j/ringCount;let radius=.024+.023*Math.pow(t,.73);if(sleeve)radius+=.0035;for(let i=0;i<=radial;i++){const a=i/radial*Math.PI*2,contour=1+.035*Math.cos(a*3+1)*Math.sin(t*Math.PI);positions.push(Math.cos(a)*radius*contour,t,Math.sin(a)*radius*.84*contour);uvs.push(i/radial,t)}}
 for(let j=0;j<ringCount;j++)for(let i=0;i<radial;i++){const a=j*(radial+1)+i,b=a+radial+1;indices.push(a,b,a+1,b,b+1,a+1)}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function makeArm(){const group=new T.Group(),skin=new T.Mesh(taperedGeometry(0,.64),skinMaterial()),sleeveMat=new T.MeshStandardMaterial({color:'#303b43',roughness:.88,metalness:0});const sleeve=new T.Mesh(taperedGeometry(.59,1,true),sleeveMat);group.add(skin,sleeve);skin.castShadow=sleeve.castShadow=true;return group;}
function setGrip(hand,amount,point=false){
 if(!hand)return;const side=hand.side==='left'?1:-1;
 for(const [name,b] of Object.entries(hand.bones)){b.rotation.set(0,0,0);if(name.startsWith('thumb-')){if(name==='thumb-metacarpal')b.rotation.set(-.25*amount,.20*side*amount,-.16*side*amount);if(name==='thumb-phalanx-proximal')b.rotation.x=-.48*amount;if(name==='thumb-phalanx-distal')b.rotation.x=-.45*amount;}else if(name.includes('-phalanx-')){const isIndex=name.startsWith('index-'),curl=point&&isIndex?.12:amount;const f=name.startsWith('pinky')?1.15:name.startsWith('ring')?1.06:1;b.rotation.x=-(name.endsWith('proximal')?.83:name.endsWith('intermediate')?1.12:.62)*curl*f;}}
}
/** Hands are a procedural reach/grasp presentation rig, not motion capture or
 * collision-driven human biomechanics. Target is in the supplied mount's space. */
export class DriverHands{
 constructor(parent){
  this.parent=parent;this.group=new T.Group();this.group.name='driver-hands';parent.add(this.group);this.enabled=true;this.hands={};this.arms={left:makeArm(),right:makeArm()};this.group.add(this.arms.left,this.arms.right);this.group.visible=false;this.loadError=null;this.steer=0;this.reach=0;this.elapsed=0;
  this.ready=Promise.all(['left','right'].map(async side=>{const response=await fetch(new URL(`./assets/hand-${side}.glb`,import.meta.url));if(!response.ok)throw Error('Hand asset failed to load');const hand=buildHandFromGLB(await response.arrayBuffer(),side);this.hands[side]=hand;this.group.add(hand.root)})).then(()=>{this.group.visible=this.enabled;this.update(0,{steer:0,reach:0});return this}).catch(error=>{this.loadError=error;console.error('Driver hand loading:',error);return this});
 }
 setEnabled(value){this.enabled=!!value;this.group.visible=this.enabled&&!!this.hands.left&&!!this.hands.right;return this}
 update(dt,{steer=0,reach=0,target}={}){
  if(!this.hands.left||!this.hands.right)return;const step=clamp(Number(dt)||0,0,.1),smooth=step?1-Math.exp(-step*12):1;this.elapsed+=step;this.steer=T.MathUtils.lerp(this.steer,clamp(Number(steer)||0,-10,10),smooth);this.reach=T.MathUtils.lerp(this.reach,clamp(Number(reach)||0,0,1),smooth);
  const turn=clamp(this.steer*.23,-.85,.85),qTurn=new T.Quaternion().setFromAxisAngle(Z,turn),goal=target?.isVector3?target:new T.Vector3(.28,-.12,-.13);
  for(const side of ['left','right']){const sign=side==='left'?-1:1,hand=this.hands[side],wrist=new T.Vector3(sign*.235,.037,.028).applyQuaternion(qTurn);const base=new T.Quaternion().setFromAxisAngle(Z,side==='left'?-Math.PI/2:Math.PI/2);base.premultiply(qTurn);let grip=.93;
   if(side==='right'&&this.reach>.0001){const targetWrist=goal.clone().add(new T.Vector3(0,-.12,.055)),reachQ=new T.Quaternion().setFromUnitVectors(Y,new T.Vector3(0,.12,-.055).normalize());wrist.lerp(targetWrist,this.reach);base.slerp(reachQ,this.reach);grip=T.MathUtils.lerp(.93,.52,this.reach);}
   hand.root.position.copy(wrist);hand.root.quaternion.copy(base);setGrip(hand,grip,side==='right'&&this.reach>.4);const elbow=new T.Vector3(sign*.32,-.26,.43);const arm=this.arms[side],delta=elbow.clone().sub(wrist);arm.position.copy(wrist);arm.quaternion.setFromUnitVectors(Y,delta.clone().normalize());arm.scale.set(1,delta.length(),1);hand.root.updateMatrixWorld(true);hand.skeleton.update();
  }
 }
 dispose(){this.parent.remove(this.group);this.group.traverse(o=>{o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose()})}
}
