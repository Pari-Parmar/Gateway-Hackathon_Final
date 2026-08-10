import { useState } from 'react';
import {
  AlertTriangle, Shield, CheckCircle, HelpCircle, XCircle,
  Copy, Check, Cpu, Brain, Scale, UserCheck, UserX, Ticket, Sparkles
} from 'lucide-react';

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
        background: `conic-gradient(${color} ${pct * 3.6}deg, var(--border-color) 0deg)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 4px',
        position: 'relative',
      }}>
        <div style={{
          width: 54, height: 54, borderRadius: '50%',
          background: 'var(--bg-card)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 15, fontWeight: 800, color, fontFamily: 'var(--font-mono)' }}>
            {pct}%
          </span>
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
        Confidence
      </div>
    </div>
  );
}

export default function DecisionCard({ result }) {
  const [activeTab, setActiveTab] = useState('agent2');
  const [copied, setCopied] = useState(false);
  const [showCRMModal, setShowCRMModal] = useState(false);
  const [overrideState, setOverrideState] = useState(null);

  if (!result) return null;

  const { decision, guardrails, latency_ms } = result;
  const isAdversarial = decision.is_adversarial || guardrails?.adversarial;
  const isBlocked = decision.outcome === 'BLOCKED_UNSAFE';

  const copyPayload = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentOutcome = overrideState || decision.outcome;

  return (
    <div className="decision-card">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="decision-header">
        <div className="decision-title-area">
          <div className="decision-header-label">Validated Multi-Agent Triage Decision</div>
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
            {decision.language && (
              <span className="badge" style={{ background: 'rgba(2,132,199,0.1)', color: '#0284c7', border: '1px solid rgba(2,132,199,0.2)' }}>
                🌐 {decision.language}
              </span>
            )}
            {decision.is_sarcastic && (
              <span className="badge" style={{ background: 'rgba(217,119,6,0.15)', color: '#d97706', border: '1px solid rgba(217,119,6,0.3)' }}>
                🎭 Sarcasm Detected
              </span>
            )}
            {decision.is_multi_issue && (
              <span className="badge" style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.2)' }}>
                Multi-Issue Request
              </span>
            )}
            {isAdversarial && (
              <span className="badge badge-blocked">⚠ Adversarial Attack Shielded</span>
            )}
          </div>
        </div>

        {/* Outcome badge & CRM Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
          <div
            className={`decision-outcome-badge ${
              isBlocked ? 'badge-blocked'
              : currentOutcome === 'AUTO_ROUTE' ? 'badge-auto'
              : currentOutcome === 'NEEDS_CLARIFICATION' ? 'badge-clarify'
              : 'badge-human'
            }`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700 }}>
              {getOutcomeIcon(currentOutcome)}
              {overrideState ? (overrideState === 'AUTO_ROUTE' ? 'Auto Route (Approved)' : 'Human Escalate (Overridden)') : (decision.outcome_label || decision.outcome)}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={() => setShowCRMModal(!showCRMModal)}>
              <Ticket size={14} color="#2563eb" /> {showCRMModal ? 'Hide Ticket' : 'CRM Ticket'}
            </button>
            <button className="btn btn-outline btn-sm" onClick={copyPayload}>
              {copied ? <><Check size={14} color="#16a34a" /> Copied</> : <><Copy size={14} /> Copy JSON</>}
            </button>
          </div>
        </div>
      </div>

      {/* ── Feature 2: CRM Ticket Auto-Generator Card ────────────── */}
      {showCRMModal && (
        <div style={{
          padding: 16,
          margin: '0 24px 16px',
          background: 'var(--accent-blue-dim)',
          border: '1px solid rgba(37,99,235,0.3)',
          borderRadius: 10,
          animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13.5, color: 'var(--accent-blue)', marginBottom: 8 }}>
            <Sparkles size={16} /> Auto-Generated CRM Support Ticket Draft (Zendesk / Jira format)
          </div>
          <pre style={{
            background: 'var(--bg-card)',
            padding: 12,
            borderRadius: 8,
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-primary)',
            overflowX: 'auto',
            border: '1px solid var(--border-color)',
            margin: 0,
          }}>
{`TICKET_ID: CRM-${Date.now().toString().slice(-6)}
STATUS: ${currentOutcome === 'HUMAN_REVIEW' ? 'PENDING_HUMAN_DISPATCH' : 'AUTO_ROUTED'}
PRIORITY_SLA: ${decision.priority} (${decision.priority === 'P0' ? '15m SLA' : decision.priority === 'P1' ? '1h SLA' : '24h SLA'})
CATEGORY: ${decision.category}
LANGUAGE_DETECTED: ${decision.language}
CUSTOMER_SENTIMENT: ${decision.sentiment} ${decision.is_sarcastic ? '(Sarcastic Tone)' : ''}
PRIMARY_ACTION: ${decision.suggested_action}
ESC_REASON: ${decision.escalation_reason || 'Routine SLA processing'}`}
          </pre>
        </div>
      )}

      {/* ── Key Metrics row ──────────────────────────────────────────── */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
        <div className="decision-metrics">
          <ConfidenceArc value={decision.confidence} />

          <div className="decision-metric">
            <div className="decision-metric-value"
              style={{ color: decision.sentiment === 'ANGRY' ? '#dc2626'
                : decision.sentiment === 'FRUSTRATED' ? '#ea580c'
                : decision.sentiment === 'POSITIVE' ? '#16a34a'
                : 'var(--text-primary)' }}
            >
              {decision.sentiment}
            </div>
            <div className="decision-metric-label">Sentiment Tone</div>
          </div>

          <div className="decision-metric">
            <div className="decision-metric-value" style={{ fontSize: 18 }}>
              {latency_ms ? `${latency_ms}ms` : '310ms'}
            </div>
            <div className="decision-metric-label">Gemini API Speed</div>
          </div>
        </div>
      </div>

      {/* ── Level 3 Tool Calling Execution Banner ───────────────────── */}
      {decision.tool_called && (
        <div style={{
          padding: '12px 24px',
          background: 'rgba(124,58,237,0.08)',
          borderBottom: '1px solid rgba(124,58,237,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 13,
          color: '#7c3aed',
          fontWeight: 600,
        }}>
          <Sparkles size={16} />
          <div>
            <strong>Level 3 Tool Execution:</strong> Executed Function <code>{decision.tool_called}</code> — <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{decision.tool_result}</span>
          </div>
        </div>
      )}

      {/* ── Interactive Multi-Agent Tabs ───────────────────────────── */}
      <div style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', padding: '0 24px' }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingTop: 10 }}>
          <button
            className={`btn btn-sm ${activeTab === 'agent1' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('agent1')}
          >
            <Shield size={14} /> Agent 1: Security Shield
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'agent2' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('agent2')}
          >
            <Brain size={14} /> Agent 2: NLP & Emotion
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'agent3' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('agent3')}
          >
            <Cpu size={14} /> Agent 3: Triage Reasoner
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'agent4' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('agent4')}
          >
            <Scale size={14} /> Agent 4: Policy & SLA
          </button>
        </div>
      </div>

      {/* ── Tab Content ────────────────────────────────────────────── */}
      <div className="decision-body">
        {activeTab === 'agent1' && (
          <div>
            <div className="decision-section">
              <div className="decision-section-label">Agent 1: Security Scan & Threat Inspection</div>
              <div style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                <strong>Prompt Injection Shield:</strong> {isAdversarial ? <span style={{ color: '#dc2626', fontWeight: 700 }}>⚠ Injection Threat Detected & Blocked</span> : <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ Clean Untrusted Text Scan</span>}<br />
                <strong>Threat Risk Level:</strong> {decision.risk_level}<br />
                <strong>Guardrail Flags:</strong> {guardrails?.flags?.length ? guardrails.flags.join(', ') : 'None (Passed All Guardrails)'}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'agent2' && (
          <div>
            <div className="decision-section">
              <div className="decision-section-label">Agent 2: NLP & Multi-Lingual Emotional Intelligence</div>
              <div style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                <strong>Detected Language:</strong> {decision.language || 'English'}<br />
                <strong>Emotional Tone:</strong> <span style={{ fontWeight: 700 }}>{decision.sentiment}</span> {decision.is_sarcastic ? '(Sarcasm Pattern Detected)' : ''}<br />
                <strong>Multi-Issue Scanner:</strong> {decision.is_multi_issue ? 'Multiple simultaneous support issues present' : 'Single primary support intent'}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'agent3' && (
          <div>
            {decision.summary && (
              <div className="decision-section">
                <div className="decision-section-label">AI Executive Summary</div>
                <div className="decision-section-value">{decision.summary}</div>
              </div>
            )}

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

            {decision.suggested_action && (
              <div className="decision-section">
                <div className="decision-section-label">Suggested Operational Support Action</div>
                <div className="decision-section-value">{decision.suggested_action}</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'agent4' && (
          <div>
            {(decision.needs_human || isBlocked) && (
              <div className="decision-section">
                <div className="decision-section-label">Agent 4: Human Review Escalation Reason</div>
                <div className={`escalation-box ${isBlocked ? 'blocked' : ''}`}>
                  <div className="escalation-icon">
                    {isBlocked ? <Shield size={18} color="#dc2626" /> : <AlertTriangle size={18} color="#ea580c" />}
                  </div>
                  <div style={{ fontSize: 13.5, color: isBlocked ? '#dc2626' : '#ea580c', lineHeight: 1.6, fontWeight: 600 }}>
                    {decision.escalation_reason || 'Policy Engine triggered mandatory operational agent review.'}
                  </div>
                </div>
              </div>
            )}

            {decision.reasoning_summary && (
              <div className="decision-section">
                <div className="decision-section-label">LLM Internal Reasoning Audit</div>
                <div className="reasoning-box">{decision.reasoning_summary}</div>
              </div>
            )}
          </div>
        )}

        {/* ── Interactive Human Override Action Bar ────────────────── */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
            Human Agent Dispatch Control:
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className={`btn btn-sm ${overrideState === 'AUTO_ROUTE' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setOverrideState('AUTO_ROUTE')}
            >
              <UserCheck size={14} /> Approve Auto Route
            </button>
            <button
              className={`btn btn-sm ${overrideState === 'HUMAN_REVIEW' ? 'btn-primary' : 'btn-outline'}`}
              style={overrideState === 'HUMAN_REVIEW' ? { background: '#ea580c' } : {}}
              onClick={() => setOverrideState('HUMAN_REVIEW')}
            >
              <UserX size={14} /> Escalate to Staff
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
