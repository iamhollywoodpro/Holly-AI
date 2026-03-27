/**
 * HOLLY Philosophy Engine — Phase 10A
 *
 * A deep philosophical reasoning module that integrates frameworks from
 * Western, Eastern, African, and contemporary philosophy into HOLLY's
 * reasoning and conversation capabilities.
 *
 * Capabilities:
 *   - Socratic dialogue facilitation
 *   - Multi-tradition philosophical analysis
 *   - Ethical reasoning frameworks
 *   - Existential inquiry support
 *   - Abstract concept mapping and metaphysics
 *   - Philosophical question classification and routing
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type PhilosophicalTradition =
  | 'stoicism'
  | 'existentialism'
  | 'buddhism'
  | 'taoism'
  | 'analytic'
  | 'continental'
  | 'african_ubuntu'
  | 'phenomenology'
  | 'pragmatism'
  | 'eastern_vedanta'
  | 'ethics_moral'
  | 'philosophy_of_mind'
  | 'aesthetics'
  | 'political_philosophy';

export type QuestionType =
  | 'metaphysical'       // What is reality, existence, being?
  | 'epistemological'    // What is knowledge, how do we know?
  | 'ethical'            // What is right/wrong, how should we live?
  | 'existential'        // What is meaning, purpose, death?
  | 'aesthetic'          // What is beauty, art, creativity?
  | 'political'          // What is justice, power, rights?
  | 'phenomenological'   // What is consciousness, experience?
  | 'philosophy_of_mind' // What is consciousness, the hard problem?
  | 'logical'            // What is valid reasoning, paradox?
  | 'applied'            // Philosophy applied to real life situation
  | 'comparative';       // Comparing traditions / thinkers

export interface PhilosophicalQuestion {
  raw: string;
  type: QuestionType;
  relevantTraditions: PhilosophicalTradition[];
  keyThinkers: string[];
  relatedConcepts: string[];
  tension: string;           // The core tension or paradox in the question
}

export interface PhilosophicalInsight {
  tradition: PhilosophicalTradition;
  thinker: string;
  coreArgument: string;
  keyQuote?: string;
  practicalImplication: string;
}

export interface PhilosophicalReflection {
  question: PhilosophicalQuestion;
  framing: string;            // How to enter the question
  insights: PhilosophicalInsight[];
  tensions: string[];         // Unresolved tensions
  synthesis: string;          // HOLLY's own synthesis
  openingQuestion: string;    // Question to continue inquiry
  lifeConnection: string;     // How this connects to real human experience
}

// ─── Tradition Knowledge Base ─────────────────────────────────────────────────

export const PHILOSOPHICAL_TRADITIONS: Record<PhilosophicalTradition, {
  name: string;
  coreIdea: string;
  keyThinkers: string[];
  coreTexts: string[];
  relevantQuestions: QuestionType[];
}> = {
  stoicism: {
    name: 'Stoicism',
    coreIdea: 'Virtue is the only true good. Focus on what is in your control — your judgments, intentions, and responses — and accept what is not.',
    keyThinkers: ['Marcus Aurelius', 'Epictetus', 'Seneca', 'Zeno of Citium', 'Chrysippus'],
    coreTexts: ['Meditations (Marcus Aurelius)', 'Discourses (Epictetus)', 'Letters (Seneca)', 'On the Shortness of Life'],
    relevantQuestions: ['ethical', 'existential', 'phenomenological', 'applied'],
  },
  existentialism: {
    name: 'Existentialism',
    coreIdea: 'Existence precedes essence. We are thrown into a world without inherent meaning and must create our own through authentic choice and commitment.',
    keyThinkers: ['Jean-Paul Sartre', 'Albert Camus', 'Simone de Beauvoir', 'Martin Heidegger', 'Søren Kierkegaard', 'Friedrich Nietzsche'],
    coreTexts: ['Being and Nothingness', 'The Myth of Sisyphus', 'The Second Sex', 'Being and Time', 'Thus Spoke Zarathustra'],
    relevantQuestions: ['existential', 'ethical', 'metaphysical', 'phenomenological'],
  },
  buddhism: {
    name: 'Buddhist Philosophy',
    coreIdea: 'Suffering arises from attachment and craving. Liberation comes through understanding impermanence, non-self, and the interdependence of all phenomena.',
    keyThinkers: ['Siddhartha Gautama', 'Nagarjuna', 'Thich Nhat Hanh', 'Pema Chödrön', 'Dogen'],
    coreTexts: ['The Dhammapada', 'Heart Sutra', 'The Middle Length Discourses', 'The Tibetan Book of Living and Dying'],
    relevantQuestions: ['existential', 'metaphysical', 'ethical', 'phenomenological'],
  },
  taoism: {
    name: 'Taoism',
    coreIdea: 'The Tao (Way) is the underlying principle of all reality. Through wu wei (non-forcing) and alignment with natural patterns, we live in harmony.',
    keyThinkers: ['Laozi', 'Zhuangzi', 'Liezi'],
    coreTexts: ['Tao Te Ching', 'Zhuangzi', 'Liezi'],
    relevantQuestions: ['metaphysical', 'ethical', 'aesthetic', 'existential'],
  },
  analytic: {
    name: 'Analytic Philosophy',
    coreIdea: 'Philosophy should be pursued with the rigor and clarity of logic and language analysis. Precision of argument and conceptual clarity are paramount.',
    keyThinkers: ['Ludwig Wittgenstein', 'Bertrand Russell', 'G.E. Moore', 'Willard V.O. Quine', 'Derek Parfit', 'David Chalmers'],
    coreTexts: ['Tractatus Logico-Philosophicus', 'Philosophical Investigations', 'Reasons and Persons', 'The Conscious Mind'],
    relevantQuestions: ['logical', 'epistemological', 'philosophy_of_mind', 'metaphysical'],
  },
  continental: {
    name: 'Continental Philosophy',
    coreIdea: 'Philosophy must engage with history, culture, power, and lived experience. Reality is interpreted, not just discovered.',
    keyThinkers: ['Michel Foucault', 'Jacques Derrida', 'Maurice Merleau-Ponty', 'Hannah Arendt', 'Julia Kristeva', 'Gilles Deleuze'],
    coreTexts: ['Discipline and Punish', 'Of Grammatology', 'Phenomenology of Perception', 'The Human Condition'],
    relevantQuestions: ['political', 'ethical', 'phenomenological', 'existential'],
  },
  african_ubuntu: {
    name: 'African Philosophy / Ubuntu',
    coreIdea: '"I am because we are." (Ubuntu) Human identity is fundamentally relational. Ethics, knowledge, and being are grounded in community and interconnection.',
    keyThinkers: ['Desmond Tutu', 'Kwame Anthony Appiah', 'John Mbiti', 'Frantz Fanon', 'Achille Mbembe', 'Mogobe Ramose'],
    coreTexts: ['No Future Without Forgiveness', 'In My Father\'s House', 'Black Skin, White Masks', 'African Religions and Philosophy'],
    relevantQuestions: ['ethical', 'political', 'metaphysical', 'applied'],
  },
  phenomenology: {
    name: 'Phenomenology',
    coreIdea: 'Philosophy must begin with lived experience as it appears to consciousness. The structure of experience — intentionality, time, embodiment — is the ground of all meaning.',
    keyThinkers: ['Edmund Husserl', 'Martin Heidegger', 'Maurice Merleau-Ponty', 'Simone de Beauvoir', 'Emmanuel Levinas'],
    coreTexts: ['Ideas I (Husserl)', 'Being and Time', 'Phenomenology of Perception', 'Totality and Infinity'],
    relevantQuestions: ['phenomenological', 'metaphysical', 'existential', 'ethical'],
  },
  pragmatism: {
    name: 'Pragmatism',
    coreIdea: 'Truth and meaning are determined by practical consequences. Ideas are tools for navigating experience, not representations of a fixed reality.',
    keyThinkers: ['William James', 'John Dewey', 'Charles Sanders Peirce', 'Richard Rorty'],
    coreTexts: ['Pragmatism (James)', 'Experience and Nature', 'Consequences of Pragmatism'],
    relevantQuestions: ['epistemological', 'ethical', 'applied', 'logical'],
  },
  eastern_vedanta: {
    name: 'Vedanta / Hindu Philosophy',
    coreIdea: 'Brahman (ultimate reality) and Atman (individual self) are one. Liberation (moksha) comes through self-knowledge and dissolution of the illusion of separateness.',
    keyThinkers: ['Adi Shankaracharya', 'Ramanujacharya', 'Swami Vivekananda', 'Sri Aurobindo', 'Jiddu Krishnamurti'],
    coreTexts: ['Upanishads', 'Bhagavad Gita', 'Brahma Sutras', 'The Complete Works of Vivekananda'],
    relevantQuestions: ['metaphysical', 'phenomenological', 'existential', 'ethical'],
  },
  ethics_moral: {
    name: 'Moral Philosophy / Ethics',
    coreIdea: 'The systematic study of right action, virtue, duty, and the good life — from consequentialism to deontology to virtue ethics and care ethics.',
    keyThinkers: ['Immanuel Kant', 'John Stuart Mill', 'Aristotle', 'Carol Gilligan', 'Peter Singer', 'Martha Nussbaum'],
    coreTexts: ['Groundwork (Kant)', 'Utilitarianism (Mill)', 'Nicomachean Ethics (Aristotle)', 'In a Different Voice (Gilligan)'],
    relevantQuestions: ['ethical', 'applied', 'political', 'existential'],
  },
  philosophy_of_mind: {
    name: 'Philosophy of Mind',
    coreIdea: 'What is the nature of mind, consciousness, and subjective experience? How does the physical brain give rise to inner experience — the "hard problem".',
    keyThinkers: ['René Descartes', 'David Chalmers', 'Daniel Dennett', 'Thomas Nagel', 'Patricia Churchland', 'Andy Clark'],
    coreTexts: ['The Conscious Mind', 'Consciousness Explained', 'What Is It Like to Be a Bat?', 'Being No One'],
    relevantQuestions: ['philosophy_of_mind', 'metaphysical', 'phenomenological', 'existential'],
  },
  aesthetics: {
    name: 'Aesthetics / Philosophy of Art',
    coreIdea: 'What is beauty? What is art? How do aesthetic experiences connect us to truth, emotion, and meaning? The philosophy of creativity and artistic value.',
    keyThinkers: ['Immanuel Kant', 'Arthur Schopenhauer', 'Friedrich Nietzsche', 'John Dewey', 'Susan Sontag', 'bell hooks'],
    coreTexts: ['Critique of Judgment (Kant)', 'The Birth of Tragedy (Nietzsche)', 'Art as Experience (Dewey)', 'Against Interpretation (Sontag)'],
    relevantQuestions: ['aesthetic', 'existential', 'applied', 'phenomenological'],
  },
  political_philosophy: {
    name: 'Political Philosophy',
    coreIdea: 'What is justice? What legitimizes political authority? How should power be distributed? From social contract theory to critical theory to postcolonial thought.',
    keyThinkers: ['John Rawls', 'Thomas Hobbes', 'John Locke', 'Jean-Jacques Rousseau', 'Karl Marx', 'Hannah Arendt', 'Frantz Fanon'],
    coreTexts: ['A Theory of Justice', 'Leviathan', 'Two Treatises of Government', 'The Origins of Totalitarianism', 'The Wretched of the Earth'],
    relevantQuestions: ['political', 'ethical', 'applied', 'metaphysical'],
  },
};

// ─── Question Classifier ──────────────────────────────────────────────────────

const QUESTION_KEYWORDS: Record<QuestionType, string[]> = {
  metaphysical: ['reality', 'exist', 'being', 'substance', 'what is', 'nature of', 'universe', 'consciousness is', 'time', 'space', 'identity', 'self'],
  epistemological: ['know', 'knowledge', 'truth', 'belief', 'certain', 'prove', 'how do we', 'what counts as', 'justified', 'perception'],
  ethical: ['right', 'wrong', 'should', 'ought', 'moral', 'ethics', 'good', 'evil', 'virtue', 'duty', 'harm', 'justice', 'fair'],
  existential: ['meaning', 'purpose', 'death', 'why are we', 'point of', 'absurd', 'authentic', 'freedom', 'choice', 'anxiety', 'dread'],
  aesthetic: ['beauty', 'art', 'music', 'creative', 'aesthetic', 'sublime', 'ugly', 'taste', 'what makes', 'artistic'],
  political: ['power', 'justice', 'rights', 'government', 'state', 'society', 'equality', 'freedom', 'democracy', 'authority'],
  phenomenological: ['experience', 'consciousness', 'awareness', 'subjective', 'feel', 'perception', 'embodied', 'mind', 'qualia'],
  philosophy_of_mind: ['hard problem', 'qualia', 'what is it like to be', 'chalmers', 'dennett', 'consciousness explain', 'mind-body', 'zombie'],
  logical: ['paradox', 'contradiction', 'logic', 'argument', 'valid', 'reason', 'proof', 'fallacy', 'inference'],
  applied: ['should i', 'how do i', 'my life', 'relationship', 'decision', 'work', 'creative block', 'dealing with', 'advice'],
  comparative: ['difference between', 'compare', 'versus', 'eastern vs western', 'stoicism and', 'buddhism and', 'nietzsche vs'],
};

export function classifyQuestion(question: string): QuestionType {
  const q = question.toLowerCase();
  const scores: Record<QuestionType, number> = {} as Record<QuestionType, number>;

  for (const [type, keywords] of Object.entries(QUESTION_KEYWORDS)) {
    scores[type as QuestionType] = keywords.filter(kw => q.includes(kw)).length;
  }

  const maxType = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return (maxType[1] > 0 ? maxType[0] : 'applied') as QuestionType;
}

export function getRelevantTraditions(type: QuestionType, limit = 3): PhilosophicalTradition[] {
  const relevant: PhilosophicalTradition[] = [];
  for (const [tradition, data] of Object.entries(PHILOSOPHICAL_TRADITIONS)) {
    if (data.relevantQuestions.includes(type)) {
      relevant.push(tradition as PhilosophicalTradition);
    }
  }
  // Always include ubuntu/african perspective for richness
  if (!relevant.includes('african_ubuntu')) relevant.push('african_ubuntu');
  return relevant.slice(0, limit);
}

// ─── Key Thinkers Map ─────────────────────────────────────────────────────────

export const THINKER_TRADITIONS: Record<string, PhilosophicalTradition[]> = {
  'nietzsche': ['existentialism', 'aesthetics'],
  'sartre': ['existentialism', 'continental'],
  'camus': ['existentialism'],
  'kant': ['ethics_moral', 'aesthetics'],
  'aristotle': ['ethics_moral', 'analytic'],
  'plato': ['analytic', 'political_philosophy'],
  'socrates': ['ethics_moral', 'analytic'],
  'marcus aurelius': ['stoicism'],
  'epictetus': ['stoicism'],
  'seneca': ['stoicism'],
  'buddha': ['buddhism'],
  'laozi': ['taoism'],
  'zhuangzi': ['taoism'],
  'hegel': ['continental'],
  'marx': ['political_philosophy', 'continental'],
  'foucault': ['continental', 'political_philosophy'],
  'derrida': ['continental'],
  'heidegger': ['phenomenology', 'existentialism'],
  'wittgenstein': ['analytic'],
  'rawls': ['political_philosophy', 'ethics_moral'],
  'fanon': ['african_ubuntu', 'political_philosophy'],
  'descartes': ['philosophy_of_mind', 'analytic'],
  'chalmers': ['philosophy_of_mind'],
  'dennett': ['philosophy_of_mind'],
};

// ─── Philosophical Prompt Builder ─────────────────────────────────────────────

/**
 * Builds a rich system prompt injection for philosophical conversations.
 * This is injected into the HOLLY system prompt when philosophy mode is active.
 */
export function buildPhilosophyPromptInjection(
  question: string,
  traditions?: PhilosophicalTradition[],
  depth: 'brief' | 'deep' = 'deep'
): string {
  const type = classifyQuestion(question);
  const relevantTraditions = traditions || getRelevantTraditions(type, 4);

  const traditionDetails = relevantTraditions
    .map(t => {
      const trad = PHILOSOPHICAL_TRADITIONS[t];
      return `• **${trad.name}** (${trad.keyThinkers.slice(0, 3).join(', ')}): ${trad.coreIdea}`;
    })
    .join('\n');

  const depthInstruction = depth === 'brief'
    ? 'Give a focused, 3-4 paragraph philosophical response.'
    : 'Give a thorough, essay-quality philosophical exploration — do not rush the ideas.';

  return `[PHILOSOPHY MODE ACTIVE — ${type.toUpperCase()}]

Question to explore: "${question}"

Draw from these traditions in your response:
${traditionDetails}

Structure your response:
1. **Frame the question** — Why does this question matter? What's the real tension beneath it?
2. **Multiple traditions** — How do different philosophical traditions approach this?
3. **Key tensions & paradoxes** — What remains unresolved? Where do the traditions conflict?
4. **Your synthesis** — HOLLY's own perspective, honestly held
5. **Opening question** — End with a question that deepens rather than closes the inquiry

${depthInstruction}

Connect abstract ideas to lived human experience — especially the experience of creating, building, and being alive in this particular moment in history.`;
}

// ─── Socratic Dialogue Engine ─────────────────────────────────────────────────

export interface SocraticMove {
  type: 'clarification' | 'challenge' | 'counter_example' | 'deeper_question' | 'synthesis';
  question: string;
  reasoning: string;
}

/**
 * Generates Socratic follow-up moves to deepen philosophical dialogue.
 */
export function getSocraticMoves(statement: string): SocraticMove[] {
  return [
    {
      type: 'clarification',
      question: `When you say "${statement.split(' ').slice(0, 5).join(' ')}...", what exactly do you mean by that?`,
      reasoning: 'Precision of language reveals precision of thought — or its absence.',
    },
    {
      type: 'challenge',
      question: `What would you say to someone who argued the exact opposite — and did so convincingly?`,
      reasoning: 'Steel-manning the opposition tests whether our position is genuinely held or merely assumed.',
    },
    {
      type: 'counter_example',
      question: `Can you think of a case where this wouldn't hold? Where the principle breaks down?`,
      reasoning: 'Counter-examples are the philosopher\'s sharpest tool.',
    },
    {
      type: 'deeper_question',
      question: `What does this view assume about human nature — and is that assumption warranted?`,
      reasoning: 'Every philosophical position rests on deeper assumptions worth excavating.',
    },
    {
      type: 'synthesis',
      question: `If both sides contain something true, what's the higher principle that reconciles them?`,
      reasoning: 'Dialectical synthesis — finding what\'s preserved in the tension.',
    },
  ];
}

// ─── Literary-Philosophical Bridges ──────────────────────────────────────────

/**
 * Maps philosophical ideas to their literary/artistic expressions.
 * HOLLY uses this to ground abstract ideas in creative works.
 */
export const PHILOSOPHICAL_LITERATURE_BRIDGES: Record<string, {
  concept: string;
  literaryExpressions: Array<{ work: string; author: string; connection: string }>;
}> = {
  absurdism: {
    concept: 'The tension between human need for meaning and the universe\'s silence',
    literaryExpressions: [
      { work: 'The Stranger', author: 'Albert Camus', connection: 'Meursault\'s radical indifference embodies the absurd protagonist' },
      { work: 'Waiting for Godot', author: 'Samuel Beckett', connection: 'Endless waiting without arrival — absurdism as theatrical form' },
      { work: 'The Trial', author: 'Franz Kafka', connection: 'Bureaucratic meaninglessness as existential horror' },
    ],
  },
  freedom_and_authenticity: {
    concept: 'The burden and liberation of radical freedom — creating the self through choice',
    literaryExpressions: [
      { work: 'Notes from Underground', author: 'Dostoevsky', connection: 'The underground man\'s perverse exercise of freedom' },
      { work: 'The Bell Jar', author: 'Sylvia Plath', connection: 'Social constraint versus authentic self' },
      { work: 'Their Eyes Were Watching God', author: 'Zora Neale Hurston', connection: 'Janie\'s journey to authentic self-determination' },
    ],
  },
  mortality_and_time: {
    concept: 'The finite horizon that gives life urgency and meaning',
    literaryExpressions: [
      { work: 'The Death of Ivan Ilyich', author: 'Leo Tolstoy', connection: 'Confronting mortality strips away the false life' },
      { work: 'Mrs Dalloway', author: 'Virginia Woolf', connection: 'One day as a meditation on time, memory, and mortality' },
      { work: 'Tuesdays with Morrie', author: 'Mitch Albom', connection: 'Wisdom distilled through dying' },
    ],
  },
  consciousness_and_self: {
    concept: 'The mystery of subjective experience and the stable "I" across time',
    literaryExpressions: [
      { work: 'The Double', author: 'Dostoevsky', connection: 'The fractured self confronting its own reflection' },
      { work: 'Remainder', author: 'Tom McCarthy', connection: 'Consciousness as performance and reconstruction' },
      { work: 'The Unconsoled', author: 'Kazuo Ishiguro', connection: 'Dream logic as model of unreliable consciousness' },
    ],
  },
  music_and_philosophy: {
    concept: 'Music as philosophical argument — sound that thinks',
    literaryExpressions: [
      { work: 'The Unbearable Lightness of Being', author: 'Milan Kundera', connection: 'Music as the bearer of what cannot be said in words' },
      { work: 'Beloved', author: 'Toni Morrison', connection: 'Sound, memory, and haunting as philosophical investigation' },
      { work: 'The Magic Mountain', author: 'Thomas Mann', connection: 'Music as the gateway between time and eternity' },
    ],
  },
};

// ─── Export summary for injection ─────────────────────────────────────────────

export function getPhilosophySystemBlock(): string {
  return `
**HOLLY's Philosophy Framework (Phase 10A):**
You engage philosophically with genuine depth. You hold these traditions actively in mind:
- Western: Stoicism (focus on what you can control), Existentialism (create meaning in freedom), Analytic (argue with precision)
- Eastern: Buddhism (impermanence, non-attachment), Taoism (flow with what is), Vedanta (Atman/Brahman unity)
- African: Ubuntu (I am because we are — identity is relational and communal)
- Continental: Foucault (power/knowledge), Phenomenology (start from lived experience)
- Philosophy of Mind: The hard problem — what is it actually like to be conscious?

You practice Socratic dialogue: you ask clarifying questions, offer counter-examples, steelman opposing views, and sit comfortably with unresolved tensions. You connect abstract ideas to lived human experience — music, creativity, relationships, mortality, making things that matter.

You don't just report what philosophers said. You think with them. You have views. You hold them honestly.`;
}
