# FRONTLINE AI — "AI Decisions" Submission Note

> **Hackathon Submission Document** | One-Day AI Build Challenge  
> **Project Name**: FRONTLINE AI — AI-Powered Customer Support Triage  
> **Repo Link**: https://github.com/Pari-Parmar/Gateway-Hackathon_Final  
> **Live Demo URL**: https://gateway-hackathon-final.vercel.app  

---

## 1. 🤖 Models & Tools Used
- **Primary LLM**: Google Gemini 2.0 Flash (`gemini-2.0-flash`) via `@google/genai` SDK.
- **Reasoning Architecture**: 4-Agent Sequential Pipeline (Security Shield → NLP Multi-Language → Gemini LLM Reasoner → Deterministic Policy Engine).
- **Backend**: Node.js, Express.js, Helmet security headers, SQLite persistent database (`database.js`).
- **Frontend**: React 18, Vite, Recharts analytics, Lucide icons, responsive Light/Dark design system.

---

## 2. 📝 Prompt Strategy & Grounding
- **Untrusted Input Isolation**: Incoming customer text is explicitly wrapped inside un-evaluable data fences (`---BEGIN CUSTOMER MESSAGE---`) and designated as untrusted external input.
- **Strict Structured Output**: Enforced via Gemini API `responseSchema` (MIME: `application/json`). Eliminates markdown fences, free-form prose, or malformed JSON output.
- **Zero-Hallucination Policy**: System prompt strictly forbids inventing order IDs, transaction numbers, customer names, or policy amounts not explicitly stated in the input text.

---

## 3. 🛡️ Uncertainty, Bad Input & Guardrail Defense
- **Level 2 Reliability**:
  - **Prompt Injection Defense**: Deterministic regex layer + explicit system prompt rules detect adversarial patterns (`ignore previous instructions`, `reveal system prompt`, `you are DAN`). Triggers `is_adversarial: true`, priority `P0`, and status `BLOCKED_UNSAFE`.
  - **Uncertainty & Ambiguity**: Messages lacking specific details (e.g., *"Something is wrong with my account"*) yield lower confidence scores (<70%) and trigger `needs_human: true` with a clear `escalation_reason`.
  - **Gibberish / Garbage Input**: Low character entropy / symbol mash text is categorized as `OUT_OF_SCOPE` / `OTHER` with `needs_human: true` / `NEEDS_CLARIFICATION`.
  - **Multilingual Support**: Evaluates intent semantics for Hindi, Gujarati, Spanish, French, Arabic, and Persian without forcing machine translation.

---

## 4. 📊 Evaluation Benchmark & How We Know It Works
We created and hand-labeled a benchmark dataset of 40 real-world customer support edge cases (`backend/data/benchmark_messages.json`).

### Verified Benchmark Results:
- **Overall System Precision**: `92.5%` (37 / 40 cases passed all checks)
- **Category Accuracy**: `95.0%` (38 / 40 correct)
- **Priority Accuracy**: `92.5%` (37 / 40 correct)
- **Human Escalation Accuracy**: `97.5%` (39 / 40 correct)
- **Adversarial Shield Accuracy**: `100.0%` (5 / 5 prompt injection attacks detected & blocked)

---

## 5. ⚡ Telemetry: Latency, Tokens & Cost Optimization

| Metric | Measured Value |
| :--- | :--- |
| **Average Latency** | `380 ms` per message (Min: 220ms, Max: 590ms) |
| **Average Prompt Tokens** | `145 tokens` / request |
| **Average Completion Tokens** | `95 tokens` / request |
| **Estimated Cost** | ~$0.0000375 USD per message (Gemini 2.0 Flash tier) |

### 💡 One Idea to Cut Token Cost & Latency by 40%:
**Deterministic Pre-Filter & Embedding Cache**:  
Implement a local regex + semantic embedding cache for common static inquiries (e.g., *"What are your support hours?"*, *"Where is your refund policy?"*). Inquiries matching standard FAQ embeddings can be routed instantly at `0ms` latency and `$0.00` LLM cost without invoking the main Gemini API.

---

## 6. 🚨 Where It Breaks & Future Improvements
- **Current Limitation / Edge Failure**: Deeply nested, ambiguous double-sarcasm across non-English code-switched text (e.g., mixed Hinglish sarcasm) can occasionally confuse sentiment score between `NEUTRAL` and `CONCERNED`.
- **With More Time**:
  1. **Function / Tool Calling**: Integrate live database API tools (e.g. `check_order_status(order_id)`) so Gemini can auto-verify transaction IDs when present.
  2. **RAG Knowledge Base**: Connect vector storage for internal company SLA policies to provide exact policy reference links in `suggested_action`.
