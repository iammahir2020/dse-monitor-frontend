import { useEffect, useState } from 'react';
import {
  getEntrySignals,
  getSignalPulse,
  getVolumeContext,
  type EntrySignal,
  type SignalPulseItem,
  type VolumeContext,
} from '../services/api';

type InsightTab = 'entry' | 'signal-pulse';

export default function InsightsPanel() {
  const [activeTab, setActiveTab] = useState<InsightTab>('entry');
  const [signals, setSignals] = useState<EntrySignal[]>([]);
  const [signalPulse, setSignalPulse] = useState<SignalPulseItem[]>([]);
  const [signalPulseTimeframe, setSignalPulseTimeframe] = useState('daily');
  const [volumeMap, setVolumeMap] = useState<Record<string, VolumeContext>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signalPulseError, setSignalPulseError] = useState<string | null>(null);

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

  const extractNumericMetric = (item: SignalPulseItem, key: keyof SignalPulseItem) => {
    const directValue = item[key];
    if (typeof directValue === 'number') {
      return directValue;
    }

    const metricsValue = item.metrics?.[key as string];
    return typeof metricsValue === 'number' ? metricsValue : undefined;
  };

  const getPulseKind = (item: SignalPulseItem) => item.kind || item.signal || 'signal_pulse';

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    setSignalPulseError(null);

    const [entryResult, signalPulseResult] = await Promise.allSettled([
      getEntrySignals(),
      getSignalPulse({ limit: 30 }),
    ]);

    if (entryResult.status === 'fulfilled') {
      const signalData = Array.isArray(entryResult.value.data?.data) ? entryResult.value.data.data : [];
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
    } else {
      setSignals([]);
      setVolumeMap({});
      setError('Failed to load entry insights.');
    }

    if (signalPulseResult.status === 'fulfilled') {
      setSignalPulse(Array.isArray(signalPulseResult.value.data?.data) ? signalPulseResult.value.data.data : []);
      setSignalPulseTimeframe(signalPulseResult.value.data?.timeframe || 'daily');
    } else {
      setSignalPulse([]);
      setSignalPulseError('Signal pulse is unavailable or the backend flag is disabled.');
    }

    setLoading(false);
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
        <div>
          <h2>Investor Insights</h2>
          <p className="panel__hint">Best-entry scoring and signal pulse output from the backend.</p>
        </div>
        <button onClick={() => void fetchInsights()}>Refresh</button>
      </div>

      <div className="panel-tabs" role="tablist" aria-label="Insight sections">
        <button className={activeTab === 'entry' ? 'panel-tab active' : 'panel-tab'} onClick={() => setActiveTab('entry')}>
          Entry Signals
        </button>
        <button
          className={activeTab === 'signal-pulse' ? 'panel-tab active' : 'panel-tab'}
          onClick={() => setActiveTab('signal-pulse')}
        >
          Signal Pulse
        </button>
      </div>

      {activeTab === 'entry' && (
        <>
          {error && <p className="panel__error">{error}</p>}
          {signals.length === 0 && !error && <p>No insight candidates available yet.</p>}

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
        </>
      )}

      {activeTab === 'signal-pulse' && (
        <>
          <p className="panel__hint">Timeframe: {signalPulseTimeframe}</p>
          {signalPulseError && <p className="panel__error">{signalPulseError}</p>}
          {signalPulse.length === 0 && !signalPulseError && <p>No signal pulse entries available yet.</p>}

          <div className="insights-grid">
            {signalPulse.map((item, index) => {
              const pulseKey = item.symbol ? `${item.symbol}-${index}` : `pulse-${index}`;
              const signalKind = getPulseKind(item).replace(/_/g, ' ');
              const rsi = extractNumericMetric(item, 'rsi');
              const emaShort = extractNumericMetric(item, 'emaShort');
              const emaLong = extractNumericMetric(item, 'emaLong');
              const currentPrice = extractNumericMetric(item, 'currentPrice');
              const confidenceClass = typeof item.confidence === 'string' ? item.confidence.toLowerCase() : 'medium';

              return (
                <article key={pulseKey} className="insight-card">
                  <header>
                    <h3>{item.symbol || 'Unknown symbol'}</h3>
                    <span className={`insight-confidence ${confidenceClass}`}>{item.confidence || signalPulseTimeframe}</span>
                  </header>
                  <p>
                    Signal: <strong>{signalKind}</strong>
                  </p>
                  {typeof item.score === 'number' && (
                    <p>
                      Score: <strong>{formatNumber(item.score, 0)}</strong>
                    </p>
                  )}
                  <p>
                    Price: {formatNumber(currentPrice)} | RSI: {formatNumber(rsi)}
                  </p>
                  <p>
                    EMA short: {formatNumber(emaShort)} | EMA long: {formatNumber(emaLong)}
                  </p>
                  {(item.snapshotAt || item.generatedAt) && (
                    <p>Updated: {new Date(item.snapshotAt || item.generatedAt || '').toLocaleString()}</p>
                  )}
                  {Array.isArray(item.reasons) && item.reasons.length > 0 && <p>Reasons: {item.reasons.join(', ')}</p>}
                  {Array.isArray(item.cautions) && item.cautions.length > 0 && <p>Cautions: {item.cautions.join(', ')}</p>}
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
