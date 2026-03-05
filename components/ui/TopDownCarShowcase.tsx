"use client";

import { type FC, useEffect, useRef } from "react";
import * as THREE from "three";
import { cloneCachedScene, isModelCached } from "@/lib/modelPreloader";
import { getAllModelPaths, getTeamCarModelPath } from "@/data/teamCarModels";
import { gsap } from "@/lib/gsap";
import {
  collectWheelSpinTargets,
  spinWheelTargets,
  WHEEL_BASE_ANGULAR_SPEED,
  type WheelSpinTarget,
} from "@/lib/wheelUtils";

interface TopDownCarShowcaseProps {
  teamId: string;
  className?: string;
}

interface CarState {
  group: THREE.Group;
  wheelTargets: WheelSpinTarget[];
}

const TopDownCarShowcase: FC<TopDownCarShowcaseProps> = ({
  teamId,
  className = "",
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

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111113);
    scene.fog = new THREE.FogExp2(0x111113, 0.006);
    sceneRef.current = scene;

    // Camera — bird's-eye view looking straight down
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      200
    );
    camera.position.set(0, 18, 2);
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
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Ground plane — dark charcoal
    const groundGeometry = new THREE.PlaneGeometry(120, 120);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x141416,
      roughness: 0.35,
      metalness: 0.5,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    // === Grid Box — clean single-line rectangle ===
    const gridBoxGroup = new THREE.Group();
    gridBoxGroup.position.y = 0.02;

    const lineMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.12,
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
    gridBoxGroup.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(bracketPts), lineMat
    ));

    scene.add(gridBoxGroup);

    // === Angled Lighting ===
    const ambientLight = new THREE.AmbientLight(0xc8d0e0, 0.35);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xd0d8f0, 0x060608, 0.4);
    scene.add(hemiLight);

    // Key light — angled from front-left
    const keyLight = new THREE.SpotLight(0xeef4ff, 55);
    keyLight.position.set(-10, 14, -6);
    keyLight.target.position.set(0, 0, 0);
    keyLight.angle = Math.PI / 4;
    keyLight.penumbra = 0.8;
    keyLight.decay = 1.3;
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 4;
    keyLight.shadow.camera.far = 40;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);
    scene.add(keyLight.target);

    // Fill light — from rear-right
    const fillLight = new THREE.SpotLight(0xfff0e0, 20);
    fillLight.position.set(8, 12, 5);
    fillLight.target.position.set(0, 0, 0);
    fillLight.angle = Math.PI / 3.5;
    fillLight.penumbra = 1.0;
    fillLight.decay = 1.5;
    scene.add(fillLight);
    scene.add(fillLight.target);

    // Rim light — from behind
    const rimLight = new THREE.SpotLight(0xd0e0ff, 30);
    rimLight.position.set(6, 10, -4);
    rimLight.target.position.set(-2, 0, 0);
    rimLight.angle = Math.PI / 5;
    rimLight.penumbra = 0.7;
    rimLight.decay = 1.4;
    scene.add(rimLight);
    scene.add(rimLight.target);

    // Left key — angled RectArea
    const keyLeft = new THREE.RectAreaLight(0xdde6ff, 5, 6, 3);
    keyLeft.position.set(-7, 6, -4);
    keyLeft.lookAt(0, 0, 0);
    scene.add(keyLeft);

    // Right fill — softer, warmer
    const keyRight = new THREE.RectAreaLight(0xfff0dd, 3, 6, 3);
    keyRight.position.set(6, 7, 3);
    keyRight.lookAt(0, 0, 0);
    scene.add(keyRight);

    // Render loop — only renders when needed
    const animate = (timestamp: number) => {
      rafRef.current = requestAnimationFrame(animate);

      if (!needsRenderRef.current && !isAnimatingRef.current) return;

      const delta = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 1000 : 0.016;
      lastTimeRef.current = timestamp;

      // Spin wheels while animating (car in motion)
      if (isAnimatingRef.current) {
        const car = currentCarRef.current;
        if (car && car.wheelTargets.length > 0) {
          const spinRadians = WHEEL_BASE_ANGULAR_SPEED * delta;
          spinWheelTargets(car.wheelTargets, spinRadians);
        }
      }

      renderer.render(scene, camera);

      // After one idle frame, stop rendering
      if (!isAnimatingRef.current) {
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
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
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
      -scaledBox.min.y,
      -scaledCenter.z
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
        onUpdate: () => { needsRenderRef.current = true; },
        onComplete,
      });
    } else {
      const tl = gsap.timeline({
        onUpdate: () => { needsRenderRef.current = true; },
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
        0.3
      );
    }
  }

  return (
    <div
      ref={containerRef}
      className={`w-full h-full ${className}`}
      style={{ touchAction: "none" }}
    />
  );
};

export default TopDownCarShowcase;
