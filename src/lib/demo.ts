import type { HistoryRecord, Member, Room, Task, User } from './types';
export const demoUser: User = {
  id: 'demo-user',
  username: 'Алекс',
  email: 'alex@example.com',
  avatarUrl: null,
  createdAt: new Date().toISOString(),
  stats: {
    xp: 0,
    level: 1,
    coins: 0,
    sessionsCompleted: 0,
    collabSessionsCompleted: 0,
    activeDays: 0,
  },
  settings: { allowPranks: true, timezone: 'Asia/Almaty' },
};
export function demoRoom(): Room {
  return {
    id: 'demo-room',
    name: 'Тихая комната',
    ownerId: demoUser.id,
    inviteCode: 'TOMATO25',
    maxMembers: 6,
    membersCount: 1,
    status: 'open',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
export function demoMembers(): Member[] {
  return [
    {
      userId: demoUser.id,
      username: demoUser.username,
      avatarUrl: null,
      level: 1,
      role: 'owner',
      ready: false,
      sessionStatus: 'waiting',
      joinedAt: new Date().toISOString(),
    },
  ];
}
export function demoTasks(): Task[] {
  return [
    {
      id: 'demo-task-1',
      title: 'Сделать шаг к большому проекту',
      description: 'Выбрать одну небольшую задачу и уделить ей 25 минут.',
      status: 'in_progress' as const,
    },
    {
      id: 'demo-task-2',
      title: 'Прочитать главу книги',
      description: null,
      status: 'todo' as const,
    },
    {
      id: 'demo-task-3',
      title: 'Разобрать заметки и идеи',
      description: null,
      status: 'todo' as const,
    },
    {
      id: 'demo-task-4',
      title: 'Составить план на день',
      description: null,
      status: 'completed' as const,
    },
  ].map((task, index) => ({
    ...task,
    userId: demoUser.id,
    createdAt: new Date(Date.now() - (4 - index) * 60_000).toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: task.status === 'completed' ? new Date().toISOString() : null,
  }));
}
export function demoHistory(): HistoryRecord[] {
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(index / 3));
    date.setHours(9 + (2 - (index % 3)), 0, 0, 0);
    // Keep every sample session in the past, including early-morning visits.
    const started = Math.min(date.getTime(), Date.now() - (index + 1) * 35 * 60_000);
    const focusedSeconds = index === 4 || index === 9 ? 720 : 1500;
    return {
      id: `demo-history-${index}`,
      userId: demoUser.id,
      taskId: null,
      taskTitle: [
        'Сделать шаг к большому проекту',
        'Прочитать главу книги',
        'Разобрать заметки и идеи',
      ][index % 3],
      roomId: 'demo-room',
      roomName: 'Тихая комната',
      pomodoroSessionId: `demo-run-${index}`,
      status: focusedSeconds === 1500 ? 'completed' : 'cancelled',
      plannedDurationSeconds: 1500,
      focusedSeconds,
      startedAt: new Date(started).toISOString(),
      endedAt: new Date(started + focusedSeconds * 1000).toISOString(),
      createdAt: new Date(started + focusedSeconds * 1000).toISOString(),
    };
  });
}
