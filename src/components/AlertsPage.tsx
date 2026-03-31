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

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [symbol, setSymbol] = useState('');
  const [alertType, setAlertType] = useState<AlertType>('price_above');
  const [threshold, setThreshold] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [symbolSuggestions, setSymbolSuggestions] = useState<Stock[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Alert>>({});

  useEffect(() => {
    void fetchAlerts();
  }, []);

  useEffect(() => {
    if (!symbol.trim()) {
      setSymbolSuggestions([]);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await searchStocks(symbol.trim());
        setSymbolSuggestions(response.data || []);
      } catch {
        setSymbolSuggestions([]);
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [symbol]);

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
    if (!symbol.trim() || !threshold) return;

    setLoading(true);
    setError(null);
    try {
      await createAlert({
        symbol: symbol.toUpperCase(),
        alertType,
        threshold: parseFloat(threshold),
      });
      setSymbol('');
      setThreshold('');
      setAlertType('price_above');
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
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
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
            value={alertType}
            onChange={(e) => setAlertType(e.target.value as AlertType)}
          >
            <option value="price_above">Price Above</option>
            <option value="price_below">Price Below</option>
            <option value="change_percent">Change Percent</option>
            <option value="volume_above">Volume Above</option>
            <option value="relative_volume_above">Relative Volume Above</option>
          </select>

          <label htmlFor="alert-threshold">Threshold Value</label>
          <input
            id="alert-threshold"
            type="number"
            step="0.01"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder="Enter threshold"
            required
          />

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
                      </>
                    ) : (
                      <>
                        <strong>{alert.symbol}</strong>
                        <span>{alert.alertType.replace(/_/g, ' ')}</span>
                        <span>BDT {alert.threshold}</span>
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
