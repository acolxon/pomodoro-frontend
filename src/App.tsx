import { useEffect, useState } from 'react';
import { useWorkspace } from './hooks/useWorkspace';
import type { Page, Task } from './lib/types';
import { duration, initials } from './lib/utils';
import { AuthModal } from './components/AuthModal';
import { History } from './components/History';
import { Icon, TomatoMark, type IconName } from './components/Icon';
import { ConfirmModal } from './components/Modal';
import { RoomModal } from './components/RoomModal';
import { TaskEditor } from './components/TaskEditor';
import { TaskList } from './components/TaskList';
import { Timer } from './components/Timer';

const navigation: { page: Page; icon: IconName; label: string }[] = [
  { page: 'focus', icon: 'focus', label: 'Мой фокус' },
  { page: 'tasks', icon: 'tasks', label: 'Задачи' },
  { page: 'history', icon: 'history', label: 'История' },
];
function initialPage(): Page {
  const page = window.location.hash.slice(1);
  return page === 'tasks' || page === 'history' ? page : 'focus';
}

export default function App() {
  const workspace = useWorkspace();
  const [page, setPage] = useState<Page>(initialPage);
  const [authOpen, setAuthOpen] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);
  const [taskEditor, setTaskEditor] = useState<Task | 'new' | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const { user, room, demo, tasks, today, week, notices } = workspace;
  const openTasks = tasks.filter((task) => task.status !== 'completed').length;
  const completedTasks = tasks.filter((task) => task.status === 'completed').length;
  const weekSeconds = week.reduce((sum, day) => sum + day.seconds, 0);
  const date = new Date().toLocaleDateString('ru', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const greeting =
    new Date().getHours() < 12
      ? 'Доброе утро'
      : new Date().getHours() < 18
        ? 'Хорошего дня'
        : 'Добрый вечер';
  useEffect(() => {
    const change = () => setPage(initialPage());
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => {
    if (!notices.length) return;
    const timeout = window.setTimeout(
      () => workspace.dismissNotice(notices[0].id),
      notices[0].kind === 'error' ? 9000 : 5000,
    );
    return () => window.clearTimeout(timeout);
  }, [notices, workspace.dismissNotice]);
  const navigate = (next: Page) => {
    window.location.hash = next;
    setPage(next);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const openAuth = () => {
    setRoomOpen(false);
    setAuthOpen(true);
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Перейти к содержимому
      </a>
      {mobileOpen && (
        <button
          className="sidebar-scrim"
          onClick={() => setMobileOpen(false)}
          aria-label="Закрыть навигацию"
        />
      )}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`} aria-label="Главная навигация">
        <a className="brand" href="#focus" onClick={() => setMobileOpen(false)}>
          <span>
            <TomatoMark size={34} />
          </span>
          <strong>
            tomato<span>.</span>
          </strong>
        </a>
        <div className="sidebar-label">ТВОЁ ПРОСТРАНСТВО</div>
        <nav>
          {navigation.map((item) => (
            <a
              key={item.page}
              href={`#${item.page}`}
              aria-current={page === item.page ? 'page' : undefined}
              className={`nav-item ${page === item.page ? 'active' : ''}`}
              onClick={(event) => {
                event.preventDefault();
                navigate(item.page);
              }}
            >
              <Icon name={item.icon} size={20} />
              <span>{item.label}</span>
              {item.page === 'tasks' && openTasks > 0 && (
                <span className="nav-count">{openTasks}</span>
              )}
              {page === item.page && item.page !== 'tasks' && <span className="nav-dot" />}
            </a>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <div className="sidebar-label">РАБОТАТЬ ВМЕСТЕ</div>
        <button
          className="nav-item room-navigation"
          onClick={() => {
            setRoomOpen(true);
            setMobileOpen(false);
          }}
        >
          <Icon name="users" size={20} />
          <span>{room ? 'Моя комната' : 'Найти компанию'}</span>
          <Icon name="plus" size={16} />
        </button>
        {room && (
          <button
            className="sidebar-room"
            onClick={() => {
              setRoomOpen(true);
              setMobileOpen(false);
            }}
          >
            <span className="room-indicator" />
            <span>{room.name}</span>
            <Icon name="chevron" size={14} />
          </button>
        )}
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <div className="note-sprout">
              <Icon name="leaf" size={25} />
              <span>✦</span>
            </div>
            <p>
              Расти в своём
              <br />
              темпе.
            </p>
            <span>
              Каждая сессия —<br />
              шаг к чему-то большему.
            </span>
          </div>
          <div className="sidebar-profile">
            <span className="avatar profile-avatar">{initials(user?.username || 'Т')}</span>
            <div>
              <strong>{user?.username || 'Твоё пространство'}</strong>
              <span>{demo ? 'Демо-пространство' : 'Личное пространство'}</span>
            </div>
            <button
              className="icon-button"
              aria-label={demo ? 'Войти в аккаунт' : 'Выйти из аккаунта'}
              title={demo ? 'Войти в аккаунт' : 'Выйти из аккаунта'}
              onClick={() => (demo ? setAuthOpen(true) : setLogoutOpen(true))}
            >
              <Icon name={demo ? 'arrow' : 'logout'} size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              aria-label="Открыть навигацию"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <Icon name="menu" />
            </button>
            <span className="breadcrumb">
              Твоё пространство <span>/</span>{' '}
              <strong>{navigation.find((item) => item.page === page)?.label}</strong>
            </span>
          </div>
          <div className="topbar-right">
            <span className="topbar-date">
              <Icon name="sun" size={17} />
              {date}
            </span>
            {demo ? (
              <button
                className="button small secondary login-button"
                onClick={() => setAuthOpen(true)}
              >
                Войти
                <Icon name="arrow" size={15} />
              </button>
            ) : (
              <span className="account-state">
                <span className="tiny-dot" />
                Аккаунт подключён
              </span>
            )}
          </div>
        </header>
        <main id="main-content" className="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow greeting">
                {page === 'focus'
                  ? `${greeting}, ${user?.username || 'друг'}`
                  : page === 'tasks'
                    ? 'МЕНЬШЕ ШУМА, БОЛЬШЕ ЯСНОСТИ'
                    : 'КАЖДЫЙ ШАГ СЧИТАЕТСЯ'}
              </div>
              <h1>
                {page === 'focus' ? (
                  <>
                    Время для <em>важного.</em>
                  </>
                ) : page === 'tasks' ? (
                  <>
                    От идеи — <em>к действию.</em>
                  </>
                ) : (
                  <>
                    Твой фокус <em>в деталях.</em>
                  </>
                )}
              </h1>
              <p>
                {page === 'focus'
                  ? 'Освободи немного места для того, что действительно хочется сделать.'
                  : page === 'tasks'
                    ? 'Собери мысли, выбери одну задачу и начни с небольшого шага.'
                    : 'Замечай свой прогресс. Он складывается из маленьких сессий.'}
              </p>
            </div>
            <span className="heading-doodle" aria-hidden="true">
              {page === 'focus' ? (
                <Icon name="sun" size={54} />
              ) : page === 'tasks' ? (
                <Icon name="leaf" size={50} />
              ) : (
                <Icon name="history" size={50} />
              )}
            </span>
          </div>
          {demo && (
            <div className="demo-banner">
              <span className="demo-tag">ДЕМО</span>
              <p>
                Попробуй свой ритм. <span>Войди, чтобы сохранять прогресс и работать вместе.</span>
              </p>
              <button onClick={() => setAuthOpen(true)} className="text-button">
                Создать аккаунт
                <Icon name="arrow" size={15} />
              </button>
            </div>
          )}
          {workspace.loadError && !demo && (
            <div className="error-banner" role="alert">
              <Icon name="info" size={20} />
              <p>{workspace.loadError}</p>
              <button className="text-button" onClick={workspace.refresh}>
                Повторить
                <Icon name="refresh" size={15} />
              </button>
            </div>
          )}
          {workspace.loading && !user ? (
            <div className="card workspace-loading" role="status">
              <span className="loading-spinner" />
              <h2>Открываем твоё пространство…</h2>
              <p>Загружаем задачи и проверяем аккаунт.</p>
            </div>
          ) : (
            <>
              {page === 'focus' && (
                <>
                  <div className="daily-stats">
                    <div>
                      <span className="stat-icon peach">
                        <Icon name="focus" size={19} />
                      </span>
                      <div>
                        <strong>
                          {today.completedSessions}
                          <small> сессий</small>
                        </strong>
                        <span>завершено сегодня</span>
                      </div>
                    </div>
                    <span className="stat-divider" />
                    <div>
                      <span className="stat-icon green">
                        <Icon name="clock" size={19} />
                      </span>
                      <div>
                        <strong>{duration(today.totalFocusedSeconds)}</strong>
                        <span>сегодня в фокусе</span>
                      </div>
                    </div>
                    <span className="stat-divider" />
                    <div>
                      <span className="stat-icon sand">
                        <Icon name="check" size={19} />
                      </span>
                      <div>
                        <strong>
                          {completedTasks}
                          <small> задач</small>
                        </strong>
                        <span>уже в списке «Готово»</span>
                      </div>
                    </div>
                    <span className="stats-motto">
                      <Icon name="leaf" size={16} />
                      Твой темп — правильный
                    </span>
                  </div>
                  <div className="focus-layout">
                    <div className="focus-main">
                      <Timer workspace={workspace} onRoom={() => setRoomOpen(true)} />
                      <section className="card week-card">
                        <div className="card-heading">
                          <div>
                            <div className="eyebrow">ПРОГРЕСС БЕЗ СПЕШКИ</div>
                            <h2>Неделя в фокусе</h2>
                          </div>
                          <span className="week-total">
                            {duration(weekSeconds)}
                            <small>за 7 дней</small>
                          </span>
                        </div>
                        <div
                          className="week-chart"
                          role="img"
                          aria-label={`Время фокуса за семь дней: ${week.map((day) => `${new Date(day.date).toLocaleDateString('ru', { weekday: 'short' })} ${duration(day.seconds)}`).join(', ')}`}
                        >
                          {week.map((day, index) => (
                            <div
                              className={`chart-column ${index === 6 ? 'today' : ''}`}
                              key={day.date}
                            >
                              <div className="bar-track">
                                <div
                                  className="chart-bar"
                                  style={{
                                    height: `${day.seconds ? Math.max(6, (day.seconds / Math.max(4500, ...week.map((item) => item.seconds))) * 100) : 3}%`,
                                  }}
                                >
                                  <span>{duration(day.seconds)}</span>
                                </div>
                              </div>
                              <span className="chart-label">
                                {new Date(day.date).toLocaleDateString('ru', { weekday: 'short' })}
                              </span>
                              {index === 6 && <span className="chart-today-dot" />}
                            </div>
                          ))}
                        </div>
                        <div className="chart-foot">
                          <span>
                            <i />
                            Время фокуса
                          </span>
                          <button className="text-button" onClick={() => navigate('history')}>
                            Вся история
                            <Icon name="arrow" size={14} />
                          </button>
                        </div>
                      </section>
                    </div>
                    <div className="focus-aside">
                      <TaskList
                        workspace={workspace}
                        compact
                        onAdd={() => setTaskEditor('new')}
                        onEdit={setTaskEditor}
                        onDelete={setDeleteTask}
                      />
                      <section className="card room-card">
                        <div className="card-heading">
                          <span className="room-symbol">
                            <Icon name="users" size={21} />
                          </span>
                          <span
                            className={`connection-state ${workspace.connection === 'connected' || demo ? 'online' : ''}`}
                          >
                            <span className="tiny-dot" />
                            {!room
                              ? 'Не в комнате'
                              : demo
                                ? 'Демо'
                                : workspace.connection === 'connected'
                                  ? 'Подключено'
                                  : workspace.connection === 'connecting'
                                    ? 'Подключаемся'
                                    : 'Нет связи'}
                          </span>
                        </div>
                        <h2>{room?.name || 'Вместе — в одном ритме'}</h2>
                        <p>
                          {room
                            ? demo
                              ? 'Пространство без лишнего шума. Здесь можно просто начать.'
                              : 'Общий таймер, свой фокус. Работайте рядом, даже на расстоянии.'
                            : 'Пригласи друзей или создай тихую комнату только для себя.'}
                        </p>
                        <div className="room-card-bottom">
                          <div className="avatar-group">
                            {workspace.members.slice(0, 4).map((member, index) => (
                              <span
                                className={`avatar color-${index % 4}`}
                                key={member.userId}
                                title={member.username}
                              >
                                {initials(member.username)}
                              </span>
                            ))}
                            {room && (
                              <span className="room-capacity">
                                {workspace.members.length}/{room.maxMembers}
                              </span>
                            )}
                          </div>
                          <button className="text-button" onClick={() => setRoomOpen(true)}>
                            {room ? 'В комнату' : 'Создать'}
                            <Icon name="arrow" size={16} />
                          </button>
                        </div>
                      </section>
                      <div className="gentle-note">
                        <span className="gentle-star">✳</span>
                        <p>
                          Не обязательно успеть всё.
                          <br />
                          <strong>Достаточно начать с одного.</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {page === 'tasks' && (
                <>
                  <div className="task-summary-note">
                    <span className="stat-icon green">
                      <Icon name="leaf" size={20} />
                    </span>
                    <p>
                      В фокусе может быть одна задача.{' '}
                      <span>
                        Нажми <Icon name="play" size={12} /> рядом с ней — она привяжется к
                        следующей сессии.
                      </span>
                    </p>
                  </div>
                  <TaskList
                    workspace={workspace}
                    onAdd={() => setTaskEditor('new')}
                    onEdit={setTaskEditor}
                    onDelete={setDeleteTask}
                  />
                </>
              )}
              {page === 'history' && <History workspace={workspace} />}
            </>
          )}
          <footer className="page-footer">
            <span>Маленькие шаги. Большие перемены.</span>
            <span>
              Сделано для спокойной работы <Icon name="leaf" size={13} />
            </span>
          </footer>
        </main>
      </div>
      <div className="toast-container" aria-live="polite" aria-relevant="additions">
        {notices.map((notice) => (
          <div
            className={`toast ${notice.kind}`}
            key={notice.id}
            role={notice.kind === 'error' ? 'alert' : 'status'}
          >
            <Icon name={notice.kind === 'error' ? 'info' : 'check'} size={19} />
            <span>{notice.message}</span>
            <button
              className="icon-button"
              onClick={() => workspace.dismissNotice(notice.id)}
              aria-label="Закрыть уведомление"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        ))}
      </div>
      {authOpen && <AuthModal workspace={workspace} onClose={() => setAuthOpen(false)} />}
      {roomOpen && (
        <RoomModal workspace={workspace} onClose={() => setRoomOpen(false)} onAuth={openAuth} />
      )}
      {taskEditor && (
        <TaskEditor
          task={taskEditor === 'new' ? null : taskEditor}
          workspace={workspace}
          onClose={() => setTaskEditor(null)}
        />
      )}
      {deleteTask && (
        <ConfirmModal
          title="Удалить задачу?"
          description={`«${deleteTask.title}» исчезнет из списка. Название и результаты прошлых сессий сохранятся в истории.`}
          label="Удалить задачу"
          busy={workspace.pending.includes('task-delete')}
          error={workspace.actionErrors['task-delete']}
          onClose={() => setDeleteTask(null)}
          onConfirm={async () => {
            if (await workspace.deleteTask(deleteTask.id)) setDeleteTask(null);
          }}
        />
      )}
      {logoutOpen && (
        <ConfirmModal
          title="Выйти из аккаунта?"
          description="Твои задачи и история сохранятся на сервере. Если общий таймер запущен, он продолжит работать в комнате."
          label="Выйти"
          busy={false}
          onClose={() => setLogoutOpen(false)}
          onConfirm={() => {
            workspace.logout();
            setLogoutOpen(false);
          }}
        />
      )}
    </div>
  );
}
