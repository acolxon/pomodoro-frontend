export interface Waypoint {
  x: number;
  y: number;
  wait: number;
  activity: string;
}
export interface Villager {
  name: string;
  sprite: number;
  speed: number;
  offset: number;
  route: Waypoint[];
}
export const villagers: Villager[] = [
  {
    name: 'Мира',
    sprite: 0,
    speed: 13,
    offset: 0,
    route: [
      { x: 534, y: 274, wait: 5, activity: 'собирает травы' },
      { x: 595, y: 294, wait: 0, activity: '' },
      { x: 639, y: 334, wait: 8, activity: 'поливает огород' },
      { x: 595, y: 294, wait: 1, activity: 'любуется садом' },
    ],
  },
  {
    name: 'Тео',
    sprite: 1,
    speed: 12,
    offset: 8,
    route: [
      { x: 125, y: 255, wait: 7, activity: 'проверяет почту' },
      { x: 212, y: 291, wait: 2, activity: 'смотрит на реку' },
      { x: 326, y: 273, wait: 0, activity: '' },
      { x: 378, y: 282, wait: 6, activity: 'отдыхает у площади' },
      { x: 326, y: 273, wait: 0, activity: '' },
      { x: 212, y: 291, wait: 0, activity: '' },
    ],
  },
  {
    name: 'Лис',
    sprite: 2,
    speed: 11,
    offset: 16,
    route: [
      { x: 397, y: 294, wait: 3, activity: 'наблюдает за облаками' },
      { x: 436, y: 320, wait: 9, activity: 'греется у костра' },
      { x: 455, y: 362, wait: 6, activity: 'читает книгу' },
      { x: 436, y: 320, wait: 2, activity: 'отдыхает' },
    ],
  },
  {
    name: 'Элли',
    sprite: 3,
    speed: 12,
    offset: 5,
    route: [
      { x: 593, y: 282, wait: 8, activity: 'готовит чай' },
      { x: 537, y: 273, wait: 0, activity: '' },
      { x: 459, y: 286, wait: 6, activity: 'встречает соседей' },
      { x: 537, y: 273, wait: 2, activity: 'считает цветы' },
    ],
  },
];
/** Deterministic loops follow road segments and dwell at destinations. No random wandering. */
export function sampleRoute(villager: Villager, seconds: number) {
  const segments = villager.route.map((point, index) => {
    const next = villager.route[(index + 1) % villager.route.length];
    return { point, next, travel: Math.hypot(next.x - point.x, next.y - point.y) / villager.speed };
  });
  const total = segments.reduce((sum, segment) => sum + segment.point.wait + segment.travel, 0);
  let elapsed = (((seconds + villager.offset) % total) + total) % total;
  for (const { point, next, travel } of segments) {
    const dx = next.x - point.x;
    const dy = next.y - point.y;
    const direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 2 : 1) : dy > 0 ? 0 : 3;
    if (elapsed < point.wait)
      return { x: point.x, y: point.y, direction: 0, walking: false, activity: point.activity };
    elapsed -= point.wait;
    if (elapsed <= travel) {
      const fraction = travel ? elapsed / travel : 0;
      return {
        x: point.x + dx * fraction,
        y: point.y + dy * fraction,
        direction,
        walking: true,
        activity: 'идёт по деревне',
      };
    }
    elapsed -= travel;
  }
  return { ...villager.route[0], direction: 0, walking: false };
}
