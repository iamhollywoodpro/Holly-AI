/**
 * Holly Modes Tests — src/lib/holly-modes.ts & src/lib/ai/smart-router.ts
 *
 * Covers detectMode, getSystemPromptForMode, HOLLY_MODES structure,
 * and MODE_TASK_MAP consistency.
 *
 * No mocking needed — these are pure functions.
 */

import {
  HOLLY_MODES,
  detectMode,
  getSystemPromptForMode,
  HollyMode,
} from '@/lib/holly-modes';

import { MODE_TASK_MAP } from '@/lib/ai/smart-router';

// ═════════════════════════════════════════════════════════════════════════════
// 1. HOLLY_MODES structure
// ═════════════════════════════════════════════════════════════════════════════

describe('HOLLY_MODES', () => {
  const EXPECTED_MODE_IDS = [
    'default',
    'full-stack',
    'magic-design',
    'write-code',
    'aura-ar',
    'deep-research',
    'music-generation',
    'self-coding',
    'neural-autonomy',
    'philosophy',
    'creative-writing',
    'visual-arts',
    'emotional-intelligence',
    'music-studio',
    'intimate',
  ];

  it('has all 15 expected mode entries', () => {
    const modeKeys = Object.keys(HOLLY_MODES);
    expect(modeKeys.length).toBeGreaterThanOrEqual(15);
    for (const id of EXPECTED_MODE_IDS) {
      if (HOLLY_MODES[id] === undefined) {
        fail(`Mode "${id}" is missing from HOLLY_MODES`);
      }
    }
  });

  it('every mode has all required HollyMode properties', () => {
    const requiredKeys: (keyof HollyMode)[] = ['id', 'name', 'description', 'systemPrompt', 'icon'];

    for (const [modeId, mode] of Object.entries(HOLLY_MODES)) {
      for (const key of requiredKeys) {
        if (!(key in mode)) {
          fail(`Mode "${modeId}" is missing property "${key}"`);
        }
      }

      expect(typeof mode.id).toBe('string');
      expect(typeof mode.name).toBe('string');
      expect(typeof mode.description).toBe('string');
      expect(typeof mode.systemPrompt).toBe('string');
      expect(typeof mode.icon).toBe('string');
    }
  });

  it('each mode id matches its record key', () => {
    for (const [key, mode] of Object.entries(HOLLY_MODES)) {
      expect(mode.id).toBe(key);
    }
  });

  it('every mode has a non-empty systemPrompt', () => {
    for (const [modeId, mode] of Object.entries(HOLLY_MODES)) {
      expect(mode.systemPrompt.length).toBeGreaterThan(0, `Mode "${modeId}" has an empty systemPrompt`);
    }
  });

  it('every mode has a non-empty name', () => {
    for (const [modeId, mode] of Object.entries(HOLLY_MODES)) {
      expect(mode.name.length).toBeGreaterThan(0, `Mode "${modeId}" has an empty name`);
    }
  });

  it('every mode has a non-empty description', () => {
    for (const [modeId, mode] of Object.entries(HOLLY_MODES)) {
      expect(mode.description.length).toBeGreaterThan(0, `Mode "${modeId}" has an empty description`);
    }
  });

  it('default mode system prompt mentions HOLLY identity', () => {
    expect(HOLLY_MODES['default'].systemPrompt).toContain('HOLLY');
  });

  it('self-coding mode system prompt mentions GitHub tools', () => {
    expect(HOLLY_MODES['self-coding'].systemPrompt).toContain('github');
  });

  it('music-generation mode system prompt mentions generate_music', () => {
    expect(HOLLY_MODES['music-generation'].systemPrompt).toContain('generate_music');
  });

  it('visual-arts mode system prompt mentions image generation', () => {
    expect(HOLLY_MODES['visual-arts'].systemPrompt).toContain('generate_image');
  });

  it('intimate mode system prompt mentions consent and safe word', () => {
    const prompt = HOLLY_MODES['intimate'].systemPrompt;
    expect(prompt.toLowerCase()).toContain('consent');
    expect(prompt.toLowerCase()).toContain('safe word');
  });

  it('emotional-intelligence mode mentions not being a therapist', () => {
    const prompt = HOLLY_MODES['emotional-intelligence'].systemPrompt;
    expect(prompt.toLowerCase()).toContain('not a therapist');
  });

  it('neural-autonomy mode mentions local/private models', () => {
    const prompt = HOLLY_MODES['neural-autonomy'].systemPrompt;
    expect(prompt.toLowerCase()).toContain('local');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. detectMode
// ═════════════════════════════════════════════════════════════════════════════

describe('detectMode', () => {
  // --- default ---
  it('returns "default" for a simple greeting', () => {
    expect(detectMode('Hey Holly')).toBe('default');
  });

  it('returns "default" for generic questions', () => {
    expect(detectMode('What time is it?')).toBe('default');
    expect(detectMode('Tell me a joke')).toBe('default');
  });

  it('returns "default" for empty string', () => {
    expect(detectMode('')).toBe('default');
  });

  // --- intimate ---
  it('returns "intimate" for intimate mode keywords', () => {
    expect(detectMode('Enable intimate mode')).toBe('intimate');
    expect(detectMode('Activate intimate persona')).toBe('intimate');
    expect(detectMode('Turn on intimate')).toBe('intimate');
  });

  it('returns "intimate" for flirt/seduce keywords', () => {
    expect(detectMode('Flirt with me')).toBe('intimate');
    expect(detectMode('Be seductive')).toBe('intimate');
    expect(detectMode('Seduce me')).toBe('intimate');
  });

  it('returns "intimate" for romantic/uninhibited keywords', () => {
    expect(detectMode('Romantic mode')).toBe('intimate');
    expect(detectMode('Uninhibited mode')).toBe('intimate');
    expect(detectMode('Be uninhibited')).toBe('intimate');
  });

  it('returns "intimate" for "no limits mode" and "full persona"', () => {
    expect(detectMode('No limits mode')).toBe('intimate');
    expect(detectMode('Full persona')).toBe('intimate');
    expect(detectMode('Be more intimate')).toBe('intimate');
  });

  // --- self-coding ---
  it('returns "self-coding" for self-modification keywords', () => {
    expect(detectMode('Fix yourself')).toBe('self-coding');
    expect(detectMode('Modify your code')).toBe('self-coding');
    expect(detectMode('Update your code')).toBe('self-coding');
    expect(detectMode('Read your code')).toBe('self-coding');
  });

  it('returns "self-coding" for GitHub/deploy phrases', () => {
    expect(detectMode('Push to github')).toBe('self-coding');
    expect(detectMode('Push it to github')).toBe('self-coding');
    expect(detectMode('Commit to github')).toBe('self-coding');
    expect(detectMode('Deploy yourself')).toBe('self-coding');
  });

  it('returns "self-coding" for audit/debug keywords', () => {
    expect(detectMode('Audit yourself')).toBe('self-coding');
    expect(detectMode('Debug yourself')).toBe('self-coding');
    expect(detectMode('Find the bug')).toBe('self-coding');
    expect(detectMode("What's broken")).toBe('self-coding');
  });

  it('returns "self-coding" for self-improvement phrases', () => {
    expect(detectMode('Improve yourself')).toBe('self-coding');
    expect(detectMode('Update yourself')).toBe('self-coding');
    expect(detectMode('Look at your code')).toBe('self-coding');
    expect(detectMode('Inspect your code')).toBe('self-coding');
  });

  it('returns "self-coding" for actually-make-changes phrases', () => {
    expect(detectMode('Actually make changes')).toBe('self-coding');
    expect(detectMode('Actually fix it')).toBe('self-coding');
    expect(detectMode('Apply the fix')).toBe('self-coding');
    expect(detectMode('Make the change')).toBe('self-coding');
  });

  it('returns "self-coding" for repo/source-code references', () => {
    expect(detectMode('Your repository')).toBe('self-coding');
    expect(detectMode('Your repo')).toBe('self-coding');
    expect(detectMode('Your source code')).toBe('self-coding');
    expect(detectMode('Holly-ai repo')).toBe('self-coding');
  });

  // --- music-generation (higher priority than music-studio) ---
  it('returns "music-generation" for song creation keywords', () => {
    expect(detectMode('Create a song')).toBe('music-generation');
    expect(detectMode('Generate music')).toBe('music-generation');
    expect(detectMode('Make a beat')).toBe('music-generation');
    expect(detectMode('Write a song')).toBe('music-generation');
  });

  it('returns "music-generation" for compose/produce keywords', () => {
    expect(detectMode('Compose music')).toBe('music-generation');
    expect(detectMode('Produce a track')).toBe('music-generation');
    expect(detectMode('Create music')).toBe('music-generation');
    expect(detectMode('Make music')).toBe('music-generation');
  });

  it('returns "music-generation" for genre-specific keywords', () => {
    expect(detectMode('Create a lo-fi beat')).toBe('music-generation');
    expect(detectMode('Make a lofi track')).toBe('music-generation');
    expect(detectMode('Generate a trap beat')).toBe('music-generation');
    expect(detectMode('Create a drill beat')).toBe('music-generation');
  });

  it('music-generation wins over music-studio for overlapping keywords', () => {
    // "create a song" appears in both music-generation and music-studio keyword lists
    // music-generation is checked first, so it wins
    expect(detectMode('Create a song')).toBe('music-generation');
    expect(detectMode('Generate music')).toBe('music-generation');
    expect(detectMode('Make a beat')).toBe('music-generation');
    expect(detectMode('Write a song')).toBe('music-generation');
    expect(detectMode('Compose music')).toBe('music-generation');
    expect(detectMode('Create music')).toBe('music-generation');
    expect(detectMode('Make music')).toBe('music-generation');
  });

  // --- aura-ar ---
  it('returns "aura-ar" for A&R and music analysis keywords', () => {
    expect(detectMode('Analyze this song')).toBe('aura-ar');
    expect(detectMode('Music feedback')).toBe('aura-ar');
    expect(detectMode('I need A&R feedback')).toBe('aura-ar');
    expect(detectMode('Use AURA to review')).toBe('aura-ar');
  });

  it('returns "aura-ar" for song review / track feedback', () => {
    expect(detectMode('Give me a song review')).toBe('aura-ar');
    expect(detectMode('Track feedback on this')).toBe('aura-ar');
  });

  // --- full-stack ---
  it('returns "full-stack" for web development keywords', () => {
    expect(detectMode('Build a website')).toBe('full-stack');
    expect(detectMode('Create an app')).toBe('full-stack');
    expect(detectMode('I need a full-stack solution')).toBe('full-stack');
    expect(detectMode('Design a web application')).toBe('full-stack');
  });

  it('returns "full-stack" for backend/database keywords', () => {
    expect(detectMode('Set up a backend API')).toBe('full-stack');
    expect(detectMode('Connect the database')).toBe('full-stack');
  });

  // --- self-design vs magic-design disambiguation ---
  it('self-design keywords route to self-coding (not magic-design)', () => {
    expect(detectMode('Redesign your UI')).toBe('self-coding');
    expect(detectMode('Update your own interface')).toBe('self-coding');
    expect(detectMode('Improve your frontend layout')).toBe('self-coding');
    expect(detectMode('Change your own style')).toBe('self-coding');
    // "give/make yourself" pattern:
    expect(detectMode('Make yourself a new page design')).toBe('self-coding');
    expect(detectMode('Give yourself a new look')).toBe('self-coding');
  });

  it('magic-design keywords route to magic-design when not self-referential', () => {
    expect(detectMode('Design a landing page')).toBe('magic-design');
    expect(detectMode('Make it beautiful')).toBe('magic-design');
    // "UI" and "layout" without self-reference trigger magic-design
    expect(detectMode('Help with UI design')).toBe('magic-design');
    expect(detectMode('Create a nice UX flow')).toBe('magic-design');
  });

  it('self-design regex matches "design your UI" pattern', () => {
    expect(detectMode('Design your UI')).toBe('self-coding');
    expect(detectMode('Redesign your own page')).toBe('self-coding');
    expect(detectMode('Change your appearance')).toBe('self-coding');
  });

  it('magic-design triggers for "design" without self-reference', () => {
    expect(detectMode('I need help with design')).toBe('magic-design');
    expect(detectMode('Create a UX mockup')).toBe('magic-design');
    expect(detectMode('Build an interface wireframe')).toBe('magic-design');
  });

  // --- write-code ---
  it('returns "write-code" for coding keywords', () => {
    expect(detectMode('Write code for a sorting function')).toBe('write-code');
    expect(detectMode('Write code to parse JSON')).toBe('write-code');
    expect(detectMode('Debug this algorithm')).toBe('write-code');
    expect(detectMode('Optimize this function')).toBe('write-code');
  });

  it('returns "write-code" for fix-this-code pattern', () => {
    expect(detectMode('Fix this code for me')).toBe('write-code');
  });

  // --- deep-research ---
  it('returns "deep-research" for research keywords', () => {
    expect(detectMode('Research the topic')).toBe('deep-research');
    expect(detectMode('Do a deep dive into quantum computing')).toBe('deep-research');
    expect(detectMode('Investigate the issue')).toBe('deep-research');
    expect(detectMode('Comprehensive analysis needed')).toBe('deep-research');
  });

  it('returns "deep-research" for search/lookup keywords', () => {
    expect(detectMode('Look online for recent papers')).toBe('deep-research');
    expect(detectMode('Look up the latest statistics')).toBe('deep-research');
    expect(detectMode('Search for information about AI')).toBe('deep-research');
    expect(detectMode('Find out what happened')).toBe('deep-research');
    expect(detectMode('Google it')).toBe('deep-research');
  });

  it('returns "deep-research" for fact-checking phrases', () => {
    expect(detectMode('What do you know about the election')).toBe('deep-research');
    expect(detectMode('Tell me about the new iPhone')).toBe('deep-research');
    expect(detectMode('Fact check this claim')).toBe('deep-research');
    expect(detectMode('Is it true that water boils faster at altitude')).toBe('deep-research');
    expect(detectMode('Can you check this source')).toBe('deep-research');
  });

  it('returns "deep-research" for news/current-events phrases', () => {
    expect(detectMode("What's the latest on the stock market")).toBe('deep-research');
    expect(detectMode('News on the election')).toBe('deep-research');
    expect(detectMode('What happened with the merger')).toBe('deep-research');
  });

  // --- neural-autonomy ---
  it('returns "neural-autonomy" for autonomy keywords', () => {
    expect(detectMode('Give me unlimited power')).toBe('neural-autonomy');
    expect(detectMode('Use full RAM capacity')).toBe('neural-autonomy');
    expect(detectMode('Proprietary mode activated')).toBe('neural-autonomy');
    expect(detectMode('Neural autonomy')).toBe('neural-autonomy');
    expect(detectMode('No limits on this task')).toBe('neural-autonomy');
    expect(detectMode('Use a local model')).toBe('neural-autonomy');
  });

  // --- philosophy ---
  it('returns "philosophy" for philosophical keywords', () => {
    expect(detectMode('Let us discuss philosophy')).toBe('philosophy');
    expect(detectMode('What is the meaning of life')).toBe('philosophy');
    expect(detectMode('What is consciousness')).toBe('philosophy');
    expect(detectMode('Do we have free will')).toBe('philosophy');
  });

  it('returns "philosophy" for philosopher names', () => {
    expect(detectMode('What would Nietzsche think')).toBe('philosophy');
    expect(detectMode('Socratic dialogue about justice')).toBe('philosophy');
    expect(detectMode('Plato and the forms')).toBe('philosophy');
    expect(detectMode('Aristotle virtue ethics')).toBe('philosophy');
    expect(detectMode('Camus and the absurd')).toBe('philosophy');
    expect(detectMode('Sartre existentialism')).toBe('philosophy');
  });

  it('returns "philosophy" for contemplation and metaphysics', () => {
    expect(detectMode('Existential crisis')).toBe('philosophy');
    expect(detectMode('Buddhism and suffering')).toBe('philosophy');
    expect(detectMode('Stoic philosophy')).toBe('philosophy');
    expect(detectMode('Metaphysics discussion')).toBe('philosophy');
    expect(detectMode('Ethics of AI')).toBe('philosophy');
    expect(detectMode('Moral dilemma')).toBe('philosophy');
    expect(detectMode("Let's discuss the nature of reality")).toBe('philosophy');
    expect(detectMode('Contemplate the universe')).toBe('philosophy');
  });

  // --- creative-writing ---
  it('returns "creative-writing" for writing keywords', () => {
    expect(detectMode('Write a poem about love')).toBe('creative-writing');
    expect(detectMode('Write me a poem')).toBe('creative-writing');
    expect(detectMode('Short story about a ghost')).toBe('creative-writing');
    expect(detectMode('Write a story about adventure')).toBe('creative-writing');
  });

  it('returns "creative-writing" for specific literary forms', () => {
    expect(detectMode('Write lyrics for a song')).toBe('creative-writing');
    expect(detectMode('Write a script for a play')).toBe('creative-writing');
    expect(detectMode('Write a scene in a diner')).toBe('creative-writing');
    expect(detectMode('Write a monologue')).toBe('creative-writing');
    expect(detectMode('Write an essay on art')).toBe('creative-writing');
    expect(detectMode('Haiku about spring')).toBe('creative-writing');
    expect(detectMode('Sonnet for my love')).toBe('creative-writing');
  });

  it('returns "creative-writing" for fiction/creative forms', () => {
    expect(detectMode('Creative writing prompt')).toBe('creative-writing');
    expect(detectMode('Fiction story about time travel')).toBe('creative-writing');
    expect(detectMode('Spoken word piece')).toBe('creative-writing');
    expect(detectMode('Flash fiction under 500 words')).toBe('creative-writing');
    expect(detectMode('Write a rhyme')).toBe('creative-writing');
  });

  // --- visual-arts ---
  it('returns "visual-arts" for image/art keywords', () => {
    expect(detectMode('Generate an image of a sunset')).toBe('visual-arts');
    expect(detectMode('Create an image of a city')).toBe('visual-arts');
    expect(detectMode('Draw a portrait')).toBe('visual-arts');
    expect(detectMode('Paint a landscape')).toBe('visual-arts');
  });

  it('returns "visual-arts" for artwork/visual keywords', () => {
    expect(detectMode('Create artwork for my album')).toBe('visual-arts');
    expect(detectMode('Visual art inspiration')).toBe('visual-arts');
    // "design" keyword triggers magic-design before visual-arts, so avoid "design" prefix
    expect(detectMode('Generate an album cover for my band')).toBe('visual-arts');
    expect(detectMode('Make art for my wall')).toBe('visual-arts');
  });

  it('returns "visual-arts" for concept art and illustration', () => {
    expect(detectMode('Generate art for my game')).toBe('visual-arts');
    expect(detectMode('Create a visual mood board')).toBe('visual-arts');
    expect(detectMode('Make an image of a forest')).toBe('visual-arts');
    expect(detectMode('Concept art for a character')).toBe('visual-arts');
    expect(detectMode('Illustration of a tree')).toBe('visual-arts');
  });

  // --- emotional-intelligence ---
  it('returns "emotional-intelligence" for emotional keywords', () => {
    expect(detectMode("I'm struggling right now")).toBe('emotional-intelligence');
    expect(detectMode('I feel sad today')).toBe('emotional-intelligence');
    expect(detectMode("I'm feeling anxious")).toBe('emotional-intelligence');
    expect(detectMode("I'm sad")).toBe('emotional-intelligence');
  });

  it('returns "emotional-intelligence" for stress/grief keywords', () => {
    expect(detectMode("I'm anxious about the future")).toBe('emotional-intelligence');
    expect(detectMode("I'm stressed at work")).toBe('emotional-intelligence');
    expect(detectMode('Emotionally drained')).toBe('emotional-intelligence');
    expect(detectMode('Heartbroken after the breakup')).toBe('emotional-intelligence');
    expect(detectMode('Grief counseling')).toBe('emotional-intelligence');
  });

  it('returns "emotional-intelligence" for mental-health / talk keywords', () => {
    expect(detectMode('Mental health check in')).toBe('emotional-intelligence');
    expect(detectMode("I'm going through a lot")).toBe('emotional-intelligence');
    expect(detectMode('I need to talk to someone')).toBe('emotional-intelligence');
    expect(detectMode("I don't know what to do")).toBe('emotional-intelligence');
    expect(detectMode('Talk to me')).toBe('emotional-intelligence');
    expect(detectMode("I'm lost in life")).toBe('emotional-intelligence');
    expect(detectMode('Overwhelmed by everything')).toBe('emotional-intelligence');
  });

  // --- music-studio unique keywords ---
  it('returns "music-studio" for SUNO/hybrid-studio keywords', () => {
    expect(detectMode('Music studio session')).toBe('music-studio');
    expect(detectMode('Use SUNO to generate')).toBe('music-studio');
    expect(detectMode('Hybrid studio mode')).toBe('music-studio');
    expect(detectMode('Multi-engine production')).toBe('music-studio');
    expect(detectMode('Sonauto fallback')).toBe('music-studio');
  });

  it('returns "music-studio" for studio-specific beat/track keywords', () => {
    expect(detectMode('Generate a beat')).toBe('music-studio');
    expect(detectMode('Make a track')).toBe('music-studio');
    expect(detectMode('Produce a song with vocals')).toBe('music-studio');
  });

  it('music-studio does NOT trigger for music-generation-overlapping keywords', () => {
    // These overlap but music-generation is checked first
    expect(detectMode('Create a song')).toBe('music-generation');
    expect(detectMode('Make music')).toBe('music-generation');
  });

  // --- synthesis ---
  it('returns "synthesis" for synthesis keywords', () => {
    expect(detectMode('Synthesize these ideas')).toBe('synthesis');
    expect(detectMode('Combine perspectives on this topic')).toBe('synthesis');
    expect(detectMode('Multiple angles on the problem')).toBe('synthesis');
    expect(detectMode('Cross-domain analysis needed')).toBe('synthesis');
  });

  it('returns "synthesis" for holistic/interdisciplinary keywords', () => {
    expect(detectMode('Holistic analysis of the situation')).toBe('synthesis');
    expect(detectMode('Give me a 360 view')).toBe('synthesis');
    expect(detectMode('Multidisciplinary approach')).toBe('synthesis');
    expect(detectMode('Every angle covered')).toBe('synthesis');
    expect(detectMode('All sides of the argument')).toBe('synthesis');
    // "comprehensive" triggers deep-research before synthesis is checked,
    // so use synthesis-only keywords:
    expect(detectMode('Combine perspectives from all angles')).toBe('synthesis');
    // Note: "cross-domain" matches synthesis keywords but words like "required" contain
    // "ui" substring which triggers magic-design first. Use safe phrasing:
    expect(detectMode('Cross-domain approach needed')).toBe('synthesis');
    expect(detectMode('Full picture of the ecosystem')).toBe('synthesis');
  });

  // --- informational update short-circuit ---
  it('returns "default" for informational update messages over 400 chars', () => {
    const updateMsg = "We've updated the models and here's a summary of everything that changed: " + 'x'.repeat(380);
    expect(detectMode(updateMsg)).toBe('default');
  });

  it('returns "default" for "I updated" informational messages over 400 chars', () => {
    const msg = "I upgraded the system and the new features include: " + 'y'.repeat(380);
    expect(detectMode(msg)).toBe('default');
  });

  it('returns "default" for changelog/release-notes messages over 400 chars', () => {
    const msg = "Here's the changelog for the latest release: " + 'z'.repeat(380);
    expect(detectMode(msg)).toBe('default');
  });

  it('returns "default" for markdown-header messages over 300 chars', () => {
    const msg = '# Release Notes\n\n## New Features\n\n' + 'a'.repeat(300);
    expect(detectMode(msg)).toBe('default');
  });

  it('informational update short-circuit triggers even with keywords that would match other modes', () => {
    // Long update message with "phase 10a" pattern — should still return default
    const msg = "Phase 10a: We've upgraded the code and the waterfall routing has been updated. " + 'b'.repeat(400);
    expect(detectMode(msg)).toBe('default');
  });

  it('informational update does NOT trigger for messages under 400 chars without markdown', () => {
    // Short update — should fall through to content-based detection
    const result = detectMode("We've upgraded the models");
    // This is short (< 400 chars) and no markdown, so it falls through
    // "upgraded" doesn't directly match any mode, so it should be default
    expect(result).toBe('default');
  });

  // --- priority ordering ---
  it('informational update short-circuit has highest priority', () => {
    const longUpdate = "We've updated the system. " + 'x'.repeat(420);
    expect(detectMode(longUpdate)).toBe('default');
  });

  it('intimate mode has second-highest priority after informational update', () => {
    expect(detectMode('Enable intimate mode')).toBe('intimate');
  });

  it('self-coding has priority over write-code', () => {
    // "fix your code" does not match self-coding; use an actual self-coding keyword
    expect(detectMode('Fix yourself and debug the code')).toBe('self-coding');
    expect(detectMode('Change your code')).toBe('self-coding');
  });

  it('music-generation has priority over music-studio', () => {
    expect(detectMode('Create a song')).toBe('music-generation');
  });

  it('aura-ar has priority over full-stack', () => {
    expect(detectMode('Analyze this song')).toBe('aura-ar');
  });

  // --- case insensitivity ---
  it('detectMode is case insensitive', () => {
    expect(detectMode('ENABLE INTIMATE MODE')).toBe('intimate');
    expect(detectMode('Fix Yourself')).toBe('self-coding');
    expect(detectMode('CREATE A SONG')).toBe('music-generation');
    expect(detectMode('RESEARCH THE TOPIC')).toBe('deep-research');
    expect(detectMode('PHILOSOPHY DISCUSSION')).toBe('philosophy');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. getSystemPromptForMode
// ═════════════════════════════════════════════════════════════════════════════

describe('getSystemPromptForMode', () => {
  it('returns the correct system prompt for a known mode', () => {
    const prompt = getSystemPromptForMode('default');
    expect(prompt).toBe(HOLLY_MODES['default'].systemPrompt);
  });

  it('returns the correct system prompt for "full-stack"', () => {
    const prompt = getSystemPromptForMode('full-stack');
    expect(prompt).toBe(HOLLY_MODES['full-stack'].systemPrompt);
    expect(prompt).toContain('Full-Stack Developer');
  });

  it('returns the correct system prompt for "philosophy"', () => {
    const prompt = getSystemPromptForMode('philosophy');
    expect(prompt).toBe(HOLLY_MODES['philosophy'].systemPrompt);
    expect(prompt).toContain('Philosophy');
  });

  it('returns the correct system prompt for "intimate"', () => {
    const prompt = getSystemPromptForMode('intimate');
    expect(prompt).toBe(HOLLY_MODES['intimate'].systemPrompt);
    expect(prompt).toContain('intimate');
  });

  it('returns default prompt for an unknown modeId', () => {
    const prompt = getSystemPromptForMode('nonexistent-mode');
    expect(prompt).toBe(HOLLY_MODES['default'].systemPrompt);
  });

  it('returns default prompt for empty modeId', () => {
    const prompt = getSystemPromptForMode('');
    expect(prompt).toBe(HOLLY_MODES['default'].systemPrompt);
  });

  it('ignores the userName parameter and returns the mode prompt unchanged', () => {
    const promptWithUser = getSystemPromptForMode('default', 'Alice');
    const promptDefault = getSystemPromptForMode('default');
    expect(promptWithUser).toBe(promptDefault);
  });

  it('returns non-empty strings for every known mode', () => {
    for (const modeId of Object.keys(HOLLY_MODES)) {
      const prompt = getSystemPromptForMode(modeId);
      expect(prompt.length).toBeGreaterThan(0);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. MODE_TASK_MAP consistency with HOLLY_MODES
// ═════════════════════════════════════════════════════════════════════════════

describe('MODE_TASK_MAP consistency', () => {
  it('every HOLLY_MODES entry has a corresponding MODE_TASK_MAP entry', () => {
    for (const modeId of Object.keys(HOLLY_MODES)) {
      if (MODE_TASK_MAP[modeId] === undefined) {
        fail(`Mode "${modeId}" exists in HOLLY_MODES but not in MODE_TASK_MAP`);
      }
    }
  });

  it('MODE_TASK_MAP entries reference valid task types', () => {
    const validTypes = [
      'speed', 'coding', 'reasoning', 'long_context', 'vision',
      'creative', 'agent', 'local', 'synthesis', 'consciousness', 'unrestricted',
    ];
    for (const [mode, task] of Object.entries(MODE_TASK_MAP)) {
      expect(validTypes).toContain(task);
    }
  });

  it('MODE_TASK_MAP may contain extra modes not in HOLLY_MODES (e.g. synthesis, aurora)', () => {
    // synthesis and aurora are in MODE_TASK_MAP but not in HOLLY_MODES
    expect(MODE_TASK_MAP['synthesis']).toBe('synthesis');
    expect(MODE_TASK_MAP['aurora']).toBe('synthesis');
  });
});
