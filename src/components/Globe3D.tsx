import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { CIVILIZATIONS, getActiveCivilizationsForYear } from '../data/civilizations';
import { COUNTRY_BY_ISO } from '../data/countries';
import { HISTORICAL_SITES, TRADE_ROUTES } from '../data/timeline';
import { formatHistoricalYear, localize } from '../i18n/languages';
import { useAtlasStore } from '../store/useAtlasStore';
import type { GeoCoord } from '../types';
import { findCountryAtCoords, getWorldCountries } from '../utils/worldGeo';

const EARTH_RADIUS = 2.0;

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

function latLngToVec3(lat: number, lng: number, radius: number, out = new THREE.Vector3()): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lng + 180);
  out.set(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
  return out;
}

function vec3ToLatLng(vec: THREE.Vector3): GeoCoord {
  const n = vec.clone().normalize();
  const lat = 90 - THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(n.y, -1, 1)));
  const lng = THREE.MathUtils.radToDeg(Math.atan2(n.z, -n.x)) - 180;
  const wrappedLng = ((lng + 540) % 360) - 180;
  return { lat, lng: wrappedLng };
}

function paintBaseEarthCanvas(
  canvas: HTMLCanvasElement,
  isDark: boolean,
  hoveredIso: string | null
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;

  // Ocean gradient (Neutral & Dark Blue)
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, H);
  if (isDark) {
    oceanGrad.addColorStop(0, '#040a18');
    oceanGrad.addColorStop(0.5, '#071226');
    oceanGrad.addColorStop(1, '#030814');
  } else {
    oceanGrad.addColorStop(0, '#d4e0ee');
    oceanGrad.addColorStop(0.5, '#dbe4f0');
    oceanGrad.addColorStop(1, '#cbd9ea');
  }
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle graticule grid
  ctx.strokeStyle = isDark ? 'rgba(150,150,158, 0.08)' : 'rgba(15, 23, 42, 0.08)';
  ctx.lineWidth = 1;
  for (let lon = -150; lon <= 180; lon += 30) {
    const x = ((lon + 180) / 360) * W;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = ((90 - lat) / 180) * H;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Country polygons from Natural Earth
  const countries = getWorldCountries();
  for (const country of countries) {
    const isHovered = hoveredIso === country.isoNumeric;
    ctx.fillStyle = isHovered
      ? isDark
        ? '#26395c'
        : '#cbd5e1'
      : isDark
        ? '#17233a'
        : '#f1f5f9';
    ctx.strokeStyle = isDark ? 'rgba(150,150,158, 0.25)' : 'rgba(51, 65, 85, 0.26)';
    ctx.lineWidth = isHovered ? 1.5 : 0.7;

    for (const ring of country.rings) {
      if (ring.length < 3) continue;
      ctx.beginPath();
      for (let i = 0; i < ring.length; i++) {
        const [lng, lat] = ring[i];
        const x = ((lng + 180) / 360) * W;
        const y = ((90 - lat) / 180) * H;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevLng = ring[i - 1][0];
          if (Math.abs(lng - prevLng) > 180) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
}

function compositeEarthTexture(
  baseCanvas: HTMLCanvasElement,
  targetCanvas: HTMLCanvasElement,
  year: number
) {
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;
  const W = targetCanvas.width;
  const H = targetCanvas.height;

  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(baseCanvas, 0, 0);

  // Active historical empires/civilizations territory wash for selected year
  const activeCivs = getActiveCivilizationsForYear(year);
  for (const civ of activeCivs) {
    for (const region of civ.territoryRegions) {
      const cx = ((region.center.lng + 180) / 360) * W;
      const cy = ((90 - region.center.lat) / 180) * H;
      const rPx = (region.radiusDeg / 180) * H * 1.15;

      const grad = ctx.createRadialGradient(cx, cy, rPx * 0.1, cx, cy, rPx);
      grad.addColorStop(0, `${civ.color}99`);
      grad.addColorStop(0.65, `${civ.color}44`);
      grad.addColorStop(1, `${civ.color}00`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, rPx, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function createLandReliefBumpTexture(w: number, h: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#080808';
  ctx.fillRect(0, 0, w, h);

  const countries = getWorldCountries();
  ctx.fillStyle = '#d8d8d8';
  for (const country of countries) {
    for (const ring of country.rings) {
      if (ring.length < 3) continue;
      ctx.beginPath();
      for (let i = 0; i < ring.length; i++) {
        const [lng, lat] = ring[i];
        const x = ((lng + 180) / 360) * w;
        const y = ((90 - lat) / 180) * h;
        if (i === 0) ctx.moveTo(x, y);
        else if (Math.abs(lng - ring[i - 1][0]) > 180) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

function createCloudLayerTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 1024, 512);

  for (let i = 0; i < 160; i++) {
    const x = (i * 97) % 1024;
    const y = 36 + ((i * 53) % 440);
    const rx = 24 + (i % 5) * 18;
    const ry = 8 + (i % 4) * 5;
    const g = ctx.createRadialGradient(x, y, 2, x, y, rx);
    g.addColorStop(0, 'rgba(226, 232, 240, 0.24)');
    g.addColorStop(1, 'rgba(226, 232, 240, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, (i % 6) * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function Globe3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const selectedYear = useAtlasStore((s) => s.selectedYear);
  const theme = useAtlasStore((s) => s.progress.preferences.theme);
  const quality = useAtlasStore((s) => s.progress.preferences.graphicsQuality);
  const lang = useAtlasStore((s) => s.progress.preferences.language);
  const flyToCoords = useAtlasStore((s) => s.flyToCoords);

  const [hoverLabel, setHoverLabel] = useState<{ text: string; sub?: string; x: number; y: number } | null>(null);
  const [contextLost, setContextLost] = useState(false);

  const yearRef = useRef(selectedYear);
  const themeRef = useRef(theme);
  const langRef = useRef(lang);
  yearRef.current = selectedYear;
  themeRef.current = theme;
  langRef.current = lang;

  const sceneHandlesRef = useRef<{
    baseCanvas: HTMLCanvasElement;
    earthCanvas: HTMLCanvasElement;
    earthTexture: THREE.CanvasTexture;
    markersGroup: THREE.Group;
    routesGroup: THREE.Group;
    updateTimeOverlays: () => void;
    flyTo: (coords: GeoCoord) => void;
    hoveredIso: string | null;
    pendingRaf: number;
  } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0.4, 2.2, 5.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl && quality !== 'low',
      powerPreference: 'high-performance',
      alpha: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    const dprCap = quality === 'high' ? 2 : quality === 'balanced' ? 1.5 : 1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, dprCap));
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => setContextLost(false);
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Lighting rig: neutral studio key + cool hemisphere fill + cobalt rim
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x0f172a, 0.9);
    scene.add(hemiLight);
    const keyLight = new THREE.DirectionalLight(0xf8fafc, 1.75);
    keyLight.position.set(6, 4, 6);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x3b82f6, 0.65);
    rimLight.position.set(-6, -2, -5);
    scene.add(rimLight);

    // Procedural Starfield
    const starCount = quality === 'low' ? 600 : 1600;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 24 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xe2e8f0, size: 0.08, transparent: true, opacity: 0.8 });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // Cached Static Base Map + Dynamic Historical Composite Canvas
    const texW = quality === 'low' ? 1024 : 2048;
    const texH = quality === 'low' ? 512 : 1024;
    const baseCanvas = document.createElement('canvas');
    baseCanvas.width = texW;
    baseCanvas.height = texH;
    paintBaseEarthCanvas(baseCanvas, themeRef.current === 'dark', null);

    const earthCanvas = document.createElement('canvas');
    earthCanvas.width = texW;
    earthCanvas.height = texH;
    compositeEarthTexture(baseCanvas, earthCanvas, yearRef.current);

    const earthTexture = new THREE.CanvasTexture(earthCanvas);
    earthTexture.colorSpace = THREE.SRGBColorSpace;
    earthTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const bumpTexture = createLandReliefBumpTexture(texW / 2, texH / 2);
    const cloudTexture = createCloudLayerTexture();

    const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS, quality === 'low' ? 40 : 72, quality === 'low' ? 40 : 72);
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTexture,
      bumpMap: bumpTexture,
      bumpScale: 0.032,
      roughness: 0.68,
      metalness: 0.1,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earthMesh);

    // Drifting Volumetric Cloud Sphere
    const cloudGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.012, quality === 'low' ? 32 : 56, quality === 'low' ? 32 : 56);
    const cloudMat = new THREE.MeshStandardMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      roughness: 0.9,
    });
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    scene.add(cloudMesh);

    // GPU-only subtle UnrealBloomPass
    let composer: EffectComposer | null = null;
    if (!isSoftwareGl && quality !== 'low') {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(
        new UnrealBloomPass(new THREE.Vector2(width, height), 0.24, 0.4, 0.86)
      );
    }

    // Atmospheric Fresnel Glow Shell
    const atmosGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.045, 48, 48);
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.2);
          gl_FragColor = vec4(0.24, 0.62, 0.98, 1.0) * intensity * 0.65;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    scene.add(atmosMesh);

    // 3D Vector Borders
    const borderVertices: number[] = [];
    const countries = getWorldCountries();
    const tmpA = new THREE.Vector3();
    const tmpB = new THREE.Vector3();
    for (const c of countries) {
      for (const ring of c.rings) {
        for (let i = 0; i < ring.length - 1; i++) {
          const [lng1, lat1] = ring[i];
          const [lng2, lat2] = ring[i + 1];
          if (Math.abs(lng1 - lng2) > 180) continue;
          latLngToVec3(lat1, lng1, EARTH_RADIUS + 0.004, tmpA);
          latLngToVec3(lat2, lng2, EARTH_RADIUS + 0.004, tmpB);
          borderVertices.push(tmpA.x, tmpA.y, tmpA.z, tmpB.x, tmpB.y, tmpB.z);
        }
      }
    }
    const borderGeo = new THREE.BufferGeometry();
    borderGeo.setAttribute('position', new THREE.Float32BufferAttribute(borderVertices, 3));
    const borderMat = new THREE.LineBasicMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.28,
    });
    const borderLines = new THREE.LineSegments(borderGeo, borderMat);
    scene.add(borderLines);

    // Pre-pooled overlays (built once, toggled instantaneously during real-time scrubbing)
    const markersGroup = new THREE.Group();
    const routesGroup = new THREE.Group();
    scene.add(markersGroup);
    scene.add(routesGroup);

    const clickablePins: THREE.Object3D[] = [];
    const pinBaseGeo = new THREE.RingGeometry(0.022, 0.036, 20);
    const pinShaftGeo = new THREE.CylinderGeometry(0.008, 0.012, 0.09, 10);
    const pinCrownGeo = new THREE.OctahedronGeometry(0.022, 0);

    const basePinMat = new THREE.MeshBasicMaterial({ color: 0x2563eb, side: THREE.DoubleSide });
    const shaftPinMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.7, roughness: 0.25 });
    const crownPinMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.75,
      roughness: 0.2,
      metalness: 0.35,
    });

    for (const site of HISTORICAL_SITES) {
      const pinGroup = new THREE.Group();
      const surfacePos = latLngToVec3(site.coords.lat, site.coords.lng, EARTH_RADIUS + 0.006);
      pinGroup.position.copy(surfacePos);
      pinGroup.lookAt(surfacePos.clone().multiplyScalar(2));
      pinGroup.userData = { foundedYear: site.foundedYear, site };

      const base = new THREE.Mesh(pinBaseGeo, basePinMat);
      const shaft = new THREE.Mesh(pinShaftGeo, shaftPinMat);
      shaft.rotation.x = Math.PI / 2;
      shaft.position.z = 0.045;
      const crown = new THREE.Mesh(pinCrownGeo, crownPinMat);
      crown.position.z = 0.1;

      const pinData = { siteId: site.id, title: localize(site.name, langRef.current), coords: site.coords };
      crown.userData = pinData;
      base.userData = pinData;
      shaft.userData = pinData;

      pinGroup.add(base, shaft, crown);
      markersGroup.add(pinGroup);
      clickablePins.push(crown, shaft);
    }

    const routeMaterials: THREE.MeshBasicMaterial[] = [];
    const routeGeometries: THREE.TubeGeometry[] = [];
    for (const route of TRADE_ROUTES) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i < route.points.length - 1; i++) {
        const p1 = latLngToVec3(route.points[i].lat, route.points[i].lng, EARTH_RADIUS + 0.02);
        const p2 = latLngToVec3(route.points[i + 1].lat, route.points[i + 1].lng, EARTH_RADIUS + 0.02);
        for (let s = 0; s <= 12; s++) {
          const t = s / 12;
          const interp = p1.clone().lerp(p2, t).normalize();
          const arch = Math.sin(t * Math.PI) * 0.06;
          interp.multiplyScalar(EARTH_RADIUS + 0.015 + arch);
          pts.push(interp);
        }
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.008, 6, false);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(route.color),
        transparent: true,
        opacity: 0.78,
      });
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      tubeMesh.userData = { activeFrom: route.activeFrom, activeTo: route.activeTo };
      routesGroup.add(tubeMesh);
      routeGeometries.push(tubeGeo);
      routeMaterials.push(tubeMat);
    }

    const updateTimeOverlays = () => {
      const year = yearRef.current;
      for (const grp of markersGroup.children) {
        const { foundedYear, site } = grp.userData as { foundedYear: number; site: (typeof HISTORICAL_SITES)[number] };
        grp.visible = year >= foundedYear - 50;
        const localized = localize(site.name, langRef.current);
        for (const ch of grp.children) {
          ch.userData.title = localized;
        }
      }
      for (const routeMesh of routesGroup.children) {
        const { activeFrom, activeTo } = routeMesh.userData as { activeFrom: number; activeTo: number };
        routeMesh.visible = year >= activeFrom && year <= activeTo;
      }
    };

    updateTimeOverlays();

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 2.65;
    controls.maxDistance = 8.5;
    controls.enablePan = false;
    controls.rotateSpeed = 0.75;

    // Smooth camera fly-to target
    let flyTargetVec: THREE.Vector3 | null = null;
    const flyTo = (coords: GeoCoord) => {
      const dist = Math.min(Math.max(camera.position.length(), 3.3), 4.6);
      flyTargetVec = latLngToVec3(coords.lat, coords.lng, dist);
    };

    controls.addEventListener('start', () => {
      flyTargetVec = null;
    });

    sceneHandlesRef.current = {
      baseCanvas,
      earthCanvas,
      earthTexture,
      markersGroup,
      routesGroup,
      updateTimeOverlays,
      flyTo,
      hoveredIso: null,
      pendingRaf: 0,
    };

    // Raycasting
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let downPt = { x: 0, y: 0 };
    let lastHoverTime = 0;

    const getNdc = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerDown = (e: PointerEvent) => {
      downPt = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverTime < 45) return;
      lastHoverTime = now;

      getNdc(e);
      raycaster.setFromCamera(pointerNdc, camera);

      const visiblePins = clickablePins.filter((p) => p.parent?.visible);
      const pinHits = raycaster.intersectObjects(visiblePins, false);
      if (pinHits.length > 0) {
        const data = pinHits[0].object.userData as { title: string };
        setHoverLabel({ text: data.title, sub: 'Historical Site', x: e.clientX, y: e.clientY });
        renderer.domElement.style.cursor = 'pointer';
        return;
      }

      const earthHits = raycaster.intersectObject(earthMesh, false);
      if (earthHits.length > 0) {
        const coords = vec3ToLatLng(earthHits[0].point);
        const country = findCountryAtCoords(coords.lat, coords.lng);
        if (country) {
          const chronicle = COUNTRY_BY_ISO[country.isoNumeric];
          const label = chronicle ? localize(chronicle.name, langRef.current) : country.name;
          const activeCivs = getActiveCivilizationsForYear(yearRef.current).filter((civ) =>
            civ.territoryRegions.some((r) => {
              const dLat = r.center.lat - coords.lat;
              const dLng = r.center.lng - coords.lng;
              return Math.hypot(dLat, dLng) <= r.radiusDeg + 5;
            })
          );
          setHoverLabel({
            text: label,
            sub: activeCivs[0]
              ? `${localize(activeCivs[0].name, langRef.current)} (${formatHistoricalYear(yearRef.current, langRef.current)})`
              : formatHistoricalYear(yearRef.current, langRef.current),
            x: e.clientX,
            y: e.clientY,
          });
          renderer.domElement.style.cursor = 'pointer';
          return;
        }
      }

      setHoverLabel(null);
      renderer.domElement.style.cursor = 'grab';
    };

    const onPointerUp = (e: PointerEvent) => {
      const moved = Math.hypot(e.clientX - downPt.x, e.clientY - downPt.y);
      if (moved > 6) return;

      getNdc(e);
      raycaster.setFromCamera(pointerNdc, camera);
      const store = useAtlasStore.getState();

      const visiblePins = clickablePins.filter((p) => p.parent?.visible);
      const pinHits = raycaster.intersectObjects(visiblePins, false);
      if (pinHits.length > 0) {
        const { siteId, coords } = pinHits[0].object.userData as { siteId: string; coords: GeoCoord };
        store.recordExploredLocation(siteId);
        store.setInspector({ type: 'site', id: siteId, coords });
        flyTo(coords);
        return;
      }

      const earthHits = raycaster.intersectObject(earthMesh, false);
      if (earthHits.length > 0) {
        const coords = vec3ToLatLng(earthHits[0].point);
        const country = findCountryAtCoords(coords.lat, coords.lng);
        if (country) {
          const chronicle = COUNTRY_BY_ISO[country.isoNumeric];
          if (chronicle) {
            store.recordExploredLocation(chronicle.id);
            store.setInspector({ type: 'country', id: chronicle.id, coords: chronicle.coords });
          } else {
            store.recordExploredLocation(`iso-${country.isoNumeric}`);
            store.setInspector({
              type: 'dynamic-country',
              id: country.isoNumeric,
              isoNumeric: country.isoNumeric,
              title: country.name,
              coords: country.centroid,
            });
          }
          flyTo(country.centroid);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

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

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Animation loop with software WebGL pacing
    let frameId = 0;
    let disposed = false;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
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

      if (flyTargetVec) {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, flyTargetVec.x, 4.5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, flyTargetVec.y, 4.5, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, flyTargetVec.z, 4.5, delta);
        if (camera.position.distanceTo(flyTargetVec) < 0.03) {
          flyTargetVec = null;
        }
      }

      // Gentle pulse on architectural pin crowns
      markersGroup.children.forEach((grp, idx) => {
        const crown = grp.children[2];
        if (crown) {
          crown.rotation.y = elapsed * 1.4 + idx;
        }
      });

      cloudMesh.rotation.y += delta * 0.012;

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
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);

      controls.dispose();
      earthGeo.dispose();
      earthMat.dispose();
      earthTexture.dispose();
      bumpTexture.dispose();
      cloudGeo.dispose();
      cloudMat.dispose();
      cloudTexture.dispose();
      atmosGeo.dispose();
      atmosMat.dispose();
      borderGeo.dispose();
      borderMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      pinBaseGeo.dispose();
      pinShaftGeo.dispose();
      pinCrownGeo.dispose();
      basePinMat.dispose();
      shaftPinMat.dispose();
      crownPinMat.dispose();
      routeGeometries.forEach((g) => g.dispose());
      routeMaterials.forEach((m) => m.dispose());
      composer?.dispose();
      if (sceneHandlesRef.current?.pendingRaf) {
        cancelAnimationFrame(sceneHandlesRef.current.pendingRaf);
      }
      renderer.dispose();
    };
  }, [quality]);

  // Repaint cached static base map only when theme changes
  useEffect(() => {
    const handles = sceneHandlesRef.current;
    if (!handles) return;
    paintBaseEarthCanvas(handles.baseCanvas, theme === 'dark', handles.hoveredIso);
    compositeEarthTexture(handles.baseCanvas, handles.earthCanvas, yearRef.current);
    handles.earthTexture.needsUpdate = true;
  }, [theme]);

  // Real-time coalesced update when selectedYear or language changes during timeline scrubbing
  useEffect(() => {
    const handles = sceneHandlesRef.current;
    if (!handles) return;
    handles.updateTimeOverlays();
    if (handles.pendingRaf) cancelAnimationFrame(handles.pendingRaf);
    handles.pendingRaf = requestAnimationFrame(() => {
      handles.pendingRaf = 0;
      compositeEarthTexture(handles.baseCanvas, handles.earthCanvas, yearRef.current);
      handles.earthTexture.needsUpdate = true;
    });
  }, [selectedYear, lang]);

  // Fly camera when store flyToCoords updates
  useEffect(() => {
    if (flyToCoords && sceneHandlesRef.current) {
      sceneHandlesRef.current.flyTo(flyToCoords);
    }
  }, [flyToCoords]);

  if (contextLost) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-950 text-slate-200 p-8 text-center">
        <div>
          <p className="font-display text-2xl">WebGL Context Suspended</p>
          <p className="mt-2 text-sm text-slate-400">
            Switch to 2D Historical Atlas mode in the bottom dock to continue exploring smoothly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full select-none overflow-hidden">
      <div ref={mountRef} className="h-full w-full" />

      {hoverLabel && (
        <div
          style={{ left: hoverLabel.x + 14, top: hoverLabel.y - 12 }}
          className="pointer-events-none fixed z-30 rounded-xl webgl-hud-surface px-3 py-1.5 text-xs shadow-lg"
        >
          <div className="font-semibold text-neutral-900 dark:text-slate-100">{hoverLabel.text}</div>
          {hoverLabel.sub && (
            <div className="text-[11px] text-blue-700 dark:text-blue-400">{hoverLabel.sub}</div>
          )}
        </div>
      )}
    </div>
  );
}
