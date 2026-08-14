import * as THREE from "three";
import { getRendererPixelRatio } from "./capabilities.js";
import { DEFAULT_JOURNEY_POINTS, sampleJourneyPath, toJourneyVectors } from "./journeyPath.js";

const ROUTE_SAMPLES = 180;

function disposeMaterial(material, disposedResources) {
  if (!material) return;
  const materials = Array.isArray(material) ? material : [material];
  materials.forEach((entry) => {
    if (entry.map && !disposedResources.has(entry.map)) {
      entry.map.dispose?.();
      disposedResources.add(entry.map);
    }
    if (!disposedResources.has(entry)) {
      entry.dispose?.();
      disposedResources.add(entry);
    }
  });
}

function createTerrain() {
  const geometry = new THREE.PlaneGeometry(15, 9, 48, 30);
  const positions = geometry.attributes.position;
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const edgeFade = Math.max(0.2, 1 - Math.pow(Math.abs(x) / 8, 3));
    const elevation = (
      Math.sin(x * 0.72) * 0.13
      + Math.cos(y * 1.08) * 0.1
      + Math.sin((x + y) * 1.5) * 0.045
    ) * edgeFade;
    positions.setZ(index, elevation);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    color: 0xdcefdc,
    roughness: 0.94,
    metalness: 0.02
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}

function createAircraft() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.44, 5),
    new THREE.MeshStandardMaterial({ color: 0xff6b4a, roughness: 0.48 })
  );
  body.rotation.z = -Math.PI / 2;
  const wing = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.46, 0.035),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 })
  );
  group.add(body, wing);
  group.scale.setScalar(0.92);
  return group;
}

export function createLivingAtlas(container, options = {}) {
  if (!container) throw new Error("Living Atlas requires a container.");

  const {
    points = DEFAULT_JOURNEY_POINTS,
    textureUrl,
    onReady,
    onFailure,
    rendererFactory = (settings) => new THREE.WebGLRenderer(settings),
    requestFrame = (callback) => window.requestAnimationFrame(callback),
    cancelFrame = (frame) => window.cancelAnimationFrame(frame),
    ResizeObserverClass = globalThis.ResizeObserver
  } = options;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdff4f0);
  scene.fog = new THREE.Fog(0xdff4f0, 12, 25);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
  const renderer = rendererFactory({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.78;
  const canvas = renderer.domElement;
  canvas.classList.add("living-atlas-webgl");
  canvas.setAttribute("aria-hidden", "true");
  canvas.tabIndex = -1;
  container.append(canvas);

  const terrain = createTerrain();
  scene.add(terrain);

  const curve = new THREE.CatmullRomCurve3(toJourneyVectors(points), false, "centripetal");
  const routePoints = curve.getPoints(ROUTE_SAMPLES);
  const routeGeometry = new THREE.BufferGeometry().setFromPoints(routePoints);
  routeGeometry.setDrawRange(0, 2);
  const route = new THREE.Line(
    routeGeometry,
    new THREE.LineBasicMaterial({ color: 0xff5f42, linewidth: 3 })
  );
  route.renderOrder = 3;
  const routeDots = new THREE.Points(
    routeGeometry,
    new THREE.PointsMaterial({ color: 0xff5f42, size: 0.075, sizeAttenuation: true })
  );
  routeDots.renderOrder = 4;
  scene.add(route, routeDots);

  const waypointMaterial = new THREE.MeshStandardMaterial({ color: 0x15795f, roughness: 0.62 });
  const waypoints = toJourneyVectors(points).map((point, index) => {
    const marker = new THREE.Mesh(new THREE.SphereGeometry(index === 0 ? 0.11 : 0.085, 18, 12), waypointMaterial);
    marker.position.copy(point);
    marker.position.z += 0.04;
    scene.add(marker);
    return marker;
  });

  const aircraft = createAircraft();
  scene.add(aircraft);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6eaa8a, 1.15));
  const sun = new THREE.DirectionalLight(0xfff7dc, 1.45);
  sun.position.set(-4, -2, 9);
  scene.add(sun);

  let frameId = null;
  let running = false;
  let disposed = false;
  let progress = 0;
  let routeDrawCount = 2;
  let pointerX = 0;
  let pointerY = 0;
  let loadedTexture = null;

  const render = () => {
    if (disposed) return;
    renderer.render(scene, camera);
    canvas.dataset.rendered = "true";
  };

  const updateCamera = () => {
    const start = new THREE.Vector3(-1.8, -8.2, 8.6);
    const end = new THREE.Vector3(1.1, -5.1, 10.8);
    camera.position.lerpVectors(start, end, progress);
    camera.position.x += pointerX * 0.2;
    camera.position.y += pointerY * 0.12;
    camera.lookAt(0.4, 0, 0);
  };

  const applyProgress = (nextProgress) => {
    const sample = sampleJourneyPath(curve, nextProgress);
    progress = sample.progress;
    canvas.dataset.progress = progress.toFixed(3);
    routeDrawCount = Math.max(2, Math.ceil(progress * routePoints.length));
    routeGeometry.setDrawRange(0, routeDrawCount);
    aircraft.position.copy(sample.point);
    aircraft.position.z += 0.24;
    aircraft.rotation.z = Math.atan2(sample.tangent.y, sample.tangent.x) - Math.PI / 2;
    waypoints.forEach((waypoint, index) => {
      const threshold = index / Math.max(1, waypoints.length - 1);
      waypoint.scale.setScalar(progress + 0.02 >= threshold ? 1.18 : 0.82);
    });
    updateCamera();
    render();
  };

  const animate = () => {
    if (!running || disposed) return;
    aircraft.position.z += Math.sin(performance.now() * 0.0025) * 0.0015;
    render();
    frameId = requestFrame(animate);
  };

  const resize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const pixelRatio = getRendererPixelRatio(window.devicePixelRatio, width < 720);
    renderer.setPixelRatio?.(pixelRatio);
    canvas.dataset.pixelRatio = String(pixelRatio);
    renderer.setSize(width, height, false);
    render();
  };

  const pause = () => {
    if (!running) return;
    running = false;
    if (frameId !== null) cancelFrame(frameId);
    frameId = null;
  };

  const resume = () => {
    if (running || disposed) return;
    running = true;
    frameId = requestFrame(animate);
  };

  const handlePointer = (event) => {
    const bounds = container.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    pointerX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    pointerY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    updateCamera();
  };
  const handleContextLoss = (event) => {
    event.preventDefault();
    pause();
    canvas.dataset.contextLost = "true";
    onFailure?.(new Error("WebGL context lost."));
  };

  container.addEventListener("pointermove", handlePointer, { passive: true });
  canvas.addEventListener("webglcontextlost", handleContextLoss);
  const resizeObserver = typeof ResizeObserverClass === "function"
    ? new ResizeObserverClass(resize)
    : null;
  resizeObserver?.observe(container);

  if (textureUrl) {
    new THREE.TextureLoader().load(textureUrl, (texture) => {
      if (disposed) {
        texture.dispose();
        return;
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      loadedTexture = texture;
      terrain.material.map = texture;
      terrain.material.color.set(0xffffff);
      terrain.material.needsUpdate = true;
      render();
    }, undefined, () => render());
  }

  resize();
  applyProgress(0);
  resume();
  onReady?.();

  return {
    canvas,
    setProgress: applyProgress,
    resize,
    pause,
    resume,
    dispose() {
      if (disposed) return;
      disposed = true;
      pause();
      resizeObserver?.disconnect();
      container.removeEventListener("pointermove", handlePointer);
      canvas.removeEventListener("webglcontextlost", handleContextLoss);
      const disposedResources = new Set();
      scene.traverse((object) => {
        if (object.geometry && !disposedResources.has(object.geometry)) {
          object.geometry.dispose?.();
          disposedResources.add(object.geometry);
        }
        disposeMaterial(object.material, disposedResources);
      });
      if (loadedTexture && !disposedResources.has(loadedTexture)) loadedTexture.dispose();
      renderer.dispose();
      canvas.remove();
    },
    getDebugState() {
      return {
        disposed,
        running,
        progress,
        routeDrawCount,
        aircraftPosition: aircraft.position.toArray(),
        pixelRatio: getRendererPixelRatio(window.devicePixelRatio, container.clientWidth < 720)
      };
    }
  };
}
