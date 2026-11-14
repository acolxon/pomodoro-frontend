import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { sampleRoute, villagers } from '../lib/village';
import { Icon } from './Icon';

export function Village({ children }: { children: ReactNode }) {
  const actors = useRef<(HTMLDivElement | null)[]>([]);
  const elapsed = useRef(0);
  const [reduced, setReduced] = useState(false);
  const [paused, setPaused] = useState(() => {
    try {
      return localStorage.getItem('tomato-still-village') === 'true';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const changed = () => setReduced(query.matches);
    query.addEventListener('change', changed);
    return () => query.removeEventListener('change', changed);
  }, []);
  useEffect(() => {
    let frame = 0;
    let previous = performance.now();
    let lastPaint = 0;
    const moving = !paused && !reduced;
    const draw = () =>
      villagers.forEach((villager, index) => {
        const element = actors.current[index];
        if (!element) return;
        const pose = sampleRoute(villager, elapsed.current);
        element.style.left = `${(pose.x / 768) * 100}%`;
        element.style.top = `${(pose.y / 448) * 100}%`;
        element.style.zIndex = String(Math.round(pose.y));
        const sprite = element.firstElementChild as HTMLElement;
        const walk = pose.walking && moving ? Math.floor(elapsed.current * 7) % 4 : 0;
        sprite.style.backgroundPosition = `${(walk * 100) / 3}% ${(pose.direction * 100) / 3}%`;
        element.dataset.caption = `${villager.name} · ${pose.activity}`;
      });
    const paint = (time: number) => {
      elapsed.current += Math.min(0.1, (time - previous) / 1000);
      previous = time;
      if (time - lastPaint > 50) {
        draw();
        lastPaint = time;
      }
      frame = requestAnimationFrame(paint);
    };
    const visibility = () => {
      cancelAnimationFrame(frame);
      if (moving && document.visibilityState === 'visible') {
        previous = performance.now();
        frame = requestAnimationFrame(paint);
      }
    };
    draw();
    visibility();
    document.addEventListener('visibilitychange', visibility);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [paused, reduced]);
  function toggle() {
    const value = !paused;
    setPaused(value);
    try {
      localStorage.setItem('tomato-still-village', String(value));
    } catch {
      /* preference is optional */
    }
  }
  return (
    <section
      className={`village-stage ${paused || reduced ? 'world-still' : ''}`}
      aria-label="Дневная деревня Tomato и общий таймер"
    >
      <div className="village-world" aria-hidden="true">
        <img
          src="/art/village-day.png"
          className="village-landscape"
          alt=""
          fetchPriority="high"
          draggable={false}
        />
        <div className="water-sparkle water-one" />
        <div className="water-sparkle water-two" />
        <div className="campfire-flame" />
        <div className="chimney-smoke smoke-one" />
        <div className="chimney-smoke smoke-two" />
        {villagers.map((villager, index) => {
          const pose = sampleRoute(villager, 0);
          return (
            <div
              key={villager.name}
              className="villager"
              ref={(element) => {
                actors.current[index] = element;
              }}
              style={{ left: `${(pose.x / 768) * 100}%`, top: `${(pose.y / 448) * 100}%` }}
              data-caption={`${villager.name} · ${pose.activity}`}
            >
              <span
                className="villager-sprite"
                style={{ backgroundImage: `url(/art/villager-${villager.sprite}.png)` }}
              />
            </div>
          );
        })}
      </div>
      <div className="village-sunlight" aria-hidden="true" />
      {children}
      <button
        className="world-toggle"
        onClick={toggle}
        disabled={reduced}
        aria-pressed={paused || reduced}
        title={
          reduced
            ? 'Движение отключено в настройках устройства'
            : paused
              ? 'Включить движение жителей'
              : 'Остановить движение жителей'
        }
      >
        <Icon name={paused || reduced ? 'play' : 'pause'} size={13} />
        {paused || reduced ? 'Тихая деревня' : 'Деревня живёт'}
      </button>
    </section>
  );
}
