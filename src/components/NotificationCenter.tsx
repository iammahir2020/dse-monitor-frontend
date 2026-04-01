import { useEffect, useState } from 'react';
import {
  deleteAllNotifications,
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
  type NotificationStatus,
} from '../services/api';

const formatNotificationType = (type: NotificationItem['type']) =>
  type.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());

const getNotificationDetail = (notification: NotificationItem) => {
  const payload = notification.payload || {};

  if (notification.type === 'order_book_pressure') {
    const ratio = typeof payload.buyPressureRatio === 'number' ? payload.buyPressureRatio.toFixed(2) : null;
    return ratio ? `Buy pressure ratio ${ratio}` : 'Order-book pressure update';
  }

  if (notification.type === 'signal_pulse') {
    const signalKind = typeof payload.signal === 'string' ? payload.signal.replace(/_/g, ' ') : null;
    return signalKind ? `Signal ${signalKind}` : 'Signal pulse update';
  }

  if (notification.type === 'relative_volume_trade') {
    const multiple = typeof payload.relativeVolumeMultiplier === 'number' ? payload.relativeVolumeMultiplier.toFixed(2) : null;
    return multiple ? `${multiple}x recent average volume` : 'Relative volume spike';
  }

  if (notification.type === 'high_volume_trade') {
    const currentVolume = typeof payload.currentVolume === 'number' ? payload.currentVolume.toLocaleString() : null;
    return currentVolume ? `Current volume ${currentVolume}` : 'High volume trade detected';
  }

  if (notification.type === 'entry_signal') {
    const recommendation = typeof payload.recommendation === 'string' ? payload.recommendation.replace(/_/g, ' ') : null;
    return recommendation ? `Recommendation ${recommendation}` : 'Entry signal available';
  }

  return null;
};

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [status, setStatus] = useState<NotificationStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async (selectedStatus: NotificationStatus | 'all') => {
    setLoading(true);
    setError(null);

    try {
      const response = await getNotifications({
        status: selectedStatus === 'all' ? undefined : selectedStatus,
        page: 1,
        limit: 50,
      });
      setNotifications(response.data);
    } catch {
      setError('Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchNotifications(status);
  }, [status]);

  const handleReadOne = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((items) =>
        items.map((item) => (item.id === id ? { ...item, status: 'read', readAt: new Date().toISOString() } : item)),
      );
    } catch {
      setError('Failed to mark notification as read.');
    }
  };

  const handleReadAll = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((items) => items.map((item) => ({ ...item, status: 'read', readAt: item.readAt || new Date().toISOString() })));
    } catch {
      setError('Failed to mark all notifications as read.');
    }
  };

  const handleDeleteOne = async (id: string) => {
    try {
      await deleteNotification(id);
      setNotifications((items) => items.filter((item) => item.id !== id));
    } catch {
      setError('Failed to delete notification.');
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllNotifications();
      setNotifications([]);
    } catch {
      setError('Failed to delete all notifications.');
    }
  };

  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Notification Center</h2>
        <div className="panel__actions">
          <select value={status} onChange={(event) => setStatus(event.target.value as NotificationStatus | 'all')}>
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
            <option value="archived">Archived</option>
          </select>
          <button onClick={() => void handleReadAll()}>Mark all read</button>
          <button onClick={() => void handleDeleteAll()}>Delete all</button>
          <button onClick={() => void fetchNotifications(status)}>Refresh</button>
        </div>
      </div>

      {loading && <p>Loading notifications...</p>}
      {error && <p className="panel__error">{error}</p>}

      {!loading && notifications.length === 0 && <p>No notifications found.</p>}

      <div className="notification-list">
        {notifications.map((notification) => {
          const detail = getNotificationDetail(notification);
          return (
            <article key={notification.id} className={`notification-item ${notification.status}`}>
              <header>
                <h4>{notification.title}</h4>
                <time>{new Date(notification.createdAt).toLocaleString()}</time>
              </header>
              <p>{notification.message}</p>
              {detail && <p className="panel__hint">{detail}</p>}
              <div className="notification-meta">
                {notification.symbol && <span>{notification.symbol}</span>}
                <span>{formatNotificationType(notification.type)}</span>
                {notification.status === 'unread' && (
                  <button onClick={() => void handleReadOne(notification.id)}>Mark read</button>
                )}
                <button onClick={() => void handleDeleteOne(notification.id)}>Delete</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
