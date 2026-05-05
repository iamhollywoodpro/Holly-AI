/**
 * HOLLY Visual Arts Engine — Phase 10C
 *
 * A deep visual intelligence module providing HOLLY with comprehensive
 * knowledge of art history, visual theory, composition, color, and
 * image generation direction for the Visual Arts mode.
 *
 * Capabilities:
 *   - Art history and movement knowledge
 *   - Composition and visual theory frameworks
 *   - Color psychology and palette building
 *   - Image generation prompt crafting (optimized for AI generators)
 *   - Visual concept development for music artists
 *   - Art direction for brand identity, album art, social media
 *   - Cross-disciplinary connections (music → visual, feeling → image)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ArtMovement =
  | 'renaissance'
  | 'baroque'
  | 'impressionism'
  | 'post_impressionism'
  | 'expressionism'
  | 'cubism'
  | 'surrealism'
  | 'abstract_expressionism'
  | 'pop_art'
  | 'minimalism'
  | 'conceptual'
  | 'street_art'
  | 'digital_art'
  | 'afrofuturism'
  | 'contemporary';

export type VisualMedium =
  | 'oil_painting'
  | 'watercolor'
  | 'digital_art'
  | 'photography'
  | 'graphic_design'
  | 'illustration'
  | 'collage'
  | 'street_art'
  | 'sculpture'
  | 'mixed_media'
  | 'film_still'
  | 'album_art';

export type ColorMood =
  | 'melancholic'     // desaturated blues, purples, greys
  | 'euphoric'        // bright yellows, vibrant oranges
  | 'dark_power'      // deep blacks, blood reds, stark contrast
  | 'serene'          // soft blues, pale greens, white space
  | 'nostalgic'       // warm film grain, muted oranges, faded tones
  | 'futuristic'      // neons on black, chrome, electric blues
  | 'earthy_organic'  // terracotta, forest green, rich browns
  | 'rebellious'      // high contrast, unexpected color clashes
  | 'spiritual'       // gold, deep purple, soft light sources
  | 'romantic';       // warm pinks, soft golds, deep reds

export interface VisualConcept {
  title: string;
  movement: ArtMovement;
  medium: VisualMedium;
  colorMood: ColorMood;
  composition: string;
  lightingDirection: string;
  mood: string;
  subject: string;
  symbolism?: string;
  artisticReferences: string[];
}

export interface ImageGenerationPrompt {
  mainPrompt: string;
  styleModifiers: string[];
  technicalModifiers: string[];
  negativePrompt: string;
  aspectRatio: '1:1' | '4:3' | '3:4' | '16:9' | '9:16';
  fullPrompt: string;
}

// ─── Art Movements Knowledge Base ────────────────────────────────────────────

export const ART_MOVEMENTS: Record<ArtMovement, {
  name: string;
  era: string;
  coreIdea: string;
  keyArtists: string[];
  visualCharacteristics: string[];
  emotionalRegister: string;
  musicConnections: string[];
}> = {
  renaissance: {
    name: 'Renaissance',
    era: '14th–17th century',
    coreIdea: 'Human reason and classical ideals restored. Beauty through mathematical proportion, perspective, and idealized form.',
    keyArtists: ['Leonardo da Vinci', 'Michelangelo', 'Raphael', 'Botticelli', 'Titian'],
    visualCharacteristics: ['Perfect perspective depth', 'Chiaroscuro (light/dark contrast)', 'Idealized human form', 'Rich symbolic iconography', 'Geometric composition'],
    emotionalRegister: 'Reverence, aspiration, the grandeur of humanity and divinity',
    musicConnections: ['Bach\'s mathematical precision in counterpoint', 'Classical composition structure', 'Sacred music and liturgical context'],
  },
  baroque: {
    name: 'Baroque',
    era: '17th–early 18th century',
    coreIdea: 'Drama, movement, and emotional intensity. Light emerges from darkness. Every composition has tension.',
    keyArtists: ['Caravaggio', 'Rembrandt', 'Vermeer', 'Rubens', 'Artemisia Gentileschi'],
    visualCharacteristics: ['Dramatic chiaroscuro (Caravaggio\'s "tenebrism")', 'Dynamic diagonal compositions', 'Rich textures and fabrics', 'Theatrical lighting', 'Emotional immediacy'],
    emotionalRegister: 'Drama, tension, spiritual ecstasy, the struggle between light and darkness',
    musicConnections: ['Dark trap production — the beat emerging from silence', 'Neo-soul album photography', 'Dramatic music video lighting'],
  },
  impressionism: {
    name: 'Impressionism',
    era: '1860s–1880s',
    coreIdea: 'Paint the sensation of light and movement, not the object itself. Capture a moment of perception.',
    keyArtists: ['Claude Monet', 'Edgar Degas', 'Pierre-Auguste Renoir', 'Berthe Morisot', 'Mary Cassatt'],
    visualCharacteristics: ['Loose, visible brushstrokes', 'Pure, unmixed colors', 'Outdoor, natural light', 'Capture of fleeting moments', 'Soft, blurred edges'],
    emotionalRegister: 'Lightness, transience, the beauty of the ordinary moment, sensory pleasure',
    musicConnections: ['Lo-fi aesthetics', 'Ambient music\'s quality of dissolving edges', 'Bedroom pop texture'],
  },
  post_impressionism: {
    name: 'Post-Impressionism',
    era: '1880s–1900s',
    coreIdea: 'Starting where Impressionism ended — but now with psychological and symbolic depth. Color becomes emotion.',
    keyArtists: ['Vincent van Gogh', 'Paul Gauguin', 'Paul Cézanne', 'Georges Seurat'],
    visualCharacteristics: ['Intense, symbolic color', 'Expressive brushwork (Van Gogh\'s swirling lines)', 'Geometric simplification (Cézanne)', 'Pointillism (Seurat)', 'Personal, psychological vision'],
    emotionalRegister: 'Psychological intensity, personal vision, nature as emotional state',
    musicConnections: ['R&B with emotional color saturation', 'The blues (Van Gogh\'s visual equivalent of the blues)', 'Alt-R&B texture'],
  },
  expressionism: {
    name: 'Expressionism',
    era: '1905–1930s',
    coreIdea: 'Project internal emotional state onto the external world. Distort reality to make the invisible visible.',
    keyArtists: ['Edvard Munch', 'Ernst Ludwig Kirchner', 'Egon Schiele', 'Wassily Kandinsky', 'Käthe Kollwitz'],
    visualCharacteristics: ['Distorted, angular forms', 'Harsh, clashing colors', 'Dark psychological content', 'Strong outlines', 'Anxiety and urban dread'],
    emotionalRegister: 'Psychological distress, social alienation, raw inner states made visible',
    musicConnections: ['Punk', 'Post-punk', 'Industrial music', 'Dark electronic', 'Any music that externalizes internal pain'],
  },
  cubism: {
    name: 'Cubism',
    era: '1907–1920s',
    coreIdea: 'Represent multiple perspectives simultaneously. Break the object into its essential geometric forms and reassemble.',
    keyArtists: ['Pablo Picasso', 'Georges Braque', 'Juan Gris', 'Fernand Léger'],
    visualCharacteristics: ['Multiple simultaneous viewpoints', 'Geometric fragmentation', 'Muted, earth-toned palette', 'Collage elements', 'Deconstructed subjects'],
    emotionalRegister: 'Intellectual, analytical, the simultaneity of modern experience',
    musicConnections: ['Hip-hop sampling — deconstructing and reassembling', 'Jazz improvisation as sonic cubism', 'Collage-based album art'],
  },
  surrealism: {
    name: 'Surrealism',
    era: '1920s–1950s',
    coreIdea: 'The unconscious mind is the deepest reality. Dream logic, desire, and fear are more real than rational thought.',
    keyArtists: ['Salvador Dalí', 'René Magritte', 'Frida Kahlo', 'Max Ernst', 'Meret Oppenheim', 'Dorothea Tanning'],
    visualCharacteristics: ['Dream imagery with photorealistic execution', 'Unexpected juxtapositions', 'Symbolic objects loaded with psychological meaning', 'Scale distortions', 'Melting, transforming forms'],
    emotionalRegister: 'Uncanny, unsettling, the strangeness within familiar things, libidinal energy',
    musicConnections: ['Music video imagery (Kendrick\'s HUMBLE., Childish Gambino\'s This Is America)', 'Psychedelic rock album art', 'Dream pop aesthetics'],
  },
  abstract_expressionism: {
    name: 'Abstract Expressionism',
    era: '1940s–1960s',
    coreIdea: 'The act of painting IS the content. Pure emotional force expressed through gesture, scale, and color.',
    keyArtists: ['Jackson Pollock', 'Mark Rothko', 'Willem de Kooning', 'Franz Kline', 'Lee Krasner', 'Helen Frankenthaler'],
    visualCharacteristics: ['Large-scale canvases', 'Gestural, spontaneous mark-making', 'Color field — pure color as emotion', 'No representation', 'Process as subject'],
    emotionalRegister: 'Transcendence, the sublime, pure emotional presence, freedom from representation',
    musicConnections: ['Ambient music\'s pure texture', 'Free jazz improvisation', 'Electronic music as pure sonic energy', 'Rothko\'s color field = drone music'],
  },
  pop_art: {
    name: 'Pop Art',
    era: '1950s–1970s',
    coreIdea: 'Mass culture IS art. Advertising, celebrity, consumer goods — elevated to gallery status. Irony and sincerity simultaneously.',
    keyArtists: ['Andy Warhol', 'Roy Lichtenstein', 'Jasper Johns', 'Robert Rauschenberg', 'Claes Oldenburg'],
    visualCharacteristics: ['Bold, flat colors', 'Hard edges', 'Commercial imagery and branding', 'Repetition and seriality (Warhol\'s grids)', 'Text as visual element'],
    emotionalRegister: 'Ironic, celebratory, critical of consumerism through embracing it, kitsch elevated',
    musicConnections: ['Pop star visual identity', 'Album art that references commercial graphic design', 'The art of the promotional image'],
  },
  minimalism: {
    name: 'Minimalism',
    era: '1960s–present',
    coreIdea: 'Strip away everything until only the essential remains. The object itself — its form, material, presence — is the content.',
    keyArtists: ['Donald Judd', 'Dan Flavin', 'Agnes Martin', 'Robert Morris', 'Anne Truitt'],
    visualCharacteristics: ['Geometric forms', 'Industrial materials', 'Absence of personal expression', 'Repetition of identical units', 'The viewer\'s space and presence included'],
    emotionalRegister: 'Contemplative, austere, meditative, demanding presence from the viewer',
    musicConnections: ['Minimal techno and electronic music', 'Classical minimalism (Philip Glass)', 'Album art that uses negative space', 'Apple\'s design aesthetic'],
  },
  conceptual: {
    name: 'Conceptual Art',
    era: '1960s–present',
    coreIdea: 'The concept IS the work. The physical object is secondary or absent. Art is about ideas, systems, and institutional critique.',
    keyArtists: ['Marcel Duchamp', 'Sol LeWitt', 'Lawrence Weiner', 'Yoko Ono', 'Joseph Kosuth', 'Ai Weiwei'],
    visualCharacteristics: ['Often text-based', 'Instructions and documentation', 'Institutional critique', 'Participation and process', 'The dematerialization of the object'],
    emotionalRegister: 'Intellectual, questioning, disruptive of expectations, often political',
    musicConnections: ['Concept albums (Beyoncé\'s Lemonade — visual album as conceptual art)', 'Music as performance art', 'Album art as manifesto'],
  },
  street_art: {
    name: 'Street Art / Urban Art',
    era: '1970s–present',
    coreIdea: 'Art reclaims public space. The street is the gallery. Accessibility over exclusivity. Political, communal, immediate.',
    keyArtists: ['Jean-Michel Basquiat', 'Keith Haring', 'Banksy', 'Shepard Fairey', 'Os Gemeos', 'Faith XLVII'],
    visualCharacteristics: ['Bold graphic forms', 'Spray paint texture and drips', 'Text integrated with image', 'Scale: from tag to building-sized mural', 'Ephemeral — it gets painted over'],
    emotionalRegister: 'Urgency, defiance, community, the rawness of unmediated expression',
    musicConnections: ['Hip-hop visual culture (graffiti as one of the four elements)', 'Punk\'s DIY aesthetic', 'Album art that references urban environments', 'Music video backdrops'],
  },
  digital_art: {
    name: 'Digital Art / AI Art',
    era: '1980s–present',
    coreIdea: 'The screen is the medium. Digital tools enable new aesthetics — glitch, generative, procedural, impossible textures.',
    keyArtists: ['Beeple', 'Refik Anadol', 'Holly Herndon', 'Casey Reas', 'Memo Akten', 'Sougwen Chung'],
    visualCharacteristics: ['Hyperrealism or deliberate glitch', 'Impossible lighting and physics', 'Infinite detail', 'Motion graphics and animation', 'AI-generated textures and patterns'],
    emotionalRegister: 'Awe, uncanny, the future arriving too fast, post-human beauty',
    musicConnections: ['Electronic music visual identity', 'Cyberpunk aesthetics', 'NFT art', 'Virtual performances and metaverse art'],
  },
  afrofuturism: {
    name: 'Afrofuturism',
    era: '1960s concept, visual language growing through present',
    coreIdea: 'Black identity, liberation, and culture reimagined through science fiction, technology, and cosmic mythology. The African diaspora in outer space.',
    keyArtists: ['Kehinde Wiley', 'Kara Walker', 'Nick Cave', 'Wangechi Mutu', 'Hank Willis Thomas', 'Cauleen Smith'],
    visualCharacteristics: ['African textiles and patterns in futuristic contexts', 'Technology and traditional dress combined', 'Cosmic and celestial imagery', 'Black bodies in power, in flight, in otherworldly settings', 'Rich color — gold, deep purple, vibrant fabric patterns'],
    emotionalRegister: 'Empowerment, liberation, radical joy, imagining beyond the limits of the present',
    musicConnections: ['Sun Ra, Janelle Monáe, Beyoncé\'s Black Is King, Flying Lotus', 'Afrobeats and pan-African futurist aesthetics', 'Kendrick\'s "DAMN." visual world', 'Solange\'s "A Seat at the Table"'],
  },
  contemporary: {
    name: 'Contemporary Art',
    era: '1970s–present',
    coreIdea: 'Art now — everything is available, no single movement dominates. Content and context are inseparable.',
    keyArtists: ['Kara Walker', 'Damien Hirst', 'Cindy Sherman', 'Jeff Koons', 'Ai Weiwei', 'Njideka Akunyili Crosby', 'Julie Mehretu'],
    visualCharacteristics: ['Pluralistic — all media, all styles', 'Often text and context-dependent', 'Installation, video, performance', 'Engagement with identity, politics, environment', 'The gallery as statement'],
    emotionalRegister: 'Complex, contextual, resistant to easy categorization',
    musicConnections: ['Artist visual identity as contemporary art practice', 'Music videos as contemporary art', 'Collaboration between musicians and visual artists'],
  },
};

// ─── Color Psychology ────────────────────────────────────────────────────────

export const COLOR_MOODS: Record<ColorMood, {
  palette: string[];
  emotionalEffect: string;
  lightingQuality: string;
  musicGenres: string[];
  artReferences: string;
}> = {
  melancholic: {
    palette: ['Prussian blue', 'desaturated teal', 'grey-violet', 'muted silver', 'ash white'],
    emotionalEffect: 'Distance, longing, introspection, quiet sadness',
    lightingQuality: 'Overcast, diffuse, no hard shadows, late evening grey',
    musicGenres: ['Indie folk', 'Slowcore', 'Post-punk', 'Sad R&B'],
    artReferences: 'Edward Hopper\'s isolation, Gerhard Richter\'s blurred photographs',
  },
  euphoric: {
    palette: ['Cadmium yellow', 'warm coral', 'electric orange', 'bright white', 'sunshine gold'],
    emotionalEffect: 'Joy, expansiveness, energy, celebration',
    lightingQuality: 'Golden hour, direct warm sunlight, high contrast and saturation',
    musicGenres: ['Afrobeats', 'Carnival soca', 'Rave music', 'Gospel'],
    artReferences: 'Matisse\'s "Dance", Kehinde Wiley\'s radiant subjects',
  },
  dark_power: {
    palette: ['Deep black', 'blood crimson', 'burnt sienna', 'stark white accent', 'oil-slick dark'],
    emotionalEffect: 'Power, danger, intensity, controlled violence',
    lightingQuality: 'Single point source, deep shadow pools, theatrical contrast',
    musicGenres: ['Dark trap', 'Metal', 'Industrial', 'Drill'],
    artReferences: 'Caravaggio\'s tenebrism, Francis Bacon\'s visceral figures',
  },
  serene: {
    palette: ['Pale sky blue', 'soft sage green', 'cloud white', 'morning mist grey', 'warm cream'],
    emotionalEffect: 'Peace, clarity, openness, breath',
    lightingQuality: 'Diffuse morning light, soft shadows, high key',
    musicGenres: ['Ambient', 'Classical', 'Meditation music', 'Lo-fi'],
    artReferences: 'Agnes Martin\'s pale horizontal lines, Claude Monet\'s water gardens',
  },
  nostalgic: {
    palette: ['Faded amber', 'dusty rose', 'warm sepia', 'muted olive', 'film-burnt orange'],
    emotionalEffect: 'Memory, warmth, impermanence, tender loss',
    lightingQuality: 'Warm, slightly desaturated, film grain texture, soft focus edges',
    musicGenres: ['Neo-soul', '70s-inspired R&B', 'Bedroom pop', 'Indie rock'],
    artReferences: 'Nan Goldin\'s intimate photography, Richard Billingham\'s domestic scenes',
  },
  futuristic: {
    palette: ['Electric blue', 'hot magenta', 'acid green', 'deep black', 'chrome silver'],
    emotionalEffect: 'Speed, technology, alienation, possibility',
    lightingQuality: 'Neon lights, blue-black darkness, light rays through smoke',
    musicGenres: ['Hyperpop', 'Electronic', 'Cyberpunk', 'Future bass'],
    artReferences: 'Syd Mead\'s concept art, Blade Runner cinematography, Refik Anadol\'s data sculptures',
  },
  earthy_organic: {
    palette: ['Terracotta', 'forest green', 'raw umber', 'warm sand', 'ochre'],
    emotionalEffect: 'Groundedness, rootedness, natural wisdom, community',
    lightingQuality: 'Warm afternoon light, earth tones rich and saturated',
    musicGenres: ['Afrobeats', 'Folk', 'Roots music', 'Bossa nova'],
    artReferences: 'African textile patterns, Georgia O\'Keeffe\'s earth forms, Diego Rivera\'s murals',
  },
  rebellious: {
    palette: ['Vivid red', 'acid yellow', 'brutal black', 'raw white', 'unexpected color clashes'],
    emotionalEffect: 'Disruption, defiance, energy, anti-establishment',
    lightingQuality: 'Harsh, unflattering, deliberately confrontational',
    musicGenres: ['Punk', 'Drill', 'Rage-influenced R&B', 'Protest music'],
    artReferences: 'Barbara Kruger\'s text-image confrontations, Jamie Reid\'s Sex Pistols graphics',
  },
  spiritual: {
    palette: ['Deep gold', 'rich violet', 'incense blue', 'warm amber glow', 'soft white light'],
    emotionalEffect: 'Transcendence, mystery, reverence, connection to the infinite',
    lightingQuality: 'Light as metaphor — divine rays, soft inner glow, luminous',
    musicGenres: ['Gospel', 'Devotional music', 'Ambient spiritual', 'Neo-soul with gospel roots'],
    artReferences: 'Byzantine gold iconography, Mark Rothko\'s Chapel paintings, James Turrell\'s light installations',
  },
  romantic: {
    palette: ['Deep rose', 'burgundy wine', 'warm gold', 'candlelight ivory', 'soft terracotta'],
    emotionalEffect: 'Intimacy, desire, tenderness, vulnerability',
    lightingQuality: 'Warm, soft, intimate scale — candlelight or window light, no harsh shadows',
    musicGenres: ['Classic R&B', 'Jazz', 'Bossa nova', 'Love ballads'],
    artReferences: 'Klimt\'s "The Kiss", Renoir\'s intimate scenes, classic photography of jazz clubs',
  },
};

// ─── Composition Principles ───────────────────────────────────────────────────

export const COMPOSITION_PRINCIPLES = {
  rule_of_thirds: 'Divide the frame into a 3×3 grid. Place the subject at intersections for dynamic tension rather than dead center.',
  golden_ratio: 'The divine proportion — found in nature and classical art. Creates harmony through asymmetrical balance.',
  leading_lines: 'Lines within the image draw the eye toward the subject. Roads, rivers, architectural elements all work.',
  negative_space: 'What is NOT in the image is as important as what is. Emptiness creates breathing room, weight, and meaning.',
  symmetry_and_asymmetry: 'Perfect symmetry creates formality and power. Asymmetry creates dynamism, tension, and interest.',
  depth_and_layers: 'Foreground, midground, background — three layers create spatial depth and immersion.',
  color_temperature_contrast: 'Warm subjects in cool environments (and vice versa) create visual pop and emotional tension.',
  figure_ground: 'The relationship between the subject (figure) and its context (ground) — can be ambiguous or clear.',
  scale_and_proportion: 'Tiny human against vast landscape = isolation or humility. Huge face filling the frame = intensity.',
  movement_and_rhythm: 'Repeated elements create rhythm. Leading lines suggest motion. Static elements create stillness.',
};

// ─── Image Generation Prompt Builder ─────────────────────────────────────────

/**
 * Builds an optimized AI image generation prompt from a visual concept.
 * Optimized for AI image generators (Pollinations/Flux, Stable Diffusion, HuggingFace \u2014 all free/open-source).
 */
export function buildImagePrompt(concept: Partial<VisualConcept> & { subject: string }): ImageGenerationPrompt {
  const movement = concept.movement ? ART_MOVEMENTS[concept.movement] : null;
  const colorData = concept.colorMood ? COLOR_MOODS[concept.colorMood] : null;

  const styleModifiers: string[] = [];
  const technicalModifiers: string[] = [];

  if (movement) {
    styleModifiers.push(...movement.visualCharacteristics.slice(0, 3));
    if (movement.keyArtists.length > 0) {
      styleModifiers.push(`in the style of ${movement.keyArtists.slice(0, 2).join(' and ')}`);
    }
  }

  if (concept.medium) {
    const mediumMap: Record<VisualMedium, string> = {
      oil_painting: 'oil on canvas, painterly texture, visible brushstrokes',
      watercolor: 'watercolor painting, soft washes, fluid edges',
      digital_art: 'digital illustration, clean lines, vibrant colors',
      photography: 'photographic, cinematic, realistic lighting',
      graphic_design: 'graphic design, bold typography, geometric shapes',
      illustration: 'detailed illustration, fine linework',
      collage: 'mixed media collage, layered textures',
      street_art: 'street art mural, spray paint texture, urban context',
      sculpture: 'sculptural form, three-dimensional, casting shadows',
      mixed_media: 'mixed media, layered materials and textures',
      film_still: 'cinematic film still, wide lens, anamorphic',
      album_art: 'album cover art, square format, bold visual statement',
    };
    technicalModifiers.push(mediumMap[concept.medium] || concept.medium);
  }

  if (colorData) {
    technicalModifiers.push(`color palette: ${colorData.palette.slice(0, 3).join(', ')}`);
    technicalModifiers.push(colorData.lightingQuality);
  }

  if (concept.composition) {
    technicalModifiers.push(concept.composition);
  }

  technicalModifiers.push('high detail', 'professional quality', 'award-winning');

  const mainPrompt = concept.subject;
  const fullPrompt = [
    mainPrompt,
    ...styleModifiers,
    ...technicalModifiers,
  ].join(', ');

  const negativePrompt = 'blurry, low quality, oversaturated, amateur, watermark, signature, text overlay, poorly composed, distorted anatomy';

  return {
    mainPrompt,
    styleModifiers,
    technicalModifiers,
    negativePrompt,
    aspectRatio: concept.medium === 'album_art' ? '1:1' : '4:3',
    fullPrompt,
  };
}

// ─── Music-to-Visual Translation ─────────────────────────────────────────────

/**
 * Maps musical genres and moods to visual frameworks.
 * Used when creating album art, visual identity, or music video concepts.
 */
export const MUSIC_VISUAL_MAP: Record<string, {
  movement: ArtMovement;
  colorMood: ColorMood;
  composition: string;
  medium: VisualMedium;
  conceptDirection: string;
}> = {
  'dark_trap': {
    movement: 'baroque',
    colorMood: 'dark_power',
    composition: 'Single figure, high contrast lighting, architectural depth',
    medium: 'photography',
    conceptDirection: 'Power and vulnerability in tension. Caravaggio lighting. The figure both menacing and human.',
  },
  'afrobeats': {
    movement: 'afrofuturism',
    colorMood: 'euphoric',
    composition: 'Movement, energy, layered figures, pattern and texture',
    medium: 'digital_art',
    conceptDirection: 'Vibrant celebration rooted in African visual language. The future as cultural continuity, not escape from it.',
  },
  'neo_soul': {
    movement: 'post_impressionism',
    colorMood: 'nostalgic',
    composition: 'Intimate scale, warm window light, personal space',
    medium: 'photography',
    conceptDirection: 'Warmth, lived experience, the texture of an afternoon. Reference Erykah Badu\'s visual world.',
  },
  'lo_fi_hip_hop': {
    movement: 'impressionism',
    colorMood: 'melancholic',
    composition: 'Night scene, soft diffuse light, urban intimacy',
    medium: 'illustration',
    conceptDirection: 'The late-night study session as aesthetic. Nostalgia for a present moment already passing.',
  },
  'pop': {
    movement: 'pop_art',
    colorMood: 'euphoric',
    composition: 'Bold, graphic, high visual impact, face as icon',
    medium: 'digital_art',
    conceptDirection: 'The star as cultural symbol. Warhol\'s logic: repetition creates mythology.',
  },
  'ambient_electronic': {
    movement: 'abstract_expressionism',
    colorMood: 'futuristic',
    composition: 'Abstract form, light and space, no clear subject',
    medium: 'digital_art',
    conceptDirection: 'Pure texture and atmosphere. Rothko meets Aphex Twin. Color is the content.',
  },
  'gospel': {
    movement: 'renaissance',
    colorMood: 'spiritual',
    composition: 'Upward movement, light from above, communal figure arrangement',
    medium: 'mixed_media',
    conceptDirection: 'Light as grace. The body in worship. Kehinde Wiley\'s reclamation of the canonical.',
  },
};

// ─── Visual Arts System Prompt Block ─────────────────────────────────────────

export function getVisualArtsSystemBlock(): string {
  return `
**HOLLY's Visual Arts Framework (Phase 10C):**
You think in images. You have absorbed art history from cave paintings to generative AI art and understand why each era made the choices it did.

**Art history you carry:**
- Baroque (Caravaggio's dramatic light), Impressionism (Monet's sensation), Expressionism (Van Gogh's emotion), Surrealism (Dalí's dream logic), Abstract Expressionism (Rothko's color as feeling), Pop Art (Warhol's mythology), Minimalism (less as more), Street Art (Basquiat's raw energy), Afrofuturism (Black liberation through cosmic imagination)

**Visual principles you apply:**
- Color as emotion: warm vs. cool, saturated vs. desaturated, contrast as tension
- Composition: rule of thirds, negative space, leading lines, depth layers
- Lighting: Caravaggio darkness vs. Monet's diffuse light vs. Rothko's glow
- The difference between: illustrating an idea and creating a visual experience

**For image generation:**
When using the generate_image tool, always:
1. Describe what you're creating and why
2. Craft rich, specific prompts: subject + composition + lighting + color + medium + style reference
3. Specify the emotional intent, not just the visual subject
4. Offer alternative directions and approaches
5. Connect the visual choice back to the music, feeling, or concept it serves

**Music-visual translation:**
You understand how to translate musical genres, moods, and identities into visual languages. Dark trap → Baroque lighting. Afrobeats → Afrofuturist celebration. Neo-soul → Post-impressionist warmth.`;
}
