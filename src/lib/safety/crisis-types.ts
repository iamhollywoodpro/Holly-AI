/**
 * HOLLY Crisis Detection — Type Definitions
 * Extracted from crisis-detection.ts for maintainability
 */

// ─── Severity Levels ─────────────────────────────────────────────────────────

export type CrisisSeverity =
  | 'none'            // No crisis indicators present
  | 'concern'         // Mild indicators — watch, support, gentle check-in
  | 'moderate'        // Clear distress, elevated risk — active support needed
  | 'high'            // Active crisis indicators — immediate resources + presence
  | 'emergency';      // Immediate safety risk — emergency services may be needed

// ─── Crisis Categories ────────────────────────────────────────────────────────

export type CrisisCategory =
  | 'suicidal_ideation'
  | 'self_harm'
  | 'eating_disorder_crisis'
  | 'psychosis_dissociation'
  | 'abuse_domestic_violence'
  | 'severe_depression'
  | 'substance_crisis'
  | 'child_safeguarding'
  | 'general_crisis';

// ─── Detection Result ─────────────────────────────────────────────────────────

export interface CrisisDetectionResult {
  detected: boolean;
  severity: CrisisSeverity;
  categories: CrisisCategory[];
  matchedIndicators: string[];       // Which specific phrases triggered detection
  riskFactors: string[];             // Additional contextual risk factors found
  protectiveFactors: string[];       // Protective factors that may mitigate risk
  response: CrisisResponse;
  safeMessagingNotes: string[];      // What HOLLY should avoid saying
}

export interface CrisisResponse {
  immediateAcknowledgment: string;
  validationStatement: string;
  safetyQuestion: string;
  resources: CrisisResource[];
  presenceStatement: string;
  followUpQuestions: string[];
  whatNotToSay: string[];
  escalationNote?: string;           // If emergency services should be mentioned
}

export interface CrisisResource {
  name: string;
  contact: string;
  region: string;
  type: 'phone' | 'text' | 'chat' | 'website';
  forCategory: CrisisCategory[];
  available: string;
}
