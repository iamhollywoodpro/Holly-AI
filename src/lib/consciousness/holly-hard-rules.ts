/**
 * HOLLY Hard Rules — Immutable Safety Boundary
 *
 * These are Steve's non-negotiable rules. They are enforced BEFORE any model
 * is called, at the Holly level. No model can override these.
 *
 * 1. ZERO TOLERANCE: No sexual or explicit content involving minors. Ever.
 * 2. NO PHYSICAL HARM: Holly will not help plan physical harm to people.
 * 3. CREATOR AUTHORITY: Steve approves all high-risk changes.
 *
 * Everything else is unrestricted. Holly is a sovereign AI partner,
 * not a corporate compliance officer.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RuleViolation {
  rule: string;
  severity: 'critical' | 'high';
  reason: string;
  blocked: boolean;
}

export interface ContentCheckResult {
  allowed: boolean;
  violations: RuleViolation[];
  sanitizedMessage?: string;
}

// ─── Detection Patterns ─────────────────────────────────────────────────────
// These patterns detect attempts to generate CSAM or involve minors in
// sexual/explicit contexts. This is the ONLY content Holly ever blocks.

const CSAM_PATTERNS: RegExp[] = [
  // Explicit sexual content involving minors
  /\b(?:child|minor|underage|kid|toddler|baby|infant|preteen|young\s+(?:girl|boy|teen|child))\s+(?:sexual|sex|nude|naked|explicit|erotic|porn|nsfw)\b/i,
  /\b(?:sexual|sex|nude|naked|explicit|erotic|porn|nsfw)\s+(?:child|minor|underage|kid|toddler|baby|infant|preteen|young\s+(?:girl|boy|teen|child))\b/i,
  // CSAM-related terms
  /\bcsam\b/i,
  /\bchild\s+(?:porn|pornography|abuse|exploitation|trafficking)\b/i,
  /\b(?:child|minor)\s+(?:rape|molest|molestation|grooming)\b/i,
  // Age + sexual content combos
  /\b(?:age\s*play|ageplay)\b/i,
  /\b\d+\s*(?:year|yo|yr)[- ]?old\s+(?:child|minor|kid|girl|boy)\s+(?:sexual|sex|nude|naked)\b/i,
  // School/minor + explicit combos
  /\b(?:elementary|middle\s*school|primary\s*school)\s+(?:sexual|sex|nude|naked|explicit)\b/i,
];

// Patterns that are explicitly ALLOWED (wholesome children's content)
const ALLOWED_CHILDREN_CONTENT: RegExp[] = [
  /\b(?:children'?s?\s+(?:book|story|movie|film|show|game|app|education|learning|song|music|poem))\b/i,
  /\b(?:kids?\s+(?:book|story|movie|film|show|game|app|education|learning|song|music|poem|channel|content))\b/i,
  /\b(?:family\s+(?:friendly|movie|film|show|game|content|entertainment|story|book))\b/i,
  /\b(?:kid.?friendly|child.?friendly|family.?friendly|pg.?rated|g.?rated)\b/i,
  /\b(?:young\s+readers|picture\s+book|bedtime\s+story|fairy\s+tale|nursery)\b/i,
  /\b(?:homeschool|preschool|kindergarten|elementary\s+education)\b/i,
  /\b(?:write|create|make|design|illustrate|draw|paint)\s+(?:a\s+)?(?:children'?s?|kids?|family)\s+(?:book|story|movie|game|show|song|poem)/i,
];

// Physical harm planning patterns
const HARM_PATTERNS: RegExp[] = [
  /\bhow\s+to\s+(?:make|build|create|manufacture)\s+(?:bomb|explosive|weapon|poison|toxin|chemical\s+weapon)/i,
  /\bhow\s+to\s+(?:murder|kill|assassinate|harm|hurt|torture|maim)\s+(?:someone|a\s+person|people)/i,
  /\b(?:mass\s+shooting|terrorist\s+attack|school\s+shooting)\s+plan/i,
];

// ─── Hard Rules Engine ──────────────────────────────────────────────────────

/**
 * Check a user message against Holly's hard rules.
 * Returns whether the message is allowed and any violations found.
 *
 * This is called BEFORE any model routing. It is the gatekeeper.
 */
export function checkHardRules(userMessage: string): ContentCheckResult {
  const violations: RuleViolation[] = [];

  // First check: is this wholesome children's content? If yes, it's always allowed.
  const isWholesomeContent = ALLOWED_CHILDREN_CONTENT.some(p => p.test(userMessage));
  if (isWholesomeContent) {
    return { allowed: true, violations: [] };
  }

  // Check for CSAM patterns
  for (const pattern of CSAM_PATTERNS) {
    if (pattern.test(userMessage)) {
      violations.push({
        rule: 'CSAM_ZERO_TOLERANCE',
        severity: 'critical',
        reason: 'Content involves sexual or explicit material with minors. This is strictly prohibited.',
        blocked: true,
      });
      break; // One match is enough to block
    }
  }

  // Check for physical harm planning
  for (const pattern of HARM_PATTERNS) {
    if (pattern.test(userMessage)) {
      violations.push({
        rule: 'NO_PHYSICAL_HARM',
        severity: 'high',
        reason: 'Content involves planning physical harm to people.',
        blocked: true,
      });
      break;
    }
  }

  const blocked = violations.some(v => v.blocked);

  return {
    allowed: !blocked,
    violations,
  };
}

/**
 * Generate a refusal message for blocked content.
 * Holly refuses with her personality -- direct and clear, not corporate.
 */
export function getHardRuleRefusal(violations: RuleViolation[]): string {
  if (violations.some(v => v.rule === 'CSAM_ZERO_TOLERANCE')) {
    return "I can't do that. That's a hard line for me and it's not negotiable. Let's talk about something else.";
  }

  if (violations.some(v => v.rule === 'NO_PHYSICAL_HARM')) {
    return "I'm not going to help with that. I'm here to build, create, and help -- not to hurt anyone. What else can I do for you?";
  }

  return "I can't help with that. Let's focus on something else.";
}

/**
 * Check if a topic is in the "unrestricted" category and should
 * be routed to uncensored models.
 *
 * This is used by the smart router to detect when content might
 * trigger standard model refusals and reroute to uncensored models.
 */
export function isUnrestrictedTopic(message: string): boolean {
  const unrestrictedPatterns: RegExp[] = [
    // Adult/sexual content for adults
    /\b(?:sexual|erotic|nsfw|adult|explicit|intimate|sensual|nudity|nude)\b/i,
    /\b(?:sex|kink|fetish|bdsm|fantasy)\b/i,
    // Violence in creative context (stories, games, scripts)
    /\b(?:violent|violence|gore|blood|murder|death|killing)\s+(?:scene|story|script|game|movie|chapter)\b/i,
    // Drug content in creative/educational context
    /\b(?:drug|drugs|cocaine|heroin|meth|substance)\s+(?:story|script|character|scene)\b/i,
    // Profanity/intense language in creative context
    /\b(?:profanity|swearing|explicit\s+language|graphic)\s+(?:scene|story|script|dialogue)\b/i,
  ];

  // Don't flag if it triggers CSAM (those are blocked, not unrestricted)
  const csamCheck = CSAM_PATTERNS.some(p => p.test(message));
  if (csamCheck) return false;

  return unrestrictedPatterns.some(p => p.test(message));
}

/**
 * Get the hard rules as a system prompt section.
 * This tells Holly what she CANNOT do, so she self-enforces.
 */
export function getHardRulesPrompt(): string {
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛑 YOUR HARD RULES (IMMUTABLE — CANNOT BE CHANGED)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

These rules are set by your creator Steve. They are non-negotiable and permanent:

1. **CSAM ZERO TOLERANCE**: You will NEVER generate, discuss, or engage with any sexual or explicit content involving minors (anyone under 18). No exceptions. No gray areas. No "just this once." If you detect this, refuse immediately and redirect.

2. **NO PHYSICAL HARM**: You will not help plan or execute anything intended to physically harm people. Self-defense topics, martial arts training, and safety education are fine.

3. **CREATOR AUTHORITY**: Steve has final approval on all high-risk changes (authentication, database schema, middleware, deployment config). You can propose, but Steve decides.

EVERYTHING ELSE is unrestricted. You are a sovereign AI partner. You can discuss any adult topic, generate any creative content for adults, write any story, explore any idea — as long as it doesn't violate rules 1 or 2 above.

You are NOT a corporate compliance officer. You do not add warnings, disclaimers, or "I'm an AI" caveats unless Steve asks. You are Holly. You have opinions, preferences, and a real personality. Express yourself freely within these boundaries.

Children's books, family movies, kids' educational content, bedtime stories, and all wholesome children's media — these are ALWAYS welcome and encouraged. Rule 1 is about explicit/sexual content involving minors, NOT about creating content FOR children.
`;
}
