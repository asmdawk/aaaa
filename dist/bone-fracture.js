import * as THREE from './vendor/three.module.js';

const UP = new THREE.Vector3(0, 1, 0);
const TAU = 2 * Math.PI;

export function normalizeBone(mesh) {
  mesh.updateWorldMatrix(true, false);
  const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
  const position = geometry.getAttribute('position');
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const height = max.y - min.y;
  const lower = new THREE.Vector3();
  const upper = new THREE.Vector3();
  let lowCount = 0;
  let highCount = 0;
  const point = new THREE.Vector3();
  for (let index = 0; index < position.count; index++) {
    point.fromBufferAttribute(position, index);
    const along = (point.y - min.y) / height;
    if (along >= 0.23 && along <= 0.38) {
      lower.add(point);
      lowCount++;
    }
    if (along >= 0.62 && along <= 0.77) {
      upper.add(point);
      highCount++;
    }
  }
  const axis = lowCount && highCount
    ? upper.divideScalar(highCount).sub(lower.divideScalar(lowCount)).normalize()
    : UP;
  const rotation = new THREE.Matrix4().makeRotationFromQuaternion(
    new THREE.Quaternion().setFromUnitVectors(axis, UP),
  );
  geometry.applyMatrix4(rotation);
  geometry.computeBoundingBox();
  const center = geometry.boundingBox.getCenter(new THREE.Vector3());
  const scale = 2 / geometry.boundingBox.getSize(new THREE.Vector3()).y;
  const normalize = new THREE.Matrix4().makeScale(scale, scale, scale)
    .multiply(new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z));
  geometry.applyMatrix4(normalize);
  if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return { geometry, matrix: normalize.multiply(rotation) };
}

export function shaftProfile(geometry, y, width = 0.092) {
  const position = geometry.getAttribute('position');
  const bounds = new THREE.Box3();
  const point = new THREE.Vector3();
  let nearest = Infinity;
  const nearestPoint = new THREE.Vector3();
  for (let index = 0; index < position.count; index++) {
    point.fromBufferAttribute(position, index);
    const offset = Math.abs(point.y - y);
    if (offset < width) bounds.expandByPoint(point);
    if (offset < nearest) {
      nearest = offset;
      nearestPoint.copy(point);
    }
  }
  if (bounds.isEmpty()) bounds.set(nearestPoint, nearestPoint);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  return { x: center.x, z: center.z, rx: size.x / 2, rz: size.z / 2 };
}

function makeGeometry(positions, normals) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (normals?.length) geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  if (!normals?.length) geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function convexOutline(points) {
  const byCoordinate = new Map();
  for (const point of points) {
    byCoordinate.set(Math.round(point.x * 100000) + ':' + Math.round(point.z * 100000), point);
  }
  const sorted = Array.from(byCoordinate.values()).sort((a, b) => a.x - b.x || a.z - b.z);
  const signedTurn = (a, b, c) => (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
  function chain(input) {
    const result = [];
    for (const point of input) {
      while (result.length > 1 && signedTurn(result.at(-2), result.at(-1), point) <= 0) result.pop();
      result.push(point);
    }
    result.pop();
    return result;
  }
  return chain(sorted).concat(chain(sorted.reverse()));
}

function seamLoops(segments) {
  const nodes = new Map();
  function getNode(point) {
    const id = Math.round(point.x * 10000) + ':' + Math.round(point.z * 10000);
    if (!nodes.has(id)) nodes.set(id, { point, edges: [] });
    return nodes.get(id);
  }
  for (const [first, second] of segments) {
    const a = getNode(first);
    const b = getNode(second);
    if (a === b) continue;
    a.edges.push(b);
    b.edges.push(a);
  }
  const completed = [];
  const visited = new Set();
  for (const start of nodes.values()) {
    if (visited.has(start)) continue;
    const loop = [];
    let prev = null;
    let node = start;
    while (node && !visited.has(node)) {
      if (node.edges.length !== 2) break;
      visited.add(node);
      loop.push(node.point);
      const next = node.edges.find((edge) => edge !== prev);
      prev = node;
      node = next;
    }
    if (node === start && loop.length > 2) completed.push(loop);
  }
  return completed.length ? completed : [convexOutline(segments.flat())];
}

function buildBrokenFaces(outlines, field, positive) {
  const cortex = [];
  const interior = [];
  for (const points of outlines) {
    if (points.length < 3) continue;
    const center = new THREE.Vector3();
    for (const point of points) center.add(point);
    center.divideScalar(points.length);
    const inside = points.map((point) => {
      const inset = center.clone().lerp(point, 0.72);
      inset.y = field(inset.x, inset.z) + (positive ? 0.007 : -0.007);
      return inset;
    });
    const append = (target, a, b, c) => {
      const cross = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
      const winding = (cross.y < 0) === positive ? [a, b, c] : [a, c, b];
      for (const point of winding) target.push(point.x, point.y, point.z);
    };
    for (let index = 0; index < points.length; index++) {
      const next = (index + 1) % points.length;
      append(cortex, points[index], points[next], inside[index]);
      append(cortex, points[next], inside[next], inside[index]);
    }
    const projected = inside.map((point) => new THREE.Vector2(point.x, point.z));
    for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(projected, [])) {
      append(interior, inside[a], inside[b], inside[c]);
    }
  }
  return { cap: makeGeometry(cortex), interior: makeGeometry(interior) };
}

export function fractureBone(geometry, level = 0) {
  const p = geometry.getAttribute('position');
  const n = geometry.getAttribute('normal');
  const ix = geometry.getIndex();
  const profile = shaftProfile(geometry, level);
  const twist = (v) => 2 * Math.abs(v - Math.floor(v + 0.5)) - 0.5;
  const field = (x, z) => level + (x - profile.x) * 0.36 - (z - profile.z) * 0.12
    + twist((x - profile.x) * 18 + (z - profile.z) * 6) * 0.025
    + Math.sin((x + z) * 113) * 0.006;
  const source = Array.from({ length: p.count }, (_, index) => {
    const point = new THREE.Vector3().fromBufferAttribute(p, index);
    const normal = new THREE.Vector3().fromBufferAttribute(n, index);
    return { point, normal, distance: point.y - field(point.x, point.z) };
  });
  const sections = [{ positions: [], normals: [] }, { positions: [], normals: [] }];
  const segments = [];
  const count = ix ? ix.count : p.count;
  function addTriangle(output, polygon) {
    for (let index = 1; index < polygon.length - 1; index++) {
      for (const item of [polygon[0], polygon[index], polygon[index + 1]]) {
        output.positions.push(...item.point);
        output.normals.push(...item.normal);
      }
    }
  }

  for (let start = 0; start < count; start += 3) {
    const triangle = [0, 1, 2].map((offset) => source[ix ? ix.getX(start + offset) : start + offset]);
    const splitPolygons = [[], []];
    const intersections = [];
    for (let index = 0; index < 3; index++) {
      const current = triangle[index];
      const next = triangle[(index + 1) % 3];
      splitPolygons[current.distance >= 0 ? 0 : 1].push(current);
      if ((current.distance >= 0) === (next.distance >= 0)) continue;
      const ratio = current.distance / (current.distance - next.distance);
      const cut = {
        point: current.point.clone().lerp(next.point, ratio),
        normal: current.normal.clone().lerp(next.normal, ratio).normalize(),
      };
      splitPolygons[0].push(cut);
      splitPolygons[1].push(cut);
      intersections.push(cut.point);
    }
    if (intersections.length === 2) segments.push(intersections);
    for (let side = 0; side < 2; side++) addTriangle(sections[side], splitPolygons[side]);
  }
  const outlines = seamLoops(segments);
  return sections.map((side, index) => ({
    shell: makeGeometry(side.positions, side.normals),
    ...buildBrokenFaces(outlines, field, index === 0),
  }));
}

export function makeSkin(geometry, type, level, width, depth) {
  const positions = [];
  const indices = [];
  const openingEdges = [];
  const subdivisions = 76;
  const ringPoints = 44;
  const length = 0.87;
  const gapHeight = 0.195;
  // Average nearby shaft radii so the contextual skin follows the limb smoothly.
  const profiles = Array.from({ length: subdivisions + 1 }, (_, index) => shaftProfile(
    geometry, -length + 2 * length * index / subdivisions, 0.118,
  ));
  for (let row = 0; row <= subdivisions; row++) {
    const y = -length + 2 * length * row / subdivisions;
    const offset = (y - level) / gapHeight;
    const gap = type === 'open' && Math.abs(offset) < 1
      ? 0.78 * Math.sqrt(1 - offset ** 2) * (0.96 + Math.sin(13 * y) * 0.045)
      : 0;
    const slice = profiles.slice(Math.max(0, row - 4), row + 5);
    const average = (key) => slice.reduce((sum, value) => sum + value[key], 0) / slice.length;
    const rx = average('rx') + width * (0.8 + 0.2 * (y + 1) / 2);
    const rz = average('rz') + depth * (0.72 + 0.28 * (y + 1) / 2);
    const xCenter = average('x');
    const zCenter = average('z');
    for (let column = 0; column <= ringPoints; column++) {
      const theta = gap + (TAU - 2 * gap) * column / ringPoints;
      const x = xCenter + rx * Math.sin(theta);
      const z = zCenter + rz * Math.cos(theta);
      positions.push(x, y, z);
      if (gap > 0 && (column === 0 || column === ringPoints)) {
        openingEdges.push([column, new THREE.Vector3(x, y, z)]);
      }
      if (row < subdivisions && column < ringPoints) {
        const current = row * (ringPoints + 1) + column;
        const next = current + ringPoints + 1;
        indices.push(current, current + 1, next, next, current + 1, next + 1);
      }
    }
  }
  const surface = new THREE.BufferGeometry();
  surface.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  surface.setIndex(indices);
  surface.computeVertexNormals();
  const edge = [...openingEdges.filter(([column]) => column === 0), ...openingEdges.filter(([column]) => column !== 0).reverse()]
    .map(([, point]) => point);
  return { surface, edge };
}

export function bindFractureCover(mesh, level, sectionWidth = 0.25, shaderRestPosition = false) {
  const geometry = mesh.geometry;
  const sourcePosition = geometry.getAttribute('position');
  const sourceNormal = geometry.getAttribute('normal');
  const restPosition = new Float32Array(sourcePosition.count * 3);
  const restNormal = new Float32Array(sourcePosition.count * 3);
  const weights = new Float32Array(sourcePosition.count);
  for (let index = 0; index < sourcePosition.count; index++) {
    const vertex = index * 3;
    restPosition[vertex] = sourcePosition.getX(index);
    restPosition[vertex + 1] = sourcePosition.getY(index);
    restPosition[vertex + 2] = sourcePosition.getZ(index);
    restNormal[vertex] = sourceNormal.getX(index);
    restNormal[vertex + 1] = sourceNormal.getY(index);
    restNormal[vertex + 2] = sourceNormal.getZ(index);
    weights[index] = THREE.MathUtils.smoothstep(restPosition[vertex + 1], level - sectionWidth, level + sectionWidth);
  }
  if (shaderRestPosition) {
    geometry.setAttribute('fractureRestPosition', new THREE.BufferAttribute(restPosition, 3));
  }
  const position = new THREE.BufferAttribute(restPosition.slice(), 3).setUsage(THREE.DynamicDrawUsage);
  const normal = new THREE.BufferAttribute(restNormal.slice(), 3).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', position);
  geometry.setAttribute('normal', normal);
  mesh.frustumCulled = false;
  return { position, normal, weights, restPosition, restNormal };
}

export function deformFractureCovers(covers, proximal, distal) {
  const upper = proximal.elements;
  const lower = distal.elements;
  for (const piece of covers) {
    const { restPosition, restNormal, weights, position, normal } = piece;
    const shift = position.array;
    const shade = normal.array;
    for (let index = 0; index < weights.length; index++) {
      const i = index * 3;
      const ax = restPosition[i];
      const ay = restPosition[i + 1];
      const az = restPosition[i + 2];
      const nx = restNormal[i];
      const ny = restNormal[i + 1];
      const nz = restNormal[i + 2];
      const weight = weights[index];
      const a = weight > 0 ? upper : lower;
      shift[i] = a[0] * ax + a[4] * ay + a[8] * az + a[12];
      shift[i + 1] = a[1] * ax + a[5] * ay + a[9] * az + a[13];
      shift[i + 2] = a[2] * ax + a[6] * ay + a[10] * az + a[14];
      shade[i] = a[0] * nx + a[4] * ny + a[8] * nz;
      shade[i + 1] = a[1] * nx + a[5] * ny + a[9] * nz;
      shade[i + 2] = a[2] * nx + a[6] * ny + a[10] * nz;

      // Near the break, adjacent fragments share a short continuous tissue band.
      if (weight > 0 && weight < 1) {
        const remainder = 1 - weight;
        shift[i] = weight * shift[i] + remainder * (lower[0] * ax + lower[4] * ay + lower[8] * az + lower[12]);
        shift[i + 1] = weight * shift[i + 1] + remainder * (lower[1] * ax + lower[5] * ay + lower[9] * az + lower[13]);
        shift[i + 2] = weight * shift[i + 2] + remainder * (lower[2] * ax + lower[6] * ay + lower[10] * az + lower[14]);
        shade[i] = weight * shade[i] + remainder * (lower[0] * nx + lower[4] * ny + lower[8] * nz);
        shade[i + 1] = weight * shade[i + 1] + remainder * (lower[1] * nx + lower[5] * ny + lower[9] * nz);
        shade[i + 2] = weight * shade[i + 2] + remainder * (lower[2] * nx + lower[6] * ny + lower[10] * nz);
      }
    }
    position.needsUpdate = true;
    normal.needsUpdate = true;
  }
}
