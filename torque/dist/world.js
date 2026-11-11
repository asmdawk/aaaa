import * as T from './assets/three.module.js';

// A deterministic, unbounded test route. At z=0 both its offset and slope are 0.
// Coordinates are metres; driving forward means travelling toward negative Z.
export function roadCenter(z){return 22*(1-Math.cos(z/230))+10*(1-Math.cos(z/95));}
const WIDTH=4.2,SPAN=256,SEGMENT=6,BEHIND=384,AHEAD=2304;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fract=x=>x-Math.floor(x);
const hash=(i,s=0)=>fract(Math.sin(i*127.1+s*311.7)*43758.5453123);
const slope=z=>22/230*Math.sin(z/230)+10/95*Math.sin(z/95);
function terrainHeight(x,z){const d=Math.abs(x-roadCenter(z)),a=Math.max(0,d-6);return -.045+(1-Math.exp(-a/45))*(1.4+2*Math.sin(z/83+x/57)+1.3*Math.sin(z/39-x/41))+a*.017;}
function noiseTexture(size,kind){
 const bytes=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4,n=hash(x+y*size,4),fine=hash(x*2+y*size,8),stone=n>.97?35:0;
  if(kind==='asphalt'){const grey=57+n*22+fine*7+stone;bytes[i]=grey*.92;bytes[i+1]=grey*.98;bytes[i+2]=grey;}
  else{bytes[i]=80+n*35;bytes[i+1]=96+n*48;bytes[i+2]=51+n*21;}
  bytes[i+3]=255;
 }
 const t=new T.DataTexture(bytes,size,size,T.RGBAFormat);t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.colorSpace=T.SRGBColorSpace;t.needsUpdate=true;return t;
}
function ribbon(z0,z1,offset,width,y,step=SEGMENT){
 const n=Math.ceil((z1-z0)/step),vertices=[],uv=[],index=[];
 for(let i=0;i<=n;i++){
  const z=T.MathUtils.lerp(z0,z1,i/n),s=slope(z),norm=1/Math.sqrt(1+s*s),cx=roadCenter(z);
  for(const side of [-1,1]){const lateral=offset+side*width/2;vertices.push(cx+lateral*norm,y,z-lateral*s*norm);uv.push(side<0?0:width/4,z/8);}
  if(i<n){const b=i*2;index.push(b,b+2,b+1,b+1,b+2,b+3);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();return g;
}
function terrain(z0,z1){
 const n=Math.ceil((z1-z0)/12),columns=[-550,-360,-220,-135,-85,-52,-28,-12,-6,6,12,28,52,85,135,220,360,550],p=[],colors=[],uv=[],ids=[];
 for(let i=0;i<=n;i++)for(let j=0;j<columns.length;j++){
  const z=T.MathUtils.lerp(z0,z1,i/n),offset=columns[j],x=roadCenter(z)+offset,y=terrainHeight(x,z);p.push(x,y,z);uv.push(x/35,z/35);
  const color=new T.Color();const dry=.5+.5*Math.sin(z/53+x/31);color.setRGB(.28+dry*.06,.34+dry*.06,.17+dry*.025);colors.push(color.r,color.g,color.b);
  if(i<n&&j<columns.length-1&&j!==8){const a=i*columns.length+j;ids.push(a,a+columns.length,a+1,a+1,a+columns.length,a+columns.length+1);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ids);g.computeVertexNormals();return g;
}
function ridge(z0,z1,side,distance,height){
 const n=80,vertices=[],colors=[],indices=[];for(let i=0;i<=n;i++){
  const z=T.MathUtils.lerp(z0,z1,i/n),wave=Math.sin(z/177+side*2)*.5+Math.sin(z/79)*.22+Math.cos(z/367)*.28;
  const peak=height*(.65+wave*.35),near=roadCenter(z)+side*distance;
  for(let j=0;j<3;j++){vertices.push(near+side*(j-1)*distance*.42,j===1?peak:-3,z);const c=new T.Color(j===1?'#58694e':'#485c43');if(distance>300)c.lerp(new T.Color('#7b8b7d'),.3);colors.push(c.r,c.g,c.b);}
  if(i<n){const a=i*3;indices.push(a,a+3,a+1,a+1,a+3,a+4,a+1,a+4,a+2,a+2,a+4,a+5);}
 }const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function signTexture(text,sub){
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d');if(ctx){ctx.fillStyle='#1d5c52';ctx.fillRect(0,0,512,256);ctx.strokeStyle='#d3e8da';ctx.lineWidth=9;ctx.strokeRect(10,10,492,236);ctx.textAlign='left';ctx.fillStyle='#e8efe1';ctx.font='bold 55px Arial';ctx.fillText(text,35,86);ctx.font='32px Arial';ctx.fillText(sub,35,148);ctx.font='29px Arial';ctx.fillText('↑   TORQUE ROUTE',35,209);const t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;return t;}
 }
 const a=new Uint8Array([29,92,82,255]);const t=new T.DataTexture(a,1,1);t.needsUpdate=true;return t;
}
function instances(geometry,material,n,parent){const m=new T.InstancedMesh(geometry,material,n);m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.frustumCulled=false;parent.add(m);return m;}
const helper=new T.Object3D();
function put(mesh,index,x,y,z,sx=1,sy=1,sz=1,yaw=0){helper.position.set(x,y,z);helper.rotation.set(0,yaw,0);helper.scale.set(sx,sy,sz);helper.updateMatrix();mesh.setMatrixAt(index,helper.matrix);}

export class DrivingWorld{
 constructor(scene){
  this.scene=scene;this.group=new T.Group();this.group.name='torque-countryside';scene.add(this.group);this.group.visible=false;this.enabled=false;this.weather='clear';this.tile=null;this.position={x:0,y:0,z:0};this._textures=[];
  const asphalt=noiseTexture(128,'asphalt'),grass=noiseTexture(128,'grass');this._textures.push(asphalt,grass);
  this.roadMaterial=new T.MeshStandardMaterial({map:asphalt,color:'#b8bfc0',roughness:.94,metalness:.02});
  this.groundMaterial=new T.MeshStandardMaterial({map:grass,vertexColors:true,color:'#d4cfa1',roughness:1});
  const shoulderMat=new T.MeshStandardMaterial({color:'#9d947c',roughness:1});
  const paint=new T.MeshStandardMaterial({color:'#dddcc7',roughness:.85});
  const rail=new T.MeshStandardMaterial({color:'#afb8af',metalness:.78,roughness:.39});
  this.road=new T.Mesh(new T.BufferGeometry(),this.roadMaterial);this.road.receiveShadow=true;this.group.add(this.road);
  this.ground=new T.Mesh(new T.BufferGeometry(),this.groundMaterial);this.ground.receiveShadow=true;this.group.add(this.ground);
  this.shoulders=[-1,1].map(()=>{const m=new T.Mesh(new T.BufferGeometry(),shoulderMat);m.receiveShadow=true;this.group.add(m);return m});
  this.edgeLines=[-1,1].map(()=>{const m=new T.Mesh(new T.BufferGeometry(),paint);this.group.add(m);return m});
  this.dashes=instances(new T.BoxGeometry(.13,.009,5.6),paint,240,this.group);
  this.posts=instances(new T.BoxGeometry(.13,.85,.13),new T.MeshStandardMaterial({color:'#e0ddca',roughness:.7}),190,this.group);
  this.reflectors=instances(new T.BoxGeometry(.145,.11,.15),new T.MeshStandardMaterial({color:'#c4a250',emissive:'#4a3211',emissiveIntensity:.14,roughness:.45}),190,this.group);
  this.railPosts=instances(new T.BoxGeometry(.10,.73,.12),rail,520,this.group);
  this.rails=instances(new T.BoxGeometry(.09,.22,11.9),rail,240,this.group);
  this.trunks=instances(new T.CylinderGeometry(.18,.27,1,7),new T.MeshStandardMaterial({color:'#55493b',roughness:1}),900,this.group);
  this.pines=instances(new T.ConeGeometry(1,1,9,1),new T.MeshStandardMaterial({color:'#344d36',roughness:.95}),1500,this.group);
  this.leaves=instances(new T.IcosahedronGeometry(1,1),new T.MeshStandardMaterial({color:'#66743e',roughness:.95}),700,this.group);
  this.trunks.castShadow=this.pines.castShadow=this.leaves.castShadow=true;
  this.rocks=instances(new T.IcosahedronGeometry(1,0),new T.MeshStandardMaterial({color:'#7c7c67',roughness:1}),160,this.group);
  const blades=new T.BufferGeometry();blades.setAttribute('position',new T.Float32BufferAttribute([-.08,0,0,.08,0,0,.01,.32,0,0,0,-.08,0,0,.08,0,.27,.02],3));blades.computeVertexNormals();
  this.grass=instances(blades,new T.MeshStandardMaterial({color:'#7f8751',roughness:1,side:T.DoubleSide}),3200,this.group);
  this.hills=[];for(const side of [-1,1])for(const [d,h] of [[175,37],[340,85],[540,145]]){const m=new T.Mesh(new T.BufferGeometry(),new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide}));m.userData={side,d,h};this.hills.push(m);this.group.add(m);}
  this.signs=[];const names=[['COAST ROAD','TEST ROUTE / 01'],['NORTH VALLEY','SCENIC DRIVE'],['TORQUE','DRIVE. EXPLORE.']];for(let i=0;i<8;i++){
   const signGroup=new T.Group(),t=signTexture(...names[i%names.length]);this._textures.push(t);const face=new T.Mesh(new T.PlaneGeometry(2.8,1.4),new T.MeshStandardMaterial({map:t,roughness:.72,side:T.DoubleSide}));face.position.y=2.7;signGroup.add(face);const post=new T.Mesh(new T.CylinderGeometry(.045,.05,2.9,8),rail);post.position.y=1.45;signGroup.add(post);this.signs.push(signGroup);this.group.add(signGroup);
  }
  this.clouds=instances(new T.SphereGeometry(1,12,7),new T.MeshBasicMaterial({color:'#e1e7df',transparent:true,opacity:.46,depthWrite:false}),108,this.group);
  const count=1500,rainArray=new Float32Array(count*6);this.rainGeometry=new T.BufferGeometry();this.rainGeometry.setAttribute('position',new T.BufferAttribute(rainArray,3));this.rain=new T.LineSegments(this.rainGeometry,new T.LineBasicMaterial({color:'#a8c4cd',transparent:true,opacity:.24,depthWrite:false}));this.rain.frustumCulled=false;this.rain.visible=false;this.group.add(this.rain);
  this._stream(0);
 }
 setEnabled(value){this.enabled=!!value;this.group.visible=this.enabled;return this;}
 setWeather(value){this.weather=value==='rain'?'rain':'clear';this.rain.visible=this.weather==='rain';this.roadMaterial.roughness=this.weather==='rain'?.24:.94;this.roadMaterial.metalness=this.weather==='rain'?.18:.02;this.roadMaterial.color.set(this.weather==='rain'?'#7f9195':'#b8bfc0');this.clouds.material.opacity=this.weather==='rain'?.76:.46;this.clouds.material.color.set(this.weather==='rain'?'#9badb4':'#e1e7df');return this;}
 getRoadInfo(position=this.position){const z=Number(position.z)||0,center=roadCenter(z);return {center,halfWidth:WIDTH,offset:(Number(position.x)||0)-center,heading:Math.atan(slope(z)),surface:this.weather==='rain'?'wet':'dry',distanceAlong:Math.max(0,-z)};}
 _replace(mesh,geometry){mesh.geometry.dispose();mesh.geometry=geometry;}
 _stream(z){
  const tile=Math.floor(z/SPAN),anchor=tile*SPAN,z0=anchor-AHEAD,z1=anchor+BEHIND;this.tile=tile;
  this._replace(this.road,ribbon(z0,z1,0,WIDTH*2,-.015));this._replace(this.ground,terrain(z0-100,z1+100));
  for(let i=0;i<2;i++){const side=i?1:-1;this._replace(this.shoulders[i],ribbon(z0,z1,side*5.1,1.8,-.03));this._replace(this.edgeLines[i],ribbon(z0,z1,side*3.95,.12,-.006));}
  let n=0;for(let zz=Math.ceil(z0/12)*12;zz<z1;zz+=12){put(this.dashes,n++,roadCenter(zz),-.006,zz,1,1,1,Math.atan(slope(zz)));}this.dashes.count=n;this.dashes.instanceMatrix.needsUpdate=true;
  n=0;let rails=0,posts=0;for(let zz=Math.ceil(z0/30)*30;zz<z1;zz+=30)for(const side of [-1,1]){const x=roadCenter(zz)+side*5.6;put(this.posts,n,x,.39,zz,1,1,1);put(this.reflectors,n,x,.66,zz,1,1,1);n++;}
  this.posts.count=this.reflectors.count=n;this.posts.instanceMatrix.needsUpdate=this.reflectors.instanceMatrix.needsUpdate=true;
  // Guardrails occur only beside selected sections; the wider verges stay open.
  for(let zz=Math.ceil(z0/12)*12;zz<z1;zz+=12){if(Math.sin(zz/210)>.35)for(const side of [-1,1]){const yaw=Math.atan(slope(zz));put(this.rails,rails++,roadCenter(zz)+side*6.35,.64,zz,1,1,1,yaw);for(const dz of [-4,4])put(this.railPosts,posts++,roadCenter(zz+dz)+side*6.35,.32,zz+dz,1,1,1,yaw);}}
  this.rails.count=rails;this.railPosts.count=posts;this.rails.instanceMatrix.needsUpdate=this.railPosts.instanceMatrix.needsUpdate=true;
  let trunkN=0,pineN=0,leafN=0;const start=Math.floor(z0/9),end=Math.ceil(z1/9);
  for(let cell=start;cell<=end;cell++)for(const side of [-1,1]){
   const r=hash(cell,side+6);if(r<.12)continue;const zz=cell*9+hash(cell,side+5)*7,off=11+hash(cell,side+10)*95,x=roadCenter(zz)+side*off,y=terrainHeight(x,zz),height=3.8+hash(cell,side+30)*8,scale=.7+hash(cell,side+20)*.7;
   put(this.trunks,trunkN++,x,y+height*.4,zz,scale,height*.8,scale);
   if(r>.43){put(this.pines,pineN++,x,y+height*.64,zz,height*.23,height*.8,height*.23,hash(cell,12)*6);put(this.pines,pineN++,x,y+height*.87,zz,height*.17,height*.53,height*.17,hash(cell,14)*6);}
   else{put(this.leaves,leafN++,x,y+height*.8,zz,height*.34,height*.34,height*.31);put(this.leaves,leafN++,x+height*.18,y+height*.68,zz+.5,height*.28,height*.25,height*.27);}
  }
  for(const [mesh,count] of [[this.trunks,trunkN],[this.pines,pineN],[this.leaves,leafN]]){mesh.count=count;mesh.instanceMatrix.needsUpdate=true;}
  n=0;for(let i=0;i<160;i++){const key=Math.floor(z0/15)+i,zz=z0+hash(key,41)*(z1-z0),side=hash(key,42)>.5?1:-1,x=roadCenter(zz)+side*(7+hash(key,43)*38),size=.25+hash(key,45)*1.1;put(this.rocks,n++,x,terrainHeight(x,zz)+size*.25,zz,size,size*.64,size*.8,hash(key,46)*6);}this.rocks.count=n;this.rocks.instanceMatrix.needsUpdate=true;
  for(let i=0;i<3200;i++){const key=i+tile*1000,zz=z0+hash(key,71)*(z1-z0),side=hash(key,72)>.5?1:-1,x=roadCenter(zz)+side*(5.6+hash(key,73)*30),size=.5+hash(key,75)*1.2;put(this.grass,i,x,terrainHeight(x,zz),zz,size,size,size,hash(key,76)*6);}this.grass.instanceMatrix.needsUpdate=true;
  for(const m of this.hills)this._replace(m,ridge(z0-500,z1+500,m.userData.side,m.userData.d,m.userData.h));
  for(let i=0;i<this.signs.length;i++){const zz=(Math.floor(z0/350)+i)*350+80,side=i%2?1:-1;this.signs[i].position.set(roadCenter(zz)+side*7,terrainHeight(roadCenter(zz)+side*7,zz),zz);this.signs[i].rotation.y=Math.atan(slope(zz));}
  let cloud=0;for(let i=0;i<18;i++){const key=tile+i*8,zz=z0+hash(key,83)*(z1-z0),x=(hash(key,84)-.5)*1200,y=130+hash(key,85)*70;for(let j=0;j<6;j++)put(this.clouds,cloud++,x+(j-2.5)*17,y+Math.sin(j*2)*4,zz+Math.sin(j)*9,26+hash(key+j,86)*12,8+hash(key+j,87)*7,17+hash(key+j,88)*10);}this.clouds.count=cloud;this.clouds.instanceMatrix.needsUpdate=true;
 }
 update(position,time=0){
  if(position){this.position={x:Number(position.x)||0,y:Number(position.y)||0,z:Number(position.z)||0};}
  if(!this.enabled)return;
  if(Math.floor(this.position.z/SPAN)!==this.tile)this._stream(this.position.z);
  if(this.weather==='rain'){
   const a=this.rainGeometry.attributes.position.array,t=Number(time)||0;
   for(let i=0;i<1500;i++){const x=this.position.x+(hash(i,91)-.5)*100,z=this.position.z+(hash(i,92)-.5)*140,y=fract(hash(i,93)-t*.65)*27;const j=i*6;a[j]=x;a[j+1]=y;a[j+2]=z;a[j+3]=x-.08;a[j+4]=y-.65;a[j+5]=z+.07;}
   this.rainGeometry.attributes.position.needsUpdate=true;
  }
 }
 dispose(){
  this.scene.remove(this.group);const geometries=new Set(),materials=new Set();this.group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(Array.isArray(o.material))o.material.forEach(m=>materials.add(m));else if(o.material)materials.add(o.material)});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());this._textures.forEach(t=>t.dispose());
 }
}
