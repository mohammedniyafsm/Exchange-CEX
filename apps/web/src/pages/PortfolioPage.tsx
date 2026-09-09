import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useEffect, useState } from 'react'
import { mockApi } from '../services/mockApi'
import type { Portfolio } from '../types'

const assetColors = ['#2c7bf6', '#1ad5a4', '#e8b93d', '#f55f72']
const allocation = [
  { name: 'USDT', value: 35 },
  { name: 'BTC', value: 40 },
  { name: 'ETH', value: 15 },
  { name: 'SOL', value: 10 }
]

const performance = [
  { label: '1D', value: 1.5 },
  { label: '1W', value: 5.1 },
  { label: '1M', value: 11.2 },
  { label: '3M', value: 18.4 },
  { label: '1Y', value: 42.1 }
]

export function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)

  useEffect(() => {
    void mockApi.getPortfolio().then(setPortfolio)
  }, [])

  if (!portfolio) {
    return <div className="p-8 text-text">Loading portfolio...</div>
  }

  return (
    <div className="mx-auto max-w-[1200px] p-6 text-text">
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="panel p-4">
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted">Total Balance</div>
          <div className="num mt-2 text-2xl">${portfolio.totalBalance.toLocaleString()}</div>
        </div>
        <div className="panel p-4">
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted">Today&rsquo;s P&amp;L</div>
          <div className="mt-2 text-2xl text-buy">+$284.42</div>
        </div>
        <div className="panel p-4">
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted">Total P&amp;L</div>
          <div className="mt-2 text-2xl text-buy">+$1,842.31</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <div className="panel p-4">
          <div className="mb-4 text-[10px] uppercase tracking-[0.16em] text-muted">Asset Allocation</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={allocation} dataKey="value" innerRadius={52} outerRadius={92} paddingAngle={2}>
                  {allocation.map((entry, index) => (
                    <Cell key={entry.name} fill={assetColors[index % assetColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-2">
            {allocation.map((entry, index) => (
              <div key={entry.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: assetColors[index % assetColors.length] }} />
                  <span>{entry.name}</span>
                </div>
                <span className="num text-muted">{entry.value}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-4">
          <div className="mb-4 text-[10px] uppercase tracking-[0.16em] text-muted">Performance</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performance}>
                <CartesianGrid vertical={false} stroke="#24282e" />
                <XAxis dataKey="label" tick={{ fill: '#8b929c', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8b929c', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Bar dataKey="value" fill="#2c7bf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
