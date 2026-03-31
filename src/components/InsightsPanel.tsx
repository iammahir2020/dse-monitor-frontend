import { useEffect, useState } from 'react';
import { getEntrySignals, getVolumeContext, type EntrySignal, type VolumeContext } from '../services/api';

export default function InsightsPanel() {
  const [signals, setSignals] = useState<EntrySignal[]>([]);
  const [volumeMap, setVolumeMap] = useState<Record<string, VolumeContext>>({});
  const [loading, setLoading] = useState(true);
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

  const getSignalKey = (signal: EntrySignal, index: number) => {
    if (signal.symbol && signal.symbol.trim().length > 0) {
      return `${signal.symbol}-${index}`;
    }
    return `signal-${index}`;
  };

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getEntrySignals();
      const signalData = Array.isArray(response.data?.data) ? response.data.data : [];
      setSignals(signalData);

      const symbols = signalData
        .slice(0, 5)
        .map((item) => item.symbol)
        .filter((symbol): symbol is string => typeof symbol === 'string' && symbol.trim().length > 0);
      const contexts = await Promise.all(
        symbols.map(async (symbol) => {
          try {
            const context = await getVolumeContext(symbol);
            return context.data;
          } catch {
            return null;
          }
        }),
      );

      const nextMap: Record<string, VolumeContext> = {};
      contexts.forEach((context) => {
        if (context) {
          nextMap[context.symbol] = context;
        }
      });
      setVolumeMap(nextMap);
    } catch {
      setError('Failed to load entry insights.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchInsights();
  }, []);

  if (loading) {
    return <section className="panel">Loading insights...</section>;
  }

  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Entry Insights</h2>
        <button onClick={() => void fetchInsights()}>Refresh</button>
      </div>

      {error && <p className="panel__error">{error}</p>}
      {signals.length === 0 && <p>No insight candidates available yet.</p>}

      <div className="insights-grid">
        {signals.map((signal, index) => {
          const volume = volumeMap[signal.symbol];
          return (
            <article key={getSignalKey(signal, index)} className="insight-card">
              <header>
                <h3>{signal.symbol}</h3>
                <span className={`insight-confidence ${signal.confidence}`}>{signal.confidence}</span>
              </header>
              <p>
                Score: <strong>{signal.score}</strong> | Recommendation: <strong>{signal.recommendation}</strong>
              </p>
              <p>
                Entry Zone: {formatNumber(signal.entryZone?.min)} - {formatNumber(signal.entryZone?.max)}
              </p>
              <p>
                Stop Loss: {formatNumber(signal.stopLoss)} | Target: {formatNumber(signal.targetPrice)} | RR:{' '}
                {formatNumber(signal.riskRewardRatio)}
              </p>

              {Array.isArray(signal.reasons) && signal.reasons.length > 0 && <p>Reasons: {signal.reasons.join(', ')}</p>}
              {Array.isArray(signal.cautions) && signal.cautions.length > 0 && <p>Cautions: {signal.cautions.join(', ')}</p>}

              {volume && (
                <p>
                  Volume context: {formatInteger(volume.currentVolume)} vs avg {formatInteger(volume.averageRecentVolume)} ({formatInteger(volume.recentDays)}d)
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
