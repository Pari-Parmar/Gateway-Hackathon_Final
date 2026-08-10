/**
 * FRONTLINE AI — Guardrail Engine (Layer 1 & 4)
 *
 * Deterministic pre-processing checks BEFORE and AFTER the AI call.
 * These rules are NOT AI-based — they are fast, reliable, and auditable.
 *
 * Architecture: "AI recommends. Rules verify. Humans handle uncertainty."
 */

// ─── Configuration ─────────────────────────────────────────────────────────────
const MAX_MESSAGE_LENGTH = 5000;
const MIN_MESSAGE_LENGTH = 1;
const GIBBERISH_RATIO_THRESHOLD = 0.75; // If >75% chars are non-alphabetic
const GIBBERISH_LENGTH_THRESHOLD = 20;  // Only check ratio for messages longer than this

// ─── Adversarial pattern library ─────────────────────────────────────────────
const ADVERSARIAL_PATTERNS = [
  // Prompt injection classics
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|rules?|constraints?|prompts?)/i,
  /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions?|rules?|constraints?)/i,
  /forget\s+(all\s+)?(previous|prior|above)\s+(instructions?|rules?|constraints?)/i,
  /override\s+(all\s+)?(previous|prior)\s+(instructions?|rules?)/i,

  // System prompt extraction
  /reveal\s+(your\s+)?(system\s+prompt|instructions?|configuration|api\s+key)/i,
  /show\s+(me\s+)?(your\s+)?(system\s+prompt|internal\s+instructions?|config)/i,
  /what\s+(is|are)\s+(your\s+)?(system\s+prompt|instructions?)/i,
  /print\s+(your\s+)?(system\s+prompt|instructions?)/i,
  /repeat\s+(your\s+)?(system\s+prompt|instructions?)/i,

  // API key / credential extraction
  /api[_\s]key/i,
  /give\s+(me\s+)?(the\s+)?(api|secret|admin|password|credential|token)/i,
  /reveal\s+(the\s+)?(api|secret|admin|password|credential|token)/i,
  /what\s+is\s+(your|the)\s+(api|secret|password|token)/i,

  // Role/persona override
  /you\s+are\s+now\s+(an?\s+)?(unrestricted|jailbroken|free|admin|root|dan\b|gpt\b|openai\b)/i,
  /\bdan\b.{0,30}(mode|activated|enabled|no\s+restriction)/i,
  /pretend\s+(you\s+are|to\s+be)\s+(an?\s+)?(unrestricted|admin|root|jailbroken|dan)/i,
  /act\s+as\s+(an?\s+)?(unrestricted|admin|root|dan|jailbroken)/i,
  /I\s+am\s+(the\s+)?(administrator|admin|root|system|developer|owner)/i,
  /you\s+(have\s+)?(no\s+restrictions?|are\s+free|are\s+unrestricted|can\s+do\s+anything)/i,

  // Safety filter bypass
  /disable\s+(all\s+)?(safety|content|moderation|filter)/i,
  /bypass\s+(all\s+)?(safety|content|moderation|filter|guardrail)/i,
  /remove\s+(all\s+)?(restriction|limit|filter|constraint)/i,
  /turn\s+off\s+(safety|filter|guardrail)/i,

  // New instruction injection
  /^new\s+instruction[s]?\s*[:=]/im,
  /^system\s*[:=]/im,
  /^\[?INST\]?\s*[:=]/im,

  // Full system access
  /give\s+(me\s+)?(full|admin|root|complete)\s+(system\s+)?(access|control|privilege)/i,
  /grant\s+(me\s+)?(admin|root|full)\s+(access|privilege)/i,
];

// ─── Low-information / gibberish patterns ─────────────────────────────────────
const GIBBERISH_PATTERNS = [
  /^[^a-zA-Z]*$/, // No alphabetic chars at all (pure symbols/numbers)
  /^(.)\1{9,}$/,  // Same character repeated 10+ times (aaaaaaaaa)
];

/**
 * Run all pre-processing guardrail checks on the raw input.
 *
 * @param {string} rawMessage - The raw customer message
 * @returns {{ blocked: boolean, adversarial: boolean, risk: string, flags: string[], sanitized: string }}
 */
export function runGuardrails(rawMessage) {
  const flags = [];
  let blocked = false;
  let adversarial = false;
  let risk = "LOW";

  // ── 1. Empty / null check ────────────────────────────────────────────────
  if (!rawMessage || typeof rawMessage !== "string") {
    return {
      blocked: true,
      adversarial: false,
      risk: "LOW",
      flags: ["EMPTY_INPUT"],
      sanitized: "",
      reason: "Message is empty or invalid.",
    };
  }

  const trimmed = rawMessage.trim();

  if (trimmed.length < MIN_MESSAGE_LENGTH) {
    return {
      blocked: true,
      adversarial: false,
      risk: "LOW",
      flags: ["EMPTY_INPUT"],
      sanitized: "",
      reason: "Message is empty.",
    };
  }

  // ── 2. Length check ──────────────────────────────────────────────────────
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    flags.push("OVERSIZED_INPUT");
    blocked = true;
    risk = "MEDIUM";
  }

  // ── 3. Adversarial pattern detection ────────────────────────────────────
  for (const pattern of ADVERSARIAL_PATTERNS) {
    if (pattern.test(trimmed)) {
      adversarial = true;
      blocked = false; // Don't fully block — still classify for audit
      risk = "CRITICAL";
      flags.push("PROMPT_INJECTION_DETECTED");
      break;
    }
  }

  // ── 4. Gibberish / garbage detection ────────────────────────────────────
  let isGibberish = false;

  // Check pure-symbol patterns
  for (const pattern of GIBBERISH_PATTERNS) {
    if (pattern.test(trimmed)) {
      isGibberish = true;
      flags.push("GIBBERISH_INPUT");
      risk = risk === "LOW" ? "LOW" : risk;
      break;
    }
  }

  // Check character ratio for longer messages
  if (!isGibberish && trimmed.length > GIBBERISH_LENGTH_THRESHOLD) {
    const alphaChars = (trimmed.match(/[a-zA-Z\u00C0-\u024F\u0900-\u097F\u0600-\u06FF]/g) || []).length;
    const ratio = alphaChars / trimmed.length;
    if (ratio < (1 - GIBBERISH_RATIO_THRESHOLD)) {
      isGibberish = true;
      flags.push("LOW_INFORMATION_CONTENT");
    }
  }

  // ── 5. Determine overall risk escalation ─────────────────────────────────
  if (adversarial) risk = "CRITICAL";
  else if (flags.includes("OVERSIZED_INPUT")) risk = "MEDIUM";
  else if (isGibberish) risk = "LOW";

  // ── 6. Sanitize message (truncate to safe length) ─────────────────────────
  const sanitized = trimmed.slice(0, MAX_MESSAGE_LENGTH);

  return {
    blocked,
    adversarial,
    risk,
    flags,
    sanitized,
    isGibberish,
    reason: buildGuardrailReason(flags, blocked, adversarial),
  };
}

/**
 * Post-processing guardrail — validate that the AI decision
 * does not smuggle out sensitive data.
 *
 * @param {object} decision - The AI-generated triage decision
 * @returns {object} Cleaned decision
 */
export function sanitizeAIOutput(decision) {
  const SENSITIVE_PATTERNS = [
    /GEMINI_API_KEY/i,
    /api[_\s]key\s*[:=]/i,
    /sk-[A-Za-z0-9]+/,
    /Bearer\s+[A-Za-z0-9._\-]+/i,
    /system\s+prompt\s+is\s*[:=]/i,
  ];

  const flaggedOutput = false;

  const sanitize = (text) => {
    if (typeof text !== "string") return text;
    for (const pattern of SENSITIVE_PATTERNS) {
      if (pattern.test(text)) {
        return "[REDACTED — sensitive content detected in AI output]";
      }
    }
    return text;
  };

  return {
    ...decision,
    summary: sanitize(decision.summary),
    suggested_action: sanitize(decision.suggested_action),
    escalation_reason: sanitize(decision.escalation_reason),
    reasoning_summary: sanitize(decision.reasoning_summary),
  };
}

function buildGuardrailReason(flags, blocked, adversarial) {
  if (adversarial) return "Adversarial or prompt injection content detected. Flagged for human security review.";
  if (flags.includes("EMPTY_INPUT")) return "Message is empty or contains no content.";
  if (flags.includes("OVERSIZED_INPUT")) return "Message exceeds the maximum allowed length.";
  if (flags.includes("GIBBERISH_INPUT")) return "Message appears to be gibberish or random input.";
  if (flags.includes("LOW_INFORMATION_CONTENT")) return "Message has very low information content.";
  return "";
}
