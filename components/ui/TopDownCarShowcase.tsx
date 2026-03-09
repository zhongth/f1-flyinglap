"use client";

import { type FC, useEffect, useEffectEvent, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { getAllModelPaths, getTeamCarModelPath } from "@/data/teamCarModels";
import { getTeamById } from "@/data/teams";
import { gsap } from "@/lib/gsap";
import { cloneCachedScene, isModelCached } from "@/lib/modelPreloader";
import {
  collectWheelSpinTargets,
  spinWheelTargets,
  WHEEL_BASE_ANGULAR_SPEED,
  type WheelSpinTarget,
} from "@/lib/wheelUtils";
import { WindTunnelEffect } from "@/lib/windTunnelEffect";
import { useAppStore, type CameraMode } from "@/store/useAppStore";

/* Camera presets keyed by mode */
const CAMERA_CONFIGS = {
  topDown: {
    position: { x: 0, y: 18, z: 0 },
    lookAt: { x: 0, y: 0, z: 0 },
    up: { x: 0, y: 0, z: -1 },
    bgColor: new THREE.Color(0x1c1c1e),
    fogColor: new THREE.Color(0x1c1c1e),
    fogDensity: 0.016,
  },
  cinematic: {
    position: { x: -12, y: 3, z: 8 },
    lookAt: { x: 1, y: 1.2, z: -2 },
    up: { x: 0, y: 1, z: 0 },
    bgColor: new THREE.Color(0x08080a),
    fogColor: new THREE.Color(0x20262f),
    fogDensity: 0.026,
  },
  sideProfile: {
    position: { x: 0, y: 1.2, z: 16 },
    lookAt: { x: 0, y: 5.2, z: -2 },
    up: { x: 0, y: 1, z: 0 },
    bgColor: new THREE.Color(0x0a0a0c),
    fogColor: new THREE.Color(0x1e242c),
    fogDensity: 0.024,
  },
} as const;

const CAMERA_TRANSITION_DURATION = 1.4;
const STAGE_WORLD_SIZE = 220;
const STAGE_CYCLO_WIDTH = 220;
const STAGE_CYCLO_WALL_Z = -44;
const STAGE_CYCLO_RADIUS = 16;
const STAGE_CYCLO_WALL_HEIGHT = 34;
const STAGE_CYCLO_ENTRY_Z = STAGE_CYCLO_WALL_Z + STAGE_CYCLO_RADIUS;
const STAGE_SIDE_CYCLO_X = 74;

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
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
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
  onCarSwapStart?: () => void;
  onCarSwapComplete?: () => void;
}

interface CarState {
  group: THREE.Group;
  wheelTargets: WheelSpinTarget[];
}

/** Panel light dimensions for the F1 garage overhead light */
const PANEL_WIDTH = 28;
const PANEL_DEPTH = 16;
const PANEL_HEIGHT = 20;

function disposeCar(car: CarState) {
  car.group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((material: THREE.Material) => {
          material.dispose();
        });
      } else {
        child.material.dispose();
      }
    }
  });
}


const TopDownCarShowcase: FC<TopDownCarShowcaseProps> = ({
  teamId,
  className = "",
  cameraMode = "topDown",
  onCameraTransitionComplete,
  onCarSwapStart,
  onCarSwapComplete,
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
  const wheelAngularSpeedRef = useRef(0);
  const prevCarXRef = useRef<number | null>(null);
  const outgoingCarRef = useRef<CarState | null>(null);
  const prevOutgoingXRef = useRef<number | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const windTunnelRef = useRef<WindTunnelEffect | null>(null);
  const windTweenRef = useRef<gsap.core.Tween | null>(null);
  const speedReadoutRef = useRef<HTMLDivElement>(null);

  // Object pool: pre-prepared cars keyed by model path
  const carPoolRef = useRef<Map<string, CarState>>(new Map());
  const warmUpDoneRef = useRef(false);

  // Camera animation state
  const lookAtRef = useRef(new THREE.Vector3(0, 0, 0));
  const isCameraAnimatingRef = useRef(false);
  const cameraModeRef = useRef<CameraMode>(cameraMode);
  const cameraTlRef = useRef<gsap.core.Timeline | null>(null);
  const onCameraCompleteRef = useRef(onCameraTransitionComplete);
  onCameraCompleteRef.current = onCameraTransitionComplete;
  const onCarSwapStartRef = useRef(onCarSwapStart);
  onCarSwapStartRef.current = onCarSwapStart;
  const onCarSwapCompleteRef = useRef(onCarSwapComplete);
  onCarSwapCompleteRef.current = onCarSwapComplete;

  // Dynamic environment refs (team-colored)
  const groundMatRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const cycloramaMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const rimStripMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const rimGlowMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const rimHaloMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const panelLightRef = useRef<THREE.SpotLight | null>(null);
  const panelMeshMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const logoMeshRef = useRef<THREE.Mesh | null>(null);
  const logoTextureRef = useRef<THREE.CanvasTexture | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

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
    camera.up.set(0, 0, -1);
    camera.position.set(0, 18, 0);
    camera.lookAt(0, 0, 0);
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
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Ground plane — smooth dark studio floor
    const groundGeometry = new THREE.PlaneGeometry(
      STAGE_WORLD_SIZE,
      STAGE_WORLD_SIZE,
    );
    const groundMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1e1e22,
      roughness: 0.55,
      metalness: 0.03,
      clearcoat: 0.12,
      clearcoatRoughness: 0.5,
    });
    groundMatRef.current = groundMaterial;
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);

    // === Vignette overlay — darkens edges for studio light-pool effect ===
    {
      const vignetteSize = 50;
      const vignetteCanvas = document.createElement("canvas");
      vignetteCanvas.width = 512;
      vignetteCanvas.height = 512;
      const vCtx = vignetteCanvas.getContext("2d");
      if (vCtx) {
        const grad = vCtx.createRadialGradient(256, 256, 0, 256, 256, 256);
        grad.addColorStop(0, "rgba(0, 0, 0, 0)");
        grad.addColorStop(0.3, "rgba(0, 0, 0, 0)");
        grad.addColorStop(0.5, "rgba(0, 0, 0, 0.12)");
        grad.addColorStop(0.7, "rgba(0, 0, 0, 0.35)");
        grad.addColorStop(0.85, "rgba(0, 0, 0, 0.6)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0.8)");
        vCtx.fillStyle = grad;
        vCtx.fillRect(0, 0, 512, 512);
      }
      const vignetteTex = new THREE.CanvasTexture(vignetteCanvas);
      const vignetteMat = new THREE.MeshBasicMaterial({
        map: vignetteTex,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      });
      const vignetteMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(vignetteSize, vignetteSize),
        vignetteMat,
      );
      vignetteMesh.rotation.x = -Math.PI / 2;
      vignetteMesh.position.y = 0.015;
      scene.add(vignetteMesh);
    }

    // === Grid Box — commented out for clean studio look ===
    // const gridBoxGroup = new THREE.Group();
    // gridBoxGroup.position.y = 0.02;
    // const bracketX = -6.0;
    // const armLen = 2.8;
    // const halfWid = 2.6;
    // const gridLineLayerCount = 8;
    // const gridLineInsetStep = 0.003;
    // const gridLineLayers = Array.from(
    //   { length: gridLineLayerCount },
    //   (_, index) => ({
    //     inset: index * gridLineInsetStep,
    //     opacity: THREE.MathUtils.lerp(0.24, 0.1, index / (gridLineLayerCount - 1)),
    //   }),
    // );
    // for (const [index, layer] of gridLineLayers.entries()) {
    //   const bracketPts = [
    //     new THREE.Vector3(bracketX + armLen - layer.inset, index * 0.0002, -(halfWid - layer.inset)),
    //     new THREE.Vector3(bracketX + layer.inset, index * 0.0002, -(halfWid - layer.inset)),
    //     new THREE.Vector3(bracketX + layer.inset, index * 0.0002, halfWid - layer.inset),
    //     new THREE.Vector3(bracketX + armLen - layer.inset, index * 0.0002, halfWid - layer.inset),
    //   ];
    //   gridBoxGroup.add(
    //     new THREE.Line(
    //       new THREE.BufferGeometry().setFromPoints(bracketPts),
    //       new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: layer.opacity }),
    //     ),
    //   );
    // }
    // scene.add(gridBoxGroup);

    // === Studio Environment — cyclorama + LED panel + rim light strip ===
    const backCycloramaWidth = STAGE_CYCLO_WIDTH;
    const sideCycloramaWidth = STAGE_CYCLO_WIDTH;

    // Back cyclorama: larger stage envelope so the wall reads farther away.
    const cycGeo = createCycloramaGeometry(
      STAGE_CYCLO_WALL_Z,
      STAGE_CYCLO_RADIUS,
      STAGE_CYCLO_WALL_HEIGHT,
      backCycloramaWidth,
    );
    const cycMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a30,
      roughness: 0.82,
      metalness: 0.06,
      side: THREE.DoubleSide,
    });
    cycloramaMatRef.current = cycMat;
    const cyclorama = new THREE.Mesh(cycGeo, cycMat);
    cyclorama.receiveShadow = true;
    scene.add(cyclorama);

    // Side cyclorama (wraps around the +X side, visible on left of cinematic frame)
    const sideCycGeo = createCycloramaGeometry(
      STAGE_CYCLO_WALL_Z,
      STAGE_CYCLO_RADIUS,
      STAGE_CYCLO_WALL_HEIGHT,
      sideCycloramaWidth,
    );
    const sideCyc = new THREE.Mesh(sideCycGeo, cycMat);
    sideCyc.receiveShadow = true;
    sideCyc.rotation.y = -Math.PI / 2;
    sideCyc.position.set(STAGE_SIDE_CYCLO_X, 0, 0);
    scene.add(sideCyc);

    // Rim light strip — bright emissive bar at base of back wall
    const rimStripGeo = new THREE.PlaneGeometry(148, 0.18);
    const rimStripMat = new THREE.MeshBasicMaterial({
      color: 0xeef2ff,
      transparent: true,
      opacity: 0.92,
      toneMapped: false,
    });
    rimStripMatRef.current = rimStripMat;
    const rimStrip = new THREE.Mesh(rimStripGeo, rimStripMat);
    rimStrip.position.set(2, 0.08, STAGE_CYCLO_ENTRY_Z - 0.05);
    scene.add(rimStrip);

    // Soft glow plane behind rim strip (wider bloom effect)
    const rimGlowGeo = new THREE.PlaneGeometry(182, 2.8);
    const rimGlowMat = new THREE.MeshBasicMaterial({
      color: 0xc0c8d8,
      transparent: true,
      opacity: 0.22,
      toneMapped: false,
    });
    rimGlowMatRef.current = rimGlowMat;
    const rimGlow = new THREE.Mesh(rimGlowGeo, rimGlowMat);
    rimGlow.position.set(2, 0.06, STAGE_CYCLO_ENTRY_Z);
    scene.add(rimGlow);

    // Secondary glow halo (very wide, subtle)
    const rimHaloGeo = new THREE.PlaneGeometry(210, 7.5);
    const rimHaloMat = new THREE.MeshBasicMaterial({
      color: 0x909aac,
      transparent: true,
      opacity: 0.08,
      toneMapped: false,
    });
    rimHaloMatRef.current = rimHaloMat;
    const rimHalo = new THREE.Mesh(rimHaloGeo, rimHaloMat);
    rimHalo.position.set(2, 0.04, STAGE_CYCLO_ENTRY_Z + 0.2);
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
    logoMesh.position.set(0, 9.5, -11);
    logoMeshRef.current = logoMesh;
    scene.add(logoMesh);

    // === Lighting — F1 garage overhead panel ===

    // Soft ambient to fill shadows and prevent pure-black undersides
    const ambientLight = new THREE.AmbientLight(0xe0e0e0, 0.2);
    scene.add(ambientLight);

    // Hemisphere light for natural, soft fill (reduces harsh shadow contrast)
    const hemiLight = new THREE.HemisphereLight(0x2a2a30, 0x0a0a0e, 0.18);
    scene.add(hemiLight);

    // Main panel SpotLight — wide, soft, overhead (simulates large panel)
    const panelLight = new THREE.SpotLight(0xf0f0f0, 120);
    panelLight.position.set(0, PANEL_HEIGHT, -2);
    panelLight.target.position.set(0, 0, -2);
    panelLight.angle = Math.PI / 2.2;
    panelLight.penumbra = 0.88;
    panelLight.decay = 1.2;
    panelLight.distance = 50;
    panelLight.castShadow = true;
    panelLight.shadow.mapSize.width = 4096;
    panelLight.shadow.mapSize.height = 4096;
    panelLight.shadow.radius = 20;
    panelLight.shadow.bias = -0.0001;
    panelLight.shadow.normalBias = 0.02;
    const shadowCam = panelLight.shadow
      .camera as THREE.PerspectiveCamera;
    shadowCam.near = 4;
    shadowCam.far = PANEL_HEIGHT + 4;
    panelLightRef.current = panelLight;
    scene.add(panelLight);
    scene.add(panelLight.target);

    // Visible panel mesh (emissive white rectangle — shows up in scene + reflections)
    const panelMeshMat = new THREE.MeshBasicMaterial({
      color: 0xf0f0f0,
      toneMapped: false,
      side: THREE.FrontSide,
    });
    panelMeshMatRef.current = panelMeshMat;
    const panelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(PANEL_WIDTH, PANEL_DEPTH),
      panelMeshMat,
    );
    panelMesh.position.set(0, PANEL_HEIGHT - 0.01, -2);
    panelMesh.rotation.x = Math.PI / 2;
    scene.add(panelMesh);

    // Wind tunnel smoke effect
    const windTunnel = new WindTunnelEffect();
    scene.add(windTunnel.mesh);
    windTunnelRef.current = windTunnel;

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

      // Spin wheels — velocity-coupled while car moves, then coast-to-stop
      const car = currentCarRef.current;
      if (car && car.wheelTargets.length > 0) {
        const carX = car.group.position.x;

        if (isAnimatingRef.current) {
          // Derive wheel speed from the car's linear velocity
          if (prevCarXRef.current !== null) {
            const linearSpeed = Math.abs(carX - prevCarXRef.current) / delta;
            wheelAngularSpeedRef.current =
              (linearSpeed / 35) * WHEEL_BASE_ANGULAR_SPEED;
          }
          prevCarXRef.current = carX;
        } else if (wheelAngularSpeedRef.current > 0.05) {
          // Car stopped — wheels decelerate like braking friction
          wheelAngularSpeedRef.current *= Math.exp(-4 * delta);
          needsRenderRef.current = true;
        } else {
          wheelAngularSpeedRef.current = 0;
          prevCarXRef.current = null;
        }

        if (wheelAngularSpeedRef.current > 0) {
          spinWheelTargets(
            car.wheelTargets,
            wheelAngularSpeedRef.current * delta,
          );
        }
      }

      // Spin outgoing car's wheels (accelerating out)
      const outgoing = outgoingCarRef.current;
      if (outgoing && outgoing.wheelTargets.length > 0) {
        const outX = outgoing.group.position.x;
        if (prevOutgoingXRef.current !== null) {
          const linearSpeed = Math.abs(outX - prevOutgoingXRef.current) / delta;
          const spinRadians =
            (linearSpeed / 35) * WHEEL_BASE_ANGULAR_SPEED * delta;
          spinWheelTargets(outgoing.wheelTargets, spinRadians);
        }
        prevOutgoingXRef.current = outX;
      }

      // Wind tunnel particles
      const wt = windTunnelRef.current;
      if (wt) {
        wt.update(delta);
        if (wt.isActive) needsRenderRef.current = true;
      }

      renderer.render(scene, camera);

      // After one idle frame, stop rendering (keep going while wheels decelerate)
      if (
        !isAnimatingRef.current &&
        !isCameraAnimatingRef.current &&
        wheelAngularSpeedRef.current <= 0.05 &&
        !(wt && wt.isActive)
      ) {
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

      windTweenRef.current?.kill();
      windTunnelRef.current?.dispose();
      windTunnelRef.current = null;
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
              m.roughnessMap?.dispose();
              m.bumpMap?.dispose();
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
      -scaledBox.min.y - 0.29,
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

  const swapCar = useEffectEvent(
    (scene: THREE.Scene, newTeamId: string, modelPath: string) => {
      const isFirstLoad = prevTeamIdRef.current === null;
      prevTeamIdRef.current = newTeamId;

      if (isTransitioningRef.current && !isFirstLoad) return;
      isTransitioningRef.current = true;
      isAnimatingRef.current = true;
      needsRenderRef.current = true;
      onCarSwapStartRef.current?.();

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
      prevCarXRef.current = null;
      outgoingCarRef.current = oldCar;
      prevOutgoingXRef.current = null;

      const onComplete = () => {
        isTransitioningRef.current = false;
        isAnimatingRef.current = false;
        needsRenderRef.current = true;
        onCarSwapCompleteRef.current?.();

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
            outgoingCarRef.current = null;
            prevOutgoingXRef.current = null;
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
    },
  );

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
          const pollInterval = pollIntervalRef.current;
          if (pollInterval) {
            clearInterval(pollInterval);
            pollIntervalRef.current = null;
          }
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
  }, [teamId, swapCar]);

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

    // Camera up vector (avoids gimbal lock when looking straight down)
    tl.to(
      camera.up,
      {
        x: config.up.x,
        y: config.up.y,
        z: config.up.z,
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
    const isCinematic =
      cameraMode === "cinematic" || cameraMode === "sideProfile";
    if (!team) return;

    const teamColor = new THREE.Color(team.primaryColor);
    const stripColor = teamColor.clone().lerp(new THREE.Color(0xffffff), 0.3);

    // Tint wind tunnel beams toward team color
    if (windTunnelRef.current) {
      windTunnelRef.current.setTeamColor(teamColor);
    }

    needsRenderRef.current = true;

    // Animate rim strip to team color (or back to neutral)
    const targetStrip = isCinematic ? stripColor : new THREE.Color(0xeef2ff);
    const targetGlow = isCinematic
      ? teamColor.clone().lerp(new THREE.Color(0xc0c8d8), 0.5)
      : new THREE.Color(0xc0c8d8);
    const targetHalo = isCinematic
      ? teamColor.clone().lerp(new THREE.Color(0x909aac), 0.65)
      : new THREE.Color(0x909aac);
    const targetGround = new THREE.Color(0x1e1e22).lerp(
      teamColor.clone().multiplyScalar(0.15),
      isCinematic ? 0.12 : 0.04,
    );
    const targetCyclorama = new THREE.Color(0x2a2a30).lerp(
      teamColor.clone().multiplyScalar(0.55),
      isCinematic ? 0.28 : 0.1,
    );

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
    if (groundMatRef.current) {
      gsap.to(groundMatRef.current.color, {
        r: targetGround.r,
        g: targetGround.g,
        b: targetGround.b,
        duration: 1.0,
        ease: "power2.inOut",
        onUpdate: () => {
          needsRenderRef.current = true;
        },
      });
    }
    if (cycloramaMatRef.current) {
      gsap.to(cycloramaMatRef.current.color, {
        r: targetCyclorama.r,
        g: targetCyclorama.g,
        b: targetCyclorama.b,
        duration: 1.0,
        ease: "power2.inOut",
        onUpdate: () => {
          needsRenderRef.current = true;
        },
      });
    }

    // Subtly tint the panel light toward team color in cinematic mode
    const targetPanel = isCinematic
      ? teamColor.clone().lerp(new THREE.Color(0xf0f0f0), 0.7)
      : new THREE.Color(0xf0f0f0);
    if (panelLightRef.current) {
      gsap.to(panelLightRef.current.color, {
        r: targetPanel.r,
        g: targetPanel.g,
        b: targetPanel.b,
        duration: 1.0,
        ease: "power2.inOut",
        onUpdate: () => {
          needsRenderRef.current = true;
        },
      });
    }
    if (panelMeshMatRef.current) {
      gsap.to(panelMeshMatRef.current.color, {
        r: targetPanel.r,
        g: targetPanel.g,
        b: targetPanel.b,
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

  /* ── Wind tunnel button handlers ── */
  const [isWindActive, setIsWindActive] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const isExpanded = isButtonHovered || isWindActive;

  const handleWindStart = () => {
    const wt = windTunnelRef.current;
    if (!wt) return;
    setIsWindActive(true);
    useAppStore.getState().setIsWindTunnelActive(true);
    wt.start();
    needsRenderRef.current = true;
    windTweenRef.current?.kill();
    windTweenRef.current = gsap.to(wt, {
      windStrength: 1,
      duration: 0.6,
      ease: "power2.out",
      onUpdate: () => {
        needsRenderRef.current = true;
        if (speedReadoutRef.current)
          speedReadoutRef.current.textContent = `${wt.windSpeedKmh} km/h`;
      },
    });
  };

  const handleWindStop = () => {
    const wt = windTunnelRef.current;
    if (!wt) return;
    setIsWindActive(false);
    useAppStore.getState().setIsWindTunnelActive(false);
    windTweenRef.current?.kill();
    windTweenRef.current = gsap.to(wt, {
      windStrength: 0,
      duration: 1.2,
      ease: "power3.in",
      onUpdate: () => {
        needsRenderRef.current = true;
        if (speedReadoutRef.current)
          speedReadoutRef.current.textContent = `${wt.windSpeedKmh} km/h`;
      },
      onComplete: () => {
        wt.stop();
      },
    });
  };

  return (
    <div
      className={`w-full h-full relative ${className}`}
      style={{ touchAction: "none" }}
    >
      <div ref={containerRef} className="absolute inset-0" />

      {/* Wind Tunnel — portaled to body so it escapes the z-0 stacking context */}
      {createPortal(
        <div
          onMouseEnter={() => setIsButtonHovered(true)}
          onMouseLeave={() => { if (!isWindActive) setIsButtonHovered(false); }}
          className="fixed left-0 top-1/2 -translate-y-1/2"
          style={{ zIndex: 90, padding: "28px" }}
        >
          <button
            type="button"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              handleWindStart();
            }}
            onPointerUp={() => { handleWindStop(); setIsButtonHovered(false); }}
            onPointerCancel={() => { handleWindStop(); setIsButtonHovered(false); }}
            onLostPointerCapture={() => { handleWindStop(); setIsButtonHovered(false); }}
            onContextMenu={(e) => e.preventDefault()}
            className="select-none cursor-pointer flex items-center justify-center"
            style={{
              touchAction: "none",
              background: "none",
              border: "none",
              padding: 0,
              color: isWindActive ? "#93c5fd" : "rgba(255,255,255,0.35)",
              transition: "color 0.3s ease, transform 0.3s ease, filter 0.3s ease",
              transform: isExpanded ? "translateX(6px) scale(1.15)" : "translateX(0) scale(1)",
              filter: isWindActive
                ? "drop-shadow(0 0 12px rgba(59,130,246,0.5))"
                : isExpanded
                  ? "drop-shadow(0 0 6px rgba(255,255,255,0.15))"
                  : "none",
            }}
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              className="pointer-events-none"
            >
              <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
              <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
              <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
            </svg>
          </button>
          {/* Tooltip — appears to the right of the icon on hover */}
          <div
            className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 text-[11px] tracking-wide text-white/40 whitespace-nowrap"
            style={{
              opacity: isExpanded && !isWindActive ? 1 : 0,
              transform: `translateY(-50%) translateX(${isExpanded && !isWindActive ? "0" : "-6px"})`,
              transition: "opacity 0.25s ease, transform 0.25s ease",
            }}
          >
            Hold
          </div>
          {/* Speed readout — appears on hover/active */}
          <div
            ref={speedReadoutRef}
            className="text-xs font-mono font-bold tabular-nums tracking-tight text-center mt-1.5 pointer-events-none"
            style={{
              color: isWindActive ? "#93c5fd" : "rgba(255,255,255,0.3)",
              opacity: isExpanded ? 1 : 0,
              transition: "opacity 0.3s ease, color 0.3s ease",
            }}
          >
            0 km/h
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};

export default TopDownCarShowcase;
