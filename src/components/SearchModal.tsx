import { useState, useEffect, useCallback } from 'react';
import { X, TrendingUp, TrendingDown, Search as SearchIcon } from 'lucide-react';
import { addToWatchlist, getLiveStockBySymbol, searchStocks, Stock } from '../services/api';
import { debounce } from '../utils/debounce';
import '../styles/SearchModal.css';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWatchlistAdded?: () => void;
}

const SEARCH_DEBOUNCE_DELAY = 500;

export default function SearchModal({ isOpen, onClose, onWatchlistAdded }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [watchlistMessage, setWatchlistMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.trim().length < 1) {
        setResults([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const res = await searchStocks(searchQuery);
        setResults(res.data || []);
      } catch (err) {
        console.error('Error searching:', err);
        setError('Failed to search stocks');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, SEARCH_DEBOUNCE_DELAY),
    []
  );

  useEffect(() => {
    if (query.trim().length > 0) {
      setLoading(true);
      debouncedSearch(query);
    } else {
      setResults([]);
    }
  }, [query, debouncedSearch]);

  const handleSelectStock = async (stock: Stock) => {
    setSelectedStock(stock);
    setDetailLoading(true);
    setWatchlistMessage(null);
    try {
      const response = await getLiveStockBySymbol(stock.symbol);
      setSelectedStock(response.data);
    } catch {
      setError('Unable to fetch complete stock details. Showing matched result only.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedStock(null);
    setWatchlistMessage(null);
  };

  const handleAddToWatchlist = async () => {
    if (!selectedStock?.symbol) {
      return;
    }

    setWatchlistLoading(true);
    setWatchlistMessage(null);
    try {
      await addToWatchlist(selectedStock.symbol.toUpperCase());
      setWatchlistMessage('Added to watchlist.');
      onWatchlistAdded?.();
    } catch {
      setWatchlistMessage('Could not add to watchlist. Please make sure you are logged in.');
    } finally {
      setWatchlistLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '-';
    return parseFloat(String(num)).toFixed(2);
  };

  return (
    <div className="search-modal-overlay" onClick={onClose}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-modal__header">
          <h2>Search Stocks</h2>
          <button className="search-modal__close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {!selectedStock ? (
          <>
            <div className="search-modal__input-wrapper">
              <SearchIcon size={20} className="search-modal__input-icon" />
              <input
                type="text"
                className="search-modal__input"
                placeholder="Search by symbol or company name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              {query && (
                <button className="search-modal__clear" onClick={() => setQuery('')}>
                  <X size={18} />
                </button>
              )}
            </div>

            <div className="search-modal__content">
              {error && (
                <div className="search-modal__error"><p>{error}</p></div>
              )}
              {loading ? (
                <div className="search-modal__loading">
                  <div className="spinner"></div>
                  <p>Searching...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="search-results">
                  <p className="search-results__count">
                    Found {results.length} stock{results.length !== 1 ? 's' : ''}
                  </p>
                  <div className="search-results__list">
                    {results.map((stock) => {
                      const isPositive = (stock.change || 0) >= 0;
                      return (
                        <button
                          key={stock.symbol}
                          className="search-result-item"
                          onClick={() => handleSelectStock(stock)}
                        >
                          <div className="result-item__left">
                            <div className="result-item__symbol">{stock.symbol?.toUpperCase()}</div>
                            <div className="result-item__company">{stock.company || 'N/A'}</div>
                          </div>
                          <div className="result-item__right">
                            <div className="result-item__price">BDT {formatNumber(stock.ltp)}</div>
                            <div className={`result-item__change ${isPositive ? 'positive' : 'negative'}`}>
                              {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                              <span>{formatNumber(stock.change_percent || 0)}%</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : query && !loading ? (
                <div className="search-modal__no-results">
                  <p>No stocks found for "{query}"</p>
                </div>
              ) : (
                <div className="search-modal__placeholder">
                  <p>Start typing to search for stocks...</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <button className="search-modal__back" onClick={handleBack}>← Back to Results</button>
            <div className="stock-detail">
              {detailLoading && (
                <div className="search-modal__loading">
                  <div className="spinner"></div>
                  <p>Loading complete stock details...</p>
                </div>
              )}

              <div className="stock-detail__header">
                <div>
                  <h3 className="stock-detail__symbol">{selectedStock.symbol?.toUpperCase()}</h3>
                  <p className="stock-detail__company">{selectedStock.company}</p>
                </div>
                <div className="stock-detail__price">
                  <div className="price-value">BDT {formatNumber(selectedStock.ltp)}</div>
                  <div className={`price-change ${(selectedStock.change || 0) >= 0 ? 'positive' : 'negative'}`}>
                    {(selectedStock.change || 0) >= 0 ? '+' : ''}{formatNumber(selectedStock.change)}
                  </div>
                </div>
              </div>

              <div className="stock-detail__stats">
                <div className="stat">
                  <span className="stat__label">High</span>
                  <span className="stat__value">BDT {formatNumber(selectedStock.high)}</span>
                </div>
                <div className="stat">
                  <span className="stat__label">Low</span>
                  <span className="stat__value">BDT {formatNumber(selectedStock.low)}</span>
                </div>
                <div className="stat">
                  <span className="stat__label">Volume</span>
                  <span className="stat__value">
                    {selectedStock.volume >= 1000000
                      ? (selectedStock.volume / 1000000).toFixed(1) + 'M'
                      : selectedStock.volume >= 1000
                      ? (selectedStock.volume / 1000).toFixed(1) + 'K'
                      : selectedStock.volume}
                  </span>
                </div>
                <div className="stat">
                  <span className="stat__label">Change %</span>
                  <span className={`stat__value ${(selectedStock.change_percent || 0) >= 0 ? 'positive' : 'negative'}`}>
                    {(selectedStock.change_percent || 0) >= 0 ? '+' : ''}{formatNumber(selectedStock.change_percent)}%
                  </span>
                </div>
              </div>

              <div className="stock-detail__history">
                <p className="history-empty">Historical price data is not available.</p>
              </div>

              <div className="stock-detail__actions">
                <button onClick={() => void handleAddToWatchlist()} disabled={watchlistLoading}>
                  {watchlistLoading ? 'Adding...' : 'Add to Watchlist'}
                </button>
                {watchlistMessage && <p>{watchlistMessage}</p>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
