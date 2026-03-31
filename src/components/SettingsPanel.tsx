import { useMemo, useState } from 'react';
import { updateUserSettings, type AuthUser, type NotificationSettings } from '../services/api';

interface SettingsPanelProps {
  user: AuthUser;
}

export default function SettingsPanel({ user }: SettingsPanelProps) {
  const [settings, setSettings] = useState<NotificationSettings>(user.notificationSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const updateField = <K extends keyof NotificationSettings>(field: K, value: NotificationSettings[K]) => {
    setSettings((previous) => ({ ...previous, [field]: value }));
  };

  const payload = useMemo(() => settings, [settings]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await updateUserSettings(payload);
      setMessage('Settings saved successfully.');
    } catch {
      setMessage('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

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

        <button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>

      {message && <p className="panel__hint">{message}</p>}
    </section>
  );
}
