import assert from 'node:assert/strict';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Vite transforms the actual TypeScript sources in memory; no server port is opened.
const vite = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: 'custom',
});
const originalWindow = globalThis.window;
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const originalFetch = globalThis.fetch;
const events = [];
globalThis.window = { location: { hash: '#focus' }, dispatchEvent: (event) => events.push(event) };
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: { getItem: () => null, setItem() {}, removeItem() {} },
});
let checks = 0;
function check(name, fn) {
  fn();
  checks++;
  console.log(`✓ ${name}`);
}
try {
  const utils = await vite.ssrLoadModule('/src/lib/utils.ts');
  check('timer formatting clamps expired countdowns', () => {
    assert.equal(utils.clock(1500), '25:00');
    assert.equal(utils.clock(-1), '00:00');
    assert.equal(utils.clock(61.1), '01:02');
    assert.equal(utils.duration(3600), '1 ч');
  });
  const running = {
    status: 'running',
    endsAt: new Date(80_000).toISOString(),
    durationSeconds: 1500,
  };
  check('countdown applies server clock offset', () =>
    assert.equal(utils.remaining(running, 10_000, 50_000), 20),
  );
  check('paused countdown ignores wall-clock time', () =>
    assert.equal(
      utils.remaining({ status: 'paused', remainingSeconds: 412 }, 90_000, 900_000),
      412,
    ),
  );
  check('expired countdown cannot become negative', () =>
    assert.equal(utils.remaining(running, 0, 90_000), 0),
  );
  check('history totals include actual Focus time for cancellations', () => {
    assert.deepEqual(
      utils.summarize([
        { status: 'completed', focusedSeconds: 1500 },
        { status: 'cancelled', focusedSeconds: 300 },
      ]),
      {
        totalSessions: 2,
        completedSessions: 1,
        cancelledSessions: 1,
        totalFocusedSeconds: 1800,
        totalFocusedMinutes: 30,
        averageFocusedSeconds: 900,
      },
    );
    assert.equal(utils.summarize([]).averageFocusedSeconds, 0);
  });
  check('history query carries filters without list pagination into stats', () => {
    const params = utils.historyParams({ period: 'all', status: 'completed', offset: 16 });
    assert.equal(params.toString(), 'status=completed');
    const day = new Date(utils.filterFrom('today'));
    assert.equal(day.getHours(), 0);
    assert.equal(day.getMinutes(), 0);
  });

  const { api, ApiError } = await vite.ssrLoadModule('/src/lib/api.ts');
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ id: 'task-1' }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  const task = await api('/tasks', 'test-token', { method: 'POST', body: { title: 'Read' } });
  check('API serializes payload and authenticates requests', () => {
    assert.equal(task.id, 'task-1');
    assert.equal(request.options.headers.Authorization, 'Bearer test-token');
    assert.equal(request.options.body, '{"title":"Read"}');
    assert.equal(request.url, '/api/tasks');
  });
  globalThis.fetch = async () => new Response(null, { status: 204 });
  check('delete response accepts an empty body', () => {});
  assert.equal(await api('/tasks/1', 'test-token', { method: 'DELETE' }), undefined);
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ code: 'UNAUTHORIZED' }), { status: 401 });
  await assert.rejects(
    () => api('/auth/me', 'expired-token'),
    (error) => error instanceof ApiError && error.status === 401,
  );
  check('expired sessions identify their token to prevent logging out a newer session', () =>
    assert.equal(events.at(-1).detail.token, 'expired-token'),
  );
  const before = events.length;
  await assert.rejects(() => api('/auth/login', null, { method: 'POST', body: {} }));
  check('invalid public login does not expire another session', () =>
    assert.equal(events.length, before),
  );
  globalThis.fetch = async () => {
    throw new Error('offline');
  };
  await assert.rejects(
    () => api('/tasks', 'test-token'),
    (error) => error instanceof ApiError && error.code === 'NETWORK_ERROR',
  );
  check('network failures produce a readable application error', () => {});

  const { default: App } = await vite.ssrLoadModule('/src/App.tsx');
  for (const [page, text] of [
    ['focus', 'Начать фокус'],
    ['tasks', 'Все твои задачи'],
    ['history', 'Твои сессии'],
  ]) {
    window.location.hash = `#${page}`;
    const html = renderToStaticMarkup(React.createElement(App));
    check(`${page} screen renders with demo disclosure and navigation`, () => {
      assert.ok(html.includes(text));
      assert.ok(html.includes('ДЕМО'));
      assert.ok(html.includes('Перейти к содержимому'));
      assert.ok(html.includes('aria-current="page"'));
    });
  }
  console.log(`\n${checks} frontend checks passed.`);
} finally {
  globalThis.window = originalWindow;
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
  else delete globalThis.localStorage;
  globalThis.fetch = originalFetch;
  await vite.close();
}
