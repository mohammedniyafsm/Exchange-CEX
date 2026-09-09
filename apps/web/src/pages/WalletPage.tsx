import { useEffect, useState } from 'react'
import { Download, Plus, Send } from 'lucide-react'
import { mockApi } from '../services/mockApi'
import type { WalletAsset } from '../types'

export function WalletPage() {
  const [assets, setAssets] = useState<WalletAsset[]>([])

  useEffect(() => {
    void mockApi.getWallet().then(setAssets)
  }, [])

  return (
    <div className="mx-auto max-w-[1200px] p-6 text-text">
      <div className="mb-4 flex flex-wrap gap-2">
        <button className="inline-flex items-center gap-2 rounded-md border border-border bg-panelAlt px-3 py-2 text-xs uppercase tracking-[0.14em] text-text"><Plus size={14} /> Deposit</button>
        <button className="inline-flex items-center gap-2 rounded-md border border-border bg-panelAlt px-3 py-2 text-xs uppercase tracking-[0.14em] text-text"><Download size={14} /> Withdraw</button>
        <button className="inline-flex items-center gap-2 rounded-md border border-border bg-panelAlt px-3 py-2 text-xs uppercase tracking-[0.14em] text-text"><Send size={14} /> Transfer</button>
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-panelAlt text-[10px] uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">Available</th>
                <th className="px-4 py-3">In Orders</th>
                <th className="px-4 py-3">USD Value</th>
                <th className="px-4 py-3">24h %</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.symbol} className="border-t border-border">
                  <td className="px-4 py-3 font-medium text-text">{asset.symbol}</td>
                  <td className="num px-4 py-3 text-text">{asset.balance}</td>
                  <td className="num px-4 py-3 text-text">{asset.available}</td>
                  <td className="num px-4 py-3 text-text">{asset.inOrders}</td>
                  <td className="num px-4 py-3 text-text">${asset.usdValue.toLocaleString()}</td>
                  <td className={`num px-4 py-3 ${asset.change24h >= 0 ? 'text-buy' : 'text-sell'}`}>{asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
