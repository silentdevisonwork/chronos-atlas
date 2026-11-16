import { Eye, EyeOff, Layers, RotateCcw, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import {
  ARCHIVAL_MEDIA,
  EXHIBITION_PLATES,
  type ExhibitionPlate,
  type MonumentPresetId,
} from '../data/media';

function detectSoftwareWebGL(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createAstrolabeDialTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  const cx = 256;
  const cy = 256;

  const grad = ctx.createRadialGradient(cx, cy, 18, cx, cy, 252);
  grad.addColorStop(0, '#c8a96e');
  grad.addColorStop(0.65, '#9d7c3f');
  grad.addColorStop(1, '#5d4720');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, 250, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(15, 23, 42, 0.72)';
  ctx.lineWidth = 2;
  for (let r = 45; r <= 235; r += 38) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let deg = 0; deg < 360; deg += 5) {
    const rad = (deg * Math.PI) / 180;
    const inner = deg % 30 === 0 ? 205 : deg % 10 === 0 ? 218 : 228;
    ctx.lineWidth = deg % 30 === 0 ? 2.5 : 1;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rad) * inner, cy + Math.sin(rad) * inner);
    ctx.lineTo(cx + Math.cos(rad) * 244, cy + Math.sin(rad) * 244);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createStoneAshlarTexture(baseColor: string, mortarColor: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = mortarColor;
  ctx.lineWidth = 2;
  const rowH = 32;
  for (let y = 0; y < 512; y += rowH) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
    const offset = ((y / rowH) % 2) * 32;
    for (let x = offset; x < 512; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + rowH);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const MODEL_META: Array<{ id: MonumentPresetId; label: string; subtitle: string }> = [
  { id: 'dome-basilica', label: 'Imperial Dome', subtitle: 'Constantinople Pendentive Vault' },
  { id: 'pyramid-obelisk', label: 'Giza Complex', subtitle: 'Ashlar Pyramid & Granite Core' },
  { id: 'astrolabe-armillary', label: 'Armillary Sphere', subtitle: 'Brass & Blued-Steel Observatory' },
  { id: 'ziggurat-gate', label: 'Ishtar Ziggurat', subtitle: 'Lapis-Glazed Mesopotamian Temple' },
  { id: 'voyager-probe', label: 'Cassini Orbiter', subtitle: 'Parabolic Dish & Gold Thermal Bus' },
];

type LightingMode = 'studio' | 'torchlight' | 'blueprint';

interface ExplodablePart {
  obj: THREE.Object3D;
  basePos: THREE.Vector3;
  explodeOffset: THREE.Vector3;
}

export function Monument3DStudio({
  preset = 'dome-basilica',
  onPresetChange,
  onInspectPlate,
  compact = false,
  heightClass = 'h-[470px]',
}: {
  preset?: MonumentPresetId;
  onPresetChange?: (p: MonumentPresetId) => void;
  onInspectPlate?: (plate: ExhibitionPlate) => void;
  compact?: boolean;
  heightClass?: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activePreset, setActivePreset] = useState<MonumentPresetId>(preset);
  const [explodeFactor, setExplodeFactor] = useState(0);
  const [lightingMode, setLightingMode] = useState<LightingMode>('studio');
  const [autoRotate, setAutoRotate] = useState(true);
  const [hudHidden, setHudHidden] = useState(false);

  useEffect(() => {
    setActivePreset(preset);
  }, [preset]);

  const explodeRef = useRef(explodeFactor);
  const lightingRef = useRef(lightingMode);
  const autoRotateRef = useRef(autoRotate);
  const presetRef = useRef(activePreset);
  const onInspectPlateRef = useRef(onInspectPlate);
  explodeRef.current = explodeFactor;
  lightingRef.current = lightingMode;
  autoRotateRef.current = autoRotate;
  presetRef.current = activePreset;
  onInspectPlateRef.current = onInspectPlate;

  const sceneCtrlRef = useRef<{
    rebuildModel: (p: MonumentPresetId) => void;
    applyLighting: (m: LightingMode) => void;
    resetCamera: () => void;
  } | null>(null);

  useEffect(() => {
    sceneCtrlRef.current?.rebuildModel(activePreset);
  }, [activePreset]);

  useEffect(() => {
    sceneCtrlRef.current?.applyLighting(lightingMode);
  }, [lightingMode]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const width = container.clientWidth || 720;
    const height = container.clientHeight || 460;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050a18);
    scene.fog = new THREE.FogExp2(0x050a18, 0.042);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 80);
    camera.position.set(4.2, 3.1, 5.4);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Post-processing (GPU only)
    let composer: EffectComposer | null = null;
    if (!isSoftwareGl) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(
        new UnrealBloomPass(new THREE.Vector2(width, height), 0.28, 0.45, 0.84)
      );
    }

    // 3-Point Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x090f1f, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xf8fafc, 2.0);
    keyLight.position.set(5, 7.5, 5);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.left = -4;
      keyLight.shadow.camera.right = 4;
      keyLight.shadow.camera.top = 4;
      keyLight.shadow.camera.bottom = -4;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x3b82f6, 1.1);
    rimLight.position.set(-5, 3, -5);
    scene.add(rimLight);

    // Pedestal Stage & Radial Museum Floor Grid
    const pedestalGroup = new THREE.Group();
    const basePlinth = new THREE.Mesh(
      new THREE.CylinderGeometry(2.1, 2.3, 0.22, 48),
      new THREE.MeshPhysicalMaterial({
        color: 0x0f172a,
        roughness: 0.35,
        metalness: 0.45,
        clearcoat: 0.6,
      })
    );
    basePlinth.position.y = -0.11;
    basePlinth.receiveShadow = !isSoftwareGl;
    pedestalGroup.add(basePlinth);

    const brassRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.12, 0.025, 16, 64),
      new THREE.MeshPhysicalMaterial({
        color: 0x3b82f6,
        emissive: 0x1d4ed8,
        emissiveIntensity: 0.6,
        metalness: 0.85,
        roughness: 0.2,
      })
    );
    brassRing.rotation.x = Math.PI / 2;
    brassRing.position.y = 0.01;
    pedestalGroup.add(brassRing);

    const polarGrid = new THREE.PolarGridHelper(6.5, 12, 6, 48, 0x1e3a8a, 0x0f172a);
    polarGrid.position.y = -0.22;
    pedestalGroup.add(polarGrid);
    scene.add(pedestalGroup);

    // 3D Archival Picture Easels + Live Animated Video Cinema Screen inside the 3D Chamber!
    const galleryGroup = new THREE.Group();
    const clickableEasels: THREE.Object3D[] = [];
    const textureLoader = new THREE.TextureLoader();
    const loadedTextures: THREE.Texture[] = [];

    if (!compact) {
      const showcasePlates = [
        EXHIBITION_PLATES[0],
        EXHIBITION_PLATES[2],
        EXHIBITION_PLATES[6],
      ];
      showcasePlates.forEach((plate, idx) => {
        const angle = -Math.PI * 0.72 + idx * 0.56;
        const radius = 5.4;
        const frameGroup = new THREE.Group();
        frameGroup.position.set(Math.cos(angle) * radius, 1.35, Math.sin(angle) * radius);
        frameGroup.lookAt(0, 1.2, 0);

        const backing = new THREE.Mesh(
          new THREE.BoxGeometry(1.78, 1.12, 0.06),
          new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.75, roughness: 0.28 })
        );
        frameGroup.add(backing);

        const tex = textureLoader.load(plate.src);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        loadedTextures.push(tex);

        const picture = new THREE.Mesh(
          new THREE.PlaneGeometry(1.66, 1.0),
          new THREE.MeshBasicMaterial({ map: tex })
        );
        picture.position.z = 0.035;
        picture.userData = { plate };
        frameGroup.add(picture);
        clickableEasels.push(picture);
        galleryGroup.add(frameGroup);
      });

      // Live Animated 3D Motion Video Screen (CanvasTexture playing archival documentary stream in 3D!)
      const videoCanvas = document.createElement('canvas');
      videoCanvas.width = 512;
      videoCanvas.height = 288;
      const vCtx = videoCanvas.getContext('2d')!;
      const vTex = new THREE.CanvasTexture(videoCanvas);
      vTex.colorSpace = THREE.SRGBColorSpace;
      loadedTextures.push(vTex);

      const screenImgs = [
        ARCHIVAL_MEDIA.alexandriaHero.src,
        ARCHIVAL_MEDIA.samarkand.src,
        ARCHIVAL_MEDIA.machuPicchu.src,
      ].map((src) => {
        const im = new Image();
        im.crossOrigin = 'anonymous';
        im.src = src;
        return im;
      });

      const screenGroup = new THREE.Group();
      screenGroup.position.set(0, 1.65, -5.6);
      const screenHousing = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 1.85, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.2 })
      );
      const screenSurface = new THREE.Mesh(
        new THREE.PlaneGeometry(3.02, 1.7),
        new THREE.MeshBasicMaterial({ map: vTex })
      );
      screenSurface.position.z = 0.045;
      screenGroup.add(screenHousing, screenSurface);
      galleryGroup.add(screenGroup);

      // Update live 3D video wall helper stored on scene
      galleryGroup.userData.updateVideoWall = (elapsed: number) => {
        const slideIdx = Math.floor(elapsed / 5) % screenImgs.length;
        const localT = (elapsed % 5) / 5;
        const im = screenImgs[slideIdx];
        vCtx.fillStyle = '#040916';
        vCtx.fillRect(0, 0, 512, 288);
        if (im.complete && im.naturalWidth > 0) {
          const scale = 1.0 + localT * 0.12;
          const dw = 512 * scale;
          const dh = 288 * scale;
          vCtx.drawImage(im, (512 - dw) / 2, (288 - dh) / 2, dw, dh);
        }
        vCtx.fillStyle = 'rgba(4, 8, 20, 0.45)';
        vCtx.fillRect(0, 218, 512, 70);
        vCtx.fillStyle = '#d4d4d4';
        vCtx.font = '600 13px monospace';
        vCtx.fillText('CHRONOS ARCHIVAL MOTION REEL · LIVE 3D FEED', 18, 242);
        vCtx.fillStyle = '#f8fafc';
        vCtx.font = '700 16px sans-serif';
        const titles = ['Hellenistic Alexandria', 'Samarkand Observatory', 'Andean Intihuatana'];
        vCtx.fillText(titles[slideIdx], 18, 266);
        vTex.needsUpdate = true;
      };
    }
    scene.add(galleryGroup);

    // Procedural Textures for Models
    const astrolabeTex = createAstrolabeDialTexture();
    astrolabeTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const stoneTex = createStoneAshlarTexture('#cbd5e1', '#64748b');
    stoneTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const sandTex = createStoneAshlarTexture('#d6c6a5', '#8b7755');
    sandTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    loadedTextures.push(astrolabeTex, stoneTex, sandTex);

    // Shared Hero Group
    const heroGroup = new THREE.Group();
    scene.add(heroGroup);

    let explodableParts: ExplodablePart[] = [];
    let animatedSpins: Array<{ obj: THREE.Object3D; axis: 'x' | 'y' | 'z'; speed: number }> = [];
    const modelGeos: THREE.BufferGeometry[] = [];
    const modelMats: THREE.Material[] = [];

    const track = <T extends THREE.Object3D>(
      obj: T,
      explodeOffset: THREE.Vector3
    ): T => {
      explodableParts.push({
        obj,
        basePos: obj.position.clone(),
        explodeOffset,
      });
      return obj;
    };

    const disposeCurrentHero = () => {
      while (heroGroup.children.length > 0) {
        heroGroup.remove(heroGroup.children[0]);
      }
      modelGeos.forEach((g) => g.dispose());
      modelMats.forEach((m) => m.dispose());
      modelGeos.length = 0;
      modelMats.length = 0;
      explodableParts = [];
      animatedSpins = [];
    };

    const mkGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      modelGeos.push(g);
      return g;
    };
    const mkMat = <T extends THREE.Material>(m: T): T => {
      modelMats.push(m);
      return m;
    };

    const rebuildModel = (targetPreset: MonumentPresetId) => {
      disposeCurrentHero();

      const marbleMat = mkMat(
        new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.72, metalness: 0.06 })
      );
      const brassMat = mkMat(
        new THREE.MeshPhysicalMaterial({
          color: 0xd4a853,
          metalness: 0.92,
          roughness: 0.18,
          clearcoat: 0.4,
        })
      );
      const steelBlueMat = mkMat(
        new THREE.MeshPhysicalMaterial({
          color: 0x1e3a8a,
          metalness: 0.84,
          roughness: 0.24,
          clearcoat: 0.75,
        })
      );
      const glassMat = mkMat(
        new THREE.MeshPhysicalMaterial({
          color: 0x93c5fd,
          roughness: 0.08,
          metalness: 0.05,
          transmission: isSoftwareGl ? 0 : 0.85,
          transparent: true,
          opacity: isSoftwareGl ? 0.35 : 1,
          ior: 1.5,
          thickness: 0.4,
        })
      );

      if (targetPreset === 'dome-basilica') {
        // 1. Imperial Pendentive Dome (10 distinct parts)
        const base = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(2.5, 0.32, 2.5)), marbleMat);
        base.position.y = 0.16;
        heroGroup.add(track(base, new THREE.Vector3(0, -0.1, 0)));

        const nave = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(1.75, 0.88, 1.75)), marbleMat);
        nave.position.y = 0.76;
        heroGroup.add(track(nave, new THREE.Vector3(0, 0.35, 0)));

        const drum = new THREE.Mesh(mkGeo(new THREE.CylinderGeometry(0.76, 0.82, 0.36, 32)), steelBlueMat);
        drum.position.y = 1.38;
        heroGroup.add(track(drum, new THREE.Vector3(0, 0.85, 0)));

        const dome = new THREE.Mesh(
          mkGeo(new THREE.SphereGeometry(0.76, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2)),
          steelBlueMat
        );
        dome.position.y = 1.54;
        heroGroup.add(track(dome, new THREE.Vector3(0, 1.38, 0)));

        const finial = new THREE.Mesh(mkGeo(new THREE.ConeGeometry(0.05, 0.34, 12)), brassMat);
        finial.position.y = 2.46;
        heroGroup.add(track(finial, new THREE.Vector3(0, 1.85, 0)));

        // Semi-domes
        [-0.95, 0.95].forEach((zOff) => {
          const semi = new THREE.Mesh(
            mkGeo(new THREE.SphereGeometry(0.46, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2)),
            marbleMat
          );
          semi.position.set(0, 1.08, zOff);
          heroGroup.add(track(semi, new THREE.Vector3(0, 0.65, zOff * 0.55)));
        });

        // 4 Minarets
        const corners = [
          [-1.08, -1.08],
          [1.08, -1.08],
          [-1.08, 1.08],
          [1.08, 1.08],
        ];
        corners.forEach(([x, z]) => {
          const towerGrp = new THREE.Group();
          towerGrp.position.set(x, 0.32, z);
          const shaft = new THREE.Mesh(mkGeo(new THREE.CylinderGeometry(0.06, 0.085, 1.85, 16)), marbleMat);
          shaft.position.y = 0.92;
          const balcony = new THREE.Mesh(mkGeo(new THREE.CylinderGeometry(0.1, 0.08, 0.07, 16)), brassMat);
          balcony.position.y = 1.35;
          const spire = new THREE.Mesh(mkGeo(new THREE.ConeGeometry(0.065, 0.38, 16)), steelBlueMat);
          spire.position.y = 2.02;
          towerGrp.add(shaft, balcony, spire);
          heroGroup.add(track(towerGrp, new THREE.Vector3(x * 0.45, 0.5, z * 0.45)));
        });
      } else if (targetPreset === 'pyramid-obelisk') {
        const limestoneMat = mkMat(
          new THREE.MeshStandardMaterial({ map: sandTex, roughness: 0.85, metalness: 0.05 })
        );
        const graniteMat = mkMat(
          new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.6, metalness: 0.15 })
        );

        const plateau = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(2.9, 0.16, 2.9)), limestoneMat);
        plateau.position.y = 0.08;
        heroGroup.add(track(plateau, new THREE.Vector3(0, -0.1, 0)));

        // Inner King's Chamber revealed on explode!
        const chamber = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(0.65, 0.45, 0.65)), graniteMat);
        chamber.position.y = 0.55;
        heroGroup.add(track(chamber, new THREE.Vector3(0, 0.15, 0)));

        // Outer Casing Pyramid
        const pyramid = new THREE.Mesh(mkGeo(new THREE.ConeGeometry(1.55, 1.7, 4)), limestoneMat);
        pyramid.position.y = 1.01;
        pyramid.rotation.y = Math.PI / 4;
        heroGroup.add(track(pyramid, new THREE.Vector3(0, 0.95, 0)));

        // Electrum Capstone
        const cap = new THREE.Mesh(mkGeo(new THREE.ConeGeometry(0.28, 0.32, 4)), brassMat);
        cap.position.y = 1.98;
        cap.rotation.y = Math.PI / 4;
        heroGroup.add(track(cap, new THREE.Vector3(0, 1.75, 0)));

        // Flanking Solar Obelisk
        const obeliskGrp = new THREE.Group();
        obeliskGrp.position.set(1.25, 0.16, 1.0);
        const obShaft = new THREE.Mesh(mkGeo(new THREE.CylinderGeometry(0.07, 0.12, 1.35, 4)), graniteMat);
        obShaft.position.y = 0.67;
        obShaft.rotation.y = Math.PI / 4;
        const obTip = new THREE.Mesh(mkGeo(new THREE.ConeGeometry(0.07, 0.18, 4)), brassMat);
        obTip.position.y = 1.43;
        obTip.rotation.y = Math.PI / 4;
        obeliskGrp.add(obShaft, obTip);
        heroGroup.add(track(obeliskGrp, new THREE.Vector3(0.4, 0.35, 0.4)));
      } else if (targetPreset === 'astrolabe-armillary') {
        // Multi-part Gimbaled Armillary Sphere & Astrolabe Mater
        const dialMat = mkMat(
          new THREE.MeshStandardMaterial({ map: astrolabeTex, metalness: 0.72, roughness: 0.28 })
        );
        const mater = new THREE.Mesh(mkGeo(new THREE.CylinderGeometry(1.25, 1.25, 0.08, 48)), dialMat);
        mater.position.y = 0.08;
        heroGroup.add(track(mater, new THREE.Vector3(0, -0.25, 0)));

        const stand = new THREE.Mesh(mkGeo(new THREE.CylinderGeometry(0.06, 0.16, 0.65, 16)), brassMat);
        stand.position.y = 0.42;
        heroGroup.add(track(stand, new THREE.Vector3(0, 0.1, 0)));

        const outerRing = new THREE.Mesh(mkGeo(new THREE.TorusGeometry(0.95, 0.035, 16, 64)), brassMat);
        outerRing.position.y = 1.45;
        heroGroup.add(track(outerRing, new THREE.Vector3(0, 0.85, 0)));
        animatedSpins.push({ obj: outerRing, axis: 'y', speed: 0.45 });

        const midRing = new THREE.Mesh(mkGeo(new THREE.TorusGeometry(0.78, 0.028, 16, 64)), steelBlueMat);
        midRing.position.y = 1.45;
        midRing.rotation.x = Math.PI / 3;
        heroGroup.add(track(midRing, new THREE.Vector3(0.45, 0.9, 0)));
        animatedSpins.push({ obj: midRing, axis: 'z', speed: 0.65 });

        const innerRing = new THREE.Mesh(mkGeo(new THREE.TorusGeometry(0.58, 0.024, 16, 48)), brassMat);
        innerRing.position.y = 1.45;
        innerRing.rotation.y = Math.PI / 4;
        heroGroup.add(track(innerRing, new THREE.Vector3(-0.45, 0.9, 0)));
        animatedSpins.push({ obj: innerRing, axis: 'x', speed: 0.8 });

        const earthCore = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.24, 28, 28)), steelBlueMat);
        earthCore.position.y = 1.45;
        heroGroup.add(track(earthCore, new THREE.Vector3(0, 1.35, 0)));

        const glassDome = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(1.12, 32, 32)), glassMat);
        glassDome.position.y = 1.45;
        heroGroup.add(track(glassDome, new THREE.Vector3(0, 1.65, 0)));
      } else if (targetPreset === 'ziggurat-gate') {
        const lapisMat = mkMat(
          new THREE.MeshPhysicalMaterial({
            color: 0x1d4ed8,
            roughness: 0.25,
            metalness: 0.2,
            clearcoat: 0.9,
          })
        );
        const tiers = [
          { w: 2.5, h: 0.45, y: 0.22, exp: 0 },
          { w: 1.9, h: 0.45, y: 0.67, exp: 0.45 },
          { w: 1.3, h: 0.45, y: 1.12, exp: 0.95 },
        ];
        tiers.forEach((t) => {
          const mesh = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(t.w, t.h, t.w)), marbleMat);
          mesh.position.y = t.y;
          heroGroup.add(track(mesh, new THREE.Vector3(0, t.exp, 0)));
        });

        const shrine = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(0.75, 0.42, 0.75)), lapisMat);
        shrine.position.y = 1.56;
        heroGroup.add(track(shrine, new THREE.Vector3(0, 1.45, 0)));

        // Dual Lapis Gate Towers
        [-0.45, 0.45].forEach((x) => {
          const pylon = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(0.32, 1.05, 0.36)), lapisMat);
          pylon.position.set(x, 0.52, 1.32);
          heroGroup.add(track(pylon, new THREE.Vector3(x * 0.4, 0.35, 0.65)));
        });

        const ramp = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(0.45, 0.14, 1.35)), brassMat);
        ramp.position.set(0, 0.45, 0.95);
        ramp.rotation.x = -0.45;
        heroGroup.add(track(ramp, new THREE.Vector3(0, 0.2, 0.55)));
      } else {
        // 5. Cassini–Voyager Space Probe (Lathe parabolic dish + gold bus + magnetometer boom + RTG fins)
        const goldFoilMat = mkMat(
          new THREE.MeshPhysicalMaterial({
            color: 0xeab308,
            metalness: 0.95,
            roughness: 0.22,
            clearcoat: 0.5,
          })
        );
        const bus = new THREE.Mesh(mkGeo(new THREE.CylinderGeometry(0.45, 0.48, 0.72, 8)), goldFoilMat);
        bus.position.y = 1.05;
        heroGroup.add(track(bus, new THREE.Vector3(0, 0.2, 0)));

        // Parabolic Dish via LatheGeometry
        const dishPts = [
          new THREE.Vector2(0.01, 0),
          new THREE.Vector2(0.35, 0.08),
          new THREE.Vector2(0.72, 0.24),
          new THREE.Vector2(1.05, 0.5),
        ];
        const dishGeo = mkGeo(new THREE.LatheGeometry(dishPts, 40));
        const dish = new THREE.Mesh(
          dishGeo,
          mkMat(new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35, metalness: 0.4, side: THREE.DoubleSide }))
        );
        dish.position.y = 1.48;
        heroGroup.add(track(dish, new THREE.Vector3(0, 1.15, 0)));

        const feedHorn = new THREE.Mesh(mkGeo(new THREE.ConeGeometry(0.11, 0.45, 16)), steelBlueMat);
        feedHorn.position.y = 1.98;
        feedHorn.rotation.x = Math.PI;
        heroGroup.add(track(feedHorn, new THREE.Vector3(0, 1.65, 0)));

        const boom = new THREE.Mesh(mkGeo(new THREE.CylinderGeometry(0.03, 0.04, 2.2, 8)), steelBlueMat);
        boom.rotation.z = Math.PI / 2;
        boom.position.set(1.25, 1.05, 0);
        heroGroup.add(track(boom, new THREE.Vector3(0.85, 0.2, 0)));

        [-0.75, 0.75].forEach((z) => {
          const fin = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(0.18, 0.08, 0.95)), steelBlueMat);
          fin.position.set(-0.4, 0.95, z);
          heroGroup.add(track(fin, new THREE.Vector3(-0.4, 0.2, z * 0.6)));
        });
      }
    };

    rebuildModel(presetRef.current);

    const applyLighting = (mode: LightingMode) => {
      if (mode === 'studio') {
        scene.background = new THREE.Color(0x050a18);
        (scene.fog as THREE.FogExp2).color.setHex(0x050a18);
        keyLight.color.setHex(0xf8fafc);
        keyLight.intensity = 2.0;
        rimLight.color.setHex(0x3b82f6);
        rimLight.intensity = 1.1;
        heroGroup.traverse((c) => {
          if (c instanceof THREE.Mesh && c.material instanceof THREE.Material && 'wireframe' in c.material) {
            (c.material as THREE.MeshStandardMaterial).wireframe = false;
          }
        });
      } else if (mode === 'torchlight') {
        scene.background = new THREE.Color(0x04060e);
        (scene.fog as THREE.FogExp2).color.setHex(0x04060e);
        keyLight.color.setHex(0x93c5fd);
        keyLight.intensity = 1.35;
        rimLight.color.setHex(0x1d4ed8);
        rimLight.intensity = 2.1;
        heroGroup.traverse((c) => {
          if (c instanceof THREE.Mesh && c.material instanceof THREE.Material && 'wireframe' in c.material) {
            (c.material as THREE.MeshStandardMaterial).wireframe = false;
          }
        });
      } else {
        scene.background = new THREE.Color(0x030b1c);
        (scene.fog as THREE.FogExp2).color.setHex(0x030b1c);
        keyLight.color.setHex(0x60a5fa);
        keyLight.intensity = 1.8;
        rimLight.color.setHex(0x93c5fd);
        rimLight.intensity = 1.6;
        heroGroup.traverse((c) => {
          if (c instanceof THREE.Mesh && c.material instanceof THREE.Material && 'wireframe' in c.material) {
            (c.material as THREE.MeshStandardMaterial).wireframe = true;
          }
        });
      }
    };

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 2.6;
    controls.maxDistance = 12;
    controls.target.set(0, 1.05, 0);

    let resetGoal: THREE.Vector3 | null = null;
    const resetCamera = () => {
      resetGoal = new THREE.Vector3(4.2, 3.1, 5.4);
    };
    controls.addEventListener('start', () => {
      resetGoal = null;
    });

    sceneCtrlRef.current = { rebuildModel, applyLighting, resetCamera };

    // Raycast click on 3D Exhibition Picture Easels
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downPt = { x: 0, y: 0 };

    const onDown = (e: PointerEvent) => {
      downPt = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downPt.x, e.clientY - downPt.y) > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickableEasels, false);
      if (hits.length > 0 && onInspectPlateRef.current) {
        const plate = hits[0].object.userData.plate as ExhibitionPlate;
        onInspectPlateRef.current(plate);
      }
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer?.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    if (!isSoftwareGl) renderer.compile(scene, camera);

    let frameId = 0;
    let disposed = false;
    const clock = new THREE.Clock();
    const _targetVec = new THREE.Vector3();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const st = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (st === gl.UNSIGNALED) frameId = window.setTimeout(poll, 5);
        else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      if (autoRotateRef.current) {
        heroGroup.rotation.y += delta * 0.28;
      }

      animatedSpins.forEach((item) => {
        item.obj.rotation[item.axis] += delta * item.speed;
      });

      // Smooth Exploded-View Layer Separation via exponential damping
      const exp = explodeRef.current;
      for (const part of explodableParts) {
        _targetVec.copy(part.basePos).addScaledVector(part.explodeOffset, exp);
        part.obj.position.x = THREE.MathUtils.damp(part.obj.position.x, _targetVec.x, 7, delta);
        part.obj.position.y = THREE.MathUtils.damp(part.obj.position.y, _targetVec.y, 7, delta);
        part.obj.position.z = THREE.MathUtils.damp(part.obj.position.z, _targetVec.z, 7, delta);
      }

      if (resetGoal) {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, resetGoal.x, 5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, resetGoal.y, 5, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, resetGoal.z, 5, delta);
        if (camera.position.distanceTo(resetGoal) < 0.04) resetGoal = null;
      }

      const updateWall = galleryGroup.userData.updateVideoWall as ((t: number) => void) | undefined;
      if (updateWall) updateWall(elapsed);

      controls.update();
      if (composer && !isSoftwareGl) composer.render();
      else renderer.render(scene, camera);

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      disposeCurrentHero();
      loadedTextures.forEach((t) => t.dispose());
      controls.dispose();
      composer?.dispose();
      renderer.dispose();
    };
  }, [compact]);

  const currentMeta = MODEL_META.find((m) => m.id === activePreset) ?? MODEL_META[0];

  const handleSelectPreset = (id: MonumentPresetId) => {
    setActivePreset(id);
    onPresetChange?.(id);
  };

  return (
    <div className={`relative w-full ${heightClass} overflow-hidden rounded-2xl border border-neutral-300/70 dark:border-slate-800/80 bg-[#050a18]`}>
      {/* Isolated WebGL Mount Container */}
      <div ref={mountRef} className="h-full w-full" />

      {/* Minimal Top-Left Spec Label (Zero Viewport Occlusion) */}
      <div className="pointer-events-none absolute left-3.5 top-3.5 right-3.5 z-10 flex items-start justify-between gap-2">
        <div className="rounded-xl bg-[#070d1f]/85 border border-slate-700/70 px-3 py-1.5 text-slate-100">
          <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-blue-400">
            Interactive Three.js Reconstruction
          </div>
          <div className="text-xs font-semibold">
            {currentMeta.label} · <span className="text-slate-400 font-normal">{currentMeta.subtitle}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setHudHidden((h) => !h)}
          aria-label="Toggle 3D studio controls"
          className="pointer-events-auto tactile-press rounded-xl bg-[#070d1f]/85 border border-slate-700/70 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 hover:border-blue-500/70 flex items-center gap-1 cursor-pointer"
        >
          {hudHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{hudHidden ? 'Show Controls' : 'Hide Controls'}</span>
        </button>
      </div>

      {/* Collapsible Bottom Control Dock (Zero Viewport Center Obstruction) */}
      {!hudHidden && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[min(780px,95%)] rounded-2xl bg-[#060c1d]/90 border border-slate-700/80 px-3.5 py-2.5 text-slate-100 shadow-2xl space-y-2">
          {/* Model Switcher Row */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {MODEL_META.map((m) => {
              const active = m.id === activePreset;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectPreset(m.id)}
                  className={`tactile-press rounded-lg px-2.5 py-1 text-[11px] font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    active
                      ? 'bg-blue-700 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Exploded View Slider + Lighting + Orbit Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/80 text-[11px]">
            <label className="flex items-center gap-2 flex-1 min-w-[170px]">
              <Layers className="h-3.5 w-3.5 text-blue-400 shrink-0" />
              <span className="text-slate-300 whitespace-nowrap">Explode Layers</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={explodeFactor}
                onChange={(e) => setExplodeFactor(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <span className="font-mono-tabular text-blue-300 w-8 text-right">
                {Math.round(explodeFactor * 100)}%
              </span>
            </label>

            <div className="flex items-center gap-1.5">
              {(['studio', 'torchlight', 'blueprint'] as LightingMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setLightingMode(mode)}
                  className={`rounded-lg px-2 py-1 capitalize cursor-pointer transition-colors whitespace-nowrap ${
                    lightingMode === mode
                      ? 'bg-blue-700/80 text-white font-medium'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {mode}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setAutoRotate((a) => !a)}
                title="Toggle turntable rotation"
                className={`rounded-lg border px-2 py-1 cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  autoRotate
                    ? 'border-blue-500/60 bg-blue-600/20 text-blue-300'
                    : 'border-slate-700 text-slate-400'
                }`}
              >
                <Sparkles className="h-3 w-3" />
                <span>Spin</span>
              </button>

              <button
                type="button"
                onClick={() => sceneCtrlRef.current?.resetCamera()}
                title="Reset 3D camera"
                className="rounded-lg border border-slate-700 p-1 text-slate-300 hover:text-white hover:border-blue-500 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
