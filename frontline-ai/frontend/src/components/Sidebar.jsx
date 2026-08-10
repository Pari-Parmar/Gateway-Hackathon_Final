import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, MessageSquare, ListFilter,
  FlaskConical, Activity, Shield
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/analyze', icon: MessageSquare, label: 'Analyze Message' },
  { to: '/queue', icon: ListFilter, label: 'Triage Queue' },
  { to: '/evaluation', icon: FlaskConical, label: 'Evaluation' },
  { to: '/health', icon: Activity, label: 'System Health' },
];

export default function Sidebar({ geminiStatus = 'operational' }) {
  const isOnline = geminiStatus === 'operational';

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo-icon">
          <Shield size={20} />
        </div>
        <div>
          <div className="sidebar-logo-title">FRONTLINE AI</div>
          <div className="sidebar-logo-sub">Triage Intelligence</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Operations Console</div>
        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="status-indicator-badge">
          <div className={`status-dot-icon ${isOnline ? '' : 'offline'}`} />
          <span>{isOnline ? 'System Operational' : 'Offline'}</span>
        </div>
      </div>
    </aside>
  );
}
