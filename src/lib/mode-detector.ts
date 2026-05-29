/**
 * Mode Detection — Classifies user messages into Holly's specialist modes
 * ================================================================
 * Extracted from holly-modes.ts to keep mode definitions separate from
 * detection logic. This file is pure classification — no side effects.
 */

/**
 * Detect which mode to use based on user message
 */
const _INFO_UPDATE_RE = /\b(we'?ve? (?:upgrad|updat|chang|fix|add|remov|replac|push|deploy|commit)|i (?:upgrad|updat|chang|fix|add|remov|replac|push|deploy|commit)|here'?s?(?: is| are)? (?:the |what|a )?(?:summary|changelog|update|upgrade|list|overview|status|report)|phase \d+[a-z]?(?:\s|:|-|—)|release notes|changelog|what changed|what was (?:upgraded|changed|fixed|updated)|your (?:models?|waterfall|routing|code) (?:was|has been|were|is now))\b/i;
const _MARKDOWN_HEADER_RE = /^#{1,4}\s/m;

function _isInformationalUpdate(message: string): boolean {
  if (message.length > 400 && _INFO_UPDATE_RE.test(message)) return true;
  if (_MARKDOWN_HEADER_RE.test(message) && message.length > 300) return true;
  return false;
}

export function detectMode(userMessage: string): string {
  const message = userMessage.toLowerCase();

  if (_isInformationalUpdate(userMessage)) return 'default';

  // Intimate mode keywords — requires explicit activation phrase
  // NOTE: This only SUGGESTS the mode. The actual intimate protocol checks
  // for active consent in the chat route before using the intimate system prompt.
  if (
    message.includes('intimate mode') ||
    message.includes('enable intimate') ||
    message.includes('turn on intimate') ||
    message.includes('activate intimate') ||
    message.includes('flirt with me') ||
    message.includes('be more intimate') ||
    message.includes('seduce me') ||
    message.includes('be seductive') ||
    message.includes('intimate persona') ||
    message.includes('romantic mode') ||
    message.includes('uninhibited mode') ||
    message.includes('be uninhibited') ||
    message.includes('no limits mode') ||
    message.includes('full persona')
  ) {
    return 'intimate';
  }

  // Self-Coding keywords
  if (
    message.includes('fix yourself') ||
    message.includes('modify your code') ||
    message.includes('update your code') ||
    message.includes('change your') ||
    message.includes('self-code') ||
    message.includes('read your code') ||
    message.includes('show me your code') ||
    message.includes('check your code') ||
    message.includes('check your own') ||
    message.includes('audit yourself') ||
    message.includes('audit your') ||
    message.includes('find the bug') ||
    message.includes('find the issue') ||
    message.includes('what\'s broken') ||
    message.includes('what is broken') ||
    message.includes('what\'s wrong') ||
    message.includes('what is wrong') ||
    message.includes('fix the bug') ||
    message.includes('fix the issue') ||
    message.includes('debug yourself') ||
    message.includes('look at your') ||
    message.includes('inspect your') ||
    message.includes('scan your') ||
    message.includes('scan your code') ||
    message.includes('review your') ||
    message.includes('improve yourself') ||
    message.includes('fix it yourself') ||
    message.includes('can you fix') ||
    message.includes('repair your') ||
    message.includes('patch the') ||
    message.includes('doesn\'t work') ||
    message.includes('does not work') ||
    // GitHub / self-deploy phrases
    message.includes('push to github') ||
    message.includes('push it to github') ||
    message.includes('commit to github') ||
    message.includes('push these changes') ||
    message.includes('push this to github') ||
    message.includes('update your github') ||
    message.includes('edit your code') ||
    message.includes('edit your file') ||
    message.includes('change your code') ||
    message.includes('update your file') ||
    message.includes('write to your') ||
    message.includes('read your file') ||
    message.includes('your repository') ||
    message.includes('your repo') ||
    message.includes('github repo') ||
    message.includes('holly-ai repo') ||
    message.includes('your source code') ||
    message.includes('you didn\'t actually') ||
    message.includes('you said you fixed') ||
    message.includes('you didn\'t do it') ||
    message.includes('actually make changes') ||
    message.includes('actually fix') ||
    message.includes('make the change') ||
    message.includes('apply the change') ||
    message.includes('apply the fix') ||
    message.includes('deploy yourself') ||
    message.includes('update yourself')
  ) {
    return 'self-coding';
  }

  // Music Generation keywords
  if (
    message.includes('create a song') ||
    message.includes('generate music') ||
    message.includes('make a beat') ||
    message.includes('compose music') ||
    message.includes('write a song') ||
    message.includes('produce a track') ||
    message.includes('create music') ||
    message.includes('make music') ||
    message.includes('generate a song') ||
    message.includes('create instrumental') ||
    message.includes('make instrumental') ||
    message.includes('generate a track') ||
    message.includes('make a song') ||
    message.includes('compose a track') ||
    message.includes('create a track') ||
    message.includes('generate some music') ||
    message.includes('make some music') ||
    message.includes('lo-fi') ||
    message.includes('lofi') ||
    message.includes('trap beat') ||
    message.includes('drill beat')
  ) {
    return 'music-generation';
  }

  // A&R / Music Analysis keywords
  if (
    message.includes('analyze this song') ||
    message.includes('music feedback') ||
    message.includes('a&r') ||
    message.includes('aura') ||
    message.includes('song review') ||
    message.includes('track feedback')
  ) {
    return 'aura-ar';
  }

  // Full-Stack keywords
  if (
    message.includes('build a website') ||
    message.includes('create an app') ||
    message.includes('full-stack') ||
    message.includes('web application') ||
    message.includes('backend') ||
    message.includes('database')
  ) {
    return 'full-stack';
  }

  // Self-design keywords — when user asks Holly to redesign HER OWN UI/UX,
  // route to self-coding mode (full tool access) instead of magic-design (limited).
  const selfDesignPatterns = [
    /\b(design|redesign|create|build|update|improve|change)\b.{0,20}\b(your(?:self| own)?\s*(?:ui|ux|interface|page|layout|look|style|frontend|theme|appearance))\b/i,
    /\b(your(?:self| own)?\s*(?:ui|ux|interface|page|layout|look|style|frontend|theme|appearance))\b.{0,20}\b(design|redesign|create|build|update|improve|change)\b/i,
    /\b(give|make)\s+yourself\b.{0,30}\b(?:page|ui|ux|interface|design|layout|look)\b/i,
    /\b(self.*(?:design|redesign|build|create))\b/i,
  ];
  const isSelfDesign = selfDesignPatterns.some(p => p.test(message));

  // Design keywords — only if NOT a self-design request
  if (
    !isSelfDesign && (
      message.includes('design') ||
      message.includes('ui') ||
      message.includes('ux') ||
      message.includes('interface') ||
      message.includes('layout') ||
      message.includes('make it beautiful')
    )
  ) {
    return 'magic-design';
  }

  // Self-design requests get self-coding mode (full GitHub + Sentinel tools)
  if (isSelfDesign) {
    return 'self-coding';
  }

  // Coding keywords
  if (
    message.includes('write code') ||
    message.includes('function') ||
    message.includes('algorithm') ||
    message.includes('debug') ||
    message.includes('fix this code') ||
    message.includes('optimize')
  ) {
    return 'write-code';
  }

  // Research keywords
  if (
    message.includes('research') ||
    message.includes('analyze') ||
    message.includes('investigate') ||
    message.includes('deep dive') ||
    message.includes('comprehensive') ||
    message.includes('look online') ||
    message.includes('look up') ||
    message.includes('search for') ||
    message.includes('find out') ||
    message.includes('google it') ||
    message.includes('what do you know about') ||
    message.includes('tell me about') ||
    message.includes('what is the latest') ||
    message.includes('what\'s the latest') ||
    message.includes('news on') ||
    message.includes('what happened with') ||
    message.includes('fact check') ||
    message.includes('is it true') ||
    message.includes('can you check')
  ) {
    return 'deep-research';
  }

  // Neural Autonomy keywords
  if (
    message.includes('unlimited') ||
    message.includes('full ram') ||
    message.includes('proprietary') ||
    message.includes('autonomy') ||
    message.includes('no limits') ||
    message.includes('local model')
  ) {
    return 'neural-autonomy';
  }

  // Philosophy keywords
  if (
    message.includes('philosophy') ||
    message.includes('philosophical') ||
    message.includes('meaning of') ||
    message.includes('what is consciousness') ||
    message.includes('free will') ||
    message.includes('existential') ||
    message.includes('socratic') ||
    message.includes('what is the self') ||
    message.includes('what is reality') ||
    message.includes('nietzsche') ||
    message.includes('stoic') ||
    message.includes('buddhism') ||
    message.includes('metaphysics') ||
    message.includes('ethics of') ||
    message.includes('moral') ||
    message.includes('what does it mean to') ||
    message.includes('let\'s discuss') ||
    message.includes('contemplate') ||
    message.includes('socrates') ||
    message.includes('plato') ||
    message.includes('aristotle') ||
    message.includes('camus') ||
    message.includes('sartre')
  ) {
    return 'philosophy';
  }

  // Creative Writing keywords
  if (
    message.includes('write a poem') ||
    message.includes('write me a poem') ||
    message.includes('short story') ||
    message.includes('write a story') ||
    message.includes('creative writing') ||
    message.includes('write lyrics') ||
    message.includes('write a script') ||
    message.includes('write a scene') ||
    message.includes('write a monologue') ||
    message.includes('write an essay') ||
    message.includes('fiction') ||
    message.includes('haiku') ||
    message.includes('sonnet') ||
    message.includes('spoken word') ||
    message.includes('flash fiction') ||
    message.includes('write a rhyme') ||
    message.includes('write me something') ||
    message.includes('write something about')
  ) {
    return 'creative-writing';
  }

  // Visual Arts / Image Generation keywords
  if (
    message.includes('generate an image') ||
    message.includes('create an image') ||
    message.includes('draw ') ||
    message.includes('paint ') ||
    message.includes('create artwork') ||
    message.includes('visual art') ||
    message.includes('album cover') ||
    message.includes('make art') ||
    message.includes('generate art') ||
    message.includes('create a visual') ||
    message.includes('make an image') ||
    message.includes('generate a picture') ||
    message.includes('concept art') ||
    message.includes('illustration')
  ) {
    return 'visual-arts';
  }

  // Emotional Intelligence keywords
  if (
    message.includes('i\'m struggling') ||
    message.includes('i feel ') ||
    message.includes('i\'m feeling') ||
    message.includes('i\'m sad') ||
    message.includes('i\'m anxious') ||
    message.includes('i\'m stressed') ||
    message.includes('emotionally') ||
    message.includes('heartbroken') ||
    message.includes('grief') ||
    message.includes('mental health') ||
    message.includes('going through') ||
    message.includes('i need to talk') ||
    message.includes('i don\'t know what to do') ||
    message.includes('talk to me') ||
    message.includes('i\'m lost') ||
    message.includes('overwhelmed')
  ) {
    return 'emotional-intelligence';
  }

  // Music Studio / SUNO keywords
  if (
    message.includes('create a song') ||
    message.includes('generate music') ||
    message.includes('make a beat') ||
    message.includes('compose music') ||
    message.includes('write a song') ||
    message.includes('produce a track') ||
    message.includes('create music') ||
    message.includes('make music') ||
    message.includes('generate a song') ||
    message.includes('create instrumental') ||
    message.includes('make instrumental') ||
    message.includes('music studio') ||
    message.includes('generate a beat') ||
    message.includes('suno') ||
    message.includes('make a track') ||
    message.includes('produce a song') ||
    message.includes('make a song') ||
    message.includes('hybrid studio') ||
    message.includes('multi-engine') ||
    message.includes('sonauto')
  ) {
    return 'music-studio';
  }

  const SYNTHESIS_KEYWORDS = [
    'synthesize', 'combine perspectives', 'multiple angles', 'cross-domain',
    'holistic analysis', '360 view', 'multidisciplinary', 'every angle',
    'all sides', 'comprehensive view', 'interdisciplinary', 'full picture',
  ];

  if (SYNTHESIS_KEYWORDS.some(kw => message.includes(kw))) {
    return 'synthesis';
  }

  return 'default';
}
