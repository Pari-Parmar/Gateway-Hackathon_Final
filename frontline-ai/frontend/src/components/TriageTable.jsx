import { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, UserCheck, UserX, Shield, Brain, Cpu, Scale, AlertTriangle, CheckCircle, Copy, Check } from 'lucide-react';

function ConfidenceBar({ value }) {
  const pct = Math.round((value || 0) * 100);
  const color = pct >= 80 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="confidence-bar" style={{ flex: 1, height: 6, background: 'var(--border-color)', borderRadius: 4, overflow: 'hidden' }}>
        <div className="confidence-fill" style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.3s ease' }} />
      </div>
      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-secondary)' }}>{pct}%</span>
    </div>
  );
}

function PriorityBadge({ priority }) {
  const cls = `badge badge-p${(priority || 'P2').replace('P', '').toLowerCase()}`;
  return <span className={cls} style={{ fontWeight: 800 }}>{priority}</span>;
}

function RiskBadge({ risk }) {
  const map = { CRITICAL: 'badge-critical', HIGH: 'badge-high', MEDIUM: 'badge-medium', LOW: 'badge-low' };
  return <span className={`badge ${map[risk] || 'badge-medium'}`} style={{ fontWeight: 800 }}>{risk}</span>;
}

function OutcomeBadge({ outcome }) {
  const map = {
    AUTO_ROUTE: 'badge-auto',
    HUMAN_REVIEW: 'badge-human',
    BLOCKED_UNSAFE: 'badge-blocked',
    NEEDS_CLARIFICATION: 'badge-clarify',
  };
  const labels = {
    AUTO_ROUTE: 'Auto Route',
    HUMAN_REVIEW: 'Human Escalation',
    BLOCKED_UNSAFE: 'Blocked Safety',
    NEEDS_CLARIFICATION: 'Needs Clarify',
  };
  return <span className={`badge ${map[outcome] || 'badge-human'}`} style={{ fontWeight: 800 }}>{labels[outcome] || outcome}</span>;
}

export default function TriageTable({ entries = [] }) {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterRisk, setFilterRisk] = useState('ALL');
  const [filterHuman, setFilterHuman] = useState('ALL');
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

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

  const toggleRow = (id) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  const copyRowJson = (e, item) => {
    e.stopPropagation();
    navigator.clipboard.writeText(JSON.stringify(item, null, 2));
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div>
      {/* Filters */}
      <div className="filter-bar" style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="search-input"
            style={{ paddingLeft: 34, width: '100%', height: 38, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
            placeholder="Search queue messages..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="filter-select" style={{ height: 38, borderRadius: 8, padding: '0 12px', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          {categories.map(c => <option key={c} value={c}>{c === 'ALL' ? 'All Categories' : c}</option>)}
        </select>
        <select className="filter-select" style={{ height: 38, borderRadius: 8, padding: '0 12px', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          {priorities.map(p => <option key={p} value={p}>{p === 'ALL' ? 'All Priorities' : p}</option>)}
        </select>
        <select className="filter-select" style={{ height: 38, borderRadius: 8, padding: '0 12px', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} value={filterRisk} onChange={e => setFilterRisk(e.target.value)}>
          {risks.map(r => <option key={r} value={r}>{r === 'ALL' ? 'All Risks' : r}</option>)}
        </select>
        <select className="filter-select" style={{ height: 38, borderRadius: 8, padding: '0 12px', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} value={filterHuman} onChange={e => setFilterHuman(e.target.value)}>
          <option value="ALL">All Routing</option>
          <option value="YES">Human Escalation</option>
          <option value="NO">Auto Route</option>
        </select>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, fontWeight: 600 }}>
        Showing {filtered.length} of {entries.length} live triage queue records (Click row to expand 4-Agent audit)
      </div>

      {/* Table */}
      <div className="table-wrapper" style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Time</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', minWidth: 260 }}>Message Preview</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Category</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Priority</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Confidence</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Risk Level</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Decision</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Language</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const d = item.decision || {};
              const timeStr = item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Just now';
              const isExpanded = expandedRowId === item.id;

              return (
                <>
                  <tr
                    key={item.id}
                    onClick={() => toggleRow(item.id)}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      background: isExpanded ? 'var(--accent-blue-dim)' : 'transparent',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '14px 16px', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {timeStr}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', maxWidth: 280 }}>
                      <div className="truncate">{item.message}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className="badge badge-category">{d.category || 'OTHER'}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <PriorityBadge priority={d.priority} />
                    </td>
                    <td style={{ padding: '14px 16px', minWidth: 120 }}>
                      <ConfidenceBar value={d.confidence} />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <RiskBadge risk={d.risk_level} />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <OutcomeBadge outcome={d.outcome} />
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                      {d.language || 'English'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={(e) => copyRowJson(e, item)}
                          title="Copy JSON Payload"
                        >
                          {copiedId === item.id ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                        </button>
                        {isExpanded ? <ChevronUp size={16} color="var(--accent-blue)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Row Detail Drawer */}
                  {isExpanded && (
                    <tr key={`${item.id}-detail`} style={{ background: 'var(--bg-primary)', borderBottom: '2px solid var(--accent-blue)' }}>
                      <td colSpan={9} style={{ padding: 20 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                          <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 10, border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 6 }}>
                              Full Customer Message
                            </div>
                            <div style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.5, fontWeight: 600 }}>
                              "{item.message}"
                            </div>
                          </div>

                          <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 10, border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 6 }}>
                              Suggested Operational Action
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--accent-blue)', lineHeight: 1.5, fontWeight: 700 }}>
                              {d.suggested_action || 'Provide standard automated resolution.'}
                            </div>
                          </div>

                          <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 10, border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 6 }}>
                              Reasoning Audit Log
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', lineHeight: 1.5 }}>
                              {d.reasoning_summary || '4-Agent Pipeline evaluated language tokens and risk policies.'}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
