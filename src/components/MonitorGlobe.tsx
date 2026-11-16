import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RefreshCw } from 'lucide-react';
import { getWorldCountries } from '../utils/worldGeo';
import { useAtlasStore } from '../store/useAtlasStore';

export interface GlobeMarker {
  id: string;
  lat: number;
  lng: number;
  kind: 'news' | 'place' | 'plane';
  fresh?: boolean;
  selected?: boolean;
  heading?: number;
}

const R = 2;

type Quality = 'high' | 'balanced' | 'low';

const QUALITY_SETTINGS: Record<
  Quality,
  { pixelRatio: number; textureSize: number; segments: number; antialias: boolean }
> = {
  high: { pixelRatio: 2, textureSize: 2048, segments: 64, antialias: true },
  balanced: { pixelRatio: 1.5, textureSize: 1536, segments: 48, antialias: true },
  low: { pixelRatio: 1, textureSize: 1024, segments: 32, antialias: false },
};

const MARKER_COLORS: Record<GlobeMarker['kind'], number> = {
  news: 0xfbbf24, // amber
  place: 0x38bdf8, // sky
  plane: 0x34d399, // emerald
};

function qualitySettings(pref: string | undefined) {
  return QUALITY_SETTINGS[pref === 'balanced' || pref === 'low' ? pref : 'high'];
}

function toVec(lat: number, lng: number, r: number, out = new THREE.Vector3()) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lng + 180);
  return out.set(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

function markerSignature(list: GlobeMarker[]): string {
  return list
    .map((m) => `${m.id}:${m.kind}:${m.fresh ? 1 : 0}:${m.selected ? 1 : 0}:${Math.round(m.heading ?? 0)}`)
    .join('|');
}

const textureCache = new Map<number, HTMLCanvasElement>();

function earthCanvas(size: number): HTMLCanvasElement {
  const cached = textureCache.get(size);
  if (cached) return cached;

  const W = Math.max(512, Math.round(size));
  const H = Math.round(W / 2);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas is unavailable');

  // Deep ocean gradient
  const ocean = ctx.createLinearGradient(0, 0, 0, H);
  ocean.addColorStop(0, '#07182b');
  ocean.addColorStop(0.18, '#0b2b49');
  ocean.addColorStop(0.5, '#12496f');
  ocean.addColorStop(0.82, '#0b2b49');
  ocean.addColorStop(1, '#07182b');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, W, H);

  // Soft equatorial sheen for depth
  const sheen = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, W * 0.6);
  sheen.addColorStop(0, 'rgba(120,200,255,0.16)');
  sheen.addColorStop(0.55, 'rgba(80,150,220,0.06)');
  sheen.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, W, H);

  // Subtle graticule
  ctx.strokeStyle = 'rgba(150,205,255,0.075)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let lng = -180; lng <= 180; lng += 30) {
    const x = ((lng + 180) / 360) * W;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = ((90 - lat) / 180) * H;
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
  }
  ctx.stroke();

  // Brighter land fill with a thin coastline stroke
  const countries = getWorldCountries();
  ctx.fillStyle = '#35775d';
  ctx.strokeStyle = 'rgba(206,255,231,0.55)';
  ctx.lineWidth = Math.max(0.8, W / 2200);
  ctx.lineJoin = 'round';
  for (const country of countries) {
    for (const ring of country.rings) {
      if (ring.length < 3) continue;
      ctx.beginPath();
      let prevLng = ring[0][0];
      ring.forEach(([lng, lat], i) => {
        const x = ((lng + 180) / 360) * W;
        const y = ((90 - lat) / 180) * H;
        if (i === 0 || Math.abs(lng - prevLng) > 180) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        prevLng = lng;
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // Soft polar ice fade
  const north = ctx.createLinearGradient(0, 0, 0, H * 0.11);
  north.addColorStop(0, 'rgba(216,240,255,0.62)');
  north.addColorStop(1, 'rgba(216,240,255,0)');
  ctx.fillStyle = north;
  ctx.fillRect(0, 0, W, H * 0.11);

  const south = ctx.createLinearGradient(0, H, 0, H * 0.88);
  south.addColorStop(0, 'rgba(216,240,255,0.62)');
  south.addColorStop(1, 'rgba(216,240,255,0)');
  ctx.fillStyle = south;
  ctx.fillRect(0, H * 0.88, W, H * 0.12);

  textureCache.set(size, c);
  return c;
}

function glowTexture(): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas is unavailable');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.22, 'rgba(255,255,255,0.72)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.2)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function ringTexture(): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas is unavailable');
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 5;
  ctx.shadowColor = 'rgba(255,255,255,0.75)';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 16, 0, Math.PI * 2);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function MonitorGlobe({ markers, focus, onPick, rotate = true }: { markers: GlobeMarker[]; focus: { lat: number; lng: number } | null; onPick: (id: string) => void; rotate?: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [nonce, setNonce] = useState(0);

  const qualityPref = useAtlasStore((s) => s.progress.preferences.graphicsQuality);
  const reducedMotionPref = useAtlasStore((s) => s.progress.preferences.reducedMotion);
  const quality = qualitySettings(qualityPref);

  const markersRef = useRef<GlobeMarker[]>(markers);
  const focusRef = useRef(focus);
  const rotateRef = useRef(rotate);
  const reducedMotionRef = useRef(reducedMotionPref);
  const pickRef = useRef(onPick);
  const apiRef = useRef<{ rebuild: () => void; fly: () => void; syncAutoRotate: () => void } | null>(null);
  const signatureRef = useRef('');

  markersRef.current = markers;
  focusRef.current = focus;
  rotateRef.current = rotate;
  reducedMotionRef.current = reducedMotionPref;
  pickRef.current = onPick;

  const retry = useCallback(() => {
    setError(null);
    setContextLost(false);
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const cleanups: Array<() => void> = [];
    const addCleanup = (fn: () => void) => cleanups.push(fn);
    const runCleanup = () => {
      while (cleanups.length) {
        const fn = cleanups.pop();
        try {
          fn?.();
        } catch {
          /* keep disposing the rest */
        }
      }
    };

    let frame = 0;
    let running = false;
    let onScreen = true;
    let lost = false;

    try {
      const settings = quality;
      const renderer = new THREE.WebGLRenderer({
        antialias: settings.antialias,
        alpha: true,
        powerPreference: 'high-performance',
      });
      addCleanup(() => {
        renderer.dispose();
        renderer.domElement.remove();
      });

      if (!renderer.getContext()) throw new Error('WebGL context is unavailable');
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, settings.pixelRatio));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      renderer.setClearColor(0x050a14, 0);

      const canvas = renderer.domElement;
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      canvas.style.touchAction = 'none';
      host.appendChild(canvas);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
      camera.position.set(0, 1.25, 6.4);

      const controls = new OrbitControls(camera, canvas);
      addCleanup(() => controls.dispose());
      controls.enablePan = false;
      controls.enableDamping = true;
      controls.dampingFactor = 0.07;
      controls.rotateSpeed = 0.6;
      controls.minDistance = 3;
      controls.maxDistance = 9;
      controls.autoRotateSpeed = 0.45;

      // Lighting tuned for ACES tone mapping
      scene.add(new THREE.AmbientLight(0xbcd6ff, 1.15));
      const sun = new THREE.DirectionalLight(0xfff4e0, 2.4);
      sun.position.set(5, 3, 5);
      scene.add(sun);
      const fill = new THREE.DirectionalLight(0x4a86ff, 0.7);
      fill.position.set(-6, -2, -4);
      scene.add(fill);

      // Earth
      const tex = new THREE.CanvasTexture(earthCanvas(settings.textureSize));
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      const earthGeo = new THREE.SphereGeometry(R, settings.segments, settings.segments);
      const earthMat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.86,
        metalness: 0.04,
        emissive: new THREE.Color(0x0a1d33),
        emissiveIntensity: 0.55,
      });
      const earth = new THREE.Mesh(earthGeo, earthMat);
      scene.add(earth);
      addCleanup(() => {
        tex.dispose();
        earthGeo.dispose();
        earthMat.dispose();
      });

      // Fresnel atmosphere rim
      const atmoGeo = new THREE.SphereGeometry(R * 1.14, settings.segments, settings.segments);
      const atmoMat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(0x4f8fff) },
          uPower: { value: 2.6 },
          uIntensity: { value: 0.9 },
        },
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vView;
          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vNormal = normalize(normalMatrix * normal);
            vView = normalize(-mvPosition.xyz);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uPower;
          uniform float uIntensity;
          varying vec3 vNormal;
          varying vec3 vView;
          void main() {
            float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), uPower);
            gl_FragColor = vec4(uColor * rim * uIntensity, rim * uIntensity);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
      });
      const atmosphere = new THREE.Mesh(atmoGeo, atmoMat);
      atmosphere.renderOrder = 1;
      scene.add(atmosphere);
      addCleanup(() => {
        atmoGeo.dispose();
        atmoMat.dispose();
      });

      // Very faint starfield
      const STAR_COUNT = 900;
      const starPositions = new Float32Array(STAR_COUNT * 3);
      const starColors = new Float32Array(STAR_COUNT * 3);
      const starColor = new THREE.Color();
      for (let i = 0; i < STAR_COUNT; i++) {
        const u = Math.random() * 2 - 1;
        const theta = Math.random() * Math.PI * 2;
        const ringRadius = Math.sqrt(Math.max(0, 1 - u * u));
        const radius = 16 + Math.random() * 16;
        starPositions[i * 3] = Math.cos(theta) * ringRadius * radius;
        starPositions[i * 3 + 1] = u * radius;
        starPositions[i * 3 + 2] = Math.sin(theta) * ringRadius * radius;
        starColor.setHSL(0.55 + Math.random() * 0.08, 0.25 + Math.random() * 0.3, 0.72 + Math.random() * 0.2);
        starColors[i * 3] = starColor.r;
        starColors[i * 3 + 1] = starColor.g;
        starColors[i * 3 + 2] = starColor.b;
      }
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
      const starMat = new THREE.PointsMaterial({
        size: 0.07,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
      });
      scene.add(new THREE.Points(starGeo, starMat));
      addCleanup(() => {
        starGeo.dispose();
        starMat.dispose();
      });

      // Markers
      const group = new THREE.Group();
      scene.add(group);

      const glowTex = glowTexture();
      const ringTex = ringTexture();
      const dotGeo = new THREE.SphereGeometry(0.032, 12, 10);
      const planeGeo = new THREE.ConeGeometry(0.02, 0.075, 6);
      addCleanup(() => {
        glowTex.dispose();
        ringTex.dispose();
        dotGeo.dispose();
        planeGeo.dispose();
      });

      const pickables: THREE.Mesh[] = [];
      const pulsers: Array<{ obj: THREE.Object3D; base: number; amp: number; phase: number }> = [];
      const up = new THREE.Vector3(0, 1, 0);
      const anchor = new THREE.Vector3();

      const addGlow = (position: THREE.Vector3, color: number, scale: number, opacity: number) => {
        const material = new THREE.SpriteMaterial({
          map: glowTex,
          color,
          transparent: true,
          opacity,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
        });
        const sprite = new THREE.Sprite(material);
        sprite.position.copy(position);
        sprite.scale.setScalar(scale);
        group.add(sprite);
        return sprite;
      };

      const rebuild = () => {
        for (const child of group.children.slice()) {
          group.remove(child);
          child.traverse((o) => {
            const material = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
            if (Array.isArray(material)) material.forEach((m) => m.dispose());
            else material?.dispose();
          });
        }
        pickables.length = 0;
        pulsers.length = 0;

        markersRef.current.forEach((m, index) => {
          const color = MARKER_COLORS[m.kind] ?? MARKER_COLORS.news;
          toVec(m.lat, m.lng, R * 1.012, anchor);

          if (m.kind === 'plane') {
            const mesh = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({ color, toneMapped: false }));
            mesh.position.copy(toVec(m.lat, m.lng, R * 1.05));
            mesh.quaternion.setFromUnitVectors(up, mesh.position.clone().normalize());
            mesh.rotateY(-THREE.MathUtils.degToRad(m.heading ?? 0));
            mesh.userData.id = m.id;
            group.add(mesh);
            const glow = addGlow(mesh.position, color, 0.18, 0.7);
            pickables.push(mesh);
            pulsers.push({ obj: glow, base: 0.18, amp: 0.18, phase: index });
          } else if (m.kind === 'place') {
            const mesh = new THREE.Mesh(
              dotGeo,
              new THREE.MeshBasicMaterial({ color: m.selected ? 0xffffff : color, toneMapped: false }),
            );
            mesh.position.copy(anchor);
            mesh.scale.setScalar(m.selected ? 1.5 : 0.8);
            mesh.userData.id = m.id;
            group.add(mesh);
            const glow = addGlow(toVec(m.lat, m.lng, R * 1.03), color, m.selected ? 0.34 : 0.2, m.selected ? 0.95 : 0.6);
            pickables.push(mesh);
            if (m.selected) pulsers.push({ obj: glow, base: 0.34, amp: 0.22, phase: index });
          } else {
            const core = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color, toneMapped: false }));
            core.position.copy(anchor);
            core.userData.id = m.id;
            group.add(core);
            const glowScale = m.selected ? 0.5 : m.fresh ? 0.38 : 0.22;
            const glow = addGlow(toVec(m.lat, m.lng, R * 1.03), color, glowScale, m.selected ? 1 : m.fresh ? 0.9 : 0.6);
            pickables.push(core);
            if (m.fresh || m.selected) pulsers.push({ obj: glow, base: glowScale, amp: 0.22, phase: index });
          }

          if (m.selected) {
            const ringMaterial = new THREE.SpriteMaterial({
              map: ringTex,
              color,
              transparent: true,
              opacity: 0.9,
              depthWrite: false,
              blending: THREE.AdditiveBlending,
              toneMapped: false,
            });
            const ring = new THREE.Sprite(ringMaterial);
            ring.position.copy(toVec(m.lat, m.lng, R * 1.04));
            ring.scale.setScalar(0.5);
            group.add(ring);
            pulsers.push({ obj: ring, base: 0.5, amp: 0.45, phase: 0 });
          }
        });
      };

      rebuild();

      // Camera fly-to
      let flyTarget: THREE.Vector3 | null = null;
      const applyAutoRotate = () => {
        controls.autoRotate = Boolean(rotateRef.current && !reducedMotionRef.current && !focusRef.current);
      };
      const fly = () => {
        const f = focusRef.current;
        if (!f) {
          flyTarget = null;
          applyAutoRotate();
          return;
        }
        flyTarget = toVec(f.lat, f.lng, 1).normalize().multiplyScalar(3.6);
        controls.autoRotate = false;
      };
      const syncAutoRotate = () => {
        if (!focusRef.current) flyTarget = null;
        applyAutoRotate();
      };
      const api = { rebuild, fly, syncAutoRotate };
      apiRef.current = api;
      addCleanup(() => {
        if (apiRef.current === api) apiRef.current = null;
      });
      fly();

      // Picking (ignore drags)
      let down: { x: number; y: number } | null = null;
      const onDown = (e: PointerEvent) => {
        down = { x: e.clientX, y: e.clientY };
      };
      const onUp = (e: PointerEvent) => {
        if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) {
          down = null;
          return;
        }
        down = null;
        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const ndc = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1,
        );
        const cameraDir = camera.position.clone().normalize();
        let best: { id: string; d: number } | null = null;
        const v = new THREE.Vector3();
        for (const o of pickables) {
          o.getWorldPosition(v);
          if (v.clone().normalize().dot(cameraDir) < 0.15) continue; // far side
          v.project(camera);
          const d = Math.hypot((v.x - ndc.x) * rect.width, (v.y - ndc.y) * rect.height);
          if (d < 14 && (!best || d < best.d)) best = { id: o.userData.id as string, d };
        }
        if (best) pickRef.current(best.id);
      };
      canvas.addEventListener('pointerdown', onDown);
      canvas.addEventListener('pointerup', onUp);
      addCleanup(() => {
        canvas.removeEventListener('pointerdown', onDown);
        canvas.removeEventListener('pointerup', onUp);
      });
      const onControlsStart = () => {
        flyTarget = null;
      };
      controls.addEventListener('start', onControlsStart);
      addCleanup(() => controls.removeEventListener('start', onControlsStart));

      // WebGL context loss / restoration
      const onContextLost = (event: Event) => {
        event.preventDefault();
        lost = true;
        setContextLost(true);
        stopLoop();
      };
      const onContextRestored = () => {
        lost = false;
        setContextLost(false);
        // Ask React to rebuild the scene from scratch on a fresh context.
        setNonce((n) => n + 1);
      };
      canvas.addEventListener('webglcontextlost', onContextLost);
      canvas.addEventListener('webglcontextrestored', onContextRestored);
      addCleanup(() => {
        canvas.removeEventListener('webglcontextlost', onContextLost);
        canvas.removeEventListener('webglcontextrestored', onContextRestored);
      });

      // Sizing (guard against zero-sized parents)
      let lastW = 0;
      let lastH = 0;
      const resize = () => {
        const rawW = host.clientWidth;
        const rawH = host.clientHeight;
        const w = rawW > 0 ? rawW : 320;
        const h = rawH > 0 ? rawH : 320;
        if (w === lastW && h === lastH) return;
        lastW = w;
        lastH = h;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        if (!lost) renderer.render(scene, camera);
      };
      const ro = new ResizeObserver(resize);
      ro.observe(host);
      addCleanup(() => ro.disconnect());
      resize();

      function renderFrame(t: number) {
        if (flyTarget) {
          const cur = camera.position.clone();
          const dir = cur.clone().normalize().lerp(flyTarget.clone().normalize(), 0.08).normalize();
          const dist = THREE.MathUtils.lerp(cur.length(), flyTarget.length(), 0.08);
          camera.position.copy(dir.multiplyScalar(dist));
          if (cur.distanceTo(flyTarget) < 0.02) flyTarget = null;
        }
        for (const p of pulsers) {
          p.obj.scale.setScalar(p.base * (1 + p.amp * Math.sin(t / 260 + p.phase)));
        }
        controls.update();
        renderer.render(scene, camera);
      }

      function tick(t: number) {
        frame = 0;
        if (!running) return;
        if (document.hidden || lost || !onScreen) {
          running = false;
          return;
        }
        renderFrame(t);
        frame = requestAnimationFrame(tick);
      }

      function startLoop() {
        if (running || lost || document.hidden || !onScreen) return;
        running = true;
        frame = requestAnimationFrame(tick);
      }

      function stopLoop() {
        running = false;
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
      }

      function syncLoop() {
        if (onScreen && !document.hidden && !lost) startLoop();
        else stopLoop();
      }

      const onVisibilityChange = () => syncLoop();
      document.addEventListener('visibilitychange', onVisibilityChange);
      addCleanup(() => document.removeEventListener('visibilitychange', onVisibilityChange));

      let observer: IntersectionObserver | null = null;
      if (typeof IntersectionObserver !== 'undefined') {
        observer = new IntersectionObserver(
          (entries) => {
            const entry = entries[entries.length - 1];
            onScreen = entry ? entry.isIntersecting && entry.intersectionRatio > 0 : true;
            syncLoop();
          },
          { threshold: [0, 0.01] },
        );
        observer.observe(host);
      }
      addCleanup(() => observer?.disconnect());

      signatureRef.current = markerSignature(markersRef.current);
      syncLoop();
    } catch (err) {
      console.error('[MonitorGlobe] failed to build the 3D scene', err);
      setError('The 3D globe could not start. WebGL may be unavailable or the graphics driver was reset.');
      runCleanup();
      return;
    }

    setError(null);
    setContextLost(false);

    return () => {
      runCleanup();
    };
  }, [quality, nonce]);

  // Rebuild markers only when their visual signature actually changes.
  useEffect(() => {
    const signature = markerSignature(markers);
    if (signature === signatureRef.current) return;
    signatureRef.current = signature;
    apiRef.current?.rebuild();
  }, [markers]);

  useEffect(() => {
    apiRef.current?.fly();
  }, [focus?.lat, focus?.lng]);

  useEffect(() => {
    apiRef.current?.syncAutoRotate();
  }, [rotate, reducedMotionPref]);

  return (
    <div
      ref={hostRef}
      className="relative h-full min-h-[340px] w-full touch-none cursor-grab overflow-hidden rounded-2xl bg-[#050a14] active:cursor-grabbing"
      style={{ minHeight: 340, touchAction: 'none' }}
      role="group"
      aria-label="Interactive 3D globe of news locations"
    >
      {!error && contextLost && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/45 text-xs font-medium tracking-wide text-slate-300 backdrop-blur-[2px]">
          Restoring 3D view…
        </div>
      )}
      {error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-2xl bg-[#050a14] px-6 text-center">
          <p className="max-w-xs text-sm leading-relaxed text-slate-400">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-slate-100 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry 3D view
          </button>
        </div>
      )}
    </div>
  );
}
