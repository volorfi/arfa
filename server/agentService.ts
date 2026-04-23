/**
 * agentService.ts — Multi-agent signal pipeline
 *
 * Pipeline stages (matches blueprint architecture):
 *   [fundamental_agent, technical_agent, news_agent]  ← parallel
 *       → reconciler_agent (debate / moderation)
 *       → risk_agent (confidence penalty + governance)
 *       → persist Signal to MySQL
 *
 * Each agent uses the existing invokeLLM wrapper so all calls flow through
 * the same auth, rate-limiting, and model config already set up in _core/llm.ts
 */

import { nanoid } from "nanoid";
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { assets, signals } from "../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AgentStance =
  | "bullish" | "bearish" | "neutral"
  | "tightening" | "widening" | "stable"
  | "stronger" | "weaker" | "range_bound";

export type ConsensusState =
  | "bullish" | "lean_bullish" | "neutral"
  | "lean_bearish" | "bearish" | "inconclusive";

export type ConfidenceBand = "very_high" | "high" | "moderate" | "low" | "abstain";

export interface AgentAnalysis {
  agentName:       string;
  stance:          AgentStance;
  confidenceScore: number;         // 0–1
  thesisSummary:   string;         // max 300 chars
  positiveDrivers: string[];
  negativeDrivers: string[];
  riskFlags:       string[];
  falsifiers:      string[];
  knownUnknowns:   string[];
}

export interface ModerationResult {
  consensusState:      ConsensusState;
  confirmedFacts:      string[];
  contestedPoints:     string[];
  disagreementScore:   number;     // 0–1
  moderatedConfidence: number;     // 0–1
  recommendedStance:   AgentStance;
  topDrivers:          string[];
  riskFlags:           string[];
  falsifiers:          string[];
  bullThesis:          string | null;
  bearThesis:          string | null;
}

export interface RiskReview {
  riskStatus:         "pass" | "pass_with_penalty" | "review_required" | "abstain";
  confidencePenalty:  number;      // 0–0.3
  governanceFlags:    string[];
  abstain:            boolean;
  abstainReason:      string | null;
}

// ─── System prompts ───────────────────────────────────────────────────────────

const AGENT_OUTPUT_SCHEMA = `{
  "agentName": string,
  "stance": "bullish"|"bearish"|"neutral"|"tightening"|"widening"|"stable"|"stronger"|"weaker"|"range_bound",
  "confidenceScore": number (0-1),
  "thesisSummary": string (max 300 chars),
  "positiveDrivers": string[],
  "negativeDrivers": string[],
  "riskFlags": string[],
  "falsifiers": string[],
  "knownUnknowns": string[]
}`;

const makeAgentPrompt = (agentName: string, focus: string) => `
You are ${agentName}, a specialist financial analyst for ARFA Markets.
Your focus: ${focus}

Rules:
- Return ONLY valid JSON. No prose, no markdown, no code fences.
- Never invent specific numbers (prices, earnings) you cannot verify.
- Every driver/risk/falsifier must be a specific, concise statement (max 80 chars each).
- Limit lists to 5 items each.
- Use "neutral" stance when evidence is genuinely insufficient.
- Output schema: ${AGENT_OUTPUT_SCHEMA}
`.trim();

const FUNDAMENTAL_SYSTEM = makeAgentPrompt(
  "fundamental_agent",
  "Valuation, earnings quality, balance sheet health, estimate revisions, management track record."
);

const TECHNICAL_SYSTEM = makeAgentPrompt(
  "technical_agent",
  "Price trend, momentum, relative strength, volume patterns, key support/resistance levels, regime."
);

const NEWS_SYSTEM = makeAgentPrompt(
  "news_agent",
  "Recent news sentiment, narrative shifts, earnings call tone, insider activity signals, catalyst calendar."
);

const MACRO_SYSTEM = makeAgentPrompt(
  "macro_agent",
  "Macro regime (rates, inflation, credit cycle), sector tailwinds/headwinds, country/currency exposure, geopolitical risk."
);

const RECONCILER_SYSTEM = `
You are the reconciler_agent (debate moderator) for ARFA Markets.
Given analyses from multiple specialist agents, your job is synthesis — not creativity.

Rules:
- Identify only confirmed facts (agreed by 2+ agents).
- Identify genuinely contested points (agents disagree).
- Compute disagreementScore: 0 = full consensus, 1 = total conflict.
- Return ONLY valid JSON matching this exact schema:
{
  "consensusState": "bullish"|"lean_bullish"|"neutral"|"lean_bearish"|"bearish"|"inconclusive",
  "confirmedFacts": string[],
  "contestedPoints": string[],
  "disagreementScore": number (0-1),
  "moderatedConfidence": number (0-1),
  "recommendedStance": string,
  "topDrivers": string[] (max 5),
  "riskFlags": string[] (max 8),
  "falsifiers": string[] (max 5),
  "bullThesis": string|null (max 200 chars),
  "bearThesis": string|null (max 200 chars)
}
`.trim();

const RISK_SYSTEM = `
You are the risk_agent for ARFA Markets.
Given a moderated analysis, apply governance and risk controls.

Rules:
- Apply confidence penalty for: high disagreement (>0.5), valuation excess flags, earnings proximity, macro regime uncertainty, data freshness warnings.
- confidencePenalty range: 0.0 – 0.3 only.
- abstain = true only when the signal is genuinely unreliable.
- Return ONLY valid JSON:
{
  "riskStatus": "pass"|"pass_with_penalty"|"review_required"|"abstain",
  "confidencePenalty": number (0-0.3),
  "governanceFlags": string[],
  "abstain": boolean,
  "abstainReason": string|null
}
`.trim();

// ─── JSON extraction helper ───────────────────────────────────────────────────

function extractJSON(raw: string): unknown {
  const cleaned = raw.replace(/^```(?:json)?\s*/m, "").replace(/```\s*$/m, "").trim();
  return JSON.parse(cleaned);
}

// ─── Single agent call ────────────────────────────────────────────────────────

async function callAgent(systemPrompt: string, userContent: string): Promise<unknown> {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userContent  },
    ],
  });

  // invokeLLM returns the text content
  const text = typeof response === "string" ? response : JSON.stringify(response);
  return extractJSON(text);
}

// ─── Confidence → band ────────────────────────────────────────────────────────

function toBand(score: number): ConfidenceBand {
  if (score >= 0.80) return "very_high";
  if (score >= 0.65) return "high";
  if (score >= 0.45) return "moderate";
  if (score > 0)     return "low";
  return "abstain";
}

// ─── Consensus → final stance ─────────────────────────────────────────────────

function consensusToStance(state: ConsensusState): AgentStance {
  const map: Record<ConsensusState, AgentStance> = {
    bullish:       "bullish",
    lean_bullish:  "bullish",
    neutral:       "neutral",
    lean_bearish:  "bearish",
    bearish:       "bearish",
    inconclusive:  "neutral",
  };
  return map[state] ?? "neutral";
}

// ─── Ensure asset exists, return assetId ─────────────────────────────────────

export async function ensureAsset(params: {
  assetClass: "equity" | "bond" | "fx" | "commodity" | "index" | "etf" | "macro";
  identifier: string;
  displayName: string;
  exchangeCode?: string;
  currency?: string;
  countryCode?: string;
}): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const existing = await db
    .select({ id: assets.id })
    .from(assets)
    .where(and(eq(assets.assetClass, params.assetClass), eq(assets.identifier, params.identifier)))
    .limit(1);

  if (existing.length > 0) return existing[0].id;

  const id = nanoid(36);
  await db.insert(assets).values({ id, ...params });
  return id;
}

// ─── Main pipeline ────────────────────────────────────────────────────────────

export async function runSignalPipeline(params: {
  assetId:    string;
  identifier: string;   // ticker / slug / country code — for LLM context
  assetClass: string;
  horizon?:   "1D" | "5D" | "20D" | "3M" | "6M";
}): Promise<string> {
  const { assetId, identifier, assetClass, horizon = "20D" } = params;
  const today = new Date().toISOString().slice(0, 10);
  const context = `Asset: ${identifier} (${assetClass}), Horizon: ${horizon}, Date: ${today}`;

  // ── Stage 1: Parallel specialist agents ──────────────────────────────────
  const [fundamental, technical, news, macro] = await Promise.all([
    callAgent(FUNDAMENTAL_SYSTEM, context),
    callAgent(TECHNICAL_SYSTEM,   context),
    callAgent(NEWS_SYSTEM,        context),
    callAgent(MACRO_SYSTEM,       context),
  ]) as [AgentAnalysis, AgentAnalysis, AgentAnalysis, AgentAnalysis];

  // ── Stage 2: Reconciler ───────────────────────────────────────────────────
  const debateInput = `
${context}

Fundamental agent: ${JSON.stringify(fundamental)}
Technical agent:   ${JSON.stringify(technical)}
News agent:        ${JSON.stringify(news)}
Macro agent:       ${JSON.stringify(macro)}
`.trim();

  const moderation = await callAgent(RECONCILER_SYSTEM, debateInput) as ModerationResult;

  // ── Stage 3: Risk review ──────────────────────────────────────────────────
  const riskInput = `
${context}
Disagreement score: ${moderation.disagreementScore}
Moderated analysis: ${JSON.stringify(moderation)}
Specialist risk flags: ${JSON.stringify([
    ...(fundamental.riskFlags ?? []),
    ...(technical.riskFlags   ?? []),
    ...(news.riskFlags        ?? []),
    ...(macro.riskFlags       ?? []),
  ])}
`.trim();

  const risk = await callAgent(RISK_SYSTEM, riskInput) as RiskReview;

  // ── Stage 4: Compute final signal ─────────────────────────────────────────
  const rawConfidence   = Math.max(0, Math.min(1, moderation.moderatedConfidence ?? 0.5));
  const penalty         = Math.max(0, Math.min(0.3, risk.confidencePenalty ?? 0));
  const finalConfidence = Math.max(0, rawConfidence - penalty);
  const band            = risk.abstain ? "abstain" : toBand(finalConfidence);
  const stance          = risk.abstain ? "neutral" : consensusToStance(moderation.consensusState ?? "inconclusive");

  const publicationStatus: Signal["publicationStatus"] =
    risk.riskStatus === "pass" && ["very_high", "high", "moderate"].includes(band)
      ? "publication_eligible"
      : risk.riskStatus === "pass_with_penalty"
        ? "review_required"
        : "internal_only";

  // Audit trace (internal only — not shown to subscribers)
  const agentTrace = { fundamental, technical, news, macro, moderation, risk };

  // ── Stage 5: Persist ──────────────────────────────────────────────────────
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const signalId = nanoid(36);
  await db.insert(signals).values({
    id:                signalId,
    assetId,
    signalType:        "directional",
    horizon,
    stance,
    confidenceScore:   Math.round(finalConfidence * 1000) / 1000,
    confidenceBand:    band,
    regimeState:       "unknown",  // extend: plug in macro regime classifier
    topDrivers:        (moderation.topDrivers ?? []).slice(0, 5),
    riskFlags:         [...(moderation.riskFlags ?? []), ...(risk.governanceFlags ?? [])].slice(0, 8),
    falsifiers:        (moderation.falsifiers ?? []).slice(0, 5),
    disagreementScore: Math.round((moderation.disagreementScore ?? 0) * 1000) / 1000,
    dataQualityScore:  0.80,
    evidenceRefs:      ["fundamental_agent", "technical_agent", "news_agent", "macro_agent"],
    bullThesis:        moderation.bullThesis ?? null,
    bearThesis:        moderation.bearThesis ?? null,
    agentTrace,
    publicationStatus,
  });

  // Create review task if manual review needed
  if (publicationStatus === "review_required" || publicationStatus === "publication_eligible") {
    const { reviewTasks } = await import("../drizzle/schema");
    await db.insert(reviewTasks).values({
      id:         nanoid(36),
      reviewType: "publication_review",
      objectType: "signal",
      objectId:   signalId,
      status:     "open",
      priority:   band === "very_high" || band === "high" ? "high" : "medium",
    });
  }

  return signalId;
}

// ─── Re-export types needed by signal service ─────────────────────────────────
type Signal = typeof signals.$inferSelect;
