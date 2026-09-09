import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { ArrowLeft, Play, RotateCcw, Pause, Shield, Zap, Navigation, Trophy, X, Crosshair } from 'lucide-react';

export type FlightResult = { id: number; date: string; distance: number; time: number; success: boolean; ship: string };
type Props = { ship: string; lowGraphics: boolean; sound: boolean; onExit: () => void; onFinish: (result: FlightResult) => void };

export default function Flight({ ship, lowGraphics, sound, onExit, onFinish }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const keys = useRef(new Set<string>());
  const paused = useRef(false);
  const ended = useRef(false);
  const cameraMode = useRef(false);
  const [pause, setPause] = useState(false);
  const [error, setError] = useState(false);
  const [run, setRun] = useState(0);
  const [result, setResult] = useState<FlightResult | null>(null);
  const [hud, setHud] = useState({ shield: 100, energy: 100, distance: 0, speed: 0, time: 0, hit: false });
  const callback = useRef(onFinish);
  callback.current = onFinish;
  const togglePause = () => { if (ended.current) return; paused.current = !paused.current; setPause(paused.current); keys.current.clear(); };

  useEffect(() => {
    if (!host.current) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: !lowGraphics, alpha: false }); } catch { setError(true); return; }
    setError(false); ended.current = false; paused.current = false; setPause(false); setResult(null); keys.current.clear();
    const container = host.current;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowGraphics ? 1 : 1.7));
    renderer.setClearColor(0x04080f); container.appendChild(renderer.domElement);
    const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x050a14, 0.0014);
    const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 1800);
    const resize = () => { renderer.setSize(container.clientWidth, container.clientHeight); camera.aspect = container.clientWidth / container.clientHeight; camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(container); resize();
    scene.add(new THREE.AmbientLight(0x9fb7dc, 1.5));
    const sun = new THREE.DirectionalLight(0xe0efff, 3.4); sun.position.set(60, 80, 20); scene.add(sun);
    const warm = new THREE.PointLight(0xff8c45, 80, 40); warm.position.set(0, 2, 8); scene.add(warm);
    const starGeo = new THREE.BufferGeometry(); const positions = new Float32Array(4500);
    for (let i = 0; i < positions.length; i++) positions[i] = (Math.random() - .5) * 1600;
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xc1d5ef, size: 1.1, transparent: true, opacity: .8 })); scene.add(stars);
    const textureCanvas = document.createElement('canvas'); textureCanvas.width = 1024; textureCanvas.height = 512;
    const textureContext = textureCanvas.getContext('2d')!; const pixels = textureContext.createImageData(1024, 512); const noise = new ImprovedNoise();
    for (let y = 0; y < 512; y++) for (let x = 0; x < 1024; x++) {
      const phi = y / 512 * Math.PI, theta = x / 1024 * Math.PI * 2;
      const nx = Math.sin(phi) * Math.cos(theta), ny = Math.cos(phi), nz = Math.sin(phi) * Math.sin(theta);
      let surface = 0; for (let octave = 0; octave < 6; octave++) { const frequency = 3 * Math.pow(2, octave); surface += noise.noise(nx * frequency + 7, ny * frequency, nz * frequency) / Math.pow(2, octave); }
      const value = 105 + surface * 105; const index = (y * 1024 + x) * 4;
      pixels.data[index] = value * .9; pixels.data[index + 1] = value; pixels.data[index + 2] = value * 1.09; pixels.data[index + 3] = 255;
    }
    textureContext.putImageData(pixels, 0, 0); const planetTexture = new THREE.CanvasTexture(textureCanvas); planetTexture.colorSpace = THREE.SRGBColorSpace;
    const planet = new THREE.Mesh(new THREE.SphereGeometry(125, 48, 32), new THREE.MeshStandardMaterial({ map: planetTexture, bumpMap: planetTexture, bumpScale: 2.3, color: 0xc7d1dd, roughness: .94 }));
    planet.position.set(175, 65, -600); scene.add(planet);
    const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(128, 48, 32), new THREE.MeshBasicMaterial({ color: 0x628cbc, transparent: true, opacity: .12, side: THREE.BackSide })); atmosphere.position.copy(planet.position); scene.add(atmosphere);
    const ring = new THREE.Mesh(new THREE.RingGeometry(149, 200, 90), new THREE.MeshBasicMaterial({ color: 0x8b8b87, transparent: true, opacity: .17, side: THREE.DoubleSide })); ring.position.copy(planet.position); ring.rotation.set(1.15, .3, .1); scene.add(ring);
    const craft = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({ color: ship === 'Спектр' ? 0xb1becb : 0x737f8c, roughness: .38, metalness: .8 });
    const accent = new THREE.MeshStandardMaterial({ color: 0xe87740, roughness: .4, metalness: .5 });
    const body = new THREE.Mesh(new THREE.ConeGeometry(.8, 4.8, 5), hullMat); body.rotation.x = -Math.PI / 2; craft.add(body);
    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(.55, 16, 12), new THREE.MeshStandardMaterial({ color: 0x162b38, metalness: .9, roughness: .1 })); cockpit.scale.set(.7, .6, 1.8); cockpit.position.set(0, .45, -.65); craft.add(cockpit);
    const wingShape = new THREE.Shape(); wingShape.moveTo(.3, -1.6); wingShape.lineTo(3.4, 1.7); wingShape.lineTo(1, 1.1); wingShape.lineTo(.3, 1.7); wingShape.closePath();
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: .13, bevelEnabled: true, bevelSize: .08, bevelThickness: .08, bevelSegments: 1, steps: 1 });
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(wingGeo, hullMat); wing.rotation.x = Math.PI / 2; wing.scale.x = side; craft.add(wing);
      const engine = new THREE.Mesh(new THREE.CylinderGeometry(.32, .42, 2.2, 12), hullMat); engine.rotation.x = Math.PI / 2; engine.position.set(side * 1.2, 0, .7); craft.add(engine);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(.16, .15, 1.8), accent); stripe.position.set(side * 1.2, .36, .3); craft.add(stripe);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(.29, 2, 12), new THREE.MeshBasicMaterial({ color: 0xff9952, transparent: true, opacity: .9 })); flame.rotation.x = Math.PI / 2; flame.position.set(side * 1.2, 0, 2.7); flame.name = 'flame'; craft.add(flame);
    }
    scene.add(craft);
    const rocks: THREE.Mesh[] = [];
    const rockGeo = new THREE.IcosahedronGeometry(1, 2);
    const verts = rockGeo.attributes.position;
    for (let i = 0; i < verts.count; i++) { const x = verts.getX(i), y = verts.getY(i), z = verts.getZ(i); const f = .95 + noise.noise(x * 2.3, y * 2.3, z * 2.3) * .32; verts.setXYZ(i, x * f, y * f, z * f); } rockGeo.computeVertexNormals();
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x646971, roughness: 1, flatShading: true });
    const placeRock = (rock: THREE.Mesh, initial = false) => { const scale = 1.5 + Math.random() * 6; rock.scale.setScalar(scale); rock.position.set((Math.random() - .5) * 110, (Math.random() - .5) * 70, initial ? -60 - Math.random() * 650 : -650 - Math.random() * 100); rock.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); rock.userData.radius = scale * .9; };
    for (let i = 0; i < (lowGraphics ? 65 : 110); i++) { const rock = new THREE.Mesh(rockGeo, rockMat); placeRock(rock, true); rocks.push(rock); scene.add(rock); }
    const gate = new THREE.Mesh(new THREE.TorusGeometry(18, .6, 8, 64), new THREE.MeshBasicMaterial({ color: 0xf89b64 })); gate.position.set(0, 0, -700); scene.add(gate);
    let audio: AudioContext | undefined; let oscillator: OscillatorNode | undefined; let gain: GainNode | undefined;
    if (sound) { try { audio = new AudioContext(); oscillator = audio.createOscillator(); gain = audio.createGain(); oscillator.type = 'sawtooth'; oscillator.frequency.value = 45; gain.gain.value = .018; oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); void audio.resume(); } catch {} }
    const onKeyDown = (e: KeyboardEvent) => { if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault(); if (e.code === 'Escape' && !e.repeat) togglePause(); else if (e.code === 'KeyC' && !e.repeat) cameraMode.current = !cameraMode.current; else keys.current.add(e.code); };
    const onKeyUp = (e: KeyboardEvent) => keys.current.delete(e.code);
    const onBlur = () => { keys.current.clear(); if (!ended.current) { paused.current = true; setPause(true); } };
    window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp); window.addEventListener('blur', onBlur);
    let shield = 100, energy = 100, distance = 0, time = 0, speed = 0, lastHit = -10, dashAt = -10, vx = 0, vy = 0, bank = 0;
    let previous = performance.now(), lastHud = 0, frame = 0;
    const end = (success: boolean) => { ended.current = true; const data: FlightResult = { id: Date.now(), date: new Date().toISOString(), distance: Math.min(5500, Math.round(distance)), time: Math.round(time), success, ship }; setResult(data); callback.current(data); if (gain) gain.gain.value = 0; };
    const animate = (now: number) => {
      frame = requestAnimationFrame(animate); const dt = Math.min((now - previous) / 1000, .04); previous = now;
      if (paused.current || ended.current) { if (gain) gain.gain.value = 0; return; }
      time += dt; const k = keys.current;
      const boost = (k.has('ShiftLeft') || k.has('ShiftRight')) && energy > 1;
      energy = THREE.MathUtils.clamp(energy + (boost ? -24 : 12) * dt, 0, 100);
      const targetSpeed = k.has('KeyX') ? 20 : boost ? 125 : ship === 'Спектр' ? 73 : 62;
      speed = THREE.MathUtils.lerp(speed, targetSpeed, dt * 1.6); distance += speed * dt;
      const dx = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
      const dy = (k.has('KeyW') || k.has('ArrowUp') || k.has('KeyR') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') || k.has('KeyF') ? 1 : 0);
      vx = THREE.MathUtils.lerp(vx, dx * 23, dt * 3); vy = THREE.MathUtils.lerp(vy, dy * 19, dt * 3);
      if (k.has('Space') && time - dashAt > 3) { vx += (dx || 1) * 90; dashAt = time; }
      craft.position.x = THREE.MathUtils.clamp(craft.position.x + vx * dt, -43, 43); craft.position.y = THREE.MathUtils.clamp(craft.position.y + vy * dt, -26, 26);
      if (distance > 2200 && distance < 3300) craft.position.x += dt * 2.5;
      bank += ((k.has('KeyQ') ? 1 : 0) - (k.has('KeyE') ? 1 : 0)) * dt * 2;
      bank *= 1 - dt * 1.5;
      craft.rotation.z = THREE.MathUtils.lerp(craft.rotation.z, -dx * .5 + bank, dt * 5); craft.rotation.x = THREE.MathUtils.lerp(craft.rotation.x, dy * .2, dt * 4);
      craft.children.filter(c => c.name === 'flame').forEach(c => { c.scale.y = (boost ? 2.3 : 1) + Math.random() * .3; });
      rocks.forEach(rock => { rock.position.z += speed * dt; rock.rotation.x += dt * .12; rock.rotation.y += dt * .08; if (rock.position.z > 25) placeRock(rock); if (time - lastHit > 1.2 && time - dashAt > .6 && rock.position.distanceTo(craft.position) < rock.userData.radius + 1.1) { shield -= rock.userData.radius > 5 ? 45 : 22; lastHit = time; rock.position.z = 35; if (shield <= 0) end(false); } });
      if (time - lastHit > 8) shield = Math.min(100, shield + dt * 1.5);
      if (distance > 4800) { gate.position.z = -(5500 - distance); gate.position.x = 0; }
      planet.rotation.y += dt * .005;
      craft.visible = !cameraMode.current;
      const cameraTarget = new THREE.Vector3(craft.position.x * .8, craft.position.y * .8 + (cameraMode.current ? .4 : 4), cameraMode.current ? -2.5 : 13);
      camera.position.lerp(cameraTarget, dt * 5); camera.lookAt(craft.position.x * .85, craft.position.y * .85, -45); camera.rotation.z = craft.rotation.z * .13;
      camera.fov = THREE.MathUtils.lerp(camera.fov, boost ? 78 : 65, dt * 2); camera.updateProjectionMatrix();
      if (gain && oscillator) { gain.gain.value = boost ? .028 : .012; oscillator.frequency.value = 35 + speed * .6; }
      if (distance >= 5500 && !ended.current) end(true);
      if (now - lastHud > 80) { setHud({ shield: Math.max(0, shield), energy, distance: Math.min(5500, distance), speed, time, hit: time - lastHit < .35 }); lastHud = now; }
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); window.removeEventListener('blur', onBlur); oscillator?.stop(); void audio?.close(); scene.traverse(obj => { if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) { obj.geometry.dispose(); const materials = Array.isArray(obj.material) ? obj.material : [obj.material]; materials.forEach(m => m.dispose()); } }); planetTexture.dispose(); renderer.dispose(); renderer.domElement.remove(); };
  }, [run, ship, lowGraphics, sound]);

  const press = (key: string) => ({ onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => { e.currentTarget.setPointerCapture(e.pointerId); keys.current.add(key); }, onPointerUp: () => keys.current.delete(key), onPointerCancel: () => keys.current.delete(key) });
  return <div className={`flight-screen ${hud.hit ? 'collision' : ''}`}>
    <div className="flight-canvas" ref={host} />
    <div className="flight-top"><button className="icon-button" onClick={onExit} aria-label="Вернуться на станцию"><ArrowLeft size={20}/></button><div><span className="eyebrow">МИССИЯ 01</span><h3>Пояс Кеплера</h3></div><div className="flight-progress"><span>ДО СТАНЦИИ «ГОРИЗОНТ» <b>{((5500 - hud.distance) / 1000).toFixed(2)} км</b></span><div className="meter"><i style={{ width: `${hud.distance / 55}%` }}/></div></div><button className="icon-button" onClick={togglePause} aria-label="Пауза"><Pause size={20}/></button></div>
    <div className="aim"><Crosshair size={34} strokeWidth={1}/></div>
    <div className="flight-bottom"><div className="flight-stat"><Shield size={19}/><span>ЩИТ<b>{Math.round(hud.shield)} <small>%</small></b></span><div className="meter"><i style={{width: `${hud.shield}%`}}/></div></div><div className="speed"><b>{Math.round(hud.speed)}</b><span>М / С</span></div><div className="flight-stat energy"><Zap size={19}/><span>ФОРСАЖ<b>{Math.round(hud.energy)} <small>%</small></b></span><div className="meter"><i style={{width: `${hud.energy}%`}}/></div></div></div>
    <div className="flight-hints"><span><kbd>W A S D</kbd> Направление</span><span><kbd>SHIFT</kbd> Форсаж</span><span><kbd>SPACE</kbd> Уклонение</span><span><kbd>C</kbd> Камера</span><span><kbd>ESC</kbd> Пауза</span></div>
    <div className="touch-controls"><div><button {...press('KeyW')}>↑</button><div><button {...press('KeyA')}>←</button><button {...press('KeyS')}>↓</button><button {...press('KeyD')}>→</button></div></div><button {...press('ShiftLeft')}><Zap/></button></div>
    {pause && !result && <div className="flight-overlay"><div className="pause-panel"><span className="eyebrow">СИСТЕМЫ В ОЖИДАНИИ</span><h2>Космос подождёт.</h2><p>Полёт приостановлен. Выдохни и возвращайся.</p><button className="primary" onClick={togglePause}><Play size={17}/> Продолжить полёт</button><button className="secondary" onClick={onExit}>Вернуться на станцию</button></div></div>}
    {result && <div className="flight-overlay"><div className="pause-panel"><div className="result-symbol">{result.success ? <Trophy size={32}/> : <Shield size={32}/>}</div><span className="eyebrow">{result.success ? 'МИССИЯ ВЫПОЛНЕНА' : 'СИГНАЛ ПОТЕРЯН'}</span><h2>{result.success ? 'Новая орбита взята.' : 'Ещё один шанс.'}</h2><p>{result.success ? 'Ты добрался до станции. Корабль «Спектр» теперь доступен в ангаре.' : 'Корабль разрушен, но путешествие не окончено. Попробуй другой маршрут между астероидами.'}</p><div className="result-data"><span>{(result.distance / 1000).toFixed(2)} км</span><span>{result.time} сек</span></div><button className="primary" onClick={() => setRun(v => v + 1)}><RotateCcw size={17}/> Новый полёт</button><button className="secondary" onClick={onExit}>Вернуться на станцию</button></div></div>}
    {error && <div className="flight-overlay"><div className="pause-panel"><Navigation size={32}/><h2>Нужен доступ к WebGL</h2><p>Включи аппаратное ускорение в настройках браузера или открой игру в актуальной версии Chrome, Edge или Firefox.</p><button className="primary" onClick={onExit}><X size={16}/> На станцию</button></div></div>}
  </div>;
}
