import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent } from 'react';
import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Play, RotateCcw, Pause, Shield, Zap, Navigation, Trophy, X, Crosshair, Camera } from 'lucide-react';
import { getMission, getShip, type Ship, type FlightResult } from './game';
import './flight-mobile.css';

export type { FlightResult } from './game';
type Props = { ship: string; lowGraphics: boolean; sound: boolean; missionId?: number; autoFire?: boolean; onExit: () => void; onOpenHangar: () => void; onFinish: (result: FlightResult) => void };

/** Local geometry and textures keep the game available offline. */
function makeCraft(spec: Ship, lowGraphics: boolean) {
  const craft = new THREE.Group();
  const hull = new THREE.MeshStandardMaterial({ color: spec.shape === 'delta' ? 0xc2ced9 : 0x82909e, roughness: .35, metalness: .76 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x26313c, roughness: .57, metalness: .72 });
  const accent = new THREE.MeshStandardMaterial({ color: spec.color, roughness: .32, metalness: .5, emissive: spec.color, emissiveIntensity: .12 });
  const glow = new THREE.MeshBasicMaterial({ color: spec.color });
  const canopy = new THREE.MeshStandardMaterial({ color: 0x163c50, roughness: .12, metalness: .88, emissive: 0x164765, emissiveIntensity: .4 });
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); craft.add(mesh); return mesh;
  };
  const isHeavy = spec.shape === 'heavy' || spec.shape === 'fortress';
  const isLong = spec.shape === 'interceptor' || spec.shape === 'canard';
  const width = isHeavy ? 1.25 : isLong ? .72 : .92;
  const body = add(new THREE.ConeGeometry(width, isLong ? 6.2 : 5.1, 6), hull, 0, 0, -.4); body.rotation.x = -Math.PI / 2;
  add(new THREE.BoxGeometry(width * 1.4, .38, 2.3), dark, 0, -.2, .6);
  const cockpit = add(new THREE.SphereGeometry(.57, lowGraphics ? 12 : 20, 12), canopy, 0, .45, -.65); cockpit.scale.set(.72, .65, 1.65);
  add(new THREE.BoxGeometry(.065, .04, 1.28), accent, 0, .82, -.67);
  add(new THREE.BoxGeometry(.11, .09, 1.3), accent, 0, .29, -1.9);
  const span = spec.wingSpan;
  const wings: Record<Ship['shape'], [number, number][]> = {
    trainer: [[.4, -.7], [span, .35], [span, 1.3], [.65, 1.3]],
    delta: [[.32, -2.2], [span, 1.75], [.65, 1.7]],
    interceptor: [[.36, -.5], [span, 1.45], [1.15, 1.85], [.5, 1.2]],
    heavy: [[.5, -1.1], [span, -.2], [span, 1.2], [1.3, 1.8], [.5, 1.4]],
    swept: [[.4, .65], [span, -1.6], [span - .2, -.25], [.65, 1.65]],
    twin: [[.5, -.55], [span, .25], [span, 1.15], [.5, 1.4]],
    canard: [[.4, -.2], [span, .65], [span - .25, 1.45], [.7, 1.75]],
    fortress: [[.6, -1.3], [span, -.7], [span, .9], [3, 1.55], [.65, 1.75]],
    crescent: [[.45, -.65], [2.3, -1.4], [span, -2.4], [span - .6, .3], [2, 1.45], [.5, 1.55]],
  };
  const wingShape = new THREE.Shape();
  wings[spec.shape].forEach(([x, z], index) => index === 0 ? wingShape.moveTo(x, z) : wingShape.lineTo(x, z)); wingShape.closePath();
  const wingGeometry = new THREE.ExtrudeGeometry(wingShape, { depth: .14, bevelEnabled: !lowGraphics, bevelSize: .06, bevelThickness: .06, bevelSegments: 1, steps: 1 });
  const fourEngines = spec.shape === 'twin' || spec.shape === 'fortress';
  const engineX = fourEngines ? 2.15 : isHeavy ? 1.5 : 1.13;
  for (const side of [-1, 1]) {
    const wing = add(wingGeometry, hull); wing.rotation.x = Math.PI / 2; wing.scale.x = side;
    const panel = add(new THREE.BoxGeometry(.12, .07, .95), accent, side * (span - .45), .06, spec.shape === 'swept' || spec.shape === 'crescent' ? -.85 : .65); panel.rotation.y = side * .18;
    const engine = add(new THREE.CylinderGeometry(.35, .43, 2.5, lowGraphics ? 8 : 16), dark, side * engineX, -.02, .65); engine.rotation.x = Math.PI / 2;
    add(new THREE.TorusGeometry(.29, .075, 6, 12), hull, side * engineX, -.02, -.62).rotation.y = Math.PI;
    add(new THREE.CircleGeometry(.24, 12), dark, side * engineX, -.02, -.64).rotation.y = Math.PI;
    add(new THREE.BoxGeometry(.12, .14, 1.5), accent, side * engineX, .36, .4);
    add(new THREE.TorusGeometry(.32, .06, 6, 12), hull, side * engineX, -.02, 1.94);
    const flame = add(new THREE.ConeGeometry(.28, 1.6, 10), new THREE.MeshBasicMaterial({ color: spec.color, transparent: true, opacity: .84 }), side * engineX, -.02, 2.66);
    flame.rotation.x = Math.PI / 2; flame.name = 'flame';
    const fin = add(new THREE.BoxGeometry(.09, .95, .95), hull, side * engineX, .67, 1.13); fin.rotation.z = side * -.27; fin.rotation.x = -.2;
    add(new THREE.BoxGeometry(.1, .13, .7), accent, side * engineX, 1.1, 1.18);
    const cannon = add(new THREE.CylinderGeometry(.075, .12, 1.5, 8), dark, side * .67, -.15, -1.5); cannon.rotation.x = Math.PI / 2;
    add(new THREE.SphereGeometry(.08, 6, 4), glow, side * .67, -.15, -2.27);
    if (isLong || spec.shape === 'swept') {
      const canard = add(new THREE.BoxGeometry(spec.shape === 'canard' ? 2 : 1.4, .09, .48), accent, side * .95, -.02, -1.9); canard.rotation.y = side * .35;
    }
    if (fourEngines) {
      const boom = add(new THREE.ConeGeometry(spec.shape === 'fortress' ? .68 : .48, 5.6, 5), hull, side * engineX, .02, -.55); boom.rotation.x = -Math.PI / 2;
      const extraFlame = flame.clone(); extraFlame.position.x += side * .55; extraFlame.scale.setScalar(.7); craft.add(extraFlame);
      add(new THREE.CylinderGeometry(.24, .28, 1.3, 8), dark, side * (engineX + .55), -.02, 1.26).rotation.x = Math.PI / 2;
    }
    if (spec.shape === 'crescent') add(new THREE.SphereGeometry(.17, 8, 6), glow, side * (span - .2), .12, -1.8);
    if (!lowGraphics) for (let index = 0; index < 3; index++) add(new THREE.BoxGeometry(.45, .06, .055), dark, side * .72, .19, .15 + index * .23);
  }
  return craft;
}

export default function Flight({ ship, lowGraphics, sound, missionId = 1, autoFire = false, onExit, onFinish, onOpenHangar }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const keys = useRef(new Set<string>());
  const pointers = useRef(new Map<number, string>());
  const paused = useRef(false), ended = useRef(false), cameraMode = useRef(false), graphicsError = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);
  const [pause, setPause] = useState(false), [error, setError] = useState(false), [run, setRun] = useState(0);
  const [result, setResult] = useState<FlightResult | null>(null);
  const [hud, setHud] = useState({ shield: 100, energy: 100, distance: 0, speed: 0, time: 0, score: 0, hit: false });
  const callback = useRef(onFinish); callback.current = onFinish;
  const exitCallback = useRef(onExit); exitCallback.current = onExit;
  const mission = getMission(missionId), spec = getShip(ship);
  const clearInput = useCallback(() => { keys.current.clear(); pointers.current.clear(); }, []);
  const resumeAudio = useCallback(() => { if (audioRef.current?.state === 'suspended') void audioRef.current.resume().catch(() => {}); }, []);
  const togglePause = useCallback(() => {
    if (ended.current || graphicsError.current) return;
    paused.current = !paused.current; setPause(paused.current); clearInput();
    if (!paused.current) resumeAudio();
    else if (audioRef.current?.state === 'running') void audioRef.current.suspend().catch(() => {});
  }, [clearInput, resumeAudio]);

  useEffect(() => {
    const pauseFlight = () => {
      clearInput(); if (!ended.current) { paused.current = true; setPause(true); }
      if (audioRef.current?.state === 'running') void audioRef.current.suspend().catch(() => {});
    };
    const visibility = () => { if (document.hidden) pauseFlight(); };
    const back = (event: Event) => { event.preventDefault(); if (ended.current || graphicsError.current) exitCallback.current(); else togglePause(); };
    window.addEventListener('blur', pauseFlight); window.addEventListener('oui-pause', pauseFlight); window.addEventListener('oui-back', back);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('blur', pauseFlight); window.removeEventListener('oui-pause', pauseFlight); window.removeEventListener('oui-back', back);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [clearInput, togglePause]);

  useEffect(() => {
    if (!host.current) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: !lowGraphics, alpha: false, powerPreference: lowGraphics ? 'low-power' : 'high-performance' }); }
    catch { graphicsError.current = true; setError(true); return; }
    graphicsError.current = false; setError(false); ended.current = false; paused.current = false; cameraMode.current = false;
    setPause(false); setResult(null); clearInput(); setHud({ shield: 100, energy: 100, distance: 0, speed: 0, time: 0, score: 0, hit: false });
    const container = host.current;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowGraphics ? 1 : 1.6)); renderer.setClearColor(0x04080f); container.appendChild(renderer.domElement);
    const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x050a14, .0012);
    const camera = new THREE.PerspectiveCamera(65, 1, .1, 1800); camera.position.set(0, 4, 16);
    const resize = () => {
      const width = Math.max(1, container.clientWidth), height = Math.max(1, container.clientHeight);
      renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize); observer.observe(container); resize();
    scene.add(new THREE.AmbientLight(0x9fb7dc, 1.7));
    const sun = new THREE.DirectionalLight(0xe0efff, 3.4); sun.position.set(60, 80, 20); scene.add(sun);
    const fill = new THREE.DirectionalLight(spec.color, 1.5); fill.position.set(-30, -10, 15); scene.add(fill);
    const noise = new ImprovedNoise();
    const starGeometry = new THREE.BufferGeometry(), positions = new Float32Array((lowGraphics ? 650 : 1500) * 3);
    for (let i = 0; i < positions.length; i++) positions[i] = (Math.random() - .5) * 1600;
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xc1d5ef, size: 1.1, transparent: true, opacity: .8 })); scene.add(stars);
    const textureCanvas = document.createElement('canvas'); textureCanvas.width = lowGraphics ? 256 : 512; textureCanvas.height = textureCanvas.width / 2;
    const textureContext = textureCanvas.getContext('2d'); let planetTexture: THREE.CanvasTexture | undefined;
    if (textureContext) {
      const { width, height } = textureCanvas, pixels = textureContext.createImageData(width, height);
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const phi = y / height * Math.PI, theta = x / width * Math.PI * 2;
        const nx = Math.sin(phi) * Math.cos(theta), ny = Math.cos(phi), nz = Math.sin(phi) * Math.sin(theta);
        let surface = 0;
        for (let octave = 0; octave < 4; octave++) { const frequency = 3 * 2 ** octave; surface += noise.noise(nx * frequency + 7, ny * frequency, nz * frequency) / 2 ** octave; }
        const value = 105 + surface * 105, index = (y * width + x) * 4;
        pixels.data[index] = value * .76; pixels.data[index + 1] = value; pixels.data[index + 2] = value * 1.12; pixels.data[index + 3] = 255;
      }
      textureContext.putImageData(pixels, 0, 0); planetTexture = new THREE.CanvasTexture(textureCanvas); planetTexture.colorSpace = THREE.SRGBColorSpace;
    }
    const planet = new THREE.Mesh(new THREE.SphereGeometry(125, lowGraphics ? 24 : 48, 24), new THREE.MeshStandardMaterial({ map: planetTexture ?? null, bumpMap: planetTexture ?? null, bumpScale: 2.3, color: 0xc7d1dd, roughness: .94 }));
    planet.position.set(170, 65, -560); scene.add(planet);
    const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(128, 32, 20), new THREE.MeshBasicMaterial({ color: 0x71a4e8, transparent: true, opacity: .16, side: THREE.BackSide })); scene.add(atmosphere);
    const ring = new THREE.Mesh(new THREE.RingGeometry(149, 200, lowGraphics ? 48 : 90), new THREE.MeshBasicMaterial({ color: 0x9da9bc, transparent: true, opacity: .2, side: THREE.DoubleSide }));
    ring.rotation.set(1.15, .3, .1); scene.add(ring);
    const craft = makeCraft(spec, lowGraphics); scene.add(craft); const flames = craft.children.filter(child => child.name === 'flame');
    const rocks: THREE.Mesh[] = [], rockGeometry = new THREE.IcosahedronGeometry(1, lowGraphics ? 1 : 2), vertices = rockGeometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i), factor = .95 + noise.noise(x * 2.3, y * 2.3, z * 2.3) * .32;
      vertices.setXYZ(i, x * factor, y * factor, z * factor);
    }
    rockGeometry.computeVertexNormals();
    const rockMaterial = new THREE.MeshStandardMaterial({ color: mission.id > 3 ? 0x81716b : 0x646f7b, roughness: 1, flatShading: true });
    const placeRock = (rock: THREE.Mesh, initial = false) => {
      const radius = 1.5 + Math.random() * 6; rock.scale.setScalar(radius);
      rock.position.set((Math.random() - .5) * 110, (Math.random() - .5) * 70, initial ? -80 - Math.random() * 650 : -650 - Math.random() * 100);
      rock.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); rock.userData.radius = radius * .95; rock.userData.hp = radius > 5 ? 2 : 1;
    };
    // Quality changes mesh detail, never obstacle count or mission difficulty.
    for (let i = 0; i < mission.rockCount; i++) { const rock = new THREE.Mesh(rockGeometry, rockMaterial); placeRock(rock, true); rocks.push(rock); scene.add(rock); }
    const gate = new THREE.Mesh(new THREE.TorusGeometry(24, .6, 8, 64), new THREE.MeshBasicMaterial({ color: spec.color })); gate.visible = false; scene.add(gate);
    const laserGeometry = new THREE.CylinderGeometry(.1, .1, 3.2, 6); laserGeometry.rotateX(Math.PI / 2);
    const laserMaterial = new THREE.MeshBasicMaterial({ color: spec.color });
    const shots = Array.from({ length: 36 }, () => {
      const mesh = new THREE.Mesh(laserGeometry, laserMaterial); mesh.visible = false; scene.add(mesh);
      return { mesh, velocity: new THREE.Vector3(), previous: new THREE.Vector3(), life: 0 };
    });
    const fragmentGeometry = new THREE.IcosahedronGeometry(.16, 0), fragmentMaterial = new THREE.MeshBasicMaterial({ color: 0xffba70 });
    const fragments = Array.from({ length: lowGraphics ? 36 : 72 }, () => {
      const mesh = new THREE.Mesh(fragmentGeometry, fragmentMaterial); mesh.visible = false; scene.add(mesh);
      return { mesh, velocity: new THREE.Vector3(), life: 0 };
    });
    let fragmentIndex = 0;
    const burst = (position: THREE.Vector3, size: number) => {
      for (let i = 0; i < (lowGraphics ? 8 : 14); i++) {
        const fragment = fragments[fragmentIndex++ % fragments.length]; fragment.mesh.position.copy(position); fragment.mesh.visible = true; fragment.mesh.scale.setScalar(size * (.5 + Math.random()));
        fragment.velocity.set((Math.random() - .5) * 25, (Math.random() - .5) * 25, (Math.random() - .5) * 25); fragment.life = .45 + Math.random() * .3;
      }
    };
    let audio: AudioContext | undefined, oscillator: OscillatorNode | undefined, gain: GainNode | undefined;
    if (sound) try {
      audio = new AudioContext(); audioRef.current = audio; oscillator = audio.createOscillator(); gain = audio.createGain();
      oscillator.type = 'sawtooth'; oscillator.frequency.value = 45; gain.gain.value = .012; oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); void audio.resume().catch(() => {});
    } catch { /* Audio is optional. */ }
    const onKeyDown = (event: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
      if ((event.code === 'Escape' || event.code === 'KeyP') && !event.repeat) togglePause();
      else if (!paused.current && !ended.current) { if (event.code === 'KeyC' && !event.repeat) cameraMode.current = !cameraMode.current; else keys.current.add(event.code); resumeAudio(); }
    };
    const onKeyUp = (event: KeyboardEvent) => { keys.current.delete(event.code); };
    const onPointerRelease = (event: PointerEvent) => { pointers.current.delete(event.pointerId); };
    const onContextLost = (event: Event) => { event.preventDefault(); clearInput(); paused.current = true; setPause(true); graphicsError.current = true; setError(true); if (gain) gain.gain.value = 0; };
    window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp);
    window.addEventListener('pointerup', onPointerRelease); window.addEventListener('pointercancel', onPointerRelease);
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    let shield = 100, energy = 100, distance = 0, time = 0, speed = 0, score = 0, lastHit = -10, lastShot = -1, vx = 0, vy = 0, bank = 0;
    let previous = performance.now(), lastHud = 0, frame = 0;
    const cameraTarget = new THREE.Vector3(), aimTarget = new THREE.Vector3(), segment = new THREE.Vector3(), relative = new THREE.Vector3(), closest = new THREE.Vector3(), laserAxis = new THREE.Vector3(0, 0, 1), direction = new THREE.Vector3();
    const held = (...codes: string[]) => {
      for (const code of codes) { if (keys.current.has(code)) return true; for (const pointerKey of pointers.current.values()) if (pointerKey === code) return true; }
      return false;
    };
    const end = (success: boolean) => {
      if (ended.current) return; ended.current = true; clearInput();
      const data: FlightResult = { id: Date.now(), date: new Date().toISOString(), distance: Math.min(mission.distance, Math.round(distance)), time: Math.round(time), success, ship: spec.name, missionId: mission.id, score: score + (success ? 500 * mission.id : 0) };
      setResult(data); callback.current(data); if (gain) gain.gain.value = 0;
    };
    const fire = () => {
      // A narrow targeting cone makes aiming practical with two thumbs.
      aimTarget.set(craft.position.x, craft.position.y, -320); let nearest = 350;
      for (const rock of rocks) {
        const ahead = craft.position.z - rock.position.z, offset = Math.hypot(rock.position.x - craft.position.x, rock.position.y - craft.position.y);
        if (ahead > 8 && ahead < nearest && offset < rock.userData.radius + Math.min(7, ahead * .035)) { nearest = ahead; aimTarget.copy(rock.position); }
      }
      for (const side of [-1, 1]) {
        const shot = shots.find(item => item.life <= 0); if (!shot) break;
        shot.mesh.position.set(craft.position.x + side * .67, craft.position.y - .15, -2.3);
        shot.velocity.copy(aimTarget).sub(shot.mesh.position).normalize().multiplyScalar(300);
        shot.mesh.quaternion.setFromUnitVectors(laserAxis, direction.copy(shot.velocity).normalize()); shot.life = 1.4; shot.mesh.visible = true;
      }
    };
    const animate = (now: number) => {
      frame = requestAnimationFrame(animate); const dt = Math.min((now - previous) / 1000, .04); previous = now;
      if (paused.current || ended.current) { if (gain) gain.gain.value = 0; return; }
      time += dt; const boost = held('ShiftLeft', 'ShiftRight') && energy > 1;
      energy = THREE.MathUtils.clamp(energy + (boost ? -24 : 12) * dt, 0, 100);
      speed = THREE.MathUtils.lerp(speed, held('KeyX') ? 20 : boost ? spec.speed * 1.9 : spec.speed, dt * 1.6); distance += speed * dt;
      const dx = Number(held('KeyD', 'ArrowRight')) - Number(held('KeyA', 'ArrowLeft')), dy = Number(held('KeyW', 'ArrowUp', 'KeyR')) - Number(held('KeyS', 'ArrowDown', 'KeyF'));
      const response = 2.7 + spec.handling / 50;
      vx = THREE.MathUtils.lerp(vx, dx * (20 + spec.handling * .08), dt * response); vy = THREE.MathUtils.lerp(vy, dy * (17 + spec.handling * .06), dt * response);
      craft.position.x = THREE.MathUtils.clamp(craft.position.x + vx * dt, -43, 43); craft.position.y = THREE.MathUtils.clamp(craft.position.y + vy * dt, -26, 26);
      bank += (Number(held('KeyQ')) - Number(held('KeyE'))) * dt * 2; bank *= 1 - dt * 1.5;
      craft.rotation.z = THREE.MathUtils.lerp(craft.rotation.z, -dx * .5 + bank, dt * 5); craft.rotation.x = THREE.MathUtils.lerp(craft.rotation.x, dy * .2, dt * 4);
      for (const flame of flames) flame.scale.y = (boost ? 2.3 : 1) + Math.random() * .2;
      if ((autoFire || held('Space', 'KeyJ')) && time - lastShot >= .2) { fire(); lastShot = time; }
      for (const rock of rocks) { rock.position.z += speed * dt; rock.rotation.x += dt * .12; rock.rotation.y += dt * .08; if (rock.position.z > 25) placeRock(rock); }
      for (const shot of shots) {
        if (shot.life <= 0) continue;
        shot.previous.copy(shot.mesh.position); shot.mesh.position.addScaledVector(shot.velocity, dt); shot.life -= dt; segment.copy(shot.mesh.position).sub(shot.previous);
        for (const rock of rocks) {
          if (rock.position.z > 1 || rock.position.z < shot.mesh.position.z - 10 || rock.position.z > shot.previous.z + 10) continue;
          relative.copy(rock.position).sub(shot.previous);
          const progress = THREE.MathUtils.clamp(relative.dot(segment) / Math.max(.001, segment.lengthSq()), 0, 1); closest.copy(shot.previous).addScaledVector(segment, progress);
          if (closest.distanceToSquared(rock.position) > (rock.userData.radius + .35) ** 2) continue;
          shot.life = 0; rock.userData.hp -= 1;
          if (rock.userData.hp <= 0) { score += rock.userData.radius > 4.75 ? 150 : 100; burst(rock.position, rock.userData.radius * .45); placeRock(rock); }
          else burst(shot.mesh.position, .6);
          break;
        }
        shot.mesh.visible = shot.life > 0;
      }
      for (const fragment of fragments) if (fragment.life > 0) {
        fragment.life -= dt; fragment.mesh.position.addScaledVector(fragment.velocity, dt); fragment.mesh.position.z += speed * dt;
        fragment.mesh.scale.multiplyScalar(Math.max(0, 1 - dt * 2)); fragment.mesh.visible = fragment.life > 0;
      }
      for (const rock of rocks) if (time - lastHit > 1.2 && rock.position.distanceTo(craft.position) < rock.userData.radius + 1.05) {
        shield -= (rock.userData.radius > 4.75 ? 43 : 23) * (1.15 - spec.armor * .005); lastHit = time; burst(rock.position, 1.5); placeRock(rock);
        if (shield <= 0) { end(false); break; }
      }
      if (time - lastHit > 8) shield = Math.min(100, shield + dt * 1.5);
      if (distance > mission.distance - 700) { gate.visible = true; gate.position.set(craft.position.x * .5, craft.position.y * .5, -(mission.distance - distance)); }
      // The ship follows a forward orbital corridor around the same planet.
      const orbit = distance / mission.distance * Math.PI * .7;
      planet.position.set(170 * Math.cos(orbit), 60 + Math.sin(orbit) * 25, -560 - 70 * Math.sin(orbit));
      planet.rotation.y = (mission.id - 1) * .25 + orbit * .8; atmosphere.position.copy(planet.position); ring.position.copy(planet.position);
      stars.rotation.y = orbit * .12; craft.visible = !cameraMode.current;
      cameraTarget.set(craft.position.x, craft.position.y + (cameraMode.current ? .4 : 4), cameraMode.current ? -2.5 : camera.aspect < .85 ? 27 : 14);
      camera.position.lerp(cameraTarget, dt * 8); camera.lookAt(craft.position.x, craft.position.y, -45); camera.rotation.z = craft.rotation.z * .13;
      camera.fov = THREE.MathUtils.lerp(camera.fov, boost ? 78 : 65, dt * 2); camera.updateProjectionMatrix();
      if (gain && oscillator && !ended.current) { gain.gain.value = boost ? .024 : .01; oscillator.frequency.value = 35 + speed * .6; }
      if (distance >= mission.distance) end(true);
      if (now - lastHud > 80) { setHud({ shield: Math.max(0, shield), energy, distance: Math.min(mission.distance, distance), speed, time, score, hit: time - lastHit < .35 }); lastHud = now; }
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); clearInput();
      window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); window.removeEventListener('pointerup', onPointerRelease); window.removeEventListener('pointercancel', onPointerRelease);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      oscillator?.stop(); if (audio && audio.state !== 'closed') void audio.close().catch(() => {}); audioRef.current = null;
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
      scene.traverse(object => { if (object instanceof THREE.Mesh || object instanceof THREE.Points) { geometries.add(object.geometry); for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material); } });
      geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose()); planetTexture?.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, [run, spec, mission, lowGraphics, sound, autoFire, clearInput, resumeAudio, togglePause]);

  const release = (event: ReactPointerEvent<HTMLButtonElement>) => {
    pointers.current.delete(event.pointerId); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const press = (key: string) => ({
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault(); if (paused.current || ended.current || graphicsError.current) return;
      pointers.current.set(event.pointerId, key); event.currentTarget.setPointerCapture(event.pointerId); resumeAudio();
    },
    onPointerUp: release, onPointerCancel: release,
    onLostPointerCapture: (event: ReactPointerEvent<HTMLButtonElement>) => { pointers.current.delete(event.pointerId); },
    onContextMenu: (event: ReactMouseEvent<HTMLButtonElement>) => event.preventDefault(),
  });
  const disabled = pause || !!result || error;
  return <div className={'flight-screen mobile-flight ' + (hud.hit ? 'collision' : '')}>
    <div className="flight-canvas" ref={host} aria-hidden="true"/>
    <div className="flight-top">
      <button className="icon-button" onClick={togglePause} disabled={disabled} aria-label="Меню полёта"><ArrowLeft size={20}/></button>
      <div><span className="eyebrow">ЭТАП {String(mission.id).padStart(2, '0')} · {spec.name}</span><h3>{mission.title}</h3></div>
      <div className="flight-progress"><span>ДО МАЯКА <b>{((mission.distance - hud.distance) / 1000).toFixed(2)} км</b></span><div className="meter"><i style={{ width: hud.distance / mission.distance * 100 + '%' }}/></div></div>
      <button className="icon-button" onClick={togglePause} disabled={disabled} aria-label="Пауза"><Pause size={20}/></button>
    </div>
    <div className="flight-score"><Crosshair size={14}/><span>{hud.score} очков</span>{autoFire && <small>АВТООГОНЬ</small>}<button className="icon-button flight-camera" aria-label="Сменить камеру" disabled={disabled} onClick={() => { cameraMode.current = !cameraMode.current; }}><Camera size={20}/></button></div>
    <div className="aim"><Crosshair size={34} strokeWidth={1}/></div>
    <div className="flight-bottom">
      <div className="flight-stat"><Shield size={19}/><span>ЩИТ<b>{Math.round(hud.shield)} <small>%</small></b></span><div className="meter"><i style={{ width: hud.shield + '%' }}/></div></div>
      <div className="speed"><b>{Math.round(hud.speed)}</b><span>М / С</span></div>
      <div className="flight-stat energy"><Zap size={19}/><span>ФОРСАЖ<b>{Math.round(hud.energy)} <small>%</small></b></span><div className="meter"><i style={{ width: hud.energy + '%' }}/></div></div>
    </div>
    <div className="flight-hints"><span><kbd>W A S D</kbd> Манёвры</span><span><kbd>SPACE / J</kbd> Огонь</span><span><kbd>SHIFT</kbd> Форсаж</span><span><kbd>C</kbd> Камера</span><span><kbd>ESC</kbd> Пауза</span></div>
    <div className="touch-controls" aria-label="Управление полётом">
      <div className="flight-dpad">
        <button className="dpad-up" {...press('KeyW')} disabled={disabled} aria-label="Лететь вверх"><ArrowUp/></button>
        <button className="dpad-left" {...press('KeyA')} disabled={disabled} aria-label="Лететь влево"><ArrowLeft/></button>
        <button className="dpad-down" {...press('KeyS')} disabled={disabled} aria-label="Лететь вниз"><ArrowDown/></button>
        <button className="dpad-right" {...press('KeyD')} disabled={disabled} aria-label="Лететь вправо"><ArrowRight/></button>
      </div>
      <div className="flight-actions">
        <button className="boost-button" {...press('ShiftLeft')} disabled={disabled} aria-label="Форсаж"><Zap size={22}/><span>ФОРСАЖ</span></button>
        <button className="fire-button" {...press('Space')} disabled={disabled} aria-label="Стрелять"><Crosshair size={30}/><span>ОГОНЬ</span></button>
      </div>
    </div>
    {pause && !result && !error && <div className="flight-overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title"><div className="pause-panel"><span className="eyebrow">ПОЛЁТ ПРИОСТАНОВЛЕН</span><h2 id="pause-title">Космос подождёт.</h2><p>Лети вперёд по орбите к маяку. Удерживай стрелки для движения и кнопку огня для стрельбы. Форсаж расходует энергию, которая постепенно восстанавливается.</p><button className="primary" autoFocus onClick={togglePause}><Play size={17}/> Продолжить полёт</button><button className="secondary" onClick={onExit}>Вернуться в меню</button></div></div>}
    {result && !error && <div className="flight-overlay" role="dialog" aria-modal="true" aria-labelledby="result-title"><div className="pause-panel"><div className="result-symbol">{result.success ? <Trophy size={32}/> : <Shield size={32}/>}</div><span className="eyebrow">{result.success ? 'ЭТАП ПРОЙДЕН' : 'СИГНАЛ ПОТЕРЯН'}</span><h2 id="result-title">{result.success ? 'Маяк достигнут.' : 'Ещё один шанс.'}</h2><p>{result.success ? 'Награда за этап ' + mission.id + ' — корабль «' + mission.rewardShip + '». Выбери его в ангаре и продолжай экспедицию.' : 'Щит исчерпан. Разбивай астероиды огнём и используй форсаж на свободных участках.'}</p><div className="result-data"><span>{(result.distance / 1000).toFixed(2)} км</span><span>{result.time} сек</span><span>{result.score ?? 0} очков</span></div><button className="primary" autoFocus onClick={result.success ? onOpenHangar : onExit}>{result.success ? 'Выбрать корабль в ангаре' : 'Вернуться в меню'}</button><button className="secondary" onClick={() => setRun(value => value + 1)}><RotateCcw size={17}/> Повторить этап</button></div></div>}
    {error && <div className="flight-overlay" role="dialog" aria-modal="true" aria-labelledby="flight-error-title"><div className="pause-panel"><Navigation size={32}/><h2 id="flight-error-title">Графика недоступна</h2><p>Устройству нужен WebGL. Попробуй заново или включи упрощённую графику в настройках. В браузере проверь аппаратное ускорение.</p><button className="primary" autoFocus onClick={() => setRun(value => value + 1)}><RotateCcw size={16}/> Попробовать снова</button><button className="secondary" onClick={onExit}><X size={16}/> Вернуться в меню</button></div></div>}
  </div>;
}
