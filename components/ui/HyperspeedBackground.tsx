"use client";

import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
  SMAAEffect,
  SMAAPreset,
} from "postprocessing";
import { type FC, useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { cloneCachedScene } from "@/lib/modelPreloader";

interface Distortion {
  uniforms: Record<string, { value: any }>;
  getDistortion: string;
  getJS?: (progress: number, time: number) => THREE.Vector3;
}

interface Distortions {
  [key: string]: Distortion;
}

interface Colors {
  roadColor: number;
  islandColor: number;
  background: number;
  shoulderLines: number;
  brokenLines: number;
  leftCars: number[];
  rightCars: number[];
  sticks: number;
}

interface HyperspeedOptions {
  onSpeedUp?: (ev: MouseEvent | TouchEvent) => void;
  onSlowDown?: (ev: MouseEvent | TouchEvent) => void;
  distortion?: string | Distortion;
  carModelPath?: string;
  length: number;
  roadWidth: number;
  islandWidth: number;
  lanesPerRoad: number;
  fov: number;
  fovSpeedUp: number;
  speedUp: number;
  carLightsFade: number;
  totalSideLightSticks: number;
  lightPairsPerRoadWay: number;
  shoulderLinesWidthPercentage: number;
  brokenLinesWidthPercentage: number;
  brokenLinesLengthPercentage: number;
  lightStickWidth: number[];
  lightStickHeight: number[];
  movingAwaySpeed: number[];
  movingCloserSpeed: number[];
  carLightsLength: number[];
  carLightsRadius: number[];
  carWidthPercentage: number[];
  carShiftX: number[];
  carFloorSeparation: number[];
  colors: Colors;
  isHyper?: boolean;
}

export interface HyperspeedProps {
  effectOptions?: Partial<HyperspeedOptions>;
  carModelPath?: string;
  className?: string;
}

const defaultOptions: HyperspeedOptions = {
  onSpeedUp: () => {},
  onSlowDown: () => {},
  distortion: "turbulentDistortion",
  carModelPath: "/3d-model/2026_f1_car.glb",
  length: 400,
  roadWidth: 10,
  islandWidth: 2,
  lanesPerRoad: 4,
  fov: 90,
  fovSpeedUp: 150,
  speedUp: 2,
  carLightsFade: 0.4,
  totalSideLightSticks: 20,
  lightPairsPerRoadWay: 40,
  shoulderLinesWidthPercentage: 0.05,
  brokenLinesWidthPercentage: 0.1,
  brokenLinesLengthPercentage: 0.5,
  lightStickWidth: [0.12, 0.5],
  lightStickHeight: [1.3, 1.7],
  movingAwaySpeed: [60, 80],
  movingCloserSpeed: [-120, -160],
  carLightsLength: [400 * 0.03, 400 * 0.2],
  carLightsRadius: [0.05, 0.14],
  carWidthPercentage: [0.3, 0.5],
  carShiftX: [-0.8, 0.8],
  carFloorSeparation: [0, 5],
  colors: {
    roadColor: 0x080808,
    islandColor: 0x0a0a0a,
    background: 0x000000,
    shoulderLines: 0xffffff,
    brokenLines: 0xffffff,
    leftCars: [0xd856bf, 0x6750a2, 0xc247ac],
    rightCars: [0x03b3c3, 0x0e5ea5, 0x324555],
    sticks: 0x03b3c3,
  },
};

interface ModelMaterialState {
  material: THREE.Material;
  baseOpacity: number;
  baseTransparent: boolean;
  baseDepthWrite: boolean;
}

interface ModelTransitionState {
  outgoing: THREE.Group | null;
  incoming: THREE.Group;
  outgoingMaterials: ModelMaterialState[];
  incomingMaterials: ModelMaterialState[];
  startedAt: number;
  durationMs: number;
}

interface WheelSpinTarget {
  object: THREE.Object3D;
  axis: THREE.Vector3;
  totalAngle: number;
}

const CAR_SURFACE_MATTE_CONFIG = {
  body: {
    roughnessMin: 0.46,
    metalnessMax: 0.45,
    envMapIntensityMax: 0.95,
    clearcoatMax: 0.32,
    clearcoatRoughnessMin: 0.32,
    specularIntensityMax: 0.9,
  },
  glass: {
    roughnessMin: 0.18,
    metalnessMax: 0.55,
    envMapIntensityMax: 1.05,
    clearcoatMax: 0.7,
    clearcoatRoughnessMin: 0.16,
    specularIntensityMax: 1,
  },
} as const;

const MODEL_SWAP_DURATION_MS = 1280;
const MODEL_SWAP_OUT_PHASE_END = 0.58;
const MODEL_SWAP_IN_PHASE_START = 0.72;
const MODEL_SWAP_OUT_END_DEPTH = -2.05;
const MODEL_SWAP_OUT_END_SCALE = 0.76;
const MODEL_SWAP_OUT_END_OPACITY = 0.24;
const MODEL_SWAP_IN_START_DEPTH = -2.35;
const MODEL_SWAP_IN_START_SCALE = 0.68;
const WHEEL_BASE_ANGULAR_SPEED = Math.PI * 5;

/** Matches material names that indicate wheel components (tires, rims, hubs/nuts). */
const WHEEL_MATERIAL_PATTERN =
  /(?:tire|tyre|rim|hub[_-]?nut|rtt[_-]?nut|\bnut\b|rubber|slick|pirelli)/i;

/** Matches node names with explicit corner identifiers (uncompressed models). */
const WHEEL_NODE_PATTERN =
  /(?:^|_)(wheel|tyre|tire|rim|hub)(?:[_-])*(lf|rf|lr|rr)(?:[_-]|$)/i;

const WHEEL_SPIN_AXIS = new THREE.Vector3(1, 0, 0);

function isLikelyGlassOrTrim(name: string): boolean {
  return /glass|window|windscreen|windshield|visor|mirror|chrome|light|lamp|led/i.test(
    name,
  );
}

function nsin(val: number) {
  return Math.sin(val) * 0.5 + 0.5;
}

const mountainUniforms = {
  uFreq: { value: new THREE.Vector3(3, 6, 10) },
  uAmp: { value: new THREE.Vector3(30, 30, 20) },
};

const xyUniforms = {
  uFreq: { value: new THREE.Vector2(5, 2) },
  // Keep stronger lateral sway, with minimal vertical bob.
  uAmp: { value: new THREE.Vector2(20, 1.2) },
};

const LongRaceUniforms = {
  uFreq: { value: new THREE.Vector2(2, 3) },
  uAmp: { value: new THREE.Vector2(35, 10) },
};

const turbulentUniforms = {
  uFreq: { value: new THREE.Vector4(4, 8, 8, 1) },
  uAmp: { value: new THREE.Vector4(25, 5, 10, 10) },
};

const deepUniforms = {
  uFreq: { value: new THREE.Vector2(4, 8) },
  uAmp: { value: new THREE.Vector2(10, 20) },
  uPowY: { value: new THREE.Vector2(20, 2) },
};

const distortions: Distortions = {
  mountainDistortion: {
    uniforms: mountainUniforms,
    getDistortion: `
      uniform vec3 uAmp;
      uniform vec3 uFreq;
      #define PI 3.14159265358979
      float nsin(float val){
        return sin(val) * 0.5 + 0.5;
      }
      vec3 getDistortion(float progress){
        float movementProgressFix = 0.02;
        return vec3( 
          cos(progress * PI * uFreq.x + uTime) * uAmp.x - cos(movementProgressFix * PI * uFreq.x + uTime) * uAmp.x,
          nsin(progress * PI * uFreq.y + uTime) * uAmp.y - nsin(movementProgressFix * PI * uFreq.y + uTime) * uAmp.y,
          nsin(progress * PI * uFreq.z + uTime) * uAmp.z - nsin(movementProgressFix * PI * uFreq.z + uTime) * uAmp.z
        );
      }
    `,
    getJS: (progress: number, time: number) => {
      const movementProgressFix = 0.02;
      const uFreq = mountainUniforms.uFreq.value;
      const uAmp = mountainUniforms.uAmp.value;
      const distortion = new THREE.Vector3(
        Math.cos(progress * Math.PI * uFreq.x + time) * uAmp.x -
          Math.cos(movementProgressFix * Math.PI * uFreq.x + time) * uAmp.x,
        nsin(progress * Math.PI * uFreq.y + time) * uAmp.y -
          nsin(movementProgressFix * Math.PI * uFreq.y + time) * uAmp.y,
        nsin(progress * Math.PI * uFreq.z + time) * uAmp.z -
          nsin(movementProgressFix * Math.PI * uFreq.z + time) * uAmp.z,
      );
      const lookAtAmp = new THREE.Vector3(2, 2, 2);
      const lookAtOffset = new THREE.Vector3(0, 0, -5);
      return distortion.multiply(lookAtAmp).add(lookAtOffset);
    },
  },
  xyDistortion: {
    uniforms: xyUniforms,
    getDistortion: `
      uniform vec2 uFreq;
      uniform vec2 uAmp;
      #define PI 3.14159265358979
      vec3 getDistortion(float progress){
        float movementProgressFix = 0.02;
        return vec3( 
          cos(progress * PI * uFreq.x + uTime) * uAmp.x - cos(movementProgressFix * PI * uFreq.x + uTime) * uAmp.x,
          sin(progress * PI * uFreq.y + PI/2. + uTime) * uAmp.y - sin(movementProgressFix * PI * uFreq.y + PI/2. + uTime) * uAmp.y,
          0.
        );
      }
    `,
    getJS: (progress: number, time: number) => {
      const movementProgressFix = 0.02;
      const uFreq = xyUniforms.uFreq.value;
      const uAmp = xyUniforms.uAmp.value;
      const distortion = new THREE.Vector3(
        Math.cos(progress * Math.PI * uFreq.x + time) * uAmp.x -
          Math.cos(movementProgressFix * Math.PI * uFreq.x + time) * uAmp.x,
        Math.sin(progress * Math.PI * uFreq.y + time + Math.PI / 2) * uAmp.y -
          Math.sin(
            movementProgressFix * Math.PI * uFreq.y + time + Math.PI / 2,
          ) *
            uAmp.y,
        0,
      );
      const lookAtAmp = new THREE.Vector3(2, 0.05, 1);
      const lookAtOffset = new THREE.Vector3(0, 0, -3);
      return distortion.multiply(lookAtAmp).add(lookAtOffset);
    },
  },
  LongRaceDistortion: {
    uniforms: LongRaceUniforms,
    getDistortion: `
      uniform vec2 uFreq;
      uniform vec2 uAmp;
      #define PI 3.14159265358979
      vec3 getDistortion(float progress){
        float camProgress = 0.0125;
        return vec3( 
          sin(progress * PI * uFreq.x + uTime) * uAmp.x - sin(camProgress * PI * uFreq.x + uTime) * uAmp.x,
          sin(progress * PI * uFreq.y + uTime) * uAmp.y - sin(camProgress * PI * uFreq.y + uTime) * uAmp.y,
          0.
        );
      }
    `,
    getJS: (progress: number, time: number) => {
      const camProgress = 0.0125;
      const uFreq = LongRaceUniforms.uFreq.value;
      const uAmp = LongRaceUniforms.uAmp.value;
      const distortion = new THREE.Vector3(
        Math.sin(progress * Math.PI * uFreq.x + time) * uAmp.x -
          Math.sin(camProgress * Math.PI * uFreq.x + time) * uAmp.x,
        Math.sin(progress * Math.PI * uFreq.y + time) * uAmp.y -
          Math.sin(camProgress * Math.PI * uFreq.y + time) * uAmp.y,
        0,
      );
      const lookAtAmp = new THREE.Vector3(1, 1, 0);
      const lookAtOffset = new THREE.Vector3(0, 0, -5);
      return distortion.multiply(lookAtAmp).add(lookAtOffset);
    },
  },
  turbulentDistortion: {
    uniforms: turbulentUniforms,
    getDistortion: `
      uniform vec4 uFreq;
      uniform vec4 uAmp;
      float nsin(float val){
        return sin(val) * 0.5 + 0.5;
      }
      #define PI 3.14159265358979
      float getDistortionX(float progress){
        return (
          cos(PI * progress * uFreq.r + uTime) * uAmp.r +
          pow(cos(PI * progress * uFreq.g + uTime * (uFreq.g / uFreq.r)), 2. ) * uAmp.g
        );
      }
      float getDistortionY(float progress){
        return (
          -nsin(PI * progress * uFreq.b + uTime) * uAmp.b +
          -pow(nsin(PI * progress * uFreq.a + uTime / (uFreq.b / uFreq.a)), 5.) * uAmp.a
        );
      }
      vec3 getDistortion(float progress){
        return vec3(
          getDistortionX(progress) - getDistortionX(0.0125),
          getDistortionY(progress) - getDistortionY(0.0125),
          0.
        );
      }
    `,
    getJS: (progress: number, time: number) => {
      const uFreq = turbulentUniforms.uFreq.value;
      const uAmp = turbulentUniforms.uAmp.value;

      const getX = (p: number) =>
        Math.cos(Math.PI * p * uFreq.x + time) * uAmp.x +
        Math.cos(Math.PI * p * uFreq.y + time * (uFreq.y / uFreq.x)) ** 2 *
          uAmp.y;

      const getY = (p: number) =>
        -nsin(Math.PI * p * uFreq.z + time) * uAmp.z -
        nsin(Math.PI * p * uFreq.w + time / (uFreq.z / uFreq.w)) ** 5 * uAmp.w;

      const distortion = new THREE.Vector3(
        getX(progress) - getX(progress + 0.007),
        getY(progress) - getY(progress + 0.007),
        0,
      );
      const lookAtAmp = new THREE.Vector3(-2, -5, 0);
      const lookAtOffset = new THREE.Vector3(0, 0, -10);
      return distortion.multiply(lookAtAmp).add(lookAtOffset);
    },
  },
  turbulentDistortionStill: {
    uniforms: turbulentUniforms,
    getDistortion: `
      uniform vec4 uFreq;
      uniform vec4 uAmp;
      float nsin(float val){
        return sin(val) * 0.5 + 0.5;
      }
      #define PI 3.14159265358979
      float getDistortionX(float progress){
        return (
          cos(PI * progress * uFreq.r) * uAmp.r +
          pow(cos(PI * progress * uFreq.g * (uFreq.g / uFreq.r)), 2. ) * uAmp.g
        );
      }
      float getDistortionY(float progress){
        return (
          -nsin(PI * progress * uFreq.b) * uAmp.b +
          -pow(nsin(PI * progress * uFreq.a / (uFreq.b / uFreq.a)), 5.) * uAmp.a
        );
      }
      vec3 getDistortion(float progress){
        return vec3(
          getDistortionX(progress) - getDistortionX(0.02),
          getDistortionY(progress) - getDistortionY(0.02),
          0.
        );
      }
    `,
  },
  deepDistortionStill: {
    uniforms: deepUniforms,
    getDistortion: `
      uniform vec4 uFreq;
      uniform vec4 uAmp;
      uniform vec2 uPowY;
      float nsin(float val){
        return sin(val) * 0.5 + 0.5;
      }
      #define PI 3.14159265358979
      float getDistortionX(float progress){
        return (
          sin(progress * PI * uFreq.x) * uAmp.x * 2.
        );
      }
      float getDistortionY(float progress){
        return (
          pow(abs(progress * uPowY.x), uPowY.y) + sin(progress * PI * uFreq.y) * uAmp.y
        );
      }
      vec3 getDistortion(float progress){
        return vec3(
          getDistortionX(progress) - getDistortionX(0.02),
          getDistortionY(progress) - getDistortionY(0.05),
          0.
        );
      }
    `,
  },
  deepDistortion: {
    uniforms: deepUniforms,
    getDistortion: `
      uniform vec4 uFreq;
      uniform vec4 uAmp;
      uniform vec2 uPowY;
      float nsin(float val){
        return sin(val) * 0.5 + 0.5;
      }
      #define PI 3.14159265358979
      float getDistortionX(float progress){
        return (
          sin(progress * PI * uFreq.x + uTime) * uAmp.x
        );
      }
      float getDistortionY(float progress){
        return (
          pow(abs(progress * uPowY.x), uPowY.y) + sin(progress * PI * uFreq.y + uTime) * uAmp.y
        );
      }
      vec3 getDistortion(float progress){
        return vec3(
          getDistortionX(progress) - getDistortionX(0.02),
          getDistortionY(progress) - getDistortionY(0.02),
          0.
        );
      }
    `,
    getJS: (progress: number, time: number) => {
      const uFreq = deepUniforms.uFreq.value;
      const uAmp = deepUniforms.uAmp.value;
      const uPowY = deepUniforms.uPowY.value;

      const getX = (p: number) =>
        Math.sin(p * Math.PI * uFreq.x + time) * uAmp.x;
      const getY = (p: number) =>
        (p * uPowY.x) ** uPowY.y +
        Math.sin(p * Math.PI * uFreq.y + time) * uAmp.y;

      const distortion = new THREE.Vector3(
        getX(progress) - getX(progress + 0.01),
        getY(progress) - getY(progress + 0.01),
        0,
      );
      const lookAtAmp = new THREE.Vector3(-2, -4, 0);
      const lookAtOffset = new THREE.Vector3(0, 0, -10);
      return distortion.multiply(lookAtAmp).add(lookAtOffset);
    },
  },
};

const distortion_uniforms = {
  uDistortionX: { value: new THREE.Vector2(80, 3) },
  uDistortionY: { value: new THREE.Vector2(-40, 2.5) },
};

const distortion_vertex = `
  #define PI 3.14159265358979
  uniform vec2 uDistortionX;
  uniform vec2 uDistortionY;
  float nsin(float val){
    return sin(val) * 0.5 + 0.5;
  }
  vec3 getDistortion(float progress){
    progress = clamp(progress, 0., 1.);
    float xAmp = uDistortionX.r;
    float xFreq = uDistortionX.g;
    float yAmp = uDistortionY.r;
    float yFreq = uDistortionY.g;
    return vec3( 
      xAmp * nsin(progress * PI * xFreq - PI / 2.),
      yAmp * nsin(progress * PI * yFreq - PI / 2.),
      0.
    );
  }
`;

function random(base: number | number[]): number {
  if (Array.isArray(base)) {
    return Math.random() * (base[1] - base[0]) + base[0];
  }
  return Math.random() * base;
}

function pickRandom<T>(arr: T | T[]): T {
  if (Array.isArray(arr)) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  return arr;
}

function lerp(
  current: number,
  target: number,
  speed = 0.1,
  limit = 0.001,
): number {
  let change = (target - current) * speed;
  if (Math.abs(change) < limit) {
    change = target - current;
  }
  return change;
}

class CarLights {
  webgl: App;
  options: HyperspeedOptions;
  colors: number[] | THREE.Color;
  speed: number[];
  fade: THREE.Vector2;
  mesh!: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>;

  constructor(
    webgl: App,
    options: HyperspeedOptions,
    colors: number[] | THREE.Color,
    speed: number[],
    fade: THREE.Vector2,
  ) {
    this.webgl = webgl;
    this.options = options;
    this.colors = colors;
    this.speed = speed;
    this.fade = fade;
  }

  init() {
    const options = this.options;
    const curve = new THREE.LineCurve3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    );
    const geometry = new THREE.TubeGeometry(curve, 40, 1, 8, false);

    const instanced = new THREE.InstancedBufferGeometry().copy(
      geometry as any,
    ) as THREE.InstancedBufferGeometry;
    instanced.instanceCount = options.lightPairsPerRoadWay * 2;

    const laneWidth = options.roadWidth / options.lanesPerRoad;

    const aOffset: number[] = [];
    const aMetrics: number[] = [];
    const aColor: number[] = [];

    let colorArray: THREE.Color[];
    if (Array.isArray(this.colors)) {
      colorArray = this.colors.map((c) => new THREE.Color(c));
    } else {
      colorArray = [new THREE.Color(this.colors)];
    }

    for (let i = 0; i < options.lightPairsPerRoadWay; i++) {
      const radius = random(options.carLightsRadius);
      const length = random(options.carLightsLength);
      const spd = random(this.speed);

      const carLane = i % options.lanesPerRoad;
      let laneX = carLane * laneWidth - options.roadWidth / 2 + laneWidth / 2;

      const carWidth = random(options.carWidthPercentage) * laneWidth;
      const carShiftX = random(options.carShiftX) * laneWidth;
      laneX += carShiftX;

      const offsetY = random(options.carFloorSeparation) + radius * 1.3;
      const offsetZ = -random(options.length);

      aOffset.push(laneX - carWidth / 2);
      aOffset.push(offsetY);
      aOffset.push(offsetZ);

      aOffset.push(laneX + carWidth / 2);
      aOffset.push(offsetY);
      aOffset.push(offsetZ);

      aMetrics.push(radius);
      aMetrics.push(length);
      aMetrics.push(spd);

      aMetrics.push(radius);
      aMetrics.push(length);
      aMetrics.push(spd);

      const color = pickRandom<THREE.Color>(colorArray);
      aColor.push(color.r);
      aColor.push(color.g);
      aColor.push(color.b);

      aColor.push(color.r);
      aColor.push(color.g);
      aColor.push(color.b);
    }

    instanced.setAttribute(
      "aOffset",
      new THREE.InstancedBufferAttribute(new Float32Array(aOffset), 3, false),
    );
    instanced.setAttribute(
      "aMetrics",
      new THREE.InstancedBufferAttribute(new Float32Array(aMetrics), 3, false),
    );
    instanced.setAttribute(
      "aColor",
      new THREE.InstancedBufferAttribute(new Float32Array(aColor), 3, false),
    );

    const material = new THREE.ShaderMaterial({
      fragmentShader: carLightsFragment,
      vertexShader: carLightsVertex,
      transparent: true,
      uniforms: Object.assign(
        {
          uTime: { value: 0 },
          uTravelLength: { value: options.length },
          uFade: { value: this.fade },
        },
        this.webgl.fogUniforms,
        (typeof this.options.distortion === "object"
          ? this.options.distortion.uniforms
          : {}) || {},
      ),
    });

    material.onBeforeCompile = (shader: any) => {
      shader.vertexShader = shader.vertexShader.replace(
        "#include <getDistortion_vertex>",
        typeof this.options.distortion === "object"
          ? this.options.distortion.getDistortion
          : "",
      );
    };

    const mesh = new THREE.Mesh(instanced, material);
    mesh.frustumCulled = false;
    this.webgl.scene.add(mesh);
    this.mesh = mesh;
  }

  update(time: number) {
    if (this.mesh.material.uniforms.uTime) {
      this.mesh.material.uniforms.uTime.value = time;
    }
  }
}

const carLightsFragment = `
  #define USE_FOG;
  ${THREE.ShaderChunk["fog_pars_fragment"]}
  varying vec3 vColor;
  varying vec2 vUv; 
  uniform vec2 uFade;
  void main() {
    vec3 color = vec3(vColor);
    float alpha = smoothstep(uFade.x, uFade.y, vUv.x);
    gl_FragColor = vec4(color, alpha);
    if (gl_FragColor.a < 0.0001) discard;
    ${THREE.ShaderChunk["fog_fragment"]}
  }
`;

const carLightsVertex = `
  #define USE_FOG;
  ${THREE.ShaderChunk["fog_pars_vertex"]}
  attribute vec3 aOffset;
  attribute vec3 aMetrics;
  attribute vec3 aColor;
  uniform float uTravelLength;
  uniform float uTime;
  varying vec2 vUv; 
  varying vec3 vColor; 
  #include <getDistortion_vertex>
  void main() {
    vec3 transformed = position.xyz;
    float radius = aMetrics.r;
    float myLength = aMetrics.g;
    float speed = aMetrics.b;

    transformed.xy *= radius;
    transformed.z *= myLength;

    transformed.z += myLength - mod(uTime * speed + aOffset.z, uTravelLength);
    transformed.xy += aOffset.xy;

    float progress = abs(transformed.z / uTravelLength);
    transformed.xyz += getDistortion(progress);

    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.);
    gl_Position = projectionMatrix * mvPosition;
    vUv = uv;
    vColor = aColor;
    ${THREE.ShaderChunk["fog_vertex"]}
  }
`;

class LightsSticks {
  webgl: App;
  options: HyperspeedOptions;
  mesh!: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>;

  constructor(webgl: App, options: HyperspeedOptions) {
    this.webgl = webgl;
    this.options = options;
  }

  init() {
    const options = this.options;
    const geometry = new THREE.PlaneGeometry(1, 1);
    const instanced = new THREE.InstancedBufferGeometry().copy(
      geometry as any,
    ) as THREE.InstancedBufferGeometry;
    const totalSticks = options.totalSideLightSticks;
    instanced.instanceCount = totalSticks;

    const stickoffset = options.length / (totalSticks - 1);
    const aOffset: number[] = [];
    const aColor: number[] = [];
    const aMetrics: number[] = [];

    let colorArray: THREE.Color[];
    if (Array.isArray(options.colors.sticks)) {
      colorArray = options.colors.sticks.map((c) => new THREE.Color(c));
    } else {
      colorArray = [new THREE.Color(options.colors.sticks)];
    }

    for (let i = 0; i < totalSticks; i++) {
      const width = random(options.lightStickWidth);
      const height = random(options.lightStickHeight);
      aOffset.push((i - 1) * stickoffset * 2 + stickoffset * Math.random());

      const color = pickRandom<THREE.Color>(colorArray);
      aColor.push(color.r);
      aColor.push(color.g);
      aColor.push(color.b);

      aMetrics.push(width);
      aMetrics.push(height);
    }

    instanced.setAttribute(
      "aOffset",
      new THREE.InstancedBufferAttribute(new Float32Array(aOffset), 1, false),
    );
    instanced.setAttribute(
      "aColor",
      new THREE.InstancedBufferAttribute(new Float32Array(aColor), 3, false),
    );
    instanced.setAttribute(
      "aMetrics",
      new THREE.InstancedBufferAttribute(new Float32Array(aMetrics), 2, false),
    );

    const material = new THREE.ShaderMaterial({
      fragmentShader: sideSticksFragment,
      vertexShader: sideSticksVertex,
      side: THREE.DoubleSide,
      uniforms: Object.assign(
        {
          uTravelLength: { value: options.length },
          uTime: { value: 0 },
        },
        this.webgl.fogUniforms,
        (typeof options.distortion === "object"
          ? options.distortion.uniforms
          : {}) || {},
      ),
    });

    material.onBeforeCompile = (shader: any) => {
      shader.vertexShader = shader.vertexShader.replace(
        "#include <getDistortion_vertex>",
        typeof this.options.distortion === "object"
          ? this.options.distortion.getDistortion
          : "",
      );
    };

    const mesh = new THREE.Mesh(instanced, material);
    mesh.frustumCulled = false;
    this.webgl.scene.add(mesh);
    this.mesh = mesh;
  }

  update(time: number) {
    if (this.mesh.material.uniforms.uTime) {
      this.mesh.material.uniforms.uTime.value = time;
    }
  }
}

const sideSticksVertex = `
  #define USE_FOG;
  ${THREE.ShaderChunk["fog_pars_vertex"]}
  attribute float aOffset;
  attribute vec3 aColor;
  attribute vec2 aMetrics;
  uniform float uTravelLength;
  uniform float uTime;
  varying vec3 vColor;
  mat4 rotationY( in float angle ) {
    return mat4(
      cos(angle),		0,		sin(angle),	0,
      0,		        1.0,	0,			0,
      -sin(angle),	    0,		cos(angle),	0,
      0, 		        0,		0,			1
    );
  }
  #include <getDistortion_vertex>
  void main(){
    vec3 transformed = position.xyz;
    float width = aMetrics.x;
    float height = aMetrics.y;

    transformed.xy *= vec2(width, height);
    float time = mod(uTime * 60. * 2. + aOffset, uTravelLength);

    transformed = (rotationY(3.14/2.) * vec4(transformed,1.)).xyz;
    transformed.z += - uTravelLength + time;

    float progress = abs(transformed.z / uTravelLength);
    transformed.xyz += getDistortion(progress);

    transformed.y += height / 2.;
    transformed.x += -width / 2.;
    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.);
    gl_Position = projectionMatrix * mvPosition;
    vColor = aColor;
    ${THREE.ShaderChunk["fog_vertex"]}
  }
`;

const sideSticksFragment = `
  #define USE_FOG;
  ${THREE.ShaderChunk["fog_pars_fragment"]}
  varying vec3 vColor;
  void main(){
    vec3 color = vec3(vColor);
    gl_FragColor = vec4(color,1.);
    ${THREE.ShaderChunk["fog_fragment"]}
  }
`;

class Road {
  webgl: App;
  options: HyperspeedOptions;
  uTime: { value: number };
  leftRoadWay!: THREE.Mesh;
  rightRoadWay!: THREE.Mesh;
  island!: THREE.Mesh;

  constructor(webgl: App, options: HyperspeedOptions) {
    this.webgl = webgl;
    this.options = options;
    this.uTime = { value: 0 };
  }

  createPlane(side: number, width: number, isRoad: boolean) {
    const options = this.options;
    const segments = 100;
    const geometry = new THREE.PlaneGeometry(
      isRoad ? options.roadWidth : options.islandWidth,
      options.length,
      20,
      segments,
    );

    let uniforms: Record<string, { value: any }> = {
      uTravelLength: { value: options.length },
      uColor: {
        value: new THREE.Color(
          isRoad ? options.colors.roadColor : options.colors.islandColor,
        ),
      },
      uTime: this.uTime,
    };

    if (isRoad) {
      uniforms = Object.assign(uniforms, {
        uLanes: { value: options.lanesPerRoad },
        uBrokenLinesColor: {
          value: new THREE.Color(options.colors.brokenLines),
        },
        uShoulderLinesColor: {
          value: new THREE.Color(options.colors.shoulderLines),
        },
        uShoulderLinesWidthPercentage: {
          value: options.shoulderLinesWidthPercentage,
        },
        uBrokenLinesLengthPercentage: {
          value: options.brokenLinesLengthPercentage,
        },
        uBrokenLinesWidthPercentage: {
          value: options.brokenLinesWidthPercentage,
        },
      });
    }

    const material = new THREE.ShaderMaterial({
      fragmentShader: isRoad ? roadFragment : islandFragment,
      vertexShader: roadVertex,
      side: THREE.DoubleSide,
      uniforms: Object.assign(
        uniforms,
        this.webgl.fogUniforms,
        (typeof options.distortion === "object"
          ? options.distortion.uniforms
          : {}) || {},
      ),
    });

    material.onBeforeCompile = (shader: any) => {
      shader.vertexShader = shader.vertexShader.replace(
        "#include <getDistortion_vertex>",
        typeof this.options.distortion === "object"
          ? this.options.distortion.getDistortion
          : "",
      );
    };

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.z = -options.length / 2;
    mesh.position.x +=
      (this.options.islandWidth / 2 + options.roadWidth / 2) * side;

    this.webgl.scene.add(mesh);
    return mesh;
  }

  init() {
    this.leftRoadWay = this.createPlane(-1, this.options.roadWidth, true);
    this.rightRoadWay = this.createPlane(1, this.options.roadWidth, true);
    this.island = this.createPlane(0, this.options.islandWidth, false);
  }

  update(time: number) {
    this.uTime.value = time;
  }
}

const roadBaseFragment = `
  #define USE_FOG;
  varying vec2 vUv; 
  uniform vec3 uColor;
  uniform float uTime;
  #include <roadMarkings_vars>
  ${THREE.ShaderChunk["fog_pars_fragment"]}
  void main() {
    vec2 uv = vUv;
    vec3 color = vec3(uColor);
    #include <roadMarkings_fragment>
    gl_FragColor = vec4(color, 1.);
    ${THREE.ShaderChunk["fog_fragment"]}
  }
`;

const islandFragment = roadBaseFragment
  .replace("#include <roadMarkings_fragment>", "")
  .replace("#include <roadMarkings_vars>", "");

const roadMarkings_vars = `
  uniform float uLanes;
  uniform vec3 uBrokenLinesColor;
  uniform vec3 uShoulderLinesColor;
  uniform float uShoulderLinesWidthPercentage;
  uniform float uBrokenLinesWidthPercentage;
  uniform float uBrokenLinesLengthPercentage;
  highp float random(vec2 co) {
    highp float a = 12.9898;
    highp float b = 78.233;
    highp float c = 43758.5453;
    highp float dt = dot(co.xy, vec2(a, b));
    highp float sn = mod(dt, 3.14);
    return fract(sin(sn) * c);
  }
`;

const roadMarkings_fragment = `
  uv.y = mod(uv.y + uTime * 0.05, 1.);
  float laneWidth = 1.0 / uLanes;
  float brokenLineWidth = laneWidth * uBrokenLinesWidthPercentage;
  float laneEmptySpace = 1. - uBrokenLinesLengthPercentage;

  float brokenLines = step(1.0 - brokenLineWidth, fract(uv.x * 2.0)) * step(laneEmptySpace, fract(uv.y * 10.0));
  float sideLines = step(1.0 - brokenLineWidth, fract((uv.x - laneWidth * (uLanes - 1.0)) * 2.0)) + step(brokenLineWidth, uv.x);

  brokenLines = mix(brokenLines, sideLines, uv.x);
`;

const roadFragment = roadBaseFragment
  .replace("#include <roadMarkings_fragment>", roadMarkings_fragment)
  .replace("#include <roadMarkings_vars>", roadMarkings_vars);

const roadVertex = `
  #define USE_FOG;
  uniform float uTime;
  ${THREE.ShaderChunk["fog_pars_vertex"]}
  uniform float uTravelLength;
  varying vec2 vUv; 
  #include <getDistortion_vertex>
  void main() {
    vec3 transformed = position.xyz;
    vec3 distortion = getDistortion((transformed.y + uTravelLength / 2.) / uTravelLength);
    transformed.x += distortion.x;
    transformed.z += distortion.y;
    transformed.y += -1. * distortion.z;  
    
    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.);
    gl_Position = projectionMatrix * mvPosition;
    vUv = uv;
    ${THREE.ShaderChunk["fog_vertex"]}
  }
`;

function resizeRendererToDisplaySize(
  renderer: THREE.WebGLRenderer,
  setSize: (width: number, height: number, updateStyle: boolean) => void,
) {
  const canvas = renderer.domElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) {
    setSize(width, height, false);
  }
  return needResize;
}

class App {
  container: HTMLElement;
  options: HyperspeedOptions;
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;
  renderPass!: RenderPass;
  bloomPass!: EffectPass;
  clock: THREE.Clock;
  assets: Record<string, any>;
  disposed: boolean;
  road: Road;
  leftCarLights: CarLights;
  rightCarLights: CarLights;
  leftSticks: LightsSticks;
  fogUniforms: Record<string, { value: any }>;
  fovTarget: number;
  speedUpTarget: number;
  speedUp: number;
  timeOffset: number;
  handleResize: () => void;
  carAnchor: THREE.Group;
  carModel: THREE.Group | null;
  carLoader: GLTFLoader;
  modelTransition: ModelTransitionState | null;
  carLoadToken: number;
  pendingCarModelPath: string | null;
  currentCarModelPath: string | null;
  carViewOffset: THREE.Vector3;
  carRotationFix: THREE.Quaternion;
  carWorldPosition: THREE.Vector3;

  constructor(container: HTMLElement, options: HyperspeedOptions) {
    this.options = options;
    if (!this.options.distortion) {
      this.options.distortion = {
        uniforms: distortion_uniforms,
        getDistortion: distortion_vertex,
      };
    }
    this.container = container;

    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
    });
    this.renderer.setSize(container.offsetWidth, container.offsetHeight, false);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.renderer.domElement.style.display = "block";

    this.composer = new EffectComposer(this.renderer);
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      options.fov,
      container.offsetWidth / container.offsetHeight,
      0.1,
      10000,
    );
    this.camera.position.z = -5;
    this.camera.position.y = 8;
    this.camera.position.x = 0;

    this.scene = new THREE.Scene();
    this.scene.background = null;

    const fog = new THREE.Fog(
      options.colors.background,
      options.length * 0.2,
      options.length * 500,
    );
    this.scene.fog = fog;

    this.fogUniforms = {
      fogColor: { value: fog.color },
      fogNear: { value: fog.near },
      fogFar: { value: fog.far },
    };

    this.clock = new THREE.Clock();
    this.assets = {};
    this.disposed = false;

    this.road = new Road(this, options);
    this.leftCarLights = new CarLights(
      this,
      options,
      options.colors.leftCars,
      options.movingAwaySpeed,
      new THREE.Vector2(0, 1 - options.carLightsFade),
    );
    this.rightCarLights = new CarLights(
      this,
      options,
      options.colors.rightCars,
      options.movingCloserSpeed,
      new THREE.Vector2(1, 0 + options.carLightsFade),
    );
    this.leftSticks = new LightsSticks(this, options);

    this.fovTarget = options.fov;
    this.speedUpTarget = 0;
    this.speedUp = 0;
    this.timeOffset = 0;
    this.carAnchor = new THREE.Group();
    this.scene.add(this.carAnchor);
    this.carModel = null;
    this.carLoader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath("/draco/gltf/");
    this.carLoader.setDRACOLoader(draco);
    this.modelTransition = null;
    this.carLoadToken = 0;
    this.pendingCarModelPath = null;
    this.currentCarModelPath = null;
    this.carViewOffset = new THREE.Vector3(0, -2.8, -2.2);
    this.carRotationFix = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, Math.PI, 0),
    );
    this.carWorldPosition = new THREE.Vector3();

    this.tick = this.tick.bind(this);
    this.init = this.init.bind(this);
    this.setSize = this.setSize.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);

    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    this.onContextMenu = this.onContextMenu.bind(this);
    this.handleResize = this.onWindowResize.bind(this);

    window.addEventListener("resize", this.handleResize);
  }

  onWindowResize() {
    const width = this.container.offsetWidth;
    const height = this.container.offsetHeight;

    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.composer.setSize(width, height);
  }

  initPasses() {
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.bloomPass = new EffectPass(
      this.camera,
      new BloomEffect({
        intensity: 0.55,
        luminanceThreshold: 0.32,
        luminanceSmoothing: 0,
        resolutionScale: 1,
      }),
    );

    const smaaPass = new EffectPass(
      this.camera,
      new SMAAEffect({
        preset: SMAAPreset.MEDIUM,
      }),
    );
    this.renderPass.renderToScreen = false;
    this.bloomPass.renderToScreen = false;
    smaaPass.renderToScreen = true;

    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(smaaPass);
  }

  loadAssets(): Promise<void> {
    const assets = this.assets;
    return new Promise((resolve) => {
      const manager = new THREE.LoadingManager(resolve);

      const searchImage = new Image();
      const areaImage = new Image();
      assets.smaa = {};

      searchImage.addEventListener("load", () => {
        assets.smaa.search = searchImage;
        manager.itemEnd("smaa-search");
      });

      areaImage.addEventListener("load", () => {
        assets.smaa.area = areaImage;
        manager.itemEnd("smaa-area");
      });

      manager.itemStart("smaa-search");
      manager.itemStart("smaa-area");

      searchImage.src = SMAAEffect.searchImageDataURL;
      areaImage.src = SMAAEffect.areaImageDataURL;
    });
  }

  init() {
    this.initPasses();
    const options = this.options;
    this.road.init();
    this.leftCarLights.init();
    this.leftCarLights.mesh.position.setX(
      -options.roadWidth / 2 - options.islandWidth / 2,
    );

    this.rightCarLights.init();
    this.rightCarLights.mesh.position.setX(
      options.roadWidth / 2 + options.islandWidth / 2,
    );

    this.leftSticks.init();
    this.leftSticks.mesh.position.setX(
      -(options.roadWidth + options.islandWidth / 2),
    );

    this.container.addEventListener("mousedown", this.onMouseDown);
    this.container.addEventListener("mouseup", this.onMouseUp);
    this.container.addEventListener("mouseout", this.onMouseUp);

    this.container.addEventListener("touchstart", this.onTouchStart, {
      passive: true,
    });
    this.container.addEventListener("touchend", this.onTouchEnd, {
      passive: true,
    });
    this.container.addEventListener("touchcancel", this.onTouchEnd, {
      passive: true,
    });
    this.container.addEventListener("contextmenu", this.onContextMenu);

    this.addLighting();
    this.loadCarModel(options.carModelPath);

    this.tick();
  }

  onMouseDown(ev: MouseEvent) {
    if (this.options.onSpeedUp) this.options.onSpeedUp(ev);
    this.fovTarget = this.options.fovSpeedUp;
    this.speedUpTarget = this.options.speedUp;
  }

  onMouseUp(ev: MouseEvent) {
    if (this.options.onSlowDown) this.options.onSlowDown(ev);
    this.fovTarget = this.options.fov;
    this.speedUpTarget = 0;
  }

  onTouchStart(ev: TouchEvent) {
    if (this.options.onSpeedUp) this.options.onSpeedUp(ev);
    this.fovTarget = this.options.fovSpeedUp;
    this.speedUpTarget = this.options.speedUp;
  }

  onTouchEnd(ev: TouchEvent) {
    if (this.options.onSlowDown) this.options.onSlowDown(ev);
    this.fovTarget = this.options.fov;
    this.speedUpTarget = 0;
  }

  onContextMenu(ev: MouseEvent) {
    ev.preventDefault();
  }

  addLighting() {
    // Keep a bright base so the car still reads like a normal showroom render.
    const ambient = new THREE.AmbientLight(0xf2f6ff, 0.56);
    this.scene.add(ambient);

    // Neutral key from front-right for familiar readability.
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
    keyLight.position.set(6, 10, -12);
    this.scene.add(keyLight);

    // Subtle cool fill keeps the cyberpunk blend without darkening the car.
    const fillLight = new THREE.DirectionalLight(0xaec8ff, 0.58);
    fillLight.position.set(-8, 5, -18);
    this.scene.add(fillLight);

    // Light magenta rim for edge separation.
    const rimLight = new THREE.DirectionalLight(0xdca3ff, 0.58);
    rimLight.position.set(0, 5, 6);
    this.scene.add(rimLight);

    // Top fill to preserve shape on upper bodywork.
    const topLight = new THREE.DirectionalLight(0xffffff, 0.5);
    topLight.position.set(0, 20, -18);
    this.scene.add(topLight);
  }

  loadCarModel(modelPath?: string) {
    const path =
      modelPath ?? this.options.carModelPath ?? defaultOptions.carModelPath;
    if (!path) return;
    this.switchCarModel(path, false);
  }

  switchCarModel(modelPath: string, animate = true) {
    if (!modelPath || this.disposed) return;
    if (
      this.currentCarModelPath === modelPath ||
      this.pendingCarModelPath === modelPath
    ) {
      return;
    }

    this.pendingCarModelPath = modelPath;
    const loadToken = ++this.carLoadToken;

    const applyModel = (scene: THREE.Group) => {
      if (this.disposed || loadToken !== this.carLoadToken) {
        this.disposeObject3D(scene);
        return;
      }

      this.pendingCarModelPath = null;
      this.cancelModelTransition();

      const incoming = this.prepareCarModel(scene);
      const incomingMaterials = this.collectModelMaterials(incoming);
      const outgoing = this.carModel;

      this.carAnchor.add(incoming);

      if (animate && outgoing) {
        const outgoingMaterials = this.collectModelMaterials(outgoing);
        this.setModelOpacity(outgoingMaterials, 1);
        this.setModelScaleFactor(outgoing, 1);
        this.setModelDepthOffset(outgoing, 0);
        this.setModelOpacity(incomingMaterials, 0);
        this.setModelScaleFactor(incoming, MODEL_SWAP_IN_START_SCALE);
        this.setModelDepthOffset(incoming, MODEL_SWAP_IN_START_DEPTH);

        this.modelTransition = {
          outgoing,
          incoming,
          outgoingMaterials,
          incomingMaterials,
          startedAt: performance.now(),
          durationMs: MODEL_SWAP_DURATION_MS,
        };
      } else {
        if (outgoing) {
          this.removeCarModel(outgoing);
        }
        this.setModelOpacity(incomingMaterials, 1);
        this.setModelScaleFactor(incoming, 1);
        this.setModelDepthOffset(incoming, 0);
        this.modelTransition = null;
      }

      this.carModel = incoming;
      this.currentCarModelPath = modelPath;
      this.updateCarScreenLockPosition();
    };

    // Use cached model for instant switch (no network request)
    const cached = cloneCachedScene(modelPath);
    if (cached) {
      applyModel(cached);
      return;
    }

    // Fallback: load from network if not in cache
    this.carLoader.load(
      modelPath,
      (gltf) => applyModel(gltf.scene),
      undefined,
      (error) => {
        if (loadToken !== this.carLoadToken) return;
        this.pendingCarModelPath = null;
        console.warn(`Failed to load F1 car model: ${modelPath}`, error);
      },
    );
  }

  cancelModelTransition() {
    if (!this.modelTransition) return;
    const { outgoing, incoming, incomingMaterials } = this.modelTransition;
    this.setModelOpacity(incomingMaterials, 1);
    this.setModelScaleFactor(incoming, 1);
    this.setModelDepthOffset(incoming, 0);
    if (outgoing && outgoing !== incoming) {
      this.removeCarModel(outgoing);
    }
    this.carModel = incoming;
    this.modelTransition = null;
  }

  prepareCarModel(model: THREE.Group) {
    // Compute bounding box for auto-scaling.
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());

    // Scale the model so its largest dimension is compact in frame.
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetSize = 6;
    const scale = targetSize / maxDim;
    model.scale.setScalar(scale);

    // Normalize model pivot so its center sits on origin and wheels touch y=0.
    model.rotation.y = 0;
    model.updateMatrixWorld(true);
    const transformedBox = new THREE.Box3().setFromObject(model);
    const transformedCenter = transformedBox.getCenter(new THREE.Vector3());
    const transformedFloor = transformedBox.min.y;

    model.position.set(
      -transformedCenter.x,
      -transformedFloor,
      -transformedCenter.z,
    );
    model.userData.baseScale = model.scale.clone();
    model.userData.basePosition = model.position.clone();
    model.updateMatrixWorld(true);
    model.userData.wheelSpinTargets = this.collectWheelSpinTargets(model);

    // Matte-friendly material response so the car blends into the neon scene.
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        for (const material of materials) {
          if (material instanceof THREE.MeshStandardMaterial) {
            const name = `${material.name} ${child.name}`.toLowerCase();
            const matteProfile = isLikelyGlassOrTrim(name)
              ? CAR_SURFACE_MATTE_CONFIG.glass
              : CAR_SURFACE_MATTE_CONFIG.body;

            material.roughness = Math.max(
              material.roughness,
              matteProfile.roughnessMin,
            );
            material.metalness = Math.min(
              material.metalness,
              matteProfile.metalnessMax,
            );
            material.envMapIntensity = Math.min(
              material.envMapIntensity,
              matteProfile.envMapIntensityMax,
            );

            if (material instanceof THREE.MeshPhysicalMaterial) {
              material.clearcoat = Math.min(
                material.clearcoat,
                matteProfile.clearcoatMax,
              );
              material.clearcoatRoughness = Math.max(
                material.clearcoatRoughness,
                matteProfile.clearcoatRoughnessMin,
              );
              material.specularIntensity = Math.min(
                material.specularIntensity,
                matteProfile.specularIntensityMax,
              );
            }
            material.needsUpdate = true;
          }
        }
      }
    });

    return model;
  }

  /**
   * Detect wheel meshes and create per-wheel spin targets.
   * Handles both uncompressed models (named nodes) and compressed models
   * (flat hierarchy with merged wheel geometry identified by material name).
   */
  collectWheelSpinTargets(model: THREE.Group): WheelSpinTarget[] {
    // 1. Try named node detection (uncompressed models with corner IDs)
    const namedTargets = this.collectNamedWheelTargets(model);
    if (namedTargets.length >= 2) return namedTargets;

    // 2. Material-based detection (compressed / flattened models)
    return this.collectMaterialWheelTargets(model);
  }

  /** Find wheels by node name with corner identifiers (lf/rf/lr/rr). */
  private collectNamedWheelTargets(model: THREE.Group): WheelSpinTarget[] {
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
      const pivot = this.wrapInPivot(entry.obj);
      if (pivot) targets.push({ object: pivot, axis: WHEEL_SPIN_AXIS.clone(), totalAngle: 0 });
    }
    return targets;
  }

  /** Find wheel meshes by material name, splitting merged geometry if needed. */
  private collectMaterialWheelTargets(model: THREE.Group): WheelSpinTarget[] {
    const modelBounds = new THREE.Box3().setFromObject(model);
    if (modelBounds.isEmpty()) return [];
    const modelSize = modelBounds.getSize(new THREE.Vector3());
    const modelCenter = modelBounds.getCenter(new THREE.Vector3());

    // Collect meshes with wheel-related materials
    const wheelMeshes: THREE.Mesh[] = [];
    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || !child.material) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      if (mats.some((m) => WHEEL_MATERIAL_PATTERN.test(m.name))) {
        wheelMeshes.push(child);
      }
    });

    if (wheelMeshes.length === 0) return [];

    // Check if the geometry is merged (spans most of the car width)
    const firstBounds = new THREE.Box3().setFromObject(wheelMeshes[0]);
    const firstSize = firstBounds.getSize(new THREE.Vector3());
    const isMerged = firstSize.x > modelSize.x * 0.5 || firstSize.z > modelSize.z * 0.5;

    if (!isMerged) {
      // Each mesh is already a single wheel part — wrap in pivots
      const targets: WheelSpinTarget[] = [];
      const seen = new Set<THREE.Object3D>();
      for (const mesh of wheelMeshes) {
        if (seen.has(mesh)) continue;
        seen.add(mesh);
        const pivot = this.wrapInPivot(mesh);
        if (pivot) targets.push({ object: pivot, axis: WHEEL_SPIN_AXIS.clone(), totalAngle: 0 });
      }
      return targets;
    }

    // Merged geometry: split each wheel-material mesh into 4 per-wheel sub-meshes
    return this.splitAndCreateWheelTargets(wheelMeshes, modelCenter);
  }

  /**
   * Split merged wheel meshes into per-wheel sub-meshes grouped by quadrant.
   * Each sub-mesh keeps vertices in the original mesh-local coordinate space
   * and is wrapped with wrapInPivot (the same code path used for uncompressed
   * models) so that attach() properly handles the transform chain.
   */
  private splitAndCreateWheelTargets(
    meshes: THREE.Mesh[],
    modelCenter: THREE.Vector3,
  ): WheelSpinTarget[] {
    const parent = meshes[0].parent;
    if (!parent) return [];
    parent.updateMatrixWorld(true);

    // Inverse of parent world matrix — transforms world coords to parent-local
    const parentInverse = new THREE.Matrix4().copy(parent.matrixWorld).invert();

    // Convert modelCenter (world space) to parent-local space for quadrant classification
    const localCenter = modelCenter.clone().applyMatrix4(parentInverse);

    // For each mesh, compute mesh-local → parent-local transform
    const meshToParentMatrices = new Map<THREE.Mesh, THREE.Matrix4>();
    for (const mesh of meshes) {
      mesh.updateMatrixWorld(true);
      const m2p = new THREE.Matrix4().copy(parentInverse).multiply(mesh.matrixWorld);
      meshToParentMatrices.set(mesh, m2p);
    }

    // Classify vertices per mesh and split geometry by quadrant.
    // Sub-meshes keep vertices in original mesh-local space (no transform applied).
    const targets: WheelSpinTarget[] = [];

    for (const mesh of meshes) {
      const meshParent = mesh.parent;
      if (!meshParent) continue;

      const geo = mesh.geometry;
      const posAttr = geo.attributes.position;
      if (!posAttr) continue;

      const m2p = meshToParentMatrices.get(mesh)!;

      // Classify each vertex into a quadrant (in parent-local space)
      const vertexQuadrant = new Array<string>(posAttr.count);
      const vertex = new THREE.Vector3();
      for (let i = 0; i < posAttr.count; i++) {
        vertex.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
        vertex.applyMatrix4(m2p);
        const xSide = vertex.x >= localCenter.x ? "r" : "l";
        const zSide = vertex.z >= localCenter.z ? "f" : "b";
        vertexQuadrant[i] = `${xSide}${zSide}`;
      }

      // Get triangle indices
      const index = geo.index;
      const triCount = index ? index.count / 3 : posAttr.count / 3;

      // Group triangles by quadrant (majority vote of 3 vertices)
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

      // Create a sub-mesh for each quadrant.
      // Bake the mesh→parent transform into vertex positions so each sub-mesh
      // has identity transform. This avoids a large offset between the pivot
      // center and the sub-mesh origin that the mesh's rotation (e.g. toe
      // angle) would tilt, producing wobble under X-axis spin.
      for (const [quadrant, triIndices] of quadrantTriangles) {
        const subGeo = this.buildSubGeometry(geo, triIndices);
        if (!subGeo) continue;

        // Transform vertices from mesh-local to parent-local space
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

        // Compute the actual axle direction from the (now parent-local) geometry.
        // PCA finds the thinnest axis of the disc = the spin axle.
        const spinAxis = this.computeWheelAxle(posArr);

        const subMesh = new THREE.Mesh(subGeo, mesh.material);
        subMesh.name = `${mesh.name}_${quadrant}`;
        meshParent.add(subMesh);

        const pivot = this.wrapInPivot(subMesh);
        if (pivot) {
          targets.push({ object: pivot, axis: spinAxis, totalAngle: 0 });
        }
      }

      // Remove the original merged mesh
      meshParent.remove(mesh);
      mesh.geometry.dispose();
    }

    return targets;
  }

  /**
   * Build a new BufferGeometry from a subset of triangles.
   * Vertices are kept in the original mesh-local coordinate space (no transform).
   */
  private buildSubGeometry(
    srcGeo: THREE.BufferGeometry,
    triIndices: number[],
  ): THREE.BufferGeometry | null {
    if (triIndices.length === 0) return null;

    // Collect unique vertex indices and build remapping
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

    // Copy position attribute as-is (no transform)
    const newPos = new Float32Array(vertCount * 3);
    for (let i = 0; i < vertCount; i++) {
      const oldIdx = uniqueOldIndices[i];
      newPos[i * 3] = srcPos.getX(oldIdx);
      newPos[i * 3 + 1] = srcPos.getY(oldIdx);
      newPos[i * 3 + 2] = srcPos.getZ(oldIdx);
    }

    // Copy normal attribute as-is
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

    // Copy UV attribute as-is
    let newUV: Float32Array | null = null;
    if (srcUV) {
      newUV = new Float32Array(vertCount * 2);
      for (let i = 0; i < vertCount; i++) {
        const oldIdx = uniqueOldIndices[i];
        newUV[i * 2] = srcUV.getX(oldIdx);
        newUV[i * 2 + 1] = srcUV.getY(oldIdx);
      }
    }

    // Build new index buffer
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

  /**
   * Compute the axle direction (minimum-variance axis) of a wheel geometry
   * using PCA on vertex positions. For a disc/cylinder, the thinnest axis
   * (smallest eigenvalue of the covariance matrix) is the spin axle.
   */
  private computeWheelAxle(posAttr: THREE.BufferAttribute): THREE.Vector3 {
    const n = posAttr.count;
    if (n < 3) return new THREE.Vector3(1, 0, 0);

    // Compute centroid
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < n; i++) {
      cx += posAttr.getX(i);
      cy += posAttr.getY(i);
      cz += posAttr.getZ(i);
    }
    cx /= n; cy /= n; cz /= n;

    // Compute 3×3 covariance matrix (symmetric)
    let c00 = 0, c01 = 0, c02 = 0, c11 = 0, c12 = 0, c22 = 0;
    for (let i = 0; i < n; i++) {
      const dx = posAttr.getX(i) - cx;
      const dy = posAttr.getY(i) - cy;
      const dz = posAttr.getZ(i) - cz;
      c00 += dx * dx; c01 += dx * dy; c02 += dx * dz;
      c11 += dy * dy; c12 += dy * dz;
      c22 += dz * dz;
    }

    // Jacobi eigenvalue iteration on symmetric 3×3
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

    // Eigenvector with smallest eigenvalue = axle direction
    let minIdx = 0;
    if (a[1][1] < a[minIdx][minIdx]) minIdx = 1;
    if (a[2][2] < a[minIdx][minIdx]) minIdx = 2;

    const axle = new THREE.Vector3(v[0][minIdx], v[1][minIdx], v[2][minIdx]).normalize();
    if (axle.x < 0) axle.negate(); // consistent direction
    return axle;
  }

  /** Wrap an object in a pivot positioned at its bounding box center. */
  private wrapInPivot(object: THREE.Object3D): THREE.Object3D | null {
    const parent = object.parent;
    if (!parent) return null;

    const bounds = new THREE.Box3().setFromObject(object);
    if (bounds.isEmpty()) return null;

    const center = bounds.getCenter(new THREE.Vector3());
    const pivot = new THREE.Object3D();
    pivot.name = `${object.name || "wheel"}_spin_pivot`;
    pivot.position.copy(parent.worldToLocal(center.clone()));
    // Leave pivot quaternion at identity — attach() will adjust the
    // object's local transform to preserve its world orientation.
    // This way setFromAxisAngle() applies pure spin without losing
    // the object's base orientation (preserved in its own local transform).

    parent.add(pivot);
    pivot.attach(object);

    return pivot;
  }

  spinWheelTargets(model: THREE.Group | null, spinRadians: number) {
    if (!model) return;

    const wheelSpinTargets = model.userData.wheelSpinTargets as
      | WheelSpinTarget[]
      | undefined;
    if (!wheelSpinTargets || wheelSpinTargets.length === 0) return;

    for (const target of wheelSpinTargets) {
      if (!target.object.parent) continue;
      target.totalAngle += spinRadians;
      target.object.quaternion.setFromAxisAngle(target.axis, target.totalAngle);
    }
  }

  updateWheelSpin(delta: number) {
    const speedFactor = Math.max(0.15, 1 + this.speedUp);
    const spinRadians = WHEEL_BASE_ANGULAR_SPEED * speedFactor * delta;

    this.spinWheelTargets(this.carModel, spinRadians);
    if (!this.modelTransition) return;

    if (this.modelTransition.outgoing && this.modelTransition.outgoing !== this.carModel) {
      this.spinWheelTargets(this.modelTransition.outgoing, spinRadians);
    }
    if (this.modelTransition.incoming && this.modelTransition.incoming !== this.carModel) {
      this.spinWheelTargets(this.modelTransition.incoming, spinRadians);
    }
  }

  collectModelMaterials(model: THREE.Group): ModelMaterialState[] {
    const uniqueMaterials = new Set<THREE.Material>();

    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || !child.material) return;
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      for (const material of materials) {
        uniqueMaterials.add(material);
      }
    });

    return Array.from(uniqueMaterials).map((material) => ({
      material,
      baseOpacity: material.opacity,
      baseTransparent: material.transparent,
      baseDepthWrite: material.depthWrite,
    }));
  }

  setModelOpacity(materialStates: ModelMaterialState[], alpha: number) {
    const clampedAlpha = THREE.MathUtils.clamp(alpha, 0, 1);

    for (const state of materialStates) {
      state.material.opacity = state.baseOpacity * clampedAlpha;
      state.material.transparent =
        state.baseTransparent || clampedAlpha < 0.999;
      state.material.depthWrite = state.baseDepthWrite;
      state.material.needsUpdate = true;
    }
  }

  setModelScaleFactor(model: THREE.Group, scaleFactor: number) {
    const baseScale = model.userData.baseScale as THREE.Vector3 | undefined;
    if (baseScale) {
      model.scale.copy(baseScale).multiplyScalar(scaleFactor);
      return;
    }

    model.scale.setScalar(scaleFactor);
  }

  setModelDepthOffset(model: THREE.Group, depthOffset: number) {
    const basePosition = model.userData.basePosition as
      | THREE.Vector3
      | undefined;
    if (basePosition) {
      model.position.copy(basePosition);
      model.position.z += depthOffset;
      return;
    }

    model.position.z += depthOffset;
  }

  updateModelTransition() {
    if (!this.modelTransition) return;

    const transition = this.modelTransition;
    const progress = Math.min(
      (performance.now() - transition.startedAt) / transition.durationMs,
      1,
    );

    const outgoingT = THREE.MathUtils.clamp(
      progress / MODEL_SWAP_OUT_PHASE_END,
      0,
      1,
    );
    const outgoingEase = outgoingT ** 3;

    if (transition.outgoing) {
      this.setModelOpacity(
        transition.outgoingMaterials,
        THREE.MathUtils.lerp(1, MODEL_SWAP_OUT_END_OPACITY, outgoingEase),
      );
      this.setModelScaleFactor(
        transition.outgoing,
        THREE.MathUtils.lerp(1, MODEL_SWAP_OUT_END_SCALE, outgoingEase),
      );
      this.setModelDepthOffset(
        transition.outgoing,
        THREE.MathUtils.lerp(0, MODEL_SWAP_OUT_END_DEPTH, outgoingEase),
      );
    }

    const incomingT = THREE.MathUtils.clamp(
      (progress - MODEL_SWAP_IN_PHASE_START) / (1 - MODEL_SWAP_IN_PHASE_START),
      0,
      1,
    );
    const incomingEase = 1 - (1 - incomingT) ** 4;
    this.setModelOpacity(transition.incomingMaterials, incomingEase);
    this.setModelScaleFactor(
      transition.incoming,
      THREE.MathUtils.lerp(MODEL_SWAP_IN_START_SCALE, 1, incomingEase),
    );
    this.setModelDepthOffset(
      transition.incoming,
      THREE.MathUtils.lerp(MODEL_SWAP_IN_START_DEPTH, 0, incomingEase),
    );

    if (progress < 1) return;

    if (transition.outgoing) {
      this.removeCarModel(transition.outgoing);
    }
    this.setModelOpacity(transition.incomingMaterials, 1);
    this.setModelScaleFactor(transition.incoming, 1);
    this.setModelDepthOffset(transition.incoming, 0);
    this.carModel = transition.incoming;
    this.modelTransition = null;
  }

  removeCarModel(model: THREE.Group) {
    this.carAnchor.remove(model);
    this.disposeObject3D(model);
    if (this.carModel === model) {
      this.carModel = null;
    }
  }

  disposeObject3D(object: THREE.Object3D) {
    const disposedMaterials = new Set<THREE.Material>();

    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      child.geometry.dispose();
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];

      for (const material of materials) {
        if (disposedMaterials.has(material)) continue;
        material.dispose();
        disposedMaterials.add(material);
      }
    });
  }

  updateCarScreenLockPosition() {
    if (!this.carModel && !this.modelTransition) return;

    // Keep the car locked in the camera's forward view while the world moves.
    this.carWorldPosition
      .copy(this.carViewOffset)
      .applyMatrix4(this.camera.matrixWorld);
    this.carAnchor.position.copy(this.carWorldPosition);
    this.carAnchor.quaternion
      .copy(this.camera.quaternion)
      .multiply(this.carRotationFix);
  }

  update(delta: number) {
    const lerpPercentage = Math.exp(-(-60 * Math.log2(1 - 0.1)) * delta);
    this.speedUp += lerp(
      this.speedUp,
      this.speedUpTarget,
      lerpPercentage,
      0.00001,
    );
    this.timeOffset += this.speedUp * delta;
    const time = this.clock.elapsedTime + this.timeOffset;

    this.rightCarLights.update(time);
    this.leftCarLights.update(time);
    this.leftSticks.update(time);
    this.road.update(time);

    let updateCamera = false;
    const fovChange = lerp(this.camera.fov, this.fovTarget, lerpPercentage);
    if (fovChange !== 0) {
      this.camera.fov += fovChange * delta * 6;
      updateCamera = true;
    }

    if (
      typeof this.options.distortion === "object" &&
      this.options.distortion.getJS
    ) {
      const distortion = this.options.distortion.getJS(0.025, time);
      this.camera.lookAt(
        new THREE.Vector3(
          this.camera.position.x + distortion.x,
          this.camera.position.y + distortion.y,
          this.camera.position.z + distortion.z,
        ),
      );
      updateCamera = true;
    }

    if (updateCamera) {
      this.camera.updateProjectionMatrix();
    }

    this.updateModelTransition();
    this.updateWheelSpin(delta);
    this.updateCarScreenLockPosition();
  }

  render(delta: number) {
    this.composer.render(delta);
  }

  dispose() {
    this.disposed = true;

    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.composer) {
      this.composer.dispose();
    }
    this.carLoadToken += 1;
    this.pendingCarModelPath = null;
    this.currentCarModelPath = null;
    this.modelTransition = null;
    for (const child of [...this.carAnchor.children]) {
      this.removeCarModel(child as THREE.Group);
    }
    this.carModel = null;
    this.scene.remove(this.carAnchor);

    if (this.scene) {
      this.scene.clear();
    }

    window.removeEventListener("resize", this.handleResize);
    if (this.container) {
      this.container.removeEventListener("mousedown", this.onMouseDown);
      this.container.removeEventListener("mouseup", this.onMouseUp);
      this.container.removeEventListener("mouseout", this.onMouseUp);

      this.container.removeEventListener("touchstart", this.onTouchStart);
      this.container.removeEventListener("touchend", this.onTouchEnd);
      this.container.removeEventListener("touchcancel", this.onTouchEnd);
      this.container.removeEventListener("contextmenu", this.onContextMenu);
    }
  }

  setSize(width: number, height: number, updateStyles: boolean) {
    this.composer.setSize(width, height, updateStyles);
  }

  tick() {
    if (this.disposed || !this) return;
    if (resizeRendererToDisplaySize(this.renderer, this.setSize)) {
      const canvas = this.renderer.domElement;
      this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
      this.camera.updateProjectionMatrix();
    }
    const delta = this.clock.getDelta();
    this.render(delta);
    this.update(delta);
    requestAnimationFrame(this.tick);
  }
}

const DEFAULT_EFFECT_OPTIONS: Partial<HyperspeedOptions> = {};

const HyperspeedBackground: FC<HyperspeedProps> = ({
  effectOptions = DEFAULT_EFFECT_OPTIONS,
  carModelPath,
  className = "",
}) => {
  const hyperspeed = useRef<HTMLDivElement>(null);
  const appRef = useRef<App | null>(null);
  const initialCarModelPathRef = useRef(carModelPath);

  useEffect(() => {
    if (appRef.current) {
      appRef.current.dispose();
      const container = hyperspeed.current;
      if (container) {
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
      }
    }

    const container = hyperspeed.current;
    if (!container) return;

    const options: HyperspeedOptions = {
      ...defaultOptions,
      ...effectOptions,
      colors: { ...defaultOptions.colors, ...effectOptions.colors },
      carModelPath:
        initialCarModelPathRef.current ?? defaultOptions.carModelPath,
    };
    if (typeof options.distortion === "string") {
      options.distortion = distortions[options.distortion];
    }

    const myApp = new App(container, options);
    appRef.current = myApp;
    myApp.loadAssets().then(myApp.init);

    return () => {
      if (appRef.current) {
        appRef.current.dispose();
      }
    };
  }, [effectOptions]);

  useEffect(() => {
    if (!carModelPath || !appRef.current) return;
    appRef.current.switchCarModel(carModelPath);
  }, [carModelPath]);

  return <div ref={hyperspeed} className={className} />;
};

export default HyperspeedBackground;
