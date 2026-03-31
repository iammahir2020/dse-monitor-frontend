import { useEffect, useRef, useState } from 'react';
import { createTelegramLinkToken, getTelegramStatus, unlinkTelegram, type TelegramStatus } from '../services/api';

export default function TelegramPanel() {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [deepLinkUrl, setDeepLinkUrl] = useState<string | null>(null);
  const [pollingHint, setPollingHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const clearPolling = () => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const refreshStatus = async () => {
    try {
      setError(null);
      const response = await getTelegramStatus();
      setStatus(response.data);
    } catch {
      setError('Unable to fetch Telegram status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshStatus();
    return () => {
      clearPolling();
    };
  }, []);

  const startPollingForLink = (expiresAt: string) => {
    clearPolling();
    const expiryMs = new Date(expiresAt).getTime();

    pollRef.current = window.setInterval(async () => {
      if (Date.now() >= expiryMs) {
        clearPolling();
        setPollingHint('Link token expired. Please tap Connect Telegram again.');
        setConnecting(false);
        return;
      }

      try {
        const response = await getTelegramStatus();
        setStatus(response.data);
        if (response.data.linked) {
          clearPolling();
          setConnecting(false);
          setDeepLinkUrl(null);
          setPollingHint('Telegram linked successfully.');
        }
      } catch {
        // Continue polling until expiry or manual refresh.
      }
    }, 5000);
  };

  const handleConnect = async () => {
    try {
      setError(null);
      setConnecting(true);
      setPollingHint('Open Telegram and press Start to complete linking.');
      const response = await createTelegramLinkToken();
      setDeepLinkUrl(response.data.deepLinkUrl);
      const popup = window.open(response.data.deepLinkUrl, '_blank', 'noopener,noreferrer');
      if (!popup) {
        setPollingHint('Popup blocked. Use the Open bot link below to continue.');
      }
      startPollingForLink(response.data.expiresAt);
    } catch {
      setConnecting(false);
      setPollingHint(null);
      setError('Failed to create Telegram link token.');
    }
  };

  const handleUnlink = async () => {
    try {
      setError(null);
      await unlinkTelegram();
      setDeepLinkUrl(null);
      clearPolling();
      setPollingHint(null);
      await refreshStatus();
    } catch {
      setError('Failed to unlink Telegram account.');
    }
  };

  if (loading) {
    return <section className="panel">Loading Telegram status...</section>;
  }

  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Telegram Settings</h2>
        <button onClick={() => void refreshStatus()}>Refresh</button>
      </div>

      {error && <p className="panel__error">{error}</p>}

      <div className="telegram-status">
        <p>
          Link status:{' '}
          <strong>{status?.linked ? `Linked as @${status.telegramUsername}` : 'Not linked'}</strong>
        </p>
        {status?.linkedAt && <p>Linked at: {new Date(status.linkedAt).toLocaleString()}</p>}
        {status?.botUsername && <p>Bot: @{status.botUsername}</p>}
      </div>

      <div className="panel__actions">
        {!status?.linked ? (
          <button onClick={() => void handleConnect()} disabled={connecting}>
            {connecting ? 'Waiting for Telegram...' : 'Connect Telegram'}
          </button>
        ) : (
          <button onClick={() => void handleUnlink()}>Unlink Telegram</button>
        )}
      </div>

      {deepLinkUrl && !status?.linked && (
        <p className="panel__hint">
          If Telegram did not open automatically, use this link: <a href={deepLinkUrl} target="_blank" rel="noreferrer">Open bot</a>
        </p>
      )}

      {pollingHint && <p className="panel__hint">{pollingHint}</p>}

      <p className="panel__hint">After opening the bot link in the Telegram app or Telegram Web, press Start to complete linking.</p>
    </section>
  );
}
