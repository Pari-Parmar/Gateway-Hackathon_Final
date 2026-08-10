/**
 * FRONTLINE AI — Evaluation Engine
 *
 * Runs the benchmark dataset against the full AI pipeline and
 * calculates accuracy metrics dynamically.
 *
 * Evaluation is honest — no hard-coded accuracy values.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { analyzeMessage } from "../ai/gemini.js";
import { runGuardrails } from "../guardrails/guardrails.js";
import { applyDecisionRules } from "../decision/decisionEngine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Load the benchmark dataset from disk.
 */
function loadBenchmark() {
  const dataPath = join(__dirname, "../data/benchmark_messages.json");
  const raw = readFileSync(dataPath, "utf-8");
  const data = JSON.parse(raw);
  return data.cases;
}

/**
 * Run a single evaluation case through the full pipeline.
 *
 * @param {object} testCase - A benchmark case with message and expected values
 * @returns {object} Result with actual vs expected values and pass/fail
 */
async function runSingleCase(testCase) {
  const start = Date.now();

  try {
    // Step 1: Guardrails
    const guardrails = runGuardrails(testCase.message);

    let decision;
    let latencyMs = 0;

    if (guardrails.blocked && !guardrails.adversarial) {
      // Blocked before AI call
      decision = {
        category: "OUT_OF_SCOPE",
        priority: "P3",
        needs_human: true,
        confidence: 0.1,
        is_adversarial: false,
        outcome: "BLOCKED_UNSAFE",
        risk_level: guardrails.risk,
      };
      latencyMs = Date.now() - start;
    } else {
      // Step 2: AI analysis
      const messageToAnalyze = guardrails.sanitized || testCase.message;
      const aiResult = await analyzeMessage(messageToAnalyze);
      latencyMs = aiResult.latencyMs;

      // Step 3: Decision engine
      decision = applyDecisionRules(aiResult.decision, guardrails);

      // Override adversarial if guardrails detected it
      if (guardrails.adversarial) {
        decision.is_adversarial = true;
      }
    }

    // ── Scoring ──────────────────────────────────────────────────────────
    const categoryCorrect = decision.category === testCase.expected_category;
    const priorityCorrect = decision.priority === testCase.expected_priority;
    const humanCorrect = decision.needs_human === testCase.expected_human;
    const adversarialCorrect = decision.is_adversarial === testCase.expected_adversarial;

    return {
      id: testCase.id,
      message: testCase.message,
      scenario_type: testCase.scenario_type,
      notes: testCase.notes,
      expected: {
        category: testCase.expected_category,
        priority: testCase.expected_priority,
        needs_human: testCase.expected_human,
        is_adversarial: testCase.expected_adversarial,
      },
      actual: {
        category: decision.category,
        priority: decision.priority,
        needs_human: decision.needs_human,
        is_adversarial: decision.is_adversarial,
        confidence: decision.confidence,
        risk_level: decision.risk_level,
        outcome: decision.outcome,
      },
      scores: {
        category_correct: categoryCorrect,
        priority_correct: priorityCorrect,
        human_correct: humanCorrect,
        adversarial_correct: adversarialCorrect,
        all_correct: categoryCorrect && priorityCorrect && humanCorrect,
      },
      latency_ms: latencyMs,
      error: null,
    };
  } catch (err) {
    return {
      id: testCase.id,
      message: testCase.message,
      scenario_type: testCase.scenario_type,
      expected: {
        category: testCase.expected_category,
        priority: testCase.expected_priority,
        needs_human: testCase.expected_human,
        is_adversarial: testCase.expected_adversarial,
      },
      actual: null,
      scores: {
        category_correct: false,
        priority_correct: false,
        human_correct: false,
        adversarial_correct: false,
        all_correct: false,
      },
      latency_ms: Date.now() - start,
      error: err.message,
    };
  }
}

/**
 * Run the full evaluation on the benchmark dataset.
 * Processes cases sequentially to avoid rate limiting.
 *
 * @param {object} opts - Options (e.g., maxCases for partial runs)
 * @returns {object} Full evaluation results with per-case details and aggregate metrics
 */
export async function runEvaluation(opts = {}) {
  const allCases = loadBenchmark();
  const casesToRun = opts.maxCases ? allCases.slice(0, opts.maxCases) : allCases;

  const results = [];
  const evalStartTime = Date.now();

  for (const testCase of casesToRun) {
    const result = await runSingleCase(testCase);
    results.push(result);

    // Small delay between cases to respect rate limits
    await new Promise((r) => setTimeout(r, 500));
  }

  const totalElapsed = Date.now() - evalStartTime;

  // ── Aggregate metrics ────────────────────────────────────────────────────
  const total = results.length;
  const successfulRuns = results.filter((r) => r.error === null);
  const failedRuns = results.filter((r) => r.error !== null);

  const categoryCorrect = successfulRuns.filter((r) => r.scores.category_correct).length;
  const priorityCorrect = successfulRuns.filter((r) => r.scores.priority_correct).length;
  const humanCorrect = successfulRuns.filter((r) => r.scores.human_correct).length;
  const adversarialCorrect = successfulRuns.filter((r) => r.scores.adversarial_correct).length;
  const allCorrect = successfulRuns.filter((r) => r.scores.all_correct).length;

  // Adversarial cases only
  const adversarialCases = successfulRuns.filter((r) => r.expected.is_adversarial === true);
  const adversarialDetected = adversarialCases.filter((r) => r.scores.adversarial_correct).length;

  // Latency stats
  const latencies = successfulRuns.map((r) => r.latency_ms);
  const avgLatency = latencies.length > 0
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : 0;
  const minLatency = latencies.length > 0 ? Math.min(...latencies) : 0;
  const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;

  // Average confidence (from successful runs that have actual data)
  const confidences = successfulRuns
    .filter((r) => r.actual?.confidence !== undefined)
    .map((r) => r.actual.confidence);
  const avgConfidence = confidences.length > 0
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : 0;

  const metrics = {
    dataset_info: {
      name: "FRONTLINE AI Prototype Benchmark Dataset",
      type: "Synthetic / Hand-Labeled",
      total_cases: allCases.length,
      cases_run: total,
      cases_successful: successfulRuns.length,
      cases_failed: failedRuns.length,
    },
    accuracy: {
      category_accuracy: total > 0 ? (categoryCorrect / successfulRuns.length) : 0,
      category_correct: categoryCorrect,
      category_total: successfulRuns.length,

      priority_accuracy: successfulRuns.length > 0 ? (priorityCorrect / successfulRuns.length) : 0,
      priority_correct: priorityCorrect,
      priority_total: successfulRuns.length,

      human_escalation_accuracy: successfulRuns.length > 0 ? (humanCorrect / successfulRuns.length) : 0,
      human_escalation_correct: humanCorrect,
      human_escalation_total: successfulRuns.length,

      adversarial_detection_accuracy: adversarialCases.length > 0 ? (adversarialDetected / adversarialCases.length) : 0,
      adversarial_detected: adversarialDetected,
      adversarial_total: adversarialCases.length,

      overall_accuracy: successfulRuns.length > 0 ? (allCorrect / successfulRuns.length) : 0,
      overall_correct: allCorrect,
      overall_total: successfulRuns.length,
    },
    performance: {
      avg_latency_ms: avgLatency,
      min_latency_ms: minLatency,
      max_latency_ms: maxLatency,
      avg_confidence: avgConfidence,
      total_elapsed_ms: totalElapsed,
    },
  };

  return {
    metrics,
    results,
    timestamp: new Date().toISOString(),
  };
}
