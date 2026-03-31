import { useState, useEffect } from 'react';
import { Star, Trash2 } from 'lucide-react';
import {
  addToWatchlist,
  getWatchlist,
  removeFromWatchlist,
  searchStocks,
  Stock,
  WatchlistItem,
} from '../services/api';
import StockDetailModal from './StockDetailModal';
import '../styles/Watchlist.css';

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [symbolInput, setSymbolInput] = useState('');
  const [suggestions, setSuggestions] = useState<Stock[]>([]);
  const [adding, setAdding] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  useEffect(() => {
    fetchWatchlist();
  }, []);

  useEffect(() => {
    if (!symbolInput.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const response = await searchStocks(symbolInput.trim());
        setSuggestions(Array.isArray(response.data) ? response.data.slice(0, 8) : []);
      } catch {
        setSuggestions([]);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
    };
  }, [symbolInput]);

  const fetchWatchlist = async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await getWatchlist();
      setWatchlist(res);
    } catch (err) {
      console.error('Error fetching watchlist:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (symbol: string) => {
    try {
      await removeFromWatchlist(symbol);
      await fetchWatchlist();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleAdd = async () => {
    const normalizedSymbol = symbolInput.trim().toUpperCase();
    if (!normalizedSymbol) {
      setError('Please enter a stock symbol.');
      return;
    }

    if (watchlist.some((item) => item.symbol.toUpperCase() === normalizedSymbol)) {
      setError(`${normalizedSymbol} is already in your watchlist.`);
      return;
    }

    try {
      setError(null);
      setAdding(true);
      await addToWatchlist(normalizedSymbol);
      setSymbolInput('');
      setSuggestions([]);
      await fetchWatchlist();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return <div className="watchlist">Loading watchlist...</div>;
  }

  return (
    <div className="watchlist">
      <div className="watchlist__header">
        <h2>My Watchlist</h2>
        <span className="watchlist__count">{watchlist.length} stocks</span>
      </div>

      {error && (
        <div className="watchlist__error">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="watchlist__add">
        <input
          type="text"
          value={symbolInput}
          onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
          placeholder="Add symbol (e.g. BATBC)"
          list="watchlist-symbol-suggestions"
        />
        <datalist id="watchlist-symbol-suggestions">
          {suggestions.map((stock) => (
            <option key={stock.symbol} value={stock.symbol}>
              {stock.company}
            </option>
          ))}
        </datalist>
        <button onClick={() => void handleAdd()} disabled={adding || !symbolInput.trim()}>
          {adding ? 'Adding...' : 'Add to Watchlist'}
        </button>
      </div>

      {watchlist.length > 0 ? (
        <div className="watchlist__items">
          {watchlist.map(item => (
            <div key={item.id} className="watchlist-item">
              <div className="watchlist-item__content" onClick={() => setSelectedSymbol(item.symbol)}>
                <Star size={18} className="watchlist-item__star" />
                <span className="watchlist-item__symbol">{item.symbol}</span>
                <span className="watchlist-item__date">
                  Added {new Date(item.addedAt).toLocaleDateString()}
                </span>
              </div>
              <button
                className="watchlist-item__remove"
                onClick={() => handleRemove(item.symbol)}
                title="Remove from watchlist"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="watchlist__empty">
          <p>No stocks in your watchlist yet.</p>
          <p className="watchlist__empty-hint">Star your favorite stocks to keep track of them!</p>
        </div>
      )}

      <StockDetailModal
        symbol={selectedSymbol || ''}
        isOpen={selectedSymbol !== null}
        onClose={() => setSelectedSymbol(null)}
      />
    </div>
  );
}
