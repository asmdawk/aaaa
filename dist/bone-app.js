import {
  boneLabels, diseaseStageLabels, diseaseStageNote, diseases, fractureLayers, fractures, fractureTypes,
} from './bone-content.js';

const frontViews = {
  'three-quarter': 'WIDOK POD KĄTEM',
  front: 'WIDOK Z PRZODU',
  right: 'WIDOK Z BOKU',
};
const layerColors = {
  bone: '#e4ceb2', skin: '#d4a995', muscles: '#c78589', marrow: '#e6b37b',
};
const initialLayers = ['bone', 'skin', 'muscles', 'marrow'];
const defaultBone = 'femur-right';

export function createBoneWorkbench({ icon, fullscreen }) {
  const root = document.querySelector('#condition-workspace');
  const find = (selector) => root.querySelector(selector);
  const findAll = (selector) => [...root.querySelectorAll(selector)];
  const boneSelect = find('#bone-choice');
  const diseaseSelect = find('#disease-choice');
  const layerList = find('#bone-layer-list');
  const stageList = find('#disease-stage-options');
  const motionButton = find('#bone-motion');
  const details = find('#bone-description');
  const stage = find('#condition-stage');
  const overlay = find('#bone-status');
  const boneForMode = { fracture: defaultBone, disease: defaultBone };
  const shownLayers = new Set(initialLayers);

  let activeMode = null;
  let visibleMode = null;
  let fracture = 'closed';
  let disease = 'osteoporosis';
  let diseaseStage = 'early';
  let view = 'three-quarter';
  let motion = false;
  let viewer;
  let initializing;
  let canInteract = false;
  let revision = 0;

  function appendText(parent, tag, string, className) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = string;
    parent.append(element);
    return element;
  }

  function setPressed(selector, matches) {
    for (const button of findAll(selector)) {
      button.setAttribute('aria-pressed', String(matches(button)));
    }
  }

  function addOptions(select, options) {
    for (const [value, name] of Object.entries(options)) {
      const option = appendText(select, 'option', name);
      option.value = value;
    }
  }

  for (const side of ['right', 'left']) {
    const group = document.createElement('optgroup');
    group.label = side === 'right' ? 'Strona prawa' : 'Strona lewa';
    addOptions(group, Object.fromEntries(Object.entries(boneLabels).filter(([id]) => id.endsWith('-' + side))));
    boneSelect.append(group);
  }
  addOptions(diseaseSelect, Object.fromEntries(Object.entries(diseases).map(([id, item]) => [id, item.title])));

  function renderLayers() {
    for (const button of findAll('[data-bone-layer]')) {
      const layer = button.dataset.boneLayer;
      const visible = shownLayers.has(layer);
      button.setAttribute('aria-pressed', String(visible));
      button.title = (visible ? 'Ukryj warstwę „' : 'Pokaż warstwę „') + fractureLayers[layer] + '”';
      button.setAttribute('aria-label', button.title);
      button.lastElementChild.innerHTML = icon(visible ? 'eye' : 'eyeOff');
    }
  }

  for (const [id, name] of Object.entries(fractureLayers)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.boneLayer = id;
    button.style.setProperty('--layer-tint', layerColors[id]);
    appendText(button, 'i', '').setAttribute('aria-hidden', 'true');
    appendText(button, 'span', name);
    appendText(button, 'span', '').setAttribute('data-icon', 'eye');
    button.addEventListener('click', () => {
      if (shownLayers.has(id)) shownLayers.delete(id);
      else shownLayers.add(id);
      run((instance) => instance.setLayer(id, shownLayers.has(id)));
      renderLayers();
      renderDetails();
    });
    layerList.append(button);
  }

  for (const [id, label] of Object.entries(diseaseStageLabels)) {
    const button = appendText(stageList, 'button', label);
    button.type = 'button';
    button.dataset.diseaseStage = id;
    button.addEventListener('click', () => {
      if (id === diseaseStage) return;
      diseaseStage = id;
      run((instance) => instance.setStage(id));
      render();
    });
  }

  function renderDetails() {
    details.replaceChildren();
    appendText(details, 'span', boneLabels[boneForMode[visibleMode]].toLocaleUpperCase('pl-PL'), 'structure-meta');
    const inDisease = visibleMode === 'disease';
    const selection = inDisease ? diseases[disease] : fractureTypes[fracture];
    appendText(details, 'h3', selection.title);
    appendText(details, 'p', selection.description);
    if (inDisease) {
      const { title, description } = selection.stages[diseaseStage];
      const comparison = appendText(details, 'dl', '');
      const item = appendText(comparison, 'div', '');
      appendText(item, 'dt', title);
      appendText(item, 'dd', description);
      appendText(details, 'p', diseaseStageNote, 'bone-note');
    } else {
      appendText(details, 'p', selection.detail);
      if (!shownLayers.has('skin')) {
        appendText(details, 'p', 'Warstwa skóry jest ukryta. Włącz ją, by zobaczyć różnicę w powierzchni tkanek.', 'bone-note');
      }
    }
    const source = appendText(details, 'a', 'Źródło medyczne (EN)', 'bone-source');
    source.href = selection.source ?? fractures.source;
    source.target = '_blank';
    source.rel = 'noopener';
  }

  function renderMotion() {
    motionButton.setAttribute('aria-pressed', String(motion));
    motionButton.firstElementChild.innerHTML = icon(motion ? 'stop' : 'play');
    const startLabel = visibleMode === 'disease' ? 'Obróć porównanie' : 'Pokaż ruch odłamów';
    motionButton.lastElementChild.textContent = motion ? 'Zatrzymaj' : startLabel;
  }

  function render() {
    const inDisease = visibleMode === 'disease';
    boneSelect.value = boneForMode[visibleMode];
    diseaseSelect.value = disease;
    find('#disease-setting').hidden = !inDisease;
    find('#disease-stages').hidden = !inDisease;
    find('#bone-comparison').hidden = !inDisease;
    find('#fracture-setting').hidden = inDisease;
    find('#fracture-layers').hidden = inDisease;
    find('#bone-view-label').textContent = frontViews[view];
    setPressed('[data-fracture]', (button) => button.dataset.fracture === fracture);
    setPressed('[data-disease-stage]', (button) => button.dataset.diseaseStage === diseaseStage);
    setPressed('[data-bone-view]', (button) => button.dataset.boneView === view);
    renderLayers();
    renderDetails();
    renderMotion();
  }

  function showLoading() {
    overlay.hidden = false;
    overlay.classList.remove('is-error');
    overlay.querySelector('strong').textContent = 'Wczytywanie kości';
    overlay.lastElementChild.textContent = 'Przygotowywanie modelu 3D';
  }

  function showError(error) {
    console.error(error);
    canInteract = false;
    overlay.hidden = false;
    overlay.classList.add('is-error');
    overlay.querySelector('strong').textContent = 'Nie udało się wczytać modelu kości';
    overlay.lastElementChild.textContent = 'Odśwież stronę w przeglądarce obsługującej WebGL 2.';
  }

  async function getViewer() {
    initializing ??= import('./bone-viewer.js').then(({ BoneConditionViewer }) => {
      viewer = new BoneConditionViewer(find('#bone-viewer'), {
        onError: showError,
        onMotion: (playing) => {
          motion = playing;
          if (activeMode !== null) renderMotion();
        },
      });
      viewer.setActive(activeMode !== null);
      return viewer;
    });
    return initializing;
  }

  function run(action) {
    if (!canInteract || !viewer || !activeMode) return;
    try {
      Promise.resolve(action(viewer)).catch(showError);
    } catch (error) {
      showError(error);
    }
  }

  function apply(instance, nextMode) {
    const bone = instance.setBone(boneForMode[nextMode]);
    if (nextMode === 'fracture') {
      instance.setFracture(fracture);
      for (const layer of initialLayers) instance.setLayer(layer, shownLayers.has(layer));
    } else {
      for (const layer of initialLayers) instance.setLayer(layer, true);
      instance.setDisease(disease);
      instance.setStage(diseaseStage);
    }
    instance.setView(view);
    return bone;
  }

  async function show(nextMode) {
    if (nextMode === activeMode) return;
    const nextRevision = ++revision;
    activeMode = nextMode;
    canInteract = false;
    if (motion && viewer) viewer.setMotion(false);
    motion = false;
    if (!nextMode) {
      viewer?.setActive(false);
      return;
    }

    if (visibleMode !== nextMode) view = 'three-quarter';
    visibleMode = nextMode;
    render();
    showLoading();
    try {
      const instance = await getViewer();
      if (revision !== nextRevision) return;
      instance.setActive(true);
      instance.setMode(nextMode);
      if (!await instance.ready || revision !== nextRevision) return;
      await apply(instance, nextMode);
      if (revision !== nextRevision) return;
      canInteract = true;
      overlay.hidden = true;
    } catch (error) {
      if (revision === nextRevision) showError(error);
    }
  }

  boneSelect.addEventListener('change', () => {
    boneForMode[visibleMode] = boneSelect.value;
    run((instance) => instance.setBone(boneSelect.value));
    renderDetails();
  });
  diseaseSelect.addEventListener('change', () => {
    disease = diseaseSelect.value;
    run((instance) => instance.setDisease(disease));
    renderDetails();
  });
  for (const button of findAll('[data-fracture]')) {
    button.addEventListener('click', () => {
      fracture = button.dataset.fracture;
      run((instance) => instance.setFracture(fracture));
      render();
    });
  }
  for (const button of findAll('[data-bone-view]')) {
    button.addEventListener('click', () => {
      view = button.dataset.boneView;
      run((instance) => instance.setView(view));
      render();
    });
  }
  find('#bone-zoom-in').addEventListener('click', () => run((instance) => instance.zoom(1.2)));
  find('#bone-zoom-out').addEventListener('click', () => run((instance) => instance.zoom(1 / 1.2)));
  find('#bone-center').addEventListener('click', () => run((instance) => instance.resetView()));
  find('#bone-fullscreen').addEventListener('click', () => fullscreen(stage));
  find('#reset-bone').addEventListener('click', () => {
    boneForMode[visibleMode] = defaultBone;
    view = 'three-quarter';
    motion = false;
    if (visibleMode === 'fracture') {
      fracture = 'closed';
      shownLayers.clear();
      for (const layer of initialLayers) shownLayers.add(layer);
    } else {
      disease = 'osteoporosis';
      diseaseStage = 'early';
    }
    run((instance) => {
      instance.setMotion(false);
      const bone = apply(instance, visibleMode);
      instance.resetView();
      return bone;
    });
    render();
  });
  motionButton.addEventListener('click', () => run((instance) => {
    motion = !motion;
    instance.setMotion(motion);
    renderMotion();
  }));

  return {
    show,
    capture: () => (canInteract ? viewer.capture() : null),
  };
}
