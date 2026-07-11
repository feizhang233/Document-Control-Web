import { BarChart3, ChevronDown, FileText, Repeat2, Send, Settings, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const documentLinks = [
  ['This Week', '/documents/week'], ['This Month', '/documents/month'],
  ['This Year', '/documents/year'], ['All', '/documents/all'],
]

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  return <>
    {mobileOpen && <div className="sidebar-backdrop" onClick={onClose} />}
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark">D</div><div><strong>DocFlow</strong><span>Project Controls</span></div><button className="sidebar-close" onClick={onClose}><X size={18}/></button></div>
      <nav className="nav-list">
        <NavLink to="/" end className="nav-item" onClick={onClose}><BarChart3 size={18}/><span>Dashboard</span></NavLink>
        <div className="nav-section">
          <NavLink to="/documents/week" className="nav-parent" onClick={onClose}><FileText size={18}/><span>Documents</span><ChevronDown size={15}/></NavLink>
          <div className="nav-children">{documentLinks.map(([label, url]) => <NavLink key={url} to={url} className="nav-child" onClick={onClose}>{label}</NavLink>)}</div>
        </div>
        <NavLink to="/workflow" className="nav-item" onClick={onClose}><Repeat2 size={18}/><span>Workflow</span></NavLink>
        <NavLink to="/transmittal" className="nav-item" onClick={onClose}><Send size={18}/><span>Transmittal</span></NavLink>
      </nav>
      <div className="sidebar-bottom">
        <NavLink to="/settings" className="nav-item" onClick={onClose}><Settings size={18}/><span>Settings</span></NavLink>
      </div>
    </aside>
  </>
}
