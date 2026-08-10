import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';

function ConfidenceBar({ value }) {
  const pct = Math.round((value || 0) * 100);
  const color = pct >= 80 ? '#22c55e' : pct >= 60 ? '#eab308' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="confidence-bar">
        <div className="confidence-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{pct}%</span>
    </div>
  );
}

function PriorityBadge({ priority }) {
  const cls = `badge badge-p${(priority || 'P2').replace('P', '').toLowerCase()}`;
  return <span className={cls}>{priority}</span>;
}

function RiskBadge({ risk }) {
  const map = { CRITICAL: 'badge-critical', HIGH: 'badge-high', MEDIUM: 'badge-medium', LOW: 'badge-low' };
  return <span className={`badge ${map[risk] || 'badge-medium'}`}>{risk}</span>;
}

function OutcomeBadge({ outcome }) {
  const map = {
    AUTO_ROUTE: 'badge-auto',
    HUMAN_REVIEW: 'badge-human',
    BLOCKED_UNSAFE: 'badge-blocked',
    NEEDS_CLARIFICATION: 'badge-clarify',
  };
  const labels = {
    AUTO_ROUTE: 'Auto',
    HUMAN_REVIEW: 'Human',
    BLOCKED_UNSAFE: 'Blocked',
    NEEDS_CLARIFICATION: 'Clarify',
  };
  return <span className={`badge ${map[outcome] || 'badge-human'}`}>{labels[outcome] || outcome}</span>;
}

export default function TriageTable({ entries = [] }) {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterRisk, setFilterRisk] = useState('ALL');
  const [filterHuman, setFilterHuman] = useState('ALL');

  const categories = ['ALL', 'ACCOUNT', 'BILLING', 'PAYMENT', 'ORDER', 'DELIVERY', 'REFUND', 'TECHNICAL', 'SECURITY', 'COMPLAINT', 'INFORMATION', 'OTHER', 'OUT_OF_SCOPE'];
  const priorities = ['ALL', 'P0', 'P1', 'P2', 'P3'];
  const risks = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const d = e.decision;
      if (!d) return false;
      if (filterCategory !== 'ALL' && d.category !== filterCategory) return false;
      if (filterPriority !== 'ALL' && d.priority !== filterPriority) return false;
      if (filterRisk !== 'ALL' && d.risk_level !== filterRisk) return false;
      if (filterHuman === 'YES' && !d.needs_human) return false;
      if (filterHuman === 'NO' && d.needs_human) return false;
      if (search && !e.message.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [entries, filterCategory, filterPriority, filterRisk, filterHuman, search]);

  return (
    <div>
      {/* Filters */}
      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="search-input"
            style={{ paddingLeft: 30 }}
            placeholder="Search messages..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="filter-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          {categories.map(c => <option key={c} value={c}>{c === 'ALL' ? 'All Categories' : c}</option>)}
        </select>
        <select className="filter-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          {priorities.map(p => <option key={p} value={p}>{p === 'ALL' ? 'All Priorities' : p}</option>)}
        </select>
        <select className="filter-select" value={filterRisk} onChange={e => setFilterRisk(e.target.value)}>
          {risks.map(r => <option key={r} value={r}>{r === 'ALL' ? 'All Risks' : r}</option>)}
        </select>
        <select className="filter-select" value={filterHuman} onChange={e => setFilterHuman(e.target.value)}>
          <option value="ALL">All Routing</option>
          <option value="YES">Human Review</option>
          <option value="NO">Auto Route</option>
        </select>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
        Showing {filtered.length} of {entries.length} entries
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <Search size={40} />
          <h3>No entries found</h3>
          <p>Try adjusting your filters or analyze a message first.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th style={{ maxWidth: 280 }}>Message</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Confidence</th>
                <th>Risk</th>
                <th>Decision</th>
                <th>Language</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, i) => {
                const d = entry.decision;
                const time = new Date(entry.timestamp).toLocaleTimeString('en-US', {
                  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
                });
                return (
                  <tr key={entry.id || i}>
                    <td>
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {time}
                      </span>
                    </td>
                    <td style={{ maxWidth: 280 }}>
                      <div className="truncate" style={{ maxWidth: 280, fontSize: 13, title: entry.message }}>
                        {entry.message}
                      </div>
                      {d?.is_adversarial && (
                        <span style={{ fontSize: 10, color: '#fca5a5', fontWeight: 600 }}>⚠ Adversarial</span>
                      )}
                    </td>
                    <td><span className="badge badge-category">{d?.category}</span></td>
                    <td><PriorityBadge priority={d?.priority} /></td>
                    <td><ConfidenceBar value={d?.confidence} /></td>
                    <td><RiskBadge risk={d?.risk_level} /></td>
                    <td><OutcomeBadge outcome={d?.outcome} /></td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {d?.language || '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
