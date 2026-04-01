import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Edit2, Trash2 } from 'lucide-react';
import {
  createAlert,
  deleteAlert,
  getAllAlerts,
  searchStocks,
  updateAlert,
  type Alert,
  type Stock,
} from '../services/api';
import '../styles/AlertsPage.css';

type AlertType = 'price_above' | 'price_below' | 'change_percent' | 'volume_above' | 'relative_volume_above';

interface AlertFormState {
  symbol: string;
  alertType: AlertType;
  threshold: string;
  lookbackDays: string;
  cooldownSeconds: string;
}

const defaultFormState: AlertFormState = {
  symbol: '',
  alertType: 'price_above',
  threshold: '',
  lookbackDays: '5',
  cooldownSeconds: '300',
};

const parseOptionalNumber = (value: string) => {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [formState, setFormState] = useState<AlertFormState>(defaultFormState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [symbolSuggestions, setSymbolSuggestions] = useState<Stock[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Alert>>({});

  useEffect(() => {
    void fetchAlerts();
  }, []);

  useEffect(() => {
    if (!formState.symbol.trim()) {
      setSymbolSuggestions([]);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await searchStocks(formState.symbol.trim());
        setSymbolSuggestions(response.data || []);
      } catch {
        setSymbolSuggestions([]);
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [formState.symbol]);

  const fetchAlerts = async () => {
    try {
      setError(null);
      const res = await getAllAlerts();
      setAlerts(res || []);
    } catch (err) {
      setError('Failed to fetch alerts: ' + (err as Error).message);
    }
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.symbol.trim() || !formState.threshold) return;

    setLoading(true);
    setError(null);
    try {
      await createAlert({
        symbol: formState.symbol.toUpperCase(),
        alertType: formState.alertType,
        threshold: parseFloat(formState.threshold),
        lookbackDays: parseOptionalNumber(formState.lookbackDays),
        cooldownSeconds: parseOptionalNumber(formState.cooldownSeconds),
      });
      setFormState(defaultFormState);
      await fetchAlerts();
    } catch (err) {
      setError('Failed to create alert: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAlert = async (id: string) => {
    try {
      setError(null);
      await updateAlert(id, editValues);
      setEditingId(null);
      setEditValues({});
      await fetchAlerts();
    } catch (err) {
      setError('Failed to update alert: ' + (err as Error).message);
    }
  };

  const handleDeleteAlert = async (id: string) => {
    if (!window.confirm('Delete this alert?')) return;

    try {
      setError(null);
      await deleteAlert(id);
      await fetchAlerts();
    } catch (err) {
      setError('Failed to delete alert: ' + (err as Error).message);
    }
  };

  const isVolumeAlert = formState.alertType === 'volume_above' || formState.alertType === 'relative_volume_above';

  return (
    <section className="alerts-page panel">
      <div className="panel__header alerts-page__header">
        <div>
          <h2>Alert Management</h2>
          <p className="alerts-page__subtitle">Create and manage your stock alerts.</p>
        </div>
        <button onClick={() => void fetchAlerts()}>Refresh</button>
      </div>

      {error && (
        <div className="alerts-page__error" role="alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="alerts-page__grid">
        <form onSubmit={handleCreateAlert} className="alerts-page__form">
          <h3>Create New Alert</h3>

          <label htmlFor="alert-symbol">Stock Symbol</label>
          <input
            id="alert-symbol"
            type="text"
            list="alert-symbol-suggestions"
            value={formState.symbol}
            onChange={(e) => setFormState((previous) => ({ ...previous, symbol: e.target.value.toUpperCase() }))}
            placeholder="e.g., SBIBANK"
            required
          />
          <datalist id="alert-symbol-suggestions">
            {symbolSuggestions.map((item) => (
              <option key={item.symbol} value={item.symbol}>
                {item.company}
              </option>
            ))}
          </datalist>

          <label htmlFor="alert-type">Alert Type</label>
          <select
            id="alert-type"
            value={formState.alertType}
            onChange={(e) => setFormState((previous) => ({ ...previous, alertType: e.target.value as AlertType }))}
          >
            <option value="price_above">Price Above</option>
            <option value="price_below">Price Below</option>
            <option value="change_percent">Change Percent</option>
            <option value="volume_above">Volume Above</option>
            <option value="relative_volume_above">Relative Volume Above</option>
          </select>

          <label htmlFor="alert-threshold">{isVolumeAlert ? 'Volume Threshold' : 'Threshold Value'}</label>
          <input
            id="alert-threshold"
            type="number"
            step="0.01"
            value={formState.threshold}
            onChange={(e) => setFormState((previous) => ({ ...previous, threshold: e.target.value }))}
            placeholder="Enter threshold"
            required
          />

          <div className="alerts-page__field-grid">
            <label htmlFor="alert-lookback-days">
              Lookback days
              <input
                id="alert-lookback-days"
                type="number"
                min="1"
                value={formState.lookbackDays}
                onChange={(e) => setFormState((previous) => ({ ...previous, lookbackDays: e.target.value }))}
              />
            </label>

            <label htmlFor="alert-cooldown-seconds">
              Cooldown seconds
              <input
                id="alert-cooldown-seconds"
                type="number"
                min="0"
                step="1"
                value={formState.cooldownSeconds}
                onChange={(e) => setFormState((previous) => ({ ...previous, cooldownSeconds: e.target.value }))}
              />
            </label>
          </div>

          <p className="alerts-page__hint">
            Use lookback days for relative-volume logic and cooldown seconds to reduce repeated triggers.
          </p>

          <button type="submit" className="btn btn--primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Alert'}
          </button>
        </form>

        <div className="alerts-page__list">
          <h3>Active Alerts ({alerts.length})</h3>

          {alerts.length === 0 ? (
            <p className="alerts-page__empty">No alerts created yet.</p>
          ) : (
            <div className="alerts-page__items">
              {alerts.map((alert) => (
                <article key={alert.id} className="alerts-page__item">
                  <div className="alerts-page__item-info">
                    {editingId === alert.id ? (
                      <>
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={alert.threshold}
                          onChange={(e) =>
                            setEditValues({ ...editValues, threshold: parseFloat(e.target.value) })
                          }
                        />
                        <select
                          defaultValue={alert.alertType}
                          onChange={(e) =>
                            setEditValues({ ...editValues, alertType: e.target.value as AlertType })
                          }
                        >
                          <option value="price_above">Price Above</option>
                          <option value="price_below">Price Below</option>
                          <option value="change_percent">Change Percent</option>
                          <option value="volume_above">Volume Above</option>
                          <option value="relative_volume_above">Relative Volume Above</option>
                        </select>
                        <input
                          type="number"
                          min="1"
                          placeholder="Lookback days"
                          defaultValue={alert.lookbackDays ?? ''}
                          onChange={(e) =>
                            setEditValues({ ...editValues, lookbackDays: parseOptionalNumber(e.target.value) })
                          }
                        />
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Cooldown seconds"
                          defaultValue={alert.cooldownSeconds ?? ''}
                          onChange={(e) =>
                            setEditValues({ ...editValues, cooldownSeconds: parseOptionalNumber(e.target.value) })
                          }
                        />
                      </>
                    ) : (
                      <>
                        <strong>{alert.symbol}</strong>
                        <span>{alert.alertType.replace(/_/g, ' ')}</span>
                        <span>BDT {alert.threshold}</span>
                        {typeof alert.lookbackDays === 'number' && <span>{alert.lookbackDays}d lookback</span>}
                        {typeof alert.cooldownSeconds === 'number' && <span>{alert.cooldownSeconds}s cooldown</span>}
                      </>
                    )}
                  </div>

                  <div className="alerts-page__item-actions">
                    {editingId === alert.id ? (
                      <button
                        className="btn btn--small btn--success"
                        onClick={() => void handleUpdateAlert(alert.id)}
                      >
                        <Check size={16} />
                      </button>
                    ) : (
                      <button className="btn btn--small" onClick={() => setEditingId(alert.id)}>
                        <Edit2 size={16} />
                      </button>
                    )}

                    <button
                      className="btn btn--small btn--danger"
                      onClick={() => void handleDeleteAlert(alert.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
