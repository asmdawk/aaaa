// Procedural interior soundscape. Harmonic engine banks suggest an engine;
// no recorded production-car sound or measured acoustic model is claimed.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const number=(v,fallback=0)=>Number.isFinite(Number(v))?Number(v):fallback;
export class EngineAudio {
 constructor(){
  this.enabled=true;this.context=null;this.master=null;this.nodes=[];this.sources=[];this.horns=new Set();this.pending=null;this.disposed=false;this.lastHorn=-Infinity;
 }
 async unlock(){
  if(this.disposed)return false;
  if(this.pending)return this.pending;
  this.pending=this._unlock();
  try{return await this.pending}catch{return false}finally{this.pending=null}
 }
 async _unlock(){
  try{
   if(!this.context){
    const AudioContextType=globalThis.AudioContext||globalThis.webkitAudioContext;
    if(!AudioContextType)return false;
    this.context=new AudioContextType({latencyHint:'interactive'});this._build();
   }
   if(this.context.state==='suspended')await this.context.resume();
   this._target(this.master.gain,this.enabled?.18:0,.04);
   return this.context.state==='running';
  }catch{
   try{await this.context?.close()}catch{}
   this.context=null;this.master=null;this.nodes=[];this.sources=[];return false;
  }
 }
 _node(node){this.nodes.push(node);return node}
 _source(node){this.sources.push(node);this.nodes.push(node);return node}
 _target(param,value,time=.08){if(!param||!this.context)return;try{param.setTargetAtTime(value,this.context.currentTime,time)}catch{}}
 _build(){
  const ctx=this.context;
  this.master=this._node(ctx.createGain());this.master.gain.value=this.enabled?.18:0;
  const limiter=this._node(ctx.createDynamicsCompressor());limiter.threshold.value=-13;limiter.knee.value=8;limiter.ratio.value=8;limiter.attack.value=.006;limiter.release.value=.18;limiter.connect(this.master);this.master.connect(ctx.destination);this.output=limiter;
  this.engineGate=this._node(ctx.createGain());this.engineGate.gain.value=0;
  this.engineFilter=this._node(ctx.createBiquadFilter());this.engineFilter.type='lowpass';this.engineFilter.frequency.value=1000;this.engineFilter.Q.value=.55;
  const saturation=this._node(ctx.createWaveShaper()),curve=new Float32Array(512);
  for(let i=0;i<curve.length;i++){const x=i/(curve.length-1)*2-1;curve[i]=Math.tanh(x*1.5)/Math.tanh(1.5)}saturation.curve=curve;saturation.oversample='2x';
  this.engineFilter.connect(saturation);saturation.connect(this.engineGate);this.engineGate.connect(limiter);
  const real=new Float32Array(25),imag=new Float32Array(25);
  for(let i=1;i<25;i++){imag[i]=(i%2?1:.65)/Math.pow(i,1.35);real[i]=Math.sin(i*1.37)*.035/i}
  const wave=ctx.createPeriodicWave(real,imag,{disableNormalization:false});
  this.banks=[];
  for(const [multiple,detune,level] of [[1,-8,.20],[1,8,.20],[.5,0,.13],[2,3,.055]]){
   const osc=this._source(ctx.createOscillator()),gain=this._node(ctx.createGain());osc.setPeriodicWave(wave);osc.frequency.value=28*multiple;osc.detune.value=detune;gain.gain.value=level;osc.connect(gain);gain.connect(this.engineFilter);osc.start();this.banks.push({osc,multiple});
  }
  // One deterministic, looping noise buffer supplies intake, road and wind.
  const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*2),ctx.sampleRate),channel=buffer.getChannelData(0);let seed=19373;
  for(let i=0;i<channel.length;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;channel[i]=((seed>>>0)/4294967296)*2-1}
  const noise=()=>{const source=this._source(ctx.createBufferSource());source.buffer=buffer;source.loop=true;source.start();return source};
  this.intakeGain=this._node(ctx.createGain());this.intakeGain.gain.value=0;const intakeFilter=this._node(ctx.createBiquadFilter());intakeFilter.type='bandpass';intakeFilter.frequency.value=320;intakeFilter.Q.value=.8;noise().connect(intakeFilter);intakeFilter.connect(this.intakeGain);this.intakeGain.connect(this.engineGate);
  this.windGain=this._node(ctx.createGain());this.windGain.gain.value=0;const windHigh=this._node(ctx.createBiquadFilter()),windLow=this._node(ctx.createBiquadFilter());windHigh.type='highpass';windHigh.frequency.value=350;windLow.type='lowpass';windLow.frequency.value=2300;noise().connect(windHigh);windHigh.connect(windLow);windLow.connect(this.windGain);this.windGain.connect(limiter);
  this.roadGain=this._node(ctx.createGain());this.roadGain.gain.value=0;this.roadFilter=this._node(ctx.createBiquadFilter());this.roadFilter.type='lowpass';this.roadFilter.frequency.value=380;noise().connect(this.roadFilter);this.roadFilter.connect(this.roadGain);this.roadGain.connect(limiter);
  // A narrow-band friction hiss only appears during stronger lateral loads.
  this.tireGain=this._node(ctx.createGain());this.tireGain.gain.value=0;this.tireFilter=this._node(ctx.createBiquadFilter());this.tireFilter.type='bandpass';this.tireFilter.frequency.value=1250;this.tireFilter.Q.value=3;noise().connect(this.tireFilter);this.tireFilter.connect(this.tireGain);this.tireGain.connect(limiter);
 }
 setEnabled(value){this.enabled=!!value;if(this.master)this._target(this.master.gain,this.enabled?.18:0,.05);return this}
 update(dt,state={}){
  if(!this.context||!this.master||this.context.state!=='running'||this.disposed)return;
  const rpm=clamp(number(state.rpm),0,8000),speed=clamp(Math.abs(number(state.speedKmh)),0,300),throttle=clamp(number(state.throttle),0,1),on=!!state.engineOn;
  const firing=Math.max(23,rpm/60*2);
  for(const bank of this.banks)this._target(bank.osc.frequency,firing*bank.multiple,.035);
  this._target(this.engineFilter.frequency,550+rpm*.32+throttle*520,.07);
  this._target(this.engineGate.gain,on?.28+throttle*.38:0,on?.12:.16);
  this._target(this.intakeGain.gain,on?.018+throttle*.075:0,.08);
  this._target(this.windGain.gain,Math.pow(speed/180,1.6)*.085,.25);
  const moving=clamp(speed/60,0,1),wet=state.surface==='wet'||state.wet===true;
  this._target(this.roadGain.gain,moving*(state.offroad?.12:wet?.065:.035),.12);
  this._target(this.roadFilter.frequency,state.offroad?230:wet?1000:420,.14);
  const corner=clamp((Math.abs(number(state.lateralAcceleration))-3.8)/6,0,1),hardBrake=clamp((number(state.brake)-.85)*5,0,1);
  this._target(this.tireGain.gain,speed>18?(Math.max(corner,hardBrake*.25))*(wet?.025:.055):0,.10);
 }
 async horn(){
  if(!this.enabled||this.disposed||!await this.unlock())return false;
  if(this.disposed||!this.enabled||!this.context)return false;
  const ctx=this.context,now=ctx.currentTime;if(now-this.lastHorn<.27)return false;this.lastHorn=now;
  for(const frequency of [330,440]){
   const osc=ctx.createOscillator(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();osc.type='sawtooth';osc.frequency.value=frequency;filter.type='lowpass';filter.frequency.value=1350;filter.Q.value=.6;
   gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.13,now+.018);gain.gain.setValueAtTime(.13,now+.20);gain.gain.exponentialRampToValueAtTime(.0001,now+.34);
   osc.connect(filter);filter.connect(gain);gain.connect(this.output);const entry={osc,gain,filter};this.horns.add(entry);
   osc.onended=()=>{osc.disconnect();gain.disconnect();filter.disconnect();this.horns.delete(entry)};osc.start(now);osc.stop(now+.36);
  }return true;
 }
 dispose(){
  if(this.disposed)return;this.disposed=true;
  for(const source of this.sources)try{source.stop()}catch{}
  for(const entry of this.horns){try{entry.osc.stop()}catch{}for(const n of [entry.osc,entry.gain,entry.filter])try{n.disconnect()}catch{}}
  for(const node of this.nodes)try{node.disconnect()}catch{}
  const ctx=this.context;this.context=null;this.master=null;this.horns.clear();this.nodes=[];this.sources=[];try{const closing=ctx?.close();closing?.catch?.(()=>{})}catch{}
 }
}
