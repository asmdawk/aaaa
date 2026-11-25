import { Box3, BufferAttribute, DynamicDrawUsage, MathUtils, Matrix3, Matrix4, Sphere, Vector3 } from './vendor/three.module.js';

const ATLAS_HEIGHT = 1.70953;
const SIDES = ['left', 'right'];
const LIMB_JOINTS = ['shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle'];
const JOINTS = ['stationary', 'neck', ...SIDES.flatMap(side =>
  ['girdle', ...LIMB_JOINTS, 'patella'].map(joint => `${side}:${joint}`)
)];
const JOINT_INDEX = new Map(JOINTS.map((name, index) => [name, index]));
const FRONT = new Vector3(0, 0, 1);
const BACK = new Vector3(0, 0, -1);
const NECK_AXIS = new Vector3(1, 0, 0);
const PROFILE = {
  girdle: [.019, 1.403, .030],
  shoulder: [.168, 1.383, -.025],
  elbow: [.224, 1.103, -.034],
  wrist: [.260, .861, .016],
  hip: [.084, .861, -.004],
  knee: [.078, .434, -.025],
  ankle: [.076, .081, -.039],
  neck: [0, 1.448, -.027],
};

const index = (joint, side) => JOINT_INDEX.get(side ? `${side}:${joint}` : joint);
const between = (value, start, end) => MathUtils.smoothstep(value, start, end);
const descend = (value, low, high) => 1 - between(value, low, high);
const armAxis = (start, finish, direction) => finish.clone().sub(start).cross(direction).normalize();

function transformAround(pivot, axis, angle, output) {
  output.makeRotationAxis(axis, MathUtils.degToRad(angle));
  const elements = output.elements;
  elements[12] = pivot.x - (elements[0] * pivot.x + elements[4] * pivot.y + elements[8] * pivot.z);
  elements[13] = pivot.y - (elements[1] * pivot.x + elements[5] * pivot.y + elements[9] * pivot.z);
  elements[14] = pivot.z - (elements[2] * pivot.x + elements[6] * pivot.y + elements[10] * pivot.z);
  return output;
}

function createLandmarks() {
  const landmarks = { neck: new Vector3(...PROFILE.neck) };
  for (const side of SIDES) {
    const sign = side === 'left' ? 1 : -1;
    const point = joint => new Vector3(sign * PROFILE[joint][0], PROFILE[joint][1], PROFILE[joint][2]);
    const girdle = point('girdle');
    const shoulder = point('shoulder');
    const elbow = point('elbow');
    const wrist = point('wrist');
    const hip = point('hip');
    const knee = point('knee');
    const ankle = point('ankle');
    landmarks[side] = {
      girdle, shoulder, elbow, wrist, hip, knee, ankle, patella: knee,
      girdleAxis: new Vector3(.16, -sign, .62 * sign).normalize(),
      shoulderAxis: armAxis(shoulder, elbow, FRONT),
      elbowAxis: armAxis(elbow, wrist, FRONT),
      wristAxis: armAxis(wrist, new Vector3(sign * .287, .790, .037), FRONT),
      hipAxis: armAxis(hip, knee, FRONT),
      kneeAxis: armAxis(knee, ankle, BACK),
      ankleAxis: new Vector3(-1, 0, 0),
    };
  }
  return landmarks;
}

function identity(out) {
  out[0] = 0; out[1] = 1;
  out[2] = 0; out[3] = 0;
  out[4] = 0; out[5] = 0;
}

function single(out, joint) {
  out[0] = joint; out[1] = 1;
  out[2] = 0; out[3] = 0;
  out[4] = 0; out[5] = 0;
}

function blend(out, first, second, weight) {
  out[0] = first; out[1] = 1 - weight;
  out[2] = second; out[3] = weight;
  out[4] = 0; out[5] = 0;
}

function blendLimb(out, proximal, middle, distal, middleWeight, distalWeight) {
  out[0] = proximal; out[1] = 1 - middleWeight;
  out[2] = middle; out[3] = middleWeight * (1 - distalWeight);
  out[4] = distal; out[5] = middleWeight * distalWeight;
}

function blendAttachment(out, root, girdle, limb, attachment, bend) {
  out[0] = root; out[1] = 1 - attachment;
  out[2] = girdle; out[3] = attachment * (1 - bend);
  out[4] = limb; out[5] = attachment * bend;
}

function skeletalBinding(id, side) {
  if (/humerus/.test(id)) return index('shoulder', side);
  if (/ulna|radius/.test(id)) return index('elbow', side);
  if (/bones-of-.*hand|carpal|metacarpal/.test(id)) return index('wrist', side);
  if (/scapula|clavicle/.test(id)) return index('girdle', side);
  if (/femur/.test(id)) return index('hip', side);
  if (/fibula|tibia/.test(id)) return index('knee', side);
  if (/patella/.test(id)) return index('patella', side);
  if (/bones-of-.*foot|tarsal|calcaneus/.test(id)) return index('ankle', side);
  if (/skull|mandible|teeth|nasal-cartilage/.test(id)) return index('neck');
  return 0;
}

function skinArmInfluence(x, y) {
  const separation = .161 + .043 * descend(y, .90, 1.04) - .010 * between(y, 1.19, 1.42);
  const transition = MathUtils.lerp(.009, .054, between(y, 1.105, 1.370));
  return between(x, separation - transition, separation + transition) * descend(y, 1.411, 1.464);
}

function upperArmWeights(out, y, joints, armWeight, neckWeight = 0) {
  const elbow = descend(y, 1.067, 1.139);
  const wrist = descend(y, .841, .890);
  if (armWeight === 1) {
    blendLimb(out, joints.shoulder, joints.elbow, joints.wrist, elbow, wrist);
  } else if (y > 1.25) {
    const girdle = between(y, 1.25, 1.405);
    const shoulder = armWeight * (1 - .56 * girdle);
    blendAttachment(out, neckWeight > .5 ? index('neck') : 0,
      joints.girdle, joints.shoulder, armWeight, shoulder / (armWeight || 1));
  } else if (wrist > 0) {
    blendAttachment(out, 0, joints.elbow, joints.wrist, armWeight, wrist);
  } else {
    blendAttachment(out, 0, joints.shoulder, joints.elbow, armWeight, elbow);
  }
}

function lowerLegWeights(out, y, joints, centralPelvis = 0) {
  const hip = descend(y, .796, .917) * (1 - centralPelvis);
  const knee = descend(y, .390, .480);
  const ankle = descend(y, .051, .113);
  if (hip < 1) blend(out, 0, joints.hip, hip);
  else blendLimb(out, joints.hip, joints.knee, joints.ankle, knee, ankle);
}

function universalWeights(point, out) {
  const { x, y } = point;
  const radius = Math.abs(x);
  const side = x >= 0 ? 'left' : 'right';
  const joints = SIDE_INDEX[side];
  const neck = between(y, 1.432, 1.545);
  const arm = y > .708 && y < 1.464 ? skinArmInfluence(radius, y) : 0;
  if (arm > .001) {
    upperArmWeights(out, y, joints, arm, neck);
  } else if (neck > 0) {
    blend(out, 0, index('neck'), neck);
  } else if (y < .918) {
    const centralPelvis = between(y, .720, .809) * descend(radius, .014, .061);
    lowerLegWeights(out, y, joints, centralPelvis);
  } else {
    identity(out);
  }
}

const SIDE_INDEX = Object.fromEntries(SIDES.map(side => [side,
  Object.fromEntries(['girdle', ...LIMB_JOINTS, 'patella'].map(joint => [joint, index(joint, side)]))
]));

function bindingFor(part, side) {
  const id = (part.id || part.mesh.name || part.name || '').toLowerCase().replaceAll(/[^a-z0-9]+/g, '-');
  const layer = part.layer || part.system;
  const joints = SIDE_INDEX[side];
  const neck = index('neck');
  const rigid = joint => ({ rigid: joint });
  const soft = (weights, volume) => ({ weights, volume });
  const bridge = (parent, child, amount, volume) => soft((p, out) => blend(out, parent, child, amount(p)), volume);
  const innerShoulder = p => between(Math.abs(p.x), .105, .176);
  const allArm = (p, out) => {
    const attachment = between(Math.abs(p.x), .098, .183);
    upperArmWeights(out, p.y, joints, Math.max(attachment, descend(p.y, 1.142, 1.248)));
  };
  const allLeg = (p, out) => lowerLegWeights(out, p.y, joints);

  if (layer === 'bones' || layer === 'skeletal') {
    if (id.includes('cervical-vertebra')) return bridge(0, neck, p => between(p.y, 1.444, 1.545));
    return rigid(skeletalBinding(id, side));
  }

  if (layer === 'skin' || layer === 'integumentary') return soft(universalWeights);
  if (/upper-limb/.test(id)) return soft(allArm);
  if (/lower-limb/.test(id)) return soft(allLeg);
  if (/brain|cerebr|eye-|pineal|pituitary|salivary|tongue/.test(id)) return rigid(neck);

  if (layer !== 'muscles' && layer !== 'muscular') {
    if (/head-and-neck|cranial-nerv|spinal-cord|trachea|pharynx|larynx|thyroid|esophagus/.test(id)) {
      return bridge(0, neck, p => between(p.y, 1.449, 1.541) * descend(Math.abs(p.x), .080, .132));
    }
    return rigid(0);
  }

  if (/extraocular|facial-muscle|masseter|pterygoid|temporalis/.test(id)) return rigid(neck);
  if (/hyoid|platysma|prevertebral|scalene|suboccipital|splenius|sternocleidomastoid|pharynx|larynx/.test(id)) {
    return bridge(0, neck, p => between(p.y, 1.421, 1.55));
  }

  if (/biceps-brachii/.test(id)) {
    return soft((p, out) => {
      const girdle = between(p.y, 1.318, 1.395);
      const forearm = descend(p.y, 1.060, 1.160);
      blendAttachment(out, joints.girdle, joints.shoulder, joints.elbow, 1 - girdle, forearm);
    }, { joint: 'elbow', side, magnitude: .34, bottom: 1.055, top: 1.4 });
  }
  if (/triceps-brachii|brachialis/.test(id)) {
    return soft((p, out) => {
      const girdle = id.includes('triceps') ? between(p.y, 1.316, 1.365) * .48 : 0;
      const forearm = descend(p.y, 1.090, 1.145);
      blendAttachment(out, joints.girdle, joints.shoulder, joints.elbow, 1 - girdle, forearm);
    }, id.includes('brachialis') ? { joint: 'elbow', side, magnitude: .19, bottom: 1.076, top: 1.262 } : undefined);
  }
  if (/brachioradialis/.test(id)) return bridge(joints.shoulder, joints.elbow, p => descend(p.y, 1.067, 1.150));
  if (/forearm/.test(id)) return soft((p, out) => {
    blendLimb(out, joints.shoulder, joints.elbow, joints.wrist, descend(p.y, 1.083, 1.151), descend(p.y, .829, .900));
  });
  if (/muscles-of-.*hand/.test(id)) return rigid(joints.wrist);

  if (/deltoid|subscapularis|teres-|infraspinatus|supraspinatus|coracobrachialis/.test(id)) {
    return bridge(joints.girdle, joints.shoulder, p => {
      const closeToHumerus = between(Math.abs(p.x), .126, .189);
      const alongHumerus = descend(p.y, 1.282, 1.365) * between(Math.abs(p.x), .108, .171);
      return Math.max(closeToHumerus, alongHumerus);
    });
  }
  if (/pectoralis-major|latissimus/.test(id)) {
    return soft((p, out) => {
      const influence = innerShoulder(p);
      blendAttachment(out, 0, joints.girdle, joints.shoulder, influence, between(influence, .26, .96));
    });
  }
  if (/trapezius|rhomboid|serratus-anterior|levator-scapulae|subclavius|pectoralis-minor/.test(id)) {
    return bridge(0, joints.girdle, p => between(Math.abs(p.x), .032, .137) * between(p.y, 1.268, 1.375));
  }

  if (/quadriceps|sartorius|biceps-femoris|semitendinosus|semimembranosus|gracilis/.test(id)) {
    const quad = id.includes('quadriceps');
    return soft((p, out) => {
      const hip = descend(p.y, .777, .910);
      const knee = descend(p.y, .400, .536);
      blendAttachment(out, 0, joints.hip, quad ? joints.patella : joints.knee, hip, knee);
    }, id.includes('biceps-femoris') ? { joint: 'knee', side, magnitude: .19, bottom: .396, top: .819 } : undefined);
  }
  if (/adductor|iliopsoas|gluteus|deep-rotators|tensor-fasciae/.test(id)) {
    return bridge(0, joints.hip, p => descend(p.y, .793, .947));
  }
  if (/gastrocnemius/.test(id)) return soft((p, out) => {
    blendLimb(out, joints.hip, joints.knee, joints.ankle, descend(p.y, .393, .453), descend(p.y, .062, .161));
  }, { joint: 'ankle', side, magnitude: .13, bottom: .151, top: .431 });
  if (/calcaneal|posterior-muscles-of-.*leg|extensor-muscles-of-.*leg|soleus|tibialis|fibularis/.test(id)) {
    return bridge(joints.knee, joints.ankle, p => descend(p.y, .062, .158));
  }
  if (/muscles-of-.*foot/.test(id)) return rigid(joints.ankle);
  return rigid(0);
}

function packCoordinates(attribute) {
  const output = new Float32Array(attribute.count * 3);
  for (let vertex = 0, offset = 0; vertex < attribute.count; vertex++, offset += 3) {
    output[offset] = attribute.getX(vertex);
    output[offset + 1] = attribute.getY(vertex);
    output[offset + 2] = attribute.getZ(vertex);
  }
  return output;
}

function axisForVolume(volume, points) {
  if (!volume) return null;
  const top = new Vector3();
  const bottom = new Vector3();
  let tops = 0;
  let bottoms = 0;
  const span = volume.top - volume.bottom;
  for (let offset = 0; offset < points.length; offset += 3) {
    const y = points[offset + 1];
    if (y > volume.top - span * .15) {
      top.x += points[offset]; top.y += y; top.z += points[offset + 2]; tops++;
    }
    if (y < volume.bottom + span * .15) {
      bottom.x += points[offset]; bottom.y += y; bottom.z += points[offset + 2]; bottoms++;
    }
  }
  return tops && bottoms ? { top: top.multiplyScalar(1 / tops), bottom: bottom.multiplyScalar(1 / bottoms) } : null;
}

function volumeOffsets(volume, points, inverse, scale) {
  const axis = axisForVolume(volume, points);
  if (!axis) return null;
  const result = new Float32Array(points.length);
  const start = axis.bottom;
  const axisVector = axis.top.clone().sub(start);
  const axisLength = axisVector.lengthSq();
  const point = new Vector3();
  const radial = new Vector3();
  const local = new Matrix3().setFromMatrix4(inverse);
  for (let offset = 0; offset < points.length; offset += 3) {
    point.fromArray(points, offset);
    radial.copy(point).sub(start);
    const along = MathUtils.clamp(radial.dot(axisVector) / axisLength, 0, 1);
    const envelope = Math.sin(Math.PI * along) ** 2 * volume.magnitude * scale;
    radial.addScaledVector(axisVector, -along).multiplyScalar(envelope).applyMatrix3(local);
    radial.toArray(result, offset);
  }
  return result;
}

function makeSoftBinding(mesh, rest, weightsForVertex, volume, scale) {
  const position = mesh.geometry.getAttribute('position');
  const normals = mesh.geometry.getAttribute('normal');
  const restPositions = packCoordinates(position);
  const restNormals = normals ? packCoordinates(normals) : null;
  const count = position.count;
  const skin = new Float32Array(count * 6);
  const modelPoints = volume ? new Float32Array(count * 3) : null;
  const point = new Vector3();
  const used = new Set();
  const mix = new Float32Array(6);
  for (let vertex = 0; vertex < count; vertex++) {
    point.fromArray(restPositions, vertex * 3).applyMatrix4(rest);
    if (modelPoints) point.toArray(modelPoints, vertex * 3);
    point.multiplyScalar(1 / scale);
    weightsForVertex(point, mix);
    for (let weight = 1; weight < 6; weight += 2) {
      if (mix[weight] > 0) used.add(mix[weight - 1]);
    }
    skin.set(mix, vertex * 6);
  }
  if (used.size === 1 && !volume) return { rigid: used.values().next().value };

  const geometry = mesh.geometry.clone();
  const positions = new BufferAttribute(restPositions.slice(), 3).setUsage(DynamicDrawUsage);
  const deformedNormals = restNormals ? new BufferAttribute(restNormals.slice(), 3).setUsage(DynamicDrawUsage) : null;
  geometry.setAttribute('position', positions);
  if (deformedNormals) geometry.setAttribute('normal', deformedNormals);
  geometry.boundingBox = new Box3();
  geometry.boundingSphere = new Sphere();
  mesh.geometry = geometry;
  const inverse = rest.clone().invert();
  return {
    mesh, rest, inverse, restPositions, restNormals, positions, normals: deformedNormals,
    skin, used: [...used],
    transforms: JOINTS.map(() => new Matrix4()),
    normalTransforms: JOINTS.map(() => new Matrix3()),
    volume,
    offsets: modelPoints ? volumeOffsets(volume, modelPoints, inverse, scale) : null,
  };
}

function updateSoft(binding, deltas, amounts) {
  const { mesh, rest, inverse, restPositions, restNormals, positions, normals, skin, used, transforms, normalTransforms, offsets, volume } = binding;
  for (const joint of used) {
    transforms[joint].copy(inverse).multiply(deltas[joint]).multiply(rest);
    normalTransforms[joint].getNormalMatrix(transforms[joint]);
  }
  const angle = volume ? amounts[index(volume.joint, volume.side)] : 0;
  const contraction = Math.sin(MathUtils.degToRad(MathUtils.clamp(angle, 0, 90)));
  const output = positions.array;
  const normalOutput = normals?.array;
  const bounds = mesh.geometry.boundingBox;
  const sphere = mesh.geometry.boundingSphere;
  bounds.min.set(Infinity, Infinity, Infinity);
  bounds.max.set(-Infinity, -Infinity, -Infinity);
  for (let offset = 0, base = 0; offset < output.length; offset += 3, base += 6) {
    let x = restPositions[offset];
    let y = restPositions[offset + 1];
    let z = restPositions[offset + 2];
    if (offsets && contraction) {
      x += offsets[offset] * contraction;
      y += offsets[offset + 1] * contraction;
      z += offsets[offset + 2] * contraction;
    }
    let dx = 0, dy = 0, dz = 0;
    let dnx = 0, dny = 0, dnz = 0;
    for (let influence = base; influence < base + 6; influence += 2) {
      const weight = skin[influence + 1];
      if (weight === 0) continue;
      const joint = skin[influence];
      const t = transforms[joint].elements;
      dx += weight * (t[0] * x + t[4] * y + t[8] * z + t[12]);
      dy += weight * (t[1] * x + t[5] * y + t[9] * z + t[13]);
      dz += weight * (t[2] * x + t[6] * y + t[10] * z + t[14]);
      if (normalOutput) {
        const n = normalTransforms[joint].elements;
        const nx = restNormals[offset], ny = restNormals[offset + 1], nz = restNormals[offset + 2];
        dnx += weight * (n[0] * nx + n[3] * ny + n[6] * nz);
        dny += weight * (n[1] * nx + n[4] * ny + n[7] * nz);
        dnz += weight * (n[2] * nx + n[5] * ny + n[8] * nz);
      }
    }
    output[offset] = dx; output[offset + 1] = dy; output[offset + 2] = dz;
    bounds.min.x = Math.min(bounds.min.x, dx); bounds.max.x = Math.max(bounds.max.x, dx);
    bounds.min.y = Math.min(bounds.min.y, dy); bounds.max.y = Math.max(bounds.max.y, dy);
    bounds.min.z = Math.min(bounds.min.z, dz); bounds.max.z = Math.max(bounds.max.z, dz);
    if (normalOutput) {
      const factor = 1 / (Math.sqrt(dnx * dnx + dny * dny + dnz * dnz) || 1);
      normalOutput[offset] = dnx * factor;
      normalOutput[offset + 1] = dny * factor;
      normalOutput[offset + 2] = dnz * factor;
    }
  }
  bounds.getCenter(sphere.center);
  sphere.radius = sphere.center.distanceTo(bounds.max);
  positions.needsUpdate = true;
  if (normals) normals.needsUpdate = true;
  else mesh.geometry.computeVertexNormals();
}

function updateRigid(binding, deltas) {
  const { mesh, parentInverse, rest, rigid } = binding;
  mesh.matrix.multiplyMatrices(parentInverse, deltas[rigid]).multiply(rest);
  mesh.matrixWorldNeedsUpdate = true;
}

export function createAnatomyRig(model, parts = [], height = ATLAS_HEIGHT) {
  const scale = height / ATLAS_HEIGHT;
  const landmarks = createLandmarks();
  for (const side of SIDES) {
    for (const joint of ['girdle', ...LIMB_JOINTS]) landmarks[side][joint].multiplyScalar(scale);
  }
  landmarks.neck.multiplyScalar(scale);
  const amounts = new Float64Array(JOINTS.length);
  const transforms = JOINTS.map(() => new Matrix4());
  const previous = JOINTS.map(() => new Matrix4());
  const dirty = new Uint8Array(JOINTS.length);
  const rotation = new Matrix4();
  const inverse = new Matrix4();
  const rigid = [];
  const soft = [];
  const registered = new WeakSet();

  function registerParts(newParts) {
    model.updateWorldMatrix(true, true);
    inverse.copy(model.matrixWorld).invert();
    for (const part of newParts) {
      const mesh = part.mesh;
      if (!mesh?.geometry?.hasAttribute('position') || registered.has(mesh)) continue;
      registered.add(mesh);
      const rest = new Matrix4().multiplyMatrices(inverse, mesh.matrixWorld);
      const side = SIDES.includes(part.side) ? part.side : inferSide(part, rest);
      const options = bindingFor(part, side);
      const binding = options.weights ? makeSoftBinding(mesh, rest, options.weights, options.volume, scale) : options;
      if (binding.rigid === 0) continue;
      if (binding.rigid !== undefined) {
        binding.mesh = mesh;
        binding.rest = rest;
        binding.parentInverse = new Matrix4().multiplyMatrices(inverse, mesh.parent.matrixWorld).invert();
        mesh.matrixAutoUpdate = false;
        rigid.push(binding);
        updateRigid(binding, transforms);
      } else {
        soft.push(binding);
        updateSoft(binding, transforms, amounts);
      }
    }
  }

  function update() {
    transformAround(landmarks.neck, NECK_AXIS, amounts[index('neck')], transforms[index('neck')]);
    for (const side of SIDES) {
      const anchor = landmarks[side];
      const joints = SIDE_INDEX[side];
      const shoulder = amounts[joints.shoulder];
      const girdleAngle = Math.max(0, shoulder - 22) * .27 + Math.min(0, shoulder) * .10;
      const girdle = transformAround(anchor.girdle, anchor.girdleAxis, girdleAngle, transforms[joints.girdle]);
      const arm = transforms[joints.shoulder].multiplyMatrices(girdle,
        transformAround(anchor.shoulder, anchor.shoulderAxis, shoulder - girdleAngle * .26, rotation));
      const forearm = transforms[joints.elbow].multiplyMatrices(arm,
        transformAround(anchor.elbow, anchor.elbowAxis, amounts[joints.elbow], rotation));
      transforms[joints.wrist].multiplyMatrices(forearm,
        transformAround(anchor.wrist, anchor.wristAxis, amounts[joints.wrist], rotation));
      const thigh = transformAround(anchor.hip, anchor.hipAxis, amounts[joints.hip], transforms[joints.hip]);
      const calf = transforms[joints.knee].multiplyMatrices(thigh,
        transformAround(anchor.knee, anchor.kneeAxis, amounts[joints.knee], rotation));
      transforms[joints.ankle].multiplyMatrices(calf,
        transformAround(anchor.ankle, anchor.ankleAxis, amounts[joints.ankle], rotation));
      transforms[joints.patella].multiplyMatrices(thigh,
        transformAround(anchor.knee, anchor.kneeAxis, amounts[joints.knee] * .55, rotation));
    }
    for (let joint = 1; joint < JOINTS.length; joint++) {
      dirty[joint] = !transforms[joint].equals(previous[joint]);
      if (dirty[joint]) previous[joint].copy(transforms[joint]);
    }
    for (const binding of rigid) {
      if (dirty[binding.rigid]) updateRigid(binding, transforms);
    }
    for (const binding of soft) {
      if (binding.used.some(joint => dirty[joint]) || binding.volume && dirty[index(binding.volume.joint, binding.volume.side)]) {
        updateSoft(binding, transforms, amounts);
      }
    }
    model.updateWorldMatrix(true, true);
  }

  function setPose(joint, angle, side = 'right') {
    const offset = jointOffset(joint, side);
    if (offset === undefined || offset === 0 || !Number.isFinite(angle) || amounts[offset] === angle) return;
    amounts[offset] = MathUtils.clamp(angle, -180, 180);
    update();
  }

  function getJointPosition(joint, side = 'right') {
    const offset = jointOffset(joint, side);
    const point = joint === 'neck' ? landmarks.neck : landmarks[side]?.[joint];
    if (!point || offset === undefined) return null;
    return model.localToWorld(point.clone().applyMatrix4(transforms[offset]));
  }

  registerParts(parts);
  return {
    setPose,
    getJointPosition,
    registerParts,
    getPose: (joint, side = 'right') => amounts[jointOffset(joint, side)] ?? 0,
    resetPose() {
      amounts.fill(0);
      update();
    },
  };
}

function jointOffset(joint, side) {
  return index(joint, joint === 'neck' ? undefined : side);
}

function inferSide(part, rest) {
  const id = (part.id || part.name || part.mesh.name || '').toLowerCase();
  if (id.includes('left')) return 'left';
  if (id.includes('right')) return 'right';
  const geometry = part.mesh.geometry;
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  const center = geometry.boundingBox.getCenter(new Vector3()).applyMatrix4(rest);
  return center.x >= 0 ? 'left' : 'right';
}
