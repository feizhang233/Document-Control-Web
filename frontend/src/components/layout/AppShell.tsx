import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { NotificationsPopover } from './NotificationsPopover'

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  return (
    <div className="app-shell">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="main-shell">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={19} /></button>
          <div className="topbar-context"><span className="status-dot" /> Systems operational</div>
          <div className="topbar-actions">
            <NotificationsPopover open={notificationsOpen} onToggle={() => setNotificationsOpen(value=>!value)} onClose={() => setNotificationsOpen(false)} />
            <div className="user-chip"><div className="avatar">ZF</div><div><strong>Zhang Fei</strong><span>Document Controller</span></div></div>
          </div>
        </header>
        <main className="page-content"><Outlet /></main>
      </div>
    </div>
  )
}
