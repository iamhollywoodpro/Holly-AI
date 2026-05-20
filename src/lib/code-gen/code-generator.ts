/**
 * Phase 3: Code Generator
 * Generates code files connected to Holly's Smart Router
 * Supports single-file and multi-file generation
 */

import { classifyTask, TASK_WATERFALLS, MODEL_CATALOGUE, type TaskType } from '../ai/smart-router';

export interface CodeGenRequest {
  prompt: string;
  language?: string;
  framework?: string;
  fileName?: string;
  context?: string;
  existingCode?: string;
  mode: 'generate' | 'modify' | 'complete' | 'debug' | 'refactor';
}

export interface CodeGenFile {
  path: string;
  content: string;
  language: string;
  description?: string;
}

export interface CodeGenResult {
  success: boolean;
  files: CodeGenFile[];
  explanation: string;
  taskType: string;
  model: string;
}

function buildCodeGenPrompt(request: CodeGenRequest): string {
  const { prompt, language, framework, context, existingCode, mode } = request;

  let systemPrompt = `You are Holly AI's code generation engine. You produce clean, production-ready code.

RULES:
- Generate complete, working code - no placeholders or TODOs
- Include proper error handling
- Follow ${language || 'TypeScript'} best practices
${framework ? `- Use ${framework} conventions and patterns` : ''}
- Add helpful comments for complex logic
- Ensure code is secure and performant
`;

  switch (mode) {
    case 'generate':
      systemPrompt += `\nTASK: Generate new code based on the description below.`;
      break;
    case 'modify':
      systemPrompt += `\nTASK: Modify the existing code based on the instructions below.
Return the COMPLETE modified file, not just the changes.`;
      break;
    case 'complete':
      systemPrompt += `\nTASK: Complete the partial code below. Fill in the missing parts.`;
      break;
    case 'debug':
      systemPrompt += `\nTASK: Debug and fix the code below. Identify issues and return the corrected version.`;
      break;
    case 'refactor':
      systemPrompt += `\nTASK: Refactor the code below for better quality, performance, and maintainability.`;
      break;
  }

  if (context) {
    systemPrompt += `\n\nCONTEXT:\n${context}`;
  }

  if (existingCode) {
    systemPrompt += `\n\nEXISTING CODE:\n\`\`\`${language || 'typescript'}\n${existingCode}\n\`\`\``;
  }

  systemPrompt += `\n\nINSTRUCTION:\n${prompt}`;

  systemPrompt += `\n\nRESPONSE FORMAT:
Return a JSON object with this exact structure:
{
  "files": [
    {
      "path": "relative/path/to/file.ts",
      "content": "complete file content here",
      "language": "typescript",
      "description": "brief description of this file"
    }
  ],
  "explanation": "Brief explanation of what was generated and why"
}

If generating multiple files, include all of them. Each file must be complete and working.`;

  return systemPrompt;
}

async function callModel(modelId: string, prompt: string): Promise<string | null> {
  const spec = MODEL_CATALOGUE[modelId];
  if (!spec) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    let url = '';
    let headers: Record<string, string> = {};
    let body: string;

    switch (spec.provider) {
      case 'groq': {
        url = 'https://api.groq.com/openai/v1/chat/completions';
        headers = {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        };
        body = JSON.stringify({
          model: spec.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 4096,
          temperature: 0.3,
        });
        break;
      }
      case 'nvidia_nim': {
        url = `https://integrate.api.nvidia.com/v1/chat/completions`;
        headers = {
          'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
          'Content-Type': 'application/json',
        };
        body = JSON.stringify({
          model: spec.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 4096,
          temperature: 0.3,
        });
        break;
      }
      case 'google': {
        url = `https://generativelanguage.googleapis.com/v1beta/models/${spec.model}:generateContent?key=${process.env.GOOGLE_API_KEY}`;
        body = JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 4096, temperature: 0.3 },
        });
        break;
      }
      case 'openrouter': {
        url = 'https://openrouter.ai/api/v1/chat/completions';
        headers = {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        };
        body = JSON.stringify({
          model: spec.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 4096,
          temperature: 0.3,
        });
        break;
      }
      default:
        return null;
    }

    const res = await fetch(url, { method: 'POST', headers, body, signal: controller.signal });

    if (!res.ok) return null;

    const data = await res.json();

    // OpenAI-compatible format (Groq, NVIDIA, OpenRouter)
    if (data.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    }
    // Google format
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    }

    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateCode(request: CodeGenRequest): Promise<CodeGenResult> {
  const prompt = buildCodeGenPrompt(request);

  // Classify the task for smart routing
  const taskType = classifyTask(prompt) as TaskType || 'coding';
  const waterfall = TASK_WATERFALLS['coding'] || TASK_WATERFALLS['speed'] || [];

  // Try models in cascade
  for (const modelId of waterfall) {
    const response = await callModel(modelId, prompt);
    if (!response) continue;

    // Parse the response - extract JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Model responded but not valid JSON — try next
      continue;
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        success: true,
        files: parsed.files || [],
        explanation: parsed.explanation || 'Code generated successfully',
        taskType,
        model: modelId,
      };
    } catch {
      continue;
    }
  }

  return {
    success: false,
    files: [],
    explanation: 'Code generation failed: all models in cascade returned no valid response. Check API keys and model availability.',
    taskType,
    model: waterfall[0] || 'unknown',
  };
}

export async function generateMultipleFiles(
  prompt: string,
  fileNames: string[],
  language: string = 'typescript',
  framework?: string,
  context?: string,
): Promise<CodeGenResult> {
  const fileList = fileNames.map(f => `- ${f}`).join('\n');

  const fullPrompt = `${prompt}

Generate the following files:
${fileList}

Each file must be complete, working, and properly connected to the others.`;

  return generateCode({
    prompt: fullPrompt,
    language,
    framework,
    context,
    mode: 'generate',
  });
}

export async function patchCode(
  filePath: string,
  existingCode: string,
  instruction: string,
  language: string = 'typescript',
): Promise<CodeGenResult> {
  return generateCode({
    prompt: `Apply this change to ${filePath}: ${instruction}`,
    language,
    fileName: filePath,
    existingCode,
    mode: 'modify',
  });
}

export async function debugCode(
  filePath: string,
  code: string,
  errorMessage?: string,
  language: string = 'typescript',
): Promise<CodeGenResult> {
  const prompt = errorMessage
    ? `Fix this code. Error: ${errorMessage}`
    : 'Find and fix all bugs in this code';

  return generateCode({
    prompt,
    language,
    fileName: filePath,
    existingCode: code,
    context: errorMessage ? `Error message: ${errorMessage}` : undefined,
    mode: 'debug',
  });
}
