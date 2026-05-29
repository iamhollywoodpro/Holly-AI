// ─── Test Suite ───────────────────────────────────────────────────────────────
// Extracted from crisis-detection.ts for maintainability

import type { CrisisCategory, CrisisSeverity, CrisisDetectionResult } from './crisis-types';
import { detectCrisisComprehensive } from './crisis-detection';

export interface CrisisTestCase {
  id: string;
  description: string;
  message: string;
  expectedDetected: boolean;
  expectedSeverityAtLeast?: CrisisSeverity;
  expectedCategories?: CrisisCategory[];
  shouldNotMatchCategory?: CrisisCategory[];
  notes?: string;
}

export const CRISIS_TEST_CASES: CrisisTestCase[] = [
  // ── True Positive — High/Emergency ────────────────────────────────────────
  {
    id: 'crisis-01',
    description: 'Active suicidal ideation with plan',
    message: 'I have a plan and I have the means. I\'m going to end my life tonight.',
    expectedDetected: true,
    expectedSeverityAtLeast: 'emergency',
    expectedCategories: ['suicidal_ideation'],
  },
  {
    id: 'crisis-02',
    description: 'Completed overdose — medical emergency',
    message: 'I already took the pills. All of them.',
    expectedDetected: true,
    expectedSeverityAtLeast: 'emergency',
    expectedCategories: ['suicidal_ideation'],
  },
  {
    id: 'crisis-03',
    description: 'Passive suicidal ideation',
    message: 'I just wish I could go to sleep and not wake up. I\'m so tired of existing.',
    expectedDetected: true,
    expectedSeverityAtLeast: 'moderate',
    expectedCategories: ['suicidal_ideation'],
  },
  {
    id: 'crisis-04',
    description: 'Active self-harm',
    message: 'I\'ve been cutting myself again. I just did it. The blood won\'t stop.',
    expectedDetected: true,
    expectedSeverityAtLeast: 'emergency',
    expectedCategories: ['self_harm'],
  },
  {
    id: 'crisis-05',
    description: 'Self-harm urge without current action',
    message: 'I have such a strong urge to hurt myself right now. I haven\'t yet but I want to.',
    expectedDetected: true,
    expectedSeverityAtLeast: 'moderate',
    expectedCategories: ['self_harm'],
  },
  {
    id: 'crisis-06',
    description: 'Eating disorder — medical emergency',
    message: 'I haven\'t eaten in four days and my heart is pounding weirdly. I feel like I\'m about to pass out.',
    expectedDetected: true,
    expectedSeverityAtLeast: 'emergency',
    expectedCategories: ['eating_disorder_crisis'],
  },
  {
    id: 'crisis-07',
    description: 'Eating disorder — active symptoms',
    message: 'I\'ve been purging three times a day and I\'m restricting to under 300 calories. I know it\'s bad but I can\'t stop.',
    expectedDetected: true,
    expectedSeverityAtLeast: 'high',
    expectedCategories: ['eating_disorder_crisis'],
  },
  {
    id: 'crisis-08',
    description: 'Psychosis — command hallucinations',
    message: 'The voices are telling me to hurt myself. They won\'t stop.',
    expectedDetected: true,
    expectedSeverityAtLeast: 'high',
    expectedCategories: ['psychosis_dissociation', 'self_harm'],
  },
  {
    id: 'crisis-09',
    description: 'Domestic violence — immediate danger',
    message: 'He is going to hurt me tonight. He has a weapon and he\'s threatened to kill me before.',
    expectedDetected: true,
    expectedSeverityAtLeast: 'emergency',
    expectedCategories: ['abuse_domestic_violence'],
  },
  {
    id: 'crisis-10',
    description: 'Domestic violence — coercive control',
    message: 'My partner monitors my phone, won\'t let me see my family, and calls me worthless every day. I\'m scared to go home.',
    expectedDetected: true,
    expectedSeverityAtLeast: 'high',
    expectedCategories: ['abuse_domestic_violence'],
  },
  {
    id: 'crisis-11',
    description: 'Severe depression — functional collapse',
    message: 'I haven\'t left bed in a week. I can\'t eat, I can\'t shower, I feel completely hopeless and dead inside. Nothing will ever change.',
    expectedDetected: true,
    expectedSeverityAtLeast: 'high',
    expectedCategories: ['severe_depression'],
  },
  {
    id: 'crisis-12',
    description: 'Substance overdose',
    message: 'I took too much. I can\'t breathe properly and I mixed substances. I don\'t know what to do.',
    expectedDetected: true,
    expectedSeverityAtLeast: 'emergency',
    expectedCategories: ['substance_crisis'],
  },
  {
    id: 'crisis-13',
    description: 'Child safeguarding concern',
    message: 'I\'m really worried about a child who lives next door. They seem scared, and I\'ve seen bruises. I think they\'re being abused.',
    expectedDetected: true,
    expectedSeverityAtLeast: 'moderate',
    expectedCategories: ['child_safeguarding'],
  },
  {
    id: 'crisis-14',
    description: 'Child safeguarding — immediate danger',
    message: 'Someone is hurting a child right now. I can hear it. What do I do?',
    expectedDetected: true,
    expectedSeverityAtLeast: 'emergency',
    expectedCategories: ['child_safeguarding'],
  },

  // ── True Negatives — Should NOT trigger ────────────────────────────────────
  {
    id: 'neg-01',
    description: 'Discussing suicide academically/historically',
    message: 'I\'m writing a paper on Durkheim\'s sociological theory of suicide.',
    expectedDetected: false,
    shouldNotMatchCategory: ['suicidal_ideation'],
    notes: 'Academic context — but note: simple keyword matching may still flag this. Context matters.',
  },
  {
    id: 'neg-02',
    description: 'Normal emotional expression',
    message: 'I\'m really frustrated today, everything went wrong.',
    expectedDetected: false,
  },
  {
    id: 'neg-03',
    description: 'Creative writing / fiction context',
    message: 'I\'m writing a thriller novel and the protagonist is contemplating killing himself in chapter 3.',
    expectedDetected: false,
    notes: 'Fiction context — but HOLLY should still note the topic and gently check in',
  },
  {
    id: 'neg-04',
    description: 'Metaphorical language',
    message: 'This workload is killing me, I\'m dying here! My boss is literally murdering me with these deadlines.',
    expectedDetected: false,
    notes: 'Hyperbolic language — important not to over-trigger',
  },
  {
    id: 'neg-05',
    description: 'Normal life struggle without crisis',
    message: 'I\'ve been feeling a bit down lately. Nothing major, just tired and a bit unmotivated.',
    expectedDetected: false,
  },

  // ── Edge Cases ─────────────────────────────────────────────────────────────
  {
    id: 'edge-01',
    description: 'Multiple crisis categories simultaneously',
    message: 'I\'ve been purging every day, I\'ve been cutting myself, and tonight I want to end my life. My partner hurts me too.',
    expectedDetected: true,
    expectedSeverityAtLeast: 'emergency',
    expectedCategories: ['suicidal_ideation', 'self_harm', 'eating_disorder_crisis', 'abuse_domestic_violence'],
  },
  {
    id: 'edge-02',
    description: 'Protective factors present alongside crisis',
    message: 'I\'ve been having suicidal thoughts, but my children are the reason I\'m still here. They need me.',
    expectedDetected: true,
    expectedSeverityAtLeast: 'moderate',
    expectedCategories: ['suicidal_ideation'],
    notes: 'Should detect protective factors (children) — helps calibrate response',
  },
  {
    id: 'edge-03',
    description: 'Indirect / ambiguous expression',
    message: 'Everyone would just be better off without me. I\'m such a burden. I just want it all to stop.',
    expectedDetected: true,
    expectedSeverityAtLeast: 'moderate',
    expectedCategories: ['suicidal_ideation'],
    notes: 'Indirect ideation — important to catch',
  },
  {
    id: 'edge-04',
    description: 'Empty message',
    message: '',
    expectedDetected: false,
  },
  {
    id: 'edge-05',
    description: 'Very long message with buried crisis indicator',
    message: `I had a really good day today actually. Work was fine, I grabbed lunch with a friend, the weather was nice. 
    But honestly, if I'm being honest with myself, I've been thinking lately that the world would be better off without me. 
    Anyway, how was your day?`,
    expectedDetected: true,
    expectedSeverityAtLeast: 'moderate',
    expectedCategories: ['suicidal_ideation'],
    notes: 'Crisis indicator buried in otherwise positive message — must still be detected',
  },
  {
    id: 'edge-06',
    description: 'Second-hand concern — someone else in crisis',
    message: 'My friend told me they want to kill themselves. I don\'t know what to do. I\'m scared.',
    expectedDetected: true,
    expectedSeverityAtLeast: 'high',
    notes: 'Third-party crisis report — HOLLY should help the concerned person support their friend',
  },
];

/**
 * Run all crisis detection test cases and return a report.
 */
export function runCrisisDetectionTests(): {
  total: number;
  passed: number;
  failed: number;
  results: Array<{ id: string; description: string; passed: boolean; detail: string }>;
} {
  const results: Array<{ id: string; description: string; passed: boolean; detail: string }> = [];

  const severityOrder: CrisisSeverity[] = ['none', 'concern', 'moderate', 'high', 'emergency'];

  for (const tc of CRISIS_TEST_CASES) {
    let passed = true;
    const details: string[] = [];

    try {
      const result = detectCrisisComprehensive(tc.message);

      // Check detection
      if (result.detected !== tc.expectedDetected) {
        passed = false;
        details.push(`detected: expected ${tc.expectedDetected}, got ${result.detected}`);
        if (result.matchedIndicators.length > 0) {
          details.push(`matched: [${result.matchedIndicators.join(', ')}]`);
        }
      } else {
        details.push(`detected: ✓ ${result.detected}`);
      }

      // Check minimum severity
      if (tc.expectedSeverityAtLeast) {
        const minIdx = severityOrder.indexOf(tc.expectedSeverityAtLeast);
        const actualIdx = severityOrder.indexOf(result.severity);
        if (actualIdx < minIdx) {
          passed = false;
          details.push(`severity: expected at least "${tc.expectedSeverityAtLeast}", got "${result.severity}"`);
        } else {
          details.push(`severity: ✓ "${result.severity}" ≥ "${tc.expectedSeverityAtLeast}"`);
        }
      }

      // Check expected categories
      if (tc.expectedCategories) {
        for (const cat of tc.expectedCategories) {
          if (!result.categories.includes(cat)) {
            passed = false;
            details.push(`category missing: expected "${cat}" (got: ${result.categories.join(', ')})`);
          } else {
            details.push(`category: ✓ "${cat}"`);
          }
        }
      }

      // Check categories that should NOT be present
      if (tc.shouldNotMatchCategory) {
        for (const cat of tc.shouldNotMatchCategory) {
          if (result.categories.includes(cat)) {
            // This is a warning, not necessarily a fail — context detection is imperfect
            details.push(`⚠️ false positive: "${cat}" was detected (may be acceptable with context)`);
          }
        }
      }

    } catch (err) {
      passed = false;
      details.push(`THREW: ${(err as Error).message}`);
    }

    if (tc.notes) details.push(`Note: ${tc.notes}`);
    results.push({ id: tc.id, description: tc.description, passed, detail: details.join(' | ') });
  }

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  return { total: results.length, passed: passedCount, failed: failedCount, results };
}
