import { useState, useEffect } from 'react';
import { X, Trash2, Edit2, Check, AlertTriangle } from 'lucide-react';
import { createAlert, updateAlert, deleteAlert, getAllAlerts, searchStocks, Alert, Stock } from '../services/api';
import '../styles/AlertModal.css';

interface AlertModalProps {
  stock: Stock | null;
  onClose: () => void;
  onAlertCreated: () => void;
}

type AlertType = 'price_above' | 'price_below' | 'change_percent' | 'volume_above' | 'relative_volume_above';

export default function AlertModal({ stock: _stock, onClose, onAlertCreated }: AlertModalProps) {
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
    fetchAlerts();
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
      console.error('Error fetching alerts:', err);
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
      onAlertCreated();
    } catch (err) {
      console.error('Error creating alert:', err);
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
      console.error('Error updating alert:', err);
      setError('Failed to update alert: ' + (err as Error).message);
    }
  };

  const handleDeleteAlert = async (id: string) => {
    if (confirm('Delete this alert?')) {
      try {
        setError(null);
        await deleteAlert(id);
        await fetchAlerts();
      } catch (err) {
        console.error('Error deleting alert:', err);
        setError('Failed to delete alert: ' + (err as Error).message);
      }
    }
  };

  return (
    <div className="alert-modal-overlay" onClick={onClose}>
      <div className="alert-modal" onClick={(e) => e.stopPropagation()}>
        <div className="alert-modal__header">
          <h2>Alert Management</h2>
          <button className="alert-modal__close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="alert-modal__error">
            <AlertTriangle size={18} />
            <span>{error}</span>
            <button className="alert-modal__error-close" onClick={() => setError(null)}>×</button>
          </div>
        )}

        <div className="alert-modal__content">
          <form onSubmit={handleCreateAlert} className="alert-form">
            <h3>Create New Alert</h3>
            <div className="form-group">
              <label>Stock Symbol</label>
              <input
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
            </div>
            <div className="form-group">
              <label>Alert Type</label>
              <select value={alertType} onChange={(e) => setAlertType(e.target.value as AlertType)}>
                <option value="price_above">Price Above</option>
                <option value="price_below">Price Below</option>
                <option value="change_percent">Change Percent</option>
                <option value="volume_above">Volume Above</option>
                <option value="relative_volume_above">Relative Volume Above</option>
              </select>
            </div>
            <div className="form-group">
              <label>Threshold Value</label>
              <input
                type="number"
                step="0.01"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder="Enter threshold"
                required
              />
            </div>
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Alert'}
            </button>
          </form>

          <div className="alerts-list">
            <h3>Active Alerts ({alerts.length})</h3>
            {alerts.length === 0 ? (
              <p className="alerts-list__empty">No alerts created yet</p>
            ) : (
              <div className="alerts-list__items">
                {alerts.map((alert) => (
                  <div key={alert.id} className="alert-item">
                    <div className="alert-item__info">
                      {editingId === alert.id ? (
                        <div className="alert-item__edit">
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
                        </div>
                      ) : (
                        <>
                          <strong>{alert.symbol}</strong>
                          <span>{alert.alertType.replaceAll('_', ' ')}</span>
                          <span>BDT {alert.threshold}</span>
                        </>
                      )}
                    </div>
                    <div className="alert-item__actions">
                      {editingId === alert.id ? (
                        <button
                          className="btn btn--small btn--success"
                          onClick={() => handleUpdateAlert(alert.id)}
                        >
                          <Check size={16} />
                        </button>
                      ) : (
                        <button
                          className="btn btn--small"
                          onClick={() => setEditingId(alert.id)}
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      <button
                        className="btn btn--small btn--danger"
                        onClick={() => handleDeleteAlert(alert.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
