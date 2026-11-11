import * as T from './assets/three.module.js';
import {GLTFLoader} from './assets/GLTFLoader.js';
const descriptions={
 body:'Несущий кузов и остекление. Визуальная оболочка исходной модели; скрытые крепежи представлены не полностью.',
 door_left:'Двухгранная дверь водителя. Шарнир и траектория открытия приближены для интерактивного показа.',
 door_right:'Двухгранная дверь пассажира. Наружная и внутренняя панели собраны в одну деталь.',
 hood:'Передний капот открывает багажный отсек: у этой компоновки двигатель расположен сзади салона.',
 engine_cover:'Остеклённая задняя крышка над силовым агрегатом. Под ней добавлена наглядная схема моторного блока.',
 seat_left:'Кресло водителя с карбоновой основой и мягкими вставками. Можно вынести из салона.',
 seat_right:'Кресло пассажира. Отдельная группа треугольников исходной модели.',
 wheel_fl:'Переднее левое колесо: шина и диск. В движении поворачивается вместе с рулём.',
 wheel_fr:'Переднее правое колесо: шина и диск. Тормоза остаются в отдельной сборке.',
 wheel_rl:'Заднее левое колесо. Можно снять отдельно от кузова и подвески.',
 wheel_rr:'Заднее правое колесо. Визуальная модель вращения, без расчёта деформации покрышки.',
 steering:'Руль с лепестками и элементами отделки. В режиме езды следует за положением передних колёс.',
 front_bumper:'Передний бампер с воздухозаборниками и карбоновыми деталями.',
 rear_bumper:'Задний бампер, диффузор и декоративные элементы.',
 rear_wing:'Активное заднее антикрыло. Демонстрационная траектория наклона и подъёма.',
 headlights:'Передняя оптика, отражатели и линзы исходной модели.',
 taillights:'Светодиодные задние фонари; в режиме езды яркость растёт при торможении.',
 cockpit:'Приборная панель, центральная консоль и внутренние панели. Крупная сборка салона.',
 seatbelts:'Ремни и замки безопасности. Геометрия видимых элементов исходной модели.',
 front_fender:'Передние крылья и обрамление колёсных арок.',
 wipers:'Стеклоочистители и видимые механические элементы привода.',
 suspension:'Тормозные диски, суппорты, ступицы и рычаги подвески. Кинематика при езде упрощена.',
 engine:'Дополнительная условная схема V8: впуск, крышки головок, трубки и крепежи. Это не заводская CAD-модель двигателя McLaren.',
 frunk:'Дополнительная условная ванна переднего багажного отсека. Размеры и крепления иллюстративные.'
};
const clamp=T.MathUtils.clamp;
const _vec=new T.Vector3(),_quat=new T.Quaternion(),_euler=new T.Euler();
function category(id){return /wheel_|suspension/.test(id)?'wheels':/seat|steering|cockpit/.test(id)?'interior':'body'}
function detachVector(id,center){if(id==='door_left')return new T.Vector3(-1.35,.45,.05);if(id==='door_right')return new T.Vector3(1.35,.45,.05);if(id==='seat_left')return new T.Vector3(-1.25,.6,.3);if(id==='seat_right')return new T.Vector3(1.25,.6,.3);if(id.startsWith('wheel_'))return new T.Vector3(id.endsWith('l')?-.9:.9,.08,0);if(id==='hood')return new T.Vector3(0,.7,-1.1);if(id==='engine_cover')return new T.Vector3(0,.75,.9);if(id==='engine')return new T.Vector3(0,1.05,1.1);if(id==='body')return new T.Vector3(0,1.6,0);if(id==='frunk')return new T.Vector3(0,.8,-1.0);return new T.Vector3(center.x*.8,.55,center.z*.45).add(new T.Vector3(0,.15,0))}
function box(group,size,position,material){const m=new T.Mesh(new T.BoxGeometry(...size),material);m.position.set(...position);m.castShadow=true;m.receiveShadow=true;group.add(m);return m}
function cylinder(group,r1,r2,length,position,material,axis='y',segments=20){const m=new T.Mesh(new T.CylinderGeometry(r1,r2,length,segments),material);if(axis==='x')m.rotation.z=Math.PI/2;if(axis==='z')m.rotation.x=Math.PI/2;m.position.set(...position);m.castShadow=true;group.add(m);return m}
function tube(group,points,radius,material){const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));const m=new T.Mesh(new T.TubeGeometry(path,24,radius,10,false),material);m.castShadow=true;group.add(m);return m}
function mechanicalSupplements(){
 const metal=new T.MeshStandardMaterial({color:'#777e80',metalness:.8,roughness:.34}),dark=new T.MeshStandardMaterial({color:'#202629',metalness:.3,roughness:.54}),black=new T.MeshStandardMaterial({color:'#111417',metalness:.08,roughness:.72}),bright=new T.MeshStandardMaterial({color:'#bbc2c5',metalness:.92,roughness:.22}),warm=new T.MeshStandardMaterial({color:'#9f7752',metalness:.68,roughness:.43});
 const engine=new T.Group();engine.name='engine';engine.userData.proceduralIllustration=true;
 box(engine,[.57,.19,.76],[0,.48,1.18],metal);box(engine,[.48,.10,.63],[0,.35,1.18],dark);
 for(const side of [-1,1]){
  const cover=box(engine,[.16,.105,.67],[side*.245,.665,1.18],dark);cover.rotation.z=-side*.23;
  box(engine,[.115,.007,.54],[side*.246,.723,1.18],black);
  for(let i=0;i<4;i++){
   const z=.925+i*.17;const head=cylinder(engine,.075,.078,.22,[side*.185,.55,z],metal,'y',24);head.rotation.z=-side*.5;
   tube(engine,[[side*.12,.72,z],[side*.16,.80,z],[side*.04,.835,z+.02]],.024,bright);
   tube(engine,[[side*.29,.51,z],[side*.39,.44,z],[side*.44,.36,1.55]],.019,warm);
   for(const x of [side*.19,side*.30])cylinder(engine,.008,.008,.01,[x,.726,z],bright,'y',6);
  }
  tube(engine,[[side*.3,.77,.84],[side*.43,.68,.94],[side*.46,.68,1.25],[side*.43,.60,1.55]],.039,black);
  for(let i=0;i<6;i++){
   const ring=new T.Mesh(new T.TorusGeometry(.041,.003,5,20),bright);ring.position.set(side*.46,.68,1.08+i*.027);engine.add(ring);
  }
 }
 box(engine,[.16,.07,.66],[0,.795,1.18],dark);for(let i=0;i<8;i++)box(engine,[.14,.006,.008],[0,.834,.92+i*.075],metal);
 cylinder(engine,.027,.027,.018,[.25,.744,1.37],black,'y',24);
 tube(engine,[[-.52,.78,.79],[0,.91,1.1],[.52,.78,1.45]],.017,bright);tube(engine,[[.52,.78,.79],[0,.91,1.1],[-.52,.78,1.45]],.017,bright);
 for(const side of [-1,1])for(const z of [.82,1.51]){box(engine,[.08,.02,.08],[side*.49,.77,z],dark);cylinder(engine,.012,.012,.025,[side*.49,.79,z],bright,'y',6)}
 engine.position.y=-.12;
 const frunk=new T.Group();frunk.name='frunk';frunk.userData.proceduralIllustration=true;box(frunk,[.9,.025,.67],[0,.25,-1.65],black);box(frunk,[.025,.16,.67],[-.46,.34,-1.65],black);box(frunk,[.025,.16,.67],[.46,.34,-1.65],black);box(frunk,[.94,.16,.025],[0,.34,-1.99],black);box(frunk,[.94,.16,.025],[0,.34,-1.31],black);for(let i=0;i<7;i++)box(frunk,[.86,.003,.008],[0,.266,-1.91+i*.085],dark);
 return [{id:'engine',node:engine,nameRu:'Моторный блок · схема',category:'body'},{id:'frunk',node:frunk,nameRu:'Передний багажный отсек · схема',category:'body'}];
}
export class CarAssembly{
 constructor(model,metadata){
  this.group=model;this.group.name='torque-car';this.metadata=metadata;this.parts=[];this.paintMaterials=[];this.steering=null;this.wheels=[];this.explode=0;this.targetExplode=0;this.lightOn=true;this.meshCount=0;this.materials=new Set();this.objectParts=new Map();
  this.group.updateMatrixWorld(true);
  this.group.traverse(obj=>{if(!obj.isMesh)return;this.meshCount++;obj.castShadow=true;obj.receiveShadow=true;const materials=Array.isArray(obj.material)?obj.material:[obj.material];for(const m of materials){this.materials.add(m);if(m.name==='Carpaint'){if(m.isMeshPhysicalMaterial){m.clearcoat=1;m.clearcoatRoughness=.08;m.specularIntensity=1;m.specularColor?.set('#ffffff')}m.metalness=.6;m.roughness=.2;m.envMapIntensity=1.15;this.paintMaterials.push(m)}if(/Windows|Clear_Glass/.test(m.name)){m.transparent=true;m.opacity=/Windows_alpha|Clear_Glass/.test(m.name)?.17:.26;m.depthWrite=false;m.metalness=0;m.roughness=.1;if('transmission'in m)m.transmission=.06;m.envMapIntensity=.7;}if(/Tyre/.test(m.name)){m.roughness=.83;m.metalness=0}if(/INT_DISPLAY/.test(m.name)){m.emissive.set('#cde1ea');m.emissiveMap=m.map;m.emissiveIntensity=.55;m.roughness=.35}if(/Headlights|Taillights/.test(m.name))m.userData.originalEmissive=m.emissive.clone();}});
  const entries=metadata.parts.map(p=>({...p,node:this.group.getObjectByName(p.node||p.id)}));for(const extra of mechanicalSupplements()){this.group.add(extra.node);entries.push(extra)}this.group.updateMatrixWorld(true);
  for(const info of entries){const node=info.node;if(!node)continue;const bbox=new T.Box3().setFromObject(node),center=bbox.getCenter(new T.Vector3()),pivot=new T.Group();pivot.name='part_'+info.id;pivot.position.copy(info.hinge?new T.Vector3(...info.hinge):info.id==='steering'?new T.Vector3(...metadata.steeringCenter):center);this.group.add(pivot);pivot.updateMatrixWorld(true);pivot.attach(node);const rest=pivot.position.clone(),rotation=info.openRotation||[0,0,0],maxAngle=Math.max(...rotation.map(Math.abs));const part={id:info.id,name:info.nameRu||info.id,category:category(info.id),description:descriptions[info.id]||'Сборка исходной 3D-модели.',group:pivot,node,pivot,axis:new T.Vector3(info.id.startsWith('door')?1:1,0,0),angle:maxAngle,maxAngle,maxDegrees:Math.round(T.MathUtils.radToDeg(maxAngle)),openable:!!info.openRotation,removable:true,detached:false,open:0,targetOpen:0,offset:detachVector(info.id,center),restPosition:rest,baseQuaternion:pivot.quaternion.clone(),openRotation:new T.Euler(...rotation),center,focusLocal:center.clone().sub(rest),detachment:0,explodeOffset:new T.Vector3(center.x*.8,.18+Math.max(.1,center.y)*.32,center.z*.34)};pivot.userData.partId=part.id;pivot.traverse(o=>this.objectParts.set(o,part));this.parts.push(part);if(info.id==='steering'){this.steering=pivot;part.axis.set(0,-.215315,-.976545).normalize()}if(info.id.startsWith('wheel_'))this.wheels.push(part)}
  this.paintMaterials=[...new Set(this.paintMaterials)];this.setColor('#d85e27');this.update(0);
 }
 setOpen(id,value){const p=this.parts.find(p=>p.id===id);if(!p||!p.openable)return false;p.targetOpen=clamp(Number(value)||0,0,1);return true}
 setDetached(id,value){const p=this.parts.find(p=>p.id===id);if(!p||!p.removable)return false;p.detached=!!value;return true}
 setExplode(value){this.targetExplode=clamp(Number(value)||0,0,1);return this}
 setColor(hex){for(const mat of this.paintMaterials)mat.color.set(hex);this.color=hex;return this}
 setLights(on){this.lightOn=!!on;return this}
 getPartFromObject(obj){while(obj){const p=this.objectParts.get(obj);if(p)return p;obj=obj.parent}return null}
 focusPoint(id){const p=this.parts.find(p=>p.id===id);if(!p)return this.group.getWorldPosition(new T.Vector3());this.group.updateMatrixWorld(true);return p.group.localToWorld(p.focusLocal.clone())}
 reset(){this.explode=this.targetExplode=0;for(const p of this.parts){p.open=p.targetOpen=0;p.detached=false;p.detachment=0;p.group.position.copy(p.restPosition);p.group.quaternion.copy(p.baseQuaternion);p.group.visible=true}return this}
 update(dt=0,driving={}){
  const t=1-Math.exp(-Math.min(Math.max(Number(dt)||0,0),.1)*8);this.explode=T.MathUtils.lerp(this.explode,this.targetExplode,t);
  for(const p of this.parts){p.open=T.MathUtils.lerp(p.open,p.targetOpen,t);p.detachment=T.MathUtils.lerp(p.detachment,p.detached?1:0,t);p.group.position.copy(p.restPosition).addScaledVector(p.offset,p.detachment).addScaledVector(p.explodeOffset,this.explode);p.group.quaternion.copy(p.baseQuaternion);if(p.openable){_euler.set(p.openRotation.x*p.open,p.openRotation.y*p.open,p.openRotation.z*p.open);_quat.setFromEuler(_euler);p.group.quaternion.multiply(_quat)}
   if(!p.detached&&p.id.startsWith('wheel_')&&Number.isFinite(driving.wheelRotation)){if(p.id==='wheel_fl'||p.id==='wheel_fr')p.group.rotateY(Number(driving.wheelSteer)||0);p.group.rotateX(-driving.wheelRotation)}
   if(p.id==='steering'&&!p.detached&&Number.isFinite(driving.steeringWheel)){_quat.setFromAxisAngle(p.axis,driving.steeringWheel);p.group.quaternion.multiply(_quat)}
  }
  for(const m of this.materials){if(/Headlights/.test(m.name)){m.emissive.set('#ffe6bd');m.emissiveIntensity=this.lightOn?.7:0;}if(/Taillights/.test(m.name)){m.emissive.set('#e82819');m.emissiveIntensity=driving.brake>0?.5+driving.brake*1.6:this.lightOn?.25:0;}}
  return this;
 }
 getState(){return {model:'McLaren P1',license:'CC BY-NC 4.0',color:this.color,explode:this.targetExplode,lights:this.lightOn,parts:this.parts.map(p=>({id:p.id,name:p.name,open:p.targetOpen,detached:p.detached,visible:p.group.visible}))}}
}
export async function loadCar(onProgress=()=>{}){
 const response=await fetch('assets/car-metadata.json');if(!response.ok)throw new Error('Не удалось загрузить описание автомобиля');const metadata=await response.json();onProgress(.05,'Загружаем детальную модель');const loader=new GLTFLoader();const gltf=await loader.loadAsync('assets/mclaren-p1.glb',event=>{if(event.total)onProgress(.05+event.loaded/event.total*.85,'Загружаем геометрию и текстуры')});onProgress(.95,'Собираем механизмы и салон');const car=new CarAssembly(gltf.scene,metadata);onProgress(1,'Готово');return car;
}
