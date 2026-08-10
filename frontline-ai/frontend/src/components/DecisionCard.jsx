import { AlertTriangle, Shield, CheckCircle, HelpCircle, XCircle } from 'lucide-react';

function getPriorityBadgeClass(priority) {
  const p = (priority || 'P2').toLowerCase().replace('p', '');
  return `badge badge-p${p}`;
}

function getRiskBadgeClass(risk) {
  const map = { CRITICAL: 'badge-critical', HIGH: 'badge-high', MEDIUM: 'badge-medium', LOW: 'badge-low' };
  return `badge ${map[risk] || 'badge-medium'}`;
}

function getOutcomeIcon(outcome) {
  const icons = {
    AUTO_ROUTE: <CheckCircle size={16} color="#16a34a" />,
    HUMAN_REVIEW: <AlertTriangle size={16} color="#ea580c" />,
    BLOCKED_UNSAFE: <XCircle size={16} color="#dc2626" />,
    NEEDS_CLARIFICATION: <HelpCircle size={16} color="#d97706" />,
  };
  return icons[outcome] || <AlertTriangle size={16} />;
}

function ConfidenceArc({ value }) {
  const pct = Math.round((value || 0) * 100);
  const color = pct >= 80 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626';

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: `conic-gradient(${color} ${pct * 3.6}deg, #e2e8f0 0deg)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 4px',
        position: 'relative',
      }}>
        <div style={{
          width: 54, height: 54, borderRadius: '50%',
          background: '#ffffff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 15, fontWeight: 800, color, fontFamily: 'var(--font-mono)' }}>
            {pct}%
          </span>
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
        Confidence
      </div>
    </div>
  );
}

export default function DecisionCard({ result }) {
  if (!result) return null;

  const { decision, guardrails, latency_ms } = result;
  const isAdversarial = decision.is_adversarial || guardrails?.adversarial;
  const isBlocked = decision.outcome === 'BLOCKED_UNSAFE';

  return (
    <div className="decision-card">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="decision-header">
        <div className="decision-title-area">
          <div className="decision-header-label">Structured AI Decision</div>
          <div className="decision-category-name">{decision.category}</div>

          <div className="decision-badges">
            <span className={getPriorityBadgeClass(decision.priority)}>
              {decision.priority} — {
                { P0: 'Critical', P1: 'High', P2: 'Normal', P3: 'Low' }[decision.priority]
              }
            </span>
            <span className={getRiskBadgeClass(decision.risk_level)}>
              Risk: {decision.risk_level}
            </span>
            {decision.language && decision.language !== 'Unknown' && (
              <span className="badge" style={{ background: '#ecfeff', color: '#0891b2', border: '1px solid #cffaff' }}>
                🌐 {decision.language}
              </span>
            )}
            {decision.is_multi_issue && (
              <span className="badge" style={{ background: '#f3e8ff', color: '#6b21a8', border: '1px solid #e9d5ff' }}>
                Multi-Issue Detected
              </span>
            )}
            {isAdversarial && (
              <span className="badge badge-blocked">⚠ Adversarial Attack</span>
            )}
          </div>
        </div>

        {/* Outcome badge */}
        <div>
          <div
            className={`decision-outcome-badge ${
              isBlocked ? 'badge-blocked'
              : decision.outcome === 'AUTO_ROUTE' ? 'badge-auto'
              : decision.outcome === 'NEEDS_CLARIFICATION' ? 'badge-clarify'
              : 'badge-human'
            }`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700 }}>
              {getOutcomeIcon(decision.outcome)}
              {decision.outcome_label || decision.outcome}
            </div>
          </div>
        </div>
      </div>

      {/* ── Metrics row ──────────────────────────────────────────── */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', background: '#ffffff' }}>
        <div className="decision-metrics">
          <ConfidenceArc value={decision.confidence} />

          <div className="decision-metric">
            <div className="decision-metric-value"
              style={{ color: decision.sentiment === 'ANGRY' ? '#dc2626'
                : decision.sentiment === 'FRUSTRATED' ? '#ea580c'
                : decision.sentiment === 'POSITIVE' ? '#16a34a'
                : '#0f172a' }}
            >
              {decision.sentiment}
            </div>
            <div className="decision-metric-label">Sentiment</div>
          </div>

          <div className="decision-metric">
            <div className="decision-metric-value" style={{ fontSize: 18 }}>
              {latency_ms ? `${latency_ms}ms` : '—'}
            </div>
            <div className="decision-metric-label">Latency</div>
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="decision-body">
        {/* Summary */}
        {decision.summary && (
          <div className="decision-section">
            <div className="decision-section-label">AI Executive Summary</div>
            <div className="decision-section-value">{decision.summary}</div>
          </div>
        )}

        {/* Issues detected */}
        {decision.issues && decision.issues.length > 0 && (
          <div className="decision-section">
            <div className="decision-section-label">Detected Issues ({decision.issues.length})</div>
            <div>
              {decision.issues.map((issue, i) => (
                <span key={i} className="issue-tag">{issue}</span>
              ))}
            </div>
          </div>
        )}

        {/* Suggested action */}
        {decision.suggested_action && (
          <div className="decision-section">
            <div className="decision-section-label">Suggested Support Action</div>
            <div className="decision-section-value">{decision.suggested_action}</div>
          </div>
        )}

        {/* Escalation reason */}
        {(decision.needs_human || isBlocked) && decision.escalation_reason && (
          <div className="decision-section">
            <div className="decision-section-label">Human Escalation Reason</div>
            <div className={`escalation-box ${isBlocked ? 'blocked' : ''}`}>
              <div className="escalation-icon">
                {isBlocked
                  ? <Shield size={18} color="#dc2626" />
                  : <AlertTriangle size={18} color="#ea580c" />
                }
              </div>
              <div style={{ fontSize: 13.5, color: isBlocked ? '#991b1b' : '#9a3412', lineHeight: 1.6, fontWeight: 500 }}>
                {decision.escalation_reason}
              </div>
            </div>
          </div>
        )}

        {/* Decision overrides */}
        {decision.decision_overrides && decision.decision_overrides.length > 0 && (
          <div className="decision-section">
            <div className="decision-section-label">Deterministic Rules Applied</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {decision.decision_overrides.map((override, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 10, fontSize: 12.5,
                  background: '#f8fafc',
                  padding: '8px 12px', borderRadius: 6,
                  border: '1px solid #e2e8f0',
                }}>
                  <span style={{ color: '#2563eb', fontFamily: 'var(--font-mono)', fontWeight: 700, flexShrink: 0 }}>
                    {override.rule}
                  </span>
                  <span style={{ color: '#475569' }}>{override.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reasoning summary */}
        {decision.reasoning_summary && (
          <div className="decision-section">
            <div className="decision-section-label">LLM Internal Reasoning Audit</div>
            <div className="reasoning-box">{decision.reasoning_summary}</div>
          </div>
        )}
      </div>
    </div>
  );
}
