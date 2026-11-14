import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from '../vendor/socket.io.esm.min.js';
import { api, ApiError, socketError, socketUrl } from '../lib/api';
import { demoHistory, demoMembers, demoRoom, demoTasks, demoUser } from '../lib/demo';
import {
  emptyStats,
  errorText,
  historyFilterError,
  historyParams,
  remaining,
  summarize,
} from '../lib/utils';
import {
  HISTORY_LIMIT,
  type AuthResponse,
  type Command,
  type HistoryFilter,
  type HistoryRoom,
  type HistoryPage,
  type HistoryRecord,
  type HistoryStats,
  type Member,
  type Notice,
  type Pomodoro,
  type RealtimeError,
  type Room,
  type Snapshot,
  type SessionTask,
  type Task,
  type TaskStatus,
  type User,
} from '../lib/types';

function savedToken() {
  try {
    return localStorage.getItem('tomato-token');
  } catch {
    return null;
  }
}
function storeToken(token: string | null) {
  try {
    if (token) localStorage.setItem('tomato-token', token);
    else localStorage.removeItem('tomato-token');
  } catch {
    /* In-memory login still works if storage is blocked. */
  }
}
const idleTimer = (roomId: string): Pomodoro => ({
  roomId,
  pomodoroSessionId: null,
  status: 'idle',
  phase: null,
  durationSeconds: 1500,
  startedAt: null,
  endsAt: null,
  pausedAt: null,
  remainingSeconds: null,
  serverTime: new Date().toISOString(),
});
export type Connection = 'demo' | 'connecting' | 'connected' | 'disconnected';
export interface TaskInput {
  title: string;
  description: string | null;
}

export function useWorkspace() {
  const [token, setToken] = useState<string | null>(savedToken);
  const demo = !token;
  const [user, setUser] = useState<User | null>(() => (token ? null : demoUser));
  const [tasks, setTasks] = useState<Task[]>(() => (token ? [] : demoTasks()));
  const [room, setRoom] = useState<Room | null>(() => (token ? null : demoRoom()));
  const [members, setMembers] = useState<Member[]>(() => (token ? [] : demoMembers()));
  const [timer, setTimer] = useState<Pomodoro | null>(() =>
    token ? null : idleTimer('demo-room'),
  );
  const [sessionTaskResult, setSessionTaskResult] = useState<{
    runId: string;
    roomId: string;
    token: string;
    value: SessionTask | null;
    error: boolean;
  } | null>(null);
  const [connection, setConnection] = useState<Connection>(token ? 'connecting' : 'demo');
  const [clockOffset, setClockOffset] = useState(0);
  const [records, setRecords] = useState<HistoryRecord[]>(demoHistory);
  const [filter, setFilter] = useState<HistoryFilter>({ period: 'week', status: '', offset: 0 });
  const [historyPage, setHistoryPage] = useState<HistoryPage>({ items: [], total: 0 });
  const [historyStats, setHistoryStats] = useState<HistoryStats>(emptyStats);
  const [week, setWeek] = useState<{ date: string; seconds: number }[]>([]);
  const [today, setToday] = useState<HistoryStats>(emptyStats);
  const [loading, setLoading] = useState(!!token);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyRooms, setHistoryRooms] = useState<HistoryRoom[]>([]);
  const [historyRoomsError, setHistoryRoomsError] = useState<string | null>(null);
  const [membershipLoading, setMembershipLoading] = useState(!!token);
  const [membershipRevision, setMembershipRevision] = useState(0);
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState<string[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [actionErrors, setActionErrors] = useState<Record<string, string | undefined>>({});
  const socket = useRef<Socket | null>(null);
  const previousTimer = useRef<Pomodoro | null>(null);
  const currentToken = useRef(token);
  currentToken.current = token;
  const busy = useRef(new Set<string>());
  const demoRun = useRef<{
    id: string;
    start: string;
    taskId: string | null;
    taskTitle: string | null;
    planned: number;
  } | null>(null);
  const roomId = room?.id ?? null;
  const currentRoomId = useRef(roomId);
  const membershipEpoch = useRef(0);
  const timerEventRevision = useRef(0);
  const syncRoom = useRef<(() => void) | null>(null);
  currentRoomId.current = roomId;
  const requestMembership = useCallback(() => {
    membershipEpoch.current += 1;
    setMembershipLoading(true);
    setMembershipRevision((value) => value + 1);
  }, []);
  const progressBaseline = useRef<{
    token: string;
    xp: number;
    coins: number;
    level: number;
  } | null>(null);

  const notify = useCallback((message: string, kind: Notice['kind'] = 'success') => {
    setNotices((current) => [
      ...current.slice(-2),
      { id: Date.now() + Math.random(), message, kind },
    ]);
  }, []);
  const dismissNotice = useCallback(
    (id: number) => setNotices((items) => items.filter((item) => item.id !== id)),
    [],
  );
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const clearActionError = useCallback(
    (key: string) => setActionErrors((errors) => ({ ...errors, [key]: undefined })),
    [],
  );
  const acceptTimer = useCallback(
    (next: Pomodoro) => {
      const previous = previousTimer.current;
      if (
        previous?.phase === 'focus' &&
        (next.phase !== 'focus' || previous.pomodoroSessionId !== next.pomodoroSessionId)
      )
        refresh();
      previousTimer.current = next;
      setClockOffset(new Date(next.serverTime).getTime() - Date.now());
      setTimer(next);
    },
    [refresh],
  );

  const enterDemo = useCallback(() => {
    currentToken.current = null;
    storeToken(null);
    setToken(null);
    setUser(demoUser);
    setTasks(demoTasks());
    setRoom(demoRoom());
    setMembers(demoMembers());
    setTimer(idleTimer('demo-room'));
    setConnection('demo');
    setClockOffset(0);
    setRecords(demoHistory());
    setFilter({ period: 'week', status: '', offset: 0 });
    setLoadError(null);
    demoRun.current = null;
    previousTimer.current = null;
    setActionErrors({});
    setLoading(false);
    setMembershipLoading(false);
    refresh();
  }, [refresh]);

  useEffect(() => {
    const expired = (event: Event) => {
      const expiredToken = (event as CustomEvent<{ token: string }>).detail?.token;
      if (!currentToken.current || expiredToken !== currentToken.current) return;
      enterDemo();
      notify('Сессия завершилась. Войдите ещё раз.', 'error');
    };
    window.addEventListener('tomato:unauthorized', expired);
    return () => window.removeEventListener('tomato:unauthorized', expired);
  }, [enterDemo, notify]);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    Promise.all([
      api<User>('/auth/me', token, { signal: controller.signal }),
      api<Task[]>('/tasks', token, { signal: controller.signal }),
    ])
      .then(([profile, items]) => {
        if (!controller.signal.aborted && currentToken.current === token) {
          const previous = progressBaseline.current;
          if (previous?.token === token && profile.stats.xp > previous.xp) {
            const levelUp =
              profile.stats.level > previous.level ? ` Новый уровень: ${profile.stats.level}!` : '';
            notify(
              `Награда за фокус: +${profile.stats.xp - previous.xp} XP, +${Math.max(0, profile.stats.coins - previous.coins)} монет.${levelUp}`,
            );
          }
          progressBaseline.current = { token, ...profile.stats };
          setUser(profile);
          setTasks(items);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted && currentToken.current === token)
          setLoadError(errorText(error));
      })
      .finally(() => {
        if (!controller.signal.aborted && currentToken.current === token) setLoading(false);
      });
    return () => controller.abort();
  }, [token, revision, notify]);

  // One read on login, explicit refresh, or membership events; no interval polling.
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setMembershipLoading(true);
    const epoch = membershipEpoch.current;
    const current = () =>
      !controller.signal.aborted &&
      currentToken.current === token &&
      membershipEpoch.current === epoch;
    void (async () => {
      try {
        const nextRoom = await api<Room>('/rooms/me', token, { signal: controller.signal });
        const nextMembers = await api<Member[]>(`/rooms/${nextRoom.id}/members`, token, {
          signal: controller.signal,
        });
        if (current()) {
          setRoom(nextRoom);
          setMembers(nextMembers);
        }
      } catch (error) {
        if (!current()) return;
        if (error instanceof ApiError && error.code === 'NOT_IN_ROOM') {
          currentRoomId.current = null;
          setRoom(null);
          setMembers([]);
          setTimer(null);
          previousTimer.current = null;
        } else setLoadError(errorText(error));
      } finally {
        if (current()) setMembershipLoading(false);
      }
    })();
    return () => controller.abort();
  }, [token, revision, membershipRevision]);

  // Keep the authenticated connection even without a room, so other tabs can
  // announce a new membership through the private server-side user channel.
  useEffect(() => {
    previousTimer.current = null;
    if (!token) {
      setConnection('demo');
      return;
    }
    setConnection('connecting');
    const client = io(socketUrl(), { auth: { token }, autoConnect: false, reconnection: true });
    socket.current = client;
    let ready = false;
    let joinedRoomId: string | null = null;
    let generation = 0;
    const current = () => currentToken.current === token && socket.current === client;
    const join = () => {
      if (!current() || !ready || !client.connected) return;
      const nextRoomId = currentRoomId.current;
      const requestGeneration = ++generation;
      const timerRevision = timerEventRevision.current;
      if (joinedRoomId && joinedRoomId !== nextRoomId) {
        client.timeout(8000).emit('room:leave', { roomId: joinedRoomId }, () => {});
      }
      joinedRoomId = nextRoomId;
      if (!nextRoomId) {
        setTimer(null);
        setConnection('connected');
        return;
      }
      setConnection('connecting');
      client
        .timeout(8000)
        .emit(
          'room:join',
          { roomId: nextRoomId },
          (error: Error | null, value: Snapshot | undefined) => {
            if (
              !current() ||
              !ready ||
              !client.connected ||
              generation !== requestGeneration ||
              currentRoomId.current !== nextRoomId
            )
              return;
            if (error || !value?.pomodoro) {
              setConnection('disconnected');
              return;
            }
            if (value.room.id !== nextRoomId || value.pomodoro.roomId !== nextRoomId) return;
            if (timerEventRevision.current === timerRevision) acceptTimer(value.pomodoro);
            setConnection('connected');
          },
        );
    };
    syncRoom.current = join;
    client.on('realtime:ready', () => {
      ready = true;
      requestMembership();
      refresh();
      join();
    });
    client.on('room:updated', () => {
      if (current()) requestMembership();
    });
    client.on('room:removed', (event) => {
      if (!current()) return;
      if (currentRoomId.current === event.roomId) {
        currentRoomId.current = null;
        timerEventRevision.current += 1;
        generation += 1;
        joinedRoomId = null;
        setRoom(null);
        setMembers([]);
        setTimer(null);
        previousTimer.current = null;
        if (!busy.current.has('room'))
          notify(
            event.reason === 'closed'
              ? 'Комната закрыта.'
              : 'Вы вышли из комнаты в другой вкладке.',
          );
      }
      requestMembership();
      refresh();
    });
    client.on('pomodoro:state', (value) => {
      if (current() && ready && value.roomId === currentRoomId.current) {
        timerEventRevision.current += 1;
        acceptTimer(value);
      }
    });
    const disconnected = () => {
      ready = false;
      generation += 1;
      timerEventRevision.current += 1;
      if (current()) setConnection('disconnected');
    };
    client.on('disconnect', disconnected);
    client.on('connect_error', disconnected);
    client.io.on('reconnect_attempt', () => {
      if (current()) setConnection('connecting');
    });
    const handleError = (error: RealtimeError) => {
      if (!current()) return;
      if (error.code === 'UNAUTHORIZED') {
        enterDemo();
        notify('Не удалось подтвердить вход. Войдите ещё раз.', 'error');
        return;
      }
      if (!busy.current.has('timer')) notify(socketError(error).message, 'error');
      if (
        error.code === 'NOT_IN_ROOM' ||
        error.code === 'ROOM_CLOSED' ||
        error.code === 'ROOM_NOT_FOUND'
      )
        requestMembership();
    };
    client.on('realtime:error', handleError);
    client.on('exception', handleError);
    const visible = () => {
      if (document.visibilityState === 'visible' && client.connected && ready) {
        requestMembership();
        refresh();
        join();
      }
    };
    document.addEventListener('visibilitychange', visible);
    client.connect();
    return () => {
      generation += 1;
      ready = false;
      document.removeEventListener('visibilitychange', visible);
      syncRoom.current = null;
      client.removeAllListeners();
      client.disconnect();
      if (socket.current === client) socket.current = null;
    };
  }, [token, acceptTimer, enterDemo, notify, refresh, requestMembership]);

  useEffect(() => {
    previousTimer.current = null;
    if (!demo) {
      timerEventRevision.current += 1;
      setTimer(null);
      syncRoom.current?.();
    }
  }, [roomId, demo]);

  const focusRunId =
    timer?.phase === 'focus' && timer.status !== 'idle' ? timer.pomodoroSessionId : null;
  useEffect(() => {
    if (!token || !focusRunId || !roomId) return;
    const controller = new AbortController();
    api<SessionTask>(`/history/sessions/${focusRunId}/my-task`, token, {
      signal: controller.signal,
    })
      .then((value) => {
        if (!controller.signal.aborted && currentToken.current === token)
          setSessionTaskResult({ runId: focusRunId, roomId, token, value, error: false });
      })
      .catch(() => {
        if (!controller.signal.aborted && currentToken.current === token)
          setSessionTaskResult({ runId: focusRunId, roomId, token, value: null, error: true });
      });
    return () => controller.abort();
  }, [token, focusRunId, roomId, revision]);

  const sessionTask = !focusRunId
    ? null
    : demo
      ? demoRun.current?.id === focusRunId
        ? {
            participant: true,
            taskId: demoRun.current.taskId,
            taskTitle: demoRun.current.taskTitle,
          }
        : null
      : sessionTaskResult?.runId === focusRunId &&
          sessionTaskResult.roomId === roomId &&
          sessionTaskResult.token === token
        ? sessionTaskResult.value
        : null;
  const sessionTaskError =
    !!focusRunId &&
    !demo &&
    sessionTaskResult?.runId === focusRunId &&
    sessionTaskResult.roomId === roomId &&
    sessionTaskResult.token === token &&
    sessionTaskResult.error;

  // History and its totals use the same filters; dashboard totals always cover the current week.
  useEffect(() => {
    const invalid = historyFilterError(filter);
    if (invalid) {
      setHistoryError(invalid);
      setHistoryLoading(false);
      return;
    }
    const params = historyParams(filter);
    if (demo) {
      const from = params.get('from');
      const to = params.get('to');
      const filtered = records
        .filter(
          (record) =>
            (!filter.status || record.status === filter.status) &&
            (!filter.roomId || record.roomId === filter.roomId) &&
            (!from || record.startedAt >= from) &&
            (!to || record.startedAt < to),
        )
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
      setHistoryPage({
        items: filtered.slice(filter.offset, filter.offset + HISTORY_LIMIT),
        total: filtered.length,
      });
      setHistoryStats(summarize(filtered));
      setHistoryLoading(false);
      setHistoryError(null);
      return;
    }
    const controller = new AbortController();
    setHistoryLoading(true);
    setHistoryError(null);
    const pageParams = new URLSearchParams(params);
    pageParams.set('limit', String(HISTORY_LIMIT));
    pageParams.set('offset', String(filter.offset));
    Promise.all([
      api<HistoryPage>(`/history?${pageParams}`, token, { signal: controller.signal }),
      api<HistoryStats>(`/history/stats?${params}`, token, { signal: controller.signal }),
    ])
      .then(([page, stats]) => {
        if (!controller.signal.aborted && currentToken.current === token) {
          setHistoryPage(page);
          setHistoryStats(stats);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted && currentToken.current === token)
          setHistoryError(errorText(error));
      })
      .finally(() => {
        if (!controller.signal.aborted && currentToken.current === token) setHistoryLoading(false);
      });
    return () => controller.abort();
  }, [demo, token, filter, revision, records]);

  useEffect(() => {
    setHistoryRoomsError(null);
    if (demo) {
      const rooms = new Map<string, HistoryRoom>();
      records.forEach((record) => {
        if (record.roomId)
          rooms.set(record.roomId, { id: record.roomId, name: record.roomName ?? null });
      });
      setHistoryRooms([...rooms.values()]);
      return;
    }
    const controller = new AbortController();
    api<HistoryRoom[]>('/history/rooms', token, { signal: controller.signal })
      .then((items) => {
        if (!controller.signal.aborted && currentToken.current === token) setHistoryRooms(items);
      })
      .catch((error) => {
        if (!controller.signal.aborted && currentToken.current === token) {
          setHistoryRooms([]);
          setHistoryRoomsError(
            error instanceof ApiError && error.status === 404
              ? 'Фильтр комнат недоступен: обновите backend до последней версии.'
              : errorText(error),
          );
        }
      });
    return () => controller.abort();
  }, [demo, token, revision, records]);

  useEffect(() => {
    const controller = new AbortController();
    const days = Array.from({ length: 7 }, (_, index) => {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - 6 + index);
      return day;
    });
    if (demo) {
      setWeek(
        days.map((day) => ({
          date: day.toISOString(),
          seconds: records
            .filter((record) => new Date(record.startedAt).toDateString() === day.toDateString())
            .reduce((sum, record) => sum + record.focusedSeconds, 0),
        })),
      );
      setToday(
        summarize(
          records.filter(
            (record) => new Date(record.startedAt).toDateString() === new Date().toDateString(),
          ),
        ),
      );
    } else {
      Promise.all(
        days.map(async (day) => {
          const end = new Date(day);
          end.setDate(end.getDate() + 1);
          const params = new URLSearchParams({ from: day.toISOString(), to: end.toISOString() });
          const stats = await api<HistoryStats>(`/history/stats?${params}`, token, {
            signal: controller.signal,
          });
          return { date: day.toISOString(), stats };
        }),
      )
        .then((values) => {
          if (!controller.signal.aborted && currentToken.current === token) {
            setWeek(
              values.map((value) => ({
                date: value.date,
                seconds: value.stats.totalFocusedSeconds,
              })),
            );
            setToday(values[6].stats);
          }
        })
        .catch((error) => {
          if (!controller.signal.aborted && currentToken.current === token)
            setLoadError(errorText(error));
        });
    }
    return () => controller.abort();
  }, [demo, token, revision, records]);

  const run = useCallback(
    async (key: string, action: () => Promise<void>, success?: string) => {
      if (busy.current.has(key)) return false;
      const actionToken = currentToken.current;
      setActionErrors((errors) => ({ ...errors, [key]: undefined }));
      busy.current.add(key);
      setPending([...busy.current]);
      try {
        await action();
        if (key !== 'auth' && actionToken !== currentToken.current) return false;
        if (success) notify(success);
        return true;
      } catch (error) {
        if (actionToken === currentToken.current) {
          setActionErrors((errors) => ({ ...errors, [key]: errorText(error) }));
          notify(errorText(error), 'error');
        }
        return false;
      } finally {
        busy.current.delete(key);
        setPending([...busy.current]);
      }
    },
    [notify],
  );

  const authenticate = (mode: 'login' | 'register', values: Record<string, string>) =>
    run(
      'auth',
      async () => {
        const result = await api<AuthResponse>(`/auth/${mode}`, null, {
          method: 'POST',
          body: values,
        });
        storeToken(result.accessToken);
        currentToken.current = result.accessToken;
        setUser(result.user);
        setTasks([]);
        setRoom(null);
        setMembers([]);
        setTimer(null);
        setRecords([]);
        setToday(emptyStats);
        setWeek([]);
        setHistoryPage({ items: [], total: 0 });
        setHistoryStats(emptyStats);
        setHistoryRooms([]);
        setFilter({ period: 'week', status: '', offset: 0 });
        setToken(result.accessToken);
        setLoading(true);
        setMembershipLoading(true);
        setLoadError(null);
        demoRun.current = null;
      },
      mode === 'register' ? 'Аккаунт создан. Добро пожаловать!' : 'Вы вошли в аккаунт.',
    );

  const saveTask = (values: TaskInput, id?: string) =>
    run(
      'task-save',
      async () => {
        if (demo) {
          const date = new Date().toISOString();
          setTasks((items) =>
            id
              ? items.map((task) =>
                  task.id === id ? { ...task, ...values, updatedAt: date } : task,
                )
              : [
                  ...items,
                  {
                    ...values,
                    id: crypto.randomUUID(),
                    userId: demoUser.id,
                    status: 'todo',
                    createdAt: date,
                    updatedAt: date,
                    completedAt: null,
                  },
                ],
          );
        } else {
          const task = await api<Task>(id ? `/tasks/${id}` : '/tasks', token, {
            method: id ? 'PATCH' : 'POST',
            body: values,
          });
          if (currentToken.current === token)
            setTasks((items) =>
              id ? items.map((item) => (item.id === id ? task : item)) : [...items, task],
            );
        }
      },
      id ? 'Задача обновлена.' : 'Задача добавлена.',
    );

  const setTaskStatus = (id: string, status: TaskStatus) =>
    run(
      'task-status',
      async () => {
        if (
          status === 'in_progress' &&
          tasks.some((task) => task.status === 'in_progress' && task.id !== id)
        )
          throw new Error('Сначала отложите текущую активную задачу.');
        if (demo) {
          setTasks((items) =>
            items.map((task) =>
              task.id === id
                ? {
                    ...task,
                    status,
                    completedAt: status === 'completed' ? new Date().toISOString() : null,
                  }
                : task,
            ),
          );
        } else {
          const task = await api<Task>(`/tasks/${id}`, token, {
            method: 'PATCH',
            body: { status },
          });
          if (currentToken.current === token)
            setTasks((items) => items.map((item) => (item.id === id ? task : item)));
        }
      },
      status === 'completed' ? 'Задача завершена. Отличная работа!' : undefined,
    );

  const deleteTask = (id: string) =>
    run(
      'task-delete',
      async () => {
        if (!demo) await api<void>(`/tasks/${id}`, token, { method: 'DELETE' });
        if (currentToken.current === token) {
          setTasks((items) => items.filter((task) => task.id !== id));
          if (demo) {
            setRecords((items) =>
              items.map((record) => (record.taskId === id ? { ...record, taskId: null } : record)),
            );
            if (demoRun.current?.taskId === id) demoRun.current.taskId = null;
          }
        }
      },
      'Задача удалена. История сохранена.',
    );

  const createRoom = (name: string, maxMembers: number) =>
    run(
      'room',
      async () => {
        if (demo) {
          const next = { ...demoRoom(), id: crypto.randomUUID(), name, maxMembers };
          setRoom(next);
          setMembers(demoMembers());
          setTimer(idleTimer(next.id));
        } else {
          await api<Room>('/rooms', token, {
            method: 'POST',
            body: { name, maxMembers },
          });
          if (currentToken.current === token) requestMembership();
        }
      },
      'Комната создана. Пригласите тех, с кем хотите поработать.',
    );

  const joinRoom = (inviteCode: string) =>
    run(
      'room',
      async () => {
        if (demo)
          throw new Error(
            'Для входа в общую комнату нужен аккаунт. Демо-комната работает только в этом браузере.',
          );
        await api<Room>('/rooms/join', token, {
          method: 'POST',
          body: { inviteCode },
        });
        if (currentToken.current === token) requestMembership();
      },
      'Вы присоединились к комнате.',
    );

  const leaveRoom = () =>
    run(
      'room',
      async () => {
        if (!demo) await api<void>('/rooms/leave', token, { method: 'POST' });
        else finishDemo('cancelled', timer);
        if (currentToken.current === token) {
          if (demo) {
            setRoom(null);
            setMembers([]);
            setTimer(null);
          } else requestMembership();
          refresh();
        }
      },
      'Вы вышли из комнаты.',
    );

  const transferOwner = (userId: string) =>
    run(
      'room',
      async () => {
        if (!room || demo) return;
        await api<Room>(`/rooms/${room.id}/owner`, token, {
          method: 'PATCH',
          body: { newOwnerId: userId },
        });
        if (currentToken.current === token) requestMembership();
      },
      'Права владельца переданы.',
    );

  function finishDemo(status: 'completed' | 'cancelled', state: Pomodoro | null) {
    const selected = demoRun.current;
    if (!selected || state?.phase !== 'focus') return;
    demoRun.current = null;
    const now = new Date().toISOString();
    const focusedSeconds =
      status === 'completed'
        ? selected.planned
        : Math.floor(Math.max(0, selected.planned - remaining(state, 0)));
    setRecords((items) => [
      {
        id: crypto.randomUUID(),
        userId: demoUser.id,
        taskId: selected.taskId,
        taskTitle: selected.taskTitle,
        roomId: state.roomId,
        roomName: room?.name ?? null,
        pomodoroSessionId: selected.id,
        status,
        plannedDurationSeconds: selected.planned,
        focusedSeconds,
        startedAt: selected.start,
        endedAt: now,
        createdAt: now,
      },
      ...items,
    ]);
  }

  const command = (action: Command) =>
    run('timer', async () => {
      if (!room) throw new Error('Сначала создайте комнату или присоединитесь по коду.');
      if (!demo) {
        const client = socket.current;
        if (!client?.connected || connection !== 'connected')
          throw new Error('Соединение с комнатой прервано. Дождитесь подключения.');
        const timerRevision = timerEventRevision.current;
        const value = await new Promise<Pomodoro>((resolve, reject) => {
          const onException = (error: RealtimeError) => {
            cleanup();
            reject(socketError(error));
          };
          const cleanup = () => client.off('exception', onException);
          client.once('exception', onException);
          client
            .timeout(8000)
            .emit(
              `pomodoro:${action}`,
              { roomId: room.id },
              (error: Error | null, next: Pomodoro | undefined) => {
                cleanup();
                if (error || !next?.status)
                  reject(
                    new Error(
                      'Сервер не подтвердил действие. Состояние обновится после подключения.',
                    ),
                  );
                else resolve(next);
              },
            );
        });
        if (
          currentToken.current === token &&
          socket.current === client &&
          client.connected &&
          currentRoomId.current === room.id &&
          timerEventRevision.current === timerRevision
        )
          acceptTimer(value);
        return;
      }
      const state = timer ?? idleTimer(room.id);
      const now = new Date().toISOString();
      if (action === 'start' && state.status === 'idle') {
        const activeTask = tasks.find((task) => task.status === 'in_progress');
        const id = crypto.randomUUID();
        demoRun.current = {
          id,
          start: now,
          taskId: activeTask?.id ?? null,
          taskTitle: activeTask?.title ?? null,
          planned: 1500,
        };
        setTimer({
          ...state,
          pomodoroSessionId: id,
          status: 'running',
          phase: 'focus',
          durationSeconds: 1500,
          startedAt: now,
          endsAt: new Date(Date.now() + 1500_000).toISOString(),
          remainingSeconds: null,
          serverTime: now,
        });
      } else if (action === 'pause' && state.status === 'running') {
        setTimer({
          ...state,
          status: 'paused',
          remainingSeconds: remaining(state, 0),
          endsAt: null,
          startedAt: null,
          pausedAt: now,
          serverTime: now,
        });
      } else if (action === 'resume' && state.status === 'paused') {
        setTimer({
          ...state,
          status: 'running',
          endsAt: new Date(Date.now() + (state.remainingSeconds ?? 0) * 1000).toISOString(),
          startedAt: now,
          remainingSeconds: null,
          pausedAt: null,
          serverTime: now,
        });
      } else if (action === 'cancel') {
        finishDemo('cancelled', state);
        setTimer(idleTimer(room.id));
      }
    });

  useEffect(() => {
    if (!demo || timer?.status !== 'running') return;
    const interval = window.setInterval(() => {
      if (remaining(timer, 0) > 0) return;
      if (timer.phase === 'focus') {
        finishDemo('completed', timer);
        setTimer({
          ...timer,
          status: 'running',
          phase: 'break',
          durationSeconds: 300,
          startedAt: new Date().toISOString(),
          endsAt: new Date(Date.now() + 300_000).toISOString(),
          serverTime: new Date().toISOString(),
        });
        notify('Фокус завершён. Время на небольшой перерыв.');
      } else setTimer(idleTimer(timer.roomId));
    }, 250);
    return () => window.clearInterval(interval);
    // The run snapshot lives in a ref and is consumed exactly once.
  }, [demo, timer, notify]);

  const reconnect = () => {
    socket.current?.disconnect().connect();
    refresh();
  };
  return {
    demo,
    user,
    tasks,
    room,
    members,
    timer,
    sessionTask,
    sessionTaskError,
    connection,
    clockOffset,
    today,
    week,
    filter,
    setFilter,
    historyPage,
    historyStats,
    loading,
    historyLoading,
    membershipLoading,
    loadError,
    historyError,
    historyRooms,
    historyRoomsError,
    actionErrors,
    clearActionError,
    pending,
    notices,
    notify,
    dismissNotice,
    refresh,
    reconnect,
    authenticate,
    logout: enterDemo,
    saveTask,
    setTaskStatus,
    deleteTask,
    createRoom,
    joinRoom,
    leaveRoom,
    transferOwner,
    command,
  };
}
export type Workspace = ReturnType<typeof useWorkspace>;
