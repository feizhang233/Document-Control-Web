import { BarChart3, ChevronDown, FileText, Menu, Repeat2, Send, Settings, X } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'

const documentLinks = [
  ['This Week', '/documents/week'], ['This Month', '/documents/month'],
  ['This Year', '/documents/year'], ['All', '/documents/all'],
]

export function Sidebar({ mobileOpen, collapsed, onClose, onToggleCollapsed }: { mobileOpen: boolean; collapsed: boolean; onClose: () => void; onToggleCollapsed: () => void }) {
  const [documentsOpen,setDocumentsOpen]=useState(true)
  const location=useLocation()
  const documentsActive=location.pathname.startsWith('/documents')
  return <>
    {mobileOpen && <div className="sidebar-backdrop" onClick={onClose} />}
    <aside className={`sidebar ${mobileOpen ? 'open' : ''} ${collapsed ? 'desktop-collapsed' : ''}`}>
      <div className="brand"><div className="brand-mark">D</div><div className="brand-copy"><strong>DocFlow</strong><span>Project Controls</span></div><button className="sidebar-collapse-toggle" onClick={onToggleCollapsed} aria-label={collapsed?'Expand navigation':'Collapse navigation'} title={collapsed?'Expand navigation':'Collapse navigation'}><Menu size={19}/></button><button className="sidebar-close" onClick={onClose} aria-label="Close navigation"><X size={18}/></button></div>
      <nav className="nav-list">
        <NavLink to="/" end className="nav-item" onClick={onClose} aria-label="Dashboard" title={collapsed?'Dashboard':undefined}><BarChart3 size={18}/><span>Dashboard</span></NavLink>
        <div className={`nav-section ${documentsOpen?'expanded':'collapsed'}`}>
          <div className={`nav-parent-row ${documentsActive?'active':''}`}><NavLink to="/documents/week" className="nav-parent" onClick={onClose} aria-label="Documents" title={collapsed?'Documents':undefined}><FileText size={18}/><span>Documents</span></NavLink><button type="button" className="nav-collapse-button" aria-label={documentsOpen?'Collapse Documents':'Expand Documents'} aria-expanded={documentsOpen} onClick={()=>setDocumentsOpen(open=>!open)}><ChevronDown size={15}/></button></div>
          {documentsOpen&&<div className="nav-children">{documentLinks.map(([label, url]) => <NavLink key={url} to={url} className="nav-child" onClick={onClose}>{label}</NavLink>)}</div>}
        </div>
        <NavLink to="/workflow" className="nav-item" onClick={onClose} aria-label="Workflow" title={collapsed?'Workflow':undefined}><Repeat2 size={18}/><span>Workflow</span></NavLink>
        <NavLink to="/transmittal" className="nav-item" onClick={onClose} aria-label="Transmittal" title={collapsed?'Transmittal':undefined}><Send size={18}/><span>Transmittal</span></NavLink>
      </nav>
      <div className="sidebar-bottom">
        <NavLink to="/settings" className="nav-item" onClick={onClose} aria-label="Settings" title={collapsed?'Settings':undefined}><Settings size={18}/><span>Settings</span></NavLink>
      </div>
    </aside>
  </>
}
