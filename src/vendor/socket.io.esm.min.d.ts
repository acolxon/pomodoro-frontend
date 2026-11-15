import type { Pomodoro, Snapshot, RealtimeError, RoomUpdated, RoomRemoved } from '../lib/types';
interface ServerEvents {
  'realtime:ready': () => void;
  'room:snapshot': (snapshot: Snapshot) => void;
  'room:updated': (event: RoomUpdated) => void;
  'room:removed': (event: RoomRemoved) => void;
  'pomodoro:state': (state: Pomodoro) => void;
  disconnect: () => void;
  connect_error: () => void;
  'realtime:error': (error: RealtimeError) => void;
  exception: (error: RealtimeError) => void;
}
/** Minimal declaration for the official Socket.IO browser bundle shipped alongside this file. */
export interface Socket {
  connected: boolean;
  io: { on(event: 'reconnect_attempt', listener: () => void): void };
  on<Event extends keyof ServerEvents>(event: Event, listener: ServerEvents[Event]): this;
  once<Event extends keyof ServerEvents>(event: Event, listener: ServerEvents[Event]): this;
  off<Event extends keyof ServerEvents>(event: Event, listener: ServerEvents[Event]): this;
  timeout(milliseconds: number): this;
  emit<T>(
    event: string,
    payload: { roomId: string; ready?: boolean },
    callback: (error: Error | null, value?: T) => void,
  ): this;
  connect(): this;
  disconnect(): this;
  removeAllListeners(): this;
}
export function io(
  url: string,
  options: { auth: { token: string }; autoConnect: boolean; reconnection: boolean },
): Socket;
