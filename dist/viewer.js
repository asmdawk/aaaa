import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/controls/OrbitControls.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { MeshoptDecoder } from './vendor/libs/meshopt_decoder.module.js';
import { createAnatomyRig } from './rig.js';

const ASSET_ROOT = new URL('./assets/anatomy/', import.meta.url);
const TAU = Math.PI * 2;
const LAYERS = ['muscles', 'bones', 'organs', 'skin', 'nerves', 'vessels'];
const JOINTS = {
  neck: [-35, 45],
  shoulder: [-35, 150],
  elbow: [0, 145],
  wrist: [-70, 75],
  hip: [-25, 120],
  knee: [0, 140],
  ankle: [-35, 45],
};
const VIEWS = {
  front: [0, 0.01, 1],
  back: [0, 0.01, -1],
  left: [1, 0.01, 0],
  right: [-1, 0.01, 0],
  'three-quarter': [0.55, 0.025, 1],
};
const TISSUE_COLORS = {
  muscle: '#b86b63', tendon: '#d6c3af', bone: '#e9decc', tooth: '#f1e6d4',
  cartilage: '#c6d5d9', skin: '#ce9c80', artery: '#bb393d', vein: '#536a9d',
  nerve: '#dfbc65', heart: '#ad5049', airway: '#d4c5c7', lung: '#d2989a',
  brain: '#d8aaa5', gut: '#c9877a', liver: '#9b5758', organ: '#bd827a',
  gland: '#d0a269', kidney: '#ad6661', eye: '#eee7de',
};

function layerFor(structure) {
  const { system, tissue } = structure;
  if (system === 'integumentary') return 'skin';
  if (system === 'skeletal') return 'bones';
  if (system === 'muscular') return 'muscles';
  if (tissue === 'nerve') return 'nerves';
  if (tissue === 'artery' || tissue === 'vein') return 'vessels';
  return 'organs';
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function nameSeed(name) {
  let hash = 0;
  for (const character of name) hash = (Math.imul(31, hash) + character.charCodeAt(0)) | 0;
  return (hash >>> 0) / 4294967295;
}

function setFiberCoordinates(geometry, structure) {
  const positions = geometry.getAttribute('position');
  const fibers = new Float32Array(positions.count * 2);
  const size = new THREE.Vector3().fromArray(structure.max).sub(new THREE.Vector3().fromArray(structure.min));
  const side = structure.side === 'R' ? -1 : 1;
  const axis = new THREE.Vector3(0.08 * side, 1, 0.02);
  if (/pectoralis|serratus|transversus|temporalis|orbicularis|intercostal/.test(structure.id)) {
    axis.set(side, 0.38, 0.21);
  } else if (/deltoid|trapezius|latissimus|oblique|gluteus/.test(structure.id)) {
    axis.set(side * 0.56, 1, 0.17);
  } else if (size.x > size.y * 1.28) {
    axis.set(side, 0.27, 0.16);
  } else if (size.z > size.y * 1.28) {
    axis.set(0.15 * side, 0.22, 1);
  }
  axis.normalize();
  const across = new THREE.Vector3(0.89, 0.2, 0.45).cross(axis).normalize();
  const point = new THREE.Vector3();
  for (let index = 0; index < positions.count; index++) {
    point.fromBufferAttribute(positions, index);
    fibers[index * 2] = point.dot(across);
    fibers[index * 2 + 1] = point.dot(axis);
  }
  geometry.setAttribute('anatomyFiber', new THREE.BufferAttribute(fibers, 2));
}

function materialFor(geometry, structure) {
  const color = new THREE.Color(TISSUE_COLORS[structure.tissue] ?? TISSUE_COLORS.organ);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: structure.tissue === 'muscle' ? 0.61 : 0.74,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  // Single-pass alpha blends retain anatomical context when several layers are visible.
  material.forceSinglePass = true;
  if (structure.tissue !== 'muscle') return material;

  color.offsetHSL((nameSeed(structure.id) - 0.5) * 0.014, 0, (nameSeed(structure.id + 'h') - 0.5) * 0.065);
  material.color.copy(color);
  setFiberCoordinates(geometry, structure);
  material.customProgramCacheKey = () => 'anatomical-muscle-v1';
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 anatomyFiber;\nvarying vec2 vAnatomyFiber;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAnatomyFiber = anatomyFiber;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vAnatomyFiber;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float fiberCoordinate = vAnatomyFiber.x + 0.0012 * sin(vAnatomyFiber.y * 34.0);
        float phase = fiberCoordinate * 1680.0;
        float resolved = 1.0 - smoothstep(0.65, 2.25, fwidth(phase));
        float fineFibers = sin(phase) * 0.095 + sin(phase * 0.47 + 0.85) * 0.042;
        float tissueVariation = sin(fiberCoordinate * 187.0 + sin(vAnatomyFiber.y * 22.0)) * 0.036;
        diffuseColor.rgb *= 1.0 + tissueVariation + fineFibers * resolved;
      `);
  };
  return material;
}

function isPrimaryPointer(event) {
  return event.isPrimary && (event.pointerType !== 'mouse' || event.button === 0);
}

export class AnatomyViewer {
  constructor(host, callbacks = {}) {
    this.host = host;
    this.callbacks = callbacks;
    this.parts = [];
    this.layers = Object.fromEntries(LAYERS.map((layer) => [layer, {
      visible: layer === 'muscles',
      opacity: 1,
    }]));
    this.jointRanges = { ...JOINTS, ...callbacks.jointRanges };
    this.activeJoint = 'elbow';
    this.activeSide = 'right';
    this.view = 'front';
    this.mode = 'orbit';
    this.isolation = false;
    this.wireframe = false;
    this.bounds = new THREE.Box3(
      new THREE.Vector3(-0.34, 0, -0.15),
      new THREE.Vector3(0.34, 1.71, 0.15),
    );
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.markerPosition = new THREE.Vector3();
    this.events = new AbortController();

    try {
      this.setup();
      this.ready = this.load().catch((error) => {
        this.callbacks.onError?.(error);
        return null;
      });
    } catch (error) {
      this.callbacks.onError?.(error);
      this.ready = Promise.resolve(null);
    }
  }

  setup() {
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.05;
    this.renderer = renderer;

    const canvas = renderer.domElement;
    canvas.className = 'anatomy-canvas';
    canvas.setAttribute('aria-label', 'Interaktywny model 3D ciała człowieka');
    Object.assign(canvas.style, {
      display: 'block', width: '100%', height: '100%', outline: 'none', cursor: 'grab',
    });
    this.host.append(canvas);

    this.scene = new THREE.Scene();
    this.model = new THREE.Group();
    this.scene.add(this.model);
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.025, 35);
    this.camera.position.set(0, 0.865, 3.4);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(0, 0.855, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.11;
    this.controls.minDistance = 0.11;
    this.controls.maxDistance = 11;
    this.controls.rotateSpeed = 0.68;
    this.controls.zoomSpeed = 0.8;
    this.controls.panSpeed = 0.72;
    this.controls.maxPolarAngle = Math.PI - 0.04;
    this.controls.minPolarAngle = 0.04;
    this.controls.zoomToCursor = true;

    this.scene.add(new THREE.HemisphereLight(0xf2f6ff, 0xb39187, 1.65));
    const key = new THREE.DirectionalLight(0xfff4e9, 1.8);
    key.position.set(-2.3, 3.4, 4.2);
    const fill = new THREE.DirectionalLight(0xdae8ff, 0.78);
    fill.position.set(2.5, 1.8, 1.9);
    const rim = new THREE.DirectionalLight(0xffffff, 1.35);
    rim.position.set(1.1, 2.6, -3.5);
    this.scene.add(key, fill, rim);

    this.createMarkers();
    const signal = this.events.signal;
    const onPointerDown = (event) => this.pointerDown(event);
    canvas.addEventListener('pointerdown', onPointerDown, { capture: true, signal });
    canvas.addEventListener('pointermove', (event) => this.pointerMove(event), { capture: true, signal });
    canvas.addEventListener('pointerup', (event) => this.pointerUp(event), { capture: true, signal });
    canvas.addEventListener('pointercancel', () => this.cancelPointer(), { signal });
    canvas.addEventListener('lostpointercapture', () => this.cancelPointer(), { signal });
    canvas.addEventListener('wheel', () => {
      this.transition = null;
      this.isFramed = false;
    }, { passive: true, signal });
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.callbacks.onError?.(new Error('Przeglądarka utraciła kontekst graficzny WebGL.'));
    }, { signal });

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(this.host);
    this.resize();
    this.resetView(false);
    this.frame = requestAnimationFrame((time) => this.draw(time));
  }

  async load() {
    const response = await fetch(new URL('manifest.json', ASSET_ROOT));
    if (!response.ok) throw new Error('Plik modelu anatomicznego jest niedostępny.');
    const manifest = await response.json();
    this.manifest = manifest;
    if (manifest.bounds) {
      this.bounds.min.fromArray(manifest.bounds.min);
      this.bounds.max.fromArray(manifest.bounds.max);
    }

    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const records = new Map(manifest.structures.map((entry) => [entry.id, entry]));
    const loadProgress = new Map(manifest.systems.map((system) => [system.id, 0]));
    const totalBytes = manifest.systems.reduce((sum, system) => sum + system.bytes, 0);
    const report = (system, bytes) => {
      loadProgress.set(system.id, Math.min(system.bytes, bytes));
      const loaded = Array.from(loadProgress.values()).reduce((sum, count) => sum + count, 0);
      this.callbacks.onProgress?.(0.92 * loaded / totalBytes);
    };
    const systems = await Promise.all(manifest.systems.map(async (system) => {
      const gltf = await loader.loadAsync(new URL(system.file, ASSET_ROOT).href, (event) => report(system, event.loaded));
      report(system, system.bytes);
      return gltf.scene;
    }));
    if (this.disposed) return null;

    const counts = Object.fromEntries(LAYERS.map((layer) => [layer, 0]));
    for (const scene of systems) {
      this.model.add(scene);
      scene.traverse((mesh) => {
        if (!mesh.isMesh) return;
        const structure = records.get(mesh.name) ?? records.get(mesh.parent.name);
        if (!structure) return;
        const layer = layerFor(structure);
        const side = structure.side === 'L' ? 'left' : structure.side === 'R' ? 'right' : null;
        if (!mesh.geometry.getAttribute('normal')) mesh.geometry.computeVertexNormals();
        mesh.material = materialFor(mesh.geometry, structure);
        const part = { ...structure, mesh, layer, side };
        mesh.userData.anatomy = part;
        this.parts.push(part);
        counts[layer]++;
      });
    }
    this.model.updateMatrixWorld(true);
    this.applyAppearance();
    await nextFrame();
    if (this.disposed) return null;
    this.rig = createAnatomyRig(this.model, this.parts);
    this.applyAppearance();
    this.resetView(false);
    this.callbacks.onProgress?.(1);
    const meta = { layers: [...LAYERS], counts, manifest };
    this.callbacks.onReady?.(meta);
    return meta;
  }

  createMarkers() {
    this.markers = new THREE.Group();
    this.markers.visible = false;
    this.scene.add(this.markers);
    const ring = new THREE.RingGeometry(0.64, 1, 32);
    const disc = new THREE.CircleGeometry(0.38, 32);
    this.handles = [];
    for (const joint of Object.keys(JOINTS)) {
      const sides = joint === 'neck' ? ['right'] : ['left', 'right'];
      for (const side of sides) {
        const holder = new THREE.Group();
        const edge = new THREE.Mesh(ring, new THREE.MeshBasicMaterial({
          color: 0x4e75f0, depthTest: false, depthWrite: false, side: THREE.DoubleSide, transparent: true, opacity: 0.82,
        }));
        const center = new THREE.Mesh(disc, new THREE.MeshBasicMaterial({
          color: 0xffffff, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
        }));
        edge.renderOrder = 60;
        center.renderOrder = 61;
        holder.add(edge, center);
        this.markers.add(holder);
        this.handles.push({ joint, side, holder, edge, center });
      }
    }
  }

  updateMarkers() {
    this.markers.visible = this.mode === 'pose' && Boolean(this.rig);
    if (!this.markers.visible) return;
    const height = Math.max(this.host.clientHeight, 1);
    const fovScale = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * 2;
    for (const { joint, side, holder, edge, center } of this.handles) {
      const position = this.rig.getJointPosition(joint, side);
      const active = joint === this.activeJoint && (side === this.activeSide || joint === 'neck');
      holder.position.copy(position);
      holder.quaternion.copy(this.camera.quaternion);
      holder.scale.setScalar(this.camera.position.distanceTo(position) * fovScale * (active ? 8 : 5.5) / height);
      edge.material.color.setHex(active ? 0x3359e0 : 0x5b7dee);
      center.material.color.setHex(active ? 0x5979ed : 0xffffff);
    }
  }

  resize() {
    if (!this.renderer || this.disposed) return;
    const width = Math.max(this.host.clientWidth, 1);
    const height = Math.max(this.host.clientHeight, 1);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (this.isFramed) this.resetView(false);
    this.dirty = true;
  }

  draw(time) {
    if (this.disposed) return;
    this.frame = requestAnimationFrame((nextTime) => this.draw(nextTime));
    if (this.transition) {
      const { fromOffset, toOffset, angle, fromTarget, target, start, duration } = this.transition;
      const fraction = THREE.MathUtils.clamp((time - start) / duration, 0, 1);
      const ease = fraction * fraction * (3 - 2 * fraction);
      this.controls.target.copy(fromTarget).lerp(target, ease);
      this.camera.position.setFromSphericalCoords(
        THREE.MathUtils.lerp(fromOffset.radius, toOffset.radius, ease),
        THREE.MathUtils.lerp(fromOffset.phi, toOffset.phi, ease),
        fromOffset.theta + angle * ease,
      ).add(this.controls.target);
      if (fraction >= 1) this.transition = null;
      this.dirty = true;
    }

    const moving = this.controls.update();
    if (!this.dirty && !moving) return;
    this.updateMarkers();
    this.renderer.render(this.scene, this.camera);
    this.dirty = false;
  }

  frameTarget() {
    return this.bounds.getCenter(new THREE.Vector3());
  }

  frameDistance() {
    const size = this.bounds.getSize(new THREE.Vector3());
    const vertical = size.y / 0.89;
    const horizontal = size.x / (Math.max(this.camera.aspect, 0.2) * 0.82);
    return Math.max(vertical, horizontal) / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))) + size.z * 0.28;
  }

  moveCamera(position, target, animate = true) {
    this.transition = null;
    if (animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const fromTarget = this.controls.target.clone();
      const fromOffset = new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(fromTarget));
      const toOffset = new THREE.Spherical().setFromVector3(position.clone().sub(target));
      const angle = THREE.MathUtils.euclideanModulo(toOffset.theta - fromOffset.theta + Math.PI, TAU) - Math.PI;
      this.transition = {
        fromOffset, toOffset, angle, fromTarget, target, start: performance.now(), duration: 360,
      };
    } else {
      this.camera.position.copy(position);
      this.controls.target.copy(target);
      this.controls.update();
    }
    this.dirty = true;
  }

  getViewPosition(view, target, distance) {
    return new THREE.Vector3().fromArray(VIEWS[view]).normalize().multiplyScalar(distance).add(target);
  }

  setView(view, animate = true) {
    if (!this.renderer || !VIEWS[view]) return;
    this.view = view;
    const target = this.controls.target.clone();
    const distance = this.camera.position.distanceTo(target);
    this.moveCamera(this.getViewPosition(view, target, distance), target, animate);
    this.callbacks.onView?.(view);
  }

  resetView(animate = true) {
    if (!this.renderer) return;
    const target = this.frameTarget();
    this.moveCamera(this.getViewPosition(this.view, target, this.frameDistance()), target, animate);
    this.isFramed = true;
  }

  zoom(factor) {
    if (!this.renderer || !Number.isFinite(factor) || factor <= 0) return;
    const target = this.controls.target.clone();
    const offset = this.camera.position.clone().sub(target);
    const distance = THREE.MathUtils.clamp(offset.length() / factor, this.controls.minDistance, this.controls.maxDistance);
    this.isFramed = false;
    this.moveCamera(offset.setLength(distance).add(target), target);
  }

  setLayer(layer, visible) {
    if (!this.layers[layer]) return;
    this.layers[layer].visible = Boolean(visible);
    if (!visible && this.selection?.layer === layer) this.clearSelection();
    this.applyAppearance();
  }

  setLayerOpacity(layer, opacity) {
    if (!this.layers[layer] || !Number.isFinite(opacity)) return;
    this.layers[layer].opacity = THREE.MathUtils.clamp(opacity, 0, 1);
    if (!this.layers[layer].opacity && this.selection?.layer === layer) this.clearSelection();
    this.applyAppearance();
  }

  setIsolation(active) {
    this.isolation = Boolean(active);
    this.applyAppearance();
  }

  setWireframe(active) {
    this.wireframe = Boolean(active);
    this.applyAppearance();
  }

  applyAppearance() {
    for (const part of this.parts) {
      const { layer, mesh } = part;
      const { material } = mesh;
      const state = this.layers[layer];
      const selected = this.selection === part;
      mesh.visible = state.visible && state.opacity > 0 && (!this.isolation || !this.selection || selected);
      material.opacity = state.opacity;
      const transparent = material.opacity < 1;
      if (material.transparent !== transparent) material.needsUpdate = true;
      material.transparent = transparent;
      material.depthWrite = !transparent;
      material.wireframe = this.wireframe;
      material.emissive.setHex(selected ? 0x204ed5 : 0x000000);
      material.emissiveIntensity = selected ? 0.64 : 0;
      mesh.renderOrder = layer === 'skin' ? 20 : 0;
    }
    this.dirty = true;
  }

  setMode(mode) {
    if (mode !== 'orbit' && mode !== 'pose') return;
    this.cancelPointer();
    this.mode = mode;
    const canvas = this.getCanvas();
    if (canvas) canvas.style.cursor = mode === 'pose' ? 'crosshair' : 'grab';
    this.dirty = true;
  }

  selectJoint(joint, side = this.activeSide) {
    if (!Object.hasOwn(JOINTS, joint)) return;
    this.activeJoint = joint;
    this.activeSide = side === 'left' ? 'left' : 'right';
    this.callbacks.onPose?.({ joint, side: this.activeSide, angle: this.getPose(joint, this.activeSide) });
    this.dirty = true;
  }

  getPose(joint = this.activeJoint, side = this.activeSide) {
    return this.rig?.getPose(joint, side) ?? 0;
  }

  setPose(joint, angle, side = this.activeSide) {
    if (!Object.hasOwn(JOINTS, joint) || !Number.isFinite(angle) || !this.rig) return;
    const [min, max] = this.jointRanges[joint];
    const clamped = THREE.MathUtils.clamp(angle, min, max);
    this.activeJoint = joint;
    this.activeSide = side === 'left' ? 'left' : 'right';
    this.rig.setPose(joint, clamped, this.activeSide);
    this.callbacks.onPose?.({ joint, angle: clamped, side: this.activeSide });
    this.dirty = true;
  }

  resetPose() {
    this.rig?.resetPose();
    this.callbacks.onPose?.({ joint: this.activeJoint, angle: 0, side: this.activeSide });
    this.dirty = true;
  }

  pick(event) {
    const canvas = this.getCanvas();
    if (!canvas) return null;
    const { left, top, width, height } = canvas.getBoundingClientRect();
    this.pointer.set((event.clientX - left) / width * 2 - 1, -(event.clientY - top) / height * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = this.parts.filter(({ mesh }) => mesh.visible).map(({ mesh }) => mesh);
    const hits = this.raycaster.intersectObjects(meshes, false);
    return hits.find(({ object }) => object.material.opacity >= 0.35)?.object.userData.anatomy
      ?? hits[0]?.object.userData.anatomy
      ?? null;
  }

  pickJoint(event) {
    if (!this.rig) return null;
    const { left, top, width, height } = this.getCanvas().getBoundingClientRect();
    let closest = null;
    let distance = event.pointerType === 'touch' ? 29 : 19;
    for (const { joint, side } of this.handles) {
      this.markerPosition.copy(this.rig.getJointPosition(joint, side)).project(this.camera);
      const x = left + (this.markerPosition.x + 1) * width / 2;
      const y = top + (1 - this.markerPosition.y) * height / 2;
      const delta = Math.hypot(event.clientX - x, event.clientY - y);
      if (delta < distance) {
        distance = delta;
        closest = { joint, side };
      }
    }
    if (closest) return closest;
    const part = this.pick(event);
    if (!part?.side) return null;
    const id = part.id;
    const side = part.side;
    if (/head|occipital|temporalis|scalene|sternocleidomastoid/.test(id)) return { joint: 'neck', side };
    if (/hand|carpal|palmar/.test(id)) return { joint: 'wrist', side };
    if (/deltoid|clavicle|rotator-cuff|supraspinatus|infraspinatus/.test(id)) return { joint: 'shoulder', side };
    if (/humerus|forearm|ulna|radius|biceps-brachii|brachialis|triceps-brachii/.test(id)) return { joint: 'elbow', side };
    if (/foot|achilles|calcaneal/.test(id)) return { joint: 'ankle', side };
    if (/tibia|fibula|patella|gastrocnemius|soleus|lower-leg/.test(id)) return { joint: 'knee', side };
    if (/femur|thigh|gluteus|quadriceps/.test(id)) return { joint: 'hip', side };
    return null;
  }

  pointerDown(event) {
    if (!isPrimaryPointer(event)) return;
    this.transition = null;
    if (this.mode === 'pose' && !event.altKey) {
      const handle = this.pickJoint(event);
      if (handle) {
        event.stopImmediatePropagation();
        event.preventDefault();
        this.selectJoint(handle.joint, handle.side);
        this.drag = { ...handle, id: event.pointerId, x: event.clientX, y: event.clientY, angle: this.getPose() };
        this.getCanvas().setPointerCapture(event.pointerId);
        this.getCanvas().style.cursor = 'grabbing';
        return;
      }
    }
    this.down = { id: event.pointerId, x: event.clientX, y: event.clientY };
    this.getCanvas().style.cursor = 'grabbing';
  }

  pointerMove(event) {
    if (this.drag?.id === event.pointerId) {
      event.stopImmediatePropagation();
      const { joint, side, x, y, angle } = this.drag;
      const distance = y - event.clientY + (event.clientX - x) * (side === 'left' ? 0.55 : -0.55);
      this.setPose(joint, Math.round(angle + distance * 0.65), side);
      return;
    }
    if (this.down?.id === event.pointerId && Math.hypot(event.clientX - this.down.x, event.clientY - this.down.y) > 5) {
      this.isFramed = false;
    }
  }

  pointerUp(event) {
    if (this.drag?.id === event.pointerId) {
      event.stopImmediatePropagation();
      if (this.getCanvas().hasPointerCapture(event.pointerId)) this.getCanvas().releasePointerCapture(event.pointerId);
    } else if (this.down?.id === event.pointerId
      && Math.hypot(event.clientX - this.down.x, event.clientY - this.down.y) <= 5) {
      this.setSelection(this.pick(event));
    }
    this.cancelPointer();
  }

  cancelPointer() {
    this.drag = null;
    this.down = null;
    const canvas = this.getCanvas();
    if (canvas) canvas.style.cursor = this.mode === 'pose' ? 'crosshair' : 'grab';
  }

  setSelection(part) {
    this.selection = part;
    this.applyAppearance();
    const item = part ? {
      id: part.id,
      name: part.name,
      layer: part.layer,
      side: part.side,
      system: part.system,
      tissue: part.tissue,
      sourceObjects: part.sourceObjects,
    } : null;
    this.callbacks.onSelect?.(item);
  }

  clearSelection() {
    this.setSelection(null);
  }

  focusSelection() {
    if (!this.selection) return false;
    const { mesh } = this.selection;
    mesh.updateWorldMatrix(true, false);
    const box = new THREE.Box3().setFromObject(mesh, true);
    const target = box.getCenter(new THREE.Vector3());
    const bounds = box.getSize(new THREE.Vector3());
    const diameter = Math.max(bounds.y, bounds.x / this.camera.aspect, bounds.z * 1.3);
    const distance = Math.max(0.12, diameter / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)));
    const direction = this.camera.position.clone().sub(this.controls.target).normalize();
    this.isFramed = false;
    this.moveCamera(direction.multiplyScalar(distance).add(target), target);
    return true;
  }

  getCanvas() {
    return this.renderer?.domElement ?? null;
  }

  capture() {
    if (!this.renderer || !this.rig || this.renderer.getContext().isContextLost()) return null;
    this.updateMarkers();
    this.renderer.render(this.scene, this.camera);
    const image = this.getCanvas().toDataURL('image/png');
    return image.startsWith('data:image/png;') ? image : null;
  }

  dispose() {
    this.disposed = true;
    this.events.abort();
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
    this.controls?.dispose();
    this.scene?.traverse((object) => {
      if (!object.isMesh) return;
      object.geometry.dispose();
      object.material.dispose();
    });
    this.renderer?.dispose();
    this.getCanvas()?.remove();
  }
}
