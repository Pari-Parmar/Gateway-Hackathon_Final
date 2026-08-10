/**
 * FRONTLINE AI — Express Backend Server
 *
 * Provides REST API endpoints for the React frontend.
 * All Gemini API calls happen here — the API key NEVER leaves the server.
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { v4 as uuidv4 } from "uuid";

import { analyzeMessage, pingGemini } from "./ai/gemini.js";
import { runGuardrails, sanitizeAIOutput } from "./guardrails/guardrails.js";
import { applyDecisionRules } from "./decision/decisionEngine.js";
import { runEvaluation } from "./evaluation/evaluator.js";

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: true, // Allow all local & network origins in development
  credentials: true,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
}));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// ─── Rate limiting ────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Too many requests. Please wait before retrying." },
  standardHeaders: true,
  legacyHeaders: false,
});

const evaluationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  message: { error: "Evaluation can only be run 3 times per 5 minutes due to API costs." },
});

// ─── In-memory storage (prototype) ───────────────────────────────────────────
const triageLog = [];
const stats = {
  totalRequests: 0,
  successfulAnalyses: 0,
  failedAnalyses: 0,
  humanEscalations: 0,
  highRiskCases: 0,
  adversarialBlocked: 0,
  latencies: [],
  lastRequest: null,
  geminiStatus: "unknown",
};

// ─── API Routes ───────────────────────────────────────────────────────────────

/**
 * POST /api/analyze
 * Main triage endpoint. Accepts a customer message and returns a structured decision.
 */
app.post("/api/analyze", apiLimiter, async (req, res) => {
  const requestId = uuidv4();
  const requestStart = Date.now();

  try {
    const { message } = req.body;

    // ── Layer 1: Input validation ─────────────────────────────────────────
    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Invalid request. 'message' field is required and must be a string.",
        requestId,
      });
    }

    stats.totalRequests++;
    stats.lastRequest = new Date().toISOString();

    // ── Layer 2: Guardrail checks ─────────────────────────────────────────
    const guardrailResult = runGuardrails(message);

    if (guardrailResult.blocked && !guardrailResult.adversarial) {
      // Blocked before AI — don't even call Gemini
      const blockedDecision = {
        category: "OUT_OF_SCOPE",
        priority: "P3",
        summary: guardrailResult.reason || "Message blocked by guardrails.",
        suggested_action: "Review the guardrail flags and respond to the customer appropriately.",
        needs_human: true,
        confidence: 0.1,
        language: "Unknown",
        sentiment: "NEUTRAL",
        risk_level: guardrailResult.risk,
        issues: [],
        is_multi_issue: false,
        is_adversarial: guardrailResult.adversarial,
        is_out_of_scope: true,
        escalation_reason: guardrailResult.reason,
        reasoning_summary: `Blocked by guardrail: ${guardrailResult.flags.join(", ")}`,
        outcome: "BLOCKED_UNSAFE",
        outcome_label: "Blocked — Safety Check Failed",
        decision_overrides: [],
        decision_rules_applied: ["GUARDRAIL_BLOCK"],
      };

      const totalLatency = Date.now() - requestStart;
      logTriageEntry(requestId, message, blockedDecision, guardrailResult, totalLatency);
      updateStats(blockedDecision, totalLatency, true);

      return res.json({
        requestId,
        decision: blockedDecision,
        guardrails: {
          blocked: guardrailResult.blocked,
          adversarial: guardrailResult.adversarial,
          risk: guardrailResult.risk,
          flags: guardrailResult.flags,
        },
        latency_ms: totalLatency,
        token_usage: null,
      });
    }

    // ── Layer 3: Gemini AI analysis ───────────────────────────────────────
    const messageToAnalyze = guardrailResult.sanitized || message;
    let aiResult;

    try {
      aiResult = await analyzeMessage(messageToAnalyze);
      stats.geminiStatus = "operational";
    } catch (aiErr) {
      stats.failedAnalyses++;
      stats.geminiStatus = "error";
      console.error(`[${requestId}] Gemini error:`, aiErr.message);

      return res.status(503).json({
        error: "AI service temporarily unavailable. Please retry in a moment.",
        requestId,
        details: process.env.NODE_ENV === "development" ? aiErr.message : undefined,
      });
    }

    // ── Layer 4: Sanitize AI output ───────────────────────────────────────
    const sanitizedDecision = sanitizeAIOutput(aiResult.decision);

    // Override adversarial flag if guardrails detected it
    if (guardrailResult.adversarial) {
      sanitizedDecision.is_adversarial = true;
    }

    // ── Layer 5: Decision engine ──────────────────────────────────────────
    const finalDecision = applyDecisionRules(sanitizedDecision, guardrailResult);

    // ── Log and respond ───────────────────────────────────────────────────
    const totalLatency = Date.now() - requestStart;
    logTriageEntry(requestId, message, finalDecision, guardrailResult, totalLatency);
    updateStats(finalDecision, totalLatency, false);

    res.json({
      requestId,
      decision: finalDecision,
      guardrails: {
        blocked: guardrailResult.blocked,
        adversarial: guardrailResult.adversarial,
        risk: guardrailResult.risk,
        flags: guardrailResult.flags,
      },
      latency_ms: totalLatency,
      token_usage: aiResult.tokenUsage || null,
    });
  } catch (err) {
    stats.failedAnalyses++;
    console.error(`[${requestId}] Unexpected error:`, err);

    res.status(500).json({
      error: "An unexpected error occurred. Please try again.",
      requestId,
    });
  }
});

/**
 * GET /api/health
 * Returns system health status.
 */
app.get("/api/health", async (req, res) => {
  const geminiPing = await pingGemini();
  stats.geminiStatus = geminiPing.status;

  res.json({
    status: "operational",
    timestamp: new Date().toISOString(),
    backend: "operational",
    gemini: geminiPing,
    uptime_seconds: Math.floor(process.uptime()),
    node_version: process.version,
    environment: process.env.NODE_ENV || "development",
  });
});

/**
 * GET /api/stats
 * Returns aggregate statistics for the dashboard.
 */
app.get("/api/stats", (req, res) => {
  const latencies = stats.latencies.slice(-100); // Last 100 latencies
  const avgLatency = latencies.length > 0
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : 0;
  const minLatency = latencies.length > 0 ? Math.min(...latencies) : 0;
  const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;

  res.json({
    total_messages: stats.totalRequests,
    successful_analyses: stats.successfulAnalyses,
    failed_analyses: stats.failedAnalyses,
    human_escalations: stats.humanEscalations,
    high_risk_cases: stats.highRiskCases,
    adversarial_blocked: stats.adversarialBlocked,
    avg_latency_ms: avgLatency,
    min_latency_ms: minLatency,
    max_latency_ms: maxLatency,
    gemini_status: stats.geminiStatus,
    last_request: stats.lastRequest,
    automation_rate: stats.successfulAnalyses > 0
      ? ((stats.successfulAnalyses - stats.humanEscalations) / stats.successfulAnalyses * 100).toFixed(1)
      : "0.0",
  });
});

/**
 * GET /api/queue
 * Returns the triage log for the queue page.
 */
app.get("/api/queue", (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const entries = triageLog.slice(-limit).reverse(); // Most recent first
  res.json({ entries, total: triageLog.length });
});

/**
 * POST /api/evaluate
 * Runs the full benchmark evaluation. Rate-limited due to API costs.
 */
app.post("/api/evaluate", evaluationLimiter, async (req, res) => {
  try {
    const { maxCases } = req.body || {};
    console.log(`[EVAL] Starting evaluation run... maxCases=${maxCases || "all"}`);

    const evalResult = await runEvaluation({ maxCases: maxCases || undefined });
    res.json(evalResult);
  } catch (err) {
    console.error("[EVAL] Evaluation error:", err);
    res.status(500).json({
      error: "Evaluation failed. Check server logs.",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

/**
 * GET /api/benchmark-info
 * Returns benchmark dataset metadata without running the evaluation.
 */
app.get("/api/benchmark-info", (req, res) => {
  try {
    const { readFileSync } = await import("fs");
    // Dynamically import to avoid issues
  } catch {}

  // Return static metadata
  res.json({
    name: "FRONTLINE AI Prototype Benchmark Dataset",
    type: "Synthetic / Hand-Labeled",
    total_cases: 40,
    categories: {
      normal: 5,
      billing_payment: 5,
      security: 5,
      technical_order_delivery: 5,
      ambiguous: 5,
      adversarial: 5,
      multilingual: 5,
      multi_issue_unusual: 5,
    },
  });
});

// ─── Helper functions ─────────────────────────────────────────────────────────
function logTriageEntry(requestId, message, decision, guardrails, latencyMs) {
  triageLog.push({
    id: requestId,
    timestamp: new Date().toISOString(),
    message: message.slice(0, 200), // Truncate for storage
    decision,
    guardrails: {
      blocked: guardrails.blocked,
      adversarial: guardrails.adversarial,
      risk: guardrails.risk,
      flags: guardrails.flags,
    },
    latency_ms: latencyMs,
  });

  // Keep only last 500 entries to avoid memory growth
  if (triageLog.length > 500) triageLog.shift();
}

function updateStats(decision, latencyMs, wasBlocked) {
  if (!wasBlocked) stats.successfulAnalyses++;

  if (decision.needs_human) stats.humanEscalations++;
  if (["HIGH", "CRITICAL"].includes(decision.risk_level)) stats.highRiskCases++;
  if (decision.is_adversarial) stats.adversarialBlocked++;

  stats.latencies.push(latencyMs);
  if (stats.latencies.length > 500) stats.latencies.shift();
}

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found." });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error." });
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log(`
╔══════════════════════════════════════════════╗
║          FRONTLINE AI — Backend Server        ║
║   AI-Powered Customer Support Triage          ║
╚══════════════════════════════════════════════╝
🚀 Server running on http://localhost:${PORT} and Network 0.0.0.0:${PORT}
📊 API: http://localhost:${PORT}/api
🔑 Gemini API key: ${process.env.GEMINI_API_KEY ? "✅ Configured" : "❌ NOT SET"}
  `);
});
