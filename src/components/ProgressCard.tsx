import type { User } from '../lib/types';
import { Icon } from './Icon';
import { PixelAvatar } from './PixelAvatar';

export function ProgressCard({
  user,
  demo,
  loading,
}: {
  user: User;
  demo: boolean;
  loading: boolean;
}) {
  const progress = user.progression;
  if (demo)
    return (
      <section className="card progress-preview" aria-label="Игровой прогресс">
        <span className="progress-emblem">
          <Icon name="leaf" size={26} />
        </span>
        <div>
          <h2>Твой фокус помогает тебе расти</h2>
          <p>Войди и завершай Focus, чтобы получать опыт, повышать уровень и копить монеты.</p>
        </div>
      </section>
    );
  if (!progress)
    return (
      <section className="card progress-preview" aria-label="Игровой прогресс">
        <Icon name="info" />
        <p>Прогресс пока недоступен. Попробуйте обновить страницу чуть позже.</p>
      </section>
    );
  return (
    <section className="card player-progress" aria-label="Игровой прогресс" aria-busy={loading}>
      <div className="player-identity">
        <PixelAvatar name={user.username} />
        <div>
          <span className="eyebrow">ТВОЙ ПУТЬ</span>
          <h2>{user.username}</h2>
          <span className="level-tag">Уровень {progress.level}</span>
        </div>
      </div>
      <div className="player-experience">
        <div className="xp-label">
          <strong>
            <Icon name="leaf" size={16} /> Опыт
          </strong>
          <span>
            {progress.xpInLevel} / {progress.xpRequiredForLevel} XP
          </span>
        </div>
        <div
          className="xp-track"
          role="progressbar"
          aria-label={`До уровня ${progress.level + 1}`}
          aria-valuemin={0}
          aria-valuemax={progress.xpRequiredForLevel}
          aria-valuenow={progress.xpInLevel}
          aria-valuetext={`${progress.xpToNextLevel} XP до следующего уровня`}
        >
          <span style={{ width: `${progress.progressPercent}%` }} />
        </div>
        <div className="xp-caption">
          <span>
            Ещё {progress.xpToNextLevel} XP до уровня {progress.level + 1}
          </span>
          <span>Всего {user.stats.xp} XP</span>
        </div>
      </div>
      <div className="player-wallet">
        <span className="pixel-coin" aria-hidden="true" />
        <div>
          <strong>{user.stats.coins}</strong>
          <span>монет</span>
        </div>
      </div>
      <div className="player-milestones">
        <span>
          <strong>{user.stats.sessionsCompleted}</strong> завершённых Focus
        </span>
        <span>
          <strong>{user.stats.activeDays}</strong> дней активности
        </span>
      </div>
      <p className="progress-reward-rule">
        Полный Focus: +{progress.focusXp} XP и +{progress.focusCoins} монет. Команда из 2+ человек:
        +{progress.teamBonusPercent}%, если все дошли до конца.
      </p>
    </section>
  );
}
