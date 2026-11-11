// A presentation-oriented single-track vehicle model in SI units.
// This is not a measured model of a particular production vehicle: combined
// grip, suspension, automatic shifting and power delivery are approximations.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,fallback=0)=>Number.isFinite(Number(v))?Number(v):fallback;
const approach=(current,target,rate,dt)=>current+(target-current)*(1-Math.exp(-rate*dt));
const smoothstep=(x,a,b)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
const STEP=1/120;
export class DrivingSimulation {
 constructor(options={}){
  this.config={mass:1450,wheelbase:2.65,frontDistance:1.15,wheelRadius:.335,maxSteer:.55,steeringRatio:14.5,dragArea:.68,...options};
  this.roadFunction=null;this.bounds={minX:-1000,maxX:1000,minZ:-20000,maxZ:20000};this.reset();
 }
 reset(){
  this.x=0;this.z=0;this.yaw=0;this.u=0;this.v=0;this.yawRate=0;this.steerActual=0;this.throttleActual=0;this.brakeActual=0;
  this.input={throttle:0,brake:0,steer:0,handbrake:0};this.engineOn=false;this.selector='D';this.autoGear=1;this.rpm=0;
  this.wheelRotation=0;this.distance=0;this.time=0;this.accumulator=0;this.shiftTimer=0;this.crashTimer=0;this.surface='dry';
  this.pitch=0;this.roll=0;this.headX=0;this.headY=0;this.headZ=0;this.longitudinalAcceleration=0;this.lateralAcceleration=0;this.offroad=false;
  return this.getState();
 }
 setInput(input={}){
  // Positive steering is left: +THREE yaw turns local -Z toward world -X.
  this.input.throttle=clamp(finite(input.throttle,this.input.throttle),0,1);
  this.input.brake=clamp(finite(input.brake,this.input.brake),0,1);
  this.input.steer=clamp(finite(input.steer,this.input.steer),-1,1);
  this.input.handbrake=clamp(finite(input.handbrake,this.input.handbrake),0,1);
  return this;
 }
 setGear(gear){
  if(!['D','N','R'].includes(gear))return false;
  // Opposing direction can only be selected close to a stop.
  if((gear==='R'&&this.u>1.5)||(gear==='D'&&this.u< -1.5))return false;
  this.selector=gear;if(gear==='D'&&Math.abs(this.u)<2)this.autoGear=1;this.shiftTimer=.18;return true;
 }
 setIgnition(on){this.engineOn=!!on;if(!this.engineOn)this.rpm=0;else if(this.rpm<600)this.rpm=850;return this}
 setSurface(surface){this.surface=surface==='wet'?'wet':'dry';return this}
 setRoadFunction(fn){this.roadFunction=typeof fn==='function'?fn:null;return this}
 setBounds(bounds={}){for(const key of ['minX','maxX','minZ','maxZ'])if(Number.isFinite(bounds[key]))this.bounds[key]=bounds[key];return this}
 setPosition(x,z,yaw=0){this.x=finite(x);this.z=finite(z);this.yaw=finite(yaw);this.u=0;this.v=0;this.yawRate=0;return this}
 update(dt){
  // Cap suspended-tab time; a resumed frame never teleports the vehicle.
  this.accumulator+=clamp(finite(dt),0,.25);
  let steps=0;while(this.accumulator>=STEP&&steps<31){this._step(STEP);this.accumulator-=STEP;steps++}
  return this.getState();
 }
 _step(dt){
  const c=this.config,g=9.81,m=c.mass,L=c.wheelbase,a=c.frontDistance,b=L-a,Iz=m*1.25;
  this.time+=dt;this.shiftTimer=Math.max(0,this.shiftTimer-dt);this.crashTimer=Math.max(0,this.crashTimer-dt);
  const speed=Math.abs(this.u);let center=0,halfWidth=5.5;
  if(this.roadFunction){const road=this.roadFunction(this.z);if(typeof road==='number')center=finite(road);else if(road&&typeof road==='object'){center=finite(road.centerX??road.x);halfWidth=Math.max(1,finite(road.halfWidth,5.5))}}
  this.offroad=!!this.roadFunction&&Math.abs(this.x-center)>halfWidth;
  const mu=(this.surface==='wet'?.57:.98)*(this.offroad?.57:1);
  const speedSteer=1/(1+(speed/22)**1.5);const steerLimit=Math.max(.075,c.maxSteer*speedSteer);
  this.steerActual=approach(this.steerActual,this.input.steer*steerLimit,9,dt);
  this.throttleActual=approach(this.throttleActual,this.engineOn?this.input.throttle:0,5,dt);
  this.brakeActual=approach(this.brakeActual,this.input.brake,14,dt);
  const ratioList=[3.55,2.18,1.52,1.15,.91,.74],finalDrive=3.9;
  let ratio=this.selector==='R'?3.4:ratioList[this.autoGear-1];
  let coupledRpm=speed/c.wheelRadius*ratio*finalDrive*60/(Math.PI*2);
  if(this.selector==='D'&&this.engineOn&&this.shiftTimer<=0){
   if(coupledRpm>6300&&this.autoGear<6){this.autoGear++;this.shiftTimer=.32}
   else if(coupledRpm<2200&&this.autoGear>1){this.autoGear--;this.shiftTimer=.25}
   ratio=ratioList[this.autoGear-1];coupledRpm=speed/c.wheelRadius*ratio*finalDrive*60/(Math.PI*2);
  }
  const targetRpm=!this.engineOn?0:this.selector==='N'?850+this.throttleActual*5850:Math.max(850+this.throttleActual*1100,coupledRpm);
  this.rpm=this.engineOn?approach(this.rpm,clamp(targetRpm,800,7100),9,dt):0;
  const torque=clamp(310+65*Math.sin(clamp(this.rpm/7000,0,1)*Math.PI)-Math.max(0,this.rpm-5800)*.045,190,380);
  let driveForce=0;
  if(this.engineOn&&this.selector!=='N'){
   const direction=this.selector==='R'?-1:1;
   driveForce=direction*this.throttleActual*torque*ratio*finalDrive*.87/c.wheelRadius;
   if(this.shiftTimer>.22)driveForce*=.35;
   if((this.selector==='R'&&speed>12)||(this.selector==='D'&&speed>72))driveForce=0;
  }
  // Brakes oppose motion; at rest they can hold against engine torque.
  const aero=.5*1.225*c.dragArea*this.u*Math.abs(this.u);
  const rollingCoefficient=this.offroad?.055:.014;
  const rolling=m*g*rollingCoefficient;
  const engineBrake=this.engineOn&&this.selector!=='N'?(1-this.throttleActual)*(220+speed*13):0;
  const brakeForce=this.brakeActual*13000+this.input.handbrake*6500;
  const direction=Math.abs(this.u)>.04?Math.sign(this.u):Math.sign(driveForce);
  let force=driveForce-aero-direction*(rolling+engineBrake+brakeForce);
  if(speed<.06&&Math.abs(driveForce)<=rolling+engineBrake+brakeForce){force=0;this.u=0}
  const tireLimit=mu*m*g;
  force=clamp(force,-tireLimit,tireLimit);
  const oldU=this.u;
  this.u+=force/m*dt;
  if(oldU!==0&&Math.sign(oldU)!==Math.sign(this.u)&&Math.abs(driveForce)<brakeForce+rolling+engineBrake){this.u=0;force=0}
  this.u=clamp(this.u,-13,76);
  // Dynamic bicycle at forward road speed; kinematic blend near rest/reverse
  // avoids the low-speed slip-angle singularity of the dynamic equations.
  const denominator=Math.max(1,Math.abs(this.u));
  const alphaFront=this.steerActual-Math.atan2(this.v+a*this.yawRate,denominator);
  const alphaRear=-Math.atan2(this.v-b*this.yawRate,denominator);
  const frontLoad=m*g*b/L,rearLoad=m*g*a/L;
  const rearMu=mu*(1-this.input.handbrake*.78);
  const frontMax=mu*frontLoad,rearMax=rearMu*rearLoad;
  // Friction ellipse leaves less lateral grip under large acceleration/braking.
  const gripFraction=Math.sqrt(Math.max(.12,1-(Math.min(.98,Math.abs(force)/Math.max(1,tireLimit)))**2));
  const frontForce=frontMax*Math.tanh(65000*alphaFront/Math.max(1,frontMax))*gripFraction;
  const rearForce=rearMax*Math.tanh(70000*alphaRear/Math.max(1,rearMax))*gripFraction;
  const dynamicR=this.yawRate+(a*frontForce*Math.cos(this.steerActual)-b*rearForce)/Iz*dt;
  const dynamicV=this.v+((frontForce*Math.cos(this.steerActual)+rearForce)/m-this.u*this.yawRate)*dt;
  const beta=Math.atan(b/L*Math.tan(this.steerActual));
  const kinematicR=this.u*Math.cos(beta)/L*Math.tan(this.steerActual);
  const kinematicV=this.u*Math.tan(beta);
  const blend=this.u>0?smoothstep(this.u,3,7):0;
  const kinRate=approach(this.yawRate,kinematicR,9,dt),kinLateral=approach(this.v,kinematicV,12,dt);
  this.yawRate=kinRate*(1-blend)+dynamicR*blend;
  this.v=kinLateral*(1-blend)+dynamicV*blend;
  this.yawRate=clamp(this.yawRate,-2.2,2.2);this.v=clamp(this.v,-14,14);
  if(Math.abs(this.u)<.04){this.v=approach(this.v,0,12,dt);this.yawRate=approach(this.yawRate,0,12,dt)}
  this.yaw+=this.yawRate*dt;
  const sin=Math.sin(this.yaw),cos=Math.cos(this.yaw);
  this.x+=(-sin*this.u-cos*this.v)*dt;this.z+=(-cos*this.u+sin*this.v)*dt;
  const travelled=Math.hypot(this.u,this.v)*dt;this.distance+=travelled;this.wheelRotation+=this.u/c.wheelRadius*dt;
  this.longitudinalAcceleration=approach(this.longitudinalAcceleration,(this.u-oldU)/dt,10,dt);
  this.lateralAcceleration=approach(this.lateralAcceleration,(1-blend)*this.u*this.yawRate+blend*(frontForce+rearForce)/m,10,dt);
  this.pitch=approach(this.pitch,clamp(this.longitudinalAcceleration*.006,-.06,.045),5,dt);
  this.roll=approach(this.roll,clamp(-this.lateralAcceleration*.007,-.075,.075),5,dt);
  const roadRoughness=this.offroad?.014:.0025;
  const motion=Math.min(1,speed/3),roadBob=(Math.sin(this.distance*2.1)+Math.sin(this.distance*5.6)*.38)*roadRoughness*motion;
  this.headX=approach(this.headX,clamp(this.lateralAcceleration*.006,-.045,.045),5,dt);
  this.headY=approach(this.headY,roadBob,12,dt);
  this.headZ=approach(this.headZ,clamp(this.longitudinalAcceleration*.004,-.03,.03),5,dt);
  const box=this.bounds;
  if(this.x<box.minX||this.x>box.maxX||this.z<box.minZ||this.z>box.maxZ){this.x=clamp(this.x,box.minX+.01,box.maxX-.01);this.z=clamp(this.z,box.minZ+.01,box.maxZ-.01);this.u*=-.08;this.v=0;this.yawRate*=.1;this.crashTimer=.7;this.pitch=-.045;}
 }
 getState(){return {position:{x:this.x,y:0,z:this.z},yaw:this.yaw,speed:this.u,speedKmh:Math.abs(this.u)*3.6,lateralSpeed:this.v,yawRate:this.yawRate,steeringWheel:this.steerActual*this.config.steeringRatio,wheelSteer:this.steerActual,wheelRotation:this.wheelRotation,rpm:this.rpm,gear:this.selector==='D'?'D'+this.autoGear:this.selector,selectedGear:this.selector,engineOn:this.engineOn,distance:this.distance,pitch:this.pitch,roll:this.roll,headOffset:{x:this.headX,y:this.headY,z:this.headZ},longitudinalAcceleration:this.longitudinalAcceleration,lateralAcceleration:this.lateralAcceleration,offroad:this.offroad,surface:this.surface,crash:this.crashTimer>0,throttle:this.throttleActual,brake:this.brakeActual,time:this.time}}
}
