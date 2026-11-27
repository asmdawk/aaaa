import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/controls/OrbitControls.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { MeshoptDecoder } from './vendor/libs/meshopt_decoder.module.js';
import { fractureBone, makeSkin, normalizeBone, shaftProfile } from './bone-fracture.js';
import { createDiseaseEffects, deformDiseaseGeometry, diseaseMaterialStyle, orientBoneSection } from './bone-effects.js';

const ASSETS = new URL('./assets/anatomy/', import.meta.url);
const DISEASES = new Set(['osteoporosis', 'osteomyelitis', 'osteomalacia', 'paget']);
const STAGES = new Set(['healthy', 'early', 'advanced']);
const LAYERS = ['bone', 'muscles', 'skin', 'marrow'];
const BONE_PATTERN = /^(femur|humerus|tibia|fibula|radius|ulna)-(right|left)$/;
const VIEWS = {
  front: [0, 0.015, 1],
  back: [0, 0.015, -1],
  left: [1, 0.015, 0],
  right: [-1, 0.015, 0],
  'three-quarter': [0.48, 0.035, 1],
};
const REGIONS = {
  femur: {
    cut: 0.035, width: 0.19, depth: 0.15,
    muscles: ['quadriceps-femoris-{s}', 'biceps-femoris-{s}', 'sartorius-{s}',
      'semitendinosus-{s}', 'adductor-muscles-of-{s}-thigh'],
  },
  humerus: {
    cut: -0.055, width: 0.15, depth: 0.12,
    muscles: ['biceps-brachii-{s}', 'triceps-brachii-{s}', 'brachialis-{s}', 'deltoid-{s}'],
  },
  tibia: {
    cut: -0.23, width: 0.115, depth: 0.10,
    muscles: ['tibialis-anterior-{s}', 'gastrocnemius-{s}', 'soleus-{s}',
      'extensor-muscles-of-{s}-leg', 'deep-posterior-muscles-of-{s}-leg'],
  },
  fibula: {
    cut: -0.22, width: 0.12, depth: 0.108,
    muscles: ['fibularis-muscles-{s}', 'gastrocnemius-{s}', 'soleus-{s}', 'extensor-muscles-of-{s}-leg'],
  },
  radius: {
    cut: -0.29, width: 0.12, depth: 0.09,
    muscles: ['brachioradialis-{s}', 'flexor-muscles-of-{s}-forearm', 'extensor-muscles-of-{s}-forearm'],
  },
  ulna: {
    cut: -0.16, width: 0.12, depth: 0.09,
    muscles: ['brachioradialis-{s}', 'flexor-muscles-of-{s}-forearm', 'extensor-muscles-of-{s}-forearm'],
  },
};

const byAsset = new Map();

function loadMeshes(filename) {
  if (byAsset.has(filename)) return byAsset.get(filename);
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const load = loader.loadAsync(new URL(filename, ASSETS).href).then(({ scene }) => {
    const meshes = new Map();
    scene.updateMatrixWorld(true);
    scene.traverse((object) => {
      if (object.isMesh) meshes.set(object.name, object);
    });
    return meshes;
  }).catch((error) => {
    byAsset.delete(filename);
    throw error;
  });
  byAsset.set(filename, load);
  return load;
}

function disposeDrawables(container) {
  const geometries = new Set();
  const materials = new Set();
  container.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) materials.add(object.material);
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  container.clear();
}

function material(type, properties = {}) {
  const palettes = {
    bone: { color: 0xe0c5a3, roughness: 0.69 },
    cortex: { color: 0xd4ae80, roughness: 0.91 },
    marrow: { color: 0xaf815d, roughness: 0.87 },
    skin: { color: 0xc6867a, roughness: 0.82 },
    muscles: { color: 0xb77168, roughness: 0.76 },
  };
  const result = new THREE.MeshStandardMaterial({ ...palettes[type], ...properties });
  if (type === 'bone' || type === 'cortex' || type === 'marrow' || type === 'muscles') {
    result.customProgramCacheKey = () => 'anatomical-surface-' + type;
    result.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 anatomySurfacePosition;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nanatomySurfacePosition = position;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 anatomySurfacePosition;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          vec3 p = anatomySurfacePosition;
          float sieve = sin(p.x * 213.65 + sin(p.y * 87.5) + p.z * 113.8) *
            sin(p.y * 189.1 - p.z * 74.2) * sin(p.z * 185.61 + p.x * 63.2);
          float noise = sin(p.y * 24.3 + p.x * 40.7) * sin(p.z * 48.0 - p.y * 51.3);
          float fade = 1.0 - smoothstep(0.16, 0.65, length(fwidth(p)) * 126.0);
          diffuseColor.rgb *= 1.0 + sieve * fade * 0.105 + noise * 0.04;
        `);
    };
  }
  return result;
}

function group(name) {
  const node = new THREE.Group();
  node.name = name;
  return node;
}

function tagMesh(geometry, display, layer, renderOrder = 0) {
  const mesh = new THREE.Mesh(geometry, display);
  mesh.userData.layer = layer;
  mesh.renderOrder = renderOrder;
  return mesh;
}

function fractureMuscles(normMatrix, region, side, type, profile, source) {
  const tissue = group('muscles');
  const up = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1.02);
  const down = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1.02);
  const display = material('muscles', {
    side: THREE.DoubleSide, clippingPlanes: [up, down], transparent: true, opacity: 0.20,
    depthWrite: false,
  });
  display.forceSinglePass = true;
  if (type === 'open') {
    const prior = display.onBeforeCompile;
    display.customProgramCacheKey = () => 'anatomical-surface-muscles-open';
    display.onBeforeCompile = (shader) => {
      prior(shader);
      shader.uniforms.fractureOpening = {
        value: new THREE.Vector3(profile.x, region.cut, profile.z + profile.rz * 0.04),
      };
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 fractureOpening;')
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
          vec3 rel = anatomySurfacePosition - fractureOpening;
          vec2 aperture = rel.xy / vec2(0.24, 0.18);
          if (rel.z > 0.0 && dot(aperture, aperture) < 1.0) discard;
        `);
    };
  }
  let index = 0;
  for (const pattern of region.muscles) {
    const muscle = source.get(pattern.replace('{s}', side));
    if (!muscle) continue;
    const geometry = muscle.geometry.clone().applyMatrix4(muscle.matrixWorld).applyMatrix4(normMatrix);
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
    tissue.add(tagMesh(geometry, display, 'muscles', 10 + index++));
  }
  if (!index) display.dispose();
  return tissue;
}

function addFractureSurface(root, normalized, region, side, type, muscleAssets) {
  const { geometry, matrix } = normalized;
  const profile = shaftProfile(geometry, region.cut);
  const { surface, edge } = makeSkin(geometry, type, region.cut, region.width, region.depth);
  const skin = tagMesh(surface, material('skin', { transparent: true, opacity: type === 'open' ? 0.24 : 0.19, depthWrite: false }), 'skin', 19);
  root.add(skin);
  if (edge.length > 5) {
    const edgeCurve = new THREE.CatmullRomCurve3(edge, true);
    const border = new THREE.TubeGeometry(edgeCurve, 48, 0.0075, 6, true);
    root.add(tagMesh(border, material('skin', { color: 0xc58980, transparent: true, opacity: 0.75 }), 'skin', 22));
  }
  root.add(fractureMuscles(matrix, region, side, type, profile, muscleAssets));

  const shell = material('bone', { side: THREE.DoubleSide });
  const cortex = material('cortex', { side: THREE.DoubleSide });
  const marrow = material('marrow', { side: THREE.DoubleSide });
  const fragments = fractureBone(geometry, region.cut).map((part, index) => {
    const parent = group(index === 0 ? 'proximal' : 'distal');
    const hinge = group('fracture-hinge');
    const translate = new THREE.Vector3(profile.x, region.cut, profile.z);
    for (const partGeometry of Object.values(part)) partGeometry.translate(-translate.x, -translate.y, -translate.z);
    hinge.add(tagMesh(part.shell, shell, 'bone'));
    hinge.add(tagMesh(part.cap, cortex, 'bone'));
    hinge.add(tagMesh(part.interior, marrow, 'marrow', 1));
    parent.position.copy(translate);
    parent.add(hinge);
    root.add(parent);
    return { parent, hinge };
  });
  return fragments;
}

function addDiseaseSurface(root, anatomy, boneId, disease, stage) {
  const altered = deformDiseaseGeometry(anatomy, disease, stage, boneId);
  const { geometry, planeZ } = orientBoneSection(altered);
  const spacing = Math.max(0.425, geometry.boundingBox.getSize(new THREE.Vector3()).x * 0.58);
  const style = diseaseMaterialStyle(disease, stage);
  const whole = tagMesh(geometry, material('bone', style), 'bone');
  whole.name = 'whole';
  whole.position.x = -spacing;

  const split = tagMesh(geometry, material('bone', {
    ...style, clippingPlanes: [new THREE.Plane(new THREE.Vector3(0, 0, -1), planeZ)],
  }), 'bone');
  split.name = 'section';
  split.position.x = spacing;

  const details = createDiseaseEffects({ geometry, planeZ, disease, stage });
  details.name = 'section-interior';
  details.position.x = spacing;
  details.traverse((object) => { if (object.isMesh) object.userData.layer = 'marrow'; });
  root.add(whole, split, details);
  for (const unused of new Set([anatomy, altered])) {
    if (unused !== geometry) unused.dispose();
  }
}

export class BoneConditionViewer {
  constructor(host, callbacks = {}) {
    this.host = host;
    this.callbacks = callbacks;
    this.mode = 'fracture';
    this.bone = 'femur-right';
    this.fracture = 'closed';
    this.disease = 'osteoporosis';
    this.stage = 'early';
    this.layers = Object.fromEntries(LAYERS.map((layer) => [layer, true]));
    this.view = 'three-quarter';
    this.motion = false;
    this.angleProgress = 1;
    this.active = true;
    this.disposed = false;
    this.dirty = true;
    this.now = 0;

    try {
      this.setup();
      this.ready = this.load().catch((error) => {
        if (!this.disposed) this.callbacks.onError?.(error);
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
    renderer.toneMappingExposure = 1.04;
    renderer.localClippingEnabled = true;
    this.renderer = renderer;

    const canvas = renderer.domElement;
    canvas.className = 'bone-condition-canvas';
    canvas.setAttribute('aria-label', 'Interaktywny model 3D kości');
    Object.assign(canvas.style, { display: 'block', width: '100%', height: '100%', cursor: 'grab', touchAction: 'none' });
    this.host.append(canvas);

    this.scene = new THREE.Scene();
    this.model = group('bone-condition-model');
    this.scene.add(this.model);
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.025, 30);
    this.camera.position.set(0.8, 0.15, 4.4);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.rotateSpeed = 0.63;
    this.controls.zoomSpeed = 0.82;
    this.controls.enablePan = true;
    this.controls.zoomToCursor = true;
    this.controls.minDistance = 0.7;
    this.controls.maxDistance = 12;
    this.controls.maxPolarAngle = Math.PI - 0.04;
    this.controls.minPolarAngle = 0.04;

    this.scene.add(new THREE.HemisphereLight(0xfffaf2, 0x846c7f, 1.5));
    const key = new THREE.DirectionalLight(0xfff3de, 2.15);
    key.position.set(-3, 4.2, 5);
    const fill = new THREE.DirectionalLight(0xc1d8fa, 0.92);
    fill.position.set(3.1, 1.8, 3.3);
    const rim = new THREE.DirectionalLight(0xffdac9, 1.46);
    rim.position.set(1.2, 4, -4);
    this.scene.add(key, fill, rim);

    this.events = new AbortController();
    const signal = this.events.signal;
    this.controls.addEventListener('start', () => {
      this.autoFrame = false;
      this.cameraMotion = null;
      if (this.motion && this.mode === 'disease') this.setMotion(false);
      canvas.style.cursor = 'grabbing';
    });
    this.controls.addEventListener('end', () => { canvas.style.cursor = 'grab'; });
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.callbacks.onError?.(new Error('Przeglądarka utraciła dostęp do grafiki 3D.'));
    }, { signal });
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(this.host);
    this.autoFrame = true;
    this.resize();
    this.frame = requestAnimationFrame((time) => this.draw(time));
  }

  async load() {
    this.callbacks.onLoading?.(true);
    try {
      const [bones, muscles] = await Promise.all([loadMeshes('skeletal.glb'), loadMeshes('muscular.glb')]);
      if (this.disposed) return null;
      this.bones = bones;
      this.muscles = muscles;
      this.build();
      this.callbacks.onReady?.();
      return this;
    } finally {
      if (!this.disposed) this.callbacks.onLoading?.(false);
    }
  }

  setActive(active) {
    this.active = Boolean(active);
    if (this.active) this.resize();
  }

  setMode(mode) {
    if (!['fracture', 'disease'].includes(mode) || mode === this.mode) return this.ready;
    this.setMotion(false);
    this.mode = mode;
    this.view = 'three-quarter';
    if (this.bones) this.build();
    return this.ready;
  }

  setBone(id) {
    if (!BONE_PATTERN.test(id) || id === this.bone) return;
    this.bone = id;
    if (this.bones) this.build();
  }

  setFracture(type) {
    if (!['closed', 'open'].includes(type) || type === this.fracture) return;
    this.fracture = type;
    if (this.bones && this.mode === 'fracture') this.build(false);
  }

  setDisease(disease) {
    if (!DISEASES.has(disease) || disease === this.disease) return;
    this.disease = disease;
    if (this.bones && this.mode === 'disease') this.build(false);
  }

  setStage(stage) {
    const key = typeof stage === 'number' ? ['healthy', 'early', 'advanced'][stage] : stage;
    if (!STAGES.has(key) || key === this.stage) return;
    this.stage = key;
    if (this.bones && this.mode === 'disease') this.build(false);
  }

  setLayer(layer, active) {
    if (!LAYERS.includes(layer)) return;
    this.layers[layer] = Boolean(active);
    this.applyLayers();
  }

  applyLayers() {
    this.model?.traverse((object) => {
      const { layer } = object.userData;
      if (layer) object.visible = this.layers[layer];
    });
    this.dirty = true;
  }

  build(refit = true) {
    const source = this.bones.get(this.bone);
    if (!source) return;
    const [, type, side] = this.bone.match(BONE_PATTERN);
    const normalized = normalizeBone(source);
    disposeDrawables(this.model);
    this.fragments = null;
    if (this.mode === 'fracture') {
      this.fragments = addFractureSurface(this.model, normalized, REGIONS[type], side, this.fracture, this.muscles);
      normalized.geometry.dispose();
      this.angleProgress = 1;
      this.putFracture(1);
    } else {
      addDiseaseSurface(this.model, normalized.geometry, this.bone, this.disease, this.stage);
    }
    this.applyLayers();
    if (refit) this.resetView();
  }

  putFracture(gap) {
    if (!this.fragments) return;
    const [, type] = this.bone.match(BONE_PATTERN);
    const level = REGIONS[type].cut;
    const open = this.fracture === 'open';
    const [upper, lower] = this.fragments;
    const side = this.bone.endsWith('-left') ? -1 : 1;
    upper.hinge.position.set(-gap * side * (open ? 0.024 : 0.01), gap * 0.027, 0);
    upper.hinge.rotation.z = -gap * side * (open ? 0.105 : 0.053);
    lower.hinge.position.set(
      gap * side * (open ? 0.083 : 0.032),
      -gap * (open ? 0.118 : 0.060),
      gap * (open ? Math.abs(level) * 0.10 + 0.16 : 0.022),
    );
    lower.hinge.rotation.set(gap * (open ? -0.28 : -0.065), 0, gap * side * (open ? 0.245 : 0.13));
    this.dirty = true;
  }

  setMotion(active) {
    if (!this.renderer) return;
    const next = Boolean(active);
    if (next === this.motion) return;
    this.motion = next;
    this.motionStart = performance.now();
    if (this.mode === 'disease') {
      if (next) {
        this.cameraMotion = null;
        this.motionStartPose = this.camera.position.clone().sub(this.controls.target);
      } else {
        this.motionStartPose = null;
      }
    }
    this.callbacks.onMotion?.(this.motion);
    this.dirty = true;
  }

  frameDistance() {
    const width = this.mode === 'fracture' ? 1.25 : 1.52;
    const height = this.mode === 'fracture' ? 2.48 : 2.37;
    return Math.max(height, width / Math.max(0.20, this.camera.aspect))
      / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)));
  }

  viewOffset(view, distance) {
    const direction = view === 'three-quarter' && this.mode === 'disease' ? [0.22, 0.028, 1] : VIEWS[view];
    return new THREE.Vector3().fromArray(direction).normalize().multiplyScalar(distance);
  }

  setView(view, smooth = true) {
    if (!VIEWS[view] || !this.renderer) return;
    this.setMotion(false);
    this.view = view;
    const from = this.camera.position.clone().sub(this.controls.target);
    const until = this.viewOffset(view, from.length());
    if (smooth && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const start = new THREE.Spherical().setFromVector3(from);
      const end = new THREE.Spherical().setFromVector3(until);
      const angle = THREE.MathUtils.euclideanModulo(end.theta - start.theta + Math.PI, Math.PI * 2) - Math.PI;
      this.cameraMotion = { start, end, angle, timestamp: performance.now() };
    } else {
      this.cameraMotion = null;
      this.camera.position.copy(until).add(this.controls.target);
      this.controls.update();
    }
    this.dirty = true;
  }

  resetView() {
    if (!this.renderer) return;
    this.setMotion(false);
    this.autoFrame = true;
    this.fit();
  }

  fit() {
    const target = this.mode === 'fracture' ? new THREE.Vector3(0.015, -0.025, 0) : new THREE.Vector3();
    this.cameraMotion = null;
    this.controls.target.copy(target);
    this.camera.position.copy(this.viewOffset(this.view, this.frameDistance())).add(target);
    this.controls.update();
    this.dirty = true;
  }

  zoom(factor) {
    if (!this.renderer || !Number.isFinite(factor) || factor <= 0) return;
    this.autoFrame = false;
    this.cameraMotion = null;
    this.setMotion(false);
    const offset = this.camera.position.clone().sub(this.controls.target);
    const distance = THREE.MathUtils.clamp(offset.length() / factor, this.controls.minDistance, this.controls.maxDistance);
    this.camera.position.copy(offset.setLength(distance)).add(this.controls.target);
    this.controls.update();
    this.dirty = true;
  }

  resize() {
    if (!this.renderer || this.disposed || !this.host.clientWidth || !this.host.clientHeight) return;
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (this.autoFrame) this.fit();
    this.dirty = true;
  }

  draw(time) {
    if (this.disposed) return;
    this.frame = requestAnimationFrame((when) => this.draw(when));
    const delta = Math.min(50, Math.max(0, time - this.now));
    this.now = time;
    if (!this.active || !this.host.clientWidth) return;
    if (this.cameraMotion) {
      const { start, end, angle, timestamp } = this.cameraMotion;
      const progress = THREE.MathUtils.clamp((time - timestamp) / 360, 0, 1);
      const ease = progress * progress * (3 - 2 * progress);
      this.camera.position.setFromSphericalCoords(
        end.radius, THREE.MathUtils.lerp(start.phi, end.phi, ease), start.theta + angle * ease,
      ).add(this.controls.target);
      if (progress === 1) this.cameraMotion = null;
      this.dirty = true;
    }
    if (this.motion && this.mode === 'disease' && this.motionStartPose) {
      const sway = 0.19 * Math.sin((time - this.motionStart) * 0.00127);
      this.camera.position.copy(this.motionStartPose).applyAxisAngle(new THREE.Vector3(0, 1, 0), sway)
        .add(this.controls.target);
      this.dirty = true;
    }
    if (this.fragments) {
      const target = this.motion ? 0.59 + 0.39 * Math.cos((time - this.motionStart) * 0.002) : 1;
      const next = THREE.MathUtils.lerp(this.angleProgress, target, Math.min(1, delta * 0.012));
      if (Math.abs(next - this.angleProgress) > 0.0002) {
        this.angleProgress = next;
        this.putFracture(next);
      }
    }
    const moving = this.controls.update();
    if (!this.dirty && !moving) return;
    this.renderer.render(this.scene, this.camera);
    this.dirty = false;
  }

  capture() {
    if (!this.renderer || !this.bones || this.renderer.getContext().isContextLost()) return null;
    this.renderer.render(this.scene, this.camera);
    const image = this.renderer.domElement.toDataURL('image/png');
    return image.startsWith('data:image/png;') ? image : null;
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
    this.events?.abort();
    this.controls?.dispose();
    if (this.model) disposeDrawables(this.model);
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
  }
}
