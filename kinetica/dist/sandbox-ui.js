import {LIQUIDS} from './liquids.js';
const $=id=>document.getElementById(id);
const format=(n,d=0)=>Number(n).toLocaleString('ru-RU',{maximumFractionDigits:d});
function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el}
function paintOrb(el,color){el.style.background=`radial-gradient(circle at 28% 22%,#edffff,${color} 45%,#1a2b37 100%)`;el.style.boxShadow=`inset -4px -5px 10px #0004,0 0 16px ${color}22`}
export function initSandboxUI(sandbox,toast=()=>{}){
 let chosen=LIQUIDS.find(l=>l.id==='water')||LIQUIDS[0],category='Все',initialized=false,enabled=false;
 const dialog=$('liquidDialog'),catalog=$('liquidCatalog'),search=$('liquidSearch');
 const categories=['Все',...new Set(LIQUIDS.map(l=>l.category))];
 $('liquidCount').textContent=String(LIQUIDS.length);
 function choose(l){chosen=l;$('chosenName').textContent=l.name;$('chosenDensity').textContent=format(l.density);$('chosenViscosity').textContent=format(l.viscosity,2);$('chosenNote').textContent=l.note;paintOrb($('chosenOrb'),l.color);renderCatalog()}
 function renderCatalog(){
  const term=search.value.trim().toLocaleLowerCase('ru');catalog.replaceChildren();
  const list=LIQUIDS.filter(l=>(category==='Все'||l.category===category)&&(!term||[l.name,l.id,l.category,l.note].join(' ').toLocaleLowerCase('ru').includes(term)));
  for(const l of list){const button=node('button','liquid-card'+(chosen.id===l.id?' active':''));button.type='button';button.setAttribute('aria-pressed',String(chosen.id===l.id));button.title=l.note;const orb=node('span','liquid-orb');paintOrb(orb,l.color);const text=node('div');text.append(node('b','',l.name),node('small','',`${format(l.density)} кг/м³ · ${format(l.viscosity,2)} мПа·с`));button.append(orb,text);button.onclick=()=>{choose(l);dialog.close();toast(`Выбрано: ${l.name}`)};catalog.append(button)}
  if(!list.length){const empty=node('p','control-note','Ничего не найдено. Попробуйте другое название или категорию.');empty.style.gridColumn='1 / -1';empty.style.margin='18px 0';catalog.append(empty)}
 }
 for(const name of categories){const b=node('button',name===category?'active':'',name);b.type='button';b.onclick=()=>{category=name;for(const c of $('liquidCategories').children)c.classList.toggle('active',c===b);renderCatalog()};$('liquidCategories').append(b)}
 search.addEventListener('input',renderCatalog);
 $('openLiquids').onclick=()=>{renderCatalog();dialog.showModal();search.focus()};
 dialog.querySelector('.dialog-close').onclick=()=>dialog.close();
 dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dialog.close()});
 function renderState(state=sandbox.getState()){
  $('fillLabel').textContent=`${format(state.totalLitres)} / ${format(state.capacityLitres)} л`;
  $('fillBar').style.width=`${Math.max(0,Math.min(100,state.fillPercent))}%`;
  $('layerCount').textContent=String(state.layers.length);$('liquidLayers').replaceChildren();
  // List is top-to-bottom in screen space, corresponding to the visible vessel.
  const reversed=[...state.layers].reverse();
  for(let i=0;i<reversed.length;i++){const l=reversed[i],row=node('div','liquid-layer'),bar=node('i');bar.style.background=l.color;const details=node('div');details.append(node('b','',l.name),node('small','',`${format(l.litres)} л · ${format(l.density)} кг/м³${reversed.length>1?(i===0?' · сверху':i===reversed.length-1?' · снизу':''):''}`));const remove=node('button','','×');remove.type='button';remove.title=`Удалить: ${l.name}`;remove.setAttribute('aria-label',`Удалить слой ${l.name}`);remove.onclick=()=>{sandbox.removeLiquid(l.id);toast(`Удалён слой: ${l.name}`)};row.append(bar,details,remove);$('liquidLayers').append(row)}
  if(!state.layers.length){const p=node('p','control-note','Контейнер пуст. Выберите жидкость и нажмите «Налить».');p.style.margin='0 0 23px';$('liquidLayers').append(p)}
  $('pour').disabled=!enabled||state.fillPercent>=99.999;$('mix').disabled=!enabled||state.layers.length<2;$('drain').disabled=!enabled||!state.layers.length;
  document.querySelectorAll('[data-container]').forEach(b=>{const active=b.dataset.container===state.container;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
 }
 const previousChange=sandbox.onChange;sandbox.onChange=state=>{previousChange?.(state);renderState(state)};
 $('pourVolume').oninput=()=>{$('pourVolumeValue').textContent=`${format($('pourVolume').value)} л`};
 $('pour').onclick=()=>{const requested=Number($('pourVolume').value),accepted=sandbox.addLiquid(chosen.id,requested);if(accepted<requested-.01)toast(`Добавлено ${format(accepted)} л — контейнер заполнен`);else toast(`${chosen.name}: добавлено ${format(accepted)} л`)};
 $('mix').onclick=()=>{const before=sandbox.getState().layers.length;sandbox.mix();const after=sandbox.getState().layers.length;toast(after<before?'Совместимые группы объединены. Объём сохранён.':'Группы различаются: слои остаются раздельными.');$('agitation').value=Math.round(sandbox.agitation*100);$('agitationValue').textContent=`${$('agitation').value}%`};
 $('drain').onclick=()=>{sandbox.drain();toast('Контейнер пуст')};
 const pause=$('pauseLiquids');
 if(pause){pause.setAttribute('aria-pressed',String(sandbox.paused));pause.onclick=()=>{sandbox.setPaused(!sandbox.paused);pause.textContent=sandbox.paused?'Продолжить':'Пауза волн';pause.setAttribute('aria-pressed',String(sandbox.paused));toast(sandbox.paused?'Волны и эффекты приостановлены':'Симуляция продолжается')}};
 $('agitation').oninput=()=>{const v=Number($('agitation').value);$('agitationValue').textContent=`${v}%`;sandbox.setAgitation(v/100)};
 $('liquidOpacity').oninput=()=>{const v=Number($('liquidOpacity').value);$('liquidOpacityValue').textContent=`${v}%`;sandbox.setOpacity(v/100)};
 document.querySelectorAll('[data-container]').forEach(b=>b.onclick=()=>{const type=b.dataset.container,current=sandbox.getState(),capacity=type==='cylinder'?Math.PI*.55*.55*1.9*1000:1463;if(current.totalLitres>capacity+.001){toast('Для бокса сначала уменьшите объём до 1 463 л.');return}sandbox.setContainer(type);toast(type==='cylinder'?'Цилиндрический контейнер':'Прямоугольный контейнер')});
 const scenarios={oil:[['water',400],['sunfloweroil',200]],diesel:[['water',400],['diesel',200]],syrup:[['glycerol',250],['honey',150],['water',200]]};
 document.querySelectorAll('[data-scenario]').forEach(b=>b.onclick=()=>{const recipe=scenarios[b.dataset.scenario];if(!recipe)return;sandbox.drain();for(const [id,litres] of recipe)sandbox.addLiquid(id,litres);toast('Эксперимент готов. Плотные слои располагаются ниже.')});
 choose(chosen);sandbox.setAgitation(Number($('agitation').value)/100);sandbox.setOpacity(Number($('liquidOpacity').value)/100);renderState();
 return {
  enable(value){enabled=!!value;sandbox.setEnabled(enabled);if(enabled&&!initialized){initialized=true;if(!sandbox.getState().totalLitres)sandbox.addLiquid('water',350)}renderState();return this},
  getState(){return {...sandbox.getState(),chosenLiquid:chosen.id,pourVolume:Number($('pourVolume').value)}},
  get isInitialized(){return initialized}
 };
}
