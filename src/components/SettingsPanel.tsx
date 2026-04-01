import { useEffect, useMemo, useState } from 'react';
import {
  getPhase12DepthMonitor,
  updatePhase12DepthMonitor,
  updateUserSettings,
  type AuthUser,
  type NotificationSettings,
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

  const updateField = <K extends keyof NotificationSettings>(field: K, value: NotificationSettings[K]) => {
    setSettings((previous) => ({ ...previous, [field]: value }));
  };

  const payload = useMemo(() => settings, [settings]);

  useEffect(() => {
    setSettings(user.notificationSettings);
  }, [user]);

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

  const depthMonitor = depthMonitorState?.depthMonitor;

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
    </section>
  );
}
