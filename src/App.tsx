import { useEffect, useState } from 'react';
import { useWorkspace } from './hooks/useWorkspace';
import type { Page, Task } from './lib/types';
import { duration, inviteCodeFromSearch } from './lib/utils';
import { AuthModal } from './components/AuthModal';
import { History } from './components/History';
import { Icon, TomatoMark, type IconName } from './components/Icon';
import { ConfirmModal } from './components/Modal';
import { RoomModal } from './components/RoomModal';
import { TaskEditor } from './components/TaskEditor';
import { TaskList } from './components/TaskList';
import { Timer } from './components/Timer';
import { Village } from './components/Village';
import { ActivityChart } from './components/ActivityChart';
import { ProgressCard } from './components/ProgressCard';
import { SessionPanel } from './components/SessionPanel';
import { PixelAvatar } from './components/PixelAvatar';
import { ShopModal } from './components/ShopModal';

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
  const [inviteCode, setInviteCode] = useState(() =>
    inviteCodeFromSearch(window.location.search || ''),
  );
  const [roomOpen, setRoomOpen] = useState(!!inviteCode);
  const [taskEditor, setTaskEditor] = useState<Task | 'new' | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const { user, room, demo, tasks, today, notices } = workspace;
  const openTasks = tasks.filter((task) => task.status !== 'completed').length;
  const completedTasks = tasks.filter((task) => task.status === 'completed').length;
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
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  };
  const openAuth = () => {
    setRoomOpen(false);
    setAuthOpen(true);
  };
  useEffect(() => {
    if (inviteCode && !authOpen && !demo) setRoomOpen(true);
  }, [inviteCode, authOpen, demo]);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('invite') && !inviteCodeFromSearch(url.search)) {
      workspace.notify('Некорректная ссылка приглашения: нужен код из 8 символов.', 'error');
      url.searchParams.delete('invite');
      window.history.replaceState(window.history.state, '', url);
    }
  }, [workspace.notify]);
  const closeRoom = () => {
    setRoomOpen(false);
    if (inviteCode) {
      setInviteCode(null);
      const url = new URL(window.location.href);
      url.searchParams.delete('invite');
      window.history.replaceState(window.history.state, '', url);
    }
  };
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          const main = document.getElementById('main-content');
          main?.focus();
          main?.scrollIntoView({ block: 'start' });
        }}
      >
        Перейти к содержимому
      </a>
      <header className="topbar">
        <a className="brand" href="#focus" aria-label="Tomato — мой фокус">
          <TomatoMark size={36} />
          <strong>
            tomato<span>.</span>
          </strong>
        </a>
        <nav className="main-navigation" aria-label="Главная навигация">
          {navigation.map((item) => (
            <a
              key={item.page}
              href={`#${item.page}`}
              className={`nav-item ${page === item.page ? 'active' : ''}`}
              aria-current={page === item.page ? 'page' : undefined}
              onClick={(event) => {
                event.preventDefault();
                navigate(item.page);
              }}
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
              {item.page === 'tasks' && openTasks > 0 && (
                <span className="nav-count">{openTasks}</span>
              )}
            </a>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="button secondary small shop-navigation"
            onClick={() => setShopOpen(true)}
          >
            <Icon name="leaf" size={17} />
            <span>Магазин</span>
          </button>
          <button
            className="button secondary small room-navigation"
            aria-label={room ? 'Управление комнатой' : 'Создать комнату или войти по коду'}
            onClick={() => setRoomOpen(true)}
          >
            <Icon name="users" size={17} />
            <span>{room ? 'Моя комната' : 'Комнаты'}</span>
          </button>
          <button
            className="profile-button"
            onClick={() => (demo ? setAuthOpen(true) : setLogoutOpen(true))}
            aria-label={demo ? 'Войти в аккаунт' : 'Выйти из аккаунта'}
          >
            <PixelAvatar name={user?.username || 'Гость'} />
            <span>{demo ? 'Войти' : user?.username || 'Аккаунт'}</span>
            <Icon name={demo ? 'arrow' : 'logout'} size={15} />
          </button>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className={`main-content page-${page}`}>
        {/* <div className="page-heading">
          <div>
            <div className="eyebrow">
              {page === 'focus'
                ? `${greeting}, ${user?.username || 'друг'}`
                : 'ТВОЁ МАЛЕНЬКОЕ ПРИКЛЮЧЕНИЕ'}
            </div>
            <h1>
              {page === 'focus'
                ? 'Каждый фокус — шаг вперёд.'
                : page === 'tasks'
                  ? 'Дела на сегодня и дальше.'
                  : 'История твоего прогресса.'}
            </h1>
            <p>
              {page === 'focus'
                ? 'Устраивайся поудобнее. В деревне начинается новый день.'
                : page === 'tasks'
                  ? 'Выбери одну задачу. Большие дела начинаются с маленьких шагов.'
                  : 'Каждая минута имеет значение. Посмотри, сколько уже сделано.'}
            </p>
          </div>
          <span className="heading-date">
            <Icon name="sun" size={22} />
            {date}
          </span>
        </div> */}
        {demo && (
          <div className="demo-banner">
            <span className="demo-tag">ДЕМО</span>
            <p>
              Это локальная демо-деревня.{' '}
              <span>Войди, чтобы сохранять прогресс и работать вместе.</span>
            </p>
            <button onClick={() => setAuthOpen(true)} className="text-button">
              Создать аккаунт
              <Icon name="arrow" size={15} />
            </button>
          </div>
        )}
        {workspace.loadError && !demo && (
          <div className="error-banner" role="alert">
            <Icon name="info" />
            <p>{workspace.loadError}</p>
            <button className="text-button" onClick={workspace.refresh}>
              Повторить
              <Icon name="refresh" size={15} />
            </button>
          </div>
        )}
        {user && page !== 'focus' && (
          <ProgressCard user={user} demo={demo} loading={workspace.loading} />
        )}
        {workspace.loading && !user ? (
          <div className="card workspace-loading" role="status">
            <span className="loading-spinner" />
            <h2>Открываем твоё пространство…</h2>
            <p>Загружаем задачи и проверяем аккаунт.</p>
          </div>
        ) : (
          <div key={page} className="page-enter">
            {page === 'focus' && (
              <>
                <Village>
                  <SessionPanel workspace={workspace} onRoom={() => setRoomOpen(true)} />
                  <div className="village-welcome">
                    <img
                      src="/art/sign.png"
                      className="village-sign"
                      alt="Добро пожаловать в Tomato"
                    />

                    <p>
                      Тихая деревня.
                      <br />
                      Большие планы.
                    </p>
                  </div>
                  <Timer workspace={workspace} onRoom={() => setRoomOpen(true)} />
                </Village>
                <div className="daily-stats">
                  <div>
                    <Icon name="focus" />
                    <strong>{today.completedSessions}</strong>
                    <span>сессий сегодня</span>
                  </div>
                  <div>
                    <Icon name="clock" />
                    <strong>{duration(today.totalFocusedSeconds)}</strong>
                    <span>в фокусе сегодня</span>
                  </div>
                  <div>
                    <Icon name="check" />
                    <strong>{completedTasks}</strong>
                    <span>задач выполнено</span>
                  </div>
                  <span className="stats-motto">
                    <Icon name="leaf" size={18} />
                    Расти в своём темпе
                  </span>
                </div>
                <div className="focus-panels">
                  <TaskList
                    workspace={workspace}
                    compact
                    onAdd={() => setTaskEditor('new')}
                    onEdit={setTaskEditor}
                    onDelete={setDeleteTask}
                  />
                  <ActivityChart
                    workspace={workspace}
                    compact
                    onHistory={() => navigate('history')}
                  />
                </div>
              </>
            )}
            {page === 'tasks' && (
              <>
                <div className="section-intro">
                  <span>
                    <Icon name="tasks" />
                    Твой журнал заданий
                  </span>
                  <button className="button primary" onClick={() => setTaskEditor('new')}>
                    <Icon name="plus" size={18} />
                    Новая задача
                  </button>
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
          </div>
        )}
        <footer className="page-footer">
          <span>
            <TomatoMark size={18} />
            Маленькие шаги. Большие перемены.
          </span>
          <span>Твоё уютное место для фокуса.</span>
        </footer>
      </main>
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
      {shopOpen && (
        <ShopModal
          workspace={workspace}
          onClose={() => setShopOpen(false)}
          onAuth={() => {
            setShopOpen(false);
            setAuthOpen(true);
          }}
        />
      )}
      {roomOpen && (
        <RoomModal
          workspace={workspace}
          initialInviteCode={inviteCode || undefined}
          onClose={closeRoom}
          onAuth={openAuth}
        />
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
