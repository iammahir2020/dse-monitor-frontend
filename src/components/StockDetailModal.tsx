import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import { getLiveStockBySymbol, Stock } from '../services/api';
import '../styles/SearchModal.css';

interface StockDetailModalProps {
  symbol: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function StockDetailModal({ symbol, isOpen, onClose }: StockDetailModalProps) {
  const [stock, setStock] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && symbol) {
      fetchStockDetails();
    }
  }, [isOpen, symbol]);

  const fetchStockDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getLiveStockBySymbol(symbol);
      setStock(response.data);
    } catch (err) {
      console.error('Error fetching stock details:', err);
      setError('Unable to fetch stock details');
      setStock(null);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !stock && !loading) return null;

  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '-';
    return parseFloat(String(num)).toFixed(2);
  };

  return (
    <div className="search-modal-overlay" onClick={onClose}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-modal__header">
          <h2>Stock Details</h2>
          <button className="search-modal__close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="stock-detail">
          {loading ? (
            <div className="search-modal__loading">
              <div className="spinner"></div>
              <p>Loading stock details...</p>
            </div>
          ) : error ? (
            <div className="search-modal__error">
              <p>{error}</p>
            </div>
          ) : stock ? (
            <>
              <div className="stock-detail__header">
                <div>
                  <h3 className="stock-detail__symbol">{stock.symbol?.toUpperCase()}</h3>
                  <p className="stock-detail__company">{stock.company}</p>
                </div>
                <div className="stock-detail__price">
                  <div className="price-value">BDT {formatNumber(stock.ltp)}</div>
                  <div className={`price-change ${(stock.change || 0) >= 0 ? 'positive' : 'negative'}`}>
                    {(stock.change || 0) >= 0 ? (
                      <TrendingUp size={16} />
                    ) : (
                      <TrendingDown size={16} />
                    )}
                    <span>
                      {(stock.change || 0) >= 0 ? '+' : ''}{formatNumber(stock.change)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="stock-detail__stats">
                <div className="stat">
                  <span className="stat__label">High</span>
                  <span className="stat__value">BDT {formatNumber(stock.high)}</span>
                </div>
                <div className="stat">
                  <span className="stat__label">Low</span>
                  <span className="stat__value">BDT {formatNumber(stock.low)}</span>
                </div>
                <div className="stat">
                  <span className="stat__label">Volume</span>
                  <span className="stat__value">
                    {stock.volume >= 1000000
                      ? (stock.volume / 1000000).toFixed(1) + 'M'
                      : stock.volume >= 1000
                      ? (stock.volume / 1000).toFixed(1) + 'K'
                      : stock.volume}
                  </span>
                </div>
                <div className="stat">
                  <span className="stat__label">Change %</span>
                  <span className={`stat__value ${(stock.change_percent || 0) >= 0 ? 'positive' : 'negative'}`}>
                    {(stock.change_percent || 0) >= 0 ? '+' : ''}{formatNumber(stock.change_percent)}%
                  </span>
                </div>
              </div>

              <div className="stock-detail__history">
                <p className="history-empty">Historical price data is not available.</p>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
