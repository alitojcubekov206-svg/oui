export type Ship = {
  id: string;
  name: string;
  role: string;
  description: string;
  speed: number;
  handling: number;
  armor: number;
  color: string;
  wingSpan: number;
  shape: 'trainer' | 'delta' | 'interceptor' | 'heavy' | 'swept' | 'twin' | 'canard' | 'fortress' | 'crescent';
};

export const SHIPS: readonly Ship[] = [
  { id: 'pioneer', name: 'Пионер', role: 'Учебный истребитель', description: 'Надёжный первый корабль: прямые крылья, два двигателя и предсказуемое управление.', speed: 62, handling: 66, armor: 60, color: '#f99a63', wingSpan: 3.4, shape: 'trainer' },
  { id: 'spectre', name: 'Спектр', role: 'Разведчик', description: 'Лёгкий корпус с треугольным крылом. Быстрее проходит пояс астероидов.', speed: 73, handling: 76, armor: 62, color: '#7cd4f5', wingSpan: 3.2, shape: 'delta' },
  { id: 'swift', name: 'Стриж', role: 'Перехватчик', description: 'Узкий фюзеляж, передние стабилизаторы и увеличенные двигатели для резких манёвров.', speed: 81, handling: 94, armor: 56, color: '#b3a0ff', wingSpan: 2.65, shape: 'interceptor' },
  { id: 'eagle', name: 'Беркут', role: 'Тяжёлый истребитель', description: 'Широкие крылья и усиленная броня помогают выдержать столкновение с крупным астероидом.', speed: 72, handling: 65, armor: 96, color: '#e6c16e', wingSpan: 4.3, shape: 'heavy' },
  { id: 'phoenix', name: 'Феникс', role: 'Штурмовик', description: 'Крыло обратной стреловидности, яркие двигатели и сбалансированная защита.', speed: 85, handling: 86, armor: 84, color: '#ff7373', wingSpan: 3.85, shape: 'swept' },
  { id: 'aurora', name: 'Аврора', role: 'Экспедиционный флагман', description: 'Двухбалочный корпус, четыре двигателя и высокая скорость для дальних полётов.', speed: 91, handling: 90, armor: 92, color: '#7aefbe', wingSpan: 4.1, shape: 'twin' },
  { id: 'orion', name: 'Орион', role: 'Дальний перехватчик', description: 'Длинный нос и переднее оперение для точных манёвров в глубоком космосе.', speed: 96, handling: 98, armor: 83, color: '#70a8ff', wingSpan: 3.6, shape: 'canard' },
  { id: 'titan', name: 'Титан', role: 'Орбитальная крепость', description: 'Мощные боковые гондолы, четыре двигателя и максимальная защита корпуса.', speed: 82, handling: 74, armor: 100, color: '#e6a971', wingSpan: 4.5, shape: 'fortress' },
  { id: 'nebula', name: 'Небула', role: 'Звёздный исследователь', description: 'Широкое крыло в форме полумесяца и светящиеся законцовки для финальной экспедиции.', speed: 102, handling: 96, armor: 96, color: '#e3a0ff', wingSpan: 4.45, shape: 'crescent' },
];

export type Mission = { id: number; title: string; description: string; distance: number; rockCount: number; rewardShip: string };

export const MISSIONS: readonly Mission[] = [
  { id: 1, title: 'Пояс Кеплера', description: 'Первый маршрут к станции «Горизонт». Освой управление и расчисти путь огнём.', distance: 5500, rockCount: 80, rewardShip: 'Спектр' },
  { id: 2, title: 'Ледяной след', description: 'Пройди сквозь плотное облако обломков и открой манёвренный перехватчик.', distance: 6200, rockCount: 95, rewardShip: 'Стриж' },
  { id: 3, title: 'Тихий разлом', description: 'Держи курс в широком поле астероидов. Береги щит для последнего участка.', distance: 7000, rockCount: 110, rewardShip: 'Беркут' },
  { id: 4, title: 'Красный горизонт', description: 'Ускоряйся на свободных участках и разбивай крупные препятствия двойным залпом.', distance: 7800, rockCount: 125, rewardShip: 'Феникс' },
  { id: 5, title: 'Северное сияние', description: 'Проведи корабль через сияющий пояс и получи флагман «Аврора».', distance: 8800, rockCount: 140, rewardShip: 'Аврора' },
  { id: 6, title: 'Созвездие Ориона', description: 'Дальний переход через тёмную область. Чередуй точный огонь и быстрые манёвры.', distance: 9500, rockCount: 150, rewardShip: 'Орион' },
  { id: 7, title: 'Кольца Титана', description: 'Самый плотный пояс обломков. Усиленный корабль станет наградой за выдержку.', distance: 10200, rockCount: 160, rewardShip: 'Титан' },
  { id: 8, title: 'Сердце туманности', description: 'Финальная экспедиция к краю туманности откроет последний корабль коллекции.', distance: 11000, rockCount: 175, rewardShip: 'Небула' },
];

export function getShip(nameOrId: string): Ship {
  return SHIPS.find(ship => ship.name === nameOrId || ship.id === nameOrId) ?? SHIPS[0];
}

export function getMission(id = 1): Mission {
  return MISSIONS.find(mission => mission.id === id) ?? MISSIONS[0];
}

/** Only a continuous sequence from stage one represents earned progress. */
export function normalizeCompletedMissions(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const completed = new Set(value.filter((id): id is number => typeof id === 'number' && Number.isInteger(id)));
  const result: number[] = [];
  for (const mission of MISSIONS) {
    if (!completed.has(mission.id)) break;
    result.push(mission.id);
  }
  return result;
}

export function getUnlockedShipNames(completedMissions: number[]): string[] {
  const completed = normalizeCompletedMissions(completedMissions);
  return [SHIPS[0].name, ...completed.map(id => getMission(id).rewardShip)];
}

export type FlightResult = { id: number | string; date: string; distance: number; time: number; success: boolean; ship: string; missionId?: number; score?: number };

/** Keep valid legacy flights and discard malformed records before rendering or migration. */
export function normalizeFlights(value: unknown): FlightResult[] {
  if (!Array.isArray(value)) return [];
  return value.filter((flight): flight is FlightResult => {
    if (!flight || typeof flight !== 'object') return false;
    const f = flight as Record<string, unknown>;
    const finitePositive = (number: unknown) => typeof number === 'number' && Number.isFinite(number) && number >= 0;
    return (finitePositive(f.id) || (typeof f.id === 'string' && f.id.length > 0))
      && typeof f.ship === 'string' && SHIPS.some(ship => ship.name === f.ship)
      && typeof f.date === 'string' && Number.isFinite(Date.parse(f.date))
      && typeof f.success === 'boolean' && finitePositive(f.distance) && finitePositive(f.time)
      && (f.missionId === undefined || MISSIONS.some(mission => mission.id === f.missionId))
      && (f.score === undefined || finitePositive(f.score));
  }).slice(-100);
}