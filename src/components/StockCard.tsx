import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { Stock } from '../services/api';
import '../styles/StockCard.css';

interface StockCardProps {
  stock: Stock;
  onSelectStock: (stock: Stock) => void;
  hasAlerts: boolean;
}

export default function StockCard({ stock, onSelectStock, hasAlerts }: StockCardProps) {
  const isPositive = stock.change >= 0;
  const changePercent = stock.change_percent || 0;

  return (
    <div className="stock-card" onClick={() => onSelectStock(stock)}>
      <div className="stock-card__header">
        <div className="stock-card__symbol">
          <h3>{stock.symbol}</h3>
          {hasAlerts && <AlertCircle size={16} className="stock-card__alert-icon" />}
        </div>
        <div className={`stock-card__change ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          <span>{changePercent.toFixed(2)}%</span>
        </div>
      </div>

      <div className="stock-card__body">
        <div className="stock-card__price">
          <span className="stock-card__label">Price</span>
          <h2>BDT {stock.ltp?.toFixed(2)}</h2>
        </div>
        <div className="stock-card__details">
          <div className="stock-card__detail">
            <span>High</span>
            <p>BDT {stock.high?.toFixed(2)}</p>
          </div>
          <div className="stock-card__detail">
            <span>Low</span>
            <p>BDT {stock.low?.toFixed(2)}</p>
          </div>
          <div className="stock-card__detail">
            <span>Volume</span>
            <p>{(stock.volume / 1000000).toFixed(1)}M</p>
          </div>
        </div>
      </div>

      <div className="stock-card__footer">
        <span className="stock-card__company">{stock.company}</span>
      </div>
    </div>
  );
}
