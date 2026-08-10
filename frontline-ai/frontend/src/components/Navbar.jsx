import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Clock, Cpu, Sun, Moon } from 'lucide-react';

const routeLabels = {
  '/': 'Operations Dashboard',
  '/analyze': 'Message Analyzer',
  '/queue': 'Triage Queue',
  '/evaluation': 'Model Evaluation',
  '/health': 'System Health',
};

export default function Topbar() {
  const location = useLocation();
  const label = routeLabels[location.pathname] || 'FRONTLINE AI';
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Theme Toggle State
  const [theme, setTheme] = useState(() => localStorage.getItem('frontline_theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('frontline_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Console /</span>
        <span className="topbar-page-name">{label}</span>
      </div>

      <div className="topbar-right">
        {/* Theme Switcher Button */}
        <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle Light/Dark Theme">
          {theme === 'light' ? (
            <>
              <Sun size={15} color="#eab308" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon size={15} color="#60a5fa" />
              <span>Dark Mode</span>
            </>
          )}
        </button>

        <div className="topbar-chip">
          <Clock size={14} color="var(--accent-blue)" />
          <span>{dateStr} · {timeStr}</span>
        </div>

        <div className="topbar-chip" style={{ background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a', borderColor: 'rgba(22, 163, 74, 0.2)' }}>
          <Cpu size={14} color="#16a34a" />
          <span>4-Agent AI Engine</span>
        </div>
      </div>
    </header>
  );
}
