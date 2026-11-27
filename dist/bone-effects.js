import * as THREE from './vendor/three.module.js';

const COMPONENT = { x: 0, y: 1, z: 2 };
const SECTION_COORDINATES = { x: [2, 1], y: [0, 2], z: [0, 1] };
const WELD = 0.000015;
const EPSILON = 0.0000001;
const MAX_DISTANCE = 0.16;

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

const SECTION_COLORS = {
  edge: [243, 219, 178],
  cortex: [221, 192, 150],
  lowMineral: [229, 209, 173],
  denseCortex: [214, 174, 121],
  inflamedCortex: [181, 124, 108],
  marrowDeep: [154, 106, 75],
  marrowWarm: [192, 143, 95],
  marrowCore: [217, 173, 107],
  inflamedMarrow: [173, 107, 95],
  cancellous: [231, 193, 140],
  lowMineralTrabecula: [236, 212, 165],
  stressMark: [143, 108, 79],
};
const { clamp, lerp, smoothstep } = THREE.MathUtils;

function tissueRandom(x, y, salt = 0) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + salt;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function tissueNoise(x, y) {
  const column = Math.floor(x);
  const row = Math.floor(y);
  const u = smoothstep(x - column, 0, 1);
  const v = smoothstep(y - row, 0, 1);
  return lerp(
    lerp(tissueRandom(column, row), tissueRandom(column + 1, row), u),
    lerp(tissueRandom(column, row + 1), tissueRandom(column + 1, row + 1), u),
    v,
  );
}

function trabecularWall(x, y) {
  const column = Math.floor(x);
  const row = Math.floor(y);
  const u = x - column;
  const v = y - row;
  let first = Infinity;
  let second = Infinity;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const rx = i + 0.12 + tissueRandom(column + i, row + j, 17) * 0.76 - u;
      const ry = j + 0.12 + tissueRandom(column + i, row + j, 881) * 0.76 - v;
      const distance = rx * rx + ry * ry;
      second = Math.min(second, Math.max(first, distance));
      first = Math.min(first, distance);
    }
  }
  return Math.sqrt(second) - Math.sqrt(first);
}

function writeTissueColor(pixels, offset, x, y, rimDistance, rowWidth, fraction, features) {
  const colors = SECTION_COLORS;
  const { osteoporosis, infection, lowMineral, paget } = features;
  const shaft = 1 - smoothstep(Math.abs(y), 0.49, 0.88);
  const grain = tissueNoise(x * 271, y * 235);
  const clouds = tissueNoise(x * 21, y * 27);
  const remodel = paget * (1 - smoothstep(Math.abs(y - 0.23), 0.25, 1.15));
  const density = (1 - osteoporosis * 0.42 + remodel * (0.75 + 0.55 * clouds));
  const cortexDepth = Math.max(0.005, Math.min(0.048, rowWidth * lerp(0.095, 0.215, shaft)) * density);
  const band = 0.5 + 0.5 * Math.sin(rimDistance / cortexDepth * 39 + clouds * 2.9);
  const cortical = 1 - smoothstep(rimDistance, cortexDepth * 0.85, cortexDepth * 1.08);
  const outerEdge = 1 - smoothstep(rimDistance, 0.003, 0.007);

  const lesion = Math.hypot((fraction - 0.43) / (0.31 + infection * 0.28),
    (y - 0.42) / (0.14 + infection * 0.32));
  const infectionSite = infection * (1 - smoothstep(lesion + (clouds - 0.5) * 0.37, 0.45, 1.16));
  const infectionCortex = infectionSite * smoothstep(infection, 0.62, 1);
  const marrowCore = 0.83 * smoothstep(Math.sin(Math.PI * fraction), 0.56, 1) * shaft;

  const densityScale = lerp(1, 0.54, Math.max(osteoporosis, remodel));
  const wall = trabecularWall(x * 79 * densityScale + 2.2 * clouds,
    y * 52 * densityScale + tissueNoise(x * 31, y * 31) * 1.3);
  const thickness = 0.097 - 0.058 * osteoporosis + 0.074 * remodel;
  const porous = 1 - osteoporosis * smoothstep(tissueNoise(x * 82, y * 82), 0.54, 0.67) * 0.98;
  const trabecula = (1 - smoothstep(wall, thickness * 0.42, thickness + 0.06)) * (1 - marrowCore * 0.89) * porous;
  const stressY = -0.34 + fraction * 0.09 + tissueNoise(x * 20, y * 20) * 0.012;
  const stress = (1 - smoothstep(Math.abs(y - stressY), 0.004, 0.012)) *
    (1 - smoothstep(fraction, 0.28, 0.61)) * smoothstep(lowMineral, 0.55, 1);

  for (let channel = 0; channel < 3; channel++) {
    let cortex = colors.cortex[channel] * (0.94 + band * 0.055 + grain * 0.055);
    cortex = lerp(cortex, colors.lowMineral[channel], lowMineral * 0.74);
    cortex = lerp(cortex, colors.denseCortex[channel] * (0.89 + band * 0.12), remodel * 0.76);
    cortex = lerp(cortex, colors.inflamedCortex[channel], infectionCortex);

    let marrow = lerp(colors.marrowDeep[channel], colors.marrowWarm[channel], clouds);
    marrow = lerp(marrow, colors.marrowCore[channel], marrowCore * (0.86 + clouds * 0.12));
    marrow = lerp(marrow, colors.lowMineral[channel], lowMineral * 0.28);
    let lattice = lerp(colors.cancellous[channel], colors.lowMineralTrabecula[channel], lowMineral * 0.72);
    lattice *= 0.91 + grain * 0.13;
    let interior = lerp(marrow, lattice, trabecula);
    interior = lerp(interior, colors.inflamedMarrow[channel] * (0.87 + clouds * 0.19), infectionSite * 0.94);

    let color = lerp(interior, cortex, cortical);
    color = lerp(color, colors.edge[channel], outerEdge * 0.7);
    color = lerp(color, colors.stressMark[channel], stress * 0.56);
    pixels[offset + channel] = clamp(Math.round(color * (0.957 + grain * 0.085)), 0, 255);
  }
  pixels[offset + 3] = 255;
}

// Bake the solid, sRGB section into a conventional texture. This keeps the
// porous structure and pathology consistent across WebGL drivers and lights.
function createSectionTexture(contours, bounds, disease, stage) {
  const height = 480;
  const width = Math.max(80, Math.min(240, Math.ceil(height * bounds.width / bounds.height)));
  const pixels = new Uint8Array(width * height * 4);
  const segments = segmentData(contours);
  const severity = SEVERITY[stage] ?? 0;
  const features = {
    osteoporosis: disease === 'osteoporosis' ? severity : 0,
    infection: disease === 'osteomyelitis' ? severity : 0,
    lowMineral: disease === 'osteomalacia' ? severity : 0,
    paget: disease === 'paget' ? severity : 0,
  };

  for (let row = 0; row < height; row++) {
    const y = bounds.min.y + (row + 0.5) / height * bounds.height;
    const intersections = [];
    const nearRow = [];
    for (const segment of segments) {
      const { a, b, dx, dy } = segment;
      if ((a.y > y) !== (b.y > y)) intersections.push(a.x + (y - a.y) * dx / dy);
      if (y + MAX_DISTANCE >= Math.min(a.y, b.y) && y - MAX_DISTANCE <= Math.max(a.y, b.y)) nearRow.push(segment);
    }
    intersections.sort((a, b) => a - b);
    let interval = 0;

    for (let column = 0; column < width; column++) {
      const x = bounds.min.x + (column + 0.5) / width * bounds.width;
      const offset = 4 * (row * width + column);
      while (interval + 2 < intersections.length && x > intersections[interval + 1]) interval += 2;
      const left = intersections[interval];
      const right = intersections[interval + 1];
      if (!Number.isFinite(right) || x < left || x > right) {
        // Keep the sampling border bone-colored to prevent mipmap fringes.
        pixels[offset] = SECTION_COLORS.edge[0];
        pixels[offset + 1] = SECTION_COLORS.edge[1];
        pixels[offset + 2] = SECTION_COLORS.edge[2];
        pixels[offset + 3] = 255;
        continue;
      }
      const rowWidth = Math.max(0.008, right - left);
      const fraction = clamp((x - left) / rowWidth, 0, 1);
      let closest2 = MAX_DISTANCE * MAX_DISTANCE;
      for (const { a, dx, dy, length2 } of nearRow) {
        const ax = x - a.x;
        const ay = y - a.y;
        const t = clamp((ax * dx + ay * dy) / length2, 0, 1);
        const ex = ax - dx * t;
        const ey = ay - dy * t;
        closest2 = Math.min(closest2, ex * ex + ey * ey);
      }
      writeTissueColor(pixels, offset, x, y, Math.sqrt(closest2), rowWidth, fraction, features);
    }
  }

  const texture = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function assignSectionUVs(geometry, bounds) {
  const positions = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < positions.count; i++) {
    uv.setXY(i, (positions.getX(i) - bounds.min.x) / bounds.width, (positions.getY(i) - bounds.min.y) / bounds.height);
  }
}

export function createDiseaseEffects({ geometry, planeZ = 0, disease, stage }) {
  const group = new THREE.Group();
  const contours = boneSectionContours(geometry, planeZ, 'z');
  if (!contours.length) return group;

  const bounds = new THREE.Box2().setFromPoints(contours.flat()).expandByScalar(0.001);
  bounds.width = bounds.max.x - bounds.min.x;
  bounds.height = bounds.max.y - bounds.min.y;
  const texture = createSectionTexture(contours, bounds, disease, stage);
  const face = new THREE.ShapeGeometry(contourShapes(contours));
  assignSectionUVs(face, bounds);
  const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
  material.addEventListener('dispose', () => texture.dispose());
  const mesh = new THREE.Mesh(face, material);
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

export function deformDiseaseGeometry(geometry, disease, stage, boneId, planeZ = 0) {
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
    positions.setZ(i, planeZ + (positions.getZ(i) - planeZ) * widen);
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
