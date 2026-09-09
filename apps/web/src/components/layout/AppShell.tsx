import { Outlet } from 'react-router-dom'
import { TopNavbar } from './TopNavbar'

export function AppShell() {
  return (
    <div className="min-h-screen bg-shell text-text">
      <TopNavbar />
      <Outlet />
    </div>
  )
}
