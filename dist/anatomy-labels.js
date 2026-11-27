import { Raycaster, Vector2, Vector3 } from './vendor/three.module.js';
import { MeshBVH } from './vendor/three-mesh-bvh.js';
import { describeStructure } from './anatomy-info.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const OCCLUDING_OPACITY = 0.88;
const OCCLUSION_INTERVAL = 130;
const PROBE_LIMIT = 68;
const LAYER_COLORS = {
  muscles: '#f3a294', bones: '#e8cfaa', organs: '#e5adca',
  vessels: '#ee9ca8', nerves: '#e7c984', skin: '#e5ac94',
};
const LANDMARK = /^(facial-muscles|sternocleidomastoid|deltoid|pectoralis-major|biceps-brachii|triceps-brachii|rectus-abdominis|latissimus-dorsi|quadriceps-femoris|gluteus-maximus|gastrocnemius|calcaneal-tendon|skull|mandible|sternum|humerus|radius|ulna|femur|patella|tibia|sacrum|ribs|brain|lung|liver|heart|stomach|skin)(-|$)/;
const PROBE_OFFSETS = [
  [0, 0], [0.23, -0.18], [-0.23, 0.18], [0, -0.31], [0, 0.31],
  [-0.27, -0.18], [0.27, 0.18],
];

function svgNode(name, classes) {
  const node = document.createElementNS(SVG_NS, name);
  if (classes) node.setAttribute('class', classes);
  return node;
}

function degreesOfVisibility(part) {
  return part.mesh.visible ? part.mesh.material.opacity : 0;
}

function structureFamily(part) {
  return part.id.replace(/(?:^|-)(left|right)(?=-|$)/, '');
}

function screenPoint(point, width, height) {
  return {
    x: (point.x + 1) * width / 2,
    y: (1 - point.y) * height / 2,
    depth: point.z,
  };
}

function inStage(point, width, height) {
  return point.depth >= -1 && point.depth <= 1
    && point.x >= 3 && point.x <= width - 3 && point.y >= 4 && point.y <= height - 4;
}

function layoutFor(width, height) {
  const compact = width < 540;
  return {
    width, height, compact,
    chipWidth: Math.round(Math.max(98, Math.min(168, width * (compact ? 0.29 : 0.238)))),
    gap: compact ? 46 : 45,
    top: 66,
    bottom: height - 64,
    maximum: Math.min(compact ? 8 : 12, Math.max(1, Math.floor((height - 102) / 35))),
  };
}

function labelSlot(anchor, side, labels, layout) {
  const { width, height, compact, chipWidth, gap, top, bottom } = layout;
  if (top > bottom) return null;
  const preferred = Math.min(bottom, Math.max(top, anchor.y));
  const offsets = [0, gap, -gap, gap * 2, -gap * 2];
  const nearestSide = anchor.x < width / 2 ? -1 : 1;
  const sides = side ? [side, -side] : [nearestSide, -nearestSide];
  for (const edge of sides) {
    for (const offset of offsets) {
      const y = preferred + offset;
      if (y < top || y > bottom || Math.abs(y - anchor.y) > 112) continue;
      const leftInset = compact && Math.abs(y - height / 2) > 145 ? 11 : 58;
      const x = edge < 0 ? leftInset : width - chipWidth - (compact ? 12 : 22);
      const lineStart = edge < 0 ? x + chipWidth + 2 : x - 2;
      if ((anchor.x - lineStart) * -edge < 14) continue;
      const overlaps = labels.some((other) => Math.abs(other.y - y) < gap
        && Math.abs(other.x - x) < chipWidth + 7);
      if (!overlaps) return { x, y, edge, lineStart };
    }
  }
  return null;
}

export class AnatomyLabels {
  constructor(host, onSelect) {
    this.host = host;
    this.onSelect = onSelect;
    this.nodes = new Map();
    this.anchors = new Map();
    this.surfaceTrees = new WeakMap();
    this.ray = new Raycaster();
    this.ray.firstHitOnly = true;
    this.ndc = new Vector2();
    this.point = new Vector3();
    this.vertex = new Vector3();
    this.intersections = [];
    this.depthHits = [];
    this.enabled = false;
    this.pending = false;
    this.nextCheck = 0;

    this.root = document.createElement('div');
    this.root.className = 'anatomy-labels';
    this.root.setAttribute('role', 'group');
    this.root.setAttribute('aria-label', 'Podpisy struktur anatomicznych');
    this.root.hidden = true;
    this.lines = svgNode('svg', 'anatomy-label-lines');
    this.lines.setAttribute('aria-hidden', 'true');
    this.root.append(this.lines);
    host.append(this.root);
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    this.root.hidden = !this.enabled;
    this.invalidate();
  }

  invalidate() {
    this.pending = true;
    this.nextCheck = 0;
  }

  due(time) {
    return this.enabled && this.pending && time >= this.nextCheck;
  }

  projectAnchor(anchor, camera, width, height) {
    const { mesh } = anchor.part;
    const positions = mesh.geometry.getAttribute('position');
    this.point.set(0, 0, 0);
    for (let index = 0; index < 3; index++) {
      this.point.addScaledVector(this.vertex.fromBufferAttribute(positions, anchor.indices[index]), anchor.weights[index]);
    }
    this.point.applyMatrix4(mesh.matrixWorld);
    const depth = this.point.distanceTo(camera.position);
    return { ...screenPoint(this.point.project(camera), width, height), distance: depth };
  }

  projectPart(part, camera, width, height, selection) {
    const { geometry, matrixWorld } = part.mesh;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const { min, max } = geometry.boundingBox;
    const projected = geometry.boundingBox.getCenter(this.point).applyMatrix4(matrixWorld).project(camera);
    const center = screenPoint(projected, width, height);
    if (center.depth < -1 || center.depth > 1) return null;
    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
    for (let index = 0; index < 8; index++) {
      this.point.set(index & 1 ? max.x : min.x, index & 2 ? max.y : min.y, index & 4 ? max.z : min.z)
        .applyMatrix4(matrixWorld).project(camera);
      const corner = screenPoint(this.point, width, height);
      left = Math.min(left, corner.x);
      right = Math.max(right, corner.x);
      top = Math.min(top, corner.y);
      bottom = Math.max(bottom, corner.y);
    }
    if (right < 4 || left > width - 4 || bottom < 4 || top > height - 4) return null;
    const sizeX = Math.min(width, right - left);
    const sizeY = Math.min(height, bottom - top);
    const area = Math.sqrt(sizeX * sizeY);
    const score = (part === selection ? 1000 : 0) + Math.min(14, Math.sqrt(area))
      + (LANDMARK.test(part.id) ? 4.5 : 0) + (this.anchors.has(part) ? 1.7 : 0);
    return { part, center, left, right, top, bottom, sizeX, sizeY, score };
  }

  hit(candidate, point, camera, blockers, width, height) {
    this.ndc.set(point.x / width * 2 - 1, 1 - point.y / height * 2);
    this.ray.setFromCamera(this.ndc, camera);
    this.ray.far = Infinity;
    this.intersections.length = 0;
    this.intersect(candidate.part.mesh, this.intersections);
    const intersection = this.intersections[0];
    if (!intersection) return null;

    const tolerance = 0.003;
    this.ray.far = Math.max(0, intersection.distance - tolerance);
    for (const blocker of blockers) {
      if (blocker === candidate || point.x < blocker.left - 2 || point.x > blocker.right + 2
        || point.y < blocker.top - 2 || point.y > blocker.bottom + 2) continue;
      this.depthHits.length = 0;
      this.intersect(blocker.part.mesh, this.depthHits);
      if (this.depthHits.length) return null;
    }
    return intersection;
  }

  intersect(mesh, hits) {
    const { geometry } = mesh;
    const positions = geometry.getAttribute('position');
    if ((geometry.index?.count ?? positions.count) < 1200) {
      this.ray.intersectObject(mesh, false, hits);
      return;
    }
    const version = positions.version ?? positions.data.version;
    let entry = this.surfaceTrees.get(geometry);
    if (!entry) {
      const tree = new MeshBVH(geometry, { indirect: true, setBoundingBox: false, maxLeafSize: 12 });
      entry = { tree, version };
      this.surfaceTrees.set(geometry, entry);
    } else if (entry.version !== version) {
      entry.tree.refit();
      entry.version = version;
    }
    entry.tree.raycastObject3D(mesh, this.ray, hits);
  }

  findAnchor(candidate, camera, blockers, layout, budget) {
    const { width, height } = layout;
    const previous = this.anchors.get(candidate.part);
    if (previous) {
      const point = this.projectAnchor(previous, camera, width, height);
      if (inStage(point, width, height)) {
        budget.remaining--;
        const intersection = this.hit(candidate, point, camera, blockers, width, height);
        if (intersection && Math.abs(intersection.distance - point.distance) < 0.006) return previous;
      }
    }
    const { center, sizeX, sizeY } = candidate;
    for (const [x, y] of PROBE_OFFSETS) {
      if (budget.remaining <= 0) break;
      const point = {
        x: Math.min(width - 7, Math.max(7, center.x + x * sizeX)),
        y: Math.min(height - 7, Math.max(7, center.y + y * sizeY)),
      };
      budget.remaining--;
      const intersection = this.hit(candidate, point, camera, blockers, width, height);
      if (!intersection?.face || !intersection.barycoord) continue;
      const { a, b, c } = intersection.face;
      return { part: candidate.part, indices: [a, b, c], weights: intersection.barycoord.toArray() };
    }
    return null;
  }

  resolve(camera, parts, selection, layout) {
    const { width, height, maximum } = layout;
    const candidates = parts.filter((part) => degreesOfVisibility(part) >= 0.08)
      .map((part) => this.projectPart(part, camera, width, height, selection))
      .filter(Boolean);
    const blockers = candidates.filter(({ part }) => degreesOfVisibility(part) >= OCCLUDING_OPACITY);
    const sorted = candidates.filter(({ sizeX, sizeY, part }) => sizeX * sizeY >= 54 || part === selection)
      .sort((a, b) => b.score - a.score);
    if (!sorted.length) {
      this.anchors.clear();
      return;
    }

    // Cycle through screen regions so large torso structures do not use every label.
    const left = Math.max(0, Math.min(...sorted.map((candidate) => candidate.left)));
    const right = Math.min(width, Math.max(...sorted.map((candidate) => candidate.right)));
    const span = Math.max(1, right - left);
    const groups = new Map();
    for (const candidate of sorted) {
      const { center, part } = candidate;
      const row = Math.min(5, Math.max(0, Math.floor(center.y / height * 6)));
      const column = Math.min(3, Math.max(0, Math.floor((center.x - left) / span * 4)));
      const key = part === selection ? 'selection'
        : row * 4 + column;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(candidate);
    }

    const refreshed = new Map();
    const budget = { remaining: PROBE_LIMIT };
    const buckets = Array.from(groups.values());
    for (let round = 0; round < 4 && refreshed.size < maximum * 2 && budget.remaining > 0; round++) {
      for (const bucket of buckets) {
        const candidate = bucket[round];
        if (!candidate || budget.remaining <= 0) continue;
        const anchor = this.findAnchor(candidate, camera, blockers, layout, budget);
        if (anchor) refreshed.set(anchor.part, anchor);
      }
    }
    this.anchors = refreshed;
  }

  createLabel(part) {
    const info = describeStructure(part);
    const color = LAYER_COLORS[part.layer];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'anatomy-label';
    button.style.setProperty('--anatomy-label-color', color);
    button.title = [info.title, info.sideLabel].filter(Boolean).join(' · ');
    button.setAttribute('aria-label', button.title);
    const title = document.createElement('span');
    title.className = 'anatomy-label-name';
    title.textContent = info.title;
    button.append(title);
    if (info.side) {
      const side = document.createElement('span');
      side.className = 'anatomy-label-side';
      side.setAttribute('aria-hidden', 'true');
      side.textContent = info.side === 'left' ? 'L' : 'P';
      button.append(side);
    }
    button.addEventListener('click', () => this.onSelect(part));
    this.root.append(button);

    const leader = svgNode('g', 'anatomy-leader');
    leader.style.setProperty('--anatomy-label-color', color);
    const path = svgNode('path');
    const arrow = svgNode('path', 'anatomy-leader-arrow');
    leader.append(path, arrow);
    this.lines.append(leader);
    const node = { button, leader, path, arrow };
    this.nodes.set(part, node);
    return node;
  }

  render(camera, selection, layout) {
    const { width, height, chipWidth, maximum } = layout;
    const placements = [];
    const anchors = Array.from(this.anchors.values());
    anchors.sort((a, b) => Number(b.part === selection) - Number(a.part === selection));
    const primary = [];
    const mirrored = [];
    const families = new Set();
    for (const anchor of anchors) {
      const family = structureFamily(anchor.part);
      if (families.has(family)) mirrored.push(anchor);
      else {
        primary.push(anchor);
        families.add(family);
      }
    }
    for (const anchor of [...primary, ...mirrored]) {
      if (placements.length >= maximum || degreesOfVisibility(anchor.part) < 0.08) continue;
      const point = this.projectAnchor(anchor, camera, width, height);
      if (!inStage(point, width, height)
        || placements.some(({ point: other }) => Math.hypot(other.x - point.x, other.y - point.y) < 19)) continue;
      const slot = labelSlot(point, this.nodes.get(anchor.part)?.edge, placements, layout);
      if (slot) placements.push({ ...slot, point, part: anchor.part });
    }

    const displayed = new Set(placements.map(({ part }) => part));
    for (const [part, node] of this.nodes) {
      const visible = displayed.has(part);
      node.button.hidden = !visible;
      node.leader.style.display = visible ? '' : 'none';
    }
    for (const placement of placements) this.placeLabel(placement, chipWidth, selection);
  }

  placeLabel({ part, x, y, edge, lineStart, point }, chipWidth, selection) {
    const node = this.nodes.get(part) ?? this.createLabel(part);
    node.edge = edge;
    node.button.style.width = chipWidth + 'px';
    node.button.style.left = x + 'px';
    node.button.style.top = y + 'px';
    node.button.setAttribute('aria-pressed', String(part === selection));
    node.leader.classList.toggle('is-selected', part === selection);

    const elbow = lineStart - edge * Math.min(18, Math.abs(point.x - lineStart) * 0.34);
    const direction = Math.atan2(point.y - y, point.x - elbow);
    const backX = point.x - 7 * Math.cos(direction);
    const backY = point.y - 7 * Math.sin(direction);
    const wingX = Math.sin(direction) * 3;
    const wingY = Math.cos(direction) * 3;
    node.path.setAttribute('d', `M ${lineStart} ${y} H ${elbow} L ${point.x} ${point.y}`);
    node.arrow.setAttribute('d', `M ${backX - wingX} ${backY + wingY} L ${point.x} ${point.y} L ${backX + wingX} ${backY - wingY}`);
  }

  update(camera, parts, selection, time, changed) {
    if (!this.enabled) return;
    if (changed) this.pending = true;
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    if (!width || !height) return;
    const layout = layoutFor(width, height);
    if (this.due(time)) {
      this.resolve(camera, parts, selection, layout);
      this.pending = false;
      this.nextCheck = time + OCCLUSION_INTERVAL;
    }
    this.render(camera, selection, layout);
  }

  dispose() {
    this.root.remove();
    this.nodes.clear();
    this.anchors.clear();
  }
}
