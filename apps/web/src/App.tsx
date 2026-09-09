import { Navigate, Route, Routes } from 'react-router-dom'
import { MarketsPage } from './pages/MarketsPage'
import { OrdersPage } from './pages/OrdersPage'
import { PortfolioPage } from './pages/PortfolioPage'
import { SettingsPage } from './pages/SettingsPage'
import TradingPage from './pages/TradingPage'
import { WalletPage } from './pages/WalletPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/trade" replace />} />
      <Route path="/trade/:symbol?" element={<TradingPage />} />
      <Route path="/markets" element={<MarketsPage />} />
      <Route path="/portfolio" element={<PortfolioPage />} />
      <Route path="/orders" element={<OrdersPage />} />
      <Route path="/wallet" element={<WalletPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/trade" replace />} />
    </Routes>
  )
}
