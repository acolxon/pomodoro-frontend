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
globalThis.window = {
  location: { hash: '#focus', search: '', href: 'http://localhost:5173/#focus' },
  dispatchEvent: (event) => events.push(event),
};
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

  check('custom date range includes the whole final local day and carries room filter', () => {
    const params = utils.historyParams({
      period: 'custom',
      from: '2026-11-01',
      to: '2026-11-14',
      roomId: 'room-1',
      status: '',
      offset: 0,
    });
    assert.equal(params.get('from'), new Date(2026, 10, 1).toISOString());
    assert.equal(params.get('to'), new Date(2026, 10, 15).toISOString());
    assert.equal(params.get('roomId'), 'room-1');
    assert.equal(params.has('offset'), false);
  });
  check('invalid and reversed date ranges are rejected before API requests', () => {
    assert.ok(utils.historyFilterError({ period: 'custom', from: '2026-11-15', to: '2026-11-14' }));
    assert.ok(utils.historyFilterError({ period: 'custom', from: '2026-02-31' }));
    assert.ok(utils.historyFilterError({ period: 'custom', to: 'garbage' }));
    assert.equal(
      utils.historyFilterError({ period: 'custom', from: '2026-11-14', to: '2026-11-14' }),
      null,
    );
    assert.equal(utils.historyFilterError({ period: 'week', from: 'garbage' }), null);
  });
  check('invitation links preserve deployment path and remove unrelated query data', () => {
    const link = new URL(
      utils.roomInvitationUrl('https://tomato.example/app/?private=value#history', 'ab23cd45'),
    );
    assert.equal(link.pathname, '/app/');
    assert.equal(link.search, '?invite=AB23CD45');
    assert.equal(link.hash, '#focus');
    assert.equal(utils.inviteCodeFromSearch(link.search), 'AB23CD45');
    assert.equal(utils.inviteCodeFromSearch('?invite=%20ab23cd45%20'), 'AB23CD45');
  });
  check('invalid invitations never become room join codes', () => {
    for (const query of ['', '?invite=', '?invite=bad', '?invite=ABCD0000', '?invite=%3Cscript%3E'])
      assert.equal(utils.inviteCodeFromSearch(query), null);
    assert.throws(() => utils.roomInvitationUrl('https://tomato.example/', 'bad'));
  });
  const { villagers, sampleRoute } = await vite.ssrLoadModule('/src/lib/village.ts');
  check('village routes pause at workstations and walk continuously without teleports', () => {
    for (const villager of villagers) {
      const start = sampleRoute(villager, -villager.offset);
      assert.equal(start.walking, false);
      assert.equal(start.activity, villager.route[0].activity);
      assert.equal(start.x, villager.route[0].x);
      const after = sampleRoute(villager, villager.route[0].wait + 1 - villager.offset);
      assert.equal(after.walking, true);
      assert.ok(
        Math.abs(Math.hypot(after.x - start.x, after.y - start.y) - villager.speed) < 0.001,
      );
      let previous = start;
      for (let seconds = 0.1; seconds <= 200; seconds += 0.1) {
        const pose = sampleRoute(villager, seconds - villager.offset);
        assert.ok(
          Math.hypot(pose.x - previous.x, pose.y - previous.y) <= villager.speed * 0.1 + 0.001,
        );
        assert.ok(pose.x >= 0 && pose.x <= 768 && pose.y >= 0 && pose.y <= 448);
        assert.ok(pose.direction >= 0 && pose.direction <= 3);
        previous = pose;
      }
    }
  });

  const { api, ApiError, socketError } = await vite.ssrLoadModule('/src/lib/api.ts');
  check('socket exceptions retain domain codes and share readable REST messages', () => {
    const error = socketError({ code: 'NOT_ROOM_OWNER', message: 'server text' });
    assert.ok(error instanceof ApiError);
    assert.equal(error.code, 'NOT_ROOM_OWNER');
    assert.equal(error.message, 'Это действие доступно только владельцу комнаты.');
    assert.equal(
      socketError({ code: 'CUSTOM', message: 'Понятная ошибка' }).message,
      'Понятная ошибка',
    );
  });
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
  window.location.search = '?invite=AB23CD45';
  const invitation = renderToStaticMarkup(React.createElement(App));
  check('opening an invitation in demo asks for login and preserves the room code', () => {
    assert.ok(invitation.includes('AB23CD45'));
    assert.ok(invitation.includes('Войти и присоединиться'));
    assert.ok(invitation.includes('Подтвердите') || invitation.includes('подтвердите'));
    assert.ok(!invitation.includes('Передать права'));
  });
  window.location.search = '';
  const { ProgressCard } = await vite.ssrLoadModule('/src/components/ProgressCard.tsx');
  const player = {
    username: 'Alice',
    stats: { xp: 125, coins: 50, level: 2, sessionsCompleted: 5, activeDays: 2 },
    progression: {
      level: 2,
      xpInLevel: 25,
      xpRequiredForLevel: 200,
      xpToNextLevel: 175,
      progressPercent: 12,
      focusXp: 25,
      focusCoins: 10,
      teamBonusPercent: 20,
    },
  };
  check('player progress renders server level, wallet and accessible XP thresholds', () => {
    const html = renderToStaticMarkup(
      React.createElement(ProgressCard, { user: player, demo: false, loading: false }),
    );
    assert.ok(html.includes('Уровень 2'));
    assert.ok(html.includes('25 / 200 XP'));
    assert.ok(html.includes('175 XP до уровня 3'));
    assert.ok(html.includes('Всего 125 XP'));
    assert.ok(html.includes('aria-valuenow="25"'));
    assert.ok(html.includes('aria-valuemax="200"'));
    assert.ok(html.includes('50</strong>'));
  });
  check('demo never presents sample history as earned account progress', () => {
    const html = renderToStaticMarkup(
      React.createElement(ProgressCard, { user: player, demo: true, loading: false }),
    );
    assert.ok(html.includes('Войди и завершай Focus'));
    assert.ok(!html.includes('role="progressbar"'));
    assert.ok(!html.includes('Уровень 2'));
  });
  check('old backend without progression gets an explicit unavailable state', () => {
    const html = renderToStaticMarkup(
      React.createElement(ProgressCard, {
        user: { ...player, progression: undefined },
        demo: false,
        loading: false,
      }),
    );
    assert.ok(html.includes('Прогресс пока недоступен'));
    assert.ok(!html.includes('role="progressbar"'));
  });
  const { History } = await vite.ssrLoadModule('/src/components/History.tsx');
  check('history renders actual reward receipt, team bonus and zero for unawarded sessions', () => {
    const workspace = {
      demo: false,
      filter: { period: 'all', status: '', offset: 0 },
      setFilter() {},
      refresh() {},
      historyStats: {
        totalSessions: 2,
        completedSessions: 1,
        cancelledSessions: 1,
        totalFocusedSeconds: 1500,
      },
      historyPage: {
        total: 2,
        items: [
          {
            id: 'rewarded',
            roomName: 'Garden',
            status: 'completed',
            plannedDurationSeconds: 1500,
            focusedSeconds: 1500,
            startedAt: '2026-11-15T10:00:00Z',
            endedAt: '2026-11-15T10:25:00Z',
            xpEarned: 30,
            coinsEarned: 12,
            teamBonus: true,
          },
          {
            id: 'cancelled',
            status: 'cancelled',
            plannedDurationSeconds: 1500,
            focusedSeconds: 0,
            startedAt: '2026-11-15T11:00:00Z',
            endedAt: '2026-11-15T11:00:00Z',
            xpEarned: 0,
            coinsEarned: 0,
          },
        ],
      },
      historyRooms: [],
      week: [],
      historyLoading: false,
    };
    const html = renderToStaticMarkup(React.createElement(History, { workspace }));
    assert.ok(html.includes('+30 XP'));
    assert.ok(html.includes('+12 монет'));
    assert.ok(html.includes('Командный бонус'));
    assert.ok(html.includes('нет начисленной награды'));
  });
  console.log(`\n${checks} frontend checks passed.`);
} finally {
  globalThis.window = originalWindow;
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
  else delete globalThis.localStorage;
  globalThis.fetch = originalFetch;
  await vite.close();
}
