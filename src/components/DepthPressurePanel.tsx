import { useEffect, useState } from 'react';
import {
  getDepthPressure,
  getDepthPressureBySymbol,
  type DepthPressureSnapshot,
} from '../services/api';

interface DepthPressureUpdateEvent extends Event {
  detail?: DepthPressureSnapshot;
}

export default function DepthPressurePanel() {
  const [snapshots, setSnapshots] = useState<DepthPressureSnapshot[]>([]);
  const [threshold, setThreshold] = useState<number | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<DepthPressureSnapshot | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatNumber = (value: number | null | undefined, digits = 2) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return 'N/A';
    }
    return value.toFixed(digits);
  };

  const formatInteger = (value: number | null | undefined) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return 'N/A';
    }
    return value.toLocaleString();
  };

  const fetchDepthPressure = async (symbolToSelect?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getDepthPressure({ limit: 30 });
      const nextSnapshots = Array.isArray(response.data?.data) ? response.data.data : [];
      setSnapshots(nextSnapshots);
      setThreshold(typeof response.data?.threshold === 'number' ? response.data.threshold : null);

      const nextSelectedSymbol = symbolToSelect || selectedSymbol || nextSnapshots[0]?.symbol || null;
      if (nextSelectedSymbol) {
        setSelectedSymbol(nextSelectedSymbol);
        void fetchDepthPressureDetail(nextSelectedSymbol);
      } else {
        setSelectedSnapshot(null);
      }
    } catch {
      setError('Unable to load depth pressure data. Ensure the backend feature flag is enabled.');
      setSnapshots([]);
      setSelectedSnapshot(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepthPressureDetail = async (symbol: string) => {
    setDetailLoading(true);
    try {
      const response = await getDepthPressureBySymbol(symbol);
      setSelectedSnapshot(response.data);
    } catch {
      setSelectedSnapshot(null);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    void fetchDepthPressure();
  }, []);

  useEffect(() => {
    const handleDepthUpdate = (event: Event) => {
      const customEvent = event as DepthPressureUpdateEvent;
      const updatedSymbol = customEvent.detail?.symbol;
      void fetchDepthPressure(updatedSymbol);
    };

    window.addEventListener('dse:depth-pressure-updated', handleDepthUpdate);
    return () => window.removeEventListener('dse:depth-pressure-updated', handleDepthUpdate);
  }, [selectedSymbol]);

  const filteredSnapshots = snapshots.filter((snapshot) => {
    if (!query.trim()) {
      return true;
    }

    return snapshot.symbol.toLowerCase().includes(query.trim().toLowerCase());
  });

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <h2>Depth Pressure</h2>
          <p className="panel__hint">Live order-book pressure snapshots with symbol detail.</p>
        </div>
        <div className="panel__actions">
          <input
            type="text"
            value={query}
            placeholder="Filter symbols"
            onChange={(event) => setQuery(event.target.value.toUpperCase())}
          />
          <button onClick={() => void fetchDepthPressure()}>Refresh</button>
        </div>
      </div>

      {threshold !== null && <p className="panel__hint">Current backend threshold: {formatNumber(threshold)}</p>}
      {error && <p className="panel__error">{error}</p>}
      {loading && <p>Loading depth pressure...</p>}

      {!loading && filteredSnapshots.length === 0 && !error && <p>No depth pressure snapshots available.</p>}

      <div className="depth-pressure-layout">
        <div className="depth-pressure-list">
          {filteredSnapshots.map((snapshot) => {
            const isBullish = snapshot.buyPressureRatio >= (threshold ?? 0);
            return (
              <button
                key={`${snapshot.symbol}-${snapshot.snapshotAt}`}
                className={selectedSymbol === snapshot.symbol ? 'depth-pressure-item active' : 'depth-pressure-item'}
                onClick={() => {
                  setSelectedSymbol(snapshot.symbol);
                  void fetchDepthPressureDetail(snapshot.symbol);
                }}
              >
                <div className="depth-pressure-item__top">
                  <strong>{snapshot.symbol}</strong>
                  <span className={isBullish ? 'depth-signal bullish' : 'depth-signal bearish'}>
                    {snapshot.signal}
                  </span>
                </div>
                <div className="depth-pressure-item__metrics">
                  <span>Ratio {formatNumber(snapshot.buyPressureRatio)}</span>
                  <span>Bids {formatInteger(snapshot.totalBids)}</span>
                  <span>Asks {formatInteger(snapshot.totalAsks)}</span>
                </div>
                <span className="depth-pressure-item__time">{new Date(snapshot.snapshotAt).toLocaleString()}</span>
              </button>
            );
          })}
        </div>

        <div className="depth-pressure-detail">
          {!selectedSymbol && <p>Select a symbol to inspect the latest depth pressure snapshot.</p>}
          {selectedSymbol && detailLoading && <p>Loading {selectedSymbol} detail...</p>}
          {selectedSnapshot && !detailLoading && (
            <article className="depth-pressure-card">
              <header>
                <div>
                  <h3>{selectedSnapshot.symbol}</h3>
                  <p className="panel__hint">Snapshot at {new Date(selectedSnapshot.snapshotAt).toLocaleString()}</p>
                </div>
                <span className={selectedSnapshot.buyPressureRatio >= (threshold ?? 0) ? 'depth-signal bullish' : 'depth-signal bearish'}>
                  {selectedSnapshot.signal}
                </span>
              </header>

              <div className="depth-pressure-stats">
                <div className="depth-stat">
                  <span>Buy pressure ratio</span>
                  <strong>{formatNumber(selectedSnapshot.buyPressureRatio)}</strong>
                </div>
                <div className="depth-stat">
                  <span>Total bids</span>
                  <strong>{formatInteger(selectedSnapshot.totalBids)}</strong>
                </div>
                <div className="depth-stat">
                  <span>Total asks</span>
                  <strong>{formatInteger(selectedSnapshot.totalAsks)}</strong>
                </div>
                <div className="depth-stat">
                  <span>Threshold</span>
                  <strong>{formatNumber(selectedSnapshot.threshold ?? threshold)}</strong>
                </div>
              </div>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
