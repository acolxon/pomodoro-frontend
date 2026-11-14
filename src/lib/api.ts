const baseUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const messages: Record<string, string> = {
  INVALID_CREDENTIALS: 'Неверный логин или пароль.',
  EMAIL_TAKEN: 'Этот email уже зарегистрирован.',
  USERNAME_TAKEN: 'Это имя уже занято.',
  UNAUTHORIZED: 'Сессия завершилась. Войдите ещё раз.',
  ACTIVE_TASK_EXISTS: 'Сначала завершите или отложите текущую активную задачу.',
  TASK_NOT_FOUND: 'Задача уже удалена. Обновите список.',
  ROOM_NOT_FOUND: 'Комната больше не существует.',
  NOT_IN_ROOM: 'Вы больше не участник этой комнаты.',
  ROOM_FULL: 'В комнате закончились свободные места.',
  ROOM_CLOSED: 'Эта комната уже закрыта.',
  INVALID_INVITE_CODE: 'Комната с таким кодом не найдена.',
  ALREADY_IN_ROOM: 'Вы уже состоите в комнате. Сначала выйдите из неё.',
  NOT_ROOM_OWNER: 'Это действие доступно только владельцу комнаты.',
  HISTORY_NOT_FOUND: 'Запись не найдена.',
};
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  token: string | null,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  let response: Response;
  const timeout = AbortSignal.timeout(15_000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: options.method || 'GET',
      signal,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    if (timeout.aborted)
      throw new ApiError(0, 'NETWORK_ERROR', 'Сервер отвечает слишком долго. Попробуйте ещё раз.');
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Не удалось связаться с сервером. Проверьте подключение и запуск backend.',
    );
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const code = payload.code || 'HTTP_ERROR';
    const message =
      messages[code] ||
      (code === 'VALIDATION_ERROR'
        ? 'Проверьте заполненные поля.'
        : response.status >= 500
          ? 'Сервер временно недоступен. Попробуйте ещё раз.'
          : typeof payload.message === 'string'
            ? payload.message
            : 'Не удалось выполнить действие.');
    if (response.status === 401 && token)
      window.dispatchEvent(new CustomEvent('tomato:unauthorized', { detail: { token } }));
    throw new ApiError(response.status, code, message);
  }
  if (response.status === 204) return undefined as T;
  try {
    return await response.json();
  } catch {
    throw new ApiError(
      502,
      'INVALID_RESPONSE',
      'Сервер вернул неполный ответ. Попробуйте обновить страницу.',
    );
  }
}
export function socketUrl(): string {
  const configured = import.meta.env.VITE_SOCKET_URL;
  if (configured) return configured;
  if (baseUrl.startsWith('http')) return new URL(baseUrl).origin;
  return window.location.origin;
}
