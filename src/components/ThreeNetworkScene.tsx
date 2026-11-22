import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ChevronDown, ChevronUp, Pause, Play, RotateCcw } from 'lucide-react';

type CarrierThemeId = 'jio' | 'airtel' | 'vi' | 'bsnl';
type CameraPresetId = 'overview' | 'sim' | 'tower';

interface CarrierTheme {
  id: CarrierThemeId;
  label: string;
  primaryHex: string;
  accentHex: string;
  emissiveHex: number;
}

const CARRIER_THEMES: CarrierTheme[] = [
  { id: 'jio', label: 'Jio 5G', primaryHex: '#0f4c81', accentHex: '#38bdf8', emissiveHex: 0x0ea5e9 },
  { id: 'airtel', label: 'Airtel', primaryHex: '#b91c1c', accentHex: '#fb7185', emissiveHex: 0xf43f5e },
  { id: 'vi', label: 'Vi Max', primaryHex: '#b45309', accentHex: '#fbbf24', emissiveHex: 0xf59e0b },
  { id: 'bsnl', label: 'BSNL', primaryHex: '#047857', accentHex: '#34d399', emissiveHex: 0x10b981 },
];

const CAMERA_PRESETS: Record<
  CameraPresetId,
  { label: string; pos: [number, number, number]; target: [number, number, number] }
> = {
  overview: { label: 'Overview', pos: [5.4, 3.6, 6.4], target: [0, 1.35, 0] },
  sim: { label: 'eSIM Core', pos: [-2.6, 2.35, 3.1], target: [-1.15, 1.35, 0.3] },
  tower: { label: '5G Mast', pos: [3.2, 3.0, 3.5], target: [1.35, 1.9, -0.2] },
};

const PACKET_COUNT = 48;
const _dummyObj = new THREE.Object3D();
const _scratchColor = new THREE.Color();

function detectSoftwareWebGL(renderer: THREE.WebGLRenderer): boolean {
  try {
    const gl = renderer.getContext();
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const str = String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '');
      return /swiftshader|llvmpipe|mesa|softpipe/i.test(str);
    }
  } catch {
    // ignore debug extension errors
  }
  return false;
}

function createSimFaceTexture(
  carrier: CarrierTheme,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 640;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 1024, 640);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(0.55, carrier.primaryHex);
  grad.addColorStop(1, '#1e293b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 640);

  // Subtle circuit trace grid
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 16; i += 1) {
    const y = 40 + i * 38;
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(260 + (i % 4) * 90, y);
    ctx.lineTo(310 + (i % 4) * 90, y + 18);
    ctx.lineTo(980, y + 18);
    ctx.stroke();
  }

  // Accent strip
  ctx.fillStyle = carrier.accentHex;
  ctx.fillRect(64, 72, 18, 128);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 58px system-ui, -apple-system, sans-serif';
  ctx.fillText('VOLTPAY 5G', 108, 130);

  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.font = '600 28px ui-monospace, monospace';
  ctx.fillText(`${carrier.label.toUpperCase()} · SA / NSA CORE`, 108, 180);

  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '500 24px ui-monospace, monospace';
  ctx.fillText('ICCID 8991-0048-9021-5G', 64, 558);
  ctx.fillText('INDIA +91', 810, 558);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

export function ThreeNetworkScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [carrierId, setCarrierId] = useState<CarrierThemeId>('jio');
  const [explodeRatio, setExplodeRatio] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [autoOrbit, setAutoOrbit] = useState<boolean>(true);
  const [preset, setPreset] = useState<CameraPresetId>('overview');
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [webglError, setWebglError] = useState<string | null>(null);

  const stateRef = useRef({
    carrierId: 'jio' as CarrierThemeId,
    explodeTarget: 0,
    explodeCurrent: 0,
    isPlaying: true,
    autoOrbit: true,
    camTargetPos: new THREE.Vector3(...CAMERA_PRESETS.overview.pos),
    camLookAt: new THREE.Vector3(...CAMERA_PRESETS.overview.target),
    lerpingCamera: false,
  });

  useEffect(() => {
    stateRef.current.carrierId = carrierId;
  }, [carrierId]);

  useEffect(() => {
    stateRef.current.explodeTarget = explodeRatio;
  }, [explodeRatio]);

  useEffect(() => {
    stateRef.current.isPlaying = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    stateRef.current.autoOrbit = autoOrbit;
  }, [autoOrbit]);

  const applyCameraPreset = (nextPreset: CameraPresetId) => {
    setPreset(nextPreset);
    const cfg = CAMERA_PRESETS[nextPreset];
    stateRef.current.camTargetPos.set(...cfg.pos);
    stateRef.current.camLookAt.set(...cfg.target);
    stateRef.current.lerpingCamera = true;
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError('3D hardware view requires WebGL support in your browser.');
      return;
    }

    const isSoftwareGl = detectSoftwareWebGL(renderer);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth || 800, container.clientHeight || 500);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError('3D viewport paused due to graphics context reset.');
    };
    const handleContextRestored = () => {
      setWebglError(null);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#090d16');
    scene.fog = new THREE.FogExp2('#090d16', 0.042);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 0.85;

    const camera = new THREE.PerspectiveCamera(
      44,
      (container.clientWidth || 800) / Math.max(container.clientHeight || 500, 1),
      0.1,
      80
    );
    camera.position.set(...CAMERA_PRESETS.overview.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...CAMERA_PRESETS.overview.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 2.4;
    controls.maxDistance = 14;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.update();

    // Lighting
    const hemiLight = new THREE.HemisphereLight('#bae6fd', '#0f172a', 0.65);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#fff7ed', 2.4);
    keyLight.position.set(5, 8.5, 5);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 22;
      keyLight.shadow.camera.left = -5;
      keyLight.shadow.camera.right = 5;
      keyLight.shadow.camera.top = 5;
      keyLight.shadow.camera.bottom = -5;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#38bdf8', 1.25);
    rimLight.position.set(-6, 4, -5);
    scene.add(rimLight);

    // Studio floor & subtle grid
    const floorGeo = new THREE.CircleGeometry(18, 64);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#0d1424',
      roughness: 0.72,
      metalness: 0.15,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.receiveShadow = !isSoftwareGl;
    scene.add(floorMesh);

    const grid = new THREE.GridHelper(16, 24, '#1e3a5f', '#172554');
    grid.position.y = 0.004;
    scene.add(grid);

    // Pedestal ring under assemblies
    const ringGeo = new THREE.TorusGeometry(2.85, 0.02, 12, 96);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.65,
      roughness: 0.25,
      metalness: 0.8,
    });
    const studioRing = new THREE.Mesh(ringGeo, ringMat);
    studioRing.position.y = 0.015;
    scene.add(studioRing);

    // =========================================================================
    // ASSEMBLY 1: Precision 5G Smart eSIM / SIM Module (9 parts)
    // =========================================================================
    const simGroup = new THREE.Group();
    simGroup.position.set(-1.2, 1.35, 0.35);
    simGroup.rotation.set(0.18, 0.42, -0.06);
    scene.add(simGroup);

    const simShape = new THREE.Shape();
    const w = 1.15;
    const h = 1.65;
    const r = 0.09;
    const cut = 0.28;
    simShape.moveTo(-w / 2 + r, -h / 2);
    simShape.lineTo(w / 2 - r, -h / 2);
    simShape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    simShape.lineTo(w / 2, h / 2 - cut);
    simShape.lineTo(w / 2 - cut, h / 2);
    simShape.lineTo(-w / 2 + r, h / 2);
    simShape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    simShape.lineTo(-w / 2, -h / 2 + r);
    simShape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);

    const cardBodyGeo = new THREE.ExtrudeGeometry(simShape, {
      depth: 0.075,
      bevelEnabled: true,
      bevelThickness: 0.018,
      bevelSize: 0.016,
      bevelSegments: 3,
    });
    cardBodyGeo.center();

    const maxAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    let activeTheme = CARRIER_THEMES[0];
    let simTexture = createSimFaceTexture(activeTheme, maxAnisotropy);

    const simBodyMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.36,
      metalness: 0.22,
    });
    const simCardBody = new THREE.Mesh(cardBodyGeo, simBodyMat);
    simCardBody.castShadow = !isSoftwareGl;
    simGroup.add(simCardBody);

    // Branded face plate
    const faceMat = new THREE.MeshStandardMaterial({
      map: simTexture,
      roughness: 0.32,
      metalness: 0.15,
    });
    const facePlateGeo = new THREE.PlaneGeometry(0.96, 1.38);
    const facePlate = new THREE.Mesh(facePlateGeo, faceMat);
    facePlate.position.z = 0.059;
    simGroup.add(facePlate);

    // Metallic contact bezel + 8 gold contact pads (exploded Z offset)
    const contactLayer = new THREE.Group();
    simGroup.add(contactLayer);

    const bezelMat = new THREE.MeshStandardMaterial({
      color: '#94a3b8',
      roughness: 0.28,
      metalness: 0.88,
    });
    const bezelMesh = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.66, 0.02), bezelMat);
    bezelMesh.position.set(0, -0.22, 0.068);
    contactLayer.add(bezelMesh);

    const goldMat = new THREE.MeshStandardMaterial({
      color: '#facc15',
      roughness: 0.22,
      metalness: 0.94,
    });
    const padGeo = new THREE.BoxGeometry(0.15, 0.125, 0.022);
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 2; col += 1) {
        const pad = new THREE.Mesh(padGeo, goldMat);
        pad.position.set(
          (col === 0 ? -0.17 : 0.17) + (col === 0 ? -0.02 : 0.02),
          -0.44 + row * 0.148,
          0.08
        );
        contactLayer.add(pad);
      }
    }

    // Internal induction coil (visible during explode!)
    const coilLayer = new THREE.Group();
    simGroup.add(coilLayer);
    const copperMat = new THREE.MeshStandardMaterial({
      color: '#f97316',
      roughness: 0.28,
      metalness: 0.9,
    });
    const coilMesh = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.016, 12, 48), copperMat);
    coilMesh.position.set(0, 0.22, 0.03);
    coilLayer.add(coilMesh);

    const siliconDieMat = new THREE.MeshStandardMaterial({
      color: '#020617',
      roughness: 0.18,
      metalness: 0.72,
    });
    const siliconDie = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.025), siliconDieMat);
    siliconDie.position.set(0, 0.22, 0.035);
    coilLayer.add(siliconDie);

    // Translucent outer protective shield
    const shieldMat = new THREE.MeshPhysicalMaterial({
      color: '#e0f2fe',
      transparent: true,
      opacity: 0.26,
      roughness: 0.12,
      metalness: 0.05,
      clearcoat: 0.9,
    });
    const shieldPlate = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.48, 0.015), shieldMat);
    shieldPlate.position.set(0, 0, 0.095);
    simGroup.add(shieldPlate);

    // =========================================================================
    // ASSEMBLY 2: 5G Millimeter-Wave Base Station Mast (10 parts)
    // =========================================================================
    const towerGroup = new THREE.Group();
    towerGroup.position.set(1.35, 0, -0.25);
    scene.add(towerGroup);

    const concreteMat = new THREE.MeshStandardMaterial({
      color: '#334155',
      roughness: 0.82,
      metalness: 0.08,
    });
    const steelMat = new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      roughness: 0.3,
      metalness: 0.85,
    });
    const radomeMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.4,
      metalness: 0.12,
    });
    const mastBeaconMat = new THREE.MeshStandardMaterial({
      color: activeTheme.accentHex,
      emissive: activeTheme.emissiveHex,
      emissiveIntensity: 1.4,
      roughness: 0.2,
      metalness: 0.4,
    });

    // Concrete octagon plinth + steel flange
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.78, 0.24, 8), concreteMat);
    plinth.position.y = 0.12;
    plinth.castShadow = !isSoftwareGl;
    plinth.receiveShadow = !isSoftwareGl;
    towerGroup.add(plinth);

    const baseFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.1, 16), steelMat);
    baseFlange.position.y = 0.29;
    towerGroup.add(baseFlange);

    // Lower & upper tapered mast sections
    const lowerMast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 1.55, 16), steelMat);
    lowerMast.position.y = 1.08;
    lowerMast.castShadow = !isSoftwareGl;
    towerGroup.add(lowerMast);

    const collarRing = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 16), concreteMat);
    collarRing.position.y = 1.86;
    towerGroup.add(collarRing);

    const upperMast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 1.1, 16), steelMat);
    upperMast.position.y = 2.42;
    upperMast.castShadow = !isSoftwareGl;
    towerGroup.add(upperMast);

    // Parabolic Microwave Dish via LatheGeometry
    const dishPoints = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.14, 0.03),
      new THREE.Vector2(0.28, 0.11),
      new THREE.Vector2(0.36, 0.22),
    ];
    const dishGeo = new THREE.LatheGeometry(dishPoints, 28);
    const dishGroup = new THREE.Group();
    dishGroup.position.set(-0.22, 1.98, 0.14);
    dishGroup.rotation.set(Math.PI * 0.45, 0, Math.PI * 0.32);
    const dishMesh = new THREE.Mesh(dishGeo, radomeMat);
    const feedHorn = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.018, 0.22, 12), steelMat);
    feedHorn.position.y = 0.14;
    dishGroup.add(dishMesh, feedHorn);
    towerGroup.add(dishGroup);

    // 3x 120-degree Massive MIMO Sector Arrays (expand radially during Exploded View!)
    const sectorPanels: THREE.Group[] = [];
    for (let i = 0; i < 3; i += 1) {
      const angle = (i * Math.PI * 2) / 3;
      const sectorPivot = new THREE.Group();
      sectorPivot.rotation.y = angle;

      const sectorBody = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.72, 0.09), radomeMat);
      sectorBody.position.set(0, 2.52, 0.24);
      sectorBody.castShadow = !isSoftwareGl;

      const sectorAccent = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.02), mastBeaconMat);
      sectorAccent.position.set(0, 2.75, 0.295);

      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.16), steelMat);
      bracket.position.set(0, 2.52, 0.14);

      sectorPivot.add(sectorBody, sectorAccent, bracket);
      towerGroup.add(sectorPivot);
      sectorPanels.push(sectorPivot);
    }

    // Top telemetry dome + glowing ring
    const topRing = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 10, 28), mastBeaconMat);
    topRing.rotation.x = Math.PI / 2;
    topRing.position.y = 3.0;
    towerGroup.add(topRing);

    const topCap = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), radomeMat);
    topCap.position.y = 3.06;
    towerGroup.add(topCap);

    // =========================================================================
    // INSTANCED 5G DATA PACKETS
    // =========================================================================
    const packetGeo = new THREE.OctahedronGeometry(0.045, 0);
    const packetMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: activeTheme.emissiveHex,
      emissiveIntensity: 1.5,
      roughness: 0.2,
      metalness: 0.5,
    });
    const packetInstances = new THREE.InstancedMesh(packetGeo, packetMat, PACKET_COUNT);
    packetInstances.computeBoundingSphere();
    scene.add(packetInstances);

    const packetOffsets = Array.from({ length: PACKET_COUNT }, (_, idx) => ({
      phase: (idx / PACKET_COUNT) * Math.PI * 2,
      speed: 0.55 + (idx % 5) * 0.14,
      arcHeight: 0.35 + (idx % 4) * 0.18,
      lateral: ((idx % 7) - 3) * 0.09,
    }));

    // ResizeObserver for responsive container sizing
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const cw = container.clientWidth || 800;
      const ch = Math.max(container.clientHeight || 500, 1);
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
      renderer.setSize(cw, ch);
    });
    resizeObserver.observe(container);

    let rafId = 0;
    let prevTime = performance.now();
    let elapsed = 0;
    let appliedCarrierId: CarrierThemeId = 'jio';

    const tick = (now: number) => {
      const dt = Math.min((now - prevTime) / 1000, 0.05);
      prevTime = now;

      const s = stateRef.current;

      // Carrier material theme swap without rebuilding geometry
      if (s.carrierId !== appliedCarrierId) {
        appliedCarrierId = s.carrierId;
        const found = CARRIER_THEMES.find((t) => t.id === appliedCarrierId) ?? CARRIER_THEMES[0];
        activeTheme = found;
        const nextTexture = createSimFaceTexture(found, maxAnisotropy);
        simTexture.dispose();
        simTexture = nextTexture;
        faceMat.map = simTexture;
        faceMat.needsUpdate = true;

        _scratchColor.set(found.accentHex);
        ringMat.color.copy(_scratchColor);
        ringMat.emissive.setHex(found.emissiveHex);
        mastBeaconMat.color.copy(_scratchColor);
        mastBeaconMat.emissive.setHex(found.emissiveHex);
        packetMat.emissive.setHex(found.emissiveHex);
      }

      // Exponentially smoothed Exploded Assembly
      s.explodeCurrent = THREE.MathUtils.damp(s.explodeCurrent, s.explodeTarget, 6, dt);
      const ex = s.explodeCurrent;

      facePlate.position.z = 0.059 + ex * 0.22;
      coilLayer.position.z = ex * 0.42;
      contactLayer.position.z = ex * 0.68;
      shieldPlate.position.z = 0.095 + ex * 0.95;

      sectorPanels.forEach((pivot) => {
        const panel = pivot.children[0];
        const accent = pivot.children[1];
        if (panel && accent) {
          panel.position.z = 0.24 + ex * 0.38;
          accent.position.z = 0.295 + ex * 0.38;
        }
      });

      if (s.isPlaying) {
        elapsed += dt;
        simGroup.position.y = 1.35 + Math.sin(elapsed * 1.4) * 0.07;
        if (s.autoOrbit && !s.lerpingCamera) {
          simGroup.rotation.y = 0.42 + Math.sin(elapsed * 0.55) * 0.22;
        }
      }

      // Smooth camera preset transition
      if (s.lerpingCamera) {
        camera.position.lerp(s.camTargetPos, 1 - Math.exp(-6 * dt));
        controls.target.lerp(s.camLookAt, 1 - Math.exp(-6 * dt));
        if (camera.position.distanceTo(s.camTargetPos) < 0.04) {
          s.lerpingCamera = false;
        }
      }

      // Update instanced 5G packet nodes traveling between tower and SIM module
      for (let i = 0; i < PACKET_COUNT; i += 1) {
        const p = packetOffsets[i];
        const t = ((elapsed * p.speed + p.phase) % (Math.PI * 2)) / (Math.PI * 2);
        const startX = 1.35;
        const startY = 2.55;
        const startZ = -0.25;
        const endX = -1.2;
        const endY = simGroup.position.y;
        const endZ = 0.35;

        const px = THREE.MathUtils.lerp(startX, endX, t) + Math.sin(t * Math.PI) * p.lateral;
        const py =
          THREE.MathUtils.lerp(startY, endY, t) + Math.sin(t * Math.PI) * p.arcHeight;
        const pz =
          THREE.MathUtils.lerp(startZ, endZ, t) + Math.cos(t * Math.PI * 2) * p.lateral * 0.6;
        const scale = Math.sin(t * Math.PI) * 1.15;

        _dummyObj.position.set(px, py, pz);
        _dummyObj.rotation.set(elapsed + i, elapsed * 1.3, 0);
        _dummyObj.scale.setScalar(Math.max(scale, 0.05));
        _dummyObj.updateMatrix();
        packetInstances.setMatrixAt(i, _dummyObj.matrix);
      }
      packetInstances.instanceMatrix.needsUpdate = true;

      controls.update();
      renderer.render(scene, camera);
    };

    const startLoop = () => {
      const frame = (now: number) => {
        tick(now);
        if (isSoftwareGl) {
          window.setTimeout(() => {
            rafId = requestAnimationFrame(frame);
          }, 32);
        } else {
          rafId = requestAnimationFrame(frame);
        }
      };
      rafId = requestAnimationFrame(frame);
    };
    startLoop();

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });

      simTexture.dispose();
      envTarget.dispose();
      pmremGenerator.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (webglError) {
    return (
      <div className="w-full h-[460px] rounded-2xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center p-6 text-center text-slate-200 gap-3">
        <p className="text-sm font-semibold">{webglError}</p>
        <p className="text-xs text-slate-400 max-w-md">
          Try hardware acceleration in browser settings or switch to the 5G Store Locator tab.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[480px] sm:h-[560px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 select-none">
      <div ref={mountRef} className="w-full h-full" />

      {/* Minimal Collapsible Bottom Control Dock (no backdrop-filter over WebGL) */}
      <div className="absolute bottom-3 left-3 right-3 flex justify-center pointer-events-none">
        <div className="pointer-events-auto w-full max-w-3xl rounded-2xl bg-slate-950/92 border border-slate-800 px-3.5 py-2.5 text-slate-100 shadow-xl">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {CARRIER_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setCarrierId(theme.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    carrierId === theme.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {theme.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsPlaying((v) => !v)}
                aria-label={isPlaying ? 'Pause simulation' : 'Play simulation'}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <Play className="w-3.5 h-3.5" aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setExplodeRatio(0);
                  applyCameraPreset('overview');
                }}
                aria-label="Reset camera and assembly"
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setDockCollapsed((v) => !v)}
                aria-label={dockCollapsed ? 'Expand controls' : 'Collapse controls'}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
              >
                {dockCollapsed ? (
                  <ChevronUp className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {!dockCollapsed && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                {(['overview', 'sim', 'tower'] as CameraPresetId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => applyCameraPreset(id)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                      preset === id
                        ? 'bg-slate-100 text-slate-900'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {CAMERA_PRESETS[id].label}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2.5 text-slate-300 flex-1 max-w-xs">
                <span className="whitespace-nowrap font-medium">Explode View</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={explodeRatio}
                  onChange={(e) => setExplodeRatio(Number(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
                <span className="font-mono w-9 text-right tabular-nums">
                  {Math.round(explodeRatio * 100)}%
                </span>
              </label>

              <label className="inline-flex items-center gap-1.5 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoOrbit}
                  onChange={(e) => setAutoOrbit(e.target.checked)}
                  className="accent-sky-400 cursor-pointer"
                />
                <span>Motion</span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
