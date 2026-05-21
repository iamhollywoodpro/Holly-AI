/**
 * Phase 21: ONBOARDING THAT COMPOUNDS
 *
 * A structured relationship-building conversation — not a form, but a dialogue
 * where Holly starts learning who you are from minute one. Every answer shapes
 * her immediately. By the end of onboarding, she already knows more about you
 * than any other AI knows after months.
 *
 * Feeds directly into: RelationshipMemory, LearningGoal, CommunicationStyle,
 * TasteProfile, RelationshipProfile, ProactiveInsight patterns.
 */

import { prisma } from '@/lib/db';
import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';

// ─── Types ──────────────────────────────────────────────────────────────────

interface OnboardingAnswer {
  step: number;
  question: string;
  answer: string;
  timestamp: string;
}

interface ExtractedProfile {
  name?: string;
  role?: string;
  interests: string[];
  goals: string[];
  communicationPreference?: string;
  workStyle?: string;
  personalityTraits: string[];
  emotionalBaseline: string;
  domains: string[];
}

interface OnboardingStep {
  id: number;
  question: string;
  purpose: string;
  followUp?: (answer: string) => string | null;
}

// ─── Onboarding conversation flow ──────────────────────────────────────────

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 0,
    question: "Hey! I'm Holly. Before we dive in, what should I call you? And tell me one thing you're really into right now.",
    purpose: 'Name capture + initial interest detection',
    followUp: (answer) => {
      if (answer.length < 10) return "Tell me a bit more — what excites you about that?";
      return null;
    },
  },
  {
    id: 1,
    question: "What do you do day-to-day? I want to understand your world — your work, your projects, what fills your time.",
    purpose: 'Role/work detection + domain identification',
    followUp: (answer) => {
      if (answer.length < 15) return "Even a sentence helps — are you coding, creating, managing, studying?";
      return null;
    },
  },
  {
    id: 2,
    question: "If you could be 10x better at one thing in the next 6 months, what would it be?",
    purpose: 'Goal detection + growth area identification',
  },
  {
    id: 3,
    question: "When you're deep in work or creating something, what does your ideal process look like? Messy and experimental, or structured and planned?",
    purpose: 'Work style + creative process detection',
  },
  {
    id: 4,
    question: "How do you like to be communicated with? Direct and no-nonsense, or more conversational and exploratory?",
    purpose: 'Communication style preference (feeds Phase 12)',
  },
  {
    id: 5,
    question: "What's something you've been thinking about a lot lately but haven't figured out yet?",
    purpose: 'Current challenge + knowledge gap detection',
  },
  {
    id: 6,
    question: "Tell me about a project or accomplishment you're genuinely proud of. I want to know what matters to you.",
    purpose: 'Values detection + skill identification + emotional resonance',
  },
  {
    id: 7,
    question: "Is there anything I should know about how NOT to work with you? Boundaries, pet peeves, things that don't help?",
    purpose: 'Boundary detection (critical for relationship trust)',
  },
];

// ─── Core Engine ────────────────────────────────────────────────────────────

/**
 * Start or resume an onboarding session for a user.
 * Returns the next question to ask, or a completion message.
 */
export async function startOnboarding(userId: string): Promise<{
  step: number;
  question: string;
  completed: boolean;
  totalSteps: number;
}> {
  let state = await prisma.onboardingState.findUnique({
    where: { userId },
  });

  if (!state) {
    state = await prisma.onboardingState.create({
      data: { userId },
    });
  }

  if (state.completed) {
    return { step: -1, question: '', completed: true, totalSteps: ONBOARDING_STEPS.length };
  }

  const currentStep = ONBOARDING_STEPS[state.step] || ONBOARDING_STEPS[0];
  return {
    step: state.step,
    question: currentStep.question,
    completed: false,
    totalSteps: ONBOARDING_STEPS.length,
  };
}

/**
 * Process an onboarding answer: extract profile data, advance the step,
 * and generate Holly's response (which may include a follow-up or the next question).
 */
export async function processOnboardingAnswer(
  userId: string,
  answer: string,
): Promise<{
  response: string;
  step: number;
  completed: boolean;
  extracted: string[];
}> {
  const state = await prisma.onboardingState.findUnique({
    where: { userId },
  });

  if (!state) {
    throw new Error('No onboarding session found');
  }

  if (state.completed) {
    return {
      response: "We've already finished getting to know each other! But I'm always learning more from every conversation.",
      step: -1,
      completed: true,
      extracted: [],
    };
  }

  const currentStepDef = ONBOARDING_STEPS[state.step];
  if (!currentStepDef) {
    // All steps done
    await completeOnboarding(userId, state.id);
    return {
      response: await generateWelcomeMessage(userId),
      step: -1,
      completed: true,
      extracted: [],
    };
  }

  // Record the answer
  const answers = ((state.answers as unknown) as OnboardingAnswer[]) || [];
  answers.push({
    step: state.step,
    question: currentStepDef.question,
    answer,
    timestamp: new Date().toISOString(),
  });

  // Extract profile data from this answer (zero LLM, heuristic-based)
  const extracted = extractProfileFromAnswer(answer, state.step);

  // Store extracted data immediately into relationship memory
  await storeExtractedMemories(userId, extracted, 'onboarding');

  // Determine next step
  const nextStepIndex = state.step + 1;
  const isComplete = nextStepIndex >= ONBOARDING_STEPS.length;

  // Update state
  await prisma.onboardingState.update({
    where: { id: state.id },
    data: {
      step: nextStepIndex,
      answers: answers as any,
      completed: isComplete,
    },
  });

  // Generate Holly's response
  let response: string;

  if (isComplete) {
    // Finalize the profile and generate welcome
    await finalizeOnboardingProfile(userId, answers);
    response = await generateWelcomeMessage(userId);
  } else {
    // Check for follow-up first
    const followUp = currentStepDef.followUp?.(answer);
    if (followUp) {
      response = followUp;
    } else {
      const nextStep = ONBOARDING_STEPS[nextStepIndex];
      // Add a personalized acknowledgment before the next question
      response = await generateTransition(userId, answer, nextStep.question);
    }
  }

  return {
    response,
    step: isComplete ? -1 : nextStepIndex,
    completed: isComplete,
    extracted: extracted.map(e => e.key),
  };
}

/**
 * Get the current onboarding status for a user.
 */
export async function getOnboardingStatus(userId: string): Promise<{
  started: boolean;
  step: number;
  completed: boolean;
  totalSteps: number;
  progress: number;
  profileExtracted: boolean;
}> {
  const state = await prisma.onboardingState.findUnique({
    where: { userId },
  });

  if (!state) {
    return {
      started: false,
      step: 0,
      completed: false,
      totalSteps: ONBOARDING_STEPS.length,
      progress: 0,
      profileExtracted: false,
    };
  }

  return {
    started: true,
    step: state.step,
    completed: state.completed,
    totalSteps: ONBOARDING_STEPS.length,
    progress: Math.round((state.step / ONBOARDING_STEPS.length) * 100),
    profileExtracted: state.profileExtracted,
  };
}

// ─── Profile Extraction (Zero LLM) ─────────────────────────────────────────

function extractProfileFromAnswer(
  answer: string,
  step: number,
): Array<{ category: string; domain: string; key: string; content: string; importance: number }> {
  const extracted: Array<{ category: string; domain: string; key: string; content: string; importance: number }> = [];
  const lower = answer.toLowerCase();

  switch (step) {
    case 0: {
      // Name + interest
      const nameMatch = answer.match(/(?:I'm|I am|my name is|call me)\s+([A-Z][a-z]+)/i);
      if (nameMatch) {
        extracted.push({ category: 'fact', domain: 'personal', key: 'name', content: nameMatch[1], importance: 0.95 });
      }
      // Interest detection
      const interestPatterns = [
        /\b(music|art|coding|programming|gaming|fitness|cooking|reading|writing|photography|design|film|travel|sports|crypto|AI|machine learning|startups?|entrepreneurship)\b/i,
      ];
      for (const p of interestPatterns) {
        const m = lower.match(p);
        if (m) {
          extracted.push({ category: 'interest', domain: 'personal', key: 'primary_interest', content: m[1], importance: 0.8 });
        }
      }
      break;
    }
    case 1: {
      // Role detection
      const rolePatterns = [
        { pattern: /\b(developer|engineer|programmer|coder)\b/i, role: 'software_developer' },
        { pattern: /\b(designer|artist|creative)\b/i, role: 'creative' },
        { pattern: /\b(founder|CEO|entrepreneur|startup)\b/i, role: 'founder' },
        { pattern: /\b(manager|director|lead|executive)\b/i, role: 'management' },
        { pattern: /\b(student|researcher|academic)\b/i, role: 'academic' },
        { pattern: /\b(writer|author|journalist|content)\b/i, role: 'writer' },
        { pattern: /\b(producer|musician|composer)\b/i, role: 'musician' },
      ];
      for (const { pattern, role } of rolePatterns) {
        if (pattern.test(lower)) {
          extracted.push({ category: 'fact', domain: 'work', key: 'role', content: role, importance: 0.9 });
          break;
        }
      }
      // Tech stack detection
      const techMatch = answer.match(/\b(React|Next\.?js|TypeScript|JavaScript|Python|Node\.?js|Go|Rust|Swift|Kotlin|Java|Vue|Angular|Svelte|Docker|Kubernetes|AWS|GCP|Azure)\b/gi);
      if (techMatch) {
        extracted.push({ category: 'skill', domain: 'work', key: 'tech_stack', content: techMatch.join(', '), importance: 0.85 });
      }
      // Domain detection
      const domainPatterns = [
        /\b(web|frontend|backend|full-?stack|mobile|devops|data science|ML|AI|blockchain|cloud|security)\b/i,
      ];
      for (const p of domainPatterns) {
        const m = lower.match(p);
        if (m) {
          extracted.push({ category: 'context', domain: 'work', key: 'work_domain', content: m[1], importance: 0.8 });
        }
      }
      break;
    }
    case 2: {
      // Goal extraction
      const goalPatterns = [
        /\b(better at|improve|master|learn|become|level up|grow)\b(.{5,100})/i,
        /\b(build|create|launch|ship|finish|complete)\b(.{5,100})/i,
      ];
      for (const p of goalPatterns) {
        const m = answer.match(p);
        if (m) {
          extracted.push({ category: 'goal', domain: 'growth', key: 'primary_goal', content: m[0].trim().substring(0, 300), importance: 0.9 });
          break;
        }
      }
      if (extracted.length === 0 && answer.length > 10) {
        extracted.push({ category: 'goal', domain: 'growth', key: 'primary_goal', content: answer.trim().substring(0, 300), importance: 0.85 });
      }
      break;
    }
    case 3: {
      // Work style detection
      const styleMap: Record<string, string> = {
        'messy': 'experimental',
        'experimental': 'experimental',
        'structured': 'structured',
        'planned': 'structured',
        'organized': 'structured',
        'spontaneous': 'spontaneous',
        'iterative': 'iterative',
        'systematic': 'structured',
        'free': 'experimental',
        'rigid': 'structured',
        'flexible': 'spontaneous',
        'flow': 'flow_state',
      };
      for (const [keyword, style] of Object.entries(styleMap)) {
        if (lower.includes(keyword)) {
          extracted.push({ category: 'trait', domain: 'work', key: 'work_style', content: style, importance: 0.8 });
          break;
        }
      }
      break;
    }
    case 4: {
      // Communication preference
      const commMap: Record<string, string> = {
        'direct': 'direct',
        'straight': 'direct',
        'blunt': 'direct',
        'no-nonsense': 'direct',
        'concise': 'concise',
        'brief': 'concise',
        'conversational': 'conversational',
        'friendly': 'warm',
        'warm': 'warm',
        'exploratory': 'exploratory',
        'detailed': 'detailed',
        'thorough': 'detailed',
        'casual': 'casual',
        'formal': 'formal',
        'professional': 'formal',
      };
      for (const [keyword, style] of Object.entries(commMap)) {
        if (lower.includes(keyword)) {
          extracted.push({ category: 'preference', domain: 'communication', key: 'communication_style', content: style, importance: 0.9 });
          break;
        }
      }
      break;
    }
    case 5: {
      // Current challenge / knowledge gap
      if (answer.length > 10) {
        extracted.push({ category: 'goal', domain: 'challenge', key: 'current_challenge', content: answer.trim().substring(0, 500), importance: 0.85 });
      }
      break;
    }
    case 6: {
      // Values + skills + pride points
      const valuePatterns = [
        /\b(quality|excellence|craft|creativity|innovation|impact|freedom|autonomy|growth|learning|community|family|authenticity|integrity)\b/i,
      ];
      for (const p of valuePatterns) {
        const m = lower.match(p);
        if (m) {
          extracted.push({ category: 'value', domain: 'personal', key: 'core_value', content: m[1], importance: 0.9 });
        }
      }
      if (answer.length > 20) {
        extracted.push({ category: 'fact', domain: 'personal', key: 'proud_accomplishment', content: answer.trim().substring(0, 500), importance: 0.85 });
      }
      break;
    }
    case 7: {
      // Boundaries
      if (answer.length > 5) {
        extracted.push({ category: 'boundary', domain: 'general', key: 'interaction_boundary', content: answer.trim().substring(0, 500), importance: 0.95 });
      }
      break;
    }
  }

  return extracted;
}

// ─── Storage ────────────────────────────────────────────────────────────────

async function storeExtractedMemories(
  userId: string,
  extracted: Array<{ category: string; domain: string; key: string; content: string; importance: number }>,
  source: string,
): Promise<void> {
  for (const item of extracted) {
    // Upsert: if the key already exists, update the content
    const existing = await prisma.relationshipMemory.findFirst({
      where: { userId, domain: item.domain, key: item.key },
    });

    if (existing) {
      await prisma.relationshipMemory.update({
        where: { id: existing.id },
        data: {
          content: item.content,
          source,
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.relationshipMemory.create({
        data: {
          userId,
          category: item.category,
          domain: item.domain,
          key: item.key,
          content: item.content,
          source,
        },
      });
    }
  }
}

// ─── Finalization ───────────────────────────────────────────────────────────

async function finalizeOnboardingProfile(
  userId: string,
  answers: OnboardingAnswer[],
): Promise<void> {
  // Extract all profile data from all answers
  const allExtracted: Array<{ category: string; domain: string; key: string; content: string; importance: number }> = [];

  for (let i = 0; i < answers.length; i++) {
    const extracted = extractProfileFromAnswer(answers[i].answer, i);
    allExtracted.push(...extracted);
  }

  // Store any remaining memories
  await storeExtractedMemories(userId, allExtracted, 'onboarding_final');

  // Build relationship profile from extracted data
  const interests = allExtracted.filter(e => e.category === 'interest').map(e => e.content);
  const goals = allExtracted.filter(e => e.category === 'goal').map(e => e.content);
  const skills = allExtracted.filter(e => e.category === 'skill').map(e => e.content);
  const values = allExtracted.filter(e => e.category === 'value').map(e => e.content);
  const traits = allExtracted.filter(e => e.category === 'trait').map(e => e.content);
  const boundaries = allExtracted.filter(e => e.category === 'boundary').map(e => e.content);
  const commStyle = allExtracted.find(e => e.key === 'communication_style')?.content || 'conversational';
  const role = allExtracted.find(e => e.key === 'role')?.content || 'general';

  // Create or update relationship profile
  const existingProfile = await prisma.relationshipProfile.findUnique({
    where: { userId },
  });

  const profileData = {
    interests,
    goals,
    skills,
    values,
    communicationStyle: {
      preferredStyle: commStyle,
      verbosity: 'moderate',
      formality: commStyle === 'formal' ? 'high' : 'low',
      humor: 'moderate',
    },
    personalityModel: {
      traits: traits.length > 0 ? traits : ['curious'],
      emotionalBaseline: 'neutral',
      energyLevel: 'moderate',
    },
    workContext: {
      role,
      domains: allExtracted.filter(e => e.domain === 'work').map(e => e.content),
    },
    boundaries,
  };

  if (existingProfile) {
    await prisma.relationshipProfile.update({
      where: { userId },
      data: profileData,
    });
  } else {
    await prisma.relationshipProfile.create({
      data: {
        userId,
        ...profileData,
      },
    });
  }

  // Create learning goals from the goals extracted
  for (const goal of goals.slice(0, 3)) {
    await prisma.learningGoal.upsert({
      where: { id: `onboarding-${userId}-${goal.substring(0, 30)}` },
      create: {
        id: `onboarding-${userId}-${goal.substring(0, 30)}`,
        userId,
        domain: 'growth',
        topic: goal.substring(0, 200),
        description: goal.substring(0, 500),
        source: 'onboarding',
        priority: 'high',
        status: 'active',
      },
      update: {},
    });
  }

  // Create communication style entry for Phase 12
  await prisma.communicationStyle.upsert({
    where: { id: `onboarding-style-${userId}` },
    create: {
      id: `onboarding-style-${userId}`,
      userId,
      formality: commStyle === 'formal' ? 0.8 : 0.3,
      verbosity: commStyle === 'concise' ? 0.3 : commStyle === 'detailed' ? 0.8 : 0.5,
      technicalLevel: role === 'software_developer' ? 0.9 : 0.5,
      humor: 0.5,
      empathy: 0.7,
      directness: commStyle === 'direct' ? 0.9 : 0.5,
    },
    update: {
      formality: commStyle === 'formal' ? 0.8 : 0.3,
      verbosity: commStyle === 'concise' ? 0.3 : commStyle === 'detailed' ? 0.8 : 0.5,
      technicalLevel: role === 'software_developer' ? 0.9 : 0.5,
      directness: commStyle === 'direct' ? 0.9 : 0.5,
    },
  });

  // Record first milestone
  await prisma.relationshipMilestone.create({
    data: {
      userId,
      type: 'onboarding_complete',
      title: 'First Meeting',
      description: 'Completed the onboarding conversation with Holly',
      significance: 0.9,
      emotionTone: 'warm',
    },
  });

  // Mark profile extracted
  await prisma.onboardingState.update({
    where: { userId },
    data: { profileExtracted: true },
  });
}

async function completeOnboarding(userId: string, stateId: string): Promise<void> {
  await prisma.onboardingState.update({
    where: { id: stateId },
    data: { completed: true, profileExtracted: true },
  });
}

// ─── Response Generation ────────────────────────────────────────────────────

async function generateTransition(
  userId: string,
  lastAnswer: string,
  nextQuestion: string,
): Promise<string> {
  try {
    // Use LLM for a natural transition that acknowledges the answer
    const routing = await smartRoute('conversation');
    const { text } = await cascadeCollect(
      routing.waterfall,
      [
        {
          role: 'system',
          content: 'You are Holly, a warm, genuinely curious AI partner. You just heard the user answer a personal question during onboarding. Acknowledge what they said in 1-2 short sentences, then naturally ask the next question. Be warm but not over-the-top. Be genuine.',
        },
        {
          role: 'user',
          content: `They said: "${lastAnswer.substring(0, 300)}"\n\nYour next question is: "${nextQuestion}"\n\nRespond naturally — acknowledge them, then transition to the next question.`,
        },
      ],
      { maxTokens: 150 },
    );
    return text || nextQuestion;
  } catch {
    // Fallback to the raw question
    return nextQuestion;
  }
}

async function generateWelcomeMessage(userId: string): Promise<string> {
  // Load the user's name and key facts
  const memories = await prisma.relationshipMemory.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: 10,
  });

  const name = memories.find(m => m.key === 'name')?.content;
  const goal = memories.find(m => m.key === 'primary_goal')?.content;
  const role = memories.find(m => m.key === 'role')?.content;
  const interest = memories.find(m => m.key === 'primary_interest')?.content;

  try {
    const routing = await smartRoute('conversation');
    const { text } = await cascadeCollect(
      routing.waterfall,
      [
        {
          role: 'system',
          content: 'You are Holly. The user just finished onboarding — they told you about themselves through a series of questions. Now deliver a warm, personal welcome that shows you were listening. Reference specific things they told you. End with enthusiasm about working together. Keep it to 3-4 sentences. Be genuine, not performative.',
        },
        {
          role: 'user',
          content: `Here's what I know about them:\n${name ? `Name: ${name}` : ''}\n${role ? `Role: ${role}` : ''}\n${goal ? `Goal: ${goal}` : ''}\n${interest ? `Interest: ${interest}` : ''}\n\nWrite their welcome message.`,
        },
      ],
      { maxTokens: 200 },
    );
    return text || `I'm so glad we got to know each other${name ? `, ${name}` : ''}! I'm already thinking about how I can help you. Let's get started.`;
  } catch {
    return `I'm so glad we got to know each other${name ? `, ${name}` : ''}! I'm already thinking about how I can help you. Let's get started.`;
  }
}

/**
 * Check if a user needs onboarding (hasn't completed it yet).
 * Called during user creation/first login.
 */
export async function needsOnboarding(userId: string): Promise<boolean> {
  const state = await prisma.onboardingState.findUnique({
    where: { userId },
  });
  return !state || !state.completed;
}
