import { useState, useEffect } from 'react';
import { Trash2, Edit2, Plus } from 'lucide-react';
import {
  getPortfolioWithPnL,
  addToPortfolio,
  updatePortfolioHolding,
  deletePortfolioHolding,
  searchStocks,
  PortfolioHolding,
  Stock,
} from '../services/api';
import '../styles/Portfolio.css';

interface FormData {
  symbol: string;
  quantity: string;
  buyPrice: string;
  notes: string;
}

export default function Portfolio() {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [symbolSuggestions, setSymbolSuggestions] = useState<Stock[]>([]);
  const [formData, setFormData] = useState<FormData>({
    symbol: '',
    quantity: '',
    buyPrice: '',
    notes: ''
  });

  useEffect(() => {
    fetchPortfolio();
  }, []);

  useEffect(() => {
    const symbol = formData.symbol.trim();
    if (!symbol) {
      setSymbolSuggestions([]);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await searchStocks(symbol);
        setSymbolSuggestions(response.data || []);
      } catch {
        setSymbolSuggestions([]);
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [formData.symbol]);

  const fetchPortfolio = async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await getPortfolioWithPnL();
      setHoldings(res);
    } catch (err) {
      console.error('Error fetching portfolio:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.symbol || !formData.quantity || !formData.buyPrice) {
      alert('Please fill all required fields');
      return;
    }
    try {
      await addToPortfolio(
        formData.symbol,
        parseFloat(formData.quantity),
        parseFloat(formData.buyPrice),
        formData.notes
      );
      setFormData({ symbol: '', quantity: '', buyPrice: '', notes: '' });
      setShowForm(false);
      fetchPortfolio();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleUpdateHolding = async (id: string) => {
    try {
      await updatePortfolioHolding(
        id,
        parseFloat(formData.quantity),
        parseFloat(formData.buyPrice),
        formData.notes
      );
      setEditingId(null);
      setFormData({ symbol: '', quantity: '', buyPrice: '', notes: '' });
      fetchPortfolio();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDeleteHolding = async (id: string) => {
    if (confirm('Delete this holding?')) {
      try {
        await deletePortfolioHolding(id);
        fetchPortfolio();
      } catch (err) {
        setError((err as Error).message);
      }
    }
  };

  const totalInvestment = holdings.reduce((sum, h) => sum + (h.costBasis ?? 0), 0);
  const totalValue = holdings.reduce((sum, h) => sum + (h.currentValue ?? 0), 0);
  const totalPnL = totalValue - totalInvestment;
  const totalPnLPercent = totalInvestment === 0 ? '0.00' : ((totalPnL / totalInvestment) * 100).toFixed(2);

  if (loading) {
    return <div className="portfolio">Loading portfolio...</div>;
  }

  return (
    <div className="portfolio">
      <div className="portfolio__header">
        <h2>My Portfolio</h2>
        <button
          className="portfolio__btn-add"
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData({ symbol: '', quantity: '', buyPrice: '', notes: '' });
          }}
        >
          <Plus size={18} /> Add Holding
        </button>
      </div>

      {error && (
        <div className="portfolio__error">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {showForm && (
        <form className="portfolio__form" onSubmit={editingId ? (e) => { e.preventDefault(); handleUpdateHolding(editingId); } : handleAddHolding}>
          <div className="form-row">
            <input
              type="text"
              list="portfolio-symbol-suggestions"
              placeholder="Symbol (e.g., BRACBANK)"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
              required
              disabled={!!editingId}
            />
            <datalist id="portfolio-symbol-suggestions">
              {symbolSuggestions.map((item) => (
                <option key={item.symbol} value={item.symbol}>
                  {item.company}
                </option>
              ))}
            </datalist>
            <input
              type="number"
              placeholder="Quantity"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              required
            />
            <input
              type="number"
              step="0.01"
              placeholder="Buy Price (BDT )"
              value={formData.buyPrice}
              onChange={(e) => setFormData({ ...formData, buyPrice: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Notes (optional)"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-submit">
              {editingId ? 'Update' : 'Add'} Holding
            </button>
            <button
              type="button"
              className="btn-cancel"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setFormData({ symbol: '', quantity: '', buyPrice: '', notes: '' });
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {holdings.length > 0 && (
        <>
          <div className="portfolio__summary">
            <div className="summary-card">
              <div className="summary-label">Total Investment</div>
              <div className="summary-value">BDT {totalInvestment.toFixed(2)}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Current Value</div>
              <div className="summary-value">BDT {totalValue.toFixed(2)}</div>
            </div>
            <div className="summary-card">
              <div className={`summary-value ${totalPnL >= 0 ? 'positive' : 'negative'}`}>
                {totalPnL >= 0 ? '+' : ''}BDT {totalPnL.toFixed(2)}
              </div>
              <div className="summary-label">{totalPnLPercent}%</div>
            </div>
          </div>

          <div className="portfolio__holdings">
            {holdings.map(holding => (
             <div key={holding.id} className="holding-card">
             <div className="card-main-content">
               <div className="holding-info">
                 <div className="symbol-badge">{holding.symbol}</div>
                 <div className="holding-details">
                   <div className="detail-item">
                     <span className="label">Qty</span>
                     <span className="value">{holding.quantity}</span>
                   </div>
                   <div className="detail-item">
                     <span className="label">Avg. Buy</span>
                     <span className="value">৳{holding.buyPrice.toFixed(2)}</span>
                   </div>
                   <div className="detail-item">
                     <span className="label">Current</span>
                     <span className="value">৳{holding.currentPrice?.toFixed(2) || '0.00'}</span>
                   </div>
                 </div>
               </div>
           
               <div className="holding-stats">
                 <div className={`pnl-group ${holding.unrealizedPnL >= 0 ? 'positive' : 'negative'}`}>
                   <div className="pnl-value">
                     {holding.unrealizedPnL >= 0 ? '▲' : '▼'} ৳{Math.abs(holding.unrealizedPnL || 0).toFixed(2)}
                   </div>
                   <div className="pnl-percent">{holding.pnlPercentage}%</div>
                 </div>
               </div>
             </div>
           
             <div className="holding-actions">
               <button
                 className="btn-action btn-edit"
                 title="Edit Holding"
                 onClick={() => {
                   setEditingId(holding.id);
                   setShowForm(true);
                   setFormData({
                     symbol: holding.symbol,
                     quantity: String(holding.quantity),
                     buyPrice: String(holding.buyPrice),
                     notes: holding.notes || '',
                   });
                 }}
               >
                 <Edit2 size={16} />
               </button>
               <button className="btn-action btn-delete" title="Delete Holding" onClick={() => void handleDeleteHolding(holding.id)}>
                 <Trash2 size={16} />
               </button>
             </div>
           </div>
            ))}
          </div>
        </>
      )}

      {holdings.length === 0 && !showForm && (
        <div className="portfolio__empty">
          <p>No holdings yet. Add your first stock holding!</p>
        </div>
      )}
    </div>
  );
}
