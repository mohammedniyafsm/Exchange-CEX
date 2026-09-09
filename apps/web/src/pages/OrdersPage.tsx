import { useEffect, useState } from 'react'
import { mockApi } from '../services/mockApi'
import type { Order } from '../types'

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    void mockApi.getOrders().then(setOrders)
  }, [])

  const cancelOrder = async (id: string) => {
    await mockApi.cancelOrder(id)
    setOrders((current) => current.map((order) => (order.id === id ? { ...order, status: 'CANCELLED' } : order)))
  }

  return (
    <div className="mx-auto max-w-[1200px] p-6 text-text">
      <div className="panel overflow-hidden">
        <div className="flex flex-wrap gap-2 border-b border-border bg-panelAlt/80 p-3 text-[10px] uppercase tracking-[0.14em] text-muted">
          <button className="tab-btn tab-btn-active">Open Orders</button>
          <button className="tab-btn">Order History</button>
          <button className="tab-btn">Trade History</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-panelAlt text-[10px] uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="px-4 py-3">Pair</th>
                <th className="px-4 py-3">Side</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-border">
                  <td className="px-4 py-3 text-text">{order.pair}</td>
                  <td className={`px-4 py-3 ${order.side === 'BUY' ? 'text-buy' : 'text-sell'}`}>{order.side}</td>
                  <td className="px-4 py-3 text-text">{order.type}</td>
                  <td className="num px-4 py-3 text-text">{order.amount}</td>
                  <td className="num px-4 py-3 text-text">${order.price.toLocaleString()}</td>
                  <td className={`px-4 py-3 ${order.status === 'CANCELLED' ? 'text-sell' : order.status === 'FILLED' ? 'text-buy' : 'text-muted'}`}>{order.status}</td>
                  <td className="px-4 py-3">
                    {order.status === 'OPEN' ? (
                      <button onClick={() => void cancelOrder(order.id)} className="rounded border border-border bg-panelAlt px-2 py-1 text-xs text-muted hover:text-text">
                        Cancel
                      </button>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
