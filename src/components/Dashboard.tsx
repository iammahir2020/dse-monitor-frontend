import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Bell, AlertTriangle, ChevronLeft, ChevronRight, Search, BarChart3, Star, Briefcase, TrendingUp } from 'lucide-react';
import {
  getStockLiveData,
  getAllAlerts,
  getWatchlist,
  getBackendBaseUrl,
  type Stock,
  type Alert,
  type WatchlistItem,
} from '../services/api.ts';
import StockTable from './StockTable';
import AlertModal from './AlertModal';
import SearchModal from './SearchModal';
import MarketSentiment from './MarketSentiment';
import Watchlist from './Watchlist';
import Portfolio from './Portfolio';
import '../styles/Dashboard.css';

type ActiveTab = 'stocks' | 'watchlist' | 'portfolio' | 'sentiment';

export default function Dashboard() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [filteredStocks, setFilteredStocks] = useState<Stock[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('stocks');
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);

  const autoRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchData();
    return () => {
      if (autoRefreshTimerRef.current) clearTimeout(autoRefreshTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  useEffect(() => {
    filterStocks(stocks, searchQuery);
  }, [stocks, searchQuery]);

  const filterStocks = (stockList: Stock[], query: string) => {
    if (!query.trim()) {
      setFilteredStocks(stockList);
      return;
    }
    const lowerQuery = query.toLowerCase().trim();
    const filtered = stockList.filter(stock => {
      const symbol = stock.symbol?.toUpperCase() || '';
      const company = stock.company || '';
      return (
        symbol.toLowerCase().includes(lowerQuery) ||
        company.toLowerCase().includes(lowerQuery)
      );
    });
    setFilteredStocks(filtered);
  };

  const fetchData = async (page = 1) => {
    try {
      setError(null);
      const [stockRes, alertRes, watchlistRes] = await Promise.all([
        getStockLiveData(page, pageSize),
        getAllAlerts(),
        getWatchlist(),
      ]);
      setStocks(stockRes.data.data || []);
      setAlerts(alertRes || []);
      setWatchlist(watchlistRes || []);
      setCurrentPage(stockRes.data.pagination?.currentPage || page);
      setTotalItems(stockRes.data.pagination?.totalRecords || 0);
      setTotalPages(stockRes.data.pagination?.totalPages || 0);
      setHasNextPage(stockRes.data.pagination?.hasNextPage ?? false);
      setHasPrevPage(stockRes.data.pagination?.hasPrevPage ?? false);
      setLastUpdated(new Date());
      setLoading(false);
    } catch (err) {
      console.error('❌ Error fetching data:', (err as Error).message);
      setError((err as Error).message);
      setLoading(false);
    }
  };

  const handleAlertCreated = () => {
    setShowAlertModal(false);
    fetchData(currentPage);
  };

  const getAlertsForSymbol = (symbol: string): Alert[] => {
    return alerts.filter(a => a.symbol === symbol);
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchData(currentPage);
    if (autoRefreshTimerRef.current) clearTimeout(autoRefreshTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
  };

  const handlePreviousPage = () => {
    if (hasPrevPage) {
      setLoading(true);
      fetchData(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (hasNextPage) {
      setLoading(true);
      fetchData(currentPage + 1);
    }
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value);
    setPageSize(newSize);
    setCurrentPage(1);
    setLoading(true);
    fetchData(1);
  };

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <div className="dashboard__title-section">
          <h1>DSE Monitor</h1>
          <p className="dashboard__subtitle">Real-time stock monitoring and alerts</p>
        </div>

        <div className="dashboard__controls">
          {activeTab === 'stocks' && (
            <button
              className="dashboard__search-global"
              onClick={() => setShowSearchModal(true)}
              title="Global search"
            >
              <Search size={18} />
              <span>Search stocks...</span>
            </button>
          )}

          {activeTab === 'stocks' && searchQuery && (
            <button className="dashboard__search-clear" onClick={() => setSearchQuery('')}>
              Clear
            </button>
          )}

          <div className="dashboard__time-info">
            {lastUpdated && (
              <span className="dashboard__update-time">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>

          <button className="dashboard__refresh-btn" onClick={handleRefresh} disabled={loading}>
            <RefreshCw size={20} className={loading ? 'rotating' : ''} />
          </button>

          <button
            className="dashboard__alerts-btn"
            onClick={() => setShowAlertModal(true)}
          >
            <Bell size={20} />
            {alerts.length > 0 && <span className="dashboard__badge">{alerts.length}</span>}
          </button>
        </div>
      </div>

      <div className="dashboard__tabs">
        <button
          className={`dashboard__tab ${activeTab === 'stocks' ? 'active' : ''}`}
          onClick={() => setActiveTab('stocks')}
        >
          <BarChart3 size={18} />
          <span>Markets</span>
        </button>
        <button
          className={`dashboard__tab ${activeTab === 'watchlist' ? 'active' : ''}`}
          onClick={() => setActiveTab('watchlist')}
        >
          <Star size={18} />
          <span>Watchlist</span>
        </button>
        <button
          className={`dashboard__tab ${activeTab === 'portfolio' ? 'active' : ''}`}
          onClick={() => setActiveTab('portfolio')}
        >
          <Briefcase size={18} />
          <span>Portfolio</span>
        </button>
        <button
          className={`dashboard__tab ${activeTab === 'sentiment' ? 'active' : ''}`}
          onClick={() => setActiveTab('sentiment')}
        >
          <TrendingUp size={18} />
          <span>Market Sentiment</span>
        </button>
      </div>

      <div className="dashboard__content">
        {error && (
          <div className="dashboard__error">
            <AlertTriangle size={24} />
            <div className="dashboard__error-content">
              <h3>Connection Error</h3>
              <p>{error}</p>
              <p className="dashboard__error-hint">
                Make sure backend server is running on {getBackendBaseUrl()}
              </p>
              <button className="btn btn--primary" onClick={handleRefresh}>
                Retry Connection
              </button>
            </div>
          </div>
        )}

        {activeTab === 'stocks' && (
          <>
            {loading && stocks.length === 0 && !error ? (
              <div className="dashboard__loading">
                <div className="loading-spinner"></div>
                <p>Loading market data...</p>
              </div>
            ) : (
              <>
                {filteredStocks.length > 0 ? (
                  <StockTable
                    stocks={filteredStocks}
                    alerts={alerts}
                    watchlist={watchlist}
                    getAlertsForSymbol={getAlertsForSymbol}
                    onSelectStock={setSelectedStock}
                    onWatchlistUpdate={() => {}}
                  />
                ) : (
                  <div className="dashboard__no-data">
                    <p>{searchQuery ? `No stocks match "${searchQuery}"` : 'No stock data available'}</p>
                  </div>
                )}

                {stocks.length > 0 && !searchQuery && (
                  <div className="dashboard__pagination">
                    <div className="pagination__info">
                      <span>Showing {stocks.length} of {totalItems} stocks</span>
                      <select
                        className="pagination__size-select"
                        value={pageSize}
                        onChange={handlePageSizeChange}
                      >
                        <option value="10">10 per page</option>
                        <option value="20">20 per page</option>
                        <option value="50">50 per page</option>
                        <option value="100">100 per page</option>
                      </select>
                    </div>
                    <div className="pagination__controls">
                      <button
                        className="pagination__btn"
                        onClick={handlePreviousPage}
                        disabled={!hasPrevPage || loading}
                      >
                        <ChevronLeft size={20} />
                        Previous
                      </button>
                      <div className="pagination__info-center">
                        <span>Page {currentPage} of {totalPages}</span>
                      </div>
                      <button
                        className="pagination__btn"
                        onClick={handleNextPage}
                        disabled={!hasNextPage || loading}
                      >
                        Next
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === 'watchlist' && <Watchlist key={watchlist.length} />}
        {activeTab === 'portfolio' && <Portfolio />}
        {activeTab === 'sentiment' && <MarketSentiment />}
      </div>

      {showSearchModal && (
        <SearchModal
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          onWatchlistAdded={() => void fetchData(currentPage)}
        />
      )}

      {showAlertModal && (
        <AlertModal
          stock={selectedStock}
          onClose={() => setShowAlertModal(false)}
          onAlertCreated={handleAlertCreated}
        />
      )}
    </div>
  );
}
