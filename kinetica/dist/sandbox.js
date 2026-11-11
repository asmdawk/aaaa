import * as T from './assets/three.module.js';
import {LIQUIDS} from './liquids.js';
export {LIQUIDS};
const catalogue=new Map(LIQUIDS.map(x=>[x.id,x]));
const surfaceVertex=`uniform float uTime;uniform float uAmplitude;uniform float uSpeed;varying vec3 vWorld;varying float vWave;
void main(){vec3 p=position;float w=sin(p.x*16.0+uTime*uSpeed)*cos(p.y*12.0-uTime*uSpeed*.7)+sin((p.x+p.y)*27.0-uTime*uSpeed*1.3)*.3;p.z+=w*uAmplitude;vWave=w;vWorld=(modelMatrix*vec4(p,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
const surfaceFragment=`uniform vec3 uColor;uniform float uOpacity;uniform float uTime;varying vec3 vWorld;varying float vWave;
void main(){vec3 view=normalize(cameraPosition-vWorld);float fres=pow(1.0-abs(view.y),2.);float highlight=pow(max(0.,sin(vWorld.x*22.+vWorld.z*16.+vWave*.35+uTime*.3)),18.);vec3 c=uColor*.8+vec3(.57,.76,.78)*fres*.45+vec3(.45,.65,.72)*highlight*.35;gl_FragColor=vec4(c,clamp((uOpacity+fres*.12+highlight*.05)*step(.001,uOpacity),0.,.94));
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Polar grid gives the wave shader vertices throughout the disc, rather than
// only at its perimeter as in CircleGeometry's triangle fan.
function waveDisc(radius,angular=80,radial=24){
 const positions=[0,0,0],indices=[];
 for(let r=1;r<=radial;r++)for(let a=0;a<angular;a++){
  const t=a/angular*Math.PI*2,d=radius*r/radial;positions.push(Math.cos(t)*d,Math.sin(t)*d,0);
 }
 for(let a=0;a<angular;a++)indices.push(0,1+a,1+(a+1)%angular);
 for(let r=1;r<radial;r++)for(let a=0;a<angular;a++){
  const n=(a+1)%angular,inner=1+(r-1)*angular,outer=1+r*angular;
  indices.push(inner+a,outer+a,outer+n,inner+a,outer+n,inner+n);
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
// Presentation model: density-ordered volume layers, not a fluid solver.
// No reactions, phase transitions, tissue effects, or displaced body volume.
export class LiquidSandbox{
 constructor(scene){
  this.scene=scene;this.group=new T.Group();this.group.name='liquid-sandbox';scene.add(this.group);this.group.visible=false;
  this.containerType='box';this.width=1.1;this.depth=.7;this.height=1.9;this.temperature=20;this.agitation=.3;this.paused=false;this.opacity=1;this.layers=[];this.onChange=null;this.elapsed=0;this.pourTime=0;this.enabled=false;
  this.tank=new T.Group();this.volumes=new T.Group();this.effects=new T.Group();this.group.add(this.tank,this.volumes,this.effects);this.surfaces=[];
  this.pourMaterial=new T.MeshPhysicalMaterial({color:0x8ad8e5,transparent:true,opacity:.65,roughness:.16,metalness:.05,depthWrite:false});
  this.pour=new T.Mesh(new T.CylinderGeometry(.007,.013,1,14,4,true),this.pourMaterial);this.pour.visible=false;this.effects.add(this.pour);
  this.droplets=new T.Group();this.effects.add(this.droplets);for(let i=0;i<9;i++){const d=new T.Mesh(new T.SphereGeometry(.009,8,6),this.pourMaterial);d.userData.seed=i*.69;this.droplets.add(d)}this.droplets.visible=false;
  const n=110,positions=new Float32Array(n*3);this.bubbleSeeds=Array.from({length:n},(_,i)=>({x:Math.sin(i*78.34)*.47,z:Math.sin(i*23.67)*.29,y:(i*.618033)%1,s:.04+(i%9)*.012}));
  this.bubbleGeometry=new T.BufferGeometry();this.bubbleGeometry.setAttribute('position',new T.BufferAttribute(positions,3));this.bubbleMaterial=new T.PointsMaterial({size:.006,color:0xc9e9ee,transparent:true,opacity:.37,depthWrite:false,sizeAttenuation:true});this.bubbles=new T.Points(this.bubbleGeometry,this.bubbleMaterial);this.effects.add(this.bubbles);
  this.buildTank();
 }
 get capacityLitres(){return (this.containerType==='cylinder'?Math.PI*.55*.55:this.width*this.depth)*this.height*1000}
 _disposeChildren(group){for(const obj of [...group.children]){group.remove(obj);obj.traverse(o=>{o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose()})}}
 buildTank(){
  this._disposeChildren(this.tank);const w=this.width,d=this.depth,h=this.height;
  const glass=new T.MeshPhysicalMaterial({color:0xb1d5d8,transparent:true,opacity:.055,roughness:.08,metalness:.15,clearcoat:1,side:T.DoubleSide,depthWrite:false});
  const frame=new T.MeshStandardMaterial({color:0x576d6d,metalness:.82,roughness:.28});
  const lineMat=new T.LineBasicMaterial({color:0x8db4b5,transparent:true,opacity:.4,depthWrite:false});
  if(this.containerType==='box'){
   for(const [x,z,ww,dd] of [[0,-d/2,w,.009],[0,d/2,w,.009],[-w/2,0,.009,d],[w/2,0,.009,d]]){const m=new T.Mesh(new T.BoxGeometry(ww,h,dd),glass.clone());m.position.set(x,h/2,z);m.renderOrder=30;this.tank.add(m)}
   const edges=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(w,h,d)),lineMat);edges.position.y=h/2;edges.renderOrder=35;this.tank.add(edges);
   const base=new T.Mesh(new T.BoxGeometry(w+.065,.026,d+.065),frame);base.position.y=-.024;this.tank.add(base);
   for(const y of [0,h]){const edge=new T.Mesh(new T.BoxGeometry(w+.025,.012,.014),frame.clone());edge.position.set(0,y,-d/2);this.tank.add(edge);const e=edge.clone();e.position.z=d/2;this.tank.add(e)}
  }else{
   const wall=new T.Mesh(new T.CylinderGeometry(.55,.55,h,80,1,true),glass);wall.position.y=h/2;wall.renderOrder=30;this.tank.add(wall);
   const base=new T.Mesh(new T.CylinderGeometry(.58,.58,.026,80),frame);base.position.y=-.024;this.tank.add(base);
   for(const y of [0,h]){const ring=new T.Mesh(new T.TorusGeometry(.55,.006,8,100),frame.clone());ring.rotation.x=Math.PI/2;ring.position.y=y;this.tank.add(ring)}
  }
  // Compact physical ruler along the tank's left edge (100 mm divisions).
  const marks=[];for(let y=.1;y<h;y+=.1){const len=Math.round(y*10)%5===0?.045:.02;marks.push(-w/2-.005,y,-d/2-.008,-w/2+len,y,-d/2-.008)}
  const tickGeo=new T.BufferGeometry();tickGeo.setAttribute('position',new T.Float32BufferAttribute(marks,3));this.tank.add(new T.LineSegments(tickGeo,new T.LineBasicMaterial({color:0xa5c2be,transparent:true,opacity:.65})));
 }
 setEnabled(value){this.enabled=!!value;this.group.visible=this.enabled;return this}
 setPaused(value){this.paused=!!value;return this}
 setOpacity(value){this.opacity=clamp(Number(value)||0,0,1);this.rebuild();return this}
 setTemperature(value){this.temperature=clamp(Number(value)||20,-200,100);return this}
 setAgitation(value){this.agitation=clamp(Number(value)||0,0,1);return this}
 // Reject a smaller vessel before changing state; never discard liquid.
 setContainer(type){const next=type==='cylinder'?'cylinder':'box';if(next===this.containerType)return this;const capacity=(next==='cylinder'?Math.PI*.55*.55:this.width*this.depth)*this.height*1000;if(this.totalLitres>capacity+1e-6)return false;this.containerType=next;this.buildTank();this.rebuild();this.notify();return this}
 get totalLitres(){return this.layers.reduce((n,l)=>n+l.litres,0)}
 addLiquid(id,litres){const ref=catalogue.get(id);if(!ref)return 0;const input=Number(litres);if(!Number.isFinite(input)||input<=0)return 0;const accepted=Math.min(input,Math.max(0,this.capacityLitres-this.totalLitres));if(accepted<.00001)return 0;const old=this.layers.find(l=>l.id===id);if(old)old.litres+=accepted;else this.layers.push({...ref,litres:accepted});this.pourTime=2.3;this.pourMaterial.color.set(ref.color);this.pourMaterial.opacity=clamp(ref.opacity,.25,.8);this.rebuild();this.notify();return accepted}
 removeLiquid(id){this.layers=this.layers.filter(l=>l.id!==id);this.rebuild();this.notify();return this}
 setVolume(id,litres){const old=this.layers.find(l=>l.id===id);if(!old)return this.addLiquid(id,litres);const next=Number(litres);if(!Number.isFinite(next))return 0;if(next<=0){this.removeLiquid(id);return 0}const available=this.capacityLitres-(this.totalLitres-old.litres);old.litres=Math.min(next,available);this.rebuild();this.notify();return old.litres}
 setFill(percent){const target=this.capacityLitres*clamp(Number(percent)||0,0,100)/100;const current=this.totalLitres;if(!current){if(target>0)this.addLiquid('water',target);return this}const scale=target/current;this.layers.forEach(l=>l.litres*=scale);if(!target)this.layers=[];this.rebuild();this.notify();return this}
 drain(){this.layers=[];this.pourTime=0;this.pour.visible=false;this.droplets.visible=false;this.rebuild();this.notify();return this}
 mix(){
  const groups=new Map();for(const l of this.layers){const key=l.miscible;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(l)}
  const mixed=[];for(const [group,ls] of groups){if(ls.length<2){mixed.push(ls[0]);continue}const total=ls.reduce((s,l)=>s+l.litres,0),c=new T.Color(0,0,0);let density=0,viscLog=0,opacity=0;for(const l of ls){const f=l.litres/total;c.add(new T.Color(l.color).multiplyScalar(f));density+=l.density*f;viscLog+=Math.log(l.viscosity)*f;opacity+=l.opacity*f}mixed.push({id:'mixture-'+group,name:group==='water'?'Водная смесь':group==='oil'?'Масляная смесь':'Смесь',category:'Смеси',density,viscosity:Math.exp(viscLog),color:'#'+c.getHexString(),opacity,miscible:group,note:'Условное смешивание по группе; химия и изменение объёма не рассчитываются',litres:total})}
  this.layers=mixed;this.agitation=Math.max(this.agitation,.55);this.rebuild();this.notify();return this
 }
 getState(){const sorted=[...this.layers].sort((a,b)=>b.density-a.density);const total=this.totalLitres;return {layers:sorted.map(l=>({...l})),totalLitres:total,fillPercent:100*total/this.capacityLitres,avgDensity:total?sorted.reduce((s,l)=>s+l.density*l.litres,0)/total:0,capacityLitres:this.capacityLitres,container:this.containerType,temperature:this.temperature,paused:this.paused}}
 notify(){this.onChange?.(this.getState())}
 rebuild(){
  this._disposeChildren(this.volumes);this.surfaces=[];const sorted=[...this.layers].sort((a,b)=>b.density-a.density);let bottom=0;const area=this.capacityLitres/this.height/1000;
  for(let i=0;i<sorted.length;i++){
   const l=sorted[i],height=l.litres/1000/area;if(height<.00001)continue;const top=bottom+height;
   const geo=this.containerType==='cylinder'?new T.CylinderGeometry(.544,.544,height,64,1,true):new T.BoxGeometry(this.width-.012,height,this.depth-.012);
   const metal=l.category==='Металлы';const mat=new T.MeshPhysicalMaterial({color:l.color,transparent:true,opacity:clamp(l.opacity*(metal?.85:.47)*this.opacity,0,.94),roughness:metal?.18:.18,metalness:metal?.9:.03,clearcoat:1,side:T.DoubleSide,depthWrite:false});
   const volume=new T.Mesh(geo,mat);volume.position.y=bottom+height/2;volume.renderOrder=8+i;this.volumes.add(volume);
   const surfaceGeo=this.containerType==='cylinder'?waveDisc(.543):new T.PlaneGeometry(this.width-.014,this.depth-.014,36,24);
   const sm=new T.ShaderMaterial({vertexShader:surfaceVertex,fragmentShader:surfaceFragment,uniforms:{uTime:{value:this.elapsed},uAmplitude:{value:0},uSpeed:{value:1},uColor:{value:new T.Color(l.color)},uOpacity:{value:clamp((l.opacity*.75+.1)*this.opacity,0,.95)}},transparent:true,side:T.DoubleSide,depthWrite:false});
   const surface=new T.Mesh(surfaceGeo,sm);surface.rotation.x=-Math.PI/2;surface.position.y=Math.min(top,this.height-.008);surface.renderOrder=20+i;surface.userData={liquid:l,top:top,upper:i===sorted.length-1};this.volumes.add(surface);this.surfaces.push(surface);
   bottom=top;
  }
  this.bubbles.visible=bottom>.04;this.fillHeight=bottom;
 }
 update(dt,time){
  if(!this.enabled)return;const step=this.paused?0:Math.min(Math.max(Number(dt)||0,0),.1);this.elapsed+=step;
  for(const s of this.surfaces){const l=s.userData.liquid;const tempFactor=Math.exp((20-this.temperature)*.012);const resistance=1+Math.log10(1+l.viscosity*tempFactor)*1.4;s.material.uniforms.uTime.value=this.elapsed;s.material.uniforms.uSpeed.value=1.4/resistance;s.material.uniforms.uAmplitude.value=(.0015+.006*this.agitation)/resistance*(s.userData.upper?1:.24);}
  if(this.pourTime>0){this.pourTime-=step;this.pour.visible=this.pourTime>0;this.droplets.visible=this.pourTime>0;const top=this.fillHeight||.01;const h=Math.max(.08,2.12-top);this.pour.position.set(.38,top+h/2,.17);this.pour.scale.set(.85+Math.sin(this.elapsed*19)*.13,h,1);for(const d of this.droplets.children){const p=(this.elapsed*1.2+d.userData.seed)%1;d.position.set(.38+Math.sin(p*10+d.userData.seed)*.012,2.12-p*h,.17+Math.cos(p*11+d.userData.seed)*.012);d.scale.setScalar(.5+p*.8)}}
  if(this.fillHeight>.04){const a=this.bubbleGeometry.attributes.position.array,visc=this.surfaces.at(-1)?.userData.liquid.viscosity||1;const speed=1/(1+Math.log10(visc+1));for(let i=0;i<this.bubbleSeeds.length;i++){const b=this.bubbleSeeds[i];let x=b.x,z=b.z;if(this.containerType==='cylinder'&&Math.hypot(x,z)>.5){x*=.75;z*=.75}a[i*3]=x+Math.sin(this.elapsed*.6+i)*.007*this.agitation;a[i*3+1]=.012+((b.y+this.elapsed*b.s*speed)%1)*Math.max(.01,this.fillHeight-.025);a[i*3+2]=z}this.bubbleGeometry.attributes.position.needsUpdate=true;this.bubbleMaterial.opacity=.13+this.agitation*.27}
 }
 dispose(){this.scene.remove(this.group);this.group.traverse(o=>{o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose()})}
}
