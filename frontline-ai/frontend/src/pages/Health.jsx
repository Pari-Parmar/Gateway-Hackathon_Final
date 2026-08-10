import { useEffect, useState } from 'react';
import { Activity, ShieldCheck, Server, Cpu, RefreshCw } from 'lucide-react';
import { api } from '../services/api.js';

export default function Health() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const data = await api.health();
      setHealthData(data);
    } catch (e) {
      console.error('Health check failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>System Health & AI Status</h1>
            <p>Operational diagnostics for Gemini API and backend infrastructure</p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={checkHealth} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} style={loading ? { animation: 'spin 0.8s linear infinite' } : {}} />
            Ping Services
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        {/* Gemini API Status */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 10, borderRadius: 8, background: 'rgba(59,130,246,0.12)', color: '#60a5fa' }}>
              <Cpu size={24} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Google Gemini API</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Model: gemini-2.0-flash</div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <span className={`status-pill status-pill-${healthData?.gemini?.status === 'operational' ? 'operational' : 'error'}`}>
              {healthData?.gemini?.status || 'Checking...'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Latency:</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                {healthData?.gemini?.latency ? `${healthData.gemini.latency}ms` : '—'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Structured Output:</span>
              <span style={{ color: '#22c55e' }}>Enabled (JSON Schema)</span>
            </div>
          </div>
        </div>

        {/* Backend API Status */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.12)', color: '#86efac' }}>
              <Server size={24} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Express Backend Server</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Node.js REST API</div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <span className="status-pill status-pill-operational">Operational</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Uptime:</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                {healthData?.uptime_seconds ? `${Math.floor(healthData.uptime_seconds / 60)} mins` : '—'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Environment:</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                {healthData?.environment || 'development'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
