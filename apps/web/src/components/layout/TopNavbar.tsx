import { Bell, Search, Settings, ShieldCheck, UserCircle2 } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

const navItems = [
  { label: 'Markets', to: '/markets' },
  { label: 'Trade', to: '/trade' },
  { label: 'Portfolio', to: '/portfolio' },
  { label: 'Orders', to: '/orders' },
  { label: 'Wallets', to: '/wallet' }
]

export function TopNavbar() {
  const location = useLocation()

  return (
    <header className="h-16 border-b-2 border-[#e8e8e8] bg-panel/95">
      <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center border-2 border-[#e8e8e8] bg-panelAlt text-[10px] font-bold text-primary shadow-[3px_3px_0_rgba(0,0,0,0.5)]">OR</div>
          <div>
            <div className="text-sm font-semibold tracking-[0.28em] text-text">ORVYN</div>
          </div>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`border px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] transition ${
                location.pathname.startsWith(item.to)
                  ? 'border-[#e8e8e8] bg-panelAlt text-text shadow-[2px_2px_0_rgba(0,0,0,0.45)]'
                  : 'border-transparent text-muted hover:border-[#e8e8e8] hover:text-text'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button className="soft-ring flex h-8 w-8 items-center justify-center border-2 border-[#e8e8e8] bg-panelAlt text-muted hover:text-text" aria-label="Search">
            <Search size={14} />
          </button>
          <button className="soft-ring flex h-8 w-8 items-center justify-center border-2 border-[#e8e8e8] bg-panelAlt text-muted hover:text-text" aria-label="Notifications">
            <Bell size={14} />
          </button>
          <div className="hidden items-center gap-2 border-2 border-[#e8e8e8] bg-panelAlt px-2 py-1 sm:flex">
            <span className="h-2 w-2 rounded-full bg-buy" />
            <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-buy">Demo Mode</span>
          </div>
          <button className="soft-ring flex h-8 w-8 items-center justify-center border-2 border-[#e8e8e8] bg-panelAlt text-muted hover:text-text" aria-label="Settings">
            <Settings size={14} />
          </button>
          <div className="flex items-center gap-2 border-2 border-[#e8e8e8] bg-panelAlt px-2 py-1.5">
            <UserCircle2 size={16} className="text-primary" />
            <span className="hidden text-[11px] uppercase tracking-[0.12em] text-text sm:inline">Demo</span>
          </div>
          <button className="soft-ring hidden border-2 border-[#e8e8e8] bg-panelAlt px-2 py-1.5 text-[10px] uppercase tracking-[0.12em] text-muted hover:text-text sm:inline-flex">
            <ShieldCheck size={14} className="mr-1.5" />
            Secure
          </button>
        </div>
      </div>
    </header>
  )
}
