import { describeStructure } from './anatomy-info.js';

const $ = (query) => document.querySelector(query);
const $$ = (query) => [...document.querySelectorAll(query)];

const shapes = {
  brand: '<path d="M12 2.9c1.6 3.3 4.6 5.7 8.8 6.5-4.2 1.3-7.1 4-8.8 8-1.7-4-4.6-6.7-8.8-8 4.2-.8 7.2-3.2 8.8-6.5Z"/><path d="m11 13-2.8 6L3 18m10-5 2.8 6 5.2-1m-9-.8V22"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.4-3 4m.1 3h.01"/>',
  download: '<path d="M12 3v11m-4-4 4 4 4-4M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
  cube: '<path d="m12 2.8 8 4.6v9.2l-8 4.6-8-4.6V7.4l8-4.6Z"/><path d="m4 7.4 8 4.6 8-4.6M12 12v9"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
  muscle: '<path d="M4 17c6-1 4-8 11-11 1-.5 3-1 5-1-1 2-2 3-2 5-2 6-6 8-12 9m2-2c5-2 5-6 9-8"/>',
  bone: '<path d="M15 7a3 3 0 1 1 4-4 3 3 0 1 1 1 6l-8 7a3 3 0 1 1-4 4 3 3 0 1 1-3-4l10-9Z"/>',
  organ: '<path d="M20.8 8.5c0 4.5-5.3 8.6-8.8 11-3.5-2.4-8.8-6.5-8.8-11A4.5 4.5 0 0 1 12 7.2a4.5 4.5 0 0 1 8.8 1.3Z"/><path d="M7 12h3l1-2 2 4 1-2h3"/>',
  vessel: '<path d="M12 3v18m0-7 6-5V4m-6 13-6-4V7m12 2 3 2M6 13l-3 2"/>',
  nerve: '<path d="m13 3-4 7h5l-3 11 8-12h-6l3-6m-9 8-3 3m2 3-2 4"/>',
  skin: '<path d="M4 11c0-2 3-5 8-5s8 2 8 5-2 5-3 5-2-1-3-1-2 3-4 3-2-2-3-3-3-2-3-4Z"/><path d="M7 11c2-2 6-3 10-1"/>',
  eye: '<path d="M2.5 12s3.5-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.5 5.5-9.5 5.5S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.1"/>',
  eyeOff: '<path d="m4 4 16 16M10 6.7l2-.2c6 0 9.5 5.5 9.5 5.5a15 15 0 0 1-3 3.2M6.2 8.4C3.8 10 2.5 12 2.5 12s3.5 5.5 9.5 5.5c1.4 0 2.7-.3 3.9-.8"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 10.7v5.5m0-8.3h.01"/>',
  reset: '<path d="M4 11a8 8 0 1 1 1.7 6.2M4 5v6h6"/>',
  expand: '<path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"/>',
  orbit: '<ellipse cx="12" cy="12" rx="9.5" ry="4.8" transform="rotate(-39 12 12)"/><path d="M8 6a7 7 0 0 1 10 8m-2 4A7 7 0 0 1 6 9"/><circle cx="12" cy="12" r="1"/>',
  hand: '<path d="M8 13V6a1.5 1.5 0 1 1 3 0v5-7a1.5 1.5 0 1 1 3 0v7-5a1.5 1.5 0 1 1 3 0v6-3a1.5 1.5 0 1 1 3 0v5a7 7 0 0 1-7 7h-1a6 6 0 0 1-4-2l-4-4a1.6 1.6 0 0 1 2.2-2.3L8 14"/>',
  plus: '<path d="M6 12h12m-6-6v12"/>', minus: '<path d="M6 12h12"/>',
  target: '<circle cx="12" cy="12" r="6"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/><circle cx="12" cy="12" r="1.1"/>',
  focus: '<path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4"/><path d="M12 8v8m-4-4h8"/>',
  motion: '<path d="M2 12h4l3-7 4 14 3-7h6"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  play: '<path d="m8 5 11 7-11 7V5Z" fill="currentColor" stroke="none"/>',
  stop: '<path d="M6 6h12v12H6z" fill="currentColor" stroke="none"/>',
  mouse: '<rect x="6" y="3" width="12" height="18" rx="6"/><path d="M12 6v4"/>',
  camera: '<path d="M8 6.5 9.5 4h5L16 6.5h3.5a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V8A1.5 1.5 0 0 1 4.5 6.5H8Z"/><circle cx="12" cy="13" r="3.3"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  isolate: '<rect x="4" y="4" width="16" height="16" rx="3" stroke-dasharray="2 3"/><circle cx="12" cy="12" r="3"/>',
};

function svg(icon) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + shapes[icon] + '</svg>';
}

function placeIcons(parent = document) {
  parent.querySelectorAll('[data-icon]').forEach((node) => {
    node.innerHTML = svg(node.dataset.icon);
  });
}

const layers = [
  { id: 'muscles', name: 'Мышцы', color: '#ee8b7e', icon: 'muscle' },
  { id: 'bones', name: 'Кости', color: '#e7cfa8', icon: 'bone' },
  { id: 'organs', name: 'Органы', color: '#d292ac', icon: 'organ' },
  { id: 'vessels', name: 'Сосуды', color: '#e18f92', icon: 'vessel' },
  { id: 'nerves', name: 'Нервы', color: '#e2bd73', icon: 'nerve' },
  { id: 'skin', name: 'Кожа', color: '#d8a48b', icon: 'skin' },
];

const joints = {
  shoulder: { min: -35, max: 150, motion: 'Сгибание' },
  elbow: { min: 0, max: 145, motion: 'Сгибание' },
  wrist: { min: -70, max: 75, motion: 'Сгибание' },
  hip: { min: -25, max: 120, motion: 'Сгибание' },
  knee: { min: 0, max: 140, motion: 'Сгибание' },
  ankle: { min: -35, max: 45, motion: 'Сгибание стопы' },
  neck: { min: -35, max: 45, motion: 'Наклон' },
};

const viewNames = {
  front: 'ВИД СПЕРЕДИ', back: 'ВИД СЗАДИ', right: 'ВИД СБОКУ',
  left: 'ВИД СБОКУ', 'three-quarter': 'ВИД В ¾',
};
const layerById = Object.fromEntries(layers.map((layer) => [layer.id, layer]));
const visible = new Set(['muscles']);
const opacities = new Map();
let skinOpacitySetByUser = false;
const layerList = $('#layers');
const opacity = $('#opacity');
const angle = $('#angle');
const jointSelect = $('#joint');

let viewer;
let ready = false;
let activeLayer = 'muscles';
let side = 'right';
let selection = null;
let isolated = false;
let animation = null;
let toastTimer;
let mode = 'orbit';

function markRange(input) {
  const progress = (Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min));
  input.style.setProperty('--range-progress', (progress * 100) + '%');
}

function renderLayers() {
  for (const layer of layers) {
    const row = layerList.querySelector('[data-layer="' + layer.id + '"]');
    const show = visible.has(layer.id);
    const eye = row.querySelector('.layer-eye');
    const main = row.querySelector('.layer-main');
    row.classList.toggle('is-active', activeLayer === layer.id);
    main.setAttribute('aria-pressed', String(activeLayer === layer.id));
    eye.setAttribute('aria-pressed', String(show));
    eye.title = (show ? 'Скрыть слой «' : 'Показать слой «') + layer.name + '»';
    eye.setAttribute('aria-label', eye.title);
    const icon = eye.firstElementChild;
    const eyeIcon = show ? 'eye' : 'eyeOff';
    if (icon.dataset.icon !== eyeIcon) {
      icon.dataset.icon = eyeIcon;
      icon.innerHTML = svg(eyeIcon);
    }
  }
  opacity.value = opacities.get(activeLayer) ?? 100;
  $('#opacity-value').textContent = opacity.value + '%';
  $('#opacity-layer').textContent = layerById[activeLayer].name;
  markRange(opacity);
}

for (const layer of layers) {
  const row = document.createElement('div');
  row.className = 'layer-row';
  row.dataset.layer = layer.id;
  row.style.setProperty('--layer-color', layer.color);
  row.innerHTML = '<button type="button" class="layer-main"><span class="layer-symbol" data-icon="' +
    layer.icon + '"></span><span>' + layer.name + '</span></button><button type="button" class="layer-eye"><span></span></button>';
  row.querySelector('.layer-main').addEventListener('click', () => {
    visible.clear();
    visible.add(layer.id);
    activeLayer = layer.id;
    if (layer.id === 'skin' && !skinOpacitySetByUser) setOpacity('skin', 100);
    updateLayerVisibility();
  });
  row.querySelector('.layer-eye').addEventListener('click', () => {
    if (visible.has(layer.id)) {
      visible.delete(layer.id);
      if (activeLayer === layer.id && visible.size) activeLayer = visible.values().next().value;
    } else {
      visible.add(layer.id);
      activeLayer = layer.id;
    }
    if (!skinOpacitySetByUser && visible.has('skin')) {
      setOpacity('skin', visible.size > 1 ? 24 : 100);
    }
    viewer?.setLayer(layer.id, visible.has(layer.id));
    renderLayers();
  });
  layerList.append(row);
}

function setOpacity(layer, value) {
  opacities.set(layer, value);
  viewer?.setLayerOpacity(layer, value / 100);
}

function updateLayerVisibility() {
  if (viewer) {
    for (const layer of layers) viewer.setLayer(layer.id, visible.has(layer.id));
  }
  renderLayers();
}

function addStructureText(container, tag, text, className) {
  if (!text) return;
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  container.append(node);
}

function renderStructure() {
  const panel = $('#structure');
  panel.replaceChildren();
  if (!selection) {
    panel.style.removeProperty('--selection-color');
    addStructureText(panel, 'div', 'ПРОСМОТР СТРУКТУР', 'structure-meta');
    addStructureText(panel, 'h3', 'Выберите структуру');
    addStructureText(panel, 'p', 'Нажмите на любую видимую часть тела, чтобы узнать её название и функцию.');
    return;
  }

  const info = describeStructure(selection);
  panel.style.setProperty('--selection-color', layerById[selection.layer]?.color ?? '#f4867c');
  addStructureText(panel, 'div', [info.group, info.sideLabel].filter(Boolean).join(' · ').toUpperCase(), 'structure-meta');
  addStructureText(panel, 'h3', info.title);
  addStructureText(panel, 'div', info.latin, 'latin');
  addStructureText(panel, 'p', info.description);

  const actions = document.createElement('div');
  actions.className = 'structure-actions';
  actions.innerHTML = '<button class="subtle-button" type="button" data-action="focus"><span data-icon="target"></span> Приблизить</button>' +
    '<button class="subtle-button" type="button" data-action="isolate" aria-pressed="' + isolated + '"><span data-icon="isolate"></span> ' +
    (isolated ? 'Вернуть слои' : 'Изолировать') + '</button>';
  actions.querySelector('[data-action="focus"]').onclick = () => viewer?.focusSelection();
  actions.querySelector('[data-action="isolate"]').onclick = () => {
    isolated = !isolated;
    viewer?.setIsolation(isolated);
    renderStructure();
  };
  panel.append(actions);
  placeIcons(actions);
}

function onSelection(item) {
  selection = item;
  if (!item && isolated) {
    isolated = false;
    viewer?.setIsolation(false);
  }
  if (item && layerById[item.layer]) {
    activeLayer = item.layer;
    renderLayers();
  }
  renderStructure();
}

function renderPose(currentAngle = viewer?.getPose(jointSelect.value, side) ?? 0) {
  const joint = jointSelect.value;
  const definition = joints[joint];
  const [min, max] = viewer?.jointRanges?.[joint] ?? [definition.min, definition.max];
  angle.min = min;
  angle.max = max;
  angle.value = currentAngle;
  $('#angle-label').firstChild.nodeValue = definition.motion + ' ';
  $('#angle-value').textContent = Math.round(currentAngle) + '°';
  $('#angle-min').textContent = min + '°';
  $('#angle-max').textContent = max + '°';
  $('#side-toggle').hidden = joint === 'neck';
  $$('[data-side]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.side === side)));
  markRange(angle);
}

function onPose({ joint, angle: value, side: nextSide }) {
  if (animation && (joint !== animation.joint || nextSide !== animation.side)) stopAnimation();
  jointSelect.value = joint;
  if (joint !== 'neck') side = nextSide;
  renderPose(value);
}

function showView(view) {
  $('#view-label').textContent = viewNames[view] ?? viewNames.front;
  $$('[data-view]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
}

function setMode(nextMode) {
  mode = nextMode;
  viewer?.setMode(mode);
  $('#stage').classList.toggle('is-pose', mode === 'pose');
  for (const button of $$('.mode-button')) {
    const active = button.id === mode + '-mode';
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  $('#stage-hint span:last-child').textContent = mode === 'pose'
    ? 'Потяните метку сустава, чтобы изменить угол.'
    : 'Тяните для вращения · колесо для масштаба · клик по структуре';
}

const play = $('#play');
function renderPlay() {
  play.firstElementChild.innerHTML = svg(animation ? 'stop' : 'play');
  play.lastElementChild.textContent = animation ? 'Остановить' : 'Показать движение';
  play.setAttribute('aria-pressed', String(Boolean(animation)));
}

function stopAnimation() {
  if (animation) cancelAnimationFrame(animation.frame);
  animation = null;
  renderPlay();
}

function toggleAnimation() {
  if (animation) {
    stopAnimation();
    return;
  }
  if (!ready) return;
  const joint = jointSelect.value;
  const original = viewer.getPose(joint, side);
  const target = Math.round(Number(angle.max) * .72);
  const sequence = { joint, side, frame: 0, start: performance.now() };
  animation = sequence;
  renderPlay();
  function tick(now) {
    if (animation !== sequence) return;
    const t = Math.min((now - sequence.start) / 2650, 1);
    const weight = (1 - Math.cos(t * Math.PI * 2)) / 2;
    viewer.setPose(joint, original + (target - original) * weight, sequence.side);
    if (t < 1) sequence.frame = requestAnimationFrame(tick);
    else stopAnimation();
  }
  sequence.frame = requestAnimationFrame(tick);
}

function showToast(message) {
  const toast = $('#toast');
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2900);
}

const dialogs = {
  help: ['Как пользоваться', `<ul>
    <li>Потяните модель, чтобы повернуть её. Прокрутите колесо или сведите пальцы, чтобы изменить масштаб.</li>
    <li>Нажмите на название слоя, чтобы показать его отдельно. Кнопки с глазом позволяют совместить несколько слоёв.</li>
    <li>Нажмите на структуру, чтобы прочитать описание. В инспекторе её можно приблизить или изолировать.</li>
    <li>Выберите сустав и сторону, затем измените угол. Инструмент с ладонью добавляет на модель метки, которые можно перетаскивать.</li>
  </ul>`],
  sources: ['О модели', `<p>Интерактивный атлас содержит 250 структур на основе Z-Anatomy и BodyParts3D. Геометрию для браузера подготовил проект Astronaut Health Intelligence Platform. В Anatomical добавлены русские подписи, материалы и анимация суставов.</p>
    <p>Суставы вращаются вокруг центров, рассчитанных по костям. Мягкие ткани деформируются приближённо, чтобы показать движение в учебных целях.</p>
    <p><a href="./assets/anatomy/LICENSE.md" target="_blank" rel="noopener">Авторы и лицензии модели</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.ru" target="_blank" rel="noopener">CC BY-SA 4.0</a></p>`],
};

const dialog = $('#dialog');
function openDialog(name) {
  const [title, body] = dialogs[name];
  $('#dialog-title').textContent = title;
  $('#dialog-content').innerHTML = body;
  dialog.showModal();
}

$('#help').addEventListener('click', () => openDialog('help'));
$('#sources').addEventListener('click', () => openDialog('sources'));
$('#close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
$('#download').addEventListener('click', () => {
  window.location.href = 'https://raw.githubusercontent.com/asmdawk/aaaa/anatomical-download/Anatomical.zip';
});
$('#reset-layers').addEventListener('click', () => {
  visible.clear();
  visible.add('muscles');
  activeLayer = 'muscles';
  opacities.clear();
  skinOpacitySetByUser = false;
  for (const layer of layers) viewer?.setLayerOpacity(layer.id, 1);
  viewer?.clearSelection();
  updateLayerVisibility();
});
opacity.addEventListener('input', () => {
  if (activeLayer === 'skin') skinOpacitySetByUser = true;
  setOpacity(activeLayer, Number(opacity.value));
  $('#opacity-value').textContent = opacity.value + '%';
  markRange(opacity);
});
jointSelect.addEventListener('change', () => {
  stopAnimation();
  viewer?.selectJoint(jointSelect.value, side);
  renderPose();
});
$$('[data-side]').forEach((button) => button.addEventListener('click', () => {
  stopAnimation();
  side = button.dataset.side;
  viewer?.selectJoint(jointSelect.value, side);
  renderPose();
}));
angle.addEventListener('input', () => {
  stopAnimation();
  viewer?.setPose(jointSelect.value, Number(angle.value), side);
  renderPose(Number(angle.value));
});
play.addEventListener('click', toggleAnimation);
$('#reset-pose').addEventListener('click', () => {
  stopAnimation();
  viewer?.resetPose();
  renderPose();
});
$$('[data-view]').forEach((button) => button.addEventListener('click', () => viewer?.setView(button.dataset.view)));
$('#orbit-mode').addEventListener('click', () => setMode('orbit'));
$('#pose-mode').addEventListener('click', () => setMode('pose'));
$('#zoom-in').addEventListener('click', () => viewer?.zoom(1.2));
$('#zoom-out').addEventListener('click', () => viewer?.zoom(1 / 1.2));
$('#center').addEventListener('click', () => viewer?.resetView());
$('#fullscreen').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if ($('#stage').requestFullscreen) await $('#stage').requestFullscreen();
    else showToast('Полноэкранный режим недоступен в этом браузере');
  } catch {
    showToast('Полноэкранный режим недоступен в этом браузере');
  }
});
$('#capture').addEventListener('click', () => {
  if (!ready) return;
  try {
    const url = viewer.capture();
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Anatomical.png';
    link.click();
    showToast('Снимок модели сохранён');
  } catch {
    showToast('Браузеру не удалось сохранить снимок');
  }
});

placeIcons();
renderLayers();
renderStructure();
renderPose();

const status = $('#viewer-status');
function showError(error) {
  console.error(error);
  ready = false;
  status.hidden = false;
  status.classList.add('is-error');
  status.querySelector('strong').textContent = '3D-модель не открылась';
  $('#progress-label').textContent = 'Обновите страницу в браузере с поддержкой WebGL 2.';
}

try {
  const { AnatomyViewer } = await import('./viewer.js');
  viewer = new AnatomyViewer($('#viewer'), {
    onProgress: (fraction) => {
      $('#progress-label').textContent = 'Подготовка анатомических слоёв · ' + Math.round(fraction * 100) + '%';
    },
    onReady: () => {
      ready = true;
      status.hidden = true;
      updateLayerVisibility();
      for (const [layer, value] of opacities) viewer.setLayerOpacity(layer, value / 100);
      viewer.selectJoint(jointSelect.value, side);
      setMode(mode);
    },
    onError: showError,
    onSelect: onSelection,
    onPose,
    onView: showView,
  });
} catch (error) {
  showError(error);
}
