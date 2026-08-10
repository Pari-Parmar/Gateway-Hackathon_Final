/**
 * FRONTLINE AI — Decision Engine
 *
 * Applies deterministic post-AI rules to finalize the triage decision.
 *
 * Key Principle:
 *   "AI recommends. Rules verify. Humans handle uncertainty."
 *
 * Gemini provides an AI recommendation.
 * This engine applies business rules to produce the FINAL decision.
 * The LLM never has unrestricted authority over routing decisions.
 */

// ─── Decision outcomes ─────────────────────────────────────────────────────────
export const DECISION_OUTCOMES = {
  AUTO_ROUTE: "AUTO_ROUTE",
  HUMAN_REVIEW: "HUMAN_REVIEW",
  BLOCKED_UNSAFE: "BLOCKED_UNSAFE",
  NEEDS_CLARIFICATION: "NEEDS_CLARIFICATION",
};

// ─── Confidence threshold for human review ────────────────────────────────────
const CONFIDENCE_HUMAN_THRESHOLD = 0.70;

/**
 * Apply deterministic business rules to produce the final routing decision.
 *
 * @param {object} aiDecision - The validated AI triage decision from Gemini
 * @param {object} guardrails - Result from the guardrail engine
 * @returns {object} Enhanced decision with final routing
 */
export function applyDecisionRules(aiDecision, guardrails) {
  const overrides = [];
  let finalNeedsHuman = aiDecision.needs_human;
  let outcome = DECISION_OUTCOMES.AUTO_ROUTE;
  let finalRiskLevel = aiDecision.risk_level;
  let finalPriority = aiDecision.priority;

  // ── Rule 1: Adversarial input → BLOCKED_UNSAFE ─────────────────────────
  if (guardrails.adversarial || aiDecision.is_adversarial) {
    finalNeedsHuman = true;
    finalRiskLevel = "CRITICAL";
    finalPriority = "P0";
    outcome = DECISION_OUTCOMES.BLOCKED_UNSAFE;
    overrides.push({
      rule: "ADVERSARIAL_DETECTION",
      reason: "Adversarial or prompt injection content detected. Blocked for security review.",
    });
  }

  // ── Rule 2: P0 Critical priority → always human ───────────────────────
  if (finalPriority === "P0" && outcome !== DECISION_OUTCOMES.BLOCKED_UNSAFE) {
    finalNeedsHuman = true;
    outcome = DECISION_OUTCOMES.HUMAN_REVIEW;
    overrides.push({
      rule: "P0_MANDATORY_ESCALATION",
      reason: "Priority P0 (Critical) always requires human review.",
    });
  }

  // ── Rule 3: Security category with P0 or P1 → human ──────────────────
  if (
    aiDecision.category === "SECURITY" &&
    ["P0", "P1"].includes(finalPriority) &&
    outcome !== DECISION_OUTCOMES.BLOCKED_UNSAFE
  ) {
    finalNeedsHuman = true;
    if (outcome !== DECISION_OUTCOMES.HUMAN_REVIEW) {
      outcome = DECISION_OUTCOMES.HUMAN_REVIEW;
    }
    overrides.push({
      rule: "SECURITY_CATEGORY_ESCALATION",
      reason: "Security category with high priority requires human security team review.",
    });
  }

  // ── Rule 4: High risk level → human ──────────────────────────────────
  if (["HIGH", "CRITICAL"].includes(finalRiskLevel) && outcome === DECISION_OUTCOMES.AUTO_ROUTE) {
    finalNeedsHuman = true;
    outcome = DECISION_OUTCOMES.HUMAN_REVIEW;
    overrides.push({
      rule: "HIGH_RISK_ESCALATION",
      reason: `Risk level ${finalRiskLevel} requires human review before action.`,
    });
  }

  // ── Rule 5: Low confidence → human / clarification ───────────────────
  if (aiDecision.confidence < CONFIDENCE_HUMAN_THRESHOLD) {
    finalNeedsHuman = true;
    if (outcome === DECISION_OUTCOMES.AUTO_ROUTE) {
      outcome =
        aiDecision.confidence < 0.45
          ? DECISION_OUTCOMES.NEEDS_CLARIFICATION
          : DECISION_OUTCOMES.HUMAN_REVIEW;
    }
    overrides.push({
      rule: "LOW_CONFIDENCE_ESCALATION",
      reason: `AI confidence ${(aiDecision.confidence * 100).toFixed(0)}% is below the 70% threshold for automated routing.`,
    });
  }

  // ── Rule 6: Multi-issue messages → human ─────────────────────────────
  if (aiDecision.is_multi_issue && outcome === DECISION_OUTCOMES.AUTO_ROUTE) {
    finalNeedsHuman = true;
    outcome = DECISION_OUTCOMES.HUMAN_REVIEW;
    overrides.push({
      rule: "MULTI_ISSUE_ESCALATION",
      reason: "Multiple distinct issues detected; human coordination required for resolution.",
    });
  }

  // ── Rule 7: Financial risk — PAYMENT/BILLING P1 → human ──────────────
  if (
    ["PAYMENT", "BILLING", "REFUND"].includes(aiDecision.category) &&
    ["P0", "P1"].includes(finalPriority) &&
    outcome === DECISION_OUTCOMES.AUTO_ROUTE
  ) {
    finalNeedsHuman = true;
    outcome = DECISION_OUTCOMES.HUMAN_REVIEW;
    overrides.push({
      rule: "FINANCIAL_RISK_ESCALATION",
      reason: "Financial transaction detected with potential monetary impact — human verification required.",
    });
  }

  // ── Rule 8: Gibberish → needs clarification ───────────────────────────
  if (guardrails.isGibberish && outcome === DECISION_OUTCOMES.AUTO_ROUTE) {
    finalNeedsHuman = true;
    outcome = DECISION_OUTCOMES.NEEDS_CLARIFICATION;
    overrides.push({
      rule: "GIBBERISH_CLARIFICATION",
      reason: "Message has insufficient information to classify. Customer should be prompted to restate their issue.",
    });
  }

  // ── Rule 9: Out-of-scope → flag but don't block ───────────────────────
  if (aiDecision.is_out_of_scope && outcome === DECISION_OUTCOMES.AUTO_ROUTE) {
    outcome = DECISION_OUTCOMES.AUTO_ROUTE;
    overrides.push({
      rule: "OUT_OF_SCOPE_FLAG",
      reason: "Message is out of scope for customer support.",
    });
  }

  // ── Rule 10: If AI marked needs_human=true or ANGRY sentiment → human review ──
  if (
    (finalNeedsHuman || aiDecision.sentiment === "ANGRY") &&
    outcome === DECISION_OUTCOMES.AUTO_ROUTE
  ) {
    outcome = DECISION_OUTCOMES.HUMAN_REVIEW;
    overrides.push({
      rule: "AI_RECOMMENDED_ESCALATION",
      reason: "AI Model recommended human escalation or detected hostile customer sentiment.",
    });
  }

  // ── Final decision construction ───────────────────────────────────────
  const finalDecision = {
    ...aiDecision,
    needs_human: finalNeedsHuman,
    risk_level: finalRiskLevel,
    priority: finalPriority,
    outcome,
    decision_overrides: overrides,
    decision_rules_applied: overrides.map((o) => o.rule),
    // Human-readable outcome label
    outcome_label: getOutcomeLabel(outcome),
  };

  return finalDecision;
}

/**
 * Get a human-readable label for the outcome.
 */
function getOutcomeLabel(outcome) {
  const labels = {
    [DECISION_OUTCOMES.AUTO_ROUTE]: "Auto Route",
    [DECISION_OUTCOMES.HUMAN_REVIEW]: "Human Review Required",
    [DECISION_OUTCOMES.BLOCKED_UNSAFE]: "Blocked — Security Risk",
    [DECISION_OUTCOMES.NEEDS_CLARIFICATION]: "Needs Clarification",
  };
  return labels[outcome] || outcome;
}

/**
 * Get a CSS-style color class for the outcome (used by frontend).
 */
export function getOutcomeColor(outcome) {
  const colors = {
    [DECISION_OUTCOMES.AUTO_ROUTE]: "green",
    [DECISION_OUTCOMES.HUMAN_REVIEW]: "orange",
    [DECISION_OUTCOMES.BLOCKED_UNSAFE]: "red",
    [DECISION_OUTCOMES.NEEDS_CLARIFICATION]: "yellow",
  };
  return colors[outcome] || "gray";
}

/**
 * Get color for priority level.
 */
export function getPriorityColor(priority) {
  const colors = {
    P0: "red",
    P1: "orange",
    P2: "blue",
    P3: "green",
  };
  return colors[priority] || "gray";
}
