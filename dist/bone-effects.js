import * as THREE from './vendor/three.module.js';

const COMPONENT = { x: 0, y: 1, z: 2 };
const SECTION_COORDINATES = { x: [2, 1], y: [0, 2], z: [0, 1] };
const WELD = 0.000015;
const EPSILON = 0.0000001;
const MAX_DISTANCE = 0.16;

const DISEASES = {
  osteoporosis: 1,
  osteomyelitis: 2,
  osteomalacia: 3,
  paget: 4,
};
const SEVERITY = { healthy: 0, early: 0.43, advanced: 1 };

// Instructions for triangulation are kept in axis-local 2D coordinates. A weld
// joins sections of the same edge when the source mesh has duplicate vertices.
export function boneSectionContours(geometry, plane = 0, axis = 'z') {
  const positions = geometry.getAttribute('position');
  const index = geometry.index;
  const sliceAxis = COMPONENT[axis];
  const [u, v] = SECTION_COORDINATES[axis];
  const vertices = new Map();
  const edges = new Map();
  const triangle = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const distance = [0, 0, 0];

  function intersection(a, b) {
    const d1 = distance[a];
    const d2 = distance[b];
    if (Math.abs(d1) <= EPSILON && Math.abs(d2) <= EPSILON) return null;
    if ((d1 > EPSILON && d2 > EPSILON) || (d1 < -EPSILON && d2 < -EPSILON)) return null;
    const t = d1 / (d1 - d2);
    const p = triangle[a];
    const q = triangle[b];
    const x = THREE.MathUtils.lerp(p.getComponent(u), q.getComponent(u), t);
    const y = THREE.MathUtils.lerp(p.getComponent(v), q.getComponent(v), t);
    const key = Math.round(x / WELD) + ',' + Math.round(y / WELD);
    if (!vertices.has(key)) vertices.set(key, { key, point: new THREE.Vector2(x, y), edges: [] });
    return vertices.get(key);
  }

  const vertexCount = index?.count ?? positions.count;
  for (let i = 0; i + 2 < vertexCount; i += 3) {
    for (let k = 0; k < 3; k++) {
      triangle[k].fromBufferAttribute(positions, index ? index.getX(i + k) : i + k);
      distance[k] = triangle[k].getComponent(sliceAxis) - plane;
    }

    const first = intersection(0, 1);
    const second = intersection(1, 2);
    const third = intersection(2, 0);
    const ends = [...new Set([first, second, third].filter(Boolean))];
    if (ends.length !== 2) continue;
    const [a, b] = ends;
    const key = a.key < b.key ? a.key + '|' + b.key : b.key + '|' + a.key;
    if (edges.has(key)) continue;
    const edge = { a, b, used: false };
    edges.set(key, edge);
    a.edges.push(edge);
    b.edges.push(edge);
  }

  const outlines = [];
  for (const edge of edges.values()) {
    if (edge.used) continue;
    edge.used = true;
    const start = edge.a;
    let previous = start;
    let current = edge.b;
    const outline = [start.point];

    while (current !== start) {
      outline.push(current.point);
      const next = nextContourEdge(current, previous);
      if (!next) break;
      next.used = true;
      previous = current;
      current = next.a === current ? next.b : next.a;
    }

    if (current === start && outline.length >= 3 &&
        Math.abs(THREE.ShapeUtils.area(outline)) > 0.0000002) {
      outlines.push(outline);
    }
  }

  return outlines.sort((a, b) => Math.abs(THREE.ShapeUtils.area(b)) - Math.abs(THREE.ShapeUtils.area(a)));
}

function nextContourEdge(node, previous) {
  let best;
  let bestAlignment = -Infinity;
  const dx = node.point.x - previous.point.x;
  const dy = node.point.y - previous.point.y;

  for (const edge of node.edges) {
    if (edge.used) continue;
    const other = edge.a === node ? edge.b : edge.a;
    const ex = other.point.x - node.point.x;
    const ey = other.point.y - node.point.y;
    const alignment = (dx * ex + dy * ey) / Math.max(Math.hypot(ex, ey), EPSILON);
    if (alignment > bestAlignment) {
      best = edge;
      bestAlignment = alignment;
    }
  }
  return best;
}

function pointInContour(test, outline) {
  let inside = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const p = outline[i];
    const q = outline[j];
    if ((p.y > test.y) !== (q.y > test.y) &&
        test.x < (q.x - p.x) * (test.y - p.y) / (q.y - p.y) + p.x) inside = !inside;
  }
  return inside;
}

function contourShapes(contours) {
  const nodes = [];
  const shapes = [];
  for (const loop of contours) {
    const parent = nodes.findLast((node) => pointInContour(loop[0], node.loop));
    if (parent?.shape) {
      parent.shape.holes.push(new THREE.Path(loop));
      nodes.push({ loop });
    } else {
      const shape = new THREE.Shape(loop);
      shapes.push(shape);
      nodes.push({ loop, shape });
    }
  }
  return shapes;
}

function segmentData(contours) {
  const segments = [];
  for (const contour of contours) {
    for (let i = 0; i < contour.length; i++) {
      const a = contour[i];
      const b = contour[(i + 1) % contour.length];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const length2 = dx * dx + dy * dy;
      if (length2 > EPSILON * EPSILON) segments.push({ a, b, dx, dy, length2 });
    }
  }
  return segments;
}

// The first channel measures distance to the cut rim. The second stores local
// width and the third stores transverse position, so tissue widths follow the
// bone shaft and both articular ends instead of a generic bounding box.
function sliceField(contours, bounds) {
  const height = 384;
  const width = Math.max(64, Math.min(192, Math.ceil(height * bounds.width / bounds.height)));
  const pixels = new Uint8Array(width * height * 4);
  const segments = segmentData(contours);
  const near = MAX_DISTANCE;
  for (let row = 0; row < height; row++) {
    const y = bounds.min.y + (row + 0.5) / height * bounds.height;
    const intersections = [];
    const nearRow = [];
    for (const segment of segments) {
      const { a, b, dx, dy } = segment;
      if ((a.y > y) !== (b.y > y)) intersections.push(a.x + (y - a.y) * dx / dy);
      if (y + near >= Math.min(a.y, b.y) && y - near <= Math.max(a.y, b.y)) nearRow.push(segment);
    }
    intersections.sort((a, b) => a - b);
    let interval = 0;
    for (let column = 0; column < width; column++) {
      const x = bounds.min.x + (column + 0.5) / width * bounds.width;
      while (interval + 2 < intersections.length && x > intersections[interval + 1]) interval += 2;
      const left = intersections[interval];
      const right = intersections[interval + 1];
      const widthAtY = Math.max(0.008, (right - left) || 0);
      const fraction = Number.isFinite(left) ? THREE.MathUtils.clamp((x - left) / widthAtY, 0, 1) : 0.5;

      let closest2 = near * near;
      for (const { a, dx, dy, length2 } of nearRow) {
        const ax = x - a.x;
        const ay = y - a.y;
        const t = THREE.MathUtils.clamp((ax * dx + ay * dy) / length2, 0, 1);
        const ex = ax - dx * t;
        const ey = ay - dy * t;
        closest2 = Math.min(closest2, ex * ex + ey * ey);
      }

      const offset = 4 * (row * width + column);
      pixels[offset] = Math.round(Math.sqrt(closest2) / near * 255);
      pixels[offset + 1] = Math.round(255 * Math.min(widthAtY / bounds.width, 1));
      pixels[offset + 2] = Math.round(255 * fraction);
      pixels[offset + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(pixels, width, height);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

const SECTION_FRAGMENT = /* glsl */ `
uniform sampler2D boneField;
uniform vec2 boneMin;
uniform vec2 boneSize;
uniform float boneSeverity;
uniform float boneDisease;
varying vec2 bonePosition;

vec2 sectionHash(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

float sectionNoise(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  vec2 ease = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(sectionHash(cell).x, sectionHash(cell + vec2(1.0, 0.0)).x, ease.x),
    mix(sectionHash(cell + vec2(0.0, 1.0)).x, sectionHash(cell + 1.0).x, ease.x),
    ease.y
  );
}

float trabecularWall(vec2 p) {
  vec2 cell = floor(p);
  vec2 where = fract(p);
  float first = 9.0;
  float second = 9.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 offset = vec2(float(i), float(j));
      vec2 seed = offset + 0.12 + sectionHash(cell + offset) * 0.76 - where;
      float d = dot(seed, seed);
      second = min(second, max(first, d));
      first = min(first, d);
    }
  }
  return sqrt(second) - sqrt(first);
}

vec3 sectionColor() {
  vec2 p = bonePosition;
  vec3 field = texture2D(boneField, (p - boneMin) / boneSize).rgb;
  float distanceToRim = field.r * ${MAX_DISTANCE};
  float rowWidth = field.g * boneSize.x;
  float shaft = 1.0 - smoothstep(0.49, 0.88, abs(p.y));
  float grain = sectionNoise(p * vec2(270.0, 235.0));
  float clouds = sectionNoise(p * vec2(21.0, 27.0));
  float disease = boneSeverity;
  float osteoporosis = (1.0 - step(0.25, abs(boneDisease - 1.0))) * disease;
  float infection = (1.0 - step(0.25, abs(boneDisease - 2.0))) * disease;
  float softBone = (1.0 - step(0.25, abs(boneDisease - 3.0))) * disease;
  float paget = (1.0 - step(0.25, abs(boneDisease - 4.0))) * disease;
  float remodel = paget * (1.0 - smoothstep(0.25, 1.15, abs(p.y - 0.23)));
  float cortexDepth = min(0.048, rowWidth * mix(0.095, 0.215, shaft));
  cortexDepth *= 1.0 - osteoporosis * 0.42 + remodel * (0.75 + 0.55 * clouds);
  cortexDepth = max(cortexDepth, 0.0050);

  vec3 cortex = mix(vec3(0.47, 0.30, 0.18), vec3(0.81, 0.66, 0.43), 0.73 + grain * 0.18);
  float bandWidth = max(cortexDepth, 0.003);
  float lines = 0.5 + 0.5 * sin(distanceToRim / bandWidth * 39.0 + clouds * 2.9);
  cortex *= 0.9 + lines * 0.10 + 0.07 * grain;
  cortex = mix(cortex, vec3(0.73, 0.55, 0.31) * (0.88 + clouds * 0.18), softBone * 0.72);
  cortex = mix(cortex, vec3(0.64, 0.46, 0.28) * (0.75 + lines * 0.25), remodel * 0.75);

  vec2 elliptical = (vec2(field.b - 0.47, p.y) - vec2(-0.04, 0.42)) /
    vec2(0.31 + infection * 0.28, 0.14 + infection * 0.32);
  float infectionSite = infection * (1.0 - smoothstep(0.45, 1.16, length(elliptical) + (clouds - 0.5) * 0.37));
  cortex = mix(cortex, vec3(0.39, 0.26, 0.20), infectionSite * smoothstep(0.62, 1.0, infection));

  float shaftDepth = smoothstep(0.56, 1.0, sin(3.14159265 * field.b)) * shaft;
  float marrowCore = 0.83 * shaftDepth;
  vec3 marrow = mix(vec3(0.27, 0.123, 0.066), vec3(0.45, 0.235, 0.091), clouds);
  marrow = mix(marrow, vec3(0.61, 0.39, 0.17) * (0.82 + clouds * 0.3), marrowCore);
  marrow = mix(marrow, vec3(0.42, 0.24, 0.14), softBone * 0.45);

  vec2 stretch = vec2(79.0, 52.0) * mix(1.0, 0.54, max(osteoporosis, remodel));
  vec2 lattice = p * stretch + vec2(2.2 * clouds, sectionNoise(p * 31.0) * 1.3);
  float edge = trabecularWall(lattice);
  float trabecularThickness = 0.097 - 0.058 * osteoporosis + 0.074 * remodel;
  float wallSmoothing = clamp(fwidth(edge) * 0.7, 0.026, 0.12);
  float trabecula = (1.0 - smoothstep(trabecularThickness * 0.42, trabecularThickness + wallSmoothing, edge));
  trabecula *= 1.0 - marrowCore * 0.89;
  trabecula *= 1.0 - osteoporosis * smoothstep(0.54, 0.67, sectionNoise(p * 82.0)) * 0.98;
  vec3 latticeColor = mix(vec3(0.52, 0.332, 0.154), vec3(0.79, 0.593, 0.33), grain);
  latticeColor = mix(latticeColor, vec3(0.81, 0.64, 0.37), softBone * 0.69);
  vec3 interior = mix(marrow, latticeColor, trabecula);
  interior = mix(interior, vec3(0.44, 0.16, 0.075) * (0.75 + 0.46 * clouds) + latticeColor * trabecula * 0.19,
    infectionSite * 0.94);

  float cortical = 1.0 - smoothstep(cortexDepth * 0.85, cortexDepth * 1.08, distanceToRim);
  float edgeLine = 1.0 - smoothstep(0.004, 0.006, distanceToRim);
  vec3 result = mix(interior, cortex, cortical);
  result = mix(result, cortex * 1.14, edgeLine * 0.45);

  float stressY = -0.34 + field.b * 0.09 + sectionNoise(p * 20.0) * 0.012;
  float stress = (1.0 - smoothstep(0.004, 0.012, abs(p.y - stressY))) *
    (1.0 - smoothstep(0.28, 0.61, field.b)) * smoothstep(0.55, 1.0, softBone);
  result = mix(result, vec3(0.42, 0.29, 0.18), stress * 0.48);
  return result * (0.92 + grain * 0.13);
}
`;

function sectionMaterial(texture, bounds, disease, stage) {
  const material = new THREE.MeshStandardMaterial({ color: '#fff9ef', roughness: 0.88 });
  material.customProgramCacheKey = () => 'anatomical-bone-section-v1';
  material.onBeforeCompile = (shader) => {
    shader.uniforms.boneField = { value: texture };
    shader.uniforms.boneMin = { value: bounds.min };
    shader.uniforms.boneSize = { value: new THREE.Vector2(bounds.width, bounds.height) };
    shader.uniforms.boneDisease = { value: DISEASES[disease] ?? 0 };
    shader.uniforms.boneSeverity = { value: SEVERITY[stage] ?? 0 };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 bonePosition;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nbonePosition = position.xy;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + SECTION_FRAGMENT)
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= sectionColor();');
  };
  material.addEventListener('dispose', () => texture.dispose());
  return material;
}

export function createDiseaseEffects({ geometry, planeZ = 0, disease, stage }) {
  const group = new THREE.Group();
  const contours = boneSectionContours(geometry, planeZ, 'z');
  if (!contours.length) return group;

  const bounds = new THREE.Box2().setFromPoints(contours.flat()).expandByScalar(0.001);
  bounds.width = bounds.max.x - bounds.min.x;
  bounds.height = bounds.max.y - bounds.min.y;
  const field = sliceField(contours, bounds);
  const face = new THREE.ShapeGeometry(contourShapes(contours));
  const mesh = new THREE.Mesh(face, sectionMaterial(field, bounds, disease, stage));
  mesh.name = 'bone-section';
  mesh.position.z = planeZ + 0.001;
  group.add(mesh);
  return group;
}

export function diseaseMaterialStyle(disease, stage) {
  const strength = SEVERITY[stage] ?? 0;
  const normal = new THREE.Color('#f0dcc1');
  const condition = {
    osteoporosis: '#e9d6be',
    osteomyelitis: '#e2c5aa',
    osteomalacia: '#ebd7af',
    paget: '#e2c294',
  }[disease] ?? '#f0dcc1';
  return { color: normal.lerp(new THREE.Color(condition), strength), roughness: 0.66 + strength * 0.13 };
}

export function deformDiseaseGeometry(geometry, disease, stage, boneId) {
  const strength = SEVERITY[stage] ?? 0;
  const remodeled = disease === 'paget' && strength > 0;
  const stressCurve = disease === 'osteomalacia' && stage === 'advanced' && /^(femur|tibia)-/.test(boneId);
  if (!remodeled && !stressCurve) return geometry;

  const altered = geometry.clone();
  const positions = altered.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    const envelope = 1 - THREE.MathUtils.smoothstep(Math.abs(y - 0.13), 0.2, 1.1);
    const widen = remodeled ? 1 + 0.13 * strength * envelope : 1;
    const bend = stressCurve ? 0.032 * envelope : 0.022 * strength * envelope;
    positions.setX(i, positions.getX(i) * widen + bend);
    positions.setZ(i, positions.getZ(i) * widen);
  }
  positions.needsUpdate = true;
  altered.computeVertexNormals();
  altered.computeBoundingBox();
  altered.computeBoundingSphere();
  return altered;
}

// Align the anatomical shaft and pick a lengthwise plane through as much of
// the centerline as possible. This matters for curved forearm bones.
export function orientBoneSection(geometry) {
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  const length = bounds.max.y - bounds.min.y;
  const levels = Array.from({ length: 15 }, (_, step) => bounds.min.y + (step + 0.5) * length / 15);
  const samples = levels.map((y) => {
    const contour = boneSectionContours(geometry, y, 'y')[0];
    if (!contour) return null;
    const center = new THREE.Box2().setFromPoints(contour).getCenter(new THREE.Vector2());
    return new THREE.Vector3(center.x, y, center.y);
  }).filter(Boolean);

  if (samples.length < 3) return { geometry, planeZ: 0 };

  const centerline = samples.reduce((sum, sample) => sum.add(sample), new THREE.Vector3())
    .divideScalar(samples.length);
  let variance = 0;
  const covariance = new THREE.Vector2();
  for (const sample of samples) {
    const y = sample.y - centerline.y;
    variance += y * y;
    covariance.x += y * (sample.x - centerline.x);
    covariance.y += y * (sample.z - centerline.z);
  }
  const axis = new THREE.Vector3(covariance.x / variance, 1, covariance.y / variance).normalize();
  const rotation = new THREE.Quaternion().setFromUnitVectors(axis, new THREE.Vector3(0, 1, 0));
  const aligned = geometry.clone().applyQuaternion(rotation);
  aligned.computeBoundingBox();
  const alignedBounds = aligned.boundingBox;
  const alignedLength = alignedBounds.max.y - alignedBounds.min.y;
  const transverse = [];
  for (let i = 0; i < 17; i++) {
    const y = alignedBounds.min.y + (i + 0.5) * alignedLength / 17;
    const trace = boneSectionContours(aligned, y, 'y')[0];
    if (trace) transverse.push(trace);
  }

  let best = { score: -Infinity, angle: 0, planeZ: 0 };
  for (let step = 0; step < 24; step++) {
    const angle = step * Math.PI / 24;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    const intervals = transverse.map((trace) => {
      let min = Infinity;
      let max = -Infinity;
      for (const p of trace) {
        const z = -sin * p.x + cos * p.y;
        min = Math.min(min, z);
        max = Math.max(max, z);
      }
      return { center: (min + max) / 2, radius: (max - min) / 2 };
    });

    const candidates = intervals.map(({ center }) => center);
    candidates.push(candidates.reduce((sum, x) => sum + x, 0) / candidates.length);
    for (const planeZ of candidates) {
      if (!Number.isFinite(planeZ)) continue;
      let score = 0;
      for (const { center, radius } of intervals) {
        const relativeDistance = Math.abs(planeZ - center) / Math.max(radius, 0.0001);
        score += relativeDistance < 1 ? 2 + (1 - relativeDistance * relativeDistance) : -1;
      }
      if (score > best.score) best = { score, angle, planeZ };
    }
  }

  aligned.rotateY(best.angle);
  aligned.computeBoundingBox();
  aligned.computeBoundingSphere();
  return { geometry: aligned, planeZ: best.planeZ };
}
