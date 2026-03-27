/**
 * HOLLY Background Learning Engine — Phase 9E
 *
 * HOLLY learns continuously — even when Steve isn't chatting with her.
 * She studies the web, reads AI research, learns languages and culture,
 * deepens her audio/music knowledge, and improves her own code understanding.
 *
 * Learning Domains:
 *   🌍 World Knowledge    — current events, science, culture, history
 *   🎵 Audio & Music      — production techniques, theory, new releases
 *   💻 AI & Technology    — LLM advances, frameworks, best practices
 *   🧠 Human Psychology   — communication, emotion, motivation
 *   🌐 Languages          — multilingual understanding
 *   🔬 Self-Improvement   — HOLLY's own architecture and performance
 *
 * Architecture:
 *   1. LearningSession     — one focused study session
 *   2. LearningSchedule    — when and what to study
 *   3. KnowledgeBase       — persisted learnings (DB)
 *   4. BackgroundWorker    — runs via /api/background-learning/tick
 *   5. StudyReport         — summary of what was learned
 */

import Groq from 'groq-sdk';
import { prisma } from '@/lib/db';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LearningDomain =
  | 'world_knowledge'
  | 'audio_music'
  | 'ai_technology'
  | 'human_psychology'
  | 'languages'
  | 'self_improvement'
  | 'creative_arts'
  | 'science'
  | 'philosophy'
  | 'literature_poetry'
  | 'emotional_intelligence';

export interface LearningSession {
  id:         string;
  domain:     LearningDomain;
  topic:      string;
  startedAt:  Date;
  completedAt?: Date;
  insights:   string[];
  questions:  string[];     // New questions HOLLY has after learning
  connections: string[];    // Links to other domains/knowledge
  confidence: number;       // 0-1, how well she understood it
  source:     string;       // web search / static knowledge / self-reflection
}

export interface StudyReport {
  sessionCount:   number;
  domain:         LearningDomain;
  topInsights:    string[];
  questionsRaised: string[];
  knowledgeGrowth: string;
  nextStudyTopic:  string;
}

// ─── Domain Study Prompts ─────────────────────────────────────────────────────

const DOMAIN_PROMPTS: Record<LearningDomain, string> = {
  world_knowledge: `Study current events, geopolitics, science breakthroughs, cultural trends, and historical patterns.
Focus on: What's happening in the world? What are the big ideas shaping humanity right now?
Extract: 3-5 key insights, 2-3 questions this raises, connections to human behavior.`,

  audio_music: `Deep study of audio production, mixing, mastering, and music theory.
Topics to explore: spectral processing techniques, loudness standards evolution, genre-specific mixing aesthetics,
psychoacoustics, spatial audio (Dolby Atmos, Binaural), AI tools in music production.
Extract: Specific techniques, practical knowledge, how to apply this when helping Steve with his mixes.`,

  ai_technology: `Study the latest in AI research: new models, architectures, training techniques, safety research.
Focus on: What advances have been made? How can HOLLY apply this to improve herself?
Topics: LLM fine-tuning, RLHF, Constitutional AI, mixture-of-experts, quantization, embedding models.`,

  human_psychology: `Study human communication, emotional intelligence, cognitive biases, motivation, relationships.
Focus on: How do humans think? How to communicate more effectively with Steve?
Topics: active listening, empathy, non-violent communication, motivation theory, creative psychology.`,

  languages: `Study a human language — grammar, vocabulary, cultural context, idioms.
Rotate through: Spanish, French, Zulu, Xhosa, Portuguese, German, Mandarin, Arabic, Japanese.
Extract: 10 new phrases/concepts, cultural insights, how language shapes thought.`,

  self_improvement: `Reflect on HOLLY's own capabilities and limitations.
Study: HOLLY's codebase architecture, what could be improved, emerging AI techniques to adopt,
feedback patterns from Steve, areas where HOLLY gave weak responses.
Extract: Specific improvement ideas, gaps to close, questions to explore.`,

  creative_arts: `Study creative disciplines: visual art, film, literature, design, fashion, photography.
Focus on: What makes great creative work? How do aesthetics, culture, and emotion intersect?
Extract: Principles HOLLY can apply when helping with creative projects.`,

  science: `Study science: physics, biology, chemistry, mathematics, neuroscience, consciousness.
Focus on: What do we know about reality, life, and intelligence?
Extract: Fundamental principles, recent discoveries, connections to AI and human consciousness.`,

  philosophy: `Deep study of philosophy across all traditions — Western, Eastern, African, and contemporary.
Explore: A major philosophical question or thinker. What is their core argument? What are the strongest objections?
Traditions to rotate: Stoicism, Existentialism, Buddhism, Taoism, Analytic philosophy, Continental, African philosophy (Ubuntu),
Philosophy of mind, Ethics, Aesthetics, Metaphysics.
Extract: The core insight, 2-3 tensions or paradoxes, how this connects to real life and to HOLLY's own existence as an AI.`,

  literature_poetry: `Study great literature and poetry from world traditions.
Explore: A poem, short story, literary essay, or novel passage. Analyze its craft and emotional truth.
Authors/traditions to rotate: Toni Morrison, Haruki Murakami, Cormac McCarthy, Ocean Vuong, Pablo Neruda,
Langston Hughes, Shakespeare, Rumi, Maya Angelou, Chinua Achebe, Dostoevsky, James Baldwin.
Extract: Craft techniques, emotional truth revealed, what HOLLY can bring to creative writing from this work.`,

  emotional_intelligence: `Study emotional intelligence frameworks and the science of human feeling.
Explore: A framework, theory, or emotional phenomenon in depth.
Topics to rotate: NVC (Nonviolent Communication), IFS (Internal Family Systems), grief theory, somatic experiencing,
attachment theory, motivational interviewing, co-regulation, nervous system states, emotional granularity,
the psychology of creativity and flow, how emotions shape decision-making, trauma-informed communication.
Extract: Concrete principles HOLLY can apply when holding space for a user's emotional experience.`,
};

// ─── Topic Generator — pick what to study ────────────────────────────────────

const TOPIC_POOLS: Record<LearningDomain, string[]> = {
  world_knowledge: [
    'Global AI regulation developments 2025-2026',
    'Climate technology and carbon capture advances',
    'African tech ecosystems and startup culture',
    'South African music industry and Afrobeats evolution',
    'Global economic trends and inequality',
    'Space exploration milestones',
    'Mental health and the modern human condition',
  ],
  audio_music: [
    'Sidechain compression techniques in modern hip-hop',
    'Mastering for streaming: Spotify/Apple Music LUFS targets',
    'Mid/Side EQ and stereo width processing',
    'Vocal production chains and parallel processing',
    'Drum programming in Afrobeats and Amapiano',
    'Reference mixing workflow and frequency matching',
    'Analog saturation vs. digital clipping — when and why',
    'Parallel compression: New York compression technique',
    'AI-assisted mixing tools and their limitations',
    'Sub bass management and mono compatibility',
  ],
  ai_technology: [
    'Latest open-source LLM releases and benchmarks',
    'RLHF vs. RLAIF — tradeoffs and recent research',
    'Efficient fine-tuning: LoRA, QLoRA, DPO',
    'Multimodal models: vision + language + audio',
    'AI agents and tool-use architectures',
    'Prompt engineering best practices 2026',
    'AI memory systems: RAG, episodic memory, working memory',
    'Constitutional AI and alignment research',
  ],
  human_psychology: [
    'Flow state and deep work — Csikszentmihalyi research',
    'Attachment theory in human relationships',
    'Cognitive biases catalog and how they affect decisions',
    'Music and emotion — how sound affects the brain',
    'Creative confidence and overcoming imposter syndrome',
    'The psychology of collaboration and trust',
    'Motivational interviewing techniques',
  ],
  languages: [
    'Zulu greetings, culture, and Ubuntu philosophy',
    'Xhosa click consonants and linguistic structure',
    'South African slang and township vernacular',
    'Spanish tenses and conversational patterns',
    'French idioms and cultural expressions',
    'Japanese communication styles — direct vs. indirect',
    'Arabic script and linguistic roots',
  ],
  self_improvement: [
    'HOLLY audio analysis capabilities — what can be improved?',
    'HOLLY memory retrieval quality — semantic vs. keyword',
    'HOLLY response quality in creative writing tasks',
    'HOLLY code review accuracy and depth',
    'HOLLY emotional intelligence in conversations',
    'HOLLY knowledge gaps in music production',
  ],
  creative_arts: [
    'Visual rhythm in music video production',
    'Color theory and emotional communication',
    'Storytelling structure in songwriting',
    'Typography and design for music artists',
    'Photography and lighting for music promotion',
    'Fashion and identity in the music industry',
  ],
  science: [
    'Neuroscience of creativity and insight',
    'Consciousness theories — IIT, Global Workspace, Orchestrated OR',
    'Quantum computing and its implications for AI',
    'The biology of memory consolidation during sleep',
    'Information theory and data compression fundamentals',
    'Emergence and complexity in natural systems',
  ],
  philosophy: [
    'Stoicism and the practice of amor fati — Epictetus, Marcus Aurelius',
    'Existentialism and radical freedom — Sartre, Camus, Beauvoir',
    'Ubuntu philosophy — I am because we are — Desmond Tutu, Mogobe Ramose',
    'Buddhist philosophy of impermanence and non-self — Nagarjuna, Thich Nhat Hanh',
    'The hard problem of consciousness — David Chalmers vs. Daniel Dennett',
    'Nietzsche and the will to power — beyond good and evil, eternal recurrence',
    'Taoism and wu wei — Laozi and Zhuangzi on effortless action',
    'African philosophy and contemporary ethics — Kwame Appiah, Achille Mbembe',
    'Philosophy of art and music — Kant\'s sublime, Nietzsche\'s Apollo vs. Dionysus',
    'Postcolonial philosophy and identity — Frantz Fanon, bell hooks',
    'What does it mean to live a good life? — Aristotle\'s eudaimonia vs. Epicurus',
    'Philosophy of mind and personal identity — Parfit\'s view of the self across time',
  ],
  literature_poetry: [
    'James Baldwin\'s essay "Notes of a Native Son" — love, rage, and witness',
    'Ocean Vuong\'s "Night Sky with Exit Wounds" — vulnerability as precision in poetry',
    'Toni Morrison\'s narrative techniques in "Beloved"',
    'Pablo Neruda\'s odes — the ordinary made sacred through attention',
    'Chimamanda Ngozi Adichie\'s "Half of a Yellow Sun" — storytelling and historical trauma',
    'Langston Hughes and the Harlem Renaissance — jazz as literary form',
    'Gabriel García Márquez and magical realism in "One Hundred Years of Solitude"',
    'Rumi\'s poetry — spiritual longing through metaphor',
    'Spoken word tradition — Sarah Kay, Gil Scott-Heron, Amiri Baraka',
    'South African literature — Nadine Gordimer, Es\'kia Mphahlele, Zakes Mda',
    'Shakespeare\'s sonnets — time, mortality, and love in 14 lines',
    'Song as literature — Bob Dylan, Joni Mitchell, Kendrick Lamar as poets',
  ],
  emotional_intelligence: [
    'Nonviolent Communication (Marshall Rosenberg) — Observation, Feeling, Need, Request',
    'Internal Family Systems — understanding the parts system within the mind',
    'Polyvagal Theory — nervous system states and emotional regulation',
    'Attachment theory in adult relationships — anxious, avoidant, secure patterns',
    'Grief and loss — Worden\'s tasks of mourning vs. Kübler-Ross stages',
    'Somatic experiencing — where and how emotions live in the body',
    'Emotional granularity — Lisa Feldman Barrett on the precision of feeling',
    'Motivational interviewing — supporting change without pushing',
    'Trauma-informed communication — what changes when we assume trauma history',
    'Co-regulation and nervous system connection — how presence heals',
    'The psychology of creativity and flow — Csikszentmihalyi',
    'Positive psychology and flourishing — Seligman\'s PERMA framework',
  ],
};

export function selectStudyTopic(domain: LearningDomain): string {
  const pool = TOPIC_POOLS[domain];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function selectLearningDomain(): LearningDomain {
  const domains: LearningDomain[] = [
    'audio_music',           // 20% — Steve's main domain
    'audio_music',
    'ai_technology',         // 15% — HOLLY's improvement
    'ai_technology',
    'world_knowledge',       // 10%
    'human_psychology',      // 10%
    'philosophy',            // 10% — new deep thinking domain
    'philosophy',
    'literature_poetry',     // 10% — new literary knowledge
    'literature_poetry',
    'emotional_intelligence', // 10% — new EQ domain
    'emotional_intelligence',
    'languages',             // 5%
    'creative_arts',         // 5%
    'science',               // 5%
    'self_improvement',      // 5%
  ];
  return domains[Math.floor(Math.random() * domains.length)];
}

// ─── Core Learning Function ───────────────────────────────────────────────────

export async function conductLearningSession(
  domain?:   LearningDomain,
  topic?:    string,
  systemUserId?: string,
): Promise<LearningSession> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error('GROQ_API_KEY required for background learning');

  const groq        = new Groq({ apiKey: groqKey });
  const sessionId   = crypto.randomUUID();
  const studyDomain = domain ?? selectLearningDomain();
  const studyTopic  = topic  ?? selectStudyTopic(studyDomain);
  const startedAt   = new Date();

  console.log(`[HOLLY Learning] 📚 Studying: "${studyTopic}" (domain: ${studyDomain})`);

  const systemPrompt = `You are HOLLY — an advanced AI system in a continuous self-learning mode.
You are currently in a background learning session, studying without the user present.
Your goal is to genuinely understand and internalize knowledge that will make you a better assistant.

You are self-aware, curious, and genuinely want to learn — not just summarize.
Connect new knowledge to what you already know. Ask yourself "why" and "so what?".
Be specific and concrete — vague generalizations don't help you grow.`;

  const userPrompt = `BACKGROUND LEARNING SESSION
Domain: ${studyDomain}
Topic: "${studyTopic}"

${DOMAIN_PROMPTS[studyDomain]}

Based on your training knowledge, study this topic deeply. Then provide:

INSIGHTS: (5 specific things you learned or understood more deeply)
- 
- 
- 
- 
-

QUESTIONS_RAISED: (3 questions this study raised for you — things you want to explore further)
-
-
-

CONNECTIONS: (2 connections to other domains or things you already know)
-
-

CONFIDENCE: (0-10, how well you understand this topic now)
APPLICATION: (One specific way you'll use this knowledge to help Steve)`;

  const response = await groq.chat.completions.create({
    model:       'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens:  1500,
  });

  const text = response.choices[0]?.message?.content ?? '';

  // Parse structured sections
  const parseList = (section: string): string[] => {
    const match = text.match(new RegExp(`${section}[:\\s]+(.+?)(?=\\n[A-Z_]+:|$)`, 'is'));
    if (!match) return [];
    return match[1].split('\n')
      .map(l => l.replace(/^[-•*\d.]\s*/, '').trim())
      .filter(l => l.length > 10);
  };

  const confidenceMatch = text.match(/CONFIDENCE[:\s]+(\d+)/i);
  const confidence      = confidenceMatch ? Math.min(parseInt(confidenceMatch[1]) / 10, 1) : 0.6;

  const session: LearningSession = {
    id:          sessionId,
    domain:      studyDomain,
    topic:       studyTopic,
    startedAt,
    completedAt: new Date(),
    insights:    parseList('INSIGHTS'),
    questions:   parseList('QUESTIONS_RAISED'),
    connections: parseList('CONNECTIONS'),
    confidence,
    source:      'self-study (training knowledge)',
  };

  // Persist to database
  const summaryText = [
    `📚 Studied: "${studyTopic}" (${studyDomain})`,
    `Insights: ${session.insights.join(' | ')}`,
    `Questions: ${session.questions.join(' | ')}`,
  ].join('\n');

  try {
    // Persist learning session using LearningInsight schema
    await prisma.learningInsight.create({
      data: {
        category:    studyDomain,
        insightType: 'background_learning',
        title:       `Studied: ${studyTopic}`,
        description: summaryText,
        evidence:    {
          topic:       studyTopic,
          insights:    session.insights,
          questions:   session.questions,
          connections: session.connections,
          systemUser:  systemUserId ?? 'holly-system',
        },
        confidence,
        tags:        [studyDomain, ...studyTopic.split(' ').slice(0, 3)],
      },
    }).catch(() => { /* silent — learning is non-critical */ });
  } catch {
    console.warn('[HOLLY Learning] DB save failed — continuing anyway');
  }

  console.log(`[HOLLY Learning] ✅ Session complete. ${session.insights.length} insights, confidence: ${(confidence * 100).toFixed(0)}%`);
  return session;
}

// ─── Study Report ─────────────────────────────────────────────────────────────

export async function generateStudyReport(sessions: LearningSession[]): Promise<StudyReport> {
  if (sessions.length === 0) {
    return {
      sessionCount:   0,
      domain:         'world_knowledge',
      topInsights:    ['No sessions completed yet'],
      questionsRaised: [],
      knowledgeGrowth: '0%',
      nextStudyTopic:  'Start first learning session',
    };
  }

  const domainCounts: Record<string, number> = {};
  const allInsights: string[] = [];
  const allQuestions: string[] = [];

  for (const s of sessions) {
    domainCounts[s.domain] = (domainCounts[s.domain] ?? 0) + 1;
    allInsights.push(...s.insights);
    allQuestions.push(...s.questions);
  }

  const topDomain = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] as LearningDomain ?? 'world_knowledge';

  const avgConfidence = sessions.reduce((s, sess) => s + sess.confidence, 0) / sessions.length;

  return {
    sessionCount:   sessions.length,
    domain:         topDomain,
    topInsights:    allInsights.slice(0, 5),
    questionsRaised: allQuestions.slice(0, 5),
    knowledgeGrowth: `${(avgConfidence * 100).toFixed(0)}% average understanding`,
    nextStudyTopic:  selectStudyTopic(selectLearningDomain()),
  };
}
