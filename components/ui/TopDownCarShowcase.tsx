"use client";

import { type FC, useEffect, useRef } from "react";
import * as THREE from "three";
import { cloneCachedScene, isModelCached } from "@/lib/modelPreloader";
import { getTeamCarModelPath } from "@/data/teamCarModels";
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
  const prevTeamIdRef = useRef<string | null>(null);
  const isTransitioningRef = useRef(false);
  const needsRenderRef = useRef(true);
  const lastTimeRef = useRef(0);
  const isAnimatingRef = useRef(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x0a0805, 0.007);
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
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Ground plane — polished pit garage floor
    const groundGeometry = new THREE.PlaneGeometry(120, 120);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x0e0c0a,
      roughness: 0.2,
      metalness: 0.75,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    // Subtle grid — clean garage floor markings
    const gridHelper = new THREE.GridHelper(60, 120, 0x1a1510, 0x110e0a);
    gridHelper.position.y = 0;
    (gridHelper.material as THREE.Material).opacity = 0.25;
    (gridHelper.material as THREE.Material).transparent = true;
    scene.add(gridHelper);

    // === Grid Walk Lighting — dusk floodlights before lights out ===

    // Warm ambient — sunset glow bleeding across the circuit
    const ambientLight = new THREE.AmbientLight(0xffc880, 0.35);
    scene.add(ambientLight);

    // Hemisphere — amber sky above, dark tarmac bounce below
    const hemiLight = new THREE.HemisphereLight(0xffb060, 0x1a0e05, 0.45);
    scene.add(hemiLight);

    // Main floodlight — powerful amber overhead, like circuit tower lights
    const mainFlood = new THREE.SpotLight(0xffb347, 55);
    mainFlood.position.set(0, 20, 0);
    mainFlood.target.position.set(0, 0, 0);
    mainFlood.angle = Math.PI / 3;
    mainFlood.penumbra = 0.9;
    mainFlood.decay = 1.1;
    mainFlood.castShadow = true;
    mainFlood.shadow.mapSize.width = 1024;
    mainFlood.shadow.mapSize.height = 1024;
    mainFlood.shadow.camera.near = 5;
    mainFlood.shadow.camera.far = 40;
    mainFlood.shadow.bias = -0.001;
    scene.add(mainFlood);
    scene.add(mainFlood.target);

    // Secondary flood — offset, slightly cooler amber for depth
    const secondFlood = new THREE.SpotLight(0xffa030, 30);
    secondFlood.position.set(3, 17, -5);
    secondFlood.target.position.set(0, 0, -1);
    secondFlood.angle = Math.PI / 4;
    secondFlood.penumbra = 1.0;
    secondFlood.decay = 1.3;
    scene.add(secondFlood);
    scene.add(secondFlood.target);

    // Left key — warm amber panel light, like trackside floodlight bank
    const keyLeft = new THREE.RectAreaLight(0xffcc70, 5, 8, 3);
    keyLeft.position.set(-8, 8, 0);
    keyLeft.lookAt(0, 0, 0);
    scene.add(keyLeft);

    // Right key — slightly warmer to break symmetry
    const keyRight = new THREE.RectAreaLight(0xffc060, 4, 8, 3);
    keyRight.position.set(8, 7, 1);
    keyRight.lookAt(0, 0, 0);
    scene.add(keyRight);

    // Hazy lens flare accent — warm point high up, simulates
    // light scattering through humid dusk air
    const flarePt = new THREE.PointLight(0xffdd88, 8);
    flarePt.position.set(1, 22, -1);
    flarePt.decay = 1.5;
    scene.add(flarePt);

    // Subtle deep orange kick from low angle — brake glow / tarmac heat
    const heatKick = new THREE.PointLight(0xff7030, 2.5);
    heatKick.position.set(-4, 2, 4);
    scene.add(heatKick);

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
    };
  }, []);

  // Handle team changes — drive cars in/out
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (teamId === prevTeamIdRef.current) return;

    const modelPath = getTeamCarModelPath(teamId);

    // If model isn't cached yet, poll until ready
    if (!isModelCached(modelPath)) {
      // Clear any existing poll
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

  function disposeCar(scene: THREE.Scene, car: CarState) {
    scene.remove(car.group);
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
    // Car models face +Z by default; rotate -90deg around Y to face -X
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

  function swapCar(scene: THREE.Scene, newTeamId: string, modelPath: string) {
    const isFirstLoad = prevTeamIdRef.current === null;
    prevTeamIdRef.current = newTeamId;

    if (isTransitioningRef.current && !isFirstLoad) return;
    isTransitioningRef.current = true;
    isAnimatingRef.current = true;
    needsRenderRef.current = true;

    const newCarState = prepareCar(modelPath);
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
    currentCarRef.current = newCarState;

    const onComplete = () => {
      isTransitioningRef.current = false;
      isAnimatingRef.current = false;
      // Render one final frame then stop
      needsRenderRef.current = true;
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
      // Also spin old car wheels during exit
      const oldWheelTargets = oldCar.wheelTargets;

      const tl = gsap.timeline({
        onUpdate: () => { needsRenderRef.current = true; },
        onComplete: () => {
          disposeCar(scene, oldCar);
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
