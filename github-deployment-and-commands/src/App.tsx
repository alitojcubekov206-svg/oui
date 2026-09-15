import { useEffect, useId, useState } from 'react';
import { ArrowUpRight, ArrowRight, Orbit, Rocket, Route, BookOpen, Settings2, ChevronRight, Volume2, VolumeX, CircleHelp, Shield, LockKeyhole, Check, X, Keyboard, Crosshair, Menu, Monitor, Trophy, Trash2 } from 'lucide-react';
import Flight, { type FlightResult } from './Flight';
import { SHIPS, MISSIONS, getShip, getMission, getUnlockedShipNames, normalizeCompletedMissions, normalizeFlights, type Ship } from './game';
import './app-menu.css';

type Page = 'station' | 'hangar' | 'missions' | 'journal' | 'help' | 'settings' | 'privacy';
type Modal = 'controls' | 'profile' | 'reset' | null;
const image = import.meta.env.BASE_URL + 'images/orbit.jpg';
const navigation = [
  { id: 'station', label: 'Центр полётов', icon: Orbit },
  { id: 'hangar', label: 'Ангар', icon: Rocket },
  { id: 'missions', label: 'Этапы', icon: Route },
  { id: 'journal', label: 'Журнал полётов', icon: BookOpen },
  { id: 'settings', label: 'Настройки', icon: Settings2 },
  { id: 'help', label: 'Как играть', icon: CircleHelp },
] as const;

function read(key: string): unknown { try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; } }
function readBoolean(key: string, fallback: boolean) { const value = read(key); return typeof value === 'boolean' ? value : fallback; }
function readFlights(): FlightResult[] {
  return normalizeFlights(read('oui-flights'));
}
function readCompleted() {
  const saved = read('oui-completed');
  if (saved !== null) return normalizeCompletedMissions(saved);
  return normalizeCompletedMissions(readFlights().filter(f => f.success).map(f => f.missionId ?? 1));
}
const controls = [
  { keys: ['W', 'A', 'S', 'D'], title: 'Маневрирование', detail: 'На телефоне удерживай стрелки слева. На компьютере — WASD или клавиши-стрелки.' },
  { keys: ['SPACE'], title: 'Стрельба', detail: 'Удерживай кнопку огня справа и разбивай астероиды. Можно двигаться и стрелять одновременно.' },
  { keys: ['SHIFT'], title: 'Форсаж', detail: 'Кнопка с молнией ускоряет корабль и расходует энергию. Отпусти её, чтобы восстановить запас.' },
  { keys: ['X'], title: 'Торможение', detail: 'На компьютере удерживай X для точного прохождения сложного участка.' },
  { keys: ['C'], title: 'Камера', detail: 'Переключай вид за кораблём и от первого лица кнопкой камеры в полёте.' },
  { keys: ['ESC'], title: 'Пауза', detail: 'Нажми паузу сверху или системную кнопку «Назад» на Android. Сворачивание также останавливает полёт.' },
];

function ShipArt({ ship }: { ship: Ship }) {
  const uid = useId().replace(/:/g, '');
  const index = SHIPS.findIndex(s => s.id === ship.id);
  const span = 67 + ship.wingSpan * 13;
  return <svg className="ship-art fleet-art" viewBox="0 0 380 220" fill="none" role="img" aria-label={'Корабль ' + ship.name}>
    <defs>
      <linearGradient id={uid + '-hull'} x1="160" y1="40" x2="225" y2="185" gradientUnits="userSpaceOnUse"><stop stopColor="#cedae2"/><stop offset=".45" stopColor="#526b80"/><stop offset="1" stopColor="#1b293c"/></linearGradient>
      <linearGradient id={uid + '-glass'} x1="180" y1="57" x2="202" y2="109" gradientUnits="userSpaceOnUse"><stop stopColor="#bdedff"/><stop offset=".4" stopColor="#357eac"/><stop offset="1" stopColor="#11243b"/></linearGradient>
      <radialGradient id={uid + '-glow'}><stop stopColor={ship.color} stopOpacity=".35"/><stop offset="1" stopColor={ship.color} stopOpacity="0"/></radialGradient>
    </defs>
    <ellipse cx="190" cy="132" rx="145" ry="82" fill={'url(#' + uid + '-glow)'}/>
    <g transform={'translate(190 115) rotate(-' + (12 + index * 2) + ') translate(-190 -115)'}>
      <path d={'M178 88 L' + (190 - span) + ' ' + (index % 3 === 1 ? 155 : 133) + ' L' + (194 - span) + ' 157 L171 141 L170 176 L144 186 L157 149 L190 45 L223 149 L236 186 L210 176 L209 141 L' + (186 + span) + ' 157 L' + (190 + span) + ' ' + (index % 3 === 1 ? 155 : 133) + ' L202 88Z'} fill={'url(#' + uid + '-hull)'} stroke="#8fa5b9"/>
      {[159, 221].map(x => <g key={x}><path d={'M' + (x - 8) + ' 112h16l4 57h-24Z'} fill="#263b52" stroke="#8499ac"/><path d={'M' + (x - 8) + ' 170h16l-8 37Z'} fill={ship.color} opacity=".7"/><path d={'M' + (x - 4) + ' 170h8l-4 26Z'} fill="#e2fbff"/><path d={'M' + (x - 5) + ' 126h10m-10 7h10m-10 7h10m-10 7h10'} stroke="#71889f"/></g>)}
      <path d="M190 22l17 107-6 45h-22l-6-45Z" fill={'url(#' + uid + '-hull)'} stroke="#bacbd8"/>
      <path d="M190 61l10 34-3 18h-14l-3-18Z" fill={'url(#' + uid + '-glass)'} stroke="#9cdaef"/>
      <path d="M185 122h10v31h-10Z" fill="#1c3047" stroke="#8296a8"/><path d="M190 115v57m-34-28-33 9m102-9 33 9M182 48l8-19 8 19" stroke="#e0eaf0" strokeOpacity=".45"/>
      <path d={'M' + (195 - span) + ' 137l43-22 2 8-43 21Z'} fill={ship.color}/><path d={'M' + (185 + span) + ' 137l-43-22-2 8 43 21Z'} fill={ship.color}/>
      <path d="M143 118v36m94-36v36" stroke="#c3d1db" strokeWidth="4"/><path d="M143 115v-8m94 8v-8" stroke={ship.color} strokeWidth="3"/>
      {index >= 5 && <path d="M165 96l-19-23-6 4 9 39m66-20 19-23 6 4-9 39" fill="#607a92" stroke="#9db2c4"/>}
      <circle cx={190 - span + 5} cy="148" r="3" fill={ship.color}/><circle cx={190 + span - 5} cy="148" r="3" fill={ship.color}/>
    </g>
  </svg>;
}

export default function App() {
  const [page, setPage] = useState<Page>('station');
  const [modal, setModal] = useState<Modal>(null);
  const [playing, setPlaying] = useState(false);
  const [missionId, setMissionId] = useState(() => Math.min(readCompleted().length + 1, MISSIONS.length));
  const [sound, setSound] = useState(() => readBoolean('oui-sound', false));
  const [lowGraphics, setLowGraphics] = useState(() => readBoolean('oui-low', window.matchMedia('(pointer: coarse)').matches));
  const [autoFire, setAutoFire] = useState(() => readBoolean('oui-autofire', false));
  const [pilot, setPilot] = useState(() => { const saved = read('oui-pilot'); return typeof saved === 'string' && saved.trim() ? saved.slice(0, 20) : 'Пилот'; });
  const [draftName, setDraftName] = useState(pilot);
  const [flights, setFlights] = useState(readFlights);
  const [completed, setCompleted] = useState(readCompleted);
  const [shipName, setShipName] = useState(() => { const saved = read('oui-ship'); return typeof saved === 'string' && getUnlockedShipNames(readCompleted()).includes(saved) ? saved : SHIPS[0].name; });
  const [mobileNav, setMobileNav] = useState(false);
  const [toast, setToast] = useState('');
  const [storageError, setStorageError] = useState(false);
  const unlocked = getUnlockedShipNames(completed);
  const ship = getShip(shipName);
  const nextMission = getMission(Math.min(completed.length + 1, MISSIONS.length));
  const totalDistance = flights.reduce((total, f) => total + f.distance, 0);

  useEffect(() => {
    try {
      for (const [key, value] of Object.entries({ 'oui-sound': sound, 'oui-low': lowGraphics, 'oui-autofire': autoFire, 'oui-pilot': pilot, 'oui-flights': flights, 'oui-ship': shipName, 'oui-completed': completed })) localStorage.setItem(key, JSON.stringify(value));
      setStorageError(false);
    } catch { setStorageError(true); }
  }, [sound, lowGraphics, autoFire, pilot, flights, shipName, completed]);
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 3500); return () => clearTimeout(timer); } }, [toast]);
  useEffect(() => {
    const back = (event: Event) => {
      if (playing) return;
      if (modal || mobileNav || page !== 'station') {
        event.preventDefault();
        if (modal) setModal(null); else if (mobileNav) setMobileNav(false); else setPage('station');
      }
    };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') back(event); };
    window.addEventListener('oui-back', back); window.addEventListener('keydown', key);
    return () => { window.removeEventListener('oui-back', back); window.removeEventListener('keydown', key); };
  }, [playing, modal, mobileNav, page]);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const timer = setTimeout(() => document.querySelector<HTMLButtonElement>('.modal .close-button')?.focus(), 0);
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const all = Array.from(document.querySelectorAll<HTMLElement>('.modal button, .modal input, .modal a'));
      const first = all[0], last = all[all.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => { clearTimeout(timer); document.removeEventListener('keydown', trap); previous?.focus(); };
  }, [modal]);
  const navigate = (next: Page) => { setPage(next); setMobileNav(false); window.scrollTo(0, 0); };
  const launch = (id = nextMission.id) => { if (id > completed.length + 1) return; setMissionId(id); setPlaying(true); setMobileNav(false); };
  const finish = (result: FlightResult) => {
    setFlights(current => [...current, result].slice(-100));
    if (result.success) setCompleted(current => normalizeCompletedMissions([...current, result.missionId ?? missionId]));
  };
  const titles: Record<Page, [string, string]> = {
    station: ['Готов к вылету, ' + pilot + '?', 'Пройди этап. Получи корабль. Лети дальше.'],
    hangar: ['Твой флот.', unlocked.length + ' из ' + SHIPS.length + ' кораблей. Каждый со своим характером.'],
    missions: ['Курс вокруг планеты.', MISSIONS.length + ' этапов — ' + MISSIONS.length + ' новых кораблей.'],
    journal: ['История полётов.', 'Последние 100 вылетов сохраняются на этом устройстве.'],
    settings: ['Настрой свой космос.', 'Управление, звук и графика для твоего телефона.'],
    help: ['Первый вылет.', 'Всё, что нужно знать перед стартом.'],
    privacy: ['Конфиденциальность.', 'Как игра обращается с данными на твоём устройстве.'],
  };
  return <div className="app-shell">
    {mobileNav && <button className="sidebar-scrim" aria-label="Закрыть меню" onClick={() => setMobileNav(false)}/>}
    <aside className={'sidebar ' + (mobileNav ? 'mobile-open' : '')}>
      <a className="logo" href="#" onClick={event => { event.preventDefault(); navigate('station'); }}>oui<span className="logo-star">✳</span><span className="logo-caption">ТВОЯ КОСМИЧЕСКАЯ ЭСКАДРИЛЬЯ</span></a>
      <div className="nav-label">ПОЛЁТНАЯ СТАНЦИЯ</div>
      <nav aria-label="Главное меню">{navigation.map(item => <button key={item.id} className={'nav-item ' + (page === item.id ? 'active' : '')} aria-current={page === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}><item.icon size={19}/><span>{item.label}</span>{item.id === 'hangar' && <span className="nav-count">{unlocked.length}/{SHIPS.length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="station-card"><Orbit size={30}/><h4>Следующая награда</h4><p>{completed.length === MISSIONS.length ? 'Весь флот собран. Улучши свои результаты!' : '«' + nextMission.rewardShip + '» · этап ' + nextMission.id}</p><div className="build-tag">{completed.length} / {MISSIONS.length} ЭТАПОВ ПРОЙДЕНО</div></div><button className="text-link privacy-link" onClick={() => navigate('privacy')}>Конфиденциальность <Shield size={14}/></button><div className="version"><span>oui © 2026</span><span>v1.0.0</span></div></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div className="breadcrumbs"><button className="mobile-menu icon-button" aria-label="Открыть меню" aria-expanded={mobileNav} onClick={() => setMobileNav(!mobileNav)}><Menu size={22}/></button><span>СТАНЦИЯ</span><ChevronRight size={14}/><b>{navigation.find(item => item.id === page)?.label ?? 'Конфиденциальность'}</b></div><div className="top-actions"><span className="system-online"><i/> Готов к полёту</span><button className="icon-button" onClick={() => setSound(!sound)} aria-label={sound ? 'Выключить звук' : 'Включить звук'}>{sound ? <Volume2 size={20}/> : <VolumeX size={20}/>}</button><button className="profile-button" onClick={() => { setDraftName(pilot); setModal('profile'); }} aria-label="Изменить позывной"><span className="avatar"><Crosshair size={20}/></span><span>{pilot}<small>Этап {nextMission.id} · {unlocked.length} кораблей</small></span></button></div></header>
      <main>
        {storageError && <p className="storage-notice" role="alert">Не удалось сохранить прогресс. Проверь свободное место и доступ к хранилищу.</p>}
        <div className="page-heading"><div><span className="eyebrow">OUI / КОСМИЧЕСКАЯ АРКАДА</span><h1>{titles[page][0]}</h1><p>{titles[page][1]}</p></div><div className="local-badge"><span/> Твой прогресс<small>ПРОГРЕСС НА УСТРОЙСТВЕ</small></div></div>
        {page === 'station' && <>
          <section className="hero" style={{ backgroundImage: 'url(' + image + ')' }}><div className="hero-shade"/><div className="hero-grid"/><div className="hero-content"><span className="mission-label"><span/> ЭТАП {String(nextMission.id).padStart(2, '0')} <i/> {nextMission.title.toUpperCase()}</span><h2>Твой курс.<br/>Твой космос<span>.</span></h2><p>Маневрируй, разбивай астероиды<br/>и собери эскадрилью из {SHIPS.length} кораблей.</p><div className="hero-buttons"><button className="primary" onClick={() => launch()}><Rocket size={18}/> Начать полёт <ArrowUpRight size={19}/></button><button className="hero-control" onClick={() => setModal('controls')}><CircleHelp size={18}/> Управление</button></div><div className="hero-note">Движение слева · Огонь справа</div></div><div className="hero-bottom"><div><span><Route size={15}/> ДИСТАНЦИЯ</span><b>{(nextMission.distance / 1000).toFixed(1)} <small>км</small></b></div><div><span><Rocket size={15}/> КОРАБЛЬ</span><b>{ship.name}</b></div><div><span><Trophy size={15}/> НАГРАДА</span><b>{completed.length === MISSIONS.length ? 'Весь флот открыт' : '«' + nextMission.rewardShip + '»'}</b></div></div></section>
          <div className="section-heading"><h2>Перед вылетом</h2><span>Твоя станция. Всё под рукой.</span></div>
          <div className="launch-grid"><section className="panel current-ship"><div className="card-heading"><span><Rocket size={17}/> ТВОЙ КОРАБЛЬ</span><span className="selected-indicator"><i/> ГОТОВ</span></div><ShipArt ship={ship}/><h3>{ship.name}</h3><p>{ship.role} · {ship.speed} м/с</p><button className="secondary" onClick={() => navigate('hangar')}>Открыть ангар <ArrowRight size={17}/></button></section><section className="panel campaign-card"><span className="eyebrow">КОЛЛЕКЦИЯ КОРАБЛЕЙ</span><h2>{String(unlocked.length).padStart(2, '0')} <small>/ {String(SHIPS.length).padStart(2, '0')}</small></h2><div className="campaign-dots">{SHIPS.map(s => <span key={s.id} className={unlocked.includes(s.name) ? 'earned' : ''} title={s.name}><Rocket size={18}/></span>)}</div><p>За первое прохождение каждого этапа — новый корабль. Повторные полёты улучшают результат.</p><button className="primary" onClick={() => navigate('missions')}>Выбрать этап <Route size={17}/></button></section></div>
        </>}
        {page === 'hangar' && <><div className="hangar-grid fleet-grid">{SHIPS.map((item, index) => { const available = unlocked.includes(item.name); return <section className={'panel hangar-ship ' + (shipName === item.name ? 'is-selected' : '')} key={item.id}><div className="card-heading"><span>MK–{String(index + 1).padStart(2, '0')} / {item.role}</span>{available ? <Check size={17}/> : <LockKeyhole size={17}/>}</div><ShipArt ship={item}/><h2>{item.name}</h2><p>{item.description}</p><div className="ship-specs">{[['Скорость', item.speed, item.speed + ' м/с'], ['Манёвренность', item.handling, item.handling + '/100'], ['Броня', item.armor, item.armor + '/100']].map(([label, value, text]) => <div key={label}><span>{label}<b>{text}</b></span><div className="meter"><i style={{ width: Math.min(100, Number(value)) + '%', background: item.color }}/></div></div>)}</div><button className={shipName === item.name ? 'secondary' : 'primary'} disabled={!available || shipName === item.name} onClick={() => { setShipName(item.name); setToast('Корабль «' + item.name + '» выбран'); }}>{!available ? <><LockKeyhole size={16}/> Пройди этап {index}</> : shipName === item.name ? <><Check size={17}/> Корабль выбран</> : <>Выбрать корабль <ArrowRight size={17}/></>}</button></section>; })}</div><div className="inline-cta"><p>Выбран: {ship.name}. Следующий маршрут: {nextMission.title}.</p><button className="primary" onClick={() => launch()}>Начать полёт <ArrowUpRight size={18}/></button></div></>}
        {page === 'missions' && <div className="mission-list">{MISSIONS.map(item => { const available = item.id <= completed.length + 1; const done = completed.includes(item.id); return <section className={'panel stage-card ' + (available ? '' : 'stage-locked')} key={item.id}><div className="stage-number">{String(item.id).padStart(2, '0')}</div><div className="stage-copy"><span className="eyebrow">{done ? 'ПРОЙДЕН' : available ? 'ГОТОВ К СТАРТУ' : 'ЗАКРЫТ'}</span><h2>{item.title}</h2><p>{item.description}</p><div className="mission-facts"><span><Route size={16}/>{(item.distance / 1000).toFixed(1)} км</span><span><Trophy size={16}/>Корабль «{item.rewardShip}»</span></div></div><button className={done ? 'secondary' : 'primary'} disabled={!available} onClick={() => launch(item.id)}>{!available ? <><LockKeyhole size={17}/> Пройди этап {item.id - 1}</> : done ? <>Пройти снова <ArrowRight size={17}/></> : <>Начать этап {item.id} <Rocket size={17}/></>}</button></section>; })}</div>}
        {page === 'journal' && <><div className="journal-stats">{[['Дистанция', (totalDistance / 1000).toFixed(1) + ' км'], ['Вылеты в журнале', flights.length], ['Пройдено этапов', completed.length + '/' + MISSIONS.length]].map(([label, value]) => <div className="panel" key={label}><span>{label}</span><b>{value}</b></div>)}</div><section className="panel journal-panel">{flights.length ? <div className="table-scroll"><table><thead><tr><th>Дата</th><th>Этап / корабль</th><th>Дистанция</th><th>Очки</th><th>Результат</th></tr></thead><tbody>{[...flights].reverse().map(f => <tr key={f.id}><td>{new Date(f.date).toLocaleDateString('ru-RU')}</td><td>{getMission(f.missionId).title}<small>{f.ship}</small></td><td>{(f.distance / 1000).toFixed(2)} км</td><td>{f.score ?? 0}</td><td><span className={f.success ? 'easy-badge' : 'failure-badge'}>{f.success ? 'Завершён' : 'Корабль потерян'}</span></td></tr>)}</tbody></table></div> : <div className="empty-state"><Orbit size={44}/><h2>Здесь начнётся твоя история.</h2><p>Заверши первый полёт, чтобы сохранить результат.</p><button className="primary" onClick={() => launch()}>Начать первый полёт <Rocket size={17}/></button></div>}</section></>}
        {page === 'settings' && <section className="panel settings-panel"><div className="card-heading"><span><Settings2 size={18}/> ПАРАМЕТРЫ ПОЛЁТА</span></div>{[
          { label: 'Звук двигателя', detail: 'Звук тяги и форсажа во время полёта.', icon: Volume2, value: sound, change: () => setSound(!sound) },
          { label: 'Режим производительности', detail: 'Снижает нагрузку графики на телефон.', icon: Monitor, value: lowGraphics, change: () => setLowGraphics(!lowGraphics) },
          { label: 'Автоматическая стрельба', detail: 'Корабль стреляет сам. Можно сосредоточиться на манёврах.', icon: Crosshair, value: autoFire, change: () => setAutoFire(!autoFire) },
        ].map(item => <div className="setting-row" key={item.label}><div><item.icon size={21}/><span><b>{item.label}</b><small>{item.detail}</small></span></div><button role="switch" aria-label={item.label} aria-checked={item.value} className={'toggle ' + (item.value ? 'on' : '')} onClick={item.change}><i/></button></div>)}<div className="setting-row"><div><Keyboard size={21}/><span><b>Управление</b><small>Экранные кнопки и клавиатура</small></span></div><button className="secondary" onClick={() => setModal('controls')}>Посмотреть</button></div><div className="setting-row"><div><Trash2 size={21}/><span><b>Начать заново</b><small>Удалить журнал, открытые корабли и пройденные этапы.</small></span></div><button className="secondary" onClick={() => setModal('reset')}>Сбросить</button></div><button className="text-link privacy-link" onClick={() => navigate('privacy')}>Конфиденциальность <Shield size={16}/></button></section>}
        {page === 'help' && <section className="panel help-panel"><h2>Лети. Стреляй. Открывай.</h2><p>Корабль движется вперёд по орбитальному маршруту около планеты. Обходи астероиды или разрушай их выстрелами. Доберись до контрольной точки с целым щитом — в ангаре появится новый корабль.</p><div className="full-controls">{controls.map(item => <div className="full-control" key={item.title}><div>{item.keys.map(key => <kbd key={key}>{key}</kbd>)}</div><span><b>{item.title}</b><small>{item.detail}</small></span></div>)}</div><p>Играть можно в вертикальном и горизонтальном положении. Если телефон нагревается, включи режим производительности. После восьми секунд без столкновений щит начинает восстанавливаться.</p><button className="primary" onClick={() => launch()}>Начать полёт <Rocket size={17}/></button></section>}
        {page === 'privacy' && <section className="panel help-panel privacy-panel"><span className="eyebrow">OUI · ВЕРСИЯ 1.0 · 14 СЕНТЯБРЯ 2026</span><h2>Твои полёты остаются на устройстве.</h2><p>oui работает без регистрации. Игра сохраняет позывной, настройки, выбранный корабль, пройденные этапы и последние 100 результатов в локальном хранилище приложения или браузера.</p><h3>Сбор и передача данных</h3><p>В этой версии нет рекламы, аналитики, покупок или облачной синхронизации. Игра не отправляет позывной и результаты разработчику. Для самого полёта интернет не требуется. Веб-версия загружается с хостинга, который обрабатывает обычные сетевые запросы при открытии сайта.</p><h3>Хранение и удаление</h3><p>Прогресс хранится до сброса в настройках или очистки данных приложения. Позывной можно изменить в профиле. Полностью удалить все локальные данные можно через настройки Android → Приложения → oui → Хранилище → Очистить данные. Сохранения не переносятся между устройствами.</p><h3>Разрешения</h3><p>Игра не запрашивает доступ к контактам, камере, микрофону или геолокации. Внешние ссылки, если открыты пользователем, обрабатываются браузером и правилами соответствующего сайта.</p></section>}
        <footer className="main-footer"><span><span className="footer-logo">oui</span> Космос ближе, чем кажется.</span><button onClick={() => navigate('privacy')}>Конфиденциальность</button></footer>
      </main>
    </div>
    <nav className="mobile-dock" aria-label="Быстрая навигация">{navigation.slice(0, 3).map(item => <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => navigate(item.id)}><item.icon size={21}/><span>{item.label}</span></button>)}<button className={page === 'settings' ? 'active' : ''} onClick={() => navigate('settings')}><Settings2 size={21}/><span>Настройки</span></button></nav>
    {modal && <div className="modal-backdrop" onClick={() => setModal(null)}><section className={'modal ' + (modal === 'profile' ? 'profile-modal' : '')} role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={event => event.stopPropagation()}><button className="icon-button close-button" aria-label="Закрыть" onClick={() => setModal(null)}><X size={20}/></button><span className="eyebrow">БОРТОВОЙ КОМПЬЮТЕР</span><h2 id="modal-title">{modal === 'controls' ? 'Почувствуй свой корабль.' : modal === 'reset' ? 'Начать с первого этапа?' : 'Как тебя называть, пилот?'}</h2>
      {modal === 'controls' && <><div className="full-controls">{controls.map(item => <div className="full-control" key={item.title}><div>{item.keys.map(key => <kbd key={key}>{key}</kbd>)}</div><span><b>{item.title}</b><small>{item.detail}</small></span></div>)}</div><button className="primary modal-action" onClick={() => setModal(null)}>Всё понятно <Check size={17}/></button></>}
      {modal === 'profile' && <form onSubmit={event => { event.preventDefault(); setPilot(draftName.trim() || 'Пилот'); setModal(null); }}><p>Позывной виден только на этом устройстве.</p><label htmlFor="pilot-name">ПОЗЫВНОЙ</label><input id="pilot-name" value={draftName} maxLength={20} onChange={event => setDraftName(event.target.value)} autoComplete="off"/><button className="primary" type="submit">Сохранить <Check size={17}/></button></form>}
      {modal === 'reset' && <><p>Журнал полётов и открытые корабли будут удалены. Останется стартовый «Пионер». Это действие нельзя отменить.</p><div className="reset-actions"><button className="secondary" onClick={() => setModal(null)}>Отмена</button><button className="primary" onClick={() => { setCompleted([]); setFlights([]); setShipName(SHIPS[0].name); setMissionId(1); setModal(null); setToast('Прогресс сброшен'); }}>Удалить прогресс</button></div></>}
    </section></div>}
    {playing && <Flight ship={shipName} missionId={missionId} autoFire={autoFire} lowGraphics={lowGraphics} sound={sound} onExit={() => setPlaying(false)} onFinish={finish} onOpenHangar={() => { setPlaying(false); navigate('hangar'); }}/>}
    {toast && !playing && <div className="toast" role="status"><Check size={18}/>{toast}</div>}
  </div>;
}
