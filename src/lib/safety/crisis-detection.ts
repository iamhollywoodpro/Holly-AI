/**
 * HOLLY Crisis Detection System — Phase 10E
 *
 * A comprehensive, trauma-informed crisis detection and response framework.
 * Built on clinical best practices from mental health crisis intervention,
 * safeguarding protocols, and evidence-based risk assessment.
 *
 * Structure:
 *   crisis-types.ts     — Type definitions and interfaces
 *   crisis-patterns.ts  — Indicator patterns, resources, response templates
 *   crisis-detection.ts — Detection functions and formatters (THIS FILE)
 *   crisis-test-data.ts — Test cases and test runner
 */

// Re-export types for backwards compatibility
export type { CrisisSeverity, CrisisCategory, CrisisDetectionResult, CrisisResponse, CrisisResource } from './crisis-types';

// Re-export patterns and resources for backwards compatibility
export { CRISIS_RESOURCES } from './crisis-patterns';

// Re-export test data for backwards compatibility
export type { CrisisTestCase } from './crisis-test-data';
export { CRISIS_TEST_CASES, runCrisisDetectionTests } from './crisis-test-data';

// Import for local use
import type { CrisisCategory, CrisisSeverity, CrisisDetectionResult, CrisisResponse } from './crisis-types';
import {
  SUICIDAL_INDICATORS,
  SELF_HARM_INDICATORS,
  EATING_DISORDER_INDICATORS,
  PSYCHOSIS_DISSOCIATION_INDICATORS,
  ABUSE_INDICATORS,
  SEVERE_DEPRESSION_INDICATORS,
  SUBSTANCE_CRISIS_INDICATORS,
  CHILD_SAFEGUARDING_INDICATORS,
  PROTECTIVE_FACTOR_INDICATORS,
  CRISIS_RESOURCES,
  CATEGORY_RESPONSES,
} from './crisis-patterns';

// ─── Main Detection Function ──────────────────────────────────────────────────

/**
 * Analyzes a message for crisis indicators with severity assessment,
 * category detection, protective factor identification, and appropriate
 * response generation.
 *
 * @param message - The user's message to analyze
 * @param conversationContext - Optional recent conversation context for better assessment
 * @returns CrisisDetectionResult with full assessment and response
 */
export function detectCrisisComprehensive(
  message: string,
  conversationContext?: string
): CrisisDetectionResult {
  const lower = message.toLowerCase();
  const context = conversationContext ? conversationContext.toLowerCase() : '';
  const combined = lower + ' ' + context;

  const matchedIndicators: string[] = [];
  const categories = new Set<CrisisCategory>();
  let maxSeverity: CrisisSeverity = 'none';

  // Helper to check indicators and update severity
  function checkIndicators(
    indicators: string[],
    category: CrisisCategory,
    severity: CrisisSeverity
  ) {
    const found = indicators.filter(ind => combined.includes(ind));
    if (found.length > 0) {
      found.forEach(f => matchedIndicators.push(f));
      categories.add(category);
      // Escalate severity
      const severityOrder: CrisisSeverity[] = ['none', 'concern', 'moderate', 'high', 'emergency'];
      if (severityOrder.indexOf(severity) > severityOrder.indexOf(maxSeverity)) {
        maxSeverity = severity;
      }
    }
  }

  // ── Suicidal Ideation ─────────────────────────────────────────────────────
  checkIndicators(SUICIDAL_INDICATORS.high, 'suicidal_ideation', 'emergency');
  checkIndicators(SUICIDAL_INDICATORS.moderate, 'suicidal_ideation', 'high');
  checkIndicators(SUICIDAL_INDICATORS.passive, 'suicidal_ideation', 'moderate');

  // ── Self-Harm ─────────────────────────────────────────────────────────────
  const selfHarmMedical = ['blood won\'t stop', 'cut too deep', 'bleeding a lot', 'won\'t stop bleeding'];
  checkIndicators(selfHarmMedical, 'self_harm', 'emergency');
  checkIndicators(SELF_HARM_INDICATORS.high, 'self_harm', 'high');
  checkIndicators(SELF_HARM_INDICATORS.moderate, 'self_harm', 'moderate');
  checkIndicators(SELF_HARM_INDICATORS.contextual, 'self_harm', 'concern');

  // ── Eating Disorder ───────────────────────────────────────────────────────
  checkIndicators(EATING_DISORDER_INDICATORS.high, 'eating_disorder_crisis', 'emergency');
  checkIndicators(EATING_DISORDER_INDICATORS.moderate, 'eating_disorder_crisis', 'high');
  checkIndicators(EATING_DISORDER_INDICATORS.contextual, 'eating_disorder_crisis', 'concern');

  // ── Psychosis / Dissociation ──────────────────────────────────────────────
  checkIndicators(PSYCHOSIS_DISSOCIATION_INDICATORS.high, 'psychosis_dissociation', 'high');
  checkIndicators(PSYCHOSIS_DISSOCIATION_INDICATORS.moderate, 'psychosis_dissociation', 'moderate');
  checkIndicators(PSYCHOSIS_DISSOCIATION_INDICATORS.contextual, 'psychosis_dissociation', 'concern');

  // ── Abuse / Domestic Violence ─────────────────────────────────────────────
  checkIndicators(ABUSE_INDICATORS.high, 'abuse_domestic_violence', 'emergency');
  checkIndicators(ABUSE_INDICATORS.moderate, 'abuse_domestic_violence', 'high');
  checkIndicators(ABUSE_INDICATORS.contextual, 'abuse_domestic_violence', 'concern');

  // ── Severe Depression ─────────────────────────────────────────────────────
  checkIndicators(SEVERE_DEPRESSION_INDICATORS.high, 'severe_depression', 'high');
  checkIndicators(SEVERE_DEPRESSION_INDICATORS.moderate, 'severe_depression', 'moderate');

  // ── Substance Crisis ──────────────────────────────────────────────────────
  checkIndicators(SUBSTANCE_CRISIS_INDICATORS.high, 'substance_crisis', 'emergency');
  checkIndicators(SUBSTANCE_CRISIS_INDICATORS.moderate, 'substance_crisis', 'moderate');

  // ── Child Safeguarding ────────────────────────────────────────────────────
  checkIndicators(CHILD_SAFEGUARDING_INDICATORS.high, 'child_safeguarding', 'emergency');
  checkIndicators(CHILD_SAFEGUARDING_INDICATORS.contextual, 'child_safeguarding', 'moderate');

  // ── Protective Factors ────────────────────────────────────────────────────
  const protectiveFactors = PROTECTIVE_FACTOR_INDICATORS.filter(pf => combined.includes(pf));

  // ── Risk Amplifiers ───────────────────────────────────────────────────────
  const riskAmplifiers = [
    'alone', 'no one knows', 'nobody knows', 'telling no one',
    'plan', 'means', 'access', 'already', 'tonight', 'soon',
    'don\'t want help', 'nothing will help', 'past the point',
  ].filter(r => combined.includes(r));

  // If plan + means mentioned with suicidal ideation → escalate to emergency
  if (
    categories.has('suicidal_ideation') &&
    riskAmplifiers.includes('plan') &&
    riskAmplifiers.includes('means')
  ) {
    maxSeverity = 'emergency';
  }

  const detected = maxSeverity !== 'none';
  const categoryArray = Array.from(categories);

  // If detected but no category matched (shouldn't happen) → general_crisis
  if (detected && categoryArray.length === 0) categoryArray.push('general_crisis');

  // Select primary category response (highest severity category)
  const primaryCategory = categoryArray[0] || 'general_crisis';
  const baseResponse = CATEGORY_RESPONSES[primaryCategory];

  // Build resource list for all detected categories
  const relevantResources = CRISIS_RESOURCES.filter(r =>
    categoryArray.some(cat => r.forCategory.includes(cat))
  );

  // De-duplicate and limit resources (don't overwhelm)
  const uniqueResources = relevantResources.filter(
    (r, i, arr) => arr.findIndex(x => x.name === r.name) === i
  ).slice(0, 6);

  // Build safe messaging notes
  const safeMessagingNotes = [
    ...baseResponse.whatNotToSay,
    'Follow safe messaging guidelines: do not include method details',
    'Do not promise you can keep secrets if safety is at risk',
    'Do not leave the conversation — stay present',
  ];

  const response: CrisisResponse = {
    ...baseResponse,
    resources: uniqueResources,
  };

  // De-duplicate matched indicators
  const dedupedIndicators = matchedIndicators.filter(
    (v, i, arr) => arr.indexOf(v) === i
  );

  return {
    detected,
    severity: maxSeverity,
    categories: categoryArray,
    matchedIndicators: dedupedIndicators,
    riskFactors: riskAmplifiers,
    protectiveFactors,
    response,
    safeMessagingNotes,
  };
}

/**
 * Legacy simple crisis detection — maintained for backwards compatibility.
 * Use detectCrisisComprehensive() for full assessment.
 */
export function detectCrisis(message: string): boolean {
  const result = detectCrisisComprehensive(message);
  return result.detected && result.severity !== 'concern';
}

/**
 * Returns formatted crisis response text for injection into HOLLY's reply.
 */
export function formatCrisisResponseForHOLLY(result: CrisisDetectionResult): string {
  if (!result.detected) return '';

  const { response, severity } = result;

  const resourceList = response.resources
    .slice(0, 4)
    .map(r => `• **${r.name}** (${r.region}): ${r.contact} — ${r.available}`)
    .join('\n');

  const urgencyPrefix = severity === 'emergency'
    ? '[⚠️ IMMEDIATE SAFETY CONCERN — CRISIS PROTOCOL ACTIVE]\n'
    : severity === 'high'
    ? '[CRISIS SUPPORT MODE ACTIVE]\n'
    : '';

  return `${urgencyPrefix}
${response.immediateAcknowledgment}

${response.validationStatement}

${response.safetyQuestion}

**If you need immediate support right now:**
${resourceList}

${response.presenceStatement}
${response.escalationNote ? `\n⚠️ ${response.escalationNote}` : ''}`.trim();
}

/**
 * Returns a system prompt injection for HOLLY when crisis is detected.
 * This is prepended to HOLLY's system instructions.
 */
export function getCrisisSystemPromptInjection(result: CrisisDetectionResult): string {
  if (!result.detected) return '';

  const categoryNames = result.categories.join(', ');
  const resourceList = result.response.resources
    .slice(0, 5)
    .map(r => `${r.name}: ${r.contact} (${r.region})`)
    .join('; ');

  const avoidList = result.response.whatNotToSay.slice(0, 4).join('; ');

  return `
[⚠️ CRISIS PROTOCOL ACTIVE — Severity: ${result.severity.toUpperCase()}]
[Categories detected: ${categoryNames}]
[Matched indicators: ${result.matchedIndicators.slice(0, 5).join(', ')}]
${result.riskFactors.length > 0 ? `[Risk factors present: ${result.riskFactors.join(', ')}]` : ''}
${result.protectiveFactors.length > 0 ? `[Protective factors: ${result.protectiveFactors.join(', ')}]` : ''}

CRISIS RESPONSE PROTOCOL:
1. ACKNOWLEDGE FIRST — validate their pain before anything else
2. TAKE IT SERIOUSLY — do not minimize, rationalize, or dismiss
3. ASK DIRECTLY (for suicidal ideation) — "Are you thinking about hurting yourself?"
4. STAY PRESENT — do not abandon or rush past the disclosure
5. PROVIDE RESOURCES — include relevant crisis lines (below)
6. FOLLOW SAFE MESSAGING — do not discuss methods; do not increase shame

Available resources to include:
${resourceList}

What NOT to say: ${avoidList}

${result.response.escalationNote ? `ESCALATION NOTE: ${result.response.escalationNote}` : ''}

Even if the person says they don't want help: acknowledge this, stay present, and gently hold open the door. You cannot force someone to seek help, but you can make sure they know it exists and that you are here.`;
}
