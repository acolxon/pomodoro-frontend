export type Page = 'focus' | 'tasks' | 'history';
export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}
export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
  stats: {
    xp: number;
    level: number;
    coins: number;
    sessionsCompleted: number;
    collabSessionsCompleted: number;
    activeDays: number;
  };
  settings: { allowPranks: boolean; timezone: string };
}
export interface AuthResponse {
  accessToken: string;
  user: User;
  expiresIn: number;
}
export interface Room {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  maxMembers: number;
  membersCount: number;
  status: 'open' | 'closed';
  createdAt: string;
  updatedAt: string;
}
export interface Member {
  userId: string;
  username: string;
  avatarUrl: string | null;
  level: number;
  role: 'owner' | 'member';
  joinedAt: string;
}
export interface Pomodoro {
  roomId: string;
  pomodoroSessionId: string | null;
  status: 'idle' | 'running' | 'paused';
  phase: 'focus' | 'break' | null;
  durationSeconds: number;
  startedAt: string | null;
  endsAt: string | null;
  pausedAt: string | null;
  remainingSeconds: number | null;
  serverTime: string;
}
export type Command = 'start' | 'pause' | 'resume' | 'cancel';
export interface Snapshot {
  room: Room;
  members: Member[];
  pomodoro: Pomodoro;
  serverTime: string;
}
export interface HistoryRecord {
  id: string;
  userId: string;
  taskId: string | null;
  taskTitle: string | null;
  roomId: string | null;
  pomodoroSessionId: string;
  status: 'completed' | 'cancelled';
  plannedDurationSeconds: number;
  focusedSeconds: number;
  startedAt: string;
  endedAt: string;
  createdAt: string;
}
export interface HistoryStats {
  totalSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  totalFocusedSeconds: number;
  totalFocusedMinutes: number;
  averageFocusedSeconds: number;
}
export interface HistoryPage {
  items: HistoryRecord[];
  total: number;
}
export interface HistoryFilter {
  period: 'all' | 'today' | 'week' | 'month';
  status: '' | 'completed' | 'cancelled';
  offset: number;
}
export interface Notice {
  id: number;
  kind: 'success' | 'error';
  message: string;
}
export const HISTORY_LIMIT = 8;
