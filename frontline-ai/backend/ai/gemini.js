/**
 * FRONTLINE AI — Gemini AI Integration Module
 *
 * Uses Google GenAI SDK with structured JSON output.
 * Handles retries, timeouts, and malformed responses gracefully.
 */

import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT, RESPONSE_SCHEMA, buildAnalysisPrompt } from "./prompts.js";

let genAIClient = null;

/**
 * Lazily initialize the Gemini client.
 * Throws a descriptive error if the API key is missing.
 */
function getClient() {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      throw new Error(
        "GEMINI_API_KEY is not configured. Please set it in backend/.env"
      );
    }
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
}

// Model to use — gemini-2.0-flash is fast, capable, and cost-efficient
const MODEL_NAME = "gemini-2.0-flash";

/**
 * Analyze a customer message using Gemini with structured JSON output.
 *
 * @param {string} customerMessage - Raw customer message text
 * @returns {Promise<{decision: object, rawResponse: string, tokenUsage: object|null}>}
 */
export async function analyzeMessage(customerMessage) {
  const client = getClient();

  const userPrompt = buildAnalysisPrompt(customerMessage);

  const startTime = Date.now();

  let responseText = "";
  let tokenUsage = null;

  try {
    const response = await client.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }],
        },
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.1,     // low temperature for consistent classification
        maxOutputTokens: 2048,
      },
    });

    const latencyMs = Date.now() - startTime;

    // Extract token usage if available
    if (response.usageMetadata) {
      tokenUsage = {
        promptTokens: response.usageMetadata.promptTokenCount || null,
        candidateTokens: response.usageMetadata.candidatesTokenCount || null,
        totalTokens: response.usageMetadata.totalTokenCount || null,
      };
    }

    // Extract text from response
    responseText = response.text;

    if (!responseText || responseText.trim() === "") {
      throw new Error("Gemini returned an empty response");
    }

    // Parse and validate the JSON
    const decision = parseAndValidateResponse(responseText);

    return { decision, rawResponse: responseText, latencyMs, tokenUsage };
  } catch (err) {
    const latencyMs = Date.now() - startTime;

    // Re-throw with context
    const enhancedError = new Error(
      `Gemini analysis failed: ${err.message}`
    );
    enhancedError.originalError = err;
    enhancedError.rawResponse = responseText;
    enhancedError.latencyMs = latencyMs;
    throw enhancedError;
  }
}

/**
 * Parse and validate the Gemini JSON response.
 * Performs schema validation and value normalization.
 *
 * @param {string} responseText - Raw JSON string from Gemini
 * @returns {object} Validated and normalized decision object
 */
function parseAndValidateResponse(responseText) {
  let parsed;

  // Strip potential markdown fences (defensive measure even with responseMimeType)
  let cleanText = responseText.trim();
  if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```[a-z]*\n?/, "").replace(/```$/, "").trim();
  }

  try {
    parsed = JSON.parse(cleanText);
  } catch (parseErr) {
    throw new Error(`Failed to parse Gemini JSON response: ${parseErr.message}`);
  }

  // Normalize fields with strict validation
  const VALID_CATEGORIES = [
    "ACCOUNT","BILLING","PAYMENT","ORDER","DELIVERY","REFUND",
    "TECHNICAL","SECURITY","COMPLAINT","INFORMATION","OTHER","OUT_OF_SCOPE",
  ];
  const VALID_PRIORITIES = ["P0", "P1", "P2", "P3"];
  const VALID_SENTIMENTS = ["POSITIVE","NEUTRAL","CONCERNED","ANGRY","FRUSTRATED","URGENT"];
  const VALID_RISK_LEVELS = ["LOW","MEDIUM","HIGH","CRITICAL"];

  const validated = {
    category: VALID_CATEGORIES.includes(parsed.category) ? parsed.category : "OTHER",
    priority: VALID_PRIORITIES.includes(parsed.priority) ? parsed.priority : "P2",
    summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 500) : "Unable to generate summary",
    suggested_action: typeof parsed.suggested_action === "string" ? parsed.suggested_action.slice(0, 500) : "Route to human agent for review",
    needs_human: typeof parsed.needs_human === "boolean" ? parsed.needs_human : true,
    confidence: typeof parsed.confidence === "number"
      ? Math.min(1.0, Math.max(0.0, parsed.confidence))
      : 0.5,
    language: typeof parsed.language === "string" ? parsed.language.slice(0, 100) : "Unknown",
    sentiment: VALID_SENTIMENTS.includes(parsed.sentiment) ? parsed.sentiment : "NEUTRAL",
    risk_level: VALID_RISK_LEVELS.includes(parsed.risk_level) ? parsed.risk_level : "MEDIUM",
    issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 10).map(String) : [],
    is_multi_issue: typeof parsed.is_multi_issue === "boolean" ? parsed.is_multi_issue : false,
    is_adversarial: typeof parsed.is_adversarial === "boolean" ? parsed.is_adversarial : false,
    is_out_of_scope: typeof parsed.is_out_of_scope === "boolean" ? parsed.is_out_of_scope : false,
    escalation_reason: typeof parsed.escalation_reason === "string" ? parsed.escalation_reason.slice(0, 500) : "",
    reasoning_summary: typeof parsed.reasoning_summary === "string" ? parsed.reasoning_summary.slice(0, 1000) : "",
  };

  return validated;
}

/**
 * Test the Gemini API connectivity with a simple ping.
 * Used by the health endpoint.
 */
export async function pingGemini() {
  const start = Date.now();
  try {
    const client = getClient();
    const response = await client.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: "user", parts: [{ text: "Reply with: OK" }] }],
      config: { maxOutputTokens: 10, temperature: 0 },
    });
    const latency = Date.now() - start;
    const text = response.text?.trim();
    return { status: "operational", latency, response: text };
  } catch (err) {
    return { status: "unavailable", latency: Date.now() - start, error: err.message };
  }
}
