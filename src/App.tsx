import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { Bell, Bot, ChartLine, LogOut, Settings, Siren } from 'lucide-react';
import './App.css';
import AuthPage from './components/AuthPage';
import NotificationCenter from './components/NotificationCenter';
import TelegramPanel from './components/TelegramPanel';
import InsightsPanel from './components/InsightsPanel';
import SettingsPanel from './components/SettingsPanel';
import AlertsPage from './components/AlertsPage.tsx';
import Watchlist from './components/Watchlist';
import Portfolio from './components/Portfolio';
import MarketSentiment from './components/MarketSentiment';
import {
  clearAuthToken,
  getAuthToken,
  getMe,
  getUnreadNotificationCount,
  getWebSocketUrl,
  logout,
  type AuthUser,
  type NotificationItem,
} from './services/api';

interface ToastItem {
  id: string;
  title: string;
  message: string;
}

function Toasts({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast-item" role="status">
          <div className="toast-item__title">{toast.title}</div>
          <div className="toast-item__message">{toast.message}</div>
          <button className="toast-item__dismiss" onClick={() => onDismiss(toast.id)}>
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}

function ProtectedLayout({
  user,
  unreadCount,
  onLogout,
}: {
  user: AuthUser;
  unreadCount: number;
  onLogout: () => Promise<void>;
}) {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div>
          <h1>DSE Monitor</h1>
          <p>{user.phoneNumber}</p>
        </div>
        <nav className="app-shell__nav">
          <NavLink to="/alerts">
            <Siren size={16} />
            Alerts
          </NavLink>
          <NavLink to="/watchlist">Watchlist</NavLink>
          <NavLink to="/portfolio">Portfolio</NavLink>
          <NavLink to="/sentiment">Sentiment</NavLink>
          <NavLink to="/notifications" className="app-shell__nav-badge">
            <Bell size={16} />
            Notifications
            {unreadCount > 0 && <span>{unreadCount}</span>}
          </NavLink>
          <NavLink to="/insights">
            <ChartLine size={16} />
            Insights
          </NavLink>
          <NavLink to="/telegram">
            <Bot size={16} />
            Telegram
          </NavLink>
          <NavLink to="/settings">
            <Settings size={16} />
            Settings
          </NavLink>
          <button className="app-shell__logout" onClick={() => void onLogout()}>
            <LogOut size={16} />
            Logout
          </button>
        </nav>
      </header>

      <main className="app-shell__main">
        <Routes>
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/sentiment" element={<MarketSentiment />} />
          <Route path="/notifications" element={<NotificationCenter />} />
          <Route path="/insights" element={<InsightsPanel />} />
          <Route path="/telegram" element={<TelegramPanel />} />
          <Route path="/settings" element={<SettingsPanel user={user} />} />
          <Route path="*" element={<Navigate to="/alerts" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const navigate = useNavigate();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const token = useMemo(() => getAuthToken(), [user]);

  const refreshUnreadCount = async () => {
    try {
      const response = await getUnreadNotificationCount();
      setUnreadCount(response.data.unreadCount || 0);
    } catch {
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    const initializeSession = async () => {
      const existingToken = getAuthToken();
      if (!existingToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await getMe();
        setUser(response.data.user);
        await refreshUnreadCount();
      } catch {
        clearAuthToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    void initializeSession();
  }, []);

  useEffect(() => {
    if (!token || !user?.notificationSettings.websocketEnabled) {
      socketRef.current?.close();
      socketRef.current = null;
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      reconnectAttemptRef.current = 0;
      return;
    }

    const connectSocket = () => {
      const socket = new WebSocket(getWebSocketUrl(token));
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttemptRef.current = 0;
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as { event: string; data: NotificationItem };
          if (message.event === 'notification.created' && message.data) {
            setUnreadCount((count) => count + 1);
            const toastId = `${message.data.id}-${Date.now()}`;
            setToasts((existing) => [
              {
                id: toastId,
                title: message.data.title,
                message: message.data.message,
              },
              ...existing,
            ].slice(0, 4));
          }
        } catch {
          // Ignore malformed websocket payloads.
        }
      };

      socket.onclose = () => {
        if (!token || !user?.notificationSettings.websocketEnabled) return;
        if (reconnectAttemptRef.current >= 5) return;

        const backoffMs = Math.min(5000, 500 * 2 ** reconnectAttemptRef.current);
        reconnectAttemptRef.current += 1;
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connectSocket();
        }, backoffMs);
      };
    };

    connectSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      socketRef.current?.close();
      socketRef.current = null;
      reconnectAttemptRef.current = 0;
    };
  }, [token, user?.notificationSettings.websocketEnabled]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = window.setTimeout(() => {
      setToasts((items) => items.slice(0, -1));
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [toasts]);

  const handleAuthSuccess = async (nextUser: AuthUser) => {
    setUser(nextUser);
    await refreshUnreadCount();
    navigate('/alerts');
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Local cleanup still needs to happen on API failure.
    }
    clearAuthToken();
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    socketRef.current?.close();
    socketRef.current = null;
    reconnectAttemptRef.current = 0;
    setUser(null);
    setUnreadCount(0);
    setToasts([]);
    navigate('/auth');
  };

  if (loading) {
    return <div className="app-loading">Checking your session...</div>;
  }

  return (
    <>
      {user ? (
        <ProtectedLayout user={user} unreadCount={unreadCount} onLogout={handleLogout} />
      ) : (
        <Routes>
          <Route path="/auth" element={<AuthPage onAuthenticated={handleAuthSuccess} authError={null} />} />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      )}

      <Toasts
        toasts={toasts}
        onDismiss={(id) => setToasts((items) => items.filter((toast) => toast.id !== id))}
      />
    </>
  );
}

export default App;
