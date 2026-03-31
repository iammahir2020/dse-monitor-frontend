# 📈 DSE Live Monitor & Alert System
> **Product Requirements & Feature Roadmap**

This document serves as the single source of truth for the project's functional scope, architectural goals, and development phases.

---

## 🎯 Project Overview
A real-time stock monitoring solution for the Dhaka Stock Exchange (DSE), providing live data visualization via a React web interface and automated price alerts via a Telegram Bot.

---

## 🚀 Phase 1: Core Engine (High Priority)
*Focus: Data integrity and real-time visibility.*

### 1. Live Market Dashboard
- [ ] **Real-time Ticker Grid**: A high-performance table rendering all 400+ DSE stocks.
- [ ] **Instant Search/Filter**: A fuzzy-search bar to find stocks by symbol (e.g., "BRACBANK").
- [ ] **Watchlist Management**: Ability to "Star" stocks to keep them at the top of the UI.
- [ ] **Visual Cues**: Red/Green color coding based on price change percentage.

### 2. The Ingestion Engine (Python)
- [ ] **Stream-to-Node**: Efficiently piping large JSON chunks from `bdshare` to the Express API.
- [ ] **Auto-Refresh**: Scraper triggers every 5 minutes during market hours (10:00 AM - 2:30 PM).
- [ ] **Data Cleaning**: Stripping commas and handling `NaN` values before the data hits the UI.

---

## 🔔 Phase 2: Automation & Alerts
*Focus: Keeping the user informed without the app being open.*

### 3. Telegram Bot Integration
- [ ] **Price Threshold Alerts**: Command `/alert [SYMBOL] [PRICE]` to set a trigger.
- [ ] **Push Notifications**: Instant Telegram message when a stock hits or crosses the target price.
- [ ] **Market Status Updates**: A daily summary at 10:00 AM (Open) and 2:30 PM (Close).

### 4. Basic Portfolio Tracker
- [ ] **Cost Basis Input**: Users can enter their "Buy Price" and "Quantity."
- [ ] **Unrealized P/L**: Live calculation of profit/loss based on current LTP (Last Traded Price).

---

## 📊 Phase 3: Analytics & UX
*Focus: Advanced insights and professional UI.*

### 5. Market Sentiment Tools
- [ ] **Advance/Decline Ratio**: A dashboard widget showing overall market health (How many up vs. down).
- [ ] **Top 10 Movers**: Automatic identification of top gainers and top losers by volume and percentage.

### 6. Enhanced UI (React)
- [ ] **Dark Mode Support**: Essential for "trader-style" dashboards.
- [ ] **Mobile Responsiveness**: Clean view for checking prices on the go via smartphone browsers.

---

## 🛠 Technical Stack
| Layer | Technology |
| :--- | :--- |
| **Frontend** | React + Vite + Tailwind CSS |
| **Backend API** | Node.js (Express) |
| **Data Scraper** | Python (bdshare + pandas) |
| **Messaging** | Telegram Bot API |
| **Deployment** | Separate Repos (Frontend / Backend) |

---

## 📝 Change Log
- **2024-05-22**: Initial Feature Roadmap defined.
- **Current Task**: Stabilizing Python-to-Node JSON stream.