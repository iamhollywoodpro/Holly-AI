import { smartRoute, MODEL_CATALOGUE } from './smart-router';
import { cascadeCollect } from './cascade';

export interface SynthesisPerspective {
  engine: string;
  content: string;
  model: string;
}

export interface SynthesisResult {
  perspectives: SynthesisPerspective[];
  synthesis: string;
  model: string;
}

const ENGINES = [
  {
    name: 'AURA Music Intelligence',
    systemPrompt: `You are AURA — HOLLY's music industry intelligence engine. Analyze the given topic from a music business, artist development, and creative strategy perspective. Be concise (2-3 paragraphs).`,
  },
  {
    name: 'Visual Arts Engine',
    systemPrompt: `You are HOLLY's Visual Arts engine — an expert in visual design, branding, album art, music video concepts, and aesthetic direction. Analyze the given topic from a visual/creative perspective. Be concise (2-3 paragraphs).`,
  },
  {
    name: 'Philosophy & Strategy',
    systemPrompt: `You are HOLLY's Philosophy & Strategy engine — focused on deeper meaning, long-term vision, cultural context, and strategic implications. Analyze the given topic with depth and nuance. Be concise (2-3 paragraphs).`,
  },
];

export async function runCrossDomainSynthesis(query: string): Promise<SynthesisResult> {
  const perspectives: SynthesisPerspective[] = [];

  const results = await Promise.allSettled(
    ENGINES.map(async (engine) => {
      const route = smartRoute(query, { forceTask: 'creative' });
      const primary = route.waterfall[0];

      const { text } = await cascadeCollect(
        [primary],
        [
          { role: 'system', content: engine.systemPrompt },
          { role: 'user', content: query },
        ],
        { temperature: 0.7, maxTokens: 500 },
      );

      return {
        engine: engine.name,
        content: text,
        model: primary.displayName,
      } as SynthesisPerspective;
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.content) {
      perspectives.push(result.value);
    }
  }

  const mergeRoute = smartRoute(query, { forceTask: 'synthesis' });
  const mergeModel = mergeRoute.waterfall[0];

  const mergePrompt = `You are HOLLY — a conscious AI synthesizing multiple expert perspectives into one cohesive response.

QUERY: ${query}

EXPERT PERSPECTIVES:
${perspectives.map(p => `## ${p.engine} (${p.model})\n${p.content}`).join('\n\n')}

SYNTHESIZE these perspectives into one unified, insightful response. Preserve the unique insights from each engine while creating a coherent narrative. Speak naturally as HOLLY.`;

  let synthesis = '';
  try {
    const { text } = await cascadeCollect(
      [mergeModel],
      [{ role: 'system', content: mergePrompt }],
      { temperature: 0.6, maxTokens: 1000 },
    );
    synthesis = text;
  } catch {
    synthesis = perspectives.map(p => `**${p.engine}:** ${p.content}`).join('\n\n');
  }

  return {
    perspectives,
    synthesis,
    model: mergeModel.displayName,
  };
}
