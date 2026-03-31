import { TrendingUp, TrendingDown, AlertCircle, Star } from 'lucide-react';
import { addToWatchlist, removeFromWatchlist, Stock, Alert, WatchlistItem } from '../services/api';
import '../styles/StockTable.css';

interface StockTableProps {
  stocks: Stock[];
  alerts: Alert[];
  watchlist: WatchlistItem[];
  getAlertsForSymbol: (symbol: string) => Alert[];
  onSelectStock: (stock: Stock) => void;
  onWatchlistUpdate?: () => void;
}

export default function StockTable({ stocks, alerts: _alerts, watchlist, getAlertsForSymbol, onSelectStock, onWatchlistUpdate }: StockTableProps) {
  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '-';
    return parseFloat(String(num)).toFixed(2);
  };

  const formatVolume = (vol: number | null | undefined): string => {
    if (vol === null || vol === undefined) return '-';
    if (vol >= 1000000) return (vol / 1000000).toFixed(1) + 'M';
    if (vol >= 1000) return (vol / 1000).toFixed(1) + 'K';
    return vol.toString();
  };

  const isInWatchlist = (symbol: string): boolean => {
    return watchlist?.some(item => item.symbol === symbol);
  };

  const handleWatchlistToggle = async (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    try {
      if (isInWatchlist(symbol)) {
        await removeFromWatchlist(symbol);
      } else {
        await addToWatchlist(symbol);
      }
      onWatchlistUpdate?.();
    } catch (error) {
      console.error('Error toggling watchlist:', error);
    }
  };

  return (
    <div className="stock-table-wrapper">
      <table className="stock-table">
        <thead>
          <tr>
            <th>Watchlist</th>
            <th>Symbol</th>
            <th>Company</th>
            <th>LTP (BDT )</th>
            <th>Change</th>
            <th>Change %</th>
            <th>High</th>
            <th>Low</th>
            <th>Volume</th>
            <th>Alerts</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((stock) => {
            const isPositive = stock.change >= 0;
            const hasAlerts = getAlertsForSymbol(stock.symbol).length > 0;
            const changePercent = stock.change_percent || 0;
            const inWatchlist = isInWatchlist(stock.symbol);

            return (
              <tr key={stock.symbol} className="stock-row" onClick={() => onSelectStock(stock)}>
                <td className="stock-watchlist">
                  <button
                    className={`watchlist-btn ${inWatchlist ? 'active' : ''}`}
                    onClick={(e) => handleWatchlistToggle(e, stock.symbol)}
                    title={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
                  >
                    <Star size={18} fill={inWatchlist ? 'currentColor' : 'none'} />
                  </button>
                </td>
                <td className="stock-symbol">
                  <span className="symbol-badge">{stock.symbol?.toUpperCase() || '-'}</span>
                </td>
                <td className="stock-company">{stock.company || '-'}</td>
                <td className="stock-price">
                  <span className="price-highlight">BDT {formatNumber(stock.ltp)}</span>
                </td>
                <td className={`stock-change ${isPositive ? 'positive' : 'negative'}`}>
                  <span className="change-value">
                    {isPositive ? '+' : ''}{formatNumber(stock.change)}
                  </span>
                </td>
                <td className={`stock-percent ${isPositive ? 'positive' : 'negative'}`}>
                  <div className="percent-content">
                    {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    <span>{formatNumber(changePercent)}%</span>
                  </div>
                </td>
                <td className="stock-high">
                  <span className="high-value">BDT {formatNumber(stock.high)}</span>
                </td>
                <td className="stock-low">
                  <span className="low-value">BDT {formatNumber(stock.low)}</span>
                </td>
                <td className="stock-volume">
                  <span className="volume-value">{formatVolume(stock.volume)}</span>
                </td>
                <td className="stock-alerts">
                  {hasAlerts ? (
                    <div className="alert-badge">
                      <AlertCircle size={16} />
                      <span>{getAlertsForSymbol(stock.symbol).length}</span>
                    </div>
                  ) : (
                    <span className="no-alerts">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
