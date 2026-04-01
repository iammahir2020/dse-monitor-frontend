import { useEffect, useMemo, useState } from 'react';
import {
  getPhase12AlertMonitor,
  getPhase12DepthMonitor,
  updatePhase12AlertMonitor,
  updatePhase12DepthMonitor,
  updateUserSettings,
  type AuthUser,
  type NotificationSettings,
  type Phase12AlertMonitorState,
  type Phase12DepthMonitorState,
} from '../services/api';

interface SettingsPanelProps {
  user: AuthUser;
  onUserUpdate: (user: AuthUser) => void;
}

export default function SettingsPanel({ user, onUserUpdate }: SettingsPanelProps) {
  const [settings, setSettings] = useState<NotificationSettings>(user.notificationSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [depthMonitorState, setDepthMonitorState] = useState<Phase12DepthMonitorState | null>(null);
  const [depthMonitorLoading, setDepthMonitorLoading] = useState(true);
  const [depthMonitorSaving, setDepthMonitorSaving] = useState(false);
  const [depthMonitorMessage, setDepthMonitorMessage] = useState<string | null>(null);
  const [alertMonitorState, setAlertMonitorState] = useState<Phase12AlertMonitorState | null>(null);
  const [alertMonitorLoading, setAlertMonitorLoading] = useState(true);
  const [alertMonitorSaving, setAlertMonitorSaving] = useState(false);
  const [alertMonitorMessage, setAlertMonitorMessage] = useState<string | null>(null);

  const updateField = <K extends keyof NotificationSettings>(field: K, value: NotificationSettings[K]) => {
    setSettings((previous) => ({ ...previous, [field]: value }));
  };

  const payload = useMemo(() => settings, [settings]);

  useEffect(() => {
    setSettings(user.notificationSettings);
  }, [user]);

  useEffect(() => {
    const loadAlertMonitorState = async () => {
      setAlertMonitorLoading(true);
      setAlertMonitorMessage(null);
      try {
        const response = await getPhase12AlertMonitor();
        setAlertMonitorState(response.data);
      } catch {
        setAlertMonitorMessage('Unable to load alert monitor status.');
      } finally {
        setAlertMonitorLoading(false);
      }
    };

    void loadAlertMonitorState();
  }, []);

  useEffect(() => {
    const loadDepthMonitorState = async () => {
      setDepthMonitorLoading(true);
      setDepthMonitorMessage(null);
      try {
        const response = await getPhase12DepthMonitor();
        setDepthMonitorState(response.data);
      } catch {
        setDepthMonitorMessage('Unable to load depth monitor status.');
      } finally {
        setDepthMonitorLoading(false);
      }
    };

    void loadDepthMonitorState();
  }, []);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await updateUserSettings(payload);
      setSettings(response.data.user.notificationSettings);
      onUserUpdate(response.data.user);
      setMessage('Settings saved successfully.');
    } catch {
      setMessage('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleDepthMonitorToggle = async (enabled: boolean) => {
    if (!depthMonitorState || depthMonitorSaving) {
      return;
    }

    const previousState = depthMonitorState;
    setDepthMonitorSaving(true);
    setDepthMonitorMessage(null);
    setDepthMonitorState({
      ...previousState,
      depthMonitor: {
        ...previousState.depthMonitor,
        runtimeEnabled: enabled,
      },
    });

    try {
      const response = await updatePhase12DepthMonitor(enabled);
      setDepthMonitorState(response.data);
      setDepthMonitorMessage(`Depth monitor ${response.data.depthMonitor.runtimeEnabled ? 'enabled' : 'disabled'}.`);
    } catch {
      setDepthMonitorState(previousState);
      setDepthMonitorMessage('Failed to update the depth monitor runtime state.');
    } finally {
      setDepthMonitorSaving(false);
    }
  };

  const handleAlertMonitorToggle = async (enabled: boolean) => {
    if (!alertMonitorState || alertMonitorSaving) {
      return;
    }

    const previousState = alertMonitorState;
    setAlertMonitorSaving(true);
    setAlertMonitorMessage(null);
    setAlertMonitorState({
      ...previousState,
      alertMonitor: {
        ...previousState.alertMonitor,
        runtimeEnabled: enabled,
      },
    });

    try {
      const response = await updatePhase12AlertMonitor(enabled);
      setAlertMonitorState(response.data);
      setAlertMonitorMessage(`Alert monitor ${response.data.alertMonitor.runtimeEnabled ? 'enabled' : 'disabled'}.`);
    } catch {
      setAlertMonitorState(previousState);
      setAlertMonitorMessage('Failed to update the alert monitor runtime state.');
    } finally {
      setAlertMonitorSaving(false);
    }
  };

  const depthMonitor = depthMonitorState?.depthMonitor;
  const alertMonitor = alertMonitorState?.alertMonitor;

  return (
    <section className="panel">
      <div className="panel__header">
        <h2>User Settings</h2>
      </div>
      <form className="settings-form" onSubmit={handleSave}>
        <label>
          <input
            type="checkbox"
            checked={settings.websocketEnabled}
            onChange={(event) => updateField('websocketEnabled', event.target.checked)}
          />
          Enable in-app WebSocket notifications
        </label>

        <label>
          <input
            type="checkbox"
            checked={settings.telegramEnabled}
            onChange={(event) => updateField('telegramEnabled', event.target.checked)}
          />
          Enable Telegram delivery
        </label>

        <label>
          <input
            type="checkbox"
            checked={settings.portfolioVolumeAlertsEnabled}
            onChange={(event) => updateField('portfolioVolumeAlertsEnabled', event.target.checked)}
          />
          Enable portfolio volume alerts
        </label>

        <label>
          <input
            type="checkbox"
            checked={settings.watchlistVolumeAlertsEnabled}
            onChange={(event) => updateField('watchlistVolumeAlertsEnabled', event.target.checked)}
          />
          Enable watchlist volume alerts
        </label>

        <label>
          Fixed volume threshold
          <input
            type="number"
            min={0}
            value={settings.fixedVolumeThreshold ?? ''}
            onChange={(event) =>
              updateField('fixedVolumeThreshold', event.target.value ? Number(event.target.value) : null)
            }
          />
        </label>

        <label>
          Relative volume multiplier
          <input
            type="number"
            min={0}
            step="0.1"
            value={settings.relativeVolumeMultiplier}
            onChange={(event) => updateField('relativeVolumeMultiplier', Number(event.target.value))}
          />
        </label>

        <label>
          Relative volume lookback days
          <input
            type="number"
            min={1}
            value={settings.relativeVolumeLookbackDays}
            onChange={(event) => updateField('relativeVolumeLookbackDays', Number(event.target.value))}
          />
        </label>

        <label>
          <input
            type="checkbox"
            checked={settings.depthPressureAlertsEnabled}
            onChange={(event) => updateField('depthPressureAlertsEnabled', event.target.checked)}
          />
          Enable depth pressure alerts
        </label>

        <label>
          Depth pressure threshold
          <input
            type="number"
            min={0}
            step="0.1"
            value={settings.depthPressureThreshold}
            onChange={(event) => updateField('depthPressureThreshold', Number(event.target.value))}
          />
        </label>

        <label>
          <input
            type="checkbox"
            checked={settings.signalPulseAlertsEnabled}
            onChange={(event) => updateField('signalPulseAlertsEnabled', event.target.checked)}
          />
          Enable signal pulse alerts
        </label>

        <label>
          Signal pulse timeframe
          <select
            value={settings.signalPulseTimeframe}
            onChange={(event) => updateField('signalPulseTimeframe', event.target.value)}
          >
            <option value="daily">Daily</option>
          </select>
        </label>

        <button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>

      {message && <p className="panel__hint">{message}</p>}

      <section className="settings-section">
        <div className="panel__header settings-section__header">
          <div>
            <h3>Depth Monitor Runtime</h3>
            <p className="panel__hint">Control the backend 2-minute depth-pressure worker.</p>
          </div>
        </div>

        {depthMonitorLoading && <p className="panel__hint">Loading depth monitor status...</p>}

        {!depthMonitorLoading && depthMonitorState && depthMonitor && (
          <div className="settings-status-grid">
            <label className="settings-toggle-row">
              <span>Runtime enabled</span>
              <input
                type="checkbox"
                checked={depthMonitor.runtimeEnabled}
                disabled={!depthMonitor.configuredEnabled || depthMonitorSaving}
                onChange={(event) => void handleDepthMonitorToggle(event.target.checked)}
              />
            </label>

            <div className="settings-status-card">
              <span>Configured</span>
              <strong>{depthMonitor.configuredEnabled ? 'Allowed' : 'Blocked by backend config'}</strong>
            </div>

            <div className="settings-status-card">
              <span>Interval</span>
              <strong>{depthMonitor.intervalActive ? 'Active' : 'Stopped'}</strong>
            </div>

            <div className="settings-status-card">
              <span>Effective state</span>
              <strong>{depthMonitor.effectiveEnabled ? 'Running' : 'Disabled'}</strong>
            </div>

            <div className="settings-status-card">
              <span>Market window</span>
              <strong>
                {depthMonitorState.marketWindow.open} - {depthMonitorState.marketWindow.close} ({depthMonitorState.marketWindow.timezone})
              </strong>
            </div>

            <div className="settings-status-card">
              <span>Last depth cycle</span>
              <strong>
                {depthMonitorState.lastDepthCycleAt
                  ? new Date(depthMonitorState.lastDepthCycleAt).toLocaleString()
                  : 'Not available'}
              </strong>
            </div>
          </div>
        )}

        {depthMonitorMessage && <p className="panel__hint">{depthMonitorMessage}</p>}
      </section>

        <section className="settings-section">
          <div className="panel__header settings-section__header">
            <div>
              <h3>Alert Monitor Runtime</h3>
              <p className="panel__hint">Control the backend 2-minute legacy alert worker.</p>
            </div>
          </div>

          {alertMonitorLoading && <p className="panel__hint">Loading alert monitor status...</p>}

          {!alertMonitorLoading && alertMonitorState && alertMonitor && (
            <div className="settings-status-grid">
              <label className="settings-toggle-row">
                <span>Runtime enabled</span>
                <input
                  type="checkbox"
                  checked={alertMonitor.runtimeEnabled}
                  disabled={!alertMonitor.configuredEnabled || alertMonitorSaving}
                  onChange={(event) => void handleAlertMonitorToggle(event.target.checked)}
                />
              </label>

              <div className="settings-status-card">
                <span>Configured</span>
                <strong>{alertMonitor.configuredEnabled ? 'Allowed' : 'Blocked by backend config'}</strong>
              </div>

              <div className="settings-status-card">
                <span>Interval</span>
                <strong>{alertMonitor.intervalActive ? 'Active' : 'Stopped'}</strong>
              </div>

              <div className="settings-status-card">
                <span>Effective state</span>
                <strong>{alertMonitor.effectiveEnabled ? 'Running' : 'Disabled'}</strong>
              </div>

              <div className="settings-status-card">
                <span>Monitor loop</span>
                <strong>{alertMonitor.isMonitoring ? 'Running now' : 'Idle'}</strong>
              </div>

              <div className="settings-status-card">
                <span>Persisted</span>
                <strong>{alertMonitor.persistedEnabled ? 'Enabled' : 'Disabled'}</strong>
              </div>
            </div>
          )}

          {alertMonitorMessage && <p className="panel__hint">{alertMonitorMessage}</p>}
        </section>
    </section>
  );
}
