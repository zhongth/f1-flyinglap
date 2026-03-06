"use client";

import { type FC, useEffect, useRef } from "react";
import * as THREE from "three";
import { cloneCachedScene, isModelCached } from "@/lib/modelPreloader";
import { getAllModelPaths, getTeamCarModelPath } from "@/data/teamCarModels";
import { getTeamById } from "@/data/teams";
import { gsap } from "@/lib/gsap";
import {
  collectWheelSpinTargets,
  spinWheelTargets,
  WHEEL_BASE_ANGULAR_SPEED,
  type WheelSpinTarget,
} from "@/lib/wheelUtils";
import type { CameraMode } from "@/store/useAppStore";

/* Camera presets keyed by mode */
const CAMERA_CONFIGS = {
  topDown: {
    position: { x: 0, y: 18, z: 2.8 },
    lookAt: { x: 0, y: 0, z: 0.6 },
    bgColor: new THREE.Color(0x111113),
    fogColor: new THREE.Color(0x111113),
    fogDensity: 0.02,
  },
  cinematic: {
    position: { x: -12, y: 3, z: 8 },
    lookAt: { x: 1, y: 1.2, z: -2 },
    bgColor: new THREE.Color(0x08080a),
    fogColor: new THREE.Color(0x08080a),
    fogDensity: 0.014,
  },
  sideProfile: {
    position: { x: 0, y: 1.2, z: 16 },
    lookAt: { x: 0, y: 5.2, z: -2 },
    bgColor: new THREE.Color(0x0a0a0c),
    fogColor: new THREE.Color(0x0a0a0c),
    fogDensity: 0.012,
  },
} as const;

const CAMERA_TRANSITION_DURATION = 1.4;

/** Quarter-pipe cyclorama geometry (smooth floor-to-wall sweep) */
function createCycloramaGeometry(
  wallZ: number,
  radius: number,
  wallHeight: number,
  width: number,
  curveSegments = 32,
): THREE.BufferGeometry {
  const curveStartZ = wallZ + radius;
  const profileCount = curveSegments + 2; // curve points + wall top
  const positions: number[] = [];
  const norms: number[] = [];
  const uvArr: number[] = [];
  const indices: number[] = [];
  const halfW = width / 2;

  for (const xFactor of [0, 1]) {
    const x = -halfW + xFactor * width;
    const u = xFactor;
    for (let i = 0; i <= curveSegments; i++) {
      const alpha = (i / curveSegments) * (Math.PI / 2);
      const z = curveStartZ - radius * Math.sin(alpha);
      const y = radius * (1 - Math.cos(alpha));
      const v = i / (profileCount - 1);
      positions.push(x, y, z);
      norms.push(0, Math.cos(alpha), Math.sin(alpha));
      uvArr.push(u, v);
    }
    // Wall top
    positions.push(x, radius + wallHeight, wallZ);
    norms.push(0, 0, 1);
    uvArr.push(u, 1);
  }

  for (let yi = 0; yi < profileCount - 1; yi++) {
    const a = yi;
    const b = yi + 1;
    const c = profileCount + yi;
    const d = profileCount + yi + 1;
    indices.push(a, c, b, b, c, d);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(norms, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvArr, 2));
  geo.setIndex(indices);
  return geo;
}

interface TopDownCarShowcaseProps {
  teamId: string;
  className?: string;
  cameraMode?: CameraMode;
  onCameraTransitionComplete?: () => void;
}

interface CarState {
  group: THREE.Group;
  wheelTargets: WheelSpinTarget[];
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas);
    fallback.needsUpdate = true;
    return fallback;
  }

  const gradient = ctx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    size * 0.06,
    size * 0.5,
    size * 0.5,
    size * 0.5,
  );
  gradient.addColorStop(0, "rgba(0,0,0,0.78)");
  gradient.addColorStop(0.4, "rgba(0,0,0,0.58)");
  gradient.addColorStop(0.78, "rgba(0,0,0,0.2)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

const TopDownCarShowcase: FC<TopDownCarShowcaseProps> = ({
  teamId,
  className = "",
  cameraMode = "topDown",
  onCameraTransitionComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const rafRef = useRef<number>(0);
  const currentCarRef = useRef<CarState | null>(null);
  const currentModelPathRef = useRef<string | null>(null);
  const prevTeamIdRef = useRef<string | null>(null);
  const isTransitioningRef = useRef(false);
  const needsRenderRef = useRef(true);
  const lastTimeRef = useRef(0);
  const isAnimatingRef = useRef(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Object pool: pre-prepared cars keyed by model path
  const carPoolRef = useRef<Map<string, CarState>>(new Map());
  const warmUpDoneRef = useRef(false);
  const contactShadowTextureRef = useRef<THREE.CanvasTexture | null>(null);

  // Camera animation state
  const lookAtRef = useRef(new THREE.Vector3(0, 0, 0));
  const isCameraAnimatingRef = useRef(false);
  const cameraModeRef = useRef<CameraMode>(cameraMode);
  const cameraTlRef = useRef<gsap.core.Timeline | null>(null);
  const onCameraCompleteRef = useRef(onCameraTransitionComplete);
  onCameraCompleteRef.current = onCameraTransitionComplete;

  // Dynamic environment refs (team-colored)
  const rimStripMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const rimGlowMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const rimHaloMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const keyLightRef = useRef<THREE.SpotLight | null>(null);
  const rimLightRef = useRef<THREE.SpotLight | null>(null);
  const logoMeshRef = useRef<THREE.Mesh | null>(null);
  const logoTextureRef = useRef<THREE.CanvasTexture | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    contactShadowTextureRef.current = createContactShadowTexture();

    const scene = new THREE.Scene();
    const initConfig = CAMERA_CONFIGS[cameraModeRef.current];
    scene.background = initConfig.bgColor.clone();
    scene.fog = new THREE.FogExp2(
      initConfig.fogColor.getHex(),
      initConfig.fogDensity,
    );
    (scene.fog as THREE.FogExp2).color.copy(initConfig.fogColor);
    sceneRef.current = scene;

    // Camera — bird's-eye view looking straight down
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      200,
    );
    camera.position.set(0, 18, 2.8);
    camera.lookAt(0, 0, 0.4);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.34;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Ground plane — polished dark concrete (reflective for cinematic look)
    const groundGeometry = new THREE.PlaneGeometry(120, 120);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x18181d,
      roughness: 0.4,
      metalness: 0.35,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);

    // === Grid Box — clean single-line rectangle ===
    const gridBoxGroup = new THREE.Group();
    gridBoxGroup.position.y = 0.02;

    const lineMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.18,
    });

    // Car faces -X. Front bracket at -X side, like a real F1 grid box.
    const bracketX = -6.0;
    const armLen = 2.8;
    const halfWid = 2.6;

    const bracketPts = [
      new THREE.Vector3(bracketX + armLen, 0, -halfWid),
      new THREE.Vector3(bracketX, 0, -halfWid),
      new THREE.Vector3(bracketX, 0, halfWid),
      new THREE.Vector3(bracketX + armLen, 0, halfWid),
    ];
    gridBoxGroup.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(bracketPts),
        lineMat,
      ),
    );

    scene.add(gridBoxGroup);

    // === Studio Environment — cyclorama + LED panel + rim light strip ===

    // Back cyclorama: smooth quarter-pipe from floor (z ≈ −18) to wall (z = −28)
    const cycGeo = createCycloramaGeometry(-28, 10, 24, 80);
    const cycMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a30,
      roughness: 0.82,
      metalness: 0.06,
      side: THREE.DoubleSide,
    });
    const cyclorama = new THREE.Mesh(cycGeo, cycMat);
    cyclorama.receiveShadow = true;
    scene.add(cyclorama);

    // Side cyclorama (wraps around the +X side, visible on left of cinematic frame)
    const sideCycGeo = createCycloramaGeometry(-28, 10, 24, 60);
    const sideCyc = new THREE.Mesh(sideCycGeo, cycMat);
    sideCyc.receiveShadow = true;
    sideCyc.rotation.y = -Math.PI / 2;
    sideCyc.position.set(30, 0, 0);
    scene.add(sideCyc);

    // Rim light strip — bright emissive bar at base of back wall
    const rimStripGeo = new THREE.PlaneGeometry(62, 0.18);
    const rimStripMat = new THREE.MeshBasicMaterial({
      color: 0xeef2ff,
      transparent: true,
      opacity: 0.92,
      toneMapped: false,
    });
    rimStripMatRef.current = rimStripMat;
    const rimStrip = new THREE.Mesh(rimStripGeo, rimStripMat);
    rimStrip.position.set(2, 0.08, -18.05);
    scene.add(rimStrip);

    // Soft glow plane behind rim strip (wider bloom effect)
    const rimGlowGeo = new THREE.PlaneGeometry(78, 2.4);
    const rimGlowMat = new THREE.MeshBasicMaterial({
      color: 0xc0c8d8,
      transparent: true,
      opacity: 0.22,
      toneMapped: false,
    });
    rimGlowMatRef.current = rimGlowMat;
    const rimGlow = new THREE.Mesh(rimGlowGeo, rimGlowMat);
    rimGlow.position.set(2, 0.06, -18.0);
    scene.add(rimGlow);

    // Secondary glow halo (very wide, subtle)
    const rimHaloGeo = new THREE.PlaneGeometry(88, 6);
    const rimHaloMat = new THREE.MeshBasicMaterial({
      color: 0x909aac,
      transparent: true,
      opacity: 0.08,
      toneMapped: false,
    });
    rimHaloMatRef.current = rimHaloMat;
    const rimHalo = new THREE.Mesh(rimHaloGeo, rimHaloMat);
    rimHalo.position.set(2, 0.04, -17.8);
    scene.add(rimHalo);

    // Team logo plane — floats in scene, visible from cinematic angle
    const logoGeo = new THREE.PlaneGeometry(12, 12);
    const logoMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      toneMapped: false,
      depthWrite: false,
    });
    const logoMesh = new THREE.Mesh(logoGeo, logoMat);
    logoMesh.position.set(0, 8, -5);
    logoMeshRef.current = logoMesh;
    scene.add(logoMesh);

    // === Lighting — dramatic car-reveal studio ===

    // Low ambient for moody contrast
    const ambientLight = new THREE.AmbientLight(0xc0c8d8, 0.14);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xb0b8c8, 0x080808, 0.1);
    scene.add(hemiLight);

    // Key light — illuminates cyclorama wall from upper-left (cool wash)
    const keyLight = new THREE.SpotLight(0xc8d4e8, 280);
    keyLightRef.current = keyLight;
    keyLight.position.set(-6, 24, -4);
    keyLight.target.position.set(8, 6, -26);
    keyLight.angle = Math.PI / 3;
    keyLight.penumbra = 0.65;
    keyLight.decay = 1.05;
    keyLight.distance = 70;
    keyLight.castShadow = false;
    scene.add(keyLight);
    scene.add(keyLight.target);

    // Rim accent light — creates the bright horizontal strip glow
    const rimLight = new THREE.SpotLight(0xe0e8f0, 120);
    rimLightRef.current = rimLight;
    rimLight.position.set(10, 3, -6);
    rimLight.target.position.set(-8, 0, -20);
    rimLight.angle = Math.PI / 4;
    rimLight.penumbra = 0.85;
    rimLight.decay = 1.15;
    rimLight.distance = 35;
    rimLight.castShadow = false;
    scene.add(rimLight);
    scene.add(rimLight.target);

    // Four-corner car-show rig (slightly lower intensity for moodier feel)
    const cornerLights = [
      {
        color: 0xdde4f0,
        intensity: 32,
        position: new THREE.Vector3(-8.4, 16.5, -10.5),
        castShadow: true,
      },
      {
        color: 0xf0e8d8,
        intensity: 32,
        position: new THREE.Vector3(8.4, 16.5, -10.5),
        castShadow: true,
      },
      {
        color: 0xc8d4e8,
        intensity: 22,
        position: new THREE.Vector3(-9.5, 12, 7.5),
        castShadow: false,
      },
      {
        color: 0xf0dcc0,
        intensity: 22,
        position: new THREE.Vector3(9.5, 12, 7.5),
        castShadow: false,
      },
    ];

    for (const config of cornerLights) {
      const light = new THREE.SpotLight(config.color, config.intensity);
      light.position.copy(config.position);
      light.target.position.set(0, 0, 0);
      light.angle = Math.PI / 5.2;
      light.penumbra = 0.8;
      light.decay = 1.3;
      light.distance = 42;
      light.castShadow = config.castShadow;
      if (config.castShadow) {
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
        light.shadow.camera.near = 3.5;
        light.shadow.camera.far = 46;
        light.shadow.bias = -0.00028;
        light.shadow.normalBias = 0.012;
      }
      scene.add(light);
      scene.add(light.target);
    }

    // Dedicated grounding shadow
    const groundingLight = new THREE.DirectionalLight(0xffffff, 0.24);
    groundingLight.position.set(2.2, 15, 1.4);
    groundingLight.target.position.set(0, 0, 0);
    groundingLight.castShadow = true;
    groundingLight.shadow.mapSize.width = 2048;
    groundingLight.shadow.mapSize.height = 2048;
    groundingLight.shadow.bias = -0.00012;
    groundingLight.shadow.normalBias = 0.008;
    const groundingShadowCam = groundingLight.shadow
      .camera as THREE.OrthographicCamera;
    groundingShadowCam.left = -8;
    groundingShadowCam.right = 8;
    groundingShadowCam.top = 6;
    groundingShadowCam.bottom = -6;
    groundingShadowCam.near = 1;
    groundingShadowCam.far = 36;
    scene.add(groundingLight);
    scene.add(groundingLight.target);

    // Render loop — only renders when needed
    const animate = (timestamp: number) => {
      rafRef.current = requestAnimationFrame(animate);

      const shouldRender =
        needsRenderRef.current ||
        isAnimatingRef.current ||
        isCameraAnimatingRef.current;
      if (!shouldRender) return;

      const delta = lastTimeRef.current
        ? (timestamp - lastTimeRef.current) / 1000
        : 0.016;
      lastTimeRef.current = timestamp;

      // Spin wheels while car is in motion (not during camera-only animation)
      if (isAnimatingRef.current) {
        const car = currentCarRef.current;
        if (car && car.wheelTargets.length > 0) {
          const spinRadians = WHEEL_BASE_ANGULAR_SPEED * delta;
          spinWheelTargets(car.wheelTargets, spinRadians);
        }
      }

      renderer.render(scene, camera);

      // After one idle frame, stop rendering
      if (!isAnimatingRef.current && !isCameraAnimatingRef.current) {
        needsRenderRef.current = false;
      }
    };
    rafRef.current = requestAnimationFrame(animate);

    // Handle resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      needsRenderRef.current = true;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(rafRef.current);
      cameraTlRef.current?.kill();
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

      // Dispose all pooled cars
      for (const car of carPoolRef.current.values()) {
        disposeCar(car);
      }
      carPoolRef.current.clear();

      // Dispose current car
      if (currentCarRef.current) {
        disposeCar(currentCarRef.current);
      }

      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material)
            ? obj.material
            : [obj.material];
          for (const m of mats) {
            if (m instanceof THREE.MeshStandardMaterial) {
              m.map?.dispose();
              m.emissiveMap?.dispose();
            }
            m.dispose();
          }
        }
      });
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      currentCarRef.current = null;
      currentModelPathRef.current = null;
      contactShadowTextureRef.current?.dispose();
      contactShadowTextureRef.current = null;
      logoTextureRef.current?.dispose();
      logoTextureRef.current = null;
    };
  }, []);

  // Prepare a car from the GLTF cache (clone, scale, center, collect wheels)
  function prepareCar(modelPath: string): CarState | null {
    const model = cloneCachedScene(modelPath);
    if (!model) return null;

    // Enable shadows
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        for (const material of materials) {
          if (material instanceof THREE.MeshStandardMaterial) {
            material.roughness = Math.max(material.roughness ?? 0.3, 0.3);
            material.metalness = Math.min(material.metalness ?? 0.6, 0.55);
            material.envMapIntensity = Math.min(
              material.envMapIntensity ?? 1,
              0.95,
            );
            if (material instanceof THREE.MeshPhysicalMaterial) {
              material.specularIntensity = Math.min(
                material.specularIntensity ?? 1,
                0.9,
              );
              material.clearcoat = Math.min(material.clearcoat ?? 0, 0.4);
              material.clearcoatRoughness = Math.max(
                material.clearcoatRoughness ?? 0.25,
                0.32,
              );
            }
          }
        }
      }
    });

    // Measure bounds
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetSize = 10;
    const scale = maxDim > 0 ? targetSize / maxDim : 1;
    model.scale.setScalar(scale);

    // Center the model and sit on ground
    model.updateMatrixWorld(true);
    const scaledBox = new THREE.Box3().setFromObject(model);
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
    model.position.set(
      -scaledCenter.x,
      -scaledBox.min.y - 0.32,
      -scaledCenter.z,
    );

    // Rotate 90 degrees clockwise (from top-down view) so car faces left
    model.rotation.y = -Math.PI / 2;

    // Recalculate after rotation
    model.updateMatrixWorld(true);

    // Collect wheel targets for spinning
    const wheelTargets = collectWheelSpinTargets(model);

    // Wrap in group for clean position animation
    const carGroup = new THREE.Group();
    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(12.6, 7.0),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.62,
        alphaMap: contactShadowTextureRef.current ?? undefined,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
      }),
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(0, 0.0025, 0);
    contactShadow.renderOrder = 0;
    carGroup.add(contactShadow);
    carGroup.add(model);

    return { group: carGroup, wheelTargets };
  }

  // Get or create a car from the pool
  function getPooledCar(modelPath: string): CarState | null {
    const pool = carPoolRef.current;
    const existing = pool.get(modelPath);
    if (existing) {
      pool.delete(modelPath);
      // Reset wheel rotation
      for (const wt of existing.wheelTargets) {
        wt.totalAngle = 0;
        wt.object.quaternion.identity();
      }
      return existing;
    }
    return prepareCar(modelPath);
  }

  // Return a car to the pool instead of disposing it
  function returnToPool(scene: THREE.Scene, car: CarState, modelPath: string) {
    scene.remove(car.group);
    car.group.position.set(0, 0, 0);
    carPoolRef.current.set(modelPath, car);
  }

  // Fully dispose a car (only on unmount)
  function disposeCar(car: CarState) {
    car.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m: THREE.Material) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  // Pre-warm all models: prepare cars + compile GPU shaders during idle time
  function warmUpAllModels() {
    if (warmUpDoneRef.current) return;
    warmUpDoneRef.current = true;

    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera) return;

    const allPaths = getAllModelPaths();
    const pool = carPoolRef.current;
    let idx = 0;

    function warmNext() {
      // Re-check refs in case component unmounted
      const s = sceneRef.current;
      const r = rendererRef.current;
      const c = cameraRef.current;
      if (!s || !r || !c || idx >= allPaths.length) return;

      const path = allPaths[idx++];
      // Skip if already in pool or currently displayed
      if (pool.has(path) || path === currentModelPathRef.current) {
        scheduleNext();
        return;
      }

      if (!isModelCached(path)) {
        scheduleNext();
        return;
      }

      const car = prepareCar(path);
      if (car) {
        // Temporarily add to scene for GPU shader compilation
        car.group.position.set(0, -1000, 0); // off-screen
        s.add(car.group);
        r.compile(s, c);
        s.remove(car.group);
        car.group.position.set(0, 0, 0);
        pool.set(path, car);
      }

      scheduleNext();
    }

    function scheduleNext() {
      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(() => warmNext(), { timeout: 500 });
      } else {
        setTimeout(warmNext, 50);
      }
    }

    scheduleNext();
  }

  // Handle team changes — drive cars in/out
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (teamId === prevTeamIdRef.current) return;

    const modelPath = getTeamCarModelPath(teamId);

    // If model isn't cached yet, poll until ready
    if (!isModelCached(modelPath)) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      const targetTeamId = teamId;
      pollIntervalRef.current = setInterval(() => {
        if (isModelCached(modelPath) && sceneRef.current) {
          clearInterval(pollIntervalRef.current!);
          pollIntervalRef.current = null;
          swapCar(sceneRef.current, targetTeamId, modelPath);
        }
      }, 200);
      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };
    }

    swapCar(scene, teamId, modelPath);
  }, [teamId]);

  function swapCar(scene: THREE.Scene, newTeamId: string, modelPath: string) {
    const isFirstLoad = prevTeamIdRef.current === null;
    prevTeamIdRef.current = newTeamId;

    if (isTransitioningRef.current && !isFirstLoad) return;
    isTransitioningRef.current = true;
    isAnimatingRef.current = true;
    needsRenderRef.current = true;

    const newCarState = getPooledCar(modelPath);
    if (!newCarState) {
      isTransitioningRef.current = false;
      isAnimatingRef.current = false;
      return;
    }

    // Drive right-to-left: enter from +X, exit to -X
    const driveInStart = 35;
    const driveOutEnd = -35;
    const centerX = 0;

    newCarState.group.position.x = driveInStart;
    scene.add(newCarState.group);

    const oldCar = currentCarRef.current;
    const oldModelPath = currentModelPathRef.current;
    currentCarRef.current = newCarState;
    currentModelPathRef.current = modelPath;

    const onComplete = () => {
      isTransitioningRef.current = false;
      isAnimatingRef.current = false;
      needsRenderRef.current = true;

      // Trigger warm-up after first car is shown
      if (isFirstLoad) warmUpAllModels();
    };

    if (isFirstLoad || !oldCar) {
      gsap.to(newCarState.group.position, {
        x: centerX,
        duration: 1.4,
        ease: "power3.out",
        onUpdate: () => {
          needsRenderRef.current = true;
        },
        onComplete,
      });
    } else {
      const tl = gsap.timeline({
        onUpdate: () => {
          needsRenderRef.current = true;
        },
        onComplete: () => {
          // Return old car to pool instead of disposing
          if (oldModelPath) {
            returnToPool(scene, oldCar, oldModelPath);
          }
          onComplete();
        },
      });

      // Old car drives out to the left
      tl.to(oldCar.group.position, {
        x: driveOutEnd,
        duration: 0.7,
        ease: "power2.in",
      });

      // New car drives in from the right (overlapping)
      tl.to(
        newCarState.group.position,
        {
          x: centerX,
          duration: 1.0,
          ease: "power3.out",
        },
        0.3,
      );
    }
  }

  // Camera mode transition
  useEffect(() => {
    if (cameraMode === cameraModeRef.current) return;
    cameraModeRef.current = cameraMode;

    const camera = cameraRef.current;
    const scene = sceneRef.current;
    if (!camera || !scene) return;

    cameraTlRef.current?.kill();

    const config = CAMERA_CONFIGS[cameraMode];
    isCameraAnimatingRef.current = true;
    needsRenderRef.current = true;

    const tl = gsap.timeline({
      onUpdate: () => {
        camera.lookAt(lookAtRef.current);
        needsRenderRef.current = true;
      },
      onComplete: () => {
        isCameraAnimatingRef.current = false;
        needsRenderRef.current = true;
        onCameraCompleteRef.current?.();
      },
    });
    cameraTlRef.current = tl;

    // Camera position
    tl.to(
      camera.position,
      {
        x: config.position.x,
        y: config.position.y,
        z: config.position.z,
        duration: CAMERA_TRANSITION_DURATION,
        ease: "power2.inOut",
      },
      0,
    );

    // LookAt target
    tl.to(
      lookAtRef.current,
      {
        x: config.lookAt.x,
        y: config.lookAt.y,
        z: config.lookAt.z,
        duration: CAMERA_TRANSITION_DURATION,
        ease: "power2.inOut",
      },
      0,
    );

    // Scene background color
    if (scene.background instanceof THREE.Color) {
      tl.to(
        scene.background,
        {
          r: config.bgColor.r,
          g: config.bgColor.g,
          b: config.bgColor.b,
          duration: CAMERA_TRANSITION_DURATION,
          ease: "power2.inOut",
        },
        0,
      );
    }

    // Fog color + density
    if (scene.fog) {
      tl.to(
        scene.fog.color,
        {
          r: config.fogColor.r,
          g: config.fogColor.g,
          b: config.fogColor.b,
          duration: CAMERA_TRANSITION_DURATION,
          ease: "power2.inOut",
        },
        0,
      );
      if (scene.fog instanceof THREE.FogExp2) {
        tl.to(
          scene.fog,
          {
            density: config.fogDensity,
            duration: CAMERA_TRANSITION_DURATION,
            ease: "power2.inOut",
          },
          0,
        );
      }
    }

    return () => {
      tl.kill();
    };
  }, [cameraMode]);

  // Update environment colors + logo when team or camera mode changes
  useEffect(() => {
    const team = getTeamById(teamId);
    const isCinematic = cameraMode === "cinematic" || cameraMode === "sideProfile";
    if (!team) return;

    const teamColor = new THREE.Color(team.primaryColor);
    // Desaturated, lighter version for the wall wash
    const wallColor = teamColor.clone().lerp(new THREE.Color(0xc8d4e8), 0.55);
    // Brighter version for the rim strip
    const stripColor = teamColor.clone().lerp(new THREE.Color(0xffffff), 0.3);

    needsRenderRef.current = true;

    // Animate rim strip to team color (or back to neutral)
    const targetStrip = isCinematic ? stripColor : new THREE.Color(0xeef2ff);
    const targetGlow = isCinematic
      ? teamColor.clone().lerp(new THREE.Color(0xc0c8d8), 0.5)
      : new THREE.Color(0xc0c8d8);
    const targetHalo = isCinematic
      ? teamColor.clone().lerp(new THREE.Color(0x909aac), 0.65)
      : new THREE.Color(0x909aac);

    if (rimStripMatRef.current) {
      gsap.to(rimStripMatRef.current.color, {
        r: targetStrip.r,
        g: targetStrip.g,
        b: targetStrip.b,
        duration: 1.0,
        ease: "power2.inOut",
        onUpdate: () => {
          needsRenderRef.current = true;
        },
      });
    }
    if (rimGlowMatRef.current) {
      gsap.to(rimGlowMatRef.current.color, {
        r: targetGlow.r,
        g: targetGlow.g,
        b: targetGlow.b,
        duration: 1.0,
        ease: "power2.inOut",
      });
    }
    if (rimHaloMatRef.current) {
      gsap.to(rimHaloMatRef.current.color, {
        r: targetHalo.r,
        g: targetHalo.g,
        b: targetHalo.b,
        duration: 1.0,
        ease: "power2.inOut",
      });
    }

    // Animate key light + rim light color
    const targetKey = isCinematic ? wallColor : new THREE.Color(0xc8d4e8);
    const targetRim = isCinematic
      ? teamColor.clone().lerp(new THREE.Color(0xe0e8f0), 0.4)
      : new THREE.Color(0xe0e8f0);

    if (keyLightRef.current) {
      gsap.to(keyLightRef.current.color, {
        r: targetKey.r,
        g: targetKey.g,
        b: targetKey.b,
        duration: 1.0,
        ease: "power2.inOut",
        onUpdate: () => {
          needsRenderRef.current = true;
        },
      });
    }
    if (rimLightRef.current) {
      gsap.to(rimLightRef.current.color, {
        r: targetRim.r,
        g: targetRim.g,
        b: targetRim.b,
        duration: 1.0,
        ease: "power2.inOut",
      });
    }

    // Load and display team logo on wall
    const logoMesh = logoMeshRef.current;
    if (!logoMesh) return;
    const mat = logoMesh.material as THREE.MeshBasicMaterial;

    if (!isCinematic) {
      // Fade out logo in top-down mode
      gsap.to(mat, {
        opacity: 0,
        duration: 0.6,
        onUpdate: () => {
          needsRenderRef.current = true;
        },
      });
      return;
    }

    // Load new team logo, then transition: fade out old → swap → fade in new
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const size = 512;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const scale = Math.min(size / img.width, size / img.height) * 0.7;
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;

      const hasExisting = mat.opacity > 0.01;
      const tl = gsap.timeline({
        onUpdate: () => {
          needsRenderRef.current = true;
        },
      });

      if (hasExisting) {
        // Fade out + scale down old logo
        tl.to(mat, { opacity: 0, duration: 0.35, ease: "power2.in" });
        tl.to(
          logoMesh.scale,
          { x: 0.85, y: 0.85, duration: 0.35, ease: "power2.in" },
          "<",
        );
        tl.call(() => {
          logoTextureRef.current?.dispose();
          logoTextureRef.current = tex;
          mat.map = tex;
          mat.needsUpdate = true;
        });
      } else {
        // First appearance — just set the texture, start scaled down
        logoTextureRef.current?.dispose();
        logoTextureRef.current = tex;
        mat.map = tex;
        mat.needsUpdate = true;
        logoMesh.scale.set(0.85, 0.85, 1);
        tl.delay(0.4);
      }

      // Fade in + scale up new logo
      tl.to(mat, { opacity: 0.55, duration: 0.6, ease: "power2.out" });
      tl.to(
        logoMesh.scale,
        { x: 1, y: 1, duration: 0.6, ease: "power2.out" },
        "<",
      );
    };
    img.src = team.logoPath;
  }, [teamId, cameraMode]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full ${className}`}
      style={{ touchAction: "none" }}
    />
  );
};

export default TopDownCarShowcase;
