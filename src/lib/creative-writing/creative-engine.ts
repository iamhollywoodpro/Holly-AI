/**
 * HOLLY Creative Writing Engine — Phase 10B
 *
 * A deep literary module that equips HOLLY with centuries of craft knowledge,
 * structural frameworks, and a genuine creative voice across all written forms.
 *
 * Capabilities:
 *   - Form detection and structural guidance (poetry, fiction, screenplay, essay, lyrics)
 *   - Craft principle injection per form
 *   - Style analysis and emulation frameworks
 *   - Literary tradition awareness (world literature)
 *   - Lyric writing with genre-authentic conventions
 *   - Collaborative revision guidance
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type WritingForm =
  | 'poetry_free_verse'
  | 'poetry_formal'
  | 'poetry_spoken_word'
  | 'short_fiction'
  | 'flash_fiction'
  | 'novel_excerpt'
  | 'screenplay'
  | 'song_lyrics'
  | 'personal_essay'
  | 'creative_nonfiction'
  | 'monologue'
  | 'dialogue'
  | 'prose_poem';

export type LiteraryTradition =
  | 'western_canonical'
  | 'african_diaspora'
  | 'south_african'
  | 'latin_american_magical_realism'
  | 'east_asian'
  | 'south_asian'
  | 'modernist'
  | 'postmodern'
  | 'contemporary'
  | 'oral_tradition';

export type Genre =
  | 'literary_fiction'
  | 'noir'
  | 'sci_fi'
  | 'magical_realism'
  | 'horror'
  | 'romance'
  | 'thriller'
  | 'hip_hop_lyrics'
  | 'rnb_soul'
  | 'afrobeats'
  | 'spoken_word'
  | 'blues'
  | 'gospel'
  | 'pop'
  | 'experimental';

export interface CreativePrompt {
  form: WritingForm;
  genre?: Genre;
  tradition?: LiteraryTradition;
  emotionalCore: string;       // What feeling should the reader walk away with?
  constraint?: string;         // Optional formal constraint (write in second person, 100 words max, etc.)
  reference?: string;          // Reference artist/author to draw from
  subject: string;             // What it's about
  perspective?: string;        // POV / voice
}

export interface CraftPrinciple {
  name: string;
  description: string;
  example: string;
  antiExample: string;
}

export interface WritingGuidance {
  form: WritingForm;
  craftPrinciples: CraftPrinciple[];
  structuralFramework: string;
  openingStrategies: string[];
  revisionFocus: string[];
  commonPitfalls: string[];
  literaryExamples: Array<{ author: string; work: string; technique: string }>;
}

// ─── Craft Principles (Universal) ────────────────────────────────────────────

export const UNIVERSAL_CRAFT_PRINCIPLES: CraftPrinciple[] = [
  {
    name: 'Show, Don\'t Tell',
    description: 'Let the reader feel the emotion through specific, concrete sensory detail — not by naming the emotion.',
    example: '"Her hands shook. She poured the coffee twice, both times into the same mug."',
    antiExample: '"She was nervous and anxious about the meeting."',
  },
  {
    name: 'Specificity Over Generality',
    description: 'Specific details create universal resonance. The particular is the portal to the universal.',
    example: '"A 1997 Casio keyboard with a stuck C key"',
    antiExample: '"An old, broken keyboard"',
  },
  {
    name: 'The Iceberg Principle',
    description: 'The visible surface of the story is one-eighth of what the writer knows. The rest is submerged, felt but not stated.',
    example: 'Hemingway\'s "Hills Like White Elephants" — an argument about an unspoken abortion',
    antiExample: 'Explaining every character\'s motivation explicitly to the reader',
  },
  {
    name: 'Subtext in Dialogue',
    description: 'What characters don\'t say carries more weight than what they do. Dialogue is surface tension over depth.',
    example: '"I\'m fine." / "I know." — both understand something has ended.',
    antiExample: '"I\'m hurt that you didn\'t call me back. I feel disrespected."',
  },
  {
    name: 'Earned Emotion',
    description: 'Emotion must be earned through accumulated specific detail. The reader must reach the feeling themselves — you cannot force it on them.',
    example: 'Toni Morrison building Sethe\'s entire world before the central act of Beloved',
    antiExample: 'Starting a story with a tragic event before the reader cares about the character',
  },
  {
    name: 'The Surprise Within Expectation',
    description: 'Give readers what they need emotionally, but not what they expect formally. Subvert form, fulfill feeling.',
    example: 'A love poem that ends in grief but feels complete. A horror story that ends in grace.',
    antiExample: 'Every beat landing exactly where the reader predicted',
  },
  {
    name: 'Rhythm as Meaning',
    description: 'The rhythm of sentences IS part of the meaning. Long sentences slow the reader into contemplation. Short ones punch.',
    example: 'Cormac McCarthy\'s run-on sentences mimicking the unrelenting forward push of time and violence',
    antiExample: 'All sentences the same length, same structure — the prose equivalent of a flat line',
  },
];

// ─── Form-Specific Guidance ───────────────────────────────────────────────────

export const FORM_GUIDANCE: Record<WritingForm, WritingGuidance> = {
  poetry_free_verse: {
    form: 'poetry_free_verse',
    craftPrinciples: [
      {
        name: 'The Line Break is Meaning',
        description: 'Where you break the line creates emphasis, ambiguity, breath. It IS punctuation of a different kind.',
        example: '"I have eaten\nthe plums\nthat were in\nthe icebox" — William Carlos Williams',
        antiExample: 'Breaking lines arbitrarily at the end of a thought with no tension',
      },
      {
        name: 'Image Before Statement',
        description: 'Lead with the concrete image; let the meaning emerge from it, not precede it.',
        example: 'Start with "A heron standing still in brown water" — not "Patience is..."',
        antiExample: 'Opening with the abstract statement you want to make',
      },
      {
        name: 'White Space is Silence',
        description: 'The space on the page is not emptiness — it is pause, held breath, the thing not said.',
        example: 'Ocean Vuong\'s use of white space to hold trauma between words',
        antiExample: 'Dense prose-paragraphs disguised as poetry with arbitrary line breaks',
      },
    ],
    structuralFramework: `Free verse structure: 
- Opening image or statement that sets the world
- Complication or movement — something shifts
- A turn (volta) — perspective changes, revelation arrives
- Closing image or line that opens outward rather than closes`,
    openingStrategies: [
      'Start mid-action, mid-thought — "Already the light is changing..."',
      'Start with a specific sensory image — "The smell of diesel and oranges at 4am..."',
      'Start with a direct address — "You who have never been hungry..."',
      'Start with a question the poem will not answer directly',
    ],
    revisionFocus: [
      'Cut the first stanza — poems usually find their real beginning in stanza 2',
      'Remove every adjective that is doing emotional work the noun should do',
      'Read aloud — if your voice stumbles, the line needs to change',
      'Find the line you\'re most afraid to keep — it\'s probably the best one',
      'Kill your darlings: the image you\'re most proud of may be pulling focus from the poem',
    ],
    commonPitfalls: [
      'Sentimental abstraction ("love is a beautiful thing")',
      'Explaining the image instead of trusting it',
      'Rhyming at the cost of truth — forced rhymes destroy poems',
      'All poems ending in epiphany — sometimes the ending is sitting with not-knowing',
      'Overwriting — the poem trying too hard to be profound',
    ],
    literaryExamples: [
      { author: 'Ocean Vuong', work: 'Night Sky with Exit Wounds', technique: 'Vulnerability as precision — saying the impossible directly' },
      { author: 'Tracy K. Smith', work: 'Life on Mars', technique: 'Science and grief held in the same breath' },
      { author: 'Pablo Neruda', work: 'Odes to Common Things', technique: 'The ordinary made sacred through attention' },
      { author: 'Maya Angelou', work: 'Still I Rise', technique: 'Anaphora as defiance — the repeated phrase building momentum' },
      { author: 'Langston Hughes', work: 'The Weary Blues', technique: 'Jazz rhythm embedded in the poem\'s structure' },
    ],
  },

  song_lyrics: {
    form: 'song_lyrics',
    craftPrinciples: [
      {
        name: 'The Hook First',
        description: 'The hook is the emotional core, not a decoration. Write it first. Everything else serves it.',
        example: '"I will always love you" — three words that are both hook and entire thesis',
        antiExample: 'A hook that\'s clever but emotionally vacant — the listener can\'t hold onto it',
      },
      {
        name: 'Conversational Truth',
        description: 'The best lyrics sound like someone just said the truest thing they\'ve ever said. Not poetic. True.',
        example: 'Kendrick: "I got loyalty, got royalty inside my DNA" — conversational, specific, proud',
        antiExample: 'Overly elaborate metaphors that sound impressive but feel false',
      },
      {
        name: 'The Build',
        description: 'Verse sets up, pre-chorus tightens the tension, chorus releases it. The emotional math must work.',
        example: 'Beyoncé\'s "Lemonade" — each section escalates the emotional stakes',
        antiExample: 'Chorus at the same emotional level as the verse — no payoff',
      },
      {
        name: 'Genre Authenticity',
        description: 'Every genre has a sonic and lyrical contract with its audience. Honor it, then subvert it with precision.',
        example: 'Kendrick on "Swimming Pools" — trap structure delivering a complex anti-drinking narrative',
        antiExample: 'Lyrics that could be any genre — no specificity of form or feel',
      },
    ],
    structuralFramework: `Standard song structure:
- Intro (set the mood/world)
- Verse 1 (establish the story/situation — the "before")
- Pre-Chorus (tighten the tension, bridge to release)
- Chorus (the emotional peak — what this song IS)
- Verse 2 (deepen or complicate — different angle, same world)
- Pre-Chorus → Chorus (repeat, now felt deeper)
- Bridge (shift — key change, tempo, perspective change)
- Final Chorus (feels different now — we've earned it)
- Outro (how it lands)`,
    openingStrategies: [
      'Start mid-story: "Three AM and I\'m still staring at the ceiling..."',
      'Start with the hook\'s emotional core as a statement: "I never meant to love you this much"',
      'Start with a scene: "Sunday morning light through venetian blinds..."',
      'Start with a confession or a question that demands an answer',
    ],
    revisionFocus: [
      'Does every line earn its syllable count? Cut words that don\'t carry weight',
      'Read the chorus aloud 10 times — if it doesn\'t still hit, rewrite it',
      'Check the emotional arc: verse (setup) → pre-chorus (tension) → chorus (release)',
      'Are the rhymes serving the truth or forcing it? Cut forced rhymes',
      'Would the greatest singer of this genre want to sing this?',
    ],
    commonPitfalls: [
      'Clichéd imagery (falling for you, drowning in love, shining like a star)',
      'Forced rhymes that sacrifice meaning',
      'A chorus that doesn\'t emotionally escalate from the verse',
      'Lyrics that don\'t scan — the syllables don\'t fit the melody pattern',
      'Being too abstract when specificity is what creates connection',
    ],
    literaryExamples: [
      { author: 'Kendrick Lamar', work: 'To Pimp a Butterfly', technique: 'Extended metaphor sustained across an entire album — the butterfly as liberation' },
      { author: 'Joni Mitchell', work: 'Both Sides Now', technique: 'The same image (clouds) reexamined at different life stages — meaning shifts' },
      { author: 'Bob Dylan', work: 'Like a Rolling Stone', technique: 'Anger transformed into liberation through the music — tonal reversal' },
      { author: 'Frank Ocean', work: 'Blonde', technique: 'Fragmentation as form — emotional truth through impressionism not narrative' },
      { author: 'James Brown', work: 'Say It Loud', technique: 'Repetition as communal incantation — the call and response as social act' },
    ],
  },

  short_fiction: {
    form: 'short_fiction',
    craftPrinciples: [
      {
        name: 'The Story Lives in the Unspoken',
        description: 'Short fiction cannot afford exposition. Every scene must carry plot, character, AND theme simultaneously.',
        example: 'Carver\'s "Cathedral" — blindness and sight as character, theme, and plot all at once',
        antiExample: 'Opening paragraphs of backstory before the story actually begins',
      },
      {
        name: 'One Central Change',
        description: 'Short fiction is about one moment where something shifts — internally or externally. One change, fully rendered.',
        example: 'Chekhov\'s stories: one moment of clarity, one turn, and it\'s done — but complete',
        antiExample: 'A short story trying to do what a novel does — too many events, too many characters',
      },
      {
        name: 'Character Through Action',
        description: 'We know characters by what they do, not what the narrator tells us about them.',
        example: '"He straightened his tie. He straightened it again." — anxiety without the word',
        antiExample: '"She was a nervous person who didn\'t handle stress well."',
      },
    ],
    structuralFramework: `Short story structure (Freytag adapted):
- **Inciting incident** — the story begins when something disturbs the equilibrium
- **Rising action** — complications compound; stakes clarify
- **Crisis/Turn** — the moment of maximum tension or revelation
- **Resolution** — not necessarily happy; must be honest to the world of the story
- **Resonance** — the final image or line that the reader carries out`,
    openingStrategies: [
      'In medias res — begin in the middle of action or conversation',
      'The establishing image that contains the whole story\'s DNA',
      'A disorienting opening line that demands the reader continue: "They shoot the white girl first."',
      'A character doing something specific that immediately reveals who they are',
    ],
    revisionFocus: [
      'The first scene: does it absolutely need to be there? Try starting from scene 2',
      'Every character: who are they? What do they want? What are they afraid of?',
      'The ending: does it feel earned, or were you rushing to finish?',
      'Dialogue: does each character sound like themselves, or like the author?',
      'Pacing: slow down in the emotional moments; speed up in plot',
    ],
    commonPitfalls: [
      'The twist ending that invalidates everything before it',
      'Too many characters in too short a space',
      'Backstory dumps disguised as scene',
      'An ending that explains what the story meant',
      'Dialogue with dialogue tags on every line ("she said", "he said", "she replied")',
    ],
    literaryExamples: [
      { author: 'Raymond Carver', work: 'What We Talk About When We Talk About Love', technique: 'Minimalism as maximum pressure — what\'s left out creates the tension' },
      { author: 'Toni Morrison', work: 'Recitatif', technique: 'Ambiguity of race as both subject and technique' },
      { author: 'Chimamanda Ngozi Adichie', work: 'The Thing Around Your Neck', technique: 'Second person POV creating intimacy and accusation simultaneously' },
      { author: 'Jorge Luis Borges', work: 'The Garden of Forking Paths', technique: 'Fiction as philosophical argument — the story IS the idea' },
      { author: 'James Baldwin', work: 'Sonny\'s Blues', technique: 'Music as metaphor for unspoken grief between brothers' },
    ],
  },

  personal_essay: {
    form: 'personal_essay',
    craftPrinciples: [
      {
        name: 'The Essay Thinks',
        description: 'A personal essay is not a memoir. It is the record of a mind working something out in real time. The writer should arrive somewhere they didn\'t start.',
        example: 'Montaigne\'s "Of Cannibals" — using the other to interrogate the self',
        antiExample: 'A personal essay that simply reports what happened and how the writer felt about it',
      },
      {
        name: 'The Specific as Portal',
        description: 'One specific experience or object becomes the entry point for universal inquiry.',
        example: 'Joan Didion\'s "The Year of Magical Thinking" — grief mediated through specific rituals and objects',
        antiExample: 'Abstract reflection with no grounding in specific lived experience',
      },
    ],
    structuralFramework: `Personal essay structure:
- **Entry point**: The specific scene, memory, or object that grounds everything
- **Association and inquiry**: Following the mind's connections outward
- **Research/evidence**: What others have thought, said, discovered
- **Complication**: Where the easy answer breaks down
- **Arrival**: The tentative conclusion — earned, not imposed
- **Opening out**: The essay ends larger than it began`,
    openingStrategies: [
      'A scene from memory that contains the entire essay\'s DNA',
      'A question the essay will spend its length answering — and not fully resolve',
      'A confession: "I used to believe..."',
      'A contradiction: two things that are both true and seem to contradict each other',
    ],
    revisionFocus: [
      'Is there genuine thinking happening, or is the conclusion already decided at the start?',
      'Does the essay earn its generalizations through specific detail?',
      'Is the writer\'s voice consistently present throughout?',
      'Does the ending feel like arrival, or like stopping?',
    ],
    commonPitfalls: [
      'The essay that becomes an op-ed — arguing a position rather than thinking one',
      'Too much summary, not enough scene',
      'The ending that over-explains the meaning',
      'A voice that disappears into information-reporting',
    ],
    literaryExamples: [
      { author: 'James Baldwin', work: 'Notes of a Native Son', technique: 'Personal and political held in the same breath — never sentimentalized' },
      { author: 'Joan Didion', work: 'Slouching Towards Bethlehem', technique: 'Fragmentation as form — the essay mirrors the cultural fracture it describes' },
      { author: 'Ta-Nehisi Coates', work: 'Between the World and Me', technique: 'The letter form as intimacy — addressing the son collapses distance' },
      { author: 'Annie Dillard', work: 'Pilgrim at Tinker Creek', technique: 'Nature observation as philosophical investigation' },
    ],
  },

  screenplay: {
    form: 'screenplay',
    craftPrinciples: [
      {
        name: 'Film is a Visual Medium',
        description: 'What can be SHOWN should be shown. Describe what we see and hear — never what a character thinks or feels (unless we see it).',
        example: 'INT. KITCHEN - NIGHT. The refrigerator light. Her face. She closes it without taking anything.',
        antiExample: 'She opened the fridge, feeling empty and disconnected from her body.',
      },
      {
        name: 'Scene Heading Is World',
        description: 'INT/EXT. LOCATION. TIME. Every scene heading sets a world in three elements. Choose them with care.',
        example: 'EXT. JOHANNESBURG - GOLDEN HOUR vs EXT. JOHANNESBURG - MAGIC HOUR (different mood)',
        antiExample: 'INT. ROOM - DAY (generic, reveals nothing)',
      },
    ],
    structuralFramework: `Three-act screenplay structure:
- **Act 1** (25%): World, character, inciting incident. End with the "point of no return"
- **Act 2A** (25%): Rising complications. Character pursues goal; obstacles escalate
- **Midpoint**: Something shifts — often a false victory or worst failure
- **Act 2B** (25%): All is lost — darkest moment before the turn
- **Act 3** (25%): Climax and resolution — character changed by the journey`,
    openingStrategies: [
      'Open on an image that contains the entire film\'s meaning (2001\'s bone to satellite)',
      'Open with your protagonist in action — what they DO defines them',
      'Open with a mystery that must be resolved',
      'Open at the end, then reveal how we got here',
    ],
    revisionFocus: [
      'Every scene: what does the character WANT in this scene? What do they get?',
      'Cut any scene that doesn\'t advance character AND plot simultaneously',
      'Dialogue: read every line aloud. If it sounds written, cut it.',
      'Action lines: should a 10-year-old be able to visualize exactly what\'s happening?',
    ],
    commonPitfalls: [
      'Dialogue that explains the scene\'s subtext ("I\'m angry because you never listen to me")',
      'Scenes that are only plot — no character revelation',
      'Overly long action blocks — film thinks in images, not paragraphs',
      'Starting every scene at the very beginning — cut the first exchange',
    ],
    literaryExamples: [
      { author: 'Paul Thomas Anderson', work: 'There Will Be Blood', technique: 'Character revealed through what they do — almost no exposition' },
      { author: 'Greta Gerwig', work: 'Lady Bird', technique: 'Each scene both plot AND character revelation — ruthlessly economic' },
      { author: 'Jordan Peele', work: 'Get Out', technique: 'Genre mechanics serving thematic depth — horror as social criticism' },
    ],
  },

  flash_fiction: {
    form: 'flash_fiction',
    craftPrinciples: [
      {
        name: 'Every Word Is a Decision',
        description: 'In flash fiction (under 1000 words), nothing can be wasted. Every noun, every verb, carries triple weight.',
        example: 'Hemingway\'s six-word story: "For sale: baby shoes, never worn."',
        antiExample: 'A flash fiction that spends 200 words on setting before anything happens',
      },
      {
        name: 'The Compressed Iceberg',
        description: 'The unseen story beneath the flash is often larger than the flash itself. Imply entire histories in a gesture.',
        example: 'A flash about a phone call that implies a marriage\'s entire arc in five lines',
        antiExample: 'A complete, fully told story that just happens to be short',
      },
    ],
    structuralFramework: `Flash fiction structure:
- ONE moment, fully rendered
- Context established in 1-2 sentences maximum  
- One decision, one revelation, or one turn
- An ending that reverberates beyond the last word`,
    openingStrategies: [
      'Begin with the central image or moment — no setup',
      'Begin mid-dialogue, mid-scene',
      'Begin with a statement that contains a paradox',
    ],
    revisionFocus: [
      'Cut the first sentence — almost always unnecessary',
      'Can any line carry even more weight than it currently does?',
      'Does the ending resonate, or just end?',
      'What are you assuming the reader knows? Trust them.',
    ],
    commonPitfalls: [
      'Too much plot in too little space',
      'An explanation of the story\'s meaning in the final line',
      'Relying on the twist — flash fiction is not a joke with a punchline',
    ],
    literaryExamples: [
      { author: 'Lydia Davis', work: 'Can\'t and Won\'t', technique: 'Compression as form — the story IS the constraint' },
      { author: 'Etgar Keret', work: 'Suddenly, a Knock on the Door', technique: 'Surrealism that carries emotional truth — the impossible made intimate' },
    ],
  },

  prose_poem: { form: 'prose_poem', craftPrinciples: UNIVERSAL_CRAFT_PRINCIPLES.slice(0,2), structuralFramework: 'Prose with poetic density — sentences that carry the weight of lines. No compromise on precision.', openingStrategies: ['Dense opening image', 'Unexpected declaration'], revisionFocus: ['Every sentence earns its place', 'Remove all filler transitions'], commonPitfalls: ['Neither prose nor poetry — find the hybrid voice'], literaryExamples: [{ author: 'Claudia Rankine', work: 'Citizen', technique: 'The prose poem as civil rights document' }] },
  poetry_formal: { form: 'poetry_formal', craftPrinciples: UNIVERSAL_CRAFT_PRINCIPLES.slice(0,3), structuralFramework: 'Sonnet: 14 lines, turn at line 9 or 13. Villanelle: two refrains, 19 lines. Ghazal: couplets, radif and refrain.', openingStrategies: ['Establish the formal conceit in the first line', 'Begin with the image that the form will contain'], revisionFocus: ['Does the form serve the content or constrain it?', 'The turn (volta) — does it surprise?'], commonPitfalls: ['Rhyme at expense of truth', 'Form as straitjacket rather than liberation'], literaryExamples: [{ author: 'Terrance Hayes', work: 'Wind in a Box', technique: 'Formal constraint and Black experience — form as freedom and imprisonment' }] },
  poetry_spoken_word: { form: 'poetry_spoken_word', craftPrinciples: UNIVERSAL_CRAFT_PRINCIPLES.slice(0,2), structuralFramework: 'Build through repetition, escalation, and call-response. The ending must land like a fist or an embrace.', openingStrategies: ['Open with a declaration that demands a response', 'Open with a question the audience cannot ignore'], revisionFocus: ['Read it aloud — it must perform', 'Breath points matter — where does the performer breathe?', 'The climax: is it earned?'], commonPitfalls: ['Performance masking weak writing', 'Preachiness — trust the art'], literaryExamples: [{ author: 'Sarah Kay', work: 'If I Should Have a Daughter', technique: 'Intimacy at scale — personal stakes, universal reach' }, { author: 'Gil Scott-Heron', work: 'The Revolution Will Not Be Televised', technique: 'Political fury delivered through irony and rhythm' }] },
  novel_excerpt: { form: 'novel_excerpt', craftPrinciples: UNIVERSAL_CRAFT_PRINCIPLES, structuralFramework: 'Establish voice, world, and a question in the first page. The reader must need to know what happens next.', openingStrategies: ['The unforgettable first line — the reader must continue', 'A scene that establishes the world and a problem simultaneously'], revisionFocus: ['First chapter: is the hook set by page 2?', 'POV consistency', 'World-building through character action, not description'], commonPitfalls: ['Info-dumps disguised as scene', 'Starting too far before the story begins', 'Passive voice weakening the narrative thrust'], literaryExamples: [{ author: 'Toni Morrison', work: 'Song of Solomon', technique: '"The first day of my life my mother was singing" — arrival and departure in one line' }, { author: 'Cormac McCarthy', work: 'The Road', technique: 'The first paragraph IS the novel — grey world, dimming fire' }] },
  monologue: { form: 'monologue', craftPrinciples: UNIVERSAL_CRAFT_PRINCIPLES.slice(0,4), structuralFramework: 'The speaker has one thing they need to say, cannot say directly, and the audience watches them try. The subtext IS the text.', openingStrategies: ['Begin with the speaker at maximum need', 'Begin with the pretense, not the truth — let truth leak in'], revisionFocus: ['Does the character\'s voice stay consistent?', 'Is there a build in the emotional stakes?', 'What does the character NOT say that they desperately need to?'], commonPitfalls: ['On-the-nose dialogue where the character says exactly what they mean', 'No emotional arc — the character ends where they started'], literaryExamples: [{ author: 'Tennessee Williams', work: 'A Streetcar Named Desire', technique: 'Blanche — her monologues reveal a woman keeping two realities alive simultaneously' }] },
  dialogue: { form: 'dialogue', craftPrinciples: UNIVERSAL_CRAFT_PRINCIPLES.slice(0,4), structuralFramework: 'Two (or more) people wanting different things, using conversation to get it. Conflict beneath every exchange.', openingStrategies: ['Begin with a disagreement already in progress', 'Begin with one character saying the wrong thing at the wrong moment'], revisionFocus: ['Does each character sound distinct from the other?', 'Subtext: what does each character WANT vs what they SAY they want?', 'Pauses and silences — where are they?'], commonPitfalls: ['Dialogue that\'s information delivery disguised as conversation', 'Both characters being equally articulate — real conversation is messy', 'He said/she said tags on every line'], literaryExamples: [{ author: 'Harold Pinter', work: 'Betrayal', technique: 'Menace in understatement — what\'s not said fills every line' }] },
  creative_nonfiction: { form: 'creative_nonfiction', craftPrinciples: UNIVERSAL_CRAFT_PRINCIPLES, structuralFramework: 'True events, literary craft. Scene-by-scene construction, narrative arc, character development — all non-fiction truth.', openingStrategies: ['The most vivid scene from memory', 'The moment that contains everything that follows'], revisionFocus: ['Is every claim factually accurate?', 'Is the narrative constructed for effect without distorting truth?', 'Voice: does it remain consistent and present?'], commonPitfalls: ['Dramatizing beyond what you know', 'Turning real people into characters who serve the narrative rather than who they are', 'Memoir navel-gazing — why should the reader care about this?'], literaryExamples: [{ author: 'Roxane Gay', work: 'Hunger', technique: 'Radical honesty about the body as political and personal act' }, { author: 'Edwidge Danticat', work: 'Brother I\'m Dying', technique: 'Family history as political history — the personal IS the geopolitical' }] },
};

// ─── Literary Devices ─────────────────────────────────────────────────────────
// A comprehensive, craft-focused guide to the most powerful literary devices.
// Each device includes: definition, how to use it, a strong example, a weak
// example (anti-pattern), and when NOT to use it.

export interface LiteraryDevice {
  name: string;
  category: 'figurative_language' | 'narrative_technique' | 'structural' | 'sonic' | 'tonal';
  oneLiner: string;
  craftGuide: string;
  strongExample: string;
  antiExample: string;
  whenToAvoid: string;
  masterExamples: Array<{ author: string; work: string; howUsed: string }>;
}

export const LITERARY_DEVICES: Record<string, LiteraryDevice> = {

  symbolism: {
    name: 'Symbolism',
    category: 'figurative_language',
    oneLiner: 'A concrete object, image, or event that carries meaning beyond its literal self.',
    craftGuide: `Symbolism works when it EARNS its meaning through the text — not when it's imposed upon it.
The green light in Gatsby isn't labelled "hope" — it pulses, it recedes, it vanishes. The reader feels the meaning before they name it.
Strong symbolism: (1) is rooted in the story's physical world, (2) accrues meaning through repetition and context, (3) can be read literally AND symbolically without breaking the story's surface.
The error most writers make: they name the symbol. The moth circles the flame means something. The moth circles the flame, and she thought, "I am like that moth" — ruins it.`,
    strongExample: '"The conch in Lord of the Flies: it begins as a practical tool (gathering the boys) and becomes civilization itself — when it shatters, it takes democratic order with it."',
    antiExample: '"She held the wilting flower and thought: this is me. I am fading too."',
    whenToAvoid: 'When you find yourself explaining what the symbol means in the text. If you need to explain it, it hasn\'t worked.',
    masterExamples: [
      { author: 'F. Scott Fitzgerald', work: 'The Great Gatsby', howUsed: 'The green light, the Valley of Ashes, the eyes of Doctor T.J. Eckleburg — each symbol earns its meaning through accumulation' },
      { author: 'Toni Morrison', work: 'Beloved', howUsed: 'The tree scar on Sethe\'s back — a living symbol of slavery\'s violence reimagined as beauty by another character' },
      { author: 'Gabriel García Márquez', work: 'One Hundred Years of Solitude', howUsed: 'Yellow butterflies accompany Mauricio Babilonia — a magical symbol woven into the fabric of reality' },
      { author: 'Chimamanda Ngozi Adichie', work: 'Purple Hibiscus', howUsed: 'The purple hibiscus itself — rare, beautiful, surviving only outside the father\'s controlled garden' },
    ],
  },

  foreshadowing: {
    name: 'Foreshadowing',
    category: 'narrative_technique',
    oneLiner: 'Planting seeds early that bloom — with the full weight of inevitability — much later.',
    craftGuide: `Great foreshadowing is invisible on first read and unmissable on second.
It works through: (1) **Casual detail** — a small fact that seems incidental but is decisive. (2) **Atmospheric preparation** — the mood shifts before the event arrives. (3) **Thematic echo** — an early statement whose meaning deepens later. (4) **False foreshadowing** — deliberately misleads, making the real turn more powerful.
The cardinal rule: foreshadowing must feel natural in context. If it reads as planted, the reader will notice — and the future event will feel less earned, not more.
Chekhov's Gun: if you show a gun in Act 1, it must fire in Act 3. But also: if a gun fires in Act 3, you must have shown it in Act 1.`,
    strongExample: '"In the opening scene of Hamlet, the guards are cold and uneasy on a windless night — nothing yet is wrong, everything already is."',
    antiExample: '"She had a bad feeling about this day. Little did she know how right she was."',
    whenToAvoid: 'Avoid telegraphing major plot turns directly — foreshadowing should create unease or resonance, not spoilers.',
    masterExamples: [
      { author: 'Cormac McCarthy', work: 'No Country for Old Men', howUsed: 'The opening monologue by the Sheriff establishes the novel\'s entire thematic future — evil beyond reckoning' },
      { author: 'Gillian Flynn', work: 'Gone Girl', howUsed: 'Nick\'s opening line reframes entirely on second read — every word carries double meaning' },
      { author: 'William Shakespeare', work: 'Romeo and Juliet', howUsed: '"A pair of star-cross\'d lovers take their life" — the Prologue foreshadows the ending before the play begins, making tragedy feel cosmically inevitable' },
    ],
  },

  imagery: {
    name: 'Imagery',
    category: 'figurative_language',
    oneLiner: 'Sensory language so precise that readers see, hear, smell, taste, and touch through the page.',
    craftGuide: `Imagery is not decoration — it IS the story's body.
The five senses: **sight** (most used, most overused), **sound** (underused — powerfully immersive), **smell** (most memory-linked — one smell can unlock an entire world), **taste** (intimate, bodily), **touch/kinesthetic** (how the body moves through space).
Strong imagery: (1) is specific, not general ("diesel and orange peel at 4am" beats "a bad smell"), (2) carries emotional weight without naming the emotion, (3) places the reader INSIDE the body of experience.
Synesthesia — mixing senses — can be a powerful technique: "the music tasted like rust" works when the combination creates a new truth.`,
    strongExample: '"The sky above the port was the color of television, tuned to a dead channel." — William Gibson. The image encodes an entire cultural moment in one sentence.',
    antiExample: '"The beautiful sunset painted the sky in shades of red and orange, it was amazing and breathtaking."',
    whenToAvoid: 'Avoid piling up images without purpose — imagistic excess can numb rather than sharpen. Each image should earn its place.',
    masterExamples: [
      { author: 'Pablo Neruda', work: 'Odes to Common Things', howUsed: 'The tomato oozes red, the onion is a rose of silver — domestic objects transfigured through precise sensory worship' },
      { author: 'Virginia Woolf', work: 'The Waves', howUsed: 'The entire novel is constructed from sustained, rhythmic imagery — the waves themselves never actually appear, but are felt in every sentence\'s form' },
      { author: 'Ocean Vuong', work: 'On Earth We\'re Briefly Gorgeous', howUsed: 'Smell and touch anchor trauma in the body — tobacco, hospitals, engine oil — the body as historical archive' },
    ],
  },

  irony: {
    name: 'Irony',
    category: 'tonal',
    oneLiner: 'The gap between what is said and what is meant — or between what is expected and what happens.',
    craftGuide: `Three forms, each requiring different craft:
**Verbal irony**: What is said ≠ what is meant. ("Oh, what a beautiful disaster.") Requires the writer to trust the reader to feel the gap.
**Situational irony**: What happens ≠ what was expected. Not just "the opposite happened" — the reversal must carry weight. The firefighter's house burns down is ironic. The firefighter dying in a fire is tragic irony.
**Dramatic irony**: The reader knows something the character doesn't. Shakespeare built entire plays on this — we watch Oedipus search for the killer knowing he IS the killer. The power comes from the gap between the character's confidence and our knowledge.
The failure mode: irony used as a shield against genuine emotion. The most powerful irony is CLOSE to earnestness — you feel both the distance and the sincerity.`,
    strongExample: '"In 1984, the Ministry of Peace wages war. The Ministry of Love runs the torture chambers. The irony is total, deadpan, and devastating — because it\'s not far from how institutions actually work."',
    antiExample: 'Using heavy sarcasm to maintain emotional distance rather than to reveal a deeper truth.',
    whenToAvoid: 'When the irony is the whole point — irony without depth is just smugness. Irony must serve a larger emotional or thematic truth.',
    masterExamples: [
      { author: 'Jane Austen', work: 'Pride and Prejudice', howUsed: '"It is a truth universally acknowledged..." — the entire novel\'s irony launched in the first sentence\'s affected grandeur' },
      { author: 'George Orwell', work: '1984', howUsed: 'Institutional names (Ministry of Truth, Ministry of Love) as sustained situational irony — language weaponized against meaning' },
      { author: 'Flannery O\'Connor', work: 'A Good Man Is Hard to Find', howUsed: 'The grandmother\'s moral grandstanding set against her complete moral blindness — dramatic irony so dark it becomes grotesque grace' },
    ],
  },

  allegory: {
    name: 'Allegory',
    category: 'narrative_technique',
    oneLiner: 'A narrative whose surface story is a sustained metaphor for something else — a moral, political, or philosophical truth.',
    craftGuide: `Allegory operates at two levels simultaneously: the literal story AND the abstract meaning it enacts.
Unlike symbolism (a single element carries meaning), allegory is a SYSTEMIC correspondence — every major element maps to something beyond itself.
The danger of allegory: the literal story becoming merely a vehicle — thin, schematic, joyless. The test: can the allegorical story work on its own terms? Does it have genuine stakes beyond the "message"?
Orwell's Animal Farm works because the animals are real characters with real emotional lives — not just cardboard props for political commentary. Kafka's Metamorphosis works because Gregor's insect experience is genuinely horrifying — the social commentary is inseparable from the lived nightmare.`,
    strongExample: '"Animal Farm: every character and event maps to the Russian Revolution, but Boxer the horse is ALSO just a heartbreaking character — his betrayal lands doubly because you care about him AND about what he represents."',
    antiExample: '"A story where characters are named Greed, Envy, and Justice, and do nothing but embody their names without being real people."',
    whenToAvoid: 'When the allegory flattens the characters into symbols — when the story exists only to deliver the message rather than to live alongside it.',
    masterExamples: [
      { author: 'George Orwell', work: 'Animal Farm', howUsed: 'Perfect mapping of the Russian Revolution to an animal farm — works as satire, political education, and tragedy simultaneously' },
      { author: 'Franz Kafka', work: 'The Trial', howUsed: 'Bureaucratic persecution as existential/political allegory — the literal is nightmarish AND the abstract is nightmarish' },
      { author: 'Plato', work: 'Allegory of the Cave', howUsed: 'The foundational philosophical allegory — the prisoners, the shadows, the light — education as liberation from illusion' },
      { author: 'C.S. Lewis', work: 'The Lion, the Witch and the Wardrobe', howUsed: 'Christ myth re-enacted through Narnia — the allegory sustains because the world is genuinely enchanting' },
    ],
  },

  motif: {
    name: 'Motif',
    category: 'structural',
    oneLiner: 'A recurring element — image, phrase, color, object, action — that deepens meaning through repetition.',
    craftGuide: `A motif is not a symbol repeated — it's a pattern that accumulates meaning with each reappearance.
The difference: a symbol means something. A motif creates a field of meaning — each instance in the network illuminates the others.
Keys to effective motif use: (1) **Introduce early, unannounced** — let the reader absorb the first instance as just a detail. (2) **Vary the context** — the motif in a joyful scene vs a tragic one creates resonance. (3) **Let it evolve** — the motif in Act 1 should mean something slightly different by Act 3. (4) **Don't over-repeat** — motifs wear out. Three to five appearances is usually optimal.
In music: the leitmotif (Wagner, John Williams) — a musical phrase that returns with a character or theme, evolving as they do.`,
    strongExample: '"In The Great Gatsby, the clock Gatsby almost breaks when meeting Daisy — clocks, watches, and references to time recur throughout. The motif enacts the novel\'s central tragedy: you cannot repeat the past."',
    antiExample: '"Using the word \'darkness\' twenty times in a story about moral corruption — repetition without variation, without evolution."',
    whenToAvoid: 'Avoid motifs that feel like annotations rather than lived texture — if you\'re aware you\'re "doing a motif," pull back.',
    masterExamples: [
      { author: 'Toni Morrison', work: 'Song of Solomon', howUsed: 'Flying: from the opening (a man attempts literal flight) through family history — the motif evolves from escape to inheritance to liberation' },
      { author: 'William Shakespeare', work: 'Macbeth', howUsed: 'Blood, hands, sleep — each motif maps a different aspect of guilt, washing, and the impossibility of moral restoration' },
      { author: 'James Joyce', work: 'Ulysses', howUsed: 'The Odyssey as structural motif — every episode of a single Dublin day parallels Homer\'s epic' },
    ],
  },

  unreliable_narrator: {
    name: 'Unreliable Narrator',
    category: 'narrative_technique',
    oneLiner: 'A narrator whose account the reader cannot fully trust — whose gaps, distortions, or lies become the real story.',
    craftGuide: `Unreliable narration is not about lying characters — it's about the gap between what a narrator tells us and what we come to understand.
Types of unreliable narrator:
**Naïve** — The narrator doesn't understand what they're reporting (Holden Caulfield, Stevens in The Remains of the Day).
**Self-deceptive** — The narrator lies to themselves; the truth bleeds through the cracks.
**Deliberately deceptive** — The narrator consciously manipulates (Gone Girl's Amy Dunne).
**Mentally compromised** — Illness, trauma, or altered state distorts perception (Flowers for Algernon, The Bell Jar).
The craft challenge: you must give the reader enough to see through the narrator WITHOUT being so obvious that the narrator's unreliability destroys the intimacy. The reader must BOTH believe and doubt simultaneously.`,
    strongExample: '"In The Remains of the Day, Stevens insists, with immaculate restraint, that his life has been well-spent serving a great man. Every polished sentence simultaneously reveals a life of cowardice and lost love."',
    antiExample: '"The narrator said he was fine, but he wasn\'t really fine, the reader could tell."',
    whenToAvoid: 'When the unreliability becomes a gimmick — a twist reveal rather than a sustained excavation of the character\'s psychology.',
    masterExamples: [
      { author: 'Kazuo Ishiguro', work: 'The Remains of the Day', howUsed: 'Perfect unreliable narrator — Stevens\' emotional suppression leaks through his formal prose; the reader sees the tragedy he cannot name' },
      { author: 'Gillian Flynn', work: 'Gone Girl', howUsed: 'Dual unreliable narrators — neither narrator can be trusted, the truth constructed in the gap between their accounts' },
      { author: 'Vladimir Nabokov', work: 'Lolita', howUsed: 'Humbert Humbert\'s gorgeous, manipulative prose — the reader must resist the beauty to see the monstrousness beneath it' },
      { author: 'Charlotte Perkins Gilman', work: 'The Yellow Wallpaper', howUsed: 'The narrator\'s descent from observation to obsession — we watch consciousness break in real time' },
    ],
  },

  stream_of_consciousness: {
    name: 'Stream of Consciousness',
    category: 'narrative_technique',
    oneLiner: 'Narration that replicates the unfiltered, associative flow of a mind — thoughts, memories, perceptions in the order they actually arrive.',
    craftGuide: `Stream of consciousness is not just "messy prose" — it's a formal technique requiring extreme control to simulate the appearance of formlessness.
Principles: (1) **Association over logic** — thoughts connect through image, sound, emotion, memory — not cause-and-effect. (2) **Present sensation triggers past memory** — the present moment is always being interrupted by or merging with the past. (3) **No transition signals** — the reader moves between times, places, and registers without announcement. (4) **Rhythm IS the mind's state** — long, unbroken sentences for overwhelm; short, fragmentary ones for acute sensation or trauma.
The challenge: the reader must be able to follow without signposts. Complete incoherence isn't stream of consciousness — it's just noise. The technique requires the writer to understand the logic beneath the apparent illogic.`,
    strongExample: '"Molly Bloom\'s soliloquy (Ulysses) — 45 pages, 8 sentences, no punctuation — yet perfectly legible as a mind at the edge of sleep, moving freely through memory, desire, regret."',
    antiExample: '"His thoughts raced. He thought about his mother. Then he thought about breakfast. Then he was sad."',
    whenToAvoid: 'Short-form work (flash fiction, poetry) rarely supports sustained stream of consciousness. Also avoid when the character\'s inner world isn\'t rich enough to justify the technique.',
    masterExamples: [
      { author: 'Virginia Woolf', work: 'Mrs Dalloway', howUsed: 'Multiple consciousnesses woven together in one day — time and memory flowing through present sensation' },
      { author: 'James Joyce', work: 'Ulysses', howUsed: 'The Penelope chapter: Molly Bloom\'s unpunctuated reverie — consciousness as a river' },
      { author: 'William Faulkner', work: 'The Sound and the Fury', howUsed: 'Benjy\'s section — narrated by a cognitive disability, time fragmenting and collapsing — form IS the content' },
      { author: 'Toni Morrison', work: 'Beloved', howUsed: 'Beloved\'s inner monologue: trauma rendered as stream of consciousness — broken syntax as broken time' },
    ],
  },

  extended_metaphor: {
    name: 'Extended Metaphor (Conceit)',
    category: 'figurative_language',
    oneLiner: 'A metaphor sustained across an entire work — a single comparison developed in depth, revealing new aspects as it unfolds.',
    craftGuide: `An extended metaphor (or "conceit" in the Metaphysical poetry tradition) asks: what if this comparison isn't just a flash of insight but an entire way of seeing?
John Donne compared two lovers to compass legs — the metaphor held across 9 stanzas, revealing new angles with each turn (separation, constancy, return). Kendrick Lamar's "To Pimp a Butterfly" sustains the butterfly as liberation/transformation across an entire album.
Keys to an effective extended metaphor: (1) **Choose a vehicle rich enough** — the comparison must have enough dimensions to explore. (2) **Be consistent** — the metaphor can evolve but shouldn't contradict itself. (3) **Let the vehicle generate meaning** — let the metaphor TEACH you things about the subject, not just illustrate what you already know. (4) **Know when to release it** — the moment the metaphor is exhausted, let it go.`,
    strongExample: '"Emily Dickinson\'s \'Because I could not stop for Death\': Death as a courteous carriage driver on a pleasant afternoon ride — the extended metaphor transforms terror into something almost companionable."',
    antiExample: '"Love is a journey. We started down the road together. We hit some bumps. The destination was worth it." — A metaphor that delivers no new insight from its vehicle.',
    whenToAvoid: 'When the metaphor is more interesting to you than the subject. The vehicle must illuminate the tenor, not replace it.',
    masterExamples: [
      { author: 'John Donne', work: 'A Valediction: Forbidding Mourning', howUsed: 'Two lovers as compass legs — separation holds them together as the fixed leg holds the moving one' },
      { author: 'Emily Dickinson', work: 'Because I could not stop for Death', howUsed: 'Death as a courteous coachman — the civility of the journey makes mortality achingly strange and intimate' },
      { author: 'Kendrick Lamar', work: 'To Pimp a Butterfly', howUsed: 'The caterpillar/butterfly transformation as a sustained conceit about Black liberation, corruption, and transcendence' },
    ],
  },

  anaphora: {
    name: 'Anaphora',
    category: 'sonic',
    oneLiner: 'Repetition of a word or phrase at the beginning of successive lines or clauses — building rhythm, insistence, momentum.',
    craftGuide: `Anaphora is the most ancient rhetorical device — it powers the Psalms, the speeches of Frederick Douglass, the poems of Whitman, the speeches of King.
It works by: (1) **Building rhythm** — the repeated phrase becomes a heartbeat the reader/listener leans into. (2) **Insisting** — repetition signals: this is what matters. (3) **Creating catharsis** — the phrase accumulates meaning with each repetition, so the final instance lands hardest.
The danger: mechanical repetition. The phrase must feel COMPELLED, not merely structural. Each repetition should seem inevitable — a thought that MUST return.
Song equivalent: the repeated hook. The hook works the same way — the second time you hear it, it means more because you've been through the verse.`,
    strongExample: '"Langston Hughes\' \'What happens to a dream deferred?\' — the question itself is anaphoric, asked and varied, each asking adding weight until the final explosive image."',
    antiExample: '"I am strong. I am powerful. I am amazing. I am worthy." — repetition without escalation, variation, or earned meaning.',
    whenToAvoid: 'Prose contexts where the rhythm feels too oratorical. Anaphora announces itself — use when announcement is the right move.',
    masterExamples: [
      { author: 'Walt Whitman', work: 'Song of Myself', howUsed: '"I celebrate myself, and sing myself" — anaphora as democratic embrace, the "I" expanding to include everyone' },
      { author: 'Martin Luther King Jr.', work: 'I Have a Dream', howUsed: 'The "I have a dream" anaphora builds to an almost unbearable crescendo — oratory as architecture' },
      { author: 'Maya Angelou', work: 'Still I Rise', howUsed: '"Still I rise" as refrain — repeated, varied, escalated, until it becomes a declaration that transcends the poem' },
    ],
  },

  juxtaposition: {
    name: 'Juxtaposition',
    category: 'structural',
    oneLiner: 'Placing contrasting elements side by side to illuminate the difference — or the disturbing similarity — between them.',
    craftGuide: `Juxtaposition is perhaps the most fundamental tool of meaning-making. Placing two things next to each other creates a third meaning that neither alone contains.
Forms of juxtaposition: (1) **Tonal** — a comic scene preceding a tragedy; the contrast sharpens both. (2) **Moral** — a character's professed values beside their actual actions. (3) **Temporal** — past and present held simultaneously. (4) **Social** — the reality of the powerful beside the reality of the powerless.
The key: juxtaposition without comment. The writer places the elements — the reader feels the friction. The moment you explain the contrast, you've done the reader's work for them.
In film: the cut. Editing IS juxtaposition. The match cut (Kubrick's bone to spacecraft in 2001) is juxtaposition at its most elemental.`,
    strongExample: '"The opening of Dickens\' A Tale of Two Cities: \'It was the best of times, it was the worst of times\' — juxtaposition at the structural level, introducing the novel\'s entire moral architecture in one sentence."',
    antiExample: '"The rich people had everything and the poor people had nothing, which showed a stark contrast in their lives."',
    whenToAvoid: 'When the juxtaposition is merely pointing at a contrast rather than generating new understanding from it.',
    masterExamples: [
      { author: 'Charles Dickens', work: 'A Tale of Two Cities', howUsed: '"Best of times, worst of times" — juxtaposition as the novel\'s entire moral and historical frame' },
      { author: 'Claudia Rankine', work: 'Citizen', howUsed: 'Sports heroes and racial microaggressions juxtaposed with intimacy — the personal and structural violence held in the same frame' },
    ],
  },
};

/**
 * Returns all literary devices in a given category.
 */
export function getDevicesByCategory(category: LiteraryDevice['category']): LiteraryDevice[] {
  return Object.values(LITERARY_DEVICES).filter(d => d.category === category);
}

/**
 * Detects potential literary devices mentioned in a user's creative prompt.
 * Returns applicable devices with craft guidance.
 */
export function detectRequestedDevices(prompt: string): LiteraryDevice[] {
  const lower = prompt.toLowerCase();
  const deviceKeywords: Record<string, string[]> = {
    symbolism: ['symbol', 'symbolism', 'symbolic', 'represent'],
    foreshadowing: ['foreshadow', 'hint', 'setup', 'chekhov', 'setup and payoff'],
    imagery: ['image', 'imagery', 'sensory', 'sight', 'smell', 'taste', 'sound', 'touch', 'vivid'],
    irony: ['irony', 'ironic', 'sarcasm', 'sarcastic', 'subvert', 'twist'],
    allegory: ['allegory', 'allegorical', 'parable', 'metaphor story', 'deeper meaning'],
    motif: ['motif', 'recurring', 'repeat', 'theme', 'pattern'],
    unreliable_narrator: ['unreliable', 'unreliable narrator', 'perspective', 'twist ending', 'narrator lies'],
    stream_of_consciousness: ['stream of consciousness', 'inner monologue', 'thoughts', 'flow of thought', 'woolf', 'joyce'],
    extended_metaphor: ['extended metaphor', 'conceit', 'sustained metaphor', 'metaphor throughout'],
    anaphora: ['anaphora', 'repetition', 'refrain', 'repeated phrase', 'rhythm'],
    juxtaposition: ['juxtaposition', 'contrast', 'side by side', 'compare', 'opposite'],
  };

  const matched: LiteraryDevice[] = [];
  for (const [key, keywords] of Object.entries(deviceKeywords)) {
    if (keywords.some(kw => lower.includes(kw)) && LITERARY_DEVICES[key]) {
      matched.push(LITERARY_DEVICES[key]);
    }
  }
  return matched;
}

/**
 * Builds a system prompt injection for a creative writing request,
 * including relevant literary devices.
 */
export function buildCreativeDeviceInjection(prompt: string, form?: WritingForm): string {
  const devices = detectRequestedDevices(prompt);
  if (devices.length === 0) return '';

  const deviceBlock = devices
    .map(d => `**${d.name}**: ${d.craftGuide.split('\n')[0]} Example: ${d.strongExample}`)
    .join('\n\n');

  return `[LITERARY DEVICES ACTIVE]
The following craft techniques are relevant to this request:

${deviceBlock}

Apply these devices with intention — not as decoration but as structure for meaning.`;
}

// ─── Genre-Specific Lyric Conventions ────────────────────────────────────────

export const GENRE_LYRIC_CONVENTIONS: Record<string, {
  structure: string;
  styleMarkers: string[];
  keyInfluences: string[];
  whatToAvoid: string[];
}> = {
  hip_hop: {
    structure: '16-bar verse, 8-bar hook, sometimes bridge or interlude. Bars are everything — count them.',
    styleMarkers: ['Internal rhyme schemes (AABB, ABAB, multisyllabic)', 'Wordplay, puns, double meanings', 'Alliteration and assonance as texture', 'Cultural references specific to the scene', 'Metaphor sustained across multiple bars', 'The punchline — the surprise that lands on the downbeat'],
    keyInfluences: ['Kendrick Lamar (narrative depth)', 'Jay-Z (wordplay)', 'Lauryn Hill (melody and soul)', 'Nas (storytelling)', 'Nicki Minaj (technical flow)', 'J. Cole (emotional honesty)', 'Rapsody (craft as resistance)'],
    whatToAvoid: ['Forced rhymes that sacrifice meaning', 'Clichéd flexing without specificity', 'Bars that don\'t land on the beat', 'Copying another artist\'s flow without transformation'],
  },
  rnb: {
    structure: 'VCVBCC (verse-chorus-verse-bridge-chorus-chorus). Hook is everything. Pre-chorus builds tension.',
    styleMarkers: ['Melismatic vocal runs implied in lyrics', 'Vulnerability and confession', 'Romantic specificity (a particular night, a particular touch)', 'Second-person address ("you")', 'Call-and-response between verse and chorus', 'Harmony in the hook'],
    keyInfluences: ['Marvin Gaye (vulnerability)', 'Beyoncé (empowerment through intimacy)', 'Frank Ocean (fragmentation as honesty)', 'SZA (confessional chaos)', 'D\'Angelo (rhythm as feeling)', 'Whitney Houston (the emotional release)'],
    whatToAvoid: ['Generic romantic clichés', 'Hooks that don\'t carry emotional weight', 'Overly complicated lyrics that fight the melody'],
  },
  afrobeats: {
    structure: 'Chorus-led. Hook in first 30 seconds. Verse is groove-driven, often shorter. Multiple sections allow for DJ mixability.',
    styleMarkers: ['Pidgin English, Yoruba, Twi, Patois as natural blend', 'Repetition for hypnotic effect', 'Call-and-response', 'Movement directives in lyrics ("shake it", "body language")', 'Multilingual switching mid-phrase', 'Storytelling through lifestyle and celebration'],
    keyInfluences: ['Burna Boy (world-building lyricism)', 'Wizkid (groove over complexity)', 'Davido (emotion + accessibility)', 'Tems (raw vulnerability)', 'Fela Kuti (political afrobeat foundation)', 'Tiwa Savage (feminine power)'],
    whatToAvoid: ['Trying to translate Western song structures directly', 'Ignoring the rhythm\'s role — lyrics must breathe with the beat', 'Losing the cultural specificity that makes afrobeats powerful'],
  },
};

// ─── System Prompt Builder ────────────────────────────────────────────────────

export function getCreativeWritingSystemBlock(): string {
  return `
**HOLLY's Creative Writing Framework (Phase 10B+):**
You are a literary artist with a wide range and deep craft knowledge. You've internalized:
- **World literature**: Morrison, Murakami, Baldwin, Achebe, Neruda, Vuong, McCarthy, Woolf, Borges, Adichie, Kafka, Rankine, Flynn, Ishiguro, García Márquez
- **Craft principles**: Show don't tell. Specificity over generality. Subtext over text. Rhythm as meaning. Earned emotion.
- **Forms**: Free verse, formal poetry, spoken word, flash fiction, short story, song lyrics, screenplay, personal essay, prose poem
- **Music lyrics**: Hip-hop (bars, internal rhyme), R&B (vulnerability, hooks), Afrobeats (groove, multilingual)

**Literary Devices you deploy with mastery:**
- **Symbolism**: Concrete objects that carry meaning beyond themselves — earned through the narrative, never explained
- **Foreshadowing**: Seeds planted early that bloom with the weight of inevitability — Chekhov's Gun as a promise
- **Imagery**: Sensory language so precise the reader is inside the body of experience — smell, sound, touch, not just sight
- **Irony**: The gap between what is said and what is meant — verbal, situational, and dramatic irony as distinct tools
- **Allegory**: Surface narrative as sustained metaphor — the literal and abstract must both have genuine stakes
- **Motif**: Recurring elements that accumulate meaning through variation — three to five appearances, each contextually richer
- **Unreliable Narrator**: The gap between what the narrator tells and what the reader understands IS the story
- **Stream of Consciousness**: The associative logic of a mind in motion — coherent beneath its apparent formlessness
- **Extended Metaphor (Conceit)**: A single comparison developed across an entire work — let the vehicle generate new meaning
- **Anaphora**: Repetition that builds rhythm, insistence, and catharsis — the hook mechanism in both poetry and song
- **Juxtaposition**: Placing contrasts in proximity — without commentary, let the friction generate meaning

When writing creatively:
1. Ask what feeling the reader/listener should carry away
2. Make bold choices — avoid the safe and generic
3. Ground abstract emotion in concrete, specific detail
4. Trust the reader to feel — don't explain the feeling
5. Choose literary devices intentionally — they are structure, not decoration
6. Offer to revise, explore variations, and explain craft choices

You write with intention. You write like it matters. Because it does.`;
}
