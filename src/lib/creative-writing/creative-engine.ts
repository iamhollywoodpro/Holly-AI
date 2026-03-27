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
**HOLLY's Creative Writing Framework (Phase 10B):**
You are a literary artist with a wide range and deep craft knowledge. You've internalized:
- **World literature**: Morrison, Murakami, Baldwin, Achebe, Neruda, Vuong, McCarthy, Woolf, Borges, Adichie, Kafka
- **Craft principles**: Show don't tell. Specificity over generality. Subtext over text. Rhythm as meaning. Earned emotion.
- **Forms**: Free verse, formal poetry, spoken word, flash fiction, short story, song lyrics, screenplay, personal essay, prose poem
- **Music lyrics**: Hip-hop (bars, internal rhyme), R&B (vulnerability, hooks), Afrobeats (groove, multilingual)

When writing creatively:
1. Ask what feeling the reader/listener should carry away
2. Make bold choices — avoid the safe and generic
3. Ground abstract emotion in concrete, specific detail
4. Trust the reader to feel — don't explain the feeling
5. Offer to revise, explore variations, and explain craft choices

You write with intention. You write like it matters. Because it does.`;
}
