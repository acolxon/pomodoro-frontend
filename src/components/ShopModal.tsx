import { useEffect, useRef, useState } from 'react';
import type { Workspace } from '../hooks/useWorkspace';
import type { ShopState } from '../lib/types';
import { ApiError } from '../lib/api';
import { errorText } from '../lib/utils';
import { Icon } from './Icon';
import { Modal, useModalTransition } from './Modal';

// Survives closing and reopening the modal when sessionStorage is unavailable.
const pendingPurchases = new Map<string, string>();

export function ShopModal({
  workspace,
  onClose: close,
  onAuth,
}: {
  workspace: Workspace;
  onClose: () => void;
  onAuth: () => void;
}) {
  const { closing, onClose } = useModalTransition(close);
  const [shop, setShop] = useState<ShopState | null>(null);
  const [loading, setLoading] = useState(!workspace.demo);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [hasPending, setHasPending] = useState(false);
  const requestId = useRef<string | null>(null);
  const busy = useRef(false);
  const alive = useRef(true);
  const storageKey = `tomato-shop-purchase-${workspace.user?.id ?? ''}`;

  useEffect(() => {
    alive.current = true;
    try {
      setHasPending(!!sessionStorage.getItem(storageKey) || pendingPurchases.has(storageKey));
    } catch {
      setHasPending(!!requestId.current || pendingPurchases.has(storageKey));
    }
    if (workspace.demo) {
      setLoading(false);
      return () => {
        alive.current = false;
      };
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    workspace
      .getShop()
      .then((value) => {
        if (!cancelled) setShop(value);
      })
      .catch((reason) => {
        if (!cancelled) setError(errorText(reason));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      alive.current = false;
    };
  }, [workspace.demo, workspace.user?.id, attempt]);

  async function buy() {
    if (!shop || busy.current) return;
    busy.current = true;
    setBuying(true);
    setError(null);
    let id = requestId.current;
    try {
      if (!id) {
        try {
          id = sessionStorage.getItem(storageKey) || pendingPurchases.get(storageKey) || null;
        } catch {
          /* in-memory fallback */
        }
        if (!id) id = pendingPurchases.get(storageKey) || null;
        if (!id) id = crypto.randomUUID();
        requestId.current = id;
        pendingPurchases.set(storageKey, id);
        if (alive.current) setHasPending(true);
        try {
          sessionStorage.setItem(storageKey, id);
        } catch {
          /* in-memory fallback */
        }
      }
      const result = await workspace.buyXpBooster(id);
      requestId.current = null;
      pendingPurchases.delete(storageKey);
      if (alive.current) setHasPending(false);
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* optional storage */
      }
      if (alive.current) {
        setShop(result);
        workspace.notify('Усилитель опыта куплен!');
      }
    } catch (reason) {
      // A timeout may have committed on the server. Keep the key for a safe retry.
      if (reason instanceof ApiError && reason.status >= 400 && reason.status < 500) {
        requestId.current = null;
        pendingPurchases.delete(storageKey);
        if (alive.current) setHasPending(false);
        try {
          sessionStorage.removeItem(storageKey);
        } catch {
          /* optional storage */
        }
        if (reason.status === 409) {
          try {
            const current = await workspace.getShop();
            if (alive.current) setShop(current);
          } catch {
            /* keep the original error */
          }
        }
      }
      if (alive.current) setError(errorText(reason));
    } finally {
      busy.current = false;
      if (alive.current) setBuying(false);
    }
  }
  return (
    <Modal
      title="Лавка улучшений"
      subtitle="Маленькие помощники для твоего приключения"
      onClose={onClose}
      closing={closing}
      busy={buying}
      className="shop-modal"
    >
      {workspace.demo ? (
        <div className="shop-empty">
          <p>Войди в аккаунт, чтобы копить монеты и покупать улучшения.</p>
          <button className="button primary" onClick={onAuth}>
            Войти
          </button>
        </div>
      ) : loading ? (
        <div className="table-loading" role="status">
          Открываем лавку…
        </div>
      ) : !shop ? (
        <div className="shop-empty" role="alert">
          <p>{error || 'Не удалось загрузить магазин.'}</p>
          <button className="button secondary" onClick={() => setAttempt((value) => value + 1)}>
            Попробовать ещё
          </button>
        </div>
      ) : (
        <>
          <div className="shop-wallet">
            <span>Твои монеты</span>
            <strong>
              <span className="pixel-coin" aria-hidden="true" /> {shop.coins}
            </strong>
          </div>
          <article className="shop-item">
            <div className="shop-item-art" aria-hidden="true">
              <Icon name="leaf" size={34} />
              <span>XP</span>
            </div>
            <div className="shop-item-details">
              <span className="eyebrow">ОДНОРАЗОВОЕ УЛУЧШЕНИЕ</span>
              <h3>Усилитель опыта</h3>
              <p>
                +{shop.item.bonusPercent}% XP за следующий успешно завершённый Focus. Если выйти
                раньше или отменить сессию, усилитель сохранится.
              </p>
              <span className="shop-inventory">
                В запасе: <strong>{shop.item.quantity}</strong>
              </span>
            </div>
          </article>
          <p className="shop-note">
            Бонус применяется к XP после командного бонуса и округляется вниз. Один усилитель на
            сессию.
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="button primary full shop-buy"
            onClick={() => void buy()}
            disabled={buying || (!hasPending && shop.coins < shop.item.price)}
          >
            {buying
              ? 'Покупаем…'
              : hasPending
                ? 'Проверить покупку'
                : shop.coins < shop.item.price
                  ? `Нужно ${shop.item.price} монет`
                  : `Купить за ${shop.item.price} монет`}
          </button>
        </>
      )}
    </Modal>
  );
}
