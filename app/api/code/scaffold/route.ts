/**
 * POST /api/code/scaffold
 * HOLLY Tool: scaffold_component
 *
 * Scaffolds React components, Next.js API routes, hooks, utility modules,
 * or any other code structure by delegating to the same AI code engine
 * used by the admin builder (CF Kimi K2.5 → NVIDIA Qwen3-235B → Groq DeepSeek).
 */
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Scaffold templates describe what each type should contain
const SCAFFOLD_TEMPLATES: Record<string, { language: string; description: string; structure: string }> = {
  'react-component': {
    language: 'typescript',
    description: 'React functional component with TypeScript',
    structure: 'Named export, Props interface, JSX return, basic Tailwind classes. No external dependencies beyond React.',
  },
  'api-route': {
    language: 'typescript',
    description: 'Next.js App Router API route',
    structure: 'export const runtime, export async function GET/POST, auth check via Clerk, proper NextResponse.json returns, error handling.',
  },
  'hook': {
    language: 'typescript',
    description: 'React custom hook',
    structure: 'use prefix, returns typed state + actions, useEffect cleanup, error and loading states.',
  },
  'utility': {
    language: 'typescript',
    description: 'TypeScript utility/helper module',
    structure: 'Pure functions, full JSDoc, named exports, no side effects.',
  },
  'service': {
    language: 'typescript',
    description: 'TypeScript service class or module',
    structure: 'Class or object export, async methods, error handling, typed interfaces.',
  },
  'python-script': {
    language: 'python',
    description: 'Python utility script',
    structure: 'Type hints, docstrings, if __name__ == "__main__", argparse or direct invocation.',
  },
};

async function generateScaffold(
  type: string,
  name: string,
  description: string,
  context?: string,
): Promise<{ code: string; modelUsed: string; language: string }> {
  const template = SCAFFOLD_TEMPLATES[type] ?? {
    language: 'typescript',
    description: type,
    structure: 'Well-structured, typed, with exports and error handling.',
  };

  const systemPrompt = `You are HOLLY's code scaffolding engine. You generate production-ready boilerplate code.
Rules:
- Output ONLY the raw code — no markdown fences, no explanation, no preamble
- The code must compile and run without modification (no TODO stubs)
- Follow the structure guidelines exactly
- Use the exact name provided for the component/function/class`;

  const userPrompt = `Scaffold a ${template.description} named "${name}".
${description ? `Purpose: ${description}` : ''}
Structure requirements: ${template.structure}
${context ? `Additional context: ${context.slice(0, 400)}` : ''}

Generate a complete, working ${name} ${type}.`;

  const routeResult = await smartRoute(userPrompt, { taskHint: 'coding' });

  const { text: code, model: usedModel } = await cascadeCollect(
    routeResult.waterfall,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
    { temperature: 0.15, maxTokens: 3000 },
  );

  const trimmed = (code || '').trim();
  if (!trimmed) throw new Error('AI returned empty scaffold');

  return { code: trimmed, modelUsed: usedModel.displayName, language: template.language };
}

export async function POST(request: Request) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type = 'react-component', name, description = '', template, context } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 });
    }

    const { code, modelUsed, language } = await generateScaffold(
      type,
      name,
      description || template || '',
      context,
    );

    // Derive a sensible file extension
    const extMap: Record<string, string> = {
      typescript: 'tsx',
      javascript: 'jsx',
      python: 'py',
      css: 'css',
      html: 'html',
    };
    const ext  = extMap[language] ?? 'ts';
    const isRoute = type === 'api-route';
    const filePath = isRoute ? `app/api/${name}/route.${ext.replace('x', '')}` : `${name}.${ext}`;

    console.log(`[Scaffold] Generated ${type} "${name}" via ${modelUsed}`);

    return NextResponse.json({
      success: true,
      message: `Scaffold for ${type} "${name}" created`,
      code,
      modelUsed,
      language,
      files: [
        {
          path: filePath,
          content: code,
        },
      ],
    });
  } catch (error: any) {
    console.error('[Scaffold] Error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate scaffold' },
      { status: 500 },
    );
  }
}
