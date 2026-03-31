import { useState, useEffect } from 'react';
import { getAdvanceDecline, getTopMovers, MarketSentiment as MarketSentimentType, TopMovers } from '../services/api';
import '../styles/MarketSentiment.css';

export default function MarketSentiment() {
  const [sentiment, setSentiment] = useState<MarketSentimentType | null>(null);
  const [movers, setMovers] = useState<TopMovers>({ gainers: [], losers: [], cacheInfo: { recordCount: 0, lastFetched: '', ageSeconds: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMarketData();
  }, []);

  const fetchMarketData = async () => {
    try {
      setError(null);
      setLoading(true);
      const [sentimentRes, moversRes] = await Promise.all([
        getAdvanceDecline(),
        getTopMovers(5)
      ]);
      setSentiment(sentimentRes.data);
      setMovers(moversRes.data);
    } catch (err) {
      console.error('Error fetching market data:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="market-sentiment">Loading market data...</div>;
  if (error) return <div className="market-sentiment">Error: {error}</div>;

  return (
    <div className="market-sentiment">
      <div className="sentiment-header">
        <h2>Market Sentiment</h2>
        <button className="sentiment-refresh" onClick={fetchMarketData}>↻</button>
      </div>

      {sentiment && (
        <div className="sentiment-grid">
          <div className="sentiment-card">
            <div className="sentiment-label">Advances</div>
            <div className="sentiment-value advance">{sentiment.advances}</div>
          </div>
          <div className="sentiment-card">
            <div className="sentiment-label">Declines</div>
            <div className="sentiment-value decline">{sentiment.declines}</div>
          </div>
          <div className="sentiment-card">
            <div className="sentiment-label">Unchanged</div>
            <div className="sentiment-value neutral">{sentiment.unchanged}</div>
          </div>
          <div className="sentiment-card">
            <div className="sentiment-label">Total</div>
            <div className="sentiment-value">{sentiment.total}</div>
          </div>
          <div className="sentiment-card">
            <div className="sentiment-label">A/D Ratio</div>
            <div className="sentiment-value">{sentiment.advanceDeclineRatio}</div>
          </div>
        </div>
      )}

      <div className="sentiment-badge" style={{
        background: sentiment?.marketSentiment === 'Bullish' ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 0, 85, 0.1)',
        borderColor: sentiment?.marketSentiment === 'Bullish' ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 0, 85, 0.3)',
        color: sentiment?.marketSentiment === 'Bullish' ? '#00ff88' : '#ff0055'
      }}>
        {sentiment?.marketSentiment} Market
      </div>

      <div className="movers-section">
        <div className="movers-group">
          <h3>Top Gainers</h3>
          <div className="movers-list">
            {movers.gainers.slice(0, 5).map(stock => (
              <div key={stock.symbol} className="mover-item gain">
                <span className="mover-symbol">{stock.symbol}</span>
                <span className="mover-change">+{stock.change?.toFixed(2) || '0.00'}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="movers-group">
          <h3>Top Losers</h3>
          <div className="movers-list">
            {movers.losers.slice(0, 5).map(stock => (
              <div key={stock.symbol} className="mover-item loss">
                <span className="mover-symbol">{stock.symbol}</span>
                <span className="mover-change">{stock.change?.toFixed(2) || '0.00'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
