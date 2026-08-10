import MessageAnalyzer from '../components/MessageAnalyzer.jsx';
import { ShieldCheck } from 'lucide-react';

export default function Analyze() {
  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h1>AI Message Analyzer</h1>
        <p>Run incoming customer support messages through the 4-Agent AI Decision Pipeline</p>
      </div>

      {/* Info panel */}
      <div style={{
        background: '#eff6ff',
        border: '1px solid #dbeafe',
        borderRadius: 12,
        padding: '14px 18px',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        marginBottom: 24,
      }}>
        <ShieldCheck size={20} color="#2563eb" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: 13.5, color: '#1e3a8a', lineHeight: 1.5, fontWeight: 500 }}>
          <strong>Multi-Layer Safety Engine:</strong> Untrusted customer messages are sanitized, checked for prompt injection, processed via Gemini 2.0 Flash structured JSON, and evaluated against deterministic business policies.
        </div>
      </div>

      <MessageAnalyzer />
    </div>
  );
}
