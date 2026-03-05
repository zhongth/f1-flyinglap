import * as THREE from "three";

export interface WheelSpinTarget {
  object: THREE.Object3D;
  axis: THREE.Vector3;
  totalAngle: number;
}

const WHEEL_BASE_ANGULAR_SPEED = Math.PI * 5;

const WHEEL_MATERIAL_PATTERN =
  /(?:tire|tyre|rim|hub[_-]?nut|rtt[_-]?nut|\bnut\b|rubber|slick|pirelli)/i;

const WHEEL_NODE_PATTERN =
  /(?:^|_)(wheel|tyre|tire|rim|hub)(?:[_-])*(lf|rf|lr|rr)(?:[_-]|$)/i;

const WHEEL_SPIN_AXIS = new THREE.Vector3(1, 0, 0);

/** Wrap an object in a pivot positioned at its bounding box center. */
function wrapInPivot(object: THREE.Object3D): THREE.Object3D | null {
  const parent = object.parent;
  if (!parent) return null;

  const bounds = new THREE.Box3().setFromObject(object);
  if (bounds.isEmpty()) return null;

  const center = bounds.getCenter(new THREE.Vector3());
  const pivot = new THREE.Object3D();
  pivot.name = `${object.name || "wheel"}_spin_pivot`;
  pivot.position.copy(parent.worldToLocal(center.clone()));

  parent.add(pivot);
  pivot.attach(object);

  return pivot;
}

/** Find wheels by node name with corner identifiers (lf/rf/lr/rr). */
function collectNamedWheelTargets(model: THREE.Group): WheelSpinTarget[] {
  const byCorner = new Map<string, { obj: THREE.Object3D; score: number }>();

  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.geometry) return;
    const match = child.name.toLowerCase().match(WHEEL_NODE_PATTERN);
    if (!match) return;

    const partType = match[1].toLowerCase();
    const corner = match[2].toLowerCase();
    const score =
      partType === "wheel" ? 4
      : partType === "tyre" || partType === "tire" ? 3
      : partType === "hub" ? 2 : 1;

    const existing = byCorner.get(corner);
    if (!existing || score > existing.score) {
      byCorner.set(corner, { obj: child, score });
    }
  });

  const targets: WheelSpinTarget[] = [];
  for (const corner of ["lf", "rf", "lr", "rr"]) {
    const entry = byCorner.get(corner);
    if (!entry) continue;
    const pivot = wrapInPivot(entry.obj);
    if (pivot) targets.push({ object: pivot, axis: WHEEL_SPIN_AXIS.clone(), totalAngle: 0 });
  }
  return targets;
}

/**
 * Compute the axle direction (minimum-variance axis) of a wheel geometry
 * using PCA on vertex positions.
 */
function computeWheelAxle(posAttr: THREE.BufferAttribute): THREE.Vector3 {
  const n = posAttr.count;
  if (n < 3) return new THREE.Vector3(1, 0, 0);

  let cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < n; i++) {
    cx += posAttr.getX(i);
    cy += posAttr.getY(i);
    cz += posAttr.getZ(i);
  }
  cx /= n; cy /= n; cz /= n;

  let c00 = 0, c01 = 0, c02 = 0, c11 = 0, c12 = 0, c22 = 0;
  for (let i = 0; i < n; i++) {
    const dx = posAttr.getX(i) - cx;
    const dy = posAttr.getY(i) - cy;
    const dz = posAttr.getZ(i) - cz;
    c00 += dx * dx; c01 += dx * dy; c02 += dx * dz;
    c11 += dy * dy; c12 += dy * dz;
    c22 += dz * dz;
  }

  const a = [[c00, c01, c02], [c01, c11, c12], [c02, c12, c22]];
  const v = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

  for (let iter = 0; iter < 20; iter++) {
    let maxVal = 0, p = 0, q = 1;
    for (let i = 0; i < 3; i++)
      for (let j = i + 1; j < 3; j++)
        if (Math.abs(a[i][j]) > maxVal) { maxVal = Math.abs(a[i][j]); p = i; q = j; }
    if (maxVal < 1e-10) break;

    const theta = 0.5 * Math.atan2(2 * a[p][q], a[p][p] - a[q][q]);
    const cos = Math.cos(theta), sin = Math.sin(theta);

    const app = a[p][p], aqq = a[q][q], apq = a[p][q];
    a[p][p] = cos * cos * app + 2 * sin * cos * apq + sin * sin * aqq;
    a[q][q] = sin * sin * app - 2 * sin * cos * apq + cos * cos * aqq;
    a[p][q] = a[q][p] = 0;
    for (let r = 0; r < 3; r++) {
      if (r === p || r === q) continue;
      const arp = a[r][p], arq = a[r][q];
      a[r][p] = a[p][r] = cos * arp + sin * arq;
      a[r][q] = a[q][r] = -sin * arp + cos * arq;
    }
    for (let r = 0; r < 3; r++) {
      const vrp = v[r][p], vrq = v[r][q];
      v[r][p] = cos * vrp + sin * vrq;
      v[r][q] = -sin * vrp + cos * vrq;
    }
  }

  let minIdx = 0;
  if (a[1][1] < a[minIdx][minIdx]) minIdx = 1;
  if (a[2][2] < a[minIdx][minIdx]) minIdx = 2;

  const axle = new THREE.Vector3(v[0][minIdx], v[1][minIdx], v[2][minIdx]).normalize();
  if (axle.x < 0) axle.negate();
  return axle;
}

/** Build a new BufferGeometry from a subset of triangles. */
function buildSubGeometry(
  srcGeo: THREE.BufferGeometry,
  triIndices: number[],
): THREE.BufferGeometry | null {
  if (triIndices.length === 0) return null;

  const uniqueOldIndices: number[] = [];
  const oldToNew = new Map<number, number>();
  for (const oldIdx of triIndices) {
    if (!oldToNew.has(oldIdx)) {
      oldToNew.set(oldIdx, uniqueOldIndices.length);
      uniqueOldIndices.push(oldIdx);
    }
  }

  const vertCount = uniqueOldIndices.length;
  const srcPos = srcGeo.attributes.position;
  const srcNormal = srcGeo.attributes.normal as THREE.BufferAttribute | undefined;
  const srcUV = srcGeo.attributes.uv as THREE.BufferAttribute | undefined;

  const newPos = new Float32Array(vertCount * 3);
  for (let i = 0; i < vertCount; i++) {
    const oldIdx = uniqueOldIndices[i];
    newPos[i * 3] = srcPos.getX(oldIdx);
    newPos[i * 3 + 1] = srcPos.getY(oldIdx);
    newPos[i * 3 + 2] = srcPos.getZ(oldIdx);
  }

  let newNormal: Float32Array | null = null;
  if (srcNormal) {
    newNormal = new Float32Array(vertCount * 3);
    for (let i = 0; i < vertCount; i++) {
      const oldIdx = uniqueOldIndices[i];
      newNormal[i * 3] = srcNormal.getX(oldIdx);
      newNormal[i * 3 + 1] = srcNormal.getY(oldIdx);
      newNormal[i * 3 + 2] = srcNormal.getZ(oldIdx);
    }
  }

  let newUV: Float32Array | null = null;
  if (srcUV) {
    newUV = new Float32Array(vertCount * 2);
    for (let i = 0; i < vertCount; i++) {
      const oldIdx = uniqueOldIndices[i];
      newUV[i * 2] = srcUV.getX(oldIdx);
      newUV[i * 2 + 1] = srcUV.getY(oldIdx);
    }
  }

  const newIndices = new Uint32Array(triIndices.length);
  for (let i = 0; i < triIndices.length; i++) {
    newIndices[i] = oldToNew.get(triIndices[i])!;
  }

  const subGeo = new THREE.BufferGeometry();
  subGeo.setAttribute("position", new THREE.BufferAttribute(newPos, 3));
  if (newNormal) subGeo.setAttribute("normal", new THREE.BufferAttribute(newNormal, 3));
  if (newUV) subGeo.setAttribute("uv", new THREE.BufferAttribute(newUV, 2));
  subGeo.setIndex(new THREE.BufferAttribute(newIndices, 1));
  subGeo.computeBoundingSphere();

  return subGeo;
}

/** Split merged wheel meshes into per-wheel sub-meshes grouped by quadrant. */
function splitAndCreateWheelTargets(
  meshes: THREE.Mesh[],
  modelCenter: THREE.Vector3,
): WheelSpinTarget[] {
  const parent = meshes[0].parent;
  if (!parent) return [];
  parent.updateMatrixWorld(true);

  const parentInverse = new THREE.Matrix4().copy(parent.matrixWorld).invert();
  const localCenter = modelCenter.clone().applyMatrix4(parentInverse);

  const meshToParentMatrices = new Map<THREE.Mesh, THREE.Matrix4>();
  for (const mesh of meshes) {
    mesh.updateMatrixWorld(true);
    const m2p = new THREE.Matrix4().copy(parentInverse).multiply(mesh.matrixWorld);
    meshToParentMatrices.set(mesh, m2p);
  }

  const targets: WheelSpinTarget[] = [];

  for (const mesh of meshes) {
    const meshParent = mesh.parent;
    if (!meshParent) continue;

    const geo = mesh.geometry;
    const posAttr = geo.attributes.position;
    if (!posAttr) continue;

    const m2p = meshToParentMatrices.get(mesh)!;

    const vertexQuadrant = new Array<string>(posAttr.count);
    const vertex = new THREE.Vector3();
    for (let i = 0; i < posAttr.count; i++) {
      vertex.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
      vertex.applyMatrix4(m2p);
      const xSide = vertex.x >= localCenter.x ? "r" : "l";
      const zSide = vertex.z >= localCenter.z ? "f" : "b";
      vertexQuadrant[i] = `${xSide}${zSide}`;
    }

    const index = geo.index;
    const triCount = index ? index.count / 3 : posAttr.count / 3;

    const quadrantTriangles = new Map<string, number[]>();
    for (let t = 0; t < triCount; t++) {
      const i0 = index ? index.getX(t * 3) : t * 3;
      const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1;
      const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;

      const q0 = vertexQuadrant[i0];
      const q1 = vertexQuadrant[i1];
      const q2 = vertexQuadrant[i2];
      const quadrant = q0 === q1 || q0 === q2 ? q0 : q1 === q2 ? q1 : q0;

      let tris = quadrantTriangles.get(quadrant);
      if (!tris) {
        tris = [];
        quadrantTriangles.set(quadrant, tris);
      }
      tris.push(i0, i1, i2);
    }

    for (const [quadrant, triIndices] of quadrantTriangles) {
      const subGeo = buildSubGeometry(geo, triIndices);
      if (!subGeo) continue;

      const posArr = subGeo.attributes.position as THREE.BufferAttribute;
      const normalArr = subGeo.attributes.normal as THREE.BufferAttribute | undefined;
      const v = new THREE.Vector3();

      for (let vi = 0; vi < posArr.count; vi++) {
        v.set(posArr.getX(vi), posArr.getY(vi), posArr.getZ(vi));
        v.applyMatrix4(m2p);
        posArr.setXYZ(vi, v.x, v.y, v.z);
      }

      if (normalArr) {
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(m2p);
        for (let vi = 0; vi < normalArr.count; vi++) {
          v.set(normalArr.getX(vi), normalArr.getY(vi), normalArr.getZ(vi));
          v.applyMatrix3(normalMatrix).normalize();
          normalArr.setXYZ(vi, v.x, v.y, v.z);
        }
      }

      posArr.needsUpdate = true;
      if (normalArr) normalArr.needsUpdate = true;
      subGeo.computeBoundingSphere();

      const spinAxis = computeWheelAxle(posArr);

      const subMesh = new THREE.Mesh(subGeo, mesh.material);
      subMesh.name = `${mesh.name}_${quadrant}`;
      meshParent.add(subMesh);

      const pivot = wrapInPivot(subMesh);
      if (pivot) {
        targets.push({ object: pivot, axis: spinAxis, totalAngle: 0 });
      }
    }

    meshParent.remove(mesh);
    mesh.geometry.dispose();
  }

  return targets;
}

/** Find wheel meshes by material name, splitting merged geometry if needed. */
function collectMaterialWheelTargets(model: THREE.Group): WheelSpinTarget[] {
  const modelBounds = new THREE.Box3().setFromObject(model);
  if (modelBounds.isEmpty()) return [];
  const modelSize = modelBounds.getSize(new THREE.Vector3());
  const modelCenter = modelBounds.getCenter(new THREE.Vector3());

  const wheelMeshes: THREE.Mesh[] = [];
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.material) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    if (mats.some((m) => WHEEL_MATERIAL_PATTERN.test(m.name))) {
      wheelMeshes.push(child);
    }
  });

  if (wheelMeshes.length === 0) return [];

  const firstBounds = new THREE.Box3().setFromObject(wheelMeshes[0]);
  const firstSize = firstBounds.getSize(new THREE.Vector3());
  const isMerged = firstSize.x > modelSize.x * 0.5 || firstSize.z > modelSize.z * 0.5;

  if (!isMerged) {
    const targets: WheelSpinTarget[] = [];
    const seen = new Set<THREE.Object3D>();
    for (const mesh of wheelMeshes) {
      if (seen.has(mesh)) continue;
      seen.add(mesh);
      const pivot = wrapInPivot(mesh);
      if (pivot) targets.push({ object: pivot, axis: WHEEL_SPIN_AXIS.clone(), totalAngle: 0 });
    }
    return targets;
  }

  return splitAndCreateWheelTargets(wheelMeshes, modelCenter);
}

/**
 * Detect wheel meshes and create per-wheel spin targets.
 * Handles both uncompressed models (named nodes) and compressed models.
 */
export function collectWheelSpinTargets(model: THREE.Group): WheelSpinTarget[] {
  const namedTargets = collectNamedWheelTargets(model);
  if (namedTargets.length >= 2) return namedTargets;
  return collectMaterialWheelTargets(model);
}

/** Spin all wheel targets by a given number of radians. */
export function spinWheelTargets(targets: WheelSpinTarget[], spinRadians: number) {
  for (const target of targets) {
    if (!target.object.parent) continue;
    target.totalAngle += spinRadians;
    target.object.quaternion.setFromAxisAngle(target.axis, target.totalAngle);
  }
}

export { WHEEL_BASE_ANGULAR_SPEED };
